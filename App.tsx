import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { UserRole, Order, OrderStatus, Customer, Courier, InventoryItem, Category, User } from './types';
import { INITIAL_CUSTOMERS, COURIERS as INITIAL_COURIERS } from './constants';
import OfficePanel from './components/OfficePanel';
import CourierPanel from './components/CourierPanel';
import AdminPanel from './components/AdminPanel';
import CustomerOrderPage from './components/CustomerOrderPage';
import LoginPage from './components/LoginPage';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

interface AppState {
  orders: Order[];
  customers: Customer[];
  couriers: Courier[];
  categories: Category[];
  inventory: InventoryItem[];
  selectedCourierId: string;
  currentUser: User | null;
}

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevOrderCount = useRef<number | null>(null);
  const location = useLocation();

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('suda-orders');
    if (saved) return JSON.parse(saved);
    return [];
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('suda-customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [couriers, setCouriers] = useState<Courier[]>(() => {
    const saved = localStorage.getItem('suda-couriers');
    return saved ? JSON.parse(saved) : INITIAL_COURIERS;
  });

  const [selectedCourierId, setSelectedCourierId] = useState<string>(INITIAL_COURIERS[0].id);

  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('suda-categories');
    return saved ? JSON.parse(saved) : [
      { id: 'su', label: 'SU', icon: 'droplet' },
      { id: 'ekipman', label: 'EKİPMAN', icon: 'faucet' },
      { id: 'aksesuar', label: 'AKSESUAR', icon: 'bottle-water' },
      { id: 'diger', label: 'DİĞER', icon: 'ellipsis-h' }
    ];
  });

  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('suda-inventory');
    return saved ? JSON.parse(saved) : [
      { id: 'core-full', name: '19L Dolu Damacana', quantity: 450, unit: 'Adet', costPrice: 45, salePrice: 85, isCore: true, category: 'su', isActive: true },
      { id: 'core-empty', name: '19L Boş Damacana', quantity: 120, unit: 'Adet', costPrice: 200, salePrice: 0, isCore: true, category: 'su', isActive: true },
      { id: 'core-pump', name: 'Yedek Pompalar', quantity: 35, unit: 'Adet', costPrice: 80, salePrice: 150, isCore: true, category: 'ekipman', isActive: true },
      { id: 'extra-1', name: '0.5L Koli Su', quantity: 80, unit: 'Koli', costPrice: 90, salePrice: 130, category: 'su', isActive: true }
    ];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('suda-currentUser');
    return saved ? JSON.parse(saved) : null;
  });

  const showToast = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  useEffect(() => {
    if (prevOrderCount.current !== null && orders.length > prevOrderCount.current) {
      const newOrder = orders[0];
      if (newOrder) {
        showToast(
          "YENİ SİPARİŞ!",
          `${newOrder.customerName} - ${newOrder.totalAmount}₺ değerinde sipariş alındı.`,
          'success'
        );
      }
    }
    prevOrderCount.current = orders.length;
    localStorage.setItem('suda-orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem('suda-customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('suda-inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('suda-couriers', JSON.stringify(couriers));
  }, [couriers]);

  useEffect(() => {
    localStorage.setItem('suda-categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('suda-currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('suda-currentUser');
    }
  }, [currentUser]);

  const addOrder = (newOrder: Order, customerData: Customer) => {
    setOrders(prev => [newOrder, ...prev]);

    setCustomers(prevCustomers => {
      const cleanNewPhone = customerData.phone.replace(/\D/g, '').slice(-10);
      const existingIndex = prevCustomers.findIndex(c =>
        c.phone.replace(/\D/g, '').slice(-10) === cleanNewPhone
      );

      if (existingIndex > -1) {
        const updated = [...prevCustomers];
        updated[existingIndex] = {
          ...updated[existingIndex],
          name: customerData.name,
          phone: customerData.phone,
          district: customerData.district,
          neighborhood: customerData.neighborhood,
          street: customerData.street,
          buildingNo: customerData.buildingNo,
          apartmentNo: customerData.apartmentNo,
          orderCount: (updated[existingIndex].orderCount || 0) + 1,
          lastOrderDate: new Date().toISOString(),
          lastNote: customerData.lastNote || updated[existingIndex].lastNote
        };
        return updated;
      } else {
        const newCustomerEntry: Customer = {
          ...customerData,
          id: customerData.id || 'cust_' + Date.now(),
          orderCount: 1,
          lastOrderDate: new Date().toISOString()
        };
        return [...prevCustomers, newCustomerEntry];
      }
    });
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o));
  };

  const updateOrderCourier = (orderId: string, courierId: string) => {
    const courier = couriers.find(c => c.id === courierId);
    if (!courier) return;

    setOrders(prev => prev.map(o =>
      o.id === orderId ? {
        ...o,
        courierId,
        courierName: courier.name,
        updatedAt: new Date().toISOString()
      } : o
    ));
    showToast("GÜNCELENDİ", `Sipariş kuryesi ${courier.name} olarak değiştirildi.`, 'info');
  };

  const onUpdateCourier = (updatedCourier: Courier) => {
    setCouriers(prev => prev.map(c => c.id === updatedCourier.id ? updatedCourier : c));
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setRole(null);
  };

  const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole: UserRole }> = ({ children, requiredRole }) => {
    if (!currentUser) {
      return <LoginPage role={requiredRole as UserRole.OFFICE | UserRole.COURIER | UserRole.ADMIN} onLogin={handleLogin} onCancel={() => {}} />;
    }
    if (currentUser.role !== requiredRole) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  };

  return (
    <div className="h-screen flex flex-col bg-slate-50 relative overflow-hidden">
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4 flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="bg-[#0f172a] text-white p-5 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.3)] border border-white/10 flex items-center gap-5 animate-in slide-in-from-top-full duration-500 pointer-events-auto"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-indigo-500'}`}>
              <i className={`fas ${toast.type === 'success' ? 'fa-bell animate-bounce' : 'fa-info-circle'}`}></i>
            </div>
            <div className="min-w-0">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 leading-none mb-1">{toast.title}</h4>
              <p className="text-xs font-bold leading-snug">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      <Routes>
        {/* Home - Role Selection */}
        <Route path="/" element={
          !currentUser ? (
            <div className="h-screen bg-slate-900 flex items-center justify-center p-6 overflow-y-auto">
              <div className="w-full max-w-md space-y-8 text-center py-10">
                <div className="space-y-4">
                  <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white text-4xl mx-auto shadow-2xl shadow-indigo-500/20">
                    <i className="fas fa-droplet"></i>
                  </div>
                  <h1 className="text-3xl font-black text-white tracking-tighter uppercase">SUDAGITIM <span className="text-indigo-500">PRO</span></h1>
                  <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Lütfen çalışma alanını seç</p>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <button onClick={() => window.location.href = '/musteri'} className="bg-indigo-600 p-6 rounded-3xl flex items-center gap-6 group hover:bg-indigo-500 transition-all duration-300 shadow-xl shadow-indigo-600/20">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl text-white group-hover:scale-110 transition-transform"><i className="fas fa-shopping-basket"></i></div>
                    <div className="text-left">
                      <p className="font-black text-white uppercase text-sm">HIZLI SİPARİŞ VER</p>
                      <p className="text-[10px] font-bold text-white/60">Giriş Yapmadan Su İste</p>
                    </div>
                  </button>

                  <div className="h-px bg-slate-800 my-2"></div>

                  <button onClick={() => window.location.href = '/ofis'} className="bg-white p-6 rounded-3xl flex items-center gap-6 group hover:bg-indigo-600 transition-all duration-300">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl text-slate-600 group-hover:bg-white/20 group-hover:text-white"><i className="fas fa-desktop"></i></div>
                    <div className="text-left">
                      <p className="font-black text-slate-900 uppercase text-sm group-hover:text-white">OFİS PERSONELİ</p>
                      <p className="text-[10px] font-bold text-slate-400 group-hover:text-white/60">Sipariş Kaydı ve Planlama</p>
                    </div>
                  </button>
                  <button onClick={() => window.location.href = '/kurye'} className="bg-white p-6 rounded-3xl flex items-center gap-6 group hover:bg-indigo-600 transition-all duration-300">
                    <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl text-slate-600 group-hover:bg-white/20 group-hover:text-white"><i className="fas fa-motorcycle"></i></div>
                    <div className="text-left">
                      <p className="font-black text-slate-900 uppercase text-sm group-hover:text-white">KURYE PANELİ</p>
                      <p className="text-[10px] font-bold text-slate-400 group-hover:text-white/60">Teslimat ve Saha İşlemleri</p>
                    </div>
                  </button>
                  <button onClick={() => window.location.href = '/admin'} className="bg-slate-800 p-6 rounded-3xl flex items-center gap-6 group hover:bg-slate-700 transition-all duration-300 border border-slate-700">
                    <div className="w-14 h-14 bg-slate-700 rounded-2xl flex items-center justify-center text-2xl text-indigo-400"><i className="fas fa-user-shield"></i></div>
                    <div className="text-left">
                      <p className="font-black text-white uppercase text-sm">ADMİN PANELİ</p>
                      <p className="text-[10px] font-bold text-slate-500">Tam Yetkili Yönetim</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Navigate to={`/${currentUser.role.toLowerCase().replace(' ', '-')}`} replace />
          )
        } />

        {/* Customer Page - No Login Required */}
        <Route path="/musteri" element={
          <>
            <header className="h-14 px-6 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-[100]">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                    <i className="fas fa-droplet text-sm"></i>
                  </div>
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 hidden sm:block">
                    SUDAĞITIM<span className="text-indigo-600">PRO</span>
                  </h1>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ROL:</span>
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">MÜŞTERİ</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.location.href = '/'}
                  className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest px-3 py-1.5 border border-slate-200 rounded-lg transition-all"
                >
                  ÇIKIŞ YAP
                </button>
              </div>
            </header>
            <CustomerOrderPage
              inventory={inventory}
              categories={categories}
              addOrder={addOrder}
              couriers={couriers}
            />
          </>
        } />

        {/* Office Page - Login Required */}
        <Route path="/ofis" element={
          <ProtectedRoute requiredRole={UserRole.OFFICE}>
            <header className="h-14 px-6 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-[100]">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                    <i className="fas fa-droplet text-sm"></i>
                  </div>
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 hidden sm:block">
                    SUDAĞITIM<span className="text-indigo-600">PRO</span>
                  </h1>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ROL:</span>
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">OFİS</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-600">{currentUser?.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest px-3 py-1.5 border border-slate-200 rounded-lg transition-all"
                >
                  ÇIKIŞ
                </button>
              </div>
            </header>
            <OfficePanel
              orders={orders}
              addOrder={addOrder}
              customers={customers}
              couriers={couriers}
              updateOrderStatus={updateOrderStatus}
              updateOrderCourier={updateOrderCourier}
              stock={inventory}
            />
          </ProtectedRoute>
        } />

        {/* Courier Page - Login Required */}
        <Route path="/kurye" element={
          <ProtectedRoute requiredRole={UserRole.COURIER}>
            <header className="h-14 px-6 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-[100]">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                    <i className="fas fa-droplet text-sm"></i>
                  </div>
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 hidden sm:block">
                    SUDAĞITIM<span className="text-indigo-600">PRO</span>
                  </h1>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ROL:</span>
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">KURYE</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-600">{currentUser?.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest px-3 py-1.5 border border-slate-200 rounded-lg transition-all"
                >
                  ÇIKIŞ
                </button>
              </div>
            </header>
            <CourierPanel
              orders={orders.filter(o => o.courierId === (currentUser?.courierId || selectedCourierId))}
              updateOrderStatus={updateOrderStatus}
              courierId={currentUser?.courierId || selectedCourierId}
              onCourierChange={setSelectedCourierId}
              couriers={couriers}
              onUpdateCourier={onUpdateCourier}
            />
          </ProtectedRoute>
        } />

        {/* Admin Page - Login Required */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole={UserRole.ADMIN}>
            <header className="h-14 px-6 flex items-center justify-between border-b border-slate-200 bg-white sticky top-0 z-[100]">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
                    <i className="fas fa-droplet text-sm"></i>
                  </div>
                  <h1 className="text-sm font-bold tracking-tight text-slate-900 hidden sm:block">
                    SUDAĞITIM<span className="text-indigo-600">PRO</span>
                  </h1>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ROL:</span>
                  <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">ADMİN</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-600">{currentUser?.name}</span>
                <button
                  onClick={handleLogout}
                  className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest px-3 py-1.5 border border-slate-200 rounded-lg transition-all"
                >
                  ÇIKIŞ
                </button>
              </div>
            </header>
            <AdminPanel
              orders={orders}
              couriers={couriers}
              customers={customers}
              inventory={inventory}
              onUpdateCouriers={setCouriers}
              onUpdateCustomers={setCustomers}
              onUpdateInventory={setInventory}
              categories={categories}
              onUpdateCategories={setCategories}
            />
          </ProtectedRoute>
        } />

        {/* 404 - Redirect to Home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

const AppWrapper: React.FC = () => {
  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
};

export default AppWrapper;
