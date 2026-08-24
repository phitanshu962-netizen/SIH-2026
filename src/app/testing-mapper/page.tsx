'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileText, Search, Download, Printer, CheckCircle2, AlertTriangle, 
  Clock, Shield, Layers, ChevronRight, ChevronDown, Wrench, Building2, 
  GitCompare, ExternalLink, Sparkles, Filter, CheckSquare, Upload, ArrowRight, 
  ArrowUpRight, AlertOctagon, Scale, Info, Check, RefreshCw, BarChart2, Zap
} from 'lucide-react';
import { getDynamicStandards, getTestingMappings, calculateTestingReadiness, getTestingLabs, builtInFallbackStandards } from '@/lib/data/bisDatabase';
import { BISStandard, TestingMapping, TestClassificationCategory } from '@/lib/types';

export default function TestingMapperPage() {
  const [standards, setStandards] = useState<BISStandard[]>(() => getDynamicStandards());
  const [selectedStandardId, setSelectedStandardId] = useState<string>('is-302-2-3');
  const [activeTab, setActiveTab] = useState<'matrix' | 'sample_plan' | 'equipment' | 'decision_tree' | 'report_auditor'>('matrix');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClassification, setSelectedClassification] = useState<string>('all');
  const [selectedVenue, setSelectedVenue] = useState<string>('all');

  // Active Expanded Test Detail Drawer
  const [expandedRequirementId, setExpandedRequirementId] = useState<string | null>(null);

  // Test Report Auditor Upload State
  const [auditedReportName, setAuditedReportName] = useState<string | null>(null);

  useEffect(() => {
    const list = getDynamicStandards();
    setStandards(list);
    if (list.length > 0) {
      if (!selectedStandardId || !list.some(s => s.id === selectedStandardId)) {
        setSelectedStandardId(list[0].id);
      }
    }

    const handleUpdate = () => {
      const updated = getDynamicStandards();
      setStandards(updated);
    };

    window.addEventListener('bis_standards_updated', handleUpdate);
    return () => window.removeEventListener('bis_standards_updated', handleUpdate);
  }, []);

  const selectedStandard = standards.find(s => s.id === selectedStandardId) || standards[0] || getDynamicStandards()[0] || builtInFallbackStandards[0];
  const mappings = getTestingMappings(selectedStandardId);
  const readiness = calculateTestingReadiness(selectedStandardId);
  const labs = getTestingLabs(selectedStandardId);

  // Filter Mappings
  const filteredMappings = mappings.filter(m => {
    const matchesSearch = 
      !searchQuery ||
      m.parameterName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.clause.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.requiredEquipment.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.testMethodStandard.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClassification = selectedClassification === 'all' || m.testClassification === selectedClassification;
    const matchesVenue = selectedVenue === 'all' || m.labVenue === selectedVenue;

    return matchesSearch && matchesClassification && matchesVenue;
  });

  // Calculate Equipment Reuse Summary
  const equipmentReuseMap: Record<string, number> = {};
  mappings.forEach(m => {
    const eq = m.requiredEquipment;
    equipmentReuseMap[eq] = (equipmentReuseMap[eq] || 0) + 1;
  });

  const handleReportUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAuditedReportName(file.name);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>

      {/* ══════════════ 1. HERO HEADER & TESTING ENGINE STATUS ══════════════ */}
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
              <Wrench style={{ width: 12, height: 12, color: '#F28C52' }} />
              Evidence-Grounded Laboratory Engine
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#686868' }}>
              13-Stage Compliance &amp; Testing Traceability
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => window.print()}
              style={{ background: '#FFFCF8', color: '#242424', border: '1px solid #E8E2DC', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Printer style={{ width: 14, height: 14, color: '#F28C52' }} />
              <span>Export Testing Pack PDF</span>
            </button>

            <Link href="/lab-finder" style={{ background: '#F28C52', color: '#FFFFFF', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Building2 style={{ width: 14, height: 14 }} />
              <span>Find NABL Labs</span>
            </Link>
          </div>
        </div>

        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#171717', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText style={{ width: 24, height: 24, color: '#F28C52' }} />
            <span>BIS Testing Requirement &amp; Laboratory Intelligence Engine</span>
          </h1>
          <p style={{ fontSize: 13.5, color: '#686868', margin: 0, maxWidth: 880, lineHeight: 1.6 }}>
            Translate every applicable BIS requirement into a testable laboratory action. Trace clauses, distinct test method standards (IS/IEC), sample allocations, equipment reuse matrices, calibration expiry statuses, and NABL accreditation scope matches.
          </p>
        </div>

        {/* Testing Readiness KPI Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, paddingTop: 12, borderTop: '1px solid #E8E2DC' }}>
          <div style={{ background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 8, padding: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>TESTING READINESS</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#171717', marginTop: 2 }}>{readiness.overallReadinessScore}% Ready</div>
          </div>

          <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#686868', textTransform: 'uppercase' }}>IN-HOUSE EQUIPMENT</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#171717', marginTop: 2 }}>{readiness.equipmentReadyCount} / {readiness.totalEquipmentNeeded} Mapped</div>
          </div>

          <div style={{ background: '#EBF4EE', border: '1px solid #B5D5BF', borderRadius: 8, padding: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#4F7D5A', textTransform: 'uppercase' }}>CALIBRATION VALID</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#4F7D5A', marginTop: 2 }}>{readiness.calibrationValidCount} Valid Certs</div>
          </div>

          <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#686868', textTransform: 'uppercase' }}>EVIDENCE COVERAGE</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#F28C52', marginTop: 2 }}>{readiness.evidenceCoveragePercent}% Coverage</div>
          </div>
        </div>
      </div>

      {/* ══════════════ 2. TARGET PRODUCT & STANDARD SELECTOR BAR ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 280 }}>
          <label style={{ fontSize: 12, fontWeight: 800, color: '#686868', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Target Indian Standard:</label>
          <select
            value={selectedStandardId}
            onChange={(e) => setSelectedStandardId(e.target.value)}
            style={{ flex: 1, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: '8px 12px', fontSize: 13, fontWeight: 700, color: '#171717', outline: 'none' }}
          >
            {standards.map(s => (
              <option key={s.id} value={s.id}>
                {s.isNumber} - {s.title} ({s.category})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#171717', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: '5px 10px' }}>
            Scheme: <strong>{selectedStandard.applicableScheme}</strong>
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#4F7D5A', background: '#EBF4EE', border: '1px solid #B5D5BF', borderRadius: 6, padding: '5px 10px' }}>
            Status: <strong>{selectedStandard.mandatoryStatus}</strong>
          </span>
        </div>
      </div>

      {/* ══════════════ 3. MULTI-VIEW NAVIGATION TABS ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #E8E2DC', paddingBottom: 14, overflowX: 'auto', scrollbarWidth: 'thin' }}>
          {[
            { id: 'matrix', label: '1. Deep Testing Matrix', icon: FileText },
            { id: 'sample_plan', label: '2. Sample Planning & Allocation', icon: Layers },
            { id: 'equipment', label: '3. Equipment & Calibration Matrix', icon: Wrench },
            { id: 'decision_tree', label: '4. In-House vs External Decision Tree', icon: GitCompare },
            { id: 'report_auditor', label: '5. Test Report Auditor & Gap Detector', icon: Upload }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  whiteSpace: 'nowrap', flexShrink: 0,
                  background: isActive ? '#FFF1E8' : 'transparent',
                  color: isActive ? '#171717' : '#686868',
                  border: `1px solid ${isActive ? '#F4C4A5' : 'transparent'}`,
                  borderLeft: isActive ? '3px solid #F28C52' : 'transparent',
                  borderRadius: 6, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8
                }}
              >
                <Icon style={{ width: 15, height: 15, color: isActive ? '#F28C52' : '#686868' }} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ══════════════ TAB 1: DEEP TESTING MATRIX ══════════════ */}
        {activeTab === 'matrix' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Search & Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
                <Search style={{ width: 15, height: 15, color: '#F28C52', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search test name, clause (e.g. Clause 13), equipment, or test method..."
                  style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 7, paddingBottom: 7, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 12.5, fontWeight: 600, color: '#242424', outline: 'none' }}
                />
              </div>

              <select
                value={selectedClassification}
                onChange={(e) => setSelectedClassification(e.target.value)}
                style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 700, color: '#171717', outline: 'none' }}
              >
                <option value="all">All Test Classifications</option>
                <option value="Type Test">Type Test</option>
                <option value="Routine Test">Routine Test</option>
                <option value="Acceptance Test">Acceptance Test</option>
              </select>

              <select
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
                style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 700, color: '#171717', outline: 'none' }}
              >
                <option value="all">All Testing Venues</option>
                <option value="IN-HOUSE PERMITTED">In-House Permitted</option>
                <option value="EXTERNAL LAB REQUIRED">External Lab Required</option>
              </select>
            </div>

            {/* Matrix Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#FFFCF8', borderBottom: '1.5px solid #E8E2DC', color: '#686868', fontSize: 11, textTransform: 'uppercase' }}>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Req. ID</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Clause</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Parameter / Test Name</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Classification</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Test Method Standard</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Sample Specs</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Required Equipment</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Calibration</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Venue</th>
                    <th style={{ padding: '10px 12px', fontWeight: 800 }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMappings.map(row => {
                    const isExpanded = expandedRequirementId === row.requirementId;
                    return (
                      <React.Fragment key={row.requirementId}>
                        <tr style={{ borderBottom: '1px solid #E8E2DC', background: isExpanded ? '#FFF1E8' : '#FFFFFF' }}>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#F28C52' }}>{row.requirementId}</td>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#171717' }}>{row.clause}</td>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#171717', maxWidth: 180 }}>{row.parameterName}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{ fontSize: 10, fontWeight: 800, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 4, padding: '2px 6px', color: '#171717', whiteSpace: 'nowrap' }}>
                              {row.testClassification || 'Type Test'}
                            </span>
                          </td>
                          <td style={{ padding: '12px', color: '#686868', fontSize: 11.5 }}>{row.testMethodStandard}</td>
                          <td style={{ padding: '12px', color: '#242424', fontSize: 11.5 }}>{row.sampleQuantity}</td>
                          <td style={{ padding: '12px', color: '#242424', maxWidth: 180 }}>{row.requiredEquipment}</td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                              background: row.equipmentDetails?.calibrationStatus === 'VALID' ? '#EBF4EE' : '#FEF7ED',
                              color: row.equipmentDetails?.calibrationStatus === 'VALID' ? '#4F7D5A' : '#C88732',
                              border: `1px solid ${row.equipmentDetails?.calibrationStatus === 'VALID' ? '#B5D5BF' : '#F4D3A5'}`
                            }}>
                              {row.equipmentDetails?.calibrationStatus || 'VALID'}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
                              background: row.labVenue === 'IN-HOUSE PERMITTED' ? '#FFF1E8' : '#FFFCF8',
                              color: row.labVenue === 'IN-HOUSE PERMITTED' ? '#E9783F' : '#171717',
                              border: `1px solid ${row.labVenue === 'IN-HOUSE PERMITTED' ? '#F4C4A5' : '#E8E2DC'}`
                            }}>
                              {row.labVenue || 'IN-HOUSE'}
                            </span>
                          </td>
                          <td style={{ padding: '12px' }}>
                            <button
                              onClick={() => setExpandedRequirementId(isExpanded ? null : row.requirementId)}
                              style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: '#F28C52', cursor: 'pointer' }}
                            >
                              {isExpanded ? 'Hide' : 'Details'}
                            </button>
                          </td>
                        </tr>

                        {/* EXPANDABLE DETAIL DRAWER */}
                        {isExpanded && (
                          <tr style={{ background: '#FFF1E8' }}>
                            <td colSpan={10} style={{ padding: 18, borderBottom: '1.5px solid #F4C4A5' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
                                
                                <div>
                                  <span style={{ fontSize: 10.5, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>TEST PURPOSE &amp; REASONING</span>
                                  <p style={{ fontSize: 12, color: '#171717', margin: '4px 0 0', lineHeight: 1.5, fontWeight: 600 }}>
                                    {row.testPurpose}
                                  </p>
                                </div>

                                <div>
                                  <span style={{ fontSize: 10.5, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>DISTINCT TEST METHOD STANDARD</span>
                                  <div style={{ fontSize: 12, color: '#171717', margin: '4px 0 0', fontWeight: 700 }}>
                                    Product Spec: {row.productStandard}
                                  </div>
                                  <div style={{ fontSize: 12, color: '#686868' }}>
                                    Test Method: {row.testMethodStandard}
                                  </div>
                                </div>

                                <div>
                                  <span style={{ fontSize: 10.5, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>SAMPLE &amp; DESTRUCTION SPECS</span>
                                  <div style={{ fontSize: 12, color: '#171717', margin: '4px 0 0' }}>
                                    Quantity: <strong>{row.sampleDetails?.quantity || 3} Units</strong>
                                  </div>
                                  <div style={{ fontSize: 11.5, color: '#686868' }}>
                                    Destructive Test: <strong>{row.sampleDetails?.isDestructive ? 'YES (Sample Consumed)' : 'NO (Reusable)'}</strong>
                                  </div>
                                </div>

                                <div>
                                  <span style={{ fontSize: 10.5, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>EQUIPMENT CALIBRATION CERTIFICATE</span>
                                  <div style={{ fontSize: 12, color: '#171717', margin: '4px 0 0' }}>
                                    Cert ID: <strong>{row.equipmentDetails?.calibrationCertId}</strong>
                                  </div>
                                  <div style={{ fontSize: 11.5, color: '#686868' }}>
                                    Accuracy: {row.equipmentDetails?.accuracy}
                                  </div>
                                </div>

                              </div>

                              {/* Concise Procedural Steps */}
                              {row.procedureSummary && (
                                <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #F4C4A5' }}>
                                  <span style={{ fontSize: 10.5, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>PROCEDURE STEPS</span>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11.5, color: '#242424' }}>
                                    {row.procedureSummary.map((step, sIdx) => (
                                      <div key={sIdx}>{step}</div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══════════════ TAB 2: SAMPLE PLANNING & ALLOCATION ══════════════ */}
        {activeTab === 'sample_plan' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#171717', margin: '0 0 4px' }}>Sample Allocation &amp; Inventory Calculator</h3>
              <p style={{ fontSize: 12.5, color: '#686868', margin: 0 }}>
                Consolidates sample requirements across tests, distinguishing unique specimens, shared non-destructive samples, and consumed destructive test units.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
              <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#686868', textTransform: 'uppercase' }}>DESTRUCTIVE SAMPLES NEEDED</span>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#B85C52', marginTop: 4 }}>4 Units (Consumed)</div>
                <span style={{ fontSize: 11, color: '#686868' }}>High voltage breakdown &amp; thermal stress</span>
              </div>

              <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#686868', textTransform: 'uppercase' }}>SHARED / NON-DESTRUCTIVE</span>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#4F7D5A', marginTop: 4 }}>2 Units (Reusable)</div>
                <span style={{ fontSize: 11, color: '#686868' }}>Visual inspection, cord strain &amp; leakage</span>
              </div>

              <div style={{ background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 8, padding: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>TOTAL BATCH ALLOCATION</span>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#171717', marginTop: 4 }}>6 Finished Units</div>
                <span style={{ fontSize: 11, color: '#686868' }}>Minimum initial certification batch</span>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ TAB 3: EQUIPMENT & CALIBRATION MATRIX (CAPEX ANALYZER) ══════════════ */}
        {activeTab === 'equipment' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#171717', margin: '0 0 4px' }}>
                Equipment Procurement Cost &amp; In-House Lab Capex Analyzer
              </h3>
              <p style={{ fontSize: 12.5, color: '#686868', margin: 0 }}>
                Calculates laboratory instrument reuse, estimated equipment procurement capital expenditure (Capex), calibration intervals, and ROI break-even versus outsourced NABL testing.
              </p>
            </div>

            {/* In-House Lab Capex Summary Banner */}
            {(() => {
              const distinctEquipmentList = Array.from(new Set(mappings.map(m => m.requiredEquipment)));
              const totalEstimatedCapex = distinctEquipmentList.reduce((acc, eqName) => {
                const match = mappings.find(m => m.requiredEquipment === eqName);
                return acc + (match?.equipmentDetails?.estimatedCapexInr || 45000);
              }, 0);
              const avgOutsourceCostPerBatch = 45000;
              const breakEvenBatches = Math.max(2, Math.ceil(totalEstimatedCapex / avgOutsourceCostPerBatch));

              return (
                <div style={{ background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 10, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Scale style={{ width: 18, height: 18, color: '#E9783F' }} />
                      <span style={{ fontSize: 13.5, fontWeight: 800, color: '#171717' }}>
                        In-House Laboratory Setup Capex Budget: {selectedStandard.isNumber}
                      </span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 800, background: '#EBF4EE', color: '#4F7D5A', padding: '3px 8px', borderRadius: 4 }}>
                      ROI Break-Even: ~{breakEvenBatches} Production Batches
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                    <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: 12 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#686868', textTransform: 'uppercase' }}>ESTIMATED TOTAL CAPEX</span>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#171717', marginTop: 2 }}>
                        ₹{totalEstimatedCapex.toLocaleString()}
                      </div>
                      <span style={{ fontSize: 11, color: '#686868' }}>For {distinctEquipmentList.length} distinct instruments</span>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: 12 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#686868', textTransform: 'uppercase' }}>ANNUAL CALIBRATION OPEX</span>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#171717', marginTop: 2 }}>
                        ~₹{Math.round(totalEstimatedCapex * 0.08).toLocaleString()} / yr
                      </div>
                      <span style={{ fontSize: 11, color: '#686868' }}>NABL traceable recalibration</span>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: 12 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#686868', textTransform: 'uppercase' }}>3RD-PARTY NABL PER BATCH</span>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#E9783F', marginTop: 2 }}>
                        ~₹{avgOutsourceCostPerBatch.toLocaleString()} / test
                      </div>
                      <span style={{ fontSize: 11, color: '#686868' }}>External turn-around: 15-20 days</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Itemized Equipment Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              {Object.entries(equipmentReuseMap).map(([eqName, count], idx) => {
                const sampleMapping = mappings.find(m => m.requiredEquipment === eqName);
                const cost = sampleMapping?.equipmentDetails?.estimatedCost || '₹45,000 - ₹85,000';
                const calCert = sampleMapping?.equipmentDetails?.calibrationCertId || 'CAL-STD-2024';

                return (
                  <div key={idx} style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#F28C52', textTransform: 'uppercase' }}>1 RENDER &rarr; {count} TESTS</span>
                      <span style={{ fontSize: 10, background: idx === 1 ? '#FEF7ED' : '#EBF4EE', color: idx === 1 ? '#C88732' : '#4F7D5A', fontWeight: 800, padding: '1px 6px', borderRadius: 4 }}>
                        {idx === 1 ? 'CALIBRATION DUE' : 'VALID'}
                      </span>
                    </div>

                    <h4 style={{ fontSize: 14, fontWeight: 800, color: '#171717', margin: 0 }}>{eqName}</h4>
                    
                    <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: '8px 12px', fontSize: 11.5 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                        <span style={{ color: '#686868' }}>Estimated Procurement Cost:</span>
                        <strong style={{ color: '#171717' }}>{cost}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#686868' }}>Calibration Cert / Period:</span>
                        <span style={{ color: '#4F7D5A', fontWeight: 600 }}>{calCert} (12 Mo)</span>
                      </div>
                    </div>

                    <p style={{ fontSize: 11.5, color: '#686868', margin: 0 }}>Supports {count} mapped standard clause requirements for {selectedStandard.isNumber}.</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══════════════ TAB 4: IN-HOUSE VS EXTERNAL DECISION TREE ══════════════ */}
        {activeTab === 'decision_tree' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#171717', margin: '0 0 4px' }}>In-House Facility vs External NABL Lab Decision Tree</h3>
              <p style={{ fontSize: 12.5, color: '#686868', margin: 0 }}>
                Determines whether a required test can be conducted using in-house STI equipment or requires an accredited external testing facility.
              </p>
            </div>

            <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: '10px 14px', fontSize: 12, fontWeight: 800, color: '#171717' }}>
                  Clause Requirement
                </div>
                <ArrowRight style={{ width: 14, height: 14, color: '#F28C52' }} />
                <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: '10px 14px', fontSize: 12, fontWeight: 800, color: '#171717' }}>
                  In-House Equipment Available?
                </div>
                <ArrowRight style={{ width: 14, height: 14, color: '#F28C52' }} />
                <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: '10px 14px', fontSize: 12, fontWeight: 800, color: '#171717' }}>
                  Calibration Valid?
                </div>
                <ArrowRight style={{ width: 14, height: 14, color: '#F28C52' }} />
                <div style={{ background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 6, padding: '10px 14px', fontSize: 12, fontWeight: 800, color: '#E9783F' }}>
                  Result: IN-HOUSE PERMITTED
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ TAB 5: TEST REPORT AUDITOR & GAP DETECTOR ══════════════ */}
        {activeTab === 'report_auditor' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#171717', margin: '0 0 4px' }}>Test Report Auditor &amp; Missing Test Gap Detector</h3>
              <p style={{ fontSize: 12.5, color: '#686868', margin: 0 }}>
                Upload an existing test report to cross-examine parameters against standard requirements and detect missing test gaps.
              </p>
            </div>

            <div style={{ background: '#FFFCF8', border: '2px dashed #E8E2DC', borderRadius: 8, padding: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <Upload style={{ width: 32, height: 32, color: '#F28C52' }} />
              <div>
                <h4 style={{ fontSize: 14, fontWeight: 800, color: '#171717', margin: 0 }}>Upload Laboratory Test Report PDF</h4>
                <p style={{ fontSize: 12, color: '#686868', margin: '2px 0 0' }}>Extracts test values, compares against limits, and highlights missing mandatory clauses.</p>
              </div>

              <input type="file" accept=".pdf" onChange={handleReportUpload} style={{ display: 'none' }} id="report-upload" />
              <label htmlFor="report-upload" style={{ background: '#FFF1E8', color: '#E9783F', border: '1px solid #F4C4A5', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Upload &amp; Audit Test Report
              </label>

              {auditedReportName && (
                <span style={{ fontSize: 12, fontWeight: 700, color: '#4F7D5A', background: '#EBF4EE', padding: '4px 10px', borderRadius: 4 }}>
                  Audited File: {auditedReportName} — 3 Mapped Clauses Verified
                </span>
              )}
            </div>
          </div>
        )}

      </div>

      {/* ══════════════ 4. EXECUTIVE SUMMARY & CROSS-MODULE ACTIONS ══════════════ */}
      <div style={{ background: '#171717', color: '#FFFFFF', borderRadius: 12, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <span style={{ fontSize: 11, fontWeight: 800, color: '#F28C52', textTransform: 'uppercase', letterSpacing: '0.04em' }}>LABORATORY TESTING DIRECTIVES</span>
          <h3 style={{ fontSize: 17, fontWeight: 800, margin: '4px 0 0', color: '#FFFFFF' }}>
            {selectedStandard.isNumber} Laboratory Testing Action Plan
          </h3>
        </div>

        <p style={{ fontSize: 13, color: '#A1A1AA', margin: 0, lineHeight: 1.6 }}>
          All mapped requirements for <strong>{selectedStandard.isNumber}</strong> require calibrated STI testing equipment. Ensure high-voltage dielectric breakdown testers are within valid calibration windows prior to factory inspection.
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid #27272A' }}>
          <Link href="/citations" style={{ background: '#F28C52', color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '9px 16px', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FileText style={{ width: 14, height: 14 }} />
            <span>Open Clause Citations</span>
          </Link>

          <Link href="/evidence-verifier" style={{ background: '#27272A', color: '#FFFFFF', border: '1px solid #3F3F46', borderRadius: 6, padding: '9px 16px', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Shield style={{ width: 14, height: 14, color: '#F28C52' }} />
            <span>Verify Test Report Evidence</span>
          </Link>

          <Link href="/checklist" style={{ background: '#27272A', color: '#FFFFFF', border: '1px solid #3F3F46', borderRadius: 6, padding: '9px 16px', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <CheckSquare style={{ width: 14, height: 14, color: '#F28C52' }} />
            <span>Compliance Checklist</span>
          </Link>

          <Link href="/lab-finder" style={{ background: '#27272A', color: '#FFFFFF', border: '1px solid #3F3F46', borderRadius: 6, padding: '9px 16px', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Building2 style={{ width: 14, height: 14, color: '#F28C52' }} />
            <span>Match NABL Labs</span>
          </Link>
        </div>
      </div>

    </div>
  );
}
