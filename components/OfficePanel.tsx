import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Order, OrderStatus, Customer, InventoryItem, Courier, OrderSource, PaymentMethod } from '../types';
import OrderForm from './OrderForm';
import { STATUS_COLORS, SOURCE_STYLES } from '../constants';

interface OfficePanelProps {
  orders: Order[];
  customers: Customer[];
  couriers: Courier[];
  stock: InventoryItem[];
  addOrder: (order: Order, customerData: Customer) => void;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  updateOrderCourier: (orderId: string, courierId: string) => void;
}

const OfficePanel: React.FC<OfficePanelProps> = ({ orders, customers, couriers, stock, addOrder, updateOrderStatus, updateOrderCourier }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [hoveredOrderId, setHoveredOrderId] = useState<string | null>(null);
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Yeni siparişleri algıla ve animasyonla göster
  useEffect(() => {
    const now = Date.now();
    const recent = orders
      .filter(o => now - new Date(o.createdAt).getTime() < 5000)
      .map(o => o.id);

    setNewOrderIds(new Set(recent));

    // 5 saniye sonra yeni işaretini kaldır
    const timer = setTimeout(() => {
      setNewOrderIds(new Set());
    }, 5000);

    return () => clearTimeout(timer);
  }, [orders]);

  // Klavye kısayolları
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K = Arama focus
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // ESC = Modalı kapat
      if (e.key === 'Escape') {
        setSelectedOrder(null);
        setIsMobileFormOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Tüm ürünleri göster
  const activeStock = stock;

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            o.phone.includes(searchTerm) ||
                            o.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = activeFilter === 'ALL' || o.status === activeFilter;
      const matchesSource = sourceFilter === 'ALL' || o.source === sourceFilter;
      return matchesSearch && matchesFilter && matchesSource;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, searchTerm, activeFilter, sourceFilter]);

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dk önce`;

    return date.toLocaleDateString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // İstatistikler
  const stats = useMemo(() => {
    const pending = orders.filter(o => o.status === OrderStatus.PENDING).length;
    const onWay = orders.filter(o => o.status === OrderStatus.ON_WAY).length;
    const delivered = orders.filter(o => o.status === OrderStatus.DELIVERED).length;
    const todayRevenue = orders
      .filter(o => o.status === OrderStatus.DELIVERED && new Date(o.updatedAt).toDateString() === new Date().toDateString())
      .reduce((sum, o) => sum + o.totalAmount, 0);
    return { pending, onWay, delivered, todayRevenue };
  }, [orders]);

  // Gerçek zamanlı siparişleri (son 5 dakika içinde gelen)
  const liveOrders = useMemo(() => {
    const now = new Date();
    return orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      const diffMs = now.getTime() - orderDate.getTime();
      const diffMins = diffMs / 60000;
      return diffMins <= 5 && o.status === OrderStatus.PENDING;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders]);

  return (
    <div className="flex flex-col lg:flex-row h-full bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 overflow-hidden relative">
      <div className="lg:hidden p-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-[60] shrink-0">
        <button
          onClick={() => setIsMobileFormOpen(true)}
          className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 active:scale-95 transition-all"
        >
          <i className="fas fa-plus-circle text-lg"></i>
          YENİ SİPARİŞ GİRİŞİ
        </button>
      </div>

      <aside className={`
        ${isMobileFormOpen ? 'fixed inset-0 z-[200] flex flex-col bg-white' : 'hidden'}
        lg:static lg:block lg:w-[480px] lg:shrink-0 lg:bg-white lg:border-r lg:border-slate-200/50 lg:overflow-y-auto lg:z-10 shadow-2xl lg:shadow-none
      `}>
        <div className="lg:hidden p-5 flex justify-between items-center border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">SİPARİŞ KAYIT</h2>
          <button onClick={() => setIsMobileFormOpen(false)} className="w-10 h-10 rounded-xl bg-white text-rose-500 shadow-sm border border-slate-200 flex items-center justify-center hover:bg-rose-50 transition-all">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 pb-20 lg:pb-6">
          <section>
            <div className="hidden lg:flex flex-col mb-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <i className="fas fa-bolt text-white"></i>
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Hızlı Sipariş</h2>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Yeni Kayıt Oluştur</p>
                </div>
              </div>
              <div className="h-1 w-16 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
            </div>
            <OrderForm
              onAddOrder={(o, c) => {
                addOrder(o, c);
                setIsMobileFormOpen(false);
              }}
              customers={customers}
              couriers={couriers}
              inventory={activeStock}
              orders={orders}
            />
          </section>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <header className="px-4 lg:px-6 py-4 bg-white/90 backdrop-blur-xl border-b border-slate-200/50 shrink-0 z-10">
          <div className="flex flex-col gap-4">
            {/* Top Row: Title, Search, Actions */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <i className="fas fa-chart-line text-white"></i>
                </div>
                <div>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-none">OFİS PANELİ</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-100 rounded-lg">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                      <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Canlı</span>
                    </span>
                    <span className="text-[10px] font-black text-slate-400">{filteredOrders.length} sipariş</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden md:block relative w-64">
                  <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                  <kbd className="hidden sm:absolute sm:right-3 sm:top-1/2 sm:-translate-y-1/2 px-1.5 py-0.5 bg-slate-100 text-slate-400 text-[9px] font-bold rounded border border-slate-200">
                    ⌘K
                  </kbd>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Müşteri, tel, adres ara..."
                    className="w-full pl-9 pr-16 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {/* Mobile Search */}
                <div className="md:hidden relative flex-1">
                  <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Ara..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all shadow-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Row: Filters */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
              {/* Status Filters */}
              <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/50 shrink-0">
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    activeFilter === 'ALL'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  Tümü
                </button>
                {Object.values(OrderStatus).map(status => {
                  const count = orders.filter(o => o.status === status).length;
                  const isActive = activeFilter === status;
                  const statusColors = {
                    'Bekliyor': isActive ? 'bg-amber-500 text-white' : 'text-amber-600 hover:bg-amber-50',
                    'Yolda': isActive ? 'bg-indigo-500 text-white' : 'text-indigo-600 hover:bg-indigo-50',
                    'Teslim Edildi': isActive ? 'bg-emerald-500 text-white' : 'text-emerald-600 hover:bg-emerald-50',
                    'İptal': isActive ? 'bg-rose-500 text-white' : 'text-rose-600 hover:bg-rose-50',
                  };
                  return (
                    <button
                      key={status}
                      onClick={() => setActiveFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        isActive ? 'shadow-sm' : ''
                      } ${statusColors[status as keyof typeof statusColors] || ''}`}
                    >
                      {status === 'Bekliyor' && '⏱'}
                      {status === 'Yolda' && '🚚'}
                      {status === 'Teslim Edildi' && '✅'}
                      {status === 'İptal' && '❌'}
                      {status}
                      {count > 0 && <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${isActive ? 'bg-white/20' : 'bg-slate-200 text-slate-600'}`}>{count}</span>}
                    </button>
                  );
                })}
              </div>

              <div className="w-px h-8 bg-slate-200 shrink-0"></div>

              {/* Source Filters */}
              <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/50 shrink-0">
                <button
                  onClick={() => setSourceFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                    sourceFilter === 'ALL'
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  Tüm Kaynaklar
                </button>
                {Object.values(OrderSource).map(source => {
                  const style = SOURCE_STYLES[source] || SOURCE_STYLES[OrderSource.PHONE];
                  const isActive = sourceFilter === source;
                  return (
                    <button
                      key={source}
                      onClick={() => setSourceFilter(source)}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                      }`}
                    >
                      <i className={`fas ${style.icon} text-[8px]`}></i>
                      {source === 'Web/Müşteri' ? 'WEB' : source === 'Getir' ? '🚗' : source === 'Yemeksepeti' ? '🥘' : source === 'Trendyol' ? '📦' : source}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Stats Bar - Compact */}
        <div className="px-4 lg:px-6 py-3 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200/50 shrink-0">
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200 p-3 rounded-xl relative overflow-hidden">
              <span className="text-[9px] font-black text-amber-600 uppercase block mb-1">Bekleyen</span>
              <p className="text-xl font-black text-amber-700">{stats.pending}</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200 p-3 rounded-xl relative overflow-hidden">
              <span className="text-[9px] font-black text-indigo-600 uppercase block mb-1">Yolda</span>
              <p className="text-xl font-black text-indigo-700">{stats.onWay}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-200 p-3 rounded-xl relative overflow-hidden">
              <span className="text-[9px] font-black text-emerald-600 uppercase block mb-1">Teslim</span>
              <p className="text-xl font-black text-emerald-700">{stats.delivered}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-3 rounded-xl relative overflow-hidden">
              <span className="text-[9px] font-black text-indigo-300 uppercase tracking-widest block mb-1">Ciro</span>
              <p className="text-xl font-black text-white">{stats.todayRevenue}₺</p>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
          {/* Live Orders Alert */}
          {liveOrders.length > 0 && (
            <div className="bg-gradient-to-r from-rose-500 via-rose-600 to-orange-500 rounded-2xl p-4 shadow-xl animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center animate-pulse">
                  <i className="fas fa-bell text-white text-xl"></i>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-black text-white uppercase">{liveOrders.length} Yeni Sipariş!</h3>
                  <p className="text-xs text-rose-100">Son 5 dakikada geldi</p>
                </div>
                <button
                  onClick={() => {
                    setActiveFilter(OrderStatus.PENDING);
                    setSourceFilter('ALL');
                  }}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-white text-xs font-black uppercase transition-all"
                >
                  Görüntüle
                </button>
              </div>
            </div>
          )}

          {/* Orders Grid */}
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-4">
                <i className="fas fa-inbox text-4xl text-slate-300"></i>
              </div>
              <p className="text-sm font-black text-slate-400 uppercase">Sipariş bulunamadı</p>
              <p className="text-xs text-slate-400 mt-2">Filtreleri değiştirmeyi deneyin</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredOrders.slice(0, 100).map((order, index) => {
                const sourceStyle = SOURCE_STYLES[order.source] || SOURCE_STYLES[OrderSource.PHONE];
                const isNew = newOrderIds.has(order.id);
                const courier = couriers.find(c => c.id === order.courierId);
                const isHovered = hoveredOrderId === order.id;

                const statusConfig = {
                  'Bekliyor': { color: 'amber', icon: '⏱', bg: 'bg-amber-50', border: 'border-amber-400' },
                  'Yolda': { color: 'indigo', icon: '🚚', bg: 'bg-indigo-50', border: 'border-indigo-400' },
                  'Teslim Edildi': { color: 'emerald', icon: '✅', bg: 'bg-emerald-50', border: 'border-emerald-400' },
                  'İptal': { color: 'rose', icon: '❌', bg: 'bg-rose-50', border: 'border-rose-400' },
                }[order.status] || { color: 'slate', icon: '📦', bg: 'bg-slate-50', border: 'border-slate-300' };

                return (
                  <div
                    key={order.id}
                    className={`bg-white border-l-4 ${statusConfig.border} rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden ${isNew ? 'ring-2 ring-indigo-400 ring-offset-2 animate-in slide-in-from-top-2' : ''} ${isHovered ? 'scale-[1.01]' : ''}`}
                    onClick={() => setSelectedOrder(order)}
                    onMouseEnter={() => setHoveredOrderId(order.id)}
                    onMouseLeave={() => setHoveredOrderId(null)}
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {/* New Order Banner */}
                    {isNew && (
                      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 py-1.5 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 bg-white rounded-full animate-ping"></span>
                          <span className="text-[10px] font-black text-white uppercase tracking-wider">Yeni Sipariş</span>
                        </div>
                        <span className="text-[9px] font-black text-white/80">Şimdi</span>
                      </div>
                    )}

                    <div className="p-4">
                      {/* Top Row */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${STATUS_COLORS[order.status]}`}>
                            {statusConfig.icon} {order.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${sourceStyle.bg} ${sourceStyle.text} flex items-center gap-1`}>
                            <i className={`fas ${sourceStyle.icon} text-[8px]`}></i>
                            {order.source === 'Web/Müşteri' ? 'WEB' : order.source}
                          </span>
                          {order.paymentMethod && (
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                              order.paymentMethod === PaymentMethod.CASH ? 'bg-emerald-100 text-emerald-700' :
                              order.paymentMethod === PaymentMethod.POS ? 'bg-blue-100 text-blue-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {order.paymentMethod === PaymentMethod.CASH ? '💵' : order.paymentMethod === PaymentMethod.POS ? '💳' : '❌'}
                            </span>
                          )}
                        </div>
                        <span className="text-lg font-black text-slate-900">{order.totalAmount}₺</span>
                      </div>

                      {/* Customer Info */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${statusConfig.bg} border border-slate-200 flex items-center justify-center`}>
                            <i className="fas fa-user text-slate-500 text-sm"></i>
                          </div>
                          <div>
                            <h3 className="text-xs font-black text-slate-900 uppercase">{order.customerName}</h3>
                            <a
                              href={`tel:${order.phone}`}
                              className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <i className="fas fa-phone text-[9px]"></i>
                              {order.phone}
                            </a>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <i className="far fa-clock text-[9px]"></i>
                            <span className="text-[9px] font-bold uppercase tracking-wider">
                              {formatDateTime(order.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Address */}
                      <div className="flex items-start gap-2 mb-3">
                        <i className="fas fa-map-marker text-slate-400 text-xs mt-0.5"></i>
                        <p className="text-[11px] text-slate-600 font-medium leading-snug flex-1">{order.address}</p>
                      </div>

                      {/* Items */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {order.items.slice(0, 4).map((item, idx) => (
                          <div key={idx} className={`${statusConfig.bg} border border-slate-200/50 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5`}>
                            <span className="bg-white px-1.5 py-0.5 rounded-md text-indigo-600 text-[9px]">{item.quantity}x</span>
                            <span className="text-slate-700">{item.productName}</span>
                          </div>
                        ))}
                        {order.items.length > 4 && (
                          <div className={`${statusConfig.bg} border border-slate-200/50 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-500`}>
                            +{order.items.length - 4}
                          </div>
                        )}
                      </div>

                      {/* Bottom Actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          {courier && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 rounded-lg">
                              <i className="fas fa-motorcycle text-indigo-500 text-[10px]"></i>
                              <span className="text-[10px] font-black text-indigo-700">{courier.name}</span>
                            </div>
                          )}
                          {order.note && (
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded-lg">
                              <i className="fas fa-sticky-note text-amber-500 text-[10px]"></i>
                              <span className="text-[10px] font-black text-amber-700">Not</span>
                            </div>
                          )}
                        </div>

                        {/* Quick Actions */}
                        <div className="flex items-center gap-2">
                          <select
                            value={order.courierId || ''}
                            onChange={(e) => updateOrderCourier(order.id, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black outline-none cursor-pointer hover:border-indigo-300 transition-all"
                          >
                            <option value="">Kurye Yok</option>
                            {couriers.map(c => (
                              <option key={c.id} value={c.id}>
                                {c.name} {c.status === 'active' ? '✓' : c.status === 'busy' ? '⏳' : '✗'}
                              </option>
                            ))}
                          </select>

                          {/* Quick Status Buttons */}
                          <div className="flex gap-1">
                            {order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && (
                              <>
                                {order.status === OrderStatus.PENDING && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateOrderStatus(order.id, OrderStatus.ON_WAY);
                                    }}
                                    className="px-2 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-[10px] font-black transition-all"
                                    title="Yolda"
                                  >
                                    🚚
                                  </button>
                                )}
                                {order.status === OrderStatus.ON_WAY && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateOrderStatus(order.id, OrderStatus.DELIVERED);
                                    }}
                                    className="px-2 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-[10px] font-black transition-all"
                                    title="Teslim Edildi"
                                  >
                                    ✅
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200/50" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase">SİPARİŞ DETAYI</h3>
                  <p className="text-xs font-black text-slate-400 uppercase mt-1">#{selectedOrder.id.slice(-6)}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500 transition-all">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Customer & Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">MÜŞTERİ</span>
                  <p className="text-sm font-black text-slate-900 mt-1">{selectedOrder.customerName}</p>
                  <a href={`tel:${selectedOrder.phone}`} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1 mt-1">
                    <i className="fas fa-phone text-[9px]"></i>
                    {selectedOrder.phone}
                  </a>
                </div>
                <div className="bg-slate-900 rounded-2xl p-4 text-white">
                  <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">TUTAR</span>
                  <p className="text-2xl font-black text-white mt-1">{selectedOrder.totalAmount}₺</p>
                  {selectedOrder.paymentMethod && (
                    <span className={`inline-block px-2 py-0.5 rounded-lg text-[10px] font-black uppercase mt-1 ${
                      selectedOrder.paymentMethod === PaymentMethod.CASH ? 'bg-emerald-500/30 text-emerald-300' :
                      selectedOrder.paymentMethod === PaymentMethod.POS ? 'bg-blue-500/30 text-blue-300' :
                      'bg-rose-500/30 text-rose-300'
                    }`}>
                      {selectedOrder.paymentMethod === PaymentMethod.CASH ? '💵 NAKİT' :
                       selectedOrder.paymentMethod === PaymentMethod.POS ? '💳 POS' :
                       '❌ ALINMADI'}
                    </span>
                  )}
                </div>
              </div>

              {/* Address */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ADRES</span>
                <p className="text-xs font-bold text-slate-700 leading-relaxed mt-1">{selectedOrder.address}</p>
              </div>

              {/* Items */}
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ÜRÜNLER</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="bg-indigo-50 px-3 py-2 rounded-xl border border-indigo-100 flex items-center gap-2">
                      <span className="bg-indigo-600 text-white w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-black">{item.quantity}</span>
                      <span className="text-sm font-black text-slate-700">{item.productName}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Note */}
              {selectedOrder.note && (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <i className="fas fa-sticky-note text-amber-500"></i>
                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">NOT</span>
                  </div>
                  <p className="text-sm font-bold text-amber-900 italic">"{selectedOrder.note}"</p>
                </div>
              )}

              {/* Status & Courier */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">DURUM</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(OrderStatus).map((status) => {
                      const statusConfig = {
                        'Bekliyor': { icon: '⏱', color: 'amber' },
                        'Yolda': { icon: '🚚', color: 'indigo' },
                        'Teslim Edildi': { icon: '✅', color: 'emerald' },
                        'İptal': { icon: '❌', color: 'rose' },
                      }[status] || { icon: '📦', color: 'slate' };

                      const isActive = selectedOrder.status === status;
                      return (
                        <button
                          key={status}
                          onClick={() => updateOrderStatus(selectedOrder.id, status)}
                          className={`px-3 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all ${
                            isActive
                              ? `bg-${statusConfig.color}-600 text-white border-${statusConfig.color}-600`
                              : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-400'
                          }`}
                        >
                          {statusConfig.icon} {status}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">KURYE</h4>
                  <select
                    value={selectedOrder.courierId}
                    disabled={selectedOrder.status === OrderStatus.DELIVERED || selectedOrder.status === OrderStatus.CANCELLED}
                    onChange={(e) => updateOrderCourier(selectedOrder.id, e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none focus:border-indigo-500 disabled:opacity-50"
                  >
                    <option value="">Kurye Yok</option>
                    {couriers.map(c => {
                      const courierStatusIcon = c.status === 'active' ? '✓' : c.status === 'busy' ? '⏳' : '✗';
                      return (
                        <option key={c.id} value={c.id}>
                          {c.name} {courierStatusIcon}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Oluşturulma</span>
                  <p className="text-xs font-black text-slate-600 mt-1">{formatDateTime(selectedOrder.createdAt)}</p>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Son Güncelleme</span>
                  <p className="text-xs font-black text-slate-600 mt-1">{formatDateTime(selectedOrder.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer - Quick Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2">
              <a
                href={`tel:${selectedOrder.phone}`}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all"
              >
                <i className="fas fa-phone"></i>
                Ara
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedOrder.address);
                }}
                className="flex-1 py-3 bg-white text-slate-700 rounded-xl text-xs font-black uppercase border border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all"
              >
                <i className="fas fa-copy"></i>
                Adres Kopyala
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficePanel;
