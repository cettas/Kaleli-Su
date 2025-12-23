// =====================================================
// NETGSM SESLİ SİPARİŞ ROBOTU SERVİSİ
// =====================================================
// Netgsm ile sesli çağrı karşılar, sipariş alır, gerekirse operatöre devreder

import { supabase } from './supabaseClient';

// =====================================================
// TİPLER VE İNTERFACE'LER
// =====================================================

export interface NetgsmWebhookPayload {
  call_id: string;
  caller_id: string;
  direction: 'incoming' | 'outgoing';
  status: 'ringing' | 'answered' | 'hungup';
  timestamp: string;
  audio_url?: string; // Ses kaydı URL'si (STT için)
}

export interface CallSession {
  callId: string;
  callerId: string;
  customerFound: boolean;
  customer?: {
    id: string;
    name: string;
    phone: string;
    address: string;
    lastOrder?: any;
  };
  state: 'greeting' | 'ordering' | 'address' | 'confirming' | 'failover';
  retryCount: number;
  orderData?: {
    product: string;
    quantity: number;
    note?: string;
  };
  transcript: string[];
  createdAt: Date;
}

export interface FailoverReason {
  type: 'anlaşılamadı' | 'api_hata' | 'müşteri_talebi' | 'adres_alınamadı' | 'ürün_bulunamadı';
  stage: 'greeting' | 'ordering' | 'address' | 'confirming';
  message: string;
}

export interface VoiceResponse {
  text: string;
  action: 'continue' | 'hangup' | 'transfer';
  transferTo?: string;
}

// =====================================================
// NETGSM SESLİ ROBOT SERVİSİ
// =====================================================

class NetgsmVoiceAgent {
  private activeCalls: Map<string, CallSession> = new Map();
  private netgsmApiKey: string;
  private netgsmPhoneNumber: string;
  private operatorExtension: string; // Operatör dahilisi

  constructor(config?: { apiKey?: string; phoneNumber?: string; operatorExtension?: string }) {
    this.netgsmApiKey = config?.apiKey || process.env.NETGSM_API_KEY || '';
    this.netgsmPhoneNumber = config?.phoneNumber || process.env.NETGSM_PHONE_NUMBER || '';
    this.operatorExtension = config?.operatorExtension || '100'; // Varsayılan operatör hattı
  }

  // =====================================================
  // ÇAĞRI YÖNETİMİ
  // =====================================================

  /**
   * Netgsm webhook'tan gelen çağrıyı karşılar
   */
  async handleIncomingCall(payload: NetgsmWebhookPayload): Promise<VoiceResponse> {
    console.log('📞 Gelen çağrı:', payload.caller_id);

    // Çağrı oturumunu oluştur
    const session: CallSession = {
      callId: payload.call_id,
      callerId: payload.caller_id,
      customerFound: false,
      state: 'greeting',
      retryCount: 0,
      transcript: [],
      createdAt: new Date()
    };

    this.activeCalls.set(payload.call_id, session);

    // Müşteri sorgula
    const customer = await this.getCustomerByPhone(payload.caller_id);

    if (customer.found && customer.customer) {
      session.customerFound = true;
      session.customer = customer.customer;

      // Son siparişi getir
      const lastOrder = await this.getLastOrder(customer.customer.id);
      session.customer.lastOrder = lastOrder;

      return {
        text: `Hoş geldiniz ${customer.customer.name}, siparişinizi söyleyebilirsiniz.`,
        action: 'continue'
      };
    } else {
      session.state = 'address';
      return {
        text: 'Hoş geldiniz, siparişinizi alabilmem için adres bilgilerinizi alabilir miyim? Önce mahalle ve sokak ismini söyler misiniz?',
        action: 'continue'
      };
    }
  }

