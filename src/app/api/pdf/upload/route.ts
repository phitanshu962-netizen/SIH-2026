import { NextResponse } from 'next/server';
import { parsePdfToMarkdown, chunkPages, ParsedPage } from '@/lib/pdfParser';
import { getOllamaEmbedding } from '@/lib/ollamaEmbeddings';
import { addChunksForFile } from '@/lib/pdfChunksDb';
import { analyzeBisDocumentWithAI } from '@/lib/aiDocumentAnalyzer';

export const maxDuration = 300; // Allow long-running executions up to 5 minutes for OCR

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const fileNameLower = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || fileNameLower.endsWith('.pdf');
    const isText = fileNameLower.endsWith('.txt') || fileNameLower.endsWith('.md') || fileNameLower.endsWith('.csv');
    const isJson = fileNameLower.endsWith('.json') || file.type === 'application/json';

    if (!isPdf && !isText && !isJson) {
      return NextResponse.json({ 
        error: 'Unsupported file format. Please upload a PDF, TXT, JSON, or Markdown document.' 
      }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let pages: ParsedPage[] = [];
    let fullExtractedText = '';
    let parserUsed = 'text-parser';

    if (isPdf) {
      // 1. Parse PDF to high-accuracy Markdown using multi-tier engine
      try {
        const result = await parsePdfToMarkdown(buffer, file.name);
        pages = result.pages;
        fullExtractedText = result.markdown;
        parserUsed = result.parserUsed;
      } catch (pdfErr: any) {
        console.error('Error parsing PDF:', pdfErr);
        return NextResponse.json({ 
          error: `Failed to extract text from PDF "${file.name}": ${pdfErr?.message || 'Invalid or corrupted PDF file'}` 
        }, { status: 400 });
      }
    } else {
      // 2. Parse Text / Markdown / JSON
      fullExtractedText = buffer.toString('utf-8').trim();
      if (fullExtractedText) {
        const virtualPageSize = 2500;
        let pNum = 1;
        for (let i = 0; i < fullExtractedText.length; i += virtualPageSize) {
          pages.push({
            pageNumber: pNum++,
            text: fullExtractedText.slice(i, i + virtualPageSize),
            extractionMethod: 'native',
            textQualityScore: 0.95,
            sourceStatus: 'verified',
            qualityIssues: []
          });
        }
      }
    }

    if (!fullExtractedText || fullExtractedText.length === 0) {
      return NextResponse.json({ 
        error: `No readable text content found in "${file.name}". Please ensure the document is not an image-only scan or empty.` 
      }, { status: 400 });
    }

    const totalPages = pages.length;
    const verifiedPages = pages.filter(p => p.sourceStatus === 'verified');
    const ocrPages = pages.filter(p => p.extractionMethod === 'ocr' && p.sourceStatus === 'verified');
    const unreliablePages = pages.filter(p => p.sourceStatus === 'unreliable');

    // 3. Chunk pages into overlapping segments
    let chunks = chunkPages(pages, 800, 150, {
      documentId: file.name,
      fileName: file.name
    });

    if (chunks.length === 0 && fullExtractedText.length > 0) {
      chunks = [{
        documentId: file.name,
        documentName: file.name,
        text: fullExtractedText.slice(0, 1000),
        pageNumber: 1,
        chunkIndex: 0,
        extractionMethod: 'native',
        textQualityScore: 0.95,
        sourceStatus: 'verified'
      }];
    }

    // 4. Generate embeddings concurrently in batches
    const chunkRecords: Array<{
      fileName: string;
      documentId?: string;
      documentName?: string;
      text: string;
      pageNumber: number;
      clauseNumber?: string;
      chunkIndex: number;
      extractionMethod?: 'native' | 'ocr';
      textQualityScore?: number;
      sourceStatus?: 'verified' | 'unreliable';
      embedding: number[];
    }> = [];

    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchEmbeddings = await Promise.all(
        batch.map(c => getOllamaEmbedding(c.text))
      );

      for (let j = 0; j < batch.length; j++) {
        chunkRecords.push({
          fileName: file.name,
          documentId: chunks[j].documentId || file.name,
          documentName: file.name,
          text: batch[j].text,
          pageNumber: batch[j].pageNumber,
          clauseNumber: batch[j].clauseNumber,
          chunkIndex: batch[j].chunkIndex,
          extractionMethod: batch[j].extractionMethod,
          textQualityScore: batch[j].textQualityScore,
          sourceStatus: batch[j].sourceStatus,
          embedding: batchEmbeddings[j]
        });
      }
    }

    // 5. Save to local JSON vector database (replaces old chunks for this filename)
    addChunksForFile(file.name, chunkRecords as any);
    console.log(`✅ [API /api/pdf/upload] Successfully stored ${chunkRecords.length} chunks in vector database.\n`);

    // 6. Extract structured BIS Standard metadata from extracted content using AI Document Context Analysis
    const parsedStandard = await analyzeBisDocumentWithAI(fullExtractedText, file.name);

    return NextResponse.json({
      success: true,
      message: `Successfully parsed, validated, and vector indexed ${chunks.length} chunks from ${totalPages} pages.`,
      fileName: file.name,
      chunksCount: chunks.length,
      totalPages: totalPages,
      verifiedPagesCount: verifiedPages.length,
      ocrPagesCount: ocrPages.length,
      unreliablePagesCount: unreliablePages.length,
      extractedTextPreview: fullExtractedText.slice(0, 500),
      fullExtractedText: fullExtractedText,
      parserUsed: parserUsed,
      standard: parsedStandard
    });

  } catch (error: any) {
    console.error('Error during document upload & processing:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal Server Error during document processing' 
    }, { status: 500 });
  }
}

