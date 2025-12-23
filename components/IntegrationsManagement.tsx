import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { CallLog } from '../types';
import IntegrationLogsViewer from './IntegrationLogsViewer';

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
    whatsapp_operator_phone: ''
  });

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

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
          whatsapp_operator_phone: data.whatsapp_operator_phone || ''
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

  const testConnection = async (service: 'trendyol') => {
    setTestStatus('testing');
    try {
      // Basit bir bağlantı testi
      const response = await fetch('/api/test-integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, settings })
      });

      if (response.ok) {
        setTestStatus('success');
        setTimeout(() => setTestStatus('idle'), 3000);
      } else {
        throw new Error('Bağlantı başarısız');
      }
    } catch (error) {
      console.error('Test hatası:', error);
      setTestStatus('error');
      setTimeout(() => setTestStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Ana Başlık ve Alt Tab Navigasyonu */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">ENTEGRASYON YÖNETİMİ</h2>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-2">
            API Ayarları, Loglar ve İstatistikler
          </p>
        </div>
        <div className="flex items-center gap-3">
          {testStatus === 'success' && (
            <span className="text-xs font-black text-emerald-600 uppercase flex items-center gap-2">
              <i className="fas fa-check-circle"></i> Bağlantı Başarılı
            </span>
          )}
          {testStatus === 'error' && (
            <span className="text-xs font-black text-rose-600 uppercase flex items-center gap-2">
              <i className="fas fa-exclamation-circle"></i> Bağlantı Hatası
            </span>
          )}
          <button
            onClick={saveSettings}
            disabled={saveStatus === 'saving'}
            className={`px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
              saveStatus === 'saved'
                ? 'bg-emerald-600 text-white'
                : saveStatus === 'error'
                ? 'bg-rose-600 text-white'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-xl'
            }`}
          >
            {saveStatus === 'saving' ? 'KAYDEDİLİYOR...' :
             saveStatus === 'saved' ? 'KAYDEDİLDİ ✓' :
             saveStatus === 'error' ? 'HATA ✗' :
             'AYARLARI KAYDET'}
          </button>
        </div>
      </div>

      {/* Alt Tab Navigasyonu */}
      <div className="bg-white rounded-2xl p-2 border border-slate-200 inline-flex gap-2">
        <button
          onClick={() => setActiveSubTab('settings')}
          className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            activeSubTab === 'settings'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          <i className="fas fa-cog"></i>
          Ayarlar
        </button>
        <button
          onClick={() => setActiveSubTab('logs')}
          className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
            activeSubTab === 'logs'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
          }`}
        >
          <i className="fas fa-history"></i>
          Loglar
        </button>
      </div>

      {/* Ayarlar Tab İçeriği */}
      {activeSubTab === 'settings' && (
        <div className="space-y-8">
          {/* Buraya mevcut tüm entegrasyon ayarları gelecek */}

      {/* Trendyol Entegrasyonu */}
      <div className="bg-white rounded-[3rem] border-2 border-[#ff6000] p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ff6000]/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#ff6000] rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">
                <i className="fas fa-shopping-bag"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">Trendyol</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Otomatik Sipariş Entegrasyonu</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.trendyol_enabled}
                onChange={(e) => setSettings({ ...settings, trendyol_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#ff6000]"></div>
            </label>
          </div>

          <div className="space-y-5">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <i className="fas fa-info-circle text-amber-600 mt-0.5"></i>
                <div className="flex-1">
                  <p className="text-[10px] font-black text-amber-800 uppercase mb-1">API Bilgileri</p>
                  <p className="text-xs text-amber-700">
                    Trendyol Satıcı Paneli (CMP) üzerinden API bilgilerinizi alabilirsiniz.
                    Ayarlar &gt; Entegrasyonlar &gt; API Bilgileri bölümünde bulunur.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">API Key</label>
                <input
                  type="password"
                  value={settings.trendyol_api_key}
                  onChange={(e) => setSettings({ ...settings, trendyol_api_key: e.target.value })}
                  placeholder="Trendyol API Key"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-[#ff6000] transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">API Secret</label>
                <input
                  type="password"
                  value={settings.trendyol_api_secret}
                  onChange={(e) => setSettings({ ...settings, trendyol_api_secret: e.target.value })}
                  placeholder="Trendyol API Secret"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-[#ff6000] transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Satıcı ID (Supplier ID)</label>
                <input
                  type="text"
                  value={settings.trendyol_supplier_id}
                  onChange={(e) => setSettings({ ...settings, trendyol_supplier_id: e.target.value })}
                  placeholder="12345678"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-[#ff6000] transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${settings.trendyol_enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                  <span className="text-[10px] font-black text-slate-400 uppercase">
                    {settings.trendyol_enabled ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
                {settings.trendyol_enabled && (
                  <span className="text-[10px] font-black text-emerald-600 uppercase">
                    <i className="fas fa-sync-alt mr-1"></i> Otomatik Çekme Aktif
                  </span>
                )}
              </div>
              <button
                onClick={() => testConnection('trendyol')}
                disabled={testStatus === 'testing' || !settings.trendyol_api_key}
                className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-all disabled:opacity-50"
              >
                {testStatus === 'testing' ? 'Test Ediliyor...' : 'Bağlantıyı Test Et'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Getir Bilgilendirme */}
      <div className="bg-white rounded-[3rem] border-2 border-[#5d3ebc] p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#5d3ebc]/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#5d3ebc] rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">
                <i className="fas fa-bolt"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">Getir</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manuel Sipariş Girişi</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.getir_enabled}
                onChange={(e) => setSettings({ ...settings, getir_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#5d3ebc]"></div>
            </label>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <i className="fas fa-info-circle text-blue-600 mt-0.5"></i>
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
      <div className="bg-white rounded-[3rem] border-2 border-[#ea004b] p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#ea004b]/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-[#ea004b] rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">
                <i className="fas fa-utensils"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">Yemeksepeti</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manuel Sipariş Girişi</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.yemeksepeti_enabled}
                onChange={(e) => setSettings({ ...settings, yemeksepeti_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-[#ea004b]"></div>
            </label>
          </div>

          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <i className="fas fa-info-circle text-rose-600 mt-0.5"></i>
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

      {/* =====================================================
           AI TELEFON ROBOTU ENTEGRASYONU
           ===================================================== */}
      <div className="bg-white rounded-[3rem] border-2 border-violet-600 p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">
                <i className="fas fa-robot"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">AI Telefon Robotu</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Otomatik Sipariş Karşılama</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setShowCallLogs(!showCallLogs);
                  if (!showCallLogs) loadCallLogs();
                }}
                className="px-4 py-2 bg-violet-100 text-violet-700 rounded-xl text-[10px] font-black uppercase hover:bg-violet-200 transition-all flex items-center gap-2"
              >
                <i className="fas fa-history"></i>
                {showCallLogs ? 'Ayarları Gizle' : 'Çağrı Logları'}
              </button>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.ai_phone_enabled}
                  onChange={(e) => setSettings({ ...settings, ai_phone_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-violet-600"></div>
              </label>
            </div>
          </div>

          {!showCallLogs ? (
            <>
              <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 mb-5">
                <div className="flex items-start gap-3">
                  <i className="fas fa-microphone text-violet-600 mt-0.5"></i>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-violet-800 uppercase mb-1">AI Telefon Entegrasyonu</p>
                    <p className="text-xs text-violet-700">
                      Telefonla gelen çağrılarda AI robot müşteriyi tanır, adres bilgisini alır ve siparişi otomatik oluşturur.
                      Twilio, Vonage veya custom SIP trunk ile çalışır.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Provider</label>
                  <select
                    value={settings.ai_phone_provider}
                    onChange={(e) => setSettings({ ...settings, ai_phone_provider: e.target.value })}
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-violet-600 transition-all"
                  >
                    <option value="twilio">Twilio</option>
                    <option value="vonage">Vonage (Nexmo)</option>
                    <option value="custom">Custom SIP Trunk</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefon Numarası</label>
                  <input
                    type="text"
                    value={settings.ai_phone_number}
                    onChange={(e) => setSettings({ ...settings, ai_phone_number: e.target.value })}
                    placeholder="+905551234567"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-violet-600 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">API Key</label>
                  <input
                    type="password"
                    value={settings.ai_phone_api_key}
                    onChange={(e) => setSettings({ ...settings, ai_phone_api_key: e.target.value })}
                    placeholder="Provider API Key"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-violet-600 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Webhook URL</label>
                  <input
                    type="text"
                    value={settings.ai_phone_webhook_url}
                    onChange={(e) => setSettings({ ...settings, ai_phone_webhook_url: e.target.value })}
                    placeholder="https://api.example.com/webhook/phone"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-violet-600 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2 mb-5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Sistem Promptu (AI Kişiliği)
                </label>
                <textarea
                  value={settings.ai_phone_system_prompt}
                  onChange={(e) => setSettings({ ...settings, ai_phone_system_prompt: e.target.value })}
                  placeholder="Sen bir su dağıtım firması sipariş robotusun..."
                  rows={6}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-violet-600 transition-all resize-none"
                />
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3">
                  <i className="fas fa-code mr-2"></i>API Endpoint'leri
                </p>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-black">GET</span>
                    <span className="text-slate-600">/api/customer/by-phone?phone={caller_id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-600 font-black">POST</span>
                    <span className="text-slate-600">/api/order/create</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-indigo-600 font-black">POST</span>
                    <span className="text-slate-600">/api/call/log</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Çağrı Logları Görünümü */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 uppercase">Son Çağrılar</h4>
                <button
                  onClick={loadCallLogs}
                  className="px-4 py-2 bg-violet-100 text-violet-700 rounded-xl text-[10px] font-black uppercase hover:bg-violet-200 transition-all"
                >
                  <i className="fas fa-sync-alt mr-1"></i> Yenile
                </button>
              </div>

              {callLogs.length === 0 ? (
                <div className="bg-slate-50 rounded-2xl p-8 text-center">
                  <i className="fas fa-phone-slash text-3xl text-slate-300 mb-3"></i>
                  <p className="text-xs font-black text-slate-400 uppercase">Henüz çağrı kaydı yok</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {callLogs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-violet-300 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm ${
                            log.status === 'success' ? 'bg-emerald-500' :
                            log.status === 'failed' ? 'bg-rose-500' :
                            'bg-amber-500'
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
                        <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                          log.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                          log.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {log.status}
                        </span>
                      </div>

                      {log.transcript && (
                        <div className="mb-2 pl-13">
                          <p className="text-[10px] text-slate-600 italic">"{log.transcript.slice(0, 100)}{log.transcript.length > 100 ? '...' : ''}"</p>
                        </div>
                      )}

                      {log.orderData && (
                        <div className="bg-white rounded-lg p-2 pl-13 border border-slate-200">
                          <div className="flex items-center gap-4 text-[10px]">
                            <span className="font-black text-violet-600">{log.orderData.product} x {log.orderData.quantity}</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-600 truncate max-w-[200px]">{log.orderData.address}</span>
                          </div>
                        </div>
                      )}

                      <p className="text-[9px] text-slate-400 pl-13">
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

      {/* =====================================================
           NETGSM SESLİ SİPARİŞ ROBOTU ENTEGRASYONU
           ===================================================== */}
      <div className="bg-white rounded-[3rem] border-2 border-emerald-600 p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">
                <i className="fas fa-headset"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">Netgsm Sesli Robot</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gelişmiş AI Sipariş Karşılama</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowNetgsmSettings(!showNetgsmSettings)}
                className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-200 transition-all flex items-center gap-2"
              >
                <i className="fas fa-cog"></i>
                {showNetgsmSettings ? 'Ayarları Gizle' : 'Ayarlar'}
              </button>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.netgsm_enabled}
                  onChange={(e) => setSettings({ ...settings, netgsm_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {!showNetgsmSettings ? (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5">
                <div className="flex items-start gap-3">
                  <i className="fas fa-phone-volume text-emerald-600 mt-0.5"></i>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-emerald-800 uppercase mb-1">Netgsm Sesli AI Entegrasyonu</p>
                    <p className="text-xs text-emerald-700">
                      Netgsm üzerinden gelen çağrıları AI robot karşılar. Müşteriyi tanır, "Her zamanki gibi" dediğinde son siparişi getirir,
                      adres sorar, siparişi alır ve gerekirse operatöre devreder.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Netgsm API Key</label>
                  <input
                    type="password"
                    value={settings.netgsm_api_key}
                    onChange={(e) => setSettings({ ...settings, netgsm_api_key: e.target.value })}
                    placeholder="Netgsm API Anahtarı"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-emerald-600 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sanal Telefon Numarası</label>
                  <input
                    type="text"
                    value={settings.netgsm_phone_number}
                    onChange={(e) => setSettings({ ...settings, netgsm_phone_number: e.target.value })}
                    placeholder="+905551234567"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-emerald-600 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operatör Dahilisi</label>
                  <input
                    type="text"
                    value={settings.netgsm_operator_extension}
                    onChange={(e) => setSettings({ ...settings, netgsm_operator_extension: e.target.value })}
                    placeholder="100"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-emerald-600 transition-all"
                  />
                  <p className="text-[9px] text-slate-400">Failover durumunda çağrı buraya aktarılır</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Webhook URL</label>
                  <input
                    type="text"
                    value={settings.netgsm_webhook_url}
                    onChange={(e) => setSettings({ ...settings, netgsm_webhook_url: e.target.value })}
                    placeholder="https://api.example.com/webhook/netgsm"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-emerald-600 transition-all"
                  />
                  <p className="text-[9px] text-slate-400">Netgsm paneline bu URL'i girin</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3">
                  <i className="fas fa-robot mr-2"></i>AI Özellikleri
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <i className="fas fa-check-circle text-emerald-500"></i>
                    <span>Kayıtlı müşteriyi tanır</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <i className="fas fa-check-circle text-emerald-500"></i>
                    <span>"Her zamanki gibi" çalışır</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <i className="fas fa-check-circle text-emerald-500"></i>
                    <span>Adres sistemden alınır</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <i className="fas fa-check-circle text-emerald-500"></i>
                    <span>2 kez anlaşılamazsa operatöre devreder</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <i className="fas fa-check-circle text-emerald-500"></i>
                    <span>"Operatöre bağla" dediğinde devreder</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <i className="fas fa-check-circle text-emerald-500"></i>
                    <span>0 tuşu → operatör</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* Netgsm Webhook Bilgileri */
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase">NetgSM Webhook Ayarları</h4>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3">
                  <i className="fas fa-link mr-2"></i>Netgsm Paneline Girmeniz Gereken Webhook URL'leri
                </p>

                <div className="space-y-3">
                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Çağrı Başlangıç</p>
                    <code className="text-xs text-emerald-600 break-all">
                      POST {window.location.origin}/webhook/netgsm/call/start
                    </code>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Konuşma (STT)</p>
                    <code className="text-xs text-emerald-600 break-all">
                      POST {window.location.origin}/webhook/netgsm/call/speech
                    </code>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Çağrı Sonu</p>
                    <code className="text-xs text-emerald-600 break-all">
                      POST {window.location.origin}/webhook/netgsm/call/end
                    </code>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">DTMF (Tuşlama)</p>
                    <code className="text-xs text-emerald-600 break-all">
                      POST {window.location.origin}/webhook/netgsm/call/dtmf
                    </code>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <i className="fas fa-exclamation-triangle text-amber-600 mt-0.5"></i>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-amber-800 uppercase mb-1">Önemli Not</p>
                    <p className="text-xs text-amber-700">
                      API sunucusunun (npm run api) çalıştığından emin olun. Webhook URL'leri dışarıdan erişilebilir olmalıdır.
                      Geliştirmede ngrok gibi tünel servisleri kullanabilirsiniz.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-[10px] font-black text-blue-800 uppercase mb-2">Test Komutu</p>
                <code className="text-[10px] text-blue-700 block">
                  curl -X POST http://localhost:3001/webhook/netgsm/call/start \<br/>
                  &nbsp;&nbsp;-H "Content-Type: application/json" \<br/>
                  &nbsp;&nbsp;-d '{{"call_id":"test-123","caller_id":"905551234567"}}'
                </code>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
           WHATSAPP SİPARİŞ BOTU ENTEGRASYONU
           ===================================================== */}
      <div className="bg-white rounded-[3rem] border-2 border-emerald-500 p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="relative">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">
                <i className="fab fa-whatsapp"></i>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase">WhatsApp Sipariş Botu</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mesajla Sipariş Karşılama</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowWhatsAppSettings(!showWhatsAppSettings)}
                className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-200 transition-all flex items-center gap-2"
              >
                <i className="fas fa-cog"></i>
                {showWhatsAppSettings ? 'Ayarları Gizle' : 'Ayarlar'}
              </button>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.whatsapp_enabled}
                  onChange={(e) => setSettings({ ...settings, whatsapp_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-8 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:start-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>

          {!showWhatsAppSettings ? (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-5">
                <div className="flex items-start gap-3">
                  <i className="fab fa-whatsapp text-emerald-600 mt-0.5 text-lg"></i>
                  <div className="flex-1">
                    <p className="text-[10px] font-black text-emerald-800 uppercase mb-1">WhatsApp Business API Entegrasyonu</p>
                    <p className="text-xs text-emerald-700">
                      WhatsApp üzerinden gelen mesajları AI bot karşılar. Müşteriyi tanır, "Her zamanki gibi" dediğinde son siparişi getirir,
                      adres sorar, siparişi alır ve gerekirse operatöre devreder.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Token</label>
                  <input
                    type="password"
                    value={settings.whatsapp_access_token}
                    onChange={(e) => setSettings({ ...settings, whatsapp_access_token: e.target.value })}
                    placeholder="Meta Business API Access Token"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone Number ID</label>
                  <input
                    type="text"
                    value={settings.whatsapp_phone_number_id}
                    onChange={(e) => setSettings({ ...settings, whatsapp_phone_number_id: e.target.value })}
                    placeholder="123456789012345"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verify Token</label>
                  <input
                    type="text"
                    value={settings.whatsapp_verify_token}
                    onChange={(e) => setSettings({ ...settings, whatsapp_verify_token: e.target.value })}
                    placeholder="Webhook doğrulama anahtarı"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500 transition-all"
                  />
                  <p className="text-[9px] text-slate-400">Meta webhook doğrulaması için</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operatör Telefonu</label>
                  <input
                    type="text"
                    value={settings.whatsapp_operator_phone}
                    onChange={(e) => setSettings({ ...settings, whatsapp_operator_phone: e.target.value })}
                    placeholder="905551234567"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:border-emerald-500 transition-all"
                  />
                  <p className="text-[9px] text-slate-400">Failover durumunda bildirim gider</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3">
                  <i className="fab fa-whatsapp mr-2"></i>WhatsApp Bot Özellikleri
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <i className="fas fa-check-circle text-emerald-500"></i>
                    <span>Kayıtlı müşteriyi tanır</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <i className="fas fa-check-circle text-emerald-500"></i>
                    <span>"Her zamanki gibi" çalışır</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <i className="fas fa-check-circle text-emerald-500"></i>
                    <span>Adres sistemden alınır</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <i className="fas fa-check-circle text-emerald-500"></i>
                    <span>2 kez anlaşılamazsa operatöre devreder</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <i className="fas fa-check-circle text-emerald-500"></i>
                    <span>"Operatör" yazınca devreder</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <i className="fas fa-check-circle text-emerald-500"></i>
                    <span>Emoji yok, kısa ve net mesajlar</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* WhatsApp Webhook Bilgileri */
            <div className="space-y-4">
              <h4 className="text-sm font-black text-slate-900 uppercase">WhatsApp Webhook Ayarları</h4>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-3">
                <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-3">
                  <i className="fas fa-link mr-2"></i>Meta Business Paneline Girmeniz Gereken Webhook URL'leri
                </p>

                <div className="space-y-3">
                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Webhook URL</p>
                    <code className="text-xs text-emerald-600 break-all">
                      POST {window.location.origin}/webhook/whatsapp/message
                    </code>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-slate-200">
                    <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Verify URL</p>
                    <code className="text-xs text-emerald-600 break-all">
                      GET {window.location.origin}/webhook/whatsapp/verify
                    </code>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <p className="text-[9px] font-black text-amber-800 uppercase mb-1">Verify Token</p>
                    <code className="text-xs text-amber-700 break-all">
                      {settings.whatsapp_verify_token}
                    </code>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-[10px] font-black text-blue-800 uppercase mb-2">Test Komutu</p>
                <code className="text-[10px] text-blue-700 block">
                  curl -X POST http://localhost:3001/api/whatsapp/test \<br/>
                  &nbsp;&nbsp;-H "Content-Type: application/json" \<br/>
                  &nbsp;&nbsp;-d '{{"phone":"905551234567","message":"2 tane damacana"}}'
                </code>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4">
                <p className="text-[10px] font-black text-slate-700 uppercase mb-3">
                  <i className="fas fa-terminal mr-2"></i>Aktif Oturumlar
                </p>
                <button
                  onClick={() => fetch('http://localhost:3001/api/whatsapp/sessions')
                    .then(r => r.json())
                    .then(d => console.log('WhatsApp sessions:', d))
                  }
                  className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-200 transition-all"
                >
                  Oturumları Konsola Yazdır
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Loglar Tab İçeriği */}
      {activeSubTab === 'logs' && (
        <IntegrationLogsViewer />
      )}
    </div>
  );
};

export default IntegrationsManagement;
