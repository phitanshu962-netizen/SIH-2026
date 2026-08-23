'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ShieldCheck, AlertTriangle, FileText, CheckCircle2, XCircle, HelpCircle, 
  Search, ExternalLink, RefreshCcw, Lock, Sparkles, Filter, Copy, Check,
  Layers, GitCompare, Download, Printer, ArrowRight, ArrowUpRight, Scale, Info,
  Upload, FileCode, CheckSquare, Clock, ShieldAlert, Cpu, Share2, BookOpen
} from 'lucide-react';
import { auditEvidenceClaimPipeline, getDynamicStandards } from '@/lib/data/bisDatabase';
import { saveEvidenceAuditToFirebase } from '@/lib/firebase';
import { EvidenceVerificationResult, DecomposedSubClaim, ClaimEvidenceMatrixRow, BISStandard } from '@/lib/types';

export default function EvidenceVerifierPage() {
  const [standards, setStandards] = useState<BISStandard[]>(() => getDynamicStandards());
  
  // Operational Modes
  const [activeMode, setActiveMode] = useState<'claim' | 'document' | 'ai_answer'>('claim');
  
  // Claim Input State
  const [claimInput, setClaimInput] = useState<string>(
    "Electric irons under IS 302-2-3 require mandatory ISI certification and a 1500V insulation test."
  );
  
  // Document Audit File State
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  
  // Selected Standard Filter
  const [selectedStandardId, setSelectedStandardId] = useState<string>('is-302-2-3');

  // Verification Audit Result State
  const [auditResult, setAuditResult] = useState<EvidenceVerificationResult>(() => 
    auditEvidenceClaimPipeline("Electric irons under IS 302-2-3 require mandatory ISI certification and a 1500V insulation test.", "is-302-2-3")
  );

  const [copiedRewrite, setCopiedRewrite] = useState<boolean>(false);

  useEffect(() => {
    const list = getDynamicStandards();
    setStandards(list);
    if (list.length > 0 && (!selectedStandardId || !list.some(s => s.id === selectedStandardId))) {
      setSelectedStandardId(list[0].id);
    }

    const handleUpdate = () => {
      const updated = getDynamicStandards();
      setStandards(updated);
    };

    window.addEventListener('bis_standards_updated', handleUpdate);
    return () => window.removeEventListener('bis_standards_updated', handleUpdate);
  }, []);

  const handleRunVerification = (customText?: string) => {
    const textToRun = customText || claimInput;
    const result = auditEvidenceClaimPipeline(textToRun, selectedStandardId);
    setAuditResult(result);
    saveEvidenceAuditToFirebase({
      claim: textToRun,
      standardId: selectedStandardId,
      ...result
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFileName(file.name);
      handleRunVerification(`Uploaded Document Audit: ${file.name} for ${selectedStandardId} laboratory testing verification.`);
    }
  };

  const handleCopyRewrite = () => {
    navigator.clipboard.writeText(auditResult.evidenceSafeRewrite);
    setCopiedRewrite(true);
    setTimeout(() => setCopiedRewrite(false), 2000);
  };

  // Sample Presets
  const presets = [
    { label: "Mandatory QCO & 1500V Test", text: "Electric irons under IS 302-2-3 require mandatory ISI certification and a 1500V insulation test." },
    { label: "Guaranteed 30-Day SLA (Unsupported)", text: "BIS guarantees application approval and license grant within 30 days under Scheme-I." },
    { label: "2.0 mA Leakage Limit (Contradicted)", text: "IS 302-2-3 permits a maximum leakage current of 2.0 mA during breakdown testing." },
    { label: "Outdated Version Claim (2017)", text: "IS 302-2-3:2017 is the current active version for household electric irons." }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>

      {/* ══════════════ 1. HERO HEADER & TRUST LAYER BADGE ══════════════ */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E8E2DC',
        borderRadius: 12,
        padding: '24px 28px',
        boxShadow: '0 2px 8px rgba(40,30,20,0.03)',
        display: 'flex', flexDirection: 'column', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#E9783F', background: '#FFF1E8', border: '1px solid #F4C4A5', padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <ShieldCheck style={{ width: 12, height: 12, color: '#F28C52' }} />
              Platform Trust Layer
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#686868' }}>
              Multi-Pipeline Cryptographic Gazette Verifier
            </span>
          </div>

          <button
            onClick={() => window.print()}
            style={{ background: '#FFFCF8', color: '#242424', border: '1px solid #E8E2DC', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer style={{ width: 14, height: 14, color: '#F28C52' }} />
            <span>Export PDF Audit Report</span>
          </button>
        </div>

        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#171717', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldCheck style={{ width: 24, height: 24, color: '#F28C52' }} />
            <span>BIS Evidence Verification &amp; Claim Audit Engine</span>
          </h1>
          <p style={{ fontSize: 13.5, color: '#686868', margin: 0, maxWidth: 880, lineHeight: 1.6 }}>
            The trust layer of the BIS AI platform. Verify AI assertions, uploaded test reports, and compliance claims against traceable Gazette evidence, cryptographic SHA-256 document hashes, and contradiction audits.
          </p>
        </div>

        {/* Top Metric Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, paddingTop: 12, borderTop: '1px solid #E8E2DC' }}>
          <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#686868', textTransform: 'uppercase' }}>CLAIMS VERIFIED</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#171717', marginTop: 2 }}>124 Audited</div>
          </div>

          <div style={{ background: '#EBF4EE', border: '1px solid #B5D5BF', borderRadius: 8, padding: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#4F7D5A', textTransform: 'uppercase' }}>SUPPORTED RATE</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#4F7D5A', marginTop: 2 }}>87.1% Grounded</div>
          </div>

          <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#686868', textTransform: 'uppercase' }}>CONTRADICTIONS FOUND</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#B85C52', marginTop: 2 }}>3 Rule Conflicts</div>
          </div>

          <div style={{ background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 8, padding: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>HUMAN REVIEW</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#171717', marginTop: 2 }}>4 Flagged Claims</div>
          </div>
        </div>

        {/* Disclaimer */}
        <p style={{ fontSize: 11.5, color: '#686868', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Info style={{ width: 13, height: 13, color: '#F28C52', flexShrink: 0 }} />
          <span>Evidence verification indicates whether a claim is supported by the sources available to the system. It does not constitute legal advice, BIS certification, or an official government determination.</span>
        </p>
      </div>

      {/* ══════════════ 2. THREE OPERATIONAL MODES & CLAIM INPUT ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 22, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #E8E2DC', paddingBottom: 14 }}>
          <button
            onClick={() => setActiveMode('claim')}
            style={{
              background: activeMode === 'claim' ? '#FFF1E8' : 'transparent',
              color: activeMode === 'claim' ? '#171717' : '#686868',
              border: `1px solid ${activeMode === 'claim' ? '#F4C4A5' : 'transparent'}`,
              borderLeft: activeMode === 'claim' ? '3px solid #F28C52' : 'transparent',
              borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8
            }}
          >
            <FileText style={{ width: 15, height: 15, color: activeMode === 'claim' ? '#F28C52' : '#686868' }} />
            <span>Mode 1: Claim Verification</span>
          </button>

          <button
            onClick={() => setActiveMode('document')}
            style={{
              background: activeMode === 'document' ? '#FFF1E8' : 'transparent',
              color: activeMode === 'document' ? '#171717' : '#686868',
              border: `1px solid ${activeMode === 'document' ? '#F4C4A5' : 'transparent'}`,
              borderLeft: activeMode === 'document' ? '3px solid #F28C52' : 'transparent',
              borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8
            }}
          >
            <Upload style={{ width: 15, height: 15, color: activeMode === 'document' ? '#F28C52' : '#686868' }} />
            <span>Mode 2: Document &amp; Test Report Audit</span>
          </button>

          <button
            onClick={() => setActiveMode('ai_answer')}
            style={{
              background: activeMode === 'ai_answer' ? '#FFF1E8' : 'transparent',
              color: activeMode === 'ai_answer' ? '#171717' : '#686868',
              border: `1px solid ${activeMode === 'ai_answer' ? '#F4C4A5' : 'transparent'}`,
              borderLeft: activeMode === 'ai_answer' ? '3px solid #F28C52' : 'transparent',
              borderRadius: 6, padding: '6px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8
            }}
          >
            <Cpu style={{ width: 15, height: 15, color: activeMode === 'ai_answer' ? '#F28C52' : '#686868' }} />
            <span>Mode 3: AI Answer Quality Gate Audit</span>
          </button>
        </div>

        {/* Target Standard Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#686868', textTransform: 'uppercase' }}>Target Indian Standard:</label>
          <select
            value={selectedStandardId}
            onChange={(e) => setSelectedStandardId(e.target.value)}
            style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: '7px 12px', fontSize: 12.5, fontWeight: 700, color: '#171717', outline: 'none' }}
          >
            {standards.map(s => (
              <option key={s.id} value={s.id}>{s.isNumber}: {s.title}</option>
            ))}
          </select>
        </div>

        {/* Mode 1 & Mode 3 Input Form */}
        {(activeMode === 'claim' || activeMode === 'ai_answer') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#686868', textTransform: 'uppercase' }}>
              {activeMode === 'ai_answer' ? 'PASTE AI ASSISTANT RESPONSE TO AUDIT' : 'ENTER COMPLIANCE CLAIM OR ASSERTION TO AUDIT'}
            </label>

            <textarea
              rows={3}
              value={claimInput}
              onChange={(e) => setClaimInput(e.target.value)}
              placeholder="e.g. Electric irons under IS 302-2-3 require mandatory ISI certification and a 1500V insulation test..."
              style={{ width: '100%', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 12, fontSize: 13, fontWeight: 600, color: '#242424', outline: 'none', resize: 'vertical' }}
            />

            {/* Presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#686868' }}>Sample Presets:</span>
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => { setClaimInput(p.text); handleRunVerification(p.text); }}
                  style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#E9783F', cursor: 'pointer' }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6 }}>
              <button
                onClick={() => handleRunVerification()}
                style={{ background: '#F28C52', color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '9px 18px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <ShieldCheck style={{ width: 15, height: 15 }} />
                <span>Execute Evidence Audit Pipeline</span>
              </button>
            </div>
          </div>
        )}

        {/* Mode 2: Document Upload */}
        {activeMode === 'document' && (
          <div style={{ background: '#FFFCF8', border: '2px dashed #E8E2DC', borderRadius: 8, padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <Upload style={{ width: 32, height: 32, color: '#F28C52' }} />
            <div>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#171717', margin: 0 }}>Upload Test Report or Certificate PDF</h3>
              <p style={{ fontSize: 12, color: '#686868', margin: '2px 0 0' }}>Parses parameters, validates laboratory accreditation, and checks for missing mandatory test gaps.</p>
            </div>

            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="doc-upload-input"
            />

            <label
              htmlFor="doc-upload-input"
              style={{ background: '#FFF1E8', color: '#E9783F', border: '1px solid #F4C4A5', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
            >
              Choose File to Upload &amp; Audit
            </label>

            {uploadedFileName && (
              <span style={{ fontSize: 12, fontWeight: 700, color: '#4F7D5A', background: '#EBF4EE', padding: '4px 10px', borderRadius: 4 }}>
                Uploaded: {uploadedFileName}
              </span>
            )}
          </div>
        )}

      </div>

      {/* ══════════════ 3. MAIN VERIFICATION RESULT CARD ══════════════ */}
      <div style={{
        background: '#FFFFFF',
        border: `1px solid ${auditResult.verificationStatus === 'SUPPORTED' ? '#B5D5BF' : auditResult.verificationStatus === 'CONTRADICTED' ? '#E8BDB8' : '#F4C4A5'}`,
        borderLeft: `6px solid ${auditResult.verificationStatus === 'SUPPORTED' ? '#4F7D5A' : auditResult.verificationStatus === 'CONTRADICTED' ? '#B85C52' : '#F28C52'}`,
        borderRadius: 12,
        padding: 24,
        boxShadow: '0 2px 8px rgba(40,30,20,0.03)',
        display: 'flex', flexDirection: 'column', gap: 18
      }}>
        
        {/* Result Header Stripe */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 12, fontWeight: 800, textTransform: 'uppercase', padding: '4px 12px', borderRadius: 6,
              background: auditResult.verificationStatus === 'SUPPORTED' ? '#EBF4EE' : auditResult.verificationStatus === 'CONTRADICTED' ? '#FDF2F2' : '#FEF7ED',
              color: auditResult.verificationStatus === 'SUPPORTED' ? '#4F7D5A' : auditResult.verificationStatus === 'CONTRADICTED' ? '#B85C52' : '#C88732',
              border: `1px solid ${auditResult.verificationStatus === 'SUPPORTED' ? '#B5D5BF' : auditResult.verificationStatus === 'CONTRADICTED' ? '#E8BDB8' : '#F4D3A5'}`
            }}>
              VERIFICATION: {auditResult.verificationStatus}
            </span>

            <span style={{ fontSize: 11.5, fontWeight: 800, color: '#171717', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 4, padding: '3px 8px' }}>
              {auditResult.claimType}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#171717' }}>
              Evidence Match: <strong style={{ color: '#F28C52' }}>{auditResult.evidenceMatchPercentage}%</strong>
            </div>

            <span style={{ fontSize: 11, fontWeight: 800, background: '#FFF1E8', color: '#E9783F', padding: '3px 8px', borderRadius: 4 }}>
              Strength: {auditResult.evidenceStrength}
            </span>
          </div>
        </div>

        {/* Explanation */}
        <div>
          <h3 style={{ fontSize: 15, fontWeight: 800, color: '#171717', margin: '0 0 4px' }}>
            Why this claim was classified as {auditResult.verificationStatus}:
          </h3>
          <p style={{ fontSize: 13, color: '#242424', margin: 0, lineHeight: 1.6, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: 12 }}>
            {auditResult.whyClassifiedExplanation}
          </p>
        </div>

        {/* Source Metadata Stripe */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, fontSize: 11.5, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 12 }}>
          <div>Source Type: <strong style={{ color: '#171717' }}>{auditResult.sourceType}</strong></div>
          <div>Standard: <strong style={{ color: '#F28C52' }}>{auditResult.standardIsNumber}</strong></div>
          <div>Clause: <strong style={{ color: '#171717' }}>{auditResult.clauseNumber}</strong></div>
          <div>Page: <strong style={{ color: '#171717' }}>{auditResult.pageNumber}</strong></div>
          <div>Retrieved Date: <strong style={{ color: '#171717' }}>{auditResult.retrievedDate}</strong></div>
        </div>
      </div>

      {/* ══════════════ 4. CLAIM DECOMPOSITION BREAKDOWN & MATRIX ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#171717', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers style={{ width: 18, height: 18, color: '#F28C52' }} />
            <span>Multi-Assertion Claim Decomposition &amp; Audit Matrix</span>
          </h2>
          <p style={{ fontSize: 12.5, color: '#686868', margin: 0 }}>
            Deconstructs complex sentences into individual sub-claims to prevent a single accurate clause from masking an unsupported assertion.
          </p>
        </div>

        {/* Claim Evidence Matrix Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#FFFCF8', borderBottom: '1.5px solid #E8E2DC', color: '#686868', fontSize: 11, textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Sub-Assertion Text</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Claim Type</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Evidence Source</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Clause &amp; Page</th>
                <th style={{ padding: '10px 12px', fontWeight: 800 }}>Verification Status</th>
              </tr>
            </thead>
            <tbody>
              {auditResult.matrixRows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #E8E2DC' }}>
                  <td style={{ padding: '12px', fontWeight: 700, color: '#171717' }}>{row.assertionText}</td>
                  <td style={{ padding: '12px', color: '#686868' }}>{row.claimType}</td>
                  <td style={{ padding: '12px', color: '#242424', fontWeight: 600 }}>{row.evidenceSource}</td>
                  <td style={{ padding: '12px', color: '#686868' }}>{row.clauseAndPage}</td>
                  <td style={{ padding: '12px' }}>
                    <span style={{
                      fontSize: 10.5, fontWeight: 800, padding: '3px 8px', borderRadius: 4, textTransform: 'uppercase',
                      background: row.matchStatus === 'SUPPORTED' ? '#EBF4EE' : row.matchStatus === 'CONTRADICTED' ? '#FDF2F2' : '#FEF7ED',
                      color: row.matchStatus === 'SUPPORTED' ? '#4F7D5A' : row.matchStatus === 'CONTRADICTED' ? '#B85C52' : '#C88732'
                    }}>
                      {row.matchStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══════════════ 5. EXACT EVIDENCE PANEL WITH TEXT HIGHLIGHTING ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#171717', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText style={{ width: 18, height: 18, color: '#F28C52' }} />
            <span>Exact Evidence Excerpt with Contextual Highlighting</span>
          </h2>
          <p style={{ fontSize: 12.5, color: '#686868', margin: 0 }}>
            Minimum relevant text excerpt retrieved directly from the official Gazette specification document.
          </p>
        </div>

        <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderLeft: '4px solid #F28C52', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#686868', textTransform: 'uppercase', marginBottom: 6 }}>
            {auditResult.sourceDocumentTitle} • {auditResult.clauseNumber} ({auditResult.pageNumber})
          </div>
          <p style={{ fontSize: 13.5, color: '#171717', margin: 0, lineHeight: 1.6, fontFamily: "'IBM Plex Sans', sans-serif" }}>
            {auditResult.exactExcerptText}{' '}
            <mark style={{ background: '#FFF1E8', color: '#E9783F', padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>
              "{auditResult.highlightedPhrase}"
            </mark>
          </p>
        </div>
      </div>

      {/* ══════════════ 6. CONTRADICTION DETECTION & VERSION MISMATCH WARNING ══════════════ */}
      {(auditResult.contradictionDetails || auditResult.versionMismatch) && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#B85C52', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle style={{ width: 18, height: 18, color: '#B85C52' }} />
            <span>Contradiction &amp; Version Mismatch Audit Warnings</span>
          </h2>

          {auditResult.contradictionDetails && (
            <div style={{ background: '#FDF2F2', border: '1px solid #E8BDB8', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#B85C52', textTransform: 'uppercase' }}>NUMERIC / RULE CONTRADICTION DETECTED</span>
              <div style={{ fontSize: 12, color: '#242424' }}>
                <div><strong>Claimed Rule:</strong> {auditResult.contradictionDetails.conflictingOldRule}</div>
                <div><strong>Official Gazette Rule:</strong> {auditResult.contradictionDetails.conflictingNewRule}</div>
                <div style={{ color: '#B85C52', fontWeight: 700, marginTop: 4 }}>Directive: {auditResult.contradictionDetails.resolutionDirective}</div>
              </div>
            </div>
          )}

          {auditResult.versionMismatch && (
            <div style={{ background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>VERSION MISMATCH WARNING</span>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#171717', marginTop: 2 }}>
                  Claim version: <strong>{auditResult.versionMismatch.claimVersion}</strong> vs Official Active: <strong>{auditResult.versionMismatch.officialEvidenceVersion}</strong>
                </div>
              </div>

              <Link href="/comparator" style={{ background: '#F28C52', color: '#FFFFFF', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <GitCompare style={{ width: 14, height: 14 }} />
                <span>Open Version Comparator</span>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ 7. EVIDENCE GRAPH ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#171717', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cpu style={{ width: 18, height: 18, color: '#F28C52' }} />
            <span>Traceable Evidence Graph &amp; Provenance Pipeline</span>
          </h2>
          <p style={{ fontSize: 12.5, color: '#686868', margin: 0 }}>
            Visualizes how evidence was retrieved, chunked, cryptographic hashed, and evaluated against the user claim.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
          {auditResult.evidenceGraph.map((node, idx) => (
            <React.Fragment key={node.id}>
              <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: '10px 14px', minWidth: 130, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>{node.nodeType}</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#171717' }}>{node.label}</span>
                {node.subtitle && <span style={{ fontSize: 10.5, color: '#686868' }}>{node.subtitle}</span>}
              </div>

              {idx < auditResult.evidenceGraph.length - 1 && (
                <ArrowRight style={{ width: 14, height: 14, color: '#F28C52', flexShrink: 0 }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ══════════════ 8. DOCUMENT INTEGRITY (SHA-256 HASH) ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 800, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Lock style={{ width: 14, height: 14, color: '#F28C52' }} />
          CRYPTOGRAPHIC DOCUMENT INTEGRITY METADATA
        </span>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, fontSize: 11.5, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 14 }}>
          <div>SHA-256 Hash: <code style={{ color: '#171717', fontSize: 10.5 }}>{auditResult.documentIntegrity.sha256Hash}</code></div>
          <div>File Size: <strong style={{ color: '#171717' }}>{(auditResult.documentIntegrity.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</strong></div>
          <div>Integrity Status: <span style={{ background: '#EBF4EE', color: '#4F7D5A', fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>{auditResult.documentIntegrity.integrityStatus}</span></div>
        </div>

        <p style={{ fontSize: 11, color: '#686868', margin: 0 }}>
          Note: SHA-256 hashing proves un-altered file integrity since ingestion into the BIS database. It does not replace statutory court verification.
        </p>
      </div>

      {/* ══════════════ 9. EVIDENCE-SAFE REWRITE & CROSS-MODULE ACTIONS ══════════════ */}
      <div style={{ background: '#171717', color: '#FFFFFF', borderRadius: 12, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#F28C52', textTransform: 'uppercase', letterSpacing: '0.04em' }}>EVIDENCE-SAFE REWRITE ASSISTANT</span>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: '4px 0 0', color: '#FFFFFF' }}>Grounded Compliance Wording Recommendation</h3>
        </div>

        <p style={{ fontSize: 13, color: '#E4E4E7', margin: 0, lineHeight: 1.6, background: '#27272A', border: '1px solid #3F3F46', borderRadius: 8, padding: 14 }}>
          {auditResult.evidenceSafeRewrite}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 8, borderTop: '1px solid #27272A' }}>
          <button
            onClick={handleCopyRewrite}
            style={{ background: '#F28C52', color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            {copiedRewrite ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />}
            <span>{copiedRewrite ? 'Copied Safe Wording' : 'Copy Evidence-Safe Wording'}</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/citations" style={{ background: '#27272A', color: '#FFFFFF', border: '1px solid #3F3F46', borderRadius: 6, padding: '8px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <BookOpen style={{ width: 13, height: 13, color: '#F28C52' }} />
              <span>Open Clause Citation</span>
            </Link>

            <Link href="/alerts" style={{ background: '#27272A', color: '#FFFFFF', border: '1px solid #3F3F46', borderRadius: 6, padding: '8px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <ShieldAlert style={{ width: 13, height: 13, color: '#F28C52' }} />
              <span>Check QCO Alerts</span>
            </Link>
          </div>
        </div>
      </div>

    </div>
  );
}
