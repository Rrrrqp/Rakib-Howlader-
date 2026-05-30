import { doc, setDoc, getDoc, collection, onSnapshot, query } from 'firebase/firestore';
import { initializeFirebase } from '../lib/firebase';
import { VisitorSession, ProductView, VisitorStage, Product, TrackingEvent } from '../types';

let currentSessionId: string | null = null;
let currentSessionData: VisitorSession | null = null;
let heartbeatInterval: any = null;

// Helper to remove undefined fields recursively so Firestore doesn't reject writing them
const cleanUndefined = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val !== undefined) {
      result[key] = cleanUndefined(val);
    }
  }
  return result;
};

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
      await setDoc(docRef, cleanUndefined({ lastActiveAt: now }), { merge: true });
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
      await setDoc(docRef, cleanUndefined(currentSessionData));
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
      await setDoc(sessionDoc, cleanUndefined({ lastActiveAt: currentNow }), { merge: true });
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

  const STAGE_RANKS: Record<VisitorStage, number> = {
    browsing_home: 1,
    product_view: 2,
    added_to_cart: 3,
    filling_checkout: 4,
    order_completed: 5
  };

  const currentStage = currentSessionData.currentStage || 'browsing_home';
  if (STAGE_RANKS[stage] < STAGE_RANKS[currentStage]) {
    // Stage downgrade is forbidden to preserve peak funnel progress!
    return;
  }

  currentSessionData.currentStage = stage;
  currentSessionData.currentStageLabel = stageLabel;
  currentSessionData.lastActiveAt = new Date().toISOString();

  try {
    const { db } = await initializeFirebase();
    const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
    await setDoc(docRef, cleanUndefined({
      currentStage: stage,
      currentStageLabel: stageLabel,
      lastActiveAt: currentSessionData.lastActiveAt
    }), { merge: true });
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
  
  const STAGE_RANKS: Record<VisitorStage, number> = {
    browsing_home: 1,
    product_view: 2,
    added_to_cart: 3,
    filling_checkout: 4,
    order_completed: 5
  };
  const currentStage = currentSessionData.currentStage || 'browsing_home';
  const shouldUpdateStage = STAGE_RANKS['product_view'] >= STAGE_RANKS[currentStage];

  if (shouldUpdateStage) {
    currentSessionData.currentStage = 'product_view';
    currentSessionData.currentStageLabel = `প্রোডাক্ট দেখছেন: ${product.title}`;
  }
  currentSessionData.lastActiveAt = now;

  try {
    const { db } = await initializeFirebase();
    const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
    await setDoc(docRef, cleanUndefined({
      views: updatedViews,
      ...(shouldUpdateStage && {
        currentStage: 'product_view',
        currentStageLabel: `প্রোডাক্ট দেখছেন: ${product.title}`
      }),
      lastActiveAt: now
    }), { merge: true });
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
  address?: string;
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
  if (info.address !== undefined) {
    updates.address = info.address;
    currentSessionData.address = updates.address;
  }

  currentSessionData.lastActiveAt = now;

  try {
    const { db } = await initializeFirebase();
    const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
    await setDoc(docRef, cleanUndefined(updates), { merge: true });
  } catch (err) {
    console.warn("Failed to update visitor contact info:", err);
  }
};

// Log a specific interaction event (e.g. click, scroll, input, visit)
export const logVisitorEvent = async (
  type: 'click' | 'scroll' | 'input' | 'page_view' | 'system',
  target: string,
  description: string,
  path: string,
  scrollDepth?: number
) => {
  if (!currentSessionData) {
    try {
      await startVisitorSession();
    } catch {
      return;
    }
  }
  if (!currentSessionData) return;

  const now = new Date();
  const elapsed = Math.round((now.getTime() - new Date(currentSessionData.createdAt).getTime()) / 1000);

  const event: TrackingEvent = {
    id: 'evt_' + Math.random().toString(36).substring(2, 9),
    type,
    description,
    target,
    path,
    timestamp: now.toISOString(),
    elapsedTime: Math.max(0, elapsed)
  };

  if (scrollDepth !== undefined) {
    event.scrollDepth = scrollDepth;
  }

  if (!currentSessionData.events) {
    currentSessionData.events = [];
  }

  // Deduplicate scroll logs within 4 seconds
  if (type === 'scroll') {
    const lastEvent = currentSessionData.events[0];
    if (lastEvent && lastEvent.type === 'scroll') {
      const diff = now.getTime() - new Date(lastEvent.timestamp).getTime();
      if (diff < 4000) {
        lastEvent.scrollDepth = scrollDepth;
        lastEvent.description = description;
        lastEvent.timestamp = event.timestamp;
        lastEvent.elapsedTime = Math.max(0, elapsed);
        try {
          const { db } = await initializeFirebase();
          const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
          await setDoc(docRef, cleanUndefined({ events: currentSessionData.events }), { merge: true });
        } catch (e) {
          console.warn("Deduplicate scroll event failed", e);
        }
        return;
      }
    }
  }

  // Deduplicate input field typing logs within 5 seconds for the same target
  if (type === 'input') {
    const lastEvent = currentSessionData.events[0];
    if (lastEvent && lastEvent.type === 'input' && lastEvent.target === target) {
      const diff = now.getTime() - new Date(lastEvent.timestamp).getTime();
      if (diff < 5000) {
        lastEvent.description = description;
        lastEvent.timestamp = event.timestamp;
        lastEvent.elapsedTime = Math.max(0, elapsed);
        try {
          const { db } = await initializeFirebase();
          const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
          await setDoc(docRef, cleanUndefined({ events: currentSessionData.events }), { merge: true });
        } catch (e) {
          console.warn("Deduplicate input event failed", e);
        }
        return;
      }
    }
  }

  // Add search/click/visit event to the front of the list
  currentSessionData.events.unshift(event);

  if (currentSessionData.events.length > 60) {
    currentSessionData.events = currentSessionData.events.slice(0, 60);
  }

  try {
    const { db } = await initializeFirebase();
    const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
    await setDoc(docRef, cleanUndefined({
      events: currentSessionData.events,
      lastActiveAt: now.toISOString()
    }), { merge: true });
  } catch (err) {
    console.warn("Failed to log visitor event:", err);
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
