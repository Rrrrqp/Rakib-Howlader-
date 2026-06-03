import React, { useState, useEffect, useMemo } from 'react';
import { 
  Gift, Phone, User, Clock, ArrowRight, Search, CheckCircle2, 
  AlertCircle, MessageCircle, Copy, Check, Users, ShoppingBag, 
  TrendingUp, RefreshCw, Smartphone
} from 'lucide-react';
import { subscribeToVisitorSessions } from '../services/trackingService';
import { getAllOrders } from '../services/orderService';
import { VisitorSession, Order } from '../types';
import SMSSenderModal from './SMSSenderModal';

interface SpinWheelLeadsListProps {
  orders: Order[];
}

export default function SpinWheelLeadsList({ orders: initialOrders }: SpinWheelLeadsListProps) {
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ORDERED' | 'NO_ORDER'>('ALL');
  const [copiedCellId, setCopiedCellId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Custom SMS Modals state variables
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [selectedSmsLead, setSelectedSmsLead] = useState<any>(null);

  // Load real-time visitor sessions
  useEffect(() => {
    let unsubscribe: any;
    
    async function listen() {
      try {
        unsubscribe = await subscribeToVisitorSessions((data) => {
          setSessions(data);
          setLoading(false);
          // Sync orders from DB in background
          getAllOrders(true).then(dbOrders => {
            if (dbOrders) setOrders(dbOrders);
          }).catch(err => console.warn("Background orders reload failed", err));
        });
      } catch (err) {
        console.error("Failed to subscribe to visitor sessions:", err);
        setLoading(false);
      }
    }

    listen();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [refreshTrigger]);

  // Clean phone utility for perfect purchase cross-referencing
  const cleanPhone = (phone: string) => {
    return (phone || '').replace(/\D/g, '');
  };

  // Process and shape leads with purchase cross-reference
  const leads = useMemo(() => {
    // 1. Filter sessions that have spun the wheel with ultra-robust multi-checkpoint detection
    const spunSessions = sessions.filter(s => {
      if (!s) return false;
      
      const hasSpunFlag = s.hasSpun === true || String(s.hasSpun) === 'true';
      const hasCouponData = !!(s.wonCouponCode || s.wonCouponLabel);
      const stageHasSpin = !!(s.currentStageLabel && (
        s.currentStageLabel.includes('স্পিন') || 
        s.currentStageLabel.includes('Spin') || 
        s.currentStageLabel.includes('অফার') || 
        s.currentStageLabel.includes('গিফট')
      ));
      
      // Look into visitor events list for spin_wheel_completed logs
      let hasSpinEvent = false;
      if (s.events && Array.isArray(s.events)) {
        hasSpinEvent = s.events.some(e => 
          e.target === 'spin_wheel_completed' || 
          (e.description && (
            e.description.includes('স্পিন') || 
            e.description.includes('spin') || 
            e.description.includes('কুপন')
          ))
        );
      }

      // Also if they have both name & number and we recognize they had a spin
      return hasSpunFlag || hasCouponData || stageHasSpin || hasSpinEvent;
    });
    
    // Convert orders list to an easily searchable map by clean phone
    const ordersMap = new Map<string, Order[]>();
    orders.forEach(o => {
      const p = cleanPhone(o.mobileNumber);
      if (p) {
        if (!ordersMap.has(p)) {
          ordersMap.set(p, []);
        }
        ordersMap.get(p)!.push(o);
      }
    });

    return spunSessions.map(s => {
      const p = cleanPhone(s.mobileNumber);
      const matchedOrders = p ? (ordersMap.get(p) || []) : [];
      const hasPurchased = matchedOrders.length > 0;
      
      // Attempt to salvage spin data from log description if some old keys are undefined
      let wonCode = s.wonCouponCode || '';
      let wonLabel = s.wonCouponLabel || '';
      let wonDiscount = s.wonCouponDiscount || 0;

      if (!wonCode && s.events) {
        // Look inside logs for spin completes
        const spinEvt = s.events.find(e => e.target === 'spin_wheel_completed' || e.description.includes('স্পিন'));
        if (spinEvt) {
          const match = spinEvt.description.match(/"([^"]+)"/);
          if (match) {
            wonLabel = match[1];
          }
        }
      }

      return {
        ...s,
        hasPurchased,
        matchedOrders,
        wonCouponCode: wonCode || 'SERA_SPIN_WHEEL',
        wonCouponLabel: wonLabel || 'কুপন ডিসকাউন্ট',
        wonCouponDiscount: wonDiscount || 100
      };
    });
  }, [sessions, orders]);

  // Apply filters and searches
  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const search = searchTerm.toLowerCase();
      const matchesSearch = 
        (l.customerName || '').toLowerCase().includes(search) ||
        (l.mobileNumber || '').includes(search) ||
        (l.wonCouponCode || '').toLowerCase().includes(search) ||
        (l.wonCouponLabel || '').toLowerCase().includes(search);

      const matchesStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'ORDERED' && l.hasPurchased) ||
        (statusFilter === 'NO_ORDER' && !l.hasPurchased);

      return matchesSearch && matchesStatus;
    });
  }, [leads, searchTerm, statusFilter]);

  // Lead Conversion Stats
  const stats = useMemo(() => {
    const total = leads.length;
    const purchased = leads.filter(l => l.hasPurchased).length;
    const pending = total - purchased;
    const conversionRate = total > 0 ? Math.round((purchased / total) * 100) : 0;

    return { total, purchased, pending, conversionRate };
  }, [leads]);

  // Copy Template SMS
  const handleCopySms = (lead: any) => {
    const text = `সালামু আলাইকুম ${lead.customerName || 'গ্রাহক'} আপু/ভাইয়া, আপনি আমাদের 'সেরা ফ্যাশন হাউস' ওয়েবসাইটে স্পিন ঘুরিয়ে '${lead.wonCouponLabel}' স্পেশাল অফারটি পেয়েছিলেন। আমরা দেখছি অর্ডারটি এখনো সম্পূর্ণ হয়নি। আপনি যেকোনো ড্রেস পছন্দ করে এখনই ডিসকাউন্ট কোডটি ব্যবহার করে অর্ডার করতে পারেন অথবা আমাদের ইনবক্স করুন। ধন্যবাদ!`;
    navigator.clipboard.writeText(text);
    setCopiedCellId(`sms-${lead.sessionId}`);
    setTimeout(() => setCopiedCellId(null), 2000);
  };

  // WhatsApp Redirect
  const handleWhatsAppRedirect = (lead: any) => {
    const phone = lead.mobileNumber.startsWith('01') ? ('88' + lead.mobileNumber) : lead.mobileNumber;
    const text = `সালামু আলাইকুম ${lead.customerName || 'গ্রাহক'} আপু/ভাইয়া, আপনি আমাদের 'সেরা ফ্যাশন হাউস' ওয়েবসাইটে স্পিন ঘুরিয়ে '${lead.wonCouponLabel || 'বিশেষ অফার'}' পেয়েছিলেন। আমরা দেখছি আপনার অর্ডারটি সফলভাবে সম্পন্ন হয়নি। আপনি যদি অর্ডার করতে চান বা কুপন ডিসকাউন্টটি ব্যবহার করতে চান, আমরা আপনাকে সাহায্য করতে পারি। আপনার কি কোনো প্রশ্ন আছে?`;
    const url = `https://api.whatsapp.com/send?phone=${phone.replace(/\+/g, '')}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header and Live stats */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <Gift size={20} className="animate-bounce" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-950 font-sans">স্পিন হুইল কাস্টমার লিড ও ট্র্যাকিং ড্যাশবোর্ড</h2>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Track, follow up, and close sales with abandoned cart spin wheel users</p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => {
            setLoading(true);
            setRefreshTrigger(prev => prev + 1);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-xl transition-all text-xs border border-gray-200"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          রিফ্রেশ করুন
        </button>
      </div>

      {/* Analytics bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-rose-50 text-rose-500 rounded-2xl">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Total Spin Leads</span>
            <h3 className="text-2xl font-black text-gray-950 font-sans leading-none mt-1">{stats.total} জন</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">মোট স্পিন করেছেন</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-emerald-500 rounded-2xl">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Completed Purchases</span>
            <h3 className="text-2xl font-black text-emerald-600 font-sans leading-none mt-1">{stats.purchased} জন</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">পণ্য কিনেছেন</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 text-amber-500 rounded-2xl">
            <AlertCircle size={22} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">Abandoned / Follow-up</span>
            <h3 className="text-2xl font-black text-amber-600 font-sans leading-none mt-1">{stats.pending} জন</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">নিচে কার্ট ফেলে চলে গেছেন ⚠️</p>
          </div>
        </div>

        <div className="bg-brand-charcoal text-white p-5 rounded-3xl shadow-md shadow-gray-950/5 flex items-center gap-4">
          <div className="p-3.5 bg-rose-600 text-white rounded-2xl">
            <TrendingUp size={22} />
          </div>
          <div>
            <span className="text-[10px] text-rose-400 font-extrabold uppercase tracking-widest">Conversion Rate</span>
            <h3 className="text-2xl font-black text-[#e2b755] font-sans leading-none mt-1">{stats.conversionRate}%</h3>
            <p className="text-[10px] text-gray-300 font-bold uppercase mt-1">সফল ক্লোজিং রেট</p>
          </div>
        </div>
      </div>

      {/* Filter and search utilities controls */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
        {/* Search Input */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text"
            placeholder="কাস্টমারের নাম, ফোন নম্বর বা কুপন দিয়ে অনুসন্ধান..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 hover:bg-gray-100/70 border border-gray-200 outline-none text-xs font-semibold text-gray-800 rounded-xl focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500 transition-all placeholder-gray-400"
          />
        </div>

        {/* Tab filters */}
        <div className="flex bg-gray-100 p-1 rounded-xl shrink-0 border border-gray-200/50 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${statusFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            جميع স্পিনার্স ({leads.length})
          </button>
          <button
            onClick={() => setStatusFilter('NO_ORDER')}
            className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${statusFilter === 'NO_ORDER' ? 'bg-amber-500 text-white shadow-sm font-black' : 'text-amber-600 hover:text-amber-800'}`}
          >
            অর্ডার করেনি ({leads.filter(l => !l.hasPurchased).length})
          </button>
          <button
            onClick={() => setStatusFilter('ORDERED')}
            className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${statusFilter === 'ORDERED' ? 'bg-emerald-600 text-white shadow-sm font-black' : 'text-emerald-600 hover:text-emerald-800'}`}
          >
            অর্ডার সম্পন্ন ({leads.filter(l => l.hasPurchased).length})
          </button>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center gap-3 text-gray-400">
          <RefreshCw className="animate-spin text-rose-500" size={24} />
          <span className="text-xs font-bold tracking-widest uppercase">রেকর্ড খোঁজা হচ্ছে...</span>
        </div>
      ) : filteredLeads.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-gray-100 shadow-sm text-center space-y-4">
          <div className="p-4 bg-gray-50 text-gray-400 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
            <Gift size={24} />
          </div>
          <h4 className="text-sm font-black text-gray-800">কোনো স্পিন হুইল কাস্টমার রেকর্ড পাওয়া যায়নি</h4>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">যখনই কোনো কাস্টমার নাম ও ফোন নম্বর দিয়ে স্পিন হুইল ঘুরাবে, তাদের লাইভ ডাটা এই মডিউলে সংরক্ষিত হয়ে ব্যাকআপ থাকবে।</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredLeads.map((lead) => {
            const lastActive = new Date(lead.lastActiveAt);
            const isOnlineNow = (Date.now() - lastActive.getTime()) < 45000;
            
            return (
              <div 
                key={lead.sessionId}
                className={`bg-white p-6 rounded-3xl border transition-all flex flex-col justify-between gap-5 relative h-full ${
                  lead.hasPurchased 
                    ? 'border-emerald-100 shadow-sm' 
                    : 'border-amber-200/80 shadow-md shadow-amber-500/5 ring-1 ring-amber-500/10'
                }`}
              >
                {/* Active Indicator Top line */}
                <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl overflow-hidden">
                  <div className={`h-full ${lead.hasPurchased ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                </div>

                <div className="flex items-start justify-between gap-4">
                  {/* Lead details */}
                  <div className="flex gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      lead.hasPurchased ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                    }`}>
                      <User size={18} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-950 flex items-center gap-1.5 font-sans">
                        {lead.customerName || 'Anonymous Visitor'}
                        {isOnlineNow && (
                          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                        )}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-xs font-bold text-gray-700">{lead.mobileNumber}</span>
                        <span className="text-[9px] font-mono tracking-wider font-extrabold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                          {lead.idSuffix}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className="text-right flex flex-col items-end gap-1.5">
                    {lead.hasPurchased ? (
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full whitespace-nowrap">
                        <CheckCircle2 size={10} />
                        অর্ডার সম্পন্ন করেছে
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full whitespace-nowrap animate-pulse">
                        <AlertCircle size={10} />
                        ফলোআপ প্রয়োজন ⚠️
                      </span>
                    )}

                    {lead.deviceInfo && (
                      <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Smartphone size={8} /> {lead.deviceInfo}
                      </span>
                    )}
                  </div>
                </div>

                {/* Won Reward banner */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-150/50 relative overflow-hidden flex items-center justify-between">
                  <div>
                    <span className="text-[8px] uppercase tracking-wider font-black text-rose-500 block leading-none">কুপন পুরস্কার</span>
                    <span className="text-xs font-black text-gray-950 block mt-1.5">{lead.wonCouponLabel}</span>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 block mt-0.5">কোড: {lead.wonCouponCode} (-৳{lead.wonCouponDiscount})</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[9px] font-extrabold text-gray-400 uppercase tracking-widest block leading-none">স্পিন টাইম</span>
                    <span className="text-[10px] font-medium text-gray-800 block mt-1.5 font-sans">
                      {new Date(lead.createdAt).toLocaleDateString('en-GB')} {new Date(lead.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* If they purchased, show order details */}
                {lead.hasPurchased && lead.matchedOrders && (
                  <div className="bg-emerald-50/10 border border-emerald-100 p-3.5 rounded-2xl space-y-2">
                    <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                      <ShoppingBag size={12} />
                      লিংকড কুপন অর্ডার (Linked Orders found):
                    </span>
                    {lead.matchedOrders.map((ord) => (
                      <div key={ord.id} className="flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-700">ID: <span className="font-mono text-xs text-rose-600">{ord.orderId}</span></span>
                        <span className="text-gray-400">৳{ord.totalAmount} | {ord.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* If no purchase, show smart template tools */}
                {!lead.hasPurchased && (
                  <div className="bg-amber-50/10 border border-amber-100/80 p-3.5 rounded-2xl space-y-2">
                    <span className="text-[9px] font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertCircle size={12} />
                      কনভার্সন ক্লোজিং টুলকিট (Conversion tools):
                    </span>
                    <p className="text-[10px] text-gray-600 leading-normal font-medium Bengaly">
                      কাস্টমার কুপন পেয়েও নাম-ঠিকানা খালি ফেলে চলে গেছে। এখনই যোগাযোগ করে অফারটি অফার করে অর্ডার ক্লোজ করুন।
                    </p>
                  </div>
                )}

                {/* Action CTA Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
                  {/* Direct Dial Call */}
                  <a 
                    href={`tel:${lead.mobileNumber}`}
                    className="py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all text-center"
                  >
                    <Phone size={11} />
                    কল দিন
                  </a>

                  {/* Send predefined WhatsApp message */}
                  <button 
                    onClick={() => handleWhatsAppRedirect(lead)}
                    className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all"
                  >
                    <MessageCircle size={11} />
                    হোয়াটসঅ্যাপ
                  </button>

                  {/* Direct automated SMS sending with Bangladeshi & International Gateway integrations */}
                  <button 
                    onClick={() => {
                      setSelectedSmsLead(lead);
                      setSmsModalOpen(true);
                    }}
                    className="py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Smartphone size={11} className="text-indigo-200" />
                    সরাসরি SMS
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Direct Professional Cloud & Device SMS Sender Console modal */}
      {selectedSmsLead && (
        <SMSSenderModal
          isOpen={smsModalOpen}
          onClose={() => {
            setSmsModalOpen(false);
            setSelectedSmsLead(null);
          }}
          recipientName={selectedSmsLead.customerName}
          recipientPhone={selectedSmsLead.mobileNumber}
          couponLabel={selectedSmsLead.wonCouponLabel}
          couponCode={selectedSmsLead.wonCouponCode}
        />
      )}
    </div>
  );
}
