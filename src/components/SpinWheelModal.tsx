import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Sparkles, X, CheckCircle, Copy, AlertCircle } from 'lucide-react';

interface SpinWheelModalProps {
  setValue: (name: string, value: any) => void;
  watch: (name: string) => any;
  cartLength?: number;
}

// Sparkle particle class representing the firecracker bursts
class Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  decay: number;
  size: number;
  gravity: number;

  constructor(x: number, y: number, color: string) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 4; // realistic explosion speed
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.color = color;
    this.alpha = 1.0;
    this.decay = Math.random() * 0.015 + 0.008; // slightly slower decay for grand visual aura
    this.size = Math.random() * 3.5 + 1.5;
    this.gravity = 0.06;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.vx *= 0.985; // smooth friction
    this.vy *= 0.985;
    this.alpha -= this.decay;
  }

  draw(c: CanvasRenderingContext2D) {
    c.save();
    c.globalAlpha = this.alpha;
    c.fillStyle = this.color;
    c.shadowBlur = 12;
    c.shadowColor = this.color; // gorgeous glowing aura surrounding each sparkle
    c.beginPath();
    c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

// Rocket class travel up from bottom corners and skywards
class FirecrackerRocket {
  x: number;
  y: number;
  tx: number;
  ty: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  exploded: boolean;

  constructor(width: number, height: number) {
    // Alternate launching from bottom left or bottom right
    const launchFromLeft = Math.random() > 0.5;
    this.x = launchFromLeft ? Math.random() * (width * 0.2) + 20 : width - (Math.random() * (width * 0.2) + 20);
    this.y = height + 10;
    this.tx = Math.random() * (width * 0.6) + (width * 0.2); // aim towards center
    this.ty = Math.random() * (height * 0.45) + (height * 0.1); // explode at nice high altitude
    
    const angle = Math.atan2(this.ty - this.y, this.tx - this.x);
    const speed = Math.random() * 6 + 12; // super fast shooting rockets
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    const colors = ['#e2136e', '#D4AF37', '#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#06b6d4'];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.size = 3.5;
    this.exploded = false;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    
    // Check if peak is met
    if (this.vy >= 0 || this.y <= this.ty) {
      this.exploded = true;
    }
  }

  draw(c: CanvasRenderingContext2D) {
    c.save();
    c.fillStyle = this.color;
    c.shadowBlur = 20;
    c.shadowColor = this.color;
    c.beginPath();
    c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

// Main Fireworks Core Component
function CelebrationFireworks() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const rockets: FirecrackerRocket[] = [];
    const sparks: Spark[] = [];

    // Launcher interval
    let ticks = 0;

    const tick = () => {
      // Shimmering darkness with motion blur tail
      ctx.fillStyle = 'rgba(28, 25, 23, 0.25)';
      ctx.fillRect(0, 0, width, height);

      ticks++;
      // Spawn rockets regularly to simulate a high-energy festive night!
      if (ticks % 25 === 0) {
        if (rockets.length < 5) {
          rockets.push(new FirecrackerRocket(width, height));
        }
      }

      // Loop rockets
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.update();
        r.draw(ctx);

        if (r.exploded) {
          // Explode rocket in spectacular rings of twinkling star particles!
          for (let j = 0; j < 65; j++) {
            sparks.push(new Spark(r.x, r.y, r.color));
          }
          rockets.splice(i, 1);
        }
      }

      // Loop sparks
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.update();
        s.draw(ctx);

        if (s.alpha <= 0) {
          sparks.splice(i, 1);
        }
      }

      animId = requestAnimationFrame(tick);
    };

    tick();

    // Spawn fireworks on clicks too! Full user interactive celebration
    const handleClick = (e: MouseEvent) => {
      const colors = ['#e2136e', '#D4AF37', '#10b981', '#3b82f6', '#f59e0b', '#a855f7', '#06b6d4'];
      const chosenColor = colors[Math.floor(Math.random() * colors.length)];
      for (let k = 0; k < 60; k++) {
        sparks.push(new Spark(e.clientX, e.clientY, chosenColor));
      }
    };

    window.addEventListener('click', handleClick);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

const SECTORS = [
  { label: '৫% ডিসকাউন্ট', labelBn: '৫% অফ', code: 'SERA5', discount: 5, color: '#e2136e', text: '#ffffff' }, // Sera Rose
  { label: '১০০৳ কুপন', labelBn: '১০০৳ অফ', code: 'SERA100', discount: 8, color: '#D4AF37', text: '#1C1917' }, // Luxe Gold
  { label: '১০% ডিসকাউন্ট', labelBn: '১০% অফ', code: 'SERA10', discount: 10, color: '#1C1917', text: '#ffffff' }, // charcoal
  { label: 'বিশেষ উপহার', labelBn: 'ফ্রি গিফ্ট', code: 'SERAGIFT', discount: 12, color: '#10b981', text: '#ffffff' }, // emerald
  { label: '১৫% ডিসকাউন্ট', labelBn: '১৫% অফ', code: 'SERA15', discount: 15, color: '#e2136e', text: '#ffffff' }, // Rose
  { label: '২০০৳ কুপন', labelBn: '২০০৳ অফ', code: 'SERA200', discount: 10, color: '#D4AF37', text: '#1C1917' }, // Luxe Gold
  { label: '২০% ডিসকাউন্ট', labelBn: '২০% অফ', code: 'SERA20', discount: 20, color: '#1C1917', text: '#ffffff' }, // charcoal
  { label: 'ফ্রি ডেলিভারি', labelBn: 'ফ্রি শিপিং', code: 'SERAFREE', discount: 10, color: '#ca8a04', text: '#ffffff' }, // special
];

export default function SpinWheelModal({ setValue, watch, cartLength = 0 }: SpinWheelModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [hasSpun, setHasSpun] = useState(false);
  const [wonCoupon, setWonCoupon] = useState<{ code: string; label: string; labelBn: string; discount: number; name: string; phone: string } | null>(null);
  const [rotationAngle, setRotationAngle] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showActivePromoCard, setShowActivePromoCard] = useState(false);

  // Form states matching high-professional image
  const [spinName, setSpinName] = useState('');
  const [spinPhone, setSpinPhone] = useState('');
  const [validationError, setValidationError] = useState('');

  // Confetti particles state
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string; size: number; delay: number }[]>([]);

  // Watch names from parent form to prefill when opening
  const parentCustomerName = watch('customerName') || '';
  const parentMobileNumber = watch('mobileNumber') || '';

  useEffect(() => {
    // Read persisted coupon and spinning state from localStorage
    const savedSpun = localStorage.getItem('sera_wheel_has_spun');
    const savedCoupon = localStorage.getItem('sera_wheel_won_coupon');

    if (savedSpun === 'true' && savedCoupon) {
      try {
        const coupon = JSON.parse(savedCoupon);
        setHasSpun(true);
        setWonCoupon(coupon);
        // Automatically apply the coupon discount to the main form
        setValue('discount', coupon.discount);
      } catch (err) {
        console.error('Error parsing saved coupon:', err);
      }
    } else {
      // Show automatic entrance popup after a small delay if they haven't spun yet
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [setValue]);

  // Sync details from parent when modal opens
  useEffect(() => {
    if (isOpen && !hasSpun) {
      if (parentCustomerName) setSpinName(parentCustomerName);
      if (parentMobileNumber) setSpinPhone(parentMobileNumber);
    }
  }, [isOpen, hasSpun, parentCustomerName, parentMobileNumber]);

  // Close helper
  const handleClose = () => {
    setIsOpen(false);
    setValidationError('');
  };

  // Generate confetti burst
  const triggerConfetti = () => {
    const colors = ['#e2136e', '#D4AF37', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6'];
    const pArray = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100 - 50,
      y: Math.random() * -100 - 20,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 12 + 6,
      delay: Math.random() * 0.3,
    }));
    setParticles(pArray);
  };

  // Run the Spin logic
  const handleSpinNow = () => {
    if (isSpinning || hasSpun) return;

    if (!spinName.trim()) {
      setValidationError('অনুগ্রহ করে আপনার নাম লিখুন।');
      return;
    }
    if (!spinPhone.trim() || spinPhone.length < 11) {
      setValidationError('১১ সংখ্যার সঠিক মোবাইল নম্বর প্রদান করুন।');
      return;
    }
    setValidationError('');
    setIsSpinning(true);

    // Sync names back to primary checkout form to be extremely friendly
    setValue('customerName', spinName);
    setValue('mobileNumber', spinPhone);

    // Decide winning sector.
    // Let's bias toward beautiful larger discounts like 15%, 20%, 200৳ or Special Gift to maximize joy!
    const biasedIndices = [1, 3, 4, 5, 6, 7]; // high-value sectors
    const winningIndex = biasedIndices[Math.floor(Math.random() * biasedIndices.length)];
    const chosenSector = SECTORS[winningIndex];

    const spins = 7; // multiple full spins
    const sectorAngle = 360 / SECTORS.length;
    // Align sector center with the top pointer (at 0 degrees)
    const finalAngle = spins * 360 + (360 - (winningIndex * sectorAngle + sectorAngle / 2));

    setRotationAngle(finalAngle);

    // Transition to success state after deceleration
    setTimeout(() => {
      const wonObject = {
        code: chosenSector.code,
        label: chosenSector.label,
        labelBn: chosenSector.labelBn,
        discount: chosenSector.discount,
        name: spinName,
        phone: spinPhone,
      };

      setHasSpun(true);
      setWonCoupon(wonObject);
      setIsSpinning(false);
      triggerConfetti();

      // Persist locally
      localStorage.setItem('sera_wheel_has_spun', 'true');
      localStorage.setItem('sera_wheel_won_coupon', JSON.stringify(wonObject));

      // Apply to checkout form
      setValue('discount', chosenSector.discount);
    }, 4500);
  };

  const copyCouponCode = () => {
    if (!wonCoupon) return;
    navigator.clipboard.writeText(wonCoupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Draw sectors matching premium geometry
  const CX = 170;
  const CY = 170;
  const R = 160;
  const sectorAngle = 360 / SECTORS.length;

  return (
    <>
      {/* 🚀 Launcher floating floating button with notification badge */}
      <div className={`fixed left-6 z-40 transition-all duration-300 ${cartLength > 0 ? 'bottom-[92px]' : 'bottom-6'}`}>
        <motion.button
          id="gift-spin-launcher"
          onClick={() => {
            if (wonCoupon) {
              setShowActivePromoCard(!showActivePromoCard);
            } else {
              setIsOpen(true);
            }
          }}
          className={`flex items-center gap-2.5 px-5 py-4 rounded-full shadow-2xl font-sans text-xs font-black tracking-wide uppercase transition-all ${
            wonCoupon 
              ? 'bg-emerald-600 border-2 border-emerald-400 text-white shadow-emerald-200 cursor-pointer' 
              : 'bg-[#e2136e] border-2 border-rose-400 text-white cursor-pointer shadow-rose-200'
          }`}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          animate={!wonCoupon ? { y: [0, -6, 0] } : {}}
          transition={!wonCoupon ? { repeat: Infinity, duration: 2, ease: "easeInOut" } : {}}
        >
          <Gift size={18} className="animate-spin-slow" />
          <span>{wonCoupon ? `🎁 কুপন: ${wonCoupon.code}` : '🎉 লাকি স্পিন ও গিফট'}</span>
          {!hasSpun && (
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-yellow-400 border-2 border-white rounded-full flex items-center justify-center text-[9px] font-black text-rose-700 animate-pulse">
              1
            </span>
          )}
        </motion.button>
      </div>

      {/* 🔮 Active Coupon quick hover panel shown on screen when toggled */}
      <AnimatePresence>
        {wonCoupon && showActivePromoCard && !isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.85 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            className={`fixed left-6 z-45 bg-[#1C1917] text-white rounded-3xl p-6 shadow-2xl border-2 border-yellow-400 w-[calc(100vw-3rem)] sm:w-[360px] pointer-events-auto flex flex-col gap-4 overflow-hidden transition-all duration-300 ${
              cartLength > 0 ? 'bottom-[164px]' : 'bottom-24'
            }`}
          >
            {/* Elegant glowing active marker */}
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase font-black text-yellow-400 tracking-widest flex items-center gap-1.5 font-sans">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                <span>সক্রিয় প্রমোশন (Active Promo) ⚡</span>
              </span>
              <button 
                onClick={() => setShowActivePromoCard(false)}
                className="text-gray-400 hover:text-white transition-colors cursor-pointer p-1.5 rounded-full hover:bg-white/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 shadow-inner space-y-3 relative overflow-hidden">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-2xl p-3 shadow-md shadow-emerald-950/50 shrink-0">
                  <Gift size={22} className="animate-bounce" />
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm md:text-base font-serif font-black text-yellow-300 tracking-tight text-left">
                    {wonCoupon.labelBn}
                  </h4>
                  <p className="text-[11px] font-bold text-emerald-400 text-left">
                    অর্ডার করতে কুপনটি ব্যবহার করুন
                  </p>
                </div>
              </div>

              {/* Dashed high-fidelity coupon badge within the popover */}
              <div className="border border-dashed border-emerald-500/40 bg-emerald-500/5 rounded-xl p-3 flex items-center justify-between mt-2">
                <div className="space-y-0.5">
                  <span className="text-[9px] uppercase tracking-wider text-gray-400 font-bold block text-left">প্রোমো কোড (Promo Code)</span>
                  <span className="text-lg md:text-xl font-serif font-black text-emerald-400 tracking-widest uppercase font-mono block text-left">
                    {wonCoupon.code}
                  </span>
                </div>
                <button 
                  onClick={copyCouponCode}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-emerald-950/20 cursor-pointer shrink-0"
                >
                  <Copy size={13} />
                  <span>{copied ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2 bg-[#e2136e]/10 p-3.5 rounded-xl border border-[#e2136e]/20">
              <p className="text-[11px] text-left leading-relaxed font-bold text-stone-200">
                অর্ডার ফর্মে <strong className="text-[#e2136e] font-black">{wonCoupon.discount}% ডিসকাউন্ট</strong> স্বয়ংক্রিয়ভাবে যোগ করা হয়েছে। অভিনন্দন! ❤️
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎪 Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark glass backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleClose}
              className="absolute inset-0 bg-[#1c1917]/85 backdrop-blur-md animate-fade-in"
            />

            {/* Sparkles & Fireworks Dynamic Celebration */}
            {hasSpun && <CelebrationFireworks />}

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative w-full max-w-[450px] bg-white rounded-3xl overflow-hidden shadow-2xl shadow-black/40 border border-gold-200 z-10 flex flex-col"
            >
              {/* Gold Top Border */}
              <div className="h-2 bg-gradient-to-r from-yellow-500 via-[#e2136e] to-[#1C1917]" />

              {/* Close Button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/10 hover:bg-black/25 flex items-center justify-center text-gray-600 cursor-pointer transition-colors"
              >
                <X size={18} />
              </button>

              {/* Content Panel */}
              <div className="px-6 pt-8 pb-7 flex flex-col items-center select-none overflow-y-auto max-h-[85vh] no-scrollbar">
                
                {!hasSpun ? (
                  /* 🎰 SPIN PANEL STATE */
                  <>
                    <div className="inline-flex items-center gap-2 bg-rose-50 border border-rose-200 px-4 py-1.5 rounded-full shadow-sm mb-3">
                      <Sparkles className="text-[#e2136e] animate-pulse" size={14} />
                      <span className="text-[#e2136e] text-[11px] font-black tracking-widest uppercase">🎁 বিশেষ অফার</span>
                    </div>

                    <h2 className="text-[20px] font-serif font-black text-[#1C1917] tracking-tight text-center">
                      SPIN করুন ডিসকাউন্ট/গিফট জিতুন
                    </h2>
                    <p className="text-[11px] font-bold text-gray-400 tracking-wide uppercase mt-1 mb-6 text-center">
                      আপনার তথ্য দিন এবং চান্স পান পুরস্কার জেতার!
                    </p>

                    {/* WHEEL COMPONENT OUTLINE */}
                    <div className="relative w-[280px] h-[280px] md:w-[320px] md:h-[320px] flex items-center justify-center mb-6">
                      {/* Pointer Needle Frame */}
                      <div className="absolute top-0 z-30 drop-shadow-lg flex flex-col items-center">
                        <div className="w-6 h-6 bg-yellow-400 rounded-full border-[3px] border-white flex items-center justify-center shadow-md">
                          <div className="w-2.5 h-2.5 bg-[#e2136e] rounded-full" />
                        </div>
                        <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[14px] border-t-yellow-400 -mt-1.5" />
                      </div>

                      {/* Golden Outer Decorative Ring */}
                      <div className="absolute inset-0 rounded-full border-8 border-yellow-400 p-1 bg-gradient-to-br from-yellow-300 via-amber-200 to-yellow-500 shadow-2xl flex items-center justify-center">
                        {/* Interactive Rotating Pointer Frame */}
                        <div 
                          className="w-full h-full rounded-full overflow-hidden relative shadow-inner bg-stone-100"
                          style={{
                            transform: `rotate(${rotationAngle}deg)`,
                            transition: isSpinning ? 'transform 4.5s cubic-bezier(0.18, 0.89, 0.32, 1.02)' : 'none'
                          }}
                        >
                          <svg viewBox="0 0 340 340" className="w-full h-full transform rotate-[22.5deg]">
                            {SECTORS.map((sector, index) => {
                              const startDeg = index * sectorAngle;
                              const endDeg = (index + 1) * sectorAngle;
                              const startRad = ((startDeg - 90) * Math.PI) / 180;
                              const endRad = ((endDeg - 90) * Math.PI) / 180;

                              const x1 = CX + R * Math.cos(startRad);
                              const y1 = CY + R * Math.sin(startRad);
                              const x2 = CX + R * Math.cos(endRad);
                              const y2 = CY + R * Math.sin(endRad);

                              const d = `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;

                              // Label Positions
                              const middleDeg = startDeg + sectorAngle / 2;
                              const middleRad = ((middleDeg - 90) * Math.PI) / 180;
                              const textDistance = R * 0.65;
                              const textX = CX + textDistance * Math.cos(middleRad);
                              const textY = CY + textDistance * Math.sin(middleRad);

                              return (
                                <g key={index}>
                                  {/* Sector Slice */}
                                  <path d={d} fill={sector.color} stroke="#ffffff" strokeWidth="2.5" />
                                  
                                  {/* Radial Text representation matching screenshots */}
                                  <text
                                    x={textX}
                                    y={textY}
                                    fill={sector.text}
                                    fontSize="10px"
                                    fontWeight="bolder"
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    transform={`rotate(${middleDeg} ${textX} ${textY})`}
                                    className="font-serif tracking-tight select-none"
                                  >
                                    {sector.labelBn}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>

                          {/* Decorative Outer Pin dots around the wheel */}
                          {Array.from({ length: 8 }).map((_, i) => (
                            <div
                              key={i}
                              className="absolute w-2 h-2 bg-white rounded-full border border-gray-200 shadow-md"
                              style={{
                                top: '50%',
                                left: '50%',
                                transform: `translate(-50%, -50%) rotate(${i * 45}deg) translate(0, -145px)`,
                              }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Luxurious Brand Center Logo overlay */}
                      <div className="absolute w-14 h-14 rounded-full bg-white border-2 border-yellow-400 p-0.5 shadow-xl flex items-center justify-center z-10 select-none pointer-events-none">
                        <div className="w-full h-full rounded-full bg-[#1C1917] flex flex-col items-center justify-center text-[8px] font-serif font-bold text-yellow-300 tracking-tighter uppercase leading-none">
                          <span>SERA</span>
                          <span className="text-[5px] text-gray-300 mt-0.5 font-sans italic">COUTURE</span>
                        </div>
                      </div>
                    </div>

                    {/* INPUTS SUBMITS FORM BLOCK */}
                    <div className="w-full space-y-4">
                      <div>
                        <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">আপনার নাম <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          disabled={isSpinning}
                          placeholder="আপনার পুরো নাম লিখুন"
                          value={spinName}
                          onChange={(e) => setSpinName(e.target.value)}
                          className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 outline-none text-sm font-semibold text-[#1C1917] focus:ring-2 focus:ring-rose-500/10 focus:border-rose-400 transition-all font-sans"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-black text-gray-500 uppercase tracking-widest mb-1.5">ফোন নাম্বার <span className="text-red-500">*</span></label>
                        <input
                          type="tel"
                          maxLength={11}
                          disabled={isSpinning}
                          placeholder="০১xxxxxxxxx"
                          value={spinPhone}
                          onChange={(e) => setSpinPhone(e.target.value.replace(/\D/g, ''))}
                          className="w-full px-5 py-3.5 rounded-2xl bg-gray-50 border border-gray-100 outline-none text-sm font-semibold text-[#1C1917] tracking-wider focus:ring-2 focus:ring-rose-500/10 focus:border-rose-400 transition-all font-sans"
                        />
                      </div>

                      {validationError && (
                        <div className="flex items-center gap-2 text-rose-600 text-[11px] font-bold p-3 bg-rose-50 rounded-xl leading-snug">
                          <AlertCircle size={15} />
                          <span>{validationError}</span>
                        </div>
                      )}

                      <button
                        onClick={handleSpinNow}
                        disabled={isSpinning}
                        className="w-full py-4.5 bg-[#e2136e] text-white rounded-2xl font-black text-base shadow-xl shadow-rose-200/50 hover:bg-rose-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Sparkles size={16} />
                        <span>{isSpinning ? 'স্পিন হচ্ছে...' : '✨ স্পিন করুন'}</span>
                      </button>
                    </div>
                  </>
                ) : (
                  /* 🎉 SUCCESS STATUS PANEL */
                  <div className="w-full text-center space-y-6 pt-4 relative">
                    {/* Confetti Explosion Shower */}
                    {particles.map((p) => (
                      <motion.div
                        key={p.id}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                        animate={{ x: p.x, y: p.y, opacity: 0, scale: 0.5 }}
                        transition={{ duration: 1.5, delay: p.delay, ease: "easeOut" }}
                        className="absolute top-1/2 left-1/2 rounded-sm pointer-events-none"
                        style={{
                          backgroundColor: p.color,
                          width: p.size,
                          height: p.size,
                        }}
                      />
                    ))}

                    <div className="inline-flex items-center justify-center bg-emerald-50 border border-emerald-200 p-4 rounded-full shadow-inner mx-auto mb-2">
                      <Gift className="text-emerald-500 animate-bounce" size={40} />
                    </div>

                    <div className="space-y-1">
                      <h3 className="text-2xl font-serif font-black text-emerald-600">অভিনন্দন!</h3>
                      <p className="text-[12px] font-bold text-gray-500">
                        <span className="text-[#1C1917]">{wonCoupon?.name}</span>, আপনি জিতেছেন!
                      </p>
                    </div>

                    <div className="bg-brand-cream/60 rounded-3xl p-6 border-2 border-emerald-100 shadow-md flex flex-col items-center gap-4">
                      <div className="text-lg font-serif font-black text-[#1C1917] tracking-tight bg-white px-5 py-2 rounded-full border border-gray-100 shadow-sm">
                        {wonCoupon?.labelBn}
                      </div>

                      <p className="text-[11px] font-semibold text-gray-500 max-w-xs">
                        যেকোনো প্রোডাক্ট অর্ডার করে ফ্রি বা ডিসকাউন্ট কুপনটি বুঝে নিন!
                      </p>

                      {/* Dashed Coupon Card */}
                      <div className="w-full border-2 border-dashed border-emerald-300 rounded-2xl p-4 bg-emerald-50/20 relative overflow-hidden">
                        <span className="text-[9px] uppercase font-black text-gray-400 tracking-wider">কুপন কোড (Coupon Code)</span>
                        <p className="text-3xl font-serif font-black text-emerald-700 tracking-widest my-2 select-all drop-shadow-sm uppercase">
                          {wonCoupon?.code}
                        </p>
                        <p className="text-[9px] font-bold text-gray-400 mt-1">
                          অর্ডারে এই ডিসকাউন্ট কোডটি স্বয়ংক্রিয়ভাবে প্রবেশ করানো হয়েছে!
                        </p>

                        <div className="mt-4 pt-3 border-t border-dashed border-emerald-100 flex flex-col gap-1 items-center">
                          <p className="text-[9px] font-black text-[#1C1917] uppercase tracking-wider">ভেরিফাইড ফোন নম্বর</p>
                          <p className="text-xs font-mono font-black text-emerald-800 tracking-widest">{wonCoupon?.phone}</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <button
                        onClick={copyCouponCode}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 cursor-pointer"
                      >
                        <Copy size={16} />
                        <span>{copied ? 'কোড কপি করা হয়েছে!' : 'কুপন কোড কপি করুন'}</span>
                      </button>

                      <button
                        onClick={handleClose}
                        className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-[#1C1917] rounded-xl font-bold text-xs transition-all cursor-pointer"
                      >
                        বন্ধ করুন
                      </button>
                    </div>

                    <p className="text-[10px] font-black text-gray-400 tracking-wide">
                      পছন্দের যে কোনো প্রোডাক্ট অর্ডার করুন এবং অফারটি লুফে নিন।  ❤️
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
