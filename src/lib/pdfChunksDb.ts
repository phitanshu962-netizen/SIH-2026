import fs from 'fs';
import path from 'path';
import { validateTextQuality } from './textQualityValidator';

export interface ChunkRecord {
  id?: string;
  fileName: string;
  documentId?: string;
  documentName?: string;
  text: string;
  pageNumber: number;
  clauseNumber?: string;
  clauseHeading?: string;
  chunkIndex: number;
  extractionMethod?: 'native' | 'ocr';
  textQualityScore?: number;
  sourceStatus?: 'verified' | 'unreliable';
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
    documentId: c.documentId || fileName,
    documentName: c.documentName || fileName,
    extractionMethod: c.extractionMethod || 'native',
    textQualityScore: c.textQualityScore !== undefined ? c.textQualityScore : 1.0,
    sourceStatus: c.sourceStatus || 'verified',
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

/**
 * Retrieves only verified, readable chunks for a specific file.
 */
export function getVerifiedChunksForFile(fileName: string): ChunkRecord[] {
  const chunks = getChunksForFile(fileName);
  return chunks.filter(c => {
    // 1. Explicit status check
    if (c.sourceStatus === 'unreliable') return false;
    
    // 2. Quality score check
    if (c.textQualityScore !== undefined && c.textQualityScore < 0.50) return false;
    
    // 3. Fallback on-the-fly quality validation to catch un-migrated legacy chunks
    const quality = validateTextQuality(c.text, { threshold: 0.50 });
    return quality.isValid;
  });
}
