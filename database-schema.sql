-- =====================================================
-- KALELİ SU - SUPABASE DATABASE SCHEMA
-- =====================================================
-- Bu script sadece EKSİK tabloları oluşturur
-- Mevcut tablolara dokunmaz

-- =====================================================
-- 1. EKSİK TABLOLARI OLUŞTUR
-- =====================================================

-- Customers tablosu
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
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

-- Orders tablosu
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  district TEXT,
  neighborhood TEXT,
  items JSONB DEFAULT '[]',
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Bekliyor',
  courier_id TEXT,
  courier_name TEXT,
  payment_method TEXT,
  payment_status TEXT DEFAULT 'pending',
  source TEXT DEFAULT 'Web',
  source_order_id TEXT,
  notes TEXT,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ
);

-- Inventory tablosu
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  sale_price NUMERIC DEFAULT 0,
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

-- Integrations tablosu
CREATE TABLE IF NOT EXISTS integrations (
  id INTEGER PRIMARY KEY DEFAULT 1,
  trendyol_api_key TEXT,
  trendyol_api_secret TEXT,
  trendyol_supplier_id TEXT,
  trendyol_enabled BOOLEAN DEFAULT false,
  getir_enabled BOOLEAN DEFAULT false,
  getir_api_key TEXT,
  yemeksepeti_enabled BOOLEAN DEFAULT false,
  yemeksepeti_api_key TEXT,
  ai_phone_enabled BOOLEAN DEFAULT false,
  ai_phone_provider TEXT DEFAULT 'gemini',
  ai_phone_api_key TEXT,
  ai_phone_number TEXT,
  netgsm_enabled BOOLEAN DEFAULT false,
  netgsm_api_key TEXT,
  netgsm_phone_number TEXT,
  netgsm_operator_extension TEXT DEFAULT '100',
  whatsapp_enabled BOOLEAN DEFAULT false,
  whatsapp_access_token TEXT,
  whatsapp_phone_number_id TEXT,
  whatsapp_verify_token TEXT DEFAULT 'su_siparis_bot_2024',
  whatsapp_operator_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO integrations (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- Çağrı logları
CREATE TABLE IF NOT EXISTS call_logs (
  id TEXT PRIMARY KEY,
  caller_id TEXT NOT NULL,
  customer_name TEXT,
  customer_found BOOLEAN DEFAULT false,
  transcript TEXT,
  order_data JSONB,
  status TEXT,
  error_message TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS call_failover_logs (
  id TEXT PRIMARY KEY,
  call_id TEXT,
  caller_id TEXT NOT NULL,
  reason_type TEXT,
  stage TEXT,
  message TEXT,
  transcript TEXT,
  customer_found BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp logları
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL,
  message TEXT NOT NULL,
  response TEXT,
  message_type TEXT DEFAULT 'text',
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_chats (
  id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL,
  customer_name TEXT,
  customer_found BOOLEAN DEFAULT false,
  messages JSONB DEFAULT '[]',
  order_data JSONB,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_failover_logs (
  id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL,
  reason_type TEXT,
  stage TEXT,
  message TEXT,
  messages JSONB DEFAULT '[]',
  customer_found BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. INDEX'LER
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_courier ON orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(category);
CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON call_logs(caller_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_phone ON whatsapp_logs(phone_number);

-- =====================================================
-- 3. RLS POLICIES (Tüm erişim açık)
-- =====================================================
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_failover_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_failover_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_all" ON customers;
CREATE POLICY "customers_all" ON customers FOR ALL USING (true);

DROP POLICY IF EXISTS "orders_all" ON orders;
CREATE POLICY "orders_all" ON orders FOR ALL USING (true);

DROP POLICY IF EXISTS "inventory_all" ON inventory;
CREATE POLICY "inventory_all" ON inventory FOR ALL USING (true);

DROP POLICY IF EXISTS "integrations_all" ON integrations;
CREATE POLICY "integrations_all" ON integrations FOR ALL USING (true);

DROP POLICY IF EXISTS "call_logs_all" ON call_logs;
CREATE POLICY "call_logs_all" ON call_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "whatsapp_logs_all" ON whatsapp_logs;
CREATE POLICY "whatsapp_logs_all" ON whatsapp_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "whatsapp_chats_all" ON whatsapp_chats;
CREATE POLICY "whatsapp_chats_all" ON whatsapp_chats FOR ALL USING (true);

DROP POLICY IF EXISTS "whatsapp_failover_logs_all" ON whatsapp_failover_logs;
CREATE POLICY "whatsapp_failover_logs_all" ON whatsapp_failover_logs FOR ALL USING (true);
