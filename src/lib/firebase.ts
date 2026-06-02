import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDocFromServer, disableNetwork } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

const fallbackConfig = {
  apiKey: "AIzaSyC_GmwisMWJX_ONOXXO6O-2VrSc8ArUYdU",
  authDomain: "rakib-8cc2a.firebaseapp.com",
  projectId: "rakib-8cc2a",
  storageBucket: "rakib-8cc2a.firebasestorage.app",
  messagingSenderId: "1096544082404",
  appId: "1:1096544082404:web:b158f6f2c5ccc7eef80ff1",
  measurementId: "G-SZPL053YD7"
};

let app: any;
let db: any;
let auth: any;
let storage: any;
let analytics: any = null;
let initPromise: Promise<any> | null = null;
let isQuotaExhausted = false;

const getTodayString = () => new Date().toISOString().split('T')[0];

export const checkIsQuotaExhausted = (): boolean => {
  if (isQuotaExhausted) return true;
  try {
    const expiredDate = localStorage.getItem('firestore_quota_exhausted_date');
    if (expiredDate === getTodayString()) {
      isQuotaExhausted = true;
      return true;
    }
  } catch (e) {}
  return false;
};

export const markQuotaExhausted = () => {
  if (isQuotaExhausted) return;
  isQuotaExhausted = true;
  try {
    localStorage.setItem('firestore_quota_exhausted_date', getTodayString());
  } catch (e) {}
  console.log('Firestore quota has been marked as EXHAUSTED for today:', getTodayString());
  
  if (db) {
    console.log('Halt background connections by calling disableNetwork for current DB instance');
    disableNetwork(db).catch((err) => {
      console.warn("Could not disable network for Firestore:", err);
    });
  }
  
  window.dispatchEvent(new Event('firestore_quota_exhausted'));
};

const testConnection = async (database: any) => {
  if (checkIsQuotaExhausted()) return;
  try {
    // Attempt to read a non-existent doc to trigger connection check
    await getDocFromServer(doc(database, '_test_connection_', 'check'));
    console.log('Firebase connection test: SUCCESS (Backend reachable)');
  } catch (error: any) {
    const errMsg = String(error.message || '').toLowerCase();
    const errCode = String(error.code || '').toLowerCase();
    if (
      errCode === 'resource-exhausted' ||
      errCode === 'quota-exceeded' ||
      errMsg.includes('quota') ||
      errMsg.includes('limit exceeded') ||
      errMsg.includes('exhausted')
    ) {
      console.warn("Firestore Quota Limit exceeded active in testConnection. Triggering offline mode.");
      markQuotaExhausted();
    } else if (error.code === 'unavailable' || error.message?.includes('offline')) {
      console.error("Firebase connection test: FAILED. The backend is unreachable. Using Force Long Polling might help.");
    } else {
      // Permission denied or other errors are fine, they mean the backend is reached
      console.log('Firebase connection test: SUCCESS (Backend reached, result:', error.code, ')');
    }
  }
};

const initializeFirebase = async () => {
  const isExhausted = checkIsQuotaExhausted();
  
  if (app && db && auth && storage) {
    return { db: isExhausted ? null : db, auth, storage, analytics };
  }
  
  if (initPromise) {
    const result = await initPromise;
    return { db: isExhausted ? null : result.db, auth: result.auth, storage: result.storage, analytics: result.analytics };
  }

  initPromise = (async () => {
    try {
      let firebaseConfig: any;
      try {
        const response = await fetch('/firebase-applet-config.json');
        if (!response.ok) {
          throw new Error('Config file returned error status');
        }
        firebaseConfig = await response.json();
      } catch (jsonErr) {
        console.warn('Could not fetch applet config, using user provided fallback configuration:', jsonErr);
        firebaseConfig = fallbackConfig;
      }
      
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      // Setup Analytics safely in the browser
      try {
        if (typeof window !== 'undefined') {
          const supported = await isSupported();
          if (supported) {
            analytics = getAnalytics(app);
          }
        }
      } catch (analyticsErr) {
        console.warn('Analytics initialization skipped/failed:', analyticsErr);
      }
      
      // Use initializeFirestore with forceLongPolling to avoid connection issues in some environments
      if (firebaseConfig.firestoreDatabaseId) {
        db = initializeFirestore(app, {
          experimentalForceLongPolling: true,
        }, firebaseConfig.firestoreDatabaseId);
      } else {
        db = getFirestore(app);
      }

      if (isExhausted) {
        disableNetwork(db).catch((e) => console.log("Silent startup disable network:", e));
      }

      auth = getAuth(app);
      
      // Use storageBucket from config if available, otherwise let SDK resolve it
      if (firebaseConfig.storageBucket) {
        storage = getStorage(app, firebaseConfig.storageBucket);
      } else {
        storage = getStorage(app);
      }
      
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (err: any) {
          // Log as a standard log instead of a warn to prevent scary warning banners in the developer console
          console.log('Firebase anonymous auth optional provider status:', err.code || err.message);
          (window as any).firebaseAuthError = err.code || err.message;
        }
      }
      
      // Background connection test
      if (!isExhausted) {
        testConnection(db);
      }
      
      (window as any).firebaseInstances = { db, auth, storage, analytics };
      return { db, auth, storage, analytics };
    } catch (error) {
      console.error('Firebase failed to initialize:', error);
      initPromise = null; // Allow retry
      throw error;
    }
  })();

  const res = await initPromise;
  return { db: checkIsQuotaExhausted() ? null : res.db, auth: res.auth, storage: res.storage, analytics: res.analytics };
};

const getFirebaseAuth = async () => {
  const { auth } = await initializeFirebase();
  return auth;
};

const signInWithGoogle = async () => {
  try {
    const { auth } = await initializeFirebase();
    if (!auth) {
      throw new Error("Firebase Auth not initialized. Please ensure Firebase is set up.");
    }
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error: any) {
    console.error("Google login failed details:", error);
    if (error.code === 'auth/popup-blocked') {
      throw new Error("Pop-up blocked! Please allow pop-ups for this site in your browser settings.");
    } else if (error.code === 'auth/cancelled-popup-request') {
      throw new Error("Login process was cancelled.");
    } else if (error.code === 'auth/popup-closed-by-user') {
      throw new Error("Login window was closed before completion.");
    }
    throw error;
  }
};

export { initializeFirebase, getFirebaseAuth, signInWithGoogle, db, auth, storage, analytics };
