'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { CheckSquare, Printer, CheckCircle2, ArrowRight, ShieldCheck, Download, Sparkles } from 'lucide-react';
import { getDynamicStandards } from '@/lib/data/bisDatabase';
import { saveChecklistProgressToFirebase, fetchChecklistProgressFromFirebase } from '@/lib/firebase';
import { ComplianceCheckItem, BISStandard } from '@/lib/types';

export default function ChecklistPage() {
  const [standards, setStandards] = useState<BISStandard[]>(() => getDynamicStandards());
  const [selectedStandardId, setSelectedStandardId] = useState<string>('is-302-2-3');
  const [items, setItems] = useState<ComplianceCheckItem[]>([]);

  const loadStandardsAndChecklist = async () => {
    const list = getDynamicStandards();
    setStandards(list);
    if (list.length > 0) {
      const active = selectedStandardId ? list.find(s => s.id === selectedStandardId) || list[0] : list[0];
      setSelectedStandardId(active.id);
      
      // Try to load saved checklist from Firebase
      const saved = await fetchChecklistProgressFromFirebase(active.id);
      if (saved && saved.items && saved.items.length > 0) {
        setItems(saved.items);
      } else {
        loadItemsForStandard(active);
      }
    }
  };

  useEffect(() => {
    loadStandardsAndChecklist();

    const handleUpdate = () => {
      loadStandardsAndChecklist();
    };

    window.addEventListener('bis_standards_updated', handleUpdate);
    return () => window.removeEventListener('bis_standards_updated', handleUpdate);
  }, []);

  const loadItemsForStandard = (std: BISStandard) => {
    const keyReqs = std.keyRequirements || [];
    const docs = std.requiredDocuments || [];
    const testParams = std.testingParameters || [];

    const newItems: ComplianceCheckItem[] = [
      ...keyReqs.map((req, idx) => ({
        id: `req-${idx}`,
        standardId: std.id,
        title: req,
        category: "Technical & Safety Requirement",
        mandatory: true,
        status: (idx === 0 ? 'passed' : 'pending') as 'passed' | 'pending' | 'failed' | 'not_applicable',
        notes: `Statutory requirement under ${std.isNumber}`
      })),
      ...docs.map((doc, idx) => ({
        id: `doc-${idx}`,
        standardId: std.id,
        title: `Documentation: ${doc}`,
        category: "Factory Documentation & QA Plan",
        mandatory: true,
        status: (idx === 0 ? 'passed' : 'pending') as 'passed' | 'pending' | 'failed' | 'not_applicable',
        notes: `Required for BIS inspection audit under ${std.applicableScheme}`
      })),
      ...testParams.map((param, idx) => ({
        id: `test-${idx}`,
        standardId: std.id,
        title: `Laboratory Test: ${param}`,
        category: "Laboratory Testing Validation",
        mandatory: true,
        status: 'pending' as 'passed' | 'pending' | 'failed' | 'not_applicable',
        notes: `Must be tested at NABL/BIS accredited laboratory`
      }))
    ];

    if (newItems.length === 0) {
      newItems.push({
        id: 'req-0',
        standardId: std.id,
        title: std.title,
        category: 'General Conformity',
        mandatory: true,
        status: 'pending',
        notes: std.scope
      });
    }

    setItems(newItems);
  };

  const handleStandardChange = async (id: string) => {
    setSelectedStandardId(id);
    const std = standards.find(s => s.id === id);
    if (std) {
      const saved = await fetchChecklistProgressFromFirebase(id);
      if (saved && saved.items && saved.items.length > 0) {
        setItems(saved.items);
      } else {
        loadItemsForStandard(std);
      }
    }
  };

  const handleStatusToggle = (id: string, newStatus: 'passed' | 'pending' | 'failed') => {
    setItems(prev => {
      const updated = prev.map(item => item.id === id ? { ...item, status: newStatus } : item);
      const passed = updated.filter(i => i.status === 'passed').length;
      const progress = updated.length > 0 ? Math.round((passed / updated.length) * 100) : 0;
      saveChecklistProgressToFirebase(selectedStandardId, updated, progress);
      return updated;
    });
  };

  const selectedStandard = standards.find(s => s.id === selectedStandardId) || standards[0];
  const passedCount = items.filter(i => i.status === 'passed').length;
  const progressPercent = items.length > 0 ? Math.round((passedCount / items.length) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%' }}>

      {/* Header Banner */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#171717', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <CheckSquare style={{ width: 24, height: 24, color: '#F28C52' }} />
            <span>Interactive Compliance Checklist Generator</span>
          </h1>
          <p style={{ fontSize: 13, color: '#686868', margin: 0, maxWidth: 760 }}>
            Generate factory readiness audit checklists across all {standards.length} indexed BIS standards.
          </p>
        </div>

        <button
          onClick={() => window.print()}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: '#FFFFFF', border: '1px solid #E8E2DC', color: '#171717',
            padding: '9px 16px', borderRadius: 6, fontSize: 13, fontWeight: 700, cursor: 'pointer'
          }}
        >
          <Printer style={{ width: 15, height: 15 }} />
          <span>Print Checklist</span>
        </button>
      </div>

      {/* Standard Selector & Progress Header */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 20, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ flex: 1, minWidth: 260 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>
            Select Indian Standard
          </label>
          <select
            value={selectedStandardId}
            onChange={(e) => handleStandardChange(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', background: '#FFFCF8',
              border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 13, color: '#242424', outline: 'none'
            }}
          >
            {standards.map((s) => (
              <option key={s.id} value={s.id}>{s.isNumber} - {s.title.slice(0, 45)}...</option>
            ))}
          </select>
        </div>

        {selectedStandard && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: '#686868', fontWeight: 600 }}>Audit Progress</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: progressPercent === 100 ? '#4F7D5A' : '#F28C52' }}>
                {passedCount} / {items.length} ({progressPercent}%)
              </div>
            </div>

            <div style={{ width: 120, height: 8, background: '#E8E2DC', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: `${progressPercent}%`, height: '100%', background: '#F28C52', borderRadius: 4, transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )}
      </div>

      {/* Checklist Items Table */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
                padding: 16, border: '1px solid #E8E2DC', borderRadius: 8,
                background: item.status === 'passed' ? '#F8FCF9' : '#FFFCF8',
                transition: 'all 0.15s ease'
              }}
            >
              <div style={{ flex: 1, paddingRight: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#FFF1E8', color: '#E9783F', border: '1px solid #F4C4A5', borderRadius: 4, padding: '1px 6px' }}>
                    {item.category}
                  </span>
                  {item.mandatory && (
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: '#B85C52', background: '#FDF2F0', borderRadius: 4, padding: '1px 6px' }}>
                      Mandatory
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#171717', marginBottom: 2 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: '#686868' }}>{item.notes}</div>
              </div>

              {/* Status Action Buttons */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => handleStatusToggle(item.id, 'passed')}
                  style={{
                    background: item.status === 'passed' ? '#4F7D5A' : '#FFFFFF',
                    color: item.status === 'passed' ? '#FFFFFF' : '#4F7D5A',
                    border: '1px solid #B5D5BF', borderRadius: 4, padding: '6px 12px',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  ✓ Passed
                </button>

                <button
                  onClick={() => handleStatusToggle(item.id, 'pending')}
                  style={{
                    background: item.status === 'pending' ? '#F28C52' : '#FFFFFF',
                    color: item.status === 'pending' ? '#FFFFFF' : '#686868',
                    border: '1px solid #E8E2DC', borderRadius: 4, padding: '6px 12px',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  Pending
                </button>

                <button
                  onClick={() => handleStatusToggle(item.id, 'failed')}
                  style={{
                    background: item.status === 'failed' ? '#B85C52' : '#FFFFFF',
                    color: item.status === 'failed' ? '#FFFFFF' : '#B85C52',
                    border: '1px solid #F8D7DA', borderRadius: 4, padding: '6px 12px',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer'
                  }}
                >
                  ✕ Gap
                </button>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
