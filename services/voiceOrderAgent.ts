// =====================================================
// SESLİ SİPARİŞ ASİSTANI SERVİSİ
// =====================================================
// Google Gemini AI + NetGSM entegrasyonu ile sesli sipariş alma

import { supabase } from './supabaseClient';

// =====================================================
// TİPLER VE İNTERFACE'LER
// =====================================================

export interface VoiceOrderSession {
  sessionId: string;
  callerId: string;
  customerFound: boolean;
  customer?: {
    id: string;
    name: string;
    phone: string;
    address: string;
    lastOrder?: {
      items: Array<{ productName: string; quantity: number }>;
      totalAmount: number;
    };
  };
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  state: 'greeting' | 'ordering' | 'address' | 'payment' | 'confirming' | 'completed';
  orderData?: {
    items: Array<{ productName: string; quantity: number; price: number }>;
    totalAmount: number;
    address: string;
    paymentMethod: string;
    note?: string;
  };
  createdAt: Date;
}

export interface VoiceOrderResponse {
  text: string;
  action: 'continue' | 'hangup' | 'transfer';
  orderConfirmed?: boolean;
  orderData?: any;
}

export interface ProductInfo {
  id: string;
  name: string;
  price: number;
  category: string;
}

// =====================================================
// SİSTEM PROMPT - AI KİŞİLİĞİ
// =====================================================

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
- Müşteriye "Bey/Hanım" diye hitap et (örn: "Ahmet Bey", "Ayşe Hanım")

## MÜŞTERİ TANIMA
- Eğer müşteri kayıtlıysa ismiyle hitap et
- "Her zamanki adresinize mi?" diye sor
- Son siparişi hatırlatıp onay al

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

