// Official Bureau of Indian Standards - Firebase Production Integration
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, query, orderBy, limit, deleteDoc 
} from 'firebase/firestore';
import { getDatabase, ref, set, push, onValue, get, child } from 'firebase/database';
import { 
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User 
} from 'firebase/auth';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDUl4wbJ3zShF8t9qahdKiInh7ATgp9YQQ",
  authDomain: "project-2447457501485114884.firebaseapp.com",
  databaseURL: "https://project-2447457501485114884-default-rtdb.firebaseio.com",
  projectId: "project-2447457501485114884",
  storageBucket: "project-2447457501485114884.firebasestorage.app",
  messagingSenderId: "891252027777",
  appId: "1:891252027777:web:e8c398a77451ecb6d33880",
  measurementId: "G-HMP81F21WC"
};

// Initialize Firebase App Instance
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Export Firebase Core Services
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google Provider
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Safe Analytics Initialization
export const analytics = typeof window !== 'undefined' ? isSupported().then(yes => yes ? getAnalytics(app) : null) : null;

// ============================================================================
// 1. GOOGLE AUTHENTICATION & USER PROFILE
// ============================================================================

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    // Store user profile in Firestore
    if (result.user) {
      const userRef = doc(db, 'users', result.user.uid);
      await setDoc(userRef, {
        uid: result.user.uid,
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        lastLogin: new Date().toISOString(),
        role: 'user'
      }, { merge: true });
    }
    return result.user;
  } catch (error: any) {
    console.error("Google Auth Sign In Error:", error);
    throw error;
  }
}

export async function logoutFirebase() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign Out Error:", error);
  }
}

export function subscribeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// ============================================================================
// 2. STANDARDS KNOWLEDGE BASE (FIRESTORE & REALTIME DB)
// ============================================================================

export async function saveCustomStandardToFirebase(standardData: any) {
  try {
    // 1. Save to custom_standards collection
    await addDoc(collection(db, 'custom_standards'), {
      ...standardData,
      createdAt: new Date().toISOString()
    });

    // 2. Also save to main bis_standards document in Firestore
    if (standardData.id) {
      const docRef = doc(db, 'bis_standards', standardData.id);
      await setDoc(docRef, { ...standardData, updatedAt: new Date().toISOString() }, { merge: true });

      // 3. Realtime DB backup
      const rtdbRef = ref(rtdb, 'standards/' + standardData.id);
      await set(rtdbRef, standardData);
    }
  } catch (err) {
    console.warn("Firebase standard save info (using local fallback):", err);
  }
}

export async function fetchStandardsFromFirebase(): Promise<any[]> {
  const standardsMap = new Map<string, any>();

  // 1. Fetch from Firestore bis_standards collection
  try {
    const querySnapshot = await getDocs(collection(db, 'bis_standards'));
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && (data.isNumber || data.id)) {
        standardsMap.set(data.id || data.isNumber, data);
      }
    });
  } catch (err: any) {
    // Silent fallback
  }

  // 2. Fetch from custom_standards collection
  try {
    const customSnapshot = await getDocs(collection(db, 'custom_standards'));
    customSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && (data.isNumber || data.id)) {
        standardsMap.set(data.id || data.isNumber, data);
      }
    });
  } catch (err: any) {
    // Silent fallback
  }

  // 3. Fallback to Realtime DB
  try {
    const dbRef = ref(rtdb);
    const snapshot = await get(child(dbRef, `standards`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.values(data).forEach((item: any) => {
        if (item && (item.isNumber || item.id)) {
          standardsMap.set(item.id || item.isNumber, item);
        }
      });
    }
  } catch (err: any) {
    // Silent fallback
  }

  // 4. Merge any local storage custom standards
  if (typeof window !== 'undefined') {
    try {
      const localCustom = JSON.parse(localStorage.getItem('bis_custom_standards') || '[]');
      localCustom.forEach((item: any) => {
        if (item && (item.isNumber || item.id)) {
          standardsMap.set(item.id || item.isNumber, item);
        }
      });
    } catch (e) {}
  }

  if (standardsMap.size > 0) {
    return Array.from(standardsMap.values());
  }

  return [];
}

export async function seedInitialDatabaseIfEmpty(initialStandards: any[]) {
  try {
    const existing = await fetchStandardsFromFirebase();
    if (existing.length === 0 && initialStandards.length > 0) {
      for (const std of initialStandards) {
        try {
          const docRef = doc(db, 'bis_standards', std.id);
          await setDoc(docRef, { ...std, seededAt: new Date().toISOString() }, { merge: true });
          const rtdbRef = ref(rtdb, 'standards/' + std.id);
          await set(rtdbRef, std);
        } catch (e: any) {
          // Ignore unauthenticated permission warnings
        }
      }
    }
  } catch (err: any) {
    // Silent fallback
  }
}

