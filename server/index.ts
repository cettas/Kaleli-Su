// =====================================================
// EXPRESS API SERVER - AI TELEFON ROBOTU ENTEGRASYONU
// =====================================================
// Bu server API endpoint'lerini sağlar

import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { aiPhoneAgent } from '../services/aiPhoneAgent';
import { netgsmVoiceAgent } from '../services/netgsmVoiceAgent';
import { whatsappBot } from '../services/whatsappBot';

const app = express();
const PORT = process.env.API_PORT || 3001;

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());

// =====================================================
// API ENDPOINT'LERİ
// =====================================================

/**
 * GET /api/customer/by-phone?phone={caller_id}
 * Telefon numarasına göre müşteri sorgular
 */
app.get('/api/customer/by-phone', async (req, res) => {
  try {
    const { phone } = req.query;

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Telefon numarası gereklidir'
      });
    }

    console.log(`[API] Müşteri sorgulanıyor: ${phone}`);

    // Telefon numarasını normalize et
    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle(); // maybeSingle: sonuç yoksa null döner, hata fırlatmaz

    if (error) {
      console.error('[API] Müşteri sorgulama hatası:', error);
      return res.status(500).json({
        success: false,
        error: 'Müşteri sorgulanamadı'
      });
    }

    if (!data) {
      return res.json({
        success: true,
        found: false,
        customer: null
      });
    }

    // Adresi formatla
    const address = [
      data.district,
      data.neighborhood,
      data.street,
      data.building_no ? `Bina: ${data.building_no}` : '',
      data.apartment_no ? `Daire: ${data.apartment_no}` : ''
    ].filter(Boolean).join(', ');

    res.json({
      success: true,
      found: true,
      customer: {
        id: data.id,
        name: data.name,
        phone: data.phone,
        address
      }
    });
  } catch (error) {
    console.error('[API] Unexpected error:', error);
    res.status(500).json({
      success: false,
      error: 'Beklenmeyen bir hata oluştu'
    });
  }
});

/**
 * POST /api/order/create
 * Yeni sipariş oluşturur (AI robot tarafından kullanılır)
 *
 * Body:
 * {
 *   "telefon": "string",
 *   "musteri_adi": "string (opsiyonel)",
 *   "urun": "string",
 *   "adet": "number",
 *   "adres": "string",
 *   "siparis_kaynagi": "telefon-robot",
 *   "not": "string (opsiyonel)"
 * }
 */
app.post('/api/order/create', async (req, res) => {
  try {
    const orderData = req.body;

    console.log('[API] Yeni sipariş isteği:', orderData);

    // Zorunlu alanları kontrol et
    if (!orderData.telefon || !orderData.urun || !orderData.adet || !orderData.adres) {
      return res.status(400).json({
        success: false,
        error: 'Eksik sipariş bilgileri. telefon, urun, adet ve adres zorunludur.'
      });
    }

    // Ürün bilgisini envanterden al
    const { data: productData } = await supabase
      .from('inventory')
      .select('*')
      .ilike('name', `%${orderData.urun}%`)
      .single();

    const productId = productData?.id || 'unknown';
    const productName = productData?.name || orderData.urun;
    const price = productData?.sale_price || 50; // Varsayılan fiyat

    // Toplam tutarı hesapla
    const totalAmount = price * orderData.adet;

    // Müşteriyi bul veya oluştur
    const cleanPhone = orderData.telefon.replace(/\D/g, '').slice(-10);
    let customerId: string;

    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, order_count')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existingCustomer) {
      // Mevcut müşteriyi güncelle
      customerId = existingCustomer.id;
      await supabase
        .from('customers')
        .update({
          order_count: (existingCustomer.order_count || 0) + 1,
          last_order_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);
    } else {
      // Yeni müşteri oluştur
      const customerName = orderData.musteri_adi || 'Müşteri';
      const address = orderData.adres;

      // Adresi parçala (basit mantık)
      const addressParts = address.split(',').map(s => s.trim());

      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          phone: cleanPhone,
          name: customerName,
          district: addressParts[0] || '',
          neighborhood: addressParts[1] || '',
          street: addressParts[2] || '',
          building_no: '',
          apartment_no: '',
          order_count: 1,
          last_order_date: new Date().toISOString()
        })
        .select()
        .single();

      customerId = newCustomer.id;
    }

    // Siparişi oluştur
    const { data: newOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: customerId,
        customer_name: orderData.musteri_adi || 'Müşteri',
        phone: cleanPhone,
        address: orderData.adres,
        items: [{
          productId,
          productName,
          quantity: orderData.adet,
          price
        }],
        total_amount: totalAmount,
        status: 'Bekliyor',
        source: 'telefon-robot',
        note: orderData.not,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (orderError) {
      console.error('[API] Sipariş oluşturma hatası:', orderError);
      return res.status(500).json({
        success: false,
        error: 'Sipariş oluşturulamadı'
      });
    }

    console.log('[API] Sipariş başarıyla oluşturuldu:', newOrder.id);

    res.json({
      success: true,
      orderId: newOrder.id,
      message: 'Sipariş başarıyla oluşturuldu'
    });
  } catch (error) {
    console.error('[API] Sipariş oluşturma hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Beklenmeyen bir hata oluştu'
    });
  }
});

