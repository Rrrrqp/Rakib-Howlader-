import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { initializeFirebase } from '../lib/firebase';
import { Order, OrderStatus } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

async function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const createOrder = async (orderData: Partial<Order>) => {
  const { db } = await initializeFirebase();
  const orderId = `SERA-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)}`;
  const fullOrder = {
    ...orderData,
    orderId,
    status: 'Pending' as OrderStatus,
    createdAt: new Date().toISOString(),
  };

  if (!db) {
    console.warn("Firebase not initialized. Saving to localStorage.");
    const existing = JSON.parse(localStorage.getItem('sera_orders') || '[]');
    const newOrder = { id: orderId, ...fullOrder };
    localStorage.setItem('sera_orders', JSON.stringify([newOrder, ...existing]));
    return newOrder;
  }

  const path = 'orders';
  try {
    const docRef = await addDoc(collection(db, path), fullOrder);
    return { id: docRef.id, ...fullOrder };
  } catch (error) {
    await handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getAllOrders = async (forceRefresh = false): Promise<Order[]> => {
  let cachedOrders: Order[] = [];
  try {
    const cached = localStorage.getItem('cached_orders');
    if (cached) {
      cachedOrders = JSON.parse(cached);
    }
  } catch (e) {
    console.warn("Failed to retrieve cached orders:", e);
  }

  // If cached data exists and we are not forcing a refresh, return cached data immediately
  if (cachedOrders && cachedOrders.length > 0 && !forceRefresh) {
    return cachedOrders;
  }

  const { db } = await initializeFirebase();
  if (!db) {
    console.warn("Firebase not initialized. Reading from localStorage.");
    const fallback = JSON.parse(localStorage.getItem('sera_orders') || '[]');
    return fallback.length > 0 ? fallback : cachedOrders;
  }

  const path = 'orders';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    
    // Update local cache
    try {
      localStorage.setItem('cached_orders', JSON.stringify(ordersList));
    } catch (cacheErr) {
      console.warn("Failed to cache orders to localStorage:", cacheErr);
    }
    
    return ordersList;
  } catch (error) {
    await handleFirestoreError(error, OperationType.LIST, path);
    return cachedOrders;
  }
};

export const updateOrderStatus = async (id: string, status: string) => {
  const { db } = await initializeFirebase();
  if (!db) {
    const existing = JSON.parse(localStorage.getItem('sera_orders') || '[]');
    const updated = existing.map((o: any) => o.id === id ? { ...o, status } : o);
    localStorage.setItem('sera_orders', JSON.stringify(updated));
    return;
  }

  const path = 'orders';
  try {
    const docRef = doc(db, path, id);
    await updateDoc(docRef, { status });
  } catch (error) {
    await handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
  }
};

export const updateOrder = async (id: string, data: Partial<Order>) => {
  const { db } = await initializeFirebase();
  if (!db) {
    const existing = JSON.parse(localStorage.getItem('sera_orders') || '[]');
    const updated = existing.map((o: any) => o.id === id ? { ...o, ...data } : o);
    localStorage.setItem('sera_orders', JSON.stringify(updated));
    return;
  }

  const path = 'orders';
  try {
    const docRef = doc(db, path, id);
    await updateDoc(docRef, data);
  } catch (error) {
    await handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
  }
};

export const deleteOrder = async (id: string) => {
  // Proactively remove from cached_orders as well to keep UI cache in sync
  try {
    const cached = localStorage.getItem('cached_orders');
    if (cached) {
      const parsed = JSON.parse(cached);
      const filtered = parsed.filter((o: any) => o.id !== id);
      localStorage.setItem('cached_orders', JSON.stringify(filtered));
    }
  } catch (e) {
    console.warn("Failed to update cached_orders in deleteOrder:", e);
  }

  const { db } = await initializeFirebase();
  if (!db) {
    const existing = JSON.parse(localStorage.getItem('sera_orders') || '[]');
    const updated = existing.filter((o: any) => o.id !== id);
    localStorage.setItem('sera_orders', JSON.stringify(updated));
    return;
  }

  const path = 'orders';
  try {
    const docRef = doc(db, path, id);
    await deleteDoc(docRef);
  } catch (error) {
    await handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
  }
};
