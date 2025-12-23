-- =====================================================
-- SUPABASE SQL - CALL LOGS TABLOSU
-- =====================================================
-- Bu SQL kodunu Supabase SQL Editor'da çalıştırın

-- Çağrı Logları tablosu oluştur (AI telefon robotu çağrıları için)
CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  caller_id TEXT NOT NULL,
  customer_name TEXT,
  customer_found BOOLEAN NOT NULL DEFAULT false,
  transcript TEXT,
  order_data JSONB, -- {product, quantity, address, note}
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'incomplete')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_call_logs_caller_id ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_call_logs_created_at ON call_logs(created_at DESC);

-- RLS politikaları
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Sadece auth edilen kullanıcılar okuyabilir
CREATE POLICY "Allow authenticated read call_logs" ON call_logs
  FOR SELECT TO authenticated
  USING (true);

-- Sadece admin kullanıcı ekleyebilir/güncelleyebilir
CREATE POLICY "Allow admin insert call_logs" ON call_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow admin update call_logs" ON call_logs
  FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_call_logs_updated_at
    BEFORE UPDATE ON call_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Örnek veri (test için - opsiyonel)
-- INSERT INTO call_logs (caller_id, customer_name, customer_found, transcript, order_data, status)
-- VALUES
--   ('+905551234567', 'Ahmet Yılmaz', true, 'Müşteri 2 adet 19L su siparişi verdi', '{"product":"19L","quantity":2,"address":"Merkez Mah. Atatürk Cad. No:123 Daire:5"}', 'success');
