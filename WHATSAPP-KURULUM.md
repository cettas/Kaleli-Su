# WhatsApp Sipariş Botu Kurulumu

## 📱 Nedir?

Müşteri WhatsApp'tan mesaj atar, bot karşilar:
- Menü butonları çıkar (Ürün seç, miktar seç)
- Butona tıkla -> Otomatik sipariş
- Operatöre devreder

## 🔧 Kurulum Adımları

### 1. Meta Business Suite Hesabı

1. [business.facebook.com](https://business.facebook.com/) adresine gidin
2. WhatsApp Business hesabı oluşturun
3. API anahtarlarınızı alın:
   - **Access Token** (System User)
   - **Phone Number ID**
   - **Verify Token** (kendiniz belirleyin)

### 2. Webhook Ayarları

Meta Developers panelinde webhook yapılandırın:

```
Webhook URL: https://sizin-siteniz.com/webhook/whatsapp/message
Verify Token: su_siparis_bot_2024
```

Abone olun:
- `messages`
- `messaging_postbacks`

### 3. API Sunucusunu Çalıştırın

```bash
npm run api
```

### 4. Admin Panelinden Ayarları Girin

1. Admin paneline girin
2. **Entegrasyon Yönetimi** → **WhatsApp**
3. API bilgilerini girin ve bağlantıyı test edin

## 🎯 Butonlu Mesaj Sistemi

WhatsApp Interactive Templates kullanarak menü oluşturuyoruz:

```
┌─────────────────────────┐
│  💧 Kaleli Su          │
├─────────────────────────┤
│  Sipariş vermek için    │
│  aşağıdan seçim yapın: │
├─────────────────────────┤
│  [🫗 19L Damacana]     │
│  [🧴 5L Pet]          │
│  [📋 Geçmiş Siparişler]│
│  [👨‍💼 Operatör]        │
└─────────────────────────┘
```

## 💻 Kod İçin WhatsApp Buton API

### Interactive List Message (Menü)

```javascript
async function sendWhatsAppMenu(phoneNumber: string) {
  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: '💧 Kaleli Su Sipariş Menüsü'
        },
        body: {
          text: 'Sipariş vermek için aşağıdan seçim yapabilirsiniz:'
        },
        footer: {
          text: 'Kaleli Su • Teslimat Hızlı'
        },
        action: {
          button: 'Sipariş Ver',
          sections: [
            {
              title: '🫗 Ürünler',
              rows: [
                {
                  id: '19L_1',
                  title: '19L Damacana',
                  description: '₺40 - Büyük boy damacana su'
                },
                {
                  id: '19L_2',
                  title: '19L Damacana (2 Adet)',
                  description: '₺80 - 2x19L damacana su'
                },
                {
                  id: '19L_3',
                  title: '19L Damacana (3 Adet)',
                  description: '₺120 - 3x19L damacana su'
                },
                {
                  id: '5L_1',
                  title: '5L Pet Su',
                  description: '₺25 - Küçük boy pet su'
                },
                {
                  id: '5L_2',
                  title: '5L Pet Su (2 Adet)',
                  description: '₺50 - 2x5L pet su'
                }
              ]
            },
            {
              title: '📋 Diğer',
              rows: [
                {
                  id: 'history',
                  title: 'Son Siparişlerim',
                  description: 'Geçmiş siparişlerimi görüntüle'
                },
                {
                  id: 'operator',
                  title: 'Müşteri Hizmetleri',
                  description: 'Operatörle konuşmak istiyorum'
                }
              ]
            }
          ]
        }
      }
    }
  });

  return await response.json();
}
```

### Buton Mesajı (Onay İçin)

```javascript
async function sendOrderConfirmation(phoneNumber: string, product: string, quantity: number) {
  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

  await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: `✅ *Sipariş Özeti*\n\n` +
                `📦 Ürün: ${product}\n` +
                `📊 Adet: ${quantity}\n` +
                `💰 Toplam: ₺${quantity * 40}\n\n` +
                `Onaylıyor musunuz?`
        },
        action: {
          buttons: [
            {
              type: 'reply',
              reply: {
                id: 'confirm_yes',
                title: '✅ Evet, Onayla'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'confirm_no',
                title: '❌ İptal'
              }
            },
            {
              type: 'reply',
              reply: {
                id: 'confirm_change',
                title: '✏️ Değiştir'
              }
            }
          ]
        }
      }
    })
  });
}
```

## 🔄 Webhook Handler

```typescript
// server/whatsappHandler.ts
import { supabase } from './supabaseClient';

export async function handleWhatsAppMessage(payload: any) {
  const message = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!message) return;

  const phoneNumber = message.from;
  const messageText = message.text?.body?.toLowerCase() || '';
  const buttonReply = message.interactive?.button_reply;

  // Buton tıklaması
  if (buttonReply) {
    await handleButtonReply(phoneNumber, buttonReply);
    return;
  }

  // Liste seçimi
  if (message.interactive?.list_reply) {
    await handleListReply(phoneNumber, message.interactive.list_reply);
    return;
  }

  // İlk mesaj - Menüyü gönder
  if (messageText === 'start' || messageText === 'menu' || messageText === 'sipariş') {
    await sendWhatsAppMenu(phoneNumber);
    return;
  }

  // Operatör talebi
  if (messageText.includes('operatör') || messageText.includes('yardım')) {
    await sendOperatorMessage(phoneNumber);
    return;
  }
}

async function handleListReply(phoneNumber: string, reply: any) {
  const selection = reply.id; // 19L_1, 5L_2, etc.

  if (selection === 'operator') {
    await sendOperatorMessage(phoneNumber);
    return;
  }

  if (selection === 'history') {
    await sendOrderHistory(phoneNumber);
    return;
  }

  // Ürün seçimi - parse et
  const [product, qty] = selection.split('_');
  const productName = product === '19L' ? '19L Damacana' : '5L Pet Su';
  const quantity = parseInt(qty);

  // Onay mesajı gönder
  await sendOrderConfirmation(phoneNumber, productName, quantity);
}

async function handleButtonReply(phoneNumber: string, reply: any) {
  const replyId = reply.id;

  if (replyId === 'confirm_yes') {
    // Siparişi oluştur
    await createOrderFromWhatsApp(phoneNumber);
    await sendMessage(phoneNumber, '✅ Siparişiniz alındı! En kısa sürede teslim edilecektir.');
  } else if (replyId === 'confirm_no') {
    await sendMessage(phoneNumber, '❌ Sipariş iptal edildi. Başka bir sipariş için menüyü kullanın.');
  } else if (replyId === 'confirm_change') {
    await sendWhatsAppMenu(phoneNumber);
  }
}
```

## 📱 Gelen Kutusu Mesajı (Karşılama)

Gelen her mesajda otomatik menü gönder:

```typescript
async function sendWelcomeMessage(phoneNumber: string, customerName?: string) {
  const name = customerName ? ` ${customerName}` : '';

  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

  await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: phoneNumber,
      type: 'template',
      template: {
        name: 'welcome_menu', // Meta'da önceden oluşturulmuş template
        language: { code: 'tr_TR' }
      }
    })
  });
}
```

## 🎨 Meta Business'te Template Oluşturma

1. [business.facebook.com/wa-management](https://business.facebook.com/wa_management)'a gidin
2. **Messaging** → **WhatsApp Manager** → **Message Templates**
3. **Create New Template**

### Welcome Template Örneği:

```
Name: welcome_menu
Category: MARKETING
Language: Turkish (tr)

Header:
💧 Kaleli Su

Body:
Merhaba {{1}}! 👋

Sipariş vermek için aşağıdaki butonu kullanabilirsiniz.

Button:
📋 Sipariş Menüsü
```

## 🚀 Test Etmek

WhatsApp'ta kendi numaranıza mesaj atın:

```
İlk Mesaj: start
→ Menü gelir
→ 19L Damacana seç
→ Onay butonuna tıkla
→ Sipariş oluşur
```

## 📊 WhatsApp Webhook Logları

```sql
-- Supabase'de mesaj loglarını görüntüle
SELECT * FROM whatsapp_logs
ORDER BY created_at DESC
LIMIT 10;

-- Başarısız mesajları görüntüle
SELECT * FROM whatsapp_failover_logs
ORDER BY created_at DESC;
```

## 💰 Maliyetler

- WhatsApp Business API: **Ücretsiz** (1000 mesaj/gün)
- Onaylı Business Account: ₺0 (~$0) - Başvuru gerekli
- Uygulama review: 1-3 gün

## ⚠️ Önemli Notlar

1. **24 saat kuralı**: Son mesajdan 24 saat sonra template kullanmalısınız
2. **Marketing templates**: Meta onayı gerektirir
3. **Utility templates**: Hızlı onay alır (sipariş güncelleme vb.)
4. **Test telefonu**: Her zaman kendi numaranızı test edin

## 🔗 Faydalı Linkler

- Meta Developers: https://developers.facebook.com/docs/whatsapp/
- WhatsApp Cloud API: https://developers.facebook.com/docs/whatsapp/cloud-api/
- Message Templates: https://developers.facebook.com/docs/whatsapp/message-templates/