  /**
   * Müşterinin konuşmasını işler ve yanıt üretir
   */
  async processCustomerSpeech(callId: string, speechText: string, audioUrl?: string): Promise<VoiceResponse> {
    const session = this.activeCalls.get(callId);
    if (!session) {
      console.error('Çağrı oturumu bulunamadı:', callId);
      return {
        text: 'Üzgünüm, bir sorun oluştu. Sizi operatöre bağlıyorum.',
        action: 'transfer',
        transferTo: this.operatorExtension
      };
    }

    // Transkripti kaydet
    session.transcript.push(speechText);

    // Konuşma analiz et ve sipariş çıkar
    const analysis = await this.analyzeSpeech(speechText, session);

    // Failover kontrolü
    if (analysis.shouldFailover) {
      return await this.triggerFailover(session, analysis.failoverReason!);
    }

    // Duruma göre yanıt ver
    switch (session.state) {
      case 'greeting':
      case 'ordering':
        return await this.handleOrderingState(session, analysis);

      case 'address':
        return await this.handleAddressState(session, analysis);

      case 'confirming':
        return await this.handleConfirmingState(session, analysis);

      default:
        return {
          text: 'Anlayamadım, tekrar eder misiniz?',
          action: 'continue'
        };
    }
  }

  // =====================================================
  // DURUM YÖNETİMİ
  // =====================================================

  private async handleOrderingState(session: CallSession, analysis: any): Promise<VoiceResponse> {
    // Sipariş tespit edildiyse
    if (analysis.order && analysis.order.product) {
      session.orderData = analysis.order;

      // Kayıtlı müşteri ise adres sistemden gelir
      if (session.customerFound && session.customer?.address) {
        session.orderData.adres = session.customer.address;
        session.state = 'confirming';
        return {
          text: `${analysis.order.quantity} adet ${analysis.order.product} siparişini alıyorum, doğru mu?`,
          action: 'continue'
        };
      } else {
        // Kayıtsız müşteri ise adres al
        session.state = 'address';
        return {
          text: 'Tamam, lütfen açık adresinizi söyler misiniz? Mahalle, sokak, bina ve daire numarası.',
          action: 'continue'
        };
      }
    }

    // "Her zamanki gibi" denildiyse
    if (analysis.isLastOrder && session.customer?.lastOrder) {
      const lastOrder = session.customer.lastOrder;
      const product = lastOrder.items[0]?.productName || '19L';
      const quantity = lastOrder.items[0]?.quantity || 1;

      session.orderData = {
        product,
        quantity,
        adres: session.customer.address
      };
      session.state = 'confirming';

      return {
        text: `Peki, ${quantity} adet ${product} gönderiyorum, doğru mu?`,
        action: 'continue'
      };
    }

    // Anlaşılamadı
    session.retryCount++;
    if (session.retryCount >= 2) {
      return await this.triggerFailover(session, {
        type: 'anlaşılamadı',
        stage: 'ordering',
        message: '2 kez anlaşılamadı'
      });
    }

    return {
      text: 'Anlayamadım, hangi üründen ve kaç adet istediğinizi söyler misiniz?',
      action: 'continue'
    };
  }

  private async handleAddressState(session: CallSession, analysis: any): Promise<VoiceResponse> {
    // Adres bilgisi alındı mı?
    if (analysis.address && analysis.address.length > 10) {
      session.orderData = {
        ...session.orderData!,
        adres: analysis.address
      };
      session.state = 'confirming';

      return {
        text: 'Adresiniz alındı. Siparişinizi teyit edeyim mi?',
        action: 'continue'
      };
    }

    session.retryCount++;
    if (session.retryCount >= 3) {
      return await this.triggerFailover(session, {
        type: 'adres_alınamadı',
        stage: 'address',
        message: 'Adres 3 kez alınamadı'
      });
    }

    return {
      text: 'Adresinizi tam olarak alamadım. Lütfen mahalle, sokak, bina ve daire numaranızı sırayla söyler misiniz?',
      action: 'continue'
    };
  }

  private async handleConfirmingState(session: CallSession, analysis: any): Promise<VoiceResponse> {
    // Onay alındı mı?
    if (analysis.confirmed) {
      // Siparişi oluştur
      const result = await this.createOrder(session);

      if (result.success) {
        await this.logCall(session, 'success');
        this.activeCalls.delete(session.callId);

        return {
          text: 'Siparişiniz alınmıştır, en kısa sürede yola çıkacak. İyi günler dilerim.',
          action: 'hangup'
        };
      } else {
        // API hatası → Failover
        return await this.triggerFailover(session, {
          type: 'api_hata',
          stage: 'confirming',
          message: result.error || 'Sipariş API hatası'
        });
      }
    }

    // Reddedildi mi?
    if (analysis.declined) {
      session.state = 'ordering';
      session.retryCount = 0;
      session.orderData = undefined;

      return {
        text: 'Tamam, siparişinizi baştan alabilirim. Hangi üründen kaç adet istersiniz?',
        action: 'continue'
      };
    }

    // Anlaşılamadı
    return {
      text: 'Lütfen siparişinizi onaylıyor musunuz? Evet veya hayır diyebilirsiniz.',
      action: 'continue'
    };
  }

