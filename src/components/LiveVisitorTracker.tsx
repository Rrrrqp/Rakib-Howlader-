import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Eye, Clock, Smartphone, Laptop, Tablet, MapPin, 
  Phone, ShoppingCart, CheckCircle2, User, RefreshCw, Activity, 
  ArrowRight, Heart, ShoppingBag, Award, Home, Info
} from 'lucide-react';
import { subscribeToVisitorSessions } from '../services/trackingService';
import { VisitorSession, ProductView } from '../types';

export default function LiveVisitorTracker() {
  const [sessions, setSessions] = useState<VisitorSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [nowTime, setNowTime] = useState(new Date());

  // Subscribe to live tracking sessions
  useEffect(() => {
    let unsubscribe: any;
    
    async function startListening() {
      try {
        unsubscribe = await subscribeToVisitorSessions((liveData) => {
          setSessions(liveData);
          setLoading(false);
        });
      } catch (err) {
        console.error("Failed to subscribe to live visitor sessions:", err);
        setLoading(false);
      }
    }

    startListening();

    // Regular interval to update "seconds elapsed/last active" relative timers
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 1000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(timer);
    };
  }, []);

  // Helper to format duration correctly
  const formatDuration = (startStr: string, activeStr: string) => {
    const start = new Date(startStr).getTime();
    const active = new Date(activeStr).getTime();
    const elapsed = Math.max(0, active - start);
    
    const minutes = Math.floor(elapsed / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    if (minutes === 0) {
      return `${seconds} সেকেন্ড`;
    }
    return `${minutes} মিনিট ${seconds} সেকেন্ড`;
  };

  // Helper to determine if session is currently active (heartbeat within 45s)
  const isSessionActive = (lastActiveStr: string) => {
    const lastActive = new Date(lastActiveStr).getTime();
    const diff = nowTime.getTime() - lastActive;
    return diff < 45000; // 45 seconds limit
  };

  // Helper to calculate last active relative text
  const formatLastActive = (lastActiveStr: string) => {
    const lastActive = new Date(lastActiveStr).getTime();
    const diff = nowTime.getTime() - lastActive;
    
    if (diff < 10000) return "এইমাত্র সক্রিয়";
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return `${seconds} সেকেন্ড আগে`;
    
    const minutes = Math.floor(seconds / 60);
    return `${minutes} মিনিট আগে`;
  };

  // Stats Calculations
  const stats = useMemo(() => {
    const activeOnlineCount = sessions.filter(s => isSessionActive(s.lastActiveAt)).length;
    
    // Calculate total product views list
    const viewsMap: Record<string, { title: string; count: number; imageUrl: string }> = {};
    let totalViewsCount = 0;
    
    sessions.forEach(s => {
      totalViewsCount += s.views?.length || 0;
      s.views?.forEach(v => {
        if (!viewsMap[v.productCode]) {
          viewsMap[v.productCode] = { title: v.productTitle, count: 0, imageUrl: v.imageUrl };
        }
        viewsMap[v.productCode].count++;
      });
    });

    const popularProducts = Object.entries(viewsMap)
      .map(([code, data]) => ({ code, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return {
      totalVisitors: sessions.length,
      onlineNow: activeOnlineCount,
      totalViewsCount,
      popularProducts
    };
  }, [sessions, nowTime]);

  return (
    <div className="space-y-8 pb-16">
      
      {/* 1. Header Section */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl relative">
            <Activity size={22} className="animate-pulse" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">রিয়েল-টাইম কাস্টমার ট্র্যাকার (Live Visitor Tracking)</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Watch Live Actions, Product Views & Funnel Exit Paths</p>
          </div>
        </div>

        {/* Live Indicator Counts badge */}
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-100 p-2.5 px-4 rounded-2xl">
          <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" />
          <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
            সরাসরি ওয়েবসাইটে আছেন: {stats.onlineNow} জন
          </span>
        </div>
      </div>

      {/* 2. Highlights Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Live Status */}
        <div className="bg-[#10121d] text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between min-h-[140px] relative overflow-hidden group">
          <div className="relative z-15 space-y-1">
            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Live Pulse</span>
            <h3 className="text-3xl font-black">{stats.onlineNow} <span className="text-xs font-bold text-gray-400">অনলাইন</span></h3>
            <p className="text-[11px] text-gray-400 font-medium">ওয়েবসাইটে ভিজিটরদের লাইভ অ্যাক্টিভিটি ট্র্যাক হচ্ছে</p>
          </div>
          <Users size={88} className="absolute -bottom-6 -right-6 text-white/5 group-hover:scale-105 transition-transform" />
        </div>

        {/* Card 2: Total Traveled */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[140px]">
          <div className="space-y-1">
            <span className="text-[10px] text-[#4f46e5] font-black uppercase tracking-widest">Total Footfall</span>
            <h3 className="text-3xl font-black text-[#1a1c2e]">{stats.totalVisitors} <span className="text-xs font-bold text-gray-400">মোট ভিজিটর</span></h3>
            <p className="text-[11px] text-gray-400 font-medium">আজকের সর্বমোট স্বতন্ত্র সেশনের সংখ্যা</p>
          </div>
        </div>

        {/* Card 3: Total Product Views */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[140px]">
          <div className="space-y-1">
            <span className="text-[10px] text-rose-500 font-black uppercase tracking-widest">Product Impressions</span>
            <h3 className="text-3xl font-black text-[#1a1c2e]">{stats.totalViewsCount} <span className="text-xs font-bold text-gray-400">বার দেখা হয়েছে</span></h3>
            <p className="text-[11px] text-gray-400 font-medium">ভিজিটরদের প্রোডাক্ট দেখার মোট সংখ্যা</p>
          </div>
        </div>

      </div>

      {/* 3. Popular Product Views of Current Session List of items */}
      {stats.popularProducts.length > 0 && (
        <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <Eye size={16} className="text-indigo-600" />
            এই মুহূর্তে সবচেয়ে বেশি দেখা হচ্ছে (Most Viewed Category & Products)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {stats.popularProducts.map((p, idx) => (
              <div key={p.code} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-sm transition-all">
                <div className="relative shrink-0">
                  <img src={p.imageUrl} alt={p.title} className="w-12 h-12 object-cover rounded-xl" />
                  <span className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-[#10121d] text-[10px] font-black text-[#e2b755] rounded-full flex items-center justify-center border-2 border-white">
                    {idx + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-gray-900 truncate">{p.title}</h4>
                  <p className="text-[10px] font-bold text-gray-400">কোড: {p.code}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="bg-rose-50 text-rose-600 font-bold text-[10px] px-2.5 py-1 rounded-xl">
                    {p.count} বার ভিউ
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Live Sessions Tracker Feed Grid */}
      <div className="space-y-6">
        <h3 className="text-sm font-black text-[#1a1c2e] uppercase tracking-wider flex items-center gap-2">
          <Activity size={16} className="text-emerald-500 animate-pulse" />
          ভিজিটরদের অ্যাক্টিভিটি টাইমলাইন (Live Traveled Sessions Feed)
        </h3>

        {loading ? (
          <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 text-gray-400">
            <RefreshCw className="animate-spin text-emerald-500" size={24} />
            <span className="text-xs font-bold tracking-widest uppercase">রেকর্ড খোঁজা হচ্ছে... (Syncing Live Feed)</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-white p-16 rounded-3xl text-center border border-gray-100 shadow-sm space-y-3">
            <div className="p-4 bg-gray-50 text-gray-400 rounded-full w-16 h-16 flex items-center justify-center mx-auto">
              <Users size={24} />
            </div>
            <h4 className="text-sm font-black text-gray-800">কোনো ভিজিটর ট্র্যাক করা যায়নি</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">যখন কোনো কাস্টমার ওয়েবসাইট ভিজিট করবে, তখন সেশন এবং প্রোডাক্ট ভিউর বিবরণ লাইভ এখানে দেখা যাবে।</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {sessions.map((session) => {
                const active = isSessionActive(session.lastActiveAt);
                
                return (
                  <motion.div
                    key={session.sessionId}
                    layoutId={`session-${session.sessionId}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-white p-6 rounded-3xl border transition-all flex flex-col justify-between gap-5 relative overflow-hidden ${
                      active 
                        ? 'border-emerald-200 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/20' 
                        : 'border-gray-100 shadow-sm hover:shadow-md'
                    }`}
                  >
                    
                    {/* Active Ribbon indicator */}
                    <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl overflow-hidden">
                      <div className={`h-full ${active ? 'bg-emerald-500 animate-pulse' : 'bg-gray-200'}`} />
                    </div>

                    {/* Metadata Header (ID, Device, Status Indicator) */}
                    <div className="flex items-start justify-between gap-3">
                      
                      {/* Name & ID details */}
                      <div className="flex gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black ${
                          active ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {session.deviceInfo.includes('Mobile') ? <Smartphone size={18} /> : 
                           session.deviceInfo.includes('Tablet') ? <Tablet size={18} /> : 
                           <Laptop size={18} />}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-gray-950">
                              {session.customerName || 'Anonymous Visitor'} 
                            </h4>
                            <span className="text-[10px] font-mono tracking-wider text-gray-400 font-bold bg-gray-50 px-1.5 py-0.5 rounded">
                              {session.idSuffix}
                            </span>
                          </div>
                          
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                            {session.deviceInfo}
                          </p>
                        </div>
                      </div>

                      {/* Live Badge status */}
                      <div className="text-right flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                          active 
                            ? 'bg-emerald-500 text-white animate-pulse' 
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : 'bg-gray-400'}`} />
                          {active ? 'Active Now' : 'Disconnected'}
                        </span>
                        
                        <span className="text-[9px] font-black text-gray-400">
                          {formatLastActive(session.lastActiveAt)}
                        </span>
                      </div>

                    </div>

                    {/* Funnel Location Progress display */}
                    <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 space-y-3.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-gray-400 uppercase tracking-widest text-[9px]">Funnel Progress:</span>
                        <span className="font-bold text-[#10121d]">{session.currentStageLabel}</span>
                      </div>

                      {/* Interactive Visual funnels indicators */}
                      <div className="flex items-center gap-1.5">
                        
                        {/* Step 1: Browsed Home */}
                        <div className="flex-1 space-y-1">
                          <div className={`h-1.5 rounded-full ${
                            ['browsing_home', 'product_view', 'added_to_cart', 'filling_checkout', 'order_completed'].includes(session.currentStage) 
                              ? 'bg-[#10121d]' : 'bg-gray-200'
                          }`} />
                          <p className="text-[8px] font-black text-center text-gray-400 uppercase tracking-wider">Home</p>
                        </div>

                        {/* Step 2: Browsed product */}
                        <div className="flex-1 space-y-1">
                          <div className={`h-1.5 rounded-full ${
                            ['product_view', 'added_to_cart', 'filling_checkout', 'order_completed'].includes(session.currentStage) 
                              ? 'bg-[#4f46e5]' : 'bg-gray-200'
                          }`} />
                          <p className="text-[8px] font-black text-center text-gray-400 uppercase tracking-wider">Views</p>
                        </div>

                        {/* Step 3: Added to Cart */}
                        <div className="flex-1 space-y-1">
                          <div className={`h-1.5 rounded-full ${
                            ['added_to_cart', 'filling_checkout', 'order_completed'].includes(session.currentStage) 
                              ? 'bg-amber-500' : 'bg-gray-200'
                          }`} />
                          <p className="text-[8px] font-black text-center text-gray-400 uppercase tracking-wider">Cart</p>
                        </div>

                        {/* Step 4: Checkout Form detail */}
                        <div className="flex-1 space-y-1">
                          <div className={`h-1.5 rounded-full ${
                            ['filling_checkout', 'order_completed'].includes(session.currentStage) 
                              ? 'bg-rose-500' : 'bg-gray-200'
                          }`} />
                          <p className="text-[8px] font-black text-center text-gray-400 uppercase tracking-wider">Checkout</p>
                        </div>

                        {/* Step 5: Completed */}
                        <div className="flex-1 space-y-1">
                          <div className={`h-1.5 rounded-full ${
                            session.currentStage === 'order_completed' 
                              ? 'bg-emerald-500 shadow shadow-emerald-500/50' : 'bg-gray-200'
                          }`} />
                          <p className="text-[8px] font-black text-center text-gray-400 uppercase tracking-wider">Done</p>
                        </div>

                      </div>
                    </div>

                    {/* Contact details when filled */}
                    {(session.mobileNumber || session.district) && (
                      <div className="grid grid-cols-2 gap-3.5 text-xs text-gray-600 bg-gray-50/20 p-3.5 rounded-2xl border border-gray-100">
                        {session.mobileNumber && (
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg"><Phone size={12} /></span>
                            <span className="font-mono text-xs font-bold">{session.mobileNumber}</span>
                          </div>
                        )}
                        {session.district && (
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><MapPin size={12} /></span>
                            <span className="font-bold truncate">{session.district} {session.upazila ? `(${session.upazila})` : ''}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Duration summary details */}
                    <div className="flex items-center justify-between text-xs border-t border-gray-50 pt-4 text-gray-400 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-gray-400" />
                        <span>ওয়েবসাইটে কাটানো সর্বমোট সময়:</span>
                      </div>
                      <span className="text-[#10121d] font-black">
                        {formatDuration(session.createdAt, session.lastActiveAt)}
                      </span>
                    </div>

                    {/* Trailed Product History views collapsing scroll box */}
                    <div className="pt-2">
                      <h5 className="text-[10px] uppercase font-black tracking-widest text-indigo-700 flex items-center gap-1.5 mb-2.5">
                        <Eye size={12} />
                        দেখা প্রোডাক্টের তালিকা ({session.views?.length || 0} টি ভিউ)
                      </h5>
                      
                      {session.views && session.views.length > 0 ? (
                        <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200">
                          {session.views.map((v) => (
                            <div 
                              key={v.viewedAt} 
                              className="bg-gray-50 p-2 rounded-xl border border-gray-100 flex items-center gap-2 min-w-[190px] max-w-[210px] shrink-0 hover:border-indigo-100 hover:bg-indigo-50/10 transition-colors"
                            >
                              <img src={v.imageUrl} alt={v.productTitle} className="w-8 h-8 object-cover rounded-md shadow-sm shrink-0" />
                              <div className="min-w-0 flex-1">
                                <h6 className="text-[10px] font-black text-gray-900 truncate">{v.productTitle}</h6>
                                <p className="text-[8px] font-black text-gray-400">কোড: {v.productCode} | ৳{v.price}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-gray-400 font-bold italic">এখনো কোনো প্রোডাক্ট ওপেন করেননি।</p>
                      )}
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Security Info Card */}
      <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl flex items-start gap-3">
        <span className="p-1 text-indigo-600 bg-white border border-indigo-150 rounded-lg mt-0.5"><Info size={14} /></span>
        <div className="space-y-0.5">
          <strong className="text-[10px] font-black uppercase text-indigo-900 tracking-wider">রিয়েল-টাইম ডাটা সিঙ্ক্রোনাইজেশন (Auto Synced Metrics)</strong>
          <p className="text-gray-600 text-[11px] leading-relaxed">
            কাস্টমাররা যে প্রোডাক্টে ইন্টারেক্ট করছেন, ডিলারদের সেটিংস কাস্টমাইজেশন এবং চেকআউট ফরমে নাম-মোবাইল নম্বর টাইপ করার সাথে সাথে এই পেজে লাইভ সিঙ্ক হয়ে যায়। কোনো পেজ রিফ্রেশ করার প্রয়োজন নেই।
          </p>
        </div>
      </div>

    </div>
  );
}
