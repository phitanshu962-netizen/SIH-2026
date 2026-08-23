/**
 * Text Quality Validator for PDF Ingestion and RAG Grounding.
 * Detects corrupted text, font encoding artifacts, low-quality OCR,
 * excessive symbols, and gibberish token sequences.
 */

export interface TextQualityResult {
  isValid: boolean;
  qualityScore: number; // 0.0 to 1.0
  issues: string[];
  requiresOCR: boolean;
  charStats: {
    totalChars: number;
    alphaChars: number;
    numericChars: number;
    symbolChars: number;
    whitespaceChars: number;
    alphaRatio: number;
    recognizableWordRatio: number;
  };
}

export interface TextQualityOptions {
  threshold?: number; // Quality score threshold (default 0.65)
  minAlphaRatio?: number; // Minimum ratio of alphabetic characters (default 0.50)
  maxSymbolRatio?: number; // Maximum ratio of symbols to non-whitespace chars (default 0.20)
  minRecognizableWordRatio?: number; // Minimum ratio of recognizable prose words (default 0.35)
  maxShortGibberishRatio?: number; // Maximum ratio of 1-2 char meaningless tokens (default 0.28)
  minValidLength?: number; // Minimum text length to be considered non-empty (default 15)
}

// Common standard, compliance, technical, and general dictionary vocabulary
const COMPREHENSIVE_DICTIONARY = new Set([
  // Core English grammar & standard prose
  'the', 'of', 'and', 'to', 'in', 'is', 'for', 'that', 'on', 'with', 'as', 'by', 'at', 'from', 'this',
  'be', 'are', 'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up',
  'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no',
  'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them',
  'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back',
  'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because',
  'any', 'these', 'give', 'day', 'most', 'us', 'shall', 'should', 'must', 'may', 'under', 'such', 'per',
  'having', 'being', 'between', 'during', 'without', 'before', 'where', 'both', 'through', 'each',

  // BIS / Standards / Compliance domain
  'indian', 'standard', 'standards', 'bureau', 'specification', 'specifications', 'requirements',
  'requirement', 'clause', 'clauses', 'section', 'sections', 'annex', 'annexure', 'table', 'tables',
  'figure', 'figures', 'page', 'pages', 'amendment', 'amendments', 'revision', 'revisions', 'edition',
  'foreword', 'scope', 'reference', 'references', 'normative', 'informative', 'definitions', 'terminology',
  'compliance', 'conformity', 'statutory', 'mandatory', 'voluntary', 'scheme', 'order', 'gazette',
  'notification', 'government', 'ministry', 'authority', 'act', 'rules', 'regulations', 'directive',
  'license', 'licensing', 'mark', 'marking', 'isi', 'crs', 'hallmark', 'hallmarking', 'qco', 'dpiit',
  'nabl', 'accredited', 'laboratory', 'test', 'tests', 'testing', 'parameter', 'parameters', 'inspection',
  'sample', 'sampling', 'specimen', 'batch', 'lot', 'acceptance', 'routine', 'type', 'surveillance',
  'pass', 'fail', 'criteria', 'limits', 'tolerance', 'tolerances', 'dimension', 'dimensions', 'rating',
  'method', 'methods', 'procedure', 'procedures', 'apparatus', 'equipment', 'calibration', 'accuracy',
  'measurement', 'measured', 'maximum', 'minimum', 'nominal', 'average', 'value', 'values', 'result',
  'results', 'report', 'reports', 'certificate', 'certification', 'quality', 'assurance', 'control',

  // Engineering, Materials, Electrical, Chemical, Wood, Safety domains
  'plywood', 'veneer', 'veneers', 'timber', 'species', 'adhesive', 'adhesives', 'resin', 'resins',
  'glue', 'gluing', 'bond', 'bonding', 'formaldehyde', 'emission', 'grade', 'grades', 'bwp', 'bwr',
  'mr', 'moisture', 'content', 'density', 'thickness', 'width', 'length', 'grain', 'scarf', 'joint',
  'preservative', 'treatment', 'defect', 'defects', 'knot', 'knots', 'split', 'splits', 'electric',
  'electrical', 'appliance', 'appliances', 'iron', 'irons', 'voltage', 'current', 'power', 'watt',
  'watts', 'volt', 'volts', 'ampere', 'amperes', 'milliampere', 'leakage', 'insulation', 'dielectric',
  'resistance', 'grounding', 'earthing', 'thermal', 'cutout', 'fuse', 'temperature', 'heating',
  'element', 'thermostat', 'flammability', 'glow', 'wire', 'mechanical', 'strength', 'impact',
  'attenuation', 'penetration', 'retention', 'helmet', 'helmets', 'visor', 'strap', 'buckle',
  'battery', 'batteries', 'lithium', 'cell', 'cells', 'short', 'circuit', 'overcharge', 'fan',
  'fans', 'ceiling', 'motor', 'winding', 'cement', 'concrete', 'mortar', 'steel', 'rebar', 'reinforcement',
  'tensile', 'yield', 'elongation', 'water', 'drinking', 'purified', 'microbiological', 'pesticide',
  'bottle', 'packaging', 'container', 'toy', 'toys', 'safety', 'chemical', 'heavy', 'metals', 'lead',
  'cadmium', 'arsenic', 'mercury', 'hazard', 'hazardous', 'risk', 'protection', 'consumer', 'industrial'
]);

