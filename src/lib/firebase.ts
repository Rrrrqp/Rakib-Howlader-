import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore, getFirestore, doc, getDocFromServer } from 'firebase/firestore';
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

const testConnection = async (database: any) => {
  try {
    // Attempt to read a non-existent doc to trigger connection check
    await getDocFromServer(doc(database, '_test_connection_', 'check'));
    console.log('Firebase connection test: SUCCESS (Backend reachable)');
  } catch (error: any) {
    if (error.code === 'unavailable' || error.message?.includes('offline')) {
      console.error("Firebase connection test: FAILED. The backend is unreachable. Using Force Long Polling might help.");
    } else {
      // Permission denied or other errors are fine, they mean the backend is reached
      console.log('Firebase connection test: SUCCESS (Backend reached, result:', error.code, ')');
    }
  }
};

const initializeFirebase = async () => {
  if (app && db && auth && storage) return { db, auth, storage, analytics };
  
  if (initPromise) return initPromise;

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
      testConnection(db);
      
      (window as any).firebaseInstances = { db, auth, storage, analytics };
      return { db, auth, storage, analytics };
    } catch (error) {
      console.error('Firebase failed to initialize:', error);
      initPromise = null; // Allow retry
      throw error;
    }
  })();

  return initPromise;
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
