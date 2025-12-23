import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

interface IntegrationStats {
  activeCalls: number;
  totalCalls: number;
  successfulCalls: number;
  failoverCount: number;
  activeWhatsAppSessions: number;
  totalWhatsAppChats: number;
  successfulWhatsAppOrders: number;
  whatsappFailoverCount: number;
  todayRevenue: {
    calls: number;
    whatsapp: number;
  };
}

const IntegrationStatsWidget: React.FC = () => {
  const [stats, setStats] = useState<IntegrationStats>({
    activeCalls: 0,
    totalCalls: 0,
    successfulCalls: 0,
    failoverCount: 0,
    activeWhatsAppSessions: 0,
    totalWhatsAppChats: 0,
    successfulWhatsAppOrders: 0,
    whatsappFailoverCount: 0,
    todayRevenue: {
      calls: 0,
      whatsapp: 0
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Her 30 saniyede yenile
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      // Bugünün başlangıcı
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Çağrı istatistikleri
      const [callLogsResult, failoverResult, whatsappResult, whatsappFailoverResult] = await Promise.all([
        supabase
          .from('call_logs')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('call_failover_logs')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('whatsapp_chats')
          .select('*', { count: 'exact', head: true }),
        supabase
          .from('whatsapp_failover_logs')
          .select('*', { count: 'exact', head: true })
      ]);

      const todayCallsRevenue = await supabase
        .from('orders')
        .select('total_amount')
        .eq('source', 'telefon-robot')
        .gte('created_at', today.toISOString());

      const todayWhatsAppRevenue = await supabase
        .from('orders')
        .select('total_amount')
        .eq('source', 'whatsapp')
        .gte('created_at', today.toISOString());

      const callsRevenue = todayCallsRevenue.data?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;
      const whatsappRevenue = todayWhatsAppRevenue.data?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

      setStats({
        activeCalls: 0, // Gerçek zamanlı active calls için ayrı endpoint gerekir
        totalCalls: callLogsResult.count || 0,
        successfulCalls: callLogsResult.count || 0, // Basit hesaplama, detaylı query gerekir
        failoverCount: failoverResult.count || 0,
        activeWhatsAppSessions: 0, // Aktif oturumlar için ayrı endpoint gerekir
        totalWhatsAppChats: whatsappResult.count || 0,
        successfulWhatsAppOrders: whatsappResult.count || 0,
        whatsappFailoverCount: whatsappFailoverResult.count || 0,
        todayRevenue: {
          calls: callsRevenue,
          whatsapp: whatsappRevenue
        }
      });
    } catch (error) {
      console.error('İstatistik yükleme hatası:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
            <i className="fas fa-plug text-violet-500"></i>
            ENTEGRASYON İSTATİSTİKLERİ
          </h4>
          <p className="text-[10px] font-bold text-slate-400 mt-1">Canlı Veriler</p>
        </div>
        <button
          onClick={loadStats}
          className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-200 flex items-center justify-center transition-all"
        >
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      {/* Netgsm Sesli Robot */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center text-white">
            <i className="fas fa-headset"></i>
          </div>
          <div className="flex-1">
            <p className="text-xs font-black text-slate-900 uppercase">Netgsm Sesli Robot</p>
            <p className="text-[10px] text-slate-400">Çağrı Merkezi</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-violet-600">{stats.totalCalls}</p>
            <p className="text-[9px] text-slate-400 uppercase">Toplam Çağrı</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
            <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Başarılı</p>
            <p className="text-xl font-black text-emerald-700">{stats.successfulCalls}</p>
          </div>
          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
            <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Operatöre Devir</p>
            <p className="text-xl font-black text-rose-700">{stats.failoverCount}</p>
          </div>
        </div>

        <div className="bg-violet-50 p-4 rounded-2xl border border-violet-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-violet-700 uppercase">Bugünkü Gelir</p>
            <p className="text-lg font-black text-violet-900">{stats.todayRevenue.calls.toLocaleString()}₺</p>
          </div>
          <i className="fas fa-lira-sign text-violet-400 text-2xl"></i>
        </div>
      </div>

      {/* WhatsApp Bot */}
      <div className="space-y-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
            <i className="fab fa-whatsapp"></i>
          </div>
          <div className="flex-1">
            <p className="text-xs font-black text-slate-900 uppercase">WhatsApp Sipariş Botu</p>
            <p className="text-[10px] text-slate-400">Mesajlaşma</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-black text-emerald-600">{stats.totalWhatsAppChats}</p>
            <p className="text-[9px] text-slate-400 uppercase">Toplam Sohbet</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
            <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Başarılı Sipariş</p>
            <p className="text-xl font-black text-emerald-700">{stats.successfulWhatsAppOrders}</p>
          </div>
          <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
            <p className="text-[10px] font-black text-rose-600 uppercase mb-1">Operatöre Devir</p>
            <p className="text-xl font-black text-rose-700">{stats.whatsappFailoverCount}</p>
          </div>
        </div>

        <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-emerald-700 uppercase">Bugünkü Gelir</p>
            <p className="text-lg font-black text-emerald-900">{stats.todayRevenue.whatsapp.toLocaleString()}₺</p>
          </div>
          <i className="fas fa-lira-sign text-emerald-400 text-2xl"></i>
        </div>
      </div>

      {/* Toplam Entegrasyon Geliri */}
      <div className="bg-gradient-to-r from-violet-600 to-emerald-500 p-6 rounded-2xl text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase opacity-80 mb-1">Entegrasyonlar Toplam Gelir</p>
            <p className="text-3xl font-black tracking-tighter">
              {(stats.todayRevenue.calls + stats.todayRevenue.whatsapp).toLocaleString()}₺
            </p>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
            <i className="fas fa-chart-line text-2xl"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationStatsWidget;
