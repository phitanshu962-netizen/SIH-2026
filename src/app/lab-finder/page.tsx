'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  MapPin, Search, Phone, Mail, CheckCircle2, Clock, Send, 
  Calendar, FileText, Check, X, Sparkles, Building2, Download
} from 'lucide-react';
import { getTestingLabs, getDynamicStandards } from '@/lib/data/bisDatabase';
import { saveLabInquiryToFirebase } from '@/lib/firebase';

export default function LabFinderPage() {
  const labs = getTestingLabs();
  const standards = getDynamicStandards();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedState, setSelectedState] = useState<string>('all');
  const [inquirySent, setInquirySent] = useState<string | null>(null);

  // Booking / Quote Modal State
  const [activeBookingLab, setActiveBookingLab] = useState<any | null>(null);
  const [bookingStandard, setBookingStandard] = useState<string>('IS 302-2-3');
  const [sampleQuantity, setSampleQuantity] = useState<number>(3);
  const [testType, setTestType] = useState<string>('Complete BIS Type Test Suite');
  const [turnaroundUrgency, setTurnaroundUrgency] = useState<'standard' | 'express' | 'urgent'>('standard');
  const [contactName, setContactName] = useState<string>('');
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [bookingVoucher, setBookingVoucher] = useState<{
    voucherId: string;
    estimatedCost: number;
    labName: string;
    standard: string;
  } | null>(null);

  const filteredLabs = labs.filter(lab => {
    const matchesSearch = lab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lab.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lab.standardsCovered.some((s: string) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesState = selectedState === 'all' || lab.state === selectedState;
    return matchesSearch && matchesState;
  });

  const handleOpenBooking = (lab: any) => {
    setActiveBookingLab(lab);
    setBookingStandard(lab.standardsCovered[0] || 'IS 302-2-3');
    setBookingVoucher(null);
  };

  const handleGenerateQuoteAndBook = () => {
    if (!activeBookingLab) return;
    const baseTestPrice = 28500;
    const urgencyMultiplier = turnaroundUrgency === 'urgent' ? 1.5 : turnaroundUrgency === 'express' ? 1.25 : 1.0;
    const totalEst = Math.round(baseTestPrice * urgencyMultiplier);
    const voucherId = `NABL-BOOK-${Math.floor(100000 + Math.random() * 900000)}`;

    const bookingData = {
      voucherId,
      labId: activeBookingLab.id,
      labName: activeBookingLab.name,
      location: activeBookingLab.location,
      standard: bookingStandard,
      sampleQuantity,
      testType,
      turnaroundUrgency,
      estimatedCost: totalEst,
      contactName: contactName || 'Authorized Manufacturer QA',
      contactEmail: contactEmail || 'qa@factory.in',
      contactPhone: contactPhone || '+91 98765 43210'
    };

    saveLabInquiryToFirebase(bookingData);

    setBookingVoucher({
      voucherId,
      estimatedCost: totalEst,
      labName: activeBookingLab.name,
      standard: bookingStandard
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%' }}>

      {/* Header Banner */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#171717', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <MapPin style={{ width: 24, height: 24, color: '#F28C52' }} />
            <span>BIS &amp; NABL Recognized Laboratory Directory</span>
          </h1>
          <p style={{ fontSize: 13, color: '#686868', margin: 0, maxWidth: 760 }}>
            Locate officially recognized testing laboratories across India. Direct sample dispatch booking, automated instant quote vouchers, and turnaround SLA tracking.
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 18, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search style={{ width: 16, height: 16, color: '#F28C52', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lab name, standard (e.g. IS 302, IS 15298), or city..."
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
              onClick={() => handleOpenBooking(lab)}
              style={{
                background: '#F28C52',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 6, padding: '10px 16px', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: '0 2px 6px rgba(242,140,82,0.25)'
              }}
            >
              <Calendar style={{ width: 14, height: 14 }} />
              <span>Request Test Quote &amp; Book Samples</span>
            </button>

          </div>
        ))}
      </div>

      {/* ══════════════ DIRECT "REQUEST TEST QUOTE / SAMPLE BOOKING" MODAL ══════════════ */}
      {activeBookingLab && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: 16
        }}>
          <div style={{
            background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12,
            maxWidth: 580, width: '100%', maxHeight: '90vh', overflowY: 'auto',
            padding: 24, boxShadow: '0 20px 40px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 16
          }}>
            
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #E8E2DC', paddingBottom: 12 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>
                  LABORATORY DISPATCH &amp; QUOTE BOOKING
                </span>
                <h3 style={{ fontSize: 17, fontWeight: 800, color: '#171717', margin: '2px 0 0' }}>
                  {activeBookingLab.name}
                </h3>
                <div style={{ fontSize: 12, color: '#686868' }}>{activeBookingLab.location}, {activeBookingLab.state}</div>
              </div>
              <button
                onClick={() => setActiveBookingLab(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#686868' }}
              >
                <X style={{ width: 20, height: 20 }} />
              </button>
            </div>

            {bookingVoucher ? (
              /* Success / Voucher Screen */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, textAlign: 'center', padding: '12px 0' }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#EBF4EE', color: '#4F7D5A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                  <Check style={{ width: 24, height: 24 }} />
                </div>
                <div>
                  <h4 style={{ fontSize: 18, fontWeight: 800, color: '#171717', margin: 0 }}>Sample Testing Voucher Confirmed</h4>
                  <p style={{ fontSize: 13, color: '#686868', margin: '4px 0 0' }}>
                    Quotation and dispatch voucher has been recorded in the central database.
                  </p>
                </div>

                <div style={{ background: '#FFFCF8', border: '1.5px dashed #F28C52', borderRadius: 8, padding: 16, textAlign: 'left' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#686868' }}>Booking Voucher ID:</span>
                    <strong style={{ fontSize: 12.5, color: '#E9783F' }}>{bookingVoucher.voucherId}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#686868' }}>Standard:</span>
                    <strong style={{ fontSize: 12.5, color: '#171717' }}>{bookingVoucher.standard}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: '#686868' }}>Estimated Test Quotation:</span>
                    <strong style={{ fontSize: 14, color: '#4F7D5A' }}>₹{bookingVoucher.estimatedCost.toLocaleString()} + GST</strong>
                  </div>
                </div>

                <button
                  onClick={() => setActiveBookingLab(null)}
                  style={{ background: '#F28C52', color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '10px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  Done
                </button>
              </div>
            ) : (
              /* Booking Form */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>
                    Target Indian Standard
                  </label>
                  <select
                    value={bookingStandard}
                    onChange={(e) => setBookingStandard(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 12.5, outline: 'none' }}
                  >
                    {activeBookingLab.standardsCovered.map((s: string, idx: number) => (
                      <option key={idx} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>
                      Sample Quantity
                    </label>
                    <input
                      type="number"
                      value={sampleQuantity}
                      onChange={(e) => setSampleQuantity(Math.max(1, Number(e.target.value)))}
                      style={{ width: '100%', padding: '8px 10px', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 12.5, outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>
                      Turnaround Urgency
                    </label>
                    <select
                      value={turnaroundUrgency}
                      onChange={(e) => setTurnaroundUrgency(e.target.value as any)}
                      style={{ width: '100%', padding: '8px 10px', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 12.5, outline: 'none' }}
                    >
                      <option value="standard">Standard (15 Days)</option>
                      <option value="express">Express Priority (7 Days, +25%)</option>
                      <option value="urgent">Urgent Tatkal (48 Hours, +50%)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>
                    Test Suite Type
                  </label>
                  <select
                    value={testType}
                    onChange={(e) => setTestType(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 12.5, outline: 'none' }}
                  >
                    <option value="Complete BIS Type Test Suite">Complete BIS Type Test Suite (All Clauses)</option>
                    <option value="Safety & Electrical Only">Electrical &amp; Fire Safety Only</option>
                    <option value="STI In-House Verification">Routine Verification Cross-Check</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>Contact Person Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 12.5, outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>Mobile Number</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 12.5, outline: 'none' }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleGenerateQuoteAndBook}
                  style={{
                    background: '#F28C52', color: '#FFFFFF', border: 'none',
                    borderRadius: 6, padding: '11px 20px', fontSize: 13, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    marginTop: 6
                  }}
                >
                  <Sparkles style={{ width: 15, height: 15 }} />
                  <span>Generate Instant Quote &amp; Book Sample Dispatch</span>
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
