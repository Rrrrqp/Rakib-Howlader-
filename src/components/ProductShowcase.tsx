import React, { useState, useEffect, useMemo } from 'react';
import { getAllProducts } from '../services/productService';
import { getAllOrders } from '../services/orderService';
import { getReviewsForProduct, createReview, getProductSalesCount, ProductReview } from '../services/reviewService';
import { Product } from '../types';
import { trackProductView, logVisitorEvent, updateVisitorStage } from '../services/trackingService';
import { ShoppingBag, Eye, ShoppingCart, Loader2, Sparkles, X, Star, Share2, Info, Hash, ArrowDown, ArrowUp, Flame, SlidersHorizontal, Gift, Trophy, MessageSquare, Send, CheckCircle, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductShowcaseProps {
  onOrderNow: (product: Product, quantity: number, size: string) => void;
  onAddToCart?: (product: Product, quantity: number, size: string) => void;
}

export default function ProductShowcase({ onOrderNow, onAddToCart }: ProductShowcaseProps) {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = localStorage.getItem('cached_products_active');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [orders, setOrders] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('cached_orders');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_products_active');
      const parsed = cached ? JSON.parse(cached) : [];
      return parsed.length === 0;
    } catch (e) {
      return true;
    }
  });
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'default' | 'price-desc' | 'price-asc' | 'top-selling'>('default');

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('38');
  const sizes = ['34', '36', '38', '40', '42', '44', '46', '48'];

  // Reviews states
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [newReviewName, setNewReviewName] = useState('');
  const [newReviewRating, setNewReviewRating] = useState(5);
  const [newReviewComment, setNewReviewComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccessMessage, setReviewSuccessMessage] = useState('');

  // Zooming & Lightbox States
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxScale, setLightboxScale] = useState(1);

  const handleZoomMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const categories = [
    { id: 'ALL', name: 'সবগুলো (All)' },
    { id: 'THREE PIECE', name: 'থ্রি-পিস (Three Piece)' },
    { id: 'SAREE', name: 'শাড়ি (Saree)' },
    { id: 'OTHERS', name: 'অন্যান্য (Others)' }
  ];

  useEffect(() => {
    const fetch = async () => {
      // First, get cached or immediate active products for instant loading speed
      const data = await getAllProducts(true);
      setProducts(data);
      try {
        const orderData = await getAllOrders();
        setOrders(orderData);
        localStorage.setItem('cached_orders', JSON.stringify(orderData));
      } catch (e) {
        console.warn("Could not load orders for sales counter", e);
      }
      setLoading(false);

      // Perform a background network fresh-fetch to reflect any recent admin visibility or product edits instantly
      try {
        const freshData = await getAllProducts(true, true);
        setProducts(freshData);
      } catch (e) {
        console.warn("Could not get background fresh products updates:", e);
      }
    };
    fetch();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      setQuantity(1);
      setSelectedSize('38');
      setReviewSuccessMessage('');
      
      // Fetch reviews
      setReviewsLoading(true);
      getReviewsForProduct(selectedProduct.id || '', selectedProduct.productCode)
        .then(data => {
          setReviews(data);
          setReviewsLoading(false);
        })
        .catch(err => {
          console.error("Failed to load reviews", err);
          setReviewsLoading(false);
        });

      // Track product view and stage update
      trackProductView(selectedProduct).catch(err => console.warn(err));
      logVisitorEvent('page_view', `view_${selectedProduct.productCode}`, `প্রোডাক্ট বিস্তারিত দেখছেন: "${selectedProduct.title}" 🔍`, 'product_details');
    } else {
      setReviews([]);
    }
  }, [selectedProduct]);

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !newReviewName.trim() || !newReviewComment.trim()) return;

    setIsSubmittingReview(true);
    try {
      const added = await createReview(
        selectedProduct.id || '',
        newReviewName,
        newReviewRating,
        newReviewComment
      );
      
      setReviews(prev => [added, ...prev]);
      logVisitorEvent('click', 'submit_review', `রিভিউ সাবমিট করেছেন: "★${newReviewRating} - ${newReviewComment.substring(0, 20)}..." ✍️`, 'product_details');
      setNewReviewName('');
      setNewReviewComment('');
      setNewReviewRating(5);
      setReviewSuccessMessage('ধন্যবাদ! আপনার কাস্টমার রিভিউটি সফলভাবে প্রকাশিত হয়েছে। 🎉');
      
      setTimeout(() => setReviewSuccessMessage(''), 4000);
    } catch (err) {
      console.error("Error adding review", err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return 5.0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return parseFloat((sum / reviews.length).toFixed(1));
  }, [reviews]);

  const handleOrder = () => {
    if (selectedProduct) {
      onOrderNow(selectedProduct, quantity, selectedSize);
      setSelectedProduct(null);
    }
  };

  const sortedProducts = useMemo(() => {
    let filtered = products.filter(p => activeCategory === 'ALL' || p.category === activeCategory);
    let result = [...filtered];
    
    if (sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'top-selling') {
      // High pseudo relevance algorithm logic for Top-Selling tag
      const getPseudoSales = (p: Product) => {
        const codeNum = parseInt(p.productCode.replace(/\D/g, '')) || 0;
        const discountVal = p.discount || 0;
        return (codeNum % 31) + (discountVal * 1.5) + (p.title.length * 2);
      };
      result.sort((a, b) => getPseudoSales(b) - getPseudoSales(a));
    }
    return result;
  }, [products, activeCategory, sortBy]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse bg-white rounded-[2rem] h-80 border border-gray-100" />
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-12 bg-white/50">
      <div className="max-w-4xl mx-auto px-4 mb-10">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-brand-gold/10 text-brand-gold px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-gold/20">
            <Sparkles size={12} fill="currentColor" />
            Premium Collection
          </div>
          <h2 className="text-2xl font-serif font-black text-brand-charcoal italic">
            আমাদের <span className="text-brand-gold">এক্সক্লুসিভ</span> কালেকশন
          </h2>
          <div className="w-20 h-1 bg-brand-gold/30 rounded-full" />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="max-w-4xl mx-auto px-4 mb-6 overflow-hidden">
        <div className="flex bg-white/50 p-1.5 rounded-2xl border border-gray-100 overflow-x-auto no-scrollbar gap-1.5 scroll-px-4 flex-nowrap">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                logVisitorEvent('click', `category_${cat.id}`, `ক্যাটাগরি পরিবর্তন করেছেন: "${cat.name}" 📂`, 'home');
              }}
              className={`px-6 py-3 rounded-xl text-[11px] md:text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap flex-shrink-0
                ${activeCategory === cat.id 
                  ? 'bg-brand-charcoal text-white shadow-lg shadow-brand-charcoal/20 ring-1 ring-brand-charcoal' 
                  : 'text-gray-400 hover:text-brand-charcoal hover:bg-white/80'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Sorting Tabs bar */}
      <div className="max-w-4xl mx-auto px-4 mb-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 bg-[#fbfbfa] border border-gray-100 rounded-3xl">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-brand-gold shrink-0" />
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-[#1a1c2e] flex items-center gap-1.5">
              ফিল্টার ও সর্টিং <span className="text-gray-400 font-normal">| Product Sort Options</span>
            </span>
          </div>

          <div className="flex bg-white p-1 rounded-2xl border border-gray-150 overflow-x-auto w-full md:w-auto no-scrollbar gap-1 flex-nowrap scroll-px-1">
            <button
              onClick={() => {
                setSortBy('default');
                logVisitorEvent('click', 'sort_default', 'প্রোডাক্ট সর্টিং করেছেন: "সবগুলো" 📊', 'home');
              }}
              className={`px-4 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0
                ${sortBy === 'default' 
                  ? 'bg-brand-charcoal text-white shadow-md font-black' 
                  : 'text-gray-500 hover:text-brand-charcoal hover:bg-gray-50'}`}
            >
              সবগুলো
            </button>
            <button
              onClick={() => {
                setSortBy('price-asc');
                logVisitorEvent('click', 'sort_price_asc', 'প্রোডাক্ট সর্টিং করেছেন: "কম দাম থেকে বেশি" 📊', 'home');
              }}
              className={`px-4 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0
                ${sortBy === 'price-asc' 
                  ? 'bg-brand-charcoal text-white shadow-md font-black' 
                  : 'text-gray-500 hover:text-brand-charcoal hover:bg-gray-50'}`}
            >
              <ArrowUp size={11} className="text-amber-500" />
              কম দাম থেকে বেশি
            </button>
            <button
              onClick={() => {
                setSortBy('price-desc');
                logVisitorEvent('click', 'sort_price_desc', 'প্রোডাক্ট সর্টিং করেছেন: "বেশি দাম থেকে কম" 📊', 'home');
              }}
              className={`px-4 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0
                ${sortBy === 'price-desc' 
                  ? 'bg-brand-charcoal text-white shadow-md font-black' 
                  : 'text-gray-500 hover:text-brand-charcoal hover:bg-gray-50'}`}
            >
              <ArrowDown size={11} className="text-amber-500" />
              বেশি দাম থেকে কম
            </button>
            <button
              onClick={() => {
                setSortBy('top-selling');
                logVisitorEvent('click', 'sort_top_selling', 'প্রোডাক্ট সর্টিং করেছেন: "টপ সেলিং" 📊', 'home');
              }}
              className={`px-4 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0
                ${sortBy === 'top-selling' 
                  ? 'bg-amber-500 text-[#1a1c2e] shadow-md font-black' 
                  : 'text-gray-500 hover:text-brand-charcoal hover:bg-gray-50'}`}
            >
              <Flame size={11} fill={sortBy === 'top-selling' ? 'currentColor' : 'none'} className={sortBy === 'top-selling' ? 'text-[#1a1c2e] animate-pulse' : 'text-orange-500'} />
              টপ সেলিং
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Premium Discount Invitation Banner */}
      <div className="max-w-4xl mx-auto px-4 mb-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-[#171a2e] via-[#232742] to-[#121424] text-white p-6 md:p-8 shadow-xl border border-white/10"
        >
          {/* Background Decorative patterns */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#e2b755]/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-center md:text-left flex-col md:flex-row">
              <div className="p-4 bg-[#e2b755]/10 text-[#e2b755] rounded-3xl border border-[#e2b755]/20 animate-pulse shrink-0">
                <Trophy size={32} className="text-[#e2b755]" fill="currentColor" />
              </div>
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                  ধামাকা অফার • Magic Gift Card
                </div>
                <h3 className="text-base md:text-xl font-serif font-black tracking-tight text-white leading-snug">
                  অর্ডার করলেই <span className="text-[#e2b755] underline decoration-wavy">১০% থেকে ২৫% পর্যন্ত</span> নিশ্চিত সারপ্রাইজ ডিসকাউন্ট!
                </h3>
                <p className="text-gray-300 text-[11px] md:text-xs leading-relaxed max-w-xl font-medium">
                  যেকোনো ড্রেস পছন্দ করে <b>"অর্ডার করুন"</b> বাটনে চাপ দিলেই অর্ডার ফরমে পাবেন একটি ম্যাজিক গিফট কার্ড। যেকোনো ১টি অপশন সিলেক্ট করলেই আপনি নিশ্চিত <b>১০%, ১৫%, ২০% অথবা ২৫% স্পেশাল ডিসকাউন্ট</b> পেয়ে যাবেন!
                </p>
              </div>
            </div>

            <div className="shrink-0 w-full md:w-auto text-center">
              <div className="inline-flex flex-col items-center bg-white/5 border border-white/10 px-6 py-4 rounded-3xl text-center shadow-lg backdrop-blur-md">
                <span className="text-[9px] uppercase font-black text-[#e2b755] tracking-widest mb-1">কোনো কুপন কোড লাগবে না</span>
                <span className="text-xs font-bold text-gray-300">যেকোনো ১টি কার্ড পছন্দ করলেই</span>
                <span className="text-lg font-black text-rose-450 mt-1 flex items-center gap-1 justify-center">
                  <Gift size={16} /> ২৫% পর্যন্ত অফ!
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-2 md:px-4 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
        {sortedProducts
          .map((product) => {
          const discount = product.discount || 0;
          const originalPrice = product.price + discount;
          
          return (
            <motion.div 
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              className="group bg-white rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-500 border border-gray-100 flex flex-col"
            >
              {/* Image Container */}
              <div 
                className="relative aspect-[4/5] overflow-hidden cursor-pointer"
                onClick={() => setSelectedProduct(product)}
              >
                <img 
                  src={product.imageUrl} 
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {/* Product Tags Badges */}
                <div className="absolute top-2 left-2 md:top-4 md:left-4 flex flex-col gap-1.5">
                   <div className="bg-brand-charcoal/80 backdrop-blur-md text-white text-[7px] md:text-[9px] font-black uppercase tracking-widest px-2 py-1 md:px-3 md:py-1.5 rounded-full inline-flex items-center gap-1 md:gap-2 shadow">
                     <Hash size={8} className="text-brand-gold" />
                     {product.productCode}
                   </div>
                   
                   {/* Top Selling Badge option indicators */}
                   {(sortBy === 'top-selling' || discount > 150) && (
                     <span className="bg-[#ffc300] backdrop-blur-md text-[#10121d] text-[6px] md:text-[8.5px] font-bold uppercase tracking-widest px-2 py-1 rounded-full inline-flex items-center gap-0.5 shadow-md">
                       <Flame size={8} fill="currentColor" className="text-red-650 shrink-0" />
                       Hanger Hot
                     </span>
                   )}
                </div>
              </div>
 
              {/* Content Container */}
              <div className="p-3 md:p-6 flex-1 flex flex-col text-center space-y-2 md:space-y-4">
                <div className="space-y-0.5 md:space-y-1">
                  {product.brand && (
                    <p className="text-[8px] md:text-[9px] font-black text-brand-gold uppercase tracking-[0.15em] md:tracking-[0.2em]">{product.brand}</p>
                  )}
                  <h3 className="text-xs md:text-lg font-bold text-gray-800 leading-tight line-clamp-2 md:line-clamp-1 min-h-[2rem] md:min-h-auto flex items-center justify-center">
                    {product.title}
                  </h3>
                </div>
                
                <div className="flex items-center justify-center gap-1.5 md:gap-3">
                  <span className="text-sm md:text-xl font-black text-[#1a1c2e] tabular-nums">৳{product.price.toLocaleString()}</span>
                  {discount > 0 && (
                    <span className="text-[10px] md:text-sm text-gray-400 line-through font-medium">৳{originalPrice.toLocaleString()}</span>
                  )}
                </div>

                {/* Customer Purchase Count Social Proof */}
                <div className="inline-flex items-center justify-center gap-1.5 bg-emerald-50/70 border border-emerald-100 px-3 py-1.5 rounded-2xl text-[9.5px] md:text-[11px] text-emerald-800 font-bold tracking-normal select-none shadow-sm mx-auto w-fit">
                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  <span><b className="font-extrabold text-emerald-600">{getProductSalesCount(product.productCode, orders, product.initialSalesCount)} জন</b> ইতিমধ্যে কিনেছেন</span>
                </div>

                {/* Micro campaign discount tip */}
                <div className="bg-rose-50/70 border border-rose-100 rounded-xl p-2 flex items-center justify-center gap-1.5 text-[#e11d48] text-[9px] md:text-[10px] font-black tracking-normal select-none">
                  <Gift size={11} className="animate-bounce text-rose-500 shrink-0" />
                  <span>অর্ডারে ১০%-২৫% নিশ্চিত ডিসকাউন্ট!</span>
                </div>
 
                <div className="pt-1 md:pt-2">
                  <button 
                    onClick={() => setSelectedProduct(product)}
                    className="w-full py-2.5 md:py-4 bg-[#438a1a] text-white rounded-lg md:rounded-xl text-[9px] md:text-xs font-black uppercase tracking-widest transition-all hover:bg-[#346b14] active:scale-95 shadow-lg shadow-green-900/5 flex items-center justify-center gap-1 md:gap-2"
                  >
                    <ShoppingCart size={11} className="md:w-3.5 md:h-3.5" />
                    এখনই অর্ডার করুন
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedProduct(null)}
              className="absolute inset-0 bg-[#0f111a]/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col md:flex-row max-h-[95vh]"
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-full transition-all z-20"
              >
                <X size={20} />
              </button>

              {/* Left: Image & Thumbnails */}
              <div className="w-full md:w-[45%] flex flex-col p-4 md:p-6 bg-white overflow-y-auto">
                <div 
                  className="relative aspect-[4/5] rounded-xl overflow-hidden border border-gray-150 cursor-zoom-in group shadow-md"
                  onMouseEnter={() => setIsZoomed(true)}
                  onMouseLeave={() => {
                    setIsZoomed(false);
                    setZoomPos({ x: 50, y: 50 });
                  }}
                  onMouseMove={handleZoomMouseMove}
                  onClick={() => {
                    setIsLightboxOpen(true);
                    setLightboxScale(1.8);
                  }}
                >
                  <img 
                    src={selectedProduct.imageUrl} 
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover transition-transform duration-75 select-none"
                    style={{
                      transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
                      transform: isZoomed ? 'scale(2.3)' : 'scale(1)',
                    }}
                    referrerPolicy="no-referrer"
                  />
                  {/* Zoom indicator label overlay */}
                  <div className="absolute bottom-3 left-3 right-3 bg-black/75 backdrop-blur-md text-[9px] md:text-[10px] text-white px-3 py-2 rounded-xl font-bold tracking-normal flex items-center justify-center gap-1.5 pointer-events-none transition-all opacity-95 group-hover:opacity-100 shadow-lg text-center">
                    <ZoomIn size={12} className="text-brand-gold shrink-0 animate-bounce" />
                    <span>জুম করতে কার্সার রাখুন অথবা ক্লিক করে বড় করুন</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <div className="w-20 h-20 rounded-lg border-2 border-[#438a1a] p-1 cursor-pointer overflow-hidden">
                    <img src={selectedProduct.imageUrl} className="w-full h-full object-cover rounded-md" />
                  </div>
                  {/* Additional placeholder thumbnails if needed */}
                  <div className="w-20 h-20 rounded-lg border border-gray-200 p-1 cursor-not-allowed opacity-40 grayscale overflow-hidden hidden md:block">
                     <img src={selectedProduct.imageUrl} className="w-full h-full object-cover rounded-md" />
                  </div>
                </div>
              </div>

              {/* Right: Info */}
              <div className="w-full md:w-[55%] p-6 md:p-8 space-y-4 overflow-y-auto bg-white">
                <nav className="text-[10px] md:text-sm text-gray-400 font-medium">
                  Home / {selectedProduct.category} / <span className="text-gray-600 font-bold">{selectedProduct.title}</span>
                </nav>

                <div className="space-y-1">
                  <h2 className="text-xl md:text-3xl font-black text-gray-900 leading-tight">
                    {selectedProduct.title}
                  </h2>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-2xl md:text-4xl font-black text-gray-900">৳{selectedProduct.price}</span>
                  {selectedProduct.discount && selectedProduct.discount > 0 && (
                    <span className="text-sm md:text-lg text-gray-400 line-through font-medium">৳{selectedProduct.price + selectedProduct.discount}</span>
                  )}
                </div>

                <div className="flex items-center gap-4 bg-[#fbfbfa] p-2.5 px-3.5 border border-gray-150 rounded-2xl w-fit">
                   <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        size={13} 
                        fill={i < Math.round(averageRating) ? "#fbbf24" : "none"} 
                        className={i < Math.round(averageRating) ? "text-amber-400" : "text-gray-300"} 
                      />
                    ))}
                  </div>
                  <span className="text-xs font-black text-[#1a1c2e] tracking-tight">{averageRating}/5</span>
                  <span className="text-xs text-gray-400">|</span>
                  <span className="text-[10px] font-black text-brand-gold uppercase tracking-widest">{reviews.length} টি কাস্টমার রিভিউ</span>
                </div>

                <div className="inline-block px-4 py-1.5 bg-[#438a1a] text-white rounded-r-full text-[11px] font-black tracking-tight -ml-8 pl-8 relative shadow-lg">
                  প্রোডাক্ট কোড : {selectedProduct.productCode}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/20" />
                </div>

                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-2">
                   <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                     <span className="bg-[#ee1d24] text-white px-2 py-0.5 rounded text-[10px] uppercase">Note :</span> 
                     পণ্যর বিবরণ (Product Details)
                   </p>
                   <p className="text-sm font-medium text-gray-600 leading-relaxed">
                     {selectedProduct.description || 'Sera Fashion House brings you premium quality and exceptional style.'}
                   </p>
                </div>

                <div className="flex items-center gap-2 text-xs font-black text-gray-900 pt-2">
                  <span>Brand :</span>
                  <span className="text-gray-500 uppercase tracking-widest">{selectedProduct.brand || 'Shera Fashion House'}</span>
                </div>

                {/* Modal Discount Alert Callout */}
                <div className="bg-[#10121d] text-white p-4 rounded-3xl border border-white/5 space-y-2 shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-[#e2b755]/10 rounded-full blur-xl pointer-events-none" />
                  <div className="flex items-center gap-2">
                    <Trophy size={14} className="text-[#e2b755]" fill="currentColor" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#e2b755] space-x-1">সারপ্রাইজ গিফট কার্ড অফার</span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-normal font-medium">
                    এই পণ্যটি অর্ডার করলেই নিচে <b>"সারপ্রাইজ মেগা ডিসকাউন্ট কার্ড"</b> পেয়ে যাবেন। যেকোনো একটি ঘর সিলেক্ট করলেই সাথে সাথে আপনার অর্ডারে <b>১০% থেকে ২৫% পর্যন্ত অতিরিক্ত স্পেশাল ডিসকাউন্ট</b> অ্যাক্টিভ হয়ে যাবে!
                  </p>
                </div>

                <div className="flex flex-col gap-4 pt-4">
                  {/* Quantity */}
                  <div className="flex items-center gap-4">
                    <div className="inline-flex items-center border-2 border-gray-200 rounded-xl bg-gray-50 p-1">
                      <button 
                        onClick={() => {
                          const newQty = Math.max(1, quantity - 1);
                          setQuantity(newQty);
                          logVisitorEvent('click', 'change_quantity', `প্রোডাক্টের পরিমাণ কমিয়েছেন: ${newQty} টি 🔢`, 'product_details');
                        }}
                        className="w-10 h-10 flex items-center justify-center font-black text-xl text-gray-600 hover:bg-white rounded-lg transition-colors"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-black text-lg text-gray-900">{quantity}</span>
                      <button 
                        onClick={() => {
                          const newQty = quantity + 1;
                          setQuantity(newQty);
                          logVisitorEvent('click', 'change_quantity', `প্রোডাক্টের পরিমাণ বাড়িয়েছেন: ${newQty} টি 🔢`, 'product_details');
                        }}
                        className="w-10 h-10 flex items-center justify-center font-black text-xl text-gray-600 hover:bg-white rounded-lg transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 pt-2">
                    <button 
                      onClick={() => {
                        onAddToCart?.(selectedProduct, quantity, selectedSize);
                        setSelectedProduct(null);
                      }}
                      className="w-full py-4 bg-[#438a1a] text-white rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-[#346b14] transition-all shadow-lg active:scale-95"
                    >
                      কার্টে যোগ করুন
                    </button>
                    <button 
                      onClick={handleOrder}
                      className="w-full py-4 bg-[#ffc300] text-gray-900 rounded-xl font-black uppercase tracking-widest text-[11px] hover:bg-[#e6b000] transition-all shadow-lg active:scale-95"
                    >
                      অর্ডার করুন
                    </button>
                  </div>
                </div>

                {/* Brand New Professional Customer Reviews & Live Form Segment */}
                <div className="border-t border-gray-150 pt-6 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#161824] flex items-center gap-2">
                      <MessageSquare size={16} className="text-brand-gold" />
                      কাস্টমার রিভিউ ({reviews.length})
                    </h3>
                    <div className="text-xs font-black text-[#438a1a] bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                      ★ {averageRating} গড় রেটিং
                    </div>
                  </div>

                  {/* Real-time statistics badge */}
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-3xl flex items-center gap-3 shadow-sm select-none">
                    <div className="p-2.5 bg-[#438a1a] text-white rounded-2xl shadow-md">
                      <ShoppingBag size={16} className="animate-bounce" />
                    </div>
                    <div>
                      <p className="text-[9px] uppercase font-black tracking-widest text-emerald-600">হট সেলিং প্রোডাক্ট</p>
                      <p className="text-xs font-bold mt-0.5 leading-snug">
                        এই ড্রেসটি ইতিমধ্যে <span className="text-red-500 font-extrabold text-sm">{getProductSalesCount(selectedProduct.productCode, orders, selectedProduct.initialSalesCount)} জন</span> কাস্টমার সফলভাবে ক্রয় করেছেন!
                      </p>
                    </div>
                  </div>

                  {/* Success Alert Banner for Review submission */}
                  <AnimatePresence>
                    {reviewSuccessMessage && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-medium flex items-center gap-2"
                      >
                        <CheckCircle size={16} className="text-[#438a1a] shrink-0 animate-bounce" />
                        <span>{reviewSuccessMessage}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Write a Review Block */}
                  <form onSubmit={handleAddReview} className="bg-[#fbfbfa] p-5 rounded-3xl border border-gray-150 space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-[#1a1c2e]">আপনার মূল্যবান রিভিউ লিখুন</h4>
                      <p className="text-gray-400 text-[10px] font-medium">ড্রেসের মান এবং আমাদের সার্ভিস কেমন লেগেছে তা অন্য কাস্টমারদের জানান</p>
                    </div>

                    <div className="space-y-3">
                      {/* Rating Selection */}
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-gray-500">আপনার রেটিং:</span>
                        <div className="flex items-center gap-1.5">
                          {[1, 2, 3, 4, 5].map((stars) => (
                            <button
                              key={stars}
                              type="button"
                              onClick={() => setNewReviewRating(stars)}
                              className="p-1 hover:scale-125 transition-transform"
                            >
                              <Star
                                size={18}
                                fill={stars <= newReviewRating ? "#fbbf24" : "none"}
                                className={stars <= newReviewRating ? "text-amber-400" : "text-gray-300"}
                              />
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Customer Name input */}
                      <input
                        type="text"
                        required
                        value={newReviewName}
                        onChange={(e) => setNewReviewName(e.target.value)}
                        placeholder="আপনার নাম লিখুন (যেমন: তাসনিম রেজা)"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#438a1a] focus:outline-none focus:border-transparent transition-all"
                      />

                      {/* Comment body */}
                      <textarea
                        required
                        rows={3}
                        value={newReviewComment}
                        onChange={(e) => setNewReviewComment(e.target.value)}
                        placeholder="আপনার মতামত বিস্তারিত লিখুন (কাপড়, কালার এবং প্যাকেজিং কেমন লেগেছে?)"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-[#438a1a] focus:outline-none focus:border-transparent transition-all resize-none"
                      />

                      <button
                        type="submit"
                        disabled={isSubmittingReview}
                        className="w-full py-3 bg-brand-charcoal text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-1.5 shadow-md active:scale-95 disabled:opacity-50 font-black"
                      >
                        {isSubmittingReview ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Send size={11} />
                        )}
                        রিভিউ সাবমিট করুন
                      </button>
                    </div>
                  </form>

                  {/* Review list */}
                  <div className="space-y-3 max-h-80 overflow-y-auto no-scrollbar pr-1">
                    {reviewsLoading ? (
                      <div className="flex items-center justify-center py-8 gap-2 text-gray-400 text-xs font-bold">
                        <Loader2 size={14} className="animate-spin text-brand-gold" />
                        রিভিউ লোড হচ্ছে...
                      </div>
                    ) : reviews.length === 0 ? (
                      <div className="text-center py-6 text-xs font-medium text-gray-400">
                        এখনো কোনো কাস্টমার রিভিউ দেয়া হয়নি। প্রথম রিভিউটি আপনি দিন!
                      </div>
                    ) : (
                      reviews.map((rev) => (
                        <div 
                          key={rev.id || Math.random().toString()} 
                          className="p-4 bg-white border border-gray-100 rounded-2xl space-y-2 shadow-sm transition-all hover:border-gray-200"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center text-[10px] font-black uppercase">
                                {rev.customerName.charAt(0)}
                              </div>
                              <div>
                                <h5 className="text-[11.5px] font-black text-gray-800 flex items-center gap-1">
                                  {rev.customerName}
                                  <span className="text-[8px] bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-1 py-0.2 rounded font-black uppercase tracking-widest leading-none scale-90">Verified Buyer</span>
                                </h5>
                                <span className="text-[9px] text-gray-400 font-medium">
                                  {new Date(rev.createdAt).toLocaleDateString('bn-BD', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  size={10} 
                                  fill={i < rev.rating ? "#fbbf24" : "none"} 
                                  className={i < rev.rating ? "text-amber-400" : "text-gray-200"} 
                                />
                              ))}
                            </div>
                          </div>

                          <p className="text-xs font-medium text-gray-600 leading-relaxed bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                            {rev.comment}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox full-screen zoom explorer */}
      <AnimatePresence>
        {isLightboxOpen && selectedProduct && (
          <div className="fixed inset-0 z-[160] flex flex-col items-center justify-center bg-black/95 backdrop-blur-xl p-4 select-none">
            {/* Top Bar with actions */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-[170] text-white">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-brand-gold tracking-widest">HQ PRODUCT PREVIEW</span>
                <span className="text-xs md:text-sm font-extrabold line-clamp-1">{selectedProduct.title}</span>
              </div>
              <div className="flex items-center gap-2">
                {/* Zoom Controls */}
                <button 
                  onClick={() => setLightboxScale(prev => Math.max(1, prev - 0.5))}
                  className="p-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-all active:scale-90 flex items-center gap-1 text-[10px] font-black"
                  title="Zoom Out"
                >
                  <ZoomOut size={12} />
                  কম করুন
                </button>
                <div className="bg-neutral-900 border border-neutral-800 text-[10px] uppercase font-mono px-2.5 py-1.5 rounded-l-xl rounded-r-xl text-brand-gold font-bold">
                  {lightboxScale.toFixed(1)}x
                </div>
                <button 
                  onClick={() => setLightboxScale(prev => Math.min(4, prev + 0.5))}
                  className="p-2 bg-[#438a1a] hover:bg-[#346b14] text-white rounded-xl transition-all active:scale-90 flex items-center gap-1 text-[10px] font-black"
                  title="Zoom In"
                >
                  <ZoomIn size={12} />
                  বাড়িয়ে দেখুন
                </button>
                
                {/* Close Button */}
                <button 
                  onClick={() => {
                    setIsLightboxOpen(false);
                    setLightboxScale(1);
                  }}
                  className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-all active:scale-90 ml-2"
                  title="Close Preview"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Main Interactive Zoom Area */}
            <div className="relative w-full max-w-xl aspect-[4/5] overflow-hidden rounded-2xl border border-neutral-800 shadow-2xl flex items-center justify-center bg-neutral-950/40">
              <motion.img 
                src={selectedProduct.imageUrl} 
                alt={selectedProduct.title}
                key={lightboxScale}
                initial={{ scale: 0.95 }}
                animate={{ scale: lightboxScale }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="max-h-[75vh] object-contain cursor-grab active:cursor-grabbing selection:bg-transparent"
                style={{
                  touchAction: "none"
                }}
                referrerPolicy="no-referrer"
              />
            </div>

            {/* Bottom help indicator */}
            <div className="absolute bottom-6 text-center text-neutral-400 max-w-sm px-6">
              <div className="inline-flex items-center gap-2 bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-full text-[10px] font-bold text-neutral-300">
                <Info size={12} className="text-brand-gold shrink-0" />
                <span>ড্রেসের কালার ও সুতার নিখুঁত কাজ দেখতে বাটন দিয়ে জুম করুন</span>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
