
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { InventoryItem, Category, Order, OrderStatus, OrderSource, Customer, Courier, PaymentMethod } from '../types';
import { KARTAL_NEIGHBORHOODS } from '../constants';

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
  const [step, setStep] = useState<'browse' | 'checkout' | 'success'>('browse');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const checkoutRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    neighborhood: '',
    street: '',
    buildingNo: '',
    apartmentNo: '',
    note: '',
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
        setCartBounce(true);
        setTimeout(() => setCartBounce(false), 400);
        return [...prev, { id: item.id, name: item.name, quantity: delta, price: item.salePrice, imageUrl: item.imageUrl, categoryId: item.category }];
      }
      return prev;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  // Form doğrulama
  const validateForm = (): boolean => {
    const errors: FormErrors = {};
    if (!formData.name.trim()) errors.name = 'İsim gerekli';
    if (!formData.phone.trim()) errors.phone = 'Telefon gerekli';
    else if (formData.phone.replace(/\D/g, '').length < 10) errors.phone = 'Geçerli telefon girin';
    if (!formData.neighborhood) errors.neighborhood = 'Mahalle seçin';
    if (!formData.street.trim()) errors.street = 'Ades gerekli';
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

    // Tüm alanları touched olarak işaretle
    setTouchedFields(new Set(['name', 'phone', 'neighborhood', 'street', 'paymentMethod']));

    if (!validateForm() || cart.length === 0) return;
    if (isSubmitting) return;

    setIsSubmitting(true);

    // Küçük gecikme ile kullanıcıya feedback ver
    await new Promise(resolve => setTimeout(resolve, 600));

    const matchedCourier = couriers.find(c =>
      c.status === 'active' &&
      formData.neighborhood &&
      c.serviceRegion?.toLowerCase().includes(formData.neighborhood.toLowerCase())
    ) || couriers.find(c => c.status === 'active') || couriers[0];

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
    setStep('success');
  };

  const resetOrderProcess = () => {
    setCart([]);
    setStep('browse');
    setTouchedFields(new Set());
    setFormErrors({});
    setIsSubmitting(false);
    setFormData({
      name: '',
      phone: '',
      neighborhood: '',
      street: '',
      buildingNo: '',
      apartmentNo: '',
      note: '',
      paymentMethod: undefined
    });
  };

  if (step === 'success') {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white">
        <div className="text-center space-y-8 max-w-lg animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Success Icon Animation */}
          <div className="relative mx-auto w-32 h-32">
            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-20"></div>
            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-pulse opacity-30"></div>
            <div className="relative w-32 h-32 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/50">
              <i className="fas fa-check text-5xl animate-in zoom-in duration-500"></i>
            </div>
            {/* Particles */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-bounce delay-100"></div>
            <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-blue-400 rounded-full animate-bounce delay-300"></div>
            <div className="absolute top-1/2 -right-4 w-3 h-3 bg-pink-400 rounded-full animate-bounce delay-500"></div>
          </div>

          <div className="space-y-4">
            <h2 className="text-3xl font-black tracking-tight uppercase leading-none">SİPARİŞİNİZ ALINDI!</h2>
            <div className="space-y-2">
               <p className="text-base font-bold text-emerald-400">Taze suyunuz en kısa sürede kapınızda</p>
               <p className="text-xs font-medium text-slate-400 leading-relaxed max-w-sm mx-auto">
                 Siparişiniz bölgenizdeki kuryemize iletildi. Hazırlanıp yola çıkmasıyla birlikte sizi bilgilendireceğiz.
               </p>
            </div>
          </div>

          {/* Order Summary */}
          {cart.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Sipariş Özeti</div>
              <div className="flex justify-center items-center gap-3">
                <span className="text-2xl font-black">{totalAmount}₺</span>
                <span className="text-slate-500">•</span>
                <span className="text-sm font-bold text-slate-300">{totalItemsCount} Ürün</span>
              </div>
            </div>
          )}

          <button
             onClick={resetOrderProcess}
             className="w-full py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-3xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-900/50 hover:shadow-2xl hover:shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
           >
             YENİ SİPARİŞ VER
           </button>

          <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Bizi tercih ettiğiniz için teşekkürler</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50 overflow-hidden lg:flex-row">
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Header with Cart */}
        <header className="sticky top-0 z-50 px-4 lg:px-8 py-4 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <i className="fas fa-droplet text-white text-sm"></i>
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase leading-none">TAZE SU</h1>
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.2em]">Kapınıza Gelsin</p>
              </div>
            </div>

            {/* Categories */}
            <div className="hidden lg:flex items-center gap-2">
              <button
                onClick={() => setActiveCategory('all')}
                className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${activeCategory === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
              >
                Tümü
              </button>
              {categories.slice(0, 4).map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2 ${activeCategory === cat.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  <i className={`fas fa-${cat.icon}`}></i>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Cart Button - Desktop */}
            <div className="hidden lg:flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sepet Tutarı</div>
                <div className="text-lg font-black text-slate-900">{totalAmount}₺</div>
              </div>
              <button
                onClick={() => setStep('checkout')}
                disabled={cart.length === 0}
                className={`relative px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${cart.length > 0 ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 hover:scale-105' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
              >
                <i className="fas fa-arrow-right mr-2"></i>
                Ödemeye Geç
                {cart.length > 0 && (
                  <span className={`absolute -top-2 -right-2 w-6 h-6 bg-rose-500 rounded-full text-white text-[10px] font-black flex items-center justify-center border-2 border-white ${cartBounce ? 'animate-bounce' : ''}`}>
                    {totalItemsCount}
                  </span>
                )}
              </button>
            </div>

            {/* Cart Button - Mobile */}
            <div className="lg:hidden">
              <button
                onClick={() => setStep('checkout')}
                disabled={cart.length === 0}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all ${cart.length > 0 ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-100 text-slate-300'}`}
              >
                <i className="fas fa-shopping-bag"></i>
                <span>{totalAmount}₺</span>
                {cart.length > 0 && (
                  <span className={`absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 rounded-full text-white text-[9px] font-black flex items-center justify-center border-2 border-white ${cartBounce ? 'animate-bounce' : ''}`}>
                    {totalItemsCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Categories */}
          <div className="lg:hidden flex items-center gap-2 mt-4 overflow-x-auto scrollbar-hide pb-1 -mx-4 px-4">
            <button
              onClick={() => setActiveCategory('all')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${activeCategory === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}
            >
              Tümü
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all flex items-center gap-2 ${activeCategory === cat.id ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}
              >
                <i className={`fas fa-${cat.icon}`}></i>
                {cat.label}
              </button>
            ))}
          </div>
        </header>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth pb-32 lg:pb-8">
          <div className="max-w-7xl mx-auto">
            {/* Empty State */}
            {activeProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
                  <i className="fas fa-box-open text-4xl text-slate-300"></i>
                </div>
                <h3 className="text-lg font-black text-slate-700 uppercase mb-2">Ürün Bulunamadı</h3>
                <p className="text-sm text-slate-500">Bu kategoride ürün bulunmuyor.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 lg:gap-6">
                {activeProducts.map(item => {
                  const inCart = cart.find(i => i.id === item.id);
                  const category = categories.find(c => c.id === item.category);
                  return (
                    <div
                      key={item.id}
                      className="group bg-white rounded-3xl border border-slate-100 flex flex-col shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all duration-300 overflow-hidden"
                    >
                      {/* Product Image */}
                      <div className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 relative flex items-center justify-center overflow-hidden p-6">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <i className={`fas fa-${category?.icon || 'droplet'} text-6xl text-indigo-200`}></i>
                        )}
                        {/* Price Badge */}
                        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-md">
                          <span className="text-sm font-black text-slate-900">{item.salePrice}₺</span>
                        </div>
                        {/* Category Badge */}
                        {category && (
                          <div className="absolute top-3 left-3 bg-indigo-100/90 backdrop-blur-sm px-2.5 py-1 rounded-lg">
                            <i className={`fas fa-${category.icon} text-indigo-600 text-xs`}></i>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-4 lg:p-5 flex flex-col flex-1">
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight mb-4 leading-tight flex-1">
                          {item.name}
                        </h3>

                        {/* Add to Cart / Quantity Control */}
                        <div className="flex items-center gap-2">
                          {inCart ? (
                            <div className="flex items-center gap-1 bg-slate-900 rounded-2xl p-1 w-full">
                              <button
                                onClick={() => updateCart(item, -1)}
                                className="w-9 h-9 rounded-xl bg-white/10 text-white font-black hover:bg-white/20 transition-all flex items-center justify-center"
                              >
                                <i className="fas fa-minus text-xs"></i>
                              </button>
                              <span className="text-sm font-black text-white flex-1 text-center">{inCart.quantity}</span>
                              <button
                                onClick={() => updateCart(item, 1)}
                                className="w-9 h-9 rounded-xl bg-indigo-500 text-white font-black transition-all flex items-center justify-center"
                              >
                                <i className="fas fa-plus text-xs"></i>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => updateCart(item, 1)}
                              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                              <i className="fas fa-plus"></i>
                              SEPETE EKLE
                            </button>
                          )}
                        </div>
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
      <aside
        ref={checkoutRef}
        className={`
          ${step === 'checkout' ? 'fixed inset-0 z-[200] flex' : 'hidden'}
          lg:static lg:flex lg:w-[420px] lg:border-l lg:border-slate-200 flex-col shrink-0 bg-white
        `}
      >
        {/* Mobile Backdrop */}
        {step === 'checkout' && (
          <div
            className="lg:hidden absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setStep('browse')}
          ></div>
        )}

        {/* Checkout Panel */}
        <div className={`
          ${step === 'checkout' ? 'relative' : 'hidden lg:flex'}
          lg:relative lg:flex w-full lg:w-auto h-full flex-col bg-white lg:animate-none
          animate-in slide-in-from-right-full lg:slide-in-from-none duration-300
        `}>
          {/* Checkout Header */}
          <div className="flex items-center justify-between p-4 lg:p-6 border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <i className="fas fa-credit-card text-white text-sm"></i>
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 tracking-tight uppercase leading-none">ÖDEME</h2>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">Siparişinizi tamamlayın</p>
              </div>
            </div>
            <button
              onClick={() => setStep('browse')}
              className="lg:hidden w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Checkout Content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
            {/* Cart Items */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sepetiniz</h3>
                <span className="text-xs font-black text-indigo-600">{totalItemsCount} Ürün</span>
              </div>

              {cart.length === 0 ? (
                <div className="bg-slate-50 rounded-2xl p-6 text-center">
                  <i className="fas fa-shopping-basket text-3xl text-slate-300 mb-3"></i>
                  <p className="text-xs font-black text-slate-500">Sepetiniz boş</p>
                  <button
                    onClick={() => setStep('browse')}
                    className="mt-3 text-xs font-black text-indigo-600 hover:text-indigo-700"
                  >
                    Alışverişe Dön
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {cart.map(item => {
                    const category = categories.find(c => c.id === item.categoryId);
                    return (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl group">
                        <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-indigo-200 shadow-sm">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain rounded-lg p-1" />
                          ) : (
                            <i className={`fas fa-${category?.icon || 'droplet'} text-lg`}></i>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-slate-900 uppercase truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-500">{item.quantity} adet</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">{item.price * item.quantity}₺</p>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-[9px] font-black text-rose-500 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            Kaldır
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Total */}
              {cart.length > 0 && (
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-5 mt-4 shadow-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Toplam Tutar</div>
                      <div className="text-2xl font-black text-white mt-1">{totalAmount}₺</div>
                    </div>
                    {formData.paymentMethod && (
                      <div className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase ${
                        formData.paymentMethod === PaymentMethod.CASH ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        formData.paymentMethod === PaymentMethod.POS ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}>
                        {formData.paymentMethod === PaymentMethod.CASH ? '💵 Nakit' :
                         formData.paymentMethod === PaymentMethod.POS ? '💳 POS' :
                         '❌ Alınmadı'}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Delivery Form */}
            <form onSubmit={handleCompleteOrder} className="space-y-4">
              {/* Contact Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <i className="fas fa-user-circle text-indigo-500"></i>
                  <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">İletişim Bilgileri</h3>
                </div>

                {/* Name Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ADINIZ SOYADINIZ"
                    className={`w-full px-4 py-3 pr-10 rounded-xl text-xs font-bold uppercase border-2 outline-none transition-all ${
                      getFieldError('name')
                        ? 'bg-rose-50 border-rose-300 text-rose-700 placeholder-rose-400'
                        : isFieldValid('name')
                        ? 'bg-emerald-50 border-emerald-300 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400 focus:bg-white'
                    }`}
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    onBlur={() => handleFieldBlur('name')}
                  />
                  {isFieldValid('name') && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-xs">
                      <i className="fas fa-check-circle"></i>
                    </span>
                  )}
                  {getFieldError('name') && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 text-xs">
                      <i className="fas fa-exclamation-circle"></i>
                    </span>
                  )}
                  {getFieldError('name') && (
                    <p className="text-[9px] font-black text-rose-500 uppercase mt-1">{getFieldError('name')}</p>
                  )}
                </div>

                {/* Phone Input */}
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="TELEFON NUMARASI"
                    className={`w-full px-4 py-3 pr-10 rounded-xl text-xs font-bold border-2 outline-none transition-all ${
                      getFieldError('phone')
                        ? 'bg-rose-50 border-rose-300 text-rose-700 placeholder-rose-400'
                        : isFieldValid('phone')
                        ? 'bg-emerald-50 border-emerald-300 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-indigo-600 focus:border-indigo-400 focus:bg-white'
                    }`}
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    onBlur={() => handleFieldBlur('phone')}
                  />
                  {isFieldValid('phone') && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-xs">
                      <i className="fas fa-check-circle"></i>
                    </span>
                  )}
                  {getFieldError('phone') && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-500 text-xs">
                      <i className="fas fa-exclamation-circle"></i>
                    </span>
                  )}
                  {getFieldError('phone') && (
                    <p className="text-[9px] font-black text-rose-500 uppercase mt-1">{getFieldError('phone')}</p>
                  )}
                </div>
              </div>

              {/* Address Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-map-marker-alt text-indigo-500"></i>
                    <h3 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Teslimat Adresi</h3>
                  </div>
                  <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase">KARTAL</span>
                </div>

                {/* Favorite Neighborhoods */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Favori Mahalleler</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {FAVORITE_NEIGHBORHOODS.slice(0, 8).map(fav => (
                      <button
                        key={fav}
                        type="button"
                        onClick={() => setFormData({...formData, neighborhood: fav})}
                        className={`py-2 px-1 rounded-lg text-[9px] font-black uppercase tracking-tight border transition-all ${
                          formData.neighborhood === fav
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                      >
                        {fav}
                      </button>
                    ))}
                  </div>
                </div>

                {/* All Neighborhoods Select */}
                <div className="relative">
                  <select
                    className={`w-full px-4 py-3 rounded-xl text-[10px] font-bold uppercase border-2 outline-none appearance-none transition-all cursor-pointer ${
                      getFieldError('neighborhood')
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : formData.neighborhood
                        ? 'bg-emerald-50 border-emerald-300 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-indigo-400'
                    }`}
                    value={formData.neighborhood}
                    onChange={e => setFormData({...formData, neighborhood: e.target.value})}
                    onBlur={() => handleFieldBlur('neighborhood')}
                  >
                    <option value="">MAHALLE SEÇİN</option>
                    {KARTAL_NEIGHBORHOODS.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <i className="fas fa-chevron-down text-xs"></i>
                  </span>
                  {getFieldError('neighborhood') && (
                    <p className="text-[9px] font-black text-rose-500 uppercase mt-1">{getFieldError('neighborhood')}</p>
                  )}
                </div>

                {/* Street Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="SOKAK / CADDE / APARTMAN ADI"
                    className={`w-full px-4 py-3 pr-10 rounded-xl text-[10px] font-bold uppercase border-2 outline-none transition-all ${
                      getFieldError('street')
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : isFieldValid('street')
                        ? 'bg-emerald-50 border-emerald-300 text-slate-900'
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-400'
                    }`}
                    value={formData.street}
                    onChange={e => setFormData({...formData, street: e.target.value})}
                    onBlur={() => handleFieldBlur('street')}
                  />
                  {isFieldValid('street') && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 text-xs">
                      <i className="fas fa-check-circle"></i>
                    </span>
                  )}
                  {getFieldError('street') && (
                    <p className="text-[9px] font-black text-rose-500 uppercase mt-1">{getFieldError('street')}</p>
                  )}
                </div>

                {/* Building and Apartment */}
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="BİNA NO"
                    className="w-full px-4 py-3 rounded-xl text-xs font-bold text-center border-2 border-slate-200 bg-slate-50 outline-none focus:border-indigo-400 focus:bg-white transition-all"
                    value={formData.buildingNo}
                    onChange={e => setFormData({...formData, buildingNo: e.target.value})}
                  />
                  <input
                    type="text"
                    placeholder="DAİRE NO"
                    className="w-full px-4 py-3 rounded-xl text-xs font-bold text-center border-2 border-slate-200 bg-slate-50 outline-none focus:border-indigo-400 focus:bg-white transition-all"
                    value={formData.apartmentNo}
                    onChange={e => setFormData({...formData, apartmentNo: e.target.value})}
                  />
                </div>

                {/* Order Note */}
                <div className="relative">
                  <textarea
                    placeholder="Sipariş notunuz (opsiyonel)..."
                    className="w-full px-4 py-3 rounded-xl text-[10px] font-bold border-2 border-slate-200 bg-slate-50 outline-none focus:border-indigo-400 focus:bg-white transition-all resize-none h-20"
                    value={formData.note}
                    onChange={e => setFormData({...formData, note: e.target.value})}
                  ></textarea>
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <i className="fas fa-wallet"></i>
                    Ödeme Yöntemi
                  </label>
                  {getFieldError('paymentMethod') && (
                    <span className="text-[9px] font-black text-rose-500 uppercase">{getFieldError('paymentMethod')}</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({...formData, paymentMethod: PaymentMethod.CASH});
                      handleFieldBlur('paymentMethod');
                    }}
                    className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all flex flex-col items-center gap-1 ${
                      formData.paymentMethod === PaymentMethod.CASH
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-emerald-400 hover:bg-emerald-50'
                    }`}
                  >
                    <span className="text-lg">💵</span>
                    <span>Nakit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({...formData, paymentMethod: PaymentMethod.POS});
                      handleFieldBlur('paymentMethod');
                    }}
                    className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all flex flex-col items-center gap-1 ${
                      formData.paymentMethod === PaymentMethod.POS
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-400 hover:bg-blue-50'
                    }`}
                  >
                    <span className="text-lg">💳</span>
                    <span>POS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({...formData, paymentMethod: PaymentMethod.NOT_COLLECTED});
                      handleFieldBlur('paymentMethod');
                    }}
                    className={`py-3 px-2 rounded-xl text-[10px] font-black uppercase border-2 transition-all flex flex-col items-center gap-1 ${
                      formData.paymentMethod === PaymentMethod.NOT_COLLECTED
                        ? 'bg-rose-600 border-rose-600 text-white shadow-lg'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-rose-400 hover:bg-rose-50'
                    }`}
                  >
                    <span className="text-lg">❌</span>
                    <span>Alınmadı</span>
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={cart.length === 0 || isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-500/40 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    İŞLENİYOR...
                  </>
                ) : (
                  <>
                    <i className="fas fa-check"></i>
                    SİPARİŞİ ONAYLA
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default CustomerOrderPage;
