
import React, { useState, useMemo } from 'react';
import { Order, OrderStatus, Customer, InventoryItem, Courier, OrderSource } from '../types';
import OrderForm from './OrderForm';
import { STATUS_COLORS, SOURCE_STYLES } from '../constants';
import StockWidget from './StockWidget';

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
  const [isMobileFormOpen, setIsMobileFormOpen] = useState(false);

  const activeStock = useMemo(() => stock.filter(item => item.isActive), [stock]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            o.phone.includes(searchTerm) ||
                            o.address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = activeFilter === 'ALL' || o.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [orders, searchTerm, activeFilter]);

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col lg:flex-row h-full bg-[#f8fafc] overflow-hidden relative">
      <div className="lg:hidden p-4 bg-white border-b border-slate-200 sticky top-0 z-[60] shrink-0">
        <button 
          onClick={() => setIsMobileFormOpen(true)}
          className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all"
        >
          <i className="fas fa-plus-circle text-lg"></i>
          YENİ SİPARİŞ GİRİŞİ
        </button>
      </div>

      <aside className={`
        ${isMobileFormOpen ? 'fixed inset-0 z-[200] flex flex-col bg-white' : 'hidden'} 
        lg:static lg:block lg:w-[400px] lg:shrink-0 lg:bg-white lg:border-r lg:border-slate-200 lg:overflow-y-auto lg:z-10
      `}>
        <div className="lg:hidden p-5 flex justify-between items-center border-b border-slate-100 bg-slate-50">
          <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">SİPARİŞ KAYIT</h2>
          <button onClick={() => setIsMobileFormOpen(false)} className="w-10 h-10 rounded-xl bg-white text-rose-500 shadow-sm border border-slate-200 flex items-center justify-center">
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1 pb-20 lg:pb-6">
          <section>
            <div className="hidden lg:flex flex-col mb-4">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-bolt text-indigo-600"></i>
                HIZLI SİPARİŞ
              </h2>
              <div className="h-0.5 w-8 bg-indigo-600 mt-2 rounded-full"></div>
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
        <header className="px-4 lg:px-8 py-6 bg-white border-b border-slate-200 flex flex-col xl:flex-row items-center justify-between gap-6 shrink-0 z-10 shadow-sm">
          <div className="flex flex-col text-center lg:text-left">
            <h1 className="text-sm lg:text-base font-black text-slate-900 tracking-tight uppercase">SİPARİŞ MONİTÖRÜ</h1>
            <p className="text-[8px] lg:text-[9px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> SİSTEM ÇALIŞIYOR
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
            <div className="flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200/50 w-full sm:w-auto overflow-x-auto scrollbar-hide">
              {['ALL', ...Object.values(OrderStatus)].map(status => (
                <button
                  key={status}
                  onClick={() => setActiveFilter(status)}
                  className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeFilter === status 
                    ? 'bg-white text-indigo-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {status === 'ALL' ? 'Hepsi' : status}
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

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 3xl:grid-cols-4 gap-6">
            {filteredOrders.map(order => {
              const sourceStyle = SOURCE_STYLES[order.source] || SOURCE_STYLES[OrderSource.PHONE];
              return (
                <div key={order.id} className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-indigo-300 transition-all duration-500 flex flex-col group relative">
                  <div className="p-6 pb-4 flex justify-between items-start border-b border-slate-50">
                    <div className="flex gap-4 min-w-0">
                      <div className="w-12 h-12 shrink-0 rounded-[1.2rem] bg-slate-50 text-slate-400 flex items-center justify-center font-black text-sm border border-slate-100 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        {order.customerName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                           <h3 className="font-black text-slate-900 text-sm tracking-tight uppercase truncate">{order.customerName}</h3>
                           {/* SOURCE BADGE */}
                           <span className={`px-2 py-0.5 rounded-lg text-[7px] font-black uppercase tracking-widest shrink-0 ${sourceStyle.bg} ${sourceStyle.text} flex items-center gap-1`}>
                              <i className={`fas ${sourceStyle.icon}`}></i>
                              {order.source}
                           </span>
                        </div>
                        <a href={`tel:${order.phone}`} className="text-indigo-600 font-bold text-[10px] tracking-tight hover:underline flex items-center gap-1.5">
                          <i className="fas fa-phone-alt opacity-50"></i> {order.phone}
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 flex-1 space-y-5">
                    <div className="flex items-start gap-4">
                      <i className="fas fa-map-pin text-indigo-400 text-[10px] mt-1.5"></i>
                      <p className="text-[11px] text-slate-600 font-bold leading-relaxed">{order.address}</p>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl text-[9px] font-black text-slate-700 uppercase flex items-center gap-2">
                          <span className="text-indigo-600 font-black">{item.quantity}x</span>
                          {item.productName}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                       <div className="flex flex-col">
                          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">ALINDI: {formatDateTime(order.createdAt)}</span>
                          {order.status === OrderStatus.DELIVERED && (
                             <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mt-1">TESLİM: {formatDateTime(order.updatedAt)}</span>
                          )}
                       </div>
                       <p className="text-lg font-black text-slate-900 tracking-tighter">{order.totalAmount}₺</p>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 rounded-b-[2.5rem] flex items-center justify-between">
                    <div className="flex items-center gap-3 relative group/courier">
                      <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shadow-lg">
                        {order.courierName?.charAt(0)}
                      </div>
                      <select 
                        value={order.courierId}
                        disabled={order.status === OrderStatus.DELIVERED || order.status === OrderStatus.CANCELLED}
                        onChange={(e) => updateOrderCourier(order.id, e.target.value)}
                        className="bg-transparent text-[10px] font-black text-slate-700 uppercase outline-none cursor-pointer appearance-none pr-6 disabled:cursor-default"
                      >
                        {couriers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      {order.status !== OrderStatus.DELIVERED && order.status !== OrderStatus.CANCELLED && (
                         <i className="fas fa-sort text-[8px] text-slate-400 pointer-events-none absolute right-0"></i>
                      )}
                    </div>
                    <div className="relative">
                      <select 
                        value={order.status}
                        onChange={(e) => updateOrderStatus(order.id, e.target.value as OrderStatus)}
                        className={`appearance-none px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm outline-none cursor-pointer ${STATUS_COLORS[order.status]}`}
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
            <div className="py-32 text-center opacity-20">
              <i className="fas fa-layer-group text-6xl mb-6 text-slate-300"></i>
              <p className="text-[11px] font-black uppercase tracking-[0.5em]">Hizmet Bekleyen Kayıt Yok</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default OfficePanel;
