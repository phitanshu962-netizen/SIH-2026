import { validateTextQuality, TextQualityResult } from './textQualityValidator';
import { performOcrOnPdfPage } from './ocrEngine';

export interface ParsedPage {
  pageNumber: number;
  text: string;
  extractionMethod: 'native' | 'ocr';
  textQualityScore: number;
  sourceStatus: 'verified' | 'unreliable';
  qualityIssues?: string[];
}

export interface TextChunk {
  documentId?: string;
  documentName?: string;
  text: string;
  pageNumber: number;
  clauseNumber?: string;
  chunkIndex: number;
  extractionMethod: 'native' | 'ocr';
  textQualityScore: number;
  sourceStatus: 'verified' | 'unreliable';
}

export interface ParsePdfOptions {
  enableOCR?: boolean;
  qualityThreshold?: number;
  fileName?: string;
}

let pdfjsLibPromise: Promise<any> | null = null;

async function getPdfJsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsLibPromise;
}

/**
 * Extracts native text page-by-page from a PDF buffer using pdfjs-dist.
 */
async function extractNativePagesWithPdfJs(buffer: Buffer): Promise<{ pageNumber: number; text: string }[]> {
  try {
    const pdfjsLib = await getPdfJsLib();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: false
    });

    const doc = await loadingTask.promise;
    const totalPages = doc.numPages;
    const pages: { pageNumber: number; text: string }[] = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await doc.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();

      pages.push({
        pageNumber: i,
        text: pageText
      });
    }

    return pages;
  } catch (err) {
    console.warn('[PDF Parser] pdfjs-dist page extraction failed, trying pdf-parse fallback:', err);
    return [];
  }
}

/**
 * Fallback page extraction using pdf-parse or structural stream parsing.
 */
async function extractNativePagesFallback(buffer: Buffer): Promise<{ pageNumber: number; text: string }[]> {
  try {
    let pdfParse: any = null;
    try {
      pdfParse = eval('require')('pdf-parse');
    } catch {
      // Ignore static bundle failure
    }

    if (pdfParse) {
      const parserFn = typeof pdfParse === 'function' ? pdfParse : pdfParse.default || pdfParse.PDFParse;
      if (typeof parserFn === 'function') {
        const data = await parserFn(buffer);
        if (data && data.text && data.text.trim().length > 10) {
          const rawPages = data.text.split(/\f|\n\s*\n\s*IS\s+\d+/i).map((p: string) => p.trim()).filter(Boolean);
          if (rawPages.length > 0) {
            return rawPages.map((pText: string, idx: number) => ({
              pageNumber: idx + 1,
              text: pText
            }));
          }
        }
      }
    }
  } catch (e) {
    console.warn('[PDF Parser] pdf-parse execution failed:', e);
  }

  // Zero-dependency raw stream parsing fallback
  const content = buffer.toString('latin1');
  const pageMatches = content.split(/\/Type\s*\/Page\b/i);
  const pages: { pageNumber: number; text: string }[] = [];

  if (pageMatches.length > 1) {
    pageMatches.slice(1).forEach((pageContent, idx) => {
      pages.push({
        pageNumber: idx + 1,
        text: extractStreamText(pageContent)
      });
    });
  } else {
    pages.push({
      pageNumber: 1,
      text: extractStreamText(content)
    });
  }

  return pages;
}

