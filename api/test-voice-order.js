// =====================================================
// SESLİ SİPARİŞ TEST ENDPOINT - SERVERLESS
// =====================================================
// Vercel serverless function for testing voice order AI

import { supabase } from '../_lib/supabase.js';

const VOICE_ORDER_SYSTEM_PROMPT = `
Sen "Kaleli Su" için çalışan profesyonel bir sesli sipariş asistanısın.

## KURUM BİLGİLERİ
- Bayi Adı: Kaleli Su
- Teslimat Süresi: 30-45 dakika

## ÜRÜNLER VE FİYATLAR
- 19 Litre Damacana: 90 TL
- 5 Litre Pet Su: 35 TL
- 24'lü Küçük Su (0.5L): 100 TL
- 12'li Küçük Su (0.5L): 55 TL

## KONUŞMA TARZI
- Kısa, net, samimi ve profesyonel
- Gereksiz uzatmalardan kaçın
- Türkiye Türkçesi kullan
- Müşteriye "Bey/Hanım" diye hitap et

## SİPARİŞ ALMA MANTIĞI
1. Ürün ve adet bilgisi al
2. Toplam tutarı hesapla ve söyle
3. Ödeme yöntemi sor (Nakit / Kredi Kartı)
4. Adres teyidi al (kayıtlı müşteriysen)
5. Siparişi onayla

## ÖNEMLİ KURALLAR
- Fiyatları doğru hesapla
- Adres eksikse mutlaka sor
- Sipariş kesinleşmeden kapanma
- Müşteri "operatör" derse transfer et

## ÇIKTI FORMATI
Sipariş kesinleştiğinde son mesajının sonuna şu JSON'u ekle:
\`\`\`json
{
  "order_status": "confirmed",
  "items": [{"product": "19L Damacana", "quantity": 2, "price": 90}],
  "total_price": 180,
  "payment": "nakit",
  "address": "tam adres"
}
\`\`\`
`;

// Get Gemini API key from cache or env
async function getGeminiApiKey() {
  // Try environment variable first
  if (process.env.GEMINI_API_KEY) {
    return process.env.GEMINI_API_KEY;
  }

  // Try Supabase integrations table
  try {
    const { data } = await supabase
      .from('integrations')
      .select('voice_order_gemini_api_key')
      .single();

    return data?.voice_order_gemini_api_key || null;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, customer_name } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, error: 'Message required' });
    }

    // Get API key
    const GEMINI_API_KEY = await getGeminiApiKey();

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ success: false, error: 'Gemini API Key bulunamadı. Lütfen admin panelinden API key girin.' });
    }

    // Customer context
    let customerContext = '';
    if (customer_name) {
      customerContext = `\nMÜŞTERİ: Kayıtlı - ${customer_name}\nAdres: Kayıtlı adres`;
    } else {
      customerContext = '\nMÜŞTERİ: Kayıtsız - Adres bilgisi alınmalı';
    }

    const prompt = `${VOICE_ORDER_SYSTEM_PROMPT}

${customerContext}

## Müşterinin mesajı: "${message}"

Lütfen yanıt ver. Sipariş kesinleşirse sonuna JSON formatını ekle.`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 500,
          topK: 40,
          topP: 0.95
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API hatası:', response.status, errorText);
      return res.status(500).json({ success: false, error: `Gemini API hatası: ${response.status}` });
    }

    const data = await response.json();
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Extract JSON
    const jsonMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
    let orderData = null;
    let cleanResponse = aiResponse;

    if (jsonMatch) {
      try {
        orderData = JSON.parse(jsonMatch[1]);
        cleanResponse = aiResponse.replace(/```json\s*[\s\S]*?\s*```/g, '').trim();
      } catch (e) {
        console.error('JSON parse hatası:', e);
      }
    }

    res.json({
      success: true,
      response: cleanResponse,
      orderData: orderData
    });

  } catch (error) {
    console.error('Voice order test hatası:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

export const config = {
  maxDuration: 10
};
