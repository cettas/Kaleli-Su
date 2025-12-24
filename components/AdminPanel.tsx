import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, Courier, Customer, InventoryItem, Category, OrderSource } from '../types';
import { STATUS_COLORS, SOURCE_STYLES } from '../constants';
import CourierManagement from './CourierManagement';
import CustomerManagement from './CustomerManagement';
import StockManagement from './StockManagement';
import IntegrationsManagement from './IntegrationsManagement';
import IntegrationStatsWidget from './IntegrationStatsWidget';
import { supabase } from '../services/supabaseClient';

interface AdminPanelProps {
  orders: Order[];
  couriers: Courier[];
  customers: Customer[];
  inventory: InventoryItem[];
  categories: Category[];
  onUpdateCouriers: (couriers: Courier[]) => void;
  onUpdateCustomers: (customers: Customer[]) => void;
  onUpdateInventory: (inventory: InventoryItem[]) => void;
  onUpdateCategories: (categories: Category[]) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateOrderCourier: (orderId: string, courierId: string) => void;
}

type TimeFilter = 'daily' | 'weekly' | 'monthly' | 'custom' | 'all';

const AdminPanel: React.FC<AdminPanelProps> = ({
  orders, couriers, customers, inventory, categories,
  onUpdateCouriers, onUpdateCustomers, onUpdateInventory, onUpdateCategories,
  updateOrderStatus, updateOrderCourier
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'customers' | 'couriers' | 'inventory' | 'integrations'>('dashboard');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modal States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const filteredOrdersByTime = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneWeekAgo = now.getTime() - (7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);

    return orders.filter(o => {
      const orderTime = new Date(o.createdAt).getTime();

      if (timeFilter === 'daily') return orderTime >= startOfToday;
      if (timeFilter === 'weekly') return orderTime >= oneWeekAgo;
      if (timeFilter === 'monthly') return orderTime >= oneMonthAgo;
      if (timeFilter === 'custom') {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        return orderTime >= s.getTime() && orderTime <= e.getTime();
      }
      return true;
    });
  }, [orders, timeFilter, startDate, endDate]);

  const stats = useMemo(() => {
    const delivered = filteredOrdersByTime.filter(o => o.status === OrderStatus.DELIVERED);
    const pending = filteredOrdersByTime.filter(o => o.status === OrderStatus.PENDING);
    const onWay = filteredOrdersByTime.filter(o => o.status === OrderStatus.ON_WAY);
    const cancelled = filteredOrdersByTime.filter(o => o.status === OrderStatus.CANCELLED);

    const totalRevenue = delivered.reduce((sum, o) => sum + o.totalAmount, 0);

    let totalCost = 0;
    delivered.forEach(order => {
      order.items.forEach(item => {
        const invItem = inventory.find(i => i.id === item.productId || i.name === item.productName);
        if (invItem) totalCost += (invItem.costPrice * item.quantity);
      });
    });

    const netProfit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    const courierPerformance = couriers.map(c => {
      const cOrders = delivered.filter(o => o.courierId === c.id);
      const revenue = cOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      return {
        id: c.id,
        name: c.name,
        count: cOrders.length,
        revenue
      };
    }).sort((a, b) => b.revenue - a.revenue);

    const regionMap: Record<string, number> = {};
    filteredOrdersByTime.forEach(o => {
      const parts = o.address.split(',');
      const neighborhood = parts[1]?.trim() || 'Merkez';
      regionMap[neighborhood] = (regionMap[neighborhood] || 0) + 1;
    });

    const topRegions = Object.entries(regionMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const catMap: Record<string, number> = {};
    delivered.forEach(o => {
      o.items.forEach(item => {
        const inv = inventory.find(i => i.id === item.productId);
        const catId = inv?.category || 'diger';
        const catLabel = categories.find(c => c.id === catId)?.label || 'DİĞER';
        catMap[catLabel] = (catMap[catLabel] || 0) + (item.price * item.quantity);
      });
    });

    // Kaynak bazlı istatistikler
    const sourceStats = Object.values(OrderSource).map(source => {
      const sourceOrders = filteredOrdersByTime.filter(o => o.source === source);
      const sourceDelivered = sourceOrders.filter(o => o.status === OrderStatus.DELIVERED);
      const sourceRevenue = sourceDelivered.reduce((sum, o) => sum + o.totalAmount, 0);
      return {
        source,
        count: sourceOrders.length,
        deliveredCount: sourceDelivered.length,
        revenue: sourceRevenue
      };
    }).sort((a, b) => b.count - a.count);

    return {
      totalRevenue,
      netProfit,
      margin,
      deliveredCount: delivered.length,
      pendingCount: pending.length,
      onWayCount: onWay.length,
      cancelledCount: cancelled.length,
      totalCount: filteredOrdersByTime.length,
      courierPerformance,
      topRegions,
      catMap,
      sourceStats
    };
  }, [filteredOrdersByTime, couriers, inventory, categories]);

  return (
    <div className="h-full bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 overflow-hidden flex">
      {/* Sol Sidebar */}
      <aside className={`
        ${sidebarCollapsed ? 'w-20' : 'w-72'}
        bg-gradient-to-b from-slate-900 to-slate-950
        flex flex-col items-center lg:items-stretch py-4 lg:py-6 px-2 lg:px-4
        shrink-0 z-30 shadow-2xl transition-all duration-300
      `}>
        {/* Logo Alanı */}
        <div className="flex items-center justify-center lg:justify-start gap-3 mb-6 lg:px-2">
          <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-lg lg:text-xl shadow-xl shadow-indigo-600/30 shrink-0 border border-indigo-400/30 relative overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            <i className="fas fa-chart-line relative z-10"></i>
          </div>
          {!sidebarCollapsed && (
            <div className="hidden lg:block">
              <h2 className="text-sm font-black tracking-tight leading-none uppercase text-white">KALELİ SU</h2>
              <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.25em] mt-1.5">YÖNETİM PANELİ</p>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex absolute -right-3 top-24 w-6 h-6 bg-indigo-600 hover:bg-indigo-700 rounded-full items-center justify-center text-white shadow-lg transition-all"
        >
          <i className={`fas fa-chevron-${sidebarCollapsed ? 'right' : 'left'} text-xs`}></i>
        </button>

        {/* Navigasyon */}
        <nav className="flex-1 flex flex-col gap-1.5 w-full overflow-y-auto scrollbar-hide">
          {!sidebarCollapsed && (
            <p className="hidden lg:block text-[9px] font-black text-slate-600 uppercase tracking-[0.35em] px-4 mb-2">ANA MENÜ</p>
          )}
          {[
            { id: 'dashboard', label: 'Dashboard', icon: 'gauge-high', short: 'DASH', badge: null },
            { id: 'orders', label: 'Siparişler', icon: 'cart-shopping', short: 'SİP', badge: orders.filter(o => o.status === OrderStatus.PENDING).length || null },
            { id: 'customers', label: 'Müşteriler', icon: 'users', short: 'MÜŞ', badge: null },
            { id: 'couriers', label: 'Kurye Filosu', icon: 'truck-fast', short: 'FİLO', badge: couriers.filter(c => c.status === 'active').length || null },
            { id: 'inventory', label: 'Envanter', icon: 'box-open', short: 'ENV', badge: inventory.filter(i => i.isActive).length || null },
            { id: 'integrations', label: 'Entegrasyonlar', icon: 'plug', short: 'ENT', badge: null }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`relative group flex items-center justify-center lg:justify-start gap-3 px-2 lg:px-4 py-3 rounded-xl transition-all duration-200 ${
                activeTab === tab.id
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-xl shadow-indigo-600/30'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                activeTab === tab.id
                ? 'bg-white/20'
                : 'bg-slate-800/50 group-hover:bg-slate-700/50'
              }`}>
                <i className={`fas fa-${tab.icon} ${activeTab === tab.id ? 'text-white' : 'text-slate-400 group-hover:text-white'} text-sm`}></i>
              </div>
              {!sidebarCollapsed && (
                <span className="hidden lg:block text-[11px] font-black uppercase tracking-wider flex-1 text-left">{tab.label}</span>
              )}
              {tab.badge !== null && tab.badge > 0 && (
                <span className={`hidden lg:flex ${sidebarCollapsed ? 'absolute -top-1 -right-1' : ''} w-5 h-5 bg-rose-500 rounded-full text-white text-[9px] font-black items-center justify-center`}>
                  {tab.badge}
                </span>
              )}
              {/* Mobile Icon Label */}
              {sidebarCollapsed && (
                <span className="lg:hidden text-[8px] font-black uppercase">{tab.short}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Alt Bilgi - Desktop */}
        {!sidebarCollapsed && (
          <div className="hidden lg:block mt-auto">
            <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center">
                  <i className="fas fa-headset text-white text-xs"></i>
                </div>
                <div>
                  <p className="text-[10px] font-black text-white uppercase">Destek</p>
                  <p className="text-[8px] text-indigo-300">7/24 Hizmet</p>
                </div>
              </div>
              <p className="text-[9px] text-indigo-200 font-bold leading-relaxed">Sorun mu yaşıyorsunuz? Teknik destek ekibimiz her zaman yanınızda.</p>
            </div>
          </div>
        )}
      </aside>

      {/* Sağ İçerik Alanı */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 lg:px-8 py-4 flex items-center justify-between gap-4 shrink-0 shadow-sm z-20">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="lg:hidden w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600"
            >
              <i className="fas fa-bars"></i>
            </button>
            <div>
              <h1 className="text-lg lg:text-xl font-black text-slate-900 tracking-tight uppercase">
                {
                  activeTab === 'dashboard' ? 'GÖSTERGE PANELİ' :
                  activeTab === 'orders' ? 'SİPARİŞ YÖNETİMİ' :
                  activeTab === 'customers' ? 'MÜŞTERİ İLİŞKİLERİ' :
                  activeTab === 'couriers' ? 'KURYE FİLO YÖNETİMİ' :
                  activeTab === 'inventory' ? 'STOK VE ENVANTER' :
                  'SİSTEM ENTEGRASYONLARI'
                }
              </h1>
              <p className="text-[10px] lg:text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${activeTab === 'dashboard' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                {activeTab === 'dashboard' ? 'CANLI VERİ AKIŞI' : 'YÖNETİM MODÜLÜ'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Stats */}
            <div className="hidden md:flex items-center gap-4 bg-slate-50 rounded-2xl px-4 py-2 border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-[10px] font-black text-slate-600">{stats.pendingCount} Bekle</span>
              </div>
              <div className="w-px h-4 bg-slate-200"></div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                <span className="text-[10px] font-black text-slate-600">{stats.onWayCount} Yolda</span>
              </div>
              <div className="w-px h-4 bg-slate-200"></div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-[10px] font-black text-slate-600">{stats.deliveredCount} Teslim</span>
              </div>
            </div>

            {/* Kullanıcı Profil */}
            <div className="flex items-center gap-3 bg-slate-50 rounded-2xl px-4 py-2.5 border border-slate-200">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg shadow-indigo-500/20">
                AD
              </div>
              <div className="hidden sm:block">
                <p className="text-[11px] font-black text-slate-900 uppercase">Admin</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Sistem Yöneticisi</p>
              </div>
            </div>
          </div>
        </header>

        {/* İçerik Alanı */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50/50">
          <div className="max-w-[1600px] mx-auto">

          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Filtreler ve Hızlı Durum */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 items-stretch">
                <div className="xl:col-span-2 flex flex-col md:flex-row items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">FİLTRELE:</span>
                    {['daily', 'weekly', 'monthly', 'all', 'custom'].map(f => (
                      <button
                        key={f}
                        onClick={() => setTimeFilter(f as TimeFilter)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border ${
                          timeFilter === f ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {f === 'daily' ? 'BUGÜN' : f === 'weekly' ? 'BU HAFTA' : f === 'monthly' ? 'BU AY' : f === 'custom' ? 'ÖZEL' : 'TÜMÜ'}
                      </button>
                    ))}
                  </div>

                  {timeFilter === 'custom' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-200 animate-in slide-in-from-right-2">
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="bg-transparent text-[10px] font-black text-slate-600 outline-none uppercase"
                      />
                      <span className="text-slate-300 font-bold">-</span>
                      <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="bg-transparent text-[10px] font-black text-slate-600 outline-none uppercase"
                      />
                    </div>
                  )}
                </div>
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-4 rounded-2xl flex justify-around items-center shadow-lg">
                  <div className="text-center">
                    <p className="text-[8px] font-black text-amber-400 uppercase">Bekleyen</p>
                    <p className="text-xl font-black text-white">{stats.pendingCount}</p>
                  </div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div className="text-center">
                    <p className="text-[8px] font-black text-indigo-400 uppercase">Yolda</p>
                    <p className="text-xl font-black text-white">{stats.onWayCount}</p>
                  </div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div className="text-center">
                    <p className="text-[8px] font-black text-emerald-400 uppercase">Biten</p>
                    <p className="text-xl font-black text-white">{stats.deliveredCount}</p>
                  </div>
                </div>
              </div>

              {/* Ana KPI Kartları */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'TOPLAM GELİR', value: `${stats.totalRevenue.toLocaleString()}₺`, sub: 'Net Satış', icon: 'sack-dollar', color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'NET KAR', value: `${stats.netProfit.toLocaleString()}₺`, sub: `%${stats.margin.toFixed(1)} Marj`, icon: 'chart-line', color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50' },
                  { label: 'MEMNUNİYET', value: `%${(100 - (stats.cancelledCount / (stats.totalCount || 1)) * 100).toFixed(0)}`, sub: `${stats.totalCount} Talep`, icon: 'face-smile', color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50' },
                  { label: 'İPTAL', value: stats.cancelledCount, sub: `%${((stats.cancelledCount / (stats.totalCount || 1)) * 100).toFixed(1)} Oran`, icon: 'triangle-exclamation', color: 'from-rose-500 to-rose-600', bg: 'bg-rose-50' }
                ].map((kpi, idx) => (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kpi.color} flex items-center justify-center shadow-lg`}>
                        <i className={`fas fa-${kpi.icon} text-white text-sm`}></i>
                      </div>
                      <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                        <i className={`fas fa-arrow-trend-up text-[10px] ${kpi.color.split(' ')[0].replace('from-', 'text-')}`}></i>
                      </div>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{kpi.value}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight mt-1">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              {/* Alt Analiz Panelleri */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* Kurye Performansı */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-trophy text-amber-500"></i>
                      Kurye Liderlik
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {stats.courierPerformance.slice(0, 5).map((c, i) => (
                      <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:bg-indigo-600 hover:border-indigo-600 transition-all duration-300">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black ${
                            i === 0 ? 'bg-amber-500 text-white' :
                            i === 1 ? 'bg-slate-400 text-white' :
                            i === 2 ? 'bg-amber-700 text-white' :
                            'bg-slate-200 text-slate-500 group-hover:bg-white/20 group-hover:text-white/50'
                          }`}>#{i+1}</span>
                          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-black text-indigo-600 shadow-sm group-hover:bg-white/20 group-hover:text-white">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-slate-900 group-hover:text-white uppercase truncate max-w-[100px]">{c.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 group-hover:text-white/70 uppercase">{c.count} Teslimat</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900 group-hover:text-white">{c.revenue}₺</p>
                        </div>
                      </div>
                    ))}
                    {stats.courierPerformance.length === 0 && <p className="text-center text-[10px] font-bold text-slate-400 py-8 uppercase tracking-widest">Veri bulunamadı</p>}
                  </div>
                </div>

                {/* Entegrasyon İstatistikleri Widget'ı */}
                <IntegrationStatsWidget />

                {/* Bölgesel Yoğunluk */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-map-location-dot text-indigo-500"></i>
                      Bölgesel Yoğunluk
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {stats.topRegions.slice(0, 5).map(([neighborhood, count], i) => {
                      const percentage = Math.min(100, (count / (stats.totalCount || 1)) * 100);
                      return (
                        <div key={neighborhood} className="space-y-1.5">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{neighborhood}</span>
                            <span className="text-[10px] font-black text-indigo-600">{count}</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                    {stats.topRegions.length === 0 && <p className="text-center text-[10px] font-bold text-slate-400 py-8 uppercase tracking-widest">Henüz veri yok</p>}
                  </div>
                </div>

                {/* Kategori Bazlı Satış */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-chart-pie text-emerald-500"></i>
                      Kategori Payı
                    </h4>
                  </div>
                  <div className="space-y-2">
                    {Object.entries(stats.catMap).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, amount]) => (
                      <div key={cat} className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between group hover:bg-indigo-50 hover:border-indigo-200 transition-all">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                          <span className="text-[10px] font-black text-slate-700 uppercase">{cat}</span>
                        </div>
                        <span className="text-xs font-black text-slate-900">{amount.toLocaleString()}₺</span>
                      </div>
                    ))}
                    {Object.keys(stats.catMap).length === 0 && <p className="text-center text-[10px] font-bold text-slate-400 py-8 uppercase tracking-widest">Satış verisi yok</p>}
                  </div>
                </div>

                {/* Kaynak Bazlı Raporlama */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4 lg:col-span-2">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <i className="fas fa-store text-purple-500"></i>
                      Pazaryeri Analizi
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {stats.sourceStats.map((stat) => {
                      const style = SOURCE_STYLES[stat.source] || SOURCE_STYLES[OrderSource.PHONE];
                      const percentage = stats.totalCount > 0 ? (stat.count / stats.totalCount) * 100 : 0;
                      const deliveryRate = stat.count > 0 ? (stat.deliveredCount / stat.count) * 100 : 0;
                      return (
                        <div key={stat.source} className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-2 group hover:bg-white hover:shadow-md transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center`}>
                                <i className={`fas ${style.icon} text-white text-xs`}></i>
                              </div>
                              <div>
                                <p className="text-[10px] font-black text-slate-900 uppercase">{stat.source}</p>
                                <p className="text-[8px] font-bold text-slate-400">{stat.count} Sipariş</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-black text-slate-900">{stat.revenue}₺</p>
                              <p className="text-[8px] font-bold text-indigo-600">%{percentage.toFixed(1)} Pay</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500" style={{ width: `${deliveryRate}%` }}></div>
                            </div>
                            <span className="text-[8px] font-black text-slate-400 whitespace-nowrap">{stat.deliveredCount}/{stat.count} Teslim</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4 animate-in fade-in duration-500">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 uppercase">Tüm Siparişler</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{orders.length} Sipariş</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4 py-3">Sipariş No</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4 py-3">Müşteri</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4 py-3">Tutar</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4 py-3">Durum</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4 py-3">Kurye</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4 py-3">Kaynak</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-4 py-3">Tarih</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-4 py-3">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 50).map((order) => (
                        <tr key={order.id} className="border-b border-slate-100 hover:bg-indigo-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-[11px] font-black text-slate-900 font-mono">#{order.id.slice(-8)}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-[11px] font-bold text-slate-700">{order.customerName}</p>
                            <p className="text-[9px] text-slate-400">{order.phone}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-black text-indigo-600">{order.totalAmount}₺</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${STATUS_COLORS[order.status]}`}>
                              {order.status === 'Bekliyor' ? '⏱' : order.status === 'Yolda' ? '🚚' : order.status === 'Teslim Edildi' ? '✅' : '❌'} {order.status}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-[11px] font-bold text-slate-700">{order.courierName || '-'}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase text-white ${SOURCE_STYLES[order.source]?.bg || 'bg-slate-600'}`}>
                              <i className={`fas ${SOURCE_STYLES[order.source]?.icon} mr-1 text-[8px]`}></i>
                              {order.source === 'Web/Müşteri' ? 'WEB' : order.source}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-[10px] font-bold text-slate-500">{new Date(order.createdAt).toLocaleDateString('tr-TR')}</p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-lg transition-all"
                            >
                              DETAY
                            </button>
                          </td>
                        </tr>
                      ))}
                      {orders.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center">
                            <p className="text-sm font-bold text-slate-400">Henüz sipariş yok</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <CustomerManagement customers={customers} orders={orders} onUpdateCustomers={onUpdateCustomers} />
          )}

          {activeTab === 'couriers' && (
            <CourierManagement couriers={couriers} orders={orders} onUpdateCouriers={onUpdateCouriers} />
          )}

          {activeTab === 'inventory' && (
            <StockManagement inventory={inventory} onUpdateInventory={onUpdateInventory} categories={categories} onUpdateCategories={onUpdateCategories} />
          )}

          {activeTab === 'integrations' && (
            <IntegrationsManagement />
          )}
        </div>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase">Sipariş Detayı</h3>
                  <p className="text-[10px] font-bold text-slate-400 font-mono">#{selectedOrder.id.slice(-8)}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Durum Değiştirme */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sipariş Durumu</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Bekliyor', 'Yolda', 'Teslim Edildi', 'İptal'].map((status) => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(selectedOrder.id, status as OrderStatus)}
                        className={`px-3 py-2 rounded-lg text-[11px] font-black uppercase transition-all ${
                          selectedOrder.status === status
                            ? STATUS_COLORS[status as OrderStatus]
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {status === 'Bekliyor' ? '⏱' : status === 'Yolda' ? '🚚' : status === 'Teslim Edildi' ? '✅' : '❌'} {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kurye Atama */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Kurye Atama</h4>
                  <select
                    value={selectedOrder.courierId || ''}
                    onChange={(e) => updateOrderCourier(selectedOrder.id, e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black outline-none focus:border-indigo-500"
                  >
                    <option value="">Kurye Yok</option>
                    {couriers.map((courier) => (
                      <option key={courier.id} value={courier.id}>
                        {courier.name} {courier.status === 'active' ? '✓' : courier.status === 'busy' ? '⏳' : '✗'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Müşteri ve Tutar */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Müşteri Bilgileri</h4>
                  <p className="text-sm font-bold text-slate-900">{selectedOrder.customerName}</p>
                  <a href={`tel:${selectedOrder.phone}`} className="text-xs text-indigo-600 font-bold hover:underline">{selectedOrder.phone}</a>
                  <p className="text-[11px] text-slate-500 mt-2 leading-snug">{selectedOrder.address}</p>
                </div>
                <div className="bg-slate-900 rounded-2xl p-4 text-white">
                  <h4 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-3">Sipariş Tutarı</h4>
                  <p className="text-3xl font-black">{selectedOrder.totalAmount}₺</p>
                  <p className="text-[10px] text-indigo-300 uppercase mt-2">{selectedOrder.items.length} Ürün</p>
                </div>
              </div>

              {/* Sipariş Ürünleri */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sipariş Ürünleri</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                      <div className="flex items-center gap-3">
                        <span className="bg-indigo-600 text-white w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-black">{item.quantity}</span>
                        <p className="text-sm font-bold text-slate-900">{item.productName}</p>
                      </div>
                      <p className="text-sm font-black text-indigo-600">{(item.quantity * item.price).toFixed(2)}₺</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Not */}
              {selectedOrder.note && (
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
                  <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Sipariş Notu</h4>
                  <p className="text-sm text-amber-900 italic">"{selectedOrder.note}"</p>
                </div>
              )}

              {/* Kaynak */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase">Kaynak:</span>
                  <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase text-white ${SOURCE_STYLES[selectedOrder.source]?.bg || 'bg-slate-600'}`}>
                    <i className={`fas ${SOURCE_STYLES[selectedOrder.source]?.icon} mr-1`}></i>
                    {selectedOrder.source}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {new Date(selectedOrder.createdAt).toLocaleString('tr-TR')}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
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

export default AdminPanel;
