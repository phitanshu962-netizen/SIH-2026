export type UserPersona = 'manufacturer' | 'msme' | 'consumer' | 'importer';

export type LanguageCode = 'en' | 'hi' | 'mr' | 'gu' | 'ta' | 'te' | 'bn';

export interface BISStandard {
  id: string;
  isNumber: string; // e.g., "IS 302-2-3:2017"
  title: string;
  category: string; // e.g., "Electrical Safety", "Toys", "Cement", "Electronics"
  scope: string;
  mandatoryStatus: 'Mandatory (QCO)' | 'Voluntary' | 'CRS Mandatory';
  applicableScheme: 'Scheme-I (ISI Mark)' | 'CRS (Compulsory Registration)' | 'FMCS' | 'Hallmarking';
  targetAudience: string[];
  keyRequirements: string[];
  requiredDocuments: string[];
  testingParameters: string[];
  officialUrl: string;
  lastUpdated: string;
  clauseReferences: {
    clause: string;
    description: string;
  }[];
  hsnCodes?: string[];
  qcoGazetteRef?: string;
  qcoEnforcementDate?: string;
  rawDocumentText?: string;
  markdownContent?: string;
}

export interface GroundedCitation {
  standardNumber: string;
  title: string;
  clause: string;
  snippet: string;
  officialSource: string;
  relevanceScore: number;
}

export interface AIResponsePayload {
  productDetected: string;
  userPersona: UserPersona;
  relevantStandards: string[];
  summaryExplanation: string;
  complianceRequirements: string[];
  requiredDocuments: string[];
  actionableSteps: string[];
  citations: GroundedCitation[];
  confidenceScore: number; // 0 to 100
  isSufficientInfo: boolean;
  uncertaintyMessage?: string;
  engineUsed: 'Ollama (Local LLM)' | 'Gemini / Neural Grounded RAG';
  modelName: string;
}

export interface ComplianceCheckItem {
  id: string;
  standardId: string;
  title: string;
  category: string;
  mandatory: boolean;
  status: 'passed' | 'pending' | 'failed' | 'not_applicable';
  notes: string;
}

export interface SIHEvalMetrics {
  totalBenchmarkQuestions: number;
  retrievalAccuracy: number; // %
  answerAccuracy: number; // %
  citationAccuracy: number; // %
  hallucinationRate: number; // %
  averageLatencyMs: number;
  groundednessScore: number; // %
}

export interface GapItem {
  clause: string;
  requirement: string;
  userDocEvidence?: string;
  status: 'met' | 'missing' | 'partial';
  riskSeverity: 'High' | 'Medium' | 'Low';
  remediation: string;
}

export interface GapAnalysisResult {
  productName: string;
  standardId: string;
  isNumber: string;
  overallComplianceScore: number; // 0 to 100
  totalRequirements: number;
  metCount: number;
  missingCount: number;
  partialCount: number;
  gaps: GapItem[];
}

export interface ClauseDiff {
  clauseNumber: string;
  title: string;
  oldText: string;
  newText: string;
  changeType: 'added' | 'modified' | 'deleted' | 'unchanged';
  impactDescription: string;
  costImpact: 'High' | 'Medium' | 'Low' | 'None';
}

export interface StandardComparison {
  standardBaseId: string;
  oldVersion: string;
  newVersion: string;
  releaseDate: string;
  gracePeriodMonths: number;
  summary: string;
  clauseDiffs: ClauseDiff[];
}

export interface StandardAlert {
  id: string;
  title: string;
  isNumber: string;
  category: string;
  alertType: 'QCO Order Issued' | 'Revision Published' | 'Draft for Comments' | 'Deadline Extended';
  dateIssued: string;
  effectiveDate: string;
  summary: string;
  officialGazetteRef: string;
  urgency: 'Critical' | 'Important' | 'Info';
  // 3-Tier QCO Regulatory Intelligence Additions (Optional for static fallbacks)
  classification?: 'Action Required' | 'Review' | 'Informational';
  whatChangedSummary?: {
    previousRule: string;
    newMandatoryRule: string;
    impactLevel: string;
  };
  affectedProducts?: string[];
  hsCodes?: string[];
  exemptions?: {
    category: string;
    condition: string;
    gazetteClause: string;
  }[];
  daysRemaining?: number;
  lifecycleStage?: 'Draft for Comment' | 'Final QCO Issued' | 'Enforced' | 'Amended';
  issuingAuthority?: string;
  impactGraph?: {
    ministry: string;
    qcoNotification: string;
    standardNumber: string;
    affectedProducts: string[];
    compulsoryTests: string[];
  };
  aiImpactSummary?: string;
  counterfactualRisk?: string;
  gazettePdfUrl?: string;
  verificationHash?: string;
}

