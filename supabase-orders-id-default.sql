-- =====================================================
-- SUPABASE SQL SCRIPT - AUTO ID DEFAULT FOR ORDERS
-- =====================================================
-- Bu SQL kodunu Supabase SQL Editor'da çalıştırın
-- Bu script orders tablosuna otomatik ID üretme özelliği ekler

-- Adım 1: ID üretme fonksiyonu oluştur
CREATE OR REPLACE FUNCTION generate_order_id() RETURNS TEXT AS $$
BEGIN
    RETURN 'ORD' || encode(gen_random_bytes(8), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Adım 2: Mevcut id kolonu NULL olamazsa, önce mevcut NULL kayıtları doldur
UPDATE orders SET id = generate_order_id() WHERE id IS NULL;

-- Adım 3: Default value ekle (yeni kayıtlar için otomatik ID)
ALTER TABLE orders ALTER COLUMN id SET DEFAULT generate_order_id();

-- Adım 4: Kontrol - Default değer eklendi mi
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'id';
