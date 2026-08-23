import { NextResponse } from 'next/server';
import { parsePdfToPages, chunkPages } from '@/lib/pdfParser';
import { generateLocalTermEmbedding } from '@/lib/ollamaEmbeddings';
import { addChunksForFile } from '@/lib/pdfChunksDb';

export const maxDuration = 300; // Allow long-running executions up to 5 minutes for OCR

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      return NextResponse.json({ error: 'Only PDF files are supported' }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`\n======================================================`);
    console.log(`📥 [API /api/pdf/upload] Ingesting: "${file.name}" (${(buffer.length / 1024).toFixed(1)} KB)`);
    console.log(`======================================================`);

    // 1. Parse PDF page-by-page with text quality validation and automatic OCR fallback
    const pages = await parsePdfToPages(buffer, {
      enableOCR: true,
      qualityThreshold: 0.65,
      fileName: file.name
    });

    const totalPages = pages.length;
    const verifiedPages = pages.filter(p => p.sourceStatus === 'verified');
    const ocrPages = pages.filter(p => p.extractionMethod === 'ocr' && p.sourceStatus === 'verified');
    const unreliablePages = pages.filter(p => p.sourceStatus === 'unreliable');

    // 2. Chunk only verified, readable pages into overlapping segments
    const chunks = chunkPages(pages, 800, 150, {
      documentId: file.name,
      fileName: file.name
    });

    if (chunks.length === 0) {
      console.warn(`[API /api/pdf/upload] Zero readable chunks extracted from "${file.name}".`);
      return NextResponse.json({
        error: 'No readable or verified text content could be extracted from this PDF. Even OCR fallback could not produce reliable text.',
        totalPages,
        unreliablePagesCount: unreliablePages.length
      }, { status: 422 });
    }

    // 3. Generate high-speed embeddings for chunks
    console.log(`[API /api/pdf/upload] Generating vector embeddings for ${chunks.length} verified chunks...`);
    const chunkRecords = chunks.map((chunk) => ({
      fileName: file.name,
      documentId: chunk.documentId || file.name,
      documentName: file.name,
      text: chunk.text,
      pageNumber: chunk.pageNumber,
      clauseNumber: chunk.clauseNumber,
      chunkIndex: chunk.chunkIndex,
      extractionMethod: chunk.extractionMethod,
      textQualityScore: chunk.textQualityScore,
      sourceStatus: chunk.sourceStatus,
      embedding: generateLocalTermEmbedding(chunk.text)
    }));

    // 4. Save to local JSON database (clears out old chunks for this filename automatically)
    addChunksForFile(file.name, chunkRecords);
    console.log(`✅ [API /api/pdf/upload] Successfully stored ${chunkRecords.length} chunks in vector database.\n`);

    return NextResponse.json({
      success: true,
      message: `Successfully parsed, validated, and vector indexed ${chunks.length} chunks from ${totalPages} pages.`,
      fileName: file.name,
      chunksCount: chunks.length,
      totalPages,
      verifiedPagesCount: verifiedPages.length,
      ocrPagesCount: ocrPages.length,
      unreliablePagesCount: unreliablePages.length,
      sampleQualityScore: chunks[0]?.textQualityScore || 1.0
    });

  } catch (error: any) {
    console.error('Error during PDF upload & processing:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error during PDF processing' 
    }, { status: 500 });
  }
}