/**
 * POST /api/call/log
 * Çağrı logunu kaydeder
 */
app.post('/api/call/log', async (req, res) => {
  try {
    const logData = req.body;

    await supabase.from('call_logs').insert({
      caller_id: logData.callerId,
      customer_name: logData.customerName,
      customer_found: logData.customerFound || false,
      transcript: logData.transcript || '',
      order_data: logData.orderData || null,
      status: logData.status || 'incomplete',
      error_message: logData.errorMessage,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    res.json({ success: true });
  } catch (error) {
    console.error('[API] Çağrı kaydetme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Çağrı kaydedilemedi'
    });
  }
});

/**
 * GET /api/call/logs
 * Çağrı loglarını getir
 */
app.get('/api/call/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;

    const { data, error } = await supabase
      .from('call_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    res.json({
      success: true,
      logs: data
    });
  } catch (error) {
    console.error('[API] Çağrı logları getirme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Loglar getirilemedi'
    });
  }
});

/**
 * GET /api/integrations/status
 * Entegrasyon durumunu getir
 */
app.get('/api/integrations/status', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('integrations')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      integrations: {
        aiPhoneEnabled: data?.ai_phone_enabled || false,
        aiPhoneProvider: data?.ai_phone_provider || null,
        aiPhoneNumber: data?.ai_phone_number || null
      }
    });
  } catch (error) {
    console.error('[API] Entegrasyon durumu hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Entegrasyon durumu alınamadı'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =====================================================
// NETGSM WEBHOOK ENDPOINT'LERİ
// =====================================================

/**
 * POST /webhook/netgsm/call/start
 * Netgsm çağrı başlangıç webhook'ı
 * Çağrı geldiğinde Netgsm bu endpoint'i tetikler
 */
app.post('/webhook/netgsm/call/start', async (req, res) => {
  try {
    const { call_id, caller_id, direction, status, timestamp } = req.body;

    console.log('📞 NETGSM Çağrı başladı:', { call_id, caller_id });

    // Çağrıyı sessli robot ile karşıla
    const voiceResponse = await netgsmVoiceAgent.handleIncomingCall({
      call_id,
      caller_id,
      direction: direction || 'incoming',
      status: status || 'ringing',
      timestamp: timestamp || new Date().toISOString()
    });

    // Netgsm'a yanıt döndür (sesli yanıt için TTS URL'i veya metin)
    res.json({
      action: voiceResponse.action,
      text: voiceResponse.text,
      transfer_to: voiceResponse.transferTo || null
    });
  } catch (error) {
    console.error('[NETGSM] Çağrı başlangıç hatası:', error);
    res.status(500).json({
      action: 'transfer',
      text: 'Bir sorun oluştu, sizi operatöre bağlıyorum.',
      transfer_to: '100'
    });
  }
});

/**
 * POST /webhook/netgsm/call/speech
 * Netgsm sesli webhook'ı (müşteri konuştuğunda)
 * Müşterinin konuşması text olarak gelir
 */
app.post('/webhook/netgsm/call/speech', async (req, res) => {
  try {
    const { call_id, speech_text, audio_url, timestamp } = req.body;

    console.log('🗣️ NETGSM Konuşma alındı:', { call_id, speech_text: speech_text?.substring(0, 50) });

    // Konuşmayı işle ve yanıt üret
    const voiceResponse = await netgsmVoiceAgent.processCustomerSpeech(
      call_id,
      speech_text,
      audio_url
    );

    res.json({
      action: voiceResponse.action,
      text: voiceResponse.text,
      transfer_to: voiceResponse.transferTo || null
    });
  } catch (error) {
    console.error('[NETGSM] Konuşma işleme hatası:', error);
    res.status(500).json({
      action: 'transfer',
      text: 'Üzgünüm, sizi operatöre bağlıyorum.',
      transfer_to: '100'
    });
  }
});

/**
 * POST /webhook/netgsm/call/end
 * Netgsm çağrı sonlandırma webhook'ı
 */
app.post('/webhook/netgsm/call/end', async (req, res) => {
  try {
    const { call_id, caller_id, duration, status, timestamp } = req.body;

    console.log('📞 NETGSM Çağrı bitti:', { call_id, caller_id, duration });

    // Çağrı oturumunu temizle
    netgsmVoiceAgent.endCall(call_id);

    res.json({ success: true });
  } catch (error) {
    console.error('[NETGSM] Çağrı sonlandırma hatası:', error);
    res.status(500).json({ success: false, error: 'Çağrı sonlandırılamadı' });
  }
});

/**
 * POST /webhook/netgsm/call/dtmf
 * NetgSM DTMF (tuşlama) webhook'ı
 * Müşteri tuşlara bastığında tetiklenir
 */
app.post('/webhook/netgsm/call/dtmf', async (req, res) => {
  try {
    const { call_id, digit, timestamp } = req.body;

    console.log('🔢 NETGSM DTMF alındı:', { call_id, digit });

    const session = netgsmVoiceAgent.getSession(call_id);

    // 0 tuşu → operatör
    if (digit === '0') {
      const voiceResponse = await netgsmVoiceAgent.processCustomerSpeech(
        call_id,
        'operatörle konuşmak istiyorum'
      );

      return res.json(voiceResponse);
    }

    // Diğer tuşlar
    res.json({
      action: 'continue',
      text: 'Sesli olarak siparişinizi söyleyebilirsiniz.'
    });
  } catch (error) {
    console.error('[NETGSM] DTMF hatası:', error);
    res.status(500).json({
      action: 'continue',
      text: 'Lütfen siparişinizi söyleyin.'
    });
  }
});

/**
 * GET /api/call/session/:callId
 * Aktif çağrı oturumunu getir (debug için)
 */
app.get('/api/call/session/:callId', (req, res) => {
  try {
    const { callId } = req.params;
    const session = netgsmVoiceAgent.getSession(callId);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Çağrı oturumu bulunamadı'
      });
    }

    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('[API] Oturum getirme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Oturum alınamadı'
    });
  }
});

