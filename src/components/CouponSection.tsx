import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Sparkles, CheckCircle2, PartyPopper, Trophy } from 'lucide-react';

interface CouponSectionProps {
  onSelect: (discount: number) => void;
}

const FESTIVE_COLORS = [
  { bg: 'bg-rose-500', border: 'border-rose-200', light: 'bg-rose-50', text: 'text-rose-500', name: 'Rose' },
  { bg: 'bg-indigo-500', border: 'border-indigo-200', light: 'bg-indigo-50', text: 'text-indigo-500', name: 'Indigo' },
  { bg: 'bg-amber-500', border: 'border-amber-200', light: 'bg-amber-50', text: 'text-amber-500', name: 'Amber' },
  { bg: 'bg-emerald-500', border: 'border-emerald-200', light: 'bg-emerald-50', text: 'text-emerald-500', name: 'Emerald' },
];

export default function CouponSection({ onSelect }: CouponSectionProps) {
  const [items, setItems] = useState<{ discount: number; color: typeof FESTIVE_COLORS[0] }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const discounts = [10, 15, 20, 25];
    const shuffledDiscounts = [...discounts].sort(() => Math.random() - 0.5);
    const shuffledColors = [...FESTIVE_COLORS].sort(() => Math.random() - 0.5);
    
    const newItems = shuffledDiscounts.map((discount, i) => ({
      discount,
      color: shuffledColors[i],
    }));
    
    setItems(newItems);
  }, []);

  const handleSelect = (index: number) => {
    if (selectedIndex !== null) return;
    
    setSelectedIndex(index);
    setRevealed(true);
    onSelect(items[index].discount);
  };

  return (
    <div className="bg-[#1a1c2e] rounded-3xl overflow-hidden shadow-2xl border border-white/5 space-y-6 pb-6">
      {/* Screenshot Style Header */}
      <div className="pt-8 px-6 text-center space-y-6">
        <div className="inline-flex items-center gap-3 bg-white/5 border border-rose-500/30 px-5 py-2 rounded-full shadow-inner">
          <Trophy className="text-rose-500" size={20} fill="currentColor" />
          <span className="text-white text-sm font-black tracking-[0.2em] uppercase">Mystery Gift Card</span>
        </div>

        <div className="space-y-3">
          <h2 className="text-xl md:text-2xl font-black text-white italic tracking-tight uppercase">
            Win A <span className="text-rose-500">Surprise Discount!</span>
          </h2>
          <p className="text-gray-400 text-[12px] md:text-sm font-medium max-w-xs mx-auto leading-relaxed">
            যেকোনো একটি ঘর পছন্দ করুন এবং জিতে নিন ১০%, ১৫%, ২০% অথবা ২৫% স্পেশাল ডিসকাউন্ট!
          </p>
        </div>
      </div>

      <div className="px-6 grid grid-cols-4 gap-3">
        {items.map((item, index) => (
          <motion.button
            key={index}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={selectedIndex === null ? { scale: 1.05, y: -2 } : {}}
            whileTap={selectedIndex === null ? { scale: 0.95 } : {}}
            onClick={() => handleSelect(index)}
            disabled={selectedIndex !== null}
            className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-300 overflow-hidden group
              ${selectedIndex === index 
                ? `${item.color.bg} text-white shadow-lg ring-2 ring-offset-2 ring-gray-100` 
                : selectedIndex !== null 
                  ? 'bg-gray-50 text-gray-300 opacity-40 scale-95' 
                  : 'bg-white border-2 border-dashed border-gray-200 hover:border-brand-gold hover:bg-gold-50 shadow-sm'
              }`}
          >
            <AnimatePresence mode="wait">
              {revealed && selectedIndex === index ? (
                <motion.div 
                  key="revealed-selected"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  className="flex flex-col items-center"
                >
                  <Sparkles className="mb-0.5" size={18} />
                  <span className="text-lg font-black leading-none">{item.discount}%</span>
                  <span className="text-[8px] font-bold uppercase tracking-tighter">OFF</span>
                </motion.div>
              ) : revealed ? (
                <motion.div 
                  key="revealed-other"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.2 }}
                  className="text-xs font-bold"
                >
                  {item.discount}%
                </motion.div>
              ) : (
                <motion.div 
                  key="unrevealed"
                  className="flex flex-col items-center"
                  animate={{ y: [0, -2, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Gift size={24} className={selectedIndex === null ? 'text-gray-400 group-hover:text-brand-gold' : ''} strokeWidth={1.5} />
                </motion.div>
              )}
            </AnimatePresence>
            
            {selectedIndex === index && (
              <CheckCircle2 className="absolute top-1 right-1 text-white/80" size={10} />
            )}
          </motion.button>
        ))}
      </div>

      {revealed && (
        <div className="px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/10 border border-green-500/20 py-3 px-4 rounded-2xl flex items-center gap-3 justify-center shadow-lg"
          >
            <div className="bg-white p-1 rounded-full shadow-sm">
              <Sparkles className="text-green-500" size={14} />
            </div>
            <p className="text-green-400 font-bold text-[12px] leading-tight">
              চমৎকার! আপনি সফলভাবে <span className="text-green-300 text-sm">{items[selectedIndex!].discount}% মেগা ডিসকাউন্ট</span> আনলক করেছেন!
            </p>
          </motion.div>
        </div>
      )}
    </div>

  );
}