export type TestClassificationCategory =
  | 'Type Test'
  | 'Routine Test'
  | 'Acceptance Test'
  | 'Surveillance Test'
  | 'Periodic Test'
  | 'Initial Certification Test'
  | 'Factory Test'
  | 'External Lab Test';

export interface TestingMapping {
  requirementId: string;
  standardId: string;
  isNumber: string;
  parameterName: string;
  clause: string;
  subClause?: string;
  testMethodStandard: string;
  productStandard?: string;
  requiredEquipment: string;
  sampleQuantity: string;
  acceptanceCriteria: string;
  requiredEvidenceDocument: string;

  // Deep Laboratory Intelligence Properties
  testClassification?: TestClassificationCategory;
  testPurpose?: string;
  sampleDetails?: {
    quantity: number;
    sampleType: string;
    sampleCondition: string;
    isDestructive: boolean;
    batchRequirement: string;
  };
  equipmentDetails?: {
    equipmentName: string;
    requiredRange: string;
    accuracy: string;
    calibrationStatus: 'VALID' | 'CALIBRATION EXPIRED' | 'UNVERIFIED';
    calibrationFrequencyMonths: number;
    calibrationCertId?: string;
    supportsTestCount?: number;
    estimatedCost?: string;
    estimatedCapexInr?: number;
  };
  labVenue?: 'IN-HOUSE PERMITTED' | 'EXTERNAL LAB REQUIRED' | 'EITHER';
  procedureSummary?: string[];
  structuredParameters?: {
    voltage?: string;
    duration?: string;
    temperature?: string;
    humidity?: string;
    acceptanceRule?: string;
  };
  nablScopeStatus?: 'MATCHED' | 'NOT VERIFIED';
  dependencies?: string[];
  historicalResults?: {
    runDate: string;
    measuredValue: string;
    resultVerdict: 'PASS' | 'FAIL' | 'ACTION REQUIRED';
  }[];
}

export interface TestingLab {
  id: string;
  name: string;
  location: string;
  state: string;
  nablAccredited: boolean;
  bisRecognized: boolean;
  standardsCovered: string[];
  contactEmail: string;
  contactPhone: string;
  avgTurnaroundDays: number;
  labType: 'Government (BIS/NPL)' | 'NABL Private Accredited' | 'State Lab';
}

// ═════════════════════════════════════════════════════════════════════
// EVIDENCE VERIFIER & TRUST LAYER TYPES
// ═════════════════════════════════════════════════════════════════════

export type ClaimClassificationType =
  | 'Legal / Statutory Claim'
  | 'Standard Applicability Claim'
  | 'Technical Requirement Claim'
  | 'Testing Parameter Claim'
  | 'Certification Scheme Claim'
  | 'QCO Claim'
  | 'Deadline / SLA Claim'
  | 'Product Scope Claim'
  | 'Consumer Protection Claim'
  | 'AI-Generated Explanation'
  | 'User Certificate Claim';

export type VerificationStateStatus =
  | 'SUPPORTED'
  | 'PARTIALLY SUPPORTED'
  | 'CONTRADICTED'
  | 'NOT FOUND'
  | 'INSUFFICIENT EVIDENCE'
  | 'OUTDATED'
  | 'WRONG VERSION'
  | 'WRONG SCOPE'
  | 'SOURCE UNVERIFIED'
  | 'CONFLICTING EVIDENCE'
  | 'REQUIRES HUMAN REVIEW';

export type EvidenceSourceType =
  | 'OFFICIAL'
  | 'USER UPLOADED'
  | 'INTERNAL DATASET'
  | 'SECONDARY'
  | 'UNKNOWN';

export interface DecomposedSubClaim {
  id: string;
  subClaimText: string;
  claimType: ClaimClassificationType;
  verificationStatus: VerificationStateStatus;
  evidenceSource: string;
  clauseRef?: string;
  pageRef?: string;
  confidenceScore: number;
}

export interface ClaimEvidenceMatrixRow {
  assertionText: string;
  claimType: string;
  evidenceSource: string;
  clauseAndPage: string;
  matchStatus: VerificationStateStatus;
}

export interface DocumentIntegrityMetadata {
  sha256Hash: string;
  fileSizeBytes: number;
  ingestionTimestamp: string;
  sourceUrl: string;
  publisher: string;
  documentVersion: string;
  integrityStatus: 'UNCHANGED SINCE INGESTION' | 'VERSION UPDATED' | 'UNVERIFIED HASH';
}

export interface EvidenceGraphNode {
  id: string;
  nodeType: 'CLAIM' | 'REQUIREMENT' | 'STANDARD' | 'CLAUSE' | 'EVIDENCE' | 'DOCUMENT' | 'HASH';
  label: string;
  subtitle?: string;
  status?: string;
}

