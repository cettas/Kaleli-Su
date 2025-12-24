
import React, { useState, useMemo, useRef } from 'react';
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

interface FormErrors {
  name?: string;
  phone?: string;
  neighborhood?: string;
  street?: string;
  paymentMethod?: string;
}

const CustomerOrderPage: React.FC<CustomerOrderPageProps> = ({ inventory, categories, addOrder, couriers }) => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [formErrors, setFormErrors] = useState<FormErrors>({});

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

  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    if (!formData.name.trim()) errors.name = 'İsim gerekli';
    if (!formData.phone.trim()) errors.phone = 'Telefon gerekli';
    else if (formData.phone.replace(/\D/g, '').length < 10) errors.phone = 'Geçerli telefon girin';
    if (!formData.neighborhood) errors.neighborhood = 'Mahalle seçin';
    if (!formData.street.trim()) errors.street = 'Adres gerekli';
    if (!formData.paymentMethod) errors.paymentMethod = 'Ödeme yöntemi seçin';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldBlur = (fieldName: string) => {
    setTouchedFields(prev => new Set([...prev, fieldName]));
  };

  const getFieldError = (fieldName: string): string | undefined => {
    return touchedFields.has(fieldName) ? formErrors[fieldName as keyof FormErrors] : undefined;
  };

  const isFieldValid = (fieldName: string): boolean | undefined => {
    if (!touchedFields.has(fieldName)) return undefined;
    return !formErrors[fieldName as keyof FormErrors];
  };

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItemsCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouchedFields(new Set(['name', 'phone', 'neighborhood', 'street', 'paymentMethod']));
    if (!validateForm() || cart.length === 0) return;
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
    setShowCheckout(false);
    alert('Siparişiniz alındı! En kısa sürede teslim edilecektir.');
  };

  return (
    <div className="h-full flex flex-col bg-slate-100">
      {/* Header */}
      <header className="bg-white px-4 py-3 shadow-sm flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
            <i className="fas fa-droplet text-white"></i>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">KALELİ SU</h1>
            <p className="text-[10px] text-indigo-600 font-semibold">Kapınıza Gelsin</p>
          </div>
        </div>
        <button
          onClick={() => setShowCheckout(true)}
          className="relative bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
        >
          <i className="fas fa-shopping-bag"></i>
          <span>{totalAmount}₺</span>
          {cart.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-white text-xs flex items-center justify-center">
              {totalItemsCount}
            </span>
          )}
        </button>
      </header>

      {/* Categories */}
      <div className="bg-white px-4 py-2 flex gap-2 overflow-x-auto border-b">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${activeCategory === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          Tümü
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${activeCategory === cat.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            <i className={`fas fa-${cat.icon} text-xs`}></i>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Products */}
      <div className="flex-1 overflow-y-auto p-3 pb-20">
        {activeProducts.length === 0 ? (
          <div className="text-center py-20">
            <i className="fas fa-box-open text-4xl text-slate-300 mb-3"></i>
            <p className="text-slate-500">Ürün bulunamadı</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {activeProducts.map(item => {
              const inCart = cart.find(i => i.id === item.id);
              const category = categories.find(c => c.id === item.category);
              return (
                <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <div className="aspect-square bg-slate-50 flex items-center justify-center p-4 relative">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" />
                    ) : (
                      <i className={`fas fa-${category?.icon || 'droplet'} text-5xl text-indigo-200`}></i>
                    )}
                    <div className="absolute top-2 right-2 bg-white px-2 py-1 rounded-lg shadow">
                      <span className="text-sm font-bold">{item.salePrice}₺</span>
                    </div>
                  </div>
                  <div className="p-3">
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
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm"
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

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold">Sipariş Özeti</h2>
              <button onClick={() => setShowCheckout(false)} className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Cart Items */}
              <div>
                <h3 className="text-sm font-bold text-slate-700 mb-2">Sepet ({totalItemsCount} ürün)</h3>
                {cart.map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2 border-b">
                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                      <i className="fas fa-droplet text-indigo-400"></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.quantity} adet</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{item.price * item.quantity}₺</p>
                      <button onClick={() => removeFromCart(item.id)} className="text-xs text-rose-500">Sil</button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center py-3 bg-slate-900 text-white rounded-xl px-4 mt-3">
                  <span className="font-bold">Toplam</span>
                  <span className="text-xl font-black">{totalAmount}₺</span>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleCompleteOrder} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Adınız Soyadınız"
                    className="w-full px-4 py-3 border-2 rounded-xl text-sm font-bold"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="Telefon Numaranız"
                    className="w-full px-4 py-3 border-2 rounded-xl text-sm font-bold"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 mb-1 block">Mahalle</label>
                  <select
                    className="w-full px-4 py-3 border-2 rounded-xl text-sm font-bold bg-white"
                    value={formData.neighborhood}
                    onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                  >
                    <option value="">Seçiniz</option>
                    {KARTAL_NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                <div>
                  <input
                    type="text"
                    placeholder="Sokak / Cadde / Apartman"
                    className="w-full px-4 py-3 border-2 rounded-xl text-sm font-bold"
                    value={formData.street}
                    onChange={e => setFormData({...formData, street: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Bina No"
                    className="w-full px-4 py-3 border-2 rounded-xl text-sm font-bold text-center"
                    value={formData.buildingNo}
                    onChange={e => setFormData({...formData, buildingNo: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="Daire No"
                    className="w-full px-4 py-3 border-2 rounded-xl text-sm font-bold text-center"
                    value={formData.apartmentNo}
                    onChange={e => setFormData({...formData, apartmentNo: e.target.value})}
                  />
                </div>

                <div>
                  <textarea
                    placeholder="Not (opsiyonel)"
                    className="w-full px-4 py-3 border-2 rounded-xl text-sm resize-none"
                    rows={2}
                    value={formData.note}
                    onChange={e => setFormData({...formData, note: e.target.value})}
                  ></textarea>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 mb-2 block">Ödeme Yöntemi</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, paymentMethod: PaymentMethod.CASH})}
                      className={`py-4 rounded-xl font-bold border-2 flex flex-col items-center gap-1 ${formData.paymentMethod === PaymentMethod.CASH ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-200'}`}
                    >
                      <span className="text-xl">💵</span>
                      Nakit
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, paymentMethod: PaymentMethod.POS})}
                      className={`py-4 rounded-xl font-bold border-2 flex flex-col items-center gap-1 ${formData.paymentMethod === PaymentMethod.POS ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-200'}`}
                    >
                      <span className="text-xl">💳</span>
                      POS
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={cart.length === 0 || isSubmitting}
                  className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'İşleniyor...' : 'Siparişi Onayla'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrderPage;
