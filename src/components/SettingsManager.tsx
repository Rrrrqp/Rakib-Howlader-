import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Upload, Image as ImageIcon, Check, RefreshCw, AlertCircle, Trash2, Bell, Volume2, Send, ShieldAlert, BadgeHelp } from 'lucide-react';
import { getBrandSettings, updateBrandSettings, getBrandLogoSettings, updateBrandLogoSettings } from '../services/settingsService';
import { uploadImage } from '../services/productService';
import { playNotificationSound, requestBrowserNotificationPermission, sendBrowserNotification } from '../services/notificationService';
import defaultLogo from '../assets/images/sfh_logo_1779435027377.png';
import { BrandSettings } from '../types';

// Modern Promise-based helper to read files safely
const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('ফাইল রিডার কোনো ডাটা পায়নি।'));
      }
    };
    reader.onerror = () => reject(new Error('ফাইল পড়তে সমস্যা হয়েছে।'));
    reader.readAsDataURL(file);
  });
};

// Modern Promise-based helper to load Image HTML elements safely without hanging on errors
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous'; 
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('ছবি লোড করা ব্যর্থ হয়েছে।'));
    img.src = src;
  });
};

export default function SettingsManager() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [useBase64, setUseBase64] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification states
  const [settings, setSettings] = useState<BrandSettings>({
    logoUrl: '',
    telegramToken: '',
    telegramChatId: '',
    soundEnabled: true,
    pushEnabled: true,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [telegramTestStatus, setTelegramTestStatus] = useState<'success' | 'error' | null>(null);
  const [pushPermissionStatus, setPushPermissionStatus] = useState<string>('');

  useEffect(() => {
    async function loadSettings() {
      try {
        const fullSettings = await getBrandSettings();
        if (fullSettings) {
          setSettings(fullSettings);
          setLogoUrl(fullSettings.logoUrl || defaultLogo);
        } else {
          setLogoUrl(defaultLogo);
        }

        if ('Notification' in window) {
          setPushPermissionStatus(Notification.permission);
        } else {
          setPushPermissionStatus('unsupported');
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'শুধুমাত্র ছবি (Image) ফাইল আপলোড করতে পারবেন।' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'ফাইলের সাইজ অনেক বড় (সর্বোচ্চ ৫ মেগাবাইট)।' });
      return;
    }

    setIsUploading(true);
    setProgress(5);
    setMessage(null);

    // If useBase64 (Internal Mode) is selected
    if (useBase64) {
      try {
        setProgress(25);
        const dataUrl = await readFileAsDataURL(file);
        setProgress(50);
        
        const img = await loadImage(dataUrl);
        setProgress(70);

        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 500; 
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const mimeType = file.type || 'image/png';
        const quality = mimeType === 'image/jpeg' ? 0.7 : undefined;
        const base64 = canvas.toDataURL(mimeType, quality);
        
        setProgress(85);
        await updateBrandLogoSettings(base64);
        setProgress(100);
        
        setLogoUrl(base64);
        setSettings(prev => ({ ...prev, logoUrl: base64 }));
        setMessage({ type: 'success', text: 'লোগো সফলভাবে ইন্টারনাল মোডে আপলোড এবং আপডেট করা হয়েছে!' });
      } catch (err: any) {
        console.error('Failed to save base64 logo:', err);
        setMessage({ type: 'error', text: `লোগো সেভ করা ব্যর্থ হয়েছে: ${err.message || err}` });
      } finally {
        setIsUploading(false);
      }
      return;
    }

    // Try Cloud Mode (Standard Storage Upload)
    try {
      setProgress(15);
      const downloadUrl = await uploadImage(file, (pct) => {
        setProgress(Math.round(15 + (pct * 0.7)));
      });

      setProgress(90);
      await updateBrandLogoSettings(downloadUrl);
      setProgress(100);
      
      setLogoUrl(downloadUrl);
      setSettings(prev => ({ ...prev, logoUrl: downloadUrl }));
      setMessage({ type: 'success', text: 'লোগো সফলভাবে ক্লাউড মোডে আপলোড এবং আপডেট করা হয়েছে!' });
    } catch (error) {
      console.warn('Failed to upload via Cloud Storage. Falling back to Internal Mode...', error);
      setMessage({ type: 'success', text: 'ক্লাউড লিমিটের কারণে লোগোকে অপ্টিমাইজ ক্যানভাস প্রসেসে সেভ করা হচ্ছে...' });
      
      try {
        setProgress(40);
        const dataUrl = await readFileAsDataURL(file);
        setProgress(65);
        
        const img = await loadImage(dataUrl);
        setProgress(80);

        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 500;
        
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        const mimeType = file.type || 'image/png';
        const quality = mimeType === 'image/jpeg' ? 0.7 : undefined;
        const base64 = canvas.toDataURL(mimeType, quality);
        
        setProgress(95);
        await updateBrandLogoSettings(base64);
        setProgress(100);
        
        setLogoUrl(base64);
        setSettings(prev => ({ ...prev, logoUrl: base64 }));
        setMessage({ type: 'success', text: 'লোগোটি অত্যন্ত সফলভাবে রিমোট ডেটাবেজে ব্যাকআপ সহ আপডেট করা হয়েছে!' });
      } catch (fallbackErr: any) {
        console.error('All backup upload modes failed:', fallbackErr);
        setMessage({ type: 'error', text: `লোগো আপলোড করা ব্যর্থ হয়েছে: ${fallbackErr.message || fallbackErr}` });
      } finally {
        setIsUploading(false);
      }
    } finally {
      setTimeout(() => setIsUploading(false), 500);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const handleReset = async () => {
    if (window.confirm('আপনি কি সত্যিই লোগোটি রিমুভ করে ডিফল্ট ক্লাসিক লোগোতে ফিরে যেতে চান?')) {
      setIsLoading(true);
      try {
        await updateBrandLogoSettings(''); 
        setLogoUrl(defaultLogo);
        setSettings(prev => ({ ...prev, logoUrl: '' }));
        setMessage({ type: 'success', text: 'লোগো সফলভাবে রিমুভ করা হয়েছে এবং ডিফল্ট লোগো সেট করা হয়েছে।' });
      } catch (error) {
        console.error('Reset failed:', error);
        setMessage({ type: 'error', text: 'ডিফল্ট লোগোতে রিমুভ করা ব্যর্থ হয়েছে।' });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Notification Control logic
  const handleSaveNotificationSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setMessage(null);
    try {
      await updateBrandSettings({
        telegramToken: settings.telegramToken,
        telegramChatId: settings.telegramChatId,
        soundEnabled: settings.soundEnabled,
        pushEnabled: settings.pushEnabled,
      });
      setMessage({ type: 'success', text: 'অভিনন্দন! আপনার নোটিফিকেশন সেটিংস সফলভাবে সেভ করা হয়েছে।' });
    } catch (err) {
      console.error("Failed to save notifications settings:", err);
      setMessage({ type: 'error', text: 'সেটিংস সেভ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRequestPushPermission = async () => {
    const granted = await requestBrowserNotificationPermission();
    if (granted) {
      setPushPermissionStatus('granted');
      sendBrowserNotification('🔔 নোটিফিকেশন সচল হয়েছে!', 'এখন থেকে আপনার ব্রাউজারে নতুন অর্ডারের ইনস্ট্যান্ট নোটিফিকেশন দেখা যাবে।');
    } else {
      setPushPermissionStatus(Notification.permission);
    }
  };

  const handleTestTelegram = async () => {
    if (!settings.telegramToken || !settings.telegramChatId) {
      alert("অনুগ্রহ করে প্রথমে নিচে বট টোকেন এবং চ্যাট আইডি টাইপ করুন।");
      return;
    }
    setTestingTelegram(true);
    setTelegramTestStatus(null);
    try {
      const url = `https://api.telegram.org/bot${settings.telegramToken.trim()}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: settings.telegramChatId.trim(),
          text: `🔔 *Sera Fashion House - টেস্ট নোটিফিকেশন* 🔔\n\nঅভিনন্দন! আপনার ফোনে রিয়েল-টাইম অর্ডার নোটিফিকেশন অত্যন্ত সফলভাবে যুক্ত হয়েছে। 🚀\n\nএখন কাস্টমার পেজ থেকে কোনো অর্ডার সাবমিট করার সাথে সাথে আপনার ফোনে রিংটোন সহ বিস্তারিত মেসেজ চলে আসবে! 🎉`,
          parse_mode: 'Markdown',
        })
      });
      if (response.ok) {
        setTelegramTestStatus('success');
        playNotificationSound();
      } else {
        setTelegramTestStatus('error');
      }
    } catch (err) {
      console.error("Telegram testing failed:", err);
      setTelegramTestStatus('error');
    } finally {
      setTestingTelegram(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* 1. Main Header */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl">
            <Settings size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">ব্র্যান্ড ও নোটিফিকেশন সেটিংস (Settings)</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Control Brand Identity, Sounds & Real-Time Alerts</p>
          </div>
        </div>

        {/* Upload Mode Switcher inspired by ProductManager */}
        <div className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100/80 transition-colors p-2 px-3 rounded-2xl border border-gray-100 self-start md:self-auto">
          <span className={`w-2 h-2 rounded-full ${useBase64 ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
          <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 mr-2">লোগো মোড:</span>
          <button
            type="button"
            onClick={() => {
              setUseBase64(!useBase64);
              setMessage(null);
            }}
            className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-xl transition-all ${
              useBase64 
                ? 'bg-rose-600 text-white shadow-md' 
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {useBase64 ? '✓ Internal Mode' : 'Cloud Mode'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`flex items-center gap-2.5 p-4 rounded-2xl text-xs font-bold leading-relaxed border ${
              message.type === 'success' 
                ? 'bg-emerald-50/50 text-emerald-700 border-emerald-100' 
                : 'bg-rose-50/50 text-rose-700 border-rose-100'
            }`}
          >
            {message.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
            <span>{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 text-gray-400">
          <RefreshCw className="animate-spin text-rose-500" size={24} />
          <span className="text-xs font-bold tracking-widest uppercase">লোডিং হচ্ছে... (Loading settings)</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Logo Upload Section */}
          <div className="lg:col-span-12 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
            <h3 className="text-sm font-black text-[#1a1c2e] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-gray-50">
              <ImageIcon size={16} className="text-rose-500" />
              ব্র্যান্ড লোগো আপলোডার (Brand Logo Administration)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
              {/* Current Brand Logo Preview */}
              <div className="col-span-1 md:col-span-2 flex flex-col items-center gap-2.5 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">চলতি লোগো (Current Logo)</span>
                <div className="relative group flex items-center justify-center">
                  <div className="p-1 bg-black/90 rounded-full border-2 border-brand-gold shadow-lg flex items-center justify-center w-28 h-28 overflow-hidden">
                    <img 
                      src={logoUrl || defaultLogo} 
                      alt="Brand Logo Preview" 
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = defaultLogo;
                      }}
                    />
                  </div>
                </div>
                {logoUrl && logoUrl !== defaultLogo && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-black text-rose-600 hover:text-rose-700 transition-colors mt-2"
                  >
                    <Trash2 size={12} />
                    ডিফল্ট লোগো সেট করুন
                  </button>
                )}
              </div>

              {/* Custom Logo File Drag-and-Drop Area */}
              <div className="col-span-1 md:col-span-3">
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all gap-3 ${
                    dragActive 
                      ? 'border-rose-500 bg-rose-50/20' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50/20'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden" 
                  />
                  
                  <div className="p-3 bg-rose-50 text-rose-500 rounded-full">
                    <Upload size={20} />
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">লোগো ছবি ড্র্যাগ করুন বা ক্লিক করুন</h4>
                    <p className="text-[10px] text-gray-400 font-bold mt-1">PNG, JPG বা JPEG ফরম্যাট (সর্বোচ্চ ৫ মেগাবাইট)</p>
                  </div>
                </div>
              </div>
            </div>

            {isUploading && (
              <div className="space-y-1.5 p-4 bg-rose-50/20 border border-rose-100 rounded-2xl">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-rose-600 tracking-wider">
                  <span>লোগো আপলোড হচ্ছে... (Uploading File)</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-rose-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Real-time Order Alerts Configuration Section */}
          <div className="lg:col-span-12 bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
            
            <h3 className="text-sm font-black text-[#1a1c2e] uppercase tracking-wider flex items-center gap-2 pb-3 border-b border-gray-50">
              <Bell size={16} className="text-rose-500 animate-bounce" />
              ফোনে নোটিফিকেশন ও অ্যালার্ট সেটিংস (Phone & Control Notifications)
            </h3>

            <form onSubmit={handleSaveNotificationSettings} className="space-y-6">
              
              {/* Local Browser Chimes and Popups checkboxes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Ringtone Switcher */}
                <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100/50 rounded-2xl border border-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                      <Volume2 size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">শব্দ সংকেত (Alert Sound)</h4>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">নতুন অর্ডার আসলে রিংটোন বাজবে</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => playNotificationSound()}
                      className="px-2.5 py-1.5 text-[9px] font-black text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl uppercase tracking-widest transition-colors"
                    >
                      টেস্ট সাউন্ড
                    </button>
                    <input
                      type="checkbox"
                      checked={settings.soundEnabled !== false}
                      onChange={(e) => setSettings(prev => ({ ...prev, soundEnabled: e.target.checked }))}
                      className="accent-rose-600 w-5 h-5 rounded cursor-pointer"
                    />
                  </div>
                </div>

                {/* 2. Browser Push Popups */}
                <div className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100/50 rounded-2xl border border-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                      <Bell size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider">ব্রাউজার পুশ (Browser Push)</h4>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">স্ক্রিনের উপরে সাথে সাথে অ্যালার্ট আসবে</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {pushPermissionStatus !== 'granted' && (
                      <button
                        type="button"
                        onClick={handleRequestPushPermission}
                        className="px-2.5 py-1.5 text-[9px] font-black text-white bg-black hover:bg-black/90 shadow-sm rounded-xl uppercase tracking-widest transition-all"
                      >
                        অনুমতি দিন
                      </button>
                    )}
                    <input
                      type="checkbox"
                      checked={settings.pushEnabled !== false}
                      onChange={(e) => setSettings(prev => ({ ...prev, pushEnabled: e.target.checked }))}
                      className="accent-rose-600 w-5 h-5 rounded cursor-pointer"
                    />
                  </div>
                </div>

              </div>

              {/* Telegram Phone Push Integration Card */}
              <div className="bg-gradient-to-tr from-sky-50/40 via-white to-indigo-50/20 p-5 rounded-3xl border border-sky-100 space-y-6">
                
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-sky-500 text-white rounded-2xl shadow-md shadow-sky-500/10">
                      <Send size={18} className="transform -rotate-12 translate-x-0.5 -translate-y-0.5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-sky-900 uppercase tracking-wider">টেলিগ্রাম ইনস্ট্যান্ট অ্যালার্ট (Telegram Phone Alerts)</h4>
                      <p className="text-[10px] text-sky-600 font-bold">কাস্টমার অর্ডার করা মাত্র ফোনে রিয়েল-টাইম নোটিফিকেশন আসবে</p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    disabled={testingTelegram}
                    onClick={handleTestTelegram}
                    className="flex items-center gap-2 px-3 py-2 bg-sky-600 hover:bg-sky-500 hover:shadow-lg hover:shadow-sky-500/15 disabled:opacity-50 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md shrink-0"
                  >
                    {testingTelegram ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                    ফোনে টেস্ট করুন
                  </button>
                </div>

                {/* Telegram verification messages status */}
                <AnimatePresence>
                  {telegramTestStatus && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`p-3.5 rounded-2xl text-[11px] font-bold flex items-center gap-2 border leading-relaxed ${
                        telegramTestStatus === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {telegramTestStatus === 'success' ? (
                        <>
                          <Check size={16} />
                          <span>মেসেজ সফলভাবে পাঠানো হয়েছে! যদি ফোনে নোটিফিকেশন না পেয়ে থাকেন, অনুগ্রহ করে আপনার চ্যাট আইডি বা বট সেটিংস চেক করুন।</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={16} />
                          <span>মেসেজ পাঠানো ব্যর্থ হয়েছে। আপনার বট টোকেন এবং চ্যাট আইডি চেক করুন এবং নিশ্চিত করুন যে আপনার বটে স্টার্ট (/start) বাটন প্রেস করেছেন।</span>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Telegram inputs form layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                  
                  {/* Bot Token field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      ১. টেলিগ্রাম বট টোকেন (Telegram Bot Token):
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                      value={settings.telegramToken || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, telegramToken: e.target.value }))}
                      className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-mono text-xs rounded-2xl border border-sky-100 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                  {/* Chat ID Input Field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                      ২. টেলিগ্রাম চ্যাট আইডি (Telegram Chat ID):
                    </label>
                    <input
                      type="text"
                      placeholder="যেমন: 987654321"
                      value={settings.telegramChatId || ''}
                      onChange={(e) => setSettings(prev => ({ ...prev, telegramChatId: e.target.value }))}
                      className="w-full px-4 py-3 bg-white text-gray-800 placeholder-gray-400 font-mono text-xs rounded-2xl border border-sky-100 focus:border-sky-400 focus:ring-1 focus:ring-sky-400 outline-none transition-all shadow-inner"
                    />
                  </div>

                </div>

                {/* Detailed Bengali Step-by-Step Instructions card for customer safety */}
                <div className="bg-sky-50 bg-opacity-40 p-4 rounded-2xl mt-4 space-y-2 border border-sky-100/50">
                  <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-sky-700">
                    <BadgeHelp size={14} />
                    টেলিগ্রাম বট সেটআপ করার সহজ গাইড (Easy Setup Guide):
                  </div>
                  <ol className="text-gray-600 text-[11px] leading-relaxed list-decimal list-inside space-y-1.5 pl-1">
                    <li>টেলিগ্রাম অ্যাপে সার্চ করুন <strong className="text-sky-800 font-bold">@BotFather</strong> এবং স্টার্ট দিন।</li>
                    <li><strong className="text-sky-800 font-bold">/newbot</strong> কমান্ড দিন, আপনার বটের নাম লিখুন এবং শেষে "bot" যুক্ত ইউজারনেম টাইপ করে টোকেনটি কপি করুন।</li>
                    <li>টেলিগ্রামে <strong className="text-sky-800 font-bold">@userinfobot</strong> দিয়ে আপনার নিজস্ব <strong className="font-bold">Chat ID (আইডি নম্বর)</strong> কপি করুন।</li>
                    <li>আপনার তৈরি করা টেলিগ্রাম চ্যাট বটে গিয়ে অবশ্যই একবার <strong className="text-rose-600 font-bold">/start</strong> দিবেন।</li>
                    <li>উপরে টোকেন ও চ্যাট আইডি বসিয়ে দিয়ে <strong className="text-sky-600 font-bold">"ফোনে টেস্ট করুন"</strong> ক্লিক করুন। টেস্ট সফল হলে সেভ করুন!</li>
                  </ol>
                </div>

              </div>

              {/* Form submit footer button */}
              <div className="flex justify-end pt-3 border-t border-gray-150">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-rose-600/10 hover:shadow-rose-600/25 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {savingSettings ? <RefreshCw className="animate-spin" size={14} /> : <Check size={14} />}
                  সেটিংস সেভ করুন (Save Settings)
                </button>
              </div>

            </form>

          </div>

          <div className="lg:col-span-12 p-4 bg-brand-gold/10 border border-brand-gold/20 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand-gold">
              <ShieldAlert size={14} />
              <span>নিরাপত্তা ও কনফিগারেশন নোট (Important Configuration)</span>
            </div>
            <p className="text-gray-600 text-xs shadow-none border-none py-0 leading-relaxed pl-1">
              লোগো ফাইল এবং নোটিফিকেশন তথ্য সম্পূর্ণ সুরক্ষিতভাবে ক্লাউড রিমোট ডাটাবেজে স্টোর হয়। টেলিগ্রাম বট কনফিগারেশনের ফলে আপনার ক্লায়েন্ট অর্ডার করামাত্র সরাসরি টেলিগ্রাম সার্ভার হয়ে আপনার ফোনে পুশ নোটিফিকেশন সচল হবে।
            </p>
          </div>
          
        </div>
      )}
    </div>
  );
}
