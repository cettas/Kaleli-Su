
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
    <div className="space-y-3 pb-20">
      {activeOrders.length > 0 ? (
        <div className="space-y-3">
          {activeOrders.map((order, index) => {
            const isOnWay = order.status === OrderStatus.ON_WAY;
            return (
              <div
                key={order.id}
                className={"bg-white rounded-2xl shadow-lg overflow-hidden border transition-all " + (isOnWay ? "border-amber-400" : "border-indigo-200")}
              >
                {/* Header - Compact */}
                <div className={"flex items-center justify-between px-4 py-2.5 " + (isOnWay ? "bg-amber-50" : "bg-indigo-50")}>
                  <div className="flex items-center gap-2">
                    <i className={"fas " + (isOnWay ? "fa-truck-fast" : "fa-clock") + " text-sm " + (isOnWay ? "text-amber-600" : "text-indigo-600")}></i>
                    <span className="text-xs font-bold uppercase text-slate-600">
                      {new Date(order.createdAt).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}
                    </span>
                    {order.paymentMethod && (
                      <span className={"px-2 py-0.5 rounded text-[10px] font-bold uppercase " + (
                        order.paymentMethod === PaymentMethod.CASH ? 'bg-emerald-100 text-emerald-700' :
                        order.paymentMethod === PaymentMethod.POS ? 'bg-blue-100 text-blue-700' :
                        'bg-rose-100 text-rose-700'
                      )}>
                        {order.paymentMethod === PaymentMethod.CASH ? 'Nakit' : order.paymentMethod === PaymentMethod.POS ? 'POS' : '❌'}
                      </span>
                    )}
                  </div>
                  <span className="text-lg font-bold text-slate-900">{order.totalAmount}₺</span>
                </div>

                <div className="p-4 space-y-3">
                  {/* Adres */}
                  <div className="flex items-start gap-3">
                    <div className={"w-9 h-9 rounded-lg flex items-center justify-center shrink-0 " + (isOnWay ? "bg-amber-100" : "bg-indigo-100")}>
                      <i className={"fas fa-location-dot text-sm " + (isOnWay ? "text-amber-600" : "text-indigo-600")}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 uppercase leading-snug">{order.address}</p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className={"inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-white text-xs font-semibold rounded-lg " + (isOnWay ? "bg-amber-500" : "bg-indigo-600")}
                      >
                        <i className="fas fa-diamond-turn-right text-xs"></i>
                        <span>Navigasyon</span>
                      </a>
                    </div>
                  </div>

                  {/* Ürünler */}
                  <div className="flex flex-wrap gap-1.5">
                    {order.items.map((item, idx) => (
                      <div key={idx} className={"px-2 py-1 rounded-md flex items-center gap-1.5 text-xs font-semibold " + (isOnWay ? "bg-amber-50 text-amber-800" : "bg-indigo-50 text-indigo-800")}>
                        <span className={"w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold " + (isOnWay ? "bg-amber-500 text-white" : "bg-indigo-600 text-white")}>
                          {item.quantity}
                        </span>
                        <span>{item.productName}</span>
                      </div>
                    ))}
                  </div>

                  {/* Müşteri ve Aksiyonlar */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <i className="fas fa-user text-xs text-slate-500"></i>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 uppercase">{order.customerName}</p>
                        <p className="text-[10px] text-slate-400">{order.phone}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={`https://wa.me/${order.phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white"
                      >
                        <i className="fab fa-whatsapp text-base"></i>
                      </a>
                      <a href={`tel:${order.phone}`} className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                        <i className="fas fa-phone text-sm"></i>
                      </a>
                    </div>
                  </div>

                  {/* Not */}
                  {order.note && (
                    <div className={"px-3 py-2 rounded-lg text-xs font-semibold " + (isOnWay ? "bg-amber-50 text-amber-800" : "bg-indigo-50 text-indigo-800")}>
                      <i className="fas fa-sticky-note mr-1"></i>
                      {order.note}
                    </div>
                  )}

                  {/* Aksiyon Butonu */}
                  <div className="pt-1">
                    {order.status === OrderStatus.PENDING ? (
                      <button
                        onClick={() => setConfirmingAction({orderId: order.id, status: OrderStatus.ON_WAY})}
                        className="w-full py-2.5 bg-amber-500 text-white rounded-xl font-bold text-sm uppercase tracking-wide active:scale-98 transition-all flex items-center justify-center gap-2"
                      >
                        <i className="fas fa-truck-fast text-sm"></i>
                        <span>Yola Çıktım</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedPaymentMethod(PaymentMethod.CASH);
                          setSelectingPayment({orderId: order.id, status: OrderStatus.DELIVERED});
                        }}
                        className="w-full py-2.5 bg-emerald-500 text-white rounded-xl font-bold text-sm uppercase tracking-wide active:scale-98 transition-all flex items-center justify-center gap-2"
                      >
                        <i className="fas fa-check text-sm"></i>
                        <span>Teslim Ettim</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-mug-hot text-2xl text-slate-400"></i>
          </div>
          <p className="text-sm font-bold text-slate-400">İşin yok</p>
        </div>
      )}
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-3 pb-20">
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-lg space-y-4">
        {/* Dolu Damacana */}
        <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-xl">
          <div className="flex items-center gap-2">
            <i className="fas fa-droplet text-indigo-500 text-sm"></i>
            <span className="text-xs font-bold text-indigo-700 uppercase">Dolu Damacana</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLocalFull(Math.max(0, localFull - 1))} className="w-9 h-9 bg-white rounded-lg text-indigo-600 font-bold border border-indigo-200 text-base">-</button>
            <span className="w-10 text-center text-lg font-bold text-indigo-700">{localFull}</span>
            <button onClick={() => setLocalFull(localFull + 1)} className="w-9 h-9 bg-indigo-600 rounded-lg text-white font-bold text-base">+</button>
          </div>
        </div>

        {/* Boş İade */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
          <div className="flex items-center gap-2">
            <i className="fas fa-box-open text-slate-500 text-sm"></i>
            <span className="text-xs font-bold text-slate-700 uppercase">Boş İade</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setLocalEmpty(Math.max(0, localEmpty - 1))} className="w-9 h-9 bg-white rounded-lg text-slate-600 font-bold border border-slate-200 text-base">-</button>
            <span className="w-10 text-center text-lg font-bold text-slate-700">{localEmpty}</span>
            <button onClick={() => setLocalEmpty(localEmpty + 1)} className="w-9 h-9 bg-slate-700 rounded-lg text-white font-bold text-base">+</button>
          </div>
        </div>

        <button
          onClick={handleUpdateStock}
          className="w-full py-2.5 bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2"
        >
          <i className="fas fa-check text-sm"></i>
          <span>Kaydet</span>
        </button>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-3 pb-20">
      {/* İstatistikler */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-lg">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <p className="text-lg font-bold text-slate-900">{completedToday.length}</p>
            <p className="text-[10px] text-slate-500 uppercase">Adres</p>
          </div>
          <div>
            <p className="text-lg font-bold text-indigo-600">{totalDeliveredProducts}</p>
            <p className="text-[10px] text-slate-500 uppercase">Damacana</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-600">
              {completedToday.reduce((sum, o) => {
                const liters = o.items.reduce((itemSum, item) => {
                  const productMatch = item.productName.toLowerCase().includes('19') ? 19 : 5;
                  return itemSum + (productMatch * item.quantity);
                }, 0);
                return sum + liters;
              }, 0)}
            </p>
            <p className="text-[10px] text-slate-500 uppercase">Litre</p>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-600">
              {completedToday.reduce((sum, o) => sum + o.totalAmount, 0)}₺
            </p>
            <p className="text-[10px] text-slate-500 uppercase">Ciro</p>
          </div>
        </div>
      </div>

      {/* Son Teslimatlar */}
      {completedToday.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-lg">
          <h3 className="text-xs font-bold text-slate-500 uppercase mb-3">Son Teslimatlar</h3>
          <div className="space-y-3">
            {completedToday.slice().sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 5).map(order => (
              <div key={order.id} className="p-3 bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <i className="fas fa-check text-white text-xs"></i>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 uppercase">{order.customerName}</p>
                      <p className="text-[10px] text-slate-400">{formatDateTime(order.updatedAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-bold text-emerald-600">{order.totalAmount}₺</p>
                    <p className={"text-[10px] font-bold uppercase " + (
                      order.paymentMethod === PaymentMethod.CASH ? 'text-emerald-600' :
                      order.paymentMethod === PaymentMethod.POS ? 'text-blue-600' :
                      'text-rose-600'
                    )}>
                      {order.paymentMethod === PaymentMethod.CASH ? '💵 Nakit' : order.paymentMethod === PaymentMethod.POS ? '💳 POS' : '❌'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mb-2">
                  <i className="fas fa-map-marker-alt text-slate-300 text-xs"></i>
                  <p className="text-xs text-slate-600 uppercase truncate">{order.address}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {order.items.map((item, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md text-[10px] font-bold uppercase">
                      {item.quantity}x {item.productName}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
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

      {/* Header - Küçültülmüş */}
      <div className="bg-slate-900 text-white px-4 py-3 shadow-lg shrink-0 z-[110]">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-base font-black">
              {selectedCourier?.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-sm font-black uppercase">{selectedCourier?.name.split(' ')[0]}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsRefreshing(true);
                onRefresh?.();
                setTimeout(() => setIsRefreshing(false), 1000);
              }}
              className={"w-9 h-9 rounded-lg flex items-center justify-center transition-all " + (isRefreshing ? "bg-indigo-500" : "bg-white/10")}
              disabled={isRefreshing}
            >
              <i className={"fas fa-sync-alt text-xs " + (isRefreshing ? "animate-spin" : "")}></i>
            </button>
            <button
              onClick={() => setShowCourierSelector(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 rounded-lg"
            >
              <i className="fas fa-user-circle text-xs text-white/80"></i>
              <span className="text-[10px] font-black uppercase text-white">{selectedCourier?.name.split(' ')[0] || 'Kurye'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-22 w-full scroll-smooth">
        <div className="max-w-md mx-auto">
          {activeTab === 'tasks' && renderTasks()}
          {activeTab === 'inventory' && renderInventory()}
          {activeTab === 'profile' && renderProfile()}
        </div>
      </div>

      {/* Bottom Navigation - Clean */}
      <div className="fixed bottom-0 left-0 right-0 z-[120] bg-white border-t border-slate-200">
        <div className="max-w-md mx-auto">
          {/* İstatistik Bar */}
          <div className="flex items-center justify-around py-2.5 px-4 bg-slate-50 border-b border-slate-100">
            <div className="text-center">
              <p className="text-base font-bold text-indigo-600">{activeOrders.length}</p>
              <p className="text-[10px] text-slate-500 uppercase">Bekleyen</p>
            </div>
            <div className="text-center">
              <p className="text-base font-bold text-emerald-600">{completedToday.length}</p>
              <p className="text-[10px] text-slate-500 uppercase">Tamamlanan</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-around py-3">
            <button
              onClick={() => setActiveTab('tasks')}
              className={"flex flex-col items-center gap-1 " + (activeTab === 'tasks' ? "text-indigo-600" : "text-slate-400")}
            >
              <i className="fas fa-clipboard-list text-lg"></i>
              <span className="text-[10px] font-medium">İşler</span>
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={"flex flex-col items-center gap-1 " + (activeTab === 'inventory' ? "text-emerald-600" : "text-slate-400")}
            >
              <i className="fas fa-boxes-stacked text-lg"></i>
              <span className="text-[10px] font-medium">Stok</span>
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={"flex flex-col items-center gap-1 " + (activeTab === 'profile' ? "text-amber-600" : "text-slate-400")}
            >
              <i className="fas fa-user text-lg"></i>
              <span className="text-[10px] font-medium">Profil</span>
            </button>
            <button
              onClick={unlockAudio}
              className={"flex flex-col items-center gap-1 " + (isAudioUnlocked ? "text-emerald-600" : "text-slate-400")}
            >
              <i className={"fas " + (isAudioUnlocked ? "fa-volume-up" : "fa-volume-mute") + " text-lg"}></i>
              <span className="text-[10px] font-medium">Ses</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourierPanel;
