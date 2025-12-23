import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

interface CallLog {
  id: string;
  callerId: string;
  customerName?: string;
  customerFound: boolean;
  transcript: string;
  orderData?: any;
  status: 'success' | 'failed' | 'incomplete';
  errorMessage?: string;
  createdAt: string;
}

interface FailoverLog {
  id: string;
  callId?: string;
  caller_id: string;
  reason_type: string;
  stage: string;
  message: string;
  transcript?: string;
  customer_found: boolean;
  customer_name?: string;
  order_data?: any;
  created_at: string;
}

interface WhatsAppChat {
  id: string;
  phone_number: string;
  customer_name?: string;
  customer_found: boolean;
  messages: string[];
  order_data?: any;
  status: 'success' | 'failover' | 'incomplete';
  created_at: string;
}

const IntegrationLogsViewer: React.FC = () => {
  const [activeLogTab, setActiveLogTab] = useState<'calls' | 'failover' | 'whatsapp'>('calls');
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [failoverLogs, setFailoverLogs] = useState<FailoverLog[]>([]);
  const [whatsappChats, setWhatsappChats] = useState<WhatsAppChat[]>([]);
  const [loading, setLoading] = useState(false);

  // Logları yükle
  useEffect(() => {
    loadLogs();
  }, [activeLogTab]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      if (activeLogTab === 'calls') {
        await loadCallLogs();
      } else if (activeLogTab === 'failover') {
        await loadFailoverLogs();
      } else if (activeLogTab === 'whatsapp') {
        await loadWhatsAppChats();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadCallLogs = async () => {
    try {
      const { data } = await supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setCallLogs(data.map((log: any) => ({
          id: log.id,
          callerId: log.caller_id,
          customerName: log.customer_name,
          customerFound: log.customer_found,
          transcript: log.transcript,
          orderData: log.order_data,
          status: log.status,
          errorMessage: log.error_message,
          createdAt: log.created_at
        })));
      }
    } catch (error) {
      console.error('Çağrı logları hatası:', error);
    }
  };

  const loadFailoverLogs = async () => {
    try {
      const { data } = await supabase
        .from('call_failover_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setFailoverLogs(data);
      }
    } catch (error) {
      console.error('Failover logları hatası:', error);
    }
  };

  const loadWhatsAppChats = async () => {
    try {
      const { data } = await supabase
        .from('whatsapp_chats')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (data) {
        setWhatsappChats(data);
      }
    } catch (error) {
      console.error('WhatsApp chat logları hatası:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">ENTEGRASYON LOGLARI</h2>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">
            Çağrı, Failover ve WhatsApp Geçmişi
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-xl hover:bg-indigo-700 transition-all flex items-center gap-2"
        >
          <i className="fas fa-sync-alt"></i>
          Yenile
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 inline-flex gap-2">
        <button
          onClick={() => setActiveLogTab('calls')}
          className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeLogTab === 'calls'
              ? 'bg-violet-600 text-white'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          <i className="fas fa-phone-alt mr-2"></i>
          Çağrılar
        </button>
        <button
          onClick={() => setActiveLogTab('failover')}
          className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeLogTab === 'failover'
              ? 'bg-rose-600 text-white'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          <i className="fas fa-exclamation-triangle mr-2"></i>
          Failover
        </button>
        <button
          onClick={() => setActiveLogTab('whatsapp')}
          className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeLogTab === 'whatsapp'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          <i className="fab fa-whatsapp mr-2"></i>
          WhatsApp
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white rounded-2xl p-12 text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-xs font-black text-slate-400 uppercase">Yükleniyor...</p>
        </div>
      )}

      {/* Çağrı Logları */}
      {!loading && activeLogTab === 'calls' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Tarih</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefon</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Müşteri</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Durum</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Sipariş</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Konuşma</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {callLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <i className="fas fa-phone-slash text-3xl text-slate-200 mb-3"></i>
                      <p className="text-xs font-black text-slate-400 uppercase">Henüz çağrı kaydı yok</p>
                    </td>
                  </tr>
                ) : (
                  callLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-600">{formatDate(log.createdAt)}</td>
                      <td className="px-6 py-4 text-xs font-black text-slate-900">{log.callerId}</td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {log.customerName || <span className="text-rose-500">Kayıtsız</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                          log.status === 'success'
                            ? 'bg-emerald-100 text-emerald-700'
                            : log.status === 'failed'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {log.orderData ? (
                          <div>
                            <span className="font-black text-violet-600">{log.orderData.product} x {log.orderData.quantity}</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 italic max-w-xs truncate">
                        {log.transcript}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Failover Logları */}
      {!loading && activeLogTab === 'failover' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-rose-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-rose-400 uppercase tracking-widest">Tarih</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-rose-400 uppercase tracking-widest">Telefon</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-rose-400 uppercase tracking-widest">Müşteri</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-rose-400 uppercase tracking-widest">Sebep</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-rose-400 uppercase tracking-widest">Aşama</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-rose-400 uppercase tracking-widest">Mesaj</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {failoverLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <i className="fas fa-check-circle text-3xl text-emerald-200 mb-3"></i>
                      <p className="text-xs font-black text-slate-400 uppercase">Failover kaydı yok (harika!)</p>
                    </td>
                  </tr>
                ) : (
                  failoverLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-rose-50 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-600">{formatDate(log.created_at)}</td>
                      <td className="px-6 py-4 text-xs font-black text-slate-900">{log.caller_id}</td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {log.customer_name || <span className="text-rose-500">Kayıtsız</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded bg-rose-100 text-rose-700 text-[9px] font-black uppercase">
                          {log.reason_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 capitalize">{log.stage}</td>
                      <td className="px-6 py-4 text-xs text-slate-500 italic">{log.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* WhatsApp Chat Logları */}
      {!loading && activeLogTab === 'whatsapp' && (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-emerald-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-emerald-400 uppercase tracking-widest">Tarih</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-emerald-400 uppercase tracking-widest">Telefon</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-emerald-400 uppercase tracking-widest">Müşteri</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-emerald-400 uppercase tracking-widest">Durum</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-emerald-400 uppercase tracking-widest">Sipariş</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-emerald-400 uppercase tracking-widest">Mesajlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {whatsappChats.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <i className="fab fa-whatsapp text-3xl text-emerald-200 mb-3"></i>
                      <p className="text-xs font-black text-slate-400 uppercase">Henüz WhatsApp kaydı yok</p>
                    </td>
                  </tr>
                ) : (
                  whatsappChats.map((chat) => (
                    <tr key={chat.id} className="hover:bg-emerald-50 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-600">{formatDate(chat.created_at)}</td>
                      <td className="px-6 py-4 text-xs font-black text-slate-900">{chat.phone_number}</td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {chat.customer_name || <span className="text-rose-500">Kayıtsız</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                          chat.status === 'success'
                            ? 'bg-emerald-100 text-emerald-700'
                            : chat.status === 'failover'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {chat.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600">
                        {chat.order_data ? (
                          <span className="font-black text-emerald-600">
                            {chat.order_data.product} x {chat.order_data.quantity}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500">
                        <div className="max-w-xs">
                          {chat.messages?.slice(-2).map((msg, i) => (
                            <div key={i} className="bg-slate-50 rounded px-2 py-1 mb-1 truncate">
                              "{msg}"
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationLogsViewer;
