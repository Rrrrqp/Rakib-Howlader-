import { motion } from 'motion/react';

export default function FacebookFollow() {
  return (
    <motion.div 
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed bottom-10 right-0 z-50 pointer-events-none md:bottom-20"
    >
      <motion.a 
        href="https://www.facebook.com/share/1CzMwt4icz/"
        target="_blank"
        rel="noopener noreferrer"
        whileHover={{ scale: 1.1, x: -5 }}
        whileTap={{ scale: 0.9 }}
        className="pointer-events-auto flex items-center justify-center bg-[#1877F2] text-white w-14 h-14 rounded-full shadow-2xl hover:bg-[#166fe5] transition-colors border-2 border-white group relative mr-4"
      >
        {/* Animated Ring Around Button */}
        <motion.div 
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute -inset-1 bg-[#1877F2] rounded-full -z-10"
        />

        {/* Facebook Logo */}
        <svg 
          viewBox="0 0 24 24" 
          className="w-10 h-10 fill-current shadow-sm"
        >
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>

        {/* Tooltip on hover */}
        <motion.span 
          initial={{ opacity: 0, x: 20 }}
          whileHover={{ opacity: 1, x: -60 }}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-800 text-white text-xs py-1 px-3 rounded-lg pointer-events-none whitespace-nowrap font-bold shadow-lg"
        >
          Follow Us
        </motion.span>
      </motion.a>
    </motion.div>
  );
}
