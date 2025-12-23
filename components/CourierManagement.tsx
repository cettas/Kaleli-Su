
import React, { useState, useMemo } from 'react';
import { Courier, Order, OrderStatus } from '../types';

interface CourierManagementProps {
  couriers: Courier[];
  orders: Order[];
  onUpdateCouriers: (couriers: Courier[]) => void;
}

const CourierManagement: React.FC<CourierManagementProps> = ({ couriers, orders, onUpdateCouriers }) => {
  const [formMode, setFormMode] = useState<'add' | 'edit' | null>(null);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');

  const courierStats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    const stats: Record<string, { todayDelivered: number, activeLoad: number }> = {};

    couriers.forEach(c => {
      const todayOrders = orders.filter(o => 
        o.courierId === c.id && 
        o.status === OrderStatus.DELIVERED && 
        new Date(o.updatedAt).getTime() >= startOfToday
      );
      const deliveredCount = todayOrders.reduce((acc, o) => acc + o.items.reduce((iAcc, item) => iAcc + item.quantity, 0), 0);

      const activeOrders = orders.filter(o => 
        o.courierId === c.id && 
        (o.status === OrderStatus.PENDING || o.status === OrderStatus.ON_WAY)
      );
      const loadCount = activeOrders.reduce((acc, o) => acc + o.items.reduce((iAcc, item) => iAcc + item.quantity, 0), 0);

      stats[c.id] = { todayDelivered: deliveredCount, activeLoad: loadCount };
    });

    return stats;
  }, [couriers, orders]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setRegion('');
    setFormMode(null);
    setEditingCourier(null);
  };

  const handleEditInit = (courier: Courier) => {
    setEditingCourier(courier);
    setName(courier.name);
    setPhone(courier.phone);
    setRegion(courier.serviceRegion || '');
    setFormMode('edit');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    if (formMode === 'add') {
      const newCourier: Courier = {
        id: 'c' + Date.now(),
        name,
        phone,
        status: 'offline',
        fullInventory: 0,
        emptyInventory: 0,
        serviceRegion: region
      };
      onUpdateCouriers([...couriers, newCourier]);
    } else if (formMode === 'edit' && editingCourier) {
      const updated = couriers.map(c => 
        c.id === editingCourier.id ? { ...c, name, phone, serviceRegion: region } : c
      );
      onUpdateCouriers(updated);
    }
    resetForm();
  };

  const setStatus = (id: string, newStatus: 'active' | 'busy' | 'offline') => {
    const updated = couriers.map(c => 
      c.id === id ? { ...c, status: newStatus } : c
    );
    onUpdateCouriers(updated);
  };

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="bg-white rounded-[1.5rem] lg:rounded-2xl border border-slate-200 shadow-sm p-4 lg:p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shrink-0"><i className="fas fa-truck-ramp-box"></i></div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">Personel Merkezi</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Saha Filo Yönetimi</p>
          </div>
        </div>
        
        <button 
          onClick={() => formMode === 'add' ? resetForm() : setFormMode('add')}
          className="w-full sm:w-auto px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
        >
          {formMode === 'add' ? 'İPTAL' : 'YENİ PERSONEL'}
        </button>
      </div>

      {(formMode === 'add' || formMode === 'edit') && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[1.5rem] border border-slate-200 shadow-xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs" placeholder="Ad Soyad" />
            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs" placeholder="Telefon" />
          </div>
          <input type="text" value={region} onChange={(e) => setRegion(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs" placeholder="Hizmet Bölgesi" />
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black text-[10px] uppercase">{formMode === 'add' ? 'KAYDET' : 'GÜNCELLE'}</button>
            <button type="button" onClick={resetForm} className="px-6 bg-slate-100 text-slate-500 rounded-xl font-black text-[10px] uppercase">İPTAL</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {couriers.map(courier => {
          const stats = courierStats[courier.id] || { todayDelivered: 0, activeLoad: 0 };
          return (
            <div key={courier.id} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:border-indigo-400 transition-all">
              <div className="p-5 border-b border-slate-50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-sm border border-slate-200">{courier.name.charAt(0)}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-black text-slate-900 truncate uppercase">{courier.name}</h4>
                    <p className="text-[9px] text-indigo-500 font-bold uppercase tracking-tight mt-0.5 truncate">{courier.serviceRegion || 'Bölge Tanımsız'}</p>
                  </div>
                  <button onClick={() => handleEditInit(courier)} className="text-slate-300 hover:text-indigo-600"><i className="fas fa-edit"></i></button>
                </div>

                <div className="flex gap-1">
                  {(['active', 'busy', 'offline'] as const).map(st => (
                    <button 
                      key={st}
                      onClick={() => setStatus(courier.id, st)}
                      className={`flex-1 py-2 rounded-lg text-[8px] font-black uppercase transition-all ${
                        courier.status === st ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-50 text-slate-400'
                      }`}
                    >
                      {st === 'active' ? 'AKTİF' : st === 'busy' ? 'MEŞGUL' : 'KAPALI'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 bg-slate-50/50 p-4 gap-4">
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Teslimat</p>
                  <p className="text-lg font-black text-slate-900">{stats.todayDelivered}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Yük</p>
                  <p className="text-lg font-black text-indigo-600">{stats.activeLoad}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CourierManagement;
