
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, Courier, PaymentMethod } from '../types';
import { STATUS_COLORS } from '../constants';

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
  // LocalStorage'dan ses durumunu yükle
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(() => {
    return localStorage.getItem('courier-audio-unlocked') === 'true';
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<{orderId: string, status: OrderStatus} | null>(null);
  const [selectingPayment, setSelectingPayment] = useState<{orderId: string, status: OrderStatus} | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const selectedCourier = useMemo(() => couriers.find(c => c.id === courierId), [couriers, courierId]);

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

  // Her 10 saniyede otomatik yenile (sadece online ise)
  useEffect(() => {
    if (!isOnline) return; // Offline ise yenileme

    const interval = setInterval(() => {
      console.log('Otomatik yenileme - 10 saniye');
      onRefresh?.();
    }, 10000); // 10 saniye

    return () => clearInterval(interval);
  }, [isOnline, onRefresh]);

  const [localFull, setLocalFull] = useState(selectedCourier?.fullInventory || 0);
  const [localEmpty, setLocalEmpty] = useState(selectedCourier?.emptyInventory || 0);

  const prevOrderIds = useRef<string[]>([]);
  const prevOrderCount = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Daha önce bildirim verilen siparişleri takip et (10sn yenileme döngüsü için)
  const notifiedOrderIds = useRef<Set<string>>(new Set());

  const activeOrders = useMemo(() => orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.ON_WAY), [orders]);

  // Sipariş ID'leri takip et (daha güvenilir yeni sipariş tespiti için)
  const activeOrderIds = useMemo(() => activeOrders.map(o => o.id).sort(), [activeOrders]);
  const completedToday = useMemo(() => orders.filter(o => o.status === OrderStatus.DELIVERED), [orders]);

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

  const playNotification = async () => {
    try {
      console.log('playNotification çağrıldı');
      const audio = getAudio();
      console.log('Audio nesnesi:', audio);
      console.log('Audio src:', audio.src);

      audio.currentTime = 0;

      if ('vibrate' in navigator) {
        console.log('Titreşim başlatılıyor...');
        navigator.vibrate([1000, 500, 1000, 500, 1000]);
      }

      console.log('Ses çalınıyor...');
      await audio.play();
      console.log('Ses çalma başarılı!');
    } catch (error) {
      console.error("Ses çalma hatası:", error);
    }
  };

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
      console.log('Yeni sipariş geldi! Ses çalınıyor...');

      // Bu siparişleri bildirilenler listesine ekle
      trulyNewIds.forEach(id => notifiedOrderIds.current.add(id));

      // Otomatik olarak sesi aç ve çal
      unlockAudio();
      setTimeout(() => {
        playNotification();
      }, 300);
    }

    // Aktif olmayan siparişleri bildirim listesinden kaldır (temizlik)
    const activeSet = new Set(currentIds);
    notifiedOrderIds.current = new Set([...notifiedOrderIds.current].filter(id => activeSet.has(id)));

    prevOrderIds.current = currentIds;
    prevOrderCount.current = activeOrders.length;
  }, [activeOrderIds, activeOrders.length]);

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
    <div className="space-y-3 pb-40">
      {/* Ses Test Butonu - Minimal */}
      <button
        onClick={unlockAudio}
        className={`w-full p-3 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
          isAudioUnlocked
            ? 'bg-emerald-600 text-white'
            : 'bg-slate-800 text-white border-2 border-rose-500'
        }`}
      >
        <i className="fas fa-volume-high text-sm"></i>
        <span>{isAudioUnlocked ? 'SES AKTİF' : 'SESİ AÇ'}</span>
      </button>

      {/* İstatistikler - Küçük ve minimal */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-500 uppercase">AKTİF</span>
          <span className="text-2xl font-black text-slate-900">{activeOrders.length}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-500 uppercase">TAMAM</span>
          <span className="text-2xl font-black text-emerald-600">{completedToday.length}</span>
        </div>
      </div>

      {activeOrders.length > 0 ? (
        activeOrders.map(order => {
          // Durum rengi
          const statusColor = order.status === OrderStatus.ON_WAY
            ? 'border-amber-500'
            : 'border-indigo-600';

          return (
            <div key={order.id} className={`bg-white rounded-2xl shadow-md overflow-hidden border-l-4 ${statusColor}`}>
              <div className="p-4 space-y-4">

                {/* ÜST BİLGİ: Tutar + Ödeme + Not İkonu */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-slate-900">{order.totalAmount}₺</span>
                    {order.paymentMethod && (
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase ${
                        order.paymentMethod === PaymentMethod.CASH ? 'bg-emerald-100 text-emerald-700' :
                        order.paymentMethod === PaymentMethod.POS ? 'bg-blue-100 text-blue-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {order.paymentMethod === PaymentMethod.CASH ? '💵 NAKİT' :
                         order.paymentMethod === PaymentMethod.POS ? '💳 POS' :
                         '❌ ALINMADI'}
                      </span>
                    )}
                  </div>
                  {order.note && (
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                      <i className="fas fa-sticky-note text-sm"></i>
                    </div>
                  )}
                </div>

                {/* ADRES - EN BÜYÜK VE EN ÖNEMLİ */}
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shrink-0 mt-0.5">
                      <i className="fas fa-location-dot text-sm"></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-black text-slate-900 uppercase leading-snug">
                        {order.address}
                      </p>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-black text-[11px] uppercase tracking-wider"
                      >
                        <i className="fas fa-diamond-turn-right"></i> YOL TARİFİ
                      </a>
                    </div>
                  </div>
                </div>

                {/* ÜRÜNLER - Orta boy */}
                <div className="flex flex-wrap gap-2">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="px-3 py-2 bg-slate-100 rounded-lg flex items-center gap-2">
                      <span className="bg-slate-900 text-white w-6 h-6 rounded flex items-center justify-center text-[11px] font-black">
                        {item.quantity}
                      </span>
                      <span className="text-sm font-black text-slate-700 uppercase">{item.productName}</span>
                      <span className="text-xs font-bold text-slate-500">{item.price}₺</span>
                    </div>
                  ))}
                </div>

                {/* MÜŞTERİ - Küçük */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                      <i className="fas fa-user text-slate-500 text-xs"></i>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 uppercase">{order.customerName}</p>
                      <p className="text-[10px] font-bold text-slate-400">
                        {new Date(order.createdAt).toLocaleTimeString('tr-TR', {hour: '2-digit', minute: '2-digit'})}
                      </p>
                    </div>
                  </div>

                  {/* İLETİŞİM BUTONLARI */}
                  <div className="flex gap-2">
                    <a
                      href={`https://wa.me/${order.phone.replace(/\D/g, '')}?text=Merhaba, siparişiniz yolda.`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-12 h-12 rounded-xl bg-emerald-500 flex items-center justify-center text-white active:bg-emerald-600"
                    >
                      <i className="fab fa-whatsapp text-xl"></i>
                    </a>
                    <a href={`tel:${order.phone}`} className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 active:bg-slate-200">
                      <i className="fas fa-phone text-lg"></i>
                    </a>
                  </div>
                </div>

                {/* NOT */}
                {order.note && (
                  <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-[11px] font-bold text-amber-900 uppercase leading-snug">📝 {order.note}</p>
                  </div>
                )}

                {/* TESLİM BUTONU - EN BÜYÜK VE EN NET */}
                <div className="pt-2 border-t border-slate-100">
                  {order.status === OrderStatus.PENDING ? (
                    <button
                      onClick={() => setConfirmingAction({orderId: order.id, status: OrderStatus.ON_WAY})}
                      className="w-full py-4 bg-amber-500 text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-98 transition-all"
                    >
                      <i className="fas fa-truck mr-2"></i> YOLA ÇIK
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedPaymentMethod(PaymentMethod.CASH);
                        setSelectingPayment({orderId: order.id, status: OrderStatus.DELIVERED});
                      }}
                      className="w-full py-5 bg-emerald-600 text-white rounded-xl font-black text-base uppercase tracking-widest shadow-xl active:scale-98 transition-all"
                    >
                      <i className="fas fa-check-circle mr-2"></i> TESLİM ETTİM
                    </button>
                  )}
                </div>

              </div>
            </div>
          );
        })
      ) : (
        <div className="py-20 text-center space-y-3">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto">
            <i className="fas fa-check text-3xl text-slate-300"></i>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">İşin yok</h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Mola verebilirsin</p>
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
                   <p className="text-xs font-black text-slate-900">{order.totalAmount}₺</p>
                   {order.paymentMethod && (
                     <p className={`text-[9px] font-black uppercase mt-0.5 ${
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
      {/* Onay Modalı */}
      {confirmingAction && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-2xl p-6 text-center space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl mx-auto ${confirmingAction.status === OrderStatus.DELIVERED ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
              <i className={`fas ${confirmingAction.status === OrderStatus.DELIVERED ? 'fa-check-circle' : 'fa-truck-fast'}`}></i>
            </div>
            <div className="space-y-1">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">EMİN MİSİN?</h3>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                 {confirmingAction.status === OrderStatus.DELIVERED ? 'Teslimatı onaylıyor musun?' : 'Yola çıkışı onaylıyor musun?'}
               </p>
            </div>
            <div className="flex flex-col gap-2">
               <button
                 onClick={handleUpdateStatusConfirm}
                 className={`w-full py-3 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${confirmingAction.status === OrderStatus.DELIVERED ? 'bg-emerald-600' : 'bg-indigo-600'}`}
               >
                 EVET, ONAYLA
               </button>
               <button
                 onClick={() => setConfirmingAction(null)}
                 className="w-full py-3 bg-slate-100 text-slate-400 rounded-xl font-black text-[10px] uppercase tracking-widest"
               >
                 İPTAL
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Ödeme Yöntemi Seçimi Modalı */}
      {selectingPayment && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto">
                <i className="fas fa-wallet text-2xl text-emerald-600"></i>
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">ÖDEME YÖNTEMİ</h3>
              <p className="text-[11px] font-bold text-slate-400 uppercase">Nasıl ödendi?</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setSelectedPaymentMethod(PaymentMethod.CASH)}
                className={`py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${
                  selectedPaymentMethod === PaymentMethod.CASH
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <i className="fas fa-money-bill-wave text-lg mb-1"></i>
                <div>NAKİT</div>
              </button>
              <button
                onClick={() => setSelectedPaymentMethod(PaymentMethod.POS)}
                className={`py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${
                  selectedPaymentMethod === PaymentMethod.POS
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <i className="fas fa-credit-card text-lg mb-1"></i>
                <div>POS</div>
              </button>
              <button
                onClick={() => setSelectedPaymentMethod(PaymentMethod.NOT_COLLECTED)}
                className={`py-4 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 transition-all ${
                  selectedPaymentMethod === PaymentMethod.NOT_COLLECTED
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                <i className="fas fa-times-circle text-lg mb-1"></i>
                <div>ALINMADI</div>
              </button>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectingPayment(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black text-[11px] uppercase tracking-widest"
              >
                İPTAL
              </button>
              <button
                onClick={() => {
                  if (selectingPayment) {
                    // Ödeme yöntemini kaydet ve teslimi tamamla
                    updateOrderStatus(selectingPayment.orderId, selectingPayment.status);
                    setSelectingPayment(null);
                    if ('vibrate' in navigator) navigator.vibrate(50);
                  }
                }}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg"
              >
                TESLİMİ ONAYLA
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-900 text-white pt-10 pb-3 px-4 shadow-lg shrink-0 z-[110]">
        <div className="flex justify-between items-center">
          {/* Sol: Kurye adı */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-slate-900 text-xl font-black">
              {selectedCourier?.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-base font-black uppercase tracking-tight">{selectedCourier?.name.split(' ')[0]}</h1>
            </div>
          </div>

          {/* Orta: Durum rozeti */}
          <div className="flex items-center gap-2">
            {activeOrders.length === 0 ? (
              <div className="px-3 py-1.5 bg-emerald-500 rounded-full flex items-center gap-1.5">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-[11px] font-black uppercase">MÜSAİT</span>
              </div>
            ) : activeOrders.some(o => o.status === OrderStatus.ON_WAY) ? (
              <div className="px-3 py-1.5 bg-amber-500 rounded-full flex items-center gap-1.5">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-[11px] font-black uppercase">YOLDA</span>
              </div>
            ) : (
              <div className="px-3 py-1.5 bg-indigo-500 rounded-full flex items-center gap-1.5">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="text-[11px] font-black uppercase">BEKLİYOR</span>
              </div>
            )}
          </div>

          {/* Sağ: Yenile ve kurye değiştir */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsRefreshing(true);
                onRefresh?.();
                setTimeout(() => setIsRefreshing(false), 1000);
              }}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isRefreshing ? 'bg-emerald-500 animate-spin' : 'bg-white/10'}`}
              disabled={isRefreshing}
            >
              <i className="fas fa-sync-alt text-sm"></i>
            </button>
            <div className="relative">
              <select
                value={courierId}
                onChange={(e) => onCourierChange(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl text-[11px] font-black uppercase outline-none px-3 py-2 appearance-none pr-7 text-white w-24"
              >
                {couriers.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name.split(' ')[0]}</option>)}
              </select>
              <i className="fas fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none text-white/50"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-5 w-full scroll-smooth">
        <div className="max-w-md mx-auto">
          {activeTab === 'tasks' && renderTasks()}
          {activeTab === 'inventory' && renderInventory()}
          {activeTab === 'profile' && renderProfile()}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-[120] bg-slate-900 border-t border-white/10">
        <div className="flex justify-around items-center py-3 px-4 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'tasks' ? 'scale-105' : 'opacity-40'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === 'tasks' ? 'bg-white text-slate-900' : 'text-white'}`}>
              <i className="fas fa-clipboard-list text-base"></i>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider ${activeTab === 'tasks' ? 'text-white' : 'text-white/60'}`}>İşler</span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'inventory' ? 'scale-105' : 'opacity-40'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === 'inventory' ? 'bg-white text-slate-900' : 'text-white'}`}>
              <i className="fas fa-boxes-stacked text-base"></i>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider ${activeTab === 'inventory' ? 'text-white' : 'text-white/60'}`}>Stok</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profile' ? 'scale-105' : 'opacity-40'}`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${activeTab === 'profile' ? 'bg-white text-slate-900' : 'text-white'}`}>
              <i className="fas fa-user text-base"></i>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-wider ${activeTab === 'profile' ? 'text-white' : 'text-white/60'}`}>Profil</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourierPanel;
