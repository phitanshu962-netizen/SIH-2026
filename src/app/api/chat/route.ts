import { NextResponse } from 'next/server';
import { generateStructuredRAGAnswer } from '@/lib/ragEngine';
import { checkOllamaAvailability, queryOllamaLocal, queryOpenRouterAPI } from '@/lib/ollamaClient';
import { queryGemini } from '@/lib/geminiClient';
import { UserPersona } from '@/lib/types';

export async function POST(req: Request) {
  try {
    const { query, persona = 'manufacturer', preferredModel } = await req.json();

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    let engineUsed: 'Ollama (Local LLM)' | 'Gemini (Cloud API)' | 'OpenRouter (Cloud API)' | 'Gemini / Neural Grounded RAG' = 'Gemini / Neural Grounded RAG';
    let modelName = 'Neural BIS Grounded RAG';
    let llmResponse: string | null = null;

    const prompt = [
      "You are an expert Indian Standards & BIS (Bureau of Indian Standards) AI Assistant.",
      "Answer the user question in simple, clear, easy-to-understand English.",
      "CRITICAL FORMATTING RULES:",
      "- DO NOT write long continuous paragraphs.",
      "- Use double line breaks between numbered sections and bullet points.",
      "- Always format steps and lists using clean bullet points like 'Step 1:', 'Step 2:'.",
      "",
      `User Role: ${persona}`,
      `Question: ${query}`,
      "",
      "Structure your output strictly as follows:",
      "",
      "📌 1. Applicable BIS Standard & Mandatory Status:",
      "- IS Code & Title",
      "- Mandatory QCO / CRS Scheme status",
      "",
      "🧪 2. Key Technical Safety & Testing Requirements:",
      "- Safety & technical parameters",
      "",
      "📄 3. Required Documents:",
      "- Essential manufacturing & lab test certificates",
      "",
      "🚀 4. Step-by-Step Licensing Procedure:",
      "- Step 1:",
      "- Step 2:",
      "- Step 3:",
      "",
      "⚠️ 5. Non-Compliance Penalty:",
      "- Section 29 penalty of BIS Act 2016"
    ].join('\n');

    // 1. Priority check: Ollama Local LLM Server
    const ollamaStatus = await checkOllamaAvailability();
    if (ollamaStatus.isAvailable) {
      const activeOllamaModel = preferredModel || ollamaStatus.activeModel || 'llama3:latest';
      try {
        const ollamaRes = await queryOllamaLocal(prompt, activeOllamaModel);
        if (ollamaRes) {
          engineUsed = 'Ollama (Local LLM)';
          modelName = activeOllamaModel;
          llmResponse = ollamaRes;
        }
      } catch (err) {
        console.warn('Ollama chat pipeline failed. Falling back...');
      }
    }

    // 2. Secondary check: Gemini API (if Ollama is not active or returned null)
    if (!llmResponse && (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY)) {
      try {
        const geminiRes = await queryGemini(prompt, 'gemini-1.5-flash');
        if (geminiRes) {
          engineUsed = 'Gemini / Neural Grounded RAG';
          modelName = 'gemini-1.5-flash';
          llmResponse = geminiRes;
        }
      } catch (err) {
        console.warn('Gemini cloud chat pipeline failed. Falling back...');
      }
    }

    // 3. Tertiary check: OpenRouter API
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!llmResponse && openrouterApiKey) {
      try {
        const openrouterRes = await queryOpenRouterAPI(prompt, openrouterApiKey);
        if (openrouterRes) {
          engineUsed = 'OpenRouter (Cloud API)';
          modelName = 'gemini-2.0-flash-exp';
          llmResponse = openrouterRes;
        }
      } catch (err) {
        console.warn('OpenRouter cloud chat pipeline failed. Falling back...');
      }
    }

    // 4. Fallback: Local Grounded Neural BIS RAG Engine (100% Uptime Guaranteed)
    if (!llmResponse) {
      engineUsed = 'Gemini / Neural Grounded RAG';
      modelName = 'Neural BIS Grounded RAG (Local Engine)';
    }

    const payload = generateStructuredRAGAnswer(query, persona as UserPersona, engineUsed as any, modelName, llmResponse);
    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
