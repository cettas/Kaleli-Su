-- =====================================================
-- SUPABASE SQL SCRIPT - ADD PAYMENT METHOD COLUMN
-- =====================================================
-- Bu SQL kodunu Supabase SQL Editor'da çalıştırın
-- Bu script orders tablosuna payment_method kolonu ekler

-- Adım 1: payment_method kolonunu ekle
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;

-- Adım 2: Opsiyonel - Mevcut kayıtlar için varsayılan değer (isteğe bağlı)
-- UPDATE orders SET payment_method = NULL WHERE payment_method IS NULL;

-- Adım 3: Kontrol - Kolon eklendi mi
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'payment_method';
