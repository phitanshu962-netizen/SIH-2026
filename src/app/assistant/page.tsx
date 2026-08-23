'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Cpu, Send, Shield, CheckCircle2, AlertTriangle, ExternalLink, 
  ThumbsUp, ThumbsDown, BookOpen, Layers, Sparkles, FileText, RefreshCw,
  Search, GitCompare, Wrench, Building2, CheckSquare, Scale, ShieldAlert,
  ArrowRight, ArrowUpRight, Zap
} from 'lucide-react';
import { UserPersona, AssistantAgentResponse, AiActionCard } from '@/lib/types';
import { processAssistantResearchAgent } from '@/lib/data/bisDatabase';
import { saveFeedbackLocal } from '@/lib/firebase';

function AssistantContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [persona, setPersona] = useState<UserPersona>('manufacturer');
  const [researchMode, setResearchMode] = useState<'standard' | 'research' | 'compliance'>('standard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, boolean>>({});

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

  const handleSearch = async (queryText?: string) => {
    const textToRun = queryText || query;
    if (!textToRun.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text: textToRun }]);
    if (!queryText) setQuery('');
    setIsProcessing(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToRun, persona })
      });

      if (res.ok) {
        const data = await res.json();
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
      const response = processAssistantResearchAgent(textToRun, {
        currentRoute: '/assistant',
        currentFeature: 'assistant',
        userRole: persona
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

      {/* ══════════════ 2. RESEARCH CHAT STREAM & ACTION CARDS ══════════════ */}
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
              <div style={{ fontSize: 13.5, lineHeight: 1.6, fontWeight: 500, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</div>

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

                  {/* Feedback Action Buttons */}
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
            placeholder="Ask any compliance question or tell AI to open a feature (e.g., 'open comparator', 'find labs')..."
            style={{ flex: 1, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: '12px 16px', fontSize: 13.5, fontWeight: 600, color: '#171717', outline: 'none' }}
          />
          <button
            onClick={() => handleSearch()}
            style={{ background: '#F28C52', color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '12px 22px', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <Send style={{ width: 15, height: 15 }} />
            <span>Execute Agent</span>
          </button>
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
