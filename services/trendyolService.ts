// =====================================================
// TRENDYOL ENTİGRASYON SERVİSİ
// =====================================================
// Trendyol API üzerinden otomatik sipariş çekme

import { supabase } from './supabaseClient';

// =====================================================
// TİPLER VE İNTERFACE'LER
// =====================================================

export interface TrendyolOrder {
  id: string;
  orderNumber: string;
  customerFirstName: string;
  customerLastName: string;
  customerPhoneNumber: string;
  customerEmail?: string;
  shippingAddress: {
    address: string;
    district: string;
    city: string;
    country: string;
    zipCode: string;
  };
  orderDate: string;
  estimatedDeliveryDate: string;
  status: 'Created' | 'Approved' | 'InPickup' | 'InShipment' | 'Shipped' | 'Delivered' | 'Cancelled';
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    currencyCode: string;
    barcode: string;
  }[];
  totalAmount: number;
  paymentType: 'CreditCard' | 'WireTransfer' | 'CashOnDelivery';
}

export interface TrendyolAuthConfig {
  apiKey: string;
  apiSecret: string;
  supplierId: string;
}

// =====================================================
// TRENDYOL API SERVİSİ
// =====================================================

class TrendyolService {
  private config: TrendyolAuthConfig | null = null;
  private readonly BASE_URL = 'https://api.trendyol.com/sapigw/suppliers';
  private requestCount = 0;
  private lastRequestTime = 0;
  private readonly RATE_LIMIT = 100; // 100 istak/saniye
  private readonly MIN_REQUEST_INTERVAL = 10; // ms between requests

  constructor() {
    this.loadConfig();
  }