  // =====================================================
  // ANALİZ FONKSİYONLARI
  // =====================================================

  /**
   * Konuşma metnünü analiz eder ve sipariş/niyet çıkarır
   */
  private async analyzeSpeech(speechText: string, session: CallSession): Promise<any> {
    const text = speechText.toLowerCase().trim();

    // Operatör talebi kontrolü
    const operatorKeywords = ['operatör', 'yetkili', 'canlı', 'insan', 'temsilci'];
    if (operatorKeywords.some(k => text.includes(k))) {
      return {
        shouldFailover: true,
        failoverReason: {
          type: 'müşteri_talebi',
          stage: session.state,
          message: 'Müşteri operatör istedi'
        }
      };
    }

    // Onay/Red analizi
    if (session.state === 'confirming') {
      const yesWords = ['evet', 'tamam', 'onaylıyorum', 'doğru', 'olur', 'haklısın'];
      const noWords = ['hayır', 'yok', 'değil', 'değiştir', 'iptal'];

      if (yesWords.some(w => text.includes(w))) {
        return { confirmed: true };
      }
      if (noWords.some(w => text.includes(w))) {
        return { declined: true };
      }
    }

    // "Her zamanki" analizi
    if (text.includes('her zamanki') || text.includes('usual')) {
      return { isLastOrder: true };
    }

    // Ürün ve adet çıkarımı
    const productMatch = this.extractProduct(text);
    const quantityMatch = this.extractQuantity(text);

    if (productMatch) {
      return {
        order: {
          product: productMatch,
          quantity: quantityMatch || 1
        }
      };
    }

    // Adres çıkarımı
    if (session.state === 'address') {
      const addressMatch = this.extractAddress(text);
      if (addressMatch) {
        return { address: addressMatch };
      }
    }

    return {};
  }

  private extractProduct(text: string): string | null {
    // Ürün eşleştirmeleri
    const products = {
      '19 litre': '19L',
      '19l': '19L',
      '19 luk': '19L',
      '19\'luk': '19L',
      'damacana': '19L',
      'büyük': '19L',
      '5 litre': '5L',
      '5l': '5L',
      '5 luk': '5L',
      '5\'luk': '5L',
      'küçük': '5L',
      'pet': '5L'
    };

    for (const [key, value] of Object.entries(products)) {
      if (text.includes(key)) {
        return value;
      }
    }

    // Varsayılan
    if (text.includes('su') || text.includes('sipariş')) {
      return '19L';
    }

    return null;
  }

  private extractQuantity(text: string): number | null {
    // Sayıları çıkar
    const numberWords: Record<string, number> = {
      'bir': 1, 'iki': 2, 'üç': 3, 'dört': 4, 'beş': 5,
      'altı': 6, 'yedi': 7, 'sekiz': 8, 'dokuz': 9, 'on': 10
    };

    // Önce kelime sayıları
    for (const [word, num] of Object.entries(numberWords)) {
      if (text.includes(word)) {
        return num;
      }
    }

    // Rakamları çıkar
    const match = text.match(/\d+/);
    if (match) {
      return parseInt(match[0]);
    }

    return null;
  }

  private extractAddress(text: string): string | null {
    // Adres uzunluğu kontrolü (en az 10 karakter)
    if (text.length < 10) return null;

    // Anlamsız kelimeleri çıkar
    const filtered = text
      .replace(/evet|hayır|tamam|teşekkür|bye|görüşürüz/gi, '')
      .trim();

    return filtered.length > 10 ? filtered : null;
  }

  // =====================================================
  // FAILOVER (OPERATÖRE DEVRETME)
  // =====================================================

