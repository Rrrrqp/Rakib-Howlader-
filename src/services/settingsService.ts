import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '../lib/firebase';

const SETTING_DOC_ID = 'brand';

export const getBrandLogoSettings = async (): Promise<string | null> => {
  try {
    const { db } = await initializeFirebase();
    if (!db) return null;
    const docRef = doc(db, 'settings', SETTING_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().logoUrl || null;
    }
  } catch (error) {
    console.warn('Error fetching brand logo from firestore:', error);
  }
  return null;
};

export const updateBrandLogoSettings = async (logoUrl: string): Promise<void> => {
  const { db } = await initializeFirebase();
  if (!db) throw new Error('Firestore database not initialized');
  const docRef = doc(db, 'settings', SETTING_DOC_ID);
  await setDoc(docRef, {
    logoUrl,
    updatedAt: new Date().toISOString()
  }, { merge: true });
};
