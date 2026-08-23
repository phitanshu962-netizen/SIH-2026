'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileSearch, Upload, CheckCircle2, AlertTriangle, XCircle, Download, 
  ArrowRight, Shield, RefreshCw, FileText, CheckSquare, Sparkles, BookOpen,
  Volume2, VolumeX, Cpu, MapPin
} from 'lucide-react';
import { getDynamicStandards } from '@/lib/data/bisDatabase';
import { saveGapAnalysisToFirebase } from '@/lib/firebase';
import { GapAnalysisResult, GapItem, BISStandard } from '@/lib/types';
import { speakAudioResponse, stopAudioPlayback } from '@/lib/voiceAssistantHelper';

export default function GapAnalyzerPage() {
  const [standards, setStandards] = useState<BISStandard[]>(() => getDynamicStandards());
  const [selectedStandardId, setSelectedStandardId] = useState<string>('is-302-2-3');
  const [docName, setDocName] = useState<string>('Product_Specification_Doc.txt');
  const [docContent, setDocContent] = useState<string>(
    `Product Spec: 1200W Steam Iron. Mains Voltage 230V AC. Heating element with adjustable thermostat. Standard earthing pin provided. Casing made of polycarbonate plastic. High voltage insulation tested up to 1000V AC. Thermostat auto cut-off set at 180°C.`
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<GapAnalysisResult | null>(null);
  const [aiEngineUsed, setAiEngineUsed] = useState<string>('Ollama AI & BIS RAG Engine');
  const [executiveSummary, setExecutiveSummary] = useState<string>('');
  const [nablRecommendations, setNablRecommendations] = useState<string[]>([]);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  useEffect(() => {
    const list = getDynamicStandards();
    setStandards(list);
    if (list.length > 0) {
      setSelectedStandardId(list[0].id);
    }

    const handleUpdate = () => {
      const updated = getDynamicStandards();
      setStandards(updated);
    };

    window.addEventListener('bis_standards_updated', handleUpdate);
    return () => window.removeEventListener('bis_standards_updated', handleUpdate);
  }, []);

  const selectedStandard = standards.find(s => s.id === selectedStandardId) || standards[0];

  const handleRunAnalysis = async () => {
    if (!selectedStandard) return;
    setIsAnalyzing(true);
    stopAudioPlayback();
    setIsSpeaking(false);

    try {
      const res = await fetch('/api/gap-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          standardId: selectedStandard.id,
          docContent,
          docName
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiEngineUsed(data.engineUsed || 'Ollama AI & BIS RAG Engine');
        setExecutiveSummary(data.executiveSummary || '');
        setNablRecommendations(data.nablRecommendations || []);

        const gapItems: GapItem[] = data.gaps || [];
        const metCount = gapItems.filter(i => i.status === 'met').length;
        const partialCount = gapItems.filter(i => i.status === 'partial').length;
        const missingCount = gapItems.filter(i => i.status === 'missing').length;

        const gapResultPayload = {
          productName: docName.replace(/\.[^/.]+$/, ""),
          standardId: selectedStandard.id,
          isNumber: selectedStandard.isNumber,
          overallComplianceScore: data.overallComplianceScore || 80,
          totalRequirements: gapItems.length,
          metCount,
          missingCount,
          partialCount,
          gaps: gapItems
        };

        setResult(gapResultPayload);
        saveGapAnalysisToFirebase(gapResultPayload);

        // Auto-speak audit summary out loud if Ollama executive summary exists
        if (data.executiveSummary) {
          speakAudioResponse(
            `Ollama Compliance Audit complete for ${selectedStandard.isNumber}. Overall score is ${data.overallComplianceScore} percent. ${data.executiveSummary.slice(0, 180)}`,
            () => setIsSpeaking(true),
            () => setIsSpeaking(false)
          );
        }

      } else {
        throw new Error('API returned non-200 status');
      }
    } catch (err) {
      console.warn("Gap Analysis API failed, performing instant grounded evaluation", err);
      performOfflineFallback();
    } finally {
      setIsAnalyzing(false);
    }
  };

  const performOfflineFallback = () => {
    if (!selectedStandard) return;
    const keyReqs = selectedStandard.keyRequirements || [];
    const testParams = selectedStandard.testingParameters || [];
    const clauses = selectedStandard.clauseReferences || [];
    
    const allRequirementsToAudit = [
      ...keyReqs.map((req, idx) => ({
        clause: clauses[idx % Math.max(1, clauses.length)]?.clause || `Clause ${8 + idx}`,
        requirement: req,
        paramKey: req
      })),
      ...testParams.map((param, idx) => ({
        clause: clauses[(keyReqs.length + idx) % Math.max(1, clauses.length)]?.clause || `Clause ${15 + idx}`,
        requirement: `${param} (Mandatory Validation)`,
        paramKey: param
      }))
    ];

    const gapItems: GapItem[] = allRequirementsToAudit.map((item) => {
      const words = item.paramKey.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const snippetLines = docContent.split(/[\n.]+/).map(s => s.trim()).filter(Boolean);
      const matchingLine = snippetLines.find(line => {
        const lLower = line.toLowerCase();
        return words.some(w => lLower.includes(w));
      });

      if (matchingLine) {
        const hasNumber = /\d+/.test(matchingLine);
        return {
          clause: item.clause,
          requirement: item.requirement,
          userDocEvidence: `Matched in specification: "${matchingLine}"`,
          status: hasNumber ? 'met' : 'partial',
          riskSeverity: hasNumber ? 'Low' : 'Medium',
          remediation: `Requirement verified in submitted spec. Keep NABL calibration logs for ${item.clause}.`
        };
      } else {
        return {
          clause: item.clause,
          requirement: item.requirement,
          userDocEvidence: `Not specified in submitted documentation text.`,
          status: 'missing',
          riskSeverity: 'High',
          remediation: `Mandatory statutory requirement under ${selectedStandard.isNumber}. Conduct NABL lab test.`
        };
      }
    });

    const metCount = gapItems.filter(i => i.status === 'met').length;
    const partialCount = gapItems.filter(i => i.status === 'partial').length;
    const score = Math.round((metCount * 100 + partialCount * 50) / gapItems.length);

    setAiEngineUsed('Grounded BIS RAG Engine (Local)');
    setExecutiveSummary(`Grounded compliance evaluation completed for ${selectedStandard.isNumber}. Identified ${gapItems.filter(i => i.status === 'missing').length} critical gaps requiring mandatory NABL testing.`);
    setNablRecommendations([
      `Submit test sample to NABL Accredited Central Electrical Testing Lab`,
      `Calibrate high voltage insulation testers to IS 302-2-3 standards`
    ]);

    const gapResultPayload = {
      productName: docName.replace(/\.[^/.]+$/, ""),
      standardId: selectedStandard.id,
      isNumber: selectedStandard.isNumber,
      overallComplianceScore: score,
      totalRequirements: gapItems.length,
      metCount,
      missingCount: gapItems.length - metCount - partialCount,
      partialCount,
      gaps: gapItems
    };

    setResult(gapResultPayload);
    saveGapAnalysisToFirebase(gapResultPayload);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%' }}>

      {/* Header Banner */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#171717', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <FileSearch style={{ width: 24, height: 24, color: '#F28C52' }} />
          <span>BIS Compliance Gap Analyzer Workspace</span>
        </h1>
        <p style={{ fontSize: 13, color: '#686868', margin: 0, maxWidth: 760 }}>
          Audit product technical specifications against official Indian Standard clause requirements using dedicated Ollama AI & BIS RAG Engine.
        </p>
      </div>

      {/* Input Section */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#171717', marginBottom: 6 }}>
              Target Indian Standard ({standards.length} Indexed)
            </label>
            <select
              value={selectedStandardId}
              onChange={(e) => setSelectedStandardId(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', background: '#FFFCF8',
                border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 13, color: '#242424',
                outline: 'none'
              }}
            >
              {standards.map((s) => (
                <option key={s.id} value={s.id}>{s.isNumber} - {s.title.slice(0, 40)}...</option>
              ))}
            </select>

            {selectedStandard && (
              <div style={{ marginTop: 12, padding: 10, background: '#F8F6F2', borderRadius: 6, fontSize: 12, color: '#524F4D' }}>
                <div style={{ fontWeight: 700, color: '#171717', marginBottom: 2 }}>{selectedStandard.isNumber}</div>
                <div style={{ marginBottom: 4 }}>{selectedStandard.category} • {selectedStandard.applicableScheme}</div>
                <div style={{ color: '#4F7D5A', fontWeight: 600 }}>{selectedStandard.mandatoryStatus}</div>
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: '#171717', marginBottom: 6 }}>
              Submitted Technical Specification Text
            </label>
            <textarea
              value={docContent}
              onChange={(e) => setDocContent(e.target.value)}
              rows={5}
              placeholder="Enter or paste product specs to analyze compliance gaps against standard clauses..."
              style={{
                width: '100%', padding: '10px 12px', background: '#FFFFFF',
                border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 13, color: '#242424',
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleRunAnalysis}
            disabled={isAnalyzing || !selectedStandard}
            style={{
              background: '#F28C52', color: '#FFFFFF',
              border: 'none', borderRadius: 6,
              padding: '11px 24px', fontSize: 13.5, fontWeight: 700,
              cursor: isAnalyzing || !selectedStandard ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8
            }}
          >
            <RefreshCw style={{ width: 16, height: 16, animation: isAnalyzing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{isAnalyzing ? 'Ollama Auditing Clauses...' : 'Run Ollama AI Gap Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Split-Screen Compliance Results */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Executive Summary Card & Voice Controls */}
          <div style={{ background: '#171717', color: '#FFFFFF', borderRadius: 10, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Cpu style={{ width: 20, height: 20, color: '#F28C52' }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: '#FFFFFF' }}>
                  Ollama Statutory Audit &amp; Directive Card
                </span>
                <span style={{ fontSize: 10.5, fontWeight: 800, background: '#FFF1E8', color: '#E9783F', borderRadius: 4, padding: '2px 8px' }}>
                  {aiEngineUsed}
                </span>
              </div>

              <button
                onClick={() => {
                  if (isSpeaking) {
                    stopAudioPlayback();
                    setIsSpeaking(false);
                  } else {
                    speakAudioResponse(
                      executiveSummary,
                      () => setIsSpeaking(true),
                      () => setIsSpeaking(false)
                    );
                  }
                }}
                style={{
                  background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 6,
                  padding: '5px 12px', fontSize: 11.5, fontWeight: 700, color: '#E9783F',
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
                }}
              >
                {isSpeaking ? <VolumeX style={{ width: 14, height: 14 }} /> : <Volume2 style={{ width: 14, height: 14 }} />}
                <span>{isSpeaking ? 'Stop Audio' : '🔊 Listen to Audit Summary'}</span>
              </button>
            </div>

            <p style={{ fontSize: 13, color: '#E4E4E7', lineHeight: 1.6, margin: '0 0 16px' }}>
              {executiveSummary || `Ollama AI statutory evaluation complete for ${result.isNumber}. Identified key requirements and risk severity levels across normative clauses.`}
            </p>

            {nablRecommendations && nablRecommendations.length > 0 && (
              <div style={{ background: '#27272A', borderRadius: 6, padding: 12, border: '1px solid #3F3F46' }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#F28C52', textTransform: 'uppercase', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin style={{ width: 13, height: 13 }} />
                  <span>Mandatory NABL Laboratory Directives</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {nablRecommendations.map((rec, rIdx) => (
                    <div key={rIdx} style={{ fontSize: 12, color: '#A1A1AA', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>•</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Results Table Header */}
          <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E8E2DC', paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: '#171717', margin: '0 0 4px' }}>
                  Clause Audit Results: {result.isNumber}
                </h2>
                <p style={{ margin: 0, fontSize: 12.5, color: '#686868' }}>
                  Audited against {result.totalRequirements} statutory requirements. {result.metCount} Met, {result.partialCount} Partial, {result.missingCount} Gaps.
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: result.overallComplianceScore >= 70 ? '#4F7D5A' : '#B85C52' }}>
                  {result.overallComplianceScore}%
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#686868' }}>Ollama Audit Score</div>
              </div>
            </div>

            {/* Gap Items Table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {result.gaps.map((gap, i) => (
                <div
                  key={i}
                  style={{
                    padding: 14, borderRadius: 8,
                    border: gap.status === 'met' ? '1px solid #B5D5BF' : gap.status === 'partial' ? '1px solid #F4C4A5' : '1px solid #F8D7DA',
                    background: gap.status === 'met' ? '#F8FCF9' : gap.status === 'partial' ? '#FFFDF8' : '#FDF2F0'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: '#171717' }}>{gap.clause}: {gap.requirement}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {gap.riskSeverity && (
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                          background: gap.riskSeverity === 'High' ? '#FDF2F0' : gap.riskSeverity === 'Medium' ? '#FFF1E8' : '#EBF4EE',
                          color: gap.riskSeverity === 'High' ? '#B85C52' : gap.riskSeverity === 'Medium' ? '#E9783F' : '#4F7D5A',
                          border: `1px solid ${gap.riskSeverity === 'High' ? '#E8BDB8' : gap.riskSeverity === 'Medium' ? '#F4C4A5' : '#B5D5BF'}`
                        }}>
                          {gap.riskSeverity} Risk
                        </span>
                      )}
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                        background: gap.status === 'met' ? '#EBF4EE' : gap.status === 'partial' ? '#FFF1E8' : '#FDF2F0',
                        color: gap.status === 'met' ? '#4F7D5A' : gap.status === 'partial' ? '#E9783F' : '#B85C52'
                      }}>
                        {gap.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#524F4D', marginBottom: 4 }}>{gap.userDocEvidence}</div>
                  <div style={{ fontSize: 11.5, color: '#686868' }}><strong>Remediation:</strong> {gap.remediation}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
