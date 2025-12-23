-- =====================================================
// SU DAĞITIM SİSTEMİ - SUPABASE MIGRATION
// =====================================================
// Bu SQL'i Supabase SQL Editor'da çalıştırın

-- =====================================================
-- 1. INTEGRATIONS TABLOSU (GÜNCELLENMİŞ)
-- =====================================================

-- Integrations tablosu oluştur veya güncelle
CREATE TABLE IF NOT EXISTS integrations (
  id INTEGER PRIMARY KEY DEFAULT 1,

  -- Pazaryeri Entegrasyonları
  trendyol_api_key TEXT,
  trendyol_api_secret TEXT,
  trendyol_supplier_id TEXT,
  trendyol_enabled BOOLEAN DEFAULT false,
  getir_enabled BOOLEAN DEFAULT false,
  yemeksepeti_enabled BOOLEAN DEFAULT false,

  -- AI Telefon Robotu Ayarları
  ai_phone_enabled BOOLEAN DEFAULT false,
  ai_phone_provider TEXT,
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

-- RLS politikaları
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow authenticated read integrations" ON integrations
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow admin update integrations" ON integrations
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 2. CALL LOGS TABLOSU
-- =====================================================

CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id TEXT NOT NULL,
  customer_name TEXT,
  customer_found BOOLEAN NOT NULL DEFAULT false,
  transcript TEXT,
  order_data JSONB,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'incomplete')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_call_logs_caller_id ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);

-- RLS
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow authenticated read call_logs" ON call_logs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow admin insert call_logs" ON call_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow admin update call_logs" ON call_logs
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 3. CALL FAILOVER LOGS TABLOSU
-- =====================================================

CREATE TABLE IF NOT EXISTS call_failover_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT,
  caller_id TEXT NOT NULL,
  reason_type TEXT NOT NULL CHECK (reason_type IN ('anlaşılamadı', 'api_hata', 'müşteri_talebi', 'adres_alınamadı', 'ürün_bulunamadı')),
  stage TEXT NOT NULL CHECK (stage IN ('greeting', 'ordering', 'address', 'confirming')),
  message TEXT,
  transcript TEXT,
  customer_found BOOLEAN NOT NULL DEFAULT false,
  customer_name TEXT,
  order_data JSONB,
  transferred_to_extension TEXT DEFAULT '100',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_call_failover_logs_call_id ON call_failover_logs(call_id);
CREATE INDEX IF NOT EXISTS idx_call_failover_logs_caller_id ON call_failover_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_failover_logs_reason_type ON call_failover_logs(reason_type);
CREATE INDEX IF NOT EXISTS idx_call_failover_logs_created_at ON call_failover_logs(created_at DESC);

-- RLS
ALTER TABLE call_failover_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow authenticated read call_failover_logs" ON call_failover_logs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow admin insert call_failover_logs" ON call_failover_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 4. WHATSAPP CHATS TABLOSU
-- =====================================================

CREATE TABLE IF NOT EXISTS whatsapp_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  customer_name TEXT,
  customer_found BOOLEAN NOT NULL DEFAULT false,
  messages TEXT[] DEFAULT '{}',
  order_data JSONB,
  status TEXT NOT NULL CHECK (status IN ('success', 'failover', 'incomplete')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_phone_number ON whatsapp_chats(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_status ON whatsapp_chats(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_created_at ON whatsapp_chats(created_at DESC);

-- RLS
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow authenticated read whatsapp_chats" ON whatsapp_chats
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow admin insert whatsapp_chats" ON whatsapp_chats
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 5. WHATSAPP FAILOVER LOGS TABLOSU
-- =====================================================

CREATE TABLE IF NOT EXISTS whatsapp_failover_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  reason_type TEXT NOT NULL CHECK (reason_type IN ('anlaşılamadı', 'api_hata', 'müşteri_talebi', 'adres_alınamadı', 'ürün_bulunamadı')),
  stage TEXT NOT NULL CHECK (stage IN ('greeting', 'ordering', 'address', 'confirming')),
  message TEXT,
  messages TEXT[] DEFAULT '{}',
  customer_found BOOLEAN NOT NULL DEFAULT false,
  customer_name TEXT,
  order_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_whatsapp_failover_logs_phone_number ON whatsapp_failover_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_failover_logs_reason_type ON whatsapp_failover_logs(reason_type);
CREATE INDEX IF NOT EXISTS idx_whatsapp_failover_logs_created_at ON whatsapp_failover_logs(created_at DESC);

-- RLS
ALTER TABLE whatsapp_failover_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow authenticated read whatsapp_failover_logs" ON whatsapp_failover_logs
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow admin insert whatsapp_failover_logs" ON whatsapp_failover_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =====================================================
-- 6. TRIGGER FONKSİYONLARI
-- =====================================================

-- updated_at trigger fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at trigger'ları tablolara ekle
DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at
    BEFORE UPDATE ON integrations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_call_logs_updated_at ON call_logs;
CREATE TRIGGER update_call_logs_updated_at
    BEFORE UPDATE ON call_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_whatsapp_chats_updated_at ON whatsapp_chats;
CREATE TRIGGER update_whatsapp_chats_updated_at
    BEFORE UPDATE ON whatsapp_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. VARSAYILAN VERİLER (TEST İÇİN)
-- =====================================================

-- İlk entegrasyon kaydını güncelle (varsayılan değerlerle)
UPDATE integrations
SET
  whatsapp_verify_token = 'su_siparis_bot_2024',
  netgsm_operator_extension = '100'
WHERE id = 1;

-- =====================================================
-- 8. FAYDALI GÖRÜNÜMLER (QUERIES)
-- =====================================================

-- Aktif entegrasyonları görüntüle
-- SELECT
--   CASE WHEN trendyol_enabled THEN 1 ELSE 0 END AS trendyol,
--   CASE WHEN netgsm_enabled THEN 1 ELSE 0 END AS netgsm,
--   CASE WHEN whatsapp_enabled THEN 1 ELSE 0 END AS whatsapp
-- FROM integrations WHERE id = 1;

-- Bugünkü WhatsApp siparişleri
-- SELECT COUNT(*), COALESCE(SUM((order_data->>'adet')::int * 50), 0) AS tahmini_gelir
-- FROM whatsapp_chats
-- WHERE status = 'success'
--   AND DATE(created_at) = CURRENT_DATE;

-- Failover oranları
-- SELECT
--   reason_type,
--   COUNT(*) as count,
--   ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
-- FROM call_failover_logs
-- WHERE created_at > NOW() - INTERVAL '30 days'
-- GROUP BY reason_type
-- ORDER BY count DESC;

-- =====================================================
-- KURULUM TAMAMLANDI
-- =====================================================
