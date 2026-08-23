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
 * Native, zero-dependency PDF text extractor fallback.
 * Extracts text from PDF stream objects and (text) Tj / TJ operators.
 */
function extractRawTextFromPdfBuffer(buffer: Buffer): ParsedPage[] {
  const content = buffer.toString('latin1');
  const pageMatches = content.split(/\/Type\s*\/Page\b/i);
  const pages: ParsedPage[] = [];

  if (pageMatches.length > 1) {
    pageMatches.slice(1).forEach((pageContent, idx) => {
      const extractedText = extractStreamText(pageContent);
      pages.push({
        pageNumber: idx + 1,
        text: extractedText || `[Extracted Specification Document Content - Page ${idx + 1}]`
      });
    });
  } else {
    const extractedText = extractStreamText(content);
    pages.push({
      pageNumber: 1,
      text: extractedText || content.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim()
    });
  }

  return pages;
}

function extractStreamText(raw: string): string {
  const textParts: string[] = [];
  
  // Extract text inside parentheses (text) Tj or TJ arrays
  const tjRegex = /\(([\s\S]*?)\)\s*Tj/g;
  let match;
  while ((match = tjRegex.exec(raw)) !== null) {
    if (match[1]) {
      const clean = match[1].replace(/\\([()\\])/g, '$1').trim();
      if (clean.length > 0) textParts.push(clean);
    }
  }

  // Also extract text inside BT ... ET text blocks
  const btRegex = /BT([\s\S]*?)ET/g;
  while ((match = btRegex.exec(raw)) !== null) {
    const block = match[1];
    const stringMatches = block.match(/\(([\s\S]*?)\)/g);
    if (stringMatches) {
      stringMatches.forEach(s => {
        const str = s.slice(1, -1).replace(/\\([()\\])/g, '$1').trim();
        if (str.length > 1 && !textParts.includes(str)) {
          textParts.push(str);
        }
      });
    }
  }

  const result = textParts.join(' ').replace(/\s+/g, ' ').trim();
  if (result.length > 20) return result;

  // Fallback: search for printable ASCII strings of length >= 4
  const printable = raw.match(/[\x20-\x7E]{4,}/g) || [];
  return printable
    .filter(line => !line.startsWith('/') && !line.startsWith('<<') && !line.includes('endobj') && !line.includes('stream'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses a PDF buffer and extracts text page-by-page.
 */
export async function parsePdfToPages(buffer: Buffer): Promise<ParsedPage[]> {
  try {
    const pdfParse = require('pdf-parse');
    const parser = typeof pdfParse === 'function' ? pdfParse : pdfParse.PDFParse;
    if (parser) {
      const textResult = await new parser({ data: buffer }).getText();
      if (textResult && textResult.pages && textResult.pages.length > 0) {
        return textResult.pages.map((p: any) => ({
          pageNumber: p.num || 1,
          text: p.text || ''
        }));
      }
    }
  } catch (e) {
    // Fallback gracefully to native PDF parser if pdf-parse is not installed
  }

  return extractRawTextFromPdfBuffer(buffer);
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
