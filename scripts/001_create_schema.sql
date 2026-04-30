-- PC Builder Database Schema
-- This script creates all necessary tables for the PC Builder application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- LOOKUP TABLES
-- =====================

-- Categories table (CPU, GPU, RAM, etc.)
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Brands table
CREATE TABLE IF NOT EXISTS brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  logo_url TEXT,
  website VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- USER MANAGEMENT
-- =====================

-- User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255),
  full_name VARCHAR(255),
  avatar_url TEXT,
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- COMPONENTS TABLES
-- =====================

-- Main components table
CREATE TABLE IF NOT EXISTS components (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  model VARCHAR(255),
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  tdp INT, -- Thermal Design Power in watts
  benchmark_score INT, -- Performance score
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CPU Specifications
CREATE TABLE IF NOT EXISTS cpu_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_id UUID NOT NULL UNIQUE REFERENCES components(id) ON DELETE CASCADE,
  socket VARCHAR(50) NOT NULL, -- LGA1700, AM5, etc.
  cores INT NOT NULL,
  threads INT NOT NULL,
  base_clock DECIMAL(4,2), -- GHz
  boost_clock DECIMAL(4,2), -- GHz
  cache_l3 INT, -- MB
  integrated_graphics BOOLEAN DEFAULT FALSE,
  memory_type VARCHAR(20), -- DDR4, DDR5
  max_memory_speed INT, -- MHz
  architecture VARCHAR(100),
  manufacturing_process INT -- nm
);

-- Motherboard Specifications
CREATE TABLE IF NOT EXISTS motherboard_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_id UUID NOT NULL UNIQUE REFERENCES components(id) ON DELETE CASCADE,
  socket VARCHAR(50) NOT NULL,
  chipset VARCHAR(50) NOT NULL,
  form_factor VARCHAR(20) NOT NULL, -- ATX, Micro-ATX, Mini-ITX
  memory_type VARCHAR(20) NOT NULL, -- DDR4, DDR5
  memory_slots INT NOT NULL,
  max_memory INT, -- GB
  max_memory_speed INT, -- MHz
  pcie_x16_slots INT DEFAULT 1,
  pcie_x4_slots INT DEFAULT 0,
  pcie_x1_slots INT DEFAULT 0,
  m2_slots INT DEFAULT 1,
  sata_ports INT DEFAULT 4,
  usb_ports_total INT,
  wifi BOOLEAN DEFAULT FALSE,
  bluetooth BOOLEAN DEFAULT FALSE
);

-- GPU Specifications
CREATE TABLE IF NOT EXISTS gpu_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_id UUID NOT NULL UNIQUE REFERENCES components(id) ON DELETE CASCADE,
  chip VARCHAR(100), -- RTX 4090, RX 7900 XTX
  vram INT NOT NULL, -- GB
  vram_type VARCHAR(20), -- GDDR6X, GDDR6
  base_clock INT, -- MHz
  boost_clock INT, -- MHz
  cuda_cores INT, -- NVIDIA
  stream_processors INT, -- AMD
  memory_bus INT, -- bits
  length INT, -- mm - for case compatibility
  recommended_psu INT, -- watts
  pcie_power_connectors VARCHAR(50) -- e.g., "2x 8-pin"
);

-- RAM Specifications
CREATE TABLE IF NOT EXISTS ram_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_id UUID NOT NULL UNIQUE REFERENCES components(id) ON DELETE CASCADE,
  memory_type VARCHAR(20) NOT NULL, -- DDR4, DDR5
  capacity INT NOT NULL, -- GB per kit
  modules INT NOT NULL, -- Number of sticks
  speed INT NOT NULL, -- MHz
  latency VARCHAR(20), -- CL timing
  voltage DECIMAL(3,2),
  rgb BOOLEAN DEFAULT FALSE,
  heat_spreader BOOLEAN DEFAULT TRUE
);

-- PSU Specifications
CREATE TABLE IF NOT EXISTS psu_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_id UUID NOT NULL UNIQUE REFERENCES components(id) ON DELETE CASCADE,
  wattage INT NOT NULL,
  efficiency_rating VARCHAR(20), -- 80+ Bronze, Gold, Platinum, Titanium
  modular VARCHAR(20), -- Full, Semi, Non-modular
  form_factor VARCHAR(20) DEFAULT 'ATX', -- ATX, SFX
  fan_size INT, -- mm
  pcie_connectors INT,
  sata_connectors INT,
  eps_connectors INT
);

