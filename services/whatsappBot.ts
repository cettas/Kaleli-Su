// =====================================================
// WHATSAPP SİPARİŞ BOTU SERVİSİ
// =====================================================
// WhatsApp üzerinden sipariş alır, gerekirse operatöre devreder

import { supabase } from './supabaseClient';

// =====================================================
// TİPLER VE İNTERFACE'LER
// =====================================================

export interface WhatsAppWebhookPayload {
  from: string; // whatsapp_phone (örn: 905551234567)
  message_id: string;
  message_text: string;
  timestamp: string;
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
}

export interface WhatsAppSession {
  phoneNumber: string;
  customerFound: boolean;
  customer?: {
    id: string;
    name: string;
    phone: string;
    address: string;
    lastOrder?: any;
  };
  state: 'greeting' | 'ordering' | 'address' | 'confirming' | 'operatör';
  retryCount: number;
  orderData?: {
    product: string;
    quantity: number;
    note?: string;
    address?: string;
  };
  messages: string[];
  createdAt: Date;
}

export interface WhatsAppMessage {
  to: string;
  text: string;
  type: 'text' | 'template';
}

export interface FailoverReason {
  type: 'anlaşılamadı' | 'api_hata' | 'müşteri_talebi' | 'adres_alınamadı' | 'ürün_bulunamadı';
  stage: 'greeting' | 'ordering' | 'address' | 'confirming';
  message: string;
}

// =====================================================
// WHATSAPP BOT SERVİSİ
// =====================================================

class WhatsAppBot {
  private activeSessions: Map<string, WhatsAppSession> = new Map();
  private whatsappAccessToken: string;
  private whatsappPhoneNumberId: string;
  private operatorPhone: string; // Operatör WhatsApp numarası

  constructor(config?: { accessToken?: string; phoneNumberId?: string; operatorPhone?: string }) {
    this.whatsappAccessToken = config?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '';
    this.whatsappPhoneNumberId = config?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '';
    this.operatorPhone = config?.operatorPhone || process.env.WHATSAPP_OPERATOR_PHONE || '';
  }

  // =====================================================
  // OTURUM YÖNETİMİ
  // =====================================================

  /**
   * WhatsApp mesajını işler
   */
  async handleIncomingMessage(payload: WhatsAppWebhookPayload): Promise<WhatsAppMessage | null> {
    const phoneNumber = payload.from;
    const messageText = payload.message_text.trim();

    console.log(`📨 WhatsApp mesajı: ${phoneNumber} - "${messageText}"`);

    // Oturum var mı kontrol et
    let session = this.activeSessions.get(phoneNumber);

    if (!session) {
      // Yeni oturum oluştur
      session = await this.createSession(phoneNumber);
    }

    // Mesajı kaydet
    session.messages.push(messageText);

    // Komut kontrolü
    if (messageText.toLowerCase() === 'reset' || messageText.toLowerCase() === 'başa sar') {
      this.activeSessions.delete(phoneNumber);
      return {
        to: phoneNumber,
        text: 'Oturum sıfırlandı. Yeni sipariş için yazabilirsiniz.',
        type: 'text'
      };
    }

    // Duruma göre yanıt üret
    const response = await this.processMessage(session, messageText);

    // Oturumu güncelle
    this.activeSessions.set(phoneNumber, session);

    return response;
  }

  /**
   * Yeni oturum oluşturur
   */
  private async createSession(phoneNumber: string): Promise<WhatsAppSession> {
    console.log(`🆕 Yeni WhatsApp oturumu: ${phoneNumber}`);

    // Müşteri sorgula
    const customer = await this.getCustomerByPhone(phoneNumber);

    const session: WhatsAppSession = {
      phoneNumber,
      customerFound: customer.found,
      customer: customer.customer,
      state: 'greeting',
      retryCount: 0,
      messages: [],
      createdAt: new Date()
    };

    // Son siparişi getir
    if (customer.found && customer.customer) {
      const lastOrder = await this.getLastOrder(customer.customer.id);
      session.customer.lastOrder = lastOrder;
    }

    this.activeSessions.set(phoneNumber, session);

    // İlk mesajı gönder
    if (customer.found && customer.customer) {
      session.state = 'ordering';
      return {
        to: phoneNumber,
        text: `Merhaba ${customer.customer.name}, siparişinizi yazabilirsiniz.`,
        type: 'text'
      };
    } else {
      session.state = 'address';
      return {
        to: phoneNumber,
        text: 'Merhaba, siparişinizi alabilmem için adres bilgilerinizi yazabilir misiniz?',
        type: 'text'
      };
    }
  }

