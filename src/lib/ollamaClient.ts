export interface OllamaStatus {
  isAvailable: boolean;
  models: string[];
  activeModel?: string;
  error?: string;
}

export async function checkOllamaAvailability(): Promise<OllamaStatus> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      return { isAvailable: false, models: [], error: 'Ollama server returned non-200 response' };
    }

    const data = await response.json();
    const models = (data.models || []).map((m: any) => m.name || m.model);

    return {
      isAvailable: true,
      models: models.length > 0 ? models : ['llama3:latest', 'mistral:latest', 'gemma:2b'],
      activeModel: models[0] || 'llama3:latest'
    };
  } catch (err: any) {
    return {
      isAvailable: false,
      models: [],
      error: 'Ollama local server not detected on http://localhost:11434'
    };
  }
}

export async function queryOllamaLocal(prompt: string, modelName: string = 'llama3:latest'): Promise<string | null> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        prompt: prompt,
        stream: false
      })
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.response || null;
  } catch (error) {
    console.warn("Ollama generation failed, falling back to local grounded neural engine.");
    return null;
  }
}

/**
 * Queries the cloud Google Gemini API as a secondary pipeline.
 */
export async function queryGeminiAPI(prompt: string, apiKey: string): Promise<string | null> {
  const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-flash-lite-latest'];
  for (const model of models) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 0) {
          return text;
        }
      }
    } catch (err) {
      console.warn(`Error querying Gemini model ${model}:`, err);
    }
  }
  return null;
}

/**
 * Queries the cloud OpenRouter API as a tertiary pipeline.
 */
export async function queryOpenRouterAPI(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'BIS AI Platform'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-exp:free',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      console.error('OpenRouter API returned status:', response.status);
      return null;
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.error('Error querying OpenRouter API:', err);
    return null;
  }
}
