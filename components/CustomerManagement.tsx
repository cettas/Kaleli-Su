
import React, { useState, useMemo } from 'react';
import { Customer, Order, OrderStatus } from '../types';
import { STATUS_COLORS } from '../constants';
import { supabase } from '../services/supabaseClient';

interface CustomerManagementProps {
  customers: Customer[];
  orders: Order[];
  onUpdateCustomers: (customers: Customer[]) => void;
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ customers, orders, onUpdateCustomers }) => {
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const handleImport = async () => {
    try {
      const lines = importText.split('\n').filter(l => l.trim() !== '');
      const newCustomers: Customer[] = lines.map((line, index) => {
        const parts = line.split(',').map(s => s?.trim());
        const [name, phone, district, neighborhood, street, buildingNo, apartmentNo] = parts;
        if (!name || !phone) return null;
        return {
          id: 'imp_' + Date.now() + '_' + index,
          name,
          phone,
          district: district || '',
          neighborhood: neighborhood || '',
          street: street || '',
          buildingNo: buildingNo || '',
          apartmentNo: apartmentNo || '',
          orderCount: 0
        };
      }).filter(c => c !== null) as Customer[];

      // Supabase'e kaydet
      for (const customer of newCustomers) {
        await supabase.from('customers').insert({
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          district: customer.district,
          neighborhood: customer.neighborhood,
          street: customer.street,
          building_no: customer.buildingNo,
          apartment_no: customer.apartmentNo,
          order_count: customer.orderCount
        });
      }

      onUpdateCustomers([...customers, ...newCustomers]);
      setImportText('');
      setShowImport(false);
      alert(`${newCustomers.length} müşteri eklendi.`);
    } catch (e) {
      alert("Format Hatalı!");
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.phone.includes(searchTerm)
    ).sort((a, b) => (b.orderCount || 0) - (a.orderCount || 0));
  }, [customers, searchTerm]);

  const customerOrders = useMemo(() => {
    if (!selectedCustomer) return [];
    // Telefon numarasının son 10 hanesine göre eşleştirme (daha güvenli)
    const cleanSelectedPhone = selectedCustomer.phone.replace(/\D/g, '').slice(-10);
    return orders.filter(o => o.phone.replace(/\D/g, '').slice(-10) === cleanSelectedPhone)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [selectedCustomer, orders]);

  const customerStats = useMemo(() => {
    if (!selectedCustomer) return { totalSpent: 0, lastOrder: null };
    const delivered = customerOrders.filter(o => o.status === OrderStatus.DELIVERED);
    const totalSpent = delivered.reduce((sum, o) => sum + o.totalAmount, 0);
    return { totalSpent, lastOrder: customerOrders[0] || null };
  }, [selectedCustomer, customerOrders]);

  return (
    <div className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 relative pb-10">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="relative flex-1 w-full">
          <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300"></i>
          <input 
            type="text" 
            placeholder="Müşteri adı veya telefon no ile ara..." 
            className="w-full pl-12 pr-6 py-3 lg:py-4 rounded-2xl border border-slate-100 bg-slate-50 outline-none text-xs lg:text-sm transition-all focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setShowImport(!showImport)}
          className={`w-full xl:w-auto px-6 py-3 lg:py-4 rounded-2xl text-[10px] lg:text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
            showImport ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-200'
          }`}
        >
          <i className={`fas fa-${showImport ? 'times' : 'file-csv'}`}></i>
          {showImport ? 'İPTAL' : 'TOPLU YÜKLE'}
        </button>
      </div>

      {showImport && (
        <div className="bg-indigo-600 p-6 lg:p-8 rounded-[1.5rem] lg:rounded-[2.5rem] shadow-2xl space-y-4 text-white animate-in zoom-in-95 duration-300">
          <div>
            <h3 className="font-black text-xs uppercase tracking-widest mb-1">Müşteri Listesi Yapıştır</h3>
            <p className="text-[10px] opacity-70 font-medium">Format: İsim, Telefon, İlçe, Mahalle, Sokak, BinaNo, DaireNo</p>
          </div>
          <textarea 
            className="w-full h-32 p-4 rounded-2xl bg-white/10 border border-white/20 outline-none text-xs placeholder:text-white/40 font-mono"
            placeholder="Örn: Ali Veli, 05551234455, Kadıköy, Moda, Güneş Sk, 12, 4"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <button onClick={handleImport} className="w-full bg-white text-indigo-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors shadow-lg shadow-indigo-800/20">YÜKLEMEYİ BAŞLAT</button>
        </div>
      )}

      {/* Müşteri Tablosu */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">MÜŞTERİ BİLGİSİ</th>
                <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">DETAYLI ADRES</th>
                <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest">İSTATİSTİK</th>
                <th className="px-6 py-5 font-black text-slate-400 uppercase text-[10px] tracking-widest text-right">EYLEM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map(customer => (
                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black text-sm border border-slate-200 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        {customer.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-slate-900 uppercase text-xs">{customer.name}</p>
                        <p className="text-[11px] font-bold text-indigo-600 mt-0.5">{customer.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight truncate max-w-[250px]">
                      {customer.neighborhood} {customer.street} No:{customer.buildingNo} D:{customer.apartmentNo}
                    </p>
                    <p className="text-[9px] font-black text-slate-300 uppercase mt-1">{customer.district}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="text-center border-r border-slate-100 pr-4">
                        <p className="text-[8px] font-black text-slate-400 uppercase">SİPARİŞ</p>
                        <p className="text-xs font-black text-slate-900">{customer.orderCount || 0}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase">SON SİPARİŞ</p>
                        <p className="text-[10px] font-bold text-slate-700">
                          {customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString('tr-TR') : 'YOK'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button 
                      onClick={() => setSelectedCustomer(customer)}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                    >
                      DETAYLAR
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredCustomers.length === 0 && (
          <div className="py-20 text-center opacity-30">
            <i className="fas fa-users-slash text-4xl mb-4 text-slate-400"></i>
            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Müşteri Kaydı Bulunamadı</p>
          </div>
        )}
      </div>

      {/* MÜŞTERİ DETAY MODALI (CRM GÖRÜNÜMÜ) */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-[1000] flex justify-center items-center bg-slate-900/80 backdrop-blur-md p-4 lg:p-10" onClick={() => setSelectedCustomer(null)}>
          <div className="w-full max-w-4xl bg-[#f8fafc] rounded-[3rem] shadow-2xl flex flex-col lg:flex-row overflow-hidden animate-in zoom-in-95 duration-300 h-full max-h-[850px]" onClick={e => e.stopPropagation()}>
            
            {/* Sol Panel: Müşteri Künyesi */}
            <div className="w-full lg:w-[320px] bg-white border-r border-slate-200 p-8 flex flex-col">
              <div className="flex flex-col items-center text-center space-y-4 mb-8">
                <div className="w-24 h-24 rounded-[2rem] bg-indigo-600 text-white flex items-center justify-center text-4xl font-black shadow-2xl shadow-indigo-200 border-b-8 border-indigo-800">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">{selectedCustomer.name}</h3>
                  <p className="text-xs font-bold text-indigo-500 mt-2">{selectedCustomer.phone}</p>
                </div>
              </div>

              <div className="space-y-6 flex-1">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">AÇIK ADRES</span>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-700 leading-relaxed uppercase">
                      {selectedCustomer.neighborhood} MAH. {selectedCustomer.street} SK. NO:{selectedCustomer.buildingNo} D:{selectedCustomer.apartmentNo}
                    </p>
                    <p className="text-[10px] font-black text-indigo-400 mt-2 uppercase">{selectedCustomer.district}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest block mb-1 text-center">TOPLAM CİRO</span>
                    <p className="text-xl font-black text-indigo-600 text-center tracking-tighter">{customerStats.totalSpent}₺</p>
                  </div>
                  <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1 text-center">SİPARİŞ ADEDİ</span>
                    <p className="text-xl font-black text-slate-900 text-center tracking-tighter">{selectedCustomer.orderCount}</p>
                  </div>
                </div>

                {selectedCustomer.lastNote && (
                  <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                    <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block mb-2">MÜŞTERİ NOTU</span>
                    <p className="text-[11px] font-bold text-amber-900 italic leading-tight">"{selectedCustomer.lastNote}"</p>
                  </div>
                )}
              </div>

              <button 
                onClick={() => setSelectedCustomer(null)}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest mt-6 hover:bg-black transition-all"
              >
                PENCEREYİ KAPAT
              </button>
            </div>

            {/* Sağ Panel: Sipariş Geçmişi Listesi */}
            <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50">
              <div className="p-8 pb-4 flex justify-between items-center">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">SİPARİŞ GEÇMİŞİ</h4>
                <div className="flex items-center gap-2">
                   <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                   <span className="text-[10px] font-black text-slate-500 uppercase">GÜNCEL VERİ</span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4">
                {customerOrders.length > 0 ? (
                  customerOrders.map(order => (
                    <div key={order.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-indigo-300 transition-all">
                      <div className="flex items-center gap-5">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl ${STATUS_COLORS[order.status]} shadow-sm`}>
                          <i className={`fas fa-${order.status === OrderStatus.DELIVERED ? 'check-circle' : order.status === OrderStatus.CANCELLED ? 'times-circle' : 'clock'}`}></i>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-black text-slate-900 uppercase">{new Date(order.createdAt).toLocaleDateString('tr-TR')}</span>
                            <span className="text-[10px] text-slate-300">•</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{new Date(order.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-[11px] font-black text-slate-600 uppercase">
                            {order.items.map(i => `${i.quantity}x ${i.productName}`).join(', ')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-slate-900 tracking-tighter leading-none mb-1">{order.totalAmount}₺</p>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-lg uppercase tracking-widest border ${STATUS_COLORS[order.status]}`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                    <i className="fas fa-history text-5xl mb-4 opacity-20"></i>
                    <p className="text-[10px] font-black uppercase tracking-widest">Kayıt Bulunamadı</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
