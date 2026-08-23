// Official Bureau of Indian Standards - Firebase Production Integration
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, query, orderBy, limit, deleteDoc, where 
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

function sanitizeRtdbKey(key: string): string {
  if (!key) return '';
  return key.replace(/[\.\#\$\/\[\]\:\s]/g, '_');
}

export async function saveCustomStandardToFirebase(standardData: any) {
  try {
    const stdId = standardData.id || `is-custom-${Date.now()}`;
    const payload = {
      ...standardData,
      id: stdId,
      updatedAt: new Date().toISOString()
    };

    // 1. Save to custom_standards collection with standard ID
    await setDoc(doc(db, 'custom_standards', stdId), payload, { merge: true });

    // 2. Also save to main bis_standards document in Firestore
    await setDoc(doc(db, 'bis_standards', stdId), payload, { merge: true });

    // 3. Realtime DB backup with sanitized key
    const safeKey = sanitizeRtdbKey(stdId);
    if (safeKey) {
      const rtdbRef = ref(rtdb, 'standards/' + safeKey);
      await set(rtdbRef, payload);
    }

    // 4. Remove from deleted_standards registry if it was previously deleted
    try {
      await deleteDoc(doc(db, 'deleted_standards', stdId));
      if (safeKey) {
        await deleteDoc(doc(db, 'deleted_standards', safeKey));
        const delRtdbRef = ref(rtdb, 'deleted_standards/' + safeKey);
        await set(delRtdbRef, null);
      }
      if (typeof window !== 'undefined') {
        try {
          const stored: string[] = JSON.parse(localStorage.getItem('bis_deleted_standards') || '[]');
          const filtered = stored.filter((s: string) => s !== stdId && s !== safeKey && s !== standardData.isNumber);
          localStorage.setItem('bis_deleted_standards', JSON.stringify(filtered));
        } catch (e) {}
      }
    } catch (e) {}
  } catch (err) {
    console.warn("Firebase standard save error:", err);
  }
}

export async function deleteStandardFromFirebase(standardId: string, isNumber?: string) {
  try {
    if (!standardId && !isNumber) return;

    const rawTargets = [standardId, isNumber].filter(Boolean) as string[];
    const idsToDelete = new Set<string>();

    rawTargets.forEach(t => {
      idsToDelete.add(t);
      idsToDelete.add(t.toLowerCase());
      idsToDelete.add(t.replace(/[\s:_()-]/g, '').toLowerCase());
      idsToDelete.add(sanitizeRtdbKey(t));
      idsToDelete.add(sanitizeRtdbKey(t).toLowerCase());
    });

    const safeKey = sanitizeRtdbKey(standardId || '');
    const safeIsNumKey = isNumber ? sanitizeRtdbKey(isNumber) : '';

    // Helper to check match against targets
    const isTargetMatch = (val?: string) => {
      if (!val) return false;
      const clean = val.trim().toLowerCase();
      const numClean = clean.replace(/[\s:_()-]/g, '');
      return idsToDelete.has(val) || idsToDelete.has(clean) || idsToDelete.has(numClean);
    };

    // 1. Delete from bis_standards collection (direct ID and all matching queries)
    try {
      if (standardId) await deleteDoc(doc(db, 'bis_standards', standardId));
      if (safeKey && safeKey !== standardId) await deleteDoc(doc(db, 'bis_standards', safeKey));
      if (isNumber) {
        await deleteDoc(doc(db, 'bis_standards', isNumber));
        if (safeIsNumKey) await deleteDoc(doc(db, 'bis_standards', safeIsNumKey));
      }

      const bisSnapshot = await getDocs(collection(db, 'bis_standards'));
      for (const docItem of bisSnapshot.docs) {
        const data = docItem.data();
        if (
          docItem.id === standardId ||
          isTargetMatch(docItem.id) ||
          isTargetMatch(data?.id) ||
          isTargetMatch(data?.isNumber) ||
          (isNumber && data?.isNumber && isTargetMatch(data.isNumber))
        ) {
          await deleteDoc(docItem.ref);
        }
      }
    } catch (e) {
      console.warn("bis_standards delete error:", e);
    }

    // 2. Delete from custom_standards collection (direct ID and all matching queries)
    try {
      if (standardId) await deleteDoc(doc(db, 'custom_standards', standardId));
      if (safeKey && safeKey !== standardId) await deleteDoc(doc(db, 'custom_standards', safeKey));
      if (isNumber) {
        await deleteDoc(doc(db, 'custom_standards', isNumber));
        if (safeIsNumKey) await deleteDoc(doc(db, 'custom_standards', safeIsNumKey));
      }

      const customSnapshot = await getDocs(collection(db, 'custom_standards'));
      for (const docItem of customSnapshot.docs) {
        const data = docItem.data();
        if (
          docItem.id === standardId ||
          isTargetMatch(docItem.id) ||
          isTargetMatch(data?.id) ||
          isTargetMatch(data?.isNumber) ||
          (isNumber && data?.isNumber && isTargetMatch(data.isNumber))
        ) {
          await deleteDoc(docItem.ref);
        }
      }
    } catch (e) {
      console.warn("custom_standards delete error:", e);
    }

    // 3. Delete from generic standards collection if exists
    try {
      if (standardId) await deleteDoc(doc(db, 'standards', standardId));
      if (safeKey && safeKey !== standardId) await deleteDoc(doc(db, 'standards', safeKey));
      if (isNumber) await deleteDoc(doc(db, 'standards', isNumber));
    } catch (e) {}

    // 4. Delete from Realtime DB (full key and child node scan)
    try {
      if (safeKey) {
        const rtdbRef = ref(rtdb, 'standards/' + safeKey);
        await set(rtdbRef, null);
      }
      if (safeIsNumKey && safeIsNumKey !== safeKey) {
        const rtdbNumRef = ref(rtdb, 'standards/' + safeIsNumKey);
        await set(rtdbNumRef, null);
      }

      // Deep scan all RTDB standards keys to delete matching items
      const dbRef = ref(rtdb);
      const rtdbSnap = await get(child(dbRef, 'standards'));
      if (rtdbSnap.exists()) {
        const allRtdbStandards = rtdbSnap.val();
        for (const [key, val] of Object.entries(allRtdbStandards as Record<string, any>)) {
          if (
            isTargetMatch(key) ||
            isTargetMatch(val?.id) ||
            isTargetMatch(val?.isNumber)
          ) {
            await set(ref(rtdb, 'standards/' + key), null);
          }
        }
      }
    } catch (e) {
      console.warn("Realtime DB standard delete error:", e);
    }

    // 5. Track in deleted_standards registry in Firestore, RTDB, and LocalStorage
    try {
      const tombstoneData = {
        id: standardId || isNumber || '',
        isNumber: isNumber || standardId || '',
        deletedAt: new Date().toISOString()
      };

      const docId = safeKey || standardId || 'del_' + Date.now();
      await setDoc(doc(db, 'deleted_standards', docId), tombstoneData, { merge: true });
      if (isNumber && safeIsNumKey && safeIsNumKey !== docId) {
        await setDoc(doc(db, 'deleted_standards', safeIsNumKey), tombstoneData, { merge: true });
      }

      if (safeKey) {
        const delRtdbRef = ref(rtdb, 'deleted_standards/' + safeKey);
        await set(delRtdbRef, tombstoneData);
      }
      if (safeIsNumKey && safeIsNumKey !== safeKey) {
        const delRtdbNumRef = ref(rtdb, 'deleted_standards/' + safeIsNumKey);
        await set(delRtdbNumRef, tombstoneData);
      }

      // Mark that system has been seeded so empty db doesn't trigger auto-reseed
      try {
        await setDoc(doc(db, 'system_meta', 'init'), { seeded: true, updatedAt: new Date().toISOString() }, { merge: true });
        await set(ref(rtdb, 'system_meta/seeded'), true);
      } catch (e) {}

      if (typeof window !== 'undefined') {
        try {
          const stored: string[] = JSON.parse(localStorage.getItem('bis_deleted_standards') || '[]');
          const toAdd = [
            standardId, standardId?.toLowerCase(),
            isNumber, isNumber?.toLowerCase(),
            safeKey, safeIsNumKey
          ].filter(Boolean) as string[];
          const merged = Array.from(new Set([...stored, ...toAdd]));
          localStorage.setItem('bis_deleted_standards', JSON.stringify(merged));
        } catch (e) {}
      }
    } catch (e) {
      console.warn("Tombstone registry write error:", e);
    }
  } catch (err) {
    console.warn("Firebase standard delete top-level error:", err);
  }
}

export async function fetchStandardsFromFirebase(): Promise<any[]> {
  const standardsMap = new Map<string, any>();
  const deletedIds = new Set<string>();

  // 0. Fetch deleted standards set from LocalStorage first for instant consistency
  if (typeof window !== 'undefined') {
    try {
      const localDeleted: string[] = JSON.parse(localStorage.getItem('bis_deleted_standards') || '[]');
      localDeleted.forEach(id => {
        if (id) {
          deletedIds.add(id);
          deletedIds.add(id.toLowerCase());
          deletedIds.add(id.replace(/[\s:_()-]/g, '').toLowerCase());
        }
      });
    } catch (e) {}
  }

  // Fetch deleted standards set from Firestore
  try {
    const delSnapshot = await getDocs(collection(db, 'deleted_standards'));
    delSnapshot.forEach((docSnap) => {
      deletedIds.add(docSnap.id);
      deletedIds.add(docSnap.id.toLowerCase());
      deletedIds.add(docSnap.id.replace(/[\s:_()-]/g, '').toLowerCase());
      const data = docSnap.data();
      if (data?.id) {
        deletedIds.add(data.id);
        deletedIds.add(String(data.id).toLowerCase());
        deletedIds.add(String(data.id).replace(/[\s:_()-]/g, '').toLowerCase());
      }
      if (data?.isNumber) {
        deletedIds.add(data.isNumber);
        deletedIds.add(String(data.isNumber).toLowerCase());
        deletedIds.add(String(data.isNumber).replace(/[\s:_()-]/g, '').toLowerCase());
      }
    });
  } catch (e) {}

  // Fetch deleted standards set from RTDB
  try {
    const dbRef = ref(rtdb);
    const delRtdbSnap = await get(child(dbRef, 'deleted_standards'));
    if (delRtdbSnap.exists()) {
      const data = delRtdbSnap.val();
      Object.entries(data).forEach(([key, val]: [string, any]) => {
        deletedIds.add(key);
        deletedIds.add(key.toLowerCase());
        deletedIds.add(key.replace(/[\s:_()-]/g, '').toLowerCase());
        if (val?.id) {
          deletedIds.add(val.id);
          deletedIds.add(String(val.id).toLowerCase());
          deletedIds.add(String(val.id).replace(/[\s:_()-]/g, '').toLowerCase());
        }
        if (val?.isNumber) {
          deletedIds.add(val.isNumber);
          deletedIds.add(String(val.isNumber).toLowerCase());
          deletedIds.add(String(val.isNumber).replace(/[\s:_()-]/g, '').toLowerCase());
        }
      });
    }
  } catch (e) {}

  const isExcluded = (id?: string, isNum?: string, docId?: string) => {
    if (!id && !isNum && !docId) return false;
    const testIds = [id, isNum, docId].filter(Boolean) as string[];
    for (const t of testIds) {
      const clean = t.toLowerCase();
      const numClean = clean.replace(/[\s:_()-]/g, '');
      if (deletedIds.has(t) || deletedIds.has(clean) || deletedIds.has(numClean)) {
        return true;
      }
    }
    return false;
  };

  // 1. Fetch from Firestore bis_standards collection
  try {
    const querySnapshot = await getDocs(collection(db, 'bis_standards'));
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = data?.id || docSnap.id;
      const isNum = data?.isNumber || '';

      if (isExcluded(id, isNum, docSnap.id)) {
        // Self-healing cleanup
        deleteDoc(docSnap.ref).catch(() => {});
        return;
      }

      if (data && (data.isNumber || data.id)) {
        standardsMap.set(id, { ...data, id });
      }
    });
  } catch (err: any) {}

  // 2. Fetch from custom_standards collection
  try {
    const customSnapshot = await getDocs(collection(db, 'custom_standards'));
    customSnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const id = data?.id || docSnap.id;
      const isNum = data?.isNumber || '';

      if (isExcluded(id, isNum, docSnap.id)) {
        // Self-healing cleanup
        deleteDoc(docSnap.ref).catch(() => {});
        return;
      }

      if (data && (data.isNumber || data.id)) {
        standardsMap.set(id, { ...data, id });
      }
    });
  } catch (err: any) {}

  // 3. Fallback to Realtime DB
  try {
    const dbRef = ref(rtdb);
    const snapshot = await get(child(dbRef, `standards`));
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.entries(data).forEach(([key, item]: [string, any]) => {
        const id = item?.id || key;
        const isNum = item?.isNumber || '';

        if (isExcluded(id, isNum, key)) {
          // Self-healing cleanup from RTDB
          set(ref(rtdb, 'standards/' + key), null).catch(() => {});
          return;
        }

        if (item && (item.isNumber || item.id)) {
          standardsMap.set(id, { ...item, id });
        }
      });
    }
  } catch (err: any) {}

  if (standardsMap.size > 0) {
    return Array.from(standardsMap.values());
  }

  return [];
}

