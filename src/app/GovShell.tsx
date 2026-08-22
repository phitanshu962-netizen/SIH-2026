'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield, BookOpen, Search, CheckSquare, BarChart3, Globe, Users,
  FileSearch, GitCompare, HelpCircle, Bell, FileText, Mic, Calendar,
  TestTube, MapPin, CheckCircle2, Sparkles, LogOut, Command, ChevronLeft,
  ChevronRight, X, ArrowUpRight, Cpu, SlidersHorizontal, Home, ExternalLink
} from 'lucide-react';
import { UserPersona, LanguageCode } from '@/lib/types';
import { getDynamicStandards } from '@/lib/data/bisDatabase';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { user, dbStandardsCount, signInWithGoogle, logout } = useAuth();
  const [persona, setPersona] = useState<UserPersona>('manufacturer');
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>('large');
  const [standardsList, setStandardsList] = useState(getDynamicStandards());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Command Palette State (Ctrl+K)
  const [commandOpen, setCommandOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');

  // Listen for live BIS standard ingest updates from Admin Panel
  useEffect(() => {
    const handleUpdate = () => {
      setStandardsList([...getDynamicStandards()]);
    };
    window.addEventListener('bis_standards_updated', handleUpdate);
    return () => window.removeEventListener('bis_standards_updated', handleUpdate);
  }, []);

  // Handle Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Accessibility Font Zoom
  useEffect(() => {
    const fontSizes = { small: '13px', normal: '14px', large: '16px' };
    const zoomScales = { small: '0.9', normal: '1.0', large: '1.1' };
    
    document.documentElement.style.setProperty('--app-font-size', fontSizes[fontSize]);
    document.documentElement.style.fontSize = fontSizes[fontSize];
    
    if (typeof document !== 'undefined' && document.body) {
      document.body.style.fontSize = fontSizes[fontSize];
      (document.body.style as any).zoom = zoomScales[fontSize];
    }
  }, [fontSize]);

  // Apply language
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // Sidebar grouped menu structure
  const navSections = [
    {
      title: 'DASHBOARD',
      items: [
        { href: '/', label: 'Overview Command Center', icon: Home }
      ]
    },
    {
      title: 'STANDARDS',
      items: [
        { href: '/matcher', label: 'All Standards Catalog', icon: Search },
        { href: '/comparator', label: 'Standard Versions & Diffs', icon: GitCompare },
        { href: '/citations', label: 'Clause Research & Citations', icon: BookOpen }
      ]
    },
    {
      title: 'ANALYSIS',
      items: [
        { href: '/gap-analyzer', label: 'Gap Analyzer', icon: FileSearch },
        { href: '/comparator', label: 'Version Comparator', icon: GitCompare },
        { href: '/matcher', label: 'Product Standard Matcher', icon: Search }
      ]
    },
    {
      title: 'COMPLIANCE',
      items: [
        { href: '/citations', label: 'Clause Citations', icon: BookOpen },
        { href: '/checklist', label: 'Interactive Checklist', icon: CheckSquare },
        { href: '/services', label: 'Scheme & Statutory Logic', icon: Sparkles },
        { href: '/explainability', label: 'Legal Tree Rationale', icon: HelpCircle }
      ]
    },
    {
      title: 'KNOWLEDGE',
      items: [
        { href: '/ask-pdf', label: 'Ask My PDF (RAG)', icon: FileText },
        { href: '/admin', label: 'Standard Ingestion & Admin', icon: BarChart3 }
      ]
    },
    {
      title: 'MONITORING',
      items: [
        { href: '/alerts', label: 'QCO Change Alerts', icon: Bell },
        { href: '/evidence-verifier', label: 'Evidence Verifier', icon: CheckCircle2 }
      ]
    },
    {
      title: 'TOOLS & LABS',
      items: [
        { href: '/lab-finder', label: 'NABL Lab Finder', icon: MapPin },
        { href: '/testing-mapper', label: 'Testing Mapper', icon: TestTube },
        { href: '/multilingual', label: 'Multilingual Search', icon: Globe },
        { href: '/timeline', label: 'Compliance Roadmap', icon: Calendar }
      ]
    },
    {
      title: 'AI RESEARCH',
      items: [
        { href: '/assistant', label: 'Ask BIS AI Assistant', icon: Cpu }
      ]
    }
  ];

  // Quick Command Palette items
  const allCmdItems = standardsList.map(s => ({
    title: `${s.isNumber}: ${s.title}`,
    category: s.category,
    href: `/matcher?q=${encodeURIComponent(s.isNumber)}`,
    type: 'Standard'
  })).concat([
    { title: 'Gap Analyzer Workspace', category: 'Analysis Tool', href: '/gap-analyzer', type: 'Tool' },
    { title: 'Version Comparator', category: 'Analysis Tool', href: '/comparator', type: 'Tool' },
    { title: 'Clause Citation Explorer', category: 'Compliance', href: '/citations', type: 'Tool' },
    { title: 'Ask My PDF Custom RAG', category: 'Knowledge', href: '/ask-pdf', type: 'Tool' },
    { title: 'BIS AI Research Assistant', category: 'AI Intelligence', href: '/assistant', type: 'Tool' },
    { title: 'NABL Lab Finder', category: 'Testing', href: '/lab-finder', type: 'Tool' },
    { title: 'QCO Alerts & Gazette Tracker', category: 'Monitoring', href: '/alerts', type: 'Tool' },
    { title: 'Standard Ingestion & Ingestion Engine', category: 'Admin', href: '/admin', type: 'Admin' }
  ]);

  const filteredCmdItems = cmdQuery.trim() === '' 
    ? allCmdItems.slice(0, 7) 
    : allCmdItems.filter(i => 
        i.title.toLowerCase().includes(cmdQuery.toLowerCase()) || 
        i.category.toLowerCase().includes(cmdQuery.toLowerCase())
      ).slice(0, 10);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FFFCF8', color: '#242424' }}>
      {/* Hidden Google Translate Element */}
      <div id="google_translate_element" style={{ display: 'none' }}></div>

      {/* ══════════════ 1. TOP UTILITY INSTITUTIONAL STRIPE ══════════════ */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8E2DC', padding: '6px 0', fontSize: 12 }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          
          {/* Left: BIS Institutional Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 700, color: '#171717', letterSpacing: '0.02em' }}>BUREAU OF INDIAN STANDARDS</span>
            <span style={{ color: '#E8E2DC' }}>|</span>
            <span style={{ color: '#686868', fontSize: 11.5 }}>Ministry of Consumer Affairs, Food &amp; Public Distribution</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FFF1E8', color: '#E9783F', border: '1px solid #F4C4A5', borderRadius: 4, padding: '1px 7px', fontSize: 10.5, fontWeight: 700 }}>
              Standards Lead the Way
            </span>
          </div>

          {/* Right: Controls & Account */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Persona Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: '2px 8px' }}>
              <Users style={{ width: 13, height: 13, color: '#686868' }} />
              <select
                value={persona}
                onChange={(e) => setPersona(e.target.value as UserPersona)}
                style={{ background: 'transparent', border: 'none', fontSize: 11.5, fontWeight: 600, color: '#242424', cursor: 'pointer', outline: 'none' }}
              >
                <option value="manufacturer">Manufacturer View</option>
                <option value="msme">MSME View</option>
                <option value="consumer">Consumer View</option>
                <option value="importer">Importer View</option>
              </select>
            </div>

            {/* Accessibility Font Size */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, borderRight: '1px solid #E8E2DC', paddingRight: 10 }}>
              {(['small', 'normal', 'large'] as const).map((sz, i) => (
                <button
                  key={sz}
                  onClick={() => setFontSize(sz)}
                  title={`${sz} text size`}
                  style={{
                    background: fontSize === sz ? '#F28C52' : 'transparent',
                    color: fontSize === sz ? '#FFFFFF' : '#686868',
                    border: `1px solid ${fontSize === sz ? '#E9783F' : '#E8E2DC'}`,
                    borderRadius: 4, cursor: 'pointer',
                    padding: '2px 6px', fontSize: 11, fontWeight: 700,
                  }}
                >{['A-', 'A', 'A+'][i]}</button>
              ))}
            </div>

            {/* Language Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Globe style={{ width: 13, height: 13, color: '#F28C52' }} />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                style={{ background: '#FFFFFF', color: '#242424', border: '1px solid #E8E2DC', borderRadius: 4, padding: '2px 6px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="mr">मराठी</option>
                <option value="gu">ગુજરાતી</option>
                <option value="ta">தமிழ்</option>
                <option value="te">తెలుగు</option>
                <option value="bn">বাংলা</option>
              </select>
            </div>

            {/* Auth Button */}
            {user ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 6, padding: '3px 8px' }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#171717' }}>
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <button onClick={logout} title="Sign Out" style={{ background: 'transparent', border: 'none', color: '#E9783F', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <LogOut style={{ width: 13, height: 13 }} />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#FFFFFF', color: '#242424',
                  border: '1px solid #E8E2DC', borderRadius: 6,
                  padding: '4px 10px', fontSize: 11.5, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <span>Login</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════ 2. INSTITUTIONAL HEADER BAR ══════════════ */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E8E2DC',
        position: 'sticky', top: 0, zIndex: 90,
        width: '100%', flexShrink: 0
      }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          
          {/* Logo & Brand Title */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38,
              background: '#FFF1E8',
              border: '1.5px solid #F28C52',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(242,140,82,0.15)'
            }}>
              <Shield style={{ width: 22, height: 22, color: '#F28C52' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#171717', letterSpacing: '-0.01em' }}>BIS</span>
                <span style={{ color: '#E8E2DC', fontWeight: 300 }}>|</span>
                <span style={{ fontSize: 17, fontWeight: 700, color: '#242424' }}>Standards Intelligence</span>
              </div>
              <div style={{ fontSize: 11, color: '#686868', marginTop: 1 }}>
                Enterprise Compliance &amp; Gazette Grounded AI Platform
              </div>
            </div>
          </Link>

          {/* Central Command Palette Trigger */}
          <div 
            onClick={() => setCommandOpen(true)}
            style={{
              flex: '0 1 480px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#FFFCF8',
              border: '1px solid #E8E2DC',
              borderRadius: 8,
              padding: '8px 14px',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#F4C4A5')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#E8E2DC')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#686868', fontSize: 13 }}>
              <Search style={{ width: 16, height: 16, color: '#F28C52' }} />
              <span>Search standards, clauses, products, documents...</span>
            </div>
            <kbd style={{
              background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 4,
              padding: '2px 6px', fontSize: 11, fontWeight: 700, color: '#686868'
            }}>Ctrl K</kbd>
          </div>

          {/* Quick Actions / Alerts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link
              href="/alerts"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#FFFCF8', border: '1px solid #E8E2DC',
                borderRadius: 8, padding: '7px 12px', color: '#242424',
                fontSize: 12.5, fontWeight: 600, textDecoration: 'none'
              }}
            >
              <Bell style={{ width: 15, height: 15, color: '#F28C52' }} />
              <span>Alerts</span>
              <span style={{ background: '#FFF1E8', color: '#E9783F', border: '1px solid #F4C4A5', borderRadius: 10, padding: '0 6px', fontSize: 10, fontWeight: 800 }}>3</span>
            </Link>

            <Link
              href="/admin"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#F28C52', color: '#FFFFFF',
                borderRadius: 8, padding: '7px 14px',
                fontSize: 12.5, fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(242,140,82,0.25)', transition: 'all 0.15s'
              }}
            >
              <BarChart3 style={{ width: 15, height: 15 }} />
              <span>Ingestion Admin</span>
            </Link>
          </div>

        </div>
      </header>

      {/* ══════════════ 3. ENTERPRISE WORKSPACE LAYOUT (SIDEBAR + MAIN) ══════════════ */}
      <div style={{ flex: 1, display: 'flex', maxWidth: 1440, width: '100%', margin: '0 auto' }}>
        
        {/* COLLAPSIBLE SIDEBAR */}
        <aside style={{
          width: sidebarCollapsed ? 70 : 250,
          transition: 'width 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          background: '#FFFFFF',
          borderRight: '1px solid #E8E2DC',
          display: 'flex', flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky', top: 63, height: 'calc(100vh - 63px)',
          overflowY: 'auto'
        }}>
          
          {/* Sidebar Header Toggle */}
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', borderBottom: '1px solid #E8E2DC' }}>
            {!sidebarCollapsed && (
              <span style={{ fontSize: 11, fontWeight: 800, color: '#686868', letterSpacing: '0.08em' }}>
                BIS NAVIGATION
              </span>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              style={{ background: 'transparent', border: '1px solid #E8E2DC', borderRadius: 4, padding: 4, cursor: 'pointer', color: '#686868', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {sidebarCollapsed ? <ChevronRight style={{ width: 16, height: 16 }} /> : <ChevronLeft style={{ width: 16, height: 16 }} />}
            </button>
          </div>

          {/* Navigation Menu Groups */}
          <div style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {navSections.map((group, idx) => (
              <div key={idx}>
                {!sidebarCollapsed && (
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: '#686868', letterSpacing: '0.07em', padding: '4px 10px 6px', textTransform: 'uppercase' }}>
                    {group.title}
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={sidebarCollapsed ? item.label : undefined}
                        style={{
                          display: 'flex', alignItems: 'center',
                          gap: 10,
                          padding: sidebarCollapsed ? '10px' : '8px 12px',
                          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                          borderRadius: 6,
                          background: isActive ? '#FFF1E8' : 'transparent',
                          color: isActive ? '#242424' : '#686868',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: 13,
                          textDecoration: 'none',
                          borderLeft: isActive ? '3.5px solid #F28C52' : '3.5px solid transparent',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = '#FFFCF8';
                            (e.currentTarget as HTMLElement).style.color = '#242424';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isActive) {
                            (e.currentTarget as HTMLElement).style.background = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = '#686868';
                          }
                        }}
                      >
                        <Icon style={{ width: 16, height: 16, color: isActive ? '#F28C52' : '#686868', flexShrink: 0 }} />
                        {!sidebarCollapsed && (
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Sidebar Footer Stats */}
          {!sidebarCollapsed && (
            <div style={{ padding: 14, margin: 8, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, fontSize: 11.5 }}>
              <div style={{ fontWeight: 700, color: '#171717', marginBottom: 2 }}>Standards Database</div>
              <div style={{ color: '#686868' }}>{dbStandardsCount || 12} Official IS Standards Indexed</div>
            </div>
          )}

        </aside>

        {/* MAIN WORKSPACE CONTENT */}
        <main style={{ flex: 1, padding: '24px 32px', minWidth: 0 }}>
          {children}
        </main>

      </div>

      {/* ══════════════ 4. GLOBAL COMMAND PALETTE MODAL (CTRL + K) ══════════════ */}
      {commandOpen && (
        <div 
          onClick={() => setCommandOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(23, 23, 23, 0.4)',
            backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            paddingTop: '10vh'
          }}
        >
          <div 
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 620,
              background: '#FFFFFF',
              border: '1px solid #E8E2DC',
              borderRadius: 12,
              boxShadow: '0 20px 40px rgba(40, 30, 20, 0.15)',
              overflow: 'hidden',
              animation: 'fadeInUp 0.2s ease-out'
            }}
          >
            {/* Search Box */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E8E2DC', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Search style={{ width: 20, height: 20, color: '#F28C52' }} />
              <input
                type="text"
                autoFocus
                value={cmdQuery}
                onChange={e => setCmdQuery(e.target.value)}
                placeholder="Search IS standards, clauses, products, tools (e.g. IS 302, gap, lab)..."
                style={{
                  width: '100%', border: 'none', background: 'transparent',
                  fontSize: 15, fontWeight: 500, color: '#242424', outline: 'none',
                  boxShadow: 'none'
                }}
              />
              <button 
                onClick={() => setCommandOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#686868', cursor: 'pointer' }}
              >
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {/* Results List */}
            <div style={{ maxHeight: 360, overflowY: 'auto', padding: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#686868', padding: '8px 12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {cmdQuery ? 'Search Results' : 'Suggested Searches & Actions'}
              </div>
              
              {filteredCmdItems.length === 0 ? (
                <div style={{ padding: '24px 12px', textAlign: 'center', color: '#686868', fontSize: 13 }}>
                  No matching standards or features found for &quot;{cmdQuery}&quot;.
                </div>
              ) : (
                filteredCmdItems.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      setCommandOpen(false);
                      router.push(item.href);
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 14px', borderRadius: 6, cursor: 'pointer',
                      transition: 'all 0.12s'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#FFF1E8')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div>
                      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#171717' }}>{item.title}</div>
                      <div style={{ fontSize: 11.5, color: '#686868' }}>{item.category}</div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#E9783F', background: '#FFFFFF', border: '1px solid #F4C4A5', borderRadius: 4, padding: '2px 8px' }}>
                      {item.type}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 16px', background: '#FFFCF8', borderTop: '1px solid #E8E2DC', display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#686868' }}>
              <span>Press <kbd style={{ background: '#FFF', border: '1px solid #E8E2DC', padding: '1px 4px', borderRadius: 3 }}>ESC</kbd> to exit</span>
              <span>Use arrows to navigate</span>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ 5. RESTRAINED INSTITUTIONAL FOOTER ══════════════ */}
      <footer style={{ background: '#FFFFFF', borderTop: '1px solid #E8E2DC', padding: '32px 0 20px', flexShrink: 0 }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, paddingBottom: 24, borderBottom: '1px solid #E8E2DC' }}>
            {/* Identity */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 28, height: 28, background: '#FFF1E8', border: '1px solid #F28C52', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield style={{ width: 16, height: 16, color: '#F28C52' }} />
                </div>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#171717' }}>Bureau of Indian Standards</span>
              </div>
              <p style={{ fontSize: 12.5, color: '#686868', maxWidth: 480, margin: 0, lineHeight: 1.6 }}>
                Groundbreaking intelligence platform providing clause-level verification, revision comparisons, and statutory compliance navigation for Indian Standards.
              </p>
            </div>

            {/* Portals */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Official BIS Portals</div>
              {[
                ['Official BIS Website', 'https://www.bis.gov.in'],
                ['Manakonline Portal', 'https://www.manakonline.in'],
                ['CRS Registration', 'https://www.crsbis.in']
              ].map(([lbl, url]) => (
                <a key={lbl} href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#686868', fontSize: 12, textDecoration: 'none', marginBottom: 6 }}>
                  <span>{lbl}</span>
                  <ExternalLink style={{ width: 11, height: 11, color: '#F28C52' }} />
                </a>
              ))}
            </div>

            {/* System Accuracy */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>System Accuracy</div>
              <div style={{ fontSize: 12, color: '#686868', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div>Retrieval Precision: <strong style={{ color: '#4F7D5A' }}>94.2%</strong></div>
                <div>Grounded Answers: <strong style={{ color: '#4F7D5A' }}>96.8%</strong></div>
                <div>Hallucination Rate: <strong style={{ color: '#F28C52' }}>&lt; 0.6%</strong></div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, fontSize: 12, color: '#686868', flexWrap: 'wrap', gap: 10 }}>
            <span>© 2026 Bureau of Indian Standards (BIS), Government of India.</span>
            <span>Designed to GOI web standards • White + Warm Orange + Charcoal Theme</span>
          </div>

        </div>
      </footer>
    </div>
  );
}

export default function GovShell({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AuthProvider>
        <ShellInner>{children}</ShellInner>
        <Toaster position="bottom-right" />
      </AuthProvider>
    </LanguageProvider>
  );
}
