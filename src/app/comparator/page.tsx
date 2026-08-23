'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  GitCompare, ArrowRight, Shield, Clock, AlertTriangle, 
  CheckCircle2, PlusCircle, RefreshCcw, Layers, Download, BookOpen
} from 'lucide-react';
import { getStandardComparisons, getDynamicStandards } from '@/lib/data/bisDatabase';
import { saveStandardComparisonToFirebase, fetchStandardComparisonsFromFirebase } from '@/lib/firebase';
import { StandardComparison, BISStandard } from '@/lib/types';

export default function StandardComparatorPage() {
  const [comparisons, setComparisons] = useState<StandardComparison[]>(() => getStandardComparisons());
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  const [oldVer, setOldVer] = useState<string>('IS 15298 (Part 2):2011');
  const [newVer, setNewVer] = useState<string>('IS 15298 (Part 2):2016');
  const [graceMonths, setGraceMonths] = useState<number>(12);
  const [summary, setSummary] = useState<string>('Comprehensive revision introducing tighter testing limits and mandatory safety cut-off validation.');
  const [clauseNum, setClauseNum] = useState<string>('Clause 5.3.1');
  const [clauseTitle, setClauseTitle] = useState<string>('Impact Resistance');
  const [oldText, setOldText] = useState<string>('Safety toe cap clearance shall be measured after drop.');
  const [newText, setNewText] = useState<string>('Safety toe cap must withstand 200 Joules impact energy with minimum 14mm residual clearance.');
  const [changeType, setChangeType] = useState<'added' | 'modified' | 'deleted'>('modified');
  const [costImpact, setCostImpact] = useState<'High' | 'Medium' | 'Low'>('High');
  const [impactDesc, setImpactDesc] = useState<string>('Requires factory mold re-tooling and NABL impact testing validation.');

  const loadComparisons = async () => {
    const list = getStandardComparisons();
    try {
      const firebaseList = await fetchStandardComparisonsFromFirebase();
      if (firebaseList && firebaseList.length > 0) {
        const map = new Map<string, StandardComparison>();
        list.forEach(c => map.set(c.standardBaseId, c));
        firebaseList.forEach((c: any) => map.set(c.standardBaseId || c.id, c));
        setComparisons(Array.from(map.values()));
        return;
      }
    } catch (e) {}
    setComparisons(list);
  };

  useEffect(() => {
    loadComparisons();

    const handleUpdate = () => {
      loadComparisons();
    };

    window.addEventListener('bis_standards_updated', handleUpdate);
    return () => window.removeEventListener('bis_standards_updated', handleUpdate);
  }, []);

  const selected = comparisons[selectedIndex] || comparisons[0] || getStandardComparisons()[0];

  const handleAddComparison = (e: React.FormEvent) => {
    e.preventDefault();
    const newComp: StandardComparison = {
      standardBaseId: `custom-${Date.now()}`,
      oldVersion: oldVer,
      newVersion: newVer,
      releaseDate: new Date().toISOString().split('T')[0],
      gracePeriodMonths: graceMonths,
      summary: summary,
      clauseDiffs: [
        {
          clauseNumber: clauseNum,
          title: clauseTitle,
          oldText: oldText,
          newText: newText,
          changeType: changeType,
          impactDescription: impactDesc,
          costImpact: costImpact
        }
      ]
    };
    setComparisons([newComp, ...comparisons]);
    saveStandardComparisonToFirebase(newComp);
    setSelectedIndex(0);
    setShowAddForm(false);
  };

  const changedCount = selected?.clauseDiffs ? selected.clauseDiffs.filter(d => d.changeType === 'modified').length : 0;
  const addedCount = selected?.clauseDiffs ? selected.clauseDiffs.filter(d => d.changeType === 'added').length : 0;
  const deletedCount = selected?.clauseDiffs ? selected.clauseDiffs.filter(d => d.changeType === 'deleted').length : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%' }}>

      {/* Header Banner */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#171717', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <GitCompare style={{ width: 24, height: 24, color: '#F28C52' }} />
            <span>BIS Standards Revision Comparator</span>
          </h1>
          <p style={{ fontSize: 13, color: '#686868', margin: 0, maxWidth: 760 }}>
            Side-by-side clause level diffs, grandfathering transition timelines, and cost impact across {comparisons.length} dynamic standards.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          style={{
            background: showAddForm ? '#F5F2EE' : '#F28C52',
            color: showAddForm ? '#171717' : '#FFFFFF',
            border: 'none', borderRadius: 6,
            padding: '10px 18px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6
          }}
        >
          <PlusCircle style={{ width: 16, height: 16 }} />
          <span>{showAddForm ? 'Close Custom Form' : 'Compare Custom Standard'}</span>
        </button>
      </div>

      {/* Custom Comparison Form */}
      {showAddForm && (
        <form onSubmit={handleAddComparison} style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: '#171717', margin: '0 0 16px' }}>
            Add Custom Version Comparison
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>Old Version Code</label>
              <input type="text" value={oldVer} onChange={(e) => setOldVer(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>New Version Code</label>
              <input type="text" value={newVer} onChange={(e) => setNewVer(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 13 }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>Grace Period (Months)</label>
              <input type="number" value={graceMonths} onChange={(e) => setGraceMonths(Number(e.target.value))} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 13 }} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>Revision Summary</label>
            <input type="text" value={summary} onChange={(e) => setSummary(e.target.value)} style={{ width: '100%', padding: '8px 10px', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 13 }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="submit" style={{ background: '#F28C52', color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '9px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Add to Comparison Suite
            </button>
          </div>
        </form>
      )}

      {/* Select Comparison Tabs */}
      <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
        {comparisons.map((c, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedIndex(idx)}
            style={{
              padding: '12px 18px', borderRadius: 8, textAlign: 'left', minWidth: 220,
              background: selectedIndex === idx ? '#FFF1E8' : '#FFFFFF',
              border: selectedIndex === idx ? '1px solid #F4C4A5' : '1px solid #E8E2DC',
              color: selectedIndex === idx ? '#E9783F' : '#171717',
              cursor: 'pointer', transition: 'all 0.15s ease'
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: selectedIndex === idx ? '#E9783F' : '#686868', marginBottom: 2 }}>
              {c.oldVersion} → {c.newVersion}
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {c.summary.slice(0, 35)}...
            </div>
          </button>
        ))}
      </div>

      {/* Comparison Detail Card */}
      {selected && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E8E2DC', paddingBottom: 16, marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#171717' }}>{selected.oldVersion}</span>
                <ArrowRight style={{ width: 16, height: 16, color: '#F28C52' }} />
                <span style={{ fontSize: 16, fontWeight: 800, color: '#F28C52' }}>{selected.newVersion}</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: '#686868' }}>{selected.summary}</p>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ background: '#FFF1E8', color: '#E9783F', borderRadius: 4, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
                {changedCount} Modified
              </span>
              <span style={{ background: '#EBF4EE', color: '#4F7D5A', borderRadius: 4, padding: '4px 10px', fontSize: 12, fontWeight: 700 }}>
                {addedCount} Added
              </span>
            </div>
          </div>

          {/* Clause Diff List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {selected.clauseDiffs.map((diff, i) => (
              <div key={i} style={{ border: '1px solid #E8E2DC', borderRadius: 8, padding: 18, background: '#FFFCF8' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: '#171717' }}>{diff.clauseNumber}: {diff.title}</span>
                    <span style={{
                      fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                      background: diff.changeType === 'modified' ? '#FFF1E8' : '#EBF4EE',
                      color: diff.changeType === 'modified' ? '#E9783F' : '#4F7D5A'
                    }}>
                      {diff.changeType.toUpperCase()}
                    </span>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: diff.costImpact === 'High' ? '#B85C52' : '#E9783F' }}>
                    Cost Impact: {diff.costImpact}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 10 }}>
                  <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: 12, fontSize: 12.5 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#686868', marginBottom: 4 }}>Previous Specification ({selected.oldVersion})</div>
                    <div style={{ color: '#524F4D' }}>{diff.oldText}</div>
                  </div>
                  <div style={{ background: '#F8FCF9', border: '1px solid #B5D5BF', borderRadius: 6, padding: 12, fontSize: 12.5 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#4F7D5A', marginBottom: 4 }}>New Specification ({selected.newVersion})</div>
                    <div style={{ color: '#171717', fontWeight: 600 }}>{diff.newText}</div>
                  </div>
                </div>

                <div style={{ fontSize: 12, color: '#686868' }}>
                  <strong>Operational Impact:</strong> {diff.impactDescription}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
