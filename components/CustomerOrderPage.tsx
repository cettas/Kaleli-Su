
import React, { useState, useMemo } from 'react';
import { InventoryItem, Category, Order, OrderStatus, OrderSource, Customer, Courier, PaymentMethod } from '../types';
import { KARTAL_NEIGHBORHOODS } from '../constants';

const FAVORITE_NEIGHBORHOODS = [
  'YENİDOĞAN', 'ORHANGAZİ', 'CUMHURİYET', 'KARLIDERE',
  'HURMALIK', 'ESKİ KARTAL', 'SOĞANLIK', 'TOPÇULAR'
];

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
  imageUrl?: string;
  categoryId?: string;
}

const CustomerOrderPage: React.FC<CustomerOrderPageProps> = ({ inventory, categories, addOrder, couriers }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '', phone: '', neighborhood: '', street: '',
    buildingNo: '', apartmentNo: '', note: '',
    paymentMethod: undefined as PaymentMethod | undefined
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
      if (delta > 0) {
        return [...prev, { id: item.id, name: item.name, quantity: delta, price: item.salePrice, imageUrl: item.imageUrl, categoryId: item.category }];
      }
      return prev;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!formData.name.trim() || !formData.phone.trim() || !formData.neighborhood || !formData.street.trim() || !formData.paymentMethod) {
      alert('Lütfen tüm zorunlu alanları doldurun.');
      return;
    }
    if (isSubmitting) return;

    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 600));

    const matchedCourier = couriers.find(c => c.status === 'active') || couriers[0];

    const customerDetails: Customer = {
      id: 'cust_' + Date.now(),
      name: formData.name,
      phone: formData.phone,
      district: 'KARTAL',
      neighborhood: formData.neighborhood,
      street: formData.street,
      buildingNo: formData.buildingNo,
      apartmentNo: formData.apartmentNo,
      lastNote: formData.note,
      orderCount: 1
    };

    const order: Order = {
      id: '',
      customerId: customerDetails.id,
      customerName: formData.name,
      phone: formData.phone,
      address: `KARTAL, ${formData.neighborhood}, ${formData.street} No:${formData.buildingNo} D:${formData.apartmentNo}`,
      items: cart.map(i => ({ productId: i.id, productName: i.name, quantity: i.quantity, price: i.price })),
      totalAmount,
      courierId: matchedCourier.id,
      courierName: matchedCourier.name,
      status: OrderStatus.PENDING,
      source: OrderSource.WEB,
      note: formData.note,
      paymentMethod: formData.paymentMethod,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    addOrder(order, customerDetails);
    setIsSubmitting(false);
    setCart([]);
    setFormData({ name: '', phone: '', neighborhood: '', street: '', buildingNo: '', apartmentNo: '', note: '', paymentMethod: undefined });
    alert('Siparişiniz alındı! En kısa sürede teslim edilecektir.');
  };

  return (
    <div className="h-full flex flex-col lg:flex-row">
      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-slate-100 min-h-0">
        {/* Header */}
        <header className="bg-white px-4 lg:px-8 py-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <i className="fas fa-droplet text-white"></i>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">KALELİ SU</h1>
                <p className="text-xs text-indigo-600 font-semibold">Kapınıza Gelsin</p>
              </div>
            </div>

            {/* Desktop Categories */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                Tümü
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors ${activeCategory === cat.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  <i className={`fas fa-${cat.icon}`}></i>
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-500">Toplam</div>
              <div className="text-xl font-black text-slate-900">{totalAmount}₺</div>
            </div>
          </div>

          {/* Mobile Categories */}
          <div className="lg:hidden flex gap-2 mt-4 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${activeCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              Tümü
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-colors ${activeCategory === cat.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                <i className={`fas fa-${cat.icon}`}></i>
                {cat.label}
              </button>
            ))}
          </div>
        </header>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {activeProducts.length === 0 ? (
              <div className="text-center py-20">
                <i className="fas fa-box-open text-4xl text-slate-300 mb-3"></i>
                <p className="text-slate-500">Ürün bulunamadı</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {activeProducts.map(item => {
                  const inCart = cart.find(i => i.id === item.id);
                  const category = categories.find(c => c.id === item.category);
                  return (
                    <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="aspect-square bg-slate-50 flex items-center justify-center p-4 relative">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                        ) : (
                          <i className={`fas fa-${category?.icon || 'droplet'} text-5xl text-indigo-200`}></i>
                        )}
                        <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-lg shadow text-sm font-bold">
                          {item.salePrice}₺
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-sm font-bold text-slate-900 mb-3 leading-tight">{item.name}</h3>
                        {inCart ? (
                          <div className="flex items-center gap-2 bg-slate-900 rounded-xl p-1">
                            <button onClick={() => updateCart(item, -1)} className="w-9 h-9 bg-white/10 text-white rounded-lg font-bold">-</button>
                            <span className="text-white font-bold flex-1 text-center">{inCart.quantity}</span>
                            <button onClick={() => updateCart(item, 1)} className="w-9 h-9 bg-indigo-500 text-white rounded-lg font-bold">+</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => updateCart(item, 1)}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors"
                          >
                            + Ekle
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Sidebar */}
      <div className="w-full lg:w-[420px] bg-white border-l border-slate-200 flex flex-col shadow-xl lg:shadow-none">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">Sepet ({totalItemsCount})</h2>
          {cart.length > 0 && (
            <div className="text-xl font-black text-indigo-600">{totalAmount}₺</div>
          )}
        </div>

        {/* Desktop Header */}
        <div className="hidden lg:block p-6 border-b">
          <h2 className="text-lg font-bold text-slate-900">Sipariş Özeti</h2>
          <p className="text-sm text-slate-500">Sepetinizde {totalItemsCount} ürün var</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {/* Cart Items */}
          {cart.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl">
              <i className="fas fa-shopping-basket text-4xl text-slate-300 mb-3"></i>
              <p className="text-slate-500">Sepetiniz boş</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="w-14 h-14 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <i className="fas fa-droplet text-indigo-400 text-lg"></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.quantity} adet × {item.price}₺</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{item.price * item.quantity}₺</p>
                    <button onClick={() => removeFromCart(item.id)} className="text-xs text-rose-500 hover:underline">
                      <i className="fas fa-trash mr-1"></i>Sil
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between py-4 px-4 bg-slate-900 rounded-xl">
                <span className="text-white font-bold">Toplam Tutar</span>
                <span className="text-2xl font-black text-white">{totalAmount}₺</span>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleCompleteOrder} className="space-y-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Teslimat Bilgileri</h3>

            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Ad Soyad"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-indigo-500 focus:outline-none"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
              <input
                type="tel"
                placeholder="Telefon"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-indigo-500 focus:outline-none"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <select
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold bg-white focus:border-indigo-500 focus:outline-none"
                value={formData.neighborhood}
                onChange={e => setFormData({...formData, neighborhood: e.target.value})}
              >
                <option value="">Mahalle</option>
                {KARTAL_NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
              <input
                type="text"
                placeholder="Bina No"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold text-center focus:border-indigo-500 focus:outline-none"
                value={formData.buildingNo}
                onChange={e => setFormData({...formData, buildingNo: e.target.value})}
              />
              <input
                type="text"
                placeholder="Daire No"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold text-center focus:border-indigo-500 focus:outline-none"
                value={formData.apartmentNo}
                onChange={e => setFormData({...formData, apartmentNo: e.target.value})}
              />
            </div>

            <input
              type="text"
              placeholder="Sokak / Cadde / Apartman Adı"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold focus:border-indigo-500 focus:outline-none"
              value={formData.street}
              onChange={e => setFormData({...formData, street: e.target.value})}
            />

            <textarea
              placeholder="Not (opsiyonel)"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm resize-none focus:border-indigo-500 focus:outline-none"
              rows={2}
              value={formData.note}
              onChange={e => setFormData({...formData, note: e.target.value})}
            ></textarea>

            {/* Payment */}
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block">Ödeme Yöntemi</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, paymentMethod: PaymentMethod.CASH})}
                  className={`py-4 rounded-xl font-bold border-2 flex flex-col items-center gap-1 transition-all ${formData.paymentMethod === PaymentMethod.CASH ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg' : 'border-slate-200 hover:border-emerald-400'}`}
                >
                  <span className="text-2xl">💵</span>
                  Nakit
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, paymentMethod: PaymentMethod.POS})}
                  className={`py-4 rounded-xl font-bold border-2 flex flex-col items-center gap-1 transition-all ${formData.paymentMethod === PaymentMethod.POS ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'border-slate-200 hover:border-blue-400'}`}
                >
                  <span className="text-2xl">💳</span>
                  Kredi Kartı / POS
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={cart.length === 0 || isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-xl font-bold text-sm hover:from-indigo-700 hover:to-indigo-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/30"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-spinner fa-spin"></i>
                  İşleniyor...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <i className="fas fa-check"></i>
                  Siparişi Onayla
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CustomerOrderPage;
