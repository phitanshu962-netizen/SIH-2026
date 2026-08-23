'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileSearch, Upload, CheckCircle2, AlertTriangle, XCircle, Download, 
  ArrowRight, Shield, RefreshCw, FileText, CheckSquare, Sparkles, BookOpen
} from 'lucide-react';
import { getDynamicStandards } from '@/lib/data/bisDatabase';
import { saveGapAnalysisToFirebase } from '@/lib/firebase';
import { GapAnalysisResult, GapItem, BISStandard } from '@/lib/types';

export default function GapAnalyzerPage() {
  const [standards, setStandards] = useState<BISStandard[]>(() => getDynamicStandards());
  const [selectedStandardId, setSelectedStandardId] = useState<string>('is-302-2-3');
  const [docName, setDocName] = useState<string>('Product_Specification_Doc.txt');
  const [docContent, setDocContent] = useState<string>(
    `Product Spec: 1200W Steam Iron. Mains Voltage 230V AC. Heating element with adjustable thermostat. Standard earthing pin provided. Casing made of polycarbonate plastic. High voltage insulation tested up to 1000V AC. Thermostat auto cut-off set at 180°C.`
  );
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [result, setResult] = useState<GapAnalysisResult | null>(null);

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

  const handleRunAnalysis = () => {
    if (!selectedStandard) return;
    setIsAnalyzing(true);
    setTimeout(() => {
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

      if (allRequirementsToAudit.length === 0) {
        allRequirementsToAudit.push({
          clause: 'Clause 1.1',
          requirement: selectedStandard.title,
          paramKey: selectedStandard.title
        });
      }

      const gapItems: GapItem[] = allRequirementsToAudit.map((item) => {
        const words = item.paramKey.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        const snippetLines = docContent.split(/[\n.]+/).map(s => s.trim()).filter(Boolean);
        const matchingLine = snippetLines.find(line => {
          const lLower = line.toLowerCase();
          return words.some(w => lLower.includes(w));
        });

        if (matchingLine) {
          const hasNumber = /\d+/.test(matchingLine);
          if (hasNumber || matchingLine.length > 20) {
            return {
              clause: item.clause,
              requirement: item.requirement,
              userDocEvidence: `Matched in specification: "${matchingLine}"`,
              status: 'met',
              riskSeverity: 'Low',
              remediation: `Requirement verified in submitted spec. Keep calibration logs for ${item.clause}.`
            };
          } else {
            return {
              clause: item.clause,
              requirement: item.requirement,
              userDocEvidence: `Partial match: "${matchingLine}"`,
              status: 'partial',
              riskSeverity: 'Medium',
              remediation: `Specification details incomplete under ${item.clause}. Submit laboratory test data.`
            };
          }
        } else {
          return {
            clause: item.clause,
            requirement: item.requirement,
            userDocEvidence: `Not specified in submitted documentation text.`,
            status: 'missing',
            riskSeverity: 'High',
            remediation: `Mandatory clause requirement under ${selectedStandard.isNumber}. Conduct NABL lab test.`
          };
        }
      });

      const metCount = gapItems.filter(i => i.status === 'met').length;
      const partialCount = gapItems.filter(i => i.status === 'partial').length;
      const score = Math.round((metCount * 100 + partialCount * 50) / gapItems.length);

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
      setIsAnalyzing(false);
    }, 400);
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
          Upload product technical specifications to audit against official Indian Standard clause requirements (including uploaded BIS standards).
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
            <span>{isAnalyzing ? 'Analyzing Clauses...' : 'Run Gap Analysis'}</span>
          </button>
        </div>
      </div>

      {/* Split-Screen Compliance Results */}
      {result && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E8E2DC', paddingBottom: 16, marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: '#171717', margin: '0 0 4px' }}>
                Gap Analysis Verdict: {result.isNumber}
              </h2>
              <p style={{ margin: 0, fontSize: 12.5, color: '#686868' }}>
                Audited against {result.totalRequirements} statutory requirements and clause parameters.
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: result.overallComplianceScore >= 70 ? '#4F7D5A' : '#B85C52' }}>
                {result.overallComplianceScore}%
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#686868' }}>Readiness Score</div>
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
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: gap.status === 'met' ? '#EBF4EE' : gap.status === 'partial' ? '#FFF1E8' : '#FDF2F0',
                    color: gap.status === 'met' ? '#4F7D5A' : gap.status === 'partial' ? '#E9783F' : '#B85C52'
                  }}>
                    {gap.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#524F4D', marginBottom: 4 }}>{gap.userDocEvidence}</div>
                <div style={{ fontSize: 11.5, color: '#686868' }}><strong>Remediation:</strong> {gap.remediation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
