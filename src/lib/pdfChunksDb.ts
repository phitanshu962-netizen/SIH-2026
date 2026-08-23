import fs from 'fs';
import path from 'path';

export interface ChunkRecord {
  fileName: string;
  text: string;
  pageNumber: number;
  chunkIndex: number;
  embedding: number[];
  createdAt: string;
}

const DB_FILE = path.join(process.cwd(), 'pdf_chunks.json');

/**
 * Loads all chunk records from the local JSON database file.
 */
export function loadChunks(): ChunkRecord[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to read local PDF chunks database:', err);
  }
  return [];
}

/**
 * Saves chunk records back to the local JSON database file.
 */
export function saveChunks(chunks: ChunkRecord[]): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(chunks, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write local PDF chunks database:', err);
  }
}

/**
 * Replaces chunk records for a specific file to prevent duplicate indexing.
 */
export function addChunksForFile(fileName: string, newChunks: Omit<ChunkRecord, 'createdAt'>[]): void {
  const allChunks = loadChunks();
  // Clean out any existing chunks under this filename
  const filtered = allChunks.filter(c => c.fileName !== fileName);
  
  const createdChunks: ChunkRecord[] = newChunks.map(c => ({
    ...c,
    createdAt: new Date().toISOString()
  }));
  
  filtered.push(...createdChunks);
  saveChunks(filtered);
}

/**
 * Retrieves chunks indexed under a specific filename.
 */
export function getChunksForFile(fileName: string): ChunkRecord[] {
  const allChunks = loadChunks();
  return allChunks.filter(c => c.fileName === fileName);
}