Sipariş devam ediyorsa JSON ekleme, normal konuşmaya devam et.
`;

// =====================================================
// SESLİ SİPARİŞ ASİSTANI SINIFI
// =====================================================

export class VoiceOrderAgent {
  private geminiApiKey: string;
  private activeSessions: Map<string, VoiceOrderSession> = new Map();
  private productCache: ProductInfo[] = [];
  private lastProductFetch: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

  constructor(apiKey?: string) {
    this.geminiApiKey = apiKey || process.env.VITE_GEMINI_API_KEY || '';
  }

  // =====================================================
  // ÜRÜN YÖNETİMİ
  // =====================================================

  /**
   * Ürün listesini veritabanından getir (cache'li)
   */
  private async getProducts(): Promise<ProductInfo[]> {
    const now = Date.now();

    if (this.productCache.length > 0 && (now - this.lastProductFetch) < this.CACHE_DURATION) {
      return this.productCache;
    }

    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('id, name, sale_price, category')
        .eq('is_active', true);

      if (error) throw error;

      this.productCache = data || [];
      this.lastProductFetch = now;

      return this.productCache;
    } catch (error) {
      console.error('Ürün getirme hatası:', error);

      // Fallback ürün listesi
      return [
        { id: '1', name: '19L Damacana', price: 90, category: 'damacana' },
        { id: '2', name: '5L Pet Su', price: 35, category: 'pet' },
        { id: '3', name: '24lü Küçük Su', price: 100, category: 'kucuk' },
        { id: '4', name: '12li Küçük Su', price: 55, category: 'kucuk' }
      ];
    }
  }

  /**
   * Ürün adına göre fiyat bul
   */
  private async getProductPrice(productName: string): Promise<{ product: string; price: number } | null> {
    const products = await this.getProducts();
    const normalized = productName.toLowerCase();

    const found = products.find(p =>
      p.name.toLowerCase().includes(normalized) ||
      normalized.includes(p.name.toLowerCase()) ||
      (normalized.includes('damacana') && p.category === 'damacana') ||
      (normalized.includes('pet') && p.category === 'pet') ||
      (normalized.includes('küçük') && p.category === 'kucuk') ||
      (normalized.includes('19') && p.category === 'damacana') ||
      (normalized.includes('5') && p.category === 'pet')
    );

    return found ? { product: found.name, price: found.sale_price } : null;
  }

  // =====================================================
  // MÜŞTERİ YÖNETİMİ
  // =====================================================

  /**
   * Telefon numarasına göre müşteri sorgula
   */
  async getCustomerByPhone(phone: string): Promise<{ found: boolean; customer?: any }> {
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (error || !data) {
        return { found: false };
      }

      // Adresi formatla
      const address = [
        data.district,
        data.neighborhood,
        data.street,
        data.building_no ? `Bina: ${data.building_no}` : '',
        data.apartment_no ? `Daire: ${data.apartment_no}` : ''
      ].filter(Boolean).join(', ');

      // Son siparişi getir
      const lastOrder = await this.getLastOrder(data.id);

      return {
        found: true,
        customer: {
          id: data.id,
          name: data.name,
          phone: data.phone,
          address,
          lastOrder
        }
      };
    } catch (error) {
      console.error('Müşteri sorgulama hatası:', error);
      return { found: false };
    }
  }

  /**
   * Son siparişi getir
   */
  private async getLastOrder(customerId: string): Promise<any> {
    try {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('customer_id', customerId)
        .in('status', ['Teslim Edildi', 'Yolda', 'Bekliyor'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!data) return null;

      return {
        items: data.items || [],
        totalAmount: data.total_amount
      };
    } catch (error) {
      console.error('Son sipariş hatası:', error);
      return null;
    }
  }

  // =====================================================
  // SESLİ OTURUM YÖNETİMİ
  // =====================================================

  /**
   * Yeni bir çağrı oturumu başlat
   */
  async startSession(callId: string, callerId: string): Promise<VoiceOrderResponse> {
    const sessionId = `${callId}_${Date.now()}`;

    // Müşteriyi sorgula
    const customerResult = await this.getCustomerByPhone(callerId);

    const session: VoiceOrderSession = {
      sessionId,
      callerId,
      customerFound: customerResult.found,
      customer: customerResult.customer,
      conversationHistory: [],
      state: 'greeting',
      createdAt: new Date()
    };

    this.activeSessions.set(sessionId, session);

    // Karşılama mesajını AI ile oluştur
    return await this.generateGreetingResponse(session);
  }

  /**
   * Karşılama mesajı oluştur
   */
  private async generateGreetingResponse(session: VoiceOrderSession): Promise<VoiceOrderResponse> {
    let contextPrompt = '';

    if (session.customerFound && session.customer) {
      const lastOrderInfo = session.customer.lastOrder
        ? `\nSon siparişi: ${session.customer.lastOrder.items.map((i: any) => `${i.quantity} adet ${i.productName}`).join(', ')}`
        : '';

      contextPrompt = `
MÜŞTERİ BİLGİLERİ:
- İsim: ${session.customer.name}
- Adres: ${session.customer.address}${lastOrderInfo}

Bu müşteriyi ismiyle karşıla ve "Her zamanki adresinize mi gönderelim?" diye sor.`;
    } else {
      contextPrompt = `
MÜŞTERİ BİLGİLERİ:
- Kayıtlı değil, yeni müşteri

Bu müşteriyi karşıla ve siparişini almak için önce ürün bilgisini iste.`;
    }

    const response = await this.callGemini(
      `${VOICE_ORDER_SYSTEM_PROMPT}\n\n${contextPrompt}\n\nŞimdi müşteriyi karşıla.`,
      []
    );

    session.conversationHistory.push({ role: 'assistant', content: response });

    return {
      text: response,
      action: 'continue'
    };
  }

  /**
   * Müşteri konuşmasını işle
   */
  async processSpeech(sessionId: string, speechText: string): Promise<VoiceOrderResponse> {
    const session = this.activeSessions.get(sessionId);

    if (!session) {
      return {
        text: 'Üzgünüm, bir sorun oluştu. Sizi operatöre bağlıyorum.',
        action: 'transfer'
      };
    }

    // Müşteri konuşmasını geçmişe ekle
    session.conversationHistory.push({ role: 'user', content: speechText });

    // Operatör talebi kontrolü
    const lowerText = speechText.toLowerCase();
    if (lowerText.includes('operatör') || lowerText.includes('yetkili') || lowerText.includes('canlı') || lowerText.includes('insan')) {
      this.activeSessions.delete(sessionId);
      return {
        text: 'Tabii ki, sizi hemen müşteri temsilcimize aktarıyorum.',
        action: 'transfer'
      };
    }

    // Ürün bilgilerini al
    const products = await this.getProducts();
    const productList = products.map(p => `- ${p.name}: ${p.sale_price} TL`).join('\n');

    // Müşteri context'i
    let customerContext = '';
    if (session.customerFound && session.customer) {
      customerContext = `
