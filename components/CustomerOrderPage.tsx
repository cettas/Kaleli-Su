
import React, { useState, useMemo } from 'react';
import { InventoryItem, Category, Order, OrderStatus, OrderSource, Customer, Courier, PaymentMethod } from '../types';
import { KARTAL_NEIGHBORHOODS } from '../constants';

// Mobile form için global type tanımı
declare global {
  interface Window {
    mobileForm: {
      name: string;
      phone: string;
      neighborhood: string;
      street: string;
      buildingNo: string;
      apartmentNo: string;
      note: string;
      paymentMethod: PaymentMethod | undefined;
    };
  }
}

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
      <div className="flex-1 flex flex-col bg-slate-100 min-h-0 order-2 lg:order-1">
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

      {/* Checkout Sidebar - Desktop only */}
      <div className="hidden lg:block lg:w-[420px] bg-gradient-to-b from-slate-50 to-white border-l border-slate-200 flex flex-col order-2">
        {/* Desktop Header */}
        <div className="p-6 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <i className="fas fa-shopping-cart text-indigo-600"></i>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sipariş Özeti</h2>
              <p className="text-sm text-slate-500">{totalItemsCount} ürün seçtiniz</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Cart Items */}
          {cart.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fas fa-shopping-basket text-3xl text-slate-400"></i>
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-1">Sepetiniz Boş</h3>
              <p className="text-sm text-slate-500">Ürün eklemek için kataloga göz atın</p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                  <i className="fas fa-box text-indigo-500"></i>
                  Sepet Ürünleri
                </h3>
                <div className="space-y-3">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                      <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl flex items-center justify-center">
                        <i className="fas fa-droplet text-indigo-600 text-lg"></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 truncate">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.quantity} adet × {item.price}₺</p>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-slate-900">{item.price * item.quantity}₺</p>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-xs text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <i className="fas fa-trash-alt"></i>
                          Sil
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Summary */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Toplam Tutar</p>
                    <p className="text-3xl font-black text-white">{totalAmount}₺</p>
                  </div>
                  <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center">
                    <i className="fas fa-receipt text-2xl text-white"></i>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleCompleteOrder} className="space-y-5">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                <i className="fas fa-truck text-indigo-600 text-sm"></i>
              </div>
              <h3 className="text-sm font-bold text-slate-700">Teslimat Bilgileri</h3>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block flex items-center gap-1.5">
                  <i className="fas fa-user text-indigo-500"></i> Ad Soyad *
                </label>
                <input
                  type="text"
                  placeholder="Adınız soyadınız"
                  className="w-full px-4 py-3 border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white rounded-xl text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all shadow-sm"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block flex items-center gap-1.5">
                  <i className="fas fa-phone text-indigo-500"></i> Telefon *
                </label>
                <input
                  type="tel"
                  placeholder="5XX XXX XX XX"
                  className="w-full px-4 py-3 border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white rounded-xl text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all shadow-sm"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block flex items-center gap-1.5">
                  <i className="fas fa-map-marker-alt text-indigo-500"></i> Mahalle *
                </label>
                <select
                  className="w-full px-4 py-3 border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white rounded-xl text-sm font-bold text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all appearance-none cursor-pointer shadow-sm"
                  value={formData.neighborhood}
                  onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                >
                  <option value="">Seçiniz</option>
                  {KARTAL_NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block flex items-center gap-1.5">
                  <i className="fas fa-building text-indigo-500"></i> Bina
                </label>
                <input
                  type="text"
                  placeholder="No"
                  className="w-full px-4 py-3 border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white rounded-xl text-sm font-bold text-slate-800 text-center placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all shadow-sm"
                  value={formData.buildingNo}
                  onChange={e => setFormData({...formData, buildingNo: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 mb-1.5 block flex items-center gap-1.5">
                  <i className="fas fa-door-open text-indigo-500"></i> Daire
                </label>
                <input
                  type="text"
                  placeholder="No"
                  className="w-full px-4 py-3 border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white rounded-xl text-sm font-bold text-slate-800 text-center placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all shadow-sm"
                  value={formData.apartmentNo}
                  onChange={e => setFormData({...formData, apartmentNo: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block flex items-center gap-1.5">
                <i className="fas fa-road text-indigo-500"></i> Sokak/Cadde/Apartman *
              </label>
              <input
                type="text"
                placeholder="Örn: Atatürk Cad. No:5 Apartman:Ahmet"
                className="w-full px-4 py-3 border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white rounded-xl text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all shadow-sm"
                value={formData.street}
                onChange={e => setFormData({...formData, street: e.target.value})}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1.5 block flex items-center gap-1.5">
                <i className="fas fa-sticky-note text-indigo-500"></i> Sipariş Notu
              </label>
              <textarea
                placeholder="Kapı zili, apartman kodu, kat bilgisi vb..."
                className="w-full px-4 py-3 border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white rounded-xl text-sm font-bold text-slate-800 placeholder:text-slate-400 resize-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 focus:outline-none transition-all shadow-sm"
                rows={2}
                value={formData.note}
                onChange={e => setFormData({...formData, note: e.target.value})}
              ></textarea>
            </div>

            {/* Payment */}
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-3 block flex items-center gap-2">
                <i className="fas fa-wallet text-slate-400"></i>
                Ödeme Yöntemi *
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({...formData, paymentMethod: PaymentMethod.CASH})}
                  className={`relative py-4 px-4 rounded-xl font-bold border-2 flex flex-col items-center gap-2 transition-all ${formData.paymentMethod === PaymentMethod.CASH ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50'}`}
                >
                  <span className="text-3xl">💵</span>
                  <span className="text-sm">Nakit</span>
                  {formData.paymentMethod === PaymentMethod.CASH && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <i className="fas fa-check text-emerald-600 text-xs"></i>
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({...formData, paymentMethod: PaymentMethod.POS})}
                  className={`relative py-4 px-4 rounded-xl font-bold border-2 flex flex-col items-center gap-2 transition-all ${formData.paymentMethod === PaymentMethod.POS ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/30' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50'}`}
                >
                  <span className="text-3xl">💳</span>
                  <span className="text-sm">Kredi Kartı / POS</span>
                  {formData.paymentMethod === PaymentMethod.POS && (
                    <span className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <i className="fas fa-check text-blue-600 text-xs"></i>
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={cart.length === 0 || isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-xl font-bold text-base hover:from-indigo-700 hover:via-indigo-800 hover:to-purple-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-600/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-3"
            >
              {isSubmitting ? (
                <>
                  <i className="fas fa-circle-notch fa-spin text-lg"></i>
                  <span>Sipariş İşleniyor...</span>
                </>
              ) : (
                <>
                  <i className="fas fa-check-circle text-lg"></i>
                  <span>Siparişi Onayla</span>
                  <span className="text-sm opacity-80">({totalAmount}₺)</span>
                </>
              )}
            </button>

            {/* Trust Badges */}
            <div className="flex items-center justify-center gap-4 pt-4">
              <div className="flex items-center gap-2 text-slate-400">
                <i className="fas fa-shield-alt text-emerald-500"></i>
                <span className="text-xs">Güvenli Ödeme</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <i className="fas fa-truck text-blue-500"></i>
                <span className="text-xs">Hızlı Teslimat</span>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Checkout Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-40 order-3">
        {cart.length === 0 ? (
          <div className="text-center text-slate-500 text-sm">
            Sepetiniz boş
          </div>
        ) : (
          <button
            onClick={() => {
              const modal = document.createElement('div');
              modal.className = 'fixed inset-0 z-50 flex';
              modal.innerHTML = `
                <div class="absolute inset-0 bg-black/50" onclick="this.closest('.fixed').remove()"></div>
                <div class="relative w-full h-full bg-white flex flex-col overflow-hidden animate-in slide-in-from-bottom-4">
                  <div class="flex items-center justify-between p-4 border-b">
                    <h2 class="text-lg font-bold">Sipariş Özeti</h2>
                    <button onclick="this.closest('.fixed').remove()" class="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                      <i class="fas fa-times"></i>
                    </button>
                  </div>
                  <div class="flex-1 overflow-y-auto p-4 space-y-4" id="modal-content">
                    <!-- Form will be rendered here -->
                  </div>
                </div>
              `;
              document.body.appendChild(modal);
              const content = modal.querySelector('#modal-content');
              content.innerHTML = `
                <!-- Cart Items Section -->
                <div class="mb-6">
                  <div class="flex items-center gap-2 mb-3">
                    <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <i class="fas fa-box text-indigo-600 text-sm"></i>
                    </div>
                    <h3 class="text-sm font-bold text-slate-700">Sepet Ürünleri</h3>
                  </div>
                  <div class="space-y-2">
                    ${cart.map(item => `
                      <div class="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-100">
                        <div class="w-12 h-12 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-xl flex items-center justify-center">
                          <i class="fas fa-droplet text-indigo-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                          <p class="text-sm font-bold text-slate-900 truncate">${item.name}</p>
                          <p class="text-xs text-slate-500">${item.quantity} adet × ${item.price}₺</p>
                        </div>
                        <div class="text-right">
                          <p class="text-base font-black text-slate-900">${item.price * item.quantity}₺</p>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                </div>

                <!-- Total Summary Card -->
                <div class="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-4 shadow-lg mb-6">
                  <div class="flex items-center justify-between">
                    <div>
                      <p class="text-xs text-slate-400 uppercase tracking-wider mb-1">Toplam Tutar</p>
                      <p class="text-2xl font-black text-white">${totalAmount}₺</p>
                    </div>
                    <div class="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                      <i class="fas fa-receipt text-xl text-white"></i>
                    </div>
                  </div>
                </div>

                <!-- Form Section -->
                <form class="space-y-4" onsubmit="event.preventDefault(); document.querySelector('.checkout-submit').click();">
                  <!-- Delivery Header -->
                  <div class="flex items-center gap-2 pb-2 border-b border-slate-200">
                    <div class="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <i class="fas fa-truck text-indigo-600 text-sm"></i>
                    </div>
                    <h3 class="text-sm font-bold text-slate-700">Teslimat Bilgileri</h3>
                  </div>

                  <!-- Name & Phone -->
                  <div class="space-y-3">
                    <div>
                      <label class="text-xs font-semibold text-slate-500 mb-1.5 block flex items-center gap-1">
                        <i class="fas fa-user text-slate-400 text-xs"></i> Ad Soyad *
                      </label>
                      <input type="text" placeholder="Adınız soyadınız" class="mobile-input" value="${formData.name}" oninput="window.mobileForm.name = this.value">
                    </div>
                    <div>
                      <label class="text-xs font-semibold text-slate-500 mb-1.5 block flex items-center gap-1">
                        <i class="fas fa-phone text-slate-400 text-xs"></i> Telefon *
                      </label>
                      <input type="tel" placeholder="5XX XXX XX XX" class="mobile-input" value="${formData.phone}" oninput="window.mobileForm.phone = this.value">
                    </div>
                  </div>

                  <!-- Address Row -->
                  <div>
                    <label class="text-xs font-semibold text-slate-500 mb-1.5 block flex items-center gap-1">
                      <i class="fas fa-map-marker-alt text-slate-400 text-xs"></i> Adres *
                    </label>
                    <div class="grid grid-cols-3 gap-2">
                      <select class="mobile-input" onchange="window.mobileForm.neighborhood = this.value">
                        <option value="">Mahalle</option>
                        ${KARTAL_NEIGHBORHOODS.map(n => `<option value="${n}" ${formData.neighborhood === n ? 'selected' : ''}>${n}</option>`).join('')}
                      </select>
                      <input type="text" placeholder="Bina No" class="mobile-input text-center" value="${formData.buildingNo}" oninput="window.mobileForm.buildingNo = this.value">
                      <input type="text" placeholder="Daire No" class="mobile-input text-center" value="${formData.apartmentNo}" oninput="window.mobileForm.apartmentNo = this.value">
                    </div>
                  </div>

                  <div>
                    <input type="text" placeholder="Sokak / Cadde / Apartman adı *" class="mobile-input" value="${formData.street}" oninput="window.mobileForm.street = this.value">
                  </div>

                  <!-- Note -->
                  <div>
                    <label class="text-xs font-semibold text-slate-500 mb-1.5 block flex items-center gap-1">
                      <i class="fas fa-sticky-note text-slate-400 text-xs"></i> Sipariş Notu
                    </label>
                    <textarea placeholder="Kapı zili, apartman kodu, kat bilgisi..." class="mobile-input" rows="2" oninput="window.mobileForm.note = this.value">${formData.note}</textarea>
                  </div>

                  <!-- Payment Method -->
                  <div>
                    <label class="text-xs font-semibold text-slate-500 mb-3 block flex items-center gap-2">
                      <i class="fas fa-wallet text-slate-400"></i> Ödeme Yöntemi *
                    </label>
                    <div class="grid grid-cols-2 gap-3">
                      <button type="button" class="mobile-pay-btn ${formData.paymentMethod === 'CASH' ? 'selected' : ''}" data-method="CASH">
                        <span class="text-2xl">💵</span>
                        <span class="text-xs font-bold">Nakit</span>
                      </button>
                      <button type="button" class="mobile-pay-btn ${formData.paymentMethod === 'POS' ? 'selected' : ''}" data-method="POS">
                        <span class="text-2xl">💳</span>
                        <span class="text-xs font-bold">Kredi Kartı</span>
                      </button>
                    </div>
                  </div>

                  <!-- Submit Button -->
                  <button type="submit" class="checkout-submit w-full py-4 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white rounded-xl font-bold text-base shadow-xl shadow-indigo-500/30 flex items-center justify-center gap-2">
                    <i class="fas fa-check-circle"></i>
                    <span>Siparişi Onayla</span>
                    <span class="text-sm opacity-80">(${totalAmount}₺)</span>
                  </button>

                  <!-- Trust Badges -->
                  <div class="flex items-center justify-center gap-4 pt-2">
                    <div class="flex items-center gap-1.5 text-slate-400">
                      <i class="fas fa-shield-alt text-emerald-500 text-xs"></i>
                      <span class="text-xs">Güvenli</span>
                    </div>
                    <div class="flex items-center gap-1.5 text-slate-400">
                      <i class="fas fa-truck text-blue-500 text-xs"></i>
                      <span class="text-xs">Hızlı</span>
                    </div>
                  </div>
                </form>
              `;
              modal.querySelectorAll('.mobile-input').forEach(el => {
                el.style.cssText = 'width: 100%; padding: 12px 14px; border: 2px solid rgb(199 210 254); background: linear-gradient(to bottom right, rgb(238 242 255), white); border-radius: 12px; font-size: 14px; font-weight: 700; color: rgb(30 41 59); box-shadow: 0 1px 2px rgb(0 0 0 / 0.05); outline: none;';
                el.addEventListener('focus', () => {
                  el.style.borderColor = 'rgb(99 102 241)';
                  el.style.boxShadow = '0 0 0 3px rgb(199 210 254 / 0.5)';
                });
                el.addEventListener('blur', () => {
                  el.style.borderColor = 'rgb(199 210 254)';
                  el.style.boxShadow = '0 1px 2px rgb(0 0 0 / 0.05)';
                });
              });
              modal.querySelectorAll('.mobile-pay-btn').forEach(btn => {
                const method = btn.getAttribute('data-method');
                const isSelected = formData.paymentMethod === (method === 'CASH' ? PaymentMethod.CASH : PaymentMethod.POS);
                // Base styles
                btn.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px; border-radius: 12px; border: 2px solid; font-weight: 700; cursor: pointer; transition: all 0.2s; position: relative;';
                if (isSelected) {
                  const selectedMethod = method === 'CASH' ? PaymentMethod.CASH : PaymentMethod.POS;
                  window.mobileForm.paymentMethod = selectedMethod;
                  if (method === 'CASH') {
                    btn.style.cssText += 'background: linear-gradient(to bottom right, #10b981, #059669); border-color: #10b981; color: white; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);';
                  } else {
                    btn.style.cssText += 'background: linear-gradient(to bottom right, #3b82f6, #2563eb); border-color: #3b82f6; color: white; box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);';
                  }
                  btn.innerHTML = `
                    <span style="font-size: 24px;">${method === 'CASH' ? '💵' : '💳'}</span>
                    <span style="font-size: 12px; font-weight: 700;">${method === 'CASH' ? 'Nakit' : 'Kredi Kartı'}</span>
                    <span style="position: absolute; top: 8px; right: 8px; width: 20px; height: 20px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                      <i class="fas fa-check ${method === 'CASH' ? 'text-emerald-600' : 'text-blue-600'}" style="font-size: 10px;"></i>
                    </span>
                  `;
                } else {
                  btn.style.cssText += 'background: white; border-color: rgb(226 232 240); color: rgb(71 85 105);';
                  btn.innerHTML = `
                    <span style="font-size: 24px;">${method === 'CASH' ? '💵' : '💳'}</span>
                    <span style="font-size: 12px; font-weight: 700;">${method === 'CASH' ? 'Nakit' : 'Kredi Kartı'}</span>
                  `;
                }
                btn.onclick = () => {
                  const selectedMethod = method === 'CASH' ? PaymentMethod.CASH : PaymentMethod.POS;
                  window.mobileForm.paymentMethod = selectedMethod;
                  // Butonların görsel güncellemesi
                  modal.querySelectorAll('.mobile-pay-btn').forEach(b => {
                    const m = b.getAttribute('data-method');
                    b.style.cssText = 'display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px; border-radius: 12px; border: 2px solid; font-weight: 700; cursor: pointer; transition: all 0.2s; position: relative;';
                    if (m === method) {
                      if (method === 'CASH') {
                        b.style.cssText += 'background: linear-gradient(to bottom right, #10b981, #059669); border-color: #10b981; color: white; box-shadow: 0 10px 15px -3px rgba(16, 185, 129, 0.3);';
                      } else {
                        b.style.cssText += 'background: linear-gradient(to bottom right, #3b82f6, #2563eb); border-color: #3b82f6; color: white; box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);';
                      }
                      b.innerHTML = `
                        <span style="font-size: 24px;">${method === 'CASH' ? '💵' : '💳'}</span>
                        <span style="font-size: 12px; font-weight: 700;">${method === 'CASH' ? 'Nakit' : 'Kredi Kartı'}</span>
                        <span style="position: absolute; top: 8px; right: 8px; width: 20px; height: 20px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                          <i class="fas fa-check ${method === 'CASH' ? 'text-emerald-600' : 'text-blue-600'}" style="font-size: 10px;"></i>
                        </span>
                      `;
                    } else {
                      b.style.cssText += 'background: white; border-color: rgb(226 232 240); color: rgb(71 85 105);';
                      b.innerHTML = `
                        <span style="font-size: 24px;">${m === 'CASH' ? '💵' : '💳'}</span>
                        <span style="font-size: 12px; font-weight: 700;">${m === 'CASH' ? 'Nakit' : 'Kredi Kartı'}</span>
                      `;
                    }
                  });
                };
              });
              modal.querySelector('form').onsubmit = (e) => {
                e.preventDefault();
                const form = window.mobileForm;
                if (!form.name || !form.phone || !form.neighborhood || !form.street || !form.paymentMethod) {
                  alert('Lütfen tüm zorunlu alanları doldurun.');
                  return;
                }
                // State'i güncelle
                setFormData({
                  name: form.name,
                  phone: form.phone,
                  neighborhood: form.neighborhood,
                  street: form.street,
                  buildingNo: form.buildingNo || '',
                  apartmentNo: form.apartmentNo || '',
                  note: form.note || '',
                  paymentMethod: form.paymentMethod
                });
                // Doğrudan siparişi oluştur ve gönder
                const matchedCourier = couriers.find(c => c.status === 'active') || couriers[0];

                const customerDetails: Customer = {
                  id: 'cust_' + Date.now(),
                  name: form.name,
                  phone: form.phone,
                  district: 'KARTAL',
                  neighborhood: form.neighborhood,
                  street: form.street,
                  buildingNo: form.buildingNo,
                  apartmentNo: form.apartmentNo,
                  lastNote: form.note,
                  orderCount: 1
                };

                const order: Order = {
                  id: '',
                  customerId: customerDetails.id,
                  customerName: form.name,
                  phone: form.phone,
                  address: `KARTAL, ${form.neighborhood}, ${form.street} No:${form.buildingNo} D:${form.apartmentNo}`,
                  items: cart.map(i => ({ productId: i.id, productName: i.name, quantity: i.quantity, price: i.price })),
                  totalAmount,
                  courierId: matchedCourier.id,
                  courierName: matchedCourier.name,
                  status: OrderStatus.PENDING,
                  source: OrderSource.WEB,
                  note: form.note,
                  paymentMethod: form.paymentMethod,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                };

                addOrder(order, customerDetails);
                setCart([]);
                setFormData({ name: '', phone: '', neighborhood: '', street: '', buildingNo: '', apartmentNo: '', note: '', paymentMethod: undefined });
                alert('Siparişiniz alındı! En kısa sürede teslim edilecektir.');
                modal.remove();
              };
              window.mobileForm = {
                name: formData.name,
                phone: formData.phone,
                neighborhood: formData.neighborhood,
                street: formData.street,
                buildingNo: formData.buildingNo,
                apartmentNo: formData.apartmentNo,
                note: formData.note,
                paymentMethod: formData.paymentMethod
              };
            }}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center justify-between px-6 hover:bg-indigo-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <i className="fas fa-shopping-bag"></i>
              </div>
              <div className="text-left">
                <div className="text-xs opacity-80">{totalItemsCount} ürün</div>
                <div className="font-black">{totalAmount}₺</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              Siparişi Tamamla
              <i className="fas fa-arrow-right"></i>
            </div>
          </button>
        )}
      </div>
    </div>
  );
};

export default CustomerOrderPage;