export interface ComprehensiveEvidenceAudit {
  claimText: string;
  claimType: ClaimClassificationType;
  verificationStatus: VerificationStateStatus;
  evidenceStrength: 'STRONG' | 'MODERATE' | 'WEAK' | 'INSUFFICIENT';
  evidenceMatchPercentage: number;
  sourceType: EvidenceSourceType;
  sourceDocumentTitle: string;
  standardIsNumber: string;
  version: string;
  clauseNumber: string;
  pageNumber: string;
  publishedDate: string;
  retrievedDate: string;
  exactExcerptText: string;
  highlightedPhrase: string;
  whyClassifiedExplanation: string;
  decomposedClaims: DecomposedSubClaim[];
  matrixRows: ClaimEvidenceMatrixRow[];
  contradictionDetails?: {
    conflictingOldRule: string;
    conflictingNewRule: string;
    resolutionDirective: string;
  };
  temporalValidity: {
    validAsOfDate: string;
    isOutdated: boolean;
    validitySummary: string;
  };
  versionMismatch?: {
    claimVersion: string;
    officialEvidenceVersion: string;
    diffSummary: string;
  };
  documentIntegrity: DocumentIntegrityMetadata;
  evidenceGraph: EvidenceGraphNode[];
  evidenceSafeRewrite: string;
  numericValidation?: {
    parameterName: string;
    claimedValue: string;
    officialValue: string;
    isEquivalent: boolean;
  };
  humanReviewReason?: string;
}

export interface EvidenceVerificationResult extends ComprehensiveEvidenceAudit {
  isGrounded: boolean;
  authenticityScore: number;
  officialReference: string;
  clauseMatched: string;
  verdict: 'Verified Authentic' | 'Unverified / Hallucination Risk' | 'Partially Supported';
  explanation: string;
}

export interface TimelineMilestone {
  stage: number;
  title: string;
  description: string;
  durationDays: number;
  deliverables: string[];
  mandatoryStep: boolean;
}

// ═════════════════════════════════════════════════════════════════════
// LEGAL TREE RATIONALE & EXPLAINABILITY ENGINE TYPES
// ═════════════════════════════════════════════════════════════════════

export type NodeTypeCategory = 
  | 'user_input' 
  | 'product_scope' 
  | 'hazard' 
  | 'standard' 
  | 'legal_authority' 
  | 'qco' 
  | 'scheme' 
  | 'clause' 
  | 'test' 
  | 'evidence' 
  | 'action' 
  | 'warning';

export interface LegalTreeNode {
  id: string;
  type: NodeTypeCategory;
  title: string;
  shortExplanation: string;
  evidenceStatus: 'Official Evidence' | 'Retrieved Gazette Data' | 'AI Explanation' | 'System Inference' | 'User Input' | 'Not Established';
  sourceCount: number;
  clauseRef?: string;
  pageRef?: string;
  evidenceStrength: 'High' | 'Medium' | 'Low' | 'Not Established';
  detailedExplanation?: string;
  determinationSteps?: string[];
  sources?: {
    title: string;
    type: 'Indian Standard' | 'QCO' | 'Gazette' | 'BIS Act' | 'Test Method';
    clause?: string;
    page?: string;
    url?: string;
  }[];
}

export interface WhyNotComparison {
  candidateStandardId: string;
  candidateIsNumber: string;
  candidateTitle: string;
  matchStatus: 'DIRECT_MATCH' | 'EXCLUDED_SCOPE' | 'EXCLUDED_VOLUNTARY' | 'INSUFFICIENT_EVIDENCE';
  exclusionReason: string;
  retrievalSimilarity: number;
  evidenceCoverage: 'High' | 'Medium' | 'Low' | 'Not Established';
}

export interface HazardChainItem {
  id: string;
  hazardName: string;
  hazardDescription: string;
  requirement: string;
  clause: string;
  testName: string;
  testPurpose: string;
  evidenceSource: string;
  consumerProtectionValue: string;
}

export interface LegalAuthorityChainItem {
  stage: number;
  levelName: string;
  authorityName: string;
  referenceDoc: string;
  effectiveDate: string;
  status: 'Active' | 'Under Revision' | 'Draft' | 'Superseded';
  officialSource: string;
  summary: string;
}

export interface SmartInterviewQuestion {
  id: string;
  questionText: string;
  options: string[];
  fieldKey: string;
}

