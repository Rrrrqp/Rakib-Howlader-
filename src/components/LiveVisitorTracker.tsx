import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Eye, Clock, Smartphone, Laptop, Tablet, MapPin, 
  Phone, ShoppingCart, CheckCircle2, User, RefreshCw, Activity, 
  ArrowRight, Heart, ShoppingBag, Award, Home, Info, Play, Pause,
  ChevronRight, X, Sparkles, FastForward, RotateCcw, Monitor, MousePointer, 
  Keyboard, FileText, Check, ShieldCheck, ArrowDown, Search
} from 'lucide-react';
import { subscribeToVisitorSessions } from '../services/trackingService';
import { VisitorSession, ProductView, TrackingEvent } from '../types';

export default function LiveVisitorTracker() {
  const [sessions, setSessions] = useState<VisitorSession[]>(() => {
    try {
      const cached = localStorage.getItem('cached_live_sessions');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_live_sessions');
      return cached ? JSON.parse(cached).length === 0 : true;
    } catch {
      return true;
    }
  });
  const [nowTime, setNowTime] = useState(new Date());

  // Replay modal states
  const [replaySession, setReplaySession] = useState<VisitorSession | null>(null);
  const [currentEventIdx, setCurrentEventIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 4>(1);
  const [rippleActive, setRippleActive] = useState(false);

  // Subscribe to live tracking sessions
  useEffect(() => {
    let unsubscribe: any;
    
    async function startListening() {
      try {
        unsubscribe = await subscribeToVisitorSessions((liveData) => {
          setSessions(liveData);
          setLoading(false);
          try {
            localStorage.setItem('cached_live_sessions', JSON.stringify(liveData));
          } catch (e) {
            console.warn("Failed to cache live sessions:", e);
          }
        });
      } catch (err) {
        console.error("Failed to subscribe to live visitor sessions:", err);
        setLoading(false);
      }
    }

    startListening();

    // Regular interval to update relative timers
    const timer = setInterval(() => {
      setNowTime(new Date());
    }, 1000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(timer);
    };
  }, []);

  // Playback timeline controller
  useEffect(() => {
    let timer: any = null;
    if (isPlaying && replaySession && replaySession.events && replaySession.events.length > 0) {
      const parentEvents = [...replaySession.events].reverse(); // reverse to play oldest to newest

      if (currentEventIdx >= parentEvents.length - 1) {
        setIsPlaying(false);
      } else {
        const currentEvt = parentEvents[currentEventIdx];
        const nextEvt = parentEvents[currentEventIdx + 1];
        const realGapMs = new Date(nextEvt.timestamp).getTime() - new Date(currentEvt.timestamp).getTime();
        
        // Dynamically compute delay (bound between 0.6s and 4.0s for an awesome viewing flow)
        const targetDelay = Math.min(3800, Math.max(600, realGapMs)) / playbackSpeed;

        timer = setTimeout(() => {
          const nextIdx = currentEventIdx + 1;
          setCurrentEventIdx(nextIdx);
          
          // Trigger a pulse ripple visual if it was a click
          if (parentEvents[nextIdx].type === 'click') {
            setRippleActive(true);
            setTimeout(() => setRippleActive(false), 500);
          }
        }, targetDelay);
      }
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentEventIdx, replaySession, playbackSpeed]);

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
    return diff < 45000;
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

  // Setup/Start a Replay Session with Fallback generation for sessions prior to the event tracker launch
  const handleStartReplay = (session: VisitorSession) => {
    const sessionWithEvents = { ...session };
    
    if (!sessionWithEvents.events || sessionWithEvents.events.length === 0) {
      // Craft high fidelity fallback simulations based on view logs
      const views = session.views || [];
      const syntheticEvents: TrackingEvent[] = [
        {
          id: 'sy_1',
          type: 'page_view',
          description: 'ভিজিটর ওয়েবসাইটে প্রবেশ করেছেন 🌐',
          target: 'home',
          path: 'home',
          timestamp: new Date(new Date(session.createdAt).getTime()).toISOString(),
          elapsedTime: 0
        },
        {
          id: 'sy_2',
          type: 'scroll',
          description: 'ভিজিটর হোমপেজের ৪২% স্ক্রোল করেছেন 📜',
          target: 'scroll_42',
          path: 'home',
          scrollDepth: 42,
          timestamp: new Date(new Date(session.createdAt).getTime() + 3000).toISOString(),
          elapsedTime: 3
        }
      ];

      views.forEach((v, idx) => {
        const viewDelaySec = Math.max(4, 5 * idx);
        syntheticEvents.push({
          id: `sy_click_${idx}`,
          type: 'click',
          description: `ক্লিক করেছেন: "${v.productTitle}" প্রোডাক্ট ব্যাগ বাটন 🎒`,
          target: 'add_to_cart',
          path: 'home',
          timestamp: new Date(new Date(v.viewedAt).getTime() - 1500).toISOString(),
          elapsedTime: viewDelaySec
        });
        syntheticEvents.push({
          id: `sy_view_${idx}`,
          type: 'page_view',
          description: `প্রোডাক্ট দেখছেন: "${v.productTitle}" (কোড: ${v.productCode}) 🛍️`,
          target: v.productCode,
          path: 'product_details',
          timestamp: v.viewedAt,
          scrollDepth: 0,
          elapsedTime: viewDelaySec + 2
        });
      });

      if (session.customerName && session.customerName !== 'Anonymous Visitor') {
        const activeTime = new Date(session.lastActiveAt).getTime();
        syntheticEvents.push({
          id: 'sy_checkout',
          type: 'page_view',
          description: 'অর্ডার ফরম পূরণ পেজে গিয়েছেন ✍️',
          target: 'checkout',
          path: 'checkout',
          timestamp: new Date(activeTime - 12000).toISOString(),
          elapsedTime: Math.max(10, Math.round((activeTime - new Date(session.createdAt).getTime()) / 1000) - 12)
        });
        syntheticEvents.push({
          id: 'sy_name',
          type: 'input',
          description: `নিজের নাম লিখছেন: "${session.customerName}" ✍️`,
          target: 'customerName',
          path: 'checkout',
          timestamp: new Date(activeTime - 9000).toISOString(),
          elapsedTime: Math.max(15, Math.round((activeTime - new Date(session.createdAt).getTime()) / 1000) - 9)
        });
      }

      if (session.mobileNumber) {
        const activeTime = new Date(session.lastActiveAt).getTime();
        syntheticEvents.push({
          id: 'sy_phone',
          type: 'input',
          description: `মোবাইল নম্বর লিখছেন: "${session.mobileNumber}" 📱`,
          target: 'mobileNumber',
          path: 'checkout',
          timestamp: new Date(activeTime - 6000).toISOString(),
          elapsedTime: Math.max(18, Math.round((activeTime - new Date(session.createdAt).getTime()) / 1000) - 6)
        });
      }

      if (session.address) {
        const activeTime = new Date(session.lastActiveAt).getTime();
        syntheticEvents.push({
          id: 'sy_address',
          type: 'input',
          description: `বিস্তারিত ঠিকানা লিখছেন: "${session.address}" 🏠`,
          target: 'address',
          path: 'checkout',
          timestamp: new Date(activeTime - 3500).toISOString(),
          elapsedTime: Math.max(20, Math.round((activeTime - new Date(session.createdAt).getTime()) / 1000) - 3.5)
        });
      }

      if (session.currentStage === 'order_completed') {
        syntheticEvents.push({
          id: 'sy_order_placed',
          type: 'system',
          description: 'অর্ডার সফলভাবে সম্পন্ন করেছেন! 🎉 🛍️',
          target: 'order_placed',
          path: 'completed',
          timestamp: session.lastActiveAt,
          elapsedTime: Math.round((new Date(session.lastActiveAt).getTime() - new Date(session.createdAt).getTime()) / 1000)
        });
      }

      // Chronological sort
      syntheticEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      // Prepend events newest-first inside session (matching the timeline pattern)
      sessionWithEvents.events = [...syntheticEvents].reverse();
    }

    setReplaySession(sessionWithEvents);
    setCurrentEventIdx(0);
    setIsPlaying(true);
  };

  // Convert timeline order (oldest to newest) to match play states
  const orderedEvents = useMemo(() => {
    if (!replaySession?.events) return [];
    return [...replaySession.events].reverse();
  }, [replaySession]);

  const activeEvent = useMemo(() => {
    if (!orderedEvents || orderedEvents.length === 0) return null;
    return orderedEvents[currentEventIdx] || orderedEvents[orderedEvents.length - 1];
  }, [orderedEvents, currentEventIdx]);

  const activeProduct = useMemo(() => {
    if (!activeEvent || !replaySession?.views) return null;
    
    // If the event targets a specific product code
    if (activeEvent.target && activeEvent.target.startsWith('view_')) {
      const code = activeEvent.target.replace('view_', '');
      const prod = replaySession.views.find(v => v.productCode === code);
      if (prod) return prod;
    }
    
    // Fallback search in description
    if (activeEvent.description) {
      const prod = replaySession.views.find(v => 
        activeEvent.description.includes(v.productTitle) || 
        activeEvent.description.includes(v.productCode)
      );
      if (prod) return prod;
    }
    
    // Fallback to first viewed product of session
    return replaySession.views[0] || null;
  }, [activeEvent, replaySession]);

  // Map elements targets to responsive percentages inside our phone frame
  const cursorPosition = useMemo(() => {
    if (!activeEvent) return { x: '48%', y: '30%' };
    
    // Smooth custom cursor locations
    switch (activeEvent.target) {
      case 'home':
        return { x: '18%', y: '10%' };
      case 'order_showcase_direct':
        return { x: '52%', y: '84%' };
      case 'add_to_cart':
        return { x: '84%', y: '84%' };
      case 'customerName':
        return { x: '48%', y: '32%' };
      case 'mobileNumber':
        return { x: '48%', y: '42%' };
      case 'district':
        return { x: '35%', y: '52%' };
      case 'upazila':
        return { x: '72%', y: '52%' };
      case 'address':
        return { x: '48%', y: '64%' };
      case 'order_placed':
        return { x: '50%', y: '86%' };
      default:
        // Adjust vertically if they scroll inside home
        if (activeEvent.type === 'scroll') {
          return { x: '50%', y: '50%' };
        }
        return { x: '48%', y: '32%' };
    }
  }, [activeEvent]);

  // Parsing info out of description strings for mock input screens
  const parsedInputsState = useMemo(() => {
    const state = { name: '', phone: '', address: '' };
    if (!orderedEvents || orderedEvents.length === 0) return state;
    
    // Up to current pointer, see what has been filled
    for (let i = 0; i <= currentEventIdx; i++) {
      const evt = orderedEvents[i];
      if (evt.type === 'input') {
        if (evt.target === 'customerName') {
          const match = evt.description.match(/"([^"]+)"/);
          if (match) state.name = match[1];
        } else if (evt.target === 'mobileNumber') {
          const match = evt.description.match(/"([^"]+)"/);
          if (match) state.phone = match[1];
        } else if (evt.target === 'address') {
          const match = evt.description.match(/"([^"]+)"/);
          if (match) state.address = match[1];
        }
      }
    }
    return state;
  }, [orderedEvents, currentEventIdx]);

  // Stats Calculations
  const stats = useMemo(() => {
    const activeOnlineCount = sessions.filter(s => isSessionActive(s.lastActiveAt)).length;
    
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
            <p className="text-[11px] text-gray-400 font-medium font-bengali">ওয়েবসাইটে ভিজিটরদের লাইভ অ্যাক্টিভিটি ট্র্যাক হচ্ছে</p>
          </div>
          <Users size={88} className="absolute -bottom-6 -right-6 text-white/5 group-hover:scale-105 transition-transform" />
        </div>

        {/* Card 2: Total Traveled */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[140px]">
          <div className="space-y-1">
            <span className="text-[10px] text-[#4f46e5] font-black uppercase tracking-widest">Total Footfall</span>
            <h3 className="text-3xl font-black text-[#1a1c2e]">{stats.totalVisitors} <span className="text-xs font-bold text-gray-400">মোট ভিজিটর</span></h3>
            <p className="text-[11px] text-gray-400 font-medium font-bengali">আজকের সর্বমোট স্বতন্ত্র সেশনের সংখ্যা</p>
          </div>
        </div>

        {/* Card 3: Total Product Views */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between min-h-[140px]">
          <div className="space-y-1">
            <span className="text-[10px] text-rose-500 font-black uppercase tracking-widest">Product Impressions</span>
            <h3 className="text-3xl font-black text-[#1a1c2e]">{stats.totalViewsCount} <span className="text-xs font-bold text-gray-400">বার দেখা হয়েছে</span></h3>
            <p className="text-[11px] text-gray-400 font-medium font-bengali">ভিজিটরদের প্রোডাক্ট দেখার মোট সংখ্যা</p>
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
              <div key={p.code} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 hover:shadow-sm transition-all animate-fade">
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
            <h4 className="text-sm font-black text-gray-800 font-bengali">কোনো ভিজিটর ট্র্যাক করা যায়নি</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto font-bengali">যখন কোনো কাস্টমার ওয়েবসাইট ভিজিট করবে, তখন সেশন এবং প্রোডাক্ট ভিউর বিবরণ লাইভ এখানে দেখা যাবে।</p>
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
                             <h4 className="text-sm font-black text-gray-950 font-sans truncate max-w-[150px]">
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
                    {(session.mobileNumber || session.district || session.address) && (
                      <div className="bg-gray-50/20 p-3.5 rounded-2xl border border-gray-100 space-y-2.5">
                        <div className="grid grid-cols-2 gap-3.5 text-xs text-gray-600">
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
                        {session.address && (
                          <div className="flex items-start gap-2 text-xs text-gray-600 border-t border-gray-100/50 pt-2.5">
                            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg shrink-0 mt-0.5"><Home size={12} /></span>
                            <span className="font-medium text-xs leading-relaxed text-gray-700">{session.address}</span>
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
                      <span className="text-[#10121d] font-black font-mono">
                        {formatDuration(session.createdAt, session.lastActiveAt)}
                      </span>
                    </div>

                    {/* Trailed Product History views collapsing scroll box */}
                    <div className="pt-2">
                      <h5 className="text-[10px] uppercase font-black tracking-widest text-[#4f46e5] flex items-center gap-1.5 mb-2.5">
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

                    {/* Session Playback / Screen Recording Button */}
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3 bg-gray-50/20 -mx-6 -mb-6 p-6">
                      <div className="flex items-center gap-1 text-[9px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-black uppercase tracking-wider border border-indigo-100 animate-pulse">
                        <Activity size={10} className="text-indigo-500 shrink-0" />
                        <span>{session.events?.length || session.views?.length * 2 + 2 || 2} টি অ্যাকশন ট্র্যাকড</span>
                      </div>

                      <button
                        onClick={() => handleStartReplay(session)}
                        className="py-2.5 px-4 bg-[#10121d] hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-500/10 active:scale-95 text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-sm shadow-[#10121d]/10"
                      >
                        <Play size={11} className="fill-current animate-pulse" />
                        <span>ভিডিও রিপ্লে দেখুন</span>
                      </button>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* 5. Ultimate Full-Interactive Smartphone Replay Player Modal */}
      <AnimatePresence>
        {replaySession && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-hidden">
            
            {/* Dark blur backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setIsPlaying(false);
                setReplaySession(null);
              }}
              className="absolute inset-0 bg-[#0f111a]/85 backdrop-blur-md"
            />

            {/* Main Player Frame */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 40 }}
              className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden border border-gray-150 flex flex-col md:flex-row h-[90vh] md:h-[82vh] text-left"
            >
              
              {/* Left Side: Mock Phone Live Space (Full Interactive Canvas Simulator) */}
              <div className="flex-1 bg-gray-50 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-150 relative">
                
                {/* Visual title top header inside player space */}
                <div className="absolute top-4 left-6 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-rose-600 rounded-full animate-ping" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest font-mono">
                    Screen Interaction Live Canvas Feed
                  </span>
                </div>

                {/* Smartphone Device Frame */}
                <div className="w-[300px] h-[520px] bg-[#1a1c25] rounded-[3.2rem] p-3 shadow-2xl border-4 border-slate-800 relative z-10 flex flex-col overflow-hidden">
                  
                  {/* Dynamic Apple-Style Island Island Notch */}
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-center gap-1.5 px-3">
                    <div className="w-1.5 h-1.5 bg-slate-900 rounded-full border border-blue-500/50" />
                    <span className="text-[7px] text-[#e2b755] font-black tracking-widest font-mono animate-pulse">LIVE PLAY</span>
                    <div className="w-1 h-1 bg-red-600 rounded-full animate-ping" />
                  </div>

                  {/* OS Status Bar Overlay */}
                  <div className="h-6 bg-transparent text-slate-400 text-[8px] font-bold flex items-center justify-between px-6 shrink-0 select-none z-30">
                    <span>9:41 AM</span>
                    <div className="flex items-center gap-1">
                      <Smartphone size={8} />
                      <span className="font-mono">5G</span>
                      <div className="w-3.5 h-1.5 border border-slate-400 rounded-sm p-0.5 flex items-center"><div className="w-full h-full bg-slate-400 rounded-2xs" /></div>
                    </div>
                  </div>

                  {/* Simulated Mobile Browser Screen container */}
                  <div className="flex-1 w-full bg-white rounded-[2.5rem] overflow-hidden relative border border-gray-100 flex flex-col select-none">
                    
                    {/* Visual Mouse Cursor overlaid on simulated screen coordinates */}
                    <div 
                      style={{ 
                        left: cursorPosition.x, 
                        top: cursorPosition.y,
                        transform: 'translate(-50%, -50%)' 
                      }} 
                      className="absolute z-50 pointer-events-none transition-all duration-700 ease-out flex flex-col items-center gap-1.5"
                    >
                      {/* Virtual Touch Ring */}
                      <div className="relative">
                        <div className="w-6 h-6 rounded-full bg-rose-600/30 border-2 border-rose-600 shadow-md flex items-center justify-center">
                          <div className="w-2.5 h-2.5 bg-rose-600 rounded-full" />
                        </div>
                        
                        {/* Interactive Click Ripple */}
                        <div className={`absolute inset-0 bg-rose-600 rounded-full border border-rose-500 transition-all duration-500 ${
                          rippleActive ? 'scale-[3] opacity-0' : 'scale-100 opacity-0'
                        }`} />
                      </div>

                      {/* Floating Indicator Tooltip displaying active cursor action tag */}
                      {activeEvent && (
                        <div className="bg-[#10121d] text-white text-[7px] font-black px-2 py-0.5 rounded-lg shadow-md whitespace-nowrap border border-slate-700 uppercase tracking-widest opacity-90">
                          {activeEvent.type.toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Active Screen Mock representation depending on path */}
                    <div className="flex-1 overflow-hidden flex flex-col relative">

                      {/* Mock Home Path view */}
                      {(!activeEvent || activeEvent.path === 'home') && (
                        <div className="flex-1 flex flex-col h-full bg-gray-50 text-left transition-transform duration-1000 ease-in-out"
                             style={{ transform: `translateY(-${(activeEvent?.scrollDepth || 0) * 0.4}%)` }}
                        >
                          {/* Mini Store Header */}
                          <div className="p-3.5 bg-white border-b border-gray-100 flex items-center justify-between shrink-0">
                            <span className="text-xs font-black tracking-tight text-gray-950 font-sans flex items-center gap-1">
                              🌸 S. Fashion House
                            </span>
                            <div className="flex gap-2">
                              <span className="w-5 h-5 bg-gray-50 border border-gray-150 rounded-full text-[8px] flex items-center justify-center text-gray-500"><Search size={8} /></span>
                              <div className="relative">
                                <span className="w-5 h-5 bg-rose-50 rounded-full text-[8px] flex items-center justify-center text-rose-600"><ShoppingCart size={8} /></span>
                                <span className="absolute -top-1.5 -right-1 w-2.5 h-2.5 bg-rose-600 text-[6px] font-black text-white rounded-full flex items-center justify-center">1</span>
                              </div>
                            </div>
                          </div>

                          {/* Hero banner mock */}
                          <div className="p-3">
                            <div className="h-16 bg-rose-600 rounded-xl relative overflow-hidden flex items-center p-3 text-white">
                              <div className="relative z-10">
                                <h5 className="text-[10px] font-black uppercase">ঈদ ধামাকা অফার!</h5>
                                <p className="text-[6px] font-bold opacity-80">সকল ড্রেসে ২৫% পর্যন্ত ছাড়</p>
                              </div>
                              <div className="absolute right-2 bottom-0 opacity-20"><ShoppingBag size={48} /></div>
                            </div>
                          </div>

                          {/* Category Pills */}
                          <div className="flex gap-1.5 px-3 overflow-x-auto shrink-0 pb-1.5">
                            {['শাড়ি', 'থ্রি-পিস', 'পাঞ্জাবি', 'অন্যান্য'].map((c, idx) => (
                              <span key={idx} className={`text-[7px] px-2 py-1 font-black rounded-lg border whitespace-nowrap ${
                                idx === 0 ? 'bg-rose-500 text-white border-rose-600' : 'bg-white text-gray-500 border-gray-150'
                              }`}>{c}</span>
                            ))}
                          </div>

                          {/* Products mockup items list */}
                          <div className="p-3 grid grid-cols-2 gap-2.5 flex-1 content-start">
                            {replaySession.views && replaySession.views.length > 0 ? (
                              replaySession.views.map((v, i) => (
                                <div key={i} className="bg-white border border-gray-100 p-2 rounded-xl text-left flex flex-col justify-between h-32 relative">
                                  <div className="relative">
                                    <div className="h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                                      <img src={v.imageUrl} referrerPolicy="no-referrer" alt="mock" className="w-full h-full object-cover" />
                                    </div>
                                    <h6 className="text-[8px] font-black text-gray-900 truncate mt-1.5">{v.productTitle}</h6>
                                    <p className="text-[7px] text-gray-400 font-bold">কোড: {v.productCode}</p>
                                  </div>
                                  <div className="flex items-center justify-between col-span-2 pt-1 border-t border-gray-50">
                                    <span className="text-[7px] font-black text-rose-500">৳{v.price}</span>
                                    <span className="text-[6px] font-black px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded">কিনুন</span>
                                  </div>
                                </div>
                              ))
                            ) : (
                              // Placeholder premium clothing items
                              [
                                { title: 'জামদানি শাড়ি', code: 'M-101', price: '১৫০০', img: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=120' },
                                { title: 'ডিজাইনার পাঞ্জাবি', code: 'M-102', price: '১২০০', img: 'https://images.unsplash.com/photo-1597983073493-88cd35cf93b0?w=120' }
                              ].map((v, i) => (
                                <div key={i} className="bg-white border border-gray-100 p-1.5 rounded-lg text-left">
                                  <div className="h-14 bg-gray-50 rounded-md overflow-hidden"><img src={v.img} alt="synthetic" className="w-full h-full object-cover" /></div>
                                  <h6 className="text-[7.5px] font-bold text-gray-900 truncate mt-1">{v.title}</h6>
                                  <div className="flex items-center justify-between col-span-2 mt-1">
                                    <span className="text-[7px] font-black text-rose-500">৳{v.price}</span>
                                    <span className="text-[5px] font-bold px-1 bg-rose-50 text-rose-600 rounded">কিনুন</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}

                      {/* Mock Product Details View Path */}
                      {(activeEvent && activeEvent.path === 'product_details') && (
                        <div className="flex-1 bg-white p-3 text-left flex flex-col justify-between">
                          <div>
                            <div className="h-44 bg-gray-50 rounded-2xl overflow-hidden relative border border-gray-100 flex items-center justify-center">
                              {activeProduct ? (
                                <img src={activeProduct.imageUrl} referrerPolicy="no-referrer" alt="v" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-tr from-rose-500/10 to-indigo-500/10" />
                              )}
                              <span className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[6px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">In Stock</span>
                            </div>

                            <h5 className="text-xs font-black text-gray-900 mt-2.5">
                              {activeProduct ? activeProduct.productTitle : 'জামদানি গর্জিয়াস উইন্টার শাড়ি'}
                            </h5>
                            
                            <p className="text-[8px] text-gray-400 font-bold mt-0.5">
                              ক্যাটাগরি: {activeProduct ? activeProduct.category : 'Saree'}
                            </p>

                            <div className="flex items-baseline gap-2.5 mt-2">
                              <span className="text-xs font-black text-rose-600 font-sans">
                                ৳{activeProduct ? activeProduct.price : '১,৫০০'}
                              </span>
                              <span className="text-[8px] text-gray-400 line-through">৳২,০০০</span>
                              <span className="text-[7px] bg-emerald-50 text-emerald-600 font-bold px-1 rounded">-২৫% অফ</span>
                            </div>

                            {/* Color & Size dummy indicators */}
                            <div className="mt-2.5 space-y-1.5 pt-1.5 border-t border-gray-50">
                              <p className="text-[7px] font-bold text-gray-400 uppercase tracking-wider">বাছাই করুন (Size Settings):</p>
                              <div className="flex gap-1.5">
                                {['38', '40', '42'].map((s, i) => (
                                  <span key={i} className={`w-5 h-5 rounded-md border text-[7.5px] font-black flex items-center justify-center ${i === 0 ? 'border-rose-500 bg-rose-50/50 text-rose-600' : 'border-gray-200 text-gray-500'}`}>{s}</span>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Clickable bottom order bars */}
                          <div className="flex gap-2 pt-2 border-t border-gray-50 shrink-0">
                            <div className="flex-1 py-2 bg-amber-500 text-white text-center text-[8px] font-bold rounded-lg uppercase tracking-wider">
                              কার্টে যোগ করুন
                            </div>
                            <div className="flex-[2] py-2 bg-rose-600 text-white text-center text-[8.5px] font-black rounded-lg uppercase tracking-widest shadow-md">
                              সরাসরি অর্ডার করুন
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Mock Checkout billing form view path */}
                      {(activeEvent && activeEvent.path === 'checkout') && (
                        <div className="flex-1 bg-white p-4.5 text-left flex flex-col justify-between">
                          <div className="space-y-3.5">
                            
                            {/* Billing details title header */}
                            <div className="text-center pb-2 border-b border-gray-100 shrink-0">
                              <h5 className="text-[10px] font-black text-gray-900 uppercase tracking-wide">অর্ডার কনফার্মেশন ফরম</h5>
                              <p className="text-[6.5px] text-rose-500 font-bold mt-0.5">নিচের বক্সে সঠিক তথ্য দিন</p>
                            </div>

                            {/* Input: Customer Name */}
                            <div className="space-y-0.5">
                              <label className="text-[7.5px] font-black text-gray-400 uppercase tracking-widest pl-1 block">১. কাস্টমারের নাম:</label>
                              <div className={`w-full bg-gray-50 border rounded-lg px-2.5 py-1.5 text-[8.5px] font-bold flex items-center min-h-[24px] ${
                                activeEvent.target === 'customerName' ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-gray-250'
                              }`}>
                                <span className={parsedInputsState.name ? 'text-gray-950 font-semibold' : 'text-gray-300 italic'}>
                                  {parsedInputsState.name || 'যেমন: আব্দুল্লাহ'}
                                </span>
                              </div>
                            </div>

                            {/* Input: Customer Phone */}
                            <div className="space-y-0.5">
                              <label className="text-[7.5px] font-black text-gray-400 uppercase tracking-widest pl-1 block">২. মোবাইল নম্বর:</label>
                              <div className={`w-full bg-gray-50 border rounded-lg px-2.5 py-1.5 text-[8.5px] font-bold flex items-center min-h-[24px] ${
                                activeEvent.target === 'mobileNumber' ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-gray-250'
                              }`}>
                                <span className={parsedInputsState.phone ? 'text-gray-950 font-mono font-bold' : 'text-gray-300 italic'}>
                                  {parsedInputsState.phone || 'যেমন: 017xxxxxxxx'}
                                </span>
                              </div>
                            </div>

                            {/* Place choice mockup variables */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-0.5">
                                <label className="text-[7px] font-bold text-gray-400">৩. জেলা নির্বাচন:</label>
                                <div className={`p-1 border rounded-md text-[7px] font-extrabold bg-gray-50 flex justify-between items-center ${activeEvent.target === 'district' ? 'border-rose-505' : 'border-gray-200'}`}>
                                  <span>{replaySession.district || 'ঢাকা'}</span>
                                  <ArrowDown size={6} />
                                </div>
                              </div>
                              <div className="space-y-0.5">
                                <label className="text-[7px] font-bold text-gray-400">৪. থানা/উপজেলা:</label>
                                <div className={`p-1 border rounded-md text-[7px] font-extrabold bg-gray-50 flex justify-between items-center ${activeEvent.target === 'upazila' ? 'border-rose-505' : 'border-gray-200'}`}>
                                  <span>{replaySession.upazila || 'মিরপুর'}</span>
                                  <ArrowDown size={6} />
                                </div>
                              </div>
                            </div>

                            {/* Input: Detailed Shipping Address */}
                            <div className="space-y-0.5">
                              <label className="text-[7.5px] font-black text-gray-400 uppercase tracking-widest pl-1 block">৫. বিস্তারিত ঠিকানা:</label>
                              <div className={`w-full bg-gray-50 border rounded-lg px-2.5 py-1 text-[8px] font-bold flex items-start min-h-[30px] ${
                                activeEvent.target === 'address' ? 'border-rose-505 ring-2 ring-rose-500/10' : 'border-gray-250'
                              }`}>
                                <p className={`leading-tight ${parsedInputsState.address ? 'text-gray-950 font-medium' : 'text-gray-300 italic'}`}>
                                  {parsedInputsState.address || 'যেমন: বাসা নং ১, রোড নং ১০, মিরপুর-১০, ঢাকা'}
                                </p>
                              </div>
                            </div>

                            {/* Summary dummy items and checkout buttons */}
                            <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 flex items-center justify-between mt-1">
                              <div>
                                <h6 className="text-[7.5px] font-extrabold text-rose-950">সর্বমোট প্রদেয় বিল পরিমাণ:</h6>
                                <p className="text-[6.5px] text-gray-405 font-bold">প্রোডাক্ট + ডেলিভারি চার্জ</p>
                              </div>
                              <span className="text-xs font-black text-rose-600 font-sans">
                                ৳{activeProduct ? activeProduct.price + 80 : '১,৫৮০'}
                              </span>
                            </div>
                          </div>

                          <div className={`w-full py-2 bg-rose-600 text-white font-black text-center text-[9px] uppercase tracking-widest rounded-xl shadow-lg mt-4 shrink-0 shadow-rose-900/10 flex items-center justify-center gap-1.5 ${
                            activeEvent.target === 'order_placed' ? 'ring-4 ring-rose-500/30' : ''
                          }`}>
                            <CheckCircle2 size={10} />
                            অর্ডার নিশ্চিত করুন
                          </div>
                        </div>
                      )}

                      {/* Mock Success stage view path */}
                      {(activeEvent && activeEvent.path === 'completed') && (
                        <div className="flex-1 bg-white p-5 flex flex-col items-center justify-center text-center">
                          <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-3 shadow-md border border-emerald-100 animate-bounce">
                            <Check size={20} className="stroke-[3]" />
                          </div>
                          
                          <Sparkles className="text-indigo-400 absolute top-10 right-10 animate-pulse" size={14} />
                          <Sparkles className="text-amber-400 absolute bottom-12 left-10 animate-pulse animate-delay-300" size={12} />

                          <h5 className="text-[11px] font-black text-[#1a1c2e] font-sans">অর্ডারটি সফল হয়েছে!</h5>
                          <p className="text-[7.5px] text-gray-405 font-medium max-w-[200px] mt-1 font-bengali">
                            ধন্যবাদ! কিছুক্ষণের মধ্যে আমাদের একজন প্রতিনিধি ফোন করে আপনার কনসাইনমেন্ট কনফার্ম করবেন।
                          </p>

                          {/* Quick receipt box summaries */}
                          <div className="bg-gray-50 border border-gray-100 p-2.5 rounded-xl w-full text-left mt-4 space-y-1">
                            <div className="flex justify-between text-[6.5px] font-bold text-gray-400"><span className="uppercase">Recipient:</span> <span className="text-[#1a1c2e] font-extrabold truncate max-w-[100px]">{replaySession.customerName}</span></div>
                            <div className="flex justify-between text-[6.5px] font-bold text-gray-400"><span className="uppercase">Contact:</span> <span className="text-[#1a1c2e] font-mono">{replaySession.mobileNumber || '017XXXXXXXX'}</span></div>
                            <div className="flex justify-between text-[6.5px] font-bold text-gray-400"><span className="uppercase">Location:</span> <span className="text-[#1a1c2e] font-semibold">{replaySession.district || 'ঢাকা'}{replaySession.upazila ? `, ${replaySession.upazila}` : ''}</span></div>
                            {replaySession.address && (
                              <div className="flex justify-between text-[6.5px] font-bold text-gray-400"><span className="uppercase">Address:</span> <span className="text-[#1a1c2e] font-medium truncate max-w-[110px]">{replaySession.address}</span></div>
                            )}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side: Operational timeline index details and playback controllers */}
              <div className="w-full md:w-[380px] p-6 flex flex-col justify-between h-auto md:h-full bg-slate-950 text-white select-none relative">
                
                {/* Exit button */}
                <button 
                  onClick={() => {
                    setIsPlaying(false);
                    setReplaySession(null);
                  }}
                  className="absolute top-6 right-6 p-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer z-50 hover:bg-rose-600/20 hover:border-rose-600/30"
                >
                  <X size={18} />
                </button>

                {/* Header Information panel */}
                <div className="space-y-4">
                  <div className="space-y-0.5 pr-8">
                    <span className="text-[9px] text-[#e2b755] font-black uppercase tracking-widest font-mono">
                      Visual Activity Player v2.4 (HighFi)
                    </span>
                    <h3 className="text-md font-black text-white truncate font-sans">
                      {replaySession.customerName || 'Anonymous Visitor'} সেশন রেকর্ড
                    </h3>
                    <p className="text-[9.5px] text-slate-400 flex items-center gap-1.5 uppercase font-mono tracking-widest font-bold">
                      <Smartphone size={10} className="text-indigo-400" />
                      {replaySession.deviceInfo} ({replaySession.idSuffix})
                    </p>
                  </div>

                  {/* Custom Detailed Customer Profile & Shopping Summary Card */}
                  <div className="bg-slate-900 border border-slate-800/80 p-3.5 rounded-2xl space-y-2.5">
                    <h4 className="text-[9.5px] text-[#e2b755] uppercase font-black tracking-widest flex items-center gap-1.5 pb-1.5 border-b border-slate-800/60 font-mono">
                      <User size={11} className="text-[#e2b755]" /> কাস্টমার প্রোফাইল ও ডেলিভারি তথ্য
                    </h4>
                    <div className="grid grid-cols-2 gap-x-3.5 gap-y-2 text-[10.5px]">
                      <div>
                        <span className="text-slate-500 block uppercase text-[7.5px] font-extrabold tracking-wider">নাম:</span>
                        <span className="font-sans font-bold text-slate-200">{replaySession.customerName || 'Anonymous'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block uppercase text-[7.5px] font-extrabold tracking-wider">মোবাইল নম্বর:</span>
                        <span className="font-mono font-bold text-rose-450">{replaySession.mobileNumber || 'টাইপ করছেন...'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-500 block uppercase text-[7.5px] font-extrabold tracking-wider">ডেলিভারি এরিয়া:</span>
                        <span className="font-sans font-bold text-slate-200">
                          {replaySession.district ? `${replaySession.district}${replaySession.upazila ? `, ${replaySession.upazila}` : ''}` : 'নির্বাচন করছেন...'}
                        </span>
                      </div>
                    </div>
                    {replaySession.address && (
                      <div className="text-[10px] border-t border-slate-800/40 pt-2 flex flex-col gap-0.5">
                        <span className="text-slate-500 uppercase text-[7.5px] font-extrabold tracking-wider">বিস্তারিত শিপিং অ্যাড্রেস:</span>
                        <span className="text-slate-300 font-medium leading-relaxed font-sans">{replaySession.address}</span>
                      </div>
                    )}
                    <div className="text-[10px] border-t border-slate-800/40 pt-2 flex items-center justify-between text-slate-400 font-bold uppercase tracking-wider text-[8px]">
                      <span>বর্তমান অবস্থা:</span>
                      <span className={`px-2 py-0.5 rounded-md text-[8.5px] font-black ${
                        replaySession.currentStage === 'order_completed' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-indigo-500/10 text-indigo-400'
                      }`}>
                        {replaySession.currentStageLabel}
                      </span>
                    </div>
                  </div>

                  {/* Playback statistics overlay dashboard */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-900/50 p-3.5 rounded-2xl border border-slate-905">
                    <div className="space-y-1">
                       <span className="text-[8px] text-slate-400 uppercase tracking-wider font-extrabold block">কাটানো সময়:</span>
                       <strong className="text-xs text-white font-mono flex items-center gap-1">
                         <Clock size={11} className="text-indigo-400" />
                         {formatDuration(replaySession.createdAt, replaySession.lastActiveAt)}
                       </strong>
                    </div>
                    <div className="space-y-1">
                       <span className="text-[8px] text-slate-400 uppercase tracking-wider font-extrabold block">মোট অ্যাকশনস:</span>
                       <strong className="text-xs text-rose-500 font-mono flex items-center gap-1">
                         <Activity size={11} className="text-rose-500" />
                         {orderedEvents.length} টি ঘটনা
                       </strong>
                    </div>
                  </div>
                </div>

                {/* Replay Scrolling Timeline Event List */}
                <div className="flex-1 overflow-y-auto p-1.5 bg-slate-900/40 rounded-2xl border border-slate-905 my-6 scrollbar-thin scrollbar-thumb-slate-800 space-y-2">
                  <span className="text-[8.5px] text-[#e2b755] uppercase font-black tracking-widest pl-2 pt-1 block">
                    সংরক্ষিত টাইমলাইন ইভেন্টসমূহ:
                  </span>
                  
                  {orderedEvents.map((evt, idx) => {
                    const active = idx === currentEventIdx;
                    return (
                      <button
                        key={evt.id}
                        onClick={() => {
                          setCurrentEventIdx(idx);
                          setIsPlaying(false);
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex gap-3 cursor-pointer items-start ${
                          active 
                            ? 'bg-rose-600/10 border-rose-600/40 shadow-inner' 
                            : 'bg-slate-900/60 border-slate-800/50 hover:border-slate-800 hover:bg-slate-900/80'
                        }`}
                      >
                        {/* Event type specific visual pill indicator */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border mt-0.5 ${
                          active 
                            ? 'bg-rose-600 text-white border-rose-500/30' 
                            : evt.type === 'click' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                              evt.type === 'scroll' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
                              evt.type === 'input' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                              'bg-slate-500/10 text-slate-400 border-slate-800'
                        }`}>
                          {evt.type === 'click' ? <MousePointer size={11} /> :
                           evt.type === 'input' ? <Keyboard size={11} /> :
                           evt.type === 'scroll' ? <ArrowDown size={11} /> :
                           <FileText size={11} />}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`text-[10px] font-bold font-bengali leading-snug truncate ${active ? 'text-rose-400 font-extrabold' : 'text-slate-200'}`}>
                            {evt.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[8px] font-mono font-black text-slate-500">
                              সময়: {evt.elapsedTime} সে.
                            </span>
                            {evt.scrollDepth !== undefined && (
                              <span className="text-[7.5px] px-1 bg-indigo-950 text-indigo-400 font-bold rounded">
                                স্ক্রোল: {evt.scrollDepth}%
                              </span>
                            )}
                          </div>
                        </div>

                        {active && (
                          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping self-center shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Subtitle / Active Action Details panel */}
                {activeEvent && (
                  <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-300 font-bold font-bengali mb-4 flex items-center gap-2 animate-fade">
                    <span className="w-2 h-2 bg-[#e2b755] rounded-full animate-pulse" />
                    <span>অ্যাকশন: {activeEvent.description}</span>
                  </div>
                )}

                {/* Bottom Control Actions (Speed, Scrubber, Play controls) */}
                <div className="space-y-4 pt-3.5 border-t border-slate-900 shrink-0 select-none">
                  
                  {/* Visual progress timeline bar scrubber tracker */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[8px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                      <span>টাইমলাইন গ্রাফ</span>
                      <span>{currentEventIdx + 1} / {orderedEvents.length} ধাপসমূহ</span>
                    </div>
                    
                    <div className="relative h-1 bg-slate-800 rounded-full overflow-hidden flex items-center">
                      <div 
                        style={{ width: `${((currentEventIdx + 1) / orderedEvents.length) * 100}%` }}
                        className="h-full bg-rose-600 rounded-full transition-all duration-300" 
                      />
                    </div>
                  </div>

                  {/* Play, Pause, Speeds selectors */}
                  <div className="flex items-center justify-between gap-3 select-none">
                    
                    {/* Speeds list selection */}
                    <div className="flex items-center gap-1.5 bg-slate-900 p-1.5 rounded-xl border border-slate-800/80 scale-95 origin-left">
                      {[1, 2, 4].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => setPlaybackSpeed(speed as any)}
                          className={`px-2.5 py-1 text-[8.5px] font-black rounded-lg transition-colors cursor-pointer ${
                            playbackSpeed === speed 
                              ? 'bg-rose-600 text-white shadow shadow-rose-900/25' 
                              : 'text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>

                    {/* Operational controls */}
                    <div className="flex items-center gap-2.5">
                      
                      {/* Restart */}
                      <button
                        onClick={() => {
                          setCurrentEventIdx(0);
                          setIsPlaying(true);
                        }}
                        className="p-2.5 bg-slate-900 hover:bg-slate-800 hover:text-white text-slate-400 border border-slate-800 rounded-xl transition-all active:scale-95 cursor-pointer"
                        title="Restart Replay"
                      >
                        <RotateCcw size={14} />
                      </button>

                      {/* Play Pause */}
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`h-10 px-5 text-xs font-black uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-md ${
                          isPlaying 
                            ? 'bg-amber-600/10 border border-amber-600/30 text-amber-500 hover:bg-amber-600/20' 
                            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/10'
                        }`}
                      >
                        {isPlaying ? (
                          <>
                            <Pause size={12} className="fill-current animate-pulse" />
                            <span>আটকে রাখুন</span>
                          </>
                        ) : (
                          <>
                            <Play size={12} className="fill-current" />
                            <span>চালু করুন</span>
                          </>
                        )}
                      </button>

                    </div>

                  </div>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Security Info Card */}
      <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl flex items-start gap-3">
        <span className="p-1 text-indigo-600 bg-white border border-indigo-150 rounded-lg mt-0.5 font-sans"><Info size={14} /></span>
        <div className="space-y-0.5">
          <strong className="text-[10px] font-black uppercase text-indigo-900 tracking-wider">রিয়েল-টাইম ডাটা সিঙ্ক্রোনাইজেশন (Auto Synced Metrics)</strong>
          <p className="text-gray-600 text-[11px] leading-relaxed font-bengali">
            কাস্টমাররা যে প্রোডাক্টে ইন্টারেক্ট করছেন, ডিলারদের সেটিংস কাস্টমাইজেশন এবং চেকআউট ফরমে নাম-মোবাইল নম্বর টাইপ করার সাথে সাথে এই পেজে লাইভ সিঙ্ক হয়ে যায়। কোনো পেজ রিফ্রেশ করার প্রয়োজন নেই।
          </p>
        </div>
      </div>

    </div>
  );
}
