-- =====================================================
-- KALELİ SU - SUPABASE DATABASE SCHEMA
-- =====================================================
-- Tüm tabloların oluşturulması
-- Bu script'i Supabase SQL Editor'da çalıştırın

-- =====================================================
-- ÖNCELİKLE MEVCUT TABLOLARI KONTROL EDİNİZ
-- Eğer tablolar zaten varsa DROP yapmayın, veriler kaybolur!
-- =====================================================

-- =====================================================
-- MÜŞTERİLER TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  district TEXT,
  neighborhood TEXT,
  street TEXT,
  building_no TEXT,
  apartment_no TEXT,
  address TEXT,
  notes TEXT,
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  last_order_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÜRÜNLER / ENVANTER TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  cost_price NUMERIC DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  unit TEXT DEFAULT 'adet',
  barcode TEXT,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- KATEGORİLER TABLOSU
-- =====================================================
-- Eğer categories tablosu varsa yapısını kontrol et, yoksa oluştur
-- NOT: Mevcut tablo yapısını koruyarak ilerliyoruz

-- Önce mevcut tabloyu kontrol et
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'categories') THEN
    -- Tablo var, sütunları kontrol et ve eksikleri ekle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'id') THEN
      ALTER TABLE categories ADD COLUMN id TEXT PRIMARY KEY DEFAULT gen_random_uuid();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'name') THEN
      ALTER TABLE categories ADD COLUMN name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'icon') THEN
      ALTER TABLE categories ADD COLUMN icon TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'color') THEN
      ALTER TABLE categories ADD COLUMN color TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'display_order') THEN
      ALTER TABLE categories ADD COLUMN display_order INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema_columns WHERE table_name = 'categories' AND column_name = 'is_active') THEN
      ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'created_at') THEN
      ALTER TABLE categories ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
  ELSE
    -- Tablo yok, oluştur
    CREATE TABLE categories (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      icon TEXT,
      color TEXT,
      display_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Kategoriler varsa ekle, yoksa geç
DO $$
BEGIN
  -- Tablonun yapısını kontrol et ve veri ekle
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'name') THEN
    INSERT INTO categories (name, icon, color, display_order)
    VALUES
      ('19L', 'fa-droplet', '#3b82f6', 1),
      ('5L', 'fa-bottle-water', '#06b6d4', 2)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- =====================================================
-- KURYELER TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS couriers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'busy', 'off_duty')),
  vehicle_type TEXT,
  vehicle_plate TEXT,
  current_location TEXT,
  service_region TEXT[],
  total_orders INTEGER DEFAULT 0,
  total_deliveries INTEGER DEFAULT 0,
  rating NUMERIC DEFAULT 5,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SİPARİŞLER TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  district TEXT,
  neighborhood TEXT,

  -- Sipariş detayları
  items JSONB NOT NULL DEFAULT '[]',
  total_amount NUMERIC DEFAULT 0,

  -- Durum ve atama
  status TEXT DEFAULT 'Bekliyor' CHECK (status IN ('Bekliyor', 'Hazırlanıyor', 'Yolda', 'Teslim Edildi', 'İptal', 'Alınmadı')),
  courier_id TEXT REFERENCES couriers(id) ON DELETE SET NULL,
  courier_name TEXT,

  -- Ödeme
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'POS', 'NOT_COLLECTED')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'NOT_COLLECTED')),

  -- Kaynak
  source TEXT DEFAULT 'Web' CHECK (source IN ('Web', 'WhatsApp', 'Telefon', 'Trendyol', 'Getir', 'Yemeksepeti', 'Telefon-Robot')),
  source_order_id TEXT,

  -- Notlar
  notes TEXT,
  priority INTEGER DEFAULT 0,

  -- Zamanlar
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ
);

