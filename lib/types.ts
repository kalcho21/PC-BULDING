export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon: string | null
  display_order: number
  created_at: string
  updated_at: string
}

export interface Brand {
  id: string
  name: string
  slug: string
  logo_url: string | null
  website: string | null
  created_at: string
}

export interface ComponentSpecs {
  // CPU specs
  cores?: number
  threads?: number
  base_clock?: number
  boost_clock?: number
  tdp?: number
  socket?: string
  cache?: string
  architecture?: string
  integrated_graphics?: string | null
  
  // GPU specs
  vram?: number
  vram_type?: string
  cuda_cores?: number
  stream_processors?: number
  ray_tracing_cores?: number
  tensor_cores?: number
  ray_accelerators?: number
  compute_units?: number
  bus_width?: number
  pcie?: string
  
  // RAM specs
  capacity?: number
  modules?: number
  speed?: number
  type?: string
  cas_latency?: number
  voltage?: number
  rgb?: boolean
  heat_spreader?: boolean
  
  // Motherboard specs
  chipset?: string
  form_factor?: string
  memory_slots?: number
  memory_type?: string
  max_memory?: number
  pcie_slots?: number
  m2_slots?: number
  usb_ports?: number
  wifi?: boolean
  bluetooth?: boolean
  
  // Storage specs
  interface?: string
  read_speed?: number
  write_speed?: number
  tbw?: number
  dram?: boolean
  rpm?: number
  
  // PSU specs
  wattage?: number
  efficiency?: string
  modular?: string
  fan_size?: number
  atx_version?: string
  pcie_connectors?: number
  sata_connectors?: number
  warranty_years?: number
  
  // Case specs
  motherboard_support?: string[]
  max_gpu_length?: number
  max_cpu_cooler_height?: number
  drive_bays_2_5?: number
  drive_bays_3_5?: number
  fan_slots?: number
  included_fans?: number
  radiator_support?: number
  side_panel?: string
  
  // Cooling specs
  radiator_size?: number
  fan_count?: number
  height?: number
  tdp_rating?: number
  socket_support?: string[]
  noise_level?: number
  rpm_max?: number
  lcd_display?: boolean
  pump_height?: number
}

export interface Component {
  id: string
  category_id: string
  brand_id: string
  name: string
  slug: string
  model: string | null
  description: string | null
  price: number
  image_url: string | null
  specs: ComponentSpecs
  in_stock: boolean
  rating: number
  review_count: number
  created_at: string
  updated_at: string
  category?: Category
  brand?: Brand
}

export interface Build {
  id: string
  user_id: string | null
  name: string
  description: string | null
  is_public: boolean
  total_price: number
  performance_score: number
  created_at: string
  updated_at: string
  items?: BuildItem[]
}

export interface BuildItem {
  id: string
  build_id: string
  component_id: string
  quantity: number
  created_at: string
  component?: Component
}

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface Favorite {
  id: string
  user_id: string
  component_id: string
  created_at: string
  component?: Component
}

export interface CompatibilityRule {
  id: string
  rule_type: string
  source_category: string
  target_category: string
  condition: Record<string, unknown>
  error_message: string
  severity: 'error' | 'warning'
  created_at: string
}

export interface CompatibilityIssue {
  type: 'error' | 'warning'
  message: string
  components: string[]
}

export interface BuildState {
  cpu: Component | null
  gpu: Component | null
  ram: Component | null
  motherboard: Component | null
  storage: Component[]
  psu: Component | null
  case: Component | null
  cooling: Component | null
}

export interface FilterState {
  category: string | null
  brands: string[]
  priceRange: [number, number]
  inStock: boolean
  search: string
  sortBy: 'price_asc' | 'price_desc' | 'rating' | 'name' | 'popular'
  specFilters?: Record<string, string[] | [number, number]>
}

export interface PerformanceMetrics {
  gaming: number
  productivity: number
  streaming: number
  rendering: number
  overall: number
}
