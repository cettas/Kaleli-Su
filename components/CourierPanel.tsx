
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Order, OrderStatus, Courier } from '../types';
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
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      {/* Ses Test Butonu - Her zaman görünür */}
      <button
        onClick={unlockAudio}
        className={`w-full text-white p-4 rounded-2xl font-black text-xs uppercase tracking-[0.15em] flex flex-col items-center justify-center gap-2 shadow-xl border-b-4 transition-all ${
          isAudioUnlocked
            ? 'bg-emerald-600 border-emerald-800'
            : 'bg-rose-600 border-rose-800 animate-bounce'
        }`}
      >
        <div className="flex items-center gap-3">
          <i className="fas fa-volume-high text-lg"></i>
          <span className="text-sm">{isAudioUnlocked ? 'SES AKTİF ✓' : 'SESİ AÇ'}</span>
        </div>
        <span className="text-[10px] opacity-70">
          {isAudioUnlocked ? 'Bildirimler için hazır' : 'İlk sipariş için sesi aç'}
        </span>
      </button>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-1">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">AKTİF İŞ</span>
          <span className="text-xl font-black text-indigo-600 tracking-tighter">{activeOrders.length}</span>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-1">
          <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">TAMAMLANAN</span>
          <span className="text-xl font-black text-emerald-500 tracking-tighter">{completedToday.length}</span>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.1em]">GÜNCEL GÖREVLER</h2>
        <div className="flex items-center gap-2 bg-indigo-50 px-2 py-1 rounded-full">
           <div className="w-1 h-1 bg-indigo-500 rounded-full animate-ping"></div>
           <span className="text-[11px] font-black text-indigo-600">CANLI</span>
        </div>
      </div>

      {activeOrders.length > 0 ? (
        activeOrders.map(order => (
          <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative">
            <div className={`h-1 ${order.status === OrderStatus.ON_WAY ? 'bg-indigo-500' : 'bg-amber-400'}`}></div>

            <div className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5 flex-1 min-w-0">
                   <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                      <span className="text-[10px] font-black text-slate-400 uppercase">#{order.id.slice(-4)}</span>
                   </div>
                   <h3 className="text-sm font-black text-slate-900 uppercase leading-tight truncate">{order.customerName}</h3>
                </div>
                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 text-right shrink-0 ml-2">
                   <p className="text-base font-black text-slate-900">{order.totalAmount}₺</p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-rose-500 shadow-sm shrink-0 border border-slate-100">
                   <i className="fas fa-location-dot text-sm"></i>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold text-slate-700 leading-snug uppercase line-clamp-2">{order.address}</p>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-black text-indigo-600 mt-1 uppercase hover:text-indigo-800"
                  >
                    <i className="fas fa-diamond-turn-right text-xs"></i> HARİTA
                  </a>
                </div>
              </div>

              {order.note && (
                <div className="flex items-start gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
                  <i className="fas fa-quote-left text-amber-300 text-xs mt-0.5"></i>
                  <p className="text-[10px] font-bold text-amber-900 italic leading-snug">{order.note}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {order.items.map((item, idx) => (
                  <div key={idx} className="bg-white px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-sm">
                    <span className="bg-indigo-600 text-white w-4 h-4 rounded-md flex items-center justify-center text-[10px] font-black">{item.quantity}</span>
                    <span className="text-[11px] font-black text-slate-600 uppercase">{item.productName}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <a href={`tel:${order.phone}`} className="flex items-center justify-center gap-1.5 py-3 bg-white border-2 border-slate-100 rounded-xl text-slate-600 font-black text-[10px] uppercase active:bg-slate-50 transition-all">
                  <i className="fas fa-phone text-sm"></i> ARA
                </a>
                {order.status === OrderStatus.PENDING ? (
                  <button
                    onClick={() => setConfirmingAction({orderId: order.id, status: OrderStatus.ON_WAY})}
                    className="flex items-center justify-center gap-1.5 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase shadow active:scale-95 transition-all border-b-3 border-indigo-800"
                  >
                    <i className="fas fa-truck-fast text-sm"></i> YOLA ÇIK
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirmingAction({orderId: order.id, status: OrderStatus.DELIVERED})}
                    className="flex items-center justify-center gap-1.5 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase shadow active:scale-95 transition-all border-b-3 border-emerald-800"
                  >
                    <i className="fas fa-check-double text-sm"></i> TESLİM
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="py-16 text-center space-y-4">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-lg border border-slate-50">
            <i className="fas fa-mug-hot text-2xl text-slate-200"></i>
          </div>
          <div className="space-y-1">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Şu an işin yok</h3>
            <p className="text-[11px] font-bold text-slate-400 uppercase">Mola verebilirsin!</p>
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
    <div className="space-y-4 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg text-center space-y-5 relative overflow-hidden">
        <div className="flex flex-col items-center relative z-10">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-3xl font-black text-white shadow-xl border-b-4 border-indigo-800 rotate-3">
              {selectedCourier?.name.charAt(0)}
            </div>
            <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 bg-emerald-500 rounded-xl border-3 border-white flex items-center justify-center text-white text-xs">
              <i className="fas fa-check text-xs"></i>
            </div>
          </div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">{selectedCourier?.name}</h2>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-3 py-1 rounded-full border border-indigo-100 uppercase">
              {selectedCourier?.serviceRegion || 'SAHA PERSONELİ'}
            </span>
            <span className="bg-slate-900 text-white text-[10px] font-black px-3 py-1 rounded-full border border-slate-800 uppercase">
              {selectedCourier?.id}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">DAMACANA</p>
            <p className="text-2xl font-black text-indigo-600 tracking-tighter">{totalDeliveredProducts}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">TOPLAM ADRES</p>
            <p className="text-2xl font-black text-slate-900 tracking-tighter">{completedToday.length}</p>
          </div>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl text-white flex justify-between items-center shadow-xl relative overflow-hidden">
          <div className="text-left">
            <span className="text-[11px] font-black text-indigo-400 uppercase tracking-widest block mb-1">GÜNLÜK CİRO</span>
            <p className="text-2xl font-black tracking-tighter">{completedToday.reduce((sum, o) => sum + o.totalAmount, 0)}₺</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl backdrop-blur-sm">
             <i className="fas fa-wallet text-indigo-400"></i>
          </div>
        </div>
        <button className="w-full py-3 bg-rose-50 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest border-2 border-rose-100 active:bg-rose-100 flex items-center justify-center gap-2">
          <i className="fas fa-power-off"></i>
          MESAİYİ SONLANDIR
        </button>
      </div>
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-lg space-y-4">
        <div className="flex justify-between items-center px-2">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <i className="fas fa-history text-indigo-500 text-sm"></i> SON TESLİMATLAR
           </h3>
           <span className="text-[10px] font-bold text-slate-300">GÜNCEL</span>
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

      <div className="bg-[#0f172a] text-white pt-8 pb-6 px-4 rounded-b-2xl shadow-lg shrink-0 z-[110] relative overflow-hidden">
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-xl font-black shadow-lg border-b-3 border-indigo-800 rotate-6">
                {selectedCourier?.name.charAt(0)}
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0f172a] animate-pulse"></div>
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-black tracking-tighter leading-tight uppercase truncate max-w-[120px]">{selectedCourier?.name.split(' ')[0]}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-500'} ${isOnline ? 'animate-pulse' : ''}`}></div>
                <p className="text-[10px] font-black uppercase tracking-[0.15em]">{isOnline ? 'ONLINE' : 'OFFLINE'}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setIsRefreshing(true);
                onRefresh?.();
                setTimeout(() => setIsRefreshing(false), 1000);
              }}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white transition-all ${isRefreshing ? 'bg-emerald-500 animate-spin' : 'bg-white/10 hover:bg-white/20'}`}
              disabled={isRefreshing}
            >
              <i className={`fas fa-sync-alt text-sm ${isRefreshing ? '' : ''}`}></i>
            </button>
            <div className="relative">
              <select
                value={courierId}
                onChange={(e) => onCourierChange(e.target.value)}
                className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-[11px] font-black uppercase tracking-widest outline-none px-3 py-2 appearance-none pr-6 text-white min-w-[100px]"
              >
                {couriers.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name.split(' ')[0]}</option>)}
              </select>
              <i className="fas fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-xs pointer-events-none text-white/50"></i>
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

      <div className="fixed bottom-4 left-4 right-4 z-[120]">
        <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 h-18 rounded-2xl shadow-xl flex justify-around items-center px-3 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === 'tasks' ? 'scale-105' : 'opacity-40'}`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${activeTab === 'tasks' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white'}`}>
              <i className="fas fa-clipboard-list text-base"></i>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${activeTab === 'tasks' ? 'text-indigo-400' : 'text-white'}`}>İşler</span>
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === 'inventory' ? 'scale-105' : 'opacity-40'}`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white'}`}>
              <i className="fas fa-truck-ramp-box text-base"></i>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${activeTab === 'inventory' ? 'text-indigo-400' : 'text-white'}`}>Stok</span>
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex flex-col items-center gap-1.5 transition-all duration-300 ${activeTab === 'profile' ? 'scale-105' : 'opacity-40'}`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-white'}`}>
              <i className="fas fa-user-ninja text-base"></i>
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest ${activeTab === 'profile' ? 'text-indigo-400' : 'text-white'}`}>Profil</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourierPanel;
