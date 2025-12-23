# 🚀 Su Dağıtım Sistemi - Kurulum Rehberi

Bu rehber, Su Dağıtım Sistemi'nin tam kurulumu ve deploy edilmesi için adım adım talimatlar içerir.

## 📋 İçindekiler

1. [Supabase Kurulumu](#1-supabase-kurulumu)
2. [Environment Variables](#2-environment-variables)
3. [Yerel Geliştirme](#3-yerel-geliştirme)
4. [Vercel Deploy](#4-vercel-deploy)
5. [Netgsm Entegrasyonu](#5-netgsm-entegrasyonu)
6. [WhatsApp Entegrasyonu](#6-whatsapp-entegrasyonu)

---

## 1. SUPABASE KURULUMU

### 1.1. Supabase Projesi Oluştur

1. [https://supabase.com](https://supabase.com)'e git
2. "New Project" butonuna tıkla
3. GitHub ile giriş yap
4. Organizasyon seç veya yeni oluştur
5. Proje bilgilerini gir:
   - **Name**: `su-dagitim-sistemi`
   - **Database Password**: Güçlü bir şifre belirle (kaydet!)
   - **Region**: En yakın region (örn: Frankfurt)
6. "Create new project" butonuna tıkla

### 1.2. SQL Migration'u Çalıştır

1. Supabase dashboard'da projeni aç
2. Sol menüden **"SQL Editor"**'e tıkla
3. `supabase-migration.sql` dosyasının içeriğini kopyala
4. SQL Editör'e yapıştır ve **"Run"** butonuna tıkla
5. Tüm tabloların başarıyla oluşturulduğunu gör

**Oluşturulan Tablolar:**
- ✅ `integrations` - Entegrasyon ayarları
- ✅ `call_logs` - Sesli çağrı logları
- ✅ `call_failover_logs` - Operatöre devir logları
- ✅ `whatsapp_chats` - WhatsApp konuşmaları
- ✅ `whatsapp_failover_logs` - WhatsApp failover logları

### 1.3. Supabase API Bilgilerini Al

1. Supabase projende **"Settings"** > **"API"**'ye git
2. Şu bilgileri kopyala:
   - **Project URL**: `VITE_SUPABASE_URL`
   - **anon public**: `VITE_SUPABASE_ANON_KEY`

---

## 2. ENVIRONMENT VARIABLES

### 2.1. .env Dosyası Oluştur

Proje kök dizininde `.env` dosyası oluştur:

```bash
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# AI Robot (opsiyonel)
GEMINI_API_KEY=your_gemini_api_key

# Netgsm (opsiyonel)
NETGSM_API_KEY=your_netgsm_api_key
NETGSM_PHONE_NUMBER=+905551234567
NETGSM_OPERATOR_EXTENSION=100

# WhatsApp (opsiyonel)
WHATSAPP_ACCESS_TOKEN=your_whatsapp_access_token
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_OPERATOR_PHONE=905559876543
```

⚠️ **ÖNEMLİ**: `.env` dosyasını asla GitHub'a push etme! (`.gitignore`'da zaten var)

---

## 3. YEREL GELİŞTİRME

### 3.1. Bağımlılıkları Yükle

```bash
npm install
```

### 3.2. Development Server'ı Başlat

**Terminal 1 - Frontend:**
```bash
npm run dev
```
Uygulama `http://localhost:3000` adresinde açılacak.

**Terminal 2 - API Server:**
```bash
npm run api
```
API server `http://localhost:3001` adresinde çalışacak.

### 3.3. Test Kullanıcıları

**Admin Girişi:**
- Kullanıcı adı: `admin`
- Şifre: `admin123`

**Ofis Girişi:**
- Kullanıcı adı: `ofis`
- Şifre: `ofis123`

---

## 4. VERCEL DEPLOY

### 4.1. Vercel Projesi Oluştur

1. [https://vercel.com](https://vercel.com)'e git
2. "Add New..." > "Project" butonuna tıkla
3. GitHub hesabını bağla
4. `su-dagitim-sistemi` reposunu seç
5. "Import" butonuna tıkla

### 4.2. Environment Variables Ekle

1. Vercel projende **"Settings"** > **"Environment Variables"**'e git
2. Aşağıdaki değişkenleri ekle:

| Key | Value | Environment |
|-----|-------|--------------|
| `VITE_SUPABASE_URL` | Supabase Project URL | All |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key | All |

### 4.3. Deploy Et

1. **"Deployments"** sekmesine git
2. **"Deploy"** butonuna tıkla
3. Deploy işlemi 2-3 dakika sürecek
4. ✅ Başarılı deploy sonrası Vercel sana bir URL verecek

### 4.4. Deploy Sonrası

Deploy başarılı olduktan sonra:
- Uygulamanız `https://su-dagitim-sistemi.vercel.app` adresinde çalışacak
- Her `git push`'ta otomatik deploy olacak

---

## 5. NETGSM ENTEGRASYONU

### 5.1. Netgsm Hesabı Oluştur

1. [https://www.netgsm.com.tr](https://www.netgsm.com.tr)'e git
2. Sanal numara al
3. API bilgilerini al:
   - API Key
   - Telefon numarası

### 5.2. Webhook Ayarları

Netgsm panelinde şu webhook URL'lerini gir:

**Çağrı Başlangıç:**
```
POST https://su-dagitim-sistemi.vercel.app/webhook/netgsm/call/start
```

**Konuşma (STT):**
```
POST https://su-dagitim-sistemi.vercel.app/webhook/netgsm/call/speech
```

**Çağrı Sonu:**
```
POST https://su-dagitim-sistemi.vercel.app/webhook/netgsm/call/end
```

**DTMF (Tuşlama):**
```
POST https://su-dagitim-sistemi.vercel.app/webhook/netgsm/call/dtmf
```

### 5.3. Admin Panelinde Ayarlama

1. Admin paneline giriş yap
2. **Entegrasyonlar** sekmesine git
3. **Netgsm Sesli Robot** bölümünü aç
4. API bilgilerini gir ve **Kaydet**

---

## 6. WHATSAPP ENTEGRASYONU

### 6.1. Meta Business API Kurulumu

1. [Meta Business Suite](https://business.facebook.com/)'e git
2. **WhatsApp Manager**'ı aç
3. **WhatsApp Business API App** oluştur

### 6.2. Webhook Kurulumu

Meta panelinde şu webhook URL'lerini gir:

**Webhook URL:**
```
https://su-dagitim-sistemi.vercel.app/webhook/whatsapp/message
```

**Verify Token:**
```
su_siparis_bot_2024
```

### 6.3. Access Token ve Phone Number ID Al

1. Meta WhatsApp Business API settings'e git
2. **Access Token** oluştur (geçici 24 saat veya kalıcı)
3. **Phone Number ID**'yi kopyala

### 6.4. Admin Panelinde Ayarlama

1. Admin paneline giriş yap
2. **Entegrasyonlar** sekmesine git
3. **WhatsApp Sipariş Botu** bölümünü aç
4. Access Token ve Phone Number ID'yi gir
5. **Kaydet** butonuna tıkla

---

## 🧪 TEST ETME

### Netgsm Test

```bash
curl -X POST https://su-dagitim-sistemi.vercel.app/webhook/netgsm/call/start \
  -H "Content-Type: application/json" \
  -d '{"call_id":"test-123","caller_id":"905551234567"}'
```

### WhatsApp Test

```bash
curl -X POST https://su-dagitim-sistemi.vercel.app/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{"phone":"905551234567","message":"2 tane damacana"}'
```

---

## 📚 KULLANIM KILAVUZLARI

### Admin Paneli Kullanımı

- **Dashboard**: İstatistikleri görüntüle
- **Entegrasyonlar > Ayarlar**: API anahtarlarını gir
- **Entegrasyonlar > Loglar**: Çağrı ve WhatsApp loglarını incele

### Ofis Paneli Kullanımı

- **Kaynak Filtresi**: WhatsApp, telefon-robot vb. filtrele
- **Sipariş Formu**: Kaynak seç (dropdown)

---

## 🚨 TROUBLESHOOTING

### Sorun: "CORS Hatası"

**Çözüm:** Supabase'de RLS politikalarını kontrol et
```sql
-- SQL Editor'da çalıştır:
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
```

### Sorun: "Environment Variable Tanımsız"

**Çözüm:**
1. `.env` dosyasının var olduğunu kontrol et
2. Vercel environment variables'ları kontrol et
3. `npm run dev`'i yeniden başlat

### Sorun: "Webhook Çalışmıyor"

**Çözüm:**
1. API server'ın çalıştığından emin ol
2. URL'lerin doğru olduğunu kontrol et
3. Netgsm/Meta panelinde webhook durumunu kontrol et

---

## 🎯 SİSTEM ÖZELLİKLERİ

### Entegre Edilen Kanallar:

1. 📞 **Netgsm Sesli Robot**
   - Müşteriyi tanır
   - "Her zamanki" çalışır
   - 2 kez anlaşılamazsa operatöre devreder

2. 💬 **WhatsApp Bot**
   - Mesajla sipariş alır
   - Kayıtlı müşteriyi tanır
   - Operatör talebinde devreder

3. 🛒 **Web/Müşteri**
   - Manuel sipariş girişi
   - Ofis paneli üzerinden

---

## 📞 DESTEK

Sorun yaşarsanız:
1. **Logları kontrol et**: Browser Console + Server Terminal
2. **Supabase Logs**: Supabase dashboard > Logs
3. **Vercel Logs**: Vercel projeniz > Deployments > Logs

---

## ✅ KURULUM KONTROL LİSTESİ

- [ ] Supabase projesi oluşturuldu
- [ ] Migration SQL çalıştırıldı
- [ ] .env dosyası oluşturuldu
- [ ] Bağımlılıklar yüklendi (`npm install`)
- [ ] Yerel test yapıldı (`npm run dev`)
- [ ] Vercel'e deploy edildi
- [ ] Environment variables eklendi
- [ ] Netgsm webhook ayarlandı (opsiyonel)
- [ ] WhatsApp webhook ayarlandı (opsiyonel)
- [ ] Test çağrısı yapıldı

---

**İyi satışlar! 🚀💧**
