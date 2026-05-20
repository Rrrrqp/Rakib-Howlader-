/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'motion/react';
import FormHeader from './components/FormHeader';
import CustomerInfo from './components/CustomerInfo';
import ProductSection from './components/ProductSection';
import PaymentSection from './components/PaymentSection';
import ReturnPolicy from './components/ReturnPolicy';
import FacebookFollow from './components/FacebookFollow';
import ReviewSection from './components/ReviewSection';
import CouponSection from './components/CouponSection';
import SuccessView from './components/SuccessView';
import AdminDashboard from './components/AdminDashboard';
import { createOrder } from './services/orderService';
import { Order, CartItem } from './types';
import { ShoppingBag, Loader2, Database, RefreshCcw, ArrowDown, ArrowLeft, ShoppingCart, Trash2, Plus, Minus, CheckCircle2 } from 'lucide-react';
import BANNER_IMAGE from './assets/images/sera_fashion_banner_1779021192580.png';
import ProductShowcase from './components/ProductShowcase';
import { Product as ProductType } from './types';

export default function App() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<'form' | 'admin'>('form');
  const [showReturnPolicy, setShowReturnPolicy] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const handleAdminAccess = () => {
    if (adminPhone === '01724628453' && adminPassword === 'Rakib656@') {
      setIsAdminAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
      setAdminPassword('');
    }
  };

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      category: '' as any,
      quantity: 1,
      price: 0,
      deliveryArea: '' as any,
      paymentMethod: 'Cash On Delivery',
      discount: 0,
      productId: '',
      productImage: '',
      productCode: '',
      size: '38',
      agreement: false
    }
  });

  const onSubmit = async (data: any) => {
    if (cart.length === 0) {
      alert("আপনার কার্টে কোনো প্রোডাক্ট নেই।");
      return;
    }

    setSubmitting(true);
    try {
      const deliveryCharge = data.deliveryArea === 'Inside Dhaka' ? 80 : 130;
      
      // Calculate cart totals
      const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const discountAmount = (subtotal * (data.discount || 0)) / 100;
      const totalAmount = (subtotal - discountAmount) + deliveryCharge;
      
      const result = await createOrder({
        ...data,
        items: cart,
        // Sync main fields with first item for legacy compatibility
        productId: cart[0].productId,
        productImage: cart[0].productImage,
        productCode: cart[0].productCode,
        category: cart[0].category,
        price: cart[0].price,
        quantity: cart.reduce((acc, item) => acc + item.quantity, 0),
        deliveryCharge,
        discountAmount,
        totalAmount
      });
      setSubmittedOrder(result);
      setIsSubmitted(true);
      setCart([]); // Clear cart after success
    } catch (error) {
      console.error("Order submission failed:", error);
      alert("অর্ডার সাবমিট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।");
    } finally {
      setSubmitting(false);
    }
  };

  const [checkoutMode, setCheckoutMode] = useState(false);
  const [showAddSuccess, setShowAddSuccess] = useState(false);

  const handleShowcaseOrder = (product: ProductType, orderQuantity: number = 1, orderSize: string = '38') => {
    handleAddToCart(product, orderQuantity, orderSize);
    setCheckoutMode(true);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAddToCart = (product: ProductType, orderQuantity: number = 1, orderSize: string = '38') => {
    const existingIndex = cart.findIndex(item => item.productId === product.id && item.size === orderSize);
    
    if (existingIndex > -1) {
      const newCart = [...cart];
      newCart[existingIndex].quantity += orderQuantity;
      setCart(newCart);
    } else {
      setCart([...cart, {
        id: Math.random().toString(36).substr(2, 9),
        productId: product.id!,
        productTitle: product.title,
        productImage: product.imageUrl,
        productCode: product.productCode,
        category: product.category,
        price: product.price,
        quantity: orderQuantity,
        size: orderSize
      }]);
    }

    setShowAddSuccess(true);
    setTimeout(() => setShowAddSuccess(false), 2000);
  };

  const removeFromCart = (itemId: string) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const updateCartQuantity = (itemId: string, delta: number) => {
    setCart(cart.map(item => {
      if (item.id === itemId) {
        return { ...item, quantity: Math.max(1, item.quantity + delta) };
      }
      return item;
    }));
  };

  if (view === 'admin') {
    if (!isAdminAuthenticated) {
      return (
        <div className="min-h-screen bg-[#0f111a] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-[#1a1c2e] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl text-center space-y-8"
          >
            <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
              <Database className="text-rose-500" size={40} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-serif font-black text-white italic tracking-tight">Admin <span className="text-rose-500">Access</span></h2>
              <p className="text-gray-400 text-sm font-medium tracking-widest uppercase">Management Suite Login</p>
            </div>

            <div className="space-y-4">
              <div className="relative group">
                <input 
                  type="text"
                  placeholder="Admin Phone Number"
                  value={adminPhone}
                  onChange={(e) => setAdminPhone(e.target.value)}
                  className={`w-full bg-[#0c0d15] border ${authError ? 'border-rose-500' : 'border-white/10'} rounded-2xl px-6 py-4 text-white text-center focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all placeholder:text-gray-600 font-mono tracking-widest mb-3`}
                />
                <input 
                  type="password"
                  placeholder="Enter Password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminAccess()}
                  className={`w-full bg-[#0c0d15] border ${authError ? 'border-rose-500' : 'border-white/10'} rounded-2xl px-6 py-4 text-white text-center focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all placeholder:text-gray-600 font-mono tracking-widest`}
                />
                <AnimatePresence>
                  {authError && (
                    <motion.p 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-rose-500 text-[10px] font-black uppercase tracking-widest mt-3"
                    >
                      Access Denied: Invalid Credentials
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <button 
                onClick={handleAdminAccess}
                className="w-full py-4 luxury-gradient rounded-2xl text-white font-black uppercase tracking-[0.2em] text-xs hover:shadow-2xl hover:shadow-rose-500/20 active:scale-95 transition-all"
              >
                Unlock Dashboard
              </button>

              <button 
                onClick={() => setView('form')}
                className="text-[10px] font-black text-gray-500 uppercase tracking-widest hover:text-white transition-colors pt-4"
              >
                Return to Storefront
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="relative">
        <AdminDashboard />
        <button 
          onClick={() => {
            setView('form');
            setIsAdminAuthenticated(false);
            setAdminPassword('');
            setAdminPhone('');
          }}
          className="fixed bottom-6 right-6 p-4 luxury-gradient text-white rounded-full shadow-2xl hover:scale-110 transition-all z-50"
          title="Back to Order Form"
        >
          <ShoppingBag size={24} />
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-cream pb-20 font-sans selection:bg-brand-gold selection:text-white overflow-x-hidden">
      <AnimatePresence mode="wait">
        {isSubmitted && submittedOrder ? (
          <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <SuccessView order={submittedOrder} />
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            key="order-form"
            className="space-y-8"
          >
            {!checkoutMode && <FormHeader bannerUrl={BANNER_IMAGE} />}

            <main className="relative z-10">
              <AnimatePresence mode="wait">
                {!checkoutMode ? (
                  <motion.div 
                    key="storefront"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-8"
                  >
                    <div className="max-w-4xl mx-auto px-4 flex justify-center mt-8 relative z-20 md:px-6">
                      <motion.button 
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        type="button"
                        onClick={() => setShowReturnPolicy(true)}
                        className="luxury-gradient text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center gap-3 border-2 border-white/20 hover:shadow-rose-500/20 transition-all"
                      >
                        <RefreshCcw size={20} className="text-rose-200" />
                        রিটার্ন পলিসি দেখুন (Return Policy)
                      </motion.button>
                    </div>

                    <FacebookFollow />

                    <ProductShowcase 
                      onOrderNow={handleShowcaseOrder}
                      onAddToCart={(p, q, s) => {
                        handleAddToCart(p, q, s);
                        // Optional: trigger some UI feedback
                      }}
                    />

                    <ReviewSection />

                    {/* Added to Cart Success Toast */}
                    <AnimatePresence>
                      {showAddSuccess && (
                        <motion.div
                          initial={{ opacity: 0, y: 50, x: '-50%' }}
                          animate={{ opacity: 1, y: 0, x: '-50%' }}
                          exit={{ opacity: 0, y: 20, x: '-50%' }}
                          className="fixed bottom-24 left-1/2 z-[100] bg-brand-charcoal text-white px-6 py-3 rounded-full shadow-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-white/10"
                        >
                          <CheckCircle2 size={16} className="text-emerald-500" />
                          কার্টে যোগ করা হয়েছে! (Added to Cart)
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Floating Cart Button */}
                    <AnimatePresence>
                      {cart.length > 0 && (
                        <motion.button
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          onClick={() => setCheckoutMode(true)}
                          className="fixed bottom-6 left-6 z-[60] bg-[#438a1a] text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 border-2 border-white/20 active:scale-95 transition-all"
                        >
                          <div className="relative">
                            <ShoppingCart size={24} />
                            <span className="absolute -top-2 -right-2 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#438a1a]">
                              {cart.length}
                            </span>
                          </div>
                          <span className="text-sm font-black uppercase tracking-wider">চেকআউট করুন</span>
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="checkout"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="max-w-4xl mx-auto px-4 md:px-6 space-y-8 pb-10 mt-8"
                  >
                    <div className="flex items-center justify-between py-6">
                      <button 
                        onClick={() => setCheckoutMode(false)}
                        className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-100 rounded-2xl text-gray-600 font-black uppercase tracking-widest text-[10px] hover:border-brand-gold hover:text-brand-gold transition-all shadow-sm group"
                      >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        আগের পেজে ফিরুন (BACK)
                      </button>
                      <div className="text-right">
                        <h2 className="text-2xl font-black text-gray-900 leading-tight">অর্ডার সম্পন্ন করুন</h2>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Complete Your Professional Order</p>
                      </div>
                    </div>

                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl shadow-gray-200/50 overflow-hidden">
                      <div className="h-2 luxury-gradient w-full" />
                      
                      <form 
                        onSubmit={handleSubmit(onSubmit, (errors) => {
                          console.error("Form Errors:", errors);
                          const firstError = Object.keys(errors)[0];
                          const element = document.getElementsByName(firstError)[0] || document.getElementById(firstError);
                          if (element) {
                            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }
                          alert("দয়া করে ফরমের সকল তথ্য সঠিক ভাবে পূরণ করুন।");
                        })} 
                        className="p-6 md:p-10 space-y-12"
                      >
                        <section id="customer-info">
                          <CustomerInfo register={register} errors={errors} watch={watch} setValue={setValue} />
                        </section>

                        <div className="space-y-4">
                          <h3 className="text-lg font-serif font-black italic border-b border-gray-100 pb-2">আপনার ব্যাগ (Your Shopping Bag)</h3>
                          <div className="space-y-4">
                            {cart.map((item) => (
                              <div key={item.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4 group">
                                <img 
                                  src={item.productImage} 
                                  alt={item.productTitle}
                                  className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-xl shadow-md ring-2 ring-white"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="text-sm md:text-base font-bold text-gray-900 truncate">{item.productTitle}</h4>
                                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Code: {item.productCode} • Size: {item.size}</p>
                                    </div>
                                    <button 
                                      type="button"
                                      onClick={() => removeFromCart(item.id)}
                                      className="p-2 text-gray-400 hover:text-rose-500 transition-colors"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-1 border border-gray-200 rounded-lg bg-white p-0.5">
                                      <button 
                                        type="button"
                                        onClick={() => updateCartQuantity(item.id, -1)}
                                        className="w-6 h-6 flex items-center justify-center font-bold text-gray-400 hover:bg-gray-50 rounded"
                                      >
                                        <Minus size={12} />
                                      </button>
                                      <span className="w-8 text-center text-xs font-black text-gray-900">{item.quantity}</span>
                                      <button 
                                        type="button"
                                        onClick={() => updateCartQuantity(item.id, 1)}
                                        className="w-6 h-6 flex items-center justify-center font-bold text-gray-400 hover:bg-gray-50 rounded"
                                      >
                                        <Plus size={12} />
                                      </button>
                                    </div>
                                    <span className="text-sm font-black text-gray-900 tabular-nums">৳{(item.price * item.quantity).toLocaleString()}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {cart.length === 0 && (
                            <div className="py-10 text-center space-y-4">
                              <ShoppingBag size={48} className="mx-auto text-gray-200" />
                              <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Your bag is empty</p>
                              <button 
                                onClick={() => setCheckoutMode(false)}
                                className="text-xs font-black text-brand-gold uppercase tracking-[0.2em] hover:underline"
                              >
                                Return to store and add items
                              </button>
                            </div>
                          )}
                        </div>

                        <CouponSection onSelect={(val) => setValue('discount', val)} />

                        <section id="product-order">
                          <ProductSection 
                            register={register} 
                            errors={errors} 
                            watch={watch} 
                            setValue={setValue} 
                            cart={cart}
                            onAddToCart={handleAddToCart}
                          />
                        </section>

                        <section id="payment">
                          <PaymentSection register={register} errors={errors} watch={watch} />
                        </section>

                        <div className="pt-6">
                          <button 
                            id="submit-order"
                            type="submit"
                            disabled={submitting}
                            className="w-full py-5 bg-[#438a1a] text-white rounded-2xl font-black text-lg transition-all hover:bg-[#346b14] hover:shadow-2xl active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed shadow-xl shadow-green-200"
                          >
                            {submitting ? (
                              <>
                                <Loader2 className="animate-spin" />
                                অর্ডার প্রসেসিং হচ্ছে...
                              </>
                            ) : (
                              <>
                                <ShoppingBag size={24} />
                                অর্ডার নিশ্চিত করুন (Confirm Order)
                              </>
                            )}
                          </button>
                          
                          {/* Mobile Sticky Button Overlay */}
                          <div className="hidden">
                             <button 
                              type="submit"
                              disabled={submitting}
                              onClick={handleSubmit(onSubmit)}
                              className="w-full py-4 bg-[#438a1a] text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg"
                            >
                              {submitting ? <Loader2 className="animate-spin" size={18} /> : <ShoppingBag size={18} />}
                              ক্যাটালগে অর্ডার নিশ্চিত করুন
                            </button>
                          </div>

                          <button 
                            type="button"
                            onClick={() => setCheckoutMode(false)}
                            className="w-full mt-4 py-4 mb-20 md:mb-0 text-gray-400 text-xs font-black uppercase tracking-[0.3em] hover:text-gray-600 transition-colors"
                          >
                            Cancel and return to store
                          </button>
                        </div>
                      </form>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="text-center pt-8 border-t border-gold-200">
                <p className="text-xs text-gray-400 font-serif italic">
                  © 2026 Sera Fashion House. All Rights Reserved.
                </p>
                <div className="mt-4 flex justify-center gap-4">
                  <button 
                    onClick={() => setView('admin')}
                    className="flex items-center gap-1 text-xs text-brand-gold hover:underline"
                  >
                    <Database size={12} />
                    Admin Access
                  </button>
                </div>
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Floating Admin Entry (Hidden/Subtle) */}
      {!isSubmitted && (
        <div className="fixed bottom-4 right-4 opacity-10 hover:opacity-100 transition-opacity">
           <button 
            onClick={() => setView('admin')}
            className="p-2 bg-gray-200 rounded-lg text-gray-500 hover:bg-gray-300"
          >
            <Database size={16} />
          </button>
        </div>
      )}

      {/* Return Policy Modal */}
      <AnimatePresence>
        {showReturnPolicy && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowReturnPolicy(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <ReturnPolicy onClose={() => setShowReturnPolicy(false)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
