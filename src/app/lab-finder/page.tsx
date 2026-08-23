'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  MapPin, Search, Phone, Mail, CheckCircle2, Clock, Send
} from 'lucide-react';
import { getTestingLabs } from '@/lib/data/bisDatabase';
import { saveLabInquiryToFirebase } from '@/lib/firebase';

export default function LabFinderPage() {
  const labs = getTestingLabs();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [inquirySent, setInquirySent] = useState<string | null>(null);

  const filteredLabs = labs.filter(lab => {
    const matchesSearch = lab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lab.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lab.standardsCovered.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesState = selectedState === 'all' || lab.state === selectedState;
    return matchesSearch && matchesState;
  });

  const handleSendInquiry = (labId: string) => {
    setInquirySent(labId);
    const targetLab = labs.find(l => l.id === labId);
    saveLabInquiryToFirebase({
      labId,
      labName: targetLab?.name || labId,
      location: targetLab?.location,
      standardsCovered: targetLab?.standardsCovered,
      inquiryType: 'sample_testing_quotation'
    });
    setTimeout(() => setInquirySent(null), 3000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%' }}>

      {/* Header Banner */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#171717', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <MapPin style={{ width: 24, height: 24, color: '#F28C52' }} />
          <span>BIS &amp; NABL Recognized Laboratory Directory</span>
        </h1>
        <p style={{ fontSize: 13, color: '#686868', margin: 0, maxWidth: 760 }}>
          Locate officially recognized testing laboratories across India. Filter by standard, state, turn-around SLA, and request testing quotes.
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 18, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search style={{ width: 16, height: 16, color: '#F28C52', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lab name, standard (e.g. IS 302), or city..."
            style={{
              width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
              background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 13, color: '#242424',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        <select 
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#242424', outline: 'none' }}
        >
          <option value="all">All States / Regions</option>
          <option value="Uttar Pradesh">Uttar Pradesh</option>
          <option value="Karnataka">Karnataka</option>
          <option value="Haryana">Haryana</option>
          <option value="West Bengal">West Bengal</option>
        </select>
      </div>

      {/* Labs List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {filteredLabs.map(lab => (
          <div key={lab.id} style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 22, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 16 }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#FFF1E8', color: '#E9783F', border: '1px solid #F4C4A5', borderRadius: 4, padding: '2px 7px' }}>
                  {lab.labType}
                </span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#4F7D5A', background: '#EBF4EE', border: '1px solid #B5D5BF', borderRadius: 4, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 style={{ width: 12, height: 12 }} /> BIS Recognized
                </span>
              </div>

              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#171717', margin: 0 }}>{lab.name}</h3>

              <div style={{ fontSize: 12.5, color: '#686868', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin style={{ width: 14, height: 14, color: '#F28C52' }} />
                <span>{lab.location}, {lab.state}</span>
              </div>

              <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: 12, fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: '#171717', marginBottom: 4 }}>Covered IS Standards:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {lab.standardsCovered.map((std: string, idx: number) => (
                    <span key={idx} style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 600, color: '#242424' }}>
                      {std}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#686868' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock style={{ width: 13, height: 13, color: '#F28C52' }} /> SLA: {lab.avgTurnaroundDays} days
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Phone style={{ width: 13, height: 13, color: '#F28C52' }} /> {lab.contactPhone}
                </span>
              </div>
            </div>

            <button
              onClick={() => handleSendInquiry(lab.id)}
              style={{
                background: inquirySent === lab.id ? '#EBF4EE' : '#F28C52',
                color: inquirySent === lab.id ? '#4F7D5A' : '#FFFFFF',
                border: inquirySent === lab.id ? '1px solid #B5D5BF' : 'none',
                borderRadius: 6, padding: '10px 16px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6
              }}
            >
              <Send style={{ width: 14, height: 14 }} />
              <span>{inquirySent === lab.id ? 'Inquiry Sent ✓' : 'Request Test Inquiry'}</span>
            </button>

          </div>
        ))}
      </div>

    </div>
  );
}
