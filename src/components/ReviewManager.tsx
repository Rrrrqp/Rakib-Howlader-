import React, { useState, useEffect } from 'react';
import { getAllProducts } from '../services/productService';
import { getReviewsForProduct, createReview, deleteReview, ProductReview } from '../services/reviewService';
import { Product } from '../types';
import { 
  Star, Trash2, Plus, MessageSquare, Send, CheckCircle2, User, 
  Calendar, Package, Sparkles, Filter, Search, Loader2, RefreshCw 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ReviewManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productsLoading, setProductsLoading] = useState(true);
  const [searchProductQuery, setSearchProductQuery] = useState('');

  // Reviews list states
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // New review form states
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [customDate, setCustomDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Confirmation state for deleting a review
  const [reviewToDelete, setReviewToDelete] = useState<ProductReview | null>(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);

  // Load all products initially
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getAllProducts(true);
        setProducts(data);
        if (data.length > 0) {
          setSelectedProduct(data[0]);
        }
        
        // Background network updates to bypass cache limits
        const freshData = await getAllProducts(true, true);
        if (freshData.length > 0) {
          setProducts(freshData);
          setSelectedProduct(prev => {
            if (!prev) return freshData[0];
            const found = freshData.find(p => p.id === prev.id);
            return found || freshData[0];
          });
        }
      } catch (err) {
        console.error("Failed to load products for reviews manager", err);
      } finally {
        setProductsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Fetch reviews whenever the selected product changes
  useEffect(() => {
    if (!selectedProduct) {
      setReviews([]);
      return;
    }

    const fetchReviews = async () => {
      setReviewsLoading(true);
      try {
        const data = await getReviewsForProduct(selectedProduct.id || '', selectedProduct.productCode);
        setReviews(data);
      } catch (err) {
        console.error("Failed to load reviews for selected product", err);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [selectedProduct]);

  // Filter products based on search
  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchProductQuery.toLowerCase()) || 
    p.productCode.toLowerCase().includes(searchProductQuery.toLowerCase()) ||
    (p.category && p.category.toLowerCase().includes(searchProductQuery.toLowerCase()))
  );

  // Handle addition of a curated admin review
  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!authorName.trim() || !comment.trim()) {
      setActionError('দয়া করে ক্রেতার নাম এবং কমেন্ট লিখুন।');
      return;
    }

    setSubmitting(true);
    setActionSuccess('');
    setActionError('');

    try {
      // Create the base review with optional custom date
      const rev = await createReview(
        selectedProduct.id || '',
        authorName,
        rating,
        comment,
        customDate ? new Date(customDate).toISOString() : undefined
      );

      setReviews(prev => [rev, ...prev].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));

      // Reset form
      setAuthorName('');
      setComment('');
      setRating(5);
      setCustomDate('');
      setActionSuccess('কাস্টমার রিভিউটি সফলভাবে প্রকাশিত হয়েছে এবং স্টোরে সরাসরি যুক্ত হয়েছে! 🎉');
      setTimeout(() => setActionSuccess(''), 4000);
    } catch (err: any) {
      setActionError('রিভিউ সাবমিট করতে ত্রুটি হয়েছে।');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle single review deletion
  const handleDeleteReview = async () => {
    if (!selectedProduct || !reviewToDelete) return;

    setDeletingInProgress(true);
    setActionSuccess('');
    setActionError('');

    try {
      await deleteReview(reviewToDelete.id || '', selectedProduct.id || '');
      setReviews(prev => prev.filter(r => r.id !== reviewToDelete.id));
      setActionSuccess('রিভিউটি সফলভাবে মুছে ফেলা হয়েছে।');
      setReviewToDelete(null);
      setTimeout(() => setActionSuccess(''), 3000);
    } catch (err) {
      console.error("Error deleting review", err);
      setActionError('রিভিউ মুছে ফেলতে ত্রুটি হয়েছে।');
    } finally {
      setDeletingInProgress(false);
    }
  };

  // Compute average rating
  const averageRating = reviews.length > 0 
    ? parseFloat((reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1))
    : 0;

  return (
    <div className="bg-white rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-gray-100 space-y-8 animate-fade-in">
      {/* Header section with styling matches */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <div className="flex items-center gap-2 text-rose-600 font-extrabold text-[10px] uppercase tracking-widest bg-rose-50 px-3 py-1.5 rounded-full w-fit">
            <Sparkles size={12} className="animate-pulse" />
            রিভিউ কন্ট্রোল প্যানেল
          </div>
          <h2 className="text-xl md:text-2xl font-black text-brand-charcoal mt-2 tracking-tight">কাস্টমার রিভিউ ম্যানেজার</h2>
          <p className="text-xs text-gray-400 font-medium mt-1">সব ফেক অটোমেটিক রিভিউ সরিয়ে নিজের পছন্দমতো এবং আসল রিভিউ অ্যাডমিন প্যানেল থেকে আপলোড কিংবা মুছে দিন।</p>
        </div>

        {selectedProduct && (
          <div className="bg-[#fcfcfa] px-5 py-3 border border-gray-150 rounded-3xl flex items-center gap-4 text-xs font-bold shrink-0 shadow-sm">
            <div className="text-center">
              <div className="text-[10px] text-gray-400 font-black uppercase tracking-wider">রিয়েল রিভিউ</div>
              <div className="text-base font-black text-brand-charcoal">{reviews.length} টি</div>
            </div>
            <div className="h-6 w-px bg-gray-200" />
            <div className="text-center">
              <div className="text-[10px] text-gray-400 font-black uppercase tracking-wider">গড় রেটিং</div>
              <div className="text-base font-black text-amber-500">★ {averageRating > 0 ? averageRating : 'N/A'}</div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Product Selector Sidebar (Col 4) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10.5px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Package size={12} className="text-rose-600" />
              প্রোডাক্ট নির্বাচন করুন ({products.length})
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="প্রোডাক্ট কোড বা নাম দিয়ে খুঁজুন..."
                value={searchProductQuery}
                onChange={(e) => setSearchProductQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-semibold focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all"
              />
              <Search size={14} className="absolute left-3 top-3.5 text-gray-400" />
            </div>
          </div>

          <div className="border border-gray-150 rounded-3xl overflow-hidden shadow-sm bg-[#fafafa]">
            <div className="max-h-[500px] overflow-y-auto no-scrollbar разделить">
              {productsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400 font-bold text-xs">
                  <Loader2 size={18} className="animate-spin text-rose-500" />
                  লোড হচ্ছে...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-xs font-bold">
                  কোনো প্রোডাক্ট মেলেনি!
                </div>
              ) : (
                filteredProducts.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className={`w-full text-left p-3.5 flex items-center gap-3 transition-all border-b border-gray-100 last:border-none ${
                        isSelected 
                          ? 'bg-white shadow-md border-l-4 border-l-rose-600 font-black' 
                          : 'hover:bg-gray-100/50'
                      }`}
                    >
                      {p.imageUrl ? (
                        <img 
                          src={p.imageUrl} 
                          alt={p.title} 
                          className="w-11 h-11 object-cover rounded-xl border border-gray-100 shadow-sm shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-11 h-11 bg-rose-100 text-rose-600 rounded-xl flex items-center justify-center text-xs font-black shrink-0">
                          SFH
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className={`text-xs truncate leading-snug ${isSelected ? 'text-black font-extrabold' : 'text-gray-700 font-bold'}`}>
                          {p.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] bg-gray-200 text-gray-600 font-extrabold uppercase px-1.5 py-0.5 rounded-md tracking-wider">
                            {p.productCode}
                          </span>
                          <span className="text-[9.5px] text-rose-600 font-black">
                            ৳{p.price}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Product Reviews Manager + Curated Review Adder (Col 8) */}
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {selectedProduct ? (
              <motion.div
                key={selectedProduct.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Active selected product banner */}
                <div className="bg-rose-50/40 p-4 border border-rose-100 rounded-3xl flex flex-col md:flex-row items-center gap-4 shadow-sm">
                  {selectedProduct.imageUrl && (
                    <img 
                      src={selectedProduct.imageUrl} 
                      alt={selectedProduct.title} 
                      className="w-14 h-14 object-cover rounded-2xl border border-rose-200"
                    />
                  )}
                  <div className="text-center md:text-left">
                    <span className="text-[10px] bg-rose-600 text-white font-extrabold uppercase px-1.5 py-0.5 rounded-full tracking-wider">
                      Selected: {selectedProduct.productCode}
                    </span>
                    <h3 className="text-sm font-extrabold text-brand-charcoal mt-1 leading-snug">{selectedProduct.title}</h3>
                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">ক্যাটাগরি: {selectedProduct.category} | স্টক: {selectedProduct.stock} টি</p>
                  </div>
                </div>

                {/* Notifications segment */}
                {actionSuccess && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-pulse">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    {actionSuccess}
                  </div>
                )}
                {actionError && (
                  <div className="bg-red-50 border border-red-150 text-red-700 p-4 rounded-2xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-red-500 shrink-0 rotate-45" />
                    {actionError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  
                  {/* Part 1: Add Review Form block */}
                  <form onSubmit={handleAddReview} className="bg-[#fcfcfa] border border-gray-150 p-5 rounded-[2rem] space-y-4 shadow-sm">
                    <div className="border-b border-gray-100 pb-2">
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-[#1a1c2e] flex items-center gap-1.5">
                        <Plus size={14} className="text-rose-500 font-black" />
                        নতুন রিভিউ যোগ করুন
                      </h4>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5">ক্রেতার পক্ষ থেকে শুভ রিভিউ পাবলিশ করুন</p>
                    </div>

                    <div className="space-y-3.5">
                      {/* Name input */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ক্রেতার নাম</label>
                        <input
                          type="text"
                          required
                          placeholder="যেমন: সায়মা আক্তার শান্তা"
                          value={authorName}
                          onChange={(e) => setAuthorName(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all"
                        />
                      </div>

                      {/* Custom Rating */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">স্টার রেটিং (১ - ৫)</label>
                        <div className="flex items-center gap-1.5 pt-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setRating(s)}
                              className="hover:scale-125 transition-transform"
                            >
                              <Star 
                                size={22} 
                                fill={s <= rating ? "#fbbf24" : "none"} 
                                className={s <= rating ? "text-amber-400" : "text-gray-300"} 
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Comment text */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">মন্তব্য / রিভিউ</label>
                        <textarea
                          required
                          rows={3}
                          placeholder="রিভিউটি কেমন হবে বিস্তারিত লিখুন (যেমন: কাপড় খুবই প্রিমিয়াম, কালার ধোয়ার পরও নিখুঁত)।"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all resize-none"
                        />
                      </div>

                      {/* Custom Date (Optional) */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">তারিখ (Optional)</label>
                        <input
                          type="date"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-rose-500/20 focus:outline-none transition-all"
                        />
                        <span className="text-[9px] text-gray-400 font-medium block">ফাঁকা রাখলে বর্তমান সময় স্বয়ংক্রিয়ভাবে বসে যাবে।</span>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 bg-brand-charcoal text-white rounded-xl text-[10.5px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50"
                      >
                        {submitting ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={11} />
                        )}
                        পাবলিশ করুন (Publish)
                      </button>
                    </div>
                  </form>

                  {/* Part 2: Active reviews manager list */}
                  <div className="space-y-4">
                    <div className="border-b border-gray-100 pb-2 flex items-center justify-between">
                      <div>
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-[#1a1c2e] flex items-center gap-1.5">
                          <MessageSquare size={14} className="text-rose-500" />
                          বিদ্যমান রিভিউ সমূহ
                        </h4>
                        <p className="text-[10px] text-gray-400 font-semibold mt-0.5">সব রিয়েল রিভিউ ম্যানেজমেন্ট</p>
                      </div>
                      <button 
                        onClick={async () => {
                          setReviewsLoading(true);
                          try {
                            const data = await getReviewsForProduct(selectedProduct.id || '', selectedProduct.productCode);
                            setReviews(data);
                          } catch (err) { console.error(err); } finally { setReviewsLoading(false); }
                        }}
                        className="p-1.5 text-gray-400 hover:text-black rounded-lg transition-all hover:bg-gray-100"
                        title="রিফ্রেশ করুন"
                      >
                        <RefreshCw size={13} />
                      </button>
                    </div>

                    <div className="space-y-3.5 max-h-[420px] overflow-y-auto pr-1 no-scrollbar">
                      {reviewsLoading ? (
                        <div className="flex items-center justify-center py-12 gap-2 text-gray-400 text-xs font-bold">
                          <Loader2 size={14} className="animate-spin text-rose-500" />
                          লোড হচ্ছে...
                        </div>
                      ) : reviews.length === 0 ? (
                        <div className="text-center py-12 text-xs font-extrabold text-gray-400 bg-gray-50 border border-gray-100 rounded-3xl select-none">
                          এই প্রোডাক্টের কোনো কাস্টমার রিভিউ পাওয়া যায়নি। আপনি নতুন রিভিউ লিখে যোগ করতে পারেন!
                        </div>
                      ) : (
                        reviews.map((rev) => (
                          <div 
                            key={rev.id || Math.random().toString()} 
                            className="p-4 bg-white border border-gray-150 rounded-2xl space-y-2.5 shadow-sm transition-all hover:border-rose-200 relative group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center text-[11px] font-black uppercase border border-rose-100">
                                  {rev.customerName.charAt(0)}
                                </div>
                                <div className="min-w-0">
                                  <h5 className="text-[11.5px] font-black text-gray-800 leading-none flex items-center gap-1.5">
                                    <span className="truncate max-w-[120px]">{rev.customerName}</span>
                                    <span className="text-[8px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-1 py-0.2 rounded font-black uppercase shrink-0">Verified</span>
                                  </h5>
                                  <span className="text-[9px] text-gray-400 font-bold mt-1 inline-block">
                                    {new Date(rev.createdAt).toLocaleDateString('bn-BD', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>
                              </div>

                              <button
                                onClick={() => setReviewToDelete(rev)}
                                className="p-1 px-2 text-red-500 hover:text-white bg-red-50 hover:bg-red-600 border border-red-100 rounded-lg shrink-0 transition-all text-[9.5px] font-black flex items-center gap-0.5"
                                title="রিভিউ মুছে ফেলুন"
                              >
                                <Trash2 size={10} />
                                মুছুন
                              </button>
                            </div>

                            <div className="flex items-center gap-0.5 pl-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={10} 
                                  fill={i < rev.rating ? "#fbbf24" : "none"} 
                                  className={i < rev.rating ? "text-amber-400" : "text-gray-200"} 
                                />
                              ))}
                              <span className="text-[9px] font-black text-gray-800 ml-1.5">{rev.rating}/5</span>
                            </div>

                            <p className="text-xs font-semibold text-gray-600 leading-relaxed bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
                              {rev.comment}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                </div>
              </motion.div>
            ) : (
              <div className="text-center py-24 text-gray-450 border-2 border-dashed border-gray-150 rounded-[2.5rem]">
                <MessageSquare size={36} className="mx-auto text-gray-300 animate-bounce" />
                <h4 className="text-xs font-black text-[#1a1c2e] uppercase mt-3 tracking-widest">প্রোডাক্ট সিলেক্ট করুন</h4>
                <p className="text-[10px] text-gray-400 font-medium mt-1">কাস্টমারদের রিভিউজ দেখতে এবং নতুন রিভিউ যোগ করতে বামদিকের তালিকা থেকে প্রোডাক্ট নির্বাচন করুন।</p>
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {reviewToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-5"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-50 rounded-2xl text-red-600">
                  <Trash2 size={24} />
                </div>
                <div>
                  <h3 className="text-base font-black text-brand-charcoal">রিভিউ মুছে ফেলতে চান?</h3>
                  <p className="text-xs text-gray-400 font-semibold mt-0.5">এই অ্যাকশনটি আর ফিরিয়ে নেওয়া যাবে না।</p>
                </div>
              </div>

              <div className="bg-gray-50/50 border border-gray-100 p-4 rounded-2xl text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-gray-700">
                  <span className="font-extrabold text-brand-charcoal">{reviewToDelete.customerName}</span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-1 py-0.2 rounded font-black uppercase">Verified</span>
                </div>
                <p className="text-gray-500 leading-relaxed font-semibold italic bg-white p-2.5 rounded-xl border border-gray-105">
                  "{reviewToDelete.comment}"
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={deletingInProgress}
                  onClick={() => setReviewToDelete(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 cursor-pointer text-center"
                >
                  বাতিল করুন
                </button>
                <button
                  type="button"
                  disabled={deletingInProgress}
                  onClick={handleDeleteReview}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-red-200 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {deletingInProgress ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Trash2 size={11} />
                  )}
                  নিশ্চিত মুছুন
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
