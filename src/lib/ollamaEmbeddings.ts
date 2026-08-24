/**
 * Multi-Tier Dense Vector Embedding Generator:
 * Tier 1: Local Ollama (nomic-embed-text)
 * Tier 2: Cloud Google Gemini Embeddings (gemini-embedding-001 / gemini-embedding-2)
 * Tier 3: Deterministic Offline Hashed Term-Vector (100% Offline, Zero Failure Guarantee)
 */

export function generateOfflineEmbedding(text: string, dimensions = 384): number[] {
  const vec = new Float64Array(dimensions);
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  
  if (words.length === 0) {
    return Array.from(vec);
  }

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Unigram 32-bit FNV-1a Hash
    let h1 = 0x811c9dc5;
    for (let j = 0; j < word.length; j++) {
      h1 ^= word.charCodeAt(j);
      h1 = Math.imul(h1, 0x01000193);
    }
    const idx1 = Math.abs(h1) % dimensions;
    vec[idx1] += 1.0;

    // Bigram Hash
    if (i < words.length - 1) {
      const bigram = word + '_' + words[i + 1];
      let h2 = 0x811c9dc5;
      for (let j = 0; j < bigram.length; j++) {
        h2 ^= bigram.charCodeAt(j);
        h2 = Math.imul(h2, 0x01000193);
      }
      const idx2 = Math.abs(h2) % dimensions;
      vec[idx2] += 1.5;
    }
  }

  // L2 Normalize vector
  let norm = 0;
  for (let i = 0; i < dimensions; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      vec[i] /= norm;
    }
  }

  return Array.from(vec);
}

export function generateLocalTermEmbedding(text: string): number[] {
  return generateOfflineEmbedding(text, 384);
}

export async function getOllamaEmbedding(text: string): Promise<number[]> {
  const cleanText = text.trim();
  if (!cleanText) {
    return generateOfflineEmbedding('empty');
  }

  // 1. Try Local Ollama Server (/api/embed or /api/embeddings)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch('http://localhost:11434/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        input: cleanText
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.embeddings && data.embeddings.length > 0) {
        return data.embeddings[0];
      }
    }
  } catch (err) {
    // Try classic endpoint
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const response = await fetch('http://localhost:11434/api/embeddings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'nomic-embed-text',
          prompt: cleanText
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data.embedding && data.embedding.length > 0) {
          return data.embedding;
        }
      }
    } catch (e) {}
  }

  // 2. Try Google Gemini Cloud Embeddings
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (apiKey && apiKey.trim() !== '' && !apiKey.includes('your_gemini_api_key_here')) {
    const embedModels = ['models/gemini-embedding-001', 'models/gemini-embedding-2'];
    for (const model of embedModels) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/${model}:embedContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: { parts: [{ text: cleanText }] }
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.embedding?.values && data.embedding.values.length > 0) {
            return data.embedding.values;
          }
        }
      } catch (err) {
        // Continue to next embedding model or offline fallback
      }
    }
  }

  // 3. Guaranteed Deterministic Offline Hashed Embedding
  return generateOfflineEmbedding(cleanText);
}

/**
 * Calculates the cosine similarity score between two numeric vector arrays.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }

  if (vecA.length !== vecB.length) {
    return 0;
  }
  
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
