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

export const getAllOrders = async (): Promise<Order[]> => {
  const { db } = await initializeFirebase();
  if (!db) {
    console.warn("Firebase not initialized. Reading from localStorage.");
    return JSON.parse(localStorage.getItem('sera_orders') || '[]');
  }

  const path = 'orders';
  try {
    const q = query(collection(db, path), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
  } catch (error) {
    await handleFirestoreError(error, OperationType.LIST, path);
    return [];
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
