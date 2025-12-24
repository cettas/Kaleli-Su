-- =====================================================
-- KALELİ SU - SUPABASE MIGRATIONS
-- =====================================================
-- Bu script'i Supabase SQL Editor'da çalıştırın

-- =====================================================
-- INTEGRATIONS TABLOSU (Entegrasyon ayarları)
-- =====================================================
CREATE TABLE IF NOT EXISTS integrations (
  id INTEGER PRIMARY KEY DEFAULT 1,

  -- Trendyol Ayarları
  trendyol_api_key TEXT,
  trendyol_api_secret TEXT,
  trendyol_supplier_id TEXT,
  trendyol_enabled BOOLEAN DEFAULT false,

  -- Getir Ayarları
  getir_enabled BOOLEAN DEFAULT false,

  -- Yemeksepeti Ayarları
  yemeksepeti_enabled BOOLEAN DEFAULT false,

  -- AI Telefon Robotu Ayarları
  ai_phone_enabled BOOLEAN DEFAULT false,
  ai_phone_provider TEXT DEFAULT 'twilio',
  ai_phone_api_key TEXT,
  ai_phone_number TEXT,
  ai_phone_webhook_url TEXT,
  ai_phone_system_prompt TEXT,

  -- Netgsm Ayarları
  netgsm_enabled BOOLEAN DEFAULT false,
  netgsm_api_key TEXT,
  netgsm_phone_number TEXT,
  netgsm_operator_extension TEXT DEFAULT '100',
  netgsm_webhook_url TEXT,

  -- WhatsApp Ayarları
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_access_token TEXT,
  whatsapp_phone_number_id TEXT,
  whatsapp_verify_token TEXT DEFAULT 'su_siparis_bot_2024',
  whatsapp_operator_phone TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Varsayılan kaydı ekle
INSERT INTO integrations (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- CALL_LOGS TABLOSU (Çağrı logları)
-- =====================================================
CREATE TABLE IF NOT EXISTS call_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id TEXT NOT NULL,
  customer_name TEXT,
  customer_found BOOLEAN DEFAULT false,
  transcript TEXT,
  order_data JSONB,
  status TEXT CHECK (status IN ('success', 'failed', 'pending')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CALL_FAILOVER_LOGS TABLOSU (Çağrı devir logları)
-- =====================================================
CREATE TABLE IF NOT EXISTS call_failover_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT,
  caller_id TEXT NOT NULL,
  reason_type TEXT,
  stage TEXT,
  message TEXT,
  transcript TEXT,
  customer_found BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- WHATSAPP_CHATS TABLOSU (WhatsApp sohbet logları)
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_chats (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  customer_name TEXT,
  customer_found BOOLEAN DEFAULT false,
  messages TEXT[] DEFAULT '{}',
  order_data JSONB,
  status TEXT CHECK (status IN ('success', 'failover')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- WHATSAPP_FAILOVER_LOGS TABLOSU (WhatsApp devir logları)
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_failover_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  reason_type TEXT,
  stage TEXT,
  message TEXT,
  messages TEXT[] DEFAULT '{}',
  customer_found BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- WHATSAPP_LOGS TABLOSU (WhatsApp mesaj logları)
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEX'LER
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_created ON call_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_phone ON whatsapp_chats(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_chats_created ON whatsapp_chats(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_phone ON whatsapp_logs(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_created ON whatsapp_logs(created_at DESC);

-- =====================================================
-- RLS (Row Level Security) - Dev ortamı için kapalı
-- =====================================================
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_failover_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_failover_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Tüm izinleri ver (dev ortamı için)
DROP POLICY IF EXISTS "integrations_full_access" ON integrations;
CREATE POLICY "integrations_full_access" ON integrations
  FOR ALL USING (true);

DROP POLICY IF EXISTS "call_logs_full_access" ON call_logs;
CREATE POLICY "call_logs_full_access" ON call_logs
  FOR ALL USING (true);

DROP POLICY IF EXISTS "call_failover_logs_full_access" ON call_failover_logs;
CREATE POLICY "call_failover_logs_full_access" ON call_failover_logs
  FOR ALL USING (true);

DROP POLICY IF EXISTS "whatsapp_chats_full_access" ON whatsapp_chats;
CREATE POLICY "whatsapp_chats_full_access" ON whatsapp_chats
  FOR ALL USING (true);

DROP POLICY IF EXISTS "whatsapp_failover_logs_full_access" ON whatsapp_failover_logs;
CREATE POLICY "whatsapp_failover_logs_full_access" ON whatsapp_failover_logs
  FOR ALL USING (true);

DROP POLICY IF EXISTS "whatsapp_logs_full_access" ON whatsapp_logs;
CREATE POLICY "whatsapp_logs_full_access" ON whatsapp_logs
  FOR ALL USING (true);

-- =====================================================
-- UPDATED_AT TRIGGER'I
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_logs_updated_at
  BEFORE UPDATE ON call_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
