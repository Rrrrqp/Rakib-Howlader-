import { useState, useEffect } from 'react';
import { getAllProducts } from '../services/productService';
import { Product } from '../types';
import { ShoppingBag, Star, CheckCircle2, ChevronRight, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductPickerProps {
  onSelect: (product: Product) => void;
  selectedId?: string;
}

export default function ProductPicker({ onSelect, selectedId }: ProductPickerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const data = await getAllProducts(true); // Only active products
        setProducts(data);
        setError(false);
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse space-y-4">
            <div className="aspect-[4/5] bg-gray-100 rounded-2xl" />
            <div className="h-4 bg-gray-50 rounded w-3/4" />
            <div className="h-3 bg-gray-50 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error || (products.length === 0 && !loading)) {
    return (
      <div className="text-center py-12 bg-white rounded-[2rem] border border-dashed border-gray-100 italic text-gray-500">
        <ShoppingBag className="mx-auto mb-4 opacity-20" size={48} />
        <p>বর্তমানে কোনো প্রোডাক্ট উপলব্ধ নেই। এডমিন প্যানেল থেকে প্রোডাক্ট আপলোড করুন।</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-brand-gold">
          <Sparkles size={18} />
          <h3 className="text-sm font-serif font-black uppercase tracking-widest text-brand-charcoal">Available Collection</h3>
        </div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{products.length} Items</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {products.map((product) => (
          <motion.button
            key={product.id}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(product)}
            className={`group relative flex flex-col text-left transition-all duration-500 ${
              selectedId === product.id 
                ? 'ring-4 ring-brand-gold/20' 
                : ''
            }`}
          >
            {/* Image Container */}
            <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] md:rounded-[2rem] bg-gray-50">
              <img 
                src={product.imageUrl} 
                alt={product.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Overlay on Selection */}
              <AnimatePresence>
                {selectedId === product.id && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-brand-gold/20 backdrop-blur-[2px] flex items-center justify-center"
                  >
                    <div className="bg-white p-3 rounded-full shadow-2xl">
                      <CheckCircle2 className="text-brand-gold" size={32} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Badge */}
              <div className="absolute top-3 left-3 md:top-4 md:left-4">
                <span className="bg-brand-charcoal/90 backdrop-blur-md text-white text-[8px] md:text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                  {product.category}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="mt-4 px-2 space-y-1">
              {product.brand && (
                <p className="text-[8px] font-black text-brand-gold uppercase tracking-[0.2em]">{product.brand}</p>
              )}
              <div className="flex justify-between items-start gap-2">
                <h4 className="text-xs md:text-sm font-serif font-black text-gray-800 uppercase tracking-tight line-clamp-1 group-hover:text-brand-gold transition-colors">
                  {product.title}
                </h4>
                <div className="text-brand-gold font-bold text-sm tabular-nums text-right shrink-0">
                  ৳{product.price.toLocaleString()}
                </div>
              </div>
              <p className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-widest">{product.productCode}</p>
              
              {selectedId === product.id && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-1.5 text-brand-gold font-black text-[9px] uppercase tracking-widest pt-1"
                >
                  <CheckCircle2 size={12} /> Selected for Order
                </motion.div>
              )}
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
