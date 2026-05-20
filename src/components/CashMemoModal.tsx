import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Receipt, User, Phone, MapPin, Calendar, Plus, Trash2, 
  Minus, Printer, Download, CreditCard, ChevronDown, CheckCircle2
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { downloadAsPng } from '../lib/downloadUtils';

interface CashMemoItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  discount: number;
}

interface CashMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashMemoModal: React.FC<CashMemoModalProps> = ({ isOpen, onClose }) => {
  const [customerName, setCustomerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [memoNo, setMemoNo] = useState(`SFH-${Math.floor(100000 + Math.random() * 900000)}`);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<CashMemoItem[]>([
    { id: '1', name: '', quantity: 1, price: 0, discount: 0 }
  ]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `CASH-MEMO-${memoNo}`,
  });

  const addItem = () => {
    setItems([...items, { id: Math.random().toString(36).substr(2, 9), name: '', quantity: 1, price: 0, discount: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof CashMemoItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
  const totalDiscount = items.reduce((acc, item) => acc + item.discount, 0);
  const totalAmount = subtotal - totalDiscount;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#0f111a]/80 backdrop-blur-xl"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            className="bg-gray-50 w-full max-w-[1000px] rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 bg-white border-b border-gray-100 flex items-center justify-between sticky top-0 z-20">
              <div className="flex items-center gap-4">
                <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-all">
                  <X size={20} className="text-gray-400" />
                </button>
                <div>
                  <h2 className="text-lg font-black text-brand-charcoal">In-Store Cash Memo</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Manual Billing System</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => handlePrint()}
                  className="bg-brand-charcoal text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-black transition-all"
                >
                  <Printer size={14} /> Print
                </button>
                <button 
                  onClick={() => downloadAsPng(printRef, `CASH-MEMO-${memoNo}`, '#ffffff')}
                  className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-900/20 hover:bg-emerald-700 transition-all"
                >
                  <Download size={14} /> Download PNG
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {/* Customer Section */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-50 text-rose-500 rounded-xl">
                      <User size={18} />
                    </div>
                    <h3 className="text-sm font-black text-brand-charcoal uppercase tracking-widest">Customer Information</h3>
                  </div>
                  <span className="text-[10px] font-bold text-rose-500 uppercase">প্রিভিউ দেখুন</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Customer Name</label>
                    <input 
                      type="text" 
                      placeholder="Enter Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Mobile Number</label>
                    <input 
                      type="text" 
                      placeholder="017XXXXXXXX"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Shipping Address</label>
                  <input 
                    type="text" 
                    placeholder="Customer Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20" 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Memo No.</label>
                    <input 
                      type="text" 
                      value={memoNo}
                      onChange={(e) => setMemoNo(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Date</label>
                    <input 
                      type="date" 
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20" 
                    />
                  </div>
                </div>
              </div>

              {/* Product List Section */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-500 rounded-xl">
                      <Receipt size={18} />
                    </div>
                    <h3 className="text-sm font-black text-brand-charcoal uppercase tracking-widest">Product List</h3>
                  </div>
                  <button 
                    onClick={addItem}
                    className="text-[10px] font-black text-indigo-500 uppercase hover:text-indigo-600 flex items-center gap-1"
                  >
                    <Plus size={14} /> এড আইটেম
                  </button>
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-4 items-end bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                      <div className="col-span-12 md:col-span-4 space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2">পণ্যের নাম</label>
                        <input 
                          type="text" 
                          placeholder="Product Name"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                          className="w-full bg-white border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold outline-none" 
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2 space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2 text-center block">পরিমাণ</label>
                        <div className="flex items-center justify-center bg-white border border-gray-100 rounded-xl py-2 px-2">
                          <button onClick={() => updateItem(item.id, 'quantity', Math.max(1, item.quantity - 1))} className="p-1 hover:text-rose-500"><Minus size={12} /></button>
                          <span className="mx-3 text-xs font-black">{item.quantity}</span>
                          <button onClick={() => updateItem(item.id, 'quantity', item.quantity + 1)} className="p-1 hover:text-indigo-500"><Plus size={12} /></button>
                        </div>
                      </div>
                      <div className="col-span-4 md:col-span-2 space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2">মূল্য (৳)</label>
                        <input 
                          type="number" 
                          value={item.price}
                          onChange={(e) => updateItem(item.id, 'price', Number(e.target.value))}
                          className="w-full bg-white border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold outline-none text-center" 
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2 space-y-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-2">ডিসকাউন্ট (৳)</label>
                        <input 
                          type="number" 
                          value={item.discount}
                          onChange={(e) => updateItem(item.id, 'discount', Number(e.target.value))}
                          className="w-full bg-white border border-gray-100 rounded-xl py-3 px-4 text-xs font-bold outline-none text-center" 
                        />
                      </div>
                      <div className="col-span-12 md:col-span-2 flex justify-center md:pb-2">
                        <button 
                          onClick={() => removeItem(item.id)}
                          className="p-3 text-rose-500 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-6 space-y-4">
                   <div className="text-left space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Payment Method</label>
                    <select 
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full md:w-64 bg-gray-50 border border-gray-100 rounded-2xl py-4 px-6 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20 bg-white"
                    >
                      <option value="Cash">Cash</option>
                      <option value="bKash">bKash</option>
                      <option value="Nagad">Nagad</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Preview Section */}
              <div className="space-y-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Preview</p>
                <div className="bg-white rounded-[3rem] shadow-xl border border-gray-100 overflow-hidden">
                  <div ref={printRef} className="bg-white p-12 text-[#1a1c2e] font-sans">
                    <div className="relative border-[4px] border-[#1a1c2e] p-10">
                      {/* Header */}
                      <div className="text-center space-y-1 mb-12 border-b-4 border-[#1a1c2e] pb-6">
                        <h1 className="text-4xl font-black italic tracking-tighter text-[#1a1c2e]">
                          Sera Fashion <span className="text-rose-600">House</span>
                        </h1>
                        <p className="text-[8px] font-black tracking-[0.4em] uppercase text-gray-400">Couture • Excellence • Tradition</p>
                        
                        <div className="flex justify-center gap-8 pt-4">
                          <div className="flex items-center gap-1.5 text-[8px] font-black text-gray-500">
                             <MapPin size={10} className="text-rose-600" />
                             <span>Buddijibe kobor astan gate No. 1, Mazza Road, Mirpur-1 Dhaka</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[8px] font-black text-gray-500">
                             <Phone size={10} className="text-rose-600" />
                             <span>01724628453 (Hotline)</span>
                          </div>
                        </div>
                      </div>

                      <div className="absolute top-[160px] right-10 flex flex-col items-end">
                         <div className="text-[28px] font-black text-gray-100/50 uppercase leading-none select-none">CASH MEMO</div>
                         <div className="bg-rose-600 text-white px-3 py-0.5 text-[8px] font-black uppercase tracking-widest mt-[-4px]">Original Receipt</div>
                      </div>

                      <div className="flex justify-between items-start mb-12">
                        <div className="space-y-4">
                          <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest">Bill To</p>
                          <div className="space-y-1">
                            <h3 className="text-xl font-black">{customerName || '---'}</h3>
                            <p className="text-[11px] font-bold text-gray-400">{mobileNumber || '---'}</p>
                            <p className="text-[11px] font-bold text-gray-400 max-w-[250px]">{address || '---'}</p>
                          </div>
                        </div>
                        <div className="text-right space-y-4">
                          <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Memo No</p>
                            <p className="text-sm font-black mt-1">{memoNo}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest leading-none">Date</p>
                            <p className="text-sm font-black mt-1">{date}</p>
                          </div>
                        </div>
                      </div>

                      <table className="w-full mb-12">
                        <thead>
                          <tr className="border-y-4 border-[#1a1c2e] text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">
                            <th className="py-2 text-left">Sl</th>
                            <th className="py-2 text-left">Items & Description</th>
                            <th className="py-2 text-center">Qty</th>
                            <th className="py-2 text-right">Unit Price</th>
                            <th className="py-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {items.map((item, idx) => (
                            <tr key={item.id} className="text-[11px] font-black">
                              <td className="py-4 text-[#1a1c2e]">{idx + 1}</td>
                              <td className="py-4 text-[#1a1c2e]">{item.name || '---'}</td>
                              <td className="py-4 text-center text-gray-500">{item.quantity}</td>
                              <td className="py-4 text-right text-gray-500 tabular-nums">৳ {item.price.toLocaleString('en-US')}</td>
                              <td className="py-4 text-right text-[#1a1c2e] tabular-nums">৳ {(item.quantity * item.price).toLocaleString('en-US')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="flex justify-between items-start pt-8">
                        <div className="space-y-6">
                           <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center">
                                 <CheckCircle2 size={14} />
                              </div>
                              <div>
                                 <p className="text-[7px] font-black text-gray-400 uppercase tracking-widest leading-none">Payment Method</p>
                                 <p className="text-[11px] font-black text-[#1a1c2e] uppercase mt-1">{paymentMethod}</p>
                              </div>
                           </div>
                           <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 max-w-[300px]">
                              <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-1">Important Note</p>
                              <p className="text-[8px] font-bold text-gray-400 leading-relaxed italic">
                                ধন্যবাদ আমাদের সাথে কেনাকাটা করার জন্য। পণ্য পরিবর্তনের জন্য ৭ দিনের মধ্যে মেমো সহ যোগাযোগ করুন।
                              </p>
                           </div>
                        </div>
                        <div className="w-full max-w-[280px] space-y-3">
                          <div className="flex justify-between text-[11px] font-black text-gray-400 uppercase tabular-nums">
                            <span>Subtotal</span>
                            <span className="text-[#1a1c2e]">৳ {subtotal.toLocaleString('en-US')}</span>
                          </div>
                          <div className="flex justify-between text-[11px] font-black text-rose-500 uppercase tabular-nums">
                            <span>Total Discount</span>
                            <span>- ৳ {totalDiscount.toLocaleString('en-US')}</span>
                          </div>
                          <div className="pt-4 border-t-2 border-[#1a1c2e] flex justify-between items-center group tabular-nums">
                            <span className="text-[14px] font-black uppercase tracking-[0.2em] text-[#1a1c2e]">Total Amount</span>
                            <span className="text-2xl font-black text-[#1a1c2e]">৳ {totalAmount.toLocaleString('en-US')}</span>
                            <div className="absolute h-1 bg-[#1a1c2e] w-full bottom-0 left-0" />
                          </div>
                        </div>
                      </div>

                      <div className="mt-24 flex justify-between items-end">
                         <div className="text-center space-y-2">
                            <div className="w-48 h-[1px] bg-gray-200" />
                            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Customer Signature</p>
                         </div>
                         <div className="text-center space-y-0">
                            <p className="text-lg font-serif italic text-rose-600 mb-[-4px]">Sera Fashion House</p>
                            <div className="w-48 h-[1px] bg-[#1a1c2e]" />
                            <p className="text-[8px] font-black text-[#1a1c2e] uppercase tracking-widest mt-1">Authorized Signature</p>
                         </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