-- Storage Specifications (SSD/HDD)
CREATE TABLE IF NOT EXISTS storage_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_id UUID NOT NULL UNIQUE REFERENCES components(id) ON DELETE CASCADE,
  storage_type VARCHAR(20) NOT NULL, -- SSD, HDD, NVMe
  capacity INT NOT NULL, -- GB
  interface VARCHAR(30) NOT NULL, -- SATA, NVMe, M.2
  form_factor VARCHAR(20), -- 2.5", 3.5", M.2 2280
  read_speed INT, -- MB/s
  write_speed INT, -- MB/s
  cache INT, -- MB (for HDD)
  rpm INT, -- For HDD
  tbw INT, -- Terabytes Written (for SSD endurance)
  nand_type VARCHAR(20) -- TLC, QLC, MLC
);

-- Case Specifications
CREATE TABLE IF NOT EXISTS case_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_id UUID NOT NULL UNIQUE REFERENCES components(id) ON DELETE CASCADE,
  case_type VARCHAR(30) NOT NULL, -- Full Tower, Mid Tower, Mini Tower, SFF
  form_factors_supported TEXT[], -- ATX, Micro-ATX, Mini-ITX
  max_gpu_length INT, -- mm
  max_cooler_height INT, -- mm
  max_psu_length INT, -- mm
  drive_bays_35 INT DEFAULT 2,
  drive_bays_25 INT DEFAULT 2,
  expansion_slots INT DEFAULT 7,
  included_fans INT DEFAULT 1,
  max_fans INT DEFAULT 6,
  radiator_support TEXT[], -- e.g., ['240mm front', '360mm top']
  side_panel VARCHAR(30), -- Glass, Mesh, Solid
  dimensions_lwh VARCHAR(50) -- L x W x H in mm
);

-- CPU Cooler Specifications
CREATE TABLE IF NOT EXISTS cooler_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_id UUID NOT NULL UNIQUE REFERENCES components(id) ON DELETE CASCADE,
  cooler_type VARCHAR(30) NOT NULL, -- Air, AIO Liquid
  height INT, -- mm (for air coolers)
  radiator_size INT, -- mm (for AIO: 120, 240, 280, 360)
  fan_rpm_min INT,
  fan_rpm_max INT,
  noise_level DECIMAL(4,1), -- dBA
  sockets_supported TEXT[], -- LGA1700, AM5, etc.
  rgb BOOLEAN DEFAULT FALSE
);

-- Fan Specifications
CREATE TABLE IF NOT EXISTS fan_specs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_id UUID NOT NULL UNIQUE REFERENCES components(id) ON DELETE CASCADE,
  size INT NOT NULL, -- mm (120, 140)
  quantity INT DEFAULT 1,
  rpm_min INT,
  rpm_max INT,
  airflow DECIMAL(5,1), -- CFM
  static_pressure DECIMAL(4,2), -- mmH2O
  noise_level DECIMAL(4,1), -- dBA
  connector VARCHAR(20), -- 4-pin PWM, 3-pin
  rgb BOOLEAN DEFAULT FALSE
);

-- =====================
-- BUILDS TABLES
-- =====================

-- User Builds
CREATE TABLE IF NOT EXISTS builds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  intended_use VARCHAR(50), -- gaming, office, graphics, video, programming, balanced
  budget DECIMAL(10,2),
  total_price DECIMAL(10,2),
  estimated_wattage INT,
  performance_score INT,
  gaming_score INT,
  office_score INT,
  graphics_score INT,
  value_score INT,
  efficiency_score INT,
  is_public BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Build Items (components in a build)
CREATE TABLE IF NOT EXISTS build_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(build_id, component_id)
);

