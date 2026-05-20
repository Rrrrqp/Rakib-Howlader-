import { RefreshCcw, ShieldCheck, AlertCircle, Phone, MessageCircle, X } from 'lucide-react';
import { motion } from 'motion/react';

export default function ReturnPolicy({ onClose }: { onClose?: () => void }) {
  return (
    <div className="premium-card p-6 md:p-8 rounded-xl space-y-8 bg-white border border-gold-200 shadow-2xl relative max-w-4xl mx-auto">
      {onClose && (
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-brand-charcoal transition-colors"
        >
          <X size={20} />
        </button>
      )}
      <div className="text-center space-y-2 border-b border-gold-200 pb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gold-100 text-brand-gold mb-2">
          <RefreshCcw size={24} />
        </div>
        <h2 className="text-lg font-serif font-bold text-brand-charcoal">রিটার্ন পলিসি (Return Policy)</h2>
        <p className="text-sm text-gray-500 font-sans">Sera Fashion House - ক্রেতার সন্তুষ্টি আমাদের অগ্রাধিকার</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 text-green-600"><ShieldCheck size={20} /></div>
            <div>
              <h3 className="font-bold text-brand-charcoal">রিটার্ন কখন গ্রহণ করা হবে?</h3>
              <ul className="text-sm text-gray-600 list-disc ml-4 space-y-1 mt-2">
                <li>পণ্যের রঙ যদি ছবির সাথে মিল না থাকে।</li>
                <li>পণ্যের কোয়ালিটি বা মান আশানুরূপ না হলে।</li>
                <li>পণ্যটি যদি ছেঁড়া বা কোনোভাবে ত্রুটিপূর্ণ থাকে।</li>
              </ul>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="mt-1 text-amber-600"><AlertCircle size={20} /></div>
            <div>
              <h3 className="font-bold text-brand-charcoal">মনে রাখবেন:</h3>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed">
                পণ্য ঠিক থাকা সত্ত্বেও যদি আপনি রিটার্ন করতে চান, সেক্ষেত্রে আপনাকে **ডেলিভারি চার্জ এবং রিটার্ন চার্জ** প্রদান করতে হবে।
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gold-50 p-4 rounded-lg border border-gold-100 italic text-sm text-gray-700">
            "অবশ্যই ডেলিভারি ম্যানের সামনে পণ্য দেখে রিসিভ করবেন। কোনো সমস্যা থাকলে তাৎক্ষণিকভাবে আমাদের জানাতে হবে।"
          </div>

          <div className="space-y-2">
            <h3 className="font-bold text-brand-charcoal text-sm">রিটার্ন কার্যকর হবে না যদি:</h3>
            <ul className="text-sm text-gray-600 list-disc ml-4 space-y-1">
              <li>পণ্যটি ব্যবহার করা হয়ে থাকে।</li>
              <li>পণ্যটি কাস্টমার কর্তৃক ক্ষতিগ্রস্ত বা ওয়াশ করা হয়ে থাকে।</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-gold-200">
        <div className="text-center space-y-4">
          <div>
            <p className="text-sm font-semibold text-brand-charcoal">সহযোগিতার জন্য আমাদের সাথে সরাসরি যোগাযোগ করুন।</p>
            <p className="text-xs text-gray-500 italic mt-1">আমরা আপনার সমস্যার সমাধানে বদ্ধপরিকর।</p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-3">
            <a 
              href="https://wa.me/8801724628453" 
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-2 bg-[#25D366] text-white rounded-lg text-sm font-bold hover:shadow-lg transition-all shadow-md"
            >
              <MessageCircle size={18} />
              WhatsApp
            </a>
            <a 
              href="tel:01724628453" 
              className="flex items-center gap-2 px-6 py-2 bg-brand-charcoal text-white rounded-lg text-sm font-bold hover:shadow-lg transition-all shadow-md"
            >
              <Phone size={18} />
              Call Now
            </a>
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="text-brand-gold font-serif italic text-sm">সেরা ফ্যাশন হাউস এর উপর আস্থা রাখার জন্য ধন্যবাদ। ❤️</p>
      </div>
    </div>
  );
}
