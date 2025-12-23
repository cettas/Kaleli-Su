import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Order, OrderStatus, Customer, Courier, InventoryItem, Category, User } from './types';
import { COURIERS as INITIAL_COURIERS } from './constants';
import OfficePanel from './components/OfficePanel';
import CourierPanel from './components/CourierPanel';
import AdminPanel from './components/AdminPanel';
import CustomerOrderPage from './components/CustomerOrderPage';
import LoginPage from './components/LoginPage';
import { supabase } from './services/supabaseClient';

interface Toast {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

const App: React.FC = () => {
  const [role, setRole] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const prevOrderCount = useRef<number | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedCourierId, setSelectedCourierId] = useState<string>('');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('suda-currentUser');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  // Verileri Supabase'den yükle
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersRes, customersRes, couriersRes, categoriesRes, inventoryRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*'),
        supabase.from('couriers').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('inventory').select('*')
      ]);

      if (ordersRes.data) {
        // Transform snake_case to camelCase
        const transformedOrders = ordersRes.data.map((o: any) => ({
          ...o,
          customerId: o.customer_id,
          customerName: o.customer_name,
          totalAmount: o.total_amount,
          courierId: o.courier_id,
          courierName: o.courier_name,
          createdAt: o.created_at,
          updatedAt: o.updated_at
        }));
        setOrders(transformedOrders as Order[]);
      }
      if (customersRes.data) {
        const transformedCustomers = customersRes.data.map((c: any) => ({
          ...c,
          buildingNo: c.building_no,
          apartmentNo: c.apartment_no,
          lastNote: c.last_note,
          orderCount: c.order_count || 0,
          lastOrderDate: c.last_order_date
        }));
        setCustomers(transformedCustomers as Customer[]);
      }
      if (couriersRes.data) {
        const transformedCouriers = couriersRes.data.map((c: any) => ({
          ...c,
          fullInventory: c.full_inventory || 0,
          emptyInventory: c.empty_inventory || 0,
          serviceRegion: c.service_region
        }));
        setCouriers(transformedCouriers as Courier[]);
        if (couriersRes.data.length > 0) {
          setSelectedCourierId(couriersRes.data[0].id);
        }
      }
      if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
      if (inventoryRes.data) {
        const transformedInventory = inventoryRes.data.map((i: any) => ({
          ...i,
          costPrice: i.cost_price || 0,
          salePrice: i.sale_price || 0,
          isActive: i.is_active !== false,
          isCore: i.is_core,
          imageUrl: i.image_url
        }));
        setInventory(transformedInventory as InventoryItem[]);
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  // Sadece siparişleri yenile (form reset olmasın diye)
  const refreshOrders = async () => {
    try {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (data) {
        const transformedOrders = data.map((o: any) => ({
          ...o,
          customerId: o.customer_id,
          customerName: o.customer_name,
          totalAmount: o.total_amount,
          courierId: o.courier_id,
          courierName: o.courier_name,
          createdAt: o.created_at,
          updatedAt: o.updated_at
        }));
        setOrders(transformedOrders as Order[]);
      }

      // Sadece müşterileri de yenile
      const { data: customersData } = await supabase.from('customers').select('*');
      if (customersData) {
        const transformedCustomers = customersData.map((c: any) => ({
          ...c,
          buildingNo: c.building_no,
          apartmentNo: c.apartment_no,
          lastNote: c.last_note,
          orderCount: c.order_count || 0,
          lastOrderDate: c.last_order_date
        }));
        setCustomers(transformedCustomers as Customer[]);
      }
    } catch (error) {
      console.error('Sipariş yenileme hatası:', error);
    }
  };

  const showToast = (title: string, message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Yeni sipariş bildirimi
  useEffect(() => {
    if (prevOrderCount.current !== null && orders.length > prevOrderCount.current) {
      const newOrder = orders[0];
      if (newOrder) {
        showToast(
          "YENİ SİPARİŞ!",
          `${newOrder.customer_name} - ${newOrder.total_amount}₺ değerinde sipariş alındı.`,
          'success'
        );
      }
    }
    prevOrderCount.current = orders.length;
  }, [orders]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('suda-currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('suda-currentUser');
    }
  }, [currentUser]);

  const addOrder = async (newOrder: Order, customerData: Customer) => {
    try {
      // Siparişi ekle - ID'yi Supabase otomatik oluştursun
      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: newOrder.customerId,
          customer_name: newOrder.customerName,
          phone: newOrder.phone,
          address: newOrder.address,
          items: newOrder.items,
          total_amount: newOrder.totalAmount,
          courier_id: newOrder.courierId,
          courier_name: newOrder.courierName,
          status: newOrder.status,
          source: newOrder.source,
          note: newOrder.note,
          created_at: newOrder.createdAt,
          updated_at: newOrder.updatedAt
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Insert edilmiş order'ı dönüştür (snake_case → camelCase)
      const transformedOrder: Order = {
        ...insertedOrder,
        id: insertedOrder.id,
        customerId: insertedOrder.customer_id,
        customerName: insertedOrder.customer_name,
        totalAmount: insertedOrder.total_amount,
        courierId: insertedOrder.courier_id,
        courierName: insertedOrder.courier_name,
        createdAt: insertedOrder.created_at,
        updatedAt: insertedOrder.updated_at
      };

      // Orders state'ine ekle (refresh bekle)
      setOrders(prev => [transformedOrder, ...prev]);

      // Müşteriyi kontrol et ve güncelle
      const cleanNewPhone = customerData.phone.replace(/\D/g, '').slice(-10);
      const existingCustomer = customers.find(c =>
        c.phone.replace(/\D/g, '').slice(-10) === cleanNewPhone
      );

      if (existingCustomer) {
        await supabase.from('customers').update({
          name: customerData.name,
          phone: customerData.phone,
          district: customerData.district,
          neighborhood: customerData.neighborhood,
          street: customerData.street,
          building_no: customerData.buildingNo,
          apartment_no: customerData.apartmentNo,
          order_count: (existingCustomer.orderCount || 0) + 1,
          last_order_date: new Date().toISOString(),
          last_note: customerData.lastNote || existingCustomer.lastNote,
          updated_at: new Date().toISOString()
        }).eq('id', existingCustomer.id);
      } else {
        await supabase.from('customers').insert({
          id: customerData.id || 'cust_' + Date.now(),
          phone: customerData.phone,
          name: customerData.name,
          district: customerData.district,
          neighborhood: customerData.neighborhood,
          street: customerData.street,
          building_no: customerData.buildingNo,
          apartment_no: customerData.apartmentNo,
          last_note: customerData.lastNote,
          order_count: 1,
          last_order_date: new Date().toISOString()
        });
      }

      // Müşterileri yenile
      const { data: customersData } = await supabase.from('customers').select('*');
      if (customersData) {
        const transformedCustomers = customersData.map((c: any) => ({
          ...c,
          buildingNo: c.building_no,
          apartmentNo: c.apartment_no,
          lastNote: c.last_note,
          orderCount: c.order_count || 0,
          lastOrderDate: c.last_order_date
        }));
        setCustomers(transformedCustomers as Customer[]);
      }

      showToast('BAŞARILI', 'Sipariş başarıyla oluşturuldu.', 'success');
    } catch (error: any) {
      console.error('Sipariş ekleme hatası:', error);

      // 409 hatası için özel mesaj
      if (error?.code === '409' || error?.message?.includes('duplicate')) {
        showToast('HATA', 'Sipariş ID çakışması. Lütfen tekrar deneyin.', 'warning');
      } else {
        showToast('HATA', 'Sipariş kaydedilemedi: ' + (error?.message || 'Bilinmeyen hata'), 'warning');
      }
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      const { error } = await supabase.from('orders').update({
        status,
        updated_at: new Date().toISOString()
      }).eq('id', orderId);

      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o));
    } catch (error) {
      console.error('Durum güncelleme hatası:', error);
    }
  };

  const updateOrderCourier = async (orderId: string, courierId: string) => {
    try {
      const courier = couriers.find(c => c.id === courierId);
      if (!courier) return;

      const { error } = await supabase.from('orders').update({
        courier_id: courierId,
        courier_name: courier.name,
        updated_at: new Date().toISOString()
      }).eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o =>
        o.id === orderId ? {
          ...o,
          courierId,
          courierName: courier.name,
          updatedAt: new Date().toISOString()
        } : o
      ));
      showToast("GÜNCELENDİ", `Sipariş kuryesi ${courier.name} olarak değiştirildi.`, 'info');
    } catch (error) {
      console.error('Kurye güncelleme hatası:', error);
    }
  };

  const onUpdateCourier = async (updatedCourier: Courier) => {
    try {
      const { error } = await supabase.from('couriers').update({
        name: updatedCourier.name,
        status: updatedCourier.status,
        phone: updatedCourier.phone,
        full_inventory: updatedCourier.fullInventory,
        empty_inventory: updatedCourier.emptyInventory,
        service_region: updatedCourier.serviceRegion,
        updated_at: new Date().toISOString()
      }).eq('id', updatedCourier.id);

      if (error) throw error;
      setCouriers(prev => prev.map(c => c.id === updatedCourier.id ? updatedCourier : c));
    } catch (error) {
      console.error('Kurye güncelleme hatası:', error);
    }
  };

  const handleLogin = async (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setRole(null);
  };

  const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole: string }> = ({ children, requiredRole }) => {
    if (!currentUser) {
      return <LoginPage role={requiredRole as "Ofis Personeli" | "Kurye" | "Admin"} onLogin={handleLogin} onCancel={() => {}} />;
    }
    if (currentUser.role !== requiredRole) {
      return <Navigate to="/" replace />;
    }
    return <>{children}</>;
  };

  if (loading) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl font-bold">Yükleniyor...</div>
      </div>
    );
  }

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
          <ProtectedRoute requiredRole="Ofis Personeli">
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
          <ProtectedRoute requiredRole="Kurye">
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
          <ProtectedRoute requiredRole="Admin">
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
              onUpdateCouriers={async (couriers) => {
                setCouriers(couriers);
              }}
              onUpdateCustomers={async (customers) => {
                setCustomers(customers);
              }}
              onUpdateInventory={async (inventory) => {
                setInventory(inventory);
              }}
              categories={categories}
              onUpdateCategories={async (categories) => {
                setCategories(categories);
              }}
              updateOrderStatus={updateOrderStatus}
              updateOrderCourier={updateOrderCourier}
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