  // =====================================================
  // MESAJ İŞLEME
  // =====================================================

  private async processMessage(session: WhatsAppSession, messageText: string): Promise<WhatsAppMessage | null> {
    const analysis = await this.analyzeMessage(messageText, session);

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

      case 'operatör':
        return await this.handleOperatorState(session, analysis);

      default:
        return null;
    }
  }

  private async handleOrderingState(session: WhatsAppSession, analysis: any): Promise<WhatsAppMessage | null> {
    // Sipariş tespit edildiyse
    if (analysis.order && analysis.order.product) {
      session.orderData = analysis.order;

      // Kayıtlı müşteri ise adres sistemden gelir
      if (session.customerFound && session.customer?.address) {
        session.orderData.address = session.customer.address;
        session.state = 'confirming';

        const orderText = analysis.order.quantity > 1
          ? `${analysis.order.quantity} adet ${analysis.order.product}`
          : `${analysis.order.quantity} adet ${analysis.order.product}`;

        return {
          to: session.phoneNumber,
          text: `Siparişiniz: ${orderText}. Onaylıyor musunuz? (Evet/Hayır)`,
          type: 'text'
        };
      } else {
        // Kayıtsız müşteri ise adres al
        session.state = 'address';
        return {
          to: session.phoneNumber,
          text: 'Tamam, lütfen açık adresinizi yazar mısınız? (Mahalle, sokak, bina, daire)',
          type: 'text'
        };
      }
    }

    // "Her zamanki" denildiyse
    if (analysis.isLastOrder && session.customer?.lastOrder) {
      const lastOrder = session.customer.lastOrder;
      const product = lastOrder.items[0]?.productName || '19L';
      const quantity = lastOrder.items[0]?.quantity || 1;

      session.orderData = {
        product,
        quantity,
        address: session.customer.address
      };
      session.state = 'confirming';

      return {
        to: session.phoneNumber,
        text: `Son siparişiniz: ${quantity} adet ${product}. Aynı şekilde gönderiliyor, onaylıyor musunuz? (Evet/Hayır)`,
        type: 'text'
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
      to: session.phoneNumber,
      text: 'Anlayamadım. Lütfen hangi üründen kaç adet istediğinizi yazar mısınız? (Örnek: "2 tane damacana")',
      type: 'text'
    };
  }

  private async handleAddressState(session: WhatsAppSession, analysis: any): Promise<WhatsAppMessage | null> {
    // Adres bilgisi alındı mı?
    if (analysis.address && analysis.address.length > 10) {
      session.orderData = {
        ...session.orderData!,
        address: analysis.address
      };
      session.state = 'ordering'; // Şimdi sipariş al

      return {
        to: session.phoneNumber,
        text: 'Adresiniz alındı, teşekkürler. Siparişinizi yazabilirsiniz.',
        type: 'text'
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
      to: session.phoneNumber,
      text: 'Adresinizi tam olarak alamadım. Lütfen mahalle, sokak, bina ve daire numaranızı yazar mısınız?',
      type: 'text'
    };
  }

  private async handleConfirmingState(session: WhatsAppSession, analysis: any): Promise<WhatsAppMessage | null> {
    // Onay alındı mı?
    if (analysis.confirmed) {
      // Siparişi oluştur
      const result = await this.createOrder(session);

      if (result.success) {
        await this.logChat(session, 'success');
        this.activeSessions.delete(session.phoneNumber);

        return {
          to: session.phoneNumber,
          text: 'Siparişiniz alındı, en kısa sürede teslim edilecektir. İyi günler dileriz.',
          type: 'text'
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
        to: session.phoneNumber,
        text: 'Tamam, siparişinizi baştan alabilirim. Hangi üründen kaç adet istersiniz?',
        type: 'text'
      };
    }

    // Anlaşılamadı
    return {
      to: session.phoneNumber,
      text: 'Lütfen siparişinizi onaylıyor musunuz? Evet veya hayır yazar mısınız?',
      type: 'text'
    };
  }

  private async handleOperatorState(session: WhatsAppSession, analysis: any): Promise<WhatsAppMessage | null> {
    // Operatör modunda, bot sadece bilgilendirme mesajı gönderir
    return {
      to: session.phoneNumber,
      text: 'Sizinle bir müşteri temsilcimiz ilgileniyor.',
      type: 'text'
    };
  }

  // =====================================================
  // ANALİZ FONKSİYONLARI
  // =====================================================

  /**
   * Mesaj metnünü analiz eder
   */
  private async analyzeMessage(messageText: string, session: WhatsAppSession): Promise<any> {
    const text = messageText.toLowerCase().trim();

    // Operatör talebi kontrolü
    const operatorKeywords = ['operatör', 'yetkili', 'canlı', 'destek', 'insan', 'temsilci', 'müşteri hizmetleri'];
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
      const yesWords = ['evet', 'tamam', 'onay', 'onaylıyorum', 'doğru', 'olur', 'haklısın', 'başar'];
      const noWords = ['hayır', 'yok', 'değil', 'değiştir', 'iptal', 'olmaz'];

      if (yesWords.some(w => text.includes(w))) {
        return { confirmed: true };
      }
      if (noWords.some(w => text.includes(w))) {
        return { declined: true };
      }
    }

    // "Her zamanki" analizi
    if (text.includes('her zamanki') || text.includes('usual') || text.includes('son sipariş') || text.includes('aynısı')) {
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
    const products: Record<string, string> = {
      '19 litre': '19L',
      '19l': '19L',
      '19 luk': '19L',
      '19\'luk': '19L',
      '19\'lük': '19L',
      'damacana': '19L',
      'büyük': '19L',
      '5 litre': '5L',
      '5l': '5L',
      '5 luk': '5L',
      '5\'luk': '5L',
      '5\'lük': '5L',
      'küçük': '5L',
      'pet': '5L'
    };

    for (const [key, value] of Object.entries(products)) {
      if (text.includes(key)) {
        return value;
      }
    }

    // Varsayılan
    if (text.includes('su') || text.includes('sipariş') || text.includes('gönder')) {
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
      .replace(/evet|hayır|tamam|teşekkür|bye|görüşürüz|güle güle/gi, '')
      .trim();

    return filtered.length > 10 ? filtered : null;
  }

  // =====================================================
  // FAILOVER (OPERATÖRE DEVİR)
  // =====================================================

  private async triggerFailover(session: WhatsAppSession, reason: FailoverReason): Promise<WhatsAppMessage | null> {
    console.log('🚨 WHATSAPP FAILOVER tetiklendi:', reason);

    // Failover log'u kaydet
    await this.logFailover(session, reason);

    // Oturumu operatöre devret
    session.state = 'operatör';

    // Operatöre bildirim gönder (opsiyonel)
    if (this.operatorPhone) {
      await this.sendOperatorNotification(session, reason);
    }

    // Müşteriye mesaj gönder
    const message: WhatsAppMessage = {
      to: session.phoneNumber,
      text: 'Sizi hemen müşteri temsilcimize aktarıyorum.',
      type: 'text'
    };

    // Operatör paneline bildirim (webhook ile yapılabilir)
    await this.notifyOperatorPanel(session, reason);

    return message;
  }

  /**
   * Operatöre WhatsApp bildirimi gönderir
   */
  private async sendOperatorNotification(session: WhatsAppSession, reason: FailoverReason): Promise<void> {
    try {
      const customerInfo = session.customer
        ? `${session.customer.name} (${session.phoneNumber})`
        : session.phoneNumber;

      const message = `🔔 YENİ WHATSAPP DEVİR:\n\nMüşteri: ${customerInfo}\nSebep: ${reason.type}\nAşama: ${reason.stage}\n\nSon mesajlar:\n${session.messages.slice(-3).join('\n')}`;

      // WhatsApp Business API ile gönder
      await this.sendWhatsAppMessage(this.operatorPhone, message);
    } catch (error) {
      console.error('Operatör bildirim hatası:', error);
    }
  }

  /**
   * Operatör paneline bildirim gönderir
   */
  private async notifyOperatorPanel(session: WhatsAppSession, reason: FailoverReason): Promise<void> {
    // Burada operatör paneline WebSocket veya webhook ile bildirim gönderilebilir
    console.log('📢 Operatör paneline devir bildirimi:', session.phoneNumber);
  }

  // =====================================================
  // API FONKSİYONLARI
  // =====================================================

  /**
   * WhatsApp mesajı gönderir (Meta Business API)
   */
  async sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
    try {
      if (!this.whatsappAccessToken || !this.whatsappPhoneNumberId) {
        console.warn('WhatsApp API bilgileri eksik, mesaj gönderilemiyor');
        return false;
      }

      const response = await fetch(
        `https://graph.facebook.com/v18.0/${this.whatsappPhoneNumberId}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.whatsappAccessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: to,
            text: { body: text }
          })
        }
      );

      if (response.ok) {
        console.log('✅ WhatsApp mesajı gönderildi:', to);
        return true;
      } else {
        console.error('❌ WhatsApp mesaj hatası:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ WhatsApp API hatası:', error);
      return false;
    }
  }

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
  private async createOrder(session: WhatsAppSession): Promise<{ success: boolean; error?: string }> {
    try {
      const orderData = {
        telefon: session.phoneNumber,
        musteri_adi: session.customer?.name || 'Müşteri',
        urun: session.orderData?.product || '19L',
        adet: session.orderData?.quantity || 1,
        adres: session.orderData?.address || '',
        siparis_kaynagi: 'whatsapp',
        not: session.orderData?.note
      };

      // API'ye gönder
      const response = await fetch('http://localhost:3001/api/order/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
      });

      if (response.ok) {
        console.log('✅ WhatsApp siparişi başarıyla oluşturuldu');
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
   * WhatsApp sohbet logunu kaydeder
   */
  private async logChat(session: WhatsAppSession, status: 'success' | 'failover'): Promise<void> {
    try {
      await supabase.from('whatsapp_chats').insert({
        phone_number: session.phoneNumber,
        customer_name: session.customer?.name,
        customer_found: session.customerFound,
        messages: session.messages,
        order_data: session.orderData,
        status,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('WhatsApp chat kaydetme hatası:', error);
    }
  }

  /**
   * Failover logunu kaydeder
   */
  private async logFailover(session: WhatsAppSession, reason: FailoverReason): Promise<void> {
    try {
      await supabase.from('whatsapp_failover_logs').insert({
        phone_number: session.phoneNumber,
        reason_type: reason.type,
        stage: reason.stage,
        message: reason.message,
        messages: session.messages,
        customer_found: session.customerFound,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('WhatsApp failover log hatası:', error);
    }
  }

  // =====================================================
  // GETTER FONKSİYONLARI
  // =====================================================

  /**
   * Aktif oturumu döndürür
   */
  getSession(phoneNumber: string): WhatsAppSession | undefined {
    return this.activeSessions.get(phoneNumber);
  }

  /**
   * Oturumu sonlandırır
   */
  endSession(phoneNumber: void): void {
    this.activeSessions.delete(phoneNumber);
  }

  /**
   * Tüm aktif oturumları döndürür
   */
  getAllSessions(): Map<string, WhatsAppSession> {
    return this.activeSessions;
  }
}

// Export singleton instance
export const whatsappBot = new WhatsAppBot();
