import { useState } from 'react';
import { Ruler, Hash, Palette, Layers, Upload, Minus, Plus, Star } from 'lucide-react';
import { Product } from '../types';

interface ProductSectionProps {
  register: any;
  errors: any;
  watch: any;
  setValue: any;
  cart: any[];
  onAddToCart: (product: Product, quantity: number, size: string) => void;
}

export default function ProductSection({ register, errors, watch, setValue, cart, onAddToCart }: ProductSectionProps) {
  const deliveryArea = watch('deliveryArea');
  const discount = watch('discount') || 0;

  // Calculate totals from cart
  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const deliveryCharge = deliveryArea === 'Inside Dhaka' ? 80 : (deliveryArea === 'Outside Dhaka' ? 130 : 0);
  const discountAmount = (subtotal * discount) / 100;
  const totalAmount = (subtotal - discountAmount) + deliveryCharge;

  return (
    <div className="premium-card p-4 md:p-8 rounded-[1.5rem] md:rounded-[2rem] space-y-6 md:space-y-8">
      <div className="bg-brand-cream/50 p-5 md:p-8 rounded-[2rem] border-2 border-gold-200 shadow-xl overflow-hidden">
        <div className="space-y-4">
          <label className="text-sm font-serif font-bold text-gray-800 tracking-tight">Delivery Area</label>
          <div className="grid grid-cols-1 gap-3">
            <label className={`flex items-center justify-between p-5 bg-white border-2 rounded-2xl cursor-pointer group hover:border-brand-gold focus-within:ring-4 focus-within:ring-brand-gold/10 transition-all shadow-sm ${deliveryArea === 'Inside Dhaka' ? 'border-brand-gold bg-brand-gold/5' : 'border-gray-100'}`}>
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center">
                  <input 
                    type="radio" 
                    value="Inside Dhaka" 
                    {...register('deliveryArea', { required: 'ডেলিভারি এরিয়া সিলেক্ট করুন' })}
                    className="w-6 h-6 accent-brand-gold cursor-pointer"
                  />
                </div>
                <span className="text-xs md:text-sm font-serif font-black group-hover:text-brand-gold transition-colors">Inside Dhaka</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base md:text-lg font-serif font-black text-brand-gold">80</span>
                <span className="text-[10px] font-serif font-black text-brand-gold">৳</span>
              </div>
            </label>
            <label className={`flex items-center justify-between p-5 bg-white border-2 rounded-2xl cursor-pointer group hover:border-brand-gold focus-within:ring-4 focus-within:ring-brand-gold/10 transition-all shadow-sm ${deliveryArea === 'Outside Dhaka' ? 'border-brand-gold bg-brand-gold/5' : 'border-gray-100'}`}>
              <div className="flex items-center gap-4">
                <div className="relative flex items-center justify-center">
                  <input 
                    type="radio" 
                    value="Outside Dhaka" 
                    {...register('deliveryArea', { required: 'ডেলিভারি এরিয়া সিলেক্ট করুন' })}
                    className="w-6 h-6 accent-brand-gold cursor-pointer"
                  />
                </div>
                <span className="text-xs md:text-sm font-serif font-black group-hover:text-brand-gold transition-colors">Outside Dhaka</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-base md:text-lg font-serif font-black text-brand-gold">130</span>
                <span className="text-[10px] font-serif font-black text-brand-gold">৳</span>
              </div>
            </label>
          </div>
          {errors.deliveryArea && <p className="text-red-500 text-[10px] font-bold mt-1">{errors.deliveryArea.message}</p>}
        </div>

        <div className="pt-8 border-t-2 border-gold-200 mt-6 space-y-4">
          <div className="flex justify-between items-center text-xs font-serif font-bold">
            <span className="italic text-gray-600">Subtotal ({cart.reduce((acc, i) => acc + i.quantity, 0)} items):</span>
            <span className="font-black text-lg text-brand-charcoal tabular-nums">{subtotal.toLocaleString('en-US')} ৳</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-xs font-serif font-black italic text-green-600">
              <span>Discount ({discount}%):</span>
              <span className="tabular-nums">-{discountAmount.toLocaleString('en-US')} ৳</span>
            </div>
          )}
          <div className="flex justify-between items-center text-xs font-serif font-bold">
            <span className="italic text-gray-600">Delivery Charge:</span>
            <span className="font-black text-lg text-brand-charcoal tabular-nums">+{deliveryCharge.toLocaleString('en-US')} ৳</span>
          </div>

          <div className="pt-6 border-t-2 border-brand-gold/20">
            <p className="text-[10px] font-serif font-black text-gray-400 uppercase tracking-[0.4em] mb-2 text-center">Order Summary</p>
            <div className="flex justify-between items-center bg-white p-5 rounded-2xl shadow-inner border border-gold-100">
              <span className="text-[10px] font-serif font-black text-brand-charcoal uppercase tracking-widest">Net Total:</span>
              <span className="text-2xl font-serif font-black text-brand-gold italic tracking-tight tabular-nums px-2 border-l-2 border-brand-gold/10 ml-4 pl-4 drop-shadow-sm">
                {totalAmount.toLocaleString('en-US')} ৳
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
