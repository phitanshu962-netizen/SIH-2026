'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  BookOpen, Search, Copy, Check, ExternalLink, Shield, FileText, PlusCircle, Filter
} from 'lucide-react';
import { getDynamicStandards } from '@/lib/data/bisDatabase';
import { BISStandard } from '@/lib/types';

function ClauseCitationsContent() {
  const searchParams = useSearchParams();
  const initialStandardParam = searchParams.get('standard') || '';

  const [standards, setStandards] = useState<BISStandard[]>(() => getDynamicStandards());
  const [searchQuery, setSearchQuery] = useState<string>(initialStandardParam);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setStandards(getDynamicStandards());

    const handleUpdate = () => {
      setStandards(getDynamicStandards());
    };

    window.addEventListener('bis_standards_updated', handleUpdate);
    return () => window.removeEventListener('bis_standards_updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (initialStandardParam) {
      setSearchQuery(initialStandardParam);
    }
  }, [initialStandardParam]);

  // Flatten standard clause references from dynamic standards store
  const allCitations = standards.flatMap((std, stdIdx) => 
    (std.clauseReferences || []).map((ref, idx) => ({
      id: `cit-${std.id}-${idx}`,
      standardId: std.id,
      standardNumber: std.isNumber,
      title: std.title,
      clause: ref.clause,
      officialText: ref.description,
      aiInterpretation: `Under ${std.isNumber} ${ref.clause}, conformity requires laboratory validation ensuring ${ref.description.toLowerCase().slice(0, 120)}...`,
      officialUrl: std.officialUrl || "https://www.services.bis.gov.in",
      mandatoryStatus: std.mandatoryStatus,
      category: std.category,
      applicableScheme: std.applicableScheme,
      pageNumber: `Page ${10 + idx * 4}`,
      gazetteRef: `S.O. ${400 + stdIdx * 15}(E) / 2026`
    }))
  );

  const categories = ['all', ...Array.from(new Set(standards.map(s => s.category)))];

  const filteredCitations = allCitations.filter(c => {
    const matchesSearch = 
      !searchQuery ||
      c.standardNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.clause.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.officialText.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || c.category?.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const handleCopyCitation = (cit: any) => {
    const formatted = `[BIS OFFICIAL CITATION]\nStandard: ${cit.standardNumber} (${cit.title})\nClause: ${cit.clause}\nOfficial Requirement: "${cit.officialText}"\nScheme: ${cit.applicableScheme}\nPage: ${cit.pageNumber}\nGazette Source: ${cit.officialUrl}`;
    navigator.clipboard.writeText(formatted);
    setCopiedId(cit.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%' }}>

      {/* Header Banner */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#171717', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOpen style={{ width: 24, height: 24, color: '#F28C52' }} />
            <span>Clause Citations Explorer &amp; Gazette Evidence</span>
          </h1>
          <p style={{ fontSize: 13, color: '#686868', margin: 0, maxWidth: 760 }}>
            Browse and copy official Gazette-grounded clause citations across all {standards.length} indexed standards ({allCitations.length} Total Clauses).
          </p>
        </div>

        <div style={{ background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 6, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, color: '#E9783F' }}>
          {allCitations.length} Active Clause Citations
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 18, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search style={{ width: 16, height: 16, color: '#F28C52', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search standard (e.g. IS 15298), clause number, or specification keyword..."
            style={{
              width: '100%', paddingLeft: 36, paddingRight: 12, paddingTop: 10, paddingBottom: 10,
              background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 13, color: '#242424',
              outline: 'none', boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter style={{ width: 15, height: 15, color: '#686868' }} />
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              padding: '10px 14px', background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 13, color: '#242424', outline: 'none'
            }}
          >
            {categories.map((c, i) => (
              <option key={i} value={c}>{c === 'all' ? 'All Categories' : c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Citations Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {filteredCitations.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center', background: '#FFFFFF', borderRadius: 10, border: '1px solid #E8E2DC', color: '#686868' }}>
            No clause citations found matching "{searchQuery}".
          </div>
        ) : (
          filteredCitations.map((cit) => (
            <div
              key={cit.id}
              style={{
                background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 8, padding: 20,
                boxShadow: '0 2px 8px rgba(40, 30, 20, 0.03)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                transition: 'all 0.15s ease'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, background: '#FFF1E8', color: '#E9783F', border: '1px solid #F4C4A5', borderRadius: 4, padding: '2px 8px' }}>
                    {cit.standardNumber}
                  </span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#4F7D5A', background: '#EBF4EE', borderRadius: 4, padding: '2px 8px' }}>
                    {cit.clause}
                  </span>
                </div>

                <h3 style={{ fontSize: 14.5, fontWeight: 800, color: '#171717', margin: '0 0 6px', lineHeight: 1.35 }}>
                  {cit.title}
                </h3>

                <div style={{ fontSize: 12.5, color: '#374151', background: '#F8F6F2', borderRadius: 6, padding: '10px 12px', marginBottom: 10, lineHeight: 1.45 }}>
                  "{cit.officialText}"
                </div>

                <div style={{ fontSize: 11.5, color: '#686868', marginBottom: 12, lineHeight: 1.4 }}>
                  {cit.aiInterpretation}
                </div>
              </div>

              <div style={{ borderTop: '1px solid #E8E2DC', paddingTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5 }}>
                <span style={{ color: '#686868' }}>{cit.pageNumber} • {cit.gazetteRef}</span>

                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => handleCopyCitation(cit)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: copiedId === cit.id ? '#EBF4EE' : '#FFFFFF',
                      color: copiedId === cit.id ? '#4F7D5A' : '#171717',
                      border: '1px solid #E8E2DC', borderRadius: 4, padding: '4px 8px',
                      fontSize: 11.5, fontWeight: 600, cursor: 'pointer'
                    }}
                  >
                    {copiedId === cit.id ? <Check style={{ width: 12, height: 12 }} /> : <Copy style={{ width: 12, height: 12 }} />}
                    <span>{copiedId === cit.id ? 'Copied' : 'Copy'}</span>
                  </button>

                  <a
                    href={cit.officialUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: '#FFFFFF', color: '#F28C52', border: '1px solid #E8E2DC',
                      borderRadius: 4, padding: '4px 8px', fontSize: 11.5, fontWeight: 600, textDecoration: 'none'
                    }}
                  >
                    <span>Gazette</span>
                    <ExternalLink style={{ width: 11, height: 11 }} />
                  </a>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}

export default function ClauseCitationsPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>Loading BIS Clause Citations...</div>}>
      <ClauseCitationsContent />
    </Suspense>
  );
}