/**
 * Validates text quality of an extracted PDF page or chunk.
 */
export function validateTextQuality(text: string, options: TextQualityOptions = {}): TextQualityResult {
  const threshold = options.threshold ?? 0.65;
  const minAlphaRatio = options.minAlphaRatio ?? 0.45;
  const maxSymbolRatio = options.maxSymbolRatio ?? 0.20;
  const minRecognizableWordRatio = options.minRecognizableWordRatio ?? 0.35;
  const maxShortGibberishRatio = options.maxShortGibberishRatio ?? 0.28;
  const minValidLength = options.minValidLength ?? 15;

  const issues: string[] = [];

  if (!text || text.trim().length < minValidLength) {
    return {
      isValid: false,
      qualityScore: 0.0,
      issues: ['Text is empty or shorter than minimum valid length.'],
      requiresOCR: true,
      charStats: {
        totalChars: text ? text.length : 0,
        alphaChars: 0,
        numericChars: 0,
        symbolChars: 0,
        whitespaceChars: 0,
        alphaRatio: 0,
        recognizableWordRatio: 0
      }
    };
  }

  const cleanText = text.replace(/\r\n/g, '\n');
  const totalChars = cleanText.length;

  let alphaCount = 0;
  let numericCount = 0;
  let whitespaceCount = 0;
  let symbolCount = 0;
  let nonPrintableCount = 0;

  for (let i = 0; i < totalChars; i++) {
    const code = cleanText.charCodeAt(i);
    const char = cleanText.charAt(i);

    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 0x0900 && code <= 0x097F)) {
      // Latin alphabet or Devanagari Hindi/Marathi
      alphaCount++;
    } else if (code >= 48 && code <= 57) {
      // Numbers
      numericCount++;
    } else if (char === ' ' || char === '\t' || char === '\n') {
      whitespaceCount++;
    } else if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      nonPrintableCount++;
      symbolCount++;
    } else if (code === 0xFFFD || (code >= 0xD800 && code <= 0xDFFF)) {
      // Replacement character or broken surrogate
      nonPrintableCount++;
      symbolCount++;
    } else if (/[.,;:!?'"()\[\]{}\/\-_%&=+*<>@#$^~`|\\]/.test(char)) {
      symbolCount++;
    } else {
      symbolCount++;
    }
  }

  const nonWhitespaceChars = Math.max(1, totalChars - whitespaceCount);
  const alphaRatio = alphaCount / nonWhitespaceChars;
  const symbolRatio = symbolCount / nonWhitespaceChars;
  const nonPrintableRatio = nonPrintableCount / Math.max(1, totalChars);

  // Analyze word tokens
  const words = cleanText
    .split(/[\s,;:!?"()\[\]{}]+/)
    .map(w => w.trim())
    .filter(w => w.length > 0);

  const totalWords = Math.max(1, words.length);
  let recognizableWords = 0;
  let shortGibberishWords = 0;
  let mixedSymbolWords = 0;

  for (const word of words) {
    const lower = word.toLowerCase().replace(/[^a-z0-9\u0900-\u097F]/g, '');
    
    // Check if recognized dictionary word
    if (COMPREHENSIVE_DICTIONARY.has(lower)) {
      recognizableWords++;
    } else if (lower.length >= 4 && /^[a-z]+$/.test(lower) && hasValidVowelStructure(lower)) {
      // English morphological candidate with realistic vowel-consonant structure
      recognizableWords += 0.7;
    } else if (lower.length > 0 && /^is\d+$/.test(lower)) {
      // IS code like IS303
      recognizableWords++;
    } else if (/^\d+([.]\d+)?(%|mm|cm|m|kg|g|v|a|ma|w|kw|c|mpa|n|kn|pa|kpa|min|s|h|hz)?$/i.test(word)) {
      // Numerical parameter with or without units
      recognizableWords += 0.85;
    }

    // Check for short gibberish tokens like "cgW", "W4W", "Jze", "6he", "9,7", "ooL"
    if (word.length <= 3 && !/^(is|in|on|at|or|by|to|of|if|an|am|as|no|go|do|me|my|we|he|it|be|so|up|us|a|i|the|and|for|not|all|any|out|day|per|act|bwp|bwr|mr|e0|e1|e2|isi|crs|qco|bis|iec|iso|astm|din|en|mpa|kpa|fps|rpm|max|min|avg|ref|sec|fig|tab|deg|vol|wt|no\.?)$/i.test(word)) {
      if (/[A-Z]/.test(word) && /[a-z]/.test(word)) {
        shortGibberishWords++;
      } else if (/\d/.test(word) && /[a-zA-Z]/.test(word)) {
        shortGibberishWords++;
      } else if (word.length <= 2) {
        shortGibberishWords += 0.5;
      }
    }

    // Check for token corrupted by mixed symbols e.g. "c'-", "'f5", "V(:"
    if (/[+^\[\]\\{}|_#@$%*~`=<>;&\?]/.test(word) || (word.includes("'") && word.length <= 3)) {
      mixedSymbolWords++;
    }
  }

  const recognizableWordRatio = Math.min(1.0, recognizableWords / totalWords);
  const shortGibberishRatio = shortGibberishWords / totalWords;
  const mixedSymbolWordRatio = mixedSymbolWords / totalWords;

  // Penalties and Issues identification
  let penalty = 0;

  if (alphaRatio < minAlphaRatio) {
    const diff = minAlphaRatio - alphaRatio;
    penalty += diff * 0.8;
    issues.push(`Low alphabetic character ratio (${Math.round(alphaRatio * 100)}% vs minimum ${Math.round(minAlphaRatio * 100)}%).`);
  }

  if (symbolRatio > maxSymbolRatio) {
    const diff = symbolRatio - maxSymbolRatio;
    penalty += diff * 0.7;
    issues.push(`Excessive symbol ratio (${Math.round(symbolRatio * 100)}% vs maximum ${Math.round(maxSymbolRatio * 100)}%).`);
  }

  if (nonPrintableRatio > 0.02) {
    penalty += 0.3;
    issues.push(`Non-printable / broken surrogate characters detected (${Math.round(nonPrintableRatio * 100)}%).`);
  }

  if (recognizableWordRatio < minRecognizableWordRatio) {
    const diff = minRecognizableWordRatio - recognizableWordRatio;
    penalty += diff * 1.2;
    issues.push(`Abnormally low recognizable word ratio (${Math.round(recognizableWordRatio * 100)}% vs minimum ${Math.round(minRecognizableWordRatio * 100)}%).`);
  }

  if (shortGibberishRatio > maxShortGibberishRatio) {
    const diff = shortGibberishRatio - maxShortGibberishRatio;
    penalty += diff * 1.0;
    issues.push(`High density of short gibberish tokens (${Math.round(shortGibberishRatio * 100)}% corrupted font noise).`);
  }

  if (mixedSymbolWordRatio > 0.15) {
    penalty += mixedSymbolWordRatio * 0.6;
    issues.push(`Mixed-symbol tokens detected in prose text (${Math.round(mixedSymbolWordRatio * 100)}%).`);
  }

  // Calculate normalized quality score
  let baseScore = (recognizableWordRatio * 0.55) + (alphaRatio * 0.35) + ((1 - Math.min(1, symbolRatio)) * 0.10);
  let finalScore = Math.max(0.0, Math.min(1.0, baseScore - penalty));
  finalScore = Math.round(finalScore * 100) / 100;

  const isValid = finalScore >= threshold && recognizableWordRatio >= 0.20 && shortGibberishRatio < 0.35;
  const requiresOCR = !isValid;

  return {
    isValid,
    qualityScore: finalScore,
    issues,
    requiresOCR,
    charStats: {
      totalChars,
      alphaChars: alphaCount,
      numericChars: numericCount,
      symbolChars: symbolCount,
      whitespaceChars: whitespaceCount,
      alphaRatio: Math.round(alphaRatio * 100) / 100,
      recognizableWordRatio: Math.round(recognizableWordRatio * 100) / 100
    }
  };
}

/**
 * Helper to check natural vowel alternation in English words.
 * Gibberish like "lS8nf", "gq0Z", "rZM", "pGJ", "flX" lack natural vowels.
 */
function hasValidVowelStructure(word: string): boolean {
  if (word.length <= 2) return true;
  const hasVowels = /[aeiouy]/i.test(word);
  if (!hasVowels) return false;
  
  // Reject tokens with 5+ consecutive consonants
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(word)) return false;

  return true;
}
