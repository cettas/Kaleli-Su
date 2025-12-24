
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Order, OrderStatus, Courier, PaymentMethod } from '../types';
import { STATUS_COLORS } from '../constants';
import { supabase } from '../services/supabaseClient';

interface CourierPanelProps {
  orders: Order[];
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  courierId: string;
  onCourierChange: (id: string) => void;
  couriers: Courier[];
  onUpdateCourier?: (updated: Courier) => void;
  onRefresh?: () => void;
}

type CourierTab = 'tasks' | 'inventory' | 'profile';

// Yeni, daha uzun ve dikkat çekici bildirim sesi (Emergency Alert Style)
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/1110/1110-preview.mp3';

// Fallback ses URL'leri (alternatifler)
const FALLBACK_SOUNDS = [
  'https://assets.mixkit.co/active_storage/sfx/1110/1110-preview.mp3',
  'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  'https://assets.mixkit.co/active_storage/sfx/2/2-preview.mp3'
];

const CourierPanel: React.FC<CourierPanelProps> = ({ orders, updateOrderStatus, courierId, onCourierChange, couriers, onUpdateCourier, onRefresh }) => {
  const [activeTab, setActiveTab] = useState<CourierTab>('tasks');
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<{orderId: string, status: OrderStatus} | null>(null);
  const [selectingPayment, setSelectingPayment] = useState<{orderId: string, status: OrderStatus} | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [showCourierSelector, setShowCourierSelector] = useState(false);
  const selectedCourier = useMemo(() => couriers.find(c => c.id === courierId), [couriers, courierId]);

  // Orders prop değiştiğinde local state'i güncelle
  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  // Online/offline dinle
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Supabase Realtime Subscription - Yeni siparişleri dinle
  useEffect(() => {
    console.log('CourierPanel: Realtime subscription başlatılıyor...');

    const channel = supabase
      .channel('courier-orders-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('CourierPanel: Yeni sipariş algılandı!', payload);

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

          // Sadece PENDING veya ON_WAY siparişlerini ekle (kurye için)
          if (transformedOrder.status === 'pending' || transformedOrder.status === 'on_way') {
            setLocalOrders(prev => {
              // Duplicate kontrolü
              if (prev.some(o => o.id === transformedOrder.id)) {
                return prev;
              }
              const updated = [transformedOrder, ...prev];
              console.log('CourierPanel: Yeni sipariş eklendi, toplam:', updated.length);
              return updated;
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('CourierPanel: Sipariş güncellemesi algılandı!', payload);
          const updatedOrder: any = payload.new;

          setLocalOrders(prev => {
            const existing = prev.find(o => o.id === updatedOrder.id);
            if (existing) {
              return prev.map(o =>
                o.id === updatedOrder.id
                  ? {
                      ...o,
                      status: updatedOrder.status === 'pending' ? OrderStatus.PENDING :
                             updatedOrder.status === 'on_way' ? OrderStatus.ON_WAY :
                             updatedOrder.status === 'delivered' ? OrderStatus.DELIVERED :
                             updatedOrder.status === 'cancelled' ? OrderStatus.CANCELLED :
                             o.status,
                      courierId: updatedOrder.courier_id || o.courierId,
                      courierName: updatedOrder.courier_name || o.courierName,
                      updatedAt: updatedOrder.updated_at
                    }
                  : o
              );
            }
            return prev;
          });
        }
      )
      .subscribe((status) => {
        console.log('CourierPanel Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('CourierPanel: Realtime bağlantısı kuruldu!');
        }
      });

    return () => {
      console.log('CourierPanel: Realtime subscription temizleniyor...');
      supabase.removeChannel(channel);
    };
  }, []);

  const [localFull, setLocalFull] = useState(selectedCourier?.fullInventory || 0);
  const [localEmpty, setLocalEmpty] = useState(selectedCourier?.emptyInventory || 0);

  const prevOrderIds = useRef<string[]>([]);
  const prevOrderCount = useRef<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Daha önce bildirim verilen siparişleri takip et
  const notifiedOrderIds = useRef<Set<string>>(new Set());

  const activeOrders = useMemo(() => localOrders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.ON_WAY), [localOrders]);

  // Sipariş ID'leri takip et (daha güvenilir yeni sipariş tespiti için)
  const activeOrderIds = useMemo(() => activeOrders.map(o => o.id).sort(), [activeOrders]);
  const completedToday = useMemo(() => localOrders.filter(o => o.status === OrderStatus.DELIVERED), [localOrders]);

  const totalDeliveredProducts = useMemo(() => {
    return completedToday.reduce((sum, o) => sum + o.items.reduce((iSum, item) => iSum + item.quantity, 0), 0);
  }, [completedToday]);

  // Audio nesnesini sadece bir kez oluştur
  const getAudio = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
      audioRef.current.volume = 1.0;

      // Hata durumunda fallback sesleri dene
      audioRef.current.onerror = () => {
        console.warn('Ana ses dosyası yüklenemedi, fallback deneniyor...');
        for (const fallbackUrl of FALLBACK_SOUNDS.slice(1)) {
          try {
            const fallbackAudio = new Audio(fallbackUrl);
            audioRef.current = fallbackAudio;
            audioRef.current.volume = 1.0;
            break;
          } catch (e) {
            console.warn('Fallback ses de yüklenemedi:', fallbackUrl);
          }
        }
      };
    }
    return audioRef.current;
  };

  const playNotification = useCallback(async () => {
    try {
      console.log('playNotification çağrıldı');
      const audio = getAudio();
      console.log('Audio nesnesi:', audio);
      console.log('Audio src:', audio.src);

      audio.currentTime = 0;

      // Titreşim her zaman çalışır (kullanıcı etkileşimi gerektirmez)
      if ('vibrate' in navigator) {
        console.log('Titreşim başlatılıyor...');
        navigator.vibrate([1000, 500, 1000, 500, 1000]);
      }

      // Ses sadece unlock'lıysa çal
      if (isAudioUnlocked) {
        console.log('Ses çalınıyor...');
        await audio.play();
        console.log('Ses çalma başarılı!');
      } else {
        console.log('Ses kilitli, sadece titreşim yapıldı. Kullanıcı butona basarsa ses açılacak.');
      }
    } catch (error) {
      console.error("Ses çalma hatası:", error);
    }
  }, [isAudioUnlocked]);

  useEffect(() => {
    const currentIds = activeOrderIds;
    const prevIds = prevOrderIds.current;

    // Yeni sipariş var mı kontrol et (daha önce olmayan ID'ler)
    const newIds = currentIds.filter(id => !prevIds.includes(id));

    // Daha önce bildirim verilmemiş yeni siparişleri bul
    const trulyNewIds = newIds.filter(id => !notifiedOrderIds.current.has(id));

    console.log('Sipariş kontrolü:', {
      currentCount: activeOrders.length,
      prevCount: prevOrderCount.current,
      newIds,
      trulyNewIds,
      notifiedCount: notifiedOrderIds.current.size,
      isAudioUnlocked
    });

    if (trulyNewIds.length > 0) {
      console.log('Yeni sipariş geldi! Bildirim yapılıyor...');

      // Bu siparişleri bildirilenler listesine ekle
      trulyNewIds.forEach(id => notifiedOrderIds.current.add(id));

      // Bildirimi çalıştır (titreşim her zaman, ses sadece unlock'lıysa)
      playNotification();
    }

    // Aktif olmayan siparişleri bildirim listesinden kaldır (temizlik)
    const activeSet = new Set(currentIds);
    notifiedOrderIds.current = new Set([...notifiedOrderIds.current].filter(id => activeSet.has(id)));

    prevOrderIds.current = currentIds;
    prevOrderCount.current = activeOrders.length;
  }, [activeOrderIds, activeOrders.length, playNotification]);

  useEffect(() => {
    if (selectedCourier) {
      setLocalFull(selectedCourier.fullInventory);
      setLocalEmpty(selectedCourier.emptyInventory);
    }
  }, [selectedCourier]);

  const unlockAudio = () => {
    const audio = getAudio();
    audio.volume = 0.5;
    audio.play().then(() => {
      setIsAudioUnlocked(true);
      localStorage.setItem('courier-audio-unlocked', 'true');
      if ('vibrate' in navigator) navigator.vibrate(200);
    }).catch(err => {
      console.log("Ses açma hatası:", err);
    });
  };

  const handleUpdateStatusConfirm = () => {
    if (confirmingAction) {
      updateOrderStatus(confirmingAction.orderId, confirmingAction.status);
      setConfirmingAction(null);
      if ('vibrate' in navigator) navigator.vibrate(50);
    }
  };

  const handleUpdateStock = () => {
    if (selectedCourier && onUpdateCourier) {
      onUpdateCourier({
        ...selectedCourier,
        fullInventory: localFull,
        emptyInventory: localEmpty
      });
      alert("Saha envanteri başarıyla güncellendi.");
    }
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderTasks = () => (
    <div className="space-y-4 pb-24">
      {/* Ses Test Butonu */}
      <button
        onClick={unlockAudio}
        className={`w-full p-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${
          isAudioUnlocked
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30'
            : 'bg-slate-800 text-white border-2 border-rose-500 shadow-lg'
        }`}
      >
        <i className={`fas ${isAudioUnlocked ? 'fa-volume-high' : 'fa-volume-xmark'} text-lg`}></i>
        <span>{isAudioUnlocked ? 'BİLDİRİMLER AKTİF' : 'SES BİLDİRİMLERİ AÇ'}</span>
      </button>

      {activeOrders.length > 0 ? (
        <div className="space-y-4">
          {activeOrders.map((order, index) => {
            const isOnWay = order.status === OrderStatus.ON_WAY;
            return (
              <div
                key={order.id}
                className={`bg-white rounded-3xl shadow-xl overflow-hidden border-2 transition-all duration-300 animate-in slide-in-from-bottom-4 ${
                  isOnWay ? 'border-amber-400' : 'border-indigo-400'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Status Bar */}
                <div className={`py-2 px-4 ${isOnWay ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-indigo-500 to-indigo-600'} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <i className={`fas ${isOnWay ? 'fa-truck-fast' : 'fa-clock'} text-white text-sm`}></i>
                    <span className="text-[10px] font-black text-white uppercase tracking-wider">
                      {isOnWay ? 'YOLDALAR' : 'BEKLEYEN'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white">{order.totalAmount}₺</span>
                    {order.paymentMethod && (
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                        order.paymentMethod === PaymentMethod.CASH ? 'bg-emerald-500' :
                        order.paymentMethod === PaymentMethod.POS ? 'bg-blue-500' :
                        'bg-rose-500'
                      } text-white`}>
                        {order.paymentMethod === PaymentMethod.CASH ? '💵' : order.paymentMethod === PaymentMethod.POS ? '💳' : '❌'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Adres - En önemli */}
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 rounded-2xl ${isOnWay ? 'bg-amber-100' : 'bg-indigo-100'} flex items-center justify-center shrink-0`}>
                        <i className={`fas fa-location-dot text-lg ${isOnWay ? 'text-amber-600' : 'text-indigo-600'}`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-black text-slate-900 uppercase leading-snug">
                          {order.address}
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-2 mt-3 px-4 py-2.5 ${isOnWay ? 'bg-amber-500' : 'bg-indigo-600'} text-white rounded-xl font-black text-[11px] uppercase tracking-wider shadow-lg`}
                        >
                          <i className="fas fa-diamond-turn-right"></i> YOL TARİFİ
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Ürünler */}
                  <div className="flex flex-wrap gap-2">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="px-3 py-2 bg-slate-100 rounded-xl flex items-center gap-2">
                        <span className="bg-slate-900 text-white w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold">
                          {item.quantity}
                        </span>
                        <span className="text-sm font-bold text-slate-700 uppercase">{item.productName}</span>
                      </div>
                    ))}
                  </div>

                  {/* Müşteri ve İletişim */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <i className="fas fa-user text-slate-500"></i>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900 uppercase">{order.customerName}</p>
                        <p className="text-[10px] font-bold text-slate-400">
                          {new Date(order.createdAt).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}
                        </p>
                      </div>
                    </div>

                    {/* İletişim Butonları */}
                    <div className="flex gap-2">
                      <a
                        href={`https://wa.me/${order.phone.replace(/\D/g, '')}?text=Merhaba, siparişiniz ${isOnWay ? 'yolda' : 'hazırlanıyor'}.`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg active:scale-95 transition-all"
                      >
                        <i className="fab fa-whatsapp text-lg"></i>
                      </a>
                      <a href={`tel:${order.phone}`} className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shadow-sm active:scale-95 transition-all">
                        <i className="fas fa-phone"></i>
                      </a>
                    </div>
                  </div>

                  {/* Not */}
                  {order.note && (
                    <div className="px-4 py-3 bg-amber-50 border-2 border-amber-200 rounded-xl">
                      <p className="text-[11px] font-bold text-amber-900 uppercase leading-snug">
                        <i className="fas fa-sticky-note mr-2"></i>
                        {order.note}
                      </p>
                    </div>
                  )}

                  {/* Aksiyon Butonu */}
                  <div className="pt-2">
                    {order.status === OrderStatus.PENDING ? (
                      <button
                        onClick={() => setConfirmingAction({orderId: order.id, status: OrderStatus.ON_WAY})}
                        className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-500/30 active:scale-98 transition-all"
                      >
                        <i className="fas fa-truck-fast mr-2"></i> YOLA ÇIK
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedPaymentMethod(PaymentMethod.CASH);
                          setSelectingPayment({orderId: order.id, status: OrderStatus.DELIVERED});
                        }}
                        className="w-full py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-black text-base uppercase tracking-widest shadow-xl shadow-emerald-500/30 active:scale-98 transition-all"
                      >
                        <i className="fas fa-check-circle mr-2"></i> TESLİM ETTİM
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center space-y-4">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-200 rounded-3xl flex items-center justify-center mx-auto">
            <i className="fas fa-mug-hot text-4xl text-emerald-500"></i>
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">İŞİN YOK</h3>
            <p className="text-sm font-bold text-slate-400 uppercase">Mola verebilirsin 💪</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-4 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg space-y-5 relative overflow-hidden">
        <div className="text-center space-y-1 relative z-10">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">ARAÇ ENVANTERİ</h2>
          <p className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.2em]">Saha Stok Seviyesi</p>
        </div>
        <div className="space-y-3">
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-between">
            <div className="space-y-3">
              <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest block">DOLU DAMACANA</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setLocalFull(Math.max(0, localFull - 1))} className="w-10 h-10 bg-white rounded-xl text-indigo-600 font-black border border-indigo-200 shadow-sm active:scale-90">-</button>
                <input type="number" value={localFull} onChange={(e) => setLocalFull(Math.max(0, parseInt(e.target.value) || 0))} className="w-12 h-10 bg-transparent text-center font-black text-lg outline-none" />
                <button onClick={() => setLocalFull(localFull + 1)} className="w-10 h-10 bg-white rounded-xl text-indigo-600 font-black border border-indigo-200 shadow-sm active:scale-90">+</button>
              </div>
            </div>
            <div className="text-right">
               <span className="text-4xl font-black text-indigo-600 tracking-tighter">{localFull}</span>
            </div>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div className="space-y-3">
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest block">BOŞ İADE</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setLocalEmpty(Math.max(0, localEmpty - 1))} className="w-10 h-10 bg-white rounded-xl text-slate-600 font-black border border-slate-200 shadow-sm active:scale-90">-</button>
                <input type="number" value={localEmpty} onChange={(e) => setLocalEmpty(Math.max(0, parseInt(e.target.value) || 0))} className="w-12 h-10 bg-transparent text-center font-black text-lg outline-none" />
                <button onClick={() => setLocalEmpty(localEmpty + 1)} className="w-10 h-10 bg-white rounded-xl text-slate-600 font-black border border-slate-200 shadow-sm active:scale-90">+</button>
              </div>
            </div>
            <div className="text-right">
               <span className="text-4xl font-black text-slate-900 tracking-tighter">{localEmpty}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleUpdateStock}
          className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-[0.15em] shadow-xl active:scale-98 transition-all border-b-4 border-slate-950 flex items-center justify-center gap-2"
        >
          <i className="fas fa-cloud-upload-alt"></i>
          STOKU MERKEZE BİLDİR
        </button>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-3 pb-32">
      {/* Günlük Özet Kartı */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg space-y-4">
        {/* Kurye Bilgisi */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
          <div className="w-14 h-14 rounded-xl bg-slate-900 flex items-center justify-center text-2xl font-black text-white">
            {selectedCourier?.name.charAt(0)}
          </div>
          <div>
            <h2 className="text-base font-black text-slate-900 uppercase">{selectedCourier?.name}</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase">{selectedCourier?.id}</p>
          </div>
        </div>

        {/* İstatistikler - 4'lü grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase">ADRES</p>
            <p className="text-2xl font-black text-slate-900">{completedToday.length}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase">DAMACANA</p>
            <p className="text-2xl font-black text-indigo-600">{totalDeliveredProducts}</p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase">TOPLAM L</p>
            <p className="text-2xl font-black text-emerald-600">
              {completedToday.reduce((sum, o) => {
                const liters = o.items.reduce((itemSum, item) => {
                  const productMatch = item.productName.toLowerCase().includes('19') ? 19 : 5;
                  return itemSum + (productMatch * item.quantity);
                }, 0);
                return sum + liters;
              }, 0)}
            </p>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase">CİRO</p>
            <p className="text-xl font-black text-amber-600">
              {completedToday.reduce((sum, o) => sum + o.totalAmount, 0)}₺
            </p>
          </div>
        </div>

        {/* Tahmini Kazanç */}
        <div className="bg-emerald-600 p-4 rounded-xl text-white">
          <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-1">TAHMİNİ KAZANÇ</p>
          <p className="text-3xl font-black tracking-tighter">
            {(completedToday.reduce((sum, o) => sum + o.totalAmount, 0) * 0.15).toFixed(0)}₺
          </p>
          <p className="text-[10px] font-bold text-emerald-200 mt-1">%15 tahmini komisyon</p>
        </div>
      </div>

      {/* Son Teslimatlar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg space-y-4">
        <div className="flex justify-between items-center px-2">
           <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <i className="fas fa-check-circle text-emerald-500"></i> SON TESLİMATLAR
           </h3>
           <span className="text-[10px] font-bold text-slate-400">{completedToday.length} ADET</span>
        </div>
        <div className="space-y-3">
          {completedToday.slice().sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 10).map(order => (
            <div key={order.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-xs font-black text-slate-900 uppercase truncate block">{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase">
                      {formatDateTime(order.updatedAt)}
                    </span>
                    <span className="text-[10px] font-black text-emerald-600 uppercase">TESLİM</span>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-sm font-black text-slate-900">{order.totalAmount}₺</p>
                   {order.paymentMethod && (
                     <p className={`text-xs font-black uppercase mt-1 ${
                       order.paymentMethod === PaymentMethod.CASH ? 'text-emerald-600' :
                       order.paymentMethod === PaymentMethod.POS ? 'text-blue-600' :
                       'text-rose-600'
                     }`}>
                       {order.paymentMethod === PaymentMethod.CASH ? '💵 NAKİT' :
                        order.paymentMethod === PaymentMethod.POS ? '💳 POS' :
                        '❌ ALINMADI'}
                     </p>
                   )}
                </div>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-start gap-2">
                   <i className="fas fa-map-marker-alt text-slate-300 text-xs mt-0.5"></i>
                   <p className="text-[10px] font-bold text-slate-600 leading-snug uppercase line-clamp-1">{order.address}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                   {order.items.map((item, idx) => (
                     <div key={idx} className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-black text-slate-500 uppercase flex items-center gap-1">
                       <span className="text-indigo-600">{item.quantity}x</span>
                       {item.productName}
                     </div>
                   ))}
                </div>
              </div>
            </div>
          ))}
          {completedToday.length === 0 && (
             <div className="py-8 text-center text-[11px] font-black text-slate-300 uppercase border-2 border-dashed border-slate-100 rounded-xl">
                Henüz teslimat yapmadın
             </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-[#f1f5f9] w-full h-full flex flex-col overflow-hidden">
      {/* Kurye Seçim Modalı */}
      {showCourierSelector && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-t-3xl p-6 space-y-4 shadow-2xl animate-in slide-in-from-bottom-4 duration-300 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase">Kurye Seç</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hesap değiştir</p>
              </div>
              <button
                onClick={() => setShowCourierSelector(false)}
                className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-200"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div className="space-y-2 pt-2">
              {couriers.map(c => (
                <button
                  key={c.id}
                  onClick={() => {
                    onCourierChange(c.id);
                    setShowCourierSelector(false);
                  }}
                  className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${
                    c.id === courierId
                      ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                      : 'bg-slate-50 hover:bg-slate-100 border-2 border-slate-100'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black ${
                    c.id === courierId ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    {c.name.charAt(0)}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-black ${c.id === courierId ? 'text-white' : 'text-slate-900'}`}>{c.name}</p>
                    <p className={`text-[10px] ${c.id === courierId ? 'text-white/70' : 'text-slate-400'}`}>
                      {c.status === 'active' ? '✓ Aktif' : c.status === 'busy' ? '⏳ Meşgul' : '✗ Pasif'}
                    </p>
                  </div>
                  {c.id === courierId && (
                    <i className="fas fa-check-circle text-white text-xl"></i>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Onay Modalı */}
      {confirmingAction && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl mx-auto shadow-lg ${
              confirmingAction.status === OrderStatus.DELIVERED
                ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white'
                : 'bg-gradient-to-br from-indigo-400 to-indigo-500 text-white'
            }`}>
              <i className={`fas ${confirmingAction.status === OrderStatus.DELIVERED ? 'fa-check' : 'fa-truck-fast'}`}></i>
            </div>
            <div className="space-y-2">
               <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">EMİN MİSİN?</h3>
               <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                 {confirmingAction.status === OrderStatus.DELIVERED ? 'Teslimatı onaylıyor musun?' : 'Yola çıkışı onaylıyor musun?'}
               </p>
            </div>
            <div className="flex flex-col gap-2">
               <button
                 onClick={handleUpdateStatusConfirm}
                 className={`w-full py-4 rounded-2xl text-white font-black text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${
                   confirmingAction.status === OrderStatus.DELIVERED
                     ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                     : 'bg-gradient-to-r from-indigo-500 to-indigo-600'
                 }`}
               >
                 EVET, ONAYLA
               </button>
               <button
                 onClick={() => setConfirmingAction(null)}
                 className="w-full py-3 bg-slate-100 text-slate-400 rounded-2xl font-black text-[11px] uppercase tracking-widest"
               >
                 İPTAL
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Ödeme Yöntemi Seçimi Modalı */}
      {selectingPayment && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
                <i className="fas fa-wallet text-2xl text-white"></i>
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">ÖDEME YÖNTEMİ</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Nasıl ödendi?</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setSelectedPaymentMethod(PaymentMethod.CASH)}
                className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all flex flex-col items-center gap-2 ${
                  selectedPaymentMethod === PaymentMethod.CASH
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <i className="fas fa-money-bill-wave text-xl"></i>
                <span>NAKİT</span>
              </button>
              <button
                onClick={() => setSelectedPaymentMethod(PaymentMethod.POS)}
                className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all flex flex-col items-center gap-2 ${
                  selectedPaymentMethod === PaymentMethod.POS
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <i className="fas fa-credit-card text-xl"></i>
                <span>POS</span>
              </button>
              <button
                onClick={() => setSelectedPaymentMethod(PaymentMethod.NOT_COLLECTED)}
                className={`py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest border-2 transition-all flex flex-col items-center gap-2 ${
                  selectedPaymentMethod === PaymentMethod.NOT_COLLECTED
                    ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <i className="fas fa-times-circle text-xl"></i>
                <span>ALINMADI</span>
              </button>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setSelectingPayment(null)}
                className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-[11px] uppercase tracking-widest"
              >
                İPTAL
              </button>
              <button
                onClick={() => {
                  if (selectingPayment) {
                    updateOrderStatus(selectingPayment.orderId, selectingPayment.status);
                    setSelectingPayment(null);
                    if ('vibrate' in navigator) navigator.vibrate(50);
                  }
                }}
                className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-500/30"
              >
                TESLİMİ ONAYLA
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white pt-8 pb-3 px-4 shadow-2xl shrink-0 z-[110]">
        <div className="flex justify-between items-center mb-4">
          {/* Sol: Kurye bilgisi */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-lg font-black shadow-lg shadow-indigo-500/30">
              {selectedCourier?.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-base font-black uppercase tracking-tight">{selectedCourier?.name.split(' ')[0]}</h1>
              <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider">Kurye Paneli</p>
            </div>
          </div>

          {/* Sağ: Yenile ve kurye değiştir */}
          <div className="flex items-center gap-2">
            {/* Online Status */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg ${isOnline ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400'} ${isOnline ? 'animate-pulse' : ''}`}></span>
              <span className="text-[9px] font-black uppercase">{isOnline ? 'Online' : 'Offline'}</span>
            </div>
            {/* Sound Toggle Button */}
            <button
              onClick={unlockAudio}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${isAudioUnlocked ? 'bg-emerald-500/20' : 'bg-slate-500/20'} hover:bg-emerald-500/30`}
              title={isAudioUnlocked ? 'Ses aktif' : 'Sesi açmak için tıkla'}
            >
              <i className={`fas ${isAudioUnlocked ? 'fa-volume-up' : 'fa-volume-mute'} text-xs ${isAudioUnlocked ? 'text-emerald-400' : 'text-slate-400'}`}></i>
            </button>
            <button
              onClick={() => {
                setIsRefreshing(true);
                onRefresh?.();
                setTimeout(() => setIsRefreshing(false), 1000);
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isRefreshing ? 'bg-indigo-500' : 'bg-white/10 hover:bg-white/20'}`}
              disabled={isRefreshing}
            >
              <i className={`fas fa-sync-alt text-sm ${isRefreshing ? 'animate-spin' : ''}`}></i>
            </button>
            {/* Kurye Değiştir Butonu */}
            <button
              onClick={() => setShowCourierSelector(true)}
              className="flex items-center gap-2 px-3 py-2 bg-white/10 border border-white/20 rounded-xl hover:bg-white/20 transition-all"
            >
              <i className="fas fa-user-circle text-sm text-white/80"></i>
              <span className="text-[11px] font-black uppercase text-white truncate max-w-[60px]">
                {selectedCourier?.name.split(' ')[0] || 'Kurye'}
              </span>
              <i className="fas fa-chevron-down text-[10px] text-white/50"></i>
            </button>
          </div>
        </div>

        {/* Durum Bar */}
        <div className="flex items-center justify-center gap-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${activeOrders.length === 0 ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
            <span className="text-[10px] font-black uppercase text-white/60">Aktif</span>
            <span className="text-lg font-black">{activeOrders.length}</span>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${completedToday.length > 0 ? 'bg-emerald-500/20' : 'bg-white/5'}`}>
            <span className="text-[10px] font-black uppercase text-white/60">Tamam</span>
            <span className="text-lg font-black text-emerald-400">{completedToday.length}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 w-full scroll-smooth">
        <div className="max-w-md mx-auto">
          {activeTab === 'tasks' && renderTasks()}
          {activeTab === 'inventory' && renderInventory()}
          {activeTab === 'profile' && renderProfile()}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-[120] bg-slate-900/95 backdrop-blur-xl border-t border-white/10">
        <div className="flex justify-around items-center py-2 px-4 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${activeTab === 'tasks' ? 'bg-white/10' : ''}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === 'tasks' ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-white/50'}`}>
              <i className="fas fa-clipboard-list text-sm"></i>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider ${activeTab === 'tasks' ? 'text-white' : 'text-white/40'}`}>İşler</span>
            {activeOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">{activeOrders.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${activeTab === 'inventory' ? 'bg-white/10' : ''}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === 'inventory' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/5 text-white/50'}`}>
              <i className="fas fa-boxes-stacked text-sm"></i>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider ${activeTab === 'inventory' ? 'text-white' : 'text-white/40'}`}>Stok</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 py-2 px-4 rounded-xl transition-all ${activeTab === 'profile' ? 'bg-white/10' : ''}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === 'profile' ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30' : 'bg-white/5 text-white/50'}`}>
              <i className="fas fa-user text-sm"></i>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider ${activeTab === 'profile' ? 'text-white' : 'text-white/40'}`}>Profil</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourierPanel;