function decodePdfString(str: string): string {
  const decoded = str
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, octal) => String.fromCharCode(parseInt(octal, 8)));

  return decoded.replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractStreamText(raw: string): string {
  const textParts: string[] = [];
  const tjRegex = /\(([\s\S]*?)\)\s*(?:Tj|TJ|\')/g;
  let match;

  while ((match = tjRegex.exec(raw)) !== null) {
    if (match[1]) {
      const decoded = decodePdfString(match[1]);
      if (decoded.length > 1 && /[a-zA-Z0-9]/.test(decoded) && !decoded.startsWith('/') && !decoded.includes('Font')) {
        textParts.push(decoded);
      }
    }
  }

  return textParts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Parses a PDF buffer and extracts validated, OCR-supported text page-by-page.
 */
export async function parsePdfToPages(
  buffer: Buffer,
  options: ParsePdfOptions = {}
): Promise<ParsedPage[]> {
  const enableOCR = options.enableOCR ?? true;
  const qualityThreshold = options.qualityThreshold ?? 0.65;
  const fileName = options.fileName || 'document.pdf';

  console.log(`\n📄 [PDF Ingestion Started] Document: "${fileName}" (Buffer size: ${buffer.length} bytes)`);

  // Step 1: Extract native pages
  let rawPages = await extractNativePagesWithPdfJs(buffer);
  if (rawPages.length === 0) {
    rawPages = await extractNativePagesFallback(buffer);
  }

  const parsedPages: ParsedPage[] = [];

  // Step 2: Validate each page and trigger OCR fallback if needed
  for (let i = 0; i < rawPages.length; i++) {
    const rawPage = rawPages[i];
    const pageNum = rawPage.pageNumber;
    const cleanedNativeText = cleanPdfExtractedText(rawPage.text);

    // Validate native text quality
    const qualityResult: TextQualityResult = validateTextQuality(cleanedNativeText, {
      threshold: qualityThreshold
    });

    console.log(
      `[PDF Ingestion] Page ${pageNum}/${rawPages.length}: Native extraction length = ${cleanedNativeText.length} chars, Quality Score = ${qualityResult.qualityScore}, Status = ${qualityResult.isValid ? 'ACCEPTED' : 'REJECTED'}`
    );

    if (qualityResult.isValid && !qualityResult.requiresOCR) {
      // Native extraction is high quality
      parsedPages.push({
        pageNumber: pageNum,
        text: cleanedNativeText,
        extractionMethod: 'native',
        textQualityScore: qualityResult.qualityScore,
        sourceStatus: 'verified',
        qualityIssues: []
      });
      continue;
    }

    // Native extraction failed quality check
    console.warn(
      `⚠️ [PDF Ingestion] Page ${pageNum} native quality check FAILED (Score: ${qualityResult.qualityScore} < ${qualityThreshold}). Issues: [${qualityResult.issues.join('; ')}]`
    );

    if (enableOCR) {
      console.log(`🔄 [PDF Ingestion] Triggering OCR Fallback for Page ${pageNum}...`);
      try {
        const ocrResult = await performOcrOnPdfPage(buffer, pageNum);
        console.log(
          `[OCR Fallback] Page ${pageNum} OCR Completed in ${ocrResult.ocrDurationMs}ms. Extracted ${ocrResult.text.length} chars, OCR Quality Score = ${ocrResult.qualityResult.qualityScore}, Status = ${ocrResult.sourceStatus.toUpperCase()}`
        );

        if (ocrResult.sourceStatus === 'verified' && ocrResult.text.length > 20) {
          parsedPages.push({
            pageNumber: pageNum,
            text: ocrResult.text,
            extractionMethod: 'ocr',
            textQualityScore: ocrResult.qualityResult.qualityScore,
            sourceStatus: 'verified',
            qualityIssues: []
          });
        } else {
          // OCR also produced low-quality or blank output
          console.warn(
            `❌ [PDF Ingestion] Page ${pageNum} marked as UNRELIABLE (OCR score: ${ocrResult.qualityResult.qualityScore}). Unreliable pages will not be embedded for evidence.`
          );
          parsedPages.push({
            pageNumber: pageNum,
            text: ocrResult.text || cleanedNativeText || `[Page ${pageNum}: Unreadable / Corrupted scan content]`,
            extractionMethod: 'ocr',
            textQualityScore: ocrResult.qualityResult.qualityScore,
            sourceStatus: 'unreliable',
            qualityIssues: ocrResult.qualityResult.issues
          });
        }
      } catch (ocrErr: any) {
        console.error(`[OCR Fallback] Error processing Page ${pageNum}:`, ocrErr);
        parsedPages.push({
          pageNumber: pageNum,
          text: cleanedNativeText || `[Page ${pageNum}: Unreadable / Corrupted scan content]`,
          extractionMethod: 'native',
          textQualityScore: 0.0,
          sourceStatus: 'unreliable',
          qualityIssues: [`OCR execution error: ${ocrErr.message}`]
        });
      }
    } else {
      // OCR is disabled; flag page as unreliable
      parsedPages.push({
        pageNumber: pageNum,
        text: cleanedNativeText,
        extractionMethod: 'native',
        textQualityScore: qualityResult.qualityScore,
        sourceStatus: 'unreliable',
        qualityIssues: qualityResult.issues
      });
    }
  }

  const verifiedPagesCount = parsedPages.filter(p => p.sourceStatus === 'verified').length;
  const ocrPagesCount = parsedPages.filter(p => p.extractionMethod === 'ocr' && p.sourceStatus === 'verified').length;
  const unreliableCount = parsedPages.filter(p => p.sourceStatus === 'unreliable').length;

  console.log(
    `✅ [PDF Ingestion Completed] Total Pages: ${parsedPages.length}, Verified Native: ${verifiedPagesCount - ocrPagesCount}, OCR Verified: ${ocrPagesCount}, Unreliable: ${unreliableCount}\n`
  );

  return parsedPages;
}

/**
 * Checks if the text has reasonable prose content and is not pure font noise.
 */
export function isRealProseText(text: string): boolean {
  if (!text || text.length < 15) return false;
  const result = validateTextQuality(text, { threshold: 0.50 });
  return result.isValid;
}

/**
 * Cleans PDF text by stripping structural PDF tags, font dictionaries, and isolated gibberish tokens.
 */
export function cleanPdfExtractedText(text: string): string {
  if (!text) return '';

  // Strip PDF object operators, structural layout dictionary tags, font encodings
  let clean = text
    .replace(/\b\d+\s+\d+\s+obj\b[\s\S]*?\bendobj\b/gi, '')
    .replace(/<<[\s\S]*?>>/g, '')
    .replace(/\/[\w\-]+/g, '')
    .replace(/\b00000\d{5}\b/g, '')
    .replace(/\b00000\s+00000\d{5}\b/g, '')
    .replace(/\b\d{10}\s+\d{5}\s+[fn]\b/g, '')
    .replace(/\b(Tabs|StructParents|DocSettings|OCGs|Type|Subtype|MediaBox|CropBox|Parent|Resources|ProcSet|Font|Encoding|Length|Filter|Decode|BBox|Matrix|Group|CS|Mask|ColorSpace|Pattern|Shading|XObject|FontDescriptor|ExtGState|Properties|WinAnsiEncoding|ToUnicode|Subj|Popup|20Roman|Perpetua|Roman|Bold|Italic)\b/gi, '')
    .replace(/[^\x20-\x7E\u0900-\u097F\n\r\t]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Strip random 1-2 char font map noise tokens & isolated PDF keywords
  const tokens = clean.split(/\s+/).filter(Boolean);
  const cleanTokens = tokens.filter(t => {
    if (/^(Tabs|StructParents|DocSettings|OCGs|Filter|Type|Subtype|Roman|Italic|Bold)$/i.test(t)) return false;
    // Discard any token containing symbols mixed with text (e.g., cgW, ;Ej, .0_, KEY&, 6he, Q]ch, ^,/, ]-., Bh#, *;})
    if (/[+^\[\]\\{}|_#@$%*~`=<>;&\?]/.test(t)) return false;
    if (t.length <= 2 && !/^(is|in|on|at|or|by|to|of|if|an|am|as|no|go|do|me|my|we|he|it|be|so|up|us|a|i|e0|e1|e2|mr)$/i.test(t)) {
      return false;
    }
    return true;
  });

  return cleanTokens.join(' ').trim();
}

/**
 * Extracts candidate clause reference from a chunk text if present (e.g. "Clause 5.2" or "Table 3").
 */
function extractClauseReference(text: string): string | undefined {
  const clauseMatch = text.match(/\b(?:Clause|Section|Cl\.|Sec\.)\s*(\d+(?:\.\d+)*)/i);
  if (clauseMatch) {
    return `Clause ${clauseMatch[1]}`;
  }
  const tableMatch = text.match(/\b(?:Table|Annex|Annexure)\s*([A-Z0-9]+)/i);
  if (tableMatch) {
    return `${tableMatch[0]}`;
  }
  return undefined;
}

/**
 * Splits extracted page text into overlapping semantic chunks, preserving all metadata.
 */
export function chunkPages(
  pages: ParsedPage[],
  chunkSize = 800,
  overlap = 150,
  docMetadata?: { documentId?: string; fileName?: string }
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    // Only chunk pages that are verified and readable
    if (page.sourceStatus === 'unreliable' || page.textQualityScore < 0.50) {
      console.log(
        `[Chunking] Skipping Page ${page.pageNumber} because sourceStatus is "${page.sourceStatus}" (Score: ${page.textQualityScore})`
      );
      continue;
    }

    const text = page.text.replace(/\s+/g, ' ').trim();
    if (!text || text.length < 15) continue;

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const rawChunkText = text.substring(start, end).trim();
      const cleanChunk = cleanPdfExtractedText(rawChunkText);

      // Validate the quality of this individual chunk
      const chunkQuality = validateTextQuality(cleanChunk, { threshold: 0.55 });

      if (chunkQuality.isValid && cleanChunk.length > 20) {
        const detectedClause = extractClauseReference(cleanChunk);

        chunks.push({
          documentId: docMetadata?.documentId || docMetadata?.fileName || 'doc',
          documentName: docMetadata?.fileName || 'document.pdf',
          text: cleanChunk,
          pageNumber: page.pageNumber,
          clauseNumber: detectedClause,
          chunkIndex: chunkIndex++,
          extractionMethod: page.extractionMethod,
          textQualityScore: chunkQuality.qualityScore,
          sourceStatus: 'verified'
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