// =====================================================
// WHATSAPP WEBHOOK ENDPOINT'LERİ
// =====================================================

/**
 * POST /webhook/whatsapp/message
 * WhatsApp mesaj webhook'ı (Meta Business API)
 * Müşteri mesaj yazdığında Meta bu endpoint'i tetikler
 */
app.post('/webhook/whatsapp/message', async (req, res) => {
  try {
    // Meta Business API webhook formatı
    const { entry } = req.body;

    if (!entry || !entry[0] || !entry[0].changes) {
      return res.status(200).send('OK'); // Meta verification için
    }

    const changes = entry[0].changes;
    const value = changes[0].value;

    if (!value || !value.messages || !value.messages[0]) {
      return res.status(200).send('OK');
    }

    const message = value.messages[0];
    const from = message.from; // WhatsApp telefon numarası
    const messageText = message.text?.body || '';

    console.log('📨 WHATSAPP Mesajı alındı:', { from, messageText: messageText?.substring(0, 50) });

    // Mesajı WhatsApp bot ile işle
    const response = await whatsappBot.handleIncomingMessage({
      from,
      message_id: message.id,
      message_text: messageText,
      timestamp: message.timestamp || new Date().toISOString(),
      metadata: {
        display_phone_number: value.metadata?.display_phone_number,
        phone_number_id: value.metadata?.phone_number_id
      }
    });

    // Yanıtı gönder (opsiyonel - hemen dönmek için)
    if (response && response.text) {
      // WhatsApp Business API ile mesaj gönder
      await whatsappBot.sendWhatsAppMessage(response.to, response.text);
    }

    // Meta, 200 OK bekler
    res.status(200).send('OK');
  } catch (error) {
    console.error('[WHATSAPP] Webhook hatası:', error);
    res.status(200).send('OK'); // Meta her durumda 200 bekler
  }
});