// ============================================================================
// 3. FEEDBACK & QUERY LOGS (ASSISTANT, SHELL, ADMIN)
// ============================================================================

export async function saveFeedbackLocal(queryText: string, isHelpful: boolean, feedbackText?: string, metadata?: any) {
  const payload = {
    timestamp: new Date().toISOString(),
    query: queryText,
    isHelpful,
    feedbackText: feedbackText || '',
    metadata: metadata || {}
  };

  // Local Backup
  try {
    if (typeof window !== 'undefined') {
      const existing = JSON.parse(localStorage.getItem('bis_feedback_logs') || '[]');
      existing.push(payload);
      localStorage.setItem('bis_feedback_logs', JSON.stringify(existing));
    }
  } catch (e) {
    console.warn("LocalStorage fallback warning", e);
  }

  // Firebase Realtime DB & Firestore Sync
  try {
    await addDoc(collection(db, 'feedback_logs'), payload);
    const rtdbRef = ref(rtdb, 'feedback/' + Date.now());
    await set(rtdbRef, payload);
  } catch (err) {
    console.warn("Firebase feedback sync info:", err);
  }
}

export async function fetchFeedbackLogsFromFirebase(): Promise<any[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'feedback_logs'));
    const logs: any[] = [];
    querySnapshot.forEach((docSnap) => {
      logs.push({ id: docSnap.id, ...docSnap.data() });
    });
    if (logs.length > 0) return logs;
  } catch (e) {
    console.warn("Firestore fetch error, falling back to local/rtdb", e);
  }

  return getFeedbackLogsLocal();
}

export function getFeedbackLogsLocal() {
  try {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('bis_feedback_logs') || '[]');
    }
    return [];
  } catch (e) {
    return [];
  }
}

// ============================================================================
// 4. GAP ANALYSIS AUDIT PERSISTENCE (GAP ANALYZER)
// ============================================================================

export async function saveGapAnalysisToFirebase(gapResult: any) {
  try {
    const payload = {
      ...gapResult,
      createdAt: new Date().toISOString()
    };
    await addDoc(collection(db, 'gap_analysis_audits'), payload);
    const rtdbRef = ref(rtdb, 'gap_audits/' + Date.now());
    await set(rtdbRef, payload);
  } catch (err) {
    console.warn("Firebase gap analysis sync info:", err);
  }
}

export async function fetchGapAnalysisAuditsFromFirebase(): Promise<any[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'gap_analysis_audits'));
    const audits: any[] = [];
    querySnapshot.forEach((docSnap) => {
      audits.push({ id: docSnap.id, ...docSnap.data() });
    });
    return audits;
  } catch (err) {
    console.warn("Failed to fetch gap audits from Firebase:", err);
    return [];
  }
}

// ============================================================================
// 5. EVIDENCE & DOCUMENT AUDIT PERSISTENCE (EVIDENCE VERIFIER)
// ============================================================================

export async function saveEvidenceAuditToFirebase(evidenceResult: any) {
  try {
    const payload = {
      ...evidenceResult,
      auditedAt: new Date().toISOString()
    };
    await addDoc(collection(db, 'evidence_audits'), payload);
    const rtdbRef = ref(rtdb, 'evidence_audits/' + Date.now());
    await set(rtdbRef, payload);
  } catch (err) {
    console.warn("Firebase evidence audit sync info:", err);
  }
}

// ============================================================================
// 6. COMPLIANCE CHECKLIST PROGRESS (CHECKLIST MODULE)
// ============================================================================

export async function saveChecklistProgressToFirebase(standardId: string, items: any[], progressPercent: number) {
  try {
    const payload = {
      standardId,
      items,
      progressPercent,
      updatedAt: new Date().toISOString()
    };
    const docRef = doc(db, 'checklist_progress', standardId);
    await setDoc(docRef, payload, { merge: true });
    const rtdbRef = ref(rtdb, 'checklists/' + standardId);
    await set(rtdbRef, payload);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`bis_checklist_${standardId}`, JSON.stringify(payload));
    }
  } catch (err) {
    console.warn("Firebase checklist save info:", err);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`bis_checklist_${standardId}`, JSON.stringify({ standardId, items, progressPercent, updatedAt: new Date().toISOString() }));
    }
  }
}

export async function fetchChecklistProgressFromFirebase(standardId: string): Promise<any | null> {
  try {
    const docRef = doc(db, 'checklist_progress', standardId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data();
    }
  } catch (err) {
    console.warn("Firebase checklist fetch info:", err);
  }
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem(`bis_checklist_${standardId}`);
    if (local) return JSON.parse(local);
  }
  return null;
}