export async function seedInitialDatabaseIfEmpty(initialStandards: any[]) {
  try {
    // Check if database was already seeded
    try {
      const initSnap = await getDoc(doc(db, 'system_meta', 'init'));
      if (initSnap.exists() && initSnap.data()?.seeded) {
        return; // Already initialized in the past; do not resurrect deleted records
      }
      const rtdbInitSnap = await get(child(ref(rtdb), 'system_meta/seeded'));
      if (rtdbInitSnap.exists() && rtdbInitSnap.val() === true) {
        return;
      }
    } catch (e) {}

    const deletedIds = new Set<string>();
    
    // Load local deleted set
    if (typeof window !== 'undefined') {
      try {
        const localDeleted: string[] = JSON.parse(localStorage.getItem('bis_deleted_standards') || '[]');
        localDeleted.forEach(id => {
          if (id) {
            deletedIds.add(id);
            deletedIds.add(id.toLowerCase());
          }
        });
      } catch (e) {}
    }

    try {
      const delSnapshot = await getDocs(collection(db, 'deleted_standards'));
      delSnapshot.forEach((docSnap) => {
        deletedIds.add(docSnap.id);
        deletedIds.add(docSnap.id.toLowerCase());
        const data = docSnap.data();
        if (data?.id) {
          deletedIds.add(data.id);
          deletedIds.add(String(data.id).toLowerCase());
        }
        if (data?.isNumber) {
          deletedIds.add(data.isNumber);
          deletedIds.add(String(data.isNumber).toLowerCase());
        }
      });
    } catch (e) {}

    const existing = await fetchStandardsFromFirebase();
    if (existing.length === 0 && initialStandards.length > 0) {
      for (const std of initialStandards) {
        if (
          deletedIds.has(std.id) || 
          deletedIds.has(std.id.toLowerCase()) || 
          (std.isNumber && (deletedIds.has(std.isNumber) || deletedIds.has(std.isNumber.toLowerCase())))
        ) {
          continue;
        }
        try {
          const docRef = doc(db, 'bis_standards', std.id);
          await setDoc(docRef, { ...std, seededAt: new Date().toISOString() }, { merge: true });
          const safeKey = sanitizeRtdbKey(std.id);
          if (safeKey) {
            const rtdbRef = ref(rtdb, 'standards/' + safeKey);
            await set(rtdbRef, std);
          }
        } catch (e: any) {
          // Ignore unauthenticated permission warnings
        }
      }

      // Mark seeded status
      try {
        await setDoc(doc(db, 'system_meta', 'init'), { seeded: true, seededAt: new Date().toISOString() }, { merge: true });
        await set(ref(rtdb, 'system_meta/seeded'), true);
      } catch (e) {}
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

export async function deleteFeedbackLogFromFirebase(logId: string) {
  try {
    if (!logId) return;
    try {
      await deleteDoc(doc(db, 'feedback_logs', logId));
    } catch (e) {}

    try {
      const rtdbRef = ref(rtdb, 'feedback/' + logId);
      await set(rtdbRef, null);
    } catch (e) {}

    if (typeof window !== 'undefined') {
      try {
        const existing = JSON.parse(localStorage.getItem('bis_feedback_logs') || '[]');
        const filtered = existing.filter((item: any) => item.id !== logId && item.timestamp !== logId);
        localStorage.setItem('bis_feedback_logs', JSON.stringify(filtered));
      } catch (e) {}
    }
  } catch (err) {
    console.warn("Error deleting feedback log:", err);
  }
}

export async function clearAllFeedbackLogsFromFirebase() {
  try {
    const snap = await getDocs(collection(db, 'feedback_logs'));
    for (const d of snap.docs) {
      await deleteDoc(d.ref).catch(() => {});
    }
    await set(ref(rtdb, 'feedback'), null).catch(() => {});
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bis_feedback_logs');
    }
  } catch (err) {
    console.warn("Error clearing all feedback logs:", err);
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

