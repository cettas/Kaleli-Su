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
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Online/offline dinle
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      console.log('Internet bağlantısı sağlandı, veriler yenileniyor...');
      loadData(); // Online olunca verileri yenile
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('Internet bağlantısı koptu, offline moda geçildi...');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Verileri Supabase'den yükle
  useEffect(() => {
    // Her açılışta force refresh (yeni veri var mı kontrol et)
    loadData(true);
    const ordersSubscription = supabase
      .channel('orders-channel')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          console.log('Real-time order change:', payload);

          // Yeni sipariş eklendiğinde
          if (payload.eventType === 'INSERT') {
            const newOrder: any = payload.new;
            const transformedOrder = {
              ...newOrder,
              customerId: newOrder.customer_id,
              customerName: newOrder.customer_name,
              totalAmount: newOrder.total_amount,
              courierId: newOrder.courier_id,
              courierName: newOrder.courier_name,
              paymentMethod: newOrder.payment_method,
              createdAt: newOrder.created_at,
              updatedAt: newOrder.updated_at
            };

            setOrders(prev => {
              // Duplicate kontrolü - aynı ID'yi tekrar ekleme
              if (prev.some(o => o.id === transformedOrder.id)) {
                return prev;
              }
              const updated = [transformedOrder, ...prev];
              localStorage.setItem('suda-orders', JSON.stringify(updated));
              return updated;
            });
          }
          // Sipariş güncellendiğinde
          else if (payload.eventType === 'UPDATE') {
            console.log('Real-time UPDATE alındı:', payload);
            const updatedOrder: any = payload.new;
            const transformedOrder = {
              ...updatedOrder,
              customerId: updatedOrder.customer_id,
              customerName: updatedOrder.customer_name,
              totalAmount: updatedOrder.total_amount,
              courierId: updatedOrder.courier_id,
              courierName: updatedOrder.courier_name,
              paymentMethod: updatedOrder.payment_method,
              createdAt: updatedOrder.created_at,
              updatedAt: updatedOrder.updated_at
            };

            console.log('Dönüştürülen sipariş:', transformedOrder);

            setOrders(prev => {
              const updated = prev.map(o =>
                o.id === transformedOrder.id ? transformedOrder : o
              );
              localStorage.setItem('suda-orders', JSON.stringify(updated));
              console.log('Orders state güncellendi, yeni sipariş sayısı:', updated.length);
              return updated;
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(ordersSubscription);
    };
  }, []);

  const loadData = async (forceRefresh = false) => {
    // Önce localStorage'dan yükle (hızlı başlangıç için)
    const cachedOrders = localStorage.getItem('suda-orders');
    const cachedCustomers = localStorage.getItem('suda-customers');
    const cachedCouriers = localStorage.getItem('suda-couriers');
    const cachedInventory = localStorage.getItem('suda-inventory');

    if (cachedOrders) setOrders(JSON.parse(cachedOrders));
    if (cachedCustomers) setCustomers(JSON.parse(cachedCustomers));
    if (cachedCouriers) {
      const parsed = JSON.parse(cachedCouriers);
      setCouriers(parsed);
      if (parsed.length > 0) setSelectedCourierId(parsed[0].id);
    }
    if (cachedInventory) setInventory(JSON.parse(cachedInventory));

    // Online ise hemen loading'i kapat, offline ise bekle
    if (!navigator.onLine) {
      setLoading(false);
      console.log('Offline mod - localStorage verileri gösteriliyor');
      return;
    }

    // Online'da her zaman Supabase'den güncelle (force refresh)
    console.log('Online mod - Supabase\'den güncel veriler çekiliyor...');

    try {
      const [ordersRes, customersRes, couriersRes, categoriesRes, inventoryRes] = await Promise.all([
        supabase.from('orders').select('*').order('created_at', { ascending: false }),
        supabase.from('customers').select('*'),
        supabase.from('couriers').select('*'),
        supabase.from('categories').select('*'),
        supabase.from('inventory').select('*')
      ]);

      if (ordersRes.data) {
        const transformedOrders = ordersRes.data.map((o: any) => ({
          ...o,
          customerId: o.customer_id,
          customerName: o.customer_name,
          totalAmount: o.total_amount,
          courierId: o.courier_id,
          courierName: o.courier_name,
          paymentMethod: o.payment_method,
          createdAt: o.created_at,
          updatedAt: o.updated_at
        }));
        setOrders(transformedOrders as Order[]);
        localStorage.setItem('suda-orders', JSON.stringify(transformedOrders));
        console.log(`${transformedOrders.length} sipariş güncellendi`);
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
        localStorage.setItem('suda-customers', JSON.stringify(transformedCustomers));
      }
      if (couriersRes.data) {
        const transformedCouriers = couriersRes.data.map((c: any) => ({
          ...c,
          fullInventory: c.full_inventory || 0,
          emptyInventory: c.empty_inventory || 0,
          serviceRegion: c.service_region
        }));
        setCouriers(transformedCouriers as Courier[]);
        localStorage.setItem('suda-couriers', JSON.stringify(transformedCouriers));
        if (transformedCouriers.length > 0 && !selectedCourierId) {
          setSelectedCourierId(transformedCouriers[0].id);
        }
      }
      if (categoriesRes.data) {
        setCategories(categoriesRes.data as Category[]);
        localStorage.setItem('suda-categories', JSON.stringify(categoriesRes.data));
      }
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
        localStorage.setItem('suda-inventory', JSON.stringify(transformedInventory));
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
          paymentMethod: o.payment_method,
          createdAt: o.created_at,
          updatedAt: o.updated_at
        }));
        setOrders(transformedOrders as Order[]);
        localStorage.setItem('suda-orders', JSON.stringify(transformedOrders));
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
        localStorage.setItem('suda-customers', JSON.stringify(transformedCustomers));
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

  // Yeni sipariş bildirimi (sadece kuryeye atananlar için)
  useEffect(() => {
    if (prevOrderCount.current !== null && orders.length > prevOrderCount.current) {
      const newOrder = orders[0];
      // Sadece kuryeye atanmış siparişler için bildirim ver
      if (newOrder && newOrder.courierId) {
        showToast(
          "YENİ SİPARİŞ!",
          `${newOrder.customerName} - ${newOrder.totalAmount}₺ değerinde sipariş alındı. Kurye: ${newOrder.courierName}`,
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
      // =====================================================
      // ADIM 1: Önce müşteriyi oluştur veya güncelle
      // =====================================================
      const cleanNewPhone = customerData.phone.replace(/\D/g, '').slice(-10);
      const existingCustomer = customers.find(c =>
        c.phone.replace(/\D/g, '').slice(-10) === cleanNewPhone
      );

      let finalCustomerId: string;

      if (existingCustomer) {
        // Mevcut müşteriyi güncelle
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
        finalCustomerId = existingCustomer.id;
      } else {
        // Yeni müşteri oluştur - ID'yi Supabase otomatik oluştursun
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
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
          })
          .select()
          .single();

        if (customerError) {
          console.error('Müşteri oluşturma hatası:', customerError);
          throw customerError;
        }

        finalCustomerId = newCustomer.id;
      }

      // =====================================================
      // ADIM 2: Şimdi siparişi ekle (müşteri var artık)
      // =====================================================
      const { data: insertedOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: finalCustomerId, // Müşteri ID'si kullan
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
          payment_method: newOrder.paymentMethod || null,
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
        paymentMethod: insertedOrder.payment_method,
        createdAt: insertedOrder.created_at,
        updatedAt: insertedOrder.updated_at
      };

      // Local state'i güncellemiyoruz - Realtime subscription halledecek
      // Bu race condition ve duplicate siparişleri önler

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

      // Foreign key hatası için özel mesaj
      if (error?.code === '23503') {
        showToast('HATA', 'Müşteri kaydı bulunamadı. Lütfen önce müşteri oluşturun.', 'warning');
      } else if (error?.code === '409' || error?.message?.includes('duplicate')) {
        showToast('HATA', 'Sipariş ID çakışması. Lütfen tekrar deneyin.', 'warning');
      } else {
        showToast('HATA', 'Sipariş kaydedilemedi: ' + (error?.message || 'Bilinmeyen hata'), 'warning');
      }
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      console.log('updateOrderStatus çağrıldı:', { orderId, status });

      // Önce locale güncelle (hızlı UI için)
      const updatedOrders = orders.map(o => o.id === orderId ? { ...o, status, updatedAt: new Date().toISOString() } : o);
      console.log('Local state güncelleniyor...');
      setOrders(updatedOrders);
      localStorage.setItem('suda-orders', JSON.stringify(updatedOrders));

      // Sonra Supabase'e gönder
      console.log('Supabase\'e gönderiliyor...');
      const { error } = await supabase.from('orders').update({
        status,
        updated_at: new Date().toISOString()
      }).eq('id', orderId);

      if (error) {
        console.error('Supabase güncelleme hatası:', error);
        throw error;
      }
      console.log('Supabase güncelleme başarılı!');
    } catch (error) {
      console.error('Durum güncelleme hatası:', error);
    }
  };

  const updateOrderCourier = async (orderId: string, courierId: string) => {
    try {
      const courier = couriers.find(c => c.id === courierId);

      // Önce locale güncelle (hızlı UI için)
      const updatedOrders = orders.map(o =>
        o.id === orderId ? {
          ...o,
          courierId: courierId || null,
          courierName: courier?.name || null,
          updatedAt: new Date().toISOString()
        } : o
      );
      setOrders(updatedOrders);
      localStorage.setItem('suda-orders', JSON.stringify(updatedOrders));

      // Sonra Supabase'e gönder
      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (courierId) {
        updateData.courier_id = courierId;
        updateData.courier_name = courier!.name;
      } else {
        updateData.courier_id = null;
        updateData.courier_name = null;
      }

      const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);

      if (error) throw error;

      if (courier) {
        showToast("GÜNCELLENDİ", `Sipariş kuryesi ${courier.name} olarak atandı.`, 'info');
      } else {
        showToast("GÜNCELLENDİ", `Sipariş kuryesi kaldırıldı.`, 'info');
      }
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

  // Role to path mapping
  const getRolePath = (role: string): string => {
    const roleMap: { [key: string]: string } = {
      'Ofis Personeli': '/ofis',
      'Kurye': '/kurye',
      'Admin': '/admin'
    };
    return roleMap[role] || '/';
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
      {/* Toast Notifications - Enhanced */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1080] w-full max-w-sm px-4 flex flex-col gap-3 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.3)] border border-white/10 flex items-center gap-5 animate-in slide-in-from-top-full duration-500 pointer-events-auto hover-lift"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shrink-0 ${toast.type === 'success' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/30' : 'bg-gradient-to-br from-indigo-500 to-indigo-600 shadow-lg shadow-indigo-500/30'}`}>
              <i className={`fas ${toast.type === 'success' ? 'fa-check animate-scale-in' : 'fa-bell animate-pulse'}`}></i>
            </div>
            <div className="min-w-0">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 leading-none mb-1">{toast.title}</h4>
              <p className="text-xs font-bold leading-snug">{toast.message}</p>
            </div>
          </div>
        ))}
      </div>

      <Routes>
        {/* Home - Role Selection - Enhanced Modern Design */}
        <Route path="/" element={
          !currentUser ? (
            <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex items-center justify-center p-6 overflow-y-auto relative">
              {/* Animated Background Elements */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-float" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-3xl" />
              </div>

              <div className="w-full max-w-lg space-y-10 text-center py-10 relative z-10 animate-scale-in">
                {/* Logo & Branding */}
                <div className="space-y-6">
                  <div className="relative inline-flex">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-[3rem] blur-xl opacity-50 animate-glow" />
                    <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white text-5xl shadow-2xl shadow-indigo-500/30 border border-white/10">
                      <i className="fas fa-droplet animate-float"></i>
                    </div>
                  </div>
                  <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
                      SUDAĞITIM <span className="gradient-text">PRO</span>
                    </h1>
                    <p className="text-slate-400 font-bold text-sm uppercase tracking-[0.3em] mt-3">
                      Modern Su Teslimat Sistemi
                    </p>
                  </div>
                </div>

                {/* Role Selection Cards */}
                <div className="grid grid-cols-1 gap-4">
                  {/* Customer - Quick Order */}
                  <button
                    onClick={() => window.location.href = '/musteri'}
                    className="group relative bg-gradient-to-r from-indigo-600 to-indigo-500 p-6 rounded-[2rem] flex items-center gap-6 transition-all duration-300 shadow-xl shadow-indigo-600/30 hover:shadow-2xl hover:shadow-indigo-600/50 hover:-translate-y-1 active:scale-[0.98] overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl text-white group-hover:scale-110 transition-transform duration-300 backdrop-blur-sm">
                      <i className="fas fa-cart-shopping"></i>
                    </div>
                    <div className="relative text-left flex-1">
                      <p className="font-black text-white uppercase text-sm tracking-wide">HIZLI SİPARİŞ</p>
                      <p className="text-[10px] font-bold text-white/70">Giriş Yapmadan Su İste</p>
                    </div>
                    <div className="relative text-white/50 group-hover:text-white group-hover:translate-x-1 transition-all">
                      <i className="fas fa-arrow-right"></i>
                    </div>
                  </button>

                  <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent my-4" />

                  {/* Office Panel */}
                  <button
                    onClick={() => window.location.href = '/ofis'}
                    className="group bg-white/5 backdrop-blur-sm p-6 rounded-[2rem] flex items-center gap-6 transition-all duration-300 border border-white/10 hover:bg-white hover:-translate-y-1 active:scale-[0.98] overflow-hidden"
                  >
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                      <i className="fas fa-desktop"></i>
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-black text-slate-200 uppercase text-sm group-hover:text-slate-900 tracking-wide">OFİS PERSONELİ</p>
                      <p className="text-[10px] font-bold text-slate-500 group-hover:text-slate-400">Sipariş Kaydı ve Planlama</p>
                    </div>
                    <div className="text-slate-500 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all">
                      <i className="fas fa-arrow-right"></i>
                    </div>
                  </button>

                  {/* Courier Panel */}
                  <button
                    onClick={() => window.location.href = '/kurye'}
                    className="group bg-white/5 backdrop-blur-sm p-6 rounded-[2rem] flex items-center gap-6 transition-all duration-300 border border-white/10 hover:bg-white hover:-translate-y-1 active:scale-[0.98] overflow-hidden"
                  >
                    <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl text-indigo-600 group-hover:scale-110 transition-transform duration-300">
                      <i className="fas fa-motorcycle"></i>
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-black text-slate-200 uppercase text-sm group-hover:text-slate-900 tracking-wide">KURYE PANELİ</p>
                      <p className="text-[10px] font-bold text-slate-500 group-hover:text-slate-400">Teslimat ve Saha İşlemleri</p>
                    </div>
                    <div className="text-slate-500 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all">
                      <i className="fas fa-arrow-right"></i>
                    </div>
                  </button>

                  {/* Admin Panel */}
                  <button
                    onClick={() => window.location.href = '/admin'}
                    className="group bg-slate-800/50 backdrop-blur-sm p-6 rounded-[2rem] flex items-center gap-6 transition-all duration-300 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 hover:-translate-y-1 active:scale-[0.98] overflow-hidden"
                  >
                    <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center text-2xl text-indigo-400 group-hover:scale-110 transition-transform duration-300">
                      <i className="fas fa-user-shield"></i>
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-black text-slate-300 uppercase text-sm tracking-wide">ADMİN PANELİ</p>
                      <p className="text-[10px] font-bold text-slate-500">Tam Yetkili Yönetim</p>
                    </div>
                    <div className="text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all">
                      <i className="fas fa-arrow-right"></i>
                    </div>
                  </button>
                </div>

                {/* Footer */}
                <div className="pt-6">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">
                    v2.0 • Modern Arayüz
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <Navigate to={getRolePath(currentUser.role)} replace />
          )
        } />

        {/* Customer Page - No Login Required */}
        <Route path="/musteri" element={
          <>
            <header className="h-16 px-6 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-xl sticky top-0 z-[100] shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                    <i className="fas fa-droplet text-sm"></i>
                  </div>
                  <div>
                    <h1 className="text-sm font-black tracking-tight text-slate-900 leading-tight">
                      SUDAĞITIM<span className="text-indigo-600">PRO</span>
                    </h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Müşteri Paneli</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2 rounded-full border border-indigo-100">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">MÜŞTERİ</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.location.href = '/'}
                  className="flex items-center gap-2 text-[11px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-wider px-4 py-2.5 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition-all duration-200 group"
                >
                  <i className="fas fa-home group-hover:-translate-x-0.5 transition-transform"></i>
                  <span>Ana Sayfa</span>
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
            <header className="h-16 px-6 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-xl sticky top-0 z-[100] shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                    <i className="fas fa-droplet text-sm"></i>
                  </div>
                  <div>
                    <h1 className="text-sm font-black tracking-tight text-slate-900 leading-tight">
                      SUDAĞITIM<span className="text-indigo-600">PRO</span>
                    </h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ofis Paneli</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2 rounded-full border border-indigo-100">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">OFİS</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl">
                  <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white text-xs">
                    {currentUser?.name?.charAt(0) || 'O'}
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">{currentUser?.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-[11px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-wider px-4 py-2.5 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition-all duration-200 group"
                >
                  <i className="fas fa-right-from-bracket group-hover:-translate-x-0.5 transition-transform"></i>
                  <span className="hidden sm:inline">Çıkış</span>
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
            <header className="h-16 px-6 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-xl sticky top-0 z-[100] shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                    <i className="fas fa-droplet text-sm"></i>
                  </div>
                  <div>
                    <h1 className="text-sm font-black tracking-tight text-slate-900 leading-tight">
                      SUDAĞITIM<span className="text-indigo-600">PRO</span>
                    </h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Kurye Paneli</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-2 rounded-full border border-indigo-100">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">KURYE</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl">
                  <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center text-white text-xs">
                    {currentUser?.name?.charAt(0) || 'K'}
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">{currentUser?.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-[11px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-wider px-4 py-2.5 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition-all duration-200 group"
                >
                  <i className="fas fa-right-from-bracket group-hover:-translate-x-0.5 transition-transform"></i>
                  <span className="hidden sm:inline">Çıkış</span>
                </button>
              </div>
            </header>
            <CourierPanel
              orders={orders.filter(o => o.courierId === selectedCourierId)}
              updateOrderStatus={updateOrderStatus}
              courierId={selectedCourierId}
              onCourierChange={setSelectedCourierId}
              couriers={couriers}
              onUpdateCourier={onUpdateCourier}
              onRefresh={() => loadData(true)}
            />
          </ProtectedRoute>
        } />

        {/* Admin Page - Login Required */}
        <Route path="/admin" element={
          <ProtectedRoute requiredRole="Admin">
            <header className="h-16 px-6 flex items-center justify-between border-b border-slate-200/80 bg-white/80 backdrop-blur-xl sticky top-0 z-[100] shadow-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
                    <i className="fas fa-droplet text-sm"></i>
                  </div>
                  <div>
                    <h1 className="text-sm font-black tracking-tight text-slate-900 leading-tight">
                      SUDAĞITIM<span className="text-indigo-600">PRO</span>
                    </h1>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Yönetim Paneli</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-gradient-to-r from-rose-50 to-pink-50 px-4 py-2 rounded-full border border-rose-100">
                  <i className="fas fa-shield-halved text-rose-500 text-[10px]"></i>
                  <span className="text-[10px] font-black text-rose-600 uppercase tracking-wider">ADMİN</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-xl">
                  <div className="w-7 h-7 bg-gradient-to-br from-rose-500 to-pink-500 rounded-lg flex items-center justify-center text-white text-xs">
                    {currentUser?.name?.charAt(0) || 'A'}
                  </div>
                  <span className="text-[11px] font-bold text-slate-700">{currentUser?.name}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-[11px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-wider px-4 py-2.5 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition-all duration-200 group"
                >
                  <i className="fas fa-right-from-bracket group-hover:-translate-x-0.5 transition-transform"></i>
                  <span className="hidden sm:inline">Çıkış</span>
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
