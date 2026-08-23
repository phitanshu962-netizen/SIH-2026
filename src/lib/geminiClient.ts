/**
 * Gemini Client using Native Fetch REST API
 * Zero npm dependency issues, resilient fallback to Ollama AI & Neural RAG Engine
 */

export async function queryGemini(prompt: string, modelName: string = 'gemini-1.5-flash'): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key_here')) {
    return null;
  }

  try {
    const targetModel = modelName.includes('2.5') || modelName.includes('3.') ? 'gemini-1.5-flash' : modelName;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      console.warn(`Gemini API returned non-200 status: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || null;
  } catch (error) {
    console.warn("Gemini REST API fetch error, executing fallback.");
    return null;
  }
}
