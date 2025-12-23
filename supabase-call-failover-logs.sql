-- =====================================================
-- SUPABASE SQL - CALL FAILOVER LOGS TABLOSU
-- =====================================================
-- Bu SQL kodunu Supabase SQL Editor'da çalıştırın

-- Failover Logları tablosu (operatöre devredilen çağrılar için)
CREATE TABLE IF NOT EXISTS call_failover_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL,
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

-- RLS politikaları
ALTER TABLE call_failover_logs ENABLE ROW LEVEL SECURITY;

-- Sadece auth edilen kullanıcılar okuyabilir
CREATE POLICY "Allow authenticated read call_failover_logs" ON call_failover_logs
  FOR SELECT TO authenticated
  USING (true);

-- Sadece admin kullanıcı ekleyebilir
CREATE POLICY "Allow admin insert call_failover_logs" ON call_failover_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Örnek veri (test için - opsiyonel)
-- INSERT INTO call_failover_logs (call_id, caller_id, reason_type, stage, message, transcript, customer_found)
-- VALUES
--   ('CALL-12345', '+905551234567', 'anlaşılamadı', 'ordering', '2 kez anlaşılamadı', 'Merhaba | su istiyorum | ne 各种', false);

-- =====================================================
-- FAYDALI GÖRÜNÜMLER (QUERIES)
-- =====================================================

-- Failover istatistikleri (son 30 gün)
-- SELECT
--   reason_type,
--   stage,
--   COUNT(*) as count,
--   COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
-- FROM call_failover_logs
-- WHERE created_at > NOW() - INTERVAL '30 days'
-- GROUP BY reason_type, stage
-- ORDER BY count DESC;

-- En çok failover yapan telefon numaraları
-- SELECT
--   caller_id,
--   COUNT(*) as failover_count,
--   string_agg(DISTINCT reason_type, ', ') as reasons
-- FROM call_failover_logs
-- WHERE created_at > NOW() - INTERVAL '30 days'
-- GROUP BY caller_id
-- ORDER BY failover_count DESC
-- LIMIT 10;
