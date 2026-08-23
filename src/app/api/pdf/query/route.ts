import { NextResponse } from 'next/server';
import { generateLocalTermEmbedding, cosineSimilarity } from '@/lib/ollamaEmbeddings';
import { getChunksForFile, ChunkRecord } from '@/lib/pdfChunksDb';
import { validateTextQuality } from '@/lib/textQualityValidator';
import { checkOllamaAvailability, queryOllamaLocal, queryGeminiAPI, queryOpenRouterAPI } from '@/lib/ollamaClient';
import { validateCitationToClaims, formatAbstentionResponse } from '@/lib/evidenceGroundingValidator';

const STOPWORDS = new Set([
  'what', 'is', 'the', 'should', 'be', 'of', 'in', 'for', 'to', 'and', 'or', 'a', 'an', 'are', 'how', 'much',
  'many', 'can', 'does', 'do', 'as', 'at', 'by', 'from', 'that', 'this', 'with', 'on', 'tell', 'me', 'about'
]);

/**
 * Calculates a high-precision semantic heading, n-gram sequence, and clause relevance score.
 * Discriminating between semantically adjacent but distinct clauses (e.g. "Heating-Up Time" vs "Heating-Up Excess Temperature").
 */
function calculateClauseSemanticRelevance(
  query: string, 
  text: string, 
  clauseNumber?: string, 
  clauseHeading?: string
): number {
  const qClean = query.toLowerCase().replace(/[-–—/]/g, ' ').replace(/\s+/g, ' ').trim();
  const tClean = text.toLowerCase().replace(/[-–—/]/g, ' ').replace(/\s+/g, ' ').trim();
  let score = 0;

  // 1. EXACT & PARTIAL CLAUSE HEADING MATCH (Top Priority)
  if (clauseHeading) {
    const hClean = clauseHeading.toLowerCase().replace(/[-–—/]/g, ' ').replace(/\s+/g, ' ').trim();

    // Exact heading match or substring match
    if (qClean.includes(hClean) || hClean.includes(qClean)) {
      score += 250; // Highest confidence heading match!
    } else {
      const headingWords = hClean.split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
      const queryWords = qClean.split(/\s+/).filter(w => w.length > 2 && !STOPWORDS.has(w));
      
      const matchingWords = headingWords.filter(w => queryWords.includes(w));
      const matchRatio = headingWords.length > 0 ? matchingWords.length / headingWords.length : 0;

      if (matchRatio >= 0.75) {
        score += 180;
      } else if (matchRatio >= 0.5) {
        score += 80;
      }

      // Penalty for conflicting target nouns in heading
      // e.g. User asks for "time", but heading is "excess temperature" / "overswing"
      if (qClean.includes('time') && (hClean.includes('temperature') || hClean.includes('overswing') || hClean.includes('excess')) && !hClean.includes('time')) {
        score -= 50;
      }
    }
  }

  // 2. EXACT NUMERIC CLAUSE MATCH (e.g. "10", "10.1", "Clause 10", "13.1")
  const numericClauseMatches = qClean.match(/\b\d+(\.\d+)*\b/g);
  if (numericClauseMatches) {
    for (const num of numericClauseMatches) {
      if (clauseNumber && clauseNumber.includes(num)) {
        score += 90;
      }
      if (tClean.includes(`clause ${num}`) || tClean.includes(`cl ${num}`) || tClean.startsWith(`${num} `)) {
        score += 80;
      }
    }
  }

  // 3. MULTI-WORD N-GRAM PHRASE MATCHES (Sequential Precision)
  const queryTokens = qClean.split(/\s+/).filter(w => w.length >= 2 && !STOPWORDS.has(w));

  // Trigrams (e.g. "heating up time", "sole plate temperature", "moisture content requirement")
  for (let i = 0; i < queryTokens.length - 2; i++) {
    const trigram = `${queryTokens[i]} ${queryTokens[i + 1]} ${queryTokens[i + 2]}`;
    if (tClean.includes(trigram)) {
      score += 90;
    }
  }

  // Bigrams (e.g. "heating time", "moisture content", "leakage current", "excess temperature")
  for (let i = 0; i < queryTokens.length - 1; i++) {
    const bigram = `${queryTokens[i]} ${queryTokens[i + 1]}`;
    if (tClean.includes(bigram)) {
      score += 45;
    }
  }

  // 4. UNIGRAM TERM OVERLAP
  for (const word of queryTokens) {
    if (tClean.includes(word)) {
      score += 15;
      if (word.length >= 6) {
        score += 15;
      }
    }
  }

  // 5. TARGET METRIC & UNIT REINFORCEMENT
  if (/\b(time|minutes|seconds|duration|hours)\b/i.test(qClean)) {
    if (/\b(minutes|minute|seconds|hours|time required|shall not exceed \d+ min)\b/i.test(tClean)) {
      score += 40;
    }
  }

  if (/\b(temperature|degrees|celsius|temp)\b/i.test(qClean)) {
    if (/\b(°c|celsius|degrees|temperature rise)\b/i.test(tClean)) {
      score += 30;
    }
  }

  return score;
}

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

    // 1. Fetch all chunks for this PDF from local database
    const allFileChunks = getChunksForFile(fileName);

    if (allFileChunks.length === 0) {
      return NextResponse.json({ 
        error: `No chunks found for "${fileName}". Please upload and index the file first.` 
      }, { status: 404 });
    }

    // 2. Strict Quality Filter: Only allow verified chunks with qualityScore >= 0.40
    const verifiedChunks: ChunkRecord[] = allFileChunks.filter(chunk => {
      if (chunk.sourceStatus === 'unreliable') {
        return false;
      }
      if (chunk.textQualityScore !== undefined && chunk.textQualityScore < 0.40) {
        return false;
      }
      const liveQuality = validateTextQuality(chunk.text, { threshold: 0.40 });
      return liveQuality.isValid;
    });

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
        .map(c => `[Page ${c.pageNumber}${c.clauseNumber ? `, ${c.clauseNumber}` : ''}${c.clauseHeading ? ` (${c.clauseHeading})` : ''}]:\n"${c.text}"`)
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
      // Standard Q&A: Semantic Heading Match + N-Gram Matching + Vector Similarity
      const queryEmbedding = generateLocalTermEmbedding(query);

      const scoredChunks = verifiedChunks.map((chunk) => {
        const vectorSimilarity = cosineSimilarity(queryEmbedding, chunk.embedding || generateLocalTermEmbedding(chunk.text));
        const semanticScore = calculateClauseSemanticRelevance(query, chunk.text, chunk.clauseNumber, chunk.clauseHeading);

        const totalScore = (vectorSimilarity * 30) + semanticScore;

        return {
          ...chunk,
          vectorScore: vectorSimilarity,
          semanticScore: semanticScore,
          score: totalScore
        };
      });

      // Sibling Clause Co-Reference Boost:
      // If the top-ranked chunk belongs to a specific section (e.g. Clause 12 / 12.1),
      // pull in its contiguous continuation / sibling subclauses (e.g. Clause 12.2) across pages
      const topChunk = scoredChunks[0];
      if (topChunk && topChunk.clauseNumber && topChunk.clauseNumber.startsWith('Clause ')) {
        const baseClauseNum = topChunk.clauseNumber.replace(/^Clause\s*/i, '').split('.')[0]; // e.g. "12"
        for (const chunk of scoredChunks) {
          if (chunk !== topChunk && chunk.clauseNumber) {
            const chunkBaseNum = chunk.clauseNumber.replace(/^Clause\s*/i, '').split('.')[0];
            if (chunkBaseNum === baseClauseNum) {
              chunk.score += 160; // Sibling clause boost to keep multi-page procedures intact!
            }
          }
        }
      }

      // Sort descending by total relevance
      scoredChunks.sort((a, b) => b.score - a.score);

      const topScore = scoredChunks[0]?.score || 0;

      // Adaptive high-confidence threshold: keep only chunks that are genuinely relevant (>= 35% of top score)
      // and max 4 chunks to prevent irrelevant trailing page noise (like Page 12, Page 7)
      const topMatching = scoredChunks.filter(c => {
        if (c.score <= 0) return false;
        return c.score >= topScore * 0.35 && (c.semanticScore > 0 || c.vectorScore > 0.05);
      }).slice(0, 4);

      if (topMatching.length > 0) {
        relevantChunks = topMatching;
      } else {
        relevantChunks = scoredChunks.slice(0, 2);
      }

      const contextText = relevantChunks
        .map(c => `[Page ${c.pageNumber}${c.clauseNumber ? ` - ${c.clauseNumber}` : ''}${c.clauseHeading ? ` (${c.clauseHeading})` : ''}]:\n"${c.text}"`)
        .join('\n\n');

      prompt = `System: You are an expert Document Intelligence and Technical Standards Compliance Auditor.
Your task is to analyze the provided verified PDF Context excerpts from "${fileName}" and answer the user's technical compliance question with strict evidence precision.

CRITICAL STATUTORY ACCURACY & FIDELITY RULES:
1. VERBATIM LOCATION & PARAMETER FIDELITY: When the standard lists specific measurement locations, physical positions, or lettered items (e.g., a, b, c, d), transcribe each location VERBATIM from the excerpt (e.g., carefully distinguish "tip" vs "heel", "inlet" vs "outlet", "top" vs "bottom"). NEVER duplicate or substitute location terms.
2. COMPLETE PROCEDURAL FIDELITY: When describing a test method or procedure, provide all sequential steps in full without skipping conditioning times, steady-state temperatures (e.g., 150°C), durations (e.g. 10 or 15 minutes), measurement cycles, and exact mathematical calculations (e.g. average, mean of averages, and differences).
3. NUMERICAL & SPATIAL PRECISION: Reproduce all exact numbers, units (mm, N, °C, MPa, min), and spatial dimensions (e.g., "20 mm from the tip", "20 mm from the heel") with 100% precision matching the text.
4. Always cite the exact page number and clause number (e.g. "[Page ${relevantChunks[0]?.pageNumber || 1}${relevantChunks[0]?.clauseNumber ? `, ${relevantChunks[0].clauseNumber}` : ''}]").
5. If the provided excerpts do not contain sufficient evidence to answer the question, state: "Unable to verify from the available source evidence. The retrieved document excerpts do not contain sufficient evidence to answer this question."

Verified Document Context:
${contextText}

User Question: ${query}

Detailed Technical Answer:`;
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

${relevantChunks.map((c, i) => `**Excerpt ${i + 1} (Page ${c.pageNumber}${c.clauseNumber ? ` - ${c.clauseNumber}` : ''}${c.clauseHeading ? ` [${c.clauseHeading}]` : ''})** [Method: ${c.extractionMethod || 'native'}, Quality: ${Math.round((c.textQualityScore || 1) * 100)}%]:
> "${c.text}"`).join('\n\n')}`;
    }

    // 5. Post-Generation Citation-to-Claim Validation & Token Alignment
    const { alignAndVerifyFactualFidelity } = await import('@/lib/evidenceGroundingValidator');
    const alignedAnswer = alignAndVerifyFactualFidelity(rawAnswer, relevantChunks);
    const groundingValidation = validateCitationToClaims(alignedAnswer, relevantChunks);
    let finalAnswer = alignedAnswer;

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
      clauseNumber: c.clauseNumber ? `${c.clauseNumber}${c.clauseHeading ? ` (${c.clauseHeading})` : ''}` : (c.clauseHeading || 'General Passage'),
      snippet: c.text,
      relevanceScore: (c as any).score !== undefined ? Math.min(99, Math.round((c as any).score)) : 95,
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
