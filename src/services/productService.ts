import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, where, limit } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { initializeFirebase } from '../lib/firebase';
import { Product } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  UPLOAD = 'upload',
}

async function handleFirebaseError(error: unknown, operationType: OperationType, path: string | null) {
  let authInfo = {};
  try {
    const { auth } = await initializeFirebase();
    authInfo = {
      userId: auth?.currentUser?.uid,
      isAnonymous: auth?.currentUser?.isAnonymous,
      authenticated: !!auth?.currentUser
    };
  } catch (e) {
    console.warn("Failed to get auth info for error reporting", e);
  }

  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    code: (error as any)?.code || 'unknown',
    authInfo
  };
  console.error('Firebase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const COLLECTION_NAME = 'products';

export const uploadImage = async (file: File, onProgress?: (progress: number) => void): Promise<string> => {
  const { storage } = await initializeFirebase();
  if (!storage) throw new Error('Firebase Storage not initialized');

  // Sanitize filename and add timestamp
  const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
  const storageRef = ref(storage, `products/${fileName}`);
  
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      }, 
      async (error) => {
        try {
          await handleFirebaseError(error, OperationType.UPLOAD, `storage/products/${fileName}`);
        } catch (err) {
          reject(err);
        }
      }, 
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          resolve(downloadURL);
        });
      }
    );
  });
}

export const createProduct = async (productData: Partial<Product>) => {
  const { db } = await initializeFirebase();
  const fullProduct = {
    ...productData,
    isActive: productData.isActive ?? true,
    createdAt: new Date().toISOString(),
  };

  if (!db) {
    console.warn("Firebase not initialized.");
    return null;
  }

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), fullProduct);
    try {
      localStorage.removeItem('cached_products_active');
      localStorage.removeItem('cached_products_all');
    } catch (e) {
      console.warn("Failed to clear local cached products on creation:", e);
    }
    return { id: docRef.id, ...fullProduct };
  } catch (error) {
    await handleFirebaseError(error, OperationType.WRITE, COLLECTION_NAME);
  }
};

export const getAllProducts = async (onlyActive = false, forceRefresh = false): Promise<Product[]> => {
  const cacheKey = onlyActive ? 'cached_products_active' : 'cached_products_all';
  let cachedData: Product[] = [];
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      cachedData = JSON.parse(cached);
    }
  } catch (e) {
    console.warn("Failed to retrieve cached products:", e);
  }

  // If we have cached products and forceRefresh is false, return immediately
  if (cachedData && cachedData.length > 0 && !forceRefresh) {
    return cachedData;
  }

  const { db } = await initializeFirebase();
  if (!db) {
    return cachedData;
  }

  try {
    let q = query(collection(db, COLLECTION_NAME), orderBy('createdAt', 'desc'), limit(100));
    if (onlyActive) {
      q = query(collection(db, COLLECTION_NAME), where('isActive', '==', true), orderBy('createdAt', 'desc'), limit(100));
    }
    const snapshot = await getDocs(q);
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    
    // Save to local cache
    try {
      localStorage.setItem(cacheKey, JSON.stringify(products));
    } catch (e) {
      console.warn("Failed to cache products:", e);
    }
    
    return products;
  } catch (error) {
    console.warn("Firebase product fetch failed, returning cached data:", error);
    return cachedData;
  }
};

export const updateProduct = async (id: string, data: Partial<Product>) => {
  const { db } = await initializeFirebase();
  if (!db) return;

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, data);
    try {
      localStorage.removeItem('cached_products_active');
      localStorage.removeItem('cached_products_all');
    } catch (e) {
      console.warn("Failed to clear local cached products on update:", e);
    }
  } catch (error) {
    await handleFirebaseError(error, OperationType.UPDATE, `${COLLECTION_NAME}/${id}`);
  }
};

export const deleteProduct = async (id: string) => {
  const { db } = await initializeFirebase();
  if (!db) return;

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
    try {
      localStorage.removeItem('cached_products_active');
      localStorage.removeItem('cached_products_all');
    } catch (e) {
      console.warn("Failed to clear local cached products on deletion:", e);
    }
  } catch (error) {
    await handleFirebaseError(error, OperationType.DELETE, `${COLLECTION_NAME}/${id}`);
  }
};
