'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Cpu, Send, Shield, CheckCircle2, AlertTriangle, ExternalLink, 
  ThumbsUp, ThumbsDown, BookOpen, Layers, Sparkles, FileText, RefreshCw, Mic 
} from 'lucide-react';
import { AIResponsePayload, UserPersona } from '@/lib/types';
import { saveFeedbackLocal } from '@/lib/firebase';

function AssistantContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [persona, setPersona] = useState<UserPersona>('manufacturer');
  const [isLoading, setIsLoading] = useState(false);
  const [responsePayload, setResponsePayload] = useState<AIResponsePayload | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<boolean | null>(null);

  const samplePrompts = [
    "How does IS 302 apply to this product?",
    "Is ISI mark mandatory for motorcycle helmets under IS 4151?",
    "What are the testing parameters for electrical appliances under IS 302-2-3?",
    "CRS registration requirements for electronic goods",
    "Requirements for Fe 500 grade TMT steel bars under IS 1786"
  ];

  const handleSearch = async (queryText?: string) => {
    const textToSearch = queryText || query;
    if (!textToSearch.trim()) return;

    setIsLoading(true);
    setFeedbackSent(null);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: textToSearch, persona })
      });
      const data = await res.json();
      setResponsePayload(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery]);

  const handleFeedback = (isHelpful: boolean) => {
    if (!responsePayload) return;
    saveFeedbackLocal(query, isHelpful);
    setFeedbackSent(isHelpful);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, width: '100%' }}>
      
      {/* Header Bar */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#171717', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Cpu style={{ width: 24, height: 24, color: '#F28C52' }} />
            <span>BIS AI Research Assistant</span>
          </h1>
          <p style={{ fontSize: 13, color: '#686868', margin: 0, maxWidth: 760 }}>
            Source-grounded research assistant providing clause-level citations and statutory logic.
          </p>
        </div>

        {/* Persona Selector */}
        <div style={{ display: 'flex', gap: 4, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: 3 }}>
          {(['manufacturer', 'msme', 'consumer', 'importer'] as UserPersona[]).map((p) => (
            <button
              key={p}
              onClick={() => setPersona(p)}
              style={{
                background: persona === p ? '#F28C52' : 'transparent',
                color: persona === p ? '#FFFFFF' : '#686868',
                border: 'none', borderRadius: 4, padding: '4px 10px',
                fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize', cursor: 'pointer'
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Query Input Box */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Ask about Indian Standards, mandatory QCOs, clause requirements, or lab testing..."
            style={{
              flex: 1, padding: '12px 16px', background: 'transparent',
              border: 'none', borderBottom: '2px solid #F28C52', borderRadius: 0,
              fontSize: 14, color: '#242424', outline: 'none'
            }}
          />
          <button
            onClick={() => handleSearch()}
            disabled={isLoading || !query.trim()}
            style={{
              background: '#F28C52', color: '#FFFFFF',
              border: 'none', borderRadius: 8,
              padding: '12px 24px', fontSize: 14, fontWeight: 700,
              cursor: isLoading || !query.trim() ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8
            }}
          >
            <Send style={{ width: 16, height: 16 }} />
            <span>{isLoading ? 'Searching Gazette...' : 'Ask BIS AI'}</span>
          </button>
          <button
            onClick={() => { window.location.href = '/voice'; }}
            title="Voice Research Assistant"
            style={{
              background: '#FFFCF8', color: '#F28C52',
              border: '1px solid #E8E2DC', borderRadius: 8,
              padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <Mic style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Suggested Queries */}
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#686868' }}>Suggested:</span>
          {samplePrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(prompt);
                handleSearch(prompt);
              }}
              style={{
                background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 4,
                padding: '4px 10px', fontSize: 12, color: '#242424', cursor: 'pointer'
              }}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Response Display with Exposed Source Citations */}
      {responsePayload && (
        <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 10, padding: 24, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Main Answer */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              BIS AI GROUNDED ANSWER
            </div>
            <p style={{ fontSize: 14.5, color: '#242424', lineHeight: 1.7, margin: 0 }}>
              {responsePayload.summaryExplanation}
            </p>
          </div>

          {/* Sources Section */}
          <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen style={{ width: 15, height: 15, color: '#F28C52' }} />
              <span>Grounding Sources &amp; Evidence</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {responsePayload.citations?.map((cit, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: '10px 14px', fontSize: 12.5 }}>
                  <div>
                    <strong style={{ color: '#171717' }}>{cit.standardNumber}</strong> • Clause {cit.clause} ({cit.snippet.slice(0, 50)}...)
                  </div>
                  <a
                    href={cit.officialSource || '#'}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#E9783F', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <span>View Source</span>
                    <ExternalLink style={{ width: 12, height: 12 }} />
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Feedback buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #E8E2DC', fontSize: 12, color: '#686868' }}>
            <span>Was this answer grounded and accurate?</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleFeedback(true)}
                style={{ background: feedbackSent === true ? '#EBF4EE' : '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: feedbackSent === true ? '#4F7D5A' : '#686868' }}
              >
                <ThumbsUp style={{ width: 13, height: 13 }} />
                <span>Yes</span>
              </button>
              <button
                onClick={() => handleFeedback(false)}
                style={{ background: feedbackSent === false ? '#FDF2F0' : '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 4, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: feedbackSent === false ? '#B85C52' : '#686868' }}
              >
                <ThumbsDown style={{ width: 13, height: 13 }} />
                <span>No</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}

export default function AssistantPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: '#686868' }}>Loading BIS AI Assistant...</div>}>
      <AssistantContent />
    </Suspense>
  );
}
