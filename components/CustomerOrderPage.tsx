
import React, { useState, useMemo } from 'react';
import { InventoryItem, Category, Order, OrderStatus, OrderSource, Customer, Courier } from '../types';
import { ISTANBUL_DISTRICTS, KARTAL_NEIGHBORHOODS } from '../constants';

interface CustomerOrderPageProps {
  inventory: InventoryItem[];
  categories: Category[];
  addOrder: (order: Order, customerData: Customer) => void;
  couriers: Courier[];
}

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

const CustomerOrderPage: React.FC<CustomerOrderPageProps> = ({ inventory, categories, addOrder, couriers }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [step, setStep] = useState<'browse' | 'checkout' | 'success'>('browse');
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    district: 'KARTAL',
    neighborhood: '',
    street: '',
    buildingNo: '',
    apartmentNo: '',
    note: ''
  });

  const activeProducts = useMemo(() => {
    return inventory.filter(i => i.isActive && (activeCategory === 'all' || i.category === activeCategory));
  }, [inventory, activeCategory]);

  const updateCart = (item: InventoryItem, delta: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        const newQty = existing.quantity + delta;
        if (newQty <= 0) return prev.filter(i => i.id !== item.id);
        return prev.map(i => i.id === item.id ? { ...i, quantity: newQty } : i);
      }
      if (delta > 0) return [...prev, { id: item.id, name: item.name, quantity: delta, price: item.salePrice }];
      return prev;
    });
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCompleteOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.street || !formData.neighborhood || cart.length === 0) return;

    const matchedCourier = couriers.find(c => 
      c.status === 'active' && 
      formData.neighborhood && 
      c.serviceRegion?.toLowerCase().includes(formData.neighborhood.toLowerCase())
    ) || couriers.find(c => c.status === 'active') || couriers[0];

    const customerDetails: Customer = {
      id: 'cust_' + Date.now(),
      name: formData.name,
      phone: formData.phone,
      district: formData.district,
      neighborhood: formData.neighborhood,
      street: formData.street,
      buildingNo: formData.buildingNo,
      apartmentNo: formData.apartmentNo,
      lastNote: formData.note,
      orderCount: 1
    };

    const order: Order = {
      id: 'WEB' + Math.random().toString(36).substr(2, 6).toUpperCase(),
      customerId: customerDetails.id,
      customerName: formData.name,
      phone: formData.phone,
      address: `${formData.district}, ${formData.neighborhood}, ${formData.street} No:${formData.buildingNo} D:${formData.apartmentNo}`,
      items: cart.map(i => ({ productId: i.id, productName: i.name, quantity: i.quantity, price: i.price })),
      totalAmount,
      courierId: matchedCourier.id,
      courierName: matchedCourier.name,
      status: OrderStatus.PENDING,
      source: OrderSource.WEB,
      note: formData.note,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    addOrder(order, customerDetails);
    setStep('success');
  };

  const resetOrderProcess = () => {
    setCart([]);
    setStep('browse');
    setFormData({
      name: '',
      phone: '',
      district: 'KARTAL',
      neighborhood: '',
      street: '',
      buildingNo: '',
      apartmentNo: '',
      note: ''
    });
  };

  if (step === 'success') {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-[#0f172a] text-white animate-in fade-in duration-1000">
        <div className="text-center space-y-12 max-w-lg">
          <div className="relative mx-auto w-40 h-40">
            <div className="absolute inset-0 bg-indigo-500 rounded-[3.5rem] animate-ping opacity-20"></div>
            <div className="relative w-40 h-40 bg-indigo-600 rounded-[3.5rem] flex items-center justify-center text-7xl shadow-2xl shadow-indigo-500/40 border-b-8 border-indigo-800">
              <i className="fas fa-truck-fast animate-pulse"></i>
            </div>
          </div>
          
          <div className="space-y-6">
            <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">SİPARİŞİNİZ ONAYLANDI!</h2>
            <div className="space-y-3">
               <p className="text-lg font-bold text-indigo-400 uppercase tracking-wide">Taze suyunuz yola çıkmak üzere hazırlanıyor.</p>
               <p className="text-xs font-medium opacity-50 leading-relaxed uppercase tracking-[0.2em] max-w-sm mx-auto">
                 Ekibimiz siparişinizi aldı ve bölgenizdeki kuryemize iletti. En kısa sürede kapınızda olacağız.
               </p>
            </div>
          </div>

          <div className="pt-4">
             <button 
                onClick={resetOrderProcess}
                className="group relative px-12 py-6 bg-white text-slate-900 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                <span className="relative z-10">YENİ SİPARİŞ VER</span>
                <div className="absolute inset-0 bg-indigo-50 rounded-[2rem] scale-0 group-hover:scale-100 transition-transform duration-500 origin-center"></div>
              </button>
          </div>
          
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em] pt-8">Bizi Tercih Ettiğiniz İçin Teşekkür Ederiz</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#fcfdfe] overflow-hidden lg:flex-row">
      <div className="flex-1 flex flex-col min-w-0">
        <header className="p-8 lg:px-12 bg-white border-b border-slate-100 shrink-0">
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            <div className="flex justify-between items-center">
               <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">TAZE SU SİPARİŞİ</h1>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] mt-2">Hijyenik Teslimat Kapınızda</p>
               </div>
               <div className="lg:hidden">
                  <button 
                    onClick={() => setStep('checkout')}
                    disabled={cart.length === 0}
                    className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${cart.length > 0 ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'bg-slate-100 text-slate-400'}`}
                  >
                    <i className="fas fa-cart-shopping"></i> {totalAmount}₺
                  </button>
               </div>
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
              <button 
                onClick={() => setActiveCategory('all')}
                className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${activeCategory === 'all' ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-400'}`}
              >
                TÜMÜ
              </button>
              {categories.map(cat => (
                <button 
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-3 ${activeCategory === cat.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-400'}`}
                >
                  <i className={`fas fa-${cat.icon}`}></i>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12 scroll-smooth pb-32 lg:pb-12 bg-slate-50/50">
          <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
            {activeProducts.map(item => {
              const inCart = cart.find(i => i.id === item.id);
              return (
                <div key={item.id} className="bg-white rounded-[2.5rem] border border-slate-100 flex flex-col shadow-sm hover:shadow-2xl hover:border-indigo-200 transition-all duration-500 group overflow-hidden">
                  <div className="h-56 bg-slate-50 relative flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <i className={`fas fa-${categories.find(c => c.id === item.category)?.icon || 'droplet'} text-5xl text-indigo-100`}></i>
                    )}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl text-xs font-black text-slate-900 shadow-sm">
                      {item.salePrice}₺
                    </div>
                  </div>
                  <div className="p-8 text-center flex-1 flex flex-col">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-6 leading-tight flex-1">{item.name}</h3>
                    <div className="flex items-center justify-center">
                      {inCart ? (
                        <div className="flex items-center gap-4 bg-slate-900 p-2 rounded-2xl w-full">
                          <button onClick={() => updateCart(item, -1)} className="w-10 h-10 rounded-xl bg-white/10 text-white font-black hover:bg-white/20 transition-all">-</button>
                          <span className="text-sm font-black text-white flex-1">{inCart.quantity} Adet</span>
                          <button onClick={() => updateCart(item, 1)} className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black shadow-lg shadow-indigo-500/40">+</button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => updateCart(item, 1)}
                          className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
                        >
                          SEPETE EKLE
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside className={`
        ${step === 'checkout' ? 'fixed inset-0 z-[200] flex' : 'hidden'}
        lg:static lg:flex lg:w-[480px] lg:border-l lg:border-slate-100 lg:bg-white flex-col shrink-0
      `}>
        <div className="flex-1 bg-white overflow-y-auto p-10 flex flex-col animate-in slide-in-from-right-full duration-700">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">ÖDEME ADIMI</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Son aşamadasınız</p>
            </div>
            <button onClick={() => setStep('browse')} className="lg:hidden w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center"><i className="fas fa-times"></i></button>
          </div>

          <div className="flex-1 space-y-8">
            <div className="space-y-4">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center py-5 border-b border-slate-50">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-black">
                      {item.quantity}
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 uppercase block">{item.name}</span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-slate-900">{item.price * item.quantity}₺</span>
                </div>
              ))}
              <div className="bg-slate-900 p-8 rounded-[2.5rem] flex justify-between items-center text-white shadow-2xl relative overflow-hidden">
                 <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">TOPLAM TUTAR</span>
                 <span className="text-3xl font-black tracking-tighter">{totalAmount}₺</span>
              </div>
            </div>

            <form onSubmit={handleCompleteOrder} className="pt-8 space-y-5 border-t border-slate-100">
              <div className="flex items-center gap-3 mb-4">
                <i className="fas fa-map-location-dot text-indigo-600"></i>
                <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">ADRES BİLGİLERİNİZ</h3>
              </div>
              <div className="space-y-4">
                <input 
                  type="text" required placeholder="ADINIZ VE SOYADINIZ" 
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase outline-none focus:bg-white focus:border-indigo-600 transition-all shadow-sm"
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                />
                <input 
                  type="tel" required placeholder="TELEFON NUMARANIZ" 
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black text-indigo-600 outline-none focus:bg-white focus:border-indigo-600 transition-all shadow-sm"
                  value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4">
                  <select 
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase outline-none appearance-none"
                    value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})}
                  >
                    {ISTANBUL_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  
                  <select 
                    required
                    className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black uppercase outline-none appearance-none"
                    value={formData.neighborhood} 
                    onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                  >
                    <option value="">MAHALLE SEÇİN</option>
                    {formData.district === 'KARTAL' ? (
                      KARTAL_NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)
                    ) : (
                      <option value="MERKEZ">MERKEZ MAHALLESİ</option>
                    )}
                  </select>
                </div>
                <input 
                  type="text" required placeholder="SOKAK / CADDE / APARTMAN" 
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold uppercase outline-none"
                  value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})}
                />
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="BİNA NO" className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black text-center outline-none" value={formData.buildingNo} onChange={e => setFormData({...formData, buildingNo: e.target.value})} />
                  <input type="text" placeholder="DAİRE" className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black text-center outline-none" value={formData.apartmentNo} onChange={e => setFormData({...formData, apartmentNo: e.target.value})} />
                </div>
                <textarea 
                  placeholder="SİPARİŞ NOTUNUZ (OPSİYONEL)..." 
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold outline-none h-24"
                  value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})}
                />
              </div>

              <button 
                type="submit" 
                disabled={cart.length === 0}
                className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 active:scale-95 transition-all disabled:opacity-20 mt-8 border-b-8 border-indigo-800"
              >
                KAPIDA ÖDEMELİ SİPARİŞİ TAMAMLA
              </button>
            </form>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default CustomerOrderPage;
