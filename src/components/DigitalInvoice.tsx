import React, { useState, useEffect } from 'react';
import { Order } from '../types';
import { ShoppingBag, Phone, MapPin, Calendar, Hash } from 'lucide-react';
import brandLogo from '../assets/images/sfh_logo_1779435027377.png';
import { getBrandLogoSettings } from '../services/settingsService';

interface DigitalInvoiceProps {
  order: Order;
}

export const DigitalInvoice = React.forwardRef<HTMLDivElement, DigitalInvoiceProps>(({ order }, ref) => {
  const [logoUrl, setLogoUrl] = useState<string>(() => {
    try {
      const cached = localStorage.getItem('brand_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.logoUrl) {
          return parsed.logoUrl;
        }
      }
    } catch (e) {
      console.warn("Failed to load cached brand logo for invoice:", e);
    }
    return brandLogo;
  });

  useEffect(() => {
    async function loadLogo() {
      try {
        const logo = await getBrandLogoSettings();
        if (logo) {
          setLogoUrl(logo);
        }
      } catch (err) {
        console.error("Failed to load invoice logo:", err);
      }
    }
    loadLogo();
  }, []);

  const deliveryCharge = order.deliveryCharge || 0;
  const discountAmount = order.discountAmount || 0;
  const netTotal = order.totalAmount;

  // Calculate subtotal from items if available
  const subtotal = order.items && order.items.length > 0 
    ? order.items.reduce((acc, item) => acc + (item.price * item.quantity), 0)
    : (order.quantity * order.price);

  return (
    <div ref={ref} className="bg-white p-4 md:p-8 max-w-[600px] mx-auto text-brand-charcoal font-sans relative overflow-hidden">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-4 gap-2">
        <div className="flex items-center gap-3">
          <img 
            src={logoUrl} 
            alt="Sera Fashion House Logo" 
            className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border border-brand-gold shadow-md"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 className="text-lg md:text-xl font-serif font-black text-brand-gold uppercase tracking-tight">
              SERA FASHION HOUSE
            </h1>
            <p className="text-[10px] md:text-xs font-medium text-gray-500 italic mt-0.5 font-serif">
              Premium Quality, Exceptional Style
            </p>
          </div>
        </div>
        <div className="text-right space-y-1 md:space-y-2">
          <div className="inline-flex items-center gap-1.5 bg-brand-gold text-white px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-widest shadow-sm font-serif">
            INVOICE / ইনভয়েস
          </div>
          <div className="flex flex-col items-end gap-0.5 pr-1 font-serif">
            <div className="flex items-center gap-1 text-[9px] md:text-[10px] font-black text-brand-charcoal">
              <Hash size={8} className="text-brand-gold" />
              <span>ID: {order.orderId}</span>
            </div>
            <div className="flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-gray-400">
              <Calendar size={8} />
              <span>Date: {new Date(order.createdAt).toLocaleDateString('en-US')}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full h-[1px] bg-brand-gold/40 mb-8" />

      {/* Info Sections */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="space-y-3">
          <div className="border-b-[1.5px] border-brand-gold/30 pb-1 inline-block min-w-[150px]">
            <h4 className="text-[8px] font-black text-brand-gold uppercase tracking-widest">
              CUSTOMER DETAILS / গ্রাহকের তথ্য
            </h4>
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-black text-gray-900">{order.customerName}</h3>
            <div className="flex items-center gap-1.5 text-sm text-gray-700 font-bold font-serif">
              <Phone size={12} className="text-brand-gold" />
              <span>{order.mobileNumber}</span>
            </div>
          </div>
        </div>

        <div className="space-y-3 text-right">
          <div className="border-b-[1.5px] border-brand-gold/30 pb-1 inline-block min-w-[180px]">
            <h4 className="text-[8px] font-black text-brand-gold uppercase tracking-widest">
              SHIPPING ADDRESS / ডেলিভারি ঠিকানা
            </h4>
          </div>
          <div className="space-y-1 flex flex-col items-end">
            <div className="flex items-start gap-1.5 text-xs text-gray-600 font-medium max-w-[220px] leading-snug">
              <span>
                {order.address}, {order.upazila}, {order.district}, Bangladesh
              </span>
              <MapPin size={12} className="text-brand-gold mt-0.5 shrink-0" />
            </div>
            <p className="text-sm font-black text-brand-charcoal pt-0.5 uppercase tracking-tight">
              {order.upazila}, {order.district}
            </p>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="mb-8">
        <div className="bg-brand-gold/5 flex py-2 px-4 rounded-lg mb-3 font-serif">
          <div className="w-[45%] text-[8px] font-black text-brand-gold uppercase tracking-widest text-left">DESCRIPTION / বর্ণনা</div>
          <div className="w-[15%] text-center text-[8px] font-black text-brand-gold uppercase tracking-widest">QTY / পরিমাণ</div>
          <div className="w-[20%] text-center text-[8px] font-black text-brand-gold uppercase tracking-widest">PRICE / মূল্য</div>
          <div className="w-[20%] text-right text-[8px] font-black text-brand-gold uppercase tracking-widest">TOTAL / মোট</div>
        </div>
        
        <div className="px-4 space-y-4 font-serif">
          {order.items && order.items.length > 0 ? (
            order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                {item.productImage && (
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                    <img src={item.productImage} alt={item.productTitle} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="w-[45%] text-left">
                  <div className="text-sm font-black text-gray-900 leading-tight">{item.productTitle}</div>
                  <div className="text-[8px] text-gray-400 font-bold mt-0.5 uppercase tracking-wider">
                    Code: {item.productCode} | Size: {item.size}
                  </div>
                </div>
                <div className="w-[12%] text-center text-base font-black text-gray-900 tabular-nums tracking-wide">{item.quantity}</div>
                <div className="w-[20%] text-center text-base font-black text-gray-900 tabular-nums tracking-wide">{item.price.toLocaleString('en-US')} ৳</div>
                <div className="w-[23%] text-right text-base font-black text-gray-900 font-serif">
                  <span className="tabular-nums tracking-wide">{(item.price * item.quantity).toLocaleString('en-US')}</span> ৳
                </div>
              </div>
            ))
          ) : (
            <div className="flex items-center gap-4">
              {order.productImage && (
                <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                  <img src={order.productImage} alt={order.category} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="w-[45%] text-left">
                <div className="text-base font-black text-gray-900 leading-tight">{order.category}</div>
                <div className="text-[9px] text-gray-400 font-bold mt-1 uppercase tracking-wider">Code: {order.productCode}</div>
              </div>
              <div className="w-[12%] text-center text-lg font-black text-gray-900 tabular-nums tracking-wide">{order.quantity}</div>
              <div className="w-[20%] text-center text-lg font-black text-gray-900 tabular-nums tracking-wide">{order.price.toLocaleString('en-US')} ৳</div>
              <div className="w-[23%] text-right text-lg font-black text-gray-900 font-serif">
                <span className="tabular-nums tracking-wide">{(order.quantity * order.price).toLocaleString('en-US')}</span> ৳
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary Box */}
      <div className="flex justify-end mb-8">
        <div className="w-full max-w-[250px] bg-gray-50/80 p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3 font-serif">
          <div className="flex justify-between items-center text-sm font-bold text-gray-600">
            <span>Subtotal:</span>
            <span className="text-gray-900 font-black tabular-nums tracking-wide">{subtotal.toLocaleString('en-US')} ৳</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between items-center text-xs font-black text-green-600 italic">
              <span>Discount ({order.discount}%):</span>
              <span className="tabular-nums tracking-wide">-{discountAmount.toLocaleString('en-US')} ৳</span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm font-bold text-gray-600">
            <span>Shipping:</span>
            <span className="text-gray-900 font-black tabular-nums tracking-wide">+{deliveryCharge.toLocaleString('en-US')} ৳</span>
          </div>
          <div className="h-[1.5px] bg-gray-200" />
          <div className="flex justify-between items-center pt-1 mt-1 border-t-2 border-gray-200">
            <span className="text-base font-black text-brand-charcoal uppercase tracking-widest">TOTAL:</span>
            <span className="text-2xl font-black text-brand-charcoal tabular-nums tracking-wide border-b-4 border-brand-gold/30 pb-0.5">{netTotal.toLocaleString('en-US')} ৳</span>
          </div>
        </div>
      </div>

      <div className="w-full h-px border-t border-dashed border-gray-300 mb-4" />
      
      <div className="text-center space-y-2 pb-2">
        <div className="flex items-center justify-center gap-1.5 text-brand-gold font-serif font-black text-lg italic">
          <ShoppingBag size={18} fill="currentColor" className="opacity-80" />
          <span>Sera Fashion House</span>
        </div>
        <p className="text-[9px] font-bold text-gray-500 max-w-[450px] mx-auto leading-relaxed">
          আমাদের থেকে পণ্য ক্রয় করার জন্য ধন্যবাদ। কোনো সমস্যার জন্য ৭ দিনের মধ্যে রিটার্ন পলিসি প্রযোজ্য।
        </p>
      </div>
    </div>
  );
});
