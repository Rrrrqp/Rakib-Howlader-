import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Settings, Upload, Image as ImageIcon, Check, RefreshCw, AlertCircle, Trash2 } from 'lucide-react';
import { getBrandLogoSettings, updateBrandLogoSettings } from '../services/settingsService';
import { uploadImage } from '../services/productService';
import defaultLogo from '../assets/images/sfh_logo_1779435027377.png';

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
    img.crossOrigin = 'anonymous'; // prevent cross-origin canvas security issues where applicable
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('ছবি লোড করা ব্যর্থ হয়েছে। ছবিটির ফরম্যাট সঠিক আছে কি না চেক করুন।'));
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

  useEffect(() => {
    async function loadSettings() {
      try {
        const logo = await getBrandLogoSettings();
        setLogoUrl(logo || defaultLogo);
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
        const MAX_SIZE = 500; // Optimal size for high contrast logos
        
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
        
        // Preserve original format (e.g., png transparency) if possible, otherwise default to jpeg
        const mimeType = file.type || 'image/png';
        const quality = mimeType === 'image/jpeg' ? 0.7 : undefined;
        const base64 = canvas.toDataURL(mimeType, quality);
        
        setProgress(85);
        await updateBrandLogoSettings(base64);
        setProgress(100);
        
        setLogoUrl(base64);
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
      // 1. Upload file to Firebase storage using productService helper
      const downloadUrl = await uploadImage(file, (pct) => {
        // Set progress proportionally from 15% to 85%
        setProgress(Math.round(15 + (pct * 0.7)));
      });

      setProgress(90);
      // 2. Save download URL into Firestore settings
      await updateBrandLogoSettings(downloadUrl);
      setProgress(100);
      
      setLogoUrl(downloadUrl);
      setMessage({ type: 'success', text: 'লোগো সফলভাবে ক্লাউড মোডে আপলোড এবং আপডেট করা হয়েছে!' });
    } catch (error) {
      console.warn('Failed to upload via Cloud Storage. Automatically falling back to Internal (Base64) Mode...', error);
      setMessage({ type: 'success', text: 'ক্লাউড লিমিটের কারণে লোগোকে অপ্টিমাইজ ক্যানভাস প্রসেসে সেভ করা হচ্ছে...' });
      
      // Strict direct fallback to base64 canvas compression so it NEVER fails
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
        setMessage({ type: 'success', text: 'লোগোটি অত্যন্ত সফলভাবে রিমোট ডেটাবেজে ব্যাকআপ সহ আপডেট করা হয়েছে!' });
      } catch (fallbackErr: any) {
        console.error('All backup upload modes failed:', fallbackErr);
        setMessage({ type: 'error', text: `লোগো আপলোড করা ব্যর্থ হয়েছে: ${fallbackErr.message || fallbackErr}` });
      } finally {
        setIsUploading(false);
      }
    } finally {
      // Safely ensure uploading is turned off in any missed path
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
        await updateBrandLogoSettings(''); // set empty, which falls back to defaultLogo
        setLogoUrl(defaultLogo);
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

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-500 rounded-2xl">
            <Settings size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">ব্র্যান্ড সেটিংস (Brand Settings)</h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Custom Brand Identity & Asset Administration</p>
          </div>
        </div>

        {/* Upload Mode Switcher inspired by ProductManager */}
        <div className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100/80 transition-colors p-2 px-3 rounded-2xl border border-gray-100 self-start md:self-auto">
          <span className={`w-2 h-2 rounded-full ${useBase64 ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`} />
          <span className="text-[9px] font-black uppercase tracking-wider text-gray-500 mr-2">মোড:</span>
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
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
          <RefreshCw className="animate-spin text-rose-500" size={24} />
          <span className="text-xs font-bold tracking-widest uppercase">লোডিং হচ্ছে... (Loading Settings)</span>
        </div>
      ) : (
        <div className="space-y-6">
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

          <div className="p-4 bg-brand-gold/10 border border-brand-gold/20 rounded-2xl space-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-brand-gold">
              <ImageIcon size={14} />
              <span>গুরুত্বपूर्ण তথ্য (Important Information)</span>
            </div>
            <p className="text-gray-600 text-xs shadow-none border-none py-0 leading-relaxed">
              এখানে লোগো আপলোড বা রিমুভ করার পর, লোগোটি স্বয়ংক্রিয়ভাবে ক্লায়েন্ট পেজের <strong>"লোগো এখনই অর্ডার করুন"</strong> এবং <strong>"কাস্টমার ভালবাসা ও রিভিউ"</strong> সেকশনের ঠিক মাঝখানে আপডেট হয়ে যাবে। এছাড়াও এটি আপনার কাস্টমারের <strong>ডিজিটাল ইনভয়েসেও</strong> যুক্ত হবে।
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
