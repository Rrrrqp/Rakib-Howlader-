import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Heart, CheckCircle2, ShoppingCart, Download, Printer, Loader2 } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { toPng } from 'html-to-image';
import { DigitalInvoice } from './DigitalInvoice';
import { Order } from '../types';

interface SuccessViewProps {
  order: Order;
}

export default function SuccessView({ order }: SuccessViewProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Original Print Functionality
  const handlePrint = useReactToPrint({
    contentRef: invoiceRef,
    documentTitle: `SERA-INVOICE-${order.orderId}`,
  });

  // Real Download Functionality using html-to-image
  const handleDownload = async () => {
    if (!invoiceRef.current) return;
    
    setDownloading(true);
    try {
      // Small delay to ensure rendering is complete
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const dataUrl = await toPng(invoiceRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2, // High resolution
      });
      
      const link = document.createElement('a');
      link.download = `SERA-FASHION-INVOICE-${order.orderId}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback to print if image generation fails
      handlePrint();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-brand-cream py-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full space-y-8"
      >
        {/* Preview of Invoice for High Professionalism (POS Option) - Placed at the top */}
        <div className="-mb-24 sm:-mb-28 md:mb-0">
           <p className="text-center text-xs text-gray-400 mb-4 uppercase tracking-[0.2em] font-bold">ইনভয়েস প্রিভিউ (Invoice Preview)</p>
           <div className="rounded-2xl border-2 border-white shadow-xl overflow-hidden scale-[0.8] origin-top md:scale-100">
             <DigitalInvoice order={order} />
           </div>
        </div>

        {/* Success Card with Details (Enclosing Order Successful, Download buttons, and footer note) - Placed below Invoice Preview */}
        <div className="premium-card p-6 md:p-10 rounded-3xl text-center space-y-6 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-2 luxury-gradient" />
          
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-2">
            <CheckCircle2 size={48} />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-xl font-serif font-bold text-brand-charcoal">অর্ডার সফল হয়েছে!</h2>
            <p className="text-brand-gold text-sm font-medium">আপনার অর্ডার আইডি: <span className="font-bold">{order.orderId}</span></p>
          </div>

          <div className="bg-gold-50 p-4 rounded-2xl border border-gold-200">
            <p className="text-xs text-gray-700 leading-relaxed font-medium">
              আপনার অর্ডারটি সফলভাবে গ্রহণ করা হয়েছে। মেমোটি কাস্টমার কপি হিসেবে ডাউনলোড করে সংরক্ষণ করুন।
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center justify-center gap-2 w-full py-3 bg-brand-charcoal text-white rounded-xl font-bold hover:bg-black transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
            >
              {downloading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <Download size={16} />
              )}
              {downloading ? 'ডাউনলোড হচ্ছে...' : 'ডাউনলোড ইনভয়েস (Download Info)'}
            </button>

            <button 
              onClick={() => handlePrint()}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95 text-xs"
            >
              <Printer size={16} />
              প্রিন্ট ইনভয়েস (Print Instead)
            </button>

            <button 
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 w-full py-3 bg-white border-2 border-gold-200 text-brand-gold rounded-xl font-bold hover:bg-gold-50 transition-all active:scale-95 text-sm"
            >
              <ShoppingCart size={18} />
              নতুন অর্ডার করুন
            </button>
          </div>

          <div className="flex items-center justify-center gap-1 text-xs text-gold-600 pt-2">
            <span>Made with</span>
            <Heart size={12} fill="currentColor" />
            <span>by Sera Fashion House</span>
          </div>
        </div>

        {/* Off-screen Invoice Template for Generation */}
        <div className="fixed -left-[2000px] top-0 pointer-events-none overflow-hidden bg-white">
          <div ref={invoiceRef} className="bg-white">
            <DigitalInvoice order={order} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
