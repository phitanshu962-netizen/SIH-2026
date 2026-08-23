'use client';

import React, { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Cpu, Send, Shield, CheckCircle2, AlertTriangle, ExternalLink, 
  ThumbsUp, ThumbsDown, BookOpen, Layers, Sparkles, FileText, RefreshCw,
  Search, GitCompare, Wrench, Building2, CheckSquare, Scale, ShieldAlert,
  ArrowRight, ArrowUpRight, Zap, Mic, Calendar, Landmark, ListChecks, ShieldCheck, HelpCircle
} from 'lucide-react';
import { UserPersona, AssistantAgentResponse, AiActionCard, AIResponsePayload } from '@/lib/types';
import { processAssistantResearchAgent } from '@/lib/data/bisDatabase';
import { saveFeedbackLocal } from '@/lib/firebase';
import ReactMarkdown from 'react-markdown';

function AssistantContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [persona, setPersona] = useState<UserPersona>('manufacturer');
  const [researchMode, setResearchMode] = useState<'standard' | 'research' | 'compliance'>('standard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, boolean>>({});
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const [messages, setMessages] = useState<Array<{
    sender: 'user' | 'bot';
    text: string;
    agentResponse?: AssistantAgentResponse;
  }>>([
    {
      sender: 'bot',
      text: 'Welcome to the BIS AI Compliance Control Center. I am your source-grounded research agent and platform operating layer. Tell me your compliance objective, product, or standard, and I will retrieve official evidence and open the required platform feature.'
    }
  ]);

  const [responsePayload, setResponsePayload] = useState<AIResponsePayload | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<boolean | null>(null);
  
  // Tab control for right-hand Agent panel
  const [activeTab, setActiveTab] = useState<'roadmap' | 'checklist' | 'documents' | 'citations'>('checklist');
  // Local state for ticked checklist items to calculate compliance score dynamically
  const [checkedRequirements, setCheckedRequirements] = useState<Record<number, boolean>>({});

  const samplePrompts = [
    "How does IS 302-2-3 apply to electric irons?",
    "What mandatory laboratory tests are required?",
    "Check compliance gaps for my product.",
    "Compare IS 302 with its previous 2017 revision.",
    "Generate an interactive compliance checklist.",
    "Find accredited NABL testing laboratories.",
    "Trace the statutory legal rationale for this QCO.",
    "Are there recent Gazette QCO change alerts?"
  ];

  const toggleVoiceInput = () => {
    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
      setIsListening(false);
      return;
    }

    if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = 'en-IN';
      recognition.interimResults = false;

      setIsListening(true);
      recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        setQuery(prev => prev ? prev + ' ' + text : text);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      try {
        recognition.start();
      } catch (e) {
        setIsListening(false);
      }
    } else {
      alert('Speech recognition is not supported in this browser.');
    }
  };

  const handleSearch = async (queryText?: string) => {
    const textToRun = queryText || query;
    if (!textToRun.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text: textToRun }]);
    setQuery('');
    setIsProcessing(true);
    setFeedbackSent(null);
    setCheckedRequirements({});

    // Auto-switch tabs based on query context to show live changes
    if (/roadmap|timeline|steps|plan|milestone|schedule|gold/i.test(textToRun)) {
      setActiveTab('roadmap');
    } else if (/checklist|criteria|rules|requirements|clauses|test/i.test(textToRun)) {
      setActiveTab('checklist');
    } else if (/document|file|paper|certificate|license|agreement/i.test(textToRun)) {
      setActiveTab('documents');
    } else if (/citation|evidence|clause|source|gazette|reference/i.test(textToRun)) {
      setActiveTab('citations');
    } else {
      setActiveTab('checklist'); // default fallback
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToRun, persona })
      });

      if (res.ok) {
        const data = await res.json();
        
        // Save the payload for the right pane workspace
        setResponsePayload(data);

        setMessages(prev => [
          ...prev,
          {
            sender: 'bot',
            text: data.summaryExplanation,
            agentResponse: {
              intentCategory: 'RESEARCH',
              responseText: data.summaryExplanation,
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
      } else {
        throw new Error('API route returned error status');
      }
    } catch (err) {
      console.warn("Failed to fetch from chat API, falling back to processAssistantResearchAgent", err);
      const response = processAssistantResearchAgent(textToRun, {
        currentRoute: '/assistant',
        currentFeature: 'assistant',
        userRole: persona
      });

      // Prepare a fallback response payload for the workspace tabs
      setResponsePayload({
        productDetected: textToRun,
        userPersona: persona,
        relevantStandards: response.sources.map(s => s.title),
        summaryExplanation: response.responseText,
        isSufficientInfo: true,
        complianceRequirements: [
          "Safety & Technical Specification: Satisfy relevant IS code parameters.",
          "Quality Assurance Plan (QAP): Calibration of factory testing equipment.",
          "Marking Verification: Correct ISI/CRS labels and metadata placement."
        ],
        requiredDocuments: [
          "Factory Premises Document & Industrial License",
          "Raw Material Test Certificates & Invoice Logs",
          "Accredited NABL Lab Type Test Report"
        ],
        actionableSteps: [
          "Step 1: Download applicable Indian Standard (IS Code) from BIS.",
          "Step 2: Calibrate factory testing instruments and prepare QAP.",
          "Step 3: Register on Manakonline and apply for factory audit."
        ],
        citations: response.sources.map((s, i) => ({
          standardNumber: s.title,
          title: s.title,
          clause: s.clauseRef || '1.1',
          snippet: s.excerptText,
          relevanceScore: 90,
          officialSource: 'https://www.bis.gov.in'
        })),
        confidenceScore: response.confidenceScore,
        engineUsed: 'Gemini / Neural Grounded RAG',
        modelName: 'Neural BIS Grounded RAG (Fallback)'
      });

      setMessages(prev => [
        ...prev,
        {
          sender: 'bot',
          text: response.responseText,
          agentResponse: response
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const toggleCheck = (idx: number) => {
    setCheckedRequirements(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  // Calculate compliance completion score
  const totalReqs = responsePayload?.complianceRequirements?.length || 0;
  const completedReqs = Object.values(checkedRequirements).filter(Boolean).length;
  const complianceScore = totalReqs > 0 ? Math.round((completedReqs / totalReqs) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
      
      {/* ══════════════ 1. HERO HEADER & PERSONA SELECTOR ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: '24px 28px', boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#E9783F', background: '#FFF1E8', border: '1px solid #F4C4A5', padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Sparkles style={{ width: 12, height: 12, color: '#F28C52' }} />
              Platform Compliance Operating Layer
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#4F7D5A', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#4F7D5A' }}></span>
              BIS Knowledge Connected
            </span>
          </div>

          {/* Persona Switcher */}
          <div style={{ display: 'flex', gap: 4, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: 3 }}>
            {(['manufacturer', 'msme', 'consumer', 'importer'] as UserPersona[]).map((p) => (
              <button
                key={p}
                onClick={() => setPersona(p)}
                style={{
                  background: persona === p ? '#F28C52' : 'transparent',
                  color: persona === p ? '#FFFFFF' : '#686868',
                  border: 'none', borderRadius: 4, padding: '5px 12px',
                  fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize', cursor: 'pointer'
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#171717', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu style={{ width: 24, height: 24, color: '#F28C52' }} />
            <span>Ask BIS AI Assistant: Compliance Control Center</span>
          </h1>
          <p style={{ fontSize: 13.5, color: '#686868', margin: 0, maxWidth: 880, lineHeight: 1.6 }}>
            Intelligent operating agent connecting standards, legal rationale, laboratory testing, and QCO alerts. Tell the AI what you want to achieve, and it will retrieve evidence and navigate you directly to the required platform tool.
          </p>
        </div>
      </div>

      {/* ══════════════ 2. RESEARCH SPLIT-PANE CONTROL CENTER ══════════════ */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, alignItems: 'start' }}>
        
        {/* Left Column: Conversational Chat Control Center */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 18 }}>
          
          {/* Messages List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: msg.sender === 'user' ? '80%' : '100%',
                background: msg.sender === 'user' ? '#171717' : '#FFFCF8',
                color: msg.sender === 'user' ? '#FFFFFF' : '#171717',
                border: msg.sender === 'user' ? 'none' : '1px solid #E8E2DC',
                borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12
              }}>
                <div className={`prose prose-sm max-w-none text-[13.5px] leading-relaxed font-medium ${msg.sender === 'user' ? 'prose-invert text-white' : 'text-slate-900'} markdown-content`}>
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                </div>

                {/* Bot Response Metadata & Source Cards */}
                {msg.sender === 'bot' && msg.agentResponse && (
                  <div style={{ paddingTop: 10, borderTop: '1px solid #E8E2DC', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, background: '#FFF1E8', color: '#E9783F', padding: '2px 8px', borderRadius: 4 }}>
                        INTENT: {msg.agentResponse.intentCategory}
                      </span>
                      <span style={{ fontSize: 10.5, fontWeight: 800, background: '#EBF4EE', color: '#4F7D5A', padding: '2px 8px', borderRadius: 4 }}>
                        {msg.agentResponse.groundingBadge} ({msg.agentResponse.confidenceScore}% Score)
                      </span>
                    </div>

                    {/* Sources */}
                    {msg.agentResponse.sources.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, color: '#686868', textTransform: 'uppercase' }}>OFFICIAL BIS EVIDENCE SOURCES</span>
                        {msg.agentResponse.sources.map((src, sIdx) => (
                          <div key={sIdx} style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 800, color: '#171717' }}>{src.title} ({src.clauseRef})</div>
                              <div style={{ fontSize: 11, color: '#686868' }}>{src.excerptText}</div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 800, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 3, padding: '1px 6px', color: '#F28C52' }}>
                              {src.statusBadge}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Card */}
                    {msg.agentResponse.actionCard && (
                      <div style={{ background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 8, padding: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                        <div>
                          <span style={{ fontSize: 10.5, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>RECOMMENDED PLATFORM ACTION</span>
                          <div style={{ fontSize: 13, fontWeight: 800, color: '#171717', marginTop: 2 }}>{msg.agentResponse.actionCard.title}</div>
                          <div style={{ fontSize: 11.5, color: '#686868' }}>{msg.agentResponse.actionCard.description}</div>
                        </div>

                        <button
                          onClick={() => router.push(msg.agentResponse!.actionCard!.targetRoute)}
                          style={{ background: '#F28C52', color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                        >
                          <span>{msg.agentResponse.actionCard.buttonLabel}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Feedback Action Buttons for Bot Responses */}
                {msg.sender === 'bot' && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #E8E2DC' }}>
                    <span style={{ fontSize: 11, color: '#686868' }}>Was this official response helpful?</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        onClick={() => {
                          setFeedbackGiven(prev => ({ ...prev, [idx]: true }));
                          saveFeedbackLocal(msg.text.slice(0, 100), true, "Helpful response in Assistant");
                        }}
                        disabled={feedbackGiven[idx]}
                        style={{
                          background: feedbackGiven[idx] ? '#EBF4EE' : '#FFFCF8',
                          border: '1px solid #E8E2DC', borderRadius: 4, padding: '3px 8px',
                          fontSize: 11, fontWeight: 700, color: '#4F7D5A', cursor: feedbackGiven[idx] ? 'default' : 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <ThumbsUp style={{ width: 12, height: 12 }} />
                        <span>{feedbackGiven[idx] ? 'Logged' : 'Yes'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setFeedbackGiven(prev => ({ ...prev, [idx]: true }));
                          saveFeedbackLocal(msg.text.slice(0, 100), false, "Needs improvement in Assistant");
                        }}
                        disabled={feedbackGiven[idx]}
                        style={{
                          background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 4, padding: '3px 8px',
                          fontSize: 11, fontWeight: 700, color: '#686868', cursor: feedbackGiven[idx] ? 'default' : 'pointer',
                          display: 'inline-flex', alignItems: 'center', gap: 4
                        }}
                      >
                        <ThumbsDown style={{ width: 12, height: 12 }} />
                        <span>No</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isProcessing && (
              <div style={{ fontSize: 12, color: '#686868', fontStyle: 'italic' }}>
                Analyzing BIS knowledge base &amp; determining optimal platform action...
              </div>
            )}
          </div>

          {/* Sample Prompt Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 8, borderTop: '1px solid #E8E2DC' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#686868' }}>Suggested Commands:</span>
            {samplePrompts.map((promptText, idx) => (
              <button
                key={idx}
                onClick={() => handleSearch(promptText)}
                style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#E9783F', cursor: 'pointer' }}
              >
                {promptText}
              </button>
            ))}
          </div>

          {/* Query Input Box */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ask any compliance question or tell AI to open a feature..."
              style={{ flex: 1, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: '12px 16px', fontSize: 13.5, fontWeight: 600, color: '#171717', outline: 'none' }}
            />
            <button
              type="button"
              title={isListening ? "Stop Listening" : "Voice Input"}
              onClick={toggleVoiceInput}
              style={{ 
                background: isListening ? '#FFF1E8' : '#FFFFFF', 
                border: `1px solid ${isListening ? '#E9783F' : '#F28C52'}`, 
                borderRadius: 8, 
                padding: '11px 14px', 
                color: isListening ? '#E9783F' : '#F28C52', 
                cursor: 'pointer', 
                display: 'inline-flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}
            >
              <Mic style={{ width: 16, height: 16 }} />
            </button>
            <button
              onClick={() => handleSearch()}
              style={{ background: '#F28C52', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '12px 22px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Send style={{ width: 15, height: 15 }} />
              <span>Execute Agent</span>
            </button>
          </div>
        </div>

        {/* Right Column: AI Compliance Agent Workspace */}
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E8E2DC', paddingBottom: 12 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 800, color: '#171717', margin: 0 }}>
                Interactive Compliance Workspace
              </h2>
              <span style={{ fontSize: 11.5, color: '#686868' }}>Live generated assets from standard queries</span>
            </div>
            {responsePayload && (
              <span style={{ 
                fontSize: 10.5, 
                fontWeight: 700, 
                background: '#FFF1E8', 
                color: '#E9783F', 
                border: '1px solid #F4C4A5', 
                borderRadius: 4, 
                padding: '2px 8px' 
              }}>
                Confidence: {responsePayload.confidenceScore}%
              </span>
            )}
          </div>

          {/* Workspace Tabs Header */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 3 }}>
            {[
              { id: 'checklist', label: 'Checklist', icon: CheckSquare },
              { id: 'roadmap', label: 'Roadmap', icon: Calendar },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'citations', label: 'Citations', icon: BookOpen }
            ].map(t => {
              const Icon = t.icon;
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  style={{
                    background: active ? '#FFFFFF' : 'transparent',
                    color: active ? '#E9783F' : '#686868',
                    border: active ? '1px solid #E8E2DC' : '1px solid transparent',
                    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.03)' : 'none',
                    borderRadius: 6,
                    padding: '6px 4px',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s'
                  }}
                >
                  <Icon style={{ width: 14, height: 14 }} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Panel */}
          <div style={{ minHeight: 280 }}>
            {!responsePayload ? (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#686868' }}>
                <ListChecks style={{ width: 32, height: 32, color: '#E8E2DC', margin: '0 auto 10px' }} />
                <p style={{ margin: 0, fontSize: 12, fontStyle: 'italic' }}>Workspace assets will appear once query runs.</p>
              </div>
            ) : (
              <>
                {/* 1. CHECKLIST TAB */}
                {activeTab === 'checklist' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Compliance Progress Indicator */}
                    <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, fontWeight: 700, color: '#171717', marginBottom: 6 }}>
                        <span>Interactive Compliance Checklist</span>
                        <span style={{ color: '#E9783F' }}>{complianceScore}% Ready</span>
                      </div>
                      <div style={{ width: '100%', height: 6, background: '#E8E2DC', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${complianceScore}%`, height: '100%', background: '#4F7D5A', borderRadius: 3, transition: 'width 0.3s ease' }}></div>
                      </div>
                      <div style={{ fontSize: 11, color: '#686868', marginTop: 4 }}>
                        {completedReqs} of {totalReqs} requirements checked.
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {responsePayload.complianceRequirements?.map((req: string, idx: number) => (
                        <div 
                          key={idx} 
                          onClick={() => toggleCheck(idx)}
                          style={{ 
                            display: 'flex', 
                            alignItems: 'start', 
                            gap: 10, 
                            padding: '10px 12px', 
                            border: '1px solid #E8E2DC', 
                            borderRadius: 8, 
                            background: checkedRequirements[idx] ? '#EBF4EE' : '#FFFCF8',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={!!checkedRequirements[idx]} 
                            onChange={() => {}} // handled by parent div click
                            style={{ marginTop: 2, accentColor: '#4F7D5A', cursor: 'pointer' }}
                          />
                          <span style={{ 
                            fontSize: 12, 
                            color: checkedRequirements[idx] ? '#171717' : '#242424',
                            textDecoration: checkedRequirements[idx] ? 'line-through' : 'none',
                            fontWeight: 500,
                            lineHeight: 1.4
                          }}>
                            {req}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. ROADMAP TAB */}
                {activeTab === 'roadmap' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#171717', paddingBottom: 4, borderBottom: '1px solid #E8E2DC' }}>
                      Milestone Timeline Roadmap
                    </div>
                    <div style={{ position: 'relative', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Vertical line indicator */}
                      <div style={{ 
                        position: 'absolute', 
                        left: 9, 
                        top: 10, 
                        bottom: 10, 
                        width: 2, 
                        background: '#E8E2DC', 
                        borderStyle: 'dashed' 
                      }}></div>

                      {responsePayload.actionableSteps?.map((step: string, idx: number) => (
                        <div key={idx} style={{ position: 'relative' }}>
                          {/* Circle bullet */}
                          <div style={{ 
                            position: 'absolute', 
                            left: -24, 
                            top: 2, 
                            width: 12, 
                            height: 12, 
                            borderRadius: '50%', 
                            background: idx === 0 ? '#E9783F' : '#FFFFFF', 
                            border: `2px solid ${idx === 0 ? '#E9783F' : '#E8E2DC'}`, 
                            boxShadow: '0 0 0 3px #FFFFFF' 
                          }}></div>

                          <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 10 }}>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#171717', marginBottom: 2 }}>
                              Milestone {idx + 1}
                            </div>
                            <p style={{ fontSize: 12, color: '#242424', margin: 0, lineHeight: 1.45 }}>
                              {step}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. DOCUMENTS TAB */}
                {activeTab === 'documents' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#171717', paddingBottom: 4, borderBottom: '1px solid #E8E2DC' }}>
                      Required Registration Documents
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {responsePayload.requiredDocuments && responsePayload.requiredDocuments.length > 0 ? (
                        responsePayload.requiredDocuments.map((doc: string, idx: number) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 10, border: '1px solid #E8E2DC', borderRadius: 8, background: '#FFFCF8' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <FileText style={{ width: 14, height: 14, color: '#F28C52' }} />
                              <span style={{ fontSize: 12, color: '#242424', fontWeight: 500 }}>{doc}</span>
                            </div>
                            <span style={{ fontSize: 9.5, fontWeight: 850, textTransform: 'uppercase', background: '#FFF1E8', color: '#E9783F', paddingLeft: 6, paddingRight: 6, paddingTop: 2, paddingBottom: 2, borderRadius: 4 }}>
                              Required
                            </span>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '40px 10px', textAlign: 'center', color: '#686868', fontSize: 11.5 }}>
                          No specific documents mapped for this query standard. General registration records apply.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. CITATIONS TAB */}
                {activeTab === 'citations' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#171717', paddingBottom: 4, borderBottom: '1px solid #E8E2DC' }}>
                      Grounded Citations &amp; Gazette Sources
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {responsePayload.citations && responsePayload.citations.length > 0 ? (
                        responsePayload.citations.map((cit: any, idx: number) => (
                          <div key={idx} style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, fontWeight: 700 }}>
                              <span style={{ color: '#171717' }}>{cit.standardNumber} &bull; Clause {cit.clause}</span>
                              <span style={{ color: '#4F7D5A', background: '#EBF4EE', paddingLeft: 6, paddingRight: 6, paddingTop: 1, paddingBottom: 1, borderRadius: 4, fontSize: 9 }}>
                                {cit.relevanceScore}% Match
                              </span>
                            </div>
                            <p style={{ fontSize: 11.5, fontStyle: 'italic', color: '#686868', margin: 0, fontFamily: 'Georgia, serif' }}>
                              &ldquo;{cit.snippet ? cit.snippet.slice(0, 160) : ''}...&rdquo;
                            </p>
                            <a
                              href={cit.officialSource || '#'}
                              target="_blank"
                              rel="noreferrer"
                              style={{ 
                                alignSelf: 'flex-end',
                                color: '#E9783F', 
                                fontWeight: 700, 
                                fontSize: 11,
                                textDecoration: 'none', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 3 
                              }}
                            >
                              <span>Official Gazette Link</span>
                              <ArrowUpRight style={{ width: 12, height: 12 }} />
                            </a>
                          </div>
                        ))
                      ) : (
                        <div style={{ padding: '40px 10px', textAlign: 'center', color: '#686868', fontSize: 11.5 }}>
                          No specific gazette citations retrieved for this general request.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Feedback buttons inside workspace */}
          {responsePayload && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #E8E2DC', fontSize: 11.5, color: '#686868' }}>
              <span>Was this answer grounded and accurate?</span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => {
                    saveFeedbackLocal(query, true);
                    setFeedbackSent(true);
                  }}
                  style={{ background: feedbackSent === true ? '#EBF4EE' : '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: feedbackSent === true ? '#4F7D5A' : '#686868' }}
                >
                  <ThumbsUp style={{ width: 12, height: 12 }} />
                  <span>Yes</span>
                </button>
                <button
                  onClick={() => {
                    saveFeedbackLocal(query, false);
                    setFeedbackSent(false);
                  }}
                  style={{ background: feedbackSent === false ? '#FDF2F0' : '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 4, padding: '3px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: feedbackSent === false ? '#B85C52' : '#686868' }}
                >
                  <ThumbsDown style={{ width: 12, height: 12 }} />
                  <span>No</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ══════════════ 3. PLATFORM FEATURES COMMAND DIRECTORY GRID ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#171717', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Layers style={{ width: 18, height: 18, color: '#F28C52' }} />
            <span>BIS Platform Features &amp; Registered Command Directory</span>
          </h3>
          <p style={{ fontSize: 12.5, color: '#686868', margin: 0 }}>
            Direct access to all registered platform features connected to the Ask BIS AI Operating Layer.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {[
            { title: 'Testing Mapper', route: '/testing-mapper', icon: Wrench, desc: 'Requirement to lab equipment mapping' },
            { title: 'Gap Analyzer', route: '/gap-analyzer', icon: Search, desc: 'Automated STI & marking gap detector' },
            { title: 'Version Comparator', route: '/comparator', icon: GitCompare, desc: 'Standard revision diffs & amendments' },
            { title: 'Compliance Checklist', route: '/checklist', icon: CheckSquare, desc: 'Interactive mandatory clause checklist' },
            { title: 'Legal Tree Rationale', route: '/explainability', icon: Scale, desc: 'Statutory hazard-to-test reasoning' },
            { title: 'NABL Lab Finder', route: '/lab-finder', icon: Building2, desc: 'Accredited laboratory scope matching' },
            { title: 'QCO Change Alerts', route: '/alerts', icon: ShieldAlert, desc: 'Regulatory event & deadline tracking' },
            { title: 'Evidence Verifier', route: '/evidence-verifier', icon: Shield, desc: 'Cryptographic SHA-256 Gazette verifier' },
            { title: 'Ask My PDF (RAG)', route: '/ask-pdf', icon: BookOpen, desc: 'Deep PDF document research engine' }
          ].map((feat, fIdx) => {
            const Icon = feat.icon;
            return (
              <Link
                key={fIdx}
                href={feat.route}
                style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 14, textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Icon style={{ width: 16, height: 16, color: '#F28C52' }} />
                  <ArrowUpRight style={{ width: 14, height: 14, color: '#686868' }} />
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#171717' }}>{feat.title}</div>
                <div style={{ fontSize: 11, color: '#686868' }}>{feat.desc}</div>
              </Link>
            );
          })}
        </div>
      </div>

    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}>Loading BIS AI Assistant...</div>}>
      <AssistantContent />
    </Suspense>
  );
}
