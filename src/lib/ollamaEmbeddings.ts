/**
 * Fetches a dense vector embedding from the local Ollama server using the nomic-embed-text model.
 */
export async function getOllamaEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch('http://localhost:11434/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        input: text
      }),
      // Set to no cache to prevent reading stale cached HTTP calls
      next: { revalidate: 0 }
    } as any);

    if (!response.ok) {
      throw new Error(`Ollama API responded with status ${response.status}`);
    }

    const data = await response.json();
    if (data.embeddings && data.embeddings.length > 0) {
      return data.embeddings[0];
    }
    
    throw new Error('Ollama response did not contain embeddings list.');
  } catch (error: any) {
    console.error('Error fetching Ollama embedding:', error);
    throw new Error(`Failed to generate embeddings: ${error.message || error}`);
  }
}

/**
 * Calculates the cosine similarity score between two numeric vector arrays.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    return 0; // Dimensions must match
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
    return 0; // Prevent division by zero
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