  /**
   * Supabase'den ayarları yükler
   */
  private async loadConfig(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('trendyol_api_key, trendyol_api_secret, trendyol_supplier_id, trendyol_enabled')
        .single();

      if (data && data.trendyol_enabled && data.trendyol_api_key && data.trendyol_api_secret && data.trendyol_supplier_id) {
        this.config = {
          apiKey: data.trendyol_api_key,
          apiSecret: data.trendyol_api_secret,
          supplierId: data.trendyol_supplier_id
        };
        console.log('✅ Trendyol ayarları yüklendi');
      }
    } catch (error) {
      console.error('Trendyol ayarları yüklenemedi:', error);
    }
  }

  /**
   * API request için auth header oluşturur
   */
  private getAuthHeaders(): HeadersInit {
    if (!this.config) {
      throw new Error('Trendyol ayarları yapılandırılmamış');
    }

    return {
      'Authorization': `Basic ${btoa(`${this.config.apiKey}:${this.config.apiSecret}`)}`,
      'Content-Type': 'application/json',
      'User-Agent': `${this.config.supplierId} - SelfIntegration`
    };
  }

  /**
   * Rate limiting kontrolü
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, this.MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }

    this.requestCount++;
    this.lastRequestTime = Date.now();

    if (this.requestCount % this.RATE_LIMIT === 0) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 saniye bekle
      this.requestCount = 0;
    }
  }

  /**
   * Trendyol API'den siparişleri çeker
   */
  async fetchOrders(params: {
    startDate?: string;
    endDate?: string;
    status?: string;
    page?: number;
    size?: number;
  } = {}): Promise<{ success: boolean; orders?: TrendyolOrder[]; error?: string }> {
    try {
      if (!this.config) {
        return { success: false, error: 'Trendyol ayarları yapılandırılmamış' };
      }

      await this.checkRateLimit();

      const queryParams = new URLSearchParams();

      if (params.startDate) {
        queryParams.append('startDate', params.startDate);
      }
      if (params.endDate) {
        queryParams.append('endDate', params.endDate);
      }
      if (params.status) {
        queryParams.append('status', params.status);
      }
      queryParams.append('page', String(params.page || 0));
      queryParams.append('size', String(params.size || 50));

      const url = `${this.BASE_URL}/${this.config.supplierId}/orders?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Trendyol API hatası:', response.status, errorText);
        return { success: false, error: `API Hatası: ${response.status}` };
      }

      const data = await response.json();

      // Trendyol API yanıtını normalize et
      const orders: TrendyolOrder[] = (data.content || []).map((order: any) => ({
        id: order.id || order.orderId || '',
        orderNumber: order.orderNumber || order.orderNumber || '',
        customerFirstName: order.customerFirstName || '',
        customerLastName: order.customerLastName || '',
        customerPhoneNumber: order.customerPhoneNumber || order.gsmNumber || '',
        customerEmail: order.customerEmail,
        shippingAddress: {
          address: order.shippingAddress?.address || order.shippingAddress?.fullAddress || '',
          district: order.shippingAddress?.district || '',
          city: order.shippingAddress?.city || '',
          country: order.shippingAddress?.country || 'Turkey',
          zipCode: order.shippingAddress?.zipCode || ''
        },
        orderDate: order.orderDate || order.createdDate || new Date().toISOString(),
        estimatedDeliveryDate: order.estimatedDeliveryDate || '',
        status: order.status || 'Created',
        items: (order.items || order.lines || []).map((item: any) => ({
          productId: item.productId || item.merchantId || '',
          productName: item.productName || item.productName || '',
          quantity: item.quantity || item.amount || 1,
          price: item.price || item.priceWithDiscount || 0,
          currencyCode: item.currencyCode || 'TRY',
          barcode: item.barcode || ''
        })),
        totalAmount: order.totalAmount || order.grossAmount || 0,
        paymentType: order.paymentType || order.paymentMethod || 'CashOnDelivery'
      }));

      console.log(`✅ Trendyol'dan ${orders.length} sipariş çekildi`);
      return { success: true, orders };

    } catch (error) {
      console.error('Trendyol sipariş çekme hatası:', error);
      return { success: false, error: 'Bağlantı hatası' };
    }
  }

  /**
   * Sipariş durumunu günceller
   */
  async updateOrderStatus(orderId: string, status: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config) {
        return { success: false, error: 'Trendyol ayarları yapılandırılmamış' };
      }

      await this.checkRateLimit();

      const url = `${this.BASE_URL}/${this.config.supplierId}/order-items/${orderId}/confirm-shipment`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          status: status,
          lines: [{
            lineId: orderId,
            quantity: 1
          }]
        })
      });

      if (!response.ok) {
        return { success: false, error: `API Hatası: ${response.status}` };
      }

      console.log(`✅ Trendyol sipariş ${orderId} durumu güncellendi: ${status}`);
      return { success: true };

    } catch (error) {
      console.error('Trendyol durum güncelleme hatası:', error);
      return { success: false, error: 'Bağlantı hatası' };
    }
  }

  /**
   * Yeni siparişleri sisteme ekler
   */
  async importNewOrders(): Promise<{ success: boolean; imported: number; error?: string }> {
    try {
      // Bugünün siparişlerini çek
      const today = new Date();
      const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endDate = today.toISOString();

      const result = await this.fetchOrders({ startDate, endDate });

      if (!result.success || !result.orders) {
        return { success: false, imported: 0, error: result.error };
      }

      let importedCount = 0;

      for (const trendyolOrder of result.orders) {
        // Daha önce import edilmiş mi kontrol et
        const { data: existing } = await supabase
          .from('orders')
          .select('id')
          .eq('source_order_id', trendyolOrder.id)
          .maybeSingle();

        if (existing) {
          continue; // Zaten import edilmiş
        }

        // Müşteriyi bul veya oluştur
        const cleanPhone = trendyolOrder.customerPhoneNumber.replace(/\D/g, '').slice(-10);

        let { data: customer } = await supabase
          .from('customers')
          .select('id')
          .eq('phone', cleanPhone)
          .maybeSingle();

        if (!customer) {
          const { data: newCustomer } = await supabase
            .from('customers')
            .insert({
              phone: cleanPhone,
              name: `${trendyolOrder.customerFirstName} ${trendyolOrder.customerLastName}`.trim(),
              address: [
                trendyolOrder.shippingAddress.address,
                trendyolOrder.shippingAddress.district,
                trendyolOrder.shippingAddress.city
              ].filter(Boolean).join(', '),
              created_at: new Date().toISOString()
            })
            .select('id')
            .single();

          customer = newCustomer;
        }

        // Siparişi oluştur
        const orderData = {
          customer_id: customer.id,
          customer_name: `${trendyolOrder.customerFirstName} ${trendyolOrder.customerLastName}`.trim(),
          phone: cleanPhone,
          address: [
            trendyolOrder.shippingAddress.address,
            trendyolOrder.shippingAddress.district,
            trendyolOrder.shippingAddress.city,
            trendyolOrder.shippingAddress.zipCode
          ].filter(Boolean).join(', '),
          items: trendyolOrder.items.map(item => ({
            product_id: item.productId,
            product_name: item.productName,
            quantity: item.quantity,
            price: item.price
          })),
          total_amount: trendyolOrder.totalAmount,
          payment_method: trendyolOrder.paymentType === 'CashOnDelivery' ? 'cash' : 'card',
          payment_status: 'paid',
          status: this.mapTrendyolStatus(trendyolOrder.status),
          source: 'Trendyol',
          source_order_id: trendyolOrder.id,
          created_at: trendyolOrder.orderDate,
          updated_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
          .from('orders')
          .insert(orderData);

        if (!insertError) {
          importedCount++;
          console.log(`✅ Trendyol sipariş import edildi: ${trendyolOrder.orderNumber}`);
        }
      }

      console.log(`✅ Toplam ${importedCount} yeni Trendyol siparişi import edildi`);
      return { success: true, imported: importedCount };

    } catch (error) {
      console.error('Trendyol sipariş import hatası:', error);
      return { success: false, imported: 0, error: 'Import hatası' };
    }
  }

  /**
   * Trendyol durumunu sistem durumuna map'ler
   */
  private mapTrendyolStatus(trendyolStatus: string): string {
    const statusMap: Record<string, string> = {
      'Created': 'Bekliyor',
      'Approved': 'Bekliyor',
      'InPickup': 'Yolda',
      'InShipment': 'Yolda',
      'Shipped': 'Yolda',
      'Delivered': 'Teslim Edildi',
      'Cancelled': 'İptal'
    };
    return statusMap[trendyolStatus] || 'Bekliyor';
  }

  /**
   * API bağlantısını test eder
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.config) {
        return { success: false, error: 'Trendyol ayarları yapılandırılmamış' };
      }

      await this.checkRateLimit();

      const url = `${this.BASE_URL}/${this.config.supplierId}/orders?page=0&size=1`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorText = await response.text();
        return { success: false, error: `API Hatası: ${response.status} - ${errorText}` };
      }

    } catch (error) {
      return { success: false, error: 'Bağlantı hatası' };
    }
  }

  /**
   * Ayarları yeniden yükler
   */
  async reloadConfig(): Promise<void> {
    await this.loadConfig();
  }

  /**
   * Servisin yapılandırılmış olup olmadığını kontrol eder
   */
  isConfigured(): boolean {
    return this.config !== null;
  }
}

// Export singleton instance
export const trendyolService = new TrendyolService();
