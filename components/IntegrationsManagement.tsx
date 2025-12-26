import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { CallLog, VoiceOrderSession, VoiceOrderResponse } from '../types';

interface IntegrationSettings {
  trendyol_api_key: string;
  trendyol_api_secret: string;
  trendyol_supplier_id: string;
  trendyol_enabled: boolean;
  getir_enabled: boolean;
  yemeksepeti_enabled: boolean;

  // AI Telefon Robotu Ayarları
  ai_phone_enabled: boolean;
  ai_phone_provider: string;
  ai_phone_api_key: string;
  ai_phone_number: string;
  ai_phone_webhook_url: string;
  ai_phone_system_prompt: string;

  // Netgsm Ayarları
  netgsm_enabled: boolean;
  netgsm_api_key: string;
  netgsm_phone_number: string;
  netgsm_operator_extension: string;
  netgsm_webhook_url: string;

  // WhatsApp Ayarları
  whatsapp_enabled: boolean;
  whatsapp_access_token: string;
  whatsapp_phone_number_id: string;
  whatsapp_verify_token: string;
  whatsapp_operator_phone: string;

  // Sesli Sipariş Asistanı Ayarları
  voice_order_enabled: boolean;
  voice_order_gemini_api_key: string;
  voice_order_test_phone: string;
}

