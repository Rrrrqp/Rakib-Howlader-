import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Smartphone, Send, Settings, CheckCircle2, 
  AlertTriangle, Globe, Sliders, Cpu, Copy, Check, MessageSquare
} from 'lucide-react';
import { getBrandSettings, updateBrandSettings } from '../services/settingsService';
import { BrandSettings } from '../types';

interface SMSSenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientPhone: string;
  couponLabel?: string;
  couponCode?: string;
  orderId?: string;
  totalAmount?: number | string;
  cancelReason?: string;
  initialContext?: 'spin' | 'order-confirm' | 'order-cancel' | 'order-shipped' | 'general';
}

type SMSGatewayType = 'device' | 'greenweb' | 'elitbuzz' | 'mimsms' | 'twilio';

export default function SMSSenderModal({
  isOpen,
  onClose,
  recipientName,
  recipientPhone,
  couponLabel = '১০% ডিসকাউন্ট ড্রেস কুপন',
  couponCode = 'SERA_SPIN_WHEEL',
  orderId = '',
  totalAmount = '',
  cancelReason = '',
  initialContext
}: SMSSenderModalProps) {
  const [activeSegment, setActiveSegment] = useState<'send' | 'config'>('send');
  const [brandSettings, setBrandSettings] = useState<BrandSettings | null>(null);

  // Editable recipient fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(recipientName || '');
      setPhone(recipientPhone || '');
    }
  }, [isOpen, recipientName, recipientPhone]);
  
  // Send status
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

  // Configuration Fields
  const [gateway, setGateway] = useState<SMSGatewayType>('device');
  const [greenwebToken, setGreenwebToken] = useState('');
  const [elitbuzzApiKey, setElitbuzzApiKey] = useState('');
  const [elitbuzzSenderId, setElitbuzzSenderId] = useState('');
  const [mimsmsApiKey, setMimsmsApiKey] = useState('');
  const [mimsmsSenderId, setMimsmsSenderId] = useState('');
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioAuthToken, setTwilioAuthToken] = useState('');
  const [twilioFrom, setTwilioFrom] = useState('');

  // Context & templates control
  const [context, setContext] = useState<'spin' | 'order-confirm' | 'order-cancel' | 'order-shipped' | 'general'>('spin');

  useEffect(() => {
    if (initialContext) {
      setContext(initialContext);
    } else if (orderId) {
      setContext('order-confirm');
    } else {
      setContext('spin');
    }
  }, [initialContext, orderId, isOpen]);

  // Selected SMS template style
  const [currentTemplateIndex, setCurrentTemplateIndex] = useState(0);
  const [customMessage, setCustomMessage] = useState('');
  const [copiedText, setCopiedText] = useState(false);

  // Templates map dictionary based on operation target
  const templateMap = {
    spin: [
      {
        label: 'স্পিন কুপন রিমাইন্ডার (অটো)',
        text: `সালামু আলাইকুম [কাস্টমার নাম], আপনি আমাদের সেরা ফ্যাশন হাউস ওয়েবসাইটে ক্যাটালগ দেখে স্পিন ঘুরিয়ে "[পুরস্কার]" কูปন জিতেছেন। কুপন কোড: [কুপন কোড]। স্টক শেষ হওয়ার আগেই কুপনটি ব্যবহার করে আপনার পছন্দের থ্রি-পিস বা শাড়ি অর্ডার করতে সেরা ফ্যাশন হাউস ওয়েবসাইটে ভিজিট করুন। কোনো টেকনিক্যাল সমস্যা হলে আমাদের কল করুন। ধন্যবাদ!`
      },
      {
        label: 'ডিসকাউন্ট কুপন ও স্বাগতম অফার',
        text: `প্রিয় [কাস্টমার নাম], সেরা ফ্যাশন হাউস অনলাইন শপে স্বাগতম। আপনার স্পিন কুপন কোড [কুপন কোড] সচল আছে। অর্ডার করতে এখনই আমাদের সাইট ভিজিট করুন এবং পেয়ে যান বিশেষ ডিসকাউন্ট!`
      },
      {
        label: 'সহায়তা ও অর্ডার বুকিং টেক্সট',
        text: `সালামু আলাইকুম [কাস্টমার নাম], আমরা দেখছি সেরা ফ্যাশন হাউসে আপনি স্পিন ঘুরিয়েছিলেন কিন্তু অর্ডার সম্পূর্ণ করতে কোনো সমস্যার সম্মুখীন হয়েছেন। অর্ডার বুক করার চমৎকার সহায়তার জন্য আমাদের এই নম্বরে রি-কল করতে পারেন। সেরা ফ্যাশন হাউস টিমের পক্ষ থেকে সবসময় আপনার সেবায় নিয়োজিত।`
      }
    ],
    'order-confirm': [
      {
        label: 'অর্ডার কনফার্মেশন (Trust Secured)',
        text: `প্রিয় [কাস্টমার নাম], অভিনন্দন! সেরা ফ্যাশন হাউজ (Sera Fashion House) থেকে আপনার #[অর্ডার আইডি] নং অর্ডারটি সফলভাবে কনফার্ম করা হয়েছে।\n📦 অর্ডার আইডি: #[অর্ডার আইডি]\n💵 মোট প্রদেয় মূল্য: ৳[মোট মূল্য]\n🚀 আপনার অর্ডারটি খুব দ্রুত কুরিয়ারে হস্তান্তর করা হচ্ছে। আমাদের সাথে থাকার জন্য ধন্যবাদ!`
      },
      {
        label: 'বুকিং চুরান্ত বার্তা ও ডিস্ট্রিবিউশন',
        text: `সালামু আলাইকুম [কাস্টমার নাম], সেরা ফ্যাশন হাউজে করা আপনার #[অর্ডার আইডি] নং অর্ডারটির প্রসেসিং শুরু হয়েছে। আপনার পণ্যটি দ্রুত ডেলিভারি দিতে আমাদের টিম সর্বদা সচেষ্ট।`
      }
    ],
    'order-cancel': [
      {
        label: 'অর্ডার বাতিল নোটিফিকেশন',
        text: `প্রিয় [কাস্টমার নাম], দুঃখিত! সেরা ফ্যাশন হাউজ (Sera Fashion House) থেকে আপনার #[অর্ডার আইডি] নং অর্ডারটি বাতিল করা হয়েছে।\n❌ কারণ: [বাতিল কারণ]\n\nযেকোনো প্রয়োজনে আমাদের পেইজে ইনবক্স করুন। ধন্যবাদ!`
      }
    ],
    'order-shipped': [
      {
        label: 'কুরিয়ার শিপমেন্ট ট্র্যাকিং কোড',
        text: `সালামু আলাইকুম [কাস্টমার নাম], সেরা ফ্যাশন হাউস থেকে আপনার #[অর্ডার আইডি] নং অর্ডারটি কুরিয়ারে শিফট করা হয়েছে। পার্সেলটি রিসিভ করতে সচল মোবাইল নিয়ে প্রস্তুত থাকুন। ধন্যবাদ!`
      }
    ],
    general: [
      {
        label: 'শুভেচ্ছা/ফলোআপ অফার',
        text: `প্রিয় [কাস্টমার নাম], সেরা ফ্যাশন হাউজে চোখ রাখার জন্য ধন্যবাদ। সেরা সব ট্রাডিশনাল কালেকশন অর্ডার করতে আমাদের পেইজে যোগাযোগ করুন।`
      }
    ]
  };

  const templates = templateMap[context] || templateMap.spin;

  // Resolve Placeholders dynamically
  const getCompiledMessage = (rawText: string) => {
    return rawText
      .replace(/\[কাস্টমার নাম\]/g, name || 'প্রিয় কাস্টমার')
      .replace(/\[পুরস্কার\]/g, couponLabel || 'বিশেষ উপহার')
      .replace(/\[কুপন কোড\]/g, couponCode || 'SERA_SPIN_WHEEL')
      .replace(/\[অর্ডার আইডি\]/g, orderId || 'N/A')
      .replace(/\[মোট মূল্য\]/g, String(totalAmount) || '0')
      .replace(/\[বাতিল কারণ\]/g, cancelReason || 'যোগাযোগ অসম্পূর্ণ বা কাস্টমার ইচ্ছা প্রকাশ করেননি');
  };

  const resolvedMessageText = currentTemplateIndex === 999 
    ? customMessage 
    : getCompiledMessage(templates[currentTemplateIndex]?.text || templates[0]?.text || '');

  // Load Brand Settings from Cloud Firestore
  useEffect(() => {
    async function loadConfig() {
      try {
        const settings = await getBrandSettings();
        if (settings) {
          setBrandSettings(settings);
          if (settings.smsGateway) setGateway(settings.smsGateway);
          if (settings.smsGreenwebToken) setGreenwebToken(settings.smsGreenwebToken);
          if (settings.smsElitbuzzApiKey) setElitbuzzApiKey(settings.smsElitbuzzApiKey);
          if (settings.smsElitbuzzSenderId) setElitbuzzSenderId(settings.smsElitbuzzSenderId);
          if (settings.smsMimsmsApiKey) setMimsmsApiKey(settings.smsMimsmsApiKey);
          if (settings.smsMimsmsSenderId) setMimsmsSenderId(settings.smsMimsmsSenderId);
          if (settings.smsTwilioSid) setTwilioSid(settings.smsTwilioSid);
          if (settings.smsTwilioAuthToken) setTwilioAuthToken(settings.smsTwilioAuthToken);
          if (settings.smsTwilioFrom) setTwilioFrom(settings.smsTwilioFrom);
        }
      } catch (e) {
        console.error("Failed to load SMS configurations:", e);
      }
    }
    if (isOpen) {
      loadConfig();
      setSendResult(null);
      setIsSending(false);
    }
  }, [isOpen]);

  // Save Config to Firebase settings/brand Document
  const handleSaveConfig = async () => {
    setIsSending(true);
    try {
      await updateBrandSettings({
        smsGateway: gateway,
        smsGreenwebToken: greenwebToken,
        smsElitbuzzApiKey: elitbuzzApiKey,
        smsElitbuzzSenderId: elitbuzzSenderId,
        smsMimsmsApiKey: mimsmsApiKey,
        smsMimsmsSenderId: mimsmsSenderId,
        smsTwilioSid: twilioSid,
        smsTwilioAuthToken: twilioAuthToken,
        smsTwilioFrom: twilioFrom
      });
      setIsSending(false);
      alert('সফলভাবে ক্লাউড SMS গেটওয়ে সেটিংস ডাটাবেজে সংরক্ষণ করা হয়েছে! ⚡');
      setActiveSegment('send');
    } catch (e) {
      console.error(e);
      alert('সেটিংস সংরক্ষণ করতে ব্যর্থ হয়েছে। ইন্টারনেট কানেকশন চেক করুন।');
      setIsSending(false);
    }
  };

  // SMS Dispacther Core Engine
  const handleDispatchSMS = async () => {
    setIsSending(true);
    setSendResult(null);

    const cleanPhone = phone.replace(/\D/gs, '');
    const finalMsg = resolvedMessageText;

    if (!cleanPhone) {
      setSendResult({ success: false, message: 'ভুল মোবাইল নাম্বার! কাস্টমারের সঠিক মোবাইল নাম্বার নেই।' });
      setIsSending(false);
      return;
    }

    // Standard local / device mobile client protocol
    if (gateway === 'device') {
      try {
        // Detect iOS device to adapt query parameter
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const separator = isIOS ? '&' : '?';
        const smsUrl = `sms:${cleanPhone}${separator}body=${encodeURIComponent(finalMsg)}`;
        
        window.open(smsUrl, '_blank');
        setIsSending(false);
        setSendResult({ 
          success: true, 
          message: 'ডিভাইস SMS সাকসেসফুলি ট্রিগার করা হয়েছে! আপনার ফোনের মেসেঞ্জার অ্যাপে অটো-ফিল হয়ে গেছে, দ্রুত "সেন্ড" চাপুন।' 
        });
        return;
      } catch (e) {
        setSendResult({ success: false, message: 'মোবাইল মেসেঞ্জার প্রোটোকল ট্রিগার হতে সমস্যা হয়েছে।' });
        setIsSending(false);
        return;
      }
    }

    // Direct automated Cloud SMS gateways integrations (Real network calls)
    try {
      if (gateway === 'greenweb') {
        if (!greenwebToken) {
          setSendResult({ success: false, message: 'গ্রিনওয়েব API টোকেন সেটআপ করা নেই! অনুগ্রহ করে কনফিগ সেগমেন্টে গেটওয়ে সেটিংস করুন।' });
          setIsSending(false);
          return;
        }

        const gatewayUrl = `https://api.greenweb.com.bd/api.php?json&token=${encodeURIComponent(greenwebToken)}&to=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(finalMsg)}`;
        
        // Use client-side HTTP call to dispatch SMS.
        const res = await fetch(gatewayUrl);
        const data = await res.json().catch(() => null);

        if (res.ok) {
          setSendResult({ success: true, message: 'গ্রিনওয়েব গেটওয়ে দিয়ে সরাসরি গ্রাহকের ফোনে SMS পাঠানো হয়েছে! 🚀' });
        } else {
          setSendResult({ success: false, message: `গ্রিনওয়েব গেটওয়ে সার্ভিস রেসপন্স ইরর: ${JSON.stringify(data) || 'Unknown code'}` });
        }
      }

      else if (gateway === 'elitbuzz') {
        if (!elitbuzzApiKey || !elitbuzzSenderId) {
          setSendResult({ success: false, message: 'এলিটবাজ API Key ও Sender ID সেটিংস করা নেই।' });
          setIsSending(false);
          return;
        }

        const gatewayUrl = `https://api.elitbuzz-bd.com/smsapi?api_key=${encodeURIComponent(elitbuzzApiKey)}&type=text&contacts=${encodeURIComponent(cleanPhone)}&senderid=${encodeURIComponent(elitbuzzSenderId)}&msg=${encodeURIComponent(finalMsg)}`;
        
        // Dispatch
        const res = await fetch(gatewayUrl);
        
        if (res.ok) {
          setSendResult({ success: true, message: 'এলিটবাজ ক্লাউড গেটওয়ে দিয়ে কাস্টমারের নাম্বারে সরাসরি SMS চলে গেছে! 🎉' });
        } else {
          setSendResult({ success: false, message: 'এলিটবাজ সার্ভার সংযোগ ব্যর্থ হয়েছে বা লিমিট পার হয়েছে।' });
        }
      }

      else if (gateway === 'mimsms') {
        if (!mimsmsApiKey || !mimsmsSenderId) {
          setSendResult({ success: false, message: 'মিম এসএসএস এপিআই কী অথবা সেন্ডার আইডি অনুপস্থিত।' });
          setIsSending(false);
          return;
        }

        const gatewayUrl = `https://mimsmsprov2.com/api/sendsms?api_key=${encodeURIComponent(mimsmsApiKey)}&type=text&phone=${encodeURIComponent(cleanPhone)}&sender_id=${encodeURIComponent(mimsmsSenderId)}&message=${encodeURIComponent(finalMsg)}`;
        
        const res = await fetch(gatewayUrl);
        if (res.ok) {
          setSendResult({ success: true, message: 'মিম গেটওয়ের মাধ্যমে সরাসরি বার্তা পাঠানো নিশ্চিত হয়েছে! 📨' });
        } else {
          setSendResult({ success: false, message: 'মিম কাস্টম সার্ভার রেসপন্স ইরর পাওয়া গেছে।' });
        }
      }

      else if (gateway === 'twilio') {
        if (!twilioSid || !twilioAuthToken || !twilioFrom) {
          setSendResult({ success: false, message: 'টুইলিও ক্লাউড গেটওয়ে ক্রেডেনশিয়াল সঠিক নয়।' });
          setIsSending(false);
          return;
        }

        // Direct fetch request to Twilio Rest APIs
        const b64 = btoa(`${twilioSid}:${twilioAuthToken}`);
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${b64}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            To: cleanPhone.startsWith('+') ? cleanPhone : `+88${cleanPhone}`,
            From: twilioFrom,
            Body: finalMsg
          })
        });

        const data = await res.json();
        if (res.ok) {
          setSendResult({ success: true, message: 'টুইলিও ইন্টারন্যাশনাল ক্লাউড সার্ভিস দিয়ে সফলভাবে SMS সেন্ট হয়েছে!' });
        } else {
          setSendResult({ success: false, message: `টুইলিও ইরর: ${data.message || 'ক্রেডেনশিয়াল বা নম্বর জটিলতা'}` });
        }
      }
    } catch (err: any) {
      console.error(err);
      setSendResult({ 
        success: false, 
        message: `ক্লাউড API কল করার সময় নেটওয়ার্ক ত্রুটি ঘটেছে: ${err.message || 'সার্ভার রেসপন্স করা বন্ধ করেছে'}` 
      });
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(resolvedMessageText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[200] overflow-y-auto flex items-center justify-center p-4">
        
        {/* Backdrop Trigger */}
        <div className="absolute inset-0 cursor-pointer" onClick={onClose} />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white border border-slate-100 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden relative z-10 font-sans flex flex-col md:flex-row h-full max-h-[90vh] md:max-h-[640px]"
        >
          {/* Close Panel Button */}
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 rounded-xl transition-all cursor-pointer z-50"
          >
            <X size={16} />
          </button>

          {/* Left panel: Smartphone Preview & Real-Time Setup */}
          <div className="md:w-5/12 bg-slate-50 p-6 border-r border-slate-100 flex flex-col justify-between items-center select-none shrink-0">
            {/* Visual Header */}
            <div className="text-center w-full">
              <span className="text-[10px] bg-rose-50 text-rose-600 px-3 py-1 rounded-full font-black uppercase tracking-widest inline-block mb-1">
                SMS DISPATCH VISUALIZER
              </span>
              <h3 className="text-sm font-black text-slate-800">কাস্টমার ফোন লাইভ প্রিভিউ</h3>
              <p className="text-[10px] text-slate-400 mt-1 font-semibold">গ্রাহক যেভাবে মোবাইল স্ক্রিনে মেসেজটি দেখতে পাবেন</p>
            </div>

            {/* Smartphone Graphic frame mockup with dynamic content inside */}
            <div className="w-[200px] h-[350px] bg-slate-900 rounded-[35px] border-[6px] border-slate-800 p-2.5 shadow-xl relative my-4 flex flex-col justify-between overflow-hidden">
              {/* Speaker & camera slot */}
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-800 rounded-b-xl flex justify-center items-center">
                <div className="w-6 h-0.5 bg-slate-700 rounded-full" />
              </div>

              {/* Status Header */}
              <div className="flex justify-between items-center px-1 pt-1 text-[8px] font-bold text-slate-400 tracking-wide font-mono">
                <span>09:41 AM</span>
                <div className="flex gap-1">
                  <span>📶</span>
                  <span>🔋</span>
                </div>
              </div>

              {/* Chat Bubble Interface */}
              <div className="flex-1 bg-slate-950 rounded-2xl p-2 flex flex-col justify-end gap-2 overflow-hidden my-1 pl-1">
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full bg-rose-600 text-[10px] flex items-center justify-center text-white font-black leading-none">
                    SF
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-300 font-bold block">Sera Fashion House</span>
                    <span className="text-[7px] text-emerald-500 block leading-none font-bold">● Active 1S ago</span>
                  </div>
                </div>

                {/* Simulated SMS Message box bubble */}
                <div className="bg-slate-800 text-white p-2 rounded-xl rounded-bl-none text-[8px] font-semibold leading-relaxed overflow-y-auto max-h-[190px] scrollbar-thin text-left border border-slate-700/50">
                  {resolvedMessageText}
                </div>

                <div className="text-[7px] text-slate-500 font-semibold text-right leading-none pr-1">
                  ✔ Delivered • SMS Gateway
                </div>
              </div>

              {/* Home Indicator button */}
              <div className="h-1 bg-slate-700 rounded-full w-20 mx-auto" />
            </div>

            {/* Recipient Details display info (Fully Editable form for premium ease-of-use) */}
            <div className="bg-white p-3.5 rounded-2xl w-full border border-slate-250/70 space-y-2.5 shadow-sm text-left">
              <div className="flex items-center gap-1.5 pb-1 border-b border-dashed border-slate-100">
                <div className="p-1 bg-rose-50 text-rose-600 rounded-lg">
                  <Smartphone className="animate-pulse" size={13} />
                </div>
                <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">কাস্টমার তথ্য সংশোধন (Editable)</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-0.5">
                  <span className="text-[9px] text-indigo-900 font-black uppercase tracking-wider block">নাম কাস্টমাইজঃ</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-[10.5px] font-bold focus:bg-white focus:border-rose-500 outline-none transition-all"
                    placeholder="কাস্টমারের নাম..."
                  />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[9px] text-indigo-900 font-black uppercase tracking-wider block">মোবাইল নাম্বারঃ</span>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-[10.5px] font-bold focus:bg-white focus:border-rose-500 outline-none transition-all placeholder:font-sans"
                    placeholder="মোবাইল নং লিখুন..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right panel: Active Action flow tab panel (Send vs Gateways setup) */}
          <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto max-h-[450px] md:max-h-[640px]">
            <div>
              {/* Segment Toggle selectors header */}
              <div className="flex bg-slate-50 border border-slate-150 p-1 rounded-2xl mb-5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveSegment('send');
                    setSendResult(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
                    activeSegment === 'send'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Send size={13} />
                  SMS পাঠান (Direct Dispatch)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveSegment('config');
                    setSendResult(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${
                    activeSegment === 'config'
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Settings size={13} />
                  SMS গেটওয়ে সেটআপ (SMS Gateway Settings)
                </button>
              </div>

              {/* Segment 1: SMS template selection & send dispatch */}
              {activeSegment === 'send' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 font-sans text-left">১. ফলোআপ কুপন SMS টেমপ্লেট নির্বাচন করুন</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 text-left">কাস্টমারের জন্য উপযুক্ত যেকোনো একটি রেডিমেড প্রোফেশনাল টেমপ্লেট বেছে নিন</p>

                    <div className="grid grid-cols-1 gap-2.5 mt-3">
                      {templates.map((t, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCurrentTemplateIndex(idx)}
                          className={`w-full text-left p-3 rounded-2xl border transition-all relative ${
                            currentTemplateIndex === idx
                              ? 'bg-rose-50/40 border-rose-500 ring-2 ring-rose-500/15'
                              : 'bg-white hover:bg-slate-50/50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800">{t.label}</span>
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                              currentTemplateIndex === idx ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-350'
                            }`}>
                              {currentTemplateIndex === idx && <Check size={10} />}
                            </div>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-1.5 line-clamp-2">
                            {idx === 0 ? "সালামু আলাইকুম [কাস্টমার নাম], আপনি আমাদের সেরা ফ্যাশন হাউস ওয়েবসাইটে ক্যাটালগ দেখে স্পিন ঘুরিয়ে ..." : t.text}
                          </p>
                        </button>
                      ))}

                      {/* Option for completely Custom SMS written text */}
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentTemplateIndex(999);
                          if (!customMessage) {
                            setCustomMessage(resolvedMessageText);
                          }
                        }}
                        className={`w-full text-left p-3 rounded-2xl border transition-all relative ${
                          currentTemplateIndex === 999
                            ? 'bg-rose-50/40 border-rose-500 ring-2 ring-rose-500/15'
                            : 'bg-white hover:bg-slate-50/50 border-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <Sliders size={12} className="text-rose-500" />
                            কাস্টম বার্তা লিখুন (Write Custom Message)
                          </span>
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            currentTemplateIndex === 999 ? 'border-rose-500 bg-rose-500 text-white' : 'border-slate-350'
                          }`}>
                            {currentTemplateIndex === 999 && <Check size={10} />}
                          </div>
                        </div>

                        {currentTemplateIndex === 999 && (
                          <textarea
                            value={customMessage}
                            onChange={(e) => setCustomMessage(e.target.value)}
                            rows={3}
                            placeholder="আপনার কাস্টম মেসেজ বা অফার বিস্তারিত এখানে স্পষ্টভাবে বাংলায় লিখুন..."
                            className="w-full bg-white border border-slate-200 rounded-xl p-2 outline-none text-xs text-slate-800 focus:ring-1 focus:ring-rose-500 font-sans font-medium mt-1.5"
                          />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Highlighted SMS gateway current status banner */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between text-left">
                    <div className="flex items-center gap-2.5">
                      <div className="bg-slate-900 text-white p-2 rounded-xl text-xs font-black">
                        {gateway.toUpperCase()}
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block leading-none">সক্রিয় গেটওয়ে কুরিয়ার/বার্তা</span>
                        <span className="text-xs font-bold text-slate-700 block mt-1">
                          {gateway === 'device' && 'মোবাইল/কম্পিউটার মেসেঞ্জার প্রোটোকল (১০০% ফ্রি ও ইনস্ট্যান্ট)'}
                          {gateway === 'greenweb' && 'গ্রিনওয়েব এসএমএস গেটওয়ে সার্ভিস'}
                          {gateway === 'elitbuzz' && 'এলিটবাজ কাস্টম গেটওয়ে সার্ভিস'}
                          {gateway === 'mimsms' && 'মিম কাস্টম এসএসএস গেটওয়ে সার্ভিস'}
                          {gateway === 'twilio' && 'টুইলিও গ্লোবাল গেটওয়ে কন্টাক্ট'}
                        </span>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      onClick={copyToClipboard}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-[10px] font-extrabold uppercase border border-slate-200 rounded-lg flex items-center gap-1 transition-all"
                    >
                      {copiedText ? (
                        <>
                          <Check size={10} className="text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy size={10} />
                          বার্তা কপি
                        </>
                      )}
                    </button>
                  </div>

                  {/* Live success/failure message display */}
                  {sendResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-left ${
                        sendResult.success 
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                          : 'bg-rose-50 border-rose-200 text-rose-800'
                      }`}
                    >
                      {sendResult.success ? (
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <h4 className="text-xs font-bold leading-none">
                          {sendResult.success ? 'সফলভাবে বার্তা পাঠানো হয়েছে!' : 'বার্তা পাঠাতে ত্রুটি দেখা দিয়েছে'}
                        </h4>
                        <p className="text-[10px] opacity-90 mt-1 font-semibold leading-relaxed Bengaly">
                          {sendResult.message}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Segment 2: SMS Gateway fields config */}
              {activeSegment === 'config' && (
                <div className="space-y-4">
                  <div className="text-left">
                    <h3 className="text-sm font-black text-slate-900">২. SMS গেটওয়ে প্রোভাইডার সিলেক্ট করুন</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">আপনার কাস্টম বা পছন্দসই বাল্ক এসএমএস অ্যাকাউন্ট কানেক্ট করুন</p>

                    {/* Radio Selectors */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3">
                      {(['device', 'greenweb', 'elitbuzz', 'mimsms', 'twilio'] as SMSGatewayType[]).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setGateway(g)}
                          className={`py-2 px-1 rounded-xl border text-[10px] font-black uppercase transition-all flex flex-col items-center justify-center gap-1.5 ${
                            gateway === g
                              ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <Globe size={11} className={gateway === g ? 'text-rose-400' : 'text-slate-400'} />
                          {g === 'device' ? 'DEVICE / FREE' : g.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Gateway specific form inputs */}
                  <div className="pt-2">
                    {gateway === 'device' && (
                      <div className="bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10 text-left">
                        <span className="flex h-2 w-2 relative mb-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                          <Cpu size={12} className="text-emerald-500" />
                          ফ্রি ডিভাইস SMS প্রোটোকল গাইড:
                        </h4>
                        <ol className="text-[10px] text-slate-600 leading-normal font-semibold space-y-1.5 mt-2 flex flex-col">
                          <li>১. এর জন্য কোনো টাকা বা এপিআই কী-এর প্রয়োজন নেই সম্পূর্ণ ফ্রি।</li>
                          <li>২. "বার্তা পাঠান" ক্লিক করলে আপনার কম্পিউটার বা মোবাইলের নিজস্ব SMS অ্যাপ ওপেন হবে।</li>
                          <li>৩. কাস্টমারের ফোন নম্বর এবং কুপন অফার মেসেজটি আপনার SMS অ্যাপে অলরেডি টাইপ হয়ে যাবে।</li>
                          <li>৪. আপনি জাস্ট মেসেঞ্জার অ্যাপ থেকে "Send" বাটনে ক্লিক করে ডেলিভারি কনফার্ম করবেন।</li>
                        </ol>
                      </div>
                    )}

                    {gateway === 'greenweb' && (
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3 text-left">
                        <span className="text-[9px] font-extrabold text-rose-500 tracking-wider block uppercase">Greenweb BD credentials</span>
                        <div className="space-y-1">
                          <label className="text-[10px] font-medium text-slate-500 block">Greenweb API Token ID:</label>
                          <input 
                            type="password"
                            value={greenwebToken}
                            onChange={(e) => setGreenwebToken(e.target.value)}
                            placeholder="যেমন: m61409228-5696-2917-..."
                            className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-xs font-mono font-bold focus:ring-1 focus:ring-rose-500 text-slate-800"
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 leading-normal leading-relaxed italic">
                          💡 GreenWeb.com.bd থেকে সহজে SMS এপিআই কী কিনে এখানে পেস্ট করে সরাসরি সেন্ট করুন।
                        </p>
                      </div>
                    )}

                    {gateway === 'elitbuzz' && (
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3 text-left">
                        <span className="text-[9px] font-extrabold text-rose-500 tracking-wider block uppercase">Elitbuzz SMS API configuration</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-slate-500 block">ElitBuzz API Key:</label>
                            <input 
                              type="password"
                              value={elitbuzzApiKey}
                              onChange={(e) => setElitbuzzApiKey(e.target.value)}
                              placeholder="আপনার এলিটবাজ এপিআই কী পাসওয়ার্ড"
                              className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-rose-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-slate-500 block">Elitbuzz Sender ID (যেমন: 8801844...):</label>
                            <input 
                              type="text"
                              value={elitbuzzSenderId}
                              onChange={(e) => setElitbuzzSenderId(e.target.value)}
                              placeholder="অনুমোদিত প্রেরক ID বা নম্বর"
                              className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-rose-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {gateway === 'mimsms' && (
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3 text-left">
                        <span className="text-[9px] font-extrabold text-rose-500 tracking-wider block uppercase">MIM SMS bulk credentials</span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-slate-500 block">MiM SMS API Key:</label>
                            <input 
                              type="password"
                              value={mimsmsApiKey}
                              onChange={(e) => setMimsmsApiKey(e.target.value)}
                              placeholder="মিম এপিআই কী কীওয়ার্ড..."
                              className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-1 focus:ring-rose-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-slate-500 block">MiM Approved Sender ID:</label>
                            <input 
                              type="text"
                              value={mimsmsSenderId}
                              onChange={(e) => setMimsmsSenderId(e.target.value)}
                              placeholder="আপনার অনুমোদিত মাস্কিং/ননমাস্কিং ID"
                              className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-rose-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {gateway === 'twilio' && (
                      <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 flex flex-col gap-3 text-left">
                        <span className="text-[9px] font-extrabold text-rose-500 tracking-wider block uppercase">Twilio Global Integration</span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-slate-500 block">Account SID:</label>
                            <input 
                              type="text"
                              value={twilioSid}
                              onChange={(e) => setTwilioSid(e.target.value)}
                              placeholder="AC..."
                              className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-xs font-mono text-slate-800 focus:ring-1 focus:ring-rose-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-slate-500 block">Auth Token:</label>
                            <input 
                              type="password"
                              value={twilioAuthToken}
                              onChange={(e) => setTwilioAuthToken(e.target.value)}
                              placeholder="টুইলিও সিক্রেট টোকেন"
                              className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-xs font-mono text-slate-800 focus:ring-1 focus:ring-rose-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-medium text-slate-500 block">From phone number:</label>
                            <input 
                              type="text"
                              value={twilioFrom}
                              onChange={(e) => setTwilioFrom(e.target.value)}
                              placeholder="+1xxxxxxxxxx"
                              className="w-full bg-white border border-slate-200 outline-none p-2.5 rounded-xl text-xs font-semibold text-slate-800 focus:ring-1 focus:ring-rose-500"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom CTA Controls Footer */}
            <div className="border-t border-slate-100 pt-5 mt-5 flex justify-end gap-3 select-none">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-3 hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition-all text-xs font-black rounded-2xl border border-slate-200"
              >
                বাতিল করুন (Close)
              </button>

              {activeSegment === 'config' ? (
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={isSending}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-850 text-white rounded-2xl text-xs font-black shadow-lg shadow-slate-950/20 flex items-center justify-center gap-2 transition-all cursor-pointer min-w-[150px] disabled:opacity-50"
                >
                  {isSending ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : 'সংরক্ষণ করুন (Save)'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDispatchSMS}
                  disabled={isSending}
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black shadow-lg shadow-rose-900/30 flex items-center justify-center gap-2 transition-all cursor-pointer min-w-[150px] disabled:opacity-50"
                >
                  <Send size={14} />
                  {isSending ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : gateway === 'device' ? 'বার্তা পাঠান (Open App)' : 'সরাসরি SMS পাঠান 🚀'}
                </button>
              )}
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