  private async triggerFailover(session: CallSession, reason: FailoverReason): Promise<VoiceResponse> {
    console.log('🚨 FAILOVER tetiklendi:', reason);

    // Failover log'u kaydet
    await this.logFailover(session, reason);

    // Çağrıyı operatöre transfer et
    const transferResult = await this.transferToOperator(session.callId);

    if (transferResult.success) {
      // Oturumu temizle
      this.activeCalls.delete(session.callId);

      return {
        text: 'Sizi hemen müşteri temsilcimize aktarıyorum.',
        action: 'transfer',
        transferTo: this.operatorExtension
      };
    } else {
      // Transfer başarısız oldu → çağrıyı kapat
      this.activeCalls.delete(session.callId);

      return {
        text: 'Üzgünüm, şu an bağlantı sorunu yaşıyoruz. Kısa bir süre sonra tekrar arayabilir misiniz?',
        action: 'hangup'
      };
    }
  }

  /**
   * Netgsm Call Transfer API'si ile çağrıyı operatöre devreder
   */
  private async transferToOperator(callId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Netgsm API ile transfer
      // API endpoint: https://api.netgsm.com.tr/v2/call/transfer
      const response = await fetch('https://api.netgsm.com.tr/v2/call/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.netgsmApiKey}`
        },
        body: JSON.stringify({
          call_id: callId,
          transfer_to: this.operatorExtension,
          record: true // Transfer sonrası kayıt devam etsin
        })
      });

      if (response.ok) {
        console.log('✅ Çağrı operatöre başarıyla transfer edildi');
        return { success: true };
      } else {
        console.error('❌ Transfer hatası:', response.status);
        return { success: false, error: 'Transfer başarısız' };
      }
    } catch (error) {
      console.error('❌ Transfer API hatası:', error);
      return { success: false, error: 'API bağlantı hatası' };
    }
  }

  // =====================================================
  // API FONKSİYONLARI
  // =====================================================

  /**
   * Müşteri sorgular
   */
  private async getCustomerByPhone(phone: string): Promise<{ found: boolean; customer?: any }> {
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

      return {
        found: true,
        customer: {
          id: data.id,
          name: data.name,
          phone: data.phone,
          address
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

      return data;
    } catch (error) {
      console.error('Son sipariş hatası:', error);
      return null;
    }
  }

  /**
   * Siparişi oluşturur
   */
  private async createOrder(session: CallSession): Promise<{ success: boolean; error?: string }> {
    try {
      const orderData = {
        telefon: session.callerId,
        musteri_adi: session.customer?.name || 'Müşteri',
        urun: session.orderData?.product || '19L',
        adet: session.orderData?.quantity || 1,
        adres: session.orderData?.adres || '',
        siparis_kaynagi: 'telefon-robot',
        not: session.orderData?.note
      };

      // API'ye gönder
      const response = await fetch('http://localhost:3001/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        console.log('✅ Sipariş başarıyla oluşturuldu');
        return { success: true };
      } else {
        console.error('❌ Sipariş API hatası:', response.status);
        return { success: false, error: 'Sipariş oluşturulamadı' };
      }
    } catch (error) {
      console.error('❌ Sipariş oluşturma hatası:', error);
      return { success: false, error: 'Bağlantı hatası' };
    }
  }

  // =====================================================
  // LOG FONKSİYONLARI
  // =====================================================

  /**
   * Çağrı logunu kaydeder
   */
  private async logCall(session: CallSession, status: 'success' | 'failed'): Promise<void> {
    try {
      await supabase.from('call_logs').insert({
        caller_id: session.callerId,
        customer_name: session.customer?.name,
        customer_found: session.customerFound,
        transcript: session.transcript.join(' | '),
        order_data: session.orderData,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Çağrı kaydetme hatası:', error);
    }
  }

  /**
   * Failover logunu kaydeder
   */
  private async logFailover(session: CallSession, reason: FailoverReason): Promise<void> {
    try {
      await supabase.from('call_failover_logs').insert({
        call_id: session.callId,
        caller_id: session.callerId,
        reason_type: reason.type,
        stage: reason.stage,
        message: reason.message,
        transcript: session.transcript.join(' | '),
        customer_found: session.customerFound,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failover log hatası:', error);
    }
  }

  /**
   * Aktif çağrı oturumunu döndürür
   */
  getSession(callId: string): CallSession | undefined {
    return this.activeCalls.get(callId);
  }

  /**
   * Çağrı oturumunu sonlandırır
   */
  endCall(callId: string): void {
    this.activeCalls.delete(callId);
  }
}

// Export singleton instance
export const netgsmVoiceAgent = new NetgsmVoiceAgent();
