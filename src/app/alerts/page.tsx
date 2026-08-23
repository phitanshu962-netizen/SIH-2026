'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Bell, AlertCircle, Calendar, ExternalLink, Shield, Check, Mail, Filter, ChevronRight,
  Bookmark, BookmarkCheck, Clock, GitCompare, FileText, CheckSquare, Layers, Sparkles,
  Search, ShieldAlert, Scale, ArrowRight, Eye, AlertTriangle, ArrowUpRight, Zap, Info, Building2, Sliders
} from 'lucide-react';
import { getStandardAlerts } from '@/lib/data/bisDatabase';
import { saveAlertSubscriptionToFirebase, saveWatchlistToFirebase, fetchWatchlistFromFirebase } from '@/lib/firebase';
import { StandardAlert } from '@/lib/types';

export default function StandardAlertsPage() {
  const [alerts, setAlerts] = useState<StandardAlert[]>(() => getStandardAlerts());
  
  // State Management
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedClassification, setSelectedClassification] = useState<string>('all');
  const [selectedUrgency, setSelectedUrgency] = useState<string>('all');
  const [selectedStage, setSelectedStage] = useState<string>('all');
  const [showWatchlistOnly, setShowWatchlistOnly] = useState<boolean>(false);
  const [watchlistIds, setWatchlistIds] = useState<string[]>(['alert-is-302-2-3', 'alert-is-4151']);

  useEffect(() => {
    setAlerts(getStandardAlerts());

    // Fetch user watchlist from Firebase
    fetchWatchlistFromFirebase('default_user').then((saved) => {
      if (saved && saved.length > 0) {
        setWatchlistIds(saved);
      }
    });

    const handleUpdate = () => {
      setAlerts(getStandardAlerts());
    };

    window.addEventListener('bis_standards_updated', handleUpdate);
    return () => window.removeEventListener('bis_standards_updated', handleUpdate);
  }, []);
  
  // Email subscription state
  const [subscribed, setSubscribed] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');

  // Selected Alert for Detail / Graph / Evidence Modal
  const [activeModalAlert, setActiveModalAlert] = useState<StandardAlert | null>(null);
  const [expandedGraphAlertId, setExpandedGraphAlertId] = useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      await saveAlertSubscriptionToFirebase(email, ['all']);
    }
  };

  const toggleWatchlist = (alertId: string) => {
    setWatchlistIds(prev => {
      const updated = prev.includes(alertId) ? prev.filter(id => id !== alertId) : [...prev, alertId];
      saveWatchlistToFirebase('default_user', updated);
      return updated;
    });
  };

  // Filter Alerts
  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = 
      !searchQuery ||
      alert.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.isNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (alert.affectedProducts && alert.affectedProducts.some(p => p.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesClassification = selectedClassification === 'all' || alert.classification === selectedClassification;
    const matchesUrgency = selectedUrgency === 'all' || alert.urgency === selectedUrgency;
    const matchesStage = selectedStage === 'all' || alert.lifecycleStage === selectedStage;
    const matchesWatchlist = !showWatchlistOnly || watchlistIds.includes(alert.id);

    return matchesSearch && matchesClassification && matchesUrgency && matchesStage && matchesWatchlist;
  });

  const criticalCount = alerts.filter(a => a.urgency === 'Critical').length;
  const actionReqCount = alerts.filter(a => a.classification === 'Action Required').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, width: '100%' }}>
      
      {/* ══════════════ 1. HERO HEADER & REGULATORY INTELLIGENCE METRICS ══════════════ */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid #E8E2DC',
        borderRadius: 12,
        padding: '24px 28px',
        boxShadow: '0 2px 8px rgba(40,30,20,0.03)',
        display: 'flex', flexDirection: 'column', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#E9783F', background: '#FFF1E8', border: '1px solid #F4C4A5', padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Bell style={{ width: 12, height: 12, color: '#F28C52' }} />
              DPIIT &amp; BIS Gazette Ingestion Stream
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#686868' }}>
              Real-Time Statutory QCO Intelligence
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
              style={{
                background: showWatchlistOnly ? '#FFF1E8' : '#FFFCF8',
                color: showWatchlistOnly ? '#171717' : '#686868',
                border: `1px solid ${showWatchlistOnly ? '#F4C4A5' : '#E8E2DC'}`,
                borderLeft: showWatchlistOnly ? '3px solid #F28C52' : '1px solid #E8E2DC',
                borderRadius: 6, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 6
              }}
            >
              <Bookmark style={{ width: 13, height: 13, color: showWatchlistOnly ? '#F28C52' : '#686868' }} />
              <span>My Watchlist ({watchlistIds.length})</span>
            </button>

            <Link href="/ask-pdf" style={{ background: '#F28C52', color: '#FFFFFF', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>Ask My PDF</span>
              <ChevronRight style={{ width: 13, height: 13 }} />
            </Link>
          </div>
        </div>

        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#171717', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <ShieldAlert style={{ width: 24, height: 24, color: '#F28C52' }} />
            <span>QCO Change Alerts &amp; Statutory Regulatory Feed</span>
          </h1>
          <p style={{ fontSize: 13.5, color: '#686868', margin: 0, maxWidth: 880, lineHeight: 1.6 }}>
            Track live Quality Control Orders (QCO) published by the Ministry of Consumer Affairs &amp; DPIIT. Monitor enforcement deadlines, diff changes, MSME grace period exemptions, and product impact graphs.
          </p>
        </div>

        {/* Intelligence Metrics KPI Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, paddingTop: 12, borderTop: '1px solid #E8E2DC' }}>
          <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#686868', textTransform: 'uppercase' }}>TOTAL ACTIVE QCOs</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#171717', marginTop: 2 }}>{alerts.length} Gazette Orders</div>
          </div>

          <div style={{ background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 8, padding: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>ACTION REQUIRED</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#171717', marginTop: 2 }}>{actionReqCount} Immediate Audits</div>
          </div>

          <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#686868', textTransform: 'uppercase' }}>CRITICAL DEADLINES</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#F28C52', marginTop: 2 }}>{criticalCount} Active Orders</div>
          </div>

          <div style={{ background: '#EBF4EE', border: '1px solid #B5D5BF', borderRadius: 8, padding: 12 }}>
            <span style={{ fontSize: 10.5, fontWeight: 800, color: '#4F7D5A', textTransform: 'uppercase' }}>MSME GRACE PERIODS</span>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#171717', marginTop: 2 }}>Active Clause 3(a)</div>
          </div>
        </div>
      </div>

      {/* ══════════════ 2. INSTANT EMAIL ALERT SETUP BAR ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: '16px 20px', boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Bell style={{ width: 22, height: 22, color: '#F28C52', flexShrink: 0 }} />
          <div>
            <h3 style={{ fontSize: 13.5, fontWeight: 800, color: '#171717', margin: 0 }}>Subscribe to Real-Time Industry QCO Alerts</h3>
            <p style={{ fontSize: 12, color: '#686868', margin: 0 }}>Receive instant email notifications whenever DPIIT or BIS publishes a new QCO amendment in your sector.</p>
          </div>
        </div>

        {subscribed ? (
          <div style={{ background: '#EBF4EE', border: '1px solid #B5D5BF', color: '#4F7D5A', fontSize: 12, fontWeight: 800, padding: '6px 14px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Check style={{ width: 14, height: 14 }} />
            <span>Subscribed with {email}! Watchlist alerts active.</span>
          </div>
        ) : (
          <form onSubmit={handleSubscribe} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', maxWidth: 420 }}>
            <input 
              type="email" 
              required
              placeholder="Enter your work email address..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ flex: 1, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: '7px 12px', fontSize: 12, fontWeight: 600, color: '#242424', outline: 'none' }}
            />
            <button type="submit" style={{ background: '#F28C52', color: '#FFFFFF', border: 'none', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              Subscribe Free
            </button>
          </form>
        )}
      </div>

      {/* ══════════════ 3. MULTI-TIER SEARCH & FILTER BAR ══════════════ */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, padding: 18, boxShadow: '0 2px 8px rgba(40,30,20,0.03)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
            <Search style={{ width: 15, height: 15, color: '#F28C52', position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search QCO alerts by standard (e.g. IS 302), product, or Gazette S.O. number..."
              style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, fontSize: 12.5, fontWeight: 600, color: '#242424', outline: 'none' }}
            />
          </div>

          {/* Classification Filter */}
          <select
            value={selectedClassification}
            onChange={(e) => setSelectedClassification(e.target.value)}
            style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#171717', outline: 'none' }}
          >
            <option value="all">All Classifications</option>
            <option value="Action Required">Action Required</option>
            <option value="Review">Review Needed</option>
            <option value="Informational">Informational</option>
          </select>

          {/* Urgency Filter */}
          <select
            value={selectedUrgency}
            onChange={(e) => setSelectedUrgency(e.target.value)}
            style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#171717', outline: 'none' }}
          >
            <option value="all">All Urgency Levels</option>
            <option value="Critical">Critical</option>
            <option value="Important">Important</option>
            <option value="Info">Info</option>
          </select>

          {/* Lifecycle Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: '8px 12px', fontSize: 12, fontWeight: 700, color: '#171717', outline: 'none' }}
          >
            <option value="all">All Lifecycle Stages</option>
            <option value="Draft for Comment">Draft for Comment</option>
            <option value="Final QCO Issued">Final QCO Issued</option>
            <option value="Enforced">Enforced</option>
          </select>
        </div>
      </div>

      {/* ══════════════ 4. LIVE GAZETTE ALERTS FEED ══════════════ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#171717', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle style={{ width: 16, height: 16, color: '#F28C52' }} />
            <span>Active Gazette Notifications &amp; Regulatory Event Stream ({filteredAlerts.length})</span>
          </h2>

          {showWatchlistOnly && (
            <span style={{ fontSize: 11, fontWeight: 800, color: '#F28C52', background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 4, padding: '2px 8px' }}>
              Showing Pinned Watchlist
            </span>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {filteredAlerts.map(alert => {
            const isPinned = watchlistIds.includes(alert.id);
            const isGraphExpanded = expandedGraphAlertId === alert.id;

            return (
              <div
                key={alert.id}
                style={{
                  background: '#FFFFFF',
                  border: `1px solid ${isPinned ? '#F4C4A5' : '#E8E2DC'}`,
                  borderLeft: `5px solid ${alert.classification === 'Action Required' ? '#F28C52' : alert.urgency === 'Critical' ? '#B85C52' : '#686868'}`,
                  borderRadius: 10,
                  padding: 22,
                  boxShadow: '0 2px 8px rgba(40,30,20,0.03)',
                  display: 'flex', flexDirection: 'column', gap: 16
                }}
              >

                {/* Card Header Top Stripe */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    
                    {/* Urgency Badge */}
                    <span style={{
                      fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4,
                      background: alert.urgency === 'Critical' ? '#B85C52' : alert.urgency === 'Important' ? '#C88732' : '#686868',
                      color: '#FFFFFF'
                    }}>
                      {alert.urgency}
                    </span>

                    {/* Classification Badge */}
                    <span style={{
                      fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 4,
                      background: alert.classification === 'Action Required' ? '#FFF1E8' : '#FFFCF8',
                      color: alert.classification === 'Action Required' ? '#E9783F' : '#171717',
                      border: `1px solid ${alert.classification === 'Action Required' ? '#F4C4A5' : '#E8E2DC'}`
                    }}>
                      {alert.classification}
                    </span>

                    {/* Alert Type */}
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#171717', background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 4, padding: '2px 8px' }}>
                      {alert.alertType}
                    </span>

                    {/* Standard Number */}
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#F28C52' }}>
                      {alert.isNumber}
                    </span>
                  </div>

                  {/* Right Header Controls (Countdown & Watchlist Pin) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    
                    {/* Live Deadline Countdown Meter */}
                    <div style={{ fontSize: 11.5, fontWeight: 800, color: '#E9783F', background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 6, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock style={{ width: 13, height: 13 }} />
                      <span>⏱ {alert.daysRemaining} Days Remaining</span>
                    </div>

                    {/* Pin to Watchlist Button */}
                    <button
                      onClick={() => toggleWatchlist(alert.id)}
                      style={{
                        background: isPinned ? '#FFF1E8' : '#FFFCF8',
                        color: isPinned ? '#F28C52' : '#686868',
                        border: `1px solid ${isPinned ? '#F4C4A5' : '#E8E2DC'}`,
                        borderRadius: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
                      }}
                    >
                      {isPinned ? <BookmarkCheck style={{ width: 13, height: 13, color: '#F28C52' }} /> : <Bookmark style={{ width: 13, height: 13 }} />}
                      <span>{isPinned ? 'Pinned' : 'Pin'}</span>
                    </button>
                  </div>
                </div>

                {/* Title & Summary */}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#171717', margin: '0 0 4px' }}>
                    {alert.title}
                  </h3>
                  <p style={{ fontSize: 12.5, color: '#686868', margin: 0, lineHeight: 1.5 }}>
                    {alert.summary}
                  </p>
                </div>

                {/* TIER 1: "WHAT CHANGED?" DIFF BOX */}
                {alert.whatChangedSummary && (
                  <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 800, color: '#171717', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <GitCompare style={{ width: 13, height: 13, color: '#F28C52' }} />
                      WHAT CHANGED? (REGULATORY RULE DIFF)
                    </span>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10, fontSize: 12 }}>
                      <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#686868', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>Previous Status</span>
                        <span style={{ color: '#686868' }}>{alert.whatChangedSummary.previousRule}</span>
                      </div>

                      <div style={{ background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 6, padding: 10 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>New Mandatory Regulation</span>
                        <span style={{ color: '#171717', fontWeight: 700 }}>{alert.whatChangedSummary.newMandatoryRule}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TIER 2: EXEMPTION DETECTION (MSME / EXPORT / R&D) */}
                {alert.exemptions && alert.exemptions.length > 0 && (
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#686868', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                      GAZETTE EXEMPTION CLAUSES IDENTIFIED
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                      {alert.exemptions.map((ex, idx) => (
                        <div key={idx} style={{ background: '#EBF4EE', border: '1px solid #B5D5BF', borderRadius: 6, padding: 10, fontSize: 11.5 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontWeight: 800, color: '#4F7D5A' }}>{ex.category}</span>
                            <span style={{ fontSize: 9.5, fontWeight: 800, background: '#FFFFFF', color: '#4F7D5A', padding: '1px 5px', borderRadius: 4 }}>{ex.gazetteClause}</span>
                          </div>
                          <span style={{ color: '#242424', fontSize: 11 }}>{ex.condition}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TIER 2: QCO &rarr; STANDARD &rarr; PRODUCT IMPACT GRAPH (COLLAPSIBLE) */}
                <div>
                  <button
                    onClick={() => setExpandedGraphAlertId(isGraphExpanded ? null : alert.id)}
                    style={{ background: 'transparent', border: 'none', fontSize: 12, fontWeight: 700, color: '#F28C52', cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Layers style={{ width: 14, height: 14 }} />
                    <span>{isGraphExpanded ? 'Hide QCO Impact Graph' : 'View QCO → Standard → Product Impact Graph'}</span>
                  </button>

                  {isGraphExpanded && alert.impactGraph && (
                    <div style={{ marginTop: 10, background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 8, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: '#171717', textTransform: 'uppercase' }}>STATUTORY ENTITY DEPENDENCY GRAPH</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                        <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#171717', whiteSpace: 'nowrap' }}>
                          🏛️ {alert.impactGraph.ministry}
                        </div>
                        <ArrowRight style={{ width: 14, height: 14, color: '#F28C52', flexShrink: 0 }} />
                        <div style={{ background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 6, padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#E9783F', whiteSpace: 'nowrap' }}>
                          📜 {alert.impactGraph.qcoNotification}
                        </div>
                        <ArrowRight style={{ width: 14, height: 14, color: '#F28C52', flexShrink: 0 }} />
                        <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 6, padding: '8px 12px', fontSize: 11, fontWeight: 800, color: '#F28C52', whiteSpace: 'nowrap' }}>
                          📘 {alert.impactGraph.standardNumber}
                        </div>
                        <ArrowRight style={{ width: 14, height: 14, color: '#F28C52', flexShrink: 0 }} />
                        <div style={{ background: '#EBF4EE', border: '1px solid #B5D5BF', borderRadius: 6, padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#4F7D5A', whiteSpace: 'nowrap' }}>
                          📦 {alert.impactGraph.affectedProducts.join(', ')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Footer: Source Metadata & Cross-Module Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 12, borderTop: '1px solid #E8E2DC' }}>
                  <div style={{ fontSize: 11.5, color: '#686868' }}>
                    Gazette Ref: <strong style={{ color: '#171717' }}>{alert.officialGazetteRef}</strong> | Issued by <strong style={{ color: '#171717' }}>{alert.issuingAuthority}</strong>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    
                    <button
                      onClick={() => setActiveModalAlert(alert)}
                      style={{ background: '#FFF1E8', color: '#E9783F', border: '1px solid #F4C4A5', borderRadius: 6, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <Eye style={{ width: 13, height: 13 }} />
                      <span>Official Evidence Panel</span>
                    </button>

                    <Link
                      href="/gap-analyzer"
                      style={{ background: '#FFFCF8', color: '#242424', border: '1px solid #E8E2DC', borderRadius: 6, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <span>Analyze Gap</span>
                      <ArrowUpRight style={{ width: 13, height: 13 }} />
                    </Link>

                    <Link
                      href="/testing-mapper"
                      style={{ background: '#FFFCF8', color: '#242424', border: '1px solid #E8E2DC', borderRadius: 6, padding: '6px 12px', fontSize: 11.5, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}
                    >
                      <span>Testing Mapper</span>
                      <ArrowUpRight style={{ width: 13, height: 13 }} />
                    </Link>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════ OFFICIAL EVIDENCE & GAZETTE SOURCE MODAL (TIER 3) ══════════════ */}
      {activeModalAlert && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#FFFFFF', border: '1px solid #E8E2DC', borderRadius: 12, maxWidth: 640, width: '100%', padding: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #E8E2DC', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Shield style={{ width: 18, height: 18, color: '#F28C52' }} />
                <h3 style={{ fontSize: 15, fontWeight: 800, color: '#171717', margin: 0 }}>Official Gazette Evidence &amp; Cryptographic Source Panel</h3>
              </div>
              <button onClick={() => setActiveModalAlert(null)} style={{ background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer', color: '#686868' }}>✕</button>
            </div>

            <div>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase' }}>GAZETTE S.O. ORDER</span>
              <h4 style={{ fontSize: 16, fontWeight: 800, color: '#171717', margin: '2px 0 6px' }}>{activeModalAlert.title}</h4>
              <p style={{ fontSize: 12.5, color: '#686868', margin: 0, lineHeight: 1.5 }}>{activeModalAlert.summary}</p>
            </div>

            {/* AI RAG Impact Summary */}
            <div style={{ background: '#FFF1E8', border: '1px solid #F4C4A5', borderRadius: 8, padding: 14 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#E9783F', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>AI RAG IMPACT ANALYSIS</span>
              <p style={{ fontSize: 12, color: '#171717', margin: 0, lineHeight: 1.5, fontWeight: 600 }}>
                {activeModalAlert.aiImpactSummary}
              </p>
            </div>

            {/* Counterfactual Risk */}
            <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderLeft: '4px solid #B85C52', borderRadius: 8, padding: 14 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: '#B85C52', textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>PENALTY COUNTERFACTUAL RISK (BIS ACT SEC 29)</span>
              <p style={{ fontSize: 12, color: '#242424', margin: 0, lineHeight: 1.5 }}>
                {activeModalAlert.counterfactualRisk}
              </p>
            </div>

            {/* Cryptographic Hash Metadata */}
            <div style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: 12, fontSize: 11, color: '#686868', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>Official Ref: <strong style={{ color: '#171717' }}>{activeModalAlert.officialGazetteRef}</strong></div>
              <div>Issuing Authority: <strong style={{ color: '#171717' }}>{activeModalAlert.issuingAuthority}</strong></div>
              <div>SHA-256 Hash: <code style={{ color: '#171717', fontSize: 10 }}>{activeModalAlert.verificationHash}</code></div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #E8E2DC' }}>
              <button
                onClick={() => setActiveModalAlert(null)}
                style={{ background: '#FFFCF8', border: '1px solid #E8E2DC', borderRadius: 6, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: '#242424', cursor: 'pointer' }}
              >
                Close Panel
              </button>

              <a
                href={activeModalAlert.gazettePdfUrl || 'https://www.services.bis.gov.in'}
                target="_blank"
                rel="noreferrer"
                style={{ background: '#F28C52', color: '#FFFFFF', borderRadius: 6, padding: '7px 16px', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span>Read Official PDF Gazette</span>
                <ExternalLink style={{ width: 13, height: 13 }} />
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
