
import React, { useState, useEffect, useRef } from 'react';
import { Customer, Order, OrderStatus, InventoryItem, Courier, OrderSource, PaymentMethod } from '../types';
import { KARTAL_NEIGHBORHOODS, SOURCE_STYLES } from '../constants';

// Favori Mahalleler (En çok sipariş gelen 8 mahalle)
const FAVORITE_NEIGHBORHOODS = [
  'YENİDOĞAN',
  'ORHANGAZİ',
  'CUMHURİYET',
  'KARLIDERE',
  'HURMALIK',
  'ESKİ KARTAL',
  'SOĞANLIK',
  'TOPÇULAR'
];

interface OrderFormProps {
  onAddOrder: (order: Order, customerData: Customer) => void;
  customers: Customer[];
  couriers: Courier[];
  inventory: InventoryItem[];
  orders: Order[];
}

interface SelectedItem {
  productId: string;
  quantity: number;
}

const OrderForm: React.FC<OrderFormProps> = ({ onAddOrder, customers, couriers, inventory, orders }) => {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [street, setStreet] = useState('');
  const [buildingNo, setBuildingNo] = useState('');
  const [apartmentNo, setApartmentNo] = useState('');
  const [orderSource, setOrderSource] = useState<OrderSource>(OrderSource.PHONE);
  
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([
    { productId: '', quantity: 1 }
  ]);

  const [note, setNote] = useState('');
  const [courierId, setCourierId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);

  const phoneInputRef = useRef<HTMLInputElement>(null);

  // Kuryeleri sırala (önce tanımlanmalı çünkü useEffect kullanıyor)
  const sortedCouriers = React.useMemo(() => {
    return [...couriers].sort((a, b) => {
      const getScore = (c: Courier) => {
        let score = 0;
        const load = orders.filter(o => o.courierId === c.id && (o.status === OrderStatus.PENDING || o.status === OrderStatus.ON_WAY)).length;
        if (c.status === 'offline') score += 10000;
        if (c.status === 'busy') score += 5000;
        score += load * 100;
        const regionMatch = neighborhood && c.serviceRegion?.toLowerCase().includes(neighborhood.toLowerCase());
        if (regionMatch) score -= 2000;
        return score;
      };
      return getScore(a) - getScore(b);
    });
  }, [couriers, orders, neighborhood]);

  // İlk ürün seçimini otomatik yap (sadece inventory değişince)
  useEffect(() => {
    if (inventory.length > 0) {
      setSelectedItems([{ productId: inventory[0].id, quantity: 1 }]);
    }
  }, [inventory]);

  // İlk kuryeyi otomatik seç
  useEffect(() => {
    if (sortedCouriers.length > 0 && !courierId) {
      setCourierId(sortedCouriers[0].id);
    }
  }, [sortedCouriers, courierId]);

  useEffect(() => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length >= 10) {
      const inputSuffix = cleanPhone.slice(-10);
      const customer = customers.find(c => c.phone.replace(/\D/g, '').slice(-10) === inputSuffix);
      if (customer) {
        setName(customer.name);
        setNeighborhood(customer.neighborhood || '');
        setStreet(customer.street || '');
        setBuildingNo(customer.buildingNo || '');
        setApartmentNo(customer.apartmentNo || '');
        setMatchedCustomer(customer);
      } else {
        setMatchedCustomer(null);
      }
    } else {
      setMatchedCustomer(null);
    }
  }, [phone, customers]);

  const addItemRow = () => {
    setSelectedItems([...selectedItems, { productId: inventory[0]?.id || '', quantity: 1 }]);
  };

  const removeItemRow = (index: number) => {
    if (selectedItems.length > 1) {
      setSelectedItems(selectedItems.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof SelectedItem, value: any) => {
    const updated = [...selectedItems];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedItems(updated);
  };

  const totalAmount = selectedItems.reduce((sum, item) => {
    const inv = inventory.find(i => i.id === item.productId);
    return sum + (inv ? inv.salePrice * item.quantity : 0);
  }, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!phone || !name || !street || !neighborhood || selectedItems.length === 0) return;

    setIsSubmitting(true);

    const orderItems = selectedItems.map(si => {
      const inv = inventory.find(i => i.id === si.productId);
      return {
        productId: si.productId,
        productName: inv?.name || 'Bilinmeyen Ürün',
        quantity: si.quantity,
        price: inv?.salePrice || 0
      };
    }).filter(item => item.productId !== '');

    if (orderItems.length === 0) {
      setIsSubmitting(false);
      return;
    }

    const courier = couriers.find(c => c.id === courierId) || couriers[0];

    const customerDetails: Customer = {
      id: matchedCustomer?.id || 'cust_' + Date.now(),
      name, phone, district: 'KARTAL', neighborhood: neighborhood.toUpperCase(), street, buildingNo, apartmentNo,
      lastNote: note,
      orderCount: (matchedCustomer?.orderCount || 0) + 1
    };

    // Supabase otomatik ID oluşturacak, geçici placeholder kullan
    await onAddOrder({
      id: '', // Supabase dolduracak
      customerId: customerDetails.id,
      customerName: name, phone,
      address: `KARTAL, ${neighborhood.toUpperCase()}, ${street} No:${buildingNo} D:${apartmentNo}`,
      items: orderItems,
      totalAmount,
      courierId: courier.id, courierName: courier.name,
      status: OrderStatus.PENDING,
      source: orderSource,
      note,
      paymentMethod,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    }, customerDetails);

    setPhone(''); setName(''); setNeighborhood(''); setStreet(''); setBuildingNo(''); setApartmentNo(''); setNote(''); setPaymentMethod(undefined);
    setMatchedCustomer(null);
    setIsSubmitting(false);
    // Reset items to first product
    if (inventory.length > 0) {
      setSelectedItems([{ productId: inventory[0].id, quantity: 1 }]);
    }
    phoneInputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-full">
      <div className="bg-slate-50 p-4 rounded-[1.8rem] border border-slate-200 space-y-4 shadow-sm">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">SİPARİŞ KAYNAĞI</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[OrderSource.PHONE, OrderSource.GETIR, OrderSource.TRENDYOL, OrderSource.YEMEKSEPETI].map(src => {
              const style = SOURCE_STYLES[src] || SOURCE_STYLES[OrderSource.PHONE];
              return (
                <button
                  key={src}
                  type="button"
                  onClick={() => setOrderSource(src)}
                  className={`py-3 px-2 rounded-xl text-[11px] font-black uppercase tracking-tight border transition-all flex items-center justify-center gap-2 ${
                    orderSource === src
                      ? `${style.bg} ${style.text} shadow-md scale-105`
                      : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
                  }`}
                >
                  <i className={`fas ${style.icon}`}></i>
                  {src}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">İLETİŞİM HATTI</label>
          <input 
            ref={phoneInputRef} type="tel" value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
            placeholder="05xx..." 
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black text-indigo-600 outline-none focus:border-indigo-500 shadow-sm transition-all"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">MÜŞTERİ AD SOYAD</label>
          <input 
            type="text" value={name} onChange={(e) => setName(e.target.value)} 
            placeholder="Ad Soyad" 
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 shadow-sm transition-all"
          />
        </div>
      </div>

      <div className="bg-slate-50 p-4 rounded-[1.8rem] border border-slate-200 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">TESLİMAT ADRESİ</label>
          <div className="bg-indigo-600 text-white px-3 py-1 rounded-full text-[11px] font-black uppercase">KARTAL</div>
        </div>

        {/* Favori Mahalleler */}
        <div className="space-y-2">
          <label className="text-[11px] font-black text-indigo-500 uppercase tracking-widest ml-2 block">FAVORİ MAHALLELER</label>
          <div className="grid grid-cols-4 gap-1.5">
            {FAVORITE_NEIGHBORHOODS.map(fav => (
              <button
                key={fav}
                type="button"
                onClick={() => setNeighborhood(fav)}
                className={`py-2 px-1 rounded-xl text-[13px] font-black uppercase tracking-tight border transition-all ${
                  neighborhood === fav
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
                }`}
              >
                {fav}
              </button>
            ))}
          </div>
        </div>

        {/* Tüm Mahalleler Dropdown */}
        <div>
          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-2 block">TÜM MAHALLELER</label>
          <select
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[13px] font-black outline-none appearance-none"
          >
            <option value="">MAHALLE SEÇİN</option>
            {KARTAL_NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <input type="text" value={street} onChange={(e) => setStreet(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold outline-none" placeholder="Sokak / Cadde / No" />
        
        <div className="grid grid-cols-2 gap-2">
          <input type="text" value={buildingNo} onChange={(e) => setBuildingNo(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold text-center" placeholder="Bina No" />
          <input type="text" value={apartmentNo} onChange={(e) => setApartmentNo(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-2xl text-[13px] font-bold text-center" placeholder="Daire" />
        </div>
      </div>

      <div className="space-y-3 p-2">
        <div className="flex items-center justify-between">
          <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest">ÜRÜN SEÇİMİ</label>
          <button type="button" onClick={addItemRow} className="text-[12px] font-black text-indigo-600 uppercase hover:text-indigo-700"><i className="fas fa-plus mr-1"></i> EKLE</button>
        </div>

        {inventory.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-center">
            <p className="text-[13px] font-black text-amber-600 uppercase">Ürün bulunamadı</p>
            <p className="text-[12px] text-amber-500 mt-1">Envanter güncellemesi gerekiyor</p>
          </div>
        ) : (
          <>
            {selectedItems.map((item, index) => (
              <div key={index} className="flex gap-2">
                <select
                  value={item.productId}
                  onChange={(e) => updateItem(index, 'productId', e.target.value)}
                  className="flex-[3] px-3 py-3 bg-white border border-slate-200 rounded-2xl text-[13px] font-black outline-none focus:border-indigo-500"
                >
                  {inventory.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.salePrice}₺)
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-16 px-2 py-3 bg-white border border-slate-200 rounded-2xl text-[13px] font-black text-center outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => removeItemRow(index)}
                  disabled={selectedItems.length === 1}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl font-black transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-rose-500 text-white hover:bg-rose-600 shadow-md hover:shadow-lg active:scale-95"
                >
                  <i className="fas fa-trash-alt text-sm"></i>
                </button>
              </div>
            ))}
          </>
        )}

        <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl text-white">
          <span className="text-[13px] font-black uppercase tracking-widest">TOPLAM:</span>
          <span className="text-xl font-black tracking-tighter">{totalAmount}₺</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-2">GÖREVLİ KURYE</label>
        <select value={courierId} onChange={(e) => setCourierId(e.target.value)} className="w-full px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-2xl text-[13px] font-black text-indigo-900 outline-none">
          {sortedCouriers.map(c => {
            const load = orders.filter(o => o.courierId === c.id && (o.status === OrderStatus.PENDING || o.status === OrderStatus.ON_WAY)).length;
            return <option key={c.id} value={c.id}>{c.name} ({load} İş)</option>;
          })}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-2">ÖDEME YÖNTEMİ</label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod(paymentMethod === PaymentMethod.CASH ? undefined : PaymentMethod.CASH)}
            className={`py-3 px-2 rounded-xl text-[11px] font-black uppercase border-2 transition-all ${
              paymentMethod === PaymentMethod.CASH
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-300'
            }`}
          >
            💵 Nakit
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod(paymentMethod === PaymentMethod.POS ? undefined : PaymentMethod.POS)}
            className={`py-3 px-2 rounded-xl text-[11px] font-black uppercase border-2 transition-all ${
              paymentMethod === PaymentMethod.POS
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300'
            }`}
          >
            💳 POS
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod(paymentMethod === PaymentMethod.NOT_COLLECTED ? undefined : PaymentMethod.NOT_COLLECTED)}
            className={`py-3 px-2 rounded-xl text-[11px] font-black uppercase border-2 transition-all ${
              paymentMethod === PaymentMethod.NOT_COLLECTED
                ? 'bg-rose-600 border-rose-600 text-white'
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-rose-300'
            }`}
          >
            ❌ Alınmadı
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-indigo-600 text-white font-black py-5 rounded-[1.8rem] text-[13px] uppercase tracking-[0.2em] shadow-xl hover:bg-indigo-700 transition-all border-b-8 border-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'KAYDEDİLİYOR...' : 'SİPARİŞİ ONAYLA'}
      </button>
    </form>
  );
};

export default OrderForm;
