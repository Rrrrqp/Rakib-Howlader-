import React, { useState, useEffect } from 'react';
import { getAllProducts } from '../services/productService';
import { Product } from '../types';
import { ShoppingBag, Eye, ShoppingCart, Loader2, Sparkles, X, Star, Share2, Info, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductShowcaseProps {
  onOrderNow: (product: Product, quantity: number, size: string) => void;
  onAddToCart?: (product: Product, quantity: number, size: string) => void;
}

export default function ProductShowcase({ onOrderNow, onAddToCart }: ProductShowcaseProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');

  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('38');
  const sizes = ['34', '36', '38', '40', '42', '44', '46', '48'];

  const categories = [
    { id: 'ALL', name: 'সবগুলো (All)' },
    { id: 'THREE PIECE', name: 'থ্রি-পিস (Three Piece)' },
    { id: 'SAREE', name: 'শাড়ি (Saree)' },
    { id: 'OTHERS', name: 'অন্যান্য (Others)' }
  ];

  useEffect(() => {
    const fetch = async () => {
      const data = await getAllProducts(true);
      setProducts(data);
      setLoading(false);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      setQuantity(1);
      setSelectedSize('38');
    }
  }, [selectedProduct]);

  const handleOrder = () => {
    if (selectedProduct) {
      onOrderNow(selectedProduct, quantity, selectedSize);
      setSelectedProduct(null);
    }
  };

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
      <div className="max-w-4xl mx-auto px-4 mb-10 overflow-hidden">
        <div className="flex bg-white/50 p-1.5 rounded-2xl border border-gray-100 overflow-x-auto no-scrollbar gap-1.5 scroll-px-4 flex-nowrap">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
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

      <div className="max-w-6xl mx-auto px-2 md:px-4 grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-8">
        {products
          .filter(p => activeCategory === 'ALL' || p.category === activeCategory)
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
                <div className="absolute top-2 left-2 md:top-4 md:left-4">
                   <div className="bg-brand-charcoal/80 backdrop-blur-md text-white text-[7px] md:text-[9px] font-black uppercase tracking-widest px-2 py-1 md:px-3 md:py-1.5 rounded-full inline-flex items-center gap-1 md:gap-2">
                     <Hash size={8} className="text-brand-gold" />
                     {product.productCode}
                   </div>
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
                <div className="relative aspect-[4/5] rounded-xl overflow-hidden border border-gray-100">
                  <img 
                    src={selectedProduct.imageUrl} 
                    alt={selectedProduct.title}
                    className="w-full h-full object-cover"
                  />
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

                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-0.5 text-gray-300">
                    {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i === 4 ? "#e5e7eb" : "#fbbf24"} className={i === 4 ? "" : "text-amber-400"} />)}
                  </div>
                  <span className="text-xs font-bold text-gray-400 tracking-tight">0.00/5</span>
                  <button className="text-xs font-bold text-blue-600 hover:underline">See Reviews</button>
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

                <div className="flex flex-col gap-4 pt-4">
                  {/* Quantity */}
                  <div className="flex items-center gap-4">
                    <div className="inline-flex items-center border-2 border-gray-200 rounded-xl bg-gray-50 p-1">
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="w-10 h-10 flex items-center justify-center font-black text-xl text-gray-600 hover:bg-white rounded-lg transition-colors"
                      >
                        -
                      </button>
                      <span className="w-12 text-center font-black text-lg text-gray-900">{quantity}</span>
                      <button 
                         onClick={() => setQuantity(quantity + 1)}
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
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
