import { NextResponse } from 'next/server';
import { getOllamaEmbedding, cosineSimilarity } from '@/lib/ollamaEmbeddings';
import { getVerifiedChunksForFile, getChunksForFile, ChunkRecord } from '@/lib/pdfChunksDb';
import { validateTextQuality } from '@/lib/textQualityValidator';
import { checkOllamaAvailability, queryOllamaLocal, queryGeminiAPI, queryOpenRouterAPI } from '@/lib/ollamaClient';
import { validateCitationToClaims, formatAbstentionResponse, GroundedClaim } from '@/lib/evidenceGroundingValidator';

export async function POST(req: Request) {
  try {
    const { query, fileName } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'FileName is required' }, { status: 400 });
    }

    console.log(`\n🔍 [API /api/pdf/query] User Query: "${query}" on Document: "${fileName}"`);

    // 1. Fetch chunks for this PDF from local database
    const allFileChunks = getChunksForFile(fileName);

    if (allFileChunks.length === 0) {
      return NextResponse.json({ 
        error: `No chunks found for "${fileName}". Please upload and index the file first.` 
      }, { status: 404 });
    }

    // 2. Strict Quality Filter: Only allow verified chunks with qualityScore >= 0.50
    const verifiedChunks: ChunkRecord[] = allFileChunks.filter(chunk => {
      if (chunk.sourceStatus === 'unreliable') {
        console.warn(`[Retrieval Filter] Excluded chunk from Page ${chunk.pageNumber} because sourceStatus is "unreliable"`);
        return false;
      }
      if (chunk.textQualityScore !== undefined && chunk.textQualityScore < 0.50) {
        console.warn(`[Retrieval Filter] Excluded chunk from Page ${chunk.pageNumber} due to low text quality (${chunk.textQualityScore})`);
        return false;
      }
      const liveQuality = validateTextQuality(chunk.text, { threshold: 0.50 });
      return liveQuality.isValid;
    });

    // If ALL chunks in this file were rejected because of corruption/unreliability:
    if (verifiedChunks.length === 0) {
      console.warn(`[Retrieval Quality Gate] All chunks for "${fileName}" failed quality validation. Returning abstention.`);
      const abstentionText = formatAbstentionResponse(
        fileName,
        allFileChunks[0]?.pageNumber || 'All',
        'Corrupted extraction / unreadable font glyph mappings in source PDF',
        'Please reprocess this document using OCR fallback or upload a high-resolution copy.'
      );

      return NextResponse.json({
        answer: abstentionText,
        citations: [],
        groundedClaims: [],
        groundingScore: 0,
        modelUsed: 'Evidence Grounding Quality Gate (Abstention)',
        isAbstention: true,
        isSummary: false
      });
    }

    // 3. Determine if query is asking for summary
    const isSummaryRequest = /summarize|summary|overview|what is this document about|outline|brief|main points/i.test(query);
    
    let relevantChunks: ChunkRecord[] = [];
    let prompt = '';

    if (isSummaryRequest) {
      // Summary retrieval: distribute representative chunks across verified pages
      verifiedChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
      
      const maxSummaryChunks = 8;
      if (verifiedChunks.length <= maxSummaryChunks) {
        relevantChunks = verifiedChunks;
      } else {
        const step = Math.floor(verifiedChunks.length / maxSummaryChunks);
        for (let i = 0; i < maxSummaryChunks; i++) {
          const idx = Math.min(i * step, verifiedChunks.length - 1);
          if (!relevantChunks.includes(verifiedChunks[idx])) {
            relevantChunks.push(verifiedChunks[idx]);
          }
        }
      }

      const contextText = relevantChunks
        .map(c => `[Page ${c.pageNumber}${c.clauseNumber ? `, ${c.clauseNumber}` : ''}] (Extraction: ${c.extractionMethod || 'native'}, Quality: ${Math.round((c.textQualityScore || 1) * 100)}%):\n"${c.text}"`)
        .join('\n\n');

      prompt = `System: You are an expert Bureau of Indian Standards (BIS) Document Summarization Assistant.
Generate a structured, evidence-grounded executive summary of "${fileName}" based EXCLUSIVELY on the provided verified excerpts below.

CRITICAL EVIDENCE-GROUNDING RULES:
1. Use ONLY facts, clauses, and metrics stated in the provided excerpts below.
2. Do NOT extrapolate or assume information not present in the excerpts.
3. Cite page numbers (e.g. "[Page 2]") for all major requirements.
4. If technical details are missing from the excerpts, explicitly note what is missing rather than guessing.

Verified Document Excerpts:
${contextText}

Executive Summary:`;

    } else {
      // Standard Q&A: Vector Similarity Search
      const queryEmbedding = await getOllamaEmbedding(query);

      // Score verified chunks
      const scoredChunks = verifiedChunks.map((chunk) => {
        const score = cosineSimilarity(queryEmbedding, chunk.embedding || []);
        return {
          ...chunk,
          score: score
        };
      });

      scoredChunks.sort((a, b) => (b.score || 0) - (a.score || 0));
      const topMatchingChunks = scoredChunks.filter(c => (c.score || 0) > 0.05).slice(0, 6);

      if (topMatchingChunks.length > 0) {
        relevantChunks = topMatchingChunks;
      } else {
        // Fallback to top scored chunks if none exceeded strict similarity
        relevantChunks = scoredChunks.slice(0, 4);
      }

      const contextText = relevantChunks
        .map(c => `[Page ${c.pageNumber}${c.clauseNumber ? `, ${c.clauseNumber}` : ''}] (Method: ${c.extractionMethod || 'native'}):\n"${c.text}"`)
        .join('\n\n');

      prompt = `System: You are an expert Indian Standards & Gazette Compliance Auditor.
Your duty is to provide a 100% evidence-grounded answer to the user's question using ONLY the provided verified PDF excerpts from "${fileName}".

STRICT EVIDENCE-GROUNDING RULES:
1. Use ONLY the retrieved and verified source context below.
2. Do NOT use prior parametric knowledge to fill gaps or invent requirements.
3. Do NOT infer specific grades, classes, legal requirements, clause requirements, dates, standards, or certification obligations unless explicitly supported by the retrieved text.
4. Every major factual claim must cite the exact page number (e.g. "[Page ${relevantChunks[0]?.pageNumber || 1}]").
5. If the retrieved context does NOT contain sufficient evidence to answer the question, you MUST return:
"Unable to verify from the available source evidence. The retrieved document excerpts do not contain sufficient evidence to answer this question."
6. Never cite a page unless it contains readable, verifiable proof supporting the claim.

Verified Document Context:
${contextText}

User Question: ${query}

Detailed Evidence-Grounded Answer:`;
    }

    // 4. Query AI Pipelines: Local Ollama -> Gemini API -> OpenRouter -> Direct Excerpts
    let rawAnswer = '';
    let activeModel = '';
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;

    // Pipeline 1: Local Ollama AI
    const ollamaStatus = await checkOllamaAvailability();
    if (ollamaStatus.isAvailable) {
      const modelsToTry = ollamaStatus.models.length > 0 
        ? ollamaStatus.models 
        : ['mistral:latest', 'llama3:latest', 'gemma:2b', 'mistral', 'llama3'];

      for (const modelCandidate of modelsToTry) {
        try {
          const ollamaRes = await queryOllamaLocal(prompt, modelCandidate);
          if (ollamaRes && ollamaRes.trim().length > 0) {
            rawAnswer = ollamaRes;
            activeModel = `Ollama (${modelCandidate})`;
            break;
          }
        } catch (mErr) {
          console.warn(`[Ollama Query] Model ${modelCandidate} failed, trying next...`);
        }
      }
    }

    // Pipeline 2: Google Gemini Cloud API
    if (!rawAnswer && geminiApiKey) {
      activeModel = 'gemini-1.5-flash (Cloud)';
      try {
        const geminiRes = await queryGeminiAPI(prompt, geminiApiKey);
        if (geminiRes) {
          rawAnswer = geminiRes;
        }
      } catch (err) {
        console.warn('[Gemini Query] Gemini Cloud API execution failed.');
      }
    }

    // Pipeline 3: OpenRouter API
    if (!rawAnswer && openrouterApiKey) {
      activeModel = 'gemini-2.0-flash-exp (OpenRouter Cloud)';
      try {
        const openrouterRes = await queryOpenRouterAPI(prompt, openrouterApiKey);
        if (openrouterRes) {
          rawAnswer = openrouterRes;
        }
      } catch (err) {
        console.warn('[OpenRouter Query] OpenRouter execution failed.');
      }
    }

    // Pipeline 4: Offline direct verified excerpt presentation
    if (!rawAnswer) {
      activeModel = 'Offline Verified Evidence Presenter';
      rawAnswer = `### 📌 Verified Document Excerpts (Direct Grounded Matches)
The AI reasoning engine is currently offline. Below are the verified excerpts retrieved directly from **${fileName}**:

${relevantChunks.map((c, i) => `**Excerpt ${i + 1} (Page ${c.pageNumber}${c.clauseNumber ? ` - ${c.clauseNumber}` : ''})** [Method: ${c.extractionMethod || 'native'}, Quality: ${Math.round((c.textQualityScore || 1) * 100)}%]:
> "${c.text}"`).join('\n\n')}`;
    }

    // 5. Post-Generation Citation-to-Claim Validation
    const groundingValidation = validateCitationToClaims(rawAnswer, relevantChunks);
    let finalAnswer = rawAnswer;

    if (groundingValidation.abstentionRequired) {
      console.warn(`[Grounding Validator] AI response failed grounding validation. Abstention enforced.`);
      finalAnswer = formatAbstentionResponse(
        fileName,
        relevantChunks[0]?.pageNumber || 'Unspecified',
        'Retrieved evidence does not contain sufficient factual support for this question',
        'Please verify with the official standard or re-query with specific clause terms.'
      );
    }

    // Format rich citations for frontend display
    const citations = relevantChunks.map(c => ({
      pageNumber: c.pageNumber,
      clauseNumber: c.clauseNumber || 'General Passage',
      snippet: c.text,
      relevanceScore: (c as any).score !== undefined ? Math.round((c as any).score * 100) : 95,
      extractionMethod: c.extractionMethod || 'native',
      textQualityScore: c.textQualityScore !== undefined ? Math.round(c.textQualityScore * 100) : 100,
      sourceStatus: c.sourceStatus || 'verified',
      verified: true
    }));

    return NextResponse.json({
      answer: finalAnswer,
      citations: citations,
      groundedClaims: groundingValidation.verifiedClaims,
      groundingScore: groundingValidation.groundingScore,
      modelUsed: activeModel,
      isSummary: isSummaryRequest,
      isAbstention: groundingValidation.abstentionRequired
    });

  } catch (error: any) {
    console.error('Error in PDF query API:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error' 
    }, { status: 500 });
  }
}
