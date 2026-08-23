'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Shield, BookOpen, Search, CheckSquare, BarChart3, Globe, Users, User,
  FileSearch, GitCompare, HelpCircle, Bell, FileText, Mic, Calendar,
  TestTube, MapPin, CheckCircle2, Sparkles, LogOut, Command, ChevronLeft,
  ChevronRight, X, ArrowUpRight, Cpu, SlidersHorizontal, Home, ExternalLink,
  ThumbsUp, ThumbsDown, Volume2, VolumeX
} from 'lucide-react';
import { UserPersona, LanguageCode } from '@/lib/types';
import { getDynamicStandards, processAssistantResearchAgent } from '@/lib/data/bisDatabase';
import { AssistantAgentResponse } from '@/lib/types';
import { saveFeedbackLocal } from '@/lib/firebase';
import { LanguageProvider, useLanguage } from '@/context/LanguageContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { speakAudioResponse, stopAudioPlayback } from '@/lib/voiceAssistantHelper';

function FormattedMarkdown({ content, isUser }: { content: string; isUser: boolean }) {
  const lines = content.split('\n');
  return (
    <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: isUser ? '#FFFFFF' : '#171717', fontSize: 12.5, lineHeight: 1.55 }}>
      {lines.map((line, lIdx) => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={lIdx} style={{ marginBottom: line.trim() === '' ? 4 : 2 }}>
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={pIdx} style={{ fontWeight: 800 }}>{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </div>
        );
      })}
    </div>
  );
}

function ShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { user, dbStandardsCount, signInWithGoogle, logout } = useAuth();
  const [persona, setPersona] = useState<UserPersona>('manufacturer');

  useEffect(() => {
    const saved = localStorage.getItem('bis_user_persona') as UserPersona;
    if (saved && ['manufacturer', 'msme', 'consumer', 'importer'].includes(saved)) {
      setPersona(saved);
    }
  }, []);

  const handlePersonaChange = (newPersona: UserPersona) => {
    setPersona(newPersona);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bis_user_persona', newPersona);
      window.dispatchEvent(new Event('bis_persona_changed'));
    }
  };
  const [fontSize, setFontSize] = useState<'small' | 'normal' | 'large'>('normal');
  const [standardsList, setStandardsList] = useState(getDynamicStandards());
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Command Palette & Header Search State
  const [commandOpen, setCommandOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [headerSearch, setHeaderSearch] = useState('');

  // Antigravity-Style Right-Side Slide Panel State
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [panelInputQuery, setPanelInputQuery] = useState('');
  const [panelMessages, setPanelMessages] = useState<Array<{
    sender: 'user' | 'bot';
    text: string;
    agentResponse?: AssistantAgentResponse;
  }>>([
    {
      sender: 'bot',
      text: 'Ask BIS AI is connected to 12 grounded Indian Standards and official Gazette notifications. I can answer questions, cite clauses, or navigate you directly to platform features.'
    }
  ]);
  const [panelProcessing, setPanelProcessing] = useState(false);
  const [panelListening, setPanelListening] = useState(false);
  const [panelSpeaking, setPanelSpeaking] = useState(false);

  const startPanelVoiceInput = () => {
    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.interimResults = false;

      stopAudioPlayback();
      setPanelListening(true);
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setPanelInputQuery(text);
        setPanelListening(false);
        handleSendPanelMessage(text, true);
      };

      recognition.onerror = () => setPanelListening(false);
      recognition.onend = () => setPanelListening(false);
      try {
        recognition.start();
      } catch (e) {
        setPanelListening(false);
      }
    }
  };

  const handleSendPanelMessage = async (customQuery?: string, isFromVoice: boolean = false) => {
    const textToRun = customQuery || panelInputQuery;
    if (!textToRun.trim()) return;

    setPanelMessages(prev => [...prev, { sender: 'user', text: textToRun }]);
    if (!customQuery) setPanelInputQuery('');
    setPanelProcessing(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToRun, persona })
      });

      if (res.ok) {
        const data = await res.json();
        const replyText = data.summaryExplanation;
        
        setPanelMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: replyText,
            agentResponse: {
              intentCategory: 'RESEARCH',
              responseText: replyText,
              sources: (data.citations || []).map((c: any) => ({
                title: c.title || c.standardNumber || 'Official BIS Standard',
                documentType: 'Official BIS Standard',
                clauseRef: c.clause || 'Normative Clause',
                pageRef: 'Verified Scope',
                excerptText: c.snippet || c.title || 'Official Specification Excerpt',
                statusBadge: 'OFFICIAL'
              })),
              actionCard: {
                title: 'Trace Statutory Legal Rationale',
                actionType: 'TRACE_LEGAL_LOGIC',
                targetRoute: `/explainability?q=${encodeURIComponent(textToRun)}`,
                buttonLabel: 'View Legal Rationale →',
                description: `Explains statutory logic for ${data.productDetected || textToRun}.`
              },
              confidenceScore: data.confidenceScore || 95,
              groundingBadge: `${data.engineUsed || 'Neural BIS Grounded RAG'} (${data.modelName || 'Local Grounded'})`,
              suggestedPrompts: [
                "What mandatory tests are required?",
                "Find accredited NABL testing laboratories.",
                "Generate interactive compliance checklist."
              ]
            }
          }
        ]);

        // Speak response out loud if initiated via voice or active panel
        speakAudioResponse(
          replyText,
          () => setPanelSpeaking(true),
          () => setPanelSpeaking(false)
        );

      } else {
        throw new Error('API route returned error status');
      }
    } catch (err) {
      const response = processAssistantResearchAgent(textToRun, {
        currentRoute: pathname,
        currentFeature: pathname.replace('/', '') || 'overview',
        userRole: persona
      });

      setPanelMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: response.responseText,
          agentResponse: response
        }
      ]);

      speakAudioResponse(
        response.responseText,
        () => setPanelSpeaking(true),
        () => setPanelSpeaking(false)
      );
    } finally {
      setPanelProcessing(false);
    }
  };

  useEffect(() => {
    setMounted(true);
  }, []);

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

  // Dynamic persona-based sidebar grouped menu structure
  const getPersonaNavSections = (activePersona: UserPersona) => {
    const baseSections = [
      {
        title: 'DASHBOARD',
        items: [
          { href: '/', label: 'Overview Command Center', icon: Home }
        ]
      },
      {
        title: 'STANDARDS',
        items: [
          { href: '/matcher', label: 'All Standards Catalog', icon: Search, badge: activePersona === 'consumer' ? 'Verify' : undefined },
          { href: '/comparator', label: 'Standard Versions & Diffs', icon: GitCompare, badge: activePersona === 'importer' ? 'Diffs' : undefined },
          { href: '/citations', label: 'Clause Research & Citations', icon: BookOpen, badge: activePersona === 'consumer' ? 'Citations' : undefined }
        ]
      },
      {
        title: 'ANALYSIS',
        items: [
          { href: '/gap-analyzer', label: 'Gap Analyzer', icon: FileSearch, badge: activePersona === 'manufacturer' ? 'STI Focus' : undefined },
          { href: '/comparator', label: 'Version Comparator', icon: GitCompare },
          { href: '/matcher', label: 'Product Standard Matcher', icon: Search }
        ]
      },
      {
        title: 'COMPLIANCE',
        items: [
          { href: '/citations', label: 'Clause Citations', icon: BookOpen },
          { href: '/checklist', label: 'Interactive Checklist', icon: CheckSquare, badge: activePersona === 'msme' ? '50% Fee' : undefined },
          { href: '/services', label: 'Scheme & Statutory Logic', icon: Sparkles, badge: (activePersona === 'msme' || activePersona === 'importer') ? 'CRS/FMCS' : undefined },
          { href: '/explainability', label: 'Legal Tree Rationale', icon: HelpCircle }
        ]
      },
      {
        title: 'KNOWLEDGE',
        items: [
          { href: '/ask-pdf', label: 'Ask My PDF (RAG)', icon: FileText, badge: activePersona === 'importer' ? 'Custom RAG' : undefined },
          { href: '/admin', label: 'Standard Ingestion & Admin', icon: BarChart3 }
        ]
      },
      {
        title: 'MONITORING',
        items: [
          { href: '/alerts', label: 'QCO Change Alerts', icon: Bell, badge: activePersona === 'importer' ? 'Customs Alerts' : undefined },
          { href: '/evidence-verifier', label: 'Evidence Verifier', icon: CheckCircle2, badge: activePersona === 'consumer' ? 'HUID Seal' : undefined }
        ]
      },
      {
        title: 'TOOLS & LABS',
        items: [
          { href: '/lab-finder', label: 'NABL Lab Finder', icon: MapPin, badge: activePersona === 'manufacturer' ? 'NABL Mapping' : undefined },
          { href: '/testing-mapper', label: 'Testing Mapper', icon: TestTube, badge: activePersona === 'manufacturer' ? 'Lab Equipment' : undefined },
          { href: '/timeline', label: 'Compliance Roadmap', icon: Calendar, badge: activePersona === 'msme' ? 'MSME Roadmap' : undefined }
        ]
      }
    ];

    let priorityOrder: string[] = [];
    if (activePersona === 'manufacturer') {
      priorityOrder = ['DASHBOARD', 'TOOLS & LABS', 'ANALYSIS', 'STANDARDS', 'COMPLIANCE', 'MONITORING', 'KNOWLEDGE'];
    } else if (activePersona === 'msme') {
      priorityOrder = ['DASHBOARD', 'COMPLIANCE', 'TOOLS & LABS', 'STANDARDS', 'ANALYSIS', 'MONITORING', 'KNOWLEDGE'];
    } else if (activePersona === 'consumer') {
      priorityOrder = ['DASHBOARD', 'MONITORING', 'STANDARDS', 'KNOWLEDGE', 'COMPLIANCE', 'ANALYSIS', 'TOOLS & LABS'];
    } else {
      priorityOrder = ['DASHBOARD', 'MONITORING', 'COMPLIANCE', 'ANALYSIS', 'STANDARDS', 'KNOWLEDGE', 'TOOLS & LABS'];
    }

    return priorityOrder
      .map(title => baseSections.find(s => s.title === title))
      .filter((s): s is (typeof baseSections)[0] => Boolean(s));
  };

  const navSections = getPersonaNavSections(persona);

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
    <div suppressHydrationWarning style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#FFFCF8', color: '#242424' }}>
      {/* Hidden Google Translate Element */}
      <div id="google_translate_element" style={{ display: 'none' }}></div>

      {/* ══════════════ UNIFIED INSTITUTIONAL HEADER BAR ══════════════ */}
      <header suppressHydrationWarning style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E8E2DC',
        position: 'sticky', top: 0, zIndex: 100,
        width: '100%', flexShrink: 0
      }}>
        <div style={{ width: '100%', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          
          {/* Left: Logo & Brand Title */}
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
            <img 
              src="/niyam ai.png" 
              alt="NiyamAI Logo" 
              style={{ height: 88, width: 'auto', objectFit: 'contain', flexShrink: 0 }} 
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#171717', letterSpacing: '-0.02em' }}>
                  Niyam<span style={{ color: '#F28C52' }}>AI</span>
                </span>
                <span style={{ color: '#CBD5E1', fontWeight: 300, fontSize: 18 }}>|</span>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#1E293B' }}>BIS Standards Intelligence</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#D96B27', marginTop: 2, letterSpacing: '0.01em' }}>
                India&apos;s Compliance Intelligence Platform
              </div>
            </div>
          </Link>

          {/* Center: Interactive Search Input & Command Palette Trigger */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (headerSearch.trim()) {
                router.push(`/matcher?q=${encodeURIComponent(headerSearch.trim())}`);
              } else {
                setCommandOpen(true);
              }
            }}
            style={{
              flex: '0 1 400px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: '#FFFCF8',
              border: '1px solid #E8E2DC',
              borderRadius: 8,
              padding: '4px 8px 4px 12px',
              transition: 'all 0.18s ease',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <Search style={{ width: 15, height: 15, color: '#F28C52', flexShrink: 0 }} />
              <input
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="Search standards, clauses, products..."
                style={{
                  width: '100%', border: 'none', background: 'transparent',
                  fontSize: 12.5, fontWeight: 500, color: '#242424', outline: 'none'
                }}
              />
            </div>
          </form>

          {/* Right: Controls, Account & Admin */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            
            {/* Persona Selector */}
            <div suppressHydrationWarning style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: '3px 7px' }}>
              <Users style={{ width: 12, height: 12, color: '#686868' }} />
              <select
                value={persona}
                onChange={(e) => handlePersonaChange(e.target.value as UserPersona)}
                style={{ background: 'transparent', border: 'none', fontSize: 11.5, fontWeight: 600, color: '#242424', cursor: 'pointer', outline: 'none' }}
              >
                <option value="manufacturer">Manufacturer View</option>
                <option value="msme">MSME View</option>
                <option value="consumer">Consumer View</option>
                <option value="importer">Importer View</option>
              </select>
            </div>



            {/* Language Selector */}
            <div suppressHydrationWarning style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: '3px 7px' }}>
              <Globe style={{ width: 12, height: 12, color: '#686868' }} />
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                style={{ background: 'transparent', border: 'none', fontSize: 11.5, fontWeight: 600, color: '#242424', cursor: 'pointer', outline: 'none' }}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 6, padding: '3px 7px' }}>
                <User style={{ width: 12, height: 12, color: '#E9783F' }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#171717' }}>
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <button onClick={logout} title="Sign Out" style={{ background: 'transparent', border: 'none', color: '#E9783F', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <LogOut style={{ width: 12, height: 12 }} />
                </button>
              </div>
            ) : (
              <button
                onClick={signInWithGoogle}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: '#FFFFFF', color: '#242424',
                  border: '1px solid #E8E2DC', borderRadius: 6,
                  padding: '4px 9px', fontSize: 11.5, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <User style={{ width: 12, height: 12, color: '#686868' }} />
                <span>Login</span>
              </button>
            )}

            {/* Quick Actions / Alerts (Hidden on Main Page '/') */}
            {pathname !== '/' && (
              <Link
                href="/alerts"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: '#FFFCF8', border: '1px solid #E8E2DC',
                  borderRadius: 6, padding: '6px 10px', color: '#242424',
                  fontSize: 12, fontWeight: 600, textDecoration: 'none'
                }}
              >
                <Bell style={{ width: 14, height: 14, color: '#F28C52' }} />
                <span>Alerts</span>
                <span style={{ background: '#FFF1E8', color: '#E9783F', border: '1px solid #F4C4A5', borderRadius: 10, padding: '0 5px', fontSize: 9.5, fontWeight: 800 }}>3</span>
              </Link>
            )}

            {/* Admin Button (Renamed from Ingestion Admin) */}
            <Link
              href="/admin"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: '#F28C52', color: '#FFFFFF',
                borderRadius: 6, padding: '6px 12px',
                fontSize: 12, fontWeight: 700, textDecoration: 'none',
                boxShadow: '0 2px 6px rgba(242,140,82,0.25)', transition: 'all 0.15s'
              }}
            >
              <BarChart3 style={{ width: 14, height: 14 }} />
              <span>Admin</span>
            </Link>

          </div>

        </div>
      </header>

      {/* ══════════════ 2. ENTERPRISE WORKSPACE LAYOUT (SIDEBAR + MAIN) ══════════════ */}
      <div style={{ flex: 1, display: 'flex', width: '100%' }}>
        
        {/* LEFT SIDEBAR NAVIGATION */}
        <aside suppressHydrationWarning style={{
          width: sidebarCollapsed ? 64 : 260,
          background: '#FFFFFF',
          borderRight: '1px solid #E8E2DC',
          display: 'flex', flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky', top: 98, height: 'calc(100vh - 98px)',
          zIndex: 40,
          boxSizing: 'border-box'
        }}>
          
          {/* Sidebar Header Toggle */}
          <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'space-between', borderBottom: '1px solid #E8E2DC', flexShrink: 0 }}>
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

          {/* Navigation Menu Groups (Scrollable Content Area) */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 16 }}>
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
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{item.label}</span>
                        )}
                        {item.badge && !sidebarCollapsed && (
                          <span style={{
                            marginLeft: 'auto',
                            fontSize: 9.5,
                            fontWeight: 800,
                            background: '#FFF1E8',
                            color: '#E9783F',
                            border: '1px solid #F4C4A5',
                            borderRadius: 4,
                            padding: '1px 5px',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.badge}
                          </span>
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
            <div style={{ padding: 12, margin: '8px 8px 14px', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, fontSize: 11.5, flexShrink: 0 }}>
              <div style={{ fontWeight: 700, color: '#171717', marginBottom: 2 }}>Standards Database</div>
              <div style={{ color: '#686868' }}>{dbStandardsCount || 12} Official IS Standards Indexed</div>
            </div>
          )}

        </aside>

        {/* MAIN WORKSPACE CONTENT */}
        <main style={{ 
          flex: 1, 
          padding: '24px 32px', 
          paddingRight: aiPanelOpen ? 460 : 32,
          minWidth: 0,
          transition: 'padding-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {children}
          </div>
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

      {/* ══════════════ FLOATING ANTIGRAVITY-STYLE ASK BIS AI TRIGGER ══════════════ */}
      <button
        onClick={() => setAiPanelOpen(prev => !prev)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 90,
          background: '#F28C52', color: '#FFFFFF', border: 'none', borderRadius: 30,
          padding: '12px 20px', fontSize: 13, fontWeight: 800, cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(242,140,82,0.4)', display: 'flex', alignItems: 'center', gap: 8,
          transition: 'all 0.2s ease'
        }}
      >
        <Sparkles style={{ width: 16, height: 16 }} />
        <span>{aiPanelOpen ? 'Close BIS AI' : '✦ Ask BIS AI'}</span>
      </button>

      {/* ══════════════ ANTIGRAVITY-STYLE RIGHT-SIDE AI SLIDE PANEL ══════════════ */}
      {aiPanelOpen && (
        <div style={{
          position: 'fixed', top: 98, right: 0, bottom: 0, width: 440, maxWidth: '90vw',
          height: 'calc(100vh - 98px)',
          background: '#FFFFFF', borderLeft: '1px solid #E8E2DC', zIndex: 95,
          boxShadow: '-8px 0 32px rgba(0,0,0,0.12)', display: 'flex', flexDirection: 'column'
        }}>
          {/* Panel Header */}
          <div style={{ padding: '16px 20px', background: '#171717', color: '#FFFFFF', borderBottom: '1px solid #27272A', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 28, height: 28, background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <img src="/niyam ai.png" alt="NiyamAI Logo" style={{ width: 22, height: 22, objectFit: 'contain' }} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800 }}>Ask BIS AI Assistant</div>
                <div style={{ fontSize: 10.5, color: '#4ADE80', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80' }}></span>
                  <span>BIS Knowledge Connected</span>
                </div>
              </div>
            </div>

            <button onClick={() => setAiPanelOpen(false)} style={{ background: 'transparent', border: 'none', color: '#A1A1AA', fontSize: 16, cursor: 'pointer' }}>✕</button>
          </div>

          {/* Current Page Context Badge */}
          <div style={{ padding: '8px 16px', background: '#FFFCF8', borderBottom: '1px solid #E8E2DC', fontSize: 11, color: '#686868', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Context: <strong style={{ color: '#171717' }}>{pathname}</strong> ({persona})</span>
            <span style={{ fontSize: 10, background: '#FFF1E8', color: '#E9783F', fontWeight: 800, padding: '1px 6px', borderRadius: 3 }}>IS 302-2-3</span>
          </div>

          {/* Chat Stream */}
          <div style={{ flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, background: '#FFFCF8' }}>
            {panelMessages.map((msg, idx) => (
              <div key={idx} style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: msg.sender === 'user' ? '85%' : '100%',
                background: msg.sender === 'user' ? '#171717' : '#FFFFFF',
                color: msg.sender === 'user' ? '#FFFFFF' : '#171717',
                border: msg.sender === 'user' ? 'none' : '1px solid #E8E2DC',
                borderRadius: 8, padding: 12, fontSize: 12.5, lineHeight: 1.55, fontWeight: 500,
                boxShadow: msg.sender === 'bot' ? '0 1px 4px rgba(0,0,0,0.03)' : 'none'
              }}>
                <FormattedMarkdown content={msg.text} isUser={msg.sender === 'user'} />

                {/* Voice Assistant Speak Control Button */}
                {msg.sender === 'bot' && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      onClick={() => {
                        if (panelSpeaking) {
                          stopAudioPlayback();
                          setPanelSpeaking(false);
                        } else {
                          speakAudioResponse(msg.text, () => setPanelSpeaking(true), () => setPanelSpeaking(false));
                        }
                      }}
                      style={{
                        background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 4,
                        padding: '3px 8px', fontSize: 10.5, fontWeight: 700, color: '#E9783F',
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4
                      }}
                    >
                      {panelSpeaking ? <VolumeX style={{ width: 12, height: 12 }} /> : <Volume2 style={{ width: 12, height: 12 }} />}
                      <span>{panelSpeaking ? 'Stop Audio' : '🔊 Listen Out Loud'}</span>
                    </button>
                  </div>
                )}

                {/* Source Cards */}
                {msg.agentResponse?.sources && msg.agentResponse.sources.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #E8E2DC', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>OFFICIAL SOURCE</span>
                    {msg.agentResponse.sources.map((src, sIdx) => (
                      <div key={sIdx} style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 4, padding: 6, fontSize: 11, color: '#242424' }}>
                        <strong style={{ color: '#171717' }}>{src.title}</strong> • {src.clauseRef}
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Card */}
                {msg.agentResponse?.actionCard && (
                  <div style={{ marginTop: 8, background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 6, padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>RECOMMENDED PLATFORM ACTION</span>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: '#171717' }}>{msg.agentResponse.actionCard.title}</div>
                    <div style={{ fontSize: 10.5, color: '#686868' }}>{msg.agentResponse.actionCard.description}</div>
                    
                    <button
                      onClick={() => {
                        setAiPanelOpen(false);
                        router.push(msg.agentResponse!.actionCard!.targetRoute);
                      }}
                      style={{ background: '#F28C52', color: '#FFFFFF', border: 'none', borderRadius: 4, padding: '5px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2 }}
                    >
                      <span>{msg.agentResponse.actionCard.buttonLabel}</span>
                    </button>
                  </div>
                )}

                {/* Bot Feedback Quick Action */}
                {msg.sender === 'bot' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, marginTop: 6, paddingTop: 6, borderTop: '1px solid #E8E2DC' }}>
                    <span style={{ fontSize: 10, color: '#686868' }}>Helpful?</span>
                    <button
                      onClick={() => saveFeedbackLocal(msg.text.slice(0, 80), true, "Helpful panel answer")}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#4F7D5A', display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 700 }}
                    >
                      <ThumbsUp style={{ width: 10, height: 10 }} /> Yes
                    </button>
                    <button
                      onClick={() => saveFeedbackLocal(msg.text.slice(0, 80), false, "Unhelpful panel answer")}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#686868', display: 'flex', alignItems: 'center', gap: 2, fontSize: 10, fontWeight: 700 }}
                    >
                      <ThumbsDown style={{ width: 10, height: 10 }} /> No
                    </button>
                  </div>
                )}
              </div>
            ))}

            {panelProcessing && (
              <div style={{ fontSize: 11, color: '#686868', fontStyle: 'italic' }}>
                Analyzing BIS sources &amp; resolving action routes...
              </div>
            )}
          </div>

          {/* Quick Action Suggestion Pills */}
          <div style={{ padding: '8px 12px', background: '#FFFFFF', borderTop: '1px solid #E8E2DC', display: 'flex', gap: 6, overflowX: 'auto' }}>
            <button onClick={() => handleSendPanelMessage("What tests are required for IS 302-2-3?")} style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 4, padding: '3px 8px', fontSize: 10.5, fontWeight: 700, color: '#E9783F', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Testing Requirements
            </button>
            <button onClick={() => handleSendPanelMessage("Check compliance gaps for electric iron.")} style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 4, padding: '3px 8px', fontSize: 10.5, fontWeight: 700, color: '#E9783F', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Run Gap Analysis
            </button>
          </div>

          {/* Input Form */}
          <div style={{ padding: 12, background: '#FFFFFF', borderTop: '1px solid #E8E2DC', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={panelInputQuery}
              onChange={(e) => setPanelInputQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendPanelMessage()}
              placeholder={panelListening ? "Listening... Speak your query..." : "Ask anything about BIS or command the app..."}
              style={{
                flex: 1,
                background: panelListening ? '#FFF1E8' : '#FFFCF8',
                border: `1px solid ${panelListening ? '#F28C52' : '#E8E2DC'}`,
                borderRadius: 6, padding: '8px 10px', fontSize: 12, fontWeight: 600, outline: 'none'
              }}
            />
            <button
              onClick={startPanelVoiceInput}
              title="Speak with Voice Assistant"
              style={{
                background: panelListening ? '#E9783F' : '#FFFCF8',
                color: panelListening ? '#FFFFFF' : '#F28C52',
                border: '1px solid #F4C4A5', borderRadius: 6,
                padding: '8px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s'
              }}
            >
              <Mic style={{ width: 15, height: 15 }} />
            </button>
            <button onClick={() => handleSendPanelMessage()} style={{ background: '#F28C52', color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              Send
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ 5. RESTRAINED INSTITUTIONAL FOOTER ══════════════ */}
      <footer style={{ background: '#09090B', borderTop: '1px solid #27272A', padding: '32px 0 20px', flexShrink: 0, color: '#FAFAFA' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24, paddingBottom: 24, borderBottom: '1px solid #27272A' }}>
            {/* Identity */}
            <div style={{ gridColumn: 'span 2' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                <img src="/niyam ai.png" alt="NiyamAI Logo" style={{ height: 56, width: 'auto', objectFit: 'contain' }} />
                <span style={{ fontWeight: 800, fontSize: 16, color: '#FFFFFF' }}>
                  Niyam<span style={{ color: '#F28C52' }}>AI</span> — Standards Intelligence
                </span>
              </div>
              <p style={{ fontSize: 12.5, color: '#A1A1AA', maxWidth: 480, margin: 0, lineHeight: 1.6 }}>
                Groundbreaking intelligence platform providing clause-level verification, revision comparisons, and statutory compliance navigation for Indian Standards.
              </p>
            </div>

            {/* Portals */}
            <div>
              <div style={{ fontWeight: 700, fontSize: 12, color: '#FFFFFF', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Official BIS Portals</div>
              {[
                ['Official BIS Website', 'https://www.bis.gov.in'],
                ['Manakonline Portal', 'https://www.manakonline.in'],
                ['CRS Registration', 'https://www.crsbis.in']
              ].map(([lbl, url]) => (
                <a key={lbl} href={url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#A1A1AA', fontSize: 12, textDecoration: 'none', marginBottom: 6 }}>
                  <span>{lbl}</span>
                  <ExternalLink style={{ width: 11, height: 11, color: '#F28C52' }} />
                </a>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, fontSize: 12, color: '#71717A', flexWrap: 'wrap', gap: 10 }}>
            <span>© 2026 NiyamAI — Bureau of Indian Standards (BIS), Government of India.</span>
            <span>Designed to GOI web standards • Dark Charcoal Theme</span>
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
      </AuthProvider>
    </LanguageProvider>
  );
}
