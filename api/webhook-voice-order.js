// =====================================================
// SESLİ SİPARİŞ ASİSTANI - SERVERLESS WEBHOOK
// =====================================================
// Vercel serverless function for voice order processing
// Combines start, speech, and end endpoints in one file

import { supabase, refreshIntegrationsCache } from '../_lib/supabase.js';
import { callGeminiAI, extractOrderJSON, removeJSONFromResponse } from '../_lib/gemini.js';

// In-memory session storage (for Vercel, consider using Vercel KV for production)
const sessions = new Map();

// Helper: Get session key from request
function getSessionKey(callId) {
  return `voice_${callId}`;
}

// Helper: Clean phone number
function cleanPhone(phone) {
  return phone.replace(/\D/g, '').slice(-10);
}

// Helper: Generate welcome message
function generateWelcomeMessage(customer, lastOrder) {
  if (customer) {
    const lastOrderText = lastOrder
      ? `Geçen sefer ${lastOrder.items?.map(i => `${i.quantity} adet ${i.product_name}`).join(', ')} sipariş vermiştiniz. `
      : '';

    return customer.name
      ? `${customer.name} Bey/Hanım, Kaleli Su'ya hoş geldiniz! ${lastOrderText}Her zamanki adresinize, her zamanki gibi gönderelim mi?`
      : 'Kaleli Su\'ya hoş geldiniz! Siparişinizi söyleyebilirsiniz.';
  }
  return 'Kaleli Su\'ya hoş geldiniz! Size nasıl yardımcı olabilirim? Hangi üründen kaç adet istersiniz?';
}

