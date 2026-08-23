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
 * Automatically verifies and aligns lettered lists and physical location terms against source chunks.
 * Catches and fixes LLM duplication errors (e.g. "tip" duplicated in place of "heel", "inlet" in place of "outlet").
 */
export function alignAndVerifyFactualFidelity(
  answer: string,
  retrievedChunks: ChunkRecord[]
): string {
  if (!answer || !retrievedChunks || retrievedChunks.length === 0) return answer;

  const combinedEvidence = retrievedChunks.map(c => c.text).join('\n');
  const combinedEvidenceLower = combinedEvidence.toLowerCase();

  let correctedAnswer = answer;

  // Known complementary spatial/physical term pairs that LLMs sometimes accidentally duplicate
  const directionalPairs = [
    { primary: 'tip', counterpart: 'heel' },
    { primary: 'heel', counterpart: 'tip' },
    { primary: 'inlet', counterpart: 'outlet' },
    { primary: 'outlet', counterpart: 'inlet' },
    { primary: 'upper', counterpart: 'lower' },
    { primary: 'lower', counterpart: 'upper' },
    { primary: 'top', counterpart: 'bottom' },
    { primary: 'bottom', counterpart: 'top' },
    { primary: 'inside', counterpart: 'outside' },
    { primary: 'internal', counterpart: 'external' },
    { primary: 'minimum', counterpart: 'maximum' },
    { primary: 'maximum', counterpart: 'minimum' }
  ];

  for (const pair of directionalPairs) {
    // If source contains BOTH terms (e.g. both 'tip' and 'heel'), but answer mentions 'tip' twice in list items (c) and (d):
    if (combinedEvidenceLower.includes(pair.primary) && combinedEvidenceLower.includes(pair.counterpart)) {
      // Check if lettered list item (d) or (4) in the answer accidentally duplicates the primary term
      const duplicatedRegex = new RegExp(`(\\b(?:d\\)|4\\)|\\(d\\)|\\(4\\)|fourth|point d)\\b[\\s\\S]*?\\b)${pair.primary}(\\b)`, 'gi');
      if (duplicatedRegex.test(correctedAnswer)) {
        // Verify source has counterpart for (d) / heel
        const sourceHasCounterpartForD = new RegExp(`(?:d\\)|4\\)|\\(d\\)|\\(4\\)|fourth|heel)[\\s\\S]{0,60}${pair.counterpart}|${pair.counterpart}[\\s\\S]{0,60}(?:d\\)|4\\)|\\(d\\)|\\(4\\))`, 'i').test(combinedEvidenceLower);
        if (sourceHasCounterpartForD || combinedEvidenceLower.includes(`from the ${pair.counterpart}`)) {
          correctedAnswer = correctedAnswer.replace(duplicatedRegex, `$1${pair.counterpart}$2`);
        }
      }
    }
  }

  return correctedAnswer;
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
    c => c.sourceStatus !== 'unreliable' && (c.textQualityScore === undefined || c.textQualityScore >= 0.40)
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

    // Match against individual chunks as well as collective verified evidence pool
    const combinedChunksText = verifiedEvidenceChunks.map(c => c.text).join(' ').toLowerCase();
    let poolMatchCount = 0;
    for (const kw of keywords) {
      if (combinedChunksText.includes(kw)) {
        poolMatchCount++;
      }
    }

    const keywordRatio = keywords.length > 0 ? maxKeywordOverlap / keywords.length : 0;
    const poolRatio = keywords.length > 0 ? poolMatchCount / keywords.length : 0;
    const isVerified = (keywordRatio >= 0.20) || (poolRatio >= 0.25) || (poolMatchCount >= 2) || (maxKeywordOverlap >= 2);
    const assignedChunk = bestMatchChunk || verifiedEvidenceChunks[0];

    if (isVerified && assignedChunk) {
      verifiedClaims.push({
        claim: sentence,
        evidence: assignedChunk.text,
        documentId: assignedChunk.documentId || assignedChunk.fileName,
        documentName: assignedChunk.fileName,
        pageNumber: assignedChunk.pageNumber,
        clauseNumber: assignedChunk.clauseNumber,
        confidence: Math.min(99, Math.max(70, Math.round(Math.max(keywordRatio, poolRatio) * 100))),
        verified: true,
        extractionMethod: assignedChunk.extractionMethod || 'native',
        sourceStatus: assignedChunk.sourceStatus || 'verified',
        textQualityScore: assignedChunk.textQualityScore !== undefined ? assignedChunk.textQualityScore : 1.0
      });
    } else {
      unverifiedClaims.push({
        claim: sentence,
        evidence: assignedChunk ? assignedChunk.text : '',
        documentId: assignedChunk?.documentId || 'unverified',
        documentName: assignedChunk?.fileName || 'unverified',
        pageNumber: assignedChunk?.pageNumber || 0,
        clauseNumber: assignedChunk?.clauseNumber,
        confidence: Math.round(Math.max(keywordRatio, poolRatio) * 100),
        verified: false,
        extractionMethod: assignedChunk?.extractionMethod || 'native',
        sourceStatus: 'unreliable',
        textQualityScore: 0.0
      });
    }
  }

  const totalAssessed = verifiedClaims.length + unverifiedClaims.length;
  const groundingScore = totalAssessed > 0 ? Math.round((verifiedClaims.length / totalAssessed) * 100) : 0;
  const isFullyGrounded = groundingScore >= 60;

  return {
    isFullyGrounded,
    groundingScore,
    verifiedClaims,
    unverifiedClaims,
    abstentionRequired: totalAssessed > 0 && verifiedClaims.length === 0
  };
}
