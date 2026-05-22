import { motion } from 'motion/react';
import { ExternalLink, Phone, MessageCircle } from 'lucide-react';

interface FormHeaderProps {
  bannerUrl: string;
}

export default function FormHeader({ bannerUrl }: FormHeaderProps) {
  return (
    <div className="w-full">
      <div className="relative h-48 md:h-80 w-full overflow-hidden bg-brand-charcoal">
        <img 
          src={bannerUrl} 
          alt="Sera Fashion House Banner" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="text-center px-4">
            <motion.h1 
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.3, ease: "easeOut" }}
              className="text-2xl md:text-4xl font-serif text-white mb-2 drop-shadow-2xl font-black italic tracking-wide"
            >
              Sera Fashion House
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, letterSpacing: "0.5em" }}
              animate={{ opacity: 1, letterSpacing: "0.2em" }}
              transition={{ duration: 1.5, delay: 0.8, ease: "easeOut" }}
              className="text-gold-200 font-sans uppercase text-[9px] md:text-xs font-bold drop-shadow-lg"
            >
              Premium Three Piece & Saree Collection
            </motion.p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 1.8, ease: "easeOut" }}
          className="premium-card p-6 md:p-8 rounded-xl text-center shadow-2xl"
        >
          <div className="space-y-4">
            <h2 className="text-[#e2136e] font-serif text-sm md:text-base font-bold flex items-center justify-center gap-2">
              Thank you for choosing Sera Fashion House ❤️
            </h2>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
