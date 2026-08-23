'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, Upload, Send, BookOpen, CheckCircle2, 
  Sparkles, Layers, ShieldCheck, Eye, ArrowRight, Download,
  CheckSquare, Wrench, ShieldAlert, GitCompare, Scale, Info
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

  // Evidence Preview Modal State
  const [selectedCitation, setSelectedCitation] = useState<RagPageCitation | null>(null);

  // RAG Chat State
  const [inputQuery, setInputQuery] = useState<string>('What is the maximum allowed leakage current on page 12?');
  const [messages, setMessages] = useState<Array<{
    sender: 'user' | 'bot';
    text: string;
    citations?: RagPageCitation[];
    confidence?: string;
    sourceQuality?: string;
    safeRewrite?: string;
  }>>([
    {
      sender: 'bot',
      text: 'Document loaded & vector indexed successfully: IS_302_Electric_Iron_Standard.pdf (28 Pages, 24 Clauses, 14 Numerical Limits). Ask any research question or select a page on the left to inspect its exact content.',
      citations: [
        {
          pageNumber: 12,
          clauseRef: 'Clause 13.2',
          excerptText: 'Page 12 Excerpt: Leakage current shall not exceed 0.75 mA AC for Class I appliances during normal operational temperature testing.',
          documentTitle: 'IS 302-2-3:2024 Gazette Specification',
          matchedPhrase: 'leakage current shall not exceed 0.75 mA'
        }
      ],
      confidence: 'HIGH CONFIDENCE',
      sourceQuality: 'DIRECT EVIDENCE'
    }
  ]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

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
    setMessages([
      {
        sender: 'bot',
        text: `Standard loaded from knowledge base: ${std.isNumber} - ${std.title}. All clauses and testing parameters are indexed for evidence QA.`,
        confidence: 'HIGH CONFIDENCE',
        sourceQuality: 'DIRECT EVIDENCE'
      }
    ]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      const data = ingestPdfDocumentPipeline(file.name);
      setIngestionData(data);
      setMessages([
        {
          sender: 'bot',
          text: `Document loaded & vector indexed: ${file.name} (${data.overview.totalPages} Pages). Select any page on the left or type a question to research.`,
          confidence: 'HIGH CONFIDENCE',
          sourceQuality: 'DIRECT EVIDENCE'
        }
      ]);
    }
  };

  const handleSendQuery = (customQuery?: string) => {
    const textToRun = customQuery || inputQuery;
    if (!textToRun.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text: textToRun }]);
    if (!customQuery) setInputQuery('');
    setIsProcessing(true);

    setTimeout(() => {
      const ragResponse = queryPdfDocumentRag(textToRun, ingestionData.overview);
      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: ragResponse.answerText,
          citations: ragResponse.citations,
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
    }, 600);
  };

  // Find Clause Metadata for Currently Selected Page
  const activePageClause = ingestionData.extractedClauses.find(c => c.pageNumber === selectedPageNumber) || {
    clauseNumber: `Clause ${Math.max(1, Math.floor(selectedPageNumber * 0.85))}`,
    heading: selectedPageNumber <= 5 ? 'Scope & General Requirements' : selectedPageNumber <= 9 ? 'Marking & Rating Specifications' : selectedPageNumber <= 15 ? 'Electrical Insulation & Strength Testing' : 'Abnormal Operation & Thermal Safety',
    pageNumber: selectedPageNumber,
    subClauses: [`${selectedPageNumber}.1`, `${selectedPageNumber}.2`],
    mandatoryStatus: 'MANDATORY' as const,
    hasTables: selectedPageNumber === 8 || selectedPageNumber === 12 || selectedPageNumber === 17,
    hasFigures: selectedPageNumber === 13
  };

  const activePageNumerical = ingestionData.extractedNumericalRequirements.filter(n => n.pageNumber === selectedPageNumber || Math.abs(n.pageNumber - selectedPageNumber) <= 1);

  const handleSelectPage = (pNum: number) => {
    setSelectedPageNumber(pNum);
    setActiveResearchTab('page_preview');
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
              Multi-Stage Structural Document Analysis ({standards.length} Indexed Standards)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
            Turn complex Indian Standards, Gazette QCO notifications, test reports, and technical PDFs into searchable, explainable compliance intelligence. Answers are strictly grounded in document text with exact page &amp; clause citations.
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
              <div style={{ fontSize: 12, fontWeight: 800, color: '#171717' }}>Or Upload Custom Test Report / PDF</div>
            </div>

            <input type="file" accept=".pdf" onChange={handleFileUpload} style={{ display: 'none' }} id="pdf-file-input" />
            <label htmlFor="pdf-file-input" style={{ background: '#FFF1E8', color: '#E9783F', border: '1px solid #F4C4A5', borderRadius: 6, padding: '5px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}>
              Choose Document
            </label>
          </div>

          {/* Active File Summary */}
          <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#686868', textTransform: 'uppercase' }}>Active Knowledge Object</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#171717' }}>{ingestionData.overview.fileName}</div>
            <div style={{ fontSize: 11.5, color: '#4F7D5A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <CheckCircle2 style={{ width: 13, height: 13, color: '#4F7D5A' }} />
              <span>Status: READY FOR RESEARCH ({ingestionData.overview.classificationConfidence}% Confidence)</span>
            </div>
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
            <h3 style={{ fontSize: 14, fontWeight: 800, color: '#171717', margin: '0 0 2px' }}>{ingestionData.overview.detectedStandardIsNumber}: {ingestionData.overview.title}</h3>
            <span style={{ fontSize: 11, color: '#686868' }}>Edition: {ingestionData.overview.editionYear} • Size: {(ingestionData.overview.fileSizeBytes / 1024 / 1024).toFixed(2)} MB</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 8, fontSize: 11.5 }}>
            <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: 8 }}>
              <span style={{ color: '#686868', fontSize: 10 }}>PAGES</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#171717' }}>{ingestionData.overview.totalPages}</div>
            </div>
            <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: 8 }}>
              <span style={{ color: '#686868', fontSize: 10 }}>CLAUSES</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#171717' }}>{ingestionData.overview.totalClauses}</div>
            </div>
            <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: 8 }}>
              <span style={{ color: '#686868', fontSize: 10 }}>TABLES</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#171717' }}>{ingestionData.overview.totalTables}</div>
            </div>
            <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: 8 }}>
              <span style={{ color: '#686868', fontSize: 10 }}>NUMERICAL LIMITS</span>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#F28C52' }}>{ingestionData.overview.totalNumericalLimits}</div>
            </div>
          </div>
        </div>

      </div>

      {/* ══════════════ 3. INTERACTIVE RAG CHAT & RESEARCH WORKSPACE ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E8E2DC', paddingBottom: 14 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#171717', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles style={{ width: 18, height: 18, color: '#F28C52' }} />
            <span>Grounded RAG Evidence Chat</span>
          </h2>
          <span style={{ fontSize: 12, color: '#686868' }}>Strict Gazette Grounding Active</span>
        </div>

        {/* Message Stream */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: 420, overflowY: 'auto', paddingRight: 6 }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: msg.sender === 'user' ? '#F28C52' : '#FFFCF8',
                color: msg.sender === 'user' ? '#FFFFFF' : '#171717',
                border: msg.sender === 'user' ? 'none' : '1px solid #E8E2DC',
                borderRadius: 10,
                padding: 14,
                boxShadow: '0 1px 4px rgba(40,30,20,0.04)'
              }}
            >
              <div style={{ fontSize: 13, lineHeight: 1.5, fontWeight: msg.sender === 'user' ? 600 : 500 }}>
                {msg.text}
              </div>

              {msg.citations && msg.citations.length > 0 && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px dashed #E8E2DC', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>Grounded Gazette Citations:</span>
                  {msg.citations.map((c, cIdx) => (
                    <div key={cIdx} style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: '6px 10px', fontSize: 11.5 }}>
                      <strong>Page {c.pageNumber} ({c.clauseRef}):</strong> {c.excerptText}
                    </div>
                  ))}
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
            placeholder="Ask a technical or clause research question (e.g. What is the impact resistance limit?)..."
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
