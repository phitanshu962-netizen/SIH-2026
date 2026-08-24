'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  Search, Filter, CheckCircle2, ArrowRight, RefreshCw, BookOpen, 
  Layers, ShieldCheck, FileText, CheckSquare, Sparkles, ExternalLink,
  ChevronRight, Building2, Eye, Award
} from 'lucide-react';
import { BISStandard } from '@/lib/types';
import { getDynamicStandards } from '@/lib/data/bisDatabase';

function MatcherContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  // Dynamic Standards Store State
  const [standardsList, setStandardsList] = useState<BISStandard[]>(() => getDynamicStandards());
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedScheme, setSelectedScheme] = useState<string>('all');

  // Matcher Input State
  const [productName, setProductName] = useState(initialQuery || 'Electric Iron');
  const [material, setMaterial] = useState('Plastic & Metal');
  const [usage, setUsage] = useState('Domestic');
  const [businessType, setBusinessType] = useState('MSME');

  const [isLoading, setIsLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<{
    primaryMatch: BISStandard;
    matchConfidence: number;
    secondaryMatches: BISStandard[];
    recommendations: string[];
  } | null>(null);

  // Load and subscribe to dynamic standards
  useEffect(() => {
    const list = getDynamicStandards();
    setStandardsList(list);

    const handleUpdate = () => {
      setStandardsList(getDynamicStandards());
    };

    window.addEventListener('bis_standards_updated', handleUpdate);
    return () => window.removeEventListener('bis_standards_updated', handleUpdate);
  }, []);

  useEffect(() => {
    if (initialQuery) {
      setProductName(initialQuery);
      setCatalogSearch(initialQuery);
      executeMatch(initialQuery, material, usage, businessType);
    }
  }, [initialQuery]);

  const executeMatch = async (pName: string, mat: string, usg: string, bType: string) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/matcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: pName,
          material: mat,
          usage: usg,
          businessType: bType,
          customStandards: getDynamicStandards()
        })
      });
      const data = await res.json();
      setMatchResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMatch = () => {
    executeMatch(productName, material, usage, businessType);
  };

  const categories = ['all', ...Array.from(new Set(standardsList.map(s => s.category).filter(Boolean)))];
  const schemes = ['all', 'Scheme-I (ISI Mark)', 'CRS (Compulsory Registration)', 'FMCS', 'Hallmarking'];

  const filteredCatalog = standardsList.filter(s => {
    const matchesSearch = 
      !catalogSearch ||
      s.isNumber.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      s.title.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      s.scope?.toLowerCase().includes(catalogSearch.toLowerCase()) ||
      s.category?.toLowerCase().includes(catalogSearch.toLowerCase());

    const matchesCat = selectedCategory === 'all' || s.category?.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSch = selectedScheme === 'all' || s.applicableScheme?.toLowerCase().includes(selectedScheme.toLowerCase());

    return matchesSearch && matchesCat && matchesSch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%' }}>
      
      {/* Header Banner */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#171717', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Search style={{ width: 24, height: 24, color: '#F28C52' }} />
            <span>Product Standard Matcher &amp; All Standards Catalog</span>
          </h1>
          <p style={{ fontSize: 13, color: '#686868', margin: 0, maxWidth: 760 }}>
            Discover mandatory Indian Standards, QCO orders, testing benchmarks, and explore all <span suppressHydrationWarning>{standardsList.length}</span> indexed BIS standards in the database.
          </p>
        </div>

        <div suppressHydrationWarning style={{ background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 6, padding: '8px 14px', fontSize: 12.5, fontWeight: 700, color: '#E9783F' }}>
          <span suppressHydrationWarning>{standardsList.length}</span> Total Standards in Database
        </div>
      </div>

      {/* ══════════════ 1. PRODUCT MATCHER SEARCH ENGINE ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: '#171717', margin: 0, display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #E8E2DC', paddingBottom: 12 }}>
          <Filter style={{ width: 16, height: 16, color: '#F28C52' }} />
          <span>Product Specifications &amp; Scope Matcher</span>
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>Product Name / Keyword</label>
            <input 
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="e.g. Footwear, Electric Iron, Helmet, Toys..."
              style={{
                width: '100%', padding: '10px 12px', background: '#FFFCF8', border: '1px solid #E8E2DC',
                borderRadius: 6, fontSize: 13, color: '#242424', outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>Primary Material</label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', background: '#FFFCF8', border: '1px solid #E8E2DC',
                borderRadius: 6, fontSize: 13, color: '#242424', outline: 'none', boxSizing: 'border-box'
              }}
            >
              <option value="Plastic & Metal">Plastic & Metal</option>
              <option value="Leather & Rubber">Leather & Rubber (Footwear / PPE)</option>
              <option value="Polycarbonate & Composite">Polycarbonate & Composite (Helmets)</option>
              <option value="Steel & Alloy">Steel & Alloy</option>
              <option value="Food Grade PET">Food Grade PET / Polycarbonate</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>Intended Usage</label>
            <select
              value={usage}
              onChange={(e) => setUsage(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', background: '#FFFCF8', border: '1px solid #E8E2DC',
                borderRadius: 6, fontSize: 13, color: '#242424', outline: 'none', boxSizing: 'border-box'
              }}
            >
              <option value="Domestic">Domestic / Household</option>
              <option value="Industrial">Industrial / Safety PPE</option>
              <option value="Commercial">Commercial / Retail</option>
              <option value="Automotive">Automotive / Two-Wheeler</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#171717', marginBottom: 4 }}>Manufacturer Scale</label>
            <select
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', background: '#FFFCF8', border: '1px solid #E8E2DC',
                borderRadius: 6, fontSize: 13, color: '#242424', outline: 'none', boxSizing: 'border-box'
              }}
            >
              <option value="MSME">Micro / Small / Medium (MSME)</option>
              <option value="Large Industry">Large Industry</option>
              <option value="Importer">Importer / Trader</option>
              <option value="Foreign Factory">Foreign Factory (FMCS)</option>
            </select>
          </div>

        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onClick={handleMatch}
            disabled={isLoading || !productName.trim()}
            style={{
              background: '#F28C52', color: '#FFFFFF', border: 'none', borderRadius: 6,
              padding: '11px 24px', fontSize: 13, fontWeight: 700, cursor: isLoading || !productName.trim() ? 'not-allowed' : 'pointer',
              opacity: isLoading || !productName.trim() ? 0.6 : 1,
              display: 'inline-flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 6px rgba(242, 140, 82, 0.25)'
            }}
          >
            {isLoading ? (
              <>
                <RefreshCw style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} />
                <span>Matching Vector Embeddings...</span>
              </>
            ) : (
              <>
                <span>Run Product Matcher</span>
                <ArrowRight style={{ width: 15, height: 15 }} />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Match Results Display */}
      {matchResult && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', borderLeft: '4px solid #F28C52', display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #E8E2DC', paddingBottom: 16, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#E9783F', background: '#FFF1E8', border: '1px solid #F4C4A5', padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase' }}>
                Primary Matched Standard • {matchResult.matchConfidence}% Match
              </span>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#171717', margin: '8px 0 4px' }}>{matchResult.primaryMatch.isNumber}</h3>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#524F4D', margin: 0 }}>{matchResult.primaryMatch.title}</p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ padding: '4px 10px', background: '#EBF4EE', color: '#4F7D5A', fontWeight: 700, fontSize: 12, borderRadius: 4 }}>
                {matchResult.primaryMatch.mandatoryStatus}
              </span>
              <span style={{ padding: '4px 10px', background: '#FFF1E8', color: '#E9783F', fontWeight: 700, fontSize: 12, borderRadius: 4 }}>
                {matchResult.primaryMatch.applicableScheme}
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 14 }}>
              <h4 style={{ fontSize: 11.5, fontWeight: 800, color: '#686868', textTransform: 'uppercase', margin: '0 0 6px' }}>Standard Scope &amp; Application</h4>
              <p style={{ fontSize: 12.5, color: '#242424', lineHeight: 1.5, margin: 0 }}>{matchResult.primaryMatch.scope}</p>
            </div>

            <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 14 }}>
              <h4 style={{ fontSize: 11.5, fontWeight: 800, color: '#686868', textTransform: 'uppercase', margin: '0 0 6px' }}>Testing Benchmarks &amp; Parameters</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#242424' }}>
                {matchResult.primaryMatch.testingParameters?.map((tp, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <CheckCircle2 style={{ width: 13, height: 13, color: '#4F7D5A', flexShrink: 0 }} />
                    <span>{tp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', borderTop: '1px solid #E8E2DC', paddingTop: 14 }}>
            <Link
              href={`/citations?standard=${encodeURIComponent(matchResult.primaryMatch.isNumber)}`}
              style={{ background: '#F28C52', color: '#FFFFFF', padding: '8px 16px', borderRadius: 6, fontSize: 12.5, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>Explore Clauses &amp; Gazette Citations</span>
              <ArrowRight style={{ width: 14, height: 14 }} />
            </Link>

            <Link
              href={`/checklist`}
              style={{ background: '#FFFFFF', color: '#171717', border: '1px solid #E8E2DC', padding: '8px 16px', borderRadius: 6, fontSize: 12.5, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <span>Generate Compliance Checklist</span>
            </Link>
          </div>

        </div>
      )}

      {/* ══════════════ 2. ALL STANDARDS & PRODUCTS CATALOG EXPLORER ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 18 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, borderBottom: '1px solid #E8E2DC', paddingBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#171717', margin: '0 0 2px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen style={{ width: 20, height: 20, color: '#F28C52' }} />
              <span>All Standards &amp; Products Catalog (<span suppressHydrationWarning>{standardsList.length}</span> Standards)</span>
            </h2>
            <p style={{ fontSize: 12.5, color: '#686868', margin: 0 }}>
              Official standards catalog including built-in Indian Standards and all custom uploaded documents.
            </p>
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', width: 280 }}>
            <Search style={{ position: 'absolute', left: 10, top: 9, width: 15, height: 15, color: '#9CA3AF' }} />
            <input
              type="text"
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              placeholder="Search catalog (e.g. Footwear, IS 15298)..."
              style={{
                width: '100%', padding: '8px 10px 8px 32px', background: '#FAFAF9',
                border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 12.5, color: '#242424',
                outline: 'none', boxSizing: 'border-box'
              }}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#686868' }}>Category:</span>
          {categories.slice(0, 6).map((cat, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedCategory(cat)}
              style={{
                background: selectedCategory === cat ? '#F28C52' : '#F5F2EE',
                color: selectedCategory === cat ? '#FFFFFF' : '#524F4D',
                border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 11.5, fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.12s ease'
              }}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        {/* Catalog Standards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {filteredCatalog.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '36px 20px', textAlign: 'center', background: '#FFFCF8', borderRadius: 8, border: '1px solid #E8E2DC', color: '#686868' }}>
              No standards matching "{catalogSearch}" found in catalog. Ingest documents in the Admin Panel.
            </div>
          ) : (
            filteredCatalog.map((std) => (
              <div
                key={std.id}
                style={{
                  background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 8, padding: 18,
                  boxShadow: '0 2px 6px rgba(40, 30, 20, 0.02)', display: 'flex', flexDirection: 'column',
                  justifyContent: 'space-between', transition: 'all 0.15s ease'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 800, background: '#FFF1E8', color: '#E9783F', border: '1px solid #F4C4A5', borderRadius: 4, padding: '2px 8px' }}>
                      {std.isNumber}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#4F7D5A', background: '#EBF4EE', borderRadius: 4, padding: '2px 8px' }}>
                      {std.mandatoryStatus}
                    </span>
                  </div>

                  <h3 style={{ fontSize: 14.5, fontWeight: 800, color: '#171717', margin: '0 0 6px', lineHeight: 1.35 }}>
                    {std.title}
                  </h3>

                  <p style={{ fontSize: 12, color: '#686868', lineHeight: 1.45, margin: '0 0 10px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {std.scope}
                  </p>

                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11, color: '#524F4D', marginBottom: 12 }}>
                    <span style={{ background: '#F8F6F2', padding: '2px 6px', borderRadius: 4 }}>📁 {std.category}</span>
                    <span style={{ background: '#F8F6F2', padding: '2px 6px', borderRadius: 4 }}>📜 {std.clauseReferences?.length || 0} Clauses</span>
                    <span style={{ background: '#F8F6F2', padding: '2px 6px', borderRadius: 4 }}>🏛️ {std.applicableScheme}</span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #E8E2DC', paddingTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => {
                      setProductName(std.title.split('-')[0].trim());
                      executeMatch(std.title.split('-')[0].trim(), material, usage, businessType);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    style={{
                      background: '#FFF1E8', border: '1px solid #F4C4A5', color: '#E9783F',
                      padding: '4px 10px', borderRadius: 4, fontSize: 11.5, fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    Match Specs
                  </button>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link
                      href={`/gap-analyzer`}
                      style={{ fontSize: 11.5, fontWeight: 600, color: '#171717', textDecoration: 'none', border: '1px solid #E8E2DC', padding: '4px 8px', borderRadius: 4, background: '#FFFFFF' }}
                    >
                      Audit Gap
                    </Link>

                    <Link
                      href={`/citations?standard=${encodeURIComponent(std.isNumber)}`}
                      style={{ fontSize: 11.5, fontWeight: 600, color: '#242424', textDecoration: 'none', border: '1px solid #E8E2DC', padding: '4px 8px', borderRadius: 4, background: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 2 }}
                    >
                      <span>Citations</span>
                      <ChevronRight style={{ width: 12, height: 12 }} />
                    </Link>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>

      </div>

    </div>
  );
}

export default function MatcherPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm font-bold text-slate-600 animate-pulse">Loading BIS Product Matcher...</div>}>
      <MatcherContent />
    </Suspense>
  );
}
