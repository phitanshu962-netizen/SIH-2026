export interface ParsedPage {
  pageNumber: number;
  text: string;
}

export interface TextChunk {
  text: string;
  pageNumber: number;
  chunkIndex: number;
}

/**
 * Parses a PDF buffer and extracts text page-by-page.
 */
export async function parsePdfToPages(buffer: Buffer): Promise<ParsedPage[]> {
  // Require the root 'pdf-parse' module dynamically.
  // Next.js will resolve this using the CommonJS "require" export mapping (index.cjs)
  // instead of the ESM import mapping, avoiding the Browser/RSC bundling issues.
  const { PDFParse } = require('pdf-parse');
  
  const parser = new PDFParse({ data: buffer });
  const textResult = await parser.getText();

  const pages: ParsedPage[] = (textResult.pages || []).map((page: any) => ({
    pageNumber: page.num,
    text: page.text || ''
  }));

  // Sort pages by page number to guarantee chronological order
  pages.sort((a, b) => a.pageNumber - b.pageNumber);
  return pages;
}

/**
 * Splits extracted page text into overlapping semantic chunks.
 */
export function chunkPages(pages: ParsedPage[], chunkSize = 800, overlap = 150): TextChunk[] {
  const chunks: TextChunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const text = page.text.replace(/\s+/g, ' ').trim();
    if (!text) continue;

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunkText = text.substring(start, end).trim();
      
      if (chunkText.length > 10) { // Skip trivial chunks
        chunks.push({
          text: chunkText,
          pageNumber: page.pageNumber,
          chunkIndex: chunkIndex++
        });
      }
      
      if (end === text.length) {
        break;
      }
      
      start += (chunkSize - overlap);
    }
  }

  return chunks;
}
