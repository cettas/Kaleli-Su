import React, { useMemo, useState } from 'react';
import { Order, OrderStatus, Courier, Customer, InventoryItem, Category } from '../types';
import { STATUS_COLORS, SOURCE_STYLES } from '../constants';
import CourierManagement from './CourierManagement';
import CustomerManagement from './CustomerManagement';
import StockManagement from './StockManagement';
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
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'customers' | 'couriers' | 'inventory'>('dashboard');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Modal States
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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
      catMap
    };
  }, [filteredOrdersByTime, couriers, inventory, categories]);

  return (
    <div className="h-full bg-[#f8fafc] overflow-hidden flex flex-col">
      <header className="bg-[#0f172a] text-white px-4 lg:px-8 py-5 flex flex-col lg:flex-row items-center justify-between gap-4 shrink-0 shadow-2xl relative z-20">
        <div className="flex items-center gap-4 w-full lg:w-auto">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-xl shadow-xl shadow-indigo-600/20 shrink-0 border-b-4 border-indigo-800">
            <i className="fas fa-chart-line"></i>
          </div>
          <div>
            <h2 className="text-base lg:text-lg font-black tracking-tight leading-none uppercase">YÖNETİM KONTROL PANELİ</h2>
            <p className="text-[8px] lg:text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span> SİSTEM CANLI ANALİZ
            </p>
          </div>
        </div>

        <nav className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border border-white/10 w-full lg:w-auto overflow-x-auto scrollbar-hide">
          {[
            { id: 'dashboard', label: 'DASHBOARD', icon: 'grip' },
            { id: 'orders', label: 'SİPARİŞLER', icon: 'shopping-cart' },
            { id: 'customers', label: 'MÜŞTERİLER', icon: 'user-group' },
            { id: 'couriers', label: 'FİLO', icon: 'truck-fast' },
            { id: 'inventory', label: 'ENVANTER', icon: 'boxes-stacked' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 lg:flex-none px-5 lg:px-7 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-xl translate-y-[-1px]'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <i className={`fas fa-${tab.icon}`}></i>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <div className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="max-w-[1600px] mx-auto">

          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-700">
              {/* Filtreler ve Hızlı Durum */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-stretch">
                <div className="xl:col-span-2 flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-4">FİLTRELE:</span>
                    {['daily', 'weekly', 'monthly', 'all', 'custom'].map(f => (
                      <button
                        key={f}
                        onClick={() => setTimeFilter(f as TimeFilter)}
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                          timeFilter === f ? 'bg-slate-900 border-slate-900 text-white shadow-xl' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'
                        }`}
                      >
                        {f === 'daily' ? 'BUGÜN' : f === 'weekly' ? 'BU HAFTA' : f === 'monthly' ? 'BU AY' : f === 'custom' ? 'ÖZEL TARİH' : 'TÜMÜ'}
                      </button>
                    ))}
                  </div>

                  {timeFilter === 'custom' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-right-2">
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
                <div className="bg-slate-900 p-4 rounded-[2rem] flex justify-around items-center">
                  <div className="text-center">
                    <p className="text-[8px] font-black text-amber-500 uppercase">Bekleyen</p>
                    <p className="text-lg font-black text-white">{stats.pendingCount}</p>
                  </div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div className="text-center">
                    <p className="text-[8px] font-black text-indigo-400 uppercase">Yolda</p>
                    <p className="text-lg font-black text-white">{stats.onWayCount}</p>
                  </div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div className="text-center">
                    <p className="text-[8px] font-black text-emerald-400 uppercase">Biten</p>
                    <p className="text-lg font-black text-white">{stats.deliveredCount}</p>
                  </div>
                </div>
              </div>

              {/* Ana KPI Kartları */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'TOPLAM GELİR', value: `${stats.totalRevenue.toLocaleString()}₺`, sub: 'Net Satış Hacmi', icon: 'hand-holding-dollar', color: 'indigo' },
                  { label: 'TAHMİNİ KAR', value: `${stats.netProfit.toLocaleString()}₺`, sub: `%${stats.margin.toFixed(1)} Karlılık Marjı`, icon: 'sack-dollar', color: 'emerald' },
                  { label: 'MÜŞTERİ MEMNUNİYETİ', value: `%${(100 - (stats.cancelledCount / (stats.totalCount || 1)) * 100).toFixed(0)}`, sub: `${stats.totalCount} Toplam Talep`, icon: 'face-smile', color: 'amber' },
                  { label: 'İPTAL EDİLENLER', value: stats.cancelledCount, sub: `${((stats.cancelledCount / (stats.totalCount || 1)) * 100).toFixed(1)}% Kayıp Oranı`, icon: 'ban', color: 'rose' }
                ].map((kpi, idx) => (
                  <div key={idx} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-500 transition-all duration-500">
                    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${
                      kpi.color === 'indigo' ? 'bg-indigo-50' :
                      kpi.color === 'emerald' ? 'bg-emerald-50' :
                      kpi.color === 'amber' ? 'bg-amber-50' :
                      'bg-rose-50'
                    }`}>
                      <i className={`fas fa-${kpi.icon} text-4xl ${
                        kpi.color === 'indigo' ? 'text-indigo-500/20' :
                        kpi.color === 'emerald' ? 'text-emerald-500/20' :
                        kpi.color === 'amber' ? 'text-amber-500/20' :
                        'text-rose-500/20'
                      }`}></i>
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 relative z-10">{kpi.label}</p>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter mb-2 relative z-10">{kpi.value}</h3>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight relative z-10">{kpi.sub}</p>
                  </div>
                ))}
              </div>

              {/* Alt Analiz Panelleri */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Kurye Performansı */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Kurye Liderlik Tablosu</h4>
                    <i className="fas fa-medal text-amber-400"></i>
                  </div>
                  <div className="space-y-4">
                    {stats.courierPerformance.map((c, i) => (
                      <div key={c.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:bg-indigo-600 transition-all duration-300">
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black text-slate-300 group-hover:text-white/50 w-4">#{i+1}</span>
                          <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-indigo-600 shadow-sm">
                            {c.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900 group-hover:text-white uppercase truncate max-w-[120px]">{c.name}</p>
                            <p className="text-[9px] font-bold text-slate-400 group-hover:text-white/70 uppercase">{c.count} Teslimat</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900 group-hover:text-white">{c.revenue}₺</p>
                        </div>
                      </div>
                    ))}
                    {stats.courierPerformance.length === 0 && <p className="text-center text-[10px] font-bold text-slate-400 py-10 uppercase tracking-widest">Veri bulunamadı</p>}
                  </div>
                </div>

                {/* Bölgesel Yoğunluk */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Bölgesel Sipariş Yoğunluğu</h4>
                    <i className="fas fa-map-location-dot text-indigo-500"></i>
                  </div>
                  <div className="space-y-5">
                    {stats.topRegions.map(([neighborhood, count], i) => {
                      const percentage = Math.min(100, (count / (stats.totalCount || 1)) * 100);
                      return (
                        <div key={neighborhood} className="space-y-2">
                          <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{neighborhood}</span>
                            <span className="text-[10px] font-black text-indigo-600">{count} Sipariş</span>
                          </div>
                          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                    {stats.topRegions.length === 0 && <p className="text-center text-[10px] font-bold text-slate-400 py-10 uppercase tracking-widest">Henüz adres kaydı yok</p>}
                  </div>
                </div>

                {/* Kategori Bazlı Satış */}
                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Kategori Satış Payı</h4>
                    <i className="fas fa-chart-simple text-emerald-500"></i>
                  </div>
                  <div className="space-y-4">
                    {Object.entries(stats.catMap).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => (
                      <div key={cat} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                          <span className="text-[10px] font-black text-slate-700 uppercase">{cat}</span>
                        </div>
                        <span className="text-xs font-black text-slate-900">{amount.toLocaleString()}₺</span>
                      </div>
                    ))}
                    {Object.keys(stats.catMap).length === 0 && <p className="text-center text-[10px] font-bold text-slate-400 py-10 uppercase tracking-widest">Satış verisi yok</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6 animate-in fade-in duration-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase">Tüm Siparişler</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{orders.length} Sipariş</p>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-6 py-4">Sipariş No</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-6 py-4">Müşteri</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-6 py-4">Tutar</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-6 py-4">Durum</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-6 py-4">Kurye</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-6 py-4">Kaynak</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left px-6 py-4">Tarih</th>
                        <th className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-6 py-4">İşlem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.slice(0, 50).map((order) => (
                        <tr key={order.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-xs font-black text-slate-900">{order.id.slice(-8)}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-slate-700">{order.customerName}</p>
                            <p className="text-[9px] text-slate-400">{order.phone}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-black text-indigo-600">{order.totalAmount}₺</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase ${STATUS_COLORS[order.status]}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-bold text-slate-700">{order.courierName || '-'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase text-white ${SOURCE_STYLES[order.source]?.bg || 'bg-slate-600'}`}>
                              <i className={`fas ${SOURCE_STYLES[order.source]?.icon} mr-1`}></i>
                              {order.source}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[10px] font-bold text-slate-500">{new Date(order.createdAt).toLocaleDateString('tr-TR')}</p>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-xl transition-all"
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
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-[2rem] max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase">Sipariş Detayı</h3>
                  <p className="text-[10px] font-bold text-slate-400">{selectedOrder.id}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-200 transition-all">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            <div className="p-8 space-y-6">
              {/* Durum Değiştirme */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sipariş Durumu</h4>
                <div className="flex flex-wrap gap-2">
                  {['Bekliyor', 'Yolda', 'Teslim Edildi', 'İptal'].map((status) => (
                    <button
                      key={status}
                      onClick={() => updateOrderStatus(selectedOrder.id, status as OrderStatus)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                        selectedOrder.status === status
                          ? STATUS_COLORS[status as OrderStatus]
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kurye Atama */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Kurye Atama</h4>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => updateOrderCourier(selectedOrder.id, '')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                      !selectedOrder.courierId
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Kurye Yok
                  </button>
                  {couriers.map((courier) => (
                    <button
                      key={courier.id}
                      onClick={() => updateOrderCourier(selectedOrder.id, courier.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                        selectedOrder.courierId === courier.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {courier.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Müşteri Bilgileri</h4>
                <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
                  <p className="text-sm font-bold text-slate-900">{selectedOrder.customerName}</p>
                  <p className="text-xs text-slate-500">{selectedOrder.phone}</p>
                  <p className="text-xs text-slate-500">{selectedOrder.address}</p>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sipariş Ürünleri</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-xl p-4">
                      <div>
                        <p className="text-sm font-bold text-slate-900">{item.productName}</p>
                        <p className="text-xs text-slate-500">{item.quantity} Adet x {item.price}₺</p>
                      </div>
                      <p className="text-sm font-black text-indigo-600">{(item.quantity * item.price).toFixed(2)}₺</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <div>
                  <p className="text-[10px] font-bold text-slate-400">TOPLAM TUTAR</p>
                  <p className="text-2xl font-black text-slate-900">{selectedOrder.totalAmount}₺</p>
                </div>
                <span className={`px-4 py-2 rounded-xl text-sm font-black uppercase ${STATUS_COLORS[selectedOrder.status]}`}>
                  {selectedOrder.status}
                </span>
              </div>

              {selectedOrder.note && (
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Not</h4>
                  <p className="text-sm text-slate-700 bg-amber-50 rounded-xl p-4 border border-amber-200">{selectedOrder.note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
