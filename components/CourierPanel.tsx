
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
}

type CourierTab = 'tasks' | 'inventory' | 'profile';

// Yeni, daha uzun ve dikkat çekici bildirim sesi (Emergency Alert Style)
const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/1110/1110-preview.mp3';

const CourierPanel: React.FC<CourierPanelProps> = ({ orders, updateOrderStatus, courierId, onCourierChange, couriers, onUpdateCourier }) => {
  const [activeTab, setActiveTab] = useState<CourierTab>('tasks');
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
  const [confirmingAction, setConfirmingAction] = useState<{orderId: string, status: OrderStatus} | null>(null);
  const selectedCourier = useMemo(() => couriers.find(c => c.id === courierId), [couriers, courierId]);

  const [localFull, setLocalFull] = useState(selectedCourier?.fullInventory || 0);
  const [localEmpty, setLocalEmpty] = useState(selectedCourier?.emptyInventory || 0);

  const prevOrderIds = useRef<string[]>([]);
  
  const activeOrders = useMemo(() => orders.filter(o => o.status === OrderStatus.PENDING || o.status === OrderStatus.ON_WAY), [orders]);
  const completedToday = useMemo(() => orders.filter(o => o.status === OrderStatus.DELIVERED), [orders]);
  
  const totalDeliveredProducts = useMemo(() => {
    return completedToday.reduce((sum, o) => sum + o.items.reduce((iSum, item) => iSum + item.quantity, 0), 0);
  }, [completedToday]);

  const playNotification = async () => {
    try {
      const audio = new Audio(NOTIFICATION_SOUND_URL);
      audio.volume = 1.0;
      if ('vibrate' in navigator) {
        // Daha uzun ve kesik kesik bir titreşim paterni
        navigator.vibrate([1000, 500, 1000, 500, 1000]); 
      }
      await audio.play();
    } catch (error) {
      console.log("Ses çalma başarısız:", error);
    }
  };

  useEffect(() => {
    const currentIds = activeOrders.map(o => o.id);
    // Sadece gerçekten yeni bir sipariş ID'si eklendiğinde ses çal
    const hasNewOrder = currentIds.some(id => !prevOrderIds.current.includes(id));
    if (hasNewOrder && prevOrderIds.current.length > 0) {
      playNotification();
    }
    prevOrderIds.current = currentIds;
  }, [activeOrders]);

  useEffect(() => {
    if (selectedCourier) {
      setLocalFull(selectedCourier.fullInventory);
      setLocalEmpty(selectedCourier.emptyInventory);
    }
  }, [selectedCourier]);

  const unlockAudio = () => {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 0.05;
    audio.play().then(() => {
      setIsAudioUnlocked(true);
      if ('vibrate' in navigator) navigator.vibrate(100);
      setTimeout(() => {
        audio.pause();
        audio.currentTime = 0;
      }, 500);
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-40">
      {!isAudioUnlocked && (
        <button 
          onClick={unlockAudio}
          className="w-full bg-rose-600 text-white p-6 rounded-3xl font-black text-xs uppercase tracking-[0.2em] flex flex-col items-center justify-center gap-3 shadow-2xl animate-bounce border-b-8 border-rose-800"
        >
          <div className="flex items-center gap-4">
            <i className="fas fa-volume-high text-2xl"></i>
            <span>SESLİ BİLDİRİMLERİ AKTİF ET</span>
          </div>
          <span className="text-[8px] opacity-70">TELEFONUN ÇALMASI İÇİN BURAYA BİR KEZ TIKLAMALISIN</span>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3 mb-2">
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AKTİF İŞ</span>
          <span className="text-2xl font-black text-indigo-600 tracking-tighter">{activeOrders.length}</span>
        </div>
        <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TAMAMLANAN</span>
          <span className="text-2xl font-black text-emerald-500 tracking-tighter">{completedToday.length}</span>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <h2 className="text-xs font-black text-slate-900 uppercase tracking-[0.1em]">GÜNCEL GÖREVLER</h2>
        <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full">
           <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></div>
           <span className="text-[9px] font-black text-indigo-600">CANLI AKIŞ</span>
        </div>
      </div>

      {activeOrders.length > 0 ? (
        activeOrders.map(order => (
          <div key={order.id} className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 overflow-hidden relative group">
            <div className={`absolute top-0 left-0 right-0 h-2 ${order.status === OrderStatus.ON_WAY ? 'bg-indigo-500' : 'bg-amber-400'}`}></div>
            
            <div className="p-6 pt-8 space-y-5">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                   <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SİPARİŞ #{order.id.slice(-4)}</span>
                   </div>
                   <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase leading-tight">{order.customerName}</h3>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 text-right">
                   <p className="text-lg font-black text-slate-900 tracking-tighter leading-none">{order.totalAmount}₺</p>
                   <p className="text-[9px] font-black text-slate-400 mt-1 uppercase">NAKİT/KART</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-4 bg-slate-50 p-5 rounded-[1.8rem] border border-slate-100">
                  <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-rose-500 shadow-sm shrink-0 border border-slate-100">
                     <i className="fas fa-location-dot"></i>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-700 leading-relaxed uppercase">{order.address}</p>
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-[10px] font-black text-indigo-600 mt-2 uppercase tracking-widest hover:text-indigo-800"
                    >
                      <i className="fas fa-diamond-turn-right"></i> HARİTADA GÖR
                    </a>
                  </div>
                </div>

                {order.note && (
                  <div className="flex items-start gap-3 px-5 py-3 bg-amber-50/50 rounded-2xl border border-amber-100">
                    <i className="fas fa-quote-left text-amber-300 text-[10px] mt-1"></i>
                    <p className="text-[11px] font-bold text-amber-900/70 italic leading-snug">{order.note}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {order.items.map((item, idx) => (
                  <div key={idx} className="bg-white px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-2 shadow-sm">
                    <span className="bg-indigo-600 text-white w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-black">{item.quantity}</span>
                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{item.productName}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <a href={`tel:${order.phone}`} className="flex items-center justify-center gap-2 py-4 bg-white border-2 border-slate-100 rounded-2xl text-slate-600 font-black text-[11px] uppercase tracking-widest active:bg-slate-50 transition-all">
                  <i className="fas fa-phone"></i> ARA
                </a>
                {order.status === OrderStatus.PENDING ? (
                  <button 
                    onClick={() => setConfirmingAction({orderId: order.id, status: OrderStatus.ON_WAY})}
                    className="flex items-center justify-center gap-2 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all border-b-4 border-indigo-800"
                  >
                    <i className="fas fa-truck-fast"></i> YOLA ÇIKTIM
                  </button>
                ) : (
                  <button 
                    onClick={() => setConfirmingAction({orderId: order.id, status: OrderStatus.DELIVERED})}
                    className="flex items-center justify-center gap-2 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-100 active:scale-95 transition-all border-b-4 border-emerald-800"
                  >
                    <i className="fas fa-check-double"></i> TESLİM ETTİM
                  </button>
                )}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="py-32 text-center space-y-6">
          <div className="w-24 h-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl border border-slate-50">
            <i className="fas fa-mug-hot text-4xl text-slate-200"></i>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Şu an işin yok</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mola verebilirsin kurye!</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-6 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-xl space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-[8rem] -rotate-12 translate-x-12 -translate-y-8 pointer-events-none">
           <i className="fas fa-boxes-stacked"></i>
        </div>
        <div className="text-center space-y-2 relative z-10">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">ARAÇ ENVANTERİ</h2>
          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em]">Saha Stok Seviyesi</p>
        </div>
        <div className="space-y-5">
          <div className="p-7 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100 flex items-center justify-between group">
            <div className="space-y-4">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">DOLU DAMACANA</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setLocalFull(Math.max(0, localFull - 1))} className="w-12 h-12 bg-white rounded-2xl text-indigo-600 font-black border border-indigo-200 shadow-sm active:scale-90">-</button>
                <input type="number" value={localFull} onChange={(e) => setLocalFull(Math.max(0, parseInt(e.target.value) || 0))} className="w-14 h-12 bg-transparent text-center font-black text-xl outline-none" />
                <button onClick={() => setLocalFull(localFull + 1)} className="w-12 h-12 bg-white rounded-2xl text-indigo-600 font-black border border-indigo-200 shadow-sm active:scale-90">+</button>
              </div>
            </div>
            <div className="text-right">
               <span className="text-6xl font-black text-indigo-600 tracking-tighter">{localFull}</span>
            </div>
          </div>
          <div className="p-7 bg-slate-50/80 rounded-[2.5rem] border border-slate-200 flex items-center justify-between">
            <div className="space-y-4">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">BOŞ İADE</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setLocalEmpty(Math.max(0, localEmpty - 1))} className="w-12 h-12 bg-white rounded-2xl text-slate-600 font-black border border-slate-200 shadow-sm active:scale-90">-</button>
                <input type="number" value={localEmpty} onChange={(e) => setLocalEmpty(Math.max(0, parseInt(e.target.value) || 0))} className="w-14 h-12 bg-transparent text-center font-black text-xl outline-none" />
                <button onClick={() => setLocalEmpty(localEmpty + 1)} className="w-12 h-12 bg-white rounded-2xl text-slate-600 font-black border border-slate-200 shadow-sm active:scale-90">+</button>
              </div>
            </div>
            <div className="text-right">
               <span className="text-6xl font-black text-slate-900 tracking-tighter">{localEmpty}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={handleUpdateStock}
          className="w-full py-5 bg-slate-900 text-white rounded-[1.8rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl active:scale-[0.98] transition-all border-b-8 border-slate-950 flex items-center justify-center gap-3"
        >
          <i className="fas fa-cloud-upload-alt text-lg"></i>
          STOKU MERKEZE BİLDİR
        </button>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-6 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-xl text-center space-y-8 relative overflow-hidden">
        <div className="flex flex-col items-center relative z-10">
          <div className="relative mb-6">
            <div className="w-28 h-28 rounded-[2.5rem] bg-indigo-600 flex items-center justify-center text-5xl font-black text-white shadow-2xl border-b-8 border-indigo-800 rotate-3">
              {selectedCourier?.name.charAt(0)}
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 rounded-2xl border-4 border-white flex items-center justify-center text-white text-xs">
              <i className="fas fa-check"></i>
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">{selectedCourier?.name}</h2>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black px-4 py-1.5 rounded-full border border-indigo-100 uppercase tracking-widest">
              {selectedCourier?.serviceRegion || 'SAHA PERSONELİ'}
            </span>
            <span className="bg-slate-900 text-white text-[10px] font-black px-4 py-1.5 rounded-full border border-slate-800 uppercase tracking-widest">
              {selectedCourier?.id}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">DAMACANA</p>
            <p className="text-3xl font-black text-indigo-600 tracking-tighter">{totalDeliveredProducts}</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">TOPLAM ADRES</p>
            <p className="text-3xl font-black text-slate-900 tracking-tighter">{completedToday.length}</p>
          </div>
        </div>
        <div className="bg-slate-900 p-7 rounded-[2.5rem] text-white flex justify-between items-center shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="text-left relative z-10">
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">GÜNLÜK CİRO</span>
            <p className="text-3xl font-black tracking-tighter">{completedToday.reduce((sum, o) => sum + o.totalAmount, 0)}₺</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-2xl relative z-10 backdrop-blur-sm">
             <i className="fas fa-wallet text-indigo-400"></i>
          </div>
        </div>
        <button className="w-full py-5 bg-rose-50 text-rose-600 rounded-[1.8rem] font-black text-[11px] uppercase tracking-widest border-2 border-rose-100 active:bg-rose-100 transition-colors flex items-center justify-center gap-3">
          <i className="fas fa-power-off"></i>
          MESAİYİ SONLANDIR
        </button>
      </div>
      <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-lg space-y-6">
        <div className="flex justify-between items-center px-2">
           <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-3">
              <i className="fas fa-history text-indigo-500"></i> SON TESLİMATLAR
           </h3>
           <span className="text-[9px] font-bold text-slate-300">GÜNCEL GEÇMİŞ</span>
        </div>
        <div className="space-y-4">
          {completedToday.slice().sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 15).map(order => (
            <div key={order.id} className="p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 group transition-all hover:bg-white hover:shadow-lg hover:border-emerald-200">
              <div className="flex justify-between items-start mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-sm font-black text-slate-900 uppercase truncate block">{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase">
                      <i className="far fa-calendar-check mr-1"></i> {formatDateTime(order.updatedAt)}
                    </span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="text-[10px] font-black text-emerald-600 uppercase">TESLİM EDİLDİ</span>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-sm font-black text-slate-900">{order.totalAmount}₺</p>
                </div>
              </div>
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-start gap-3">
                   <i className="fas fa-map-marker-alt text-slate-300 text-[10px] mt-1"></i>
                   <p className="text-[11px] font-bold text-slate-600 leading-snug uppercase">{order.address}</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                   {order.items.map((item, idx) => (
                     <div key={idx} className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-slate-500 uppercase flex items-center gap-1.5">
                       <span className="text-indigo-600">{item.quantity}x</span>
                       {item.productName}
                     </div>
                   ))}
                </div>
              </div>
            </div>
          ))}
          {completedToday.length === 0 && (
             <div className="py-10 text-center text-[10px] font-black text-slate-300 uppercase tracking-widest border-2 border-dashed border-slate-100 rounded-3xl">
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
          <div className="bg-white w-full max-w-xs rounded-[3rem] p-8 text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl mx-auto ${confirmingAction.status === OrderStatus.DELIVERED ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'}`}>
              <i className={`fas ${confirmingAction.status === OrderStatus.DELIVERED ? 'fa-check-circle' : 'fa-truck-fast'}`}></i>
            </div>
            <div className="space-y-2">
               <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">EMİN MİSİN?</h3>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                 {confirmingAction.status === OrderStatus.DELIVERED ? 'TESLİMATI ONAYLIYOR MUSUN?' : 'YOLA ÇIKIŞI ONAYLIYOR MUSUN?'}
               </p>
            </div>
            <div className="flex flex-col gap-2">
               <button 
                 onClick={handleUpdateStatusConfirm}
                 className={`w-full py-4 rounded-2xl text-white font-black text-[11px] uppercase tracking-widest shadow-xl transition-all active:scale-95 ${confirmingAction.status === OrderStatus.DELIVERED ? 'bg-emerald-600' : 'bg-indigo-600'}`}
               >
                 EVET, ONAYLA
               </button>
               <button 
                 onClick={() => setConfirmingAction(null)}
                 className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black text-[11px] uppercase tracking-widest"
               >
                 İPTAL
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#0f172a] text-white pt-12 pb-12 px-8 rounded-b-[4rem] shadow-[0_20px_60px_rgba(0,0,0,0.3)] shrink-0 z-[110] relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-[0.05] text-[10rem] pointer-events-none">
           <i className="fas fa-droplet"></i>
        </div>
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-[1.4rem] bg-indigo-600 flex items-center justify-center text-2xl font-black shadow-2xl shadow-indigo-500/40 border-b-4 border-indigo-800 rotate-6">
                {selectedCourier?.name.charAt(0)}
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#0f172a] animate-pulse"></div>
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-black tracking-tighter leading-tight uppercase truncate max-w-[160px]">{selectedCourier?.name.split(' ')[0]}</h1>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mt-1">SAHA PANELİ</p>
            </div>
          </div>
          <div className="relative">
            <select 
              value={courierId}
              onChange={(e) => onCourierChange(e.target.value)}
              className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none px-4 py-3 appearance-none pr-8 text-white min-w-[120px]"
            >
              {couriers.map(c => <option key={c.id} value={c.id} className="bg-slate-900">{c.name.split(' ')[0]}</option>)}
            </select>
            <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-[10px] pointer-events-none text-white/50"></i>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-8 w-full scroll-smooth">
        <div className="max-w-md mx-auto">
          {activeTab === 'tasks' && renderTasks()}
          {activeTab === 'inventory' && renderInventory()}
          {activeTab === 'profile' && renderProfile()}
        </div>
      </div>

      <div className="fixed bottom-8 left-6 right-6 z-[120]">
        <div className="bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 h-24 rounded-[3rem] shadow-[0_25px_80px_rgba(0,0,0,0.4)] flex justify-around items-center px-4 max-w-md mx-auto">
          <button 
            onClick={() => setActiveTab('tasks')}
            className={`flex-1 flex flex-col items-center gap-2 transition-all duration-300 ${activeTab === 'tasks' ? 'scale-110' : 'opacity-40'}`}
          >
            <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all duration-300 ${activeTab === 'tasks' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'text-white'}`}>
              <i className="fas fa-clipboard-list text-xl"></i>
            </div>
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${activeTab === 'tasks' ? 'text-indigo-400' : 'text-white'}`}>İşler</span>
          </button>
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 flex flex-col items-center gap-2 transition-all duration-300 ${activeTab === 'inventory' ? 'scale-110' : 'opacity-40'}`}
          >
            <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all duration-300 ${activeTab === 'inventory' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'text-white'}`}>
              <i className="fas fa-truck-ramp-box text-xl"></i>
            </div>
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${activeTab === 'inventory' ? 'text-indigo-400' : 'text-white'}`}>Stok</span>
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`flex-1 flex flex-col items-center gap-2 transition-all duration-300 ${activeTab === 'profile' ? 'scale-110' : 'opacity-40'}`}
          >
            <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center transition-all duration-300 ${activeTab === 'profile' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'text-white'}`}>
              <i className="fas fa-user-ninja text-xl"></i>
            </div>
            <span className={`text-[8px] font-black uppercase tracking-[0.2em] ${activeTab === 'profile' ? 'text-indigo-400' : 'text-white'}`}>Profil</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CourierPanel;
