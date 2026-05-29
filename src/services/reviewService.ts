import { collection, addDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { initializeFirebase } from '../lib/firebase';

export interface ProductReview {
  id?: string;
  productId: string;
  customerName: string;
  rating: number; // 1 to 5
  comment: string;
  createdAt: string;
}

const COLLECTION_NAME = 'reviews';

// Healthy, natural Bengali seed reviews to generate instant high-credibility realistic reviews
// if the product doesn't have any custom reviews yet.
const BANGLA_SEED_COMMENTS = [
  { name: 'আফরিন আক্তার', comment: 'কাপড়টা খুবই আরামদায়ক এবং সেলাইয়ের কাজ নিখুঁত। ধন্যবাদ সেরা ফ্যাশন হাউসকে!', rating: 5 },
  { name: 'সাদিয়া জাহান', comment: 'কালার কম্বিনেশনটা একদম ছবির মতোই চমৎকার ছিল। ২ দিনের মধ্যে দ্রুত ডেলিভারি পেয়েছি।', rating: 5 },
  { name: 'তাসনিম রেজা', comment: 'ফ্যাব্রিক খুবই সফট ও প্রিমিয়াম কোয়ালিটির। এই বাজেটে এর চেয়ে ভালো থ্রি-পিস পাওয়া অসম্ভব!', rating: 5 },
  { name: 'মাইশা কবির', comment: 'অনলাইন শপিংয়ে এত সুন্দর ফিটিং হবে আশা করিনি। কালারটা ধোয়ার পরেও একদম ঠিক আছে।', rating: 5 },
  { name: 'ফারজানা ববি', comment: 'সেলার ভাইয়ের ব্যবহার চমৎকার আর ডেলিভারি ম্যান ও অনেক হেল্পফুল ছিল। ধন্যবাদ সবাইকে।', rating: 4 },
  { name: 'রিফাত আহমেদ', comment: 'অর্ডার করার সময় একটু ভয় লেগেছিল, কিন্তু হাতে পেয়ে খুবই ভালো লেগেছে। প্রিমিয়াম প্যাকিং!', rating: 5 },
  { name: 'ফাতেমা তুজ জোহরা', comment: 'ড্রেসের জমিনের ফেব্রিক সুতি ও অনেক নরম। গরমের জন্য একদম পারফেক্ট শাড়ি!', rating: 5 },
  { name: 'মুমতাহিনা লিমা', comment: 'অসাধারণ ডিজাইন! হাতা এবং গলার কুচি কাজ দারুণ ফিনিশিং করা। বারবার কেনা যায়!', rating: 5 }
];

/**
 * Get stable pre-populated seed reviews for a product
 * derived from the product id/code so they remain stable and relevant
 */
export const getSeedReviews = (productId: string, productCode: string): ProductReview[] => {
  const codeNum = parseInt(productCode.replace(/\D/g, '')) || 0;
  
  // Select 3 specific reviews based on codeNum to keep them stable
  const selectedIndices = [
    (codeNum + 1) % BANGLA_SEED_COMMENTS.length,
    (codeNum + 3) % BANGLA_SEED_COMMENTS.length,
    (codeNum + 5) % BANGLA_SEED_COMMENTS.length
  ];

  // Map to stable dates in the recent past
  return selectedIndices.map((commentIdx, index) => {
    const seed = BANGLA_SEED_COMMENTS[commentIdx];
    const daysAgo = index * 2 + 1;
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);

    return {
      id: `seed-${productId}-${index}`,
      productId,
      customerName: seed.name,
      rating: seed.rating,
      comment: seed.comment,
      createdAt: date.toISOString()
    };
  });
};

/**
 * Save customer review
 */
export const createReview = async (productId: string, customerName: string, rating: number, comment: string): Promise<ProductReview> => {
  const newReview: ProductReview = {
    productId,
    customerName,
    rating,
    comment,
    createdAt: new Date().toISOString()
  };

  const { db } = await initializeFirebase();

  if (!db) {
    console.warn("Firestore not available, storing review in localStorage");
    const localKey = `local_reviews_${productId}`;
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    const reviewWithId = { id: `local-${Date.now()}`, ...newReview };
    localStorage.setItem(localKey, JSON.stringify([reviewWithId, ...existing]));
    return reviewWithId;
  }

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), newReview);
    return { id: docRef.id, ...newReview };
  } catch (error) {
    console.error("Error writing review to Firestore:", error);
    // Fallback to local
    const localKey = `local_reviews_${productId}`;
    const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
    const reviewWithId = { id: `local-err-${Date.now()}`, ...newReview };
    localStorage.setItem(localKey, JSON.stringify([reviewWithId, ...existing]));
    return reviewWithId;
  }
};

/**
 * Fetch reviews for a specific product code
 */
export const getReviewsForProduct = async (productId: string, productCode: string): Promise<ProductReview[]> => {
  const { db } = await initializeFirebase();

  let realReviews: ProductReview[] = [];

  // Read local storage reviews first to blend them
  const localKey = `local_reviews_${productId}`;
  const localReviews = JSON.parse(localStorage.getItem(localKey) || '[]');
  realReviews = [...localReviews];

  if (db) {
    try {
      const q = query(
        collection(db, COLLECTION_NAME),
        where('productId', '==', productId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const firebaseReviews = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProductReview));
      // Concatenate local review and firebase reviews (ensuring no duplicates)
      const existingIds = new Set(realReviews.map(r => r.id));
      firebaseReviews.forEach(fr => {
        if (!existingIds.has(fr.id)) {
          realReviews.push(fr);
        }
      });
    } catch (error) {
      console.warn("Could not load reviews from Firestore, using offline cache:", error);
    }
  }

  // Sorted by creation date (descending)
  return realReviews.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

/**
 * Delete a review (Admin action)
 */
export const deleteReview = async (reviewId: string, productId: string): Promise<boolean> => {
  const { db } = await initializeFirebase();

  // 1. Remove from local storage
  const localKey = `local_reviews_${productId}`;
  const localReviews = JSON.parse(localStorage.getItem(localKey) || '[]');
  const filteredLocal = localReviews.filter((r: any) => r.id !== reviewId);
  localStorage.setItem(localKey, JSON.stringify(filteredLocal));

  // 2. Remove from Firestore if online
  if (db) {
    try {
      const { deleteDoc, doc } = await import('firebase/firestore');
      await deleteDoc(doc(db, COLLECTION_NAME, reviewId));
      return true;
    } catch (error) {
      console.warn("Could not delete review from Firestore (it might be a local-only review or offline):", error);
    }
  }
  return true;
};

/**
 * Computes professional sales/purchases count dynamically
 */
export const getProductSalesCount = (productCode: string, orders: any[] = [], initialSalesCount?: number): number => {
  // Use the admin's custom initial sales count if provided, or default to 0 for pure live orders
  const baseSales = typeof initialSalesCount === 'number' ? initialSalesCount : 0;

  // Calculate real verified orders from our state
  let realSales = 0;
  orders.forEach(order => {
    if (order.productCode === productCode) {
      realSales += (order.quantity || 1);
    }
    if (order.items) {
      order.items.forEach((item: any) => {
        if (item.productCode === productCode) {
          realSales += (item.quantity || 1);
        }
      });
    }
  });

  return baseSales + realSales;
};
