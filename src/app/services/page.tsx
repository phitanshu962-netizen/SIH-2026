'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BookOpen, Clock, DollarSign, Building2, ChevronRight, ArrowRight, ShieldCheck, ExternalLink } from 'lucide-react';
import { BIS_SERVICES, getDynamicStandards } from '@/lib/data/bisDatabase';
import { BISStandard } from '@/lib/types';

export default function ServicesPage() {
  const [selectedServiceId, setSelectedServiceId] = useState<string>(BIS_SERVICES[0].id);
  const [standards, setStandards] = useState<BISStandard[]>(() => getDynamicStandards());

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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%' }}>
      
      {/* Header Banner */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#171717', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen style={{ width: 24, height: 24, color: '#F28C52' }} />
            <span>BIS Statutory Certification Schemes &amp; Workflows</span>
          </h1>
          <p style={{ fontSize: 13, color: '#686868', margin: 0, maxWidth: 760 }}>
            Explore statutory certification schemes, legal procedures, fees, SLAs, and browse all linked standards under each scheme.
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
            <div style={{ fontSize: 12, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>Government Statutory Fee Structure</div>
            <p style={{ fontSize: 13, color: '#171717', fontWeight: 600, margin: '4px 0 0' }}>{activeService.feeStructure}</p>
          </div>
        </div>

      </div>

    </div>
  );
}
