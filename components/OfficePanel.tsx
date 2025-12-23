import React, { useState, useMemo, useEffect } from 'react';
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
    });
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
        <header className="px-3 lg:px-5 py-2 lg:py-3 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shrink-0 z-10 shadow-sm">
          <div className="flex flex-col gap-2">
            {/* Üst Satır: Başlık ve Arama */}
            <div className="flex flex-col lg:flex-row items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h1 className="text-sm lg:text-base font-black text-slate-900 tracking-tight uppercase leading-none">SİPARİŞ MONİTÖRÜ</h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-100 rounded-lg">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                  <span className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">Canlı</span>
                </span>
              </div>

              <div className="relative w-full lg:w-64 xl:w-72">
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                <input
                  type="text"
                  placeholder="Müşteri, tel, adres ara..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none text-[11px] font-bold text-slate-700 focus:bg-white focus:border-indigo-500 transition-all shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Alt Satır: Filtreler - Responsive */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Mobil: Dropdown, Desktop: Butonlar - Durum */}
              <div className="hidden sm:flex p-1 bg-slate-100 rounded-xl border border-slate-200/50 shadow-sm">
                {['ALL', ...Object.values(OrderStatus)].map(status => (
                  <button
                    key={status}
                    onClick={() => setActiveFilter(status)}
                    className={`px-2 lg:px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                      activeFilter === status
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                    }`}
                  >
                    {status === 'ALL' ? 'Tümü' : status}
                  </button>
                ))}
              </div>

              {/* Mobil Dropdown - Durum */}
              <div className="sm:hidden">
                <select
                  value={activeFilter}
                  onChange={(e) => setActiveFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-black uppercase tracking-widest appearance-none outline-none cursor-pointer"
                >
                  {['ALL', ...Object.values(OrderStatus)].map(status => (
                    <option key={status} value={status}>{status === 'ALL' ? 'Tüm Durumlar' : status}</option>
                  ))}
                </select>
              </div>

              {/* Mobil: Dropdown, Desktop: Butonlar - Kaynak */}
              <div className="hidden sm:flex p-1 bg-slate-100 rounded-xl border border-slate-200/50 shadow-sm">
                {['ALL', ...Object.values(OrderSource)].map(source => (
                  <button
                    key={source}
                    onClick={() => setSourceFilter(source)}
                    className={`px-2 py-1.5 rounded-lg text-[9px] lg:text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-1 ${
                      sourceFilter === source
                      ? 'bg-white text-indigo-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                    }`}
                  >
                    {source !== 'ALL' && (
                      <i className={`fas ${SOURCE_STYLES[source]?.icon || 'fa-tag'} text-[8px]`}></i>
                    )}
                    {source === 'ALL' ? 'Tümü' : source}
                  </button>
                ))}
              </div>

              {/* Mobil Dropdown - Kaynak */}
              <div className="sm:hidden">
                <select
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-[11px] font-black uppercase tracking-widest appearance-none outline-none cursor-pointer"
                >
                  {['ALL', ...Object.values(OrderSource)].map(source => (
                    <option key={source} value={source}>{source === 'ALL' ? 'Tüm Kaynaklar' : source}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </header>

        {/* İstatistik Paneli */}
        <div className="px-4 lg:px-8 py-4 bg-gradient-to-r from-white to-slate-50 border-b border-slate-200/50 shrink-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-4 rounded-2xl text-white relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform"></div>
              <span className="text-[10px] font-black uppercase opacity-80 block mb-1">Bekleyen</span>
              <p className="text-2xl font-black tracking-tighter">{stats.pending}</p>
            </div>
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-4 rounded-2xl text-white relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform"></div>
              <span className="text-[10px] font-black uppercase opacity-80 block mb-1">Yolda</span>
              <p className="text-2xl font-black tracking-tighter">{stats.onWay}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 rounded-2xl text-white relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform"></div>
              <span className="text-[10px] font-black uppercase opacity-80 block mb-1">Teslim Edildi</span>
              <p className="text-2xl font-black tracking-tighter">{stats.delivered}</p>
            </div>
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-4 rounded-2xl text-white col-span-2 lg:col-span-1 relative overflow-hidden shadow-xl">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-indigo-500/10 rounded-full"></div>
              <span className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block mb-1">Günlük Ciro</span>
              <p className="text-2xl font-black tracking-tighter">{stats.todayRevenue}₺</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6 bg-gradient-to-br from-slate-50/30 to-slate-100/30">
          {/* Gerçek Zamanlı Çağrı/Mesaj Bölümü */}
          {(liveOrders.length > 0 || sourceFilter !== 'ALL') && (
            <section className="bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 rounded-[2.5rem] p-6 shadow-2xl shadow-violet-600/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/10 rounded-full translate-y-1/2 -translate-x-1/2"></div>

              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-white/20 to-white/10 rounded-2xl flex items-center justify-center shadow-xl border border-white/20">
                      <i className="fas fa-satellite-dish text-white text-2xl animate-pulse"></i>
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight">Canlı Gelenler</h2>
                      <p className="text-violet-200 text-xs font-black uppercase tracking-widest mt-1">
                        {liveOrders.length} aktif çağrı/mesaj
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-2xl border border-white/20">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping"></span>
                    <span className="text-xs font-black text-white uppercase">Canlı</span>
                  </div>
                </div>

                {liveOrders.length > 0 ? (
                  <div className="space-y-4">
                    {liveOrders.map(order => {
                      const sourceStyle = SOURCE_STYLES[order.source] || SOURCE_STYLES[OrderSource.PHONE];
                      const isAI = order.source === 'AI Telefon' || order.source === 'Netgsm AI';
                      const isWhatsApp = order.source === 'WhatsApp';

                      return (
                        <div
                          key={order.id}
                          className="bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-3xl p-5 hover:bg-white/15 transition-all duration-300 cursor-pointer group"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4 flex-1">
                              {/* İkon */}
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl ${
                                isAI
                                  ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                                  : isWhatsApp
                                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
                                    : 'bg-gradient-to-br from-amber-500 to-orange-600'
                              }`}>
                                <i className={`fas ${isAI ? 'fa-robot' : isWhatsApp ? 'fa-whatsapp' : 'fa-phone'} text-white text-xl`}></i>
                              </div>

                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="text-lg font-black text-white uppercase">{order.customerName}</h3>
                                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${sourceStyle.bg} ${sourceStyle.text} flex items-center gap-1.5`}>
                                    <i className={`fas ${sourceStyle.icon}`}></i>
                                    {order.source}
                                  </span>
                                </div>

                                <div className="flex items-center gap-4 mb-3">
                                  <a href={`tel:${order.phone}`} className="text-sm font-bold text-violet-200 hover:text-white flex items-center gap-2">
                                    <i className="fas fa-phone"></i>
                                    {order.phone}
                                  </a>
                                  <div className="flex items-center gap-2">
                                    <span className="text-2xl font-black text-white">{order.totalAmount}₺</span>
                                    {order.paymentMethod && (
                                      <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${
                                        order.paymentMethod === PaymentMethod.CASH ? 'bg-emerald-500/30 text-emerald-100' :
                                        order.paymentMethod === PaymentMethod.POS ? 'bg-blue-500/30 text-blue-100' :
                                        'bg-rose-500/30 text-rose-100'
                                      }`}>
                                        {order.paymentMethod === PaymentMethod.CASH ? '💵 NAKİT' :
                                         order.paymentMethod === PaymentMethod.POS ? '💳 POS' :
                                         '❌ ALINMADI'}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  {order.items.map((item, idx) => (
                                    <span key={idx} className="px-3 py-1 bg-white/10 rounded-xl text-xs font-black text-white flex items-center gap-1.5">
                                      {item.quantity}x {item.productName} <span className="text-violet-200">{item.price}₺</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                              <span className="text-[10px] font-black text-violet-300 uppercase tracking-widest">
                                {formatDateTime(order.createdAt)}
                              </span>
                              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-all">
                                <i className="fas fa-arrow-right text-white"></i>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-white/10">
                            <div className="flex items-center gap-2 text-violet-200">
                              <i className="fas fa-map-marker text-sm"></i>
                              <span className="text-xs font-bold">{order.address}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <div className="w-20 h-20 rounded-3xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                      <i className="fas fa-check text-4xl text-emerald-400"></i>
                    </div>
                    <p className="text-sm font-black text-violet-200 uppercase tracking-widest">Bekleyen Çağrı Yok</p>
                    <p className="text-xs text-violet-300/70 uppercase tracking-wider mt-2">Tüm siparişler işlendi</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Sipariş Listesi */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-list text-indigo-500"></i>
                Sipariş Geçmişi
              </h2>
              <span className="text-[10px] font-black text-slate-400 uppercase">{filteredOrders.length} kayıt</span>
            </div>

            <div className="space-y-3">
              {filteredOrders.slice(0, 50).map(order => {
                const sourceStyle = SOURCE_STYLES[order.source] || SOURCE_STYLES[OrderSource.PHONE];
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

                const isNew = new Date().getTime() - new Date(order.createdAt).getTime() < 60000;

                // Kurye bilgisi
                const courier = couriers.find(c => c.id === order.courierId);

                return (
                  <div
                    key={order.id}
                    className={`bg-white border-l-4 ${statusBorderClass} rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 group cursor-pointer ${isNew ? 'ring-2 ring-indigo-400 ring-offset-2' : ''}`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <div className="p-4">
                      {/* Üst Satır */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          {isNew && (
                            <span className="px-2 py-1 bg-indigo-500 text-white text-[9px] font-black uppercase rounded-full animate-pulse">
                              YENİ
                            </span>
                          )}
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${STATUS_COLORS[order.status]}`}>
                            {order.status === 'Bekliyor' && '⏱ BEKLİYOR'}
                            {order.status === 'Yolda' && '🚚 YOLDA'}
                            {order.status === 'Teslim Edildi' && '✅ TESLİM'}
                            {order.status === 'İptal' && '❌ İPTAL'}
                          </span>
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${sourceStyle.bg} ${sourceStyle.text} flex items-center gap-1`}>
                            <i className={`fas ${sourceStyle.icon} text-[8px]`}></i>
                            {order.source === 'Web/Müşteri' ? 'WEB' : order.source}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-slate-900">{order.totalAmount}₺</span>
                          {order.paymentMethod && (
                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                              order.paymentMethod === PaymentMethod.CASH ? 'bg-emerald-100 text-emerald-700' :
                              order.paymentMethod === PaymentMethod.POS ? 'bg-blue-100 text-blue-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {order.paymentMethod === PaymentMethod.CASH ? '💵 Nakit' :
                               order.paymentMethod === PaymentMethod.POS ? '💳 POS' :
                               '❌ Alınmadı'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Müşteri Bilgisi */}
                      <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center border border-indigo-100">
                            <i className="fas fa-user text-indigo-500 text-sm"></i>
                          </div>
                          <div>
                            <h3 className="text-[12px] font-black text-slate-900 uppercase">{order.customerName}</h3>
                            <a href={`tel:${order.phone}`} className="text-[11px] font-bold text-indigo-600 hover:underline flex items-center gap-1">
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
                          {order.status === 'Teslim Edildi' && (
                            <div className="flex items-center gap-1.5 text-emerald-600">
                              <i className="fas fa-check-circle text-[9px]"></i>
                              <span className="text-[9px] font-bold uppercase tracking-wider">
                                {formatDateTime(order.updatedAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Adres */}
                      <div className="flex items-start gap-2 mb-3">
                        <div className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 mt-0.5">
                          <i className="fas fa-map-marker text-slate-400 text-xs"></i>
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium leading-snug flex-1">{order.address}</p>
                      </div>

                      {/* Ürünler */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {order.items.map((item, idx) => (
                          <div key={idx} className={`${statusBgClass} border border-slate-200/50 px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5`}>
                            <span className="bg-white px-1.5 py-0.5 rounded-md text-indigo-600 text-[10px]">{item.quantity}x</span>
                            <span className="text-slate-700">{item.productName}</span>
                            <span className="text-slate-500 text-[9px]">{item.price}₺</span>
                          </div>
                        ))}
                      </div>

                      {/* Alt Satır: Kurye ve Durum Değiştir */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <select
                          value={order.courierId || ''}
                          onChange={(e) => updateOrderCourier(order.id, e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-black outline-none cursor-pointer hover:border-indigo-300 transition-all min-w-[120px]"
                        >
                          <option value="">Kurye Yok</option>
                          {couriers.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.status === 'active' ? '✓' : c.status === 'busy' ? '⏳' : '✗'}
                            </option>
                          ))}
                        </select>

                        {/* Hızlı Durum Değiştir */}
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                          onClick={(e) => e.stopPropagation()}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border outline-none cursor-pointer shadow-sm transition-all ${STATUS_COLORS[order.status]}`}
                        >
                          {Object.values(OrderStatus).map(st => <option key={st} value={st} className="bg-white text-slate-900">{st}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredOrders.length === 0 && (
              <div className="py-16 text-center">
                <div className="inline-flex flex-col items-center justify-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-4 shadow-inner">
                    <i className="fas fa-inbox text-3xl text-slate-300"></i>
                  </div>
                  <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">Kayıt Yok</p>
                </div>
              </div>
            )}
          </section>
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
                  {selectedOrder.paymentMethod && (
                    <span className={`inline-block px-3 py-1 rounded-lg text-[11px] font-black uppercase ${
                      selectedOrder.paymentMethod === PaymentMethod.CASH ? 'bg-emerald-100 text-emerald-700' :
                      selectedOrder.paymentMethod === PaymentMethod.POS ? 'bg-blue-100 text-blue-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {selectedOrder.paymentMethod === PaymentMethod.CASH ? '💵 NAKİT' :
                       selectedOrder.paymentMethod === PaymentMethod.POS ? '💳 POS' :
                       '❌ ALINMADI'}
                    </span>
                  )}
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
