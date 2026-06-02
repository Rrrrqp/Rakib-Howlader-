import { collection, addDoc, getDocs, query, orderBy, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { initializeFirebase, markQuotaExhausted } from '../lib/firebase';
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

function isQuotaOrNetworkError(error: any): boolean {
  if (!error) return false;
  const errMsg = String(error.message || error).toLowerCase();
  const errCode = String(error.code || '').toLowerCase();
  const isQuota = (
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
  if (isQuota) {
    try {
      markQuotaExhausted();
    } catch (e) {}
  }
  return isQuota;
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

  const saveLocally = () => {
    console.warn("Saving order to local storage (Fallback Mode).");
    const existing = JSON.parse(localStorage.getItem('sera_orders') || '[]');
    const newOrder = { id: orderId, ...fullOrder };
    
    const updated = [newOrder, ...existing];
    localStorage.setItem('sera_orders', JSON.stringify(updated));
    localStorage.setItem('cached_orders', JSON.stringify(updated));
    
    window.dispatchEvent(new Event('local_orders_updated'));
    return newOrder;
  };

  if (!db) {
    return saveLocally();
  }

  const path = 'orders';
  try {
    const docRef = await addDoc(collection(db, path), fullOrder);
    const result = { id: docRef.id, ...fullOrder };
    
    try {
      const cached = JSON.parse(localStorage.getItem('cached_orders') || '[]');
      localStorage.setItem('cached_orders', JSON.stringify([result, ...cached]));
      localStorage.setItem('sera_orders', JSON.stringify([result, ...cached]));
    } catch (e) {}
    
    return result;
  } catch (error) {
    if (isQuotaOrNetworkError(error)) {
      console.warn("Firestore error encountered (quota/offline). Automatically falling back to local storage.", error);
      return saveLocally();
    }
    await handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const getAllOrders = async (forceRefresh = false): Promise<Order[]> => {
  let cachedOrders: Order[] = [];
  try {
    const cached = localStorage.getItem('cached_orders') || localStorage.getItem('sera_orders');
    if (cached) {
      cachedOrders = JSON.parse(cached);
    }
  } catch (e) {
    console.warn("Failed to retrieve cached orders:", e);
  }

  if (cachedOrders && cachedOrders.length > 0 && !forceRefresh) {
    return cachedOrders;
  }

  const { db } = await initializeFirebase();
  if (!db) {
    console.warn("Firebase not initialized. Reading from localStorage fallback.");
    return cachedOrders;
  }

  const path = 'orders';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
    
    try {
      localStorage.setItem('cached_orders', JSON.stringify(ordersList));
      localStorage.setItem('sera_orders', JSON.stringify(ordersList));
    } catch (cacheErr) {
      console.warn("Failed to cache orders to localStorage:", cacheErr);
    }
    
    return ordersList;
  } catch (error) {
    console.warn("Failed to get orders from Firestore, falling back to local storage.", error);
    return cachedOrders;
  }
};

export const updateOrderStatus = async (id: string, status: string) => {
  const saveLocally = () => {
    try {
      const existing = JSON.parse(localStorage.getItem('sera_orders') || '[]');
      const updated = existing.map((o: any) => o.id === id || o.orderId === id ? { ...o, status } : o);
      localStorage.setItem('sera_orders', JSON.stringify(updated));

      const cached = JSON.parse(localStorage.getItem('cached_orders') || '[]');
      const updatedCached = cached.map((o: any) => o.id === id || o.orderId === id ? { ...o, status } : o);
      localStorage.setItem('cached_orders', JSON.stringify(updatedCached));

      window.dispatchEvent(new Event('local_orders_updated'));
    } catch (e) {
      console.warn("Failed to update status locally:", e);
    }
  };

  const { db } = await initializeFirebase();
  if (!db) {
    saveLocally();
    return;
  }

  const path = 'orders';
  try {
    const docRef = doc(db, path, id);
    await updateDoc(docRef, { status });
    saveLocally();
  } catch (error) {
    if (isQuotaOrNetworkError(error)) {
      console.warn("Encountered Firestore quota/network error on update status.", error);
      saveLocally();
    } else {
      await handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
    }
  }
};

export const updateOrder = async (id: string, data: Partial<Order>) => {
  const saveLocally = () => {
    try {
      const existing = JSON.parse(localStorage.getItem('sera_orders') || '[]');
      const updated = existing.map((o: any) => o.id === id || o.orderId === id ? { ...o, ...data } : o);
      localStorage.setItem('sera_orders', JSON.stringify(updated));

      const cached = JSON.parse(localStorage.getItem('cached_orders') || '[]');
      const updatedCached = cached.map((o: any) => o.id === id || o.orderId === id ? { ...o, ...data } : o);
      localStorage.setItem('cached_orders', JSON.stringify(updatedCached));

      window.dispatchEvent(new Event('local_orders_updated'));
    } catch (e) {
      console.warn("Failed to update order locally:", e);
    }
  };

  const { db } = await initializeFirebase();
  if (!db) {
    saveLocally();
    return;
  }

  const path = 'orders';
  try {
    const docRef = doc(db, path, id);
    await updateDoc(docRef, data);
    saveLocally();
  } catch (error) {
    if (isQuotaOrNetworkError(error)) {
      console.warn("Encountered Firestore quota/network error on update order.", error);
      saveLocally();
    } else {
      await handleFirestoreError(error, OperationType.UPDATE, `${path}/${id}`);
    }
  }
};

export const deleteOrder = async (id: string) => {
  const saveLocally = () => {
    try {
      const existing = JSON.parse(localStorage.getItem('sera_orders') || '[]');
      const updated = existing.filter((o: any) => o.id !== id && o.orderId !== id);
      localStorage.setItem('sera_orders', JSON.stringify(updated));

      const cached = JSON.parse(localStorage.getItem('cached_orders') || '[]');
      const updatedCached = cached.filter((o: any) => o.id !== id && o.orderId !== id);
      localStorage.setItem('cached_orders', JSON.stringify(updatedCached));

      window.dispatchEvent(new Event('local_orders_updated'));
    } catch (e) {
      console.warn("Failed to delete order locally:", e);
    }
  };

  const { db } = await initializeFirebase();
  if (!db) {
    saveLocally();
    return;
  }

  const path = 'orders';
  try {
    const docRef = doc(db, path, id);
    await deleteDoc(docRef);
    saveLocally();
  } catch (error) {
    if (isQuotaOrNetworkError(error)) {
      console.warn("Encountered Firestore quota/network error on delete order.", error);
      saveLocally();
    } else {
      await handleFirestoreError(error, OperationType.DELETE, `${path}/${id}`);
    }
  }
};

export const subscribeOrders = async (callback: (orders: Order[]) => void) => {
  const getOfflineOrders = () => {
    const c1 = localStorage.getItem('cached_orders');
    const c2 = localStorage.getItem('sera_orders');
    let orders: Order[] = [];
    try {
      if (c1) orders = JSON.parse(c1);
      else if (c2) orders = JSON.parse(c2);
    } catch (e) {}
    return orders;
  };

  const triggerLocalOrders = () => {
    callback(getOfflineOrders());
  };

  window.addEventListener('local_orders_updated', triggerLocalOrders);
  const pollInterval = setInterval(triggerLocalOrders, 2000);

  const cleanup = () => {
    window.removeEventListener('local_orders_updated', triggerLocalOrders);
    clearInterval(pollInterval);
  };

  const { db } = await initializeFirebase();
  if (!db) {
    console.warn("Firebase not initialized. Cannot subscribe. Reading from localStorage.");
    callback(getOfflineOrders());
    return cleanup;
  }

  const path = 'orders';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      try {
        localStorage.setItem('cached_orders', JSON.stringify(ordersList));
        localStorage.setItem('sera_orders', JSON.stringify(ordersList));
      } catch (cacheErr) {
        console.warn("Failed to cache subscription orders:", cacheErr);
      }
      
      callback(ordersList);
    }, (error) => {
      console.warn("Firestore subscription error (often quota exceeded). Falling back fully to local listener.", error);
      callback(getOfflineOrders());
    });
    
    return () => {
      unsubscribe();
      cleanup();
    };
  } catch (err) {
    console.error("Failed to setup orders subscription:", err);
    callback(getOfflineOrders());
    return cleanup;
  }
};