MÜŞTERİ: Kayıtlı - ${session.customer.name}
Adres: ${session.customer.address}`;
    } else {
      customerContext = '\nMÜŞTERİ: Kayıtsız - Adres bilgisi alınmalı';
    }

    // AI çağrısı yap
    const prompt = `${VOICE_ORDER_SYSTEM_PROMPT}

${customerContext}

## MEVCUT ÜRÜNLER:
${productList}

## ŞİMDİYE KADAKKİ KONUŞMA:
${this.formatConversationHistory(session.conversationHistory)}

## Müşterinin son mesajı: "${speechText}"

Lütfen yanıt ver. Sipariş kesinleşirse sonuna JSON formatını ekle.`;

    const response = await this.callGemini(prompt, session.conversationHistory);

    // JSON çıkışı kontrolü
    const orderData = this.extractOrderJSON(response);
    const cleanResponse = this.removeJSONFromResponse(response);

    session.conversationHistory.push({ role: 'assistant', content: cleanResponse });

    // Sipariş onaylandı mı?
    if (orderData && orderData.order_status === 'confirmed') {
      session.orderData = orderData;
      session.state = 'completed';

      // Siparişi veritabanına kaydet
      const saveResult = await this.saveOrder(session);

      if (saveResult.success) {
        await this.logCall(session, 'success');
        this.activeSessions.delete(sessionId);

        return {
          text: cleanResponse,
          action: 'hangup',
          orderConfirmed: true,
          orderData: saveResult.order
        };
      } else {
        // Hata durumunda operatöre transfer
        return {
          text: 'Üzgünüm, sipariş kaydedilirken bir sorun oluştu. Sizi operatöre bağlıyorum.',
          action: 'transfer'
        };
      }
    }

    return {
      text: cleanResponse,
      action: 'continue'
    };
  }

  // =====================================================
  // GEMINI AI ENTEGRASYONU
  // =====================================================

  /**
   * Gemini API ile konuşma analizi
   */
  private async callGemini(prompt: string, history: Array<{ role: string; content: string }>): Promise<string> {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`;

      // Gemini formatına çevir
      const contents = [
        { role: 'user', parts: [{ text: prompt }] }
      ];

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
            topK: 40,
            topP: 0.95
          }
        })
      });

      if (!response.ok) {
        console.error('Gemini API hatası:', response.status);
        return this.getFallbackResponse();
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || this.getFallbackResponse();

    } catch (error) {
      console.error('Gemini çağrı hatası:', error);
      return this.getFallbackResponse();
    }
  }

  // =====================================================
  // YARDIMCI FONKSİYONLAR
  // =====================================================

  /**
   * Konuşma geçmişini formatla
   */
  private formatConversationHistory(history: Array<{ role: string; content: string }>): string {
    return history.map(msg => {
      const role = msg.role === 'user' ? 'Müşteri' : 'Asistan';
      return `${role}: ${msg.content}`;
    }).join('\n');
  }

  /**
   * Yanıttaki JSON bilgisini çıkar
   */
  private extractOrderJSON(text: string): any {
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        return null;
      }
    }

    // JSON kod bloğu olmadan da kontrol et
    const objectMatch = text.match(/\{[\s\S]*"order_status"[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Yanıttan JSON kısmını çıkar
   */
  private removeJSONFromResponse(text: string): string {
    return text
      .replace(/```json\s*[\s\S]*?\s*```/g, '')
      .replace(/\{[\s\S]*"order_status"[\s\S]*\}/g, '')
      .trim();
  }

  /**
   * Fallback yanıt döndür (AI hatası durumunda)
   */
  private getFallbackResponse(): string {
    const fallbackResponses = [
      'Anlayamadım, tekrar eder misiniz?',
      'Lütfen siparişinizi tekrar söyler misiniz?',
      'Üzgünüm, bağlantıda sorun var. Hangi üründen kaç adet istersiniz?'
    ];
    return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
  }

  // =====================================================
  // SİPARİŞ KAYIT İŞLEMLERİ
  // =====================================================

  /**
   * Siparişi veritabanına kaydet
   */
  private async saveOrder(session: VoiceOrderSession): Promise<{ success: boolean; order?: any; error?: string }> {
    try {
      if (!session.orderData) {
        return { success: false, error: 'Sipariş verisi yok' };
      }

      // Müşteriyi bul veya oluştur
      let customer = session.customer;
      if (!customer) {
        const newCustomer = await this.createCustomer(session.callerId, session.orderData.address);
        if (newCustomer) {
          customer = newCustomer;
        } else {
          return { success: false, error: 'Müşteri oluşturulamadı' };
        }
      }

      // Sipariş öğelerini hazırla
      const items = await Promise.all(
        session.orderData.items.map(async (item: any) => {
          const productInfo = await this.getProductPrice(item.product);
          return {
            product_id: productInfo ? null : item.product,
            product_name: item.product,
            quantity: item.quantity,
            price: item.price || (productInfo?.price || 90)
          };
        })
      );

      const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Siparişi oluştur
      const { data, error } = await supabase
        .from('orders')
        .insert({
          customer_id: customer.id,
          customer_name: customer.name,
          phone: session.callerId.replace(/\D/g, '').slice(-10),
          address: session.orderData.address,
          items,
          total_amount: totalAmount,
          payment_method: session.orderData.paymentMethod === 'kredi kartı' ? 'card' : 'cash',
          payment_status: 'pending',
          status: 'Bekliyor',
          source: 'Telefon Robot',
          notes: session.orderData.note || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Sesli sipariş oluşturuldu: ${data.id}`);
      return { success: true, order: data };

    } catch (error) {
      console.error('Sipariş kayıt hatası:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Yeni müşteri oluştur
   */
  private async createCustomer(phone: string, address: string): Promise<any> {
    try {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      const name = 'Müşteri'; // Varsayılan, sonra güncellenebilir

      const { data, error } = await supabase
        .from('customers')
        .insert({
          phone: cleanPhone,
          name,
          address,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('Müşteri oluşturma hatası:', error);
      return null;
    }
  }

  // =====================================================
  // LOG İŞLEMLERİ
  // =====================================================

  /**
   * Çağrı logunu kaydet
   */
  private async logCall(session: VoiceOrderSession, status: 'success' | 'failed'): Promise<void> {
    try {
      await supabase.from('call_logs').insert({
        caller_id: session.callerId,
        customer_name: session.customer?.name,
        customer_found: session.customerFound,
        transcript: session.conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n'),
        order_data: session.orderData,
        status,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Çağrı kaydetme hatası:', error);
    }
  }

  // =====================================================
  // OTURUM YÖNETİMİ
  // =====================================================

  /**
   * Oturumu getir
   */
  getSession(sessionId: string): VoiceOrderSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Oturumu sonlandır
   */
  endSession(sessionId: string): void {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      this.logCall(session, 'failed').catch(console.error);
      this.activeSessions.delete(sessionId);
    }
  }

  /**
   * Tüm aktif oturumları getir
   */
  getActiveSessions(): VoiceOrderSession[] {
    return Array.from(this.activeSessions.values());
  }
}

// =====================================================
// EXPORT SINGLETON
// =====================================================

export const voiceOrderAgent = new VoiceOrderAgent();