-- Compatibility Rules
CREATE TABLE IF NOT EXISTS compatibility_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_name VARCHAR(255) NOT NULL,
  description TEXT,
  source_category_id UUID REFERENCES categories(id),
  target_category_id UUID REFERENCES categories(id),
  rule_type VARCHAR(50) NOT NULL, -- socket_match, form_factor, clearance, power
  rule_config JSONB, -- Flexible rule configuration
  severity VARCHAR(20) DEFAULT 'error', -- error, warning, info
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Compatibility Logs (for build validation history)
CREATE TABLE IF NOT EXISTS compatibility_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  build_id UUID REFERENCES builds(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES compatibility_rules(id),
  status VARCHAR(20) NOT NULL, -- pass, warning, error
  message TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- ADDITIONAL FEATURES
-- =====================

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  build_id UUID REFERENCES builds(id) ON DELETE CASCADE,
  component_id UUID REFERENCES components(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_favorite_type CHECK (
    (build_id IS NOT NULL AND component_id IS NULL) OR
    (build_id IS NULL AND component_id IS NOT NULL)
  )
);

-- Saved Comparisons
CREATE TABLE IF NOT EXISTS saved_comparisons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title VARCHAR(255),
  build_ids UUID[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Price History
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  old_price DECIMAL(10,2),
  new_price DECIMAL(10,2) NOT NULL,
  changed_by UUID REFERENCES profiles(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- INDEXES
-- =====================

CREATE INDEX IF NOT EXISTS idx_components_category ON components(category_id);
CREATE INDEX IF NOT EXISTS idx_components_brand ON components(brand_id);
CREATE INDEX IF NOT EXISTS idx_components_price ON components(price);
CREATE INDEX IF NOT EXISTS idx_components_active ON components(is_active);
CREATE INDEX IF NOT EXISTS idx_components_slug ON components(slug);
CREATE INDEX IF NOT EXISTS idx_builds_user ON builds(user_id);
CREATE INDEX IF NOT EXISTS idx_builds_public ON builds(is_public);
CREATE INDEX IF NOT EXISTS idx_build_items_build ON build_items(build_id);
CREATE INDEX IF NOT EXISTS idx_build_items_component ON build_items(component_id);
CREATE INDEX IF NOT EXISTS idx_price_history_component ON price_history(component_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_comparisons ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Public read access for components, categories, brands (no auth required)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view brands" ON brands FOR SELECT USING (true);
CREATE POLICY "Anyone can view active components" ON components FOR SELECT USING (is_active = true);

-- Spec tables - public read
ALTER TABLE cpu_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE motherboard_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gpu_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ram_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE psu_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooler_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE fan_specs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view cpu_specs" ON cpu_specs FOR SELECT USING (true);
CREATE POLICY "Anyone can view motherboard_specs" ON motherboard_specs FOR SELECT USING (true);
CREATE POLICY "Anyone can view gpu_specs" ON gpu_specs FOR SELECT USING (true);
CREATE POLICY "Anyone can view ram_specs" ON ram_specs FOR SELECT USING (true);
CREATE POLICY "Anyone can view psu_specs" ON psu_specs FOR SELECT USING (true);
CREATE POLICY "Anyone can view storage_specs" ON storage_specs FOR SELECT USING (true);
CREATE POLICY "Anyone can view case_specs" ON case_specs FOR SELECT USING (true);
CREATE POLICY "Anyone can view cooler_specs" ON cooler_specs FOR SELECT USING (true);
CREATE POLICY "Anyone can view fan_specs" ON fan_specs FOR SELECT USING (true);

-- Builds policies
CREATE POLICY "Users can view their own builds" ON builds FOR SELECT USING (auth.uid() = user_id OR is_public = true);
CREATE POLICY "Users can insert their own builds" ON builds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own builds" ON builds FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own builds" ON builds FOR DELETE USING (auth.uid() = user_id);

-- Build items policies
CREATE POLICY "Users can view build items of their builds or public builds" ON build_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM builds WHERE builds.id = build_items.build_id AND (builds.user_id = auth.uid() OR builds.is_public = true)));
CREATE POLICY "Users can insert build items to their builds" ON build_items FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM builds WHERE builds.id = build_items.build_id AND builds.user_id = auth.uid()));
CREATE POLICY "Users can update build items of their builds" ON build_items FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM builds WHERE builds.id = build_items.build_id AND builds.user_id = auth.uid()));
CREATE POLICY "Users can delete build items from their builds" ON build_items FOR DELETE 
  USING (EXISTS (SELECT 1 FROM builds WHERE builds.id = build_items.build_id AND builds.user_id = auth.uid()));

-- Favorites policies
CREATE POLICY "Users can view their own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- Saved comparisons policies
CREATE POLICY "Users can view their own comparisons" ON saved_comparisons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own comparisons" ON saved_comparisons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comparisons" ON saved_comparisons FOR DELETE USING (auth.uid() = user_id);

-- Compatibility rules - public read
ALTER TABLE compatibility_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active rules" ON compatibility_rules FOR SELECT USING (is_active = true);

-- Price history - public read
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view price history" ON price_history FOR SELECT USING (true);

-- Compatibility logs - users can view logs for their builds
ALTER TABLE compatibility_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view logs for their builds" ON compatibility_logs FOR SELECT 
  USING (EXISTS (SELECT 1 FROM builds WHERE builds.id = compatibility_logs.build_id AND builds.user_id = auth.uid()));

-- =====================
-- TRIGGER FOR PROFILE CREATION
-- =====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'user')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- TRIGGER FOR PRICE HISTORY
-- =====================

CREATE OR REPLACE FUNCTION public.track_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    INSERT INTO price_history (component_id, old_price, new_price)
    VALUES (NEW.id, OLD.price, NEW.price);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_component_price_change ON components;
CREATE TRIGGER on_component_price_change
  AFTER UPDATE ON components
  FOR EACH ROW
  EXECUTE FUNCTION public.track_price_change();

-- =====================
-- UPDATED_AT TRIGGER
-- =====================

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles;
CREATE TRIGGER set_updated_at_profiles
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_components ON components;
CREATE TRIGGER set_updated_at_components
  BEFORE UPDATE ON components
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_builds ON builds;
CREATE TRIGGER set_updated_at_builds
  BEFORE UPDATE ON builds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