-- =====================================================
-- ENTEGRASYON AYARLARI TABLOSU
-- =====================================================
CREATE TABLE IF NOT EXISTS integrations (
  id INTEGER PRIMARY KEY DEFAULT 1,

  -- Trendyol
  trendyol_api_key TEXT,
  trendyol_api_secret TEXT,
  trendyol_supplier_id TEXT,
  trendyol_enabled BOOLEAN DEFAULT false,
  trendyol_last_sync TIMESTAMPTZ,

  -- Getir
  getir_enabled BOOLEAN DEFAULT false,
  getir_api_key TEXT,
  getir_store_id TEXT,

  -- Yemeksepeti
  yemeksepeti_enabled BOOLEAN DEFAULT false,
  yemeksepeti_api_key TEXT,

  -- AI Telefon Robotu
  ai_phone_enabled BOOLEAN DEFAULT false,
  ai_phone_provider TEXT DEFAULT 'gemini',
  ai_phone_api_key TEXT,
  ai_phone_number TEXT,
  ai_phone_webhook_url TEXT,
  ai_phone_system_prompt TEXT,

  -- Netgsm
  netgsm_enabled BOOLEAN DEFAULT false,
  netgsm_api_key TEXT,
  netgsm_phone_number TEXT,
  netgsm_operator_extension TEXT DEFAULT '100',
  netgsm_webhook_url TEXT,

  -- WhatsApp
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
-- ÇAĞRI LOGS (Sesli Robot)
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
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- ÇAĞRI FAILOVER LOGS
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
-- WHATSAPP LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT,
  message_type TEXT DEFAULT 'text',
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- WHATSAPP CHATS
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_chats (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  customer_name TEXT,
  customer_found BOOLEAN DEFAULT false,
  messages JSONB DEFAULT '[]',
  order_data JSONB,
  status TEXT CHECK (status IN ('success', 'failover')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- WHATSAPP FAILOVER LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS whatsapp_failover_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  reason_type TEXT,
  stage TEXT,
  message TEXT,
  messages JSONB DEFAULT '[]',
  customer_found BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEX'LER
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE INDEX IF NOT EXISTS idx_customers_created ON customers(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_courier ON orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);

CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_active ON inventory(is_active);

CREATE INDEX IF NOT EXISTS idx_couriers_status ON couriers(status);
CREATE INDEX IF NOT EXISTS idx_couriers_active ON couriers(is_active);

CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_status ON call_logs(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_phone ON whatsapp_logs(phone_number);

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_failover_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_failover_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_full_access" ON customers;
CREATE POLICY "customers_full_access" ON customers FOR ALL USING (true);

DROP POLICY IF EXISTS "inventory_full_access" ON inventory;
CREATE POLICY "inventory_full_access" ON inventory FOR ALL USING (true);

DROP POLICY IF EXISTS "couriers_full_access" ON couriers;
CREATE POLICY "couriers_full_access" ON couriers FOR ALL USING (true);

DROP POLICY IF EXISTS "orders_full_access" ON orders;
CREATE POLICY "orders_full_access" ON orders FOR ALL USING (true);

DROP POLICY IF EXISTS "integrations_full_access" ON integrations;
CREATE POLICY "integrations_full_access" ON integrations FOR ALL USING (true);

DROP POLICY IF EXISTS "call_logs_full_access" ON call_logs;
CREATE POLICY "call_logs_full_access" ON call_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "whatsapp_logs_full_access" ON whatsapp_logs;
CREATE POLICY "whatsapp_logs_full_access" ON whatsapp_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "whatsapp_chats_full_access" ON whatsapp_chats;
CREATE POLICY "whatsapp_chats_full_access" ON whatsapp_chats FOR ALL USING (true);

DROP POLICY IF EXISTS "whatsapp_failover_logs_full_access" ON whatsapp_failover_logs;
CREATE POLICY "whatsapp_failover_logs_full_access" ON whatsapp_failover_logs FOR ALL USING (true);

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

DROP TRIGGER IF EXISTS update_customers_updated_at ON customers;
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_updated_at ON inventory;
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_couriers_updated_at ON couriers;
CREATE TRIGGER update_couriers_updated_at BEFORE UPDATE ON couriers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ÖRNEK VERİ (SEED DATA)
-- =====================================================

INSERT INTO couriers (name, phone, status, vehicle_type, vehicle_plate) VALUES
  ('Ahmet Yılmaz', '+905551111111', 'active', 'Motosiklet', '34 ABC 123'),
  ('Mehmet Demir', '+905552222222', 'active', 'Motosiklet', '34 DEF 456'),
  ('Ali Veli', '+905553333333', 'inactive', 'Van', '34 GHI 789')
ON CONFLICT (phone) DO NOTHING;

INSERT INTO inventory (name, category, sale_price, cost_price, stock_quantity) VALUES
  ('19L Damacana', '19L', 40, 25, 100),
  ('5L Pet Su', '5L', 25, 15, 150),
  ('19L Damacana (Koli)', '19L', 400, 250, 20)
ON CONFLICT DO NOTHING;
