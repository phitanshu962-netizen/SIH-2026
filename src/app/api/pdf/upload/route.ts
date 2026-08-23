import { NextResponse } from 'next/server';
import { parsePdfToPages, chunkPages } from '@/lib/pdfParser';
import { getOllamaEmbedding } from '@/lib/ollamaEmbeddings';
import { addChunksForFile } from '@/lib/pdfChunksDb';

export const maxDuration = 300; // Allow long-running executions up to 5 minutes

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

    // 1. Parse PDF to page objects
    const pages = await parsePdfToPages(buffer);
    
    // 2. Chunk pages into overlapping segments
    const chunks = chunkPages(pages, 800, 150);

    if (chunks.length === 0) {
      return NextResponse.json({ error: 'No readable text content found in the PDF' }, { status: 400 });
    }

    // 3. Generate embeddings and prepare database records
    const chunkRecords = [];
    
    for (const chunk of chunks) {
      // Generate embedding vector using nomic-embed-text
      const embedding = await getOllamaEmbedding(chunk.text);
      
      chunkRecords.push({
        fileName: file.name,
        text: chunk.text,
        pageNumber: chunk.pageNumber,
        chunkIndex: chunk.chunkIndex,
        embedding: embedding
      });
    }

    // 4. Save to local JSON database (clears out old chunks for this filename automatically)
    addChunksForFile(file.name, chunkRecords);

    return NextResponse.json({
      success: true,
      message: `Successfully parsed, embedded, and locally stored ${chunks.length} vector chunks.`,
      fileName: file.name,
      chunksCount: chunks.length
    });

  } catch (error: any) {
    console.error('Error during PDF upload & processing:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error during PDF processing' 
    }, { status: 500 });
  }
}
