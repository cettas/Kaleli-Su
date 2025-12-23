import React, { useState } from 'react';
import { Order, OrderSource, OrderStatus, Customer, InventoryItem } from '../types';
import { KARTAL_NEIGHBORHOODS } from '../constants';

interface MarketplaceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (order: Order, customer: Customer) => void;
  source: OrderSource;
  inventory: InventoryItem[];
  couriers: { id: string; name: string; }[];
}

const MarketplaceOrderModal: React.FC<MarketplaceOrderModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  source,
  inventory,
  couriers
}) => {
  const [formData, setFormData] = useState({
    orderId: '', // Getir/Trendyol sipariş ID
    customerName: '',
    phone: '',
    neighborhood: '',
    street: '',
    buildingNo: '',
    apartmentNo: '',
    note: ''
  });

  const [selectedItems, setSelectedItems] = useState<{ productId: string; quantity: number }[]>([
    { productId: inventory[0]?.id || '', quantity: 1 }
  ]);

  const resetForm = () => {
    setFormData({
      orderId: '',
      customerName: '',
      phone: '',
      neighborhood: '',
      street: '',
      buildingNo: '',
      apartmentNo: '',
      note: ''
    });
    setSelectedItems([{ productId: inventory[0]?.id || '', quantity: 1 }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.phone || !formData.street || !formData.neighborhood) {
      alert('Lütfen zorunlu alanları doldurun.');
      return;
    }

    const items = selectedItems.map(si => {
      const inv = inventory.find(i => i.id === si.productId);
      return {
        productId: si.productId,
        productName: inv?.name || 'Bilinmeyen Ürün',
        quantity: si.quantity,
        price: inv?.salePrice || 0
      };
    }).filter(item => item.productId !== '');

    if (items.length === 0) return;

    const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const customer: Customer = {
      id: 'cust_' + Date.now(),
      name: formData.customerName,
      phone: formData.phone,
      district: 'KARTAL',
      neighborhood: formData.neighborhood.toUpperCase(),
      street: formData.street,
      buildingNo: formData.buildingNo,
      apartmentNo: formData.apartmentNo,
      lastNote: formData.note,
      orderCount: 1
    };

    // İlk aktif kuryeyi seç
    const activeCourier = couriers.find(c => true) || couriers[0];

    const order: Order = {
      id: '', // Supabase dolduracak
      customerId: customer.id,
      customerName: formData.customerName,
      phone: formData.phone,
      address: `KARTAL, ${formData.neighborhood.toUpperCase()}, ${formData.street} No:${formData.buildingNo} D:${formData.apartmentNo}`,
      items,
      totalAmount,
      courierId: activeCourier?.id || '',
      courierName: activeCourier?.name || '',
      status: OrderStatus.PENDING,
      source,
      note: `${source} Sipariş No: ${formData.orderId}\n${formData.note}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSubmit(order, customer);
    resetForm();
    onClose();
  };

  const addItem = () => {
    setSelectedItems([...selectedItems, { productId: inventory[0]?.id || '', quantity: 1 }]);
  };

  const updateItem = (index: number, field: 'productId' | 'quantity', value: string | number) => {
    const updated = [...selectedItems];
    updated[index] = { ...updated[index], [field]: value };
    setSelectedItems(updated);
  };

  const removeItem = (index: number) => {
    if (selectedItems.length > 1) {
      setSelectedItems(selectedItems.filter((_, i) => i !== index));
    }
  };

  const totalAmount = selectedItems.reduce((sum, item) => {
    const inv = inventory.find(i => i.id === item.productId);
    return sum + (inv ? inv.salePrice * item.quantity : 0);
  }, 0);

  if (!isOpen) return null;

  const sourceColors = {
    'Getir': 'bg-[#5d3ebc]',
    'Trendyol': 'bg-[#ff6000]',
    'Yemeksepeti': 'bg-[#ea004b]'
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`${sourceColors[source]} p-8 text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tighter">{source} SİPARİŞİ</h2>
              <p className="text-xs font-bold opacity-80 mt-2">Manuel Sipariş Girişi</p>
            </div>
            <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all">
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Sipariş ID */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{source} Sipariş Numarası</label>
            <input
              type="text"
              value={formData.orderId}
              onChange={e => setFormData({ ...formData, orderId: e.target.value })}
              placeholder="Örn: GP12345678"
              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500"
            />
          </div>

          {/* Müşteri Bilgileri */}
          <div className="space-y-4 bg-slate-50 p-5 rounded-3xl">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">MÜŞTERİ BİLGİLERİ</h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                required
                value={formData.customerName}
                onChange={e => setFormData({ ...formData, customerName: e.target.value })}
                placeholder="Ad Soyad *"
                className="col-span-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
              />
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Telefon *"
                className="col-span-2 px-4 py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Adres */}
          <div className="space-y-4 bg-slate-50 p-5 rounded-3xl">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">TESLİMAT ADRESİ</h3>
            <div className="bg-indigo-600 text-white px-4 py-2 rounded-full text-[9px] font-black uppercase w-fit">KARTAL</div>
            <select
              required
              value={formData.neighborhood}
              onChange={e => setFormData({ ...formData, neighborhood: e.target.value })}
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black outline-none appearance-none"
            >
              <option value="">Mahalle Seçin *</option>
              {KARTAL_NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <input
              type="text"
              required
              value={formData.street}
              onChange={e => setFormData({ ...formData, street: e.target.value })}
              placeholder="Sokak / Cadde / Apartman *"
              className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={formData.buildingNo}
                onChange={e => setFormData({ ...formData, buildingNo: e.target.value })}
                placeholder="Bina No"
                className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-center outline-none"
              />
              <input
                type="text"
                value={formData.apartmentNo}
                onChange={e => setFormData({ ...formData, apartmentNo: e.target.value })}
                placeholder="Daire"
                className="px-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-center outline-none"
              />
            </div>
          </div>

          {/* Ürün Seçimi */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ÜRÜNLER</h3>
              <button type="button" onClick={addItem} className="text-[9px] font-black text-indigo-600 uppercase hover:text-indigo-700 flex items-center gap-1">
                <i className="fas fa-plus"></i> EKLE
              </button>
            </div>
            {selectedItems.map((item, index) => (
              <div key={index} className="flex gap-2">
                <select
                  value={item.productId}
                  onChange={e => updateItem(index, 'productId', e.target.value)}
                  className="flex-[3] px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black outline-none focus:border-indigo-500"
                >
                  {inventory.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.salePrice}₺)</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={e => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                  className="flex-1 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black text-center outline-none focus:border-indigo-500"
                />
                {selectedItems.length > 1 && (
                  <button type="button" onClick={() => removeItem(index)} className="text-rose-500 px-2 hover:text-rose-600">
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            ))}
            <div className="bg-slate-900 p-4 rounded-2xl text-white flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest">TOPLAM:</span>
              <span className="text-xl font-black tracking-tighter">{totalAmount}₺</span>
            </div>
          </div>

          {/* Not */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SİPARİŞ NOTU (Opsiyonel)</label>
            <textarea
              value={formData.note}
              onChange={e => setFormData({ ...formData, note: e.target.value })}
              placeholder="Ek notlar..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-bold outline-none h-20 resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 transition-all"
          >
            SİPARİŞİ OLUŞTUR
          </button>
        </form>
      </div>
    </div>
  );
};

export default MarketplaceOrderModal;
