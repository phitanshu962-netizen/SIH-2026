/**
 * NiyamAI - Dedicated Ollama Voice Assistant & Navigation Helper
 * Handles Speech-to-Text (STT), Text-to-Speech (TTS), and Voice Navigation Routing
 */

export interface VoiceNavigationResult {
  isNavigation: boolean;
  targetRoute?: string;
  pageName?: string;
  spokenConfirmation?: string;
}

export function parseVoiceNavigation(query: string): VoiceNavigationResult {
  const q = query.toLowerCase().trim();

  if (q.includes('gap analyzer') || q.includes('gap analysis') || q.includes('open gap') || q.includes('show gap')) {
    return {
      isNavigation: true,
      targetRoute: '/gap-analyzer',
      pageName: 'Gap Analyzer',
      spokenConfirmation: 'Opening Gap Analyzer page for BIS clause compliance inspection.'
    };
  }

  if (q.includes('lab finder') || q.includes('laboratory') || q.includes('nabl lab') || q.includes('find lab') || q.includes('testing lab')) {
    return {
      isNavigation: true,
      targetRoute: '/lab-finder',
      pageName: 'NABL Lab Finder',
      spokenConfirmation: 'Opening NABL Accredited Laboratory Finder.'
    };
  }

  if (q.includes('standard catalog') || q.includes('all standards') || q.includes('browse standards') || q.includes('view standards')) {
    return {
      isNavigation: true,
      targetRoute: '/standards',
      pageName: 'Standards Catalog',
      spokenConfirmation: 'Navigating to Official Indian Standards Catalog.'
    };
  }

  if (q.includes('comparator') || q.includes('compare version') || q.includes('version diff') || q.includes('revision diff')) {
    return {
      isNavigation: true,
      targetRoute: '/version-diff',
      pageName: 'Version Comparator',
      spokenConfirmation: 'Opening Standard Version Revision Comparator.'
    };
  }

  if (q.includes('roadmap') || q.includes('compliance roadmap') || q.includes('msme roadmap')) {
    return {
      isNavigation: true,
      targetRoute: '/roadmap',
      pageName: 'Compliance Roadmap',
      spokenConfirmation: 'Opening Step-by-Step BIS Scheme-I & MSME Compliance Roadmap.'
    };
  }

  if (q.includes('alert') || q.includes('notification') || q.includes('hazard')) {
    return {
      isNavigation: true,
      targetRoute: '/alerts',
      pageName: 'Public Alerts',
      spokenConfirmation: 'Opening Statutory & Hazard Public Alerts.'
    };
  }

  if (q.includes('matcher') || q.includes('match product') || q.includes('search product')) {
    return {
      isNavigation: true,
      targetRoute: '/matcher',
      pageName: 'Product Standard Matcher',
      spokenConfirmation: 'Opening Product to Indian Standard Matcher.'
    };
  }

  if (q.includes('admin') || q.includes('ingestion admin')) {
    return {
      isNavigation: true,
      targetRoute: '/admin',
      pageName: 'Ingestion Admin',
      spokenConfirmation: 'Opening Admin Control Center.'
    };
  }

  if (q.includes('voice assistant') || q.includes('voice page') || q.includes('go to voice')) {
    return {
      isNavigation: true,
      targetRoute: '/voice',
      pageName: 'Voice Assistant',
      spokenConfirmation: 'Navigating to Dedicated Hands-Free Voice Assistant.'
    };
  }

  if (q === 'home' || q.includes('go home') || q.includes('dashboard') || q.includes('overview command center')) {
    return {
      isNavigation: true,
      targetRoute: '/',
      pageName: 'Overview Command Center',
      spokenConfirmation: 'Navigating to Main Dashboard Command Center.'
    };
  }

  return { isNavigation: false };
}

export function speakAudioResponse(text: string, onStart?: () => void, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  window.speechSynthesis.cancel();
  
  // Clean up markdown formatting for smooth speech synthesis
  const cleanText = text
    .replace(/[#*`_~]/g, '')
    .replace(/📌|🧪|📄|🚀|⚠️|🏭|🏬|🛒|🚢/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const utterance = new SpeechSynthesisUtterance(cleanText);
  utterance.lang = 'en-IN';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  if (onStart) utterance.onstart = onStart;
  if (onEnd) {
    utterance.onend = onEnd;
    utterance.onerror = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

export function stopAudioPlayback() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}
