/**
 * Gemini Client using Native Fetch REST API
 * Automatic fallback across models (gemini-flash-latest, gemini-3.7-flash, gemini-2.5-flash-lite)
 */

export async function queryGemini(prompt: string, preferredModel: string = 'gemini-3.5-flash-lite'): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gemini_api_key_here')) {
    return null;
  }

  const modelCandidates = [
    preferredModel,
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-flash-lite-latest',
    'gemini-flash-latest'
  ].filter((v, i, a) => a.indexOf(v) === i);

  for (const model of modelCandidates) {
    try {
      const cleanModel = model.startsWith('models/') ? model : `models/${model}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/${cleanModel}:generateContent?key=${apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text && text.trim().length > 0) {
          return text;
        }
      }
    } catch (error) {
      console.warn(`Gemini model ${model} fetch failed, trying candidate...`);
    }
  }

  return null;
}
