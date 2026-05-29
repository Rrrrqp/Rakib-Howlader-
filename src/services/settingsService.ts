import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '../lib/firebase';
import { BrandSettings } from '../types';

const SETTING_DOC_ID = 'brand';

export const getBrandSettings = async (): Promise<BrandSettings | null> => {
  let cachedData: BrandSettings | null = null;
  try {
    const local = localStorage.getItem('brand_settings');
    if (local) {
      cachedData = JSON.parse(local);
    }
  } catch (e) {
    console.warn('Error parsing brand cache:', e);
  }

  // Non-blocking background fetch to sync the cache
  const fetchPromise = (async () => {
    try {
      const { db } = await initializeFirebase();
      if (db) {
        const docRef = doc(db, 'settings', SETTING_DOC_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as BrandSettings;
          localStorage.setItem('brand_settings', JSON.stringify(data));
          return data;
        }
      }
    } catch (error) {
      console.warn('Error fetching brand settings in background:', error);
    }
    return null;
  })();

  // If we have cached settings, return them immediately for instant loading
  if (cachedData) {
    return cachedData;
  }

  // Otherwise wait for the live fetching
  const liveData = await fetchPromise;
  return liveData || cachedData;
};

export const updateBrandSettings = async (settings: Partial<BrandSettings>): Promise<void> => {
  try {
    const { db } = await initializeFirebase();
    if (!db) {
      const current = await getBrandSettings() || {};
      const updated = { ...current, ...settings };
      localStorage.setItem('brand_settings', JSON.stringify(updated));
      return;
    }
    const docRef = doc(db, 'settings', SETTING_DOC_ID);
    await setDoc(docRef, {
      ...settings,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    const fullSettings = await getBrandSettings();
    if (fullSettings) {
      localStorage.setItem('brand_settings', JSON.stringify(fullSettings));
    }
  } catch (error) {
    console.error('Error updating brand settings:', error);
    throw error;
  }
};

export const getBrandLogoSettings = async (): Promise<string | null> => {
  const settings = await getBrandSettings();
  return settings?.logoUrl || null;
};

export const updateBrandLogoSettings = async (logoUrl: string): Promise<void> => {
  await updateBrandSettings({ logoUrl });
};

