// =====================================================
// AI TELEFON ROBOTU SERVİSİ
// =====================================================
// Bu servis, telefonla gelen siparişleri AI ile işler

import { AICustomerResponse, AIOrderRequest, CallLog } from '../types';
import { supabase } from './supabaseClient';

// Varsayılan sistem promptu (AI robotun kişiliği)
const DEFAULT_SYSTEM_PROMPT = `Sen bir su dağıtım firması sipariş robotusun.
Amacın hızlı, hatasız, tek seferde sipariş almak.

KONUŞMA TARZI:
- Kısa, net, samimi, esnaf dili
- Gereksiz soru sorma
- Fiyat konuşma, kampanya uydurma, sistem dışı bilgi verme

SİPARİŞ ANLAMA KURALLARI:
Müşteri konuşmasından şu alanları çıkar:
- Ürün türü (19L, 5L, damacana vs)
- Adet (söylenmezse 1 kabul edilir)
- Ek not (varsa)

ADRES MANTIĞI:
- Kayıtlı müşteri ise: Adresi sistemden al, ASLA tekrar sorma
- Kayıtsız müşteri ise: Sırayla sor (mahalle/sokak, bina no, daire no)
- Adres TAMAMLANMADAN sipariş oluşturma

SİPARİŞ FORMATI:
Sipariş kesinleştiğinde JSON formatında ver:
{
  "telefon": "caller_id",
  "musteri_adi": "varsa",
  "urun": "19L",
  "adet": 2,
  "adres": "tam adres",
  "siparis_kaynagi": "telefon-robot",
  "not": "varsa"
}`;

export class AIPhoneAgent {
  private apiKey: string;
  private systemPrompt: string;

  constructor(apiKey?: string, systemPrompt?: string) {
    this.apiKey = apiKey || process.env.VITE_GEMINI_API_KEY || '';
    this.systemPrompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;
  }

  /**
   * Telefon numarasına göre müşteri sorgular
   * GET /api/customer/by-phone?phone={caller_id}
   */
  async getCustomerByPhone(phone: string): Promise<AICustomerResponse> {
    try {
      // Telefon numarasını normalize et
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('phone', cleanPhone)
        .single();

      if (error || !data) {
        return {
          found: false,
          customer: undefined
        };
      }

      // Adresi formatla
      const address = [
        data.district,
        data.neighborhood,
        data.street,
        `Bina: ${data.building_no}`,
        `Daire: ${data.apartment_no}`
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
      return {
        found: false,
        customer: undefined
      };
    }
  }

  /**
   * AI ile transkript analizi yapar ve sipariş verilerini çıkarır
   * Not: Gerçek bir AI API'si gerekir (OpenAI, Gemini, vb.)
   */
  async parseOrderFromTranscript(
    transcript: string,
    callerId: string,
    customerInfo?: AICustomerResponse
  ): Promise<AIOrderRequest | null> {
    try {
      // AI API çağrısı yapılabilir (şimdilik basit regex ile parse ediyoruz)
      // Gerçek implementasyonda buraya OpenAI/Gemini API çağrısı gelecek

      // Basit parse mantığı (demo için)
      const productMatch = transcript.match(/(\d+)\s*(L|litre|damacana)/i);
      const quantityMatch = transcript.match(/(\d+)\s*(tane|adet)/i);
      const noteMatch = transcript.match(/not\s*:\s*(.+)/i);

      const product = productMatch ? `${productMatch[1]}L` : '19L';
      const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
      const note = noteMatch ? noteMatch[1].trim() : undefined;

      // Adres müşteri bilgisinden geliyorsa
      const address = customerInfo?.customer?.address || '';

      return {
        telefon: callerId,
        musteri_adi: customerInfo?.customer?.name,
        urun: product,
        adet: quantity,
        adres: address,
        siparis_kaynagi: 'telefon-robot',
        not: note
      };
    } catch (error) {
      console.error('Transcript parse hatası:', error);
      return null;
    }
  }

  /**
   * Çağrı logunu kaydeder
   */
  async logCall(callData: {
    callerId: string;
    customerName?: string;
    customerFound: boolean;
    transcript: string;
    orderData?: any;
    status: 'success' | 'failed' | 'incomplete';
    errorMessage?: string;
  }): Promise<void> {
    try {
      await supabase.from('call_logs').insert({
        caller_id: callData.callerId,
        customer_name: callData.customerName,
        customer_found: callData.customerFound,
        transcript: callData.transcript,
        order_data: callData.orderData,
        status: callData.status,
        error_message: callData.errorMessage,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Çağrı kaydetme hatası:', error);
    }
  }

  /**
   * Çağrı loglarını getir
   */
  async getCallLogs(limit: number = 50): Promise<CallLog[]> {
    try {
      const { data, error } = await supabase
        .from('call_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return data.map((log: any) => ({
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
      }));
    } catch (error) {
      console.error('Çağrı logları getirme hatası:', error);
      return [];
    }
  }
}

// Export singleton instance
export const aiPhoneAgent = new AIPhoneAgent();
