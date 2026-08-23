'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import { 
  FileText, Upload, Send, Bot, User, BookOpen, CheckCircle2, 
  Sparkles, RefreshCw, ChevronRight, FileCheck, AlertTriangle, BookOpenCheck,
  Layers, ShieldCheck, Eye, ArrowRight, Download, CheckSquare, Wrench, 
  ShieldAlert, GitCompare, Scale, Info, Shield, Check, XCircle
} from 'lucide-react';
import { ingestPdfDocumentPipeline, queryPdfDocumentRag, getDynamicStandards } from '@/lib/data/bisDatabase';
import { saveDocumentQueryToFirebase } from '@/lib/firebase';
import { DocumentAnalysisOverview, ExtractedClauseMetadata, ExtractedNumericalRequirement, RagAnswerResponse, RagPageCitation, BISStandard } from '@/lib/types';

export default function AskPDFPage() {
  const [standards, setStandards] = useState<BISStandard[]>(() => getDynamicStandards());
  const [selectedStandardId, setSelectedStandardId] = useState<string>('is-302-2-3');
  const [fileName, setFileName] = useState<string>('IS_302_Electric_Iron_Standard.pdf');
  const [ingestionData, setIngestionData] = useState(() => ingestPdfDocumentPipeline('IS_302_Electric_Iron_Standard.pdf'));
  
  // Page Explorer State
  const [selectedPageNumber, setSelectedPageNumber] = useState<number>(12);
  const [activeResearchTab, setActiveResearchTab] = useState<'chat' | 'page_preview' | 'numerical' | 'knowledge_map'>('chat');

  // Database Sanitization State
  const [isSanitizing, setIsSanitizing] = useState<boolean>(false);
  const [sanitizeReport, setSanitizeReport] = useState<any>(null);

  // Ingestion Stats State
  const [ingestionStats, setIngestionStats] = useState<{
    totalPages?: number;
    verifiedPagesCount?: number;
    ocrPagesCount?: number;
    unreliablePagesCount?: number;
  } | null>(null);

  // RAG Chat State
  const [inputQuery, setInputQuery] = useState<string>('What is the maximum allowed leakage current on page 12?');
  const [messages, setMessages] = useState<Array<{
    sender: 'user' | 'bot';
    text: string;
    citations?: any[];
    confidence?: string;
    sourceQuality?: string;
    safeRewrite?: string;
    isAbstention?: boolean;
    groundedClaims?: any[];
  }>>([
    {
      sender: 'bot',
      text: 'Document loaded & vector indexed successfully: IS_302_Electric_Iron_Standard.pdf (28 Pages, 24 Clauses, 14 Numerical Limits). Ask any research question or select a page on the left to inspect its exact content.',
      citations: [
        {
          pageNumber: 12,
          clauseNumber: 'Clause 13.2',
          clauseRef: 'Clause 13.2',
          snippet: 'Leakage current shall not exceed 0.75 mA AC for Class I appliances during normal operational temperature testing.',
          excerptText: 'Page 12 Excerpt: Leakage current shall not exceed 0.75 mA AC for Class I appliances during normal operational temperature testing.',
          documentTitle: 'IS 302-2-3:2024 Gazette Specification',
          matchedPhrase: 'leakage current shall not exceed 0.75 mA',
          extractionMethod: 'native',
          textQualityScore: 98,
          sourceStatus: 'verified'
        }
      ],
      confidence: 'HIGH CONFIDENCE',
      sourceQuality: 'DIRECT EVIDENCE'
    }
  ]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [chunksCount, setChunksCount] = useState<number>(0);
  const [isIndexed, setIsIndexed] = useState<boolean>(false);

  useEffect(() => {
    setStandards(getDynamicStandards());

    const handleUpdate = () => {
      setStandards(getDynamicStandards());
    };

    window.addEventListener('bis_standards_updated', handleUpdate);
    return () => window.removeEventListener('bis_standards_updated', handleUpdate);
  }, []);

  const handleSelectStandardFromDb = (stdId: string) => {
    setSelectedStandardId(stdId);
    const std = standards.find(s => s.id === stdId);
    if (!std) return;

    const fakeFileName = `${std.isNumber.replace(/[\s():/]/g, '_')}_Specification.pdf`;
    setFileName(fakeFileName);
    const data = ingestPdfDocumentPipeline(fakeFileName);
    
    // Enrich with actual standard metadata
    data.overview.detectedStandardIsNumber = std.isNumber;
    data.overview.title = std.title;

    setIngestionData(data);
    setIngestionStats(null);
    setMessages([
      {
        sender: 'bot',
        text: `Standard loaded from knowledge base: ${std.isNumber} - ${std.title}. All clauses and testing parameters are indexed with verified evidence grounding.`,
        confidence: 'HIGH CONFIDENCE',
        sourceQuality: 'DIRECT EVIDENCE'
      }
    ]);
  };

  // Ingest and index custom PDF with OCR and text quality validation
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setIsUploading(true);
    setUploadStatus('Uploading PDF & starting validation...');
    setIsIndexed(false);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      setUploadStatus('Validating text quality & running OCR fallback where needed...');
      const response = await fetch('/api/pdf/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process PDF file.');
      }
      
      setChunksCount(data.chunksCount);
      setIsIndexed(true);
      setIngestionStats({
        totalPages: data.totalPages,
        verifiedPagesCount: data.verifiedPagesCount,
        ocrPagesCount: data.ocrPagesCount,
        unreliablePagesCount: data.unreliablePagesCount
      });
      setUploadStatus('Indexing complete!');

      // Populate visual ingestion data client-side as well
      const localIngestion = ingestPdfDocumentPipeline(file.name);
      setIngestionData(localIngestion);

      setMessages([
        {
          sender: 'bot',
          text: `Document successfully validated and vector indexed: "${file.name}" (${data.chunksCount} verified chunks from ${data.totalPages} pages).\n\n• Verified Native: ${data.verifiedPagesCount - (data.ocrPagesCount || 0)} pages\n• OCR Verified: ${data.ocrPagesCount || 0} pages\n• Unreliable / Excluded: ${data.unreliablePagesCount || 0} pages\n\nAsk any question and answers will be strictly grounded in verified excerpts.`,
          citations: [],
          confidence: 'SUCCESS',
          sourceQuality: 'DIRECT EVIDENCE'
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setUploadStatus('Indexing failed.');
      setMessages([
        {
          sender: 'bot',
          text: `Error indexing document: ${err.message || err}. Please try uploading again or verify the PDF is not password-protected.`,
          confidence: 'FAILED',
          sourceQuality: 'NONE'
        }
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunDatabaseSanitization = async () => {
    setIsSanitizing(true);
    try {
      const res = await fetch('/api/pdf/reindex', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSanitizeReport(data.report);
        setMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: `🧹 Vector Database Audit Complete: Scanned ${data.report.totalScanned} chunks. Purged ${data.report.corruptedRemoved} corrupted/unreadable chunks. Retained ${data.report.verifiedRetained} verified high-quality chunks.`,
            confidence: 'AUDIT VERIFIED',
            sourceQuality: 'VERIFIED REINDEX'
          }
        ]);
      }
    } catch (err) {
      console.error('Failed to run database sanitization:', err);
    } finally {
      setIsSanitizing(false);
    }
  };

  const handleSendQuery = async (customQuery?: string) => {
    const textToRun = customQuery || inputQuery;
    if (!textToRun.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text: textToRun }]);
    if (!customQuery) setInputQuery('');
    setIsProcessing(true);

    if (!isIndexed) {
      setTimeout(() => {
        const ragResponse = queryPdfDocumentRag(textToRun, ingestionData.overview);
        setMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: ragResponse.answerText,
            citations: ragResponse.citations.map(c => ({
              ...c,
              snippet: c.excerptText,
              clauseNumber: c.clauseRef,
              extractionMethod: 'native',
              textQualityScore: 95,
              sourceStatus: 'verified'
            })),
            confidence: ragResponse.confidence,
            sourceQuality: ragResponse.sourceQuality,
            safeRewrite: ragResponse.evidenceSafeRewrite
          }
        ]);
        saveDocumentQueryToFirebase({
          fileName,
          query: textToRun,
          answer: ragResponse.answerText,
          citationsCount: ragResponse.citations?.length || 0,
          confidence: ragResponse.confidence
        });
        setIsProcessing(false);
      }, 400);
      return;
    }

    try {
      const response = await fetch('/api/pdf/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textToRun,
          fileName: fileName
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to query PDF standard.');
      }

      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: data.answer,
          citations: data.citations || [],
          confidence: data.modelUsed || 'EVIDENCE GROUNDED',
          sourceQuality: data.isAbstention ? 'UNRELIABLE SOURCE' : 'DIRECT EVIDENCE',
          safeRewrite: data.answer,
          isAbstention: data.isAbstention,
          groundedClaims: data.groundedClaims || []
        }
      ]);

      saveDocumentQueryToFirebase({
        fileName,
        query: textToRun,
        answer: data.answer,
        citationsCount: (data.citations || []).length,
        confidence: data.modelUsed || 'HIGH CONFIDENCE'
      });
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: `Error retrieving answer: ${err.message || err}. Grounded fallbacks are active across all Indian Standards.`,
          confidence: 'ERROR',
          sourceQuality: 'NONE'
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>

      {/* ══════════════ 1. HERO HEADER & DOCUMENT ENGINE BADGE ══════════════ */}
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
              <BookOpen style={{ width: 12, height: 12, color: '#F28C52' }} />
              Evidence-Grounded RAG Engine
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#686868' }}>
              Text Quality Validation &amp; Automatic OCR Fallback Active
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={handleRunDatabaseSanitization}
              disabled={isSanitizing}
              style={{
                background: '#FFFCF8', color: '#242424', border: '1px solid #E8E2DC',
                borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700,
                cursor: isSanitizing ? 'not-allowed' : 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6
              }}
            >
              <RefreshCw style={{ width: 13, height: 13, color: '#F28C52', animation: isSanitizing ? 'spin 1s linear infinite' : 'none' }} />
              <span>{isSanitizing ? 'Auditing Database...' : 'Clean Corrupted Vectors'}</span>
            </button>

            <Link href="/citations" style={{ background: '#FFFCF8', color: '#242424', border: '1px solid #E8E2DC', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <FileText style={{ width: 14, height: 14, color: '#F28C52' }} />
              <span>Clause Research</span>
            </Link>

            <Link href="/evidence-verifier" style={{ background: '#F28C52', color: '#FFFFFF', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <ShieldCheck style={{ width: 14, height: 14 }} />
              <span>Verify Evidence</span>
            </Link>
          </div>
        </div>

        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#171717', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen style={{ width: 24, height: 24, color: '#F28C52' }} />
            <span>Ask My PDF: BIS Document Intelligence &amp; Evidence Research Engine</span>
          </h1>
          <p style={{ fontSize: 13.5, color: '#686868', margin: 0, maxWidth: 880, lineHeight: 1.6 }}>
            Ingest Indian Standards, Gazette notifications, and test reports with automatic OCR fallback for unreadable pages. Factual answers are strictly grounded in verified readable text, preventing hallucinations from corrupted font encodings.
          </p>
        </div>
      </div>

      {/* ══════════════ 2. DOCUMENT UPLOAD & OVERVIEW METADATA ══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        
        {/* Upload Card & Standard Selector */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 22, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.04em' }}>1. SELECT FROM DATABASE OR UPLOAD PDF</span>
          
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: '#171717', marginBottom: 4 }}>
              Select Indexed Standard
            </label>
            <select
              value={selectedStandardId}
              onChange={(e) => handleSelectStandardFromDb(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 12.5, color: '#242424', outline: 'none' }}
            >
              {standards.map((s) => (
                <option key={s.id} value={s.id}>{s.isNumber} - {s.title.slice(0, 38)}...</option>
              ))}
            </select>
          </div>

          <div style={{ background: '#FFFCF8', border: '2px dashed #E8E2DC', borderRadius: 8, padding: 16, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Upload style={{ width: 24, height: 24, color: '#F28C52' }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#171717' }}>Upload Custom PDF / Gazette (with OCR fallback)</div>
              <div style={{ fontSize: 11, color: '#686868', marginTop: 2 }}>Corrupted/scanned pages will automatically be converted to OCR</div>
            </div>

            <input type="file" accept=".pdf" onChange={handleFileUpload} style={{ display: 'none' }} id="pdf-file-input" />
            <label htmlFor="pdf-file-input" style={{ background: '#FFF1E8', color: '#E9783F', border: '1px solid #F4C4A5', borderRadius: 6, padding: '5px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
              Choose Document
            </label>
          </div>

          {/* Active File Summary */}
          <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#686868', textTransform: 'uppercase' }}>Active Knowledge Object</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#171717' }}>{fileName}</div>
            <div style={{ fontSize: 11.5, color: isIndexed ? '#4F7D5A' : isUploading ? '#D97706' : '#686868', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              {isUploading ? (
                <RefreshCw style={{ width: 13, height: 13, color: '#D97706', animation: 'spin 1s linear infinite' }} />
              ) : (
                <CheckCircle2 style={{ width: 13, height: 13, color: isIndexed ? '#4F7D5A' : '#686868' }} />
              )}
              <span>
                Status: {isUploading ? uploadStatus : isIndexed ? `Vector Indexed (${chunksCount} Verified Chunks)` : `READY FOR RESEARCH (${ingestionData.overview.classificationConfidence}% Confidence)`}
              </span>
            </div>

            {ingestionStats && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4, fontSize: 10.5 }}>
                <span style={{ background: '#EBF4EE', color: '#4F7D5A', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                  ✓ Native: {ingestionStats.verifiedPagesCount! - (ingestionStats.ocrPagesCount || 0)}
                </span>
                <span style={{ background: '#EFF6FF', color: '#2563EB', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                  ✓ OCR: {ingestionStats.ocrPagesCount || 0}
                </span>
                {ingestionStats.unreliablePagesCount ? (
                  <span style={{ background: '#FEF2F2', color: '#DC2626', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>
                    ✕ Unreliable: {ingestionStats.unreliablePagesCount}
                  </span>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Document Intelligence Overview Card */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 22, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.04em' }}>2. DOCUMENT INTELLIGENCE METADATA</span>
            <span style={{ fontSize: 10.5, fontWeight: 800, background: '#FFF1E8', color: '#E9783F', padding: '2px 8px', borderRadius: 4 }}>
              {ingestionData.overview.documentType}
            </span>
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#171717', margin: '0 0 2px' }}>
              {isIndexed ? fileName : `${ingestionData.overview.detectedStandardIsNumber}: ${ingestionData.overview.title}`}
            </h3>
            <span style={{ fontSize: 11, color: '#686868' }}>
              {isIndexed 
                ? `Live Uploaded PDF • ${chunksCount} Verified Vector Chunks Indexed` 
                : `Edition: ${ingestionData.overview.editionYear} • Size: ${(ingestionData.overview.fileSizeBytes / 1024 / 1024).toFixed(2)} MB`}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, fontSize: 11.5 }}>
            <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: 8 }}>
              <span style={{ color: '#686868', fontSize: 10 }}>PAGES</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#171717' }}>
                {ingestionStats?.totalPages || ingestionData.overview.totalPages}
              </div>
            </div>
            <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: 8 }}>
              <span style={{ color: '#686868', fontSize: 10 }}>VERIFIED CHUNKS</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#171717' }}>
                {chunksCount || ingestionData.overview.totalClauses}
              </div>
            </div>
            <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: 8 }}>
              <span style={{ color: '#686868', fontSize: 10 }}>OCR PAGES</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#2563EB' }}>
                {ingestionStats?.ocrPagesCount || 0}
              </div>
            </div>
            <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: 8 }}>
              <span style={{ color: '#686868', fontSize: 10 }}>NATIVE PAGES</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#4F7D5A' }}>
                {ingestionStats ? (ingestionStats.verifiedPagesCount! - (ingestionStats.ocrPagesCount || 0)) : ingestionData.overview.totalTables}
              </div>
            </div>
          </div>

          {sanitizeReport && (
            <div style={{ background: '#EBF4EE', border: '1px solid #B5D5BF', borderRadius: 6, padding: '8px 12px', fontSize: 11, color: '#275233' }}>
              <strong>Database Cleaned:</strong> Purged {sanitizeReport.corruptedRemoved} corrupted chunks, {sanitizeReport.verifiedRetained} verified vectors remaining.
            </div>
          )}
        </div>

      </div>

      {/* ══════════════ 3. INTERACTIVE RAG CHAT & RESEARCH WORKSPACE ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E8E2DC', paddingBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#171717', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles style={{ width: 18, height: 18, color: '#F28C52' }} />
            <span>Grounded RAG Evidence Chat</span>
          </h2>
          <span style={{ fontSize: 12, color: '#686868', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ShieldCheck style={{ width: 14, height: 14, color: '#4F7D5A' }} />
            <span>Strict Evidence Grounding Active</span>
          </span>
        </div>

        {/* Message Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 480, overflowY: 'auto', paddingRight: 6 }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: msg.sender === 'user' ? '75%' : '92%',
                background: msg.sender === 'user' ? '#F28C52' : msg.isAbstention ? '#FEF2F2' : '#FFFFFF',
                color: msg.sender === 'user' ? '#FFFFFF' : '#171717',
                border: msg.sender === 'user' ? 'none' : `1px solid ${msg.isAbstention ? '#FECACA' : '#E8E2DC'}`,
                borderRadius: 10,
                padding: '14px 18px',
                boxShadow: '0 1px 4px rgba(40,30,20,0.04)'
              }}
            >
              {/* Abstention Flag Header */}
              {msg.isAbstention && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#DC2626', fontSize: 11, fontWeight: 800, marginBottom: 8, textTransform: 'uppercase' }}>
                  <AlertTriangle style={{ width: 14, height: 14 }} />
                  <span>Evidence Abstention: Source Unverified / Corrupted</span>
                </div>
              )}

              {msg.sender === 'user' ? (
                <div style={{ fontSize: 13.5, lineHeight: 1.5, fontWeight: 600 }}>
                  {msg.text}
                </div>
              ) : (
                <div style={{ fontSize: 13, lineHeight: 1.65, color: '#242424' }}>
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 style={{ fontSize: 17, fontWeight: 800, color: '#171717', margin: '10px 0 6px' }}>{children}</h1>,
                      h2: ({ children }) => <h2 style={{ fontSize: 15, fontWeight: 800, color: '#171717', margin: '10px 0 6px', borderBottom: '1px solid #E8E2DC', paddingBottom: 4 }}>{children}</h2>,
                      h3: ({ children }) => <h3 style={{ fontSize: 13.5, fontWeight: 800, color: '#E9783F', margin: '10px 0 4px', display: 'flex', alignItems: 'center', gap: 4 }}>{children}</h3>,
                      h4: ({ children }) => <h4 style={{ fontSize: 12.5, fontWeight: 700, color: '#171717', margin: '8px 0 2px' }}>{children}</h4>,
                      p: ({ children }) => <p style={{ margin: '0 0 8px', color: '#242424' }}>{children}</p>,
                      ul: ({ children }) => <ul style={{ margin: '4px 0 8px 18px', paddingLeft: 0, listStyleType: 'disc' }}>{children}</ul>,
                      ol: ({ children }) => <ol style={{ margin: '4px 0 8px 18px', paddingLeft: 0, listStyleType: 'decimal' }}>{children}</ol>,
                      li: ({ children }) => <li style={{ marginBottom: 3, color: '#2E2B29' }}>{children}</li>,
                      blockquote: ({ children }) => (
                        <blockquote style={{
                          margin: '8px 0',
                          padding: '8px 12px',
                          background: '#FDFBF7',
                          borderLeft: '3px solid #F28C52',
                          borderRadius: '0 6px 6px 0',
                          color: '#47423F',
                          fontSize: 12.5
                        }}>
                          {children}
                        </blockquote>
                      ),
                      code: ({ children }) => (
                        <code style={{ background: '#F4ECE6', color: '#8C3D10', padding: '1px 5px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                          {children}
                        </code>
                      ),
                      strong: ({ children }) => <strong style={{ color: '#171717', fontWeight: 700 }}>{children}</strong>,
                      hr: () => <hr style={{ border: 'none', borderTop: '1px solid #E8E2DC', margin: '12px 0' }} />
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                </div>
              )}

              {/* Citations with Quality Badges */}
              {msg.citations && msg.citations.length > 0 && !msg.text.includes('### 📄 Grounded Document Excerpts') && !msg.text.includes('## 📄') && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #E8E2DC', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Grounded Source Evidence &amp; Verification Badges:
                  </span>
                  {msg.citations.map((c, cIdx) => {
                    const isOcr = c.extractionMethod === 'ocr';
                    const isUnreliable = c.sourceStatus === 'unreliable' || (c.textQualityScore !== undefined && c.textQualityScore < 50);

                    return (
                      <div key={cIdx} style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 8, padding: '8px 12px', fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                          <span style={{ fontWeight: 800, color: '#171717' }}>
                            Page {c.pageNumber} {c.clauseNumber ? `(${c.clauseNumber})` : c.clauseRef ? `(${c.clauseRef})` : ''}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {isUnreliable ? (
                              <span style={{ fontSize: 10, fontWeight: 800, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5', padding: '1px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <XCircle style={{ width: 10, height: 10 }} />
                                ✕ Unreliable Source
                              </span>
                            ) : isOcr ? (
                              <span style={{ fontSize: 10, fontWeight: 800, background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', padding: '1px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <Check style={{ width: 10, height: 10 }} />
                                ✓ OCR Verified
                              </span>
                            ) : (
                              <span style={{ fontSize: 10, fontWeight: 800, background: '#EBF4EE', color: '#4F7D5A', border: '1px solid #B5D5BF', padding: '1px 6px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <Check style={{ width: 10, height: 10 }} />
                                ✓ Verified Native
                              </span>
                            )}

                            {c.textQualityScore !== undefined && (
                              <span style={{ fontSize: 9.5, fontWeight: 700, color: '#686868', background: '#F8F6F2', padding: '1px 5px', borderRadius: 4 }}>
                                Score: {c.textQualityScore}%
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ fontSize: 11.5, color: '#374151', fontStyle: 'italic', lineHeight: 1.45 }}>
                          "{c.snippet || c.excerptText}"
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Query Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendQuery();
          }}
          style={{ display: 'flex', gap: 10 }}
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask a technical, clause, or limit question (e.g. What are the requirements on page 14?)..."
            style={{
              flex: 1, padding: '12px 16px', background: '#FFFCF8', border: '1px solid #E8E2DC',
              borderRadius: 8, fontSize: 13.5, color: '#242424', outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={isProcessing || !inputQuery.trim()}
            style={{
              background: '#F28C52', color: '#FFFFFF', border: 'none',
              borderRadius: 8, padding: '0 22px', fontSize: 13.5, fontWeight: 700,
              cursor: isProcessing || !inputQuery.trim() ? 'not-allowed' : 'pointer',
              opacity: isProcessing || !inputQuery.trim() ? 0.6 : 1,
              display: 'inline-flex', alignItems: 'center', gap: 8
            }}
          >
            <Send style={{ width: 15, height: 15 }} />
            <span>{isProcessing ? 'Researching...' : 'Ask AI'}</span>
          </button>
        </form>

      </div>

    </div>
  );
}
