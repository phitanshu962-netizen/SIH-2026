import { validateTextQuality, TextQualityResult } from './textQualityValidator';

export interface OcrPageResult {
  pageNumber: number;
  text: string;
  qualityResult: TextQualityResult;
  extractionMethod: 'ocr';
  sourceStatus: 'verified' | 'unreliable';
  ocrDurationMs: number;
  error?: string;
}

let pdfjsLibPromise: Promise<any> | null = null;

async function getPdfJsLib() {
  if (!pdfjsLibPromise) {
    pdfjsLibPromise = import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsLibPromise;
}

/**
 * Clean OCR extracted text to remove common optical artifacts while preserving technical symbols.
 */
export function cleanOcrText(rawText: string): string {
  if (!rawText) return '';

  return rawText
    .replace(/\r\n/g, '\n')
    // Remove isolated single stray noisy symbols on lines
    .replace(/^[|~`^_{}\[\]\\]\s*$/gm, '')
    // Normalize excessive consecutive underscores or hyphens
    .replace(/_{3,}/g, ' ')
    .replace(/-{3,}/g, ' ')
    // Replace non-breaking spaces & non-printable chars
    .replace(/[\u00A0\u200B-\u200D\uFEFF]/g, ' ')
    .replace(/[^\x20-\x7E\u0900-\u097F\n\t]/g, ' ')
    // Fix multiple blank lines
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

/**
 * Renders a specific page of a PDF buffer to a high-resolution PNG image and runs OCR.
 */
export async function performOcrOnPdfPage(
  pdfBuffer: Buffer,
  pageNumber: number,
  scale: number = 2.0
): Promise<OcrPageResult> {
  const startTime = Date.now();

  try {
    let createCanvas: any = null;
    try {
      const canvasPkg = eval('require')('@napi-rs/canvas');
      createCanvas = canvasPkg.createCanvas;
    } catch {
      // Native canvas not available
    }

    let Tesseract: any = null;
    try {
      Tesseract = eval('require')('tesseract.js');
    } catch {
      // Tesseract not available
    }

    if (!createCanvas || !Tesseract) {
      throw new Error('OCR engine requires @napi-rs/canvas and tesseract.js modules.');
    }

    const pdfjsLib = await getPdfJsLib();
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(pdfBuffer),
      useSystemFonts: true,
      disableFontFace: false
    });

    const doc = await loadingTask.promise;
    const totalPages = doc.numPages;

    if (pageNumber < 1 || pageNumber > totalPages) {
      throw new Error(`Requested page ${pageNumber} is out of bounds (1 to ${totalPages}).`);
    }

    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    const canvas = createCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');

    // Fill white background before rendering
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    const imageBuffer = canvas.toBuffer('image/png');

    // Run Tesseract OCR
    const ocrRecognize = typeof Tesseract.recognize === 'function' ? Tesseract.recognize : Tesseract.default?.recognize;
    if (!ocrRecognize) {
      throw new Error('Tesseract recognize function not found.');
    }

    const ocrResponse = await ocrRecognize(imageBuffer, 'eng');
    const rawOcrText = ocrResponse?.data?.text || '';
    const cleanedText = cleanOcrText(rawOcrText);

    // Validate the quality of OCR output
    const qualityResult = validateTextQuality(cleanedText, { threshold: 0.60 });
    const ocrDurationMs = Date.now() - startTime;

    const sourceStatus = qualityResult.isValid ? 'verified' : 'unreliable';

    return {
      pageNumber,
      text: cleanedText,
      qualityResult,
      extractionMethod: 'ocr',
      sourceStatus,
      ocrDurationMs
    };

  } catch (error: any) {
    const ocrDurationMs = Date.now() - startTime;
    console.warn(`[OCR Engine] OCR fallback skipped on Page ${pageNumber}:`, error?.message || error);

    const emptyQuality = validateTextQuality('', { threshold: 0.60 });

    return {
      pageNumber,
      text: '',
      qualityResult: emptyQuality,
      extractionMethod: 'ocr',
      sourceStatus: 'unreliable',
      ocrDurationMs,
      error: error.message || 'OCR rendering failure'
    };
  }
}
