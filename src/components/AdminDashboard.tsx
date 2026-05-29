import { useState, useEffect, useMemo, useRef } from 'react';
import { getAllOrders, updateOrderStatus, updateOrder, deleteOrder } from '../services/orderService';
import { Order, Category } from '../types';
import { 
  LayoutDashboard, Receipt, Gift, LogOut, ShoppingBag, TrendingUp, Clock, 
  Search, Calendar, RefreshCw, Download, Eye, Edit, Trash2, Printer, 
  CheckCircle2, Package, Truck, XCircle, Send, Filter, MoreVertical, ChevronDown,
  Box, AlertCircle, Sparkles, X, Phone, MapPin, User, Save, Heart, Quote,
  Database, ListChecks, Grid, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useReactToPrint } from 'react-to-print';
import { toPng } from 'html-to-image';
import { downloadAsPng } from '../lib/downloadUtils';
import { DigitalInvoice } from './DigitalInvoice';
import { CashMemoModal } from './CashMemoModal';
import ProductManager from './ProductManager';
import SettingsManager from './SettingsManager';
import LiveVisitorTracker from './LiveVisitorTracker';
import ReviewManager from './ReviewManager';
import { Activity, MessageSquare } from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'settings' | 'live_visitors' | 'reviews'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [dateFilter, setDateFilter] = useState('');
  
  // Modal states
  const [viewingOrder, setViewingOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);

  const [isCashMemoOpen, setIsCashMemoOpen] = useState(false);
  const [isWelcomeGiftOpen, setIsWelcomeGiftOpen] = useState(false);
  const [giftCustomerName, setGiftCustomerName] = useState('');

  const printRef = useRef<HTMLDivElement>(null);
  const giftPrintRef = useRef<HTMLDivElement>(null);
  const invoiceDownloadRef = useRef<HTMLDivElement>(null);

  const handleGiftPrint = useReactToPrint({
    contentRef: giftPrintRef,
    documentTitle: `WELCOME-GIFT`,
  });

  const fetchOrders = async () => {
    setLoading(true);
    const data = await getAllOrders();
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    // Optimistic UI update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as any } : o));
    if (viewingOrder && viewingOrder.id === orderId) {
      setViewingOrder(prev => prev ? { ...prev, status: newStatus as any } : null);
    }
    await updateOrderStatus(orderId, newStatus);
  };

  const handleRealDelete = async () => {
    if (deletingOrderId) {
      const idToDelete = deletingOrderId;
      setDeletingOrderId(null);
      setOrders(prev => prev.filter(o => o.id !== idToDelete));
      if (viewingOrder && viewingOrder.id === idToDelete) {
        setViewingOrder(null);
      }
      await deleteOrder(idToDelete);
    }
  };

  const [isBulkStatusMenuOpen, setIsBulkStatusMenuOpen] = useState(false);

  const handleBulkStatusUpdate = async (newStatus: string) => {
    const idsToUpdate = [...selectedOrders];
    // Optimistic UI updates
    setOrders(prev => prev.map(o => idsToUpdate.includes(o.id!) ? { ...o, status: newStatus as any } : o));
    setSelectedOrders([]);
    setIsBulkStatusMenuOpen(false);
    
    // Remote updates
    await Promise.all(idsToUpdate.map(id => updateOrderStatus(id, newStatus)));
  };

  const handleBulkDelete = async () => {
    const idsToDelete = [...selectedOrders];
    setSelectedOrders([]);
    setIsBulkDeleteConfirmOpen(false);
    setOrders(prev => prev.filter(o => !idsToDelete.includes(o.id!)));
    await Promise.all(idsToDelete.map(id => deleteOrder(id)));
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `INVOICE-${printingOrder?.orderId}`,
  });

  useEffect(() => {
    if (printingOrder) {
      setTimeout(() => handlePrint(), 500); 
    }
  }, [printingOrder]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch = 
        o.customerName.toLowerCase().includes(searchStr) ||
        o.orderId.toLowerCase().includes(searchStr) ||
        o.mobileNumber.includes(searchStr) ||
        (o.productCode && o.productCode.toLowerCase().includes(searchStr));
      
      const matchesStatus = statusFilter === 'ALL' || o.status.toUpperCase() === statusFilter;
      const matchesCategory = categoryFilter === 'ALL' || (o.category && o.category.toUpperCase() === categoryFilter);
      const matchesDate = !dateFilter || o.createdAt.startsWith(dateFilter);

      return matchesSearch && matchesStatus && matchesCategory && matchesDate;
    });
  }, [orders, searchTerm, statusFilter, categoryFilter, dateFilter]);

  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      const cat = o.category || 'Other';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [orders]);

  // Analytics Calculations
  const stats = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter(o => o.status === 'Pending').length;
    const today = new Date().toISOString().split('T')[0];
    const todayRevenue = orders
      .filter(o => o.createdAt.startsWith(today))
      .reduce((sum, o) => sum + (o.status !== 'Cancelled' ? (o.totalAmount || 0) : 0), 0);
    
    // Calculate Top Product
    const productCounts: Record<string, number> = {};
    orders.forEach(o => {
      if (o.productCode) {
        productCounts[o.productCode] = (productCounts[o.productCode] || 0) + (o.quantity || 1);
      }
    });
    const sortedProducts = Object.entries(productCounts).sort((a, b) => b[1] - a[1]);
    const topProduct = sortedProducts[0]?.[0] || 'N/A';
    const topProductCount = sortedProducts[0]?.[1] || 0;

    // Lowest selling category from calculated categoryStats
    const sortedCategories = categoryStats; // inherited from higher scope if needed, but let's re-calculate or use it
    const lowCategory = sortedCategories.length > 0 ? sortedCategories[sortedCategories.length - 1][0] : 'N/A';
    const lowCategoryCount = sortedCategories.length > 0 ? sortedCategories[sortedCategories.length - 1][1] : 0;
    
    return { total, pending, todayRevenue, topProduct, topProductCount, lowCategory, lowCategoryCount };
  }, [orders, categoryStats]);

  const topCategory = categoryStats[0]?.[0] || 'N/A';
  const topCategoryCount = categoryStats[0]?.[1] || 0;

  return (
    <div className="bg-[#f8faff] min-h-screen font-sans pb-24">
      {/* Top Navigation Bar */}
      <nav className="bg-brand-charcoal text-white px-4 py-3 sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-rose-600 p-2 rounded-xl">
              <LayoutDashboard size={20} />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight leading-none">Sera Admin <span className="bg-rose-600 text-[8px] px-1 rounded uppercase align-middle ml-1">PRO</span></h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Management Suite</p>
            </div>
          </div>

          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 mx-6">
            <button 
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'orders' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <ListChecks size={14} />
              Orders
            </button>
            <button 
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'products' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <Grid size={14} />
              Products
            </button>
            <button 
              onClick={() => setActiveTab('settings')}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'settings' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <Settings size={14} />
              Settings
            </button>
            <button 
              onClick={() => setActiveTab('live_visitors')}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === 'live_visitors' ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <Activity size={14} className={activeTab === 'live_visitors' ? 'animate-pulse' : ''} />
              Live Track
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            </button>
            <button 
              onClick={() => setActiveTab('reviews')}
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'reviews' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <MessageSquare size={14} />
              Reviews
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button 
              onClick={() => setIsCashMemoOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-xs font-bold border border-white/10"
            >
              <Receipt size={14} className="text-rose-500" />
              CREATE CASH MEMO
            </button>
            <button 
              onClick={() => setIsWelcomeGiftOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 rounded-xl transition-all text-xs font-bold shadow-lg shadow-rose-900/20"
            >
              <Gift size={14} />
              WELCOME GIFT
            </button>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="p-2 bg-rose-600/20 text-rose-500 rounded-xl hover:bg-rose-600 hover:text-white transition-all"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        
        {activeTab === 'products' ? (
          <ProductManager />
        ) : activeTab === 'settings' ? (
          <SettingsManager />
        ) : activeTab === 'live_visitors' ? (
          <LiveVisitorTracker />
        ) : activeTab === 'reviews' ? (
          <ReviewManager />
        ) : (
          <>
            {/* Marketing Analysis Section */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Marketing Analysis</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">Sales performance by category</p>
              </div>
              <div className="p-2 bg-rose-50 text-rose-500 rounded-lg">
                <TrendingUp size={16} />
              </div>
            </div>
            <div className="space-y-4 pt-2">
              {categoryStats.slice(0, 3).map(([cat, count]) => (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-gray-600">{cat}</span>
                    <span className="text-rose-600">{count} Orders</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-brand-charcoal" 
                      style={{ width: `${(count / (orders.length || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-brand-charcoal p-6 rounded-3xl shadow-lg shadow-gray-900/20 text-white relative overflow-hidden group">
            <div className="relative z-10 space-y-2">
              <p className="text-[10px] text-rose-500 font-black uppercase tracking-widest">Best Selling</p>
              <h3 className="text-xl font-black uppercase">{topCategory}</h3>
              <p className="text-xs text-gray-400 tabular-nums">{topCategoryCount} Total Orders</p>
              <div className="pt-4 flex items-center gap-2 text-emerald-400 font-black text-[10px] uppercase">
                <TrendingUp size={12} /> Top Performer
              </div>
            </div>
            <ShoppingBag size={80} className="absolute -bottom-4 -right-4 text-white/5 group-hover:scale-110 transition-transform" />
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="relative z-10 space-y-2">
              <p className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">Top Product</p>
              <h3 className="text-xl font-black uppercase tracking-widest">{stats.topProduct}</h3>
              <p className="text-xs text-gray-400 tabular-nums">{stats.topProductCount} Units Sold</p>
              <div className="pt-4 flex items-center gap-2 text-rose-500 font-black text-[10px] uppercase">
                <Sparkles size={12} /> Most Wanted
              </div>
            </div>
            <Box size={80} className="absolute -bottom-4 -right-4 text-gray-50 group-hover:scale-110 transition-transform" />
          </div>

          <div className="bg-rose-50 p-6 rounded-3xl shadow-sm border border-rose-100 relative overflow-hidden group">
            <div className="relative z-10 space-y-2">
              <p className="text-[10px] text-rose-600 font-black uppercase tracking-widest">Low Selling</p>
              <h3 className="text-xl font-black text-rose-900 uppercase">{stats.lowCategory}</h3>
              <p className="text-xs text-rose-400 tabular-nums">{stats.lowCategoryCount} Orders</p>
              <div className="pt-4 flex items-center gap-2 text-rose-600 font-black text-[10px] uppercase">
                <AlertCircle size={12} /> Needs Attention
              </div>
            </div>
          </div>
        </section>

        {/* Stats Cards Section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-[2rem] shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="bg-indigo-600 p-4 rounded-2xl text-white">
              <ShoppingBag size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Orders</p>
              <div className="flex items-end gap-2">
                <h4 className="text-3xl font-black text-gray-800 leading-none tabular-nums">{stats.total}</h4>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">Real-time</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-[2rem] shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="bg-emerald-500 p-4 rounded-2xl text-white">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Today Revenue</p>
              <div className="flex items-end gap-2">
                <h4 className="text-3xl font-black text-gray-800 leading-none tabular-nums">৳{stats.todayRevenue.toLocaleString('en-US')}</h4>
                <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded italic">Confirmed</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-[2rem] shadow-sm flex items-center gap-4 relative overflow-hidden">
            <div className="bg-rose-600 p-4 rounded-2xl text-white">
              <Clock size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Pending Orders</p>
              <div className="flex items-end gap-2">
                <h4 className="text-3xl font-black text-gray-800 leading-none tabular-nums">{stats.pending}</h4>
                <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded tracking-tighter">WAITING</span>
              </div>
            </div>
          </div>
        </section>

        {/* Filters and Search */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm overflow-x-auto no-scrollbar">
              {['ALL', 'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all whitespace-nowrap
                    ${statusFilter === status 
                      ? 'bg-brand-charcoal text-white shadow-lg' 
                      : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {status}
                  <span className="ml-2 opacity-50">
                    {status === 'ALL' ? orders.length : orders.filter(o => o.status.toUpperCase() === status).length}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <input 
                type="text" 
                placeholder="Search by ID, Name, Phone or Product.."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-gray-100 shadow-sm focus:ring-2 focus:ring-rose-500/20 outline-none transition-all text-sm font-medium"
              />
              <Search className="absolute left-4 top-4 text-gray-400" size={20} />
            </div>
            
            <div className="flex gap-2">
              <div className="flex bg-white rounded-2xl border border-gray-100 shadow-sm p-1">
                {['ALL', 'SAREE', 'THREE PIECE', 'OTHERS'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-4 py-3 rounded-xl text-[9px] font-black tracking-tighter uppercase transition-all
                      ${categoryFilter === cat ? 'bg-rose-50 text-rose-600' : 'text-gray-400'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              
              <div className="relative group">
                <button 
                  onClick={() => document.getElementById('date-filter-input')?.click()}
                  className={`p-4 rounded-2xl border border-gray-100 shadow-sm transition-all ${dateFilter ? 'bg-rose-50 text-rose-500 border-rose-200' : 'bg-white text-gray-400 hover:text-rose-500'}`}
                >
                  <Calendar size={20} />
                </button>
                <input 
                  id="date-filter-input"
                  type="date" 
                  className="absolute opacity-0 pointer-events-none"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                />
                {dateFilter && (
                  <button 
                    onClick={() => setDateFilter('')}
                    className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full shadow-lg"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
              <button 
                onClick={fetchOrders}
                className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-400 hover:text-indigo-500 transition-all"
              >
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
              </button>
              <button className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-400 hover:text-emerald-500 transition-all">
                <Download size={20} />
              </button>
            </div>
          </div>
        </section>

        {/* Order List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{filteredOrders.length} Orders Found</h3>
            <button 
              onClick={() => setSelectedOrders(filteredOrders.map(o => o.id!))}
              className="text-[10px] font-black text-rose-500 uppercase tracking-widest bg-rose-50 px-4 py-2 rounded-lg"
            >
              Select All
            </button>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="wait">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="bg-white rounded-[2rem] border border-gray-100 p-6 animate-pulse">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center gap-4">
                          <div className="w-6 h-6 bg-gray-100 rounded-lg" />
                          <div className="w-12 h-12 bg-gray-100 rounded-2xl" />
                          <div className="space-y-2">
                            <div className="h-4 w-32 bg-gray-100 rounded" />
                            <div className="h-3 w-16 bg-gray-100 rounded" />
                          </div>
                        </div>
                        <div className="h-6 w-20 bg-gray-100 rounded-full" />
                      </div>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 px-2">
                        {[...Array(4)].map((_, j) => (
                          <div key={j} className="space-y-2">
                            <div className="h-3 w-12 bg-gray-50 rounded" />
                            <div className="h-4 w-24 bg-gray-50 rounded" />
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-4 gap-3">
                        {[...Array(4)].map((_, j) => (
                          <div key={j} className="h-12 bg-gray-50 rounded-2xl" />
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex flex-col items-center justify-center py-10 gap-4 opacity-50">
                    <div className="relative">
                      <div className="w-10 h-10 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Establishing Secure Connection...</p>
                  </div>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="bg-white p-20 rounded-[2rem] border border-dashed border-gray-200 text-center space-y-4">
                  <div className="mx-auto w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300">
                    <AlertCircle size={40} />
                  </div>
                  <p className="text-sm font-black text-gray-400 uppercase tracking-widest">No matching orders detected</p>
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white rounded-[2rem] border p-6 transition-all relative group
                      ${selectedOrders.includes(order.id!) ? 'border-rose-500 ring-2 ring-rose-500/10' : 'border-gray-100 shadow-sm'}`}
                  >
                    {/* Header Item */}
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <label className="relative flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="hidden peer"
                            checked={selectedOrders.includes(order.id!)}
                            onChange={() => {
                              setSelectedOrders(prev => 
                                prev.includes(order.id!) 
                                  ? prev.filter(id => id !== order.id) 
                                  : [...prev, order.id!]
                              );
                            }}
                          />
                          <div className="w-6 h-6 border-2 border-gray-200 rounded-lg peer-checked:bg-rose-500 peer-checked:border-rose-500 transition-all flex items-center justify-center">
                            <CheckCircle2 size={14} className="text-white scale-0 peer-checked:scale-100 transition-transform" />
                          </div>
                        </label>
                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-500 font-black text-lg">
                          {order.customerName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-gray-800 uppercase flex items-center gap-2">
                            {order.customerName}
                            <span className="bg-gray-100 px-2 py-0.5 rounded text-[10px] text-gray-500 tracking-wider">#{order.orderId}</span>
                          </h4>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{order.district || 'NOT SPECIFIED'}</p>
                        </div>
                      </div>
                      <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest
                        ${order.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                          order.status === 'Delivered' ? 'bg-emerald-50 text-emerald-600' :
                          order.status === 'Cancelled' ? 'bg-rose-50 text-rose-600' :
                          'bg-indigo-50 text-indigo-600'}`}>
                        {order.status}
                      </div>
                    </div>

                    {/* Order Details Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8 px-2">
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Product</p>
                        <p className="text-sm font-black text-gray-600 uppercase">{order.productCode}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Amount</p>
                        <p className="text-base font-black text-rose-600 tabular-nums">৳ {order.totalAmount.toLocaleString('en-US')}</p>
                      </div>
                      <div className="col-span-2 space-y-3">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Update Status</p>
                        <div className="flex items-center gap-3">
                          {[
                            { name: 'Pending', icon: Clock, color: 'text-amber-500' },
                            { name: 'Confirmed', icon: CheckCircle2, color: 'text-indigo-500' },
                            { name: 'Processing', icon: RefreshCw, color: 'text-purple-500' },
                            { name: 'Shipped', icon: Truck, color: 'text-blue-500' },
                            { name: 'Delivered', icon: Package, color: 'text-emerald-500' },
                            { name: 'Cancelled', icon: XCircle, color: 'text-rose-500' },
                          ].map((s) => (
                            <button
                              key={s.name}
                              onClick={() => handleStatusUpdate(order.id!, s.name)}
                              className={`p-2.5 rounded-xl transition-all border shadow-sm
                                ${order.status === s.name 
                                  ? `bg-brand-charcoal border-brand-charcoal text-white scale-110 shadow-lg` 
                                  : `bg-white border-gray-100 ${s.color} hover:bg-gray-50`}`}
                            >
                              <s.icon size={18} />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="grid grid-cols-4 gap-3">
                      <button 
                        onClick={() => setPrintingOrder(order)}
                        className="flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100 text-gray-500 font-black text-[10px] uppercase tracking-widest"
                      >
                        <Printer size={16} /> POS
                      </button>
                      <button 
                        onClick={() => setEditingOrder(order)}
                        className="flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100 text-rose-500 font-black text-[10px] uppercase tracking-widest"
                      >
                        <Edit size={16} /> Edit
                      </button>
                      <button 
                        onClick={() => setViewingOrder(order)}
                        className="flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100 text-indigo-500 font-black text-[10px] uppercase tracking-widest"
                      >
                        <Eye size={16} /> View
                      </button>
                      <button 
                        onClick={() => setDeletingOrderId(order.id!)}
                        className="flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100 text-rose-600 font-black text-[10px] uppercase tracking-widest"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
            </div>
          </section>
          </>
        )}
      </main>

      {/* POS Modal */}
      <AnimatePresence>
        {printingOrder && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPrintingOrder(null)}
              className="absolute inset-0 bg-[#0f111a]/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-[#1a1c2e] w-full max-w-[850px] rounded-[2rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-[#0f111a] flex items-center justify-between border-b border-white/5">
                <div className="flex items-center gap-3 text-white">
                  <Printer size={20} className="text-rose-500" />
                  <h2 className="text-sm font-black uppercase tracking-widest">Cash Memo / POS</h2>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handlePrint()}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-rose-900/20 transition-all"
                  >
                    <Printer size={14} /> Print Memo
                  </button>
                  <button 
                    onClick={() => downloadAsPng(printRef, `INVOICE-${printingOrder.orderId}`, '#ffffff')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-900/20 transition-all"
                  >
                    <Download size={14} /> Download PNG
                  </button>
                  <button 
                    onClick={() => setPrintingOrder(null)}
                    className="p-2 bg-white/5 hover:bg-white/10 text-gray-400 rounded-xl transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-8 bg-white m-4 rounded-xl">
                 <DigitalInvoice ref={printRef} order={printingOrder} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Professional View Modal */}
      <AnimatePresence>
        {viewingOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingOrder(null)}
              className="absolute inset-0 bg-[#0f111a]/95 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[95vh]"
            >
              <div className="p-10 bg-[#1a1c2e] text-white relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-600/10 blur-[80px] rounded-full" />
                <div className="relative z-10">
                  <div className="flex gap-2 mb-4">
                    <span className="bg-rose-600 text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded">Order Details</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">#{viewingOrder.orderId}</span>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <h2 className="text-3xl font-black">{viewingOrder.customerName}</h2>
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-2">
                        <Calendar size={14} /> {new Date(viewingOrder.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                        <Clock size={14} className="ml-2" /> {new Date(viewingOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setPrintingOrder(viewingOrder); setViewingOrder(null); }}
                        className="bg-brand-charcoal text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg hover:bg-black transition-all"
                      >
                        <Printer size={14} /> Print
                      </button>
                      <button 
                        onClick={() => { setEditingOrder(viewingOrder); setViewingOrder(null); }}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg"
                      >
                        <Edit size={14} /> Edit
                      </button>
                      <button onClick={() => setViewingOrder(null)} className="p-2 bg-white/5 rounded-xl border border-white/10">
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-12">
                {/* Status Switcher */}
                <div className="space-y-4">
                   <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Order Status Management</p>
                   <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100 overflow-x-auto no-scrollbar gap-1">
                      {['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(s => (
                        <button 
                          key={s}
                          onClick={() => handleStatusUpdate(viewingOrder.id!, s)}
                          className={`flex-1 py-3 px-6 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                            ${viewingOrder.status === s 
                              ? 'bg-[#1a1c2e] text-white shadow-xl' 
                              : 'text-gray-400 hover:text-gray-600'}`}
                        >
                          {s}
                        </button>
                      ))}
                   </div>
                </div>

                {/* Timeline */}
                <div className="space-y-6">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Order Timeline & History</p>
                  <div className="space-y-6 pl-4 border-l-2 border-gray-50">
                    {[
                      { status: 'Order Placed', date: viewingOrder.createdAt, icon: Package, color: 'bg-emerald-50 text-emerald-500' },
                      ...(viewingOrder.status !== 'Pending' ? [{ status: `Status changed to ${viewingOrder.status}`, date: new Date().toISOString(), icon: RefreshCw, color: 'bg-indigo-50 text-indigo-500' }] : [])
                    ].map((step, idx) => (
                      <div key={idx} className="relative flex items-center gap-6">
                        <div className="absolute -left-[2.25rem] w-6 h-6 bg-white border-2 border-gray-50 rounded-full" />
                        <div className={`p-3 rounded-2xl ${step.color}`}>
                          <step.icon size={16} />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-[#1a1c2e]">{step.status}</h4>
                          <p className="text-[10px] font-bold text-gray-400 mt-0.5">
                            {new Date(step.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date(step.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Order Summary Card */}
                <div className="bg-gray-50/50 rounded-[2.5rem] border border-gray-100 p-8 space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-500">
                      <ShoppingBag size={20} />
                    </div>
                    <h3 className="text-sm font-black text-[#1a1c2e] uppercase tracking-widest">Order Summary</h3>
                  </div>

                  <div className="space-y-4">
                    {viewingOrder.items && viewingOrder.items.length > 0 ? (
                      viewingOrder.items.map((item) => (
                        <div key={item.id} className="flex items-center gap-4 p-3 bg-white rounded-2xl border border-gray-100 mb-2">
                          <img src={item.productImage} alt={item.productTitle} className="w-12 h-12 object-cover rounded-lg" />
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-black text-gray-800 truncate">{item.productTitle}</h4>
                            <p className="text-[10px] text-gray-400 font-bold">Qty: {item.quantity} | Size: {item.size} | Code: {item.productCode}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-black text-rose-500 tabular-nums">৳ {item.price.toLocaleString('en-US')}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <>
                        <div className="flex justify-between items-center text-xs font-bold border-b border-dashed border-gray-200 pb-3">
                          <span className="text-gray-400 uppercase tracking-widest text-[10px]">Product Code</span>
                          <span className="text-[#1a1c2e] uppercase font-black">{viewingOrder.productCode}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold border-b border-dashed border-gray-200 pb-3">
                          <span className="text-gray-400 uppercase tracking-widest text-[10px]">Category</span>
                          <span className="text-rose-500 uppercase font-black">{viewingOrder.category || 'Other'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold border-b border-dashed border-gray-200 pb-3">
                          <span className="text-gray-400 uppercase tracking-widest text-[10px]">Quantity</span>
                          <span className="text-[#1a1c2e] uppercase font-black">{viewingOrder.quantity} Unit(s)</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-bold pb-3">
                          <span className="text-gray-400 uppercase tracking-widest text-[10px]">Unit Price</span>
                          <span className="text-xl font-black text-[#1a1c2e] tabular-nums">৳ {viewingOrder.price.toLocaleString('en-US')}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="pt-6 border-t border-gray-200 space-y-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Details</p>
                    <div className="bg-white p-4 rounded-2xl flex justify-between items-center shadow-sm border border-gray-50">
                      <span className="text-[10px] font-black text-gray-500 uppercase">Method</span>
                      <span className="text-[10px] font-black text-[#1a1c2e] uppercase">{viewingOrder.paymentMethod || 'Cash on Delivery'}</span>
                    </div>
                    {viewingOrder.discountAmount ? viewingOrder.discountAmount > 0 && (
                      <div className="bg-emerald-50/30 p-4 rounded-2xl flex justify-between items-center border border-emerald-50 tabular-nums">
                        <span className="text-[10px] font-black text-emerald-600 uppercase">Discount ({viewingOrder.discount}%)</span>
                        <span className="text-[11px] font-black text-emerald-600 font-serif">-৳ {viewingOrder.discountAmount.toLocaleString('en-US')}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Special Note */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-rose-50 rounded-[2.5rem] -rotate-1 group-hover:rotate-0 transition-transform" />
                  <div className="relative bg-white border border-rose-100 p-8 rounded-[2.5rem] border-dashed">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest">Customer Special Note</p>
                        <Send size={24} className="text-rose-100" />
                      </div>
                      <p className="text-sm font-bold text-gray-600 italic">" {viewingOrder.note || 'প্রযোজ্য নয়'} "</p>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50/30 flex justify-between items-center">
                 <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Auto-saved to cloud</span>
                 </div>
                 <button 
                  onClick={() => setViewingOrder(null)}
                  className="bg-[#1a1c2e] text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl"
                 >
                   Close Details
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingOrderId && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingOrderId(null)}
              className="absolute inset-0 bg-[#0f111a]/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl relative z-10"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-[#1a1c2e] mb-2">Are you sure?</h3>
              <p className="text-sm font-bold text-gray-500 leading-relaxed mb-8">
                You are about to delete this order. This action cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleRealDelete}
                  className="bg-rose-900 text-white w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-900/20"
                >
                  Delete Now
                </button>
                <button 
                  onClick={() => setDeletingOrderId(null)}
                  className="bg-gray-100 text-gray-500 w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Delete confirmation Modal */}
      <AnimatePresence>
        {isBulkDeleteConfirmOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBulkDeleteConfirmOpen(false)}
              className="absolute inset-0 bg-[#0f111a]/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl relative z-10"
            >
              <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-[#1a1c2e] mb-2">Bulk Delete?</h3>
              <p className="text-sm font-bold text-gray-500 leading-relaxed mb-8">
                You are about to delete {selectedOrders.length} orders. This cannot be undone.
              </p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleBulkDelete}
                  className="bg-rose-900 text-white w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-rose-900/20"
                >
                  Delete {selectedOrders.length} Orders
                </button>
                <button 
                  onClick={() => setIsBulkDeleteConfirmOpen(false)}
                  className="bg-gray-100 text-gray-500 w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingOrder && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingOrder(null)}
              className="absolute inset-0 bg-[#0f111a]/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 bg-[#1a1c2e] text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-600 rounded-xl">
                    <Edit size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase tracking-widest">Edit Order Details</h2>
                    <p className="text-[10px] font-bold text-gray-400">ORDER ID: {editingOrder.orderId}</p>
                  </div>
                </div>
                <button onClick={() => setEditingOrder(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <form id="edit-order-form" onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  
                  const qty = Number(formData.get('quantity'));
                  const price = Number(formData.get('price'));
                  const discountPercent = Number(formData.get('discount'));
                  const deliveryCharge = Number(formData.get('deliveryCharge'));
                  
                  const subtotal = qty * price;
                  const discountAmount = Math.round((subtotal * discountPercent) / 100);
                  const totalAmount = subtotal - discountAmount + deliveryCharge;

                  const updated: Partial<Order> = {
                    customerName: formData.get('name') as string,
                    mobileNumber: formData.get('phone') as string,
                    address: formData.get('address') as string,
                    upazila: formData.get('upazila') as string,
                    district: formData.get('district') as string,
                    productCode: formData.get('code') as string,
                    category: formData.get('category') as Category,
                    quantity: qty,
                    price: price,
                    discount: discountPercent,
                    discountAmount: discountAmount,
                    deliveryCharge: deliveryCharge,
                    totalAmount: totalAmount,
                    note: formData.get('note') as string,
                  };

                  // Optimistic update
                  setOrders(prev => prev.map(o => o.id === editingOrder.id ? { ...o, ...updated } : o));
                  if (viewingOrder && viewingOrder.id === editingOrder.id) {
                    setViewingOrder(prev => prev ? { ...prev, ...updated } : null);
                  }
                  
                  setEditingOrder(null);
                  await updateOrder(editingOrder.id!, updated);
                }} className="space-y-8">
                  {/* Customer Information */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                      <User size={16} className="text-rose-500" />
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Full Name</label>
                        <input name="name" defaultValue={editingOrder.customerName} required className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none font-bold text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Mobile Number</label>
                        <input name="phone" defaultValue={editingOrder.mobileNumber} required className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none font-bold text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Full Address</label>
                      <textarea name="address" defaultValue={editingOrder.address} required rows={2} className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none font-bold text-sm resize-none" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Upazila</label>
                        <input name="upazila" defaultValue={editingOrder.upazila} required className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none font-bold text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">District</label>
                        <input name="district" defaultValue={editingOrder.district} required className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none font-bold text-sm" />
                      </div>
                    </div>
                  </div>

                  {/* Product Details */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-gray-100 pb-3">
                      <ShoppingBag size={16} className="text-rose-500" />
                      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product & Pricing</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Product Code</label>
                        <input name="code" defaultValue={editingOrder.productCode} required className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none font-bold text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Category</label>
                        <select 
                          name="category" 
                          defaultValue={editingOrder.category} 
                          required
                          className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none font-bold text-sm bg-white"
                        >
                          <option value="Three Piece">Three Piece</option>
                          <option value="Saree">Saree</option>
                          <option value="Others">Others</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Quantity</label>
                        <input name="quantity" type="number" defaultValue={editingOrder.quantity} required className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none font-bold text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Unit Price</label>
                        <input name="price" type="number" defaultValue={editingOrder.price} required className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none font-bold text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Discount %</label>
                        <input name="discount" type="number" defaultValue={editingOrder.discount || 0} className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none font-bold text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Delivery Charge</label>
                        <input name="deliveryCharge" type="number" defaultValue={editingOrder.deliveryCharge || 0} className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none font-bold text-sm" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Customer Note</label>
                      <textarea name="note" defaultValue={editingOrder.note} rows={2} className="w-full p-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-rose-500/20 outline-none font-bold text-sm resize-none" />
                    </div>
                  </div>
                </form>
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50/50">
                <button 
                  type="submit" 
                  form="edit-order-form"
                  className="w-full py-4 bg-[#1a1c2e] text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 hover:translate-y-[-2px] active:translate-y-[0] transition-all"
                >
                  <Save size={18} /> Update Order Information
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {selectedOrders.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-4 right-4 z-[150] bg-brand-charcoal text-white rounded-[2rem] p-4 shadow-2xl flex items-center justify-between border border-white/10"
          >
            <div className="flex items-center gap-4 px-4 border-r border-white/10">
              <span className="text-[10px] font-black uppercase tracking-widest">{selectedOrders.length} Selected</span>
              <button 
                onClick={() => setSelectedOrders([])}
                className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-500/10 px-3 py-1 rounded-lg transition-all"
              >
                Cancel
              </button>
            </div>
            
            <div className="flex-1 flex items-center justify-center gap-4 relative">
              <div className="relative">
                <button 
                  onClick={() => setIsBulkStatusMenuOpen(!isBulkStatusMenuOpen)}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/5 transition-all"
                >
                  Update Status <ChevronDown size={14} className={`transition-transform duration-300 ${isBulkStatusMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isBulkStatusMenuOpen && (
                    <>
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-10"
                        onClick={() => setIsBulkStatusMenuOpen(false)}
                      />
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-4 left-0 w-48 bg-[#1a1c2e] rounded-2xl shadow-2xl border border-white/10 overflow-hidden z-[200]"
                      >
                        {['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(s => (
                          <button
                            key={s}
                            onClick={() => handleBulkStatusUpdate(s)}
                            className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                          >
                            {s}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <button className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/30 transition-all">
                <Send size={14} /> Send to Steadfast
              </button>

              <button 
                onClick={() => setIsBulkDeleteConfirmOpen(true)}
                className="p-3 text-rose-500 bg-rose-500/10 rounded-xl hover:bg-rose-500 hover:text-white transition-all ml-2"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Cash Memo Modal */}
      <CashMemoModal 
        isOpen={isCashMemoOpen} 
        onClose={() => setIsCashMemoOpen(false)} 
      />

      {/* Welcome Gift Modal */}
      <AnimatePresence>
        {isWelcomeGiftOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsWelcomeGiftOpen(false)}
              className="absolute inset-0 bg-[#0f111a]/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 30 }}
              className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-8 text-center">
                <button 
                  onClick={() => setIsWelcomeGiftOpen(false)}
                  className="absolute top-6 right-6 p-2 bg-gray-50 text-gray-400 hover:text-rose-500 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>

                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Gift size={32} />
                </div>

                <h2 className="text-xl font-black text-[#1a1c2e] mb-2">Customer Welcome Gift</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed mb-8">
                  সেরা ফ্যাশন হাউসের পক্ষ থেকে কাস্টমারের জন্য বিশেষ গিফট কার্ড
                </p>

                {/* Card Preview */}
                <div 
                  ref={giftPrintRef} 
                  className="relative w-full aspect-[3.4/4] bg-[#0c0d15] rounded-[2.5rem] overflow-hidden mb-8 shadow-2xl flex flex-col items-stretch border border-white/5"
                  style={{ width: '400px', margin: '0 auto', background: '#0b0c13' }}
                >
                  {/* Luxury Background Accents */}
                  <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-rose-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-rose-600/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2" />
                  
                  {/* Grain/Texture layer */}
                  <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                    style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} 
                  />
                  
                  {/* Decorative Border */}
                  <div className="absolute inset-4 border border-white/5 rounded-[1.8rem] pointer-events-none" />

                  {/* Top Section */}
                  <div className="pt-14 px-12 pb-10 flex justify-between items-start z-10">
                    <div className="text-left">
                      <h3 className="text-3xl font-serif font-bold tracking-tight text-white leading-none">
                        Sera Fashion <span className="text-rose-600 italic">House</span>
                      </h3>
                      <p className="text-[9px] font-black tracking-[0.6em] uppercase text-gray-500 mt-4">
                        COUTURE & EXCELLENCE
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Since 2024</span>
                      <div className="w-10 h-[1px] bg-rose-600/30" />
                    </div>
                  </div>

                  {/* Middle Section */}
                  <div className="flex-1 flex flex-col items-center justify-center text-white px-12 z-10 relative">
                    <div className="w-14 h-[1px] bg-rose-600 mb-10 opacity-50" />
                    
                    <div className="text-center mb-8">
                      <h4 className="text-[3rem] font-serif font-black tracking-tight uppercase leading-[1] text-white/90">
                        WELCOME
                      </h4>
                      <h4 className="text-[3rem] font-serif font-black tracking-tight uppercase leading-[1] mt-1">
                        TO THE <span className="text-rose-600">FAMILY</span>
                      </h4>
                    </div>

                    {giftCustomerName && (
                      <div className="relative mb-8 text-center">
                        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-4 h-4 text-rose-600/20">
                          <Quote size={16} fill="currentColor" />
                        </div>
                        <p className="text-2xl font-serif italic text-rose-500 font-bold tracking-tight px-4">
                          {giftCustomerName}
                        </p>
                        <div className="w-12 h-[1px] bg-rose-900/30 mx-auto mt-2" />
                      </div>
                    )}
                    
                    <p className="text-[12px] font-medium text-gray-400 leading-[1.8] text-center italic max-w-[280px] mb-12">
                      "Your style is our passion. We are honored to have you as a part of our exclusive journey."
                    </p>

                    <div className="flex items-center gap-8 w-full justify-center">
                      <div className="w-12 h-[0.5px] bg-white/10" />
                      <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-sm shadow-inner group">
                        <Heart size={20} className="text-rose-600 fill-rose-600/20 group-hover:fill-rose-600 transition-all duration-500" />
                      </div>
                      <div className="w-12 h-[0.5px] bg-white/10" />
                    </div>
                  </div>

                  {/* Bottom Section */}
                  <div className="px-12 py-12 flex justify-between items-end z-10">
                    <div className="text-left space-y-1">
                      <p className="text-[9px] font-black text-rose-600 uppercase tracking-[0.3em]">TIER STATUS</p>
                      <h5 className="text-xl font-serif font-bold text-white uppercase tracking-tight">PREMIUM MEMBER</h5>
                      <p className="text-[8px] font-serif italic text-gray-600">ID: SFH-2024-{Math.floor(Math.random() * 9000) + 1000}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <p className="text-3xl font-serif italic text-rose-600 leading-none mb-3">Sera Fashion</p>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-[0.5px] bg-gray-800" />
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-[0.4em]">INVITATION</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="text-left space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-4">Customer Name (Optional)</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input 
                        type="text" 
                        placeholder="Type customer name here..."
                        value={giftCustomerName}
                        onChange={(e) => setGiftCustomerName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-500/20 transition-all"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={() => downloadAsPng(giftPrintRef, `WELCOME-GIFT-${giftCustomerName || 'CUSTOMER'}`, '#0f111a')}
                    className="w-full py-4 bg-[#1a1c2e] text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 hover:translate-y-[-2px] active:translate-y-[0] transition-all"
                  >
                    <Download size={18} /> Download Premium Welcome Card
                  </button>

                  <p className="text-[9px] font-medium text-gray-400 italic">
                    "Professional Tip: Send this high-quality card to your customer's WhatsApp or Messenger to build lasting brand loyalty."
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden container for print ref integration */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px' }}>
        <div ref={invoiceDownloadRef}>
          {printingOrder && <DigitalInvoice order={printingOrder} />}
        </div>
      </div>
    </div>
  );
}
