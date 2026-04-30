'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/components/cart-provider'
import { Category, Brand, Component, FilterState } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { toast } from 'sonner'
import {
  SlidersHorizontal,
  Grid3X3,
  List,
  Star,
  Cpu,
  Monitor,
  MemoryStick,
  CircuitBoard,
  HardDrive,
  Zap,
  Box,
  Fan,
  Search,
  ChevronDown,
  ArrowLeft,
  Heart,
  Plus,
  ShoppingCart,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const categoryIcons: Record<string, React.ElementType> = {
  cpu: Cpu,
  gpu: Monitor,
  ram: MemoryStick,
  motherboard: CircuitBoard,
  storage: HardDrive,
  psu: Zap,
  case: Box,
  cooling: Fan,
}

const categoryLabels: Record<string, string> = {
  cpu: 'Процесори',
  gpu: 'Видеокарти',
  ram: 'RAM Памет',
  motherboard: 'Дънни платки',
  storage: 'Съхранение',
  psu: 'Захранвания',
  case: 'Кутии',
  cooling: 'Охлаждане',
}

// Category-specific advanced filters
const categorySpecificFilters: Record<string, { key: string; label: string; type: 'checkbox' | 'range'; options?: string[]; specKey: string }[]> = {
  cpu: [
    { 
      key: 'series', 
      label: 'Серия', 
      type: 'checkbox', 
      options: ['AMD Ryzen 3', 'AMD Ryzen 5', 'AMD Ryzen 7', 'AMD Ryzen 9', 'AMD Ryzen Threadripper', 'Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'Intel Core Ultra 5', 'Intel Core Ultra 7', 'Intel Core Ultra 9'],
      specKey: 'series'
    },
    { 
      key: 'generation', 
      label: 'Генерация', 
      type: 'checkbox', 
      options: ['AMD 5th Gen', 'AMD 7th Gen', 'AMD 9th Gen', 'Intel 12th Gen', 'Intel 13th Gen', 'Intel 14th Gen', 'Intel Arrow Lake'],
      specKey: 'generation'
    },
    { 
      key: 'socket', 
      label: 'Сокет', 
      type: 'checkbox', 
      options: ['AM4', 'AM5', 'LGA1200', 'LGA1700', 'LGA1851'],
      specKey: 'socket'
    },
    { 
      key: 'cores', 
      label: 'Ядра', 
      type: 'checkbox', 
      options: ['4', '6', '8', '12', '16', '24'],
      specKey: 'cores'
    },
    { 
      key: 'tdp', 
      label: 'TDP', 
      type: 'checkbox', 
      options: ['65W', '105W', '125W', '170W'],
      specKey: 'tdp'
    },
  ],
  gpu: [
    { 
      key: 'series', 
      label: 'Серия', 
      type: 'checkbox', 
      options: ['RTX 50 Series', 'RTX 40 Series', 'RTX 30 Series', 'GTX 16 Series', 'RX 9000 Series', 'RX 7000 Series', 'RX 6000 Series'],
      specKey: 'series'
    },
    { 
      key: 'chipset_maker', 
      label: 'Производител чип', 
      type: 'checkbox', 
      options: ['NVIDIA', 'AMD', 'Intel'],
      specKey: 'chipset_maker'
    },
    { 
      key: 'vram', 
      label: 'VRAM', 
      type: 'checkbox', 
      options: ['6', '8', '12', '16', '24', '32'],
      specKey: 'vram'
    },
    { 
      key: 'vram_type', 
      label: 'Тип VRAM', 
      type: 'checkbox', 
      options: ['GDDR6', 'GDDR6X', 'GDDR7'],
      specKey: 'vram_type'
    },
    { 
      key: 'tdp', 
      label: 'TDP', 
      type: 'checkbox', 
      options: ['115W', '150W', '200W', '250W', '300W', '350W', '450W'],
      specKey: 'tdp'
    },
  ],
  ram: [
    { 
      key: 'type', 
      label: 'Тип', 
      type: 'checkbox', 
      options: ['DDR3', 'DDR3L', 'DDR4', 'DDR5'],
      specKey: 'type'
    },
    { 
      key: 'capacity', 
      label: 'Капацитет', 
      type: 'checkbox', 
      options: ['8', '16', '32', '64', '128'],
      specKey: 'capacity'
    },
    { 
      key: 'speed', 
      label: 'Честота (MHz)', 
      type: 'checkbox', 
      options: ['2666', '3200', '3600', '4800', '5600', '6000', '6400', '7200', '8000'],
      specKey: 'speed'
    },
    { 
      key: 'cas_latency', 
      label: 'Тайминг (CL)', 
      type: 'checkbox', 
      options: ['14', '16', '18', '30', '32', '36', '40'],
      specKey: 'cas_latency'
    },
    { 
      key: 'modules', 
      label: 'Модули', 
      type: 'checkbox', 
      options: ['1x8GB', '2x8GB', '2x16GB', '2x32GB', '4x16GB', '4x32GB'],
      specKey: 'modules'
    },
    { 
      key: 'heatsink', 
      label: 'Радиатор', 
      type: 'checkbox', 
      options: ['Да', 'Не'],
      specKey: 'heatsink'
    },
  ],
  motherboard: [
    { 
      key: 'socket', 
      label: 'Сокет', 
      type: 'checkbox', 
      options: ['AM4', 'AM5', 'LGA1200', 'LGA1700', 'LGA1851'],
      specKey: 'socket'
    },
    { 
      key: 'chipset', 
      label: 'Чипсет', 
      type: 'checkbox', 
      options: ['X870E', 'X870', 'X670E', 'X670', 'B650', 'A620', 'Z890', 'Z790', 'B760', 'H770', 'Z690', 'B660', 'X570', 'B550', 'A520'],
      specKey: 'chipset'
    },
    { 
      key: 'form_factor', 
      label: 'Форм фактор', 
      type: 'checkbox', 
      options: ['E-ATX', 'ATX', 'Micro-ATX', 'Mini-ITX'],
      specKey: 'form_factor'
    },
    { 
      key: 'memory_type', 
      label: 'Тип памет', 
      type: 'checkbox', 
      options: ['DDR4', 'DDR5'],
      specKey: 'memory_type'
    },
    { 
      key: 'wifi', 
      label: 'WiFi', 
      type: 'checkbox', 
      options: ['Да', 'Не'],
      specKey: 'wifi'
    },
  ],
  storage: [
    { 
      key: 'type', 
      label: 'Тип', 
      type: 'checkbox', 
      options: ['NVMe SSD', 'SATA SSD', 'HDD'],
      specKey: 'type'
    },
    { 
      key: 'capacity', 
      label: 'Капацитет', 
      type: 'checkbox', 
      options: ['256', '500', '1000', '2000', '4000', '8000'],
      specKey: 'capacity'
    },
    { 
      key: 'interface', 
      label: 'Интерфейс', 
      type: 'checkbox', 
      options: ['PCIe 5.0', 'PCIe 4.0', 'PCIe 3.0', 'SATA III'],
      specKey: 'interface'
    },
    { 
      key: 'form_factor', 
      label: 'Форм фактор', 
      type: 'checkbox', 
      options: ['M.2 2280', 'M.2 2230', '2.5"', '3.5"'],
      specKey: 'form_factor'
    },
  ],
  psu: [
    { 
      key: 'wattage', 
      label: 'Мощност', 
      type: 'checkbox', 
      options: ['450', '550', '650', '750', '850', '1000', '1200', '1600'],
      specKey: 'wattage'
    },
    { 
      key: 'efficiency', 
      label: 'Ефективност', 
      type: 'checkbox', 
      options: ['80+', '80+ Bronze', '80+ Silver', '80+ Gold', '80+ Platinum', '80+ Titanium'],
      specKey: 'efficiency'
    },
    { 
      key: 'modular', 
      label: 'Модулност', 
      type: 'checkbox', 
      options: ['Non-Modular', 'Semi-Modular', 'Fully Modular'],
      specKey: 'modular'
    },
    { 
      key: 'form_factor', 
      label: 'Форм фактор', 
      type: 'checkbox', 
      options: ['ATX', 'SFX', 'SFX-L'],
      specKey: 'form_factor'
    },
  ],
  case: [
    { 
      key: 'form_factor', 
      label: 'Размер', 
      type: 'checkbox', 
      options: ['Full-Tower', 'Mid-Tower', 'Mini-Tower', 'Mini-ITX'],
      specKey: 'form_factor'
    },
    { 
      key: 'side_panel', 
      label: 'Страничен панел', 
      type: 'checkbox', 
      options: ['Tempered Glass', 'Acrylic', 'Steel', 'Mesh'],
      specKey: 'side_panel'
    },
    { 
      key: 'color', 
      label: 'Цвят', 
      type: 'checkbox', 
      options: ['Черен', 'Бял', 'Сив'],
      specKey: 'color'
    },
    { 
      key: 'rgb', 
      label: 'RGB осветление', 
      type: 'checkbox', 
      options: ['Да', 'Не'],
      specKey: 'rgb'
    },
  ],
  cooling: [
    { 
      key: 'type', 
      label: 'Тип', 
      type: 'checkbox', 
      options: ['Air Cooler', 'AIO Liquid Cooler', 'Custom Loop'],
      specKey: 'type'
    },
    { 
      key: 'radiator_size', 
      label: 'Радиатор', 
      type: 'checkbox', 
      options: ['120mm', '240mm', '280mm', '360mm', '420mm'],
      specKey: 'radiator_size'
    },
    { 
      key: 'tdp_rating', 
      label: 'TDP рейтинг', 
      type: 'checkbox', 
      options: ['150W', '200W', '250W', '300W', '350W'],
      specKey: 'tdp_rating'
    },
    { 
      key: 'rgb', 
      label: 'RGB осветление', 
      type: 'checkbox', 
      options: ['Да', 'Не'],
      specKey: 'rgb'
    },
  ],
}

interface CatalogPageProps {
  categories: Category[]
  brands: Brand[]
  components: Component[]
}

export function CatalogPage({ categories, brands, components }: CatalogPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { addToCart, totalItems, getQuantity } = useCart()
  const initialCategory = searchParams.get('category')
  
  const [filters, setFilters] = useState({
    category: initialCategory,
    brands: [] as string[],
    priceRange: [0, 10000] as [number, number],
    inStock: false,
    search: '',
    sortBy: 'price_asc' as 'price_asc' | 'price_desc' | 'rating' | 'name',
    specFilters: {} as Record<string, string[]>,
  })
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const favoritesRef = useRef<Set<string>>(new Set())
  favoritesRef.current = favorites
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)
  const [expandedFilters, setExpandedFilters] = useState<Record<string, boolean>>({
    category: true,
    brand: true,
    price: true,
    specs: true,
  })

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    async function loadFavoriteIds() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setFavorites(new Set())
        return
      }
      const { data } = await supabase
        .from('favorites')
        .select('component_id')
        .eq('user_id', user.id)
      if (cancelled) return
      setFavorites(new Set((data ?? []).map((r) => r.component_id).filter(Boolean)))
    }
    loadFavoriteIds()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadFavoriteIds()
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  // Get price range for current filter
  const [minPrice, maxPrice] = useMemo(() => {
    const filtered = filters.category 
      ? components.filter(c => c.category?.slug === filters.category)
      : components
    if (filtered.length === 0) return [0, 10000]
    const prices = filtered.map(c => c.price)
    return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))]
  }, [components, filters.category])

  // Get brands for current category
  const categoryBrands = useMemo(() => {
    const filtered = filters.category 
      ? components.filter(c => c.category?.slug === filters.category)
      : components
    const brandIds = new Set(filtered.map(c => c.brand?.id).filter(Boolean))
    return brands.filter(b => brandIds.has(b.id))
  }, [components, brands, filters.category])

  // Get current category filters
  const currentCategoryFilters = useMemo(() => {
    if (!filters.category) return []
    return categorySpecificFilters[filters.category] || []
  }, [filters.category])

  const filteredComponents = useMemo(() => {
    let result = [...components]

    if (filters.category) {
      result = result.filter((c) => c.category?.slug === filters.category)
    }

    if (filters.brands.length > 0) {
      result = result.filter((c) => filters.brands.includes(c.brand?.slug || ''))
    }

    result = result.filter(
      (c) => c.price >= filters.priceRange[0] && c.price <= filters.priceRange[1]
    )

    if (filters.inStock) {
      result = result.filter((c) => c.in_stock)
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.brand?.name.toLowerCase().includes(searchLower) ||
          c.model?.toLowerCase().includes(searchLower)
      )
    }

    // Apply spec filters
    Object.entries(filters.specFilters).forEach(([key, values]) => {
      if (values.length > 0) {
        result = result.filter(c => {
          const specValue = String(c.specs?.[key] || '')
          const componentName = c.name.toLowerCase()
          
          // Check if any filter value matches
          return values.some(v => {
            const vLower = v.toLowerCase()
            
            // Handle numeric comparisons (like cores, tdp)
            if (!isNaN(Number(v))) {
              // For TDP, strip 'W' suffix
              const cleanV = v.replace('W', '')
              const cleanSpec = String(specValue).replace('W', '')
              if (!isNaN(Number(cleanV)) && !isNaN(Number(cleanSpec))) {
                return Number(cleanSpec) === Number(cleanV)
              }
            }
            
            // Handle boolean values (Да/Не)
            if (v === 'Да') return specValue === 'true' || specValue === 'Да' || specValue === 'yes'
            if (v === 'Не') return specValue === 'false' || specValue === 'Не' || specValue === 'no' || !specValue
            
            // Check specs field first (exact or partial match)
            if (specValue && specValue.toLowerCase().includes(vLower)) {
              return true
            }
            if (specValue && specValue === v) {
              return true
            }
            
            // Fallback: check component name for series/generation matches
            // This helps when specs field doesn't exist
            if (key === 'series' || key === 'generation') {
              // Extract keywords from filter value
              const keywords = vLower.split(' ').filter(k => k.length > 2)
              return keywords.every(keyword => componentName.includes(keyword))
            }
            
            return false
          })
        })
      }
    })

    switch (filters.sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price)
        break
      case 'price_desc':
        result.sort((a, b) => b.price - a.price)
        break
      case 'rating':
        result.sort((a, b) => b.rating - a.rating)
        break
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    return result
  }, [components, filters])

  const handleToggleFavorite = useCallback(
    async (component: Component) => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Влезте в акаунта, за да запазвате любими.', {
          action: {
            label: 'Вход',
            onClick: () => router.push('/auth/login'),
          },
        })
        return
      }

      const wasFavorite = favoritesRef.current.has(component.id)

      if (wasFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('component_id', component.id)
        if (error) {
          toast.error('Неуспешно премахване от любими.')
          return
        }
        setFavorites((prev) => {
          const next = new Set(prev)
          next.delete(component.id)
          return next
        })
        toast.info(`${component.name} е премахнат от любими`)
        return
      }

      const { error } = await supabase.from('favorites').insert({
        user_id: user.id,
        component_id: component.id,
      })
      if (error) {
        if (error.code === '23505') {
          setFavorites((prev) => new Set(prev).add(component.id))
          toast.success(`${component.name} вече е в любими`)
        } else {
          toast.error(error.message || 'Неуспешно добавяне в любими.')
        }
        return
      }
      setFavorites((prev) => new Set(prev).add(component.id))
      toast.success(`${component.name} е добавен в любими`)
    },
    [router]
  )

  const handleClearFilters = useCallback(() => {
    setFilters({
      category: null,
      brands: [],
      priceRange: [minPrice, maxPrice],
      inStock: false,
      search: '',
      sortBy: 'price_asc',
      specFilters: {},
    })
  }, [minPrice, maxPrice])

  const toggleBrand = (brandSlug: string) => {
    setFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brandSlug)
        ? prev.brands.filter(b => b !== brandSlug)
        : [...prev.brands, brandSlug]
    }))
  }

  const toggleSpecFilter = (key: string, value: string) => {
    setFilters(prev => {
      const current = prev.specFilters[key] || []
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return {
        ...prev,
        specFilters: { ...prev.specFilters, [key]: updated }
      }
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  const getSpecsList = (component: Component) => {
    const specs = component.specs || {}
    const categorySlug = component.category?.slug

    switch (categorySlug) {
      case 'cpu':
        return [
          { label: 'Ядра', value: specs.cores },
          { label: 'Boost', value: specs.boost_clock ? `${specs.boost_clock} GHz` : null },
          { label: 'TDP', value: specs.tdp ? `${specs.tdp}W` : null },
          { label: 'Сокет', value: specs.socket },
        ]
      case 'gpu':
        return [
          { label: 'VRAM', value: specs.vram && specs.vram_type ? `${specs.vram}GB ${specs.vram_type}` : specs.vram ? `${specs.vram}GB` : null },
          { label: 'Boost', value: specs.boost_clock ? `${specs.boost_clock} MHz` : null },
          { label: 'TDP', value: specs.tdp ? `${specs.tdp}W` : null },
        ]
      case 'ram':
        return [
          { label: 'Капацитет', value: specs.capacity ? `${specs.capacity}GB` : null },
          { label: 'Чест��та', value: specs.speed ? `${specs.speed} MHz` : null },
          { label: 'Тип', value: specs.type },
          { label: 'CL', value: specs.cas_latency ? `CL${specs.cas_latency}` : null },
        ]
      case 'motherboard':
        return [
          { label: 'Сокет', value: specs.socket },
          { label: 'Чипсет', value: specs.chipset },
          { label: 'Форма', value: specs.form_factor },
          { label: 'Памет', value: specs.memory_type },
        ]
      case 'storage':
        return [
          { label: 'Капацитет', value: specs.capacity ? (specs.capacity >= 1000 ? `${specs.capacity / 1000}TB` : `${specs.capacity}GB`) : null },
          { label: 'Тип', value: specs.type },
          { label: 'Четене', value: specs.read_speed ? `${specs.read_speed} MB/s` : null },
        ]
      case 'psu':
        return [
          { label: 'Мощност', value: specs.wattage ? `${specs.wattage}W` : null },
          { label: 'Ефективност', value: specs.efficiency },
          { label: 'Модулност', value: specs.modular },
        ]
      case 'case':
        return [
          { label: 'Размер', value: specs.form_factor },
          { label: 'Макс GPU', value: specs.max_gpu_length ? `${specs.max_gpu_length}mm` : null },
          { label: 'Радиатор', value: specs.radiator_support ? `${specs.radiator_support}mm` : null },
        ]
      case 'cooling':
        return [
          { label: 'Тип', value: specs.type },
          { label: 'TDP', value: specs.tdp_rating ? `${specs.tdp_rating}W` : null },
        ]
      default:
        return []
    }
  }

  // Filter sidebar content
  const FilterContent = () => (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Филтри</h3>
        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
          Изчисти
        </Button>
      </div>

      {/* In Stock */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="inStock"
          checked={filters.inStock}
          onCheckedChange={(checked) => setFilters(prev => ({ ...prev, inStock: !!checked }))}
        />
        <Label htmlFor="inStock" className="text-sm cursor-pointer">
          Само налични
        </Label>
      </div>

      <Separator />

      {/* Categories */}
      <Collapsible
        open={expandedFilters.category}
        onOpenChange={(open) => setExpandedFilters(prev => ({ ...prev, category: open }))}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
          <span className="text-sm font-medium">Категория</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", expandedFilters.category && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pt-2">
          <button
            onClick={() => setFilters(prev => ({ ...prev, category: null, specFilters: {} }))}
            className={cn(
              "w-full text-left px-2 py-1.5 rounded text-sm transition-colors",
              !filters.category ? "bg-primary/10 text-primary" : "hover:bg-muted"
            )}
          >
            Всички категории
          </button>
          {categories.map(category => {
            const Icon = categoryIcons[category.slug] || Box
            const count = components.filter(c => c.category?.slug === category.slug).length
            return (
              <button
                key={category.id}
                onClick={() => setFilters(prev => ({ ...prev, category: category.slug, specFilters: {} }))}
                className={cn(
                  "w-full flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors",
                  filters.category === category.slug ? "bg-primary/10 text-primary" : "hover:bg-muted"
                )}
              >
                <span className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {categoryLabels[category.slug] || category.name}
                </span>
                <span className="text-muted-foreground">{count}</span>
              </button>
            )
          })}
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Price Range */}
      <Collapsible
        open={expandedFilters.price}
        onOpenChange={(open) => setExpandedFilters(prev => ({ ...prev, price: open }))}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
          <span className="text-sm font-medium">Цена</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", expandedFilters.price && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <Slider
            value={filters.priceRange}
            min={minPrice}
            max={maxPrice}
            step={10}
            onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value as [number, number] }))}
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatPrice(filters.priceRange[0])}</span>
            <span>{formatPrice(filters.priceRange[1])}</span>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Brands */}
      <Collapsible
        open={expandedFilters.brand}
        onOpenChange={(open) => setExpandedFilters(prev => ({ ...prev, brand: open }))}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
          <span className="text-sm font-medium">Марка</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", expandedFilters.brand && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pt-2 max-h-48 overflow-y-auto">
          {categoryBrands.map(brand => (
            <div key={brand.id} className="flex items-center space-x-2">
              <Checkbox
                id={`brand-${brand.slug}`}
                checked={filters.brands.includes(brand.slug)}
                onCheckedChange={() => toggleBrand(brand.slug)}
              />
              <Label htmlFor={`brand-${brand.slug}`} className="text-sm cursor-pointer">
                {brand.name}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Category-Specific Filters */}
      {currentCategoryFilters.length > 0 && (
        <>
          <Separator />
          <Collapsible
            open={expandedFilters.specs}
            onOpenChange={(open) => setExpandedFilters(prev => ({ ...prev, specs: open }))}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
              <span className="text-sm font-medium">Спецификации</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", expandedFilters.specs && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {currentCategoryFilters.map(filter => (
                <div key={filter.key} className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{filter.label}</p>
                  {filter.type === 'checkbox' && filter.options && (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {filter.options.map(option => (
                        <div key={option} className="flex items-center space-x-2">
                          <Checkbox
                            id={`spec-${filter.key}-${option}`}
                            checked={(filters.specFilters[filter.specKey] || []).includes(option)}
                            onCheckedChange={() => toggleSpecFilter(filter.specKey, option)}
                          />
                          <Label htmlFor={`spec-${filter.key}-${option}`} className="text-sm cursor-pointer">
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              asChild
              className="border-primary bg-transparent text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Link href="/">
                <ArrowLeft className="h-5 w-5 text-primary" />
              </Link>
            </Button>
            <div>
              <h1 className="font-semibold text-lg">Каталог</h1>
              <p className="text-xs text-muted-foreground">{filteredComponents.length} продукта</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/cart">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Количка
                {totalItems > 0 ? (
                  <span className="ml-1 rounded-full bg-primary/12 px-2 py-0.5 text-xs text-primary">
                    {totalItems}
                  </span>
                ) : null}
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/builder">
                <Plus className="h-4 w-4 mr-2" />
                Нова сглобка
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Desktop Filter Sidebar */}
        <aside className="hidden lg:block w-72 border-r border-border min-h-[calc(100vh-64px)] sticky top-16">
          <ScrollArea className="h-[calc(100vh-64px)]">
            <FilterContent />
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Toolbar */}
          <div className="sticky top-16 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
            <div className="flex items-center gap-4 p-4">
              {/* Mobile Filter Button */}
              <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="outline" size="sm" className="gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Филтри
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] p-0">
                  <ScrollArea className="h-full">
                    <FilterContent />
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Търси продукти..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>

              {/* Sort */}
              <Select 
                value={filters.sortBy} 
                onValueChange={(v: typeof filters.sortBy) => setFilters(prev => ({ ...prev, sortBy: v }))}
              >
                <SelectTrigger className="w-[180px] hidden sm:flex">
                  <SelectValue placeholder="Сортирай" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price_asc">Цена (ниска-висока)</SelectItem>
                  <SelectItem value="price_desc">Цена (висока-ниска)</SelectItem>
                  <SelectItem value="rating">Рейтинг</SelectItem>
                  <SelectItem value="name">Име</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode */}
              <div className="flex border rounded-lg p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Active Filters */}
            {(filters.category || filters.brands.length > 0 || filters.inStock || Object.values(filters.specFilters).some(v => v.length > 0)) && (
              <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
                {filters.category && (
                  <Badge variant="secondary" className="gap-1">
                    {categoryLabels[filters.category] || filters.category}
                    <button onClick={() => setFilters(prev => ({ ...prev, category: null, specFilters: {} }))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {filters.brands.map(brand => (
                  <Badge key={brand} variant="secondary" className="gap-1">
                    {brands.find(b => b.slug === brand)?.name || brand}
                    <button onClick={() => toggleBrand(brand)}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {filters.inStock && (
                  <Badge variant="secondary" className="gap-1">
                    Само налични
                    <button onClick={() => setFilters(prev => ({ ...prev, inStock: false }))}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
                {Object.entries(filters.specFilters).map(([key, values]) =>
                  values.map(value => (
                    <Badge key={`${key}-${value}`} variant="secondary" className="gap-1">
                      {value}
                      <button onClick={() => toggleSpecFilter(key, value)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Products Grid */}
          <div className="p-4">
            <div
              className={cn(
                'grid gap-4',
                viewMode === 'grid'
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'grid-cols-1'
              )}
            >
              {filteredComponents.map((component) => {
                const Icon = categoryIcons[component.category?.slug || ''] || Box
                const specs = getSpecsList(component).filter(s => s.value)
                
                return (
                  <Card
                    key={component.id}
                    className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 group overflow-hidden"
                    onClick={() => setSelectedComponent(component)}
                  >
                    <CardContent className={cn("p-0", viewMode === 'list' && "flex gap-4")}>
                      {/* Image */}
                      <div className={cn(
                        "bg-muted relative overflow-hidden",
                        viewMode === 'grid' ? "aspect-square" : "w-32 h-32 shrink-0"
                      )}>
                        {component.image_url ? (
                          <Image
                            src={component.image_url}
                            alt={component.name}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Icon className="h-12 w-12 text-muted-foreground/30" />
                          </div>
                        )}
                        <button
                          className="absolute top-2 right-2 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleToggleFavorite(component)
                          }}
                        >
                          <Heart 
                            className={cn(
                              "h-4 w-4 transition-colors",
                              favorites.has(component.id) ? "fill-red-500 text-red-500" : "text-muted-foreground"
                            )} 
                          />
                        </button>
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-background/80 backdrop-blur-sm rounded px-1.5 py-0.5">
                          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                          <span className="text-xs font-medium">{component.rating.toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4 flex-1">
                        <p className="text-xs text-muted-foreground mb-1">{component.brand?.name}</p>
                        <h3 className="font-semibold text-sm line-clamp-2 mb-2">{component.name}</h3>
                        
                        {/* Specs */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {specs.slice(0, 3).map((spec, i) => (
                            <Badge key={i} variant="outline" className="text-xs font-normal">
                              {spec.value}
                            </Badge>
                          ))}
                        </div>

                        {/* Price & Stock */}
                        <div className="flex items-center justify-between">
                          <p className="text-lg font-bold text-primary">{formatPrice(component.price)}</p>
                          <Badge variant={component.in_stock ? "outline" : "secondary"} className={cn(
                            "text-xs",
                            component.in_stock && "text-green-500 border-green-500/50"
                          )}>
                            {component.in_stock ? 'Наличен' : 'Изчерпан'}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Component Detail Dialog */}
      <Dialog open={!!selectedComponent} onOpenChange={(open) => !open && setSelectedComponent(null)}>
        <DialogContent className="max-h-[calc(100vh-2rem)] max-w-3xl overflow-y-auto">
          {selectedComponent && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedComponent.name}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="aspect-square bg-muted rounded-lg relative overflow-hidden">
                  {selectedComponent.image_url ? (
                    <Image
                      src={selectedComponent.image_url}
                      alt={selectedComponent.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Box className="h-16 w-16 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground mb-2">{selectedComponent.brand?.name}</p>
                  <p className="text-3xl font-bold text-primary mb-4">{formatPrice(selectedComponent.price)}</p>
                  
                  <div className="space-y-2">
                    {getSpecsList(selectedComponent).filter(s => s.value).map((spec, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{spec.label}</span>
                        <span className="font-medium">{spec.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-2 mt-6">
                    <Button
                      variant="outline"
                      className="h-auto min-h-11 w-full min-w-0 whitespace-normal py-3 leading-tight"
                      onClick={() => {
                        addToCart(selectedComponent)
                        toast.success(`${selectedComponent.name} е добавен в количката`)
                      }}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      {getQuantity(selectedComponent.id) > 0
                        ? `В количката (${getQuantity(selectedComponent.id)})`
                        : 'Добави в количка'}
                    </Button>
                    <Button className="h-auto min-h-11 w-full min-w-0 whitespace-normal py-3 leading-tight" asChild>
                      <Link href={`/builder?add=${selectedComponent.id}`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Добави в сглобка
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto min-h-11 w-full min-w-0 whitespace-normal py-3 leading-tight"
                      onClick={() => handleToggleFavorite(selectedComponent)}
                    >
                      <Heart className={cn(
                        "h-4 w-4 mr-2",
                        favorites.has(selectedComponent.id) && "fill-red-500 text-red-500"
                      )} />
                      {favorites.has(selectedComponent.id) ? 'В любими' : 'Добави в любими'}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