// =====================================================
// MAIN HANDLER
// =====================================================

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req;
  const path = url.split('?')[0];

  try {
    // =====================================================
    // POST /webhook/voice-order/start
    // =====================================================
    if (path.endsWith('/start') && req.method === 'POST') {
      const { call_id, caller_id, direction } = req.body;

      console.log(`🎙️ Sesli Sipariş Başlangıç: ${caller_id}`);

      if (!call_id || !caller_id) {
        return res.status(400).json({ error: 'call_id and caller_id required' });
      }

      const cleanPhoneNum = cleanPhone(caller_id);

      // Get customer
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', cleanPhoneNum)
        .maybeSingle();

      // Get last order
      let lastOrder = null;
      if (customer) {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_id', customer.id)
          .in('status', ['Teslim Edildi', 'Yolda', 'Bekliyor'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        lastOrder = data;
      }

      const welcomeMessage = generateWelcomeMessage(customer, lastOrder);

      // Store session
      const session = {
        callId: call_id,
        callerId: caller_id,
        direction: direction || 'incoming',
        startTime: new Date().toISOString(),
        transcript: [],
        customer: customer,
        state: 'greeting',
        lastOrder: lastOrder
      };
      sessions.set(getSessionKey(call_id), session);

      return res.json({
        text: welcomeMessage,
        action: 'continue',
        customer_found: !!customer,
        customer_name: customer?.name,
        session_id: call_id
      });
    }

    // =====================================================
    // POST /webhook/voice-order/speech
    // =====================================================
    if (path.endsWith('/speech') && req.method === 'POST') {
      const { call_id, text, confidence } = req.body;

      console.log(`🎙️ Sesli Sipariş Konuşma: ${text}`);

      if (!call_id || !text) {
        return res.status(400).json({ error: 'call_id and text required' });
      }

      const session = sessions.get(getSessionKey(call_id));
      if (!session) {
        return res.status(404).json({ error: 'Çağrı bulunamadı' });
      }

      // Add to transcript
      session.transcript.push(text);

      // Check for operator transfer request
      const lowerText = text.toLowerCase();
      if (lowerText.includes('operatör') || lowerText.includes('yetkili') || lowerText.includes('canlı')) {
        return res.json({
          text: 'Tabii ki, sizi hemen müşteri temsilcimize aktarıyorum.',
          action: 'transfer'
        });
      }

      // Call AI
      try {
        const aiResponse = await callGeminiAI(session.customer, session.transcript, text);
        const orderData = extractOrderJSON(aiResponse);
        const cleanResponse = removeJSONFromResponse(aiResponse);

        // Check if order confirmed
        if (orderData && orderData.order_status === 'confirmed') {
          // Save order
          const saveResult = await saveVoiceOrder(session, orderData);

          if (saveResult.success) {
            // Log call
            await supabase.from('call_logs').insert({
              caller_id: session.callerId,
              customer_name: session.customer?.name,
              customer_found: !!session.customer,
              transcript: session.transcript.join(' | '),
              order_data: saveResult.order,
              status: 'success',
              created_at: new Date().toISOString()
            });

            sessions.delete(getSessionKey(call_id));

            return res.json({
              text: cleanResponse || 'Siparişiniz alınmıştır, en kısa sürede yola çıkacak. İyi günler dilerim!',
              action: 'hangup',
              order_confirmed: true,
              order: saveResult.order
            });
          } else {
            return res.json({
              text: 'Üzgünüm, sipariş kaydedilirken bir sorun oluştu. Sizi operatöre bağlıyorum.',
              action: 'transfer'
            });
          }
        }

        return res.json({
          text: cleanResponse,
          action: 'continue'
        });

      } catch (aiError) {
        console.error('AI Error:', aiError.message);

        // Fallback response
        const fallbackResponse = getFallbackResponse(session, text);
        return res.json({
          text: fallbackResponse.text,
          action: fallbackResponse.action
        });
      }
    }

    // =====================================================
    // POST /webhook/voice-order/end
    // =====================================================
    if (path.endsWith('/end') && req.method === 'POST') {
      const { call_id, duration, status } = req.body;

      console.log(`🎙️ Sesli Sipariş Bitiş: ${call_id}`);

      const session = sessions.get(getSessionKey(call_id));
      if (session) {
        // Log call
        await supabase.from('call_logs').insert({
          caller_id: session.callerId,
          customer_name: session.customer?.name,
          customer_found: !!session.customer,
          transcript: session.transcript.join(' | '),
          status: session.orderCreated ? 'success' : 'failed',
          duration_seconds: duration,
          created_at: new Date().toISOString()
        });

        sessions.delete(getSessionKey(call_id));
      }

      return res.json({ success: true });
    }

    // =====================================================
    // POST /api/integrations/refresh
    // =====================================================
    if (path.endsWith('/refresh') && req.method === 'POST') {
      const apiKey = await refreshIntegrationsCache();
      return res.json({
        success: true,
        message: 'Integrations ayarları yenilendi',
        geminiApiKeyLoaded: !!apiKey
      });
    }

    // =====================================================
    // POST /api/test/voice-order
    // =====================================================
    if (path.endsWith('/test') && req.method === 'POST') {
      const { message, customer_name } = req.body;

      const mockSession = {
        customer: customer_name ? { name: customer_name } : null,
        transcript: []
      };

      try {
        const aiResponse = await callGeminiAI(mockSession.customer, [], message);
        const orderData = extractOrderJSON(aiResponse);
        const cleanResponse = removeJSONFromResponse(aiResponse);

        return res.json({
          success: true,
          response: cleanResponse,
          orderData: orderData
        });
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: error.message
        });
      }
    }

    // Not found
    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('Voice order webhook error:', error);
    return res.status(500).json({ error: error.message });
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function saveVoiceOrder(session, orderData) {
  try {
    let customer = session.customer;

    if (!customer) {
      const cleanPhoneNum = cleanPhone(session.callerId);
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          phone: cleanPhoneNum,
          name: 'Müşteri',
          address: orderData.address,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      customer = newCustomer;
    }

    const items = orderData.items.map(item => ({
      product_id: null,
      product_name: item.product,
      quantity: item.quantity,
      price: item.price || 90
    }));

    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_id: customer?.id,
        customer_name: customer?.name || 'Müşteri',
        phone: cleanPhone(session.callerId),
        address: orderData.address,
        items,
        total_amount: orderData.total_price,
        payment_method: orderData.payment === 'kredi kartı' ? 'card' : 'cash',
        payment_status: 'pending',
        status: 'Bekliyor',
        source: 'Telefon Robot',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    session.orderCreated = true;
    return { success: true, order: data };

  } catch (error) {
    console.error('Sipariş kayıt hatası:', error);
    return { success: false, error: error.message };
  }
}

function getFallbackResponse(session, userText) {
  const lowerText = userText.toLowerCase();

  // Product extraction
  let product = '19L Damacana';
  if (lowerText.includes('5 litre') || lowerText.includes('5l') || lowerText.includes('pet')) {
    product = '5L Pet Su';
  }
  if (lowerText.includes('küçük') || lowerText.includes('0.5')) {
    product = 'Küçük Su';
  }

  // Quantity extraction
  let quantity = 1;
  const numbers = userText.match(/\d+/);
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

  // Confirmation check
  if (session.awaitingConfirmation) {
    if (lowerText.includes('evet') || lowerText.includes('tamam') || lowerText.includes('onay')) {
      const price = product.includes('19L') ? 90 : product.includes('5L') ? 35 : 100;
      return {
        text: `Anlaşıldı, ${quantity} adet ${product} siparişinizi oluşturuyorum.`,
        action: 'continue',
        orderData: {
          order_status: 'confirmed',
          items: [{ product, quantity, price }],
          total_price: quantity * price,
          payment: 'nakit',
          address: session.customer?.address || ''
        }
      };
    } else {
      session.awaitingConfirmation = false;
      return { text: 'Tamam, siparişinizi baştan alabilirim. Hangi üründen kaç adet istersiniz?', action: 'continue' };
    }
  }

  // Order detected
  session.product = product;
  session.quantity = quantity;
  session.awaitingConfirmation = true;

  const price = product.includes('19L') ? 90 : product.includes('5L') ? 35 : 100;
  return {
    text: `${quantity} adet ${product}, toplam ${quantity * price} TL. Doğru mu? Onaylıyor musunuz?`,
    action: 'continue'
  };
}

// Export config for Vercel
export const config = {
  maxDuration: 10
};
