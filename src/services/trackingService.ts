import { doc, setDoc, getDoc, collection, onSnapshot, query } from 'firebase/firestore';
import { initializeFirebase } from '../lib/firebase';
import { VisitorSession, ProductView, VisitorStage, Product } from '../types';

let currentSessionId: string | null = null;
let currentSessionData: VisitorSession | null = null;
let heartbeatInterval: any = null;

// Helper to generate a random session ID if not already stored
export const getOrCreateSessionId = (): string => {
  if (currentSessionId) return currentSessionId;
  
  let stored = localStorage.getItem('s_fashion_session_id');
  if (!stored) {
    const prefix = 'sess_' + Math.random().toString(36).substring(2, 10);
    const suffix = Date.now().toString(36);
    stored = `${prefix}_${suffix}`;
    localStorage.setItem('s_fashion_session_id', stored);
  }
  currentSessionId = stored;
  return stored;
};

// Helper to detect device
const getDeviceInfo = (): string => {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    return "🌐 Tablet";
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Opera Mini/i.test(ua)) {
    return "📱 Mobile";
  }
  return "💻 Desktop";
};

// Start or resume visitor session
export const startVisitorSession = async (): Promise<VisitorSession> => {
  const { db } = await initializeFirebase();
  const sessionId = getOrCreateSessionId();
  const idSuffix = '#' + sessionId.split('_')[1].substring(0, 4).toUpperCase();

  const docRef = doc(db, 'visitor_sessions', sessionId);
  
  try {
    const docSnap = await getDoc(docRef);
    const now = new Date().toISOString();
    
    if (docSnap.exists()) {
      currentSessionData = docSnap.data() as VisitorSession;
      // Update activity
      currentSessionData.lastActiveAt = now;
      await setDoc(docRef, { lastActiveAt: now }, { merge: true });
    } else {
      currentSessionData = {
        sessionId,
        idSuffix,
        customerName: 'Anonymous Visitor',
        mobileNumber: '',
        deviceInfo: getDeviceInfo(),
        currentStage: 'browsing_home',
        currentStageLabel: 'হোম পেজ ভিজিট',
        views: [],
        createdAt: now,
        lastActiveAt: now
      };
      await setDoc(docRef, currentSessionData);
    }
  } catch (error) {
    console.warn("Failed to retrieve or create visitor session starting from scratch locally", error);
    currentSessionData = {
      sessionId,
      idSuffix,
      customerName: 'Anonymous Visitor',
      mobileNumber: '',
      deviceInfo: getDeviceInfo(),
      currentStage: 'browsing_home',
      currentStageLabel: 'হোম পেজ ভিজিট',
      views: [],
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString()
    };
  }

  // Setup Heartbeat every 20 seconds to update activity
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(async () => {
    try {
      const { db: freshDb } = await initializeFirebase();
      const currentNow = new Date().toISOString();
      const sessionDoc = doc(freshDb, 'visitor_sessions', sessionId);
      await setDoc(sessionDoc, { lastActiveAt: currentNow }, { merge: true });
      if (currentSessionData) {
        currentSessionData.lastActiveAt = currentNow;
      }
    } catch (e) {
      console.warn("Session heartbeat failed", e);
    }
  }, 20000);

  return currentSessionData;
};

// Update active stage of visitor
export const updateVisitorStage = async (stage: VisitorStage, stageLabel: string) => {
  if (!currentSessionData) {
    await startVisitorSession();
  }
  if (!currentSessionData) return;

  currentSessionData.currentStage = stage;
  currentSessionData.currentStageLabel = stageLabel;
  currentSessionData.lastActiveAt = new Date().toISOString();

  try {
    const { db } = await initializeFirebase();
    const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
    await setDoc(docRef, {
      currentStage: stage,
      currentStageLabel: stageLabel,
      lastActiveAt: currentSessionData.lastActiveAt
    }, { merge: true });
  } catch (err) {
    console.warn("Failed to update visitor stage:", err);
  }
};

// Track specific product view
export const trackProductView = async (product: Product) => {
  if (!currentSessionData) {
    await startVisitorSession();
  }
  if (!currentSessionData) return;

  const existIndex = currentSessionData.views.findIndex(v => v.productCode === product.productCode);
  const now = new Date().toISOString();
  
  const viewItem: ProductView = {
    productCode: product.productCode,
    productTitle: product.title,
    category: product.category,
    price: product.price,
    imageUrl: product.imageUrl,
    viewedAt: now
  };

  let updatedViews = [...currentSessionData.views];
  if (existIndex > -1) {
    updatedViews.splice(existIndex, 1);
  }
  updatedViews.unshift(viewItem);
  if (updatedViews.length > 15) {
    updatedViews = updatedViews.slice(0, 15);
  }

  currentSessionData.views = updatedViews;
  currentSessionData.currentStage = 'product_view';
  currentSessionData.currentStageLabel = `প্রোডাক্ট দেখছেন: ${product.title}`;
  currentSessionData.lastActiveAt = now;

  try {
    const { db } = await initializeFirebase();
    const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
    await setDoc(docRef, {
      views: updatedViews,
      currentStage: 'product_view',
      currentStageLabel: `প্রোডাক্ট দেখছেন: ${product.title}`,
      lastActiveAt: now
    }, { merge: true });
  } catch (err) {
    console.warn("Failed to track product view in firebase:", err);
  }
};

// Dynamically update form inputs as customer types them so live updates show up
export const updateVisitorCustomerInfo = async (info: {
  customerName?: string;
  mobileNumber?: string;
  district?: string;
  upazila?: string;
}) => {
  if (!currentSessionData) {
    await startVisitorSession();
  }
  if (!currentSessionData) return;

  const now = new Date().toISOString();
  const updates: any = { lastActiveAt: now };

  if (info.customerName !== undefined) {
    updates.customerName = info.customerName || 'Anonymous Visitor';
    currentSessionData.customerName = updates.customerName;
  }
  if (info.mobileNumber !== undefined) {
    updates.mobileNumber = info.mobileNumber || '';
    currentSessionData.mobileNumber = updates.mobileNumber;
  }
  if (info.district !== undefined) {
    updates.district = info.district;
    currentSessionData.district = updates.district;
  }
  if (info.upazila !== undefined) {
    updates.upazila = info.upazila;
    currentSessionData.upazila = updates.upazila;
  }

  currentSessionData.lastActiveAt = now;

  try {
    const { db } = await initializeFirebase();
    const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
    await setDoc(docRef, updates, { merge: true });
  } catch (err) {
    console.warn("Failed to update visitor contact info:", err);
  }
};

// Listen to all live visitor sessions (for admin screen)
export const subscribeToVisitorSessions = async (callback: (sessions: VisitorSession[]) => void) => {
  const { db } = await initializeFirebase();
  const sessionsCol = collection(db, 'visitor_sessions');
  const q = query(sessionsCol);
  
  return onSnapshot(q, (snapshot) => {
    const sessions: VisitorSession[] = [];
    snapshot.forEach((docSnap) => {
      sessions.push({ id: docSnap.id, ...docSnap.data() } as VisitorSession);
    });
    // Sort descending by lastActiveAt
    sessions.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
    callback(sessions);
  }, (err) => {
    console.error("Live visitor fetch failed:", err);
  });
};
