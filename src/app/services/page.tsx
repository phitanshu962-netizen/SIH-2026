'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  BookOpen, Clock, DollarSign, Building2, ChevronRight, ArrowRight, 
  ShieldCheck, ExternalLink, Calculator, Percent, Sparkles, CheckCircle2,
  TrendingDown, FileText, Info
} from 'lucide-react';
import { BIS_SERVICES, getDynamicStandards } from '@/lib/data/bisDatabase';
import { BISStandard } from '@/lib/types';

type EnterpriseScale = 'micro' | 'small' | 'startup' | 'women' | 'medium' | 'large' | 'foreign';

export default function ServicesPage() {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(BIS_SERVICES[0].id);
  const [standards, setStandards] = useState<BISStandard[]>(() => getDynamicStandards());

  // Fee Calculator State
  const [scale, setScale] = useState<EnterpriseScale>('micro');
  const [annualUnits, setAnnualUnits] = useState<number>(25000);
  const [estimatedTurnoverLakhs, setEstimatedTurnoverLakhs] = useState<number>(75);
  const [manDays, setManDays] = useState<number>(2);

  useEffect(() => {
    setStandards(getDynamicStandards());

    const handleUpdate = () => {
      setStandards(getDynamicStandards());
    };

    window.addEventListener('bis_standards_updated', handleUpdate);
    return () => window.removeEventListener('bis_standards_updated', handleUpdate);
  }, []);

  const activeService = BIS_SERVICES.find(s => s.id === selectedServiceId) || BIS_SERVICES[0];

  const standardsUnderScheme = standards.filter(s => {
    if (activeService.code === 'Scheme-I' && s.applicableScheme.includes('Scheme-I')) return true;
    if (activeService.code === 'CRS' && s.applicableScheme.includes('CRS')) return true;
    if (activeService.code === 'FMCS' && s.applicableScheme.includes('FMCS')) return true;
    if (activeService.code === 'Hallmarking' && s.applicableScheme.includes('Hallmarking')) return true;
    return false;
  });

  // Calculate Fees with 50% Concession for Micro/Small/Startup/Women
  const isConcessionEligible = ['micro', 'small', 'startup', 'women'].includes(scale);
  const concessionMultiplier = isConcessionEligible ? 0.5 : 1.0;

  const baseApplicationFee = activeService.code === 'FMCS' ? 1000 : activeService.code === 'CRS' ? 1000 : 1000;
  const baseProcessingFee = activeService.code === 'CRS' ? 5000 : activeService.code === 'Hallmarking' ? 3000 : 7000;
  const baseInspectionFeePerDay = 7000;
  const baseLabTestingEst = activeService.code === 'CRS' ? 35000 : activeService.code === 'Hallmarking' ? 5000 : 25000;
  
  // Annual Marking Fee (Production Volume Based)
  const baseMarkingFee = activeService.code === 'CRS' 
    ? 0 
    : activeService.code === 'Hallmarking'
    ? Math.max(10000, Math.round(estimatedTurnoverLakhs * 250))
    : Math.max(30000, Math.min(250000, Math.round(annualUnits * 1.5 + 30000)));

  const applicationFee = Math.round(baseApplicationFee * concessionMultiplier);
  const processingFee = Math.round(baseProcessingFee * concessionMultiplier);
  const inspectionTotal = activeService.code === 'CRS' ? 0 : Math.round(manDays * baseInspectionFeePerDay * (isConcessionEligible ? 0.8 : 1.0));
  const labTestingEstimate = baseLabTestingEst;
  const markingFee = Math.round(baseMarkingFee * concessionMultiplier);

  const subTotalBeforeGst = applicationFee + processingFee + inspectionTotal + markingFee;
  const gstAmount = Math.round(subTotalBeforeGst * 0.18);
  const totalGovtFee = subTotalBeforeGst + gstAmount;

  const standardFullFee = (baseApplicationFee + baseProcessingFee + (activeService.code === 'CRS' ? 0 : manDays * baseInspectionFeePerDay) + baseMarkingFee);
  const fullFeeWithGst = Math.round(standardFullFee * 1.18);
  const totalSavings = isConcessionEligible ? Math.max(0, fullFeeWithGst - totalGovtFee) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%' }}>
      
      {/* Header Banner */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#171717', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen style={{ width: 24, height: 24, color: '#F28C52' }} />
            <span>BIS Statutory Certification Schemes &amp; Fee Logic</span>
          </h1>
          <p style={{ fontSize: 13, color: '#686868', margin: 0, maxWidth: 760 }}>
            Explore statutory certification schemes, legal procedures, official SLAs, live dynamic standards, and compute exact government fees with MSME 50% concessions.
          </p>
        </div>
      </div>

      {/* Scheme Selection Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
        {BIS_SERVICES.map((srv) => (
          <button
            key={srv.id}
            onClick={() => setSelectedServiceId(srv.id)}
            style={{
              padding: 16, borderRadius: 8, textAlign: 'left',
              background: selectedServiceId === srv.id ? '#FFF1E8' : '#FFFFFF',
              border: selectedServiceId === srv.id ? '1px solid #F4C4A5' : '1px solid #E8E2DC',
              color: selectedServiceId === srv.id ? '#E9783F' : '#171717',
              cursor: 'pointer', transition: 'all 0.15s ease'
            }}
          >
            <span style={{ fontSize: 10.5, fontWeight: 800, background: '#F28C52', color: '#FFFFFF', padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
              {srv.code}
            </span>
            <h3 style={{ fontSize: 14.5, fontWeight: 800, color: '#171717', margin: '8px 0 4px' }}>{srv.name}</h3>
            <p style={{ fontSize: 12, color: '#686868', margin: 0, lineHeight: 1.4 }}>{srv.description}</p>
          </button>
        ))}
      </div>

      {/* ══════════════ 1. INTERACTIVE STATUTORY FEE CALCULATOR ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E8E2DC', paddingBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calculator style={{ width: 20, height: 20, color: '#F28C52' }} />
            <div>
              <h2 style={{ fontSize: 17, fontWeight: 800, color: '#171717', margin: 0 }}>
                Interactive Government Statutory Fee Calculator
              </h2>
              <span style={{ fontSize: 12, color: '#686868' }}>
                Computes Application, Processing, Inspection &amp; Marking Fees for {activeService.name}
              </span>
            </div>
          </div>

          {isConcessionEligible && (
            <span style={{ fontSize: 11.5, fontWeight: 800, background: '#EBF4EE', color: '#4F7D5A', border: '1px solid #B5D5BF', padding: '4px 10px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Percent style={{ width: 13, height: 13 }} />
              50% Statutory Fee Concession Active
            </span>
          )}
        </div>

        {/* Inputs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>
              Enterprise Scale &amp; Concession Category
            </label>
            <select
              value={scale}
              onChange={(e) => setScale(e.target.value as EnterpriseScale)}
              style={{ width: '100%', padding: '9px 12px', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 12.5, color: '#242424', outline: 'none' }}
            >
              <option value="micro">Micro Enterprise (50% Concession • Udyam)</option>
              <option value="small">Small Enterprise (50% Concession • Udyam)</option>
              <option value="startup">DPIIT Recognized Startup (50% Concession)</option>
              <option value="women">Women Entrepreneur Enterprise (50% Concession)</option>
              <option value="medium">Medium Enterprise (Standard Fees)</option>
              <option value="large">Large Scale Industry (Standard Fees)</option>
              <option value="foreign">Foreign Factory / FMCS Unit</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>
              Estimated Annual Production (Units / Annum)
            </label>
            <input
              type="number"
              value={annualUnits}
              onChange={(e) => setAnnualUnits(Math.max(100, Number(e.target.value)))}
              style={{ width: '100%', padding: '9px 12px', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 12.5, color: '#242424', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>
              Projected Turnover (₹ Lakhs)
            </label>
            <input
              type="number"
              value={estimatedTurnoverLakhs}
              onChange={(e) => setEstimatedTurnoverLakhs(Math.max(1, Number(e.target.value)))}
              style={{ width: '100%', padding: '9px 12px', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 12.5, color: '#242424', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>
              Factory Audit Man-Days Required
            </label>
            <select
              value={manDays}
              onChange={(e) => setManDays(Number(e.target.value))}
              style={{ width: '100%', padding: '9px 12px', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 12.5, color: '#242424', outline: 'none' }}
            >
              <option value="1">1 Auditor Day (Simple Unit)</option>
              <option value="2">2 Auditor Days (Standard Factory)</option>
              <option value="3">3 Auditor Days (Large Integrated Plant)</option>
            </select>
          </div>

        </div>

        {/* Calculated Itemized Breakdown */}
        <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 18 }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: '#171717', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
            Statutory Fee Itemization Breakdown (First Year)
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
            
            <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: 10 }}>
              <div style={{ fontSize: 11, color: '#686868' }}>Application Fee:</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#171717' }}>₹{applicationFee.toLocaleString()}</div>
              {isConcessionEligible && <div style={{ fontSize: 10, color: '#4F7D5A', fontWeight: 700 }}>50% Concession applied</div>}
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: 10 }}>
              <div style={{ fontSize: 11, color: '#686868' }}>Processing &amp; Scrutiny Fee:</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#171717' }}>₹{processingFee.toLocaleString()}</div>
              {isConcessionEligible && <div style={{ fontSize: 10, color: '#4F7D5A', fontWeight: 700 }}>50% Concession applied</div>}
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: 10 }}>
              <div style={{ fontSize: 11, color: '#686868' }}>Factory Audit Charges ({manDays} days):</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#171717' }}>₹{inspectionTotal.toLocaleString()}</div>
              <div style={{ fontSize: 10, color: '#686868' }}>@ ₹7,000 / auditor day</div>
            </div>

            <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: 10 }}>
              <div style={{ fontSize: 11, color: '#686868' }}>Annual Marking Fee:</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#171717' }}>₹{markingFee.toLocaleString()}</div>
              {isConcessionEligible && <div style={{ fontSize: 10, color: '#4F7D5A', fontWeight: 700 }}>50% Concession applied</div>}
            </div>

          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E8E2DC', paddingTop: 12, flexWrap: 'wrap', gap: 10 }}>
            <div>
              <span style={{ fontSize: 12, color: '#686868' }}>Subtotal (Excl. GST): ₹{subTotalBeforeGst.toLocaleString()} • GST @ 18%: ₹{gstAmount.toLocaleString()}</span>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#E9783F', marginTop: 2 }}>
                Total Government Fee Payable: ₹{totalGovtFee.toLocaleString()}
              </div>
            </div>

            {totalSavings > 0 && (
              <div style={{ background: '#EBF4EE', border: '1px solid #B5D5BF', borderRadius: 6, padding: '8px 14px', textAlign: 'right' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#4F7D5A' }}>Total MSME Savings:</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#4F7D5A' }}>₹{totalSavings.toLocaleString()} Saved</div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Selected Service Detailed Workflow View */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #E8E2DC', paddingBottom: 16, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#E9783F', background: '#FFF1E8', border: '1px solid #F4C4A5', padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase' }}>
              {activeService.code} Statutory Overview
            </span>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#171717', margin: '8px 0 4px' }}>{activeService.name}</h2>
            <p style={{ fontSize: 13, color: '#686868', margin: 0, maxWidth: 680 }}>{activeService.description}</p>
          </div>

          <div style={{ display: 'flex', gap: 14, background: '#FFFCF8', border: '1px solid #E8E2DC', padding: '10px 16px', borderRadius: 8, fontSize: 12.5 }}>
            <div>
              <div style={{ color: '#686868' }}>Approval SLA:</div>
              <strong style={{ color: '#171717' }}>{activeService.typicalTimeline}</strong>
            </div>
            <div style={{ borderLeft: '1px solid #E8E2DC', paddingLeft: 14 }}>
              <div style={{ color: '#686868' }}>Eligibility:</div>
              <strong style={{ color: '#4F7D5A' }}>{activeService.target}</strong>
            </div>
          </div>
        </div>

        {/* Step-by-Step Interactive Workflow */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#171717', marginBottom: 12 }}>
            Statutory Certification Workflow
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeService.steps.map((step, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#F28C52', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#171717' }}>
                  {step}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dynamic Ingested Standards Under This Scheme */}
        <div style={{ borderTop: '1px solid #E8E2DC', paddingTop: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: '#171717', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldCheck style={{ width: 16, height: 16, color: '#F28C52' }} />
            <span>Indexed Standards Under {activeService.name} ({standardsUnderScheme.length} Standards)</span>
          </h3>

          {standardsUnderScheme.length === 0 ? (
            <div style={{ padding: 14, background: '#F8F6F2', borderRadius: 6, fontSize: 12.5, color: '#686868' }}>
              No custom uploaded standards currently mapped to this scheme. Upload a {activeService.code} document in the Admin Panel.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
              {standardsUnderScheme.map((std) => (
                <div key={std.id} style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#171717' }}>{std.isNumber}</div>
                    <div style={{ fontSize: 11.5, color: '#686868' }}>{std.title.slice(0, 35)}...</div>
                  </div>
                  <Link
                    href={`/gap-analyzer`}
                    style={{ fontSize: 11.5, fontWeight: 700, color: '#E9783F', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}
                  >
                    <span>Audit Gap</span>
                    <ChevronRight style={{ width: 13, height: 13 }} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fee Structure Box */}
        <div style={{ background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <DollarSign style={{ width: 20, height: 20, color: '#E9783F', flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>Official Statutory Guidelines</div>
            <p style={{ fontSize: 13, color: '#171717', fontWeight: 600, margin: '4px 0 0' }}>{activeService.feeStructure}</p>
          </div>
        </div>

      </div>

    </div>
  );
}