export interface LegalTreeData {
  standard: BISStandard;
  applicabilityStatus: 'SUPPORTED' | 'PARTIALLY_SUPPORTED' | 'REQUIRES_REVIEW' | 'NOT_ESTABLISHED' | 'NOT_APPLICABLE';
  certificationStatus: 'Mandatory (QCO)' | 'Voluntary' | 'CRS Mandatory' | 'Not Determined';
  evidenceStrength: 'High' | 'Medium' | 'Low' | 'Not Established';
  currentStatus: 'Active' | 'Superseded' | 'Unknown';
  lastVerifiedDate: string;
  nodes: LegalTreeNode[];
  whyNotComparisons: WhyNotComparison[];
  hazardChain: HazardChainItem[];
  legalAuthorityChain: LegalAuthorityChainItem[];
  versionEvents: { date: string; title: string; impact: string }[];
}

// ═════════════════════════════════════════════════════════════════════
// ASK MY PDF & DOCUMENT INTELLIGENCE RAG TYPES
// ═════════════════════════════════════════════════════════════════════

export type PdfDocumentType =
  | 'BIS Standard'
  | 'Indian Standard'
  | 'QCO / Gazette Order'
  | 'Laboratory Test Report'
  | 'Quality Control Plan'
  | 'Product Specification'
  | 'Factory Manual'
  | 'Compliance Document'
  | 'Technical Manual';

export interface ExtractedNumericalRequirement {
  id: string;
  parameterName: string;
  claimedValue: string;
  unit: string;
  clauseRef: string;
  pageNumber: number;
  tolerance?: string;
  acceptanceCondition: string;
}

export interface ExtractedClauseMetadata {
  clauseNumber: string;
  heading: string;
  pageNumber: number;
  subClauses: string[];
  mandatoryStatus: 'MANDATORY' | 'RECOMMENDED' | 'OPTIONAL';
  hasTables: boolean;
  hasFigures: boolean;
}

export interface DocumentAnalysisOverview {
  fileName: string;
  fileSizeBytes: number;
  documentType: PdfDocumentType;
  classificationConfidence: number;
  detectedStandardIsNumber?: string;
  title: string;
  editionYear?: string;
  totalPages: number;
  totalClauses: number;
  totalTables: number;
  totalAnnexures: number;
  totalFigures: number;
  totalTestingRequirements: number;
  totalNumericalLimits: number;
  totalMandatoryRequirements: number;
  ingestionTimestamp: string;
}

export interface RagPageCitation {
  pageNumber: number;
  clauseRef: string;
  excerptText: string;
  documentTitle: string;
  matchedPhrase: string;
}

export interface RagAnswerResponse {
  userQuery: string;
  answerText: string;
  citations: RagPageCitation[];
  confidence: 'HIGH CONFIDENCE' | 'MEDIUM CONFIDENCE' | 'LOW CONFIDENCE';
  confidenceScore: number;
  sourceQuality: 'DIRECT EVIDENCE' | 'DERIVED LOGIC' | 'INCOMPLETE EVIDENCE';
  evidenceSafeRewrite: string;
  suggestedFollowUps: string[];
}

// ═════════════════════════════════════════════════════════════════════
// ASK BIS AI ASSISTANT & OPERATING LAYER TYPES
// ═════════════════════════════════════════════════════════════════════

export type IntentCategoryType =
  | 'INFORMATION'
  | 'RESEARCH'
  | 'NAVIGATION'
  | 'ACTION'
  | 'DOCUMENT ANALYSIS'
  | 'COMPLIANCE ANALYSIS';

export type AiActionType =
  | 'NAVIGATE'
  | 'OPEN_CLAUSE'
  | 'RUN_GAP_ANALYSIS'
  | 'OPEN_TESTING_MAPPER'
  | 'FIND_NABL_LABS'
  | 'OPEN_CHECKLIST'
  | 'TRACE_LEGAL_LOGIC'
  | 'CHECK_QCO_UPDATES'
  | 'VERIFY_EVIDENCE'
  | 'OPEN_DOCUMENT'
  | 'COMPARE_VERSIONS';

export interface AiActionCard {
  title: string;
  actionType: AiActionType;
  targetRoute: string;
  buttonLabel: string;
  description: string;
  params?: Record<string, string>;
}

export interface AiSourceCard {
  title: string;
  documentType: string;
  clauseRef?: string;
  pageRef?: string;
  excerptText: string;
  statusBadge: 'OFFICIAL' | 'INFERRED' | 'RECOMMENDATION';
}

export interface GlobalAppContext {
  currentRoute: string;
  currentFeature: string;
  userRole: UserPersona;
  selectedProduct?: string;
  selectedStandard?: string;
  selectedVersion?: string;
  selectedClause?: string;
}

export interface AssistantAgentResponse {
  intentCategory: IntentCategoryType;
  responseText: string;
  sources: AiSourceCard[];
  actionCard?: AiActionCard;
  confidenceScore: number;
  groundingBadge: string;
  suggestedPrompts: string[];
}

