# Netgsm Sesli Sipariş Robotu Kurulumu

## 📞 Nedir?

Müşteri arar, robot karşilar:
- "Hoş geldiniz Ahmet Bey, siparişinizi söyleyebilirsiniz."
- Müşteri: "2 tane damacana"
- Robot: "2 adet 19L siparişini alıyorum, doğru mu?"
- Müşteri: "Evet"
- Robot: "Siparişiniz alınmıştır, en kısa sürede yola çıkacak."

## 🔧 Kurulum Adımları

### 1. Netgsm Hesabı

1. [https://www.netgsm.com.tr/](https://www.netgsm.com.tr/) adresinden hesap açın
2. Santral hizmeti alın (VoIP telefon hattı)
3. API anahtarlarınızı alın:
   - **API Key** - Panelden alın
   - **Santral Numara** - Size verilen telefon numarası

### 2. Netgsm Panelinde Webhook Ayarları

Netgsm paneline gidin ve webhook URL'lerini ekleyin:

```
Çağrı Başlangıç: https://sizin-siteniz.com/webhook/netgsm/call/start
Konuşma (STT):  https://sizin-siteniz.com/webhook/netgsm/call/speech
Çağrı Sonu:     https://sizin-siteniz.com/webhook/netgsm/call/end
DTMF (Tuşlama):  https://sizin-siteniz.com/webhook/netgsm/call/dtmf
```

### 3. API Sunucusunu Çalıştırın

```bash
# Backend API sunucusunu başlat
npm run api

# veya her ikisi birlikte
npm run dev:all
```

### 4. Admin Panelinden Ayarları Girin

1. Admin paneline girin
2. **Entegrasyon Yönetimi**'ne tıklayın
3. **Netgsm** bölümünde ayarları girin:
   - API Key
   - Telefon Numarası
   - Webhook URL (otomatik dolacak)

### 5. TTS (Sesli Yanıt) Entegrasyonu

Netgsm'in TTS özelliğini kullanmak için:

#### Seçenek 1: Netgsm TTS API

```javascript
// Webhook yanıtında ses dosyası dönün
{
  "text": "Hoş geldiniz",
  "audio_url": "https://api.netgsm.com.tr/v2/tts?text=Hoş%20geldiniz&api_key=YOUR_KEY"
}
```

#### Seçenek 2: Google Cloud TTS

```javascript
async function textToSpeech(text: string): Promise<string> {
  const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`, {
    method: 'POST',
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: 'tr-TR', name: 'tr-TR-Wavenet-A' },
      audioConfig: { audioEncoding: 'MP3' }
    })
  });
  const data = await response.json();
  // Base64 audio'u kaydet ve URL döndür
  return saveAudioFile(data.audioContent);
}
```

#### Seçenek 3: ElevenLabs (Daha doğal ses)

```javascript
async function textToSpeechElevenLabs(text: string): Promise<string> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/VOICE_ID`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.5 }
    })
  });
  return saveAudioFile(await response.arrayBuffer());
}
```

## 🎯 Çalışma Akışı

```
1. Müşteri Arar
   ↓
2. Netgsm → Webhook (call/start)
   ↓
3. API: Müşteriyi bul, karşılama mesajı oluştur
   ↓
4. TTS: "Hoş geldiniz [İsim], siparişinizi söyleyebilirsiniz."
   ↓
5. Müşteri konuşur
   ↓
6. Netgsm STT → Webhook (call/speech)
   ↓
7. API: Konuşmayı analiz et, siparişi çıkar
   ↓
8. TTS: Onay sor: "X adet Y siparişini alıyorum, doğru mu?"
   ↓
9. Müşteri: "Evet"
   ↓
10. API: Siparişi kaydet, teşekkür mesajı
   ↓
11. TTS: "Siparişiniz alınmıştır..."
   ↓
12. Çağrı biter → Webhook (call/end)
```

## 📝 Örnek Webhook Payload

### Gelen Çağrı (POST /webhook/netgsm/call/start)

```json
{
  "call_id": "call_123456",
  "caller_id": "+905551234567",
  "direction": "incoming",
  "status": "answered",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Beklenen Yanıt

```json
{
  "text": "Hoş geldiniz Ahmet Bey, siparişinizi söyleyebilirsiniz.",
  "action": "continue",
  "audio_url": "https://your-cdn.com/audio/greeting.mp3"
}
```

### Konuşma (POST /webhook/netgsm/call/speech)

```json
{
  "call_id": "call_123456",
  "text": "iki tane damacana lütfen",
  "confidence": 0.95,
  "timestamp": "2024-01-15T10:30:15Z"
}
```

### Beklenen Yanıt

```json
{
  "text": "2 adet 19L damacana siparişini alıyorum, doğru mu?",
  "action": "continue"
}
```

## 🚀 Örnek Kullanım

```typescript
import { netgsmVoiceAgent } from './services/netgsmVoiceAgent';

// Çağrı geldiğinde
const response = await netgsmVoiceAgent.handleIncomingCall({
  call_id: 'call_123',
  caller_id: '+905551234567',
  direction: 'incoming',
  status: 'answered',
  timestamp: new Date().toISOString()
});

console.log(response.text); // "Hoş geldiniz..."
```

## ⚠️ Önemli Notlar

1. **API sunucusu her zaman çalışmalı** - `npm run api` ile başlatın
2. **Webhook URL'leri dışarıdan erişilebilir olmalı** - localhost çalışmaz
3. **Netgsm API limitlerine dikkat edin** - Çok fazla çağrı = extra ücret
4. **Test etmeden canlıya almayın** - Önce kendi numaranızdan deneyin

## 💰 Maliyetler

- Netgsm Santral: ~₺200-500/ay
- TTS API (Google): ~$0.004/1000 karakter
- TTS API (ElevenLabs): ~$5-11/ay (starter plan)
- Alternatif: Ücretsiz TTS motorları kullanabilirsiniz

## 🎨 Ses Dosyaları Hazırlama (Ücretsiz Seçenek)

TTS API yerine önceden kaydedilmiş ses dosyaları kullanabilirsiniz:

```bash
# Ses dosyalarını hazırlayın
public/audio/
  ├── greeting.mp3        # Hoş geldiniz
  ├── order_confirm.mp3   # Siparişinizi alıyorum
  ├── thank_you.mp3       # Siparişiniz alındı
  ├── goodbye.mp3         # İyi günler
  └── transfer.mp3        # Operatöre aktarıyorum
```

Sonra kodda kullanın:

```typescript
const getAudioFile = (type: string, params?: any) => {
  const files = {
    greeting: '/audio/greeting.mp3',
    order_confirm: `/audio/order_confirm_${params.count}_${params.product}.mp3`,
    thank_you: '/audio/thank_you.mp3'
  };
  return files[type];
};
```

## 🆘 Destek

Sorun yaşarsanız:
1. API sunucusu loglarını kontrol edin
2. Netgsm panelindeki webhook loglarını inceleyin
3. Supabase'de `call_logs` tablosunu kontrol edin
