import { CreditCard } from 'lucide-react';

interface PaymentSectionProps {
  register: any;
  errors: any;
  watch: any;
}

export default function PaymentSection({ register, errors, watch }: PaymentSectionProps) {
  const paymentMethod = watch('paymentMethod');

  const getBrandColors = (method: string) => {
    switch (method) {
      case 'bKash':
        return {
          bg: 'bg-[#e2136e]/5',
          border: 'border-[#e2136e]',
          text: 'text-[#e2136e]',
          accent: 'accent-[#e2136e]',
          ring: 'ring-[#e2136e]'
        };
      case 'Nagad':
        return {
          bg: 'bg-[#f7941d]/5',
          border: 'border-[#f7941d]',
          text: 'text-[#f7941d]',
          accent: 'accent-[#f7941d]',
          ring: 'ring-[#f7941d]'
        };
      case 'Rocket':
        return {
          bg: 'bg-[#8c3494]/5',
          border: 'border-[#8c3494]',
          text: 'text-[#8c3494]',
          accent: 'accent-[#8c3494]',
          ring: 'ring-[#8c3494]'
        };
      case 'Cash On Delivery':
        return {
          bg: 'bg-gold-50',
          border: 'border-brand-gold',
          text: 'text-brand-gold',
          accent: 'accent-brand-gold',
          ring: 'ring-brand-gold'
        };
      default:
        return {
          bg: 'bg-white',
          border: 'border-gray-200',
          text: 'text-gray-600',
          accent: 'accent-brand-gold',
          ring: 'ring-brand-gold'
        };
    }
  };

  const brand = getBrandColors(paymentMethod);

  return (
    <div className="premium-card p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] space-y-6 md:space-y-8">
      <div className="flex items-center gap-3 border-b border-gold-200 pb-4 mb-6">
        <CreditCard className="text-brand-gold" size={24} />
        <h2 className="text-lg font-serif font-black tracking-tight italic">Payment <span className="text-brand-gold">Details</span></h2>
      </div>

      <div className="space-y-6">
        <label className="text-xs font-bold text-gray-800 tracking-tight block">Select Payment Method / পেমেন্ট মাধ্যম নির্বাচন করুন *</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Cash On Delivery', 'bKash', 'Nagad', 'Rocket'].map((method) => {
            const mBrand = getBrandColors(method);
            return (
              <label 
                key={method}
                className={`flex flex-col items-center justify-center p-4 border-2 rounded-2xl cursor-pointer transition-all duration-300 shadow-sm ${
                  paymentMethod === method 
                    ? `${mBrand.border} ${mBrand.bg} ring-4 ring-brand-gold/5` 
                    : 'border-gray-100 hover:border-gold-200 bg-white'
                }`}
              >
                <input 
                  type="radio" 
                  value={method} 
                  {...register('paymentMethod', { required: 'Please select a payment method' })}
                  className="hidden"
                />
                <span className={`text-xs font-black text-center uppercase tracking-wider ${paymentMethod === method ? mBrand.text : 'text-gray-400'}`}>{method}</span>
              </label>
            );
          })}
        </div>
        {errors.paymentMethod && <p className="text-red-500 text-xs font-bold">{errors.paymentMethod.message}</p>}

        {paymentMethod && paymentMethod !== 'Cash On Delivery' && (
          <div className={`p-8 ${brand.bg} rounded-[2rem] border-2 ${brand.border} space-y-6 animate-in fade-in slide-in-from-top-4 transition-all duration-500 shadow-xl`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 bg-white rounded-2xl border border-gray-100 shadow-lg">
              <div>
                <p className={`text-[10px] uppercase tracking-[0.3em] font-black mb-2 ${brand.text}`}>
                  Official Recipient Method: {paymentMethod}
                </p>
                <p className="text-base font-sans tracking-tight">
                  এই নম্বরে টাকা পাঠান: <span className={`${brand.text} font-black underline decoration-2 underline-offset-4`}>01724628453</span>
                </p>
              </div>
              <div className={`text-xs font-black uppercase tracking-widest px-6 py-2 rounded-full border-2 ${brand.border} ${brand.bg} ${brand.text}`}>
                পার্সোনাল / Personal
              </div>
            </div>

            <div className="space-y-4 bg-white/60 p-6 rounded-2xl border border-white/40 shadow-inner">
              <h3 className="font-black text-brand-charcoal text-xs uppercase tracking-widest flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${brand.border} border-4`}></div>
                কিভাবে পেমেন্ট করবেন? (Instructions)
              </h3>
              <ul className="text-xs text-gray-700 space-y-3 font-medium">
                <li className="flex gap-2">
                  <span className="font-black text-brand-gold">01.</span>
                  <span>আপনার <span className={`font-black ${brand.text}`}>{paymentMethod}</span> অ্যাপ অথবা মেনুতে যান।</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-brand-gold">02.</span>
                  <span>'Send Money' (মানি সেন্ড) অপশনটি সিলেক্ট করুন।</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-brand-gold">03.</span>
                  <span>প্রাপক হিসেবে <span className="font-black underline scale-105 inline-block">01724628453</span> নম্বরটি টাইপ করুন।</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-brand-gold">04.</span>
                  <span>অর্ডারকৃত পণ্যের মোট টাকা টাইপ করে পিন নম্বর দিয়ে সফলভাবে সেন্ড করুন।</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-black text-brand-gold">05.</span>
                  <span>পেমেন্ট সফল হওয়ার পর প্রাপ্ত <span className={`font-black ${brand.text}`}>Transaction ID (TrxID)</span> নিচের বক্সে দিন।</span>
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-800 tracking-tight">Transaction Number / ট্রানজেকশন নম্বর *</label>
                <input 
                  {...register('transactionId', { required: paymentMethod !== 'Cash On Delivery' ? 'Transaction ID is required' : false })}
                  placeholder="যেমন: ABC123XYZ"
                  className={`w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:${brand.border} focus:ring-4 focus:ring-brand-gold/10 outline-none transition-all bg-white text-base font-bold uppercase tracking-widest placeholder:text-gray-200`}
                />
                {errors.transactionId && <p className="text-red-500 text-xs font-bold mt-2">{errors.transactionId.message}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-6 border-t-2 border-gold-200">
        <label className="flex items-center gap-4 cursor-pointer group p-4 bg-brand-cream/30 rounded-2xl hover:bg-brand-cream/50 transition-all border border-transparent hover:border-brand-gold/20">
          <input 
            type="checkbox" 
            {...register('agreement', { required: 'You must agree to confirm order' })}
            className="w-6 h-6 accent-brand-gold shrink-0 cursor-pointer"
          />
          <span className="text-xs font-bold text-gray-700 group-hover:text-brand-charcoal transition-colors">
            আমি নিশ্চিত করেছি যে উপরে সকল তথ্য সঠিক এবং আমি অর্ডারটি কনফার্ম করছি
          </span>
        </label>
        {errors.agreement && <p className="text-red-500 text-xs font-bold mt-2 ml-10 flex items-center gap-1 uppercase tracking-widest">
          <span className="bg-red-500 text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px]">!</span>
          {errors.agreement.message}
        </p>}
      </div>
    </div>
  );
}
