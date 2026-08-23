import { loadChunks, saveChunks, ChunkRecord } from './pdfChunksDb';
import { validateTextQuality } from './textQualityValidator';

export interface MigrationReport {
  totalScanned: number;
  corruptedRemoved: number;
  verifiedRetained: number;
  affectedFiles: { fileName: string; corruptedPages: number[]; sampleCorruptedSnippet: string }[];
  timestamp: string;
}

/**
 * Scans the local vector database, detects corrupted/gibberish chunks,
 * purges invalid records, and attaches proper textQualityScore and sourceStatus metadata.
 */
export function auditAndSanitizeChunksDatabase(): MigrationReport {
  console.log('\n🧹 [Database Sanitization Started] Auditing existing PDF vector chunks...');
  const chunks = loadChunks();
  const validChunks: ChunkRecord[] = [];
  const affectedFilesMap = new Map<string, { pages: Set<number>; sample: string }>();

  let corruptedRemoved = 0;

  for (const chunk of chunks) {
    const quality = validateTextQuality(chunk.text, { threshold: 0.50 });

    if (!quality.isValid || chunk.sourceStatus === 'unreliable') {
      corruptedRemoved++;

      if (!affectedFilesMap.has(chunk.fileName)) {
        affectedFilesMap.set(chunk.fileName, {
          pages: new Set<number>([chunk.pageNumber]),
          sample: chunk.text.slice(0, 80)
        });
      } else {
        affectedFilesMap.get(chunk.fileName)!.pages.add(chunk.pageNumber);
      }

      console.warn(
        `[Sanitization] Removed corrupted chunk from "${chunk.fileName}" Page ${chunk.pageNumber} (Quality Score: ${quality.qualityScore}, Issues: [${quality.issues.join('; ')}])`
      );
    } else {
      // Enrich verified chunk with metadata
      validChunks.push({
        ...chunk,
        documentId: chunk.documentId || chunk.fileName,
        documentName: chunk.documentName || chunk.fileName,
        extractionMethod: chunk.extractionMethod || 'native',
        textQualityScore: chunk.textQualityScore !== undefined ? chunk.textQualityScore : quality.qualityScore,
        sourceStatus: 'verified'
      });
    }
  }

  saveChunks(validChunks);

  const affectedFiles = Array.from(affectedFilesMap.entries()).map(([fileName, data]) => ({
    fileName,
    corruptedPages: Array.from(data.pages).sort((a, b) => a - b),
    sampleCorruptedSnippet: data.sample
  }));

  const report: MigrationReport = {
    totalScanned: chunks.length,
    corruptedRemoved,
    verifiedRetained: validChunks.length,
    affectedFiles,
    timestamp: new Date().toISOString()
  };

  console.log(
    `✅ [Database Sanitization Completed] Scanned: ${chunks.length}, Corrupted Removed: ${corruptedRemoved}, Verified Retained: ${validChunks.length}\n`
  );

  return report;
}
