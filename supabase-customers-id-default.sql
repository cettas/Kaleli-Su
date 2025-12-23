-- =====================================================
-- SUPABASE SQL - CUSTOMERS TABLOSU İÇİN OTOMATİK ID
-- =====================================================
-- Bu SQL kodunu Supabase SQL Editor'da çalıştırın

-- Adım 1: customers tablosu için ID fonksiyonu
CREATE OR REPLACE FUNCTION generate_customer_id() RETURNS TEXT AS $$
BEGIN
    RETURN 'cust_' || encode(gen_random_bytes(8), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Adım 2: Mevcut NULL kayıtları doldur
UPDATE customers SET id = generate_customer_id() WHERE id IS NULL;

-- Adım 3: Default value ekle
ALTER TABLE customers ALTER COLUMN id SET DEFAULT generate_customer_id();

-- =====================================================
-- SUPABASE SQL - ORDERS TABLOSU İÇİN OTOMATİK ID
-- =====================================================

-- Adım 4: orders tablosu için ID fonksiyonu
CREATE OR REPLACE FUNCTION generate_order_id() RETURNS TEXT AS $$
BEGIN
    RETURN 'ORD' || encode(gen_random_bytes(8), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Adım 5: Mevcut NULL kayıtları doldur
UPDATE orders SET id = generate_order_id() WHERE id IS NULL;

-- Adım 6: Default value ekle
ALTER TABLE orders ALTER COLUMN id SET DEFAULT generate_order_id();

-- Adım 7: Kontrol
SELECT
    'customers' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'customers' AND column_name = 'id'
UNION ALL
SELECT
    'orders' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'id';