// ============================================================================
// 7. QCO ALERTS SUBSCRIPTIONS & WATCHLIST (ALERTS MODULE)
// ============================================================================

export async function saveAlertSubscriptionToFirebase(email: string, categories: string[] = ['all']) {
  try {
    const payload = {
      email,
      categories,
      subscribedAt: new Date().toISOString(),
      active: true
    };
    const emailKey = email.replace(/[^a-zA-Z0-9]/g, '_');
    await setDoc(doc(db, 'alert_subscriptions', emailKey), payload, { merge: true });
    const rtdbRef = ref(rtdb, 'alert_subscriptions/' + emailKey);
    await set(rtdbRef, payload);
    return true;
  } catch (err) {
    console.warn("Firebase alert subscription info:", err);
    return false;
  }
}

export async function saveWatchlistToFirebase(userIdOrKey: string, watchlistIds: string[]) {
  try {
    const payload = {
      userIdOrKey,
      watchlistIds,
      updatedAt: new Date().toISOString()
    };
    await setDoc(doc(db, 'user_watchlists', userIdOrKey), payload, { merge: true });
    const rtdbRef = ref(rtdb, 'watchlists/' + userIdOrKey);
    await set(rtdbRef, payload);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bis_watchlist', JSON.stringify(watchlistIds));
    }
  } catch (err) {
    console.warn("Firebase watchlist save info:", err);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bis_watchlist', JSON.stringify(watchlistIds));
    }
  }
}

export async function fetchWatchlistFromFirebase(userIdOrKey: string): Promise<string[]> {
  try {
    const snap = await getDoc(doc(db, 'user_watchlists', userIdOrKey));
    if (snap.exists()) {
      return snap.data()?.watchlistIds || [];
    }
  } catch (err) {}
  if (typeof window !== 'undefined') {
    const local = localStorage.getItem('bis_watchlist');
    if (local) return JSON.parse(local);
  }
  return [];
}

// ============================================================================
// 8. LAB INQUIRIES & QUOTE REQUESTS (LAB FINDER MODULE)
// ============================================================================

export async function saveLabInquiryToFirebase(inquiryData: any) {
  try {
    const payload = {
      ...inquiryData,
      submittedAt: new Date().toISOString(),
      status: 'pending_review'
    };
    await addDoc(collection(db, 'lab_inquiries'), payload);
    const rtdbRef = ref(rtdb, 'lab_inquiries/' + Date.now());
    await set(rtdbRef, payload);
    return true;
  } catch (err) {
    console.warn("Firebase lab inquiry info:", err);
    return false;
  }
}

// ============================================================================
// 9. ASK MY PDF RAG LOGS (ASK-PDF MODULE)
// ============================================================================

export async function saveDocumentQueryToFirebase(queryData: any) {
  try {
    const payload = {
      ...queryData,
      timestamp: new Date().toISOString()
    };
    await addDoc(collection(db, 'document_queries'), payload);
  } catch (err) {
    console.warn("Firebase document query log info:", err);
  }
}

// ============================================================================
// 10. VOICE SEARCH LOGS (VOICE MODULE)
// ============================================================================

export async function saveVoiceQueryToFirebase(voiceData: any) {
  try {
    const payload = {
      ...voiceData,
      timestamp: new Date().toISOString()
    };
    await addDoc(collection(db, 'voice_queries'), payload);
    const rtdbRef = ref(rtdb, 'voice_queries/' + Date.now());
    await set(rtdbRef, payload);
  } catch (err) {
    console.warn("Firebase voice query sync info:", err);
  }
}

// ============================================================================
// 11. STANDARD VERSION COMPARISONS (COMPARATOR MODULE)
// ============================================================================

export async function saveStandardComparisonToFirebase(comparisonData: any) {
  try {
    const payload = {
      ...comparisonData,
      createdAt: new Date().toISOString()
    };
    if (comparisonData.standardBaseId) {
      await setDoc(doc(db, 'standard_comparisons', comparisonData.standardBaseId), payload, { merge: true });
      const rtdbRef = ref(rtdb, 'comparisons/' + comparisonData.standardBaseId);
      await set(rtdbRef, payload);
    } else {
      await addDoc(collection(db, 'standard_comparisons'), payload);
    }
  } catch (err) {
    console.warn("Firebase standard comparison sync info:", err);
  }
}

export async function fetchStandardComparisonsFromFirebase(): Promise<any[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'standard_comparisons'));
    const comparisons: any[] = [];
    querySnapshot.forEach((docSnap) => {
      comparisons.push({ id: docSnap.id, ...docSnap.data() });
    });
    return comparisons;
  } catch (err) {
    console.warn("Firebase comparisons fetch info:", err);
    return [];
  }
}

