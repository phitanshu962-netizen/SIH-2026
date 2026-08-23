import { ChunkRecord } from './pdfChunksDb';

export interface GroundedClaim {
  claim: string;
  evidence: string;
  documentId: string;
  documentName: string;
  pageNumber: number;
  clauseNumber?: string;
  confidence: number;
  verified: boolean;
  extractionMethod: 'native' | 'ocr';
  sourceStatus: 'verified' | 'unreliable';
  textQualityScore: number;
}

export interface GroundingValidationResult {
  isFullyGrounded: boolean;
  groundingScore: number; // 0 to 100
  verifiedClaims: GroundedClaim[];
  unverifiedClaims: GroundedClaim[];
  abstentionRequired: boolean;
}

/**
 * Returns standardized evidence abstention response when reliable source evidence is unavailable.
 */
export function formatAbstentionResponse(
  documentName: string,
  pageNumber?: number | string,
  issue: string = 'Corrupted extraction / insufficient evidence',
  recommendation: string = 'Please reprocess this page using OCR or consult the original document.'
): string {
  return `Unable to verify from the available source evidence.

The retrieved source content does not contain sufficiently reliable or readable text to support a factual answer to this question.

Affected source:
- Document: ${documentName}
- Page: ${pageNumber !== undefined ? pageNumber : 'Unspecified'}
- Issue: ${issue}

Recommendation:
${recommendation}`;
}

/**
 * Validates that claims in an AI-generated answer are strictly grounded in retrieved readable evidence chunks.
 */
export function validateCitationToClaims(
  answer: string,
  retrievedChunks: ChunkRecord[]
): GroundingValidationResult {
  if (!answer || !retrievedChunks || retrievedChunks.length === 0) {
    return {
      isFullyGrounded: false,
      groundingScore: 0,
      verifiedClaims: [],
      unverifiedClaims: [],
      abstentionRequired: true
    };
  }

  // Filter out any unreliable or corrupted chunks from evidence pool
  const verifiedEvidenceChunks = retrievedChunks.filter(
    c => c.sourceStatus === 'verified' && (c.textQualityScore === undefined || c.textQualityScore >= 0.50)
  );

  if (verifiedEvidenceChunks.length === 0) {
    return {
      isFullyGrounded: false,
      groundingScore: 0,
      verifiedClaims: [],
      unverifiedClaims: [],
      abstentionRequired: true
    };
  }

  // Break answer into distinct factual sentences / bullet assertions
  const sentences = answer
    .split(/(?<=[.!?])\s+|\n+/)
    .map(s => s.trim().replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(s => s.length > 20 && !s.startsWith('#') && !s.toLowerCase().includes('unable to verify'));

  if (sentences.length === 0) {
    return {
      isFullyGrounded: true,
      groundingScore: 100,
      verifiedClaims: [],
      unverifiedClaims: [],
      abstentionRequired: false
    };
  }

  const verifiedClaims: GroundedClaim[] = [];
  const unverifiedClaims: GroundedClaim[] = [];

  for (const sentence of sentences) {
    // Extract key content words (excluding standard stop words)
    const keywords = sentence
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !/^(this|that|with|from|have|been|which|shall|should|their|there|about|these|those|under|being)$/.test(w));

    let bestMatchChunk: ChunkRecord | null = null;
    let maxKeywordOverlap = 0;

    for (const chunk of verifiedEvidenceChunks) {
      const chunkLower = chunk.text.toLowerCase();
      let matchCount = 0;

      for (const kw of keywords) {
        if (chunkLower.includes(kw)) {
          matchCount++;
        }
      }

      if (matchCount > maxKeywordOverlap) {
        maxKeywordOverlap = matchCount;
        bestMatchChunk = chunk;
      }
    }

    const keywordRatio = keywords.length > 0 ? maxKeywordOverlap / keywords.length : 0;
    const isVerified = keywordRatio >= 0.35 || (maxKeywordOverlap >= 2 && keywords.length <= 4);

    if (isVerified && bestMatchChunk) {
      verifiedClaims.push({
        claim: sentence,
        evidence: bestMatchChunk.text,
        documentId: bestMatchChunk.documentId || bestMatchChunk.fileName,
        documentName: bestMatchChunk.fileName,
        pageNumber: bestMatchChunk.pageNumber,
        clauseNumber: bestMatchChunk.clauseNumber,
        confidence: Math.min(99, Math.round(keywordRatio * 100)),
        verified: true,
        extractionMethod: bestMatchChunk.extractionMethod || 'native',
        sourceStatus: bestMatchChunk.sourceStatus || 'verified',
        textQualityScore: bestMatchChunk.textQualityScore !== undefined ? bestMatchChunk.textQualityScore : 1.0
      });
    } else {
      unverifiedClaims.push({
        claim: sentence,
        evidence: bestMatchChunk ? bestMatchChunk.text : '',
        documentId: bestMatchChunk?.documentId || 'unverified',
        documentName: bestMatchChunk?.fileName || 'unverified',
        pageNumber: bestMatchChunk?.pageNumber || 0,
        clauseNumber: bestMatchChunk?.clauseNumber,
        confidence: Math.round(keywordRatio * 100),
        verified: false,
        extractionMethod: bestMatchChunk?.extractionMethod || 'native',
        sourceStatus: 'unreliable',
        textQualityScore: 0.0
      });
    }
  }

  const totalAssessed = verifiedClaims.length + unverifiedClaims.length;
  const groundingScore = totalAssessed > 0 ? Math.round((verifiedClaims.length / totalAssessed) * 100) : 0;
  const isFullyGrounded = groundingScore >= 75;

  return {
    isFullyGrounded,
    groundingScore,
    verifiedClaims,
    unverifiedClaims,
    abstentionRequired: totalAssessed > 0 && verifiedClaims.length === 0
  };
}
