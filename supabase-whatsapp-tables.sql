-- =====================================================
-- SUPABASE SQL - WHATSAPP CHAT TABLOSU
-- =====================================================
-- Bu SQL kodunu Supabase SQL Editor'da çalıştırın

-- WhatsApp sohbet geçmişi tablosu
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

-- RLS politikaları
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;

-- Sadece auth edilen kullanıcılar okuyabilir
CREATE POLICY "Allow authenticated read whatsapp_chats" ON whatsapp_chats
  FOR SELECT TO authenticated
  USING (true);

-- Sadece admin kullanıcı ekleyebilir
CREATE POLICY "Allow admin insert whatsapp_chats" ON whatsapp_chats
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_whatsapp_chats_updated_at
    BEFORE UPDATE ON whatsapp_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- WHATSAPP FAILOVER LOGS TABLOSU
-- =====================================================

-- WhatsApp operatöre devir logları tablosu
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

-- RLS politikaları
ALTER TABLE whatsapp_failover_logs ENABLE ROW LEVEL SECURITY;

-- Sadece auth edilen kullanıcılar okuyabilir
CREATE POLICY "Allow authenticated read whatsapp_failover_logs" ON whatsapp_failover_logs
  FOR SELECT TO authenticated
  USING (true);

-- Sadece admin kullanıcı ekleyebilir
CREATE POLICY "Allow admin insert whatsapp_failover_logs" ON whatsapp_failover_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- =====================================================
-- FAYDALI GÖRÜNÜMLER (QUERIES)
-- =====================================================

-- Başarılı WhatsApp siparişleri
-- SELECT
--   phone_number,
--   customer_name,
--   order_data->>'urun' as product,
--   order_data->>'adet' as quantity,
--   order_data->>'adres' as address,
--   created_at
-- FROM whatsapp_chats
-- WHERE status = 'success'
--   AND order_data IS NOT NULL
-- ORDER BY created_at DESC
-- LIMIT 50;

-- WhatsApp failover istatistikleri (son 30 gün)
-- SELECT
--   reason_type,
--   stage,
--   COUNT(*) as count,
--   ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
-- FROM whatsapp_failover_logs
-- WHERE created_at > NOW() - INTERVAL '30 days'
-- GROUP BY reason_type, stage
-- ORDER BY count DESC;

-- En aktif WhatsApp kullanıcıları
-- SELECT
--   phone_number,
--   customer_name,
--   COUNT(*) as total_chats,
--   SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful_orders,
--   SUM(CASE WHEN status = 'failover' THEN 1 ELSE 0 END) as failed_orders
-- FROM whatsapp_chats
-- WHERE created_at > NOW() - INTERVAL '30 days'
-- GROUP BY phone_number, customer_name
-- ORDER BY total_chats DESC
-- LIMIT 10;
