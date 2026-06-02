import { doc, setDoc, getDoc, collection, onSnapshot, query } from 'firebase/firestore';
import { initializeFirebase } from '../lib/firebase';
import { VisitorSession, ProductView, VisitorStage, Product, TrackingEvent } from '../types';

let currentSessionId: string | null = null;
let currentSessionData: VisitorSession | null = null;
let heartbeatInterval: any = null;
let isOfflineTracking = false;

// Helper to check for Firebase quota or exhaustion errors
const detectQuotaError = (error: any): boolean => {
  if (!error) return false;
  const errMsg = String(error.message || error).toLowerCase();
  const errCode = String(error.code || '').toLowerCase();
  return (
    errCode === 'resource-exhausted' ||
    errCode === 'quota-exceeded' ||
    errCode === 'unavailable' ||
    errCode === 'permission-denied' ||
    errMsg.includes('quota') ||
    errMsg.includes('resource-exhausted') ||
    errMsg.includes('limit exceeded') ||
    errMsg.includes('exhausted') ||
    errMsg.includes('offline') ||
    errMsg.includes('denied')
  );
};

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
  const sessionId = getOrCreateSessionId();
  const idSuffix = '#' + sessionId.split('_')[1].substring(0, 4).toUpperCase();
  const now = new Date().toISOString();

  // Return the existing data if we already computed it in memory
  if (currentSessionData) return currentSessionData;

  // Read saved spin details from local storage to auto-sync with visitor session
  const savedSpun = localStorage.getItem('sera_wheel_has_spun');
  const savedCoupon = localStorage.getItem('sera_wheel_won_coupon');
  
  let localHasSpun = false;
  let localWonCode = '';
  let localWonLabel = '';
  let localWonDiscount = 0;
  let localCustomerName = 'Anonymous Visitor';
  let localMobileNumber = '';

  if (savedSpun === 'true' && savedCoupon) {
    try {
      const couponObj = JSON.parse(savedCoupon);
      localHasSpun = true;
      localWonCode = couponObj.code || '';
      localWonLabel = couponObj.labelBn || couponObj.label || '';
      localWonDiscount = Number(couponObj.discount) || 0;
      if (couponObj.name) localCustomerName = couponObj.name;
      if (couponObj.phone) localMobileNumber = couponObj.phone;
    } catch (e) {
      console.warn("Telemetry auto-sync of spin data error:", e);
    }
  }

  const defaultSession: VisitorSession = {
    sessionId,
    idSuffix,
    customerName: localCustomerName,
    mobileNumber: localMobileNumber,
    deviceInfo: getDeviceInfo(),
    currentStage: localHasSpun ? 'product_view' : 'browsing_home',
    currentStageLabel: localHasSpun ? `স্পিন অফার পেয়েছেন 🎁` : 'হোম পেজ ভিজিট',
    views: [],
    createdAt: now,
    lastActiveAt: now,
    hasSpun: localHasSpun ? true : undefined,
    wonCouponCode: localWonCode || undefined,
    wonCouponLabel: localWonLabel || undefined,
    wonCouponDiscount: localWonDiscount || undefined
  };

  const setupHeartbeat = () => {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(async () => {
      const currentNow = new Date().toISOString();
      if (currentSessionData) {
        currentSessionData.lastActiveAt = currentNow;
      }

      if (isOfflineTracking) return;

      try {
        const { db: freshDb } = await initializeFirebase();
        if (!freshDb) return;
        const sessionDoc = doc(freshDb, 'visitor_sessions', sessionId);
        await setDoc(sessionDoc, cleanUndefined({ lastActiveAt: currentNow }), { merge: true });
      } catch (e) {
        if (detectQuotaError(e)) {
          console.warn("Telemetry offline transition initiated by heartbeat limit response.");
          isOfflineTracking = true;
        }
      }
    }, 20000);
  };

  if (isOfflineTracking) {
    currentSessionData = defaultSession;
    setupHeartbeat();
    return currentSessionData;
  }

  try {
    const { db } = await initializeFirebase();
    if (!db) {
      isOfflineTracking = true;
      currentSessionData = defaultSession;
      setupHeartbeat();
      return currentSessionData;
    }

    const docRef = doc(db, 'visitor_sessions', sessionId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const existingData = docSnap.data() as VisitorSession;
      currentSessionData = { ...existingData };
      currentSessionData.lastActiveAt = now;

      // Sync local spin data if not already present in Firestore
      let hasUpdates = false;
      const syncUpdates: any = { lastActiveAt: now };

      if (localHasSpun && !existingData.hasSpun) {
        currentSessionData.hasSpun = true;
        currentSessionData.wonCouponCode = localWonCode;
        currentSessionData.wonCouponLabel = localWonLabel;
        currentSessionData.wonCouponDiscount = localWonDiscount;
        syncUpdates.hasSpun = true;
        syncUpdates.wonCouponCode = localWonCode;
        syncUpdates.wonCouponLabel = localWonLabel;
        syncUpdates.wonCouponDiscount = localWonDiscount;
        hasUpdates = true;
      }

      if (localCustomerName && localCustomerName !== 'Anonymous Visitor' && (!existingData.customerName || existingData.customerName === 'Anonymous Visitor')) {
        currentSessionData.customerName = localCustomerName;
        syncUpdates.customerName = localCustomerName;
        hasUpdates = true;
      }

      if (localMobileNumber && !existingData.mobileNumber) {
        currentSessionData.mobileNumber = localMobileNumber;
        syncUpdates.mobileNumber = localMobileNumber;
        hasUpdates = true;
      }

      await setDoc(docRef, cleanUndefined(syncUpdates), { merge: true });
    } else {
      currentSessionData = { ...defaultSession };
      await setDoc(docRef, cleanUndefined(currentSessionData));
    }
  } catch (error) {
    if (detectQuotaError(error)) {
      console.warn("Telemetry database exhausted, running locally without firing network events.");
      isOfflineTracking = true;
    } else {
      console.warn("Failed to retrieve or create visitor session starting from scratch locally:", error);
    }
    currentSessionData = defaultSession;
  }

  setupHeartbeat();
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

  if (isOfflineTracking) return;

  try {
    const { db } = await initializeFirebase();
    if (!db) return;
    const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
    await setDoc(docRef, cleanUndefined({
      currentStage: stage,
      currentStageLabel: stageLabel,
      lastActiveAt: currentSessionData.lastActiveAt
    }), { merge: true });
  } catch (err) {
    if (detectQuotaError(err)) {
      isOfflineTracking = true;
    } else {
      console.warn("Failed to update visitor stage:", err);
    }
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

  if (isOfflineTracking) return;

  try {
    const { db } = await initializeFirebase();
    if (!db) return;
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
    if (detectQuotaError(err)) {
      isOfflineTracking = true;
    } else {
      console.warn("Failed to track product view in firebase:", err);
    }
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

  if (isOfflineTracking) return;

  try {
    const { db } = await initializeFirebase();
    if (!db) return;
    const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
    await setDoc(docRef, cleanUndefined(updates), { merge: true });
  } catch (err) {
    if (detectQuotaError(err)) {
      isOfflineTracking = true;
    } else {
      console.warn("Failed to update visitor contact info:", err);
    }
  }
};

// Update visitor spin information
export const updateVisitorSpinInfo = async (spinData: {
  hasSpun: boolean;
  wonCouponCode: string;
  wonCouponLabel: string;
  wonCouponDiscount: number;
  customerName?: string;
  mobileNumber?: string;
}) => {
  if (!currentSessionData) {
    await startVisitorSession();
  }
  if (!currentSessionData) return;

  const now = new Date().toISOString();
  currentSessionData.hasSpun = spinData.hasSpun;
  currentSessionData.wonCouponCode = spinData.wonCouponCode;
  currentSessionData.wonCouponLabel = spinData.wonCouponLabel;
  currentSessionData.wonCouponDiscount = spinData.wonCouponDiscount;
  if (spinData.customerName) {
    currentSessionData.customerName = spinData.customerName;
  }
  if (spinData.mobileNumber) {
    currentSessionData.mobileNumber = spinData.mobileNumber;
  }
  currentSessionData.lastActiveAt = now;

  const updates: any = {
    hasSpun: spinData.hasSpun,
    wonCouponCode: spinData.wonCouponCode,
    wonCouponLabel: spinData.wonCouponLabel,
    wonCouponDiscount: spinData.wonCouponDiscount,
    lastActiveAt: now,
    ...(spinData.customerName && { customerName: spinData.customerName }),
    ...(spinData.mobileNumber && { mobileNumber: spinData.mobileNumber })
  };

  if (isOfflineTracking) return;

  try {
    const { db } = await initializeFirebase();
    if (!db) return;
    const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
    await setDoc(docRef, cleanUndefined(updates), { merge: true });
  } catch (err) {
    if (detectQuotaError(err)) {
      isOfflineTracking = true;
    } else {
      console.warn("Failed to update visitor spin info:", err);
    }
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

        if (isOfflineTracking) return;

        try {
          const { db } = await initializeFirebase();
          if (!db) return;
          const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
          await setDoc(docRef, cleanUndefined({ events: currentSessionData.events }), { merge: true });
        } catch (e) {
          if (detectQuotaError(e)) {
            isOfflineTracking = true;
          } else {
            console.warn("Deduplicate scroll event failed", e);
          }
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

        if (isOfflineTracking) return;

        try {
          const { db } = await initializeFirebase();
          if (!db) return;
          const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
          await setDoc(docRef, cleanUndefined({ events: currentSessionData.events }), { merge: true });
        } catch (e) {
          if (detectQuotaError(e)) {
            isOfflineTracking = true;
          } else {
            console.warn("Deduplicate input event failed", e);
          }
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

  if (isOfflineTracking) return;

  try {
    const { db } = await initializeFirebase();
    if (!db) return;
    const docRef = doc(db, 'visitor_sessions', currentSessionData.sessionId);
    await setDoc(docRef, cleanUndefined({
      events: currentSessionData.events,
      lastActiveAt: now.toISOString()
    }), { merge: true });
  } catch (err) {
    if (detectQuotaError(err)) {
      isOfflineTracking = true;
    } else {
      console.warn("Failed to log visitor event:", err);
    }
  }
};

// Listen to all live visitor sessions (for admin screen)
export const subscribeToVisitorSessions = async (callback: (sessions: VisitorSession[]) => void) => {
  const getOfflineSessions = (): VisitorSession[] => {
    return currentSessionData ? [currentSessionData] : [];
  };

  const { db } = await initializeFirebase();
  if (!db || isOfflineTracking) {
    callback(getOfflineSessions());
    return () => {};
  }

  const sessionsCol = collection(db, 'visitor_sessions');
  const q = query(sessionsCol);
  
  try {
    return onSnapshot(q, (snapshot) => {
      const sessions: VisitorSession[] = [];
      snapshot.forEach((docSnap) => {
        sessions.push({ id: docSnap.id, ...docSnap.data() } as VisitorSession);
      });
      // Sort descending by lastActiveAt
      sessions.sort((a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime());
      callback(sessions);
    }, (err) => {
      if (detectQuotaError(err)) {
        isOfflineTracking = true;
      }
      callback(getOfflineSessions());
    });
  } catch (err) {
    if (detectQuotaError(err)) {
      isOfflineTracking = true;
    }
    callback(getOfflineSessions());
    return () => {};
  }
};
