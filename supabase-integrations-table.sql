-- =====================================================
-- SUPABASE SQL - INTEGRATIONS TABLOSU
-- =====================================================
-- Bu SQL kodunu Supabase SQL Editor'da çalıştırın

-- Integrations tablosu oluştur
CREATE TABLE IF NOT EXISTS integrations (
  id INTEGER PRIMARY KEY DEFAULT 1,
  trendyol_api_key TEXT,
  trendyol_api_secret TEXT,
  trendyol_supplier_id TEXT,
  trendyol_enabled BOOLEAN DEFAULT false,
  getir_enabled BOOLEAN DEFAULT false,
  yemeksepeti_enabled BOOLEAN DEFAULT false,

  -- AI Telefon Robotu Ayarları
  ai_phone_enabled BOOLEAN DEFAULT false,
  ai_phone_provider TEXT, -- 'twilio', 'vonage', 'custom'
  ai_phone_api_key TEXT,
  ai_phone_number TEXT,
  ai_phone_webhook_url TEXT,
  ai_phone_system_prompt TEXT,
  ai_phone_voice_settings JSONB DEFAULT '{"language":"tr-TR","voice":"default","speed":1.0}'::jsonb,

  -- Netgsm Sesli Robot Ayarları
  netgsm_enabled BOOLEAN DEFAULT false,
  netgsm_api_key TEXT,
  netgsm_phone_number TEXT,
  netgsm_operator_extension TEXT DEFAULT '100',
  netgsm_webhook_url TEXT,

  -- WhatsApp Bot Ayarları
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_access_token TEXT,
  whatsapp_phone_number_id TEXT,
  whatsapp_verify_token TEXT DEFAULT 'su_siparis_bot_2024',
  whatsapp_operator_phone TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- İlk kaydı oluştur (eğer tablo boşsa)
INSERT INTO integrations (id)
SELECT 1
WHERE NOT EXISTS (SELECT 1 FROM integrations WHERE id = 1);

-- RLS politikaları (isteğe bağlı - şu an kapalı)
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Sadece auth edilen kullanıcılar okuyabilir
CREATE POLICY "Allow authenticated read" ON integrations
  FOR SELECT TO authenticated
  USING (true);

-- Sadece admin kullanıcı güncelleyebilir (opsiyonel)
CREATE POLICY "Allow admin update" ON integrations
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
