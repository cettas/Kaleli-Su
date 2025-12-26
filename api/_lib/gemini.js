// =====================================================
// GEMINI AI HELPER - SERVERLESS
// =====================================================

import { getCachedGeminiApiKey } from './supabase.js';

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
- Sipariş kesinleşmeden "İyi günler" deme
- Müşteri "operatör", "yetkili", "canlı" derse transfer et

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

export async function callGeminiAI(customer, conversationHistory, userText) {
  let GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

  if (!GEMINI_API_KEY) {
    GEMINI_API_KEY = await getCachedGeminiApiKey();
  }

  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API Key bulunamadı');
  }

  let customerContext = '';
  if (customer) {
    customerContext = `
MÜŞTERİ: Kayıtlı - ${customer.name || 'Müşteri'}
Adres: ${customer.address || ''}`;
  } else {
    customerContext = '\nMÜŞTERİ: Kayıtsız - Adres bilgisi alınmalı';
  }

  const history = conversationHistory.slice(-5).join('\n');

  const prompt = `${VOICE_ORDER_SYSTEM_PROMPT}

${customerContext}

## ŞİMDİYE KADARKİ KONUŞMA:
${history}

## Müşterinin son mesajı: "${userText}"

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
    throw new Error(`Gemini API hatası: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export function extractOrderJSON(text) {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1]);
    } catch { return null; }
  }

  const objectMatch = text.match(/\{[\s\S]*"order_status"[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch { return null; }
  }

  return null;
}

export function removeJSONFromResponse(text) {
  return text
    .replace(/```json\s*[\s\S]*?\s*```/g, '')
    .replace(/\{[\s\S]*"order_status"[\s\S]*\}/g, '')
    .trim();
}
