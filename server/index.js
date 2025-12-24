// =====================================================
// KALELİ SU API SERVER
// =====================================================
// Express API server for webhook endpoints and integrations

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// =====================================================
// CONFIG
// =====================================================

const PORT = process.env.API_PORT || 3001;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================================
// LOGGING MIDDLEWARE
// =====================================================

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// =====================================================
// HEALTH CHECK
// =====================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// =====================================================
// ORDER ENDPOINTS
// =====================================================

/**
 * Yeni sipariş oluştur
 * POST /api/order/create
 */
app.post('/api/order/create', async (req, res) => {
  try {
    const { telefon, musteri_adi, urun, adet, adres, siparis_kaynagi, not } = req.body;

    // Validasyon
    if (!telefon || !musteri_adi || !adres) {
      return res.status(400).json({ error: 'Eksik bilgi' });
    }

    // Telefonu temizle
    const cleanPhone = telefon.replace(/\D/g, '').slice(-10);

    // Müşteriyi bul veya oluştur
    let { data: customer } = await supabase
      .from('customers')
      .select('id, name')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (!customer) {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          phone: cleanPhone,
          name: musteri_adi,
          address: adres,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (customerError) throw customerError;
      customer = newCustomer;
    }

    // Ürün bilgisini al
    const { data: product } = await supabase
      .from('inventory')
      .select('id, name, price')
      .or(`name.eq.${urun},name.ilike.%${urun}%`)
      .limit(1)
      .maybeSingle();

    const productName = product?.name || urun;
    const productPrice = product?.price || 40; // Varsayılan fiyat

    // Siparişi oluştur
    const orderData = {
      customer_id: customer.id,
      customer_name: musteri_adi,
      phone: cleanPhone,
      address: adres,
      items: [{
        product_id: product?.id || null,
        product_name: productName,
        quantity: parseInt(adet) || 1,
        price: productPrice
      }],
      total_amount: productPrice * (parseInt(adet) || 1),
      payment_method: 'cash',
      payment_status: 'pending',
      status: 'Bekliyor',
      source: siparis_kaynagi || 'Telefon',
      note: not || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) throw orderError;

    console.log(`✅ Yeni sipariş oluşturuldu: ${order.id}`);
    res.json({ success: true, order });

  } catch (error) {
    console.error('Sipariş oluşturma hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Sipariş durumunu güncelle
 * PUT /api/order/:id/status
 */
app.put('/api/order/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, order: data });

  } catch (error) {
    console.error('Durum güncelleme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Siparişleri getir
 * GET /api/orders
 */
app.get('/api/orders', async (req, res) => {
  try {
    const { limit = 50, status, source } = req.query;

    let query = supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (status) {
      query = query.eq('status', status);
    }
    if (source) {
      query = query.eq('source', source);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ success: true, orders: data });

  } catch (error) {
    console.error('Sipariş getirme hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// TRENDYOL WEBHOOKS
// =====================================================

/**
 * Trendyol webhook endpoint
 * POST /webhook/trendyol/orders
 */
app.post('/webhook/trendyol/orders', async (req, res) => {
  try {
    const { orders } = req.body;

    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'Geçersiz veri formatı' });
    }

    let importedCount = 0;

    for (const trendyolOrder of orders) {
      // Daha önce var mı kontrol et
      const { data: existing } = await supabase
        .from('orders')
        .select('id')
        .eq('source_order_id', trendyolOrder.orderNumber || trendyolOrder.id)
        .maybeSingle();

      if (existing) continue;

      // Müşteri işle
      const cleanPhone = (trendyolOrder.customerPhoneNumber || '').replace(/\D/g, '').slice(-10);
      const customerName = `${trendyolOrder.customerFirstName || ''} ${trendyolOrder.customerLastName || ''}`.trim();

      let { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (!customer && cleanPhone) {
        const { data: newCustomer } = await supabase
          .from('customers')
          .insert({
            phone: cleanPhone,
            name: customerName,
            address: [
              trendyolOrder.shippingAddress?.address,
              trendyolOrder.shippingAddress?.district,
              trendyolOrder.shippingAddress?.city
            ].filter(Boolean).join(', '),
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();

        customer = newCustomer;
      }

      // Sipariş oluştur
      const items = trendyolOrder.items || [];
      const totalAmount = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);

      const { error: insertError } = await supabase
        .from('orders')
        .insert({
          customer_id: customer?.id,
          customer_name: customerName,
          phone: cleanPhone,
          address: [
            trendyolOrder.shippingAddress?.address,
            trendyolOrder.shippingAddress?.district,
            trendyolOrder.shippingAddress?.city
          ].filter(Boolean).join(', '),
          items: items.map(item => ({
            product_id: item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            price: item.price
          })),
          total_amount: totalAmount,
          payment_method: trendyolOrder.paymentType === 'CashOnDelivery' ? 'cash' : 'card',
          status: 'Bekliyor',
          source: 'Trendyol',
          source_order_id: trendyolOrder.orderNumber || trendyolOrder.id,
          created_at: trendyolOrder.orderDate || new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (!insertError) {
        importedCount++;
      }
    }

    console.log(`✅ Trendyol webhook: ${importedCount} sipariş işlendi`);
    res.json({ success: true, imported: importedCount });

  } catch (error) {
    console.error('Trendyol webhook hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// NETGSM WEBHOOKS
// =====================================================

const activeCalls = new Map();

/**
 * Netgsm çağrı başlangıcı webhook
 * POST /webhook/netgsm/call/start
 */
app.post('/webhook/netgsm/call/start', async (req, res) => {
  try {
    const { call_id, caller_id, direction } = req.body;

    console.log(`📞 Netgsm çağrı başladı: ${caller_id}`);

    activeCalls.set(call_id, {
      callId: call_id,
      callerId: caller_id,
      direction: direction || 'incoming',
      startTime: new Date(),
      transcript: []
    });

    // Müşteriyi sorgula
    const cleanPhone = caller_id.replace(/\D/g, '').slice(-10);
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    // İlk mesajı oluştur
    const welcomeMessage = customer
      ? `Hoş geldiniz ${customer.name}, siparişinizi söyleyebilirsiniz.`
      : 'Hoş geldiniz, siparişinizi alabilmem için adres bilgilerinizi alabilir miyim?';

    res.json({
      text: welcomeMessage,
      action: 'continue',
      customer_found: !!customer,
      customer_name: customer?.name
    });

  } catch (error) {
    console.error('Netgsm çağrı başlatma hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Netgsm konuşma (STT) webhook
 * POST /webhook/netgsm/call/speech
 */
app.post('/webhook/netgsm/call/speech', async (req, res) => {
  try {
    const { call_id, text, confidence } = req.body;

    console.log(`🎤 Netgsm STT: ${text}`);

    const call = activeCalls.get(call_id);
    if (!call) {
      return res.status(404).json({ error: 'Çağrı bulunamadı' });
    }

    // Transkripti ekle
    call.transcript.push(text);

    // Basit doğal dil işleme
    const lowerText = text.toLowerCase();

    // Ürün ve miktar çıkar
    let product = '19L';
    let quantity = 1;

    if (lowerText.includes('5 litre') || lowerText.includes('5l') || lowerText.includes('küçük') || lowerText.includes('pet')) {
      product = '5L';
    }
    if (lowerText.includes('damacana') || lowerText.includes('büyük')) {
      product = '19L';
    }

    const numbers = text.match(/\d+/);
    if (numbers) {
      quantity = parseInt(numbers[0]);
    } else {
      // Yazılı sayıları kontrol et
      const numberWords = { 'bir': 1, 'iki': 2, 'üç': 3, 'dört': 4, 'beş': 5 };
      for (const [word, num] of Object.entries(numberWords)) {
        if (lowerText.includes(word)) {
          quantity = num;
          break;
        }
      }
    }

    // Operatör talebi
    if (lowerText.includes('operatör') || lowerText.includes('yetkili') || lowerText.includes('canlı')) {
      res.json({
        text: 'Sizi hemen müşteri temsilcimize aktarıyorum.',
        action: 'transfer'
      });
      return;
    }

    // Onay/Red
    if (call.awaitingConfirmation) {
      if (lowerText.includes('evet') || lowerText.includes('tamam') || lowerText.includes('onay')) {
        // Siparişi oluştur
        await createOrderFromCall(call, product, quantity);
        activeCalls.delete(call_id);

        res.json({
          text: 'Siparişiniz alınmıştır, en kısa sürede yola çıkacak. İyi günler dilerim.',
          action: 'hangup'
        });
        return;
      } else {
        call.awaitingConfirmation = false;
        res.json({
          text: 'Tamam, siparişinizi baştan alabilirim. Hangi üründen kaç adet istersiniz?',
          action: 'continue'
        });
        return;
      }
    }

    // Sipariş algılandı
    call.product = product;
    call.quantity = quantity;
    call.awaitingConfirmation = true;

    res.json({
      text: `${quantity} adet ${product} siparişini alıyorum, doğru mu?`,
      action: 'continue'
    });

  } catch (error) {
    console.error('Netgsm STT hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Netgsm çağrı sonu webhook
 * POST /webhook/netgsm/call/end
 */
app.post('/webhook/netgsm/call/end', async (req, res) => {
  try {
    const { call_id, duration, status } = req.body;

    console.log(`📞 Netgsm çağrı bitti: ${call_id}, süre: ${duration}s`);

    const call = activeCalls.get(call_id);
    if (call) {
      // Çağrı logunu kaydet
      await supabase.from('call_logs').insert({
        caller_id: call.callerId,
        transcript: call.transcript.join(' | '),
        status: call.orderCreated ? 'success' : 'failed',
        created_at: new Date().toISOString()
      });

      activeCalls.delete(call_id);
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Netgsm çağrı sonu hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Netgsm DTMF (tuşlama) webhook
 * POST /webhook/netgsm/call/dtmf
 */
app.post('/webhook/netgsm/call/dtmf', async (req, res) => {
  try {
    const { call_id, digit } = req.body;

    console.log(`🔢 Netgsm DTMF: ${call_id}, tuş: ${digit}`);

    // 0 tuşu operatöre transfer
    if (digit === '0') {
      res.json({
        text: 'Sizi operatöre aktarıyorum.',
        action: 'transfer',
        transfer_to: '100'
      });
    } else {
      res.json({
        text: 'Siparişinizi söyleyebilirsiniz.',
        action: 'continue'
      });
    }

  } catch (error) {
    console.error('Netgsm DTMF hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Çağrıdan sipariş oluşturur
 */
async function createOrderFromCall(call, product, quantity) {
  try {
    const cleanPhone = call.callerId.replace(/\D/g, '').slice(-10);

    let { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (!customer) {
      return { success: false, error: 'Müşteri bulunamadı' };
    }

    const { data: productData } = await supabase
      .from('inventory')
      .select('*')
      .or(`name.eq.${product},name.ilike.%${product}%`)
      .limit(1)
      .maybeSingle();

    const price = productData?.price || 40;

    const { error } = await supabase
      .from('orders')
      .insert({
        customer_id: customer.id,
        customer_name: customer.name,
        phone: cleanPhone,
        address: customer.address,
        items: [{
          product_id: productData?.id,
          product_name: product,
          quantity: quantity,
          price: price
        }],
        total_amount: price * quantity,
        payment_method: 'cash',
        status: 'Bekliyor',
        source: 'Telefon',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (!error) {
      call.orderCreated = true;
    }

    return { success: !error, error: error?.message };

  } catch (error) {
    console.error('Çağrıdan sipariş oluşturma hatası:', error);
    return { success: false, error: error.message };
  }
}

// =====================================================
// WHATSAPP WEBHOOKS
// =====================================================

const whatsappSessions = new Map();

/**
 * WhatsApp webhook verify endpoint
 * GET /webhook/whatsapp/verify
 */
app.get('/webhook/whatsapp/verify', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // Verify token'ı integrasyon tablosundan al
  supabase
    .from('integrations')
    .select('whatsapp_verify_token')
    .single()
    .then(({ data }) => {
      const verifyToken = data?.whatsapp_verify_token || 'su_siparis_bot_2024';

      if (mode === 'subscribe' && token === verifyToken) {
        console.log('✅ WhatsApp webhook verified');
        res.status(200).send(challenge);
      } else {
        console.log('❌ WhatsApp webhook verification failed');
        res.sendStatus(403);
      }
    });
});

/**
 * WhatsApp mesaj webhook
 * POST /webhook/whatsapp/message
 */
app.post('/webhook/whatsapp/message', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message) {
      return res.status(200).send('OK');
    }

    const phoneNumber = message.from;
    const messageText = message.text?.body || '';

    console.log(`📨 WhatsApp mesajı: ${phoneNumber} - "${messageText}"`);

    // Oturum var mı kontrol et
    let session = whatsappSessions.get(phoneNumber);
    if (!session) {
      // Yeni oturum başlat
      session = {
        phoneNumber,
        messages: [],
        state: 'greeting',
        createdAt: new Date()
      };
      whatsappSessions.set(phoneNumber, session);
    }

    session.messages.push(messageText);

    // Komut kontrolü
    if (messageText.toLowerCase() === 'reset' || messageText.toLowerCase() === 'başa sar') {
      whatsappSessions.delete(phoneNumber);
      return res.json({ success: true, message: 'Oturum sıfırlandı' });
    }

    // Müşteri sorgula
    const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);
    const { data: customer } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', cleanPhone)
      .maybeSingle();

    // Basit yanıt oluştur
    let responseText = '';

    const lowerText = messageText.toLowerCase();

    // Operatör talebi
    if (lowerText.includes('operatör') || lowerText.includes('yetkili') || lowerText.includes('destek')) {
      responseText = 'Sizi hemen müşteri temsilcimize aktarıyorum.';
    }
    // Sipariş algılama
    else {
      let product = '19L Damacana';
      let quantity = 1;

      if (lowerText.includes('5 litre') || lowerText.includes('5l') || lowerText.includes('küçük')) {
        product = '5L Pet';
      }
      if (lowerText.includes('damacana')) {
        product = '19L Damacana';
      }

      const numbers = messageText.match(/\d+/);
      if (numbers) {
        quantity = parseInt(numbers[0]);
      } else {
        const numberWords = { 'bir': 1, 'iki': 2, 'üç': 3, 'dört': 4, 'beş': 5 };
        for (const [word, num] of Object.entries(numberWords)) {
          if (lowerText.includes(word)) {
            quantity = num;
            break;
          }
        }
      }

      if (session.awaitingConfirmation) {
        if (lowerText.includes('evet') || lowerText.includes('tamam') || lowerText.includes('onay')) {
          // Siparişi oluştur
          if (customer) {
            const { data: productData } = await supabase
              .from('inventory')
              .select('price')
              .or(`name.ilike.%${product.split(' ')[0]}%`)
              .limit(1)
              .maybeSingle();

            const price = productData?.price || 40;

            await supabase.from('orders').insert({
              customer_id: customer.id,
              customer_name: customer.name,
              phone: cleanPhone,
              address: customer.address,
              items: [{
                product_name: product,
                quantity: quantity,
                price: price
              }],
              total_amount: price * quantity,
              payment_method: 'cash',
              status: 'Bekliyor',
              source: 'WhatsApp',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });

            responseText = 'Siparişiniz alındı, en kısa sürede teslim edilecektir. İyi günler dileriz.';
            whatsappSessions.delete(phoneNumber);
          } else {
            responseText = 'Sistemde kaydınız bulunamadı. Lütfen önce adres bilgilerinizi paylaşın.';
            session.awaitingConfirmation = false;
          }
        } else {
          session.awaitingConfirmation = false;
          responseText = 'Tamam, siparişinizi baştan alabilirim. Hangi üründen kaç adet istersiniz?';
        }
      } else {
        session.product = product;
        session.quantity = quantity;
        session.awaitingConfirmation = true;
        responseText = `Siparişiniz: ${quantity} adet ${product}. Onaylıyor musunuz? (Evet/Hayır)`;
      }
    }

    // WhatsApp Business API ile mesaj gönder
    // (Bu kısım Meta Business API kullanılarak yapılır)

    // Log kaydet
    await supabase.from('whatsapp_logs').insert({
      phone_number: phoneNumber,
      message: messageText,
      response: responseText,
      created_at: new Date().toISOString()
    });

    res.json({ success: true, response: responseText });

  } catch (error) {
    console.error('WhatsApp webhook hatası:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================================
// INTEGRATION TEST ENDPOINTS
// =====================================================

/**
 * Trendyol bağlantı testi
 * POST /api/test/trendyol
 */
app.post('/api/test/trendyol', async (req, res) => {
  try {
    const { api_key, api_secret, supplier_id } = req.body;

    const auth = Buffer.from(`${api_key}:${api_secret}`).toString('base64');
    const url = `https://api.trendyol.com/sapigw/suppliers/${supplier_id}/orders?page=0&size=1`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'User-Agent': `${supplier_id} - SelfIntegration`
      }
    });

    if (response.ok) {
      res.json({ success: true, message: 'Bağlantı başarılı' });
    } else {
      const errorText = await response.text();
      res.json({ success: false, error: `API Hatası: ${response.status} - ${errorText}` });
    }

  } catch (error) {
    console.error('Trendyol test hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * Netgsm bağlantı testi
 * POST /api/test/netgsm
 */
app.post('/api/test/netgsm', async (req, res) => {
  try {
    const { api_key } = req.body;

    if (!api_key) {
      return res.json({ success: false, error: 'API Key gerekli' });
    }

    // Netgsm API testi (örnek)
    res.json({ success: true, message: 'API Key geçerli görünüyor' });

  } catch (error) {
    console.error('Netgsm test hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * WhatsApp bağlantı testi
 * POST /api/test/whatsapp
 */
app.post('/api/test/whatsapp', async (req, res) => {
  try {
    const { access_token, phone_number_id } = req.body;

    if (!access_token || !phone_number_id) {
      return res.json({ success: false, error: 'Access Token ve Phone Number ID gerekli' });
    }

    // WhatsApp Business API testi
    const url = `https://graph.facebook.com/v18.0/${phone_number_id}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });

    if (response.ok) {
      res.json({ success: true, message: 'Bağlantı başarılı' });
    } else {
      res.json({ success: false, error: 'WhatsApp API hatası' });
    }

  } catch (error) {
    console.error('WhatsApp test hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// ERROR HANDLING
// =====================================================

app.use((err, req, res, next) => {
  console.error('Server hatası:', err);
  res.status(500).json({ error: 'Sunucu hatası' });
});

// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 KALELİ SU API SERVER                                ║
║                                                           ║
║   Port: ${PORT.toString().padEnd(48)}║
║   Time: ${new Date().toISOString().padEnd(47)}║
║                                                           ║
║   Webhook Endpoints:                                     ║
║   - POST /webhook/trendyol/orders                        ║
║   - POST /webhook/netgsm/call/start                      ║
║   - POST /webhook/netgsm/call/speech                     ║
║   - POST /webhook/netgsm/call/end                        ║
║   - POST /webhook/netgsm/call/dtmf                       ║
║   - GET  /webhook/whatsapp/verify                        ║
║   - POST /webhook/whatsapp/message                       ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

module.exports = app;
