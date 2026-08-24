'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Calendar, Clock, CheckCircle2, ArrowRight, Shield, Download, 
  Building2, ChevronRight, Layers, FileText, Sparkles, Rocket
} from 'lucide-react';
import { getTimelineMilestones } from '@/lib/data/bisDatabase';

export default function ComplianceTimelinePage() {
  const milestones = getTimelineMilestones();
  const [scheme, setScheme] = useState<string>('Scheme-I (ISI Mark)');
  const [unitType, setUnitType] = useState<string>('Domestic MSME Unit');
  
  // Interactive Start Date Picker State (Defaults to Today)
  const [startDate, setStartDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  const totalDays = milestones.reduce((sum, m) => sum + m.durationDays, 0);

  // Calculate Cumulative Milestone Dates
  const baseStart = new Date(startDate || Date.now());
  let runningDays = 0;

  const milestonesWithDates = milestones.map((m) => {
    const stageStart = new Date(baseStart.getTime() + runningDays * 24 * 60 * 60 * 1000);
    runningDays += m.durationDays;
    const stageEnd = new Date(baseStart.getTime() + runningDays * 24 * 60 * 60 * 1000);

    return {
      ...m,
      formattedStart: stageStart.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
      formattedEnd: stageEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    };
  });

  const finalLaunchDate = new Date(baseStart.getTime() + runningDays * 24 * 60 * 60 * 1000);
  const formattedFinalLaunchDate = finalLaunchDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
      
      {/* Top Banner */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ background: '#FFF1E8', color: '#E9783F', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 800, textTransform: 'uppercase' }}>
              BIS License SLA &amp; Roadmap
            </span>
            <span style={{ color: '#686868', fontSize: 12, fontWeight: 600 }}>Interactive Milestone &amp; Launch Date Engine</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#171717', margin: '6px 0 2px' }}>
            BIS Compliance Roadmap &amp; Market Launch Calculator
          </h1>
          <p style={{ fontSize: 13, color: '#686868', margin: 0, maxWidth: 760 }}>
            Generate customized step-by-step milestone timelines for your ISI mark or CRS application. Pick your project start date to compute projected milestone deadlines and final market launch date.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/testing-mapper" style={{ background: '#F28C52', color: '#FFFFFF', padding: '8px 16px', borderRadius: 6, fontSize: 12.5, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>Testing Mapper</span>
            <ChevronRight style={{ width: 14, height: 14 }} />
          </Link>
        </div>
      </div>

      {/* ══════════════ 1. CONTROL BAR & INTERACTIVE DATE PICKER ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
          
          {/* Interactive Start Date Picker */}
          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase', marginBottom: 4 }}>
              📅 Application / Project Start Date
            </label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', background: '#FFFCF8', border: '1.5px solid #F28C52',
                borderRadius: 6, fontSize: 13, fontWeight: 700, color: '#171717', outline: 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: '#686868', textTransform: 'uppercase', marginBottom: 4 }}>
              BIS Certification Scheme
            </label>
            <select 
              value={scheme} 
              onChange={(e) => setScheme(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 12.5, color: '#242424', outline: 'none' }}
            >
              <option value="Scheme-I (ISI Mark)">Scheme-I (ISI Mark Standard)</option>
              <option value="CRS (Compulsory Registration)">CRS Electronics Registration</option>
              <option value="FMCS (Foreign Manufacturer)">FMCS Foreign Units</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: '#686868', textTransform: 'uppercase', marginBottom: 4 }}>
              Manufacturing Scale
            </label>
            <select 
              value={unitType} 
              onChange={(e) => setUnitType(e.target.value)}
              style={{ width: '100%', padding: '8px 12px', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 12.5, color: '#242424', outline: 'none' }}
            >
              <option value="Domestic MSME Unit">Domestic MSME Unit (Priority Fast-Track)</option>
              <option value="Large Manufacturing Plant">Large Manufacturing Plant</option>
              <option value="Overseas Unit">Overseas Factory (FMCS)</option>
            </select>
          </div>

        </div>

        {/* Calculated Launch Date KPI Banner */}
        <div style={{ background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 8, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#F28C52', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Rocket style={{ width: 22, height: 22 }} />
            </div>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>
                CALCULATED COMMERCIAL MARKET LAUNCH DATE
              </span>
              <div style={{ fontSize: 19, fontWeight: 900, color: '#171717' }}>
                {formattedFinalLaunchDate}
              </div>
              <span style={{ fontSize: 11.5, color: '#686868' }}>
                Total Duration: <strong>{totalDays} Calendar Days (~{Math.round(totalDays/30 * 10)/10} Months)</strong> from selected start date
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => {
                const d = new Date();
                setStartDate(d.toISOString().split('T')[0]);
              }}
              style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 4, padding: '4px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
            >
              Today
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() + 7);
                setStartDate(d.toISOString().split('T')[0]);
              }}
              style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 4, padding: '4px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
            >
              +1 Week
            </button>
            <button
              onClick={() => {
                const d = new Date();
                d.setMonth(d.getMonth() + 1, 1);
                setStartDate(d.toISOString().split('T')[0]);
              }}
              style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 4, padding: '4px 10px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer' }}
            >
              1st Next Month
            </button>
          </div>
        </div>

      </div>

      {/* ══════════════ 2. MILESTONE ROADMAP WITH CALCULATED DATES ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E8E2DC', paddingBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#171717', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar style={{ width: 16, height: 16, color: '#F28C52' }} />
            <span>Step-by-Step License Acquisition Roadmap (Dates Grounded)</span>
          </h2>
          <button
            onClick={() => window.print()}
            style={{ background: '#F28C52', color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Download style={{ width: 13, height: 13 }} />
            <span>Download Timeline PDF</span>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
          {milestonesWithDates.map((m) => (
            <div key={m.stage} style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              
              {/* Step circle */}
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F28C52', color: '#FFFFFF', fontWeight: 800, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {m.stage}
              </div>

              {/* Card content */}
              <div style={{ flex: 1, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#171717', margin: 0 }}>{m.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#4F7D5A', background: '#EBF4EE', padding: '2px 8px', borderRadius: 4 }}>
                      📅 {m.formattedStart} &rarr; {m.formattedEnd}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#E9783F', background: '#FFF1E8', padding: '2px 8px', borderRadius: 4 }}>
                      SLA: {m.durationDays} Days
                    </span>
                  </div>
                </div>

                <p style={{ fontSize: 12.5, color: '#524F4D', margin: 0, lineHeight: 1.5 }}>
                  {m.description}
                </p>

                <div style={{ borderTop: '1px solid #E8E2DC', paddingTop: 8 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', color: '#686868', display: 'block', marginBottom: 4 }}>
                    Required Deliverables:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {m.deliverables.map((del: string, i: number) => (
                      <span key={i} style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, color: '#242424', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 style={{ width: 11, height: 11, color: '#4F7D5A' }} />
                        <span>{del}</span>
                      </span>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
