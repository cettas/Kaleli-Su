-- ============================================
-- Adım 1: Önce mevcut siparişleri yedekle
-- ============================================
CREATE TABLE IF NOT EXISTS orders_backup AS SELECT * FROM orders;

-- ============================================
-- Adım 2: Yeni id kolonu ekle (geçici)
-- ============================================
ALTER TABLE orders ADD COLUMN IF NOT EXISTS new_id TEXT;

-- ============================================
-- Adım 3: Yeni id'leri oluştur (varsa)
-- ============================================
-- Mevcut kayıtlar için benzersiz ID üret
-- Eğer new_id doluysa atla, boşsa doldur
UPDATE orders
SET new_id = 'ORD' || encode(gen_random_bytes(8), 'hex')
WHERE new_id IS NULL;

-- ============================================
-- Adım 4: Yeni id kolonunu NOT NULL yap
-- ============================================
ALTER TABLE orders ALTER COLUMN new_id SET NOT NULL;

-- ============================================
-- Adım 5: Eski id kolonunu sil
-- ============================================
ALTER TABLE orders DROP COLUMN IF EXISTS id;

-- ============================================
-- Adım 6: new_id kolonunu id olarak yeniden adlandır
-- ============================================
ALTER TABLE orders RENAME COLUMN new_id TO id;

-- ============================================
-- Adım 7: Primary key ekle
-- ============================================
ALTER TABLE orders ADD PRIMARY KEY (id);

-- ============================================
-- Adım 8: Default value ekle (yeni kayıtlar için otomatik ID)
-- ============================================
-- PostgreSQL'te TEXT için default UUID ekleyelim
-- Bu, yeni siparişler için otomatik benzersiz ID sağlar
CREATE OR REPLACE FUNCTION generate_order_id() RETURNS TEXT AS $$
BEGIN
    RETURN 'ORD' || encode(gen_random_bytes(8), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Not: Supabase insert sırasında ID'yi uygulama tarafından yöneteceğiz
-- Bu fonksiyon manuel işlemler için kullanılabilir