/**
 * GET /webhook/whatsapp/verify
 * WhatsApp webhook verification (Meta Business API)
 * Meta webhook'u ilk kurarken verify token gönderir
 */
app.get('/webhook/whatsapp/verify', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'su_siparis_bot_2024';

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ WhatsApp webhook verified');
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }

  res.sendStatus(400);
});

/**
 * GET /api/whatsapp/session/:phoneNumber
 * Aktif WhatsApp oturumunu getir (debug için)
 */
app.get('/api/whatsapp/session/:phoneNumber', (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const session = whatsappBot.getSession(phoneNumber);

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'WhatsApp oturumu bulunamadı'
      });
    }

    res.json({
      success: true,
      session
    });
  } catch (error) {
    console.error('[API] WhatsApp oturum getirme hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Oturum alınamadı'
    });
  }
});

/**
 * GET /api/whatsapp/sessions
 * Tüm aktif WhatsApp oturumlarını getir
 */
app.get('/api/whatsapp/sessions', (req, res) => {
  try {
    const sessions = Array.from(whatsappBot.getAllSessions().values());

    res.json({
      success: true,
      sessions: sessions.map(s => ({
        phoneNumber: s.phoneNumber,
        customerFound: s.customerFound,
        customerName: s.customer?.name,
        state: s.state,
        messageCount: s.messages.length,
        createdAt: s.createdAt
      }))
    });
  } catch (error) {
    console.error('[API] WhatsApp oturumları hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Oturumlar alınamadı'
    });
  }
});

/**
 * POST /api/whatsapp/test
 * WhatsApp bot test endpoint'i
 */
app.post('/api/whatsapp/test', async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        error: 'Telefon ve mesaj gereklidir'
      });
    }

    // Test mesajını işle
    const response = await whatsappBot.handleIncomingMessage({
      from: phone,
      message_id: 'test-' + Date.now(),
      message_text: message,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      response
    });
  } catch (error) {
    console.error('[API] WhatsApp test hatası:', error);
    res.status(500).json({
      success: false,
      error: 'Test başarısız'
    });
  }
});

// Server'ı başlat
app.listen(PORT, () => {
  console.log(`\n🚀 API Server çalışıyor: http://localhost:${PORT}`);
  console.log(`📞 AI Telefon Robotu endpoint'leri hazır:\n`);
  console.log(`   GET  /api/customer/by-phone?phone={number}`);
  console.log(`   POST /api/order/create`);
  console.log(`   POST /api/call/log`);
  console.log(`   GET  /api/call/logs`);
  console.log(`   GET  /api/integrations/status`);
  console.log(`\n🤖 NETGSM Sesli Robot Webhook'leri:\n`);
  console.log(`   POST /webhook/netgsm/call/start`);
  console.log(`   POST /webhook/netgsm/call/speech`);
  console.log(`   POST /webhook/netgsm/call/end`);
  console.log(`   POST /webhook/netgsm/call/dtmf`);
  console.log(`   GET  /api/call/session/:callId`);
  console.log(`\n💬 WhatsApp Bot Webhook'leri:\n`);
  console.log(`   POST /webhook/whatsapp/message`);
  console.log(`   GET  /webhook/whatsapp/verify`);
  console.log(`   GET  /api/whatsapp/session/:phoneNumber`);
  console.log(`   GET  /api/whatsapp/sessions`);
  console.log(`   POST /api/whatsapp/test\n`);
});

export default app;
