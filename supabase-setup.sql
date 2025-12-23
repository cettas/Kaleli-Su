-- KALELİ SU - Sipariş Yönetim Sistemi
-- Supabase Tablo Oluşturma SQL Scripti

-- 1. USERS Tablosu (Kullanıcılar)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('Admin', 'Ofis Personeli', 'Kurye', 'Müşteri')),
  courier_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. CUSTOMERS Tablosu (Müşteriler)
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  phone TEXT NOT NULL,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  street TEXT NOT NULL,
  building_no TEXT NOT NULL,
  apartment_no TEXT NOT NULL,
  last_note TEXT,
  order_count INTEGER DEFAULT 0,
  last_order_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. COURIERS Tablosu (Kuryeler)
CREATE TABLE IF NOT EXISTS couriers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'busy', 'offline')),
  phone TEXT NOT NULL,
  full_inventory INTEGER DEFAULT 0,
  empty_inventory INTEGER DEFAULT 0,
  service_region TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. CATEGORIES Tablosu (Kategoriler)
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  icon TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. INVENTORY Tablosu (Stok/Envanter)
CREATE TABLE IF NOT EXISTS inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT NOT NULL,
  cost_price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  is_core BOOLEAN DEFAULT false,
  category TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. ORDERS Tablosu (Siparişler)
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  items JSONB NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  courier_id TEXT,
  courier_name TEXT,
  status TEXT NOT NULL CHECK (status IN ('Bekliyor', 'Yolda', 'Teslim Edildi', 'İptal')),
  source TEXT NOT NULL CHECK (source IN ('Web/Müşteri', 'Telefon', 'Getir', 'Trendyol', 'Yemeksepeti')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (courier_id) REFERENCES couriers(id) ON DELETE SET NULL
);

-- Varsayılan Kullanıcılar
INSERT INTO users (id, username, password, name, role, courier_id) VALUES
  ('admin1', 'admin', 'admin123', 'Sistem Yöneticisi', 'Admin', NULL),
  ('office1', 'ofis', 'ofis123', 'Ofis Personeli', 'Ofis Personeli', NULL),
  ('courier1', 'kurye', 'kurye123', 'Ahmet Yılmaz', 'Kurye', 'c1'),
  ('courier2', 'kurye2', 'kurye123', 'Mehmet Demir', 'Kurye', 'c2')
ON CONFLICT (username) DO NOTHING;

-- Varsayılan Kuryeler
INSERT INTO couriers (id, name, status, phone, full_inventory, empty_inventory, service_region) VALUES
  ('c1', 'Ahmet Yılmaz', 'active', '0555 111 22 33', 20, 0, 'Kordonboyu'),
  ('c2', 'Mehmet Demir', 'busy', '0555 222 33 44', 15, 5, 'Uğur Mumcu')
ON CONFLICT (id) DO NOTHING;

-- Varsayılan Kategoriler
INSERT INTO categories (id, label, icon) VALUES
  ('su', 'SU', 'droplet'),
  ('ekipman', 'EKİPMAN', 'faucet'),
  ('aksesuar', 'AKSESUAR', 'bottle-water'),
  ('diger', 'DİĞER', 'ellipsis-h')
ON CONFLICT (id) DO NOTHING;

-- Varsayılan Stok
INSERT INTO inventory (id, name, quantity, unit, cost_price, sale_price, is_core, category, is_active) VALUES
  ('core-full', '19L Dolu Damacana', 450, 'Adet', 45, 85, true, 'su', true),
  ('core-empty', '19L Boş Damacana', 120, 'Adet', 200, 0, true, 'su', true),
  ('core-pump', 'Yedek Pompalar', 35, 'Adet', 80, 150, true, 'ekipman', true),
  ('extra-1', '0.5L Koli Su', 80, 'Koli', 90, 130, false, 'su', true)
ON CONFLICT (id) DO NOTHING;

-- Varsayılan Müşteri
INSERT INTO customers (id, phone, name, district, neighborhood, street, building_no, apartment_no, last_note, order_count, last_order_date) VALUES
  ('cust1', '05001112233', 'Ayşe Kaya', 'KARTAL', 'KORDONBOYU', 'Güneş Sk.', '12', '4', 'Zil bozuk, kapıya bırakın.', 5, NOW())
ON CONFLICT (id) DO NOTHING;

-- Row Level Security (RLS) - Basit erişim kontrolü
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilir (demo için açık)
CREATE POLICY "Public read access" ON users FOR SELECT USING (true);
CREATE POLICY "Public read access" ON customers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON couriers FOR SELECT USING (true);
CREATE POLICY "Public read access" ON categories FOR SELECT USING (true);
CREATE POLICY "Public read access" ON inventory FOR SELECT USING (true);
CREATE POLICY "Public read access" ON orders FOR SELECT USING (true);

-- Herkes yazabilir (demo için açık)
CREATE POLICY "Public insert access" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON customers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON couriers FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Public insert access" ON orders FOR INSERT WITH CHECK (true);

-- Herkes güncelleyebilir (demo için açık)
CREATE POLICY "Public update access" ON users FOR UPDATE USING (true);
CREATE POLICY "Public update access" ON customers FOR UPDATE USING (true);
CREATE POLICY "Public update access" ON couriers FOR UPDATE USING (true);
CREATE POLICY "Public update access" ON categories FOR UPDATE USING (true);
CREATE POLICY "Public update access" ON inventory FOR UPDATE USING (true);
CREATE POLICY "Public update access" ON orders FOR UPDATE USING (true);

-- Herkes silebilir (demo için açık)
CREATE POLICY "Public delete access" ON users FOR DELETE USING (true);
CREATE POLICY "Public delete access" ON customers FOR DELETE USING (true);
CREATE POLICY "Public delete access" ON couriers FOR DELETE USING (true);
CREATE POLICY "Public delete access" ON categories FOR DELETE USING (true);
CREATE POLICY "Public delete access" ON inventory FOR DELETE USING (true);
CREATE POLICY "Public delete access" ON orders FOR DELETE USING (true);

-- Index'ler (performans için)
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_courier_id ON orders(courier_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
