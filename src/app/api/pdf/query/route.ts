import { NextResponse } from 'next/server';
import { getOllamaEmbedding, cosineSimilarity } from '@/lib/ollamaEmbeddings';
import { getChunksForFile } from '@/lib/pdfChunksDb';
import { checkOllamaAvailability, queryOllamaLocal, queryGeminiAPI, queryOpenRouterAPI } from '@/lib/ollamaClient';

export async function POST(req: Request) {
  try {
    const { query, fileName } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'FileName is required' }, { status: 400 });
    }

    // 1. Fetch all chunks for this PDF from local database
    const chunks = getChunksForFile(fileName);
    
    if (chunks.length === 0) {
      return NextResponse.json({ 
        error: 'No chunks found for this file. Please upload and index the file first.' 
      }, { status: 404 });
    }

    // 2. Check if the user is asking for a summary
    const isSummaryRequest = /summarize|summary|overview|what is this document about|outline|brief|main points/i.test(query);
    
    let relevantChunks: any[] = [];
    let prompt = '';

    if (isSummaryRequest) {
      // For summary, retrieve representative chunks distributed across the entire document
      // Sort by chunkIndex first to preserve page flow order
      chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
      
      const maxSummaryChunks = 10;
      if (chunks.length <= maxSummaryChunks) {
        relevantChunks = chunks;
      } else {
        const step = Math.floor(chunks.length / maxSummaryChunks);
        for (let i = 0; i < maxSummaryChunks; i++) {
          const idx = Math.min(i * step, chunks.length - 1);
          relevantChunks.push(chunks[idx]);
        }
      }

      const contextText = relevantChunks
        .map(c => `[Page ${c.pageNumber}]: "${c.text}"`)
        .join('\n\n');

      prompt = `System: You are an expert Document Summarization Assistant. Generate a comprehensive, highly-structured executive summary of the document "${fileName}" based ONLY on the provided excerpts.
Structure your summary with:
- **Executive Overview / Objective**: What is the primary purpose of this standard/report.
- **Key Technical Requirements**: Major guidelines, metrics, or parameters specified.
- **Testing & Compliance Guidelines**: Any testing processes, certifications, or documentation rules.
Provide a clear, formal response.

Excerpts:
${contextText}

Summary:`;

    } else {
      // Standard Q&A: Retrieve top matching chunks using vector similarity
      const queryEmbedding = await getOllamaEmbedding(query);

      // Score chunks
      const scoredChunks = chunks.map((chunk) => {
        const score = cosineSimilarity(queryEmbedding, chunk.embedding || []);
        return {
          text: chunk.text,
          pageNumber: chunk.pageNumber,
          chunkIndex: chunk.chunkIndex,
          score: score
        };
      });

      // Sort by score descending and take the top 5 chunks
      scoredChunks.sort((a, b) => b.score - a.score);
      const topChunks = scoredChunks.slice(0, 5);

      // Filter out chunks with very low similarity
      relevantChunks = topChunks.filter(c => c.score > 0.3);

      if (relevantChunks.length === 0) {
        return NextResponse.json({
          answer: 'No relevant information was found in the uploaded document to answer this query.',
          citations: []
        });
      }

      const contextText = relevantChunks
        .map(c => `[Page ${c.pageNumber}]: "${c.text}"`)
        .join('\n\n');

      prompt = `System: You are a strict Q&A Assistant. Your task is to answer the user's question based ONLY on the provided Context excerpts from the PDF document.
Rules:
1. Do not use any outside knowledge or general information.
2. If the answer to the question is not explicitly mentioned in the Context, you must reply: "I cannot find the answer in the uploaded document."
3. Do not make up or hallucinate any facts.
4. Cite the page numbers (e.g. "on Page 3") when you state a fact.

Context:
${contextText}

Question: ${query}

Answer:`;
    }

    // 3. Query local AI or cloud API fallback pipelines
    let answer = '';
    let activeModel = '';
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;

    // Pipeline 1: Local Ollama
    const ollamaStatus = await checkOllamaAvailability();
    if (ollamaStatus.isAvailable) {
      activeModel = ollamaStatus.activeModel || 'gemma:2b';
      try {
        const ollamaRes = await queryOllamaLocal(prompt, activeModel);
        if (ollamaRes) {
          answer = ollamaRes;
        }
      } catch (err) {
        console.warn('Local Ollama pipeline execution failed. Attempting next pipeline...');
      }
    }

    // Pipeline 2: Google Gemini Cloud API
    if (!answer && geminiApiKey) {
      activeModel = 'gemini-1.5-flash (Cloud)';
      try {
        const geminiRes = await queryGeminiAPI(prompt, geminiApiKey);
        if (geminiRes) {
          answer = geminiRes;
        }
      } catch (err) {
        console.warn('Gemini Cloud API pipeline execution failed. Attempting next pipeline...');
      }
    }

    // Pipeline 3: OpenRouter API (Cloud Llama-3 / Gemini fallback)
    if (!answer && openrouterApiKey) {
      activeModel = 'gemini-2.0-flash-exp (OpenRouter Cloud)';
      try {
        const openrouterRes = await queryOpenRouterAPI(prompt, openrouterApiKey);
        if (openrouterRes) {
          answer = openrouterRes;
        }
      } catch (err) {
        console.warn('OpenRouter Cloud API pipeline execution failed. Attempting next pipeline...');
      }
    }

    // Pipeline 4: Offline Non-LLM Fallback (Direct Quotes listing)
    if (!answer) {
      activeModel = 'Offline Extractor (No LLM Fallback)';
      answer = `### ⚠️ Local AI Service (Ollama / Gemini / OpenRouter) Offline
Showing direct matches retrieved from the document:

${relevantChunks.map((c, i) => `**Excerpt ${i + 1} (Page ${c.pageNumber}):**
"${c.text}"`).join('\n\n')}

*Note: Please start your local Ollama server, or verify your GEMINI_API_KEY or OPENROUTER_API_KEY is configured in your .env file.*`;
    }

    // Format citations to return to frontend
    const citations = relevantChunks.map(c => ({
      pageNumber: c.pageNumber,
      snippet: c.text,
      relevanceScore: c.score !== undefined ? Math.round(c.score * 100) : null
    }));

    return NextResponse.json({
      answer: answer,
      citations: citations,
      modelUsed: activeModel,
      isSummary: isSummaryRequest
    });

  } catch (error: any) {
    console.error('Error in PDF query API:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
}
