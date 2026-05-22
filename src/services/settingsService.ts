import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '../lib/firebase';
import { BrandSettings } from '../types';

const SETTING_DOC_ID = 'brand';

export const getBrandSettings = async (): Promise<BrandSettings | null> => {
  try {
    const { db } = await initializeFirebase();
    if (!db) {
      const local = localStorage.getItem('brand_settings');
      return local ? JSON.parse(local) : null;
    }
    const docRef = doc(db, 'settings', SETTING_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as BrandSettings;
      localStorage.setItem('brand_settings', JSON.stringify(data));
      return data;
    }
  } catch (error) {
    console.warn('Error fetching brand settings from firestore:', error);
  }
  const local = localStorage.getItem('brand_settings');
  return local ? JSON.parse(local) : null;
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