const IntegrationsManagement: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'settings' | 'logs'>('settings');
  const [settings, setSettings] = useState<IntegrationSettings>({
    trendyol_api_key: '',
    trendyol_api_secret: '',
    trendyol_supplier_id: '',
    trendyol_enabled: false,
    getir_enabled: false,
    yemeksepeti_enabled: false,
    ai_phone_enabled: false,
    ai_phone_provider: 'twilio',
    ai_phone_api_key: '',
    ai_phone_number: '',
    ai_phone_webhook_url: '',
    ai_phone_system_prompt: '',
    netgsm_enabled: false,
    netgsm_api_key: '',
    netgsm_phone_number: '',
    netgsm_operator_extension: '100',
    netgsm_webhook_url: '',
    whatsapp_enabled: false,
    whatsapp_access_token: '',
    whatsapp_phone_number_id: '',
    whatsapp_verify_token: 'su_siparis_bot_2024',
    whatsapp_operator_phone: '',
    voice_order_enabled: false,
    voice_order_gemini_api_key: '',
    voice_order_test_phone: '905551234567'
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Çağrı logları için state
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [showCallLogs, setShowCallLogs] = useState(false);
  const [showNetgsmSettings, setShowNetgsmSettings] = useState(false);
  const [showWhatsAppSettings, setShowWhatsAppSettings] = useState(false);

  // Ayarları yükle
  useEffect(() => {
    loadSettings();
    loadCallLogs();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .single();

      if (data && !error) {
        setSettings({
          trendyol_api_key: data.trendyol_api_key || '',
          trendyol_api_secret: data.trendyol_api_secret || '',
          trendyol_supplier_id: data.trendyol_supplier_id || '',
          trendyol_enabled: data.trendyol_enabled || false,
          getir_enabled: data.getir_enabled || false,
          yemeksepeti_enabled: data.yemeksepeti_enabled || false,
          ai_phone_enabled: data.ai_phone_enabled || false,
          ai_phone_provider: data.ai_phone_provider || 'twilio',
          ai_phone_api_key: data.ai_phone_api_key || '',
          ai_phone_number: data.ai_phone_number || '',
          ai_phone_webhook_url: data.ai_phone_webhook_url || '',
          ai_phone_system_prompt: data.ai_phone_system_prompt || '',
          netgsm_enabled: data.netgsm_enabled || false,
          netgsm_api_key: data.netgsm_api_key || '',
          netgsm_phone_number: data.netgsm_phone_number || '',
          netgsm_operator_extension: data.netgsm_operator_extension || '100',
          netgsm_webhook_url: data.netgsm_webhook_url || '',
          whatsapp_enabled: data.whatsapp_enabled || false,
          whatsapp_access_token: data.whatsapp_access_token || '',
          whatsapp_phone_number_id: data.whatsapp_phone_number_id || '',
          whatsapp_verify_token: data.whatsapp_verify_token || 'su_siparis_bot_2024',
          whatsapp_operator_phone: data.whatsapp_operator_phone || '',
          voice_order_enabled: data.voice_order_enabled || false,
          voice_order_gemini_api_key: data.voice_order_gemini_api_key || '',
          voice_order_test_phone: data.voice_order_test_phone || '905551234567'
        });
      }
    } catch (error) {
      console.error('Ayarlar yüklenemedi:', error);
    }
  };

  const loadCallLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (data && !error) {
        setCallLogs(data.map((log: any) => ({
          id: log.id,
          callerId: log.caller_id,
          customerName: log.customer_name,
          customerFound: log.customer_found,
          transcript: log.transcript,
          orderData: log.order_data,
          status: log.status,
          errorMessage: log.error_message,
          createdAt: log.created_at,
          updatedAt: log.updated_at
        })));
      }
    } catch (error) {
      console.error('Çağrı logları yüklenemedi:', error);
    }
  };

  const saveSettings = async () => {
    setSaveStatus('saving');
    try {
      const { error } = await supabase
        .from('integrations')
        .upsert({
          id: 1,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Kayıt hatası:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'testing' | 'success' | 'error'>>({});

  const testConnection = async (service: 'trendyol' | 'netgsm' | 'whatsapp') => {
    setTestStatus(prev => ({ ...prev, [service]: 'testing' }));
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/test/${service}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: service === 'trendyol' ? settings.trendyol_api_key :
                   service === 'netgsm' ? settings.netgsm_api_key : '',
          api_secret: service === 'trendyol' ? settings.trendyol_api_secret : '',
          supplier_id: service === 'trendyol' ? settings.trendyol_supplier_id : '',
          access_token: service === 'whatsapp' ? settings.whatsapp_access_token : '',
          phone_number_id: service === 'whatsapp' ? settings.whatsapp_phone_number_id : ''
        })
      });

      const data = await response.json();

      if (data.success) {
        setTestStatus(prev => ({ ...prev, [service]: 'success' }));
        setTimeout(() => setTestStatus(prev => ({ ...prev, [service]: 'idle' })), 3000);
      } else {
        setTestStatus(prev => ({ ...prev, [service]: 'error' }));
        setTimeout(() => setTestStatus(prev => ({ ...prev, [service]: 'idle' })), 3000);
        alert(data.error || 'Bağlantı başarısız');
      }
    } catch (error) {
      console.error('Test hatası:', error);
      setTestStatus(prev => ({ ...prev, [service]: 'error' }));
      setTimeout(() => setTestStatus(prev => ({ ...prev, [service]: 'idle' })), 3000);
      alert('API sunucusuna bağlanılamadı. Sunucunun çalıştığından emin olun (npm run api)');
    }
  };

  // İstatistikleri hesapla
  const activeIntegrations = [
    settings.trendyol_enabled,
    settings.getir_enabled,
    settings.yemeksepeti_enabled,
    settings.ai_phone_enabled,
    settings.netgsm_enabled,
    settings.whatsapp_enabled
  ].filter(Boolean).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Ana Başlık */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Entegrasyon Yönetimi</h2>
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-2">
            API Ayarları ve Harici Servisler
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === 'saved' && (
            <span className="text-xs font-black text-emerald-600 uppercase flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl">
              <i className="fas fa-check-circle"></i> Kaydedildi
            </span>
          )}
          <button
            onClick={saveSettings}
            disabled={saveStatus === 'saving'}
            className={`px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20 ${
              saveStatus === 'saved'
                ? 'bg-emerald-600 text-white'
                : saveStatus === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white hover:shadow-2xl hover:shadow-indigo-600/30 hover:scale-105'
            }`}
          >
            {saveStatus === 'saving' ? (
              <><i className="fas fa-spinner fa-spin mr-2"></i>Kaydediliyor...</>
            ) : saveStatus === 'saved' ? (
              <><i className="fas fa-check mr-2"></i>Kaydedildi</>
            ) : saveStatus === 'error' ? (
              'Hata'
            ) : (
              <><i className="fas fa-save mr-2"></i>Ayarları Kaydet</>
            )}
          </button>
        </div>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 rounded-2xl text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-300"></div>
          <span className="text-[10px] font-black uppercase opacity-80 block mb-1">Toplam Entegrasyon</span>
          <span className="text-3xl font-black tracking-tighter">6</span>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 rounded-2xl text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-300"></div>
          <span className="text-[10px] font-black uppercase opacity-80 block mb-1">Aktif</span>
          <span className="text-3xl font-black tracking-tighter">{activeIntegrations}</span>
        </div>

        <div className="bg-gradient-to-br from-violet-500 to-violet-600 p-5 rounded-2xl text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-300"></div>
          <span className="text-[10px] font-black uppercase opacity-80 block mb-1">AI Botlar</span>
          <span className="text-3xl font-black tracking-tighter">3</span>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-5 rounded-2xl text-white relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full group-hover:scale-150 transition-transform duration-300"></div>
          <span className="text-[10px] font-black uppercase opacity-80 block mb-1">Pazaryeri</span>
          <span className="text-3xl font-black tracking-tighter">3</span>
        </div>
      </div>

      {/* Alt Tab Navigasyonu */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-1.5 border border-slate-200/60 inline-flex gap-2 shadow-lg shadow-slate-200/50">
        <button
          onClick={() => setActiveSubTab('settings')}
          className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            activeSubTab === 'settings'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-transparent text-slate-500 hover:bg-slate-100'
          }`}
        >
          <i className="fas fa-cog"></i>
          Ayarlar
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            activeSubTab === 'logs'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-transparent text-slate-500 hover:bg-slate-100'
          }`}
        >
          <i className="fas fa-history"></i>
          Loglar
        </button>
      </div>

      {/* Ayarlar Tab İçeriği */}
      {activeSubTab === 'settings' && (
        <div className="space-y-6">
          {/* Pazaryeri Entegrasyonları Başlığı */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center text-white">
              <i className="fas fa-store"></i>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase">Pazaryeri Entegrasyonları</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Otomatik sipariş çekme</p>
            </div>
          </div>

          {/* Trendyol Entegrasyonu */}
          <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-[#ff6000]/30 transition-all duration-300 group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#ff6000]/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/2"></div>

            {/* Header */}
            <div className="relative p-8 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#ff6000] to-[#ff4500] rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl shadow-[#ff6000]/30 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <i className="fas fa-shopping-bag relative z-10"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Trendyol</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Otomatik Sipariş Entegrasyonu</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer group/toggle">
                  <input
                    type="checkbox"
                    checked={settings.trendyol_enabled}
                    onChange={(e) => setSettings({ ...settings, trendyol_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-16 h-9 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all after:shadow-md peer-checked:bg-gradient-to-r peer-checked:from-[#ff6000] peer-checked:to-[#ff4500]"></div>
                </label>
              </div>
            </div>

            {/* Content */}
            <div className="relative p-8 space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shrink-0">
                    <i className="fas fa-info-circle text-sm"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-amber-800 uppercase mb-1">API Bilgileri</p>
                    <p className="text-xs text-amber-700">
                      Trendyol Satıcı Paneli (CMP) üzerinden API bilgilerinizi alabilirsiniz.
                      Ayarlar {'>'} Entegrasyonlar {'>'} API Bilgileri bölümünde bulunur.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <i className="fas fa-key text-amber-500"></i>
                    API Key
                  </label>
                  <input
                    type="password"
                    value={settings.trendyol_api_key}
                    onChange={(e) => setSettings({ ...settings, trendyol_api_key: e.target.value })}
                    placeholder="Trendyol API Key"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-[#ff6000] focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <i className="fas fa-lock text-amber-500"></i>
                    API Secret
                  </label>
                  <input
                    type="password"
                    value={settings.trendyol_api_secret}
                    onChange={(e) => setSettings({ ...settings, trendyol_api_secret: e.target.value })}
                    placeholder="Trendyol API Secret"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-[#ff6000] focus:bg-white transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <i className="fas fa-id-badge text-amber-500"></i>
                    Satıcı ID
                  </label>
                  <input
                    type="text"
                    value={settings.trendyol_supplier_id}
                    onChange={(e) => setSettings({ ...settings, trendyol_supplier_id: e.target.value })}
                    placeholder="12345678"
                    className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-[#ff6000] focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full">
                    <span className={`w-2 h-2 rounded-full ${settings.trendyol_enabled ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-slate-300'}`}></span>
                    <span className="text-[10px] font-black text-slate-400 uppercase">
                      {settings.trendyol_enabled ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                  {testStatus.trendyol === 'success' && (
                    <span className="text-[10px] font-black text-emerald-600 uppercase px-3 py-1 bg-emerald-50 rounded-full flex items-center gap-1">
                      <i className="fas fa-check-circle"></i> Bağlantı Başarılı
                    </span>
                  )}
                  {testStatus.trendyol === 'error' && (
                    <span className="text-[10px] font-black text-rose-600 uppercase px-3 py-1 bg-rose-50 rounded-full flex items-center gap-1">
                      <i className="fas fa-times-circle"></i> Bağlantı Hatası
                    </span>
                  )}
                  {settings.trendyol_enabled && testStatus.trendyol !== 'error' && (
                    <span className="text-[10px] font-black text-emerald-600 uppercase px-3 py-1 bg-emerald-50 rounded-full">
                      <i className="fas fa-sync-alt mr-1"></i> Otomatik Çekme Aktif
                    </span>
                  )}
                </div>
                <button
                  onClick={() => testConnection('trendyol')}
                  disabled={testStatus.trendyol === 'testing' || !settings.trendyol_api_key}
                  className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  <i className={`fas ${testStatus.trendyol === 'testing' ? 'fa-spinner fa-spin' : 'fa-plug'}`}></i>
                  {testStatus.trendyol === 'testing' ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}
                </button>
              </div>
            </div>
          </div>

          {/* Getir Bilgilendirme */}
          <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-[#5d3ebc]/30 transition-all duration-300 group">
            <div className="relative p-8 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#5d3ebc] to-[#4a2fa0] rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl shadow-[#5d3ebc]/30 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <i className="fas fa-bolt relative z-10"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Getir</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manuel Sipariş Girişi</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer group/toggle">
                  <input
                    type="checkbox"
                    checked={settings.getir_enabled}
                    onChange={(e) => setSettings({ ...settings, getir_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-16 h-9 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all after:shadow-md peer-checked:bg-gradient-to-r peer-checked:from-[#5d3ebc] peer-checked:to-[#4a2fa0]"></div>
                </label>
              </div>
            </div>

            <div className="relative p-8">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white shrink-0">
                    <i className="fas fa-info-circle text-sm"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-blue-800 uppercase mb-1">Manuel Entegrasyon</p>
                    <p className="text-xs text-blue-700">
                      Getir API entegrasyonu için ofis panelindeki "Getir Siparişi Ekle" butonunu kullanın.
                      Bu, hesap güvenliğiniz için en güvenli yöntemdir. Otomasyon yapılmaz.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Yemeksepeti Bilgilendirme */}
          <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-[#ea004b]/30 transition-all duration-300 group">
            <div className="relative p-8 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#ea004b] to-[#c7003e] rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl shadow-[#ea004b]/30 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <i className="fas fa-utensils relative z-10"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Yemeksepeti</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manuel Sipariş Girişi</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer group/toggle">
                  <input
                    type="checkbox"
                    checked={settings.yemeksepeti_enabled}
                    onChange={(e) => setSettings({ ...settings, yemeksepeti_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-16 h-9 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all after:shadow-md peer-checked:bg-gradient-to-r peer-checked:from-[#ea004b] peer-checked:to-[#c7003e]"></div>
                </label>
              </div>
            </div>

            <div className="relative p-8">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white shrink-0">
                    <i className="fas fa-info-circle text-sm"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-rose-800 uppercase mb-1">Manuel Entegrasyon</p>
                    <p className="text-xs text-rose-700">
                      Yemeksepeti siparişleri için ofis panelindeki "Yemeksepeti Siparişi Ekle" butonunu kullanın.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Entegrasyonları Başlığı */}
          <div className="flex items-center gap-3 pt-4">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white">
              <i className="fas fa-robot"></i>
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase">AI Entegrasyonları</h3>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Otomatik sipariş karşılama</p>
            </div>
          </div>

          {/* AI Telefon Robotu */}
          <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-violet-600/30 transition-all duration-300 group">
            <div className="relative p-8 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-violet-700 rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl shadow-violet-600/30 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <i className="fas fa-robot relative z-10"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">AI Telefon Robotu</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Otomatik Sipariş Karşılama</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setShowCallLogs(!showCallLogs);
                      if (!showCallLogs) loadCallLogs();
                    }}
                    className="px-4 py-2.5 bg-violet-100 text-violet-700 rounded-xl text-[10px] font-black uppercase hover:bg-violet-200 transition-all flex items-center gap-2"
                  >
                    <i className="fas fa-history"></i>
                    {showCallLogs ? 'Ayarlar' : 'Loglar'}
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer group/toggle">
                    <input
                      type="checkbox"
                      checked={settings.ai_phone_enabled}
                      onChange={(e) => setSettings({ ...settings, ai_phone_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-16 h-9 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all after:shadow-md peer-checked:bg-gradient-to-r peer-checked:from-violet-600 peer-checked:to-violet-700"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="relative p-8">
              {!showCallLogs ? (
                <div className="space-y-5">
                  <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-violet-500 rounded-lg flex items-center justify-center text-white shrink-0">
                        <i className="fas fa-microphone text-sm"></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-violet-800 uppercase mb-1">AI Telefon Entegrasyonu</p>
                        <p className="text-xs text-violet-700">
                          Telefonla gelen çağrılarda AI robot müşteriyi tanır, adres bilgisini alır ve siparişi otomatik oluşturur.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <i className="fas fa-server text-violet-500"></i>
                        Provider
                      </label>
                      <select
                        value={settings.ai_phone_provider}
                        onChange={(e) => setSettings({ ...settings, ai_phone_provider: e.target.value })}
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-violet-600 focus:bg-white transition-all appearance-none cursor-pointer"
                      >
                        <option value="twilio">Twilio</option>
                        <option value="vonage">Vonage (Nexmo)</option>
                        <option value="custom">Custom SIP Trunk</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <i className="fas fa-phone text-violet-500"></i>
                        Telefon Numarası
                      </label>
                      <input
                        type="text"
                        value={settings.ai_phone_number}
                        onChange={(e) => setSettings({ ...settings, ai_phone_number: e.target.value })}
                        placeholder="+905551234567"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-violet-600 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <i className="fas fa-key text-violet-500"></i>
                        API Key
                      </label>
                      <input
                        type="password"
                        value={settings.ai_phone_api_key}
                        onChange={(e) => setSettings({ ...settings, ai_phone_api_key: e.target.value })}
                        placeholder="Provider API Key"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-violet-600 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <i className="fas fa-link text-violet-500"></i>
                        Webhook URL
                      </label>
                      <input
                        type="text"
                        value={settings.ai_phone_webhook_url}
                        onChange={(e) => setSettings({ ...settings, ai_phone_webhook_url: e.target.value })}
                        placeholder="https://api.example.com/webhook/phone"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-violet-600 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      <i className="fas fa-comment-dots text-violet-500"></i>
                      Sistem Promptu (AI Kişiliği)
                    </label>
                    <textarea
                      value={settings.ai_phone_system_prompt}
                      onChange={(e) => setSettings({ ...settings, ai_phone_system_prompt: e.target.value })}
                      placeholder="Sen bir su dağıtım firması sipariş robotusun..."
                      rows={5}
                      className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-violet-600 focus:bg-white transition-all resize-none"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-900 uppercase">Son Çağrılar</h4>
                    <button
                      onClick={loadCallLogs}
                      className="px-4 py-2 bg-violet-100 text-violet-700 rounded-xl text-[10px] font-black uppercase hover:bg-violet-200 transition-all flex items-center gap-2"
                    >
                      <i className="fas fa-sync-alt"></i>
                      Yenile
                    </button>
                  </div>

                  {callLogs.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl p-12 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-300 text-2xl mx-auto mb-4">
                        <i className="fas fa-phone-slash"></i>
                      </div>
                      <p className="text-xs font-black text-slate-400 uppercase">Henüz çağrı kaydı yok</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {callLogs.map((log) => (
                        <div
                          key={log.id}
                          className="bg-white rounded-xl p-4 border-2 border-slate-100 hover:border-violet-300 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg ${
                                log.status === 'success' ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' :
                                log.status === 'failed' ? 'bg-gradient-to-br from-rose-500 to-rose-600' :
                                'bg-gradient-to-br from-amber-500 to-amber-600'
                              }`}>
                                <i className={`fas ${
                                  log.status === 'success' ? 'fa-check' :
                                  log.status === 'failed' ? 'fa-times' :
                                  'fa-clock'
                                }`}></i>
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900">{log.callerId}</p>
                                <p className="text-[10px] font-bold text-slate-400">
                                  {log.customerName || 'Kayıtsız Müşteri'}
                                </p>
                              </div>
                            </div>
                            <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full ${
                              log.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                              log.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {log.status}
                            </span>
                          </div>

                          {log.transcript && (
                            <div className="mb-3 pl-13">
                              <p className="text-[10px] text-slate-600 italic bg-slate-50 rounded-lg p-3">"{log.transcript.slice(0, 100)}{log.transcript.length > 100 ? '...' : ''}"</p>
                            </div>
                          )}

                          {log.orderData && (
                            <div className="bg-violet-50 rounded-xl p-3 border border-violet-100 pl-13">
                              <div className="flex items-center gap-4 text-[10px]">
                                <span className="font-black text-violet-600">{log.orderData.product} x {log.orderData.quantity}</span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-600 truncate max-w-[200px]">{log.orderData.address}</span>
                              </div>
                            </div>
                          )}

                          <p className="text-[9px] text-slate-400 pl-13 mt-2">
                            {new Date(log.createdAt).toLocaleString('tr-TR')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Netgsm Sesli Robot */}
          <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-emerald-600/30 transition-all duration-300 group">
            <div className="relative p-8 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl shadow-emerald-600/30 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <i className="fas fa-headset relative z-10"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Netgsm Sesli Robot</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gelişmiş AI Sipariş Karşılama</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowNetgsmSettings(!showNetgsmSettings)}
                    className="px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-200 transition-all flex items-center gap-2"
                  >
                    <i className="fas fa-cog"></i>
                    {showNetgsmSettings ? 'Ayarlar' : 'Webhook'}
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer group/toggle">
                    <input
                      type="checkbox"
                      checked={settings.netgsm_enabled}
                      onChange={(e) => setSettings({ ...settings, netgsm_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-16 h-9 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all after:shadow-md peer-checked:bg-gradient-to-r peer-checked:from-emerald-600 peer-checked:to-emerald-700"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="relative p-8">
              {!showNetgsmSettings ? (
                <div className="space-y-5">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shrink-0">
                        <i className="fas fa-phone-volume text-sm"></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-emerald-800 uppercase mb-1">Netgsm Sesli AI Entegrasyonu</p>
                        <p className="text-xs text-emerald-700">
                          Netgsm üzerinden gelen çağrıları AI robot karşılar. Müşteriyi tanır, "Her zamanki gibi" dediğinde son siparişi getirir.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <i className="fas fa-key text-emerald-500"></i>
                        API Key
                      </label>
                      <input
                        type="password"
                        value={settings.netgsm_api_key}
                        onChange={(e) => setSettings({ ...settings, netgsm_api_key: e.target.value })}
                        placeholder="Netgsm API Anahtarı"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <i className="fas fa-phone text-emerald-500"></i>
                        Santral Numarası
                      </label>
                      <input
                        type="text"
                        value={settings.netgsm_phone_number}
                        onChange={(e) => setSettings({ ...settings, netgsm_phone_number: e.target.value })}
                        placeholder="+905551234567"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <i className="fas fa-extension text-emerald-500"></i>
                        Operatör Dahilisi
                      </label>
                      <input
                        type="text"
                        value={settings.netgsm_operator_extension}
                        onChange={(e) => setSettings({ ...settings, netgsm_operator_extension: e.target.value })}
                        placeholder="100"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                      <p className="text-[9px] text-slate-400 pl-1">Failover durumunda çağrı buraya aktarılır</p>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <i className="fas fa-link text-emerald-500"></i>
                        Webhook URL
                      </label>
                      <input
                        type="text"
                        value={settings.netgsm_webhook_url}
                        onChange={(e) => setSettings({ ...settings, netgsm_webhook_url: e.target.value })}
                        placeholder="https://api.example.com/webhook/netgsm"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-emerald-600 focus:bg-white transition-all"
                      />
                      <p className="text-[9px] text-slate-400 pl-1">Netgsm paneline bu URL'i girin</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <i className="fas fa-robot text-emerald-500"></i>
                      AI Özellikleri
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <i className="fas fa-check-circle text-emerald-500"></i>
                        <span>Kayıtlı müşteriyi tanır</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <i className="fas fa-check-circle text-emerald-500"></i>
                        <span>"Her zamanki" çalışır</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <i className="fas fa-check-circle text-emerald-500"></i>
                        <span>Adres sistemden alınır</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <i className="fas fa-check-circle text-emerald-500"></i>
                        <span>2 hata → operatör</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <i className="fas fa-check-circle text-emerald-500"></i>
                        <span>"Operatöre bağla" çalışır</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <i className="fas fa-check-circle text-emerald-500"></i>
                        <span>0 tuşu → operatör</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                      {testStatus.netgsm === 'success' && (
                        <span className="text-[10px] font-black text-emerald-600 uppercase px-3 py-1 bg-emerald-50 rounded-full flex items-center gap-1">
                          <i className="fas fa-check-circle"></i> Bağlantı Başarılı
                        </span>
                      )}
                      {testStatus.netgsm === 'error' && (
                        <span className="text-[10px] font-black text-rose-600 uppercase px-3 py-1 bg-rose-50 rounded-full flex items-center gap-1">
                          <i className="fas fa-times-circle"></i> Bağlantı Hatası
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => testConnection('netgsm')}
                      disabled={testStatus.netgsm === 'testing'}
                      className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <i className={`fas ${testStatus.netgsm === 'testing' ? 'fa-spinner fa-spin' : 'fa-plug'}`}></i>
                      {testStatus.netgsm === 'testing' ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase">NetgSM Webhook Ayarları</h4>

                  <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <i className="fas fa-link text-emerald-500"></i>
                      Webhook URL'leri
                    </p>

                    <div className="space-y-3">
                      <div className="bg-white rounded-xl p-4 border-2 border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Çağrı Başlangıç</p>
                        <code className="text-xs text-emerald-600 break-all font-mono">
                          POST {window.location.origin}/webhook/netgsm/call/start
                        </code>
                      </div>

                      <div className="bg-white rounded-xl p-4 border-2 border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Konuşma (STT)</p>
                        <code className="text-xs text-emerald-600 break-all font-mono">
                          POST {window.location.origin}/webhook/netgsm/call/speech
                        </code>
                      </div>

                      <div className="bg-white rounded-xl p-4 border-2 border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Çağrı Sonu</p>
                        <code className="text-xs text-emerald-600 break-all font-mono">
                          POST {window.location.origin}/webhook/netgsm/call/end
                        </code>
                      </div>

                      <div className="bg-white rounded-xl p-4 border-2 border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">DTMF (Tuşlama)</p>
                        <code className="text-xs text-emerald-600 break-all font-mono">
                          POST {window.location.origin}/webhook/netgsm/call/dtmf
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shrink-0">
                        <i className="fas fa-exclamation-triangle text-sm"></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-amber-800 uppercase mb-1">Önemli Not</p>
                        <p className="text-xs text-amber-700">
                          API sunucusunun (npm run api) çalıştığından emin olun. Webhook URL'leri dışarıdan erişilebilir olmalıdır.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* WhatsApp Bot */}
          <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-emerald-500/30 transition-all duration-300 group">
            <div className="relative p-8 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl shadow-emerald-500/30 relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <i className="fab fa-whatsapp relative z-10"></i>
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">WhatsApp Sipariş Botu</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Mesajla Sipariş Karşılama</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowWhatsAppSettings(!showWhatsAppSettings)}
                    className="px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-200 transition-all flex items-center gap-2"
                  >
                    <i className="fas fa-cog"></i>
                    {showWhatsAppSettings ? 'Ayarlar' : 'Webhook'}
                  </button>
                  <label className="relative inline-flex items-center cursor-pointer group/toggle">
                    <input
                      type="checkbox"
                      checked={settings.whatsapp_enabled}
                      onChange={(e) => setSettings({ ...settings, whatsapp_enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-16 h-9 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all after:shadow-md peer-checked:bg-gradient-to-r peer-checked:from-emerald-500 peer-checked:to-emerald-600"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="relative p-8">
              {!showWhatsAppSettings ? (
                <div className="space-y-5">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white shrink-0">
                        <i className="fab fa-whatsapp text-sm"></i>
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-emerald-800 uppercase mb-1">WhatsApp Business API</p>
                        <p className="text-xs text-emerald-700">
                          WhatsApp üzerinden gelen mesajları AI bot karşılar. Müşteriyi tanır, "Her zamanki gibi" dediğinde son siparişi getirir.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <i className="fas fa-key text-emerald-500"></i>
                        Access Token
                      </label>
                      <input
                        type="password"
                        value={settings.whatsapp_access_token}
                        onChange={(e) => setSettings({ ...settings, whatsapp_access_token: e.target.value })}
                        placeholder="Meta Business API Token"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <i className="fas fa-id-badge text-emerald-500"></i>
                        Phone Number ID
                      </label>
                      <input
                        type="text"
                        value={settings.whatsapp_phone_number_id}
                        onChange={(e) => setSettings({ ...settings, whatsapp_phone_number_id: e.target.value })}
                        placeholder="123456789012345"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <i className="fas fa-shield-alt text-emerald-500"></i>
                        Verify Token
                      </label>
                      <input
                        type="text"
                        value={settings.whatsapp_verify_token}
                        onChange={(e) => setSettings({ ...settings, whatsapp_verify_token: e.target.value })}
                        placeholder="Webhook doğrulama anahtarı"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all"
                      />
                      <p className="text-[9px] text-slate-400 pl-1">Meta webhook doğrulaması için</p>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <i className="fas fa-user-tie text-emerald-500"></i>
                        Operatör Telefonu
                      </label>
                      <input
                        type="text"
                        value={settings.whatsapp_operator_phone}
                        onChange={(e) => setSettings({ ...settings, whatsapp_operator_phone: e.target.value })}
                        placeholder="905551234567"
                        className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500 focus:bg-white transition-all"
                      />
                      <p className="text-[9px] text-slate-400 pl-1">Failover durumunda bildirim gider</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <i className="fab fa-whatsapp text-emerald-500"></i>
                      Bot Özellikleri
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      <div className="flex items-center gap-2 text-slate-600">
                        <i className="fas fa-check-circle text-emerald-500"></i>
                        <span>Kayıtlı müşteriyi tanır</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <i className="fas fa-check-circle text-emerald-500"></i>
                        <span>"Her zamanki" çalışır</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <i className="fas fa-check-circle text-emerald-500"></i>
                        <span>Adres sistemden alınır</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <i className="fas fa-check-circle text-emerald-500"></i>
                        <span>2 hata → operatör</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <i className="fas fa-check-circle text-emerald-500"></i>
                        <span>"Operatör" yazınca devreder</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-600">
                        <i className="fas fa-check-circle text-emerald-500"></i>
                        <span>Kısa ve net mesajlar</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                      {testStatus.whatsapp === 'success' && (
                        <span className="text-[10px] font-black text-emerald-600 uppercase px-3 py-1 bg-emerald-50 rounded-full flex items-center gap-1">
                          <i className="fas fa-check-circle"></i> Bağlantı Başarılı
                        </span>
                      )}
                      {testStatus.whatsapp === 'error' && (
                        <span className="text-[10px] font-black text-rose-600 uppercase px-3 py-1 bg-rose-50 rounded-full flex items-center gap-1">
                          <i className="fas fa-times-circle"></i> Bağlantı Hatası
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => testConnection('whatsapp')}
                      disabled={testStatus.whatsapp === 'testing'}
                      className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <i className={`fas ${testStatus.whatsapp === 'testing' ? 'fa-spinner fa-spin' : 'fa-plug'}`}></i>
                      {testStatus.whatsapp === 'testing' ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-sm font-black text-slate-900 uppercase">WhatsApp Webhook Ayarları</h4>

                  <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
                    <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <i className="fas fa-link text-emerald-500"></i>
                      Meta Panel URL'leri
                    </p>

                    <div className="space-y-3">
                      <div className="bg-white rounded-xl p-4 border-2 border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Webhook URL</p>
                        <code className="text-xs text-emerald-600 break-all font-mono">
                          POST {window.location.origin}/webhook/whatsapp/message
                        </code>
                      </div>

                      <div className="bg-white rounded-xl p-4 border-2 border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Verify URL</p>
                        <code className="text-xs text-emerald-600 break-all font-mono">
                          GET {window.location.origin}/webhook/whatsapp/verify
                        </code>
                      </div>

                      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4">
                        <p className="text-[9px] font-black text-amber-800 uppercase mb-2">Verify Token</p>
                        <code className="text-xs text-amber-700 break-all font-mono">
                          {settings.whatsapp_verify_token}
                        </code>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sesli Sipariş Asistanı (YENİ) */}
          <VoiceOrderAssistantPanel
            enabled={settings.voice_order_enabled}
            apiKey={settings.voice_order_gemini_api_key}
            testPhone={settings.voice_order_test_phone}
            onEnabledChange={(enabled) => setSettings({ ...settings, voice_order_enabled: enabled })}
            onApiKeyChange={(key) => setSettings({ ...settings, voice_order_gemini_api_key: key })}
            onTestPhoneChange={(phone) => setSettings({ ...settings, voice_order_test_phone: phone })}
          />
        </div>
      )}
    </div>
  );
};

// =====================================================
// SESLİ SİPARİŞ ASİSTANI PANELİ (YENİ)
// =====================================================

interface VoiceOrderAssistantPanelProps {
  enabled: boolean;
  apiKey: string;
  testPhone: string;
  onEnabledChange: (enabled: boolean) => void;
  onApiKeyChange: (key: string) => void;
  onTestPhoneChange: (phone: string) => void;
}

const VoiceOrderAssistantPanel: React.FC<VoiceOrderAssistantPanelProps> = ({
  enabled, apiKey, testPhone,
  onEnabledChange, onApiKeyChange, onTestPhoneChange
}) => {
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [testMessages, setTestMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');

  // Test oturumunu başlat
  const startTestSession = async () => {
    setIsLoading(true);
    setTestMessages([{ role: 'assistant', text: 'Test oturumu başlatılıyor...' }]);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/webhook/voice-order/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id: `test_${Date.now()}`,
          caller_id: testPhone.replace(/\D/g, ''),
          direction: 'incoming'
        })
      });

      const data = await response.json();
      setTestMessages([{ role: 'assistant', text: data.text || 'Merhaba! Siparişinizi alabilir miyim?' }]);
      setSessionId(data.session_id || `test_${Date.now()}`);
    } catch (error) {
      setTestMessages([{ role: 'assistant', text: 'Bağlantı hatası! API sunucusunun çalıştığından emin olun.' }]);
    }

    setIsLoading(false);
  };

  // Mesaj gönder
  const sendTestMessage = async () => {
    if (!userInput.trim()) return;

    const userMessage = userInput.trim();
    setTestMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setUserInput('');
    setIsLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/webhook/voice-order/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          call_id: sessionId,
          text: userMessage,
          session_id: sessionId
        })
      });

      const data = await response.json();

      if (data.order_confirmed) {
        setTestMessages(prev => [...prev, {
          role: 'assistant',
          text: `${data.text}\n\n✅ Sipariş oluşturuldu! ID: ${data.order?.id || 'Bilinmiyor'}`
        }]);
      } else {
        setTestMessages(prev => [...prev, { role: 'assistant', text: data.text || 'Anlayamadım, tekrar eder misiniz?' }]);
      }

      if (data.action === 'hangup') {
        setTimeout(() => {
          setTestMessages(prev => [...prev, { role: 'assistant', text: '📞 Çağrı sonlandırıldı.' }]);
        }, 1000);
      }
    } catch (error) {
      setTestMessages(prev => [...prev, { role: 'assistant', text: '❌ Bağlantı hatası!' }]);
    }

    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-sm overflow-hidden hover:shadow-xl hover:border-indigo-600/30 transition-all duration-300 group">
      <div className="relative p-8 border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-xl shadow-indigo-600/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
              <i className="fas fa-microphone-alt relative z-10"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-slate-900 uppercase">Sesli Sipariş Asistanı</h3>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-[8px] font-black uppercase">YENİ</span>
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">AI Destekli Sesli Sipariş Karşılama</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowTestPanel(!showTestPanel);
                if (!showTestPanel && testMessages.length === 0) {
                  startTestSession();
                }
              }}
              className="px-4 py-2.5 bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-200 transition-all flex items-center gap-2"
            >
              <i className={`fas ${showTestPanel ? 'fa-cog' : 'fa-headset'}`}></i>
              {showTestPanel ? 'Ayarlar' : 'Test Paneli'}
            </button>
            <label className="relative inline-flex items-center cursor-pointer group/toggle">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => onEnabledChange(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-16 h-9 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all after:shadow-md peer-checked:bg-gradient-to-r peer-checked:from-indigo-600 peer-checked:to-purple-600"></div>
            </label>
          </div>
        </div>
      </div>

      <div className="relative p-8">
        {showTestPanel ? (
          <div className="space-y-4">
            {/* Test Chat Interface */}
            <div className="bg-slate-50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-black text-slate-900 uppercase">Sesli Asistan Testi</h4>
                <button
                  onClick={startTestSession}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-indigo-700 transition-all flex items-center gap-1"
                  disabled={isLoading}
                >
                  <i className={`fas ${isLoading ? 'fa-spinner fa-spin' : 'fa-redo'}`}></i>
                  Yeni Oturum
                </button>
              </div>

              {/* Chat Messages */}
              <div className="bg-white rounded-xl p-4 h-80 overflow-y-auto space-y-3 mb-4 border border-slate-200">
                {testMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-xs ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-md'
                        : 'bg-slate-100 text-slate-700 rounded-bl-md'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 px-4 py-2.5 rounded-2xl rounded-bl-md text-xs text-slate-400">
                      <i className="fas fa-ellipsis-h fa-pulse"></i>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendTestMessage()}
                  placeholder="Müşteri ne söyleyecek? (örn: '2 damacana istiyorum')"
                  className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-600 transition-all"
                  disabled={isLoading}
                />
                <button
                  onClick={sendTestMessage}
                  disabled={isLoading || !userInput.trim()}
                  className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>

              {/* Hızlı Test Mesajları */}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setUserInput('2 adet damacana su istiyorum')}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                >
                  2 damacana
                </button>
                <button
                  onClick={() => setUserInput('evet doğru')}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                >
                  Onayla
                </button>
                <button
                  onClick={() => setUserInput('kredi kartı ödemek istiyorum')}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                >
                  Kredi kartı
                </button>
                <button
                  onClick={() => setUserInput('operatörle konuşmak istiyorum')}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all"
                >
                  Operatör
                </button>
              </div>
            </div>

            {/* Webhook URL Info */}
            <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
              <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                <i className="fas fa-link text-indigo-500"></i>
                Webhook URL'leri
              </p>

              <div className="space-y-3">
                <div className="bg-white rounded-xl p-4 border-2 border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Çağrı Başlangıç</p>
                  <code className="text-xs text-indigo-600 break-all font-mono">
                    POST /webhook/voice-order/start
                  </code>
                </div>

                <div className="bg-white rounded-xl p-4 border-2 border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Konuşma (STT)</p>
                  <code className="text-xs text-indigo-600 break-all font-mono">
                    POST /webhook/voice-order/speech
                  </code>
                </div>

                <div className="bg-white rounded-xl p-4 border-2 border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Çağrı Sonu</p>
                  <code className="text-xs text-indigo-600 break-all font-mono">
                    POST /webhook/voice-order/end
                  </code>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white shrink-0">
                  <i className="fas fa-microphone-alt text-sm"></i>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-indigo-800 uppercase mb-1">Google Gemini AI Entegrasyonu</p>
                  <p className="text-xs text-indigo-700">
                    Telefonla gelen çağrılarda AI robot müşteriyi ismiyle karşılar, "Her zamanki gibi" dediğinde son siparişi hatırlar.
                    Fiyatları hesaplar, ödeme yöntemini sorar ve siparişi otomatik oluşturur.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <i className="fas fa-key text-indigo-500"></i>
                  Gemini API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  placeholder="Google Gemini API Anahtarı"
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all"
                />
                <p className="text-[9px] text-slate-400 pl-1">
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">
                    AI Studio'dan alın →
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <i className="fas fa-phone text-indigo-500"></i>
                  Test Telefonu
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => onTestPhoneChange(e.target.value)}
                  placeholder="905551234567"
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-indigo-600 focus:bg-white transition-all"
                />
                <p className="text-[9px] text-slate-400 pl-1">Müşteri sorgulaması için test numarası</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
              <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                <i className="fas fa-robot text-indigo-500"></i>
                AI Özellikleri
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <i className="fas fa-check-circle text-indigo-500"></i>
                  <span>Kayıtlı müşteriyi tanır</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <i className="fas fa-check-circle text-indigo-500"></i>
                  <span>"Her zamanki" çalışır</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <i className="fas fa-check-circle text-indigo-500"></i>
                  <span>Fiyat hesaplar</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <i className="fas fa-check-circle text-indigo-500"></i>
                  <span>Ödeme sorar</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <i className="fas fa-check-circle text-indigo-500"></i>
                  <span>Adres teyidi</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <i className="fas fa-check-circle text-indigo-500"></i>
                  <span>Operatöre devreder</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <i className="fas fa-check-circle text-indigo-500"></i>
                  <span>JSON çıktı</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <i className="fas fa-check-circle text-indigo-500"></i>
                  <span>Türkçe NLP</span>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shrink-0">
                  <i className="fas fa-exclamation-triangle text-sm"></i>
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-amber-800 uppercase mb-1">Kurulum Gereksinimleri</p>
                  <ul className="text-xs text-amber-700 space-y-1">
                    <li>• Google Gemini API Key gereklidir</li>
                    <li>• NetGSM webhook URL'leri bu endpoint'lere yönlendirilmelidir</li>
                    <li>• API sunucusunun (npm run api) çalışması gerekir</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full">
                  <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-indigo-500 shadow-lg shadow-indigo-500/50' : 'bg-slate-300'}`}></span>
                  <span className="text-[10px] font-black text-slate-400 uppercase">
                    {enabled ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowTestPanel(true)}
                className="px-6 py-3 bg-indigo-100 text-indigo-700 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-200 transition-all flex items-center gap-2"
              >
                <i className="fas fa-headset"></i>
                Test Panelini Aç
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegrationsManagement;
