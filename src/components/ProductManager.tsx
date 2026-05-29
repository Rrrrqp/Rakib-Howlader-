import React, { useState, useEffect, useRef } from 'react';
import { getAllProducts, createProduct, updateProduct, deleteProduct, uploadImage } from '../services/productService';
import { signInWithGoogle, initializeFirebase } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { Product, Category } from '../types';
import { 
  Plus, Search, Edit, Trash2, Package, Tag, Hash, 
  DollarSign, Image as ImageIcon, Check, X, AlertCircle, Loader2,
  Eye, EyeOff, Upload, Camera, ShieldCheck, LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ProductManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isAuthAuthorized, setIsAuthAuthorized] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [useBase64, setUseBase64] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // States for delete confirmation and notifications
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null);

  const showNotification = (text: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(prev => prev?.text === text ? null : prev);
    }, 4500);
  };

  useEffect(() => {
    let unsubscribe: any;
    
    const initAuthListener = async () => {
      try {
        const { auth } = await initializeFirebase();
        if (auth) {
          unsubscribe = onAuthStateChanged(auth, (user) => {
            setIsAuthAuthorized(!!user);
            setIsAnonymous(user?.isAnonymous || false);
            if (user) {
              console.log("Auth State Changed:", { uid: user.uid, isAnonymous: user.isAnonymous });
            }
          });
        }
      } catch (err) {
        console.warn("Auth initialization failed for ProductManager", err);
      }
    };

    initAuthListener();
    return () => unsubscribe && typeof unsubscribe === 'function' && unsubscribe();
  }, []);

  const [loggingIn, setLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showTroubleshoot, setShowTroubleshoot] = useState(false);

  const handleGoogleLogin = async () => {
    setLoggingIn(true);
    setLoginError(null);
    try {
      await signInWithGoogle();
      // onAuthStateChanged will handle setIsAuthAuthorized
    } catch (err: any) {
      console.error("Login Error:", err);
      setLoginError(err.message || 'Unknown error');
      // alert(`লগইন ব্যর্থ হয়েছে: ${err.message || 'Unknown error'}`);
    } finally {
      setLoggingIn(false);
    }
  };

  const [formEntries, setFormEntries] = useState<Partial<Product>[]>([{
    title: '',
    brand: '',
    description: '',
    price: 0,
    imageUrl: '',
    category: 'THREE PIECE',
    productCode: '',
    stock: 0,
    discount: 0,
    isActive: true,
    initialSalesCount: 0
  }]);

  const addFormEntry = () => {
    setFormEntries(prev => [...prev, {
      title: '',
      brand: '',
      description: '',
      price: 0,
      imageUrl: '',
      category: 'THREE PIECE',
      productCode: '',
      stock: 50,
      discount: 0,
      isActive: true,
      initialSalesCount: 0
    }]);
    
    // Smooth scroll to bottom after adding
    setTimeout(() => {
      const modalScroll = document.getElementById('modal-scroll-area');
      if (modalScroll) {
        modalScroll.scrollTo({ top: modalScroll.scrollHeight, behavior: 'smooth' });
      }
    }, 100);
  };

  const removeFormEntry = (index: number) => {
    if (formEntries.length === 1) return;
    setFormEntries(prev => prev.filter((_, i) => i !== index));
  };

  const updateFormEntry = (index: number, updates: Partial<Product>) => {
    setFormEntries(prev => {
      const newEntries = [...prev];
      newEntries[index] = { ...newEntries[index], ...updates };
      return newEntries;
    });
  };

  const fetchProducts = async () => {
    setLoading(true);
    const data = await getAllProducts();
    setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormEntries([{
        ...product,
        initialSalesCount: product.initialSalesCount ?? 0
      }]);
    } else {
      setEditingProduct(null);
      setFormEntries([{
        title: '',
        brand: '',
        description: '',
        price: 0,
        imageUrl: '',
        category: 'THREE PIECE',
        productCode: '',
        stock: 50,
        discount: 0,
        isActive: true,
        initialSalesCount: 0
      }]);
    }
    setIsModalOpen(true);
  };

  const [uploadProgress, setUploadProgress] = useState<{ [key: number]: number }>({});
  const [uploadingEntry, setUploadingEntry] = useState<{ [key: number]: boolean }>({});

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('শুধুমাত্র ছবি (Image) ফাইল আপলোড করা সম্ভব।', 'warning');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showNotification('ফাইলের সাইজ অনেক বড় (সর্বোচ্চ ৫ মেগাবাইট)।', 'warning');
      return;
    }

    setUploadingEntry(prev => ({ ...prev, [index]: true }));
    setUploadProgress(prev => ({ ...prev, [index]: 0 }));
    try {
      if (useBase64) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          const img = new Image();
          img.onload = () => {
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
            const base64 = canvas.toDataURL('image/jpeg', 0.4);
            updateFormEntry(index, { imageUrl: base64 });
            setUploadingEntry(prev => ({ ...prev, [index]: false }));
          };
          img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
        return;
      }

      const url = await uploadImage(file, (progress) => {
        setUploadProgress(prev => ({ ...prev, [index]: progress }));
      });
      if (url) {
        updateFormEntry(index, { imageUrl: url });
      }
    } catch (error: any) {
      console.error("Upload failed details:", error);
      showNotification("দুঃখিত! ছবি আপলোড করা সম্ভব হয়নি।", "error");
    } finally {
      setUploadingEntry(prev => ({ ...prev, [index]: false }));
      setUploadProgress(prev => ({ ...prev, [index]: 0 }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    const invalidEntries = formEntries.filter(entry => !entry.imageUrl || !entry.title || !entry.price);
    if (invalidEntries.length > 0) {
      showNotification("অসম্পূর্ণ তথ্য: সকল প্রোডাক্টের ছবি, নাম এবং মূল্য অবশ্যই দিতে হবে।", "warning");
      return;
    }

    setSubmitting(true);
    try {
      for (const entry of formEntries) {
        if (editingProduct?.id) {
          // Remove ID from the data to avoid Firestore update errors
          const { id, ...saveData } = entry as Product;
          await updateProduct(editingProduct.id, saveData);
        } else {
          await createProduct(entry);
        }
      }
      setIsModalOpen(false);
      await fetchProducts();
      showNotification(`সফল: ${formEntries.length} টি প্রোডাক্ট ক্যাটালগে সেভ করা হয়েছে।`, "success");
    } catch (error: any) {
      console.error("Failed to save products:", error);
      showNotification(`প্রোডাক্ট সেভ করতে সমস্যা হয়েছে: ${error.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (product: Product) => {
    setProductToDelete(product);
  };

  const confirmDelete = async () => {
    if (!productToDelete?.id) return;
    setDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      showNotification(`${productToDelete.title} সফলভাবে ক্যাটালগ থেকে ডিলিট করা হয়েছে।`, 'success');
      setProductToDelete(null);
      await fetchProducts();
    } catch (error: any) {
      console.error("Failed to delete product:", error);
      showNotification(`প্রোডাক্ট ডিলিট করতে সমস্যা হয়েছে: ${error.message || error}`, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (product: Product) => {
    if (!product.id) return;
    await updateProduct(product.id, { isActive: !product.isActive });
    fetchProducts();
  };

  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.productCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white border border-gray-100 shadow-sm focus:ring-2 focus:ring-rose-500/20 outline-none"
          />
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 text-white rounded-2xl font-bold transition-all hover:bg-rose-700 shadow-lg shadow-rose-900/20"
        >
          <Plus size={20} />
          নতুন প্রোডাক্ট যোগ করুন
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          [...Array(8)].map((_, i) => (
            <div key={i} className="bg-white rounded-[2rem] border border-gray-100 p-4 animate-pulse">
              <div className="aspect-square bg-gray-100 rounded-2xl mb-4" />
              <div className="h-4 bg-gray-100 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-50 rounded w-1/2" />
            </div>
          ))
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full py-20 bg-white rounded-[2rem] border border-dashed border-gray-200 text-center">
            <Package className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">No products found</p>
          </div>
        ) : (
          filteredProducts.map(product => (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              key={product.id}
              className={`bg-white rounded-[2rem] border overflow-hidden transition-all group hover:shadow-xl ${!product.isActive ? 'opacity-60 border-gray-100' : 'border-gray-100 shadow-sm'}`}
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img 
                  src={product.imageUrl} 
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-110"
                />
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <button 
                    onClick={() => toggleActive(product)}
                    className={`p-2 rounded-xl backdrop-blur-md transition-all shadow-lg ${product.isActive ? 'bg-white/90 text-emerald-500' : 'bg-brand-charcoal/90 text-gray-400'}`}
                  >
                    {product.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                  <button 
                    onClick={() => handleOpenModal(product)}
                    className="p-2 bg-white/90 text-rose-500 rounded-xl backdrop-blur-md hover:bg-rose-500 hover:text-white transition-all shadow-lg"
                  >
                    <Edit size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(product)}
                    className="p-2 bg-white/90 text-gray-400 rounded-xl backdrop-blur-md hover:bg-rose-600 hover:text-white transition-all shadow-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="absolute bottom-4 left-4">
                  <span className="bg-brand-charcoal text-white px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                    {product.category}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight line-clamp-1">{product.title}</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{product.productCode}</p>
                  </div>
                  <div className="text-rose-600 font-black text-lg tabular-nums">৳{product.price.toLocaleString()}</div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                    <Package size={12} className="text-rose-500" />
                    <span>Stock: {product.stock}</span>
                  </div>
                  <div className={`text-[9px] font-black uppercase tracking-widest ${product.stock > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {product.stock > 0 ? 'In Stock' : 'Out of Stock'}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Product Edit/Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-[#0f111a]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8 bg-brand-charcoal text-white flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black uppercase tracking-widest">{editingProduct ? 'প্রোডাক্ট এডিট করুন' : 'নতুন প্রোডাক্ট যোগ করুন'}</h2>
                  <p className="text-[10px] text-rose-500 font-bold uppercase tracking-[0.2em] mt-1">ক্যাটালগ ম্যানেজমেন্ট</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-10 max-h-[70vh] overflow-y-auto" id="modal-scroll-area">
                {formEntries.map((entry, index) => (
                  <div key={index} className={`space-y-6 ${index > 0 ? 'pt-10 border-t-2 border-dashed border-gray-100 relative' : ''}`}>
                    {index > 0 && (
                      <button 
                        type="button"
                        onClick={() => removeFormEntry(index)}
                        className="absolute top-6 right-0 p-2 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                    
                    <div className="flex items-center gap-3 mb-2">
                       <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center text-[10px] font-black">
                         {index + 1}
                       </div>
                       <h3 className="text-xs font-black text-brand-charcoal uppercase tracking-widest">Product Item {index + 1}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Auth Warning for Storage - Only show for first item or if not auth */}
                      {index === 0 && (!isAuthAuthorized || isAnonymous) && (
                        <div className="col-span-2 bg-amber-50 border border-amber-200 p-4 rounded-3xl flex items-start gap-4">
                          <div className="w-10 h-10 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                            <ShieldCheck size={20} />
                          </div>
                          <div className="flex-1">
                            <p className="text-[11px] font-black text-amber-900 uppercase tracking-widest">{isAnonymous ? 'Logged in Anonymously' : 'Storage Authorization Required'}</p>
                            <p className="text-[10px] text-amber-700 font-medium mt-1">
                              {isAnonymous 
                                ? 'আপনি বর্তমানে অতিথি (Anonymous) হিসেবে আছেন। ছবি আপলোড করার জন্য গুগল লগইন করা জরুরি।' 
                                : 'ছবি আপলোড করার জন্য গুগল লগইন প্রয়োজন। Anonymous Auth দিয়ে অনেক সময় আপলোড হতে সমস্যা হতে পারে।'}
                            </p>
                            <button 
                              type="button"
                              disabled={loggingIn}
                              onClick={handleGoogleLogin}
                              className="mt-3 flex items-center gap-2 px-6 py-2 bg-[#1a1c2e] text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-lg disabled:opacity-50"
                            >
                              {loggingIn ? <Loader2 size={12} className="animate-spin" /> : <LogIn size={12} />} 
                              {loginError ? 'Retry Login' : (loggingIn ? 'Logging in...' : 'Log in with Google')}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Image Upload Area */}
                      <div className="space-y-2 col-span-2">
                        <div className="flex justify-between items-center px-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">প্রোডাক্ট এর ছবি (Product Image)</label>
                          <div className="flex gap-3">
                            {index === 0 && (
                              <button 
                                type="button"
                                onClick={() => setUseBase64(!useBase64)}
                                className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-all ${useBase64 ? 'bg-rose-100 text-rose-600' : 'text-gray-400 hover:text-rose-500'}`}
                              >
                                {useBase64 ? '✓ Internal Mode (Fixed)' : 'Try Internal Mode'}
                              </button>
                            )}
                            <button 
                              type="button"
                              onClick={() => setShowUrlInput(!showUrlInput)}
                              className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline"
                            >
                              {showUrlInput ? 'Switch to Upload' : 'Enter URL instead'}
                            </button>
                          </div>
                        </div>

                        {showUrlInput ? (
                          <div className="relative">
                            <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              type="url"
                              placeholder="https://example.com/image.jpg"
                              value={entry.imageUrl}
                              onChange={(e) => updateFormEntry(index, { imageUrl: e.target.value })}
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-sm font-medium"
                            />
                          </div>
                        ) : (
                          <div 
                            onClick={() => !uploadingEntry[index] && document.getElementById(`file-input-${index}`)?.click()}
                            className={`relative group h-64 rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden gap-3 ${
                              entry.imageUrl 
                                ? 'border-emerald-500/30 bg-emerald-50/10' 
                                : 'border-gray-200 hover:border-rose-400 bg-gray-50'
                            }`}
                          >
                            <input 
                              type="file"
                              id={`file-input-${index}`}
                              onChange={(e) => handleFileChange(e, index)}
                              accept="image/*"
                              className="hidden"
                            />
                            
                            {entry.imageUrl ? (
                              <>
                                <img 
                                  src={entry.imageUrl} 
                                  alt="Preview" 
                                  className="absolute inset-0 w-full h-full object-cover group-hover:opacity-40 transition-opacity"
                                />
                                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-brand-charcoal/40 backdrop-blur-sm">
                                  <Upload className="text-white mb-2" size={32} />
                                  <span className="text-white text-xs font-black uppercase tracking-widest">Change Photo</span>
                                </div>
                              </>
                            ) : (
                              <div className="text-center">
                                <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-rose-500 mx-auto mb-2 group-hover:scale-110 transition-transform">
                                  <Camera size={28} />
                                </div>
                                <p className="text-xs font-black text-gray-800 uppercase tracking-widest">ফাইল সিলেক্ট করুন</p>
                              </div>
                            )}

                            {uploadingEntry[index] && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm z-10 flex-col gap-2">
                                <Loader2 className="animate-spin text-rose-600" size={32} />
                                <div className="w-1/2 h-1 bg-gray-200 rounded-full overflow-hidden">
                                  <div className="h-full bg-rose-500 transition-all duration-300" style={{ width: `${uploadProgress[index] || 0}%` }} />
                                </div>
                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">{Math.round(uploadProgress[index] || 0)}%</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Title & Brand */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 col-span-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">প্রোডাক্ট এর নাম (Title)</label>
                          <div className="relative">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              required
                              type="text"
                              placeholder="যেমন: প্রিমিয়াম সিল্ক থ্রি পিস"
                              value={entry.title}
                              onChange={(e) => updateFormEntry(index, { title: e.target.value })}
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-sm font-medium"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ব্র্যান্ডের নাম (Brand Name)</label>
                          <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              type="text"
                              placeholder="যেমন: Sera Fashion"
                              value={entry.brand}
                              onChange={(e) => updateFormEntry(index, { brand: e.target.value })}
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-sm font-medium"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Category & Product Code */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 col-span-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ক্যাটাগরি</label>
                          <select 
                            value={entry.category}
                            onChange={(e) => updateFormEntry(index, { category: e.target.value as Category })}
                            className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-sm font-bold uppercase tracking-widest"
                          >
                            <option value="THREE PIECE">Three Piece (থ্রি-পিস)</option>
                            <option value="SAREE">Saree (শাড়ী)</option>
                            <option value="OTHERS">Others (অন্যান্য)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">প্রোডাক্ট কোড</label>
                          <div className="relative">
                            <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              required
                              type="text"
                              placeholder="SFH-101"
                              value={entry.productCode}
                              onChange={(e) => updateFormEntry(index, { productCode: e.target.value.toUpperCase() })}
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-sm font-bold tracking-widest"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Price & Stock & Discount */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 col-span-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">মূল্য (Price ৳)</label>
                          <div className="relative">
                            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              required
                              type="number"
                              placeholder="0"
                              value={entry.price}
                              onChange={(e) => updateFormEntry(index, { price: Number(e.target.value) })}
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-lg font-black tabular-nums"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ডিসকাউন্ট (৳)</label>
                          <div className="relative">
                            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              type="number"
                              placeholder="0"
                              value={entry.discount || 0}
                              onChange={(e) => updateFormEntry(index, { discount: Number(e.target.value) })}
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-lg font-black tabular-nums text-rose-600"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ষ্টক পরিমাণ</label>
                          <div className="relative">
                            <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input 
                              required
                              type="number"
                              placeholder="0"
                              value={entry.stock}
                              onChange={(e) => updateFormEntry(index, { stock: Number(e.target.value) })}
                              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-lg font-black tabular-nums"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-2 col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">বিস্তারিত বিবরণ</label>
                        <textarea 
                          rows={3}
                          placeholder="যেমন: ১০০% কটন ফেব্রিক, প্রিমিয়াম এমব্রয়ডারি ওয়ার্ক..."
                          value={entry.description}
                          onChange={(e) => updateFormEntry(index, { description: e.target.value })}
                          className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-sm font-medium"
                        />
                      </div>

                      {/* Social Proof & Live Sales Customization segment */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 col-span-2 bg-[#f9fafb] p-6 rounded-[2rem] border border-gray-100">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Plus size={12} className="text-rose-500 font-extrabold" />
                            ইনিশিয়াল সেলস কাউন্ট (Baseline Orders)
                          </label>
                          <input 
                            type="number"
                            placeholder="যেমন: ৫০"
                            value={entry.initialSalesCount ?? 0}
                            onChange={(e) => updateFormEntry(index, { initialSalesCount: Number(e.target.value) })}
                            className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-sm font-bold tabular-nums"
                          />
                          <p className="text-[9.5px] text-gray-400 font-medium">এটি কাস্টমারদের দেখানোর জন্য প্রাথমিক সেলস বেসলাইন। এর সাথে রিয়েল-টাইম কাস্টমার লাইভ অর্ডারসমূহ স্বয়ংক্রিয়ভাবে যোগ হবে।</p>
                        </div>
                        <div className="space-y-1 justify-center flex flex-col pl-2 border-l border-gray-200 md:pl-4">
                          <span className="text-[10.5px] font-black text-brand-charcoal uppercase tracking-widest">সরাসরি ডেটাবেজ সংযোগ</span>
                          <p className="text-[11px] text-gray-500 leading-normal font-medium">
                            কাস্টমার কোনো অর্ডার প্লেস করলেই তা সরাসরি অ্যাডমিন প্যানেল এবং কাস্টমার ইন্টারফেসে সেকেন্ডের মধ্যে লাইভ কাউন্ট আপডেট করবে। ১০০% নিখুঁত রিয়েল-টাইম ডাটা ইন্টিগ্রেশন।
                          </p>
                        </div>
                      </div>

                      {/* Visibility */}
                      <div className="col-span-2 pt-2">
                        <label className="flex items-center gap-4 p-4 bg-gray-50 border border-gray-100 rounded-2xl cursor-pointer hover:bg-gray-100 transition-all">
                          <input 
                            type="checkbox"
                            checked={entry.isActive}
                            onChange={(e) => updateFormEntry(index, { isActive: e.target.checked })}
                            className="w-5 h-5 accent-rose-600 rounded"
                          />
                          <div>
                            <span className="text-xs font-black text-gray-800 uppercase tracking-widest">Active & Visible (চালু আছে)</span>
                            <p className="text-[10px] text-gray-400 font-bold">এটি আনচেক করলে ওয়েবসাইট থেকে প্রোডাক্টটি হাইড হয়ে যাবে।</p>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                {!editingProduct && (
                  <button 
                    type="button"
                    onClick={addFormEntry}
                    className="w-full py-6 border-2 border-dashed border-gray-200 rounded-[2rem] text-gray-400 font-black uppercase tracking-widest text-[10px] hover:border-rose-500 hover:text-rose-500 hover:bg-rose-50/30 transition-all flex flex-col items-center gap-2 group"
                  >
                    <Plus size={24} className="group-hover:scale-125 transition-transform" />
                    + Add More Product (প্রোডাক্ট যোগ করুন)
                  </button>
                )}

                <div className="pt-6 flex gap-4 sticky bottom-0 bg-white/80 backdrop-blur-md pb-4 z-10 border-t border-gray-50">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-100 transition-all"
                  >
                    বাতিল করুন (Discard)
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting || Object.values(uploadingEntry).some(v => v)}
                    className="flex-[2] py-4 bg-rose-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-rose-700 transition-all shadow-xl shadow-rose-900/20 disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                    {Object.values(uploadingEntry).some(v => v) ? 'Uploading Image...' : (editingProduct ? 'আপডেট করুন (Update)' : 'ক্যাটালগে যোগ করুন (Add to Catalog)')}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !deleting && setProductToDelete(null)}
              className="absolute inset-0 bg-[#0f111a]/75 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-rose-50 p-8 text-center"
            >
              <button 
                disabled={deleting}
                onClick={() => setProductToDelete(null)}
                className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 hover:text-rose-500 rounded-xl transition-all cursor-pointer disabled:opacity-50 animate-fade"
              >
                <X size={20} />
              </button>

              <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6 shadow-sm">
                <Trash2 size={24} className="animate-pulse text-rose-500" />
              </div>

              <h3 className="text-lg font-black text-[#1a1c2e] mb-2 font-sans">প্রোডাক্টটি ডিলিট করতে চান?</h3>
              <p className="text-[11px] text-gray-500 font-semibold mb-6 uppercase tracking-wide">
                আপনি কি নিশ্চিত যে ক্যাটালগ থেকে <span className="text-rose-600 font-extrabold">"{productToDelete.title}"</span> প্রোডাক্টটি চিরতরে ডিলিট করতে চান?
              </p>

              {productToDelete.imageUrl && (
                <div className="w-24 h-24 mx-auto rounded-2xl overflow-hidden border border-gray-150 mb-6 bg-gray-50 flex items-center justify-center">
                  <img src={productToDelete.imageUrl} referrerPolicy="no-referrer" alt="ToDelete" className="w-full h-full object-cover" />
                </div>
              )}

              <div className="flex gap-4">
                <button 
                  type="button"
                  disabled={deleting}
                  onClick={() => setProductToDelete(null)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                >
                  ক্যান্সেল
                </button>
                <button 
                  type="button"
                  disabled={deleting}
                  onClick={confirmDelete}
                  className="flex-[2] py-3 bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-900/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {deleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                  নিশ্চিত ডিলিট
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sleek Auto-Dismiss Notification Toast */}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] w-full max-w-sm px-4 pointer-events-none">
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 pointer-events-auto border text-xs font-bold leading-relaxed ${
                notification.type === 'success' ? 'bg-[#f0fdf4] border-emerald-100 text-emerald-800' :
                notification.type === 'error' ? 'bg-[#fef2f2] border-rose-100 text-rose-800' :
                notification.type === 'warning' ? 'bg-[#fffbeb] border-amber-100 text-amber-800' :
                'bg-blue-50 border-blue-100 text-blue-800'
              }`}
            >
              {notification.type === 'success' ? <ShieldCheck className="text-emerald-500 shrink-0" size={18} /> : <AlertCircle className="text-rose-500 shrink-0" size={18} />}
              <span className="flex-1 text-left">{notification.text}</span>
              <button onClick={() => setNotification(null)} className="p-1 hover:bg-black/5 rounded-lg transition-colors ml-auto text-gray-500">
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
