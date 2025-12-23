
import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, Customer, InventoryItem, Courier, OrderSource } from '../types';
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

  // Tüm ürünleri göster (isActive filtresini kaldırdım)
  const activeStock = stock;

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            o.phone.includes(searchTerm) ||
                            o.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = activeFilter === 'ALL' || o.status === activeFilter;
      const matchesSource = sourceFilter === 'ALL' || o.source === sourceFilter;
      return matchesSearch && matchesFilter && matchesSource;
    });
  }, [orders, searchTerm, activeFilter, sourceFilter]);

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
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
        <header className="px-4 lg:px-8 py-6 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 flex flex-col xl:flex-row items-center justify-between gap-4 lg:gap-6 shrink-0 z-10 shadow-sm">
          <div className="flex flex-col text-center lg:text-left">
            <h1 className="text-base lg:text-lg font-black text-slate-900 tracking-tight uppercase">SİPARİŞ MONİTÖRÜ</h1>
            <p className="text-[11px] lg:text-[12px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> SİSTEM ÇALIŞIYOR
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full xl:w-auto">
            {/* Durum Filtreleri */}
            <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200/50 w-full sm:w-auto overflow-x-auto scrollbar-hide shadow-sm">
              {['ALL', ...Object.values(OrderStatus)].map(status => (
                <button
                  key={status}
                  onClick={() => setActiveFilter(status)}
                  className={`px-3 lg:px-4 py-2 rounded-xl text-[11px] lg:text-[12px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeFilter === status
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  {status === 'ALL' ? 'Tümü' : status}
                </button>
              ))}
            </div>

            {/* Kaynak Filtreleri */}
            <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200/50 w-full sm:w-auto overflow-x-auto scrollbar-hide shadow-sm">
              {['ALL', ...Object.values(OrderSource)].map(source => (
                <button
                  key={source}
                  onClick={() => setSourceFilter(source)}
                  className={`px-2 lg:px-3 py-2 rounded-xl text-[10px] lg:text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    sourceFilter === source
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                  }`}
                >
                  {source !== 'ALL' && (
                    <i className={`fas ${SOURCE_STYLES[source]?.icon || 'fa-tag'}`}></i>
                  )}
                  {source === 'ALL' ? 'Tüm Kaynaklar' : source}
                </button>
              ))}
            </div>

            <div className="relative w-full xl:w-72">
              <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
              <input
                type="text"
                placeholder="Müşteri, tel, adres ara..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-[11px] font-bold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </header>

        {/* İstatistik Paneli */}
        <div className="px-4 lg:px-8 py-4 bg-gradient-to-r from-white to-slate-50 border-b border-slate-200/50 shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-4 rounded-2xl border border-amber-200/50 relative overflow-hidden group hover:shadow-lg hover:shadow-amber-200/20 transition-all duration-300">
              <div className="absolute -right-3 -top-3 w-12 h-12 bg-amber-400/10 rounded-full group-hover:scale-150 transition-transform"></div>
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-1">BEKLEYEN</span>
              <p className="text-2xl font-black text-amber-700 tracking-tighter">{stats.pending}</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-4 rounded-2xl border border-indigo-200/50 relative overflow-hidden group hover:shadow-lg hover:shadow-indigo-200/20 transition-all duration-300">
              <div className="absolute -right-3 -top-3 w-12 h-12 bg-indigo-400/10 rounded-full group-hover:scale-150 transition-transform"></div>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block mb-1">YOLDAYIM</span>
              <p className="text-2xl font-black text-indigo-700 tracking-tighter">{stats.onWay}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-4 rounded-2xl border border-emerald-200/50 relative overflow-hidden group hover:shadow-lg hover:shadow-emerald-200/20 transition-all duration-300">
              <div className="absolute -right-3 -top-3 w-12 h-12 bg-emerald-400/10 rounded-full group-hover:scale-150 transition-transform"></div>
              <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-1">TESLİM EDİLDİ</span>
              <p className="text-2xl font-black text-emerald-700 tracking-tighter">{stats.delivered}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-2xl text-white col-span-2 lg:col-span-1 relative overflow-hidden shadow-xl shadow-slate-900/20">
              <div className="absolute -right-3 -top-3 w-16 h-16 bg-indigo-500/10 rounded-full"></div>
              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block mb-1">GÜNLÜK CİRO</span>
              <p className="text-2xl font-black tracking-tighter">{stats.todayRevenue}₺</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-4 bg-gradient-to-br from-slate-50/30 to-slate-100/30">
          <div className="space-y-4">
            {filteredOrders.map(order => {
              const sourceStyle = SOURCE_STYLES[order.source] || SOURCE_STYLES[OrderSource.PHONE];
              // Durum bazlı sol border rengi
              const statusBorderClass = {
                'Bekliyor': 'border-l-amber-500',
                'Yolda': 'border-l-indigo-500',
                'Teslim Edildi': 'border-l-emerald-500',
                'İptal': 'border-l-rose-500'
              }[order.status] || 'border-l-slate-300';

              const statusBgClass = {
                'Bekliyor': 'bg-amber-50',
                'Yolda': 'bg-indigo-50',
                'Teslim Edildi': 'bg-emerald-50',
                'İptal': 'bg-rose-50'
              }[order.status] || 'bg-slate-50';

              return (
                <div key={order.id} className={`bg-white border-l-4 ${statusBorderClass} rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 group`}>
                  <div className="p-5">
                    {/* Üst Satır: Durum, Kaynak, Müşteri, Tutar */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {/* Durum Badge */}
                        <span className={`px-3 py-1 rounded-lg text-[11px] font-black uppercase tracking-wider ${STATUS_COLORS[order.status]}`}>
                          {order.status === 'Bekliyor' && '🕐 BEKLİYOR'}
                          {order.status === 'Yolda' && '🚚 YOLDA'}
                          {order.status === 'Teslim Edildi' && '✅ TESLİM'}
                          {order.status === 'İptal' && '❌ İPTAL'}
                        </span>

                        {/* Kaynak Badge */}
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${sourceStyle.bg} ${sourceStyle.text} flex items-center gap-1.5`}>
                          <i className={`fas ${sourceStyle.icon}`}></i>
                          {order.source === 'Web/Müşteri' ? 'WEB' : order.source}
                        </span>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-black text-slate-900">{order.totalAmount}₺</span>
                      </div>
                    </div>

                    {/* Müşteri ve İletişim */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center border border-indigo-100">
                          <i className="fas fa-user text-indigo-500"></i>
                        </div>
                        <div>
                          <h3 className="text-[13px] font-black text-slate-900 uppercase">{order.customerName}</h3>
                          <a href={`tel:${order.phone}`} className="text-[12px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
                            <i className="fas fa-phone text-[10px]"></i>
                            {order.phone}
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Adres */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
                        <i className="fas fa-map-marker text-slate-400"></i>
                      </div>
                      <p className="text-[12px] text-slate-600 font-medium flex-1 leading-relaxed">{order.address}</p>
                    </div>

                    {/* Ürünler */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {order.items.map((item, idx) => (
                        <div key={idx} className={`${statusBgClass} border border-slate-200/50 px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-2 shadow-sm`}>
                          <span className="bg-white px-2 py-0.5 rounded-lg text-indigo-600 shadow-sm">{item.quantity}x</span>
                          <span className="text-slate-700">{item.productName}</span>
                        </div>
                      ))}
                    </div>

                    {/* Alt Satır: Tarih, Kurye, Durum Değiştir */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center">
                          <i className="far fa-clock text-slate-400 text-[10px]"></i>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          {formatDateTime(order.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Kurye Seçimi */}
                        <div className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200 hover:border-indigo-300 transition-colors">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-sm">
                            <i className="fas fa-truck text-white text-[10px]"></i>
                          </div>
                          <select
                            value={order.courierId}
                            disabled={order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED}
                            onChange={(e) => updateOrderCourier(order.id, e.target.value)}
                            className="text-[12px] font-bold text-slate-700 outline-none cursor-pointer disabled:opacity-50 bg-transparent"
                          >
                            <option value="">Kurye Yok</option>
                            {couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </div>

                        {/* Durum Dropdown */}
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                          className={`px-4 py-2 rounded-xl text-[12px] font-black uppercase tracking-wider border outline-none cursor-pointer shadow-sm transition-all ${STATUS_COLORS[order.status]}`}
                        >
                          {Object.values(OrderStatus).map(st => <option key={st} value={st} className="bg-white text-slate-900">{st}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredOrders.length === 0 && (
            <div className="py-24 text-center">
              <div className="inline-flex flex-col items-center justify-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-6 shadow-inner">
                  <i className="fas fa-inbox text-4xl text-slate-300"></i>
                </div>
                <p className="text-[13px] font-black text-slate-400 uppercase tracking-[0.3em]">HİZMET BEKLEYEN KAYIT YOK</p>
                <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mt-2">Seçili filtrelere uygun sipariş bulunmuyor</p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Sipariş Detay Modalı */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200/50" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-white to-slate-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase">SİPARİŞ DETAYI</h3>
                  <p className="text-[13px] font-black text-slate-400 uppercase mt-1">#{selectedOrder.id}</p>
                </div>
                <button onClick={() => setSelectedOrder(null)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-500">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">MÜŞTERİ</span>
                  <p className="text-sm font-black text-slate-900">{selectedOrder.customerName}</p>
                  <a href={`tel:${selectedOrder.phone}`} className="text-xs font-bold text-indigo-600 hover:underline">{selectedOrder.phone}</a>
                </div>
                <div className="space-y-2">
                  <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">TUTAR</span>
                  <p className="text-xl font-black text-slate-900">{selectedOrder.totalAmount}₺</p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">ADRES</span>
                <p className="text-xs font-bold text-slate-700 leading-relaxed">{selectedOrder.address}</p>
              </div>

              <div className="space-y-2">
                <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest">ÜRÜNLER</span>
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 flex items-center gap-2">
                      <span className="bg-indigo-600 text-white w-6 h-6 rounded-lg flex items-center justify-center text-[12px] font-black">{item.quantity}</span>
                      <span className="text-[13px] font-black text-slate-700">{item.productName}</span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedOrder.note && (
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-2">
                  <span className="text-[12px] font-black text-amber-500 uppercase tracking-widest">NOT</span>
                  <p className="text-xs font-bold text-amber-900 italic">"{selectedOrder.note}"</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-3">
                  <h4 className="text-[13px] font-black text-slate-400 uppercase tracking-widest">SİPARİŞ DURUMU</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(OrderStatus).map((status) => (
                      <button
                        key={status}
                        onClick={() => updateOrderStatus(selectedOrder.id, status)}
                        className={`px-4 py-2 rounded-xl text-[12px] font-black uppercase tracking-widest border transition-all ${
                          selectedOrder.status === status
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-400'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[13px] font-black text-slate-400 uppercase tracking-widest">KURYE ATAMA</h4>
                  <select
                    value={selectedOrder.courierId}
                    disabled={selectedOrder.status === OrderStatus.DELIVERED || selectedOrder.status === OrderStatus.CANCELLED}
                    onChange={(e) => updateOrderCourier(selectedOrder.id, e.target.value)}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] font-black outline-none focus:border-indigo-500 disabled:opacity-50"
                  >
                    <option value="">Kurye Yok</option>
                    {couriers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.status === 'active' ? 'Aktif' : c.status === 'busy' ? 'Meşgul' : 'Kapalı'})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-[12px] font-black text-slate-400 uppercase">
                <div>
                  <span className="block">Oluşturulma</span>
                  <span className="text-slate-600">{formatDateTime(selectedOrder.createdAt)}</span>
                </div>
                <div>
                  <span className="block">Son Güncelleme</span>
                  <span className="text-slate-600">{formatDateTime(selectedOrder.updatedAt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfficePanel;
