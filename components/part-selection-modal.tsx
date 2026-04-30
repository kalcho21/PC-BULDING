'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Category, Brand, Component, BuildState } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
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
import {
  Search,
  X,
  ChevronDown,
  Plus,
  Check,
  Star,
  Filter,
  SlidersHorizontal,
  Cpu,
  Monitor,
  MemoryStick,
  CircuitBoard,
  HardDrive,
  Zap,
  Box,
  Fan,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PartSelectionModalProps {
  open: boolean
  onClose: () => void
  category: Category | null
  categories: Category[]
  components: Component[]
  brands: Brand[]
  onSelectComponent: (component: Component) => void
  currentBuild: BuildState
}

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

// Category-specific filter configurations
const categoryFilters: Record<string, { key: string; label: string; type: 'checkbox' | 'range' | 'select'; options?: string[] }[]> = {
  cpu: [
    { key: 'socket', label: 'Сокет', type: 'checkbox', options: ['AM5', 'AM4', 'LGA1851', 'LGA1700', 'LGA1200'] },
    { key: 'cores', label: 'Ядра', type: 'range' },
    { key: 'boost_clock', label: 'Честота', type: 'range' },
  ],
  gpu: [
    { key: 'vram', label: 'VRAM (GB)', type: 'checkbox', options: ['8', '12', '16', '24', '32'] },
    { key: 'chipset_maker', label: 'Производител', type: 'checkbox', options: ['NVIDIA', 'AMD', 'Intel'] },
  ],
  ram: [
    { key: 'type', label: 'Тип', type: 'checkbox', options: ['DDR5', 'DDR4'] },
    { key: 'capacity', label: 'Капацитет (GB)', type: 'checkbox', options: ['16', '32', '64', '128'] },
    { key: 'speed', label: 'Честота (MHz)', type: 'range' },
  ],
  motherboard: [
    { key: 'socket', label: 'Сокет', type: 'checkbox', options: ['AM5', 'AM4', 'LGA1851', 'LGA1700', 'LGA1200'] },
    { key: 'form_factor', label: 'Форм фактор', type: 'checkbox', options: ['ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX'] },
    { key: 'memory_type', label: 'Тип памет', type: 'checkbox', options: ['DDR5', 'DDR4'] },
  ],
  storage: [
    { key: 'type', label: 'Тип', type: 'checkbox', options: ['NVMe SSD', 'SATA SSD', 'HDD'] },
    { key: 'capacity', label: 'Капацитет (GB)', type: 'checkbox', options: ['500', '1000', '2000', '4000', '8000'] },
  ],
  psu: [
    { key: 'wattage', label: 'Мощност (W)', type: 'checkbox', options: ['550', '650', '750', '850', '1000', '1200'] },
    { key: 'efficiency', label: 'Ефективност', type: 'checkbox', options: ['80+ Bronze', '80+ Gold', '80+ Platinum', '80+ Titanium'] },
    { key: 'modular', label: 'Модулност', type: 'checkbox', options: ['Non-Modular', 'Semi-Modular', 'Fully Modular'] },
  ],
  case: [
    { key: 'form_factor', label: 'Размер', type: 'checkbox', options: ['Full-Tower', 'Mid-Tower', 'Mini-Tower', 'Mini-ITX'] },
    { key: 'side_panel', label: 'Страничен панел', type: 'checkbox', options: ['Tempered Glass', 'Acrylic', 'Steel'] },
  ],
  cooling: [
    { key: 'type', label: 'Тип', type: 'checkbox', options: ['Air Cooler', 'AIO Liquid Cooler'] },
    { key: 'radiator_size', label: 'Радиатор (mm)', type: 'checkbox', options: ['120', '240', '280', '360', '420'] },
  ],
}

// Spec display configuration per category
const specDisplayConfig: Record<string, { key: string; label: string; suffix?: string }[]> = {
  cpu: [
    { key: 'socket', label: 'Сокет' },
    { key: 'cores', label: 'Ядра' },
    { key: 'boost_clock', label: 'Честота', suffix: ' GHz' },
    { key: 'tdp', label: 'TDP', suffix: 'W' },
  ],
  gpu: [
    { key: 'vram', label: 'VRAM', suffix: 'GB' },
    { key: 'vram_type', label: 'Тип' },
    { key: 'boost_clock', label: 'Честота', suffix: ' MHz' },
    { key: 'tdp', label: 'TDP', suffix: 'W' },
  ],
  ram: [
    { key: 'capacity', label: 'Капацитет', suffix: 'GB' },
    { key: 'speed', label: 'Честота', suffix: ' MHz' },
    { key: 'type', label: 'Тип' },
    { key: 'cas_latency', label: 'CL' },
  ],
  motherboard: [
    { key: 'socket', label: 'Сокет' },
    { key: 'chipset', label: 'Чипсет' },
    { key: 'form_factor', label: 'Форма' },
    { key: 'memory_type', label: 'Памет' },
  ],
  storage: [
    { key: 'capacity', label: 'Капацитет', suffix: 'GB' },
    { key: 'type', label: 'Тип' },
    { key: 'read_speed', label: 'Четене', suffix: ' MB/s' },
    { key: 'write_speed', label: 'Запис', suffix: ' MB/s' },
  ],
  psu: [
    { key: 'wattage', label: 'Мощност', suffix: 'W' },
    { key: 'efficiency', label: 'Ефективност' },
    { key: 'modular', label: 'Модулност' },
  ],
  case: [
    { key: 'form_factor', label: 'Размер' },
    { key: 'max_gpu_length', label: 'Макс GPU', suffix: 'mm' },
    { key: 'radiator_support', label: 'Радиатор', suffix: 'mm' },
  ],
  cooling: [
    { key: 'type', label: 'Тип' },
    { key: 'fan_size', label: 'Вентилатор', suffix: 'mm' },
    { key: 'tdp_rating', label: 'TDP', suffix: 'W' },
  ],
}

export function PartSelectionModal({
  open,
  onClose,
  category,
  categories,
  components,
  brands,
  onSelectComponent,
  currentBuild,
}: PartSelectionModalProps) {
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'rating' | 'name'>('price_asc')
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000])
  const [inStockOnly, setInStockOnly] = useState(false)
  const [compatibleOnly, setCompatibleOnly] = useState(true)
  const [specFilters, setSpecFilters] = useState<Record<string, string[]>>({})
  const [filtersExpanded, setFiltersExpanded] = useState<Record<string, boolean>>({
    brand: true,
    price: true,
    specs: true,
  })
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  // Get components for this category
  const categoryComponents = useMemo(() => {
    if (!category) return []
    return components.filter(c => c.category?.slug === category.slug)
  }, [components, category])

  // Get brands for this category
  const categoryBrands = useMemo(() => {
    const brandIds = new Set(categoryComponents.map(c => c.brand?.id).filter(Boolean))
    return brands.filter(b => brandIds.has(b.id))
  }, [categoryComponents, brands])

  // Get price range for this category
  const [minPrice, maxPrice] = useMemo(() => {
    if (categoryComponents.length === 0) return [0, 5000]
    const prices = categoryComponents.map(c => c.price)
    return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))]
  }, [categoryComponents])

  // Check compatibility with current build
  const isCompatible = (component: Component): boolean => {
    if (!category) return true
    
    const slug = category.slug
    const specs = component.specs || {}
    
    // CPU <-> Motherboard socket compatibility
    if (slug === 'cpu' && currentBuild.motherboard) {
      const mbSocket = currentBuild.motherboard.specs?.socket
      if (mbSocket && specs.socket && mbSocket !== specs.socket) {
        return false
      }
    }
    if (slug === 'motherboard' && currentBuild.cpu) {
      const cpuSocket = currentBuild.cpu.specs?.socket
      if (cpuSocket && specs.socket && cpuSocket !== specs.socket) {
        return false
      }
    }
    
    // RAM <-> Motherboard memory type compatibility
    if (slug === 'ram' && currentBuild.motherboard) {
      const mbType = currentBuild.motherboard.specs?.memory_type
      if (mbType && specs.type && mbType !== specs.type) {
        return false
      }
    }
    if (slug === 'motherboard' && currentBuild.ram) {
      const ramType = currentBuild.ram.specs?.type
      if (ramType && specs.memory_type && ramType !== specs.memory_type) {
        return false
      }
    }
    
    // Case <-> Motherboard form factor compatibility
    const formFactorHierarchy: Record<string, string[]> = {
      'Full-Tower': ['E-ATX', 'ATX', 'Micro-ATX', 'Mini-ITX'],
      'Mid-Tower': ['ATX', 'Micro-ATX', 'Mini-ITX'],
      'Mini-Tower': ['Micro-ATX', 'Mini-ITX'],
      'Mini-ITX': ['Mini-ITX'],
    }
    
    if (slug === 'case' && currentBuild.motherboard) {
      const mbFormFactor = currentBuild.motherboard.specs?.form_factor
      const caseFormFactor = specs.form_factor
      if (mbFormFactor && caseFormFactor) {
        const supported = formFactorHierarchy[caseFormFactor] || []
        if (supported.length > 0 && !supported.includes(mbFormFactor)) {
          return false
        }
      }
    }
    if (slug === 'motherboard' && currentBuild.case) {
      const caseFormFactor = currentBuild.case.specs?.form_factor
      const mbFormFactor = specs.form_factor
      if (caseFormFactor && mbFormFactor) {
        const supported = formFactorHierarchy[caseFormFactor] || []
        if (supported.length > 0 && !supported.includes(mbFormFactor)) {
          return false
        }
      }
    }
    
    // Cooling <-> CPU socket compatibility
    if (slug === 'cooling' && currentBuild.cpu) {
      const cpuSocket = currentBuild.cpu.specs?.socket
      const supportedSockets = specs.socket_support || []
      if (cpuSocket && Array.isArray(supportedSockets) && supportedSockets.length > 0) {
        if (!supportedSockets.includes(cpuSocket)) {
          return false
        }
      }
    }
    
    return true
  }

  // Filter and sort components
  const filteredComponents = useMemo(() => {
    let result = [...categoryComponents]

    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(searchLower) ||
        c.brand?.name.toLowerCase().includes(searchLower) ||
        c.model?.toLowerCase().includes(searchLower)
      )
    }

    if (selectedBrands.length > 0) {
      result = result.filter(c => selectedBrands.includes(c.brand?.slug || ''))
    }

    result = result.filter(c => c.price >= priceRange[0] && c.price <= priceRange[1])

    if (inStockOnly) {
      result = result.filter(c => c.in_stock)
    }

    if (compatibleOnly) {
      result = result.filter(isCompatible)
    }

    Object.entries(specFilters).forEach(([key, values]) => {
      if (values.length > 0) {
        result = result.filter(c => {
          const specValue = String(c.specs?.[key] || '')
          return values.some(v => specValue.includes(v) || specValue === v)
        })
      }
    })

    switch (sortBy) {
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
  }, [categoryComponents, search, selectedBrands, priceRange, inStockOnly, compatibleOnly, specFilters, sortBy, currentBuild])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price)
  }

  const toggleBrand = (brandSlug: string) => {
    setSelectedBrands(prev =>
      prev.includes(brandSlug)
        ? prev.filter(b => b !== brandSlug)
        : [...prev, brandSlug]
    )
  }

  const toggleSpecFilter = (key: string, value: string) => {
    setSpecFilters(prev => {
      const current = prev[key] || []
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value]
      return { ...prev, [key]: updated }
    })
  }

  const clearFilters = () => {
    setSearch('')
    setSelectedBrands([])
    setPriceRange([minPrice, maxPrice])
    setInStockOnly(false)
    setSpecFilters({})
  }

  const currentFilters = categoryFilters[category?.slug || ''] || []
  const specDisplay = specDisplayConfig[category?.slug || ''] || []

  if (!category) return null

  const FilterContent = () => (
    <div className="p-4 space-y-4">
      {/* Quick Filters */}
      <div className="space-y-3">
        <div className="flex items-center space-x-3">
          <Checkbox
            id="compatible"
            checked={compatibleOnly}
            onCheckedChange={(checked) => setCompatibleOnly(!!checked)}
          />
          <Label htmlFor="compatible" className="text-sm font-medium cursor-pointer">
            Само съвместими
          </Label>
        </div>
        <div className="flex items-center space-x-3">
          <Checkbox
            id="inStock"
            checked={inStockOnly}
            onCheckedChange={(checked) => setInStockOnly(!!checked)}
          />
          <Label htmlFor="inStock" className="text-sm font-medium cursor-pointer">
            Само налични
          </Label>
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <Collapsible
        open={filtersExpanded.price}
        onOpenChange={(open) => setFiltersExpanded(prev => ({ ...prev, price: open }))}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
          <span className="text-sm font-medium">Цена</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", filtersExpanded.price && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-2">
          <Slider
            value={priceRange}
            min={minPrice}
            max={maxPrice}
            step={10}
            onValueChange={(value) => setPriceRange(value as [number, number])}
            className="mt-2"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatPrice(priceRange[0])}</span>
            <span>{formatPrice(priceRange[1])}</span>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Separator />

      {/* Brands */}
      <Collapsible
        open={filtersExpanded.brand}
        onOpenChange={(open) => setFiltersExpanded(prev => ({ ...prev, brand: open }))}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
          <span className="text-sm font-medium">Марка</span>
          <ChevronDown className={cn("h-4 w-4 transition-transform", filtersExpanded.brand && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2">
          {categoryBrands.map(brand => (
            <div key={brand.id} className="flex items-center space-x-3">
              <Checkbox
                id={`brand-${brand.slug}`}
                checked={selectedBrands.includes(brand.slug)}
                onCheckedChange={() => toggleBrand(brand.slug)}
              />
              <Label htmlFor={`brand-${brand.slug}`} className="text-sm cursor-pointer">
                {brand.name}
              </Label>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>

      {/* Category-specific Filters */}
      {currentFilters.length > 0 && (
        <>
          <Separator />
          <Collapsible
            open={filtersExpanded.specs}
            onOpenChange={(open) => setFiltersExpanded(prev => ({ ...prev, specs: open }))}
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2">
              <span className="text-sm font-medium">Спецификации</span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", filtersExpanded.specs && "rotate-180")} />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              {currentFilters.map(filter => (
                <div key={filter.key} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">{filter.label}</p>
                  {filter.type === 'checkbox' && filter.options && (
                    <div className="space-y-2">
                      {filter.options.map(option => (
                        <div key={option} className="flex items-center space-x-3">
                          <Checkbox
                            id={`${filter.key}-${option}`}
                            checked={(specFilters[filter.key] || []).includes(option)}
                            onCheckedChange={() => toggleSpecFilter(filter.key, option)}
                          />
                          <Label htmlFor={`${filter.key}-${option}`} className="text-sm cursor-pointer">
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

      <Separator />

      <Button variant="ghost" size="sm" onClick={clearFilters} className="w-full">
        Изчисти филтрите
      </Button>
    </div>
  )

  const Icon = categoryIcons[category.slug] || Box

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-[95vw] w-full max-h-[95vh] h-full flex flex-col p-0 gap-0 sm:max-w-[95vw] lg:max-w-[1600px]">
        <DialogHeader className="px-4 sm:px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg sm:text-xl flex items-center gap-2">
              <Icon className="h-5 w-5 text-primary" />
              Избери {category.name}
            </DialogTitle>
            <span className="text-sm text-muted-foreground">
              {filteredComponents.length} продукта
            </span>
          </div>
          
          {/* Search and Sort */}
          <div className="flex items-center gap-2 sm:gap-3 mt-4">
            {/* Mobile Filter Button */}
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden shrink-0 min-h-[44px]"
              onClick={() => setMobileFiltersOpen(true)}
            >
              <SlidersHorizontal className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Филтри</span>
            </Button>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Търси по име, марка..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 min-h-[44px]"
              />
            </div>
            <Select value={sortBy} onValueChange={(v: typeof sortBy) => setSortBy(v)}>
              <SelectTrigger className="w-[130px] sm:w-[160px] min-h-[44px]">
                <SelectValue placeholder="Сортирай" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_asc">Цена (ниска)</SelectItem>
                <SelectItem value="price_desc">Цена (висока)</SelectItem>
                <SelectItem value="rating">Рейтинг</SelectItem>
                <SelectItem value="name">Име</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DialogHeader>

        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* Mobile Filters Sheet */}
          <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
            <SheetContent side="left" className="w-[300px] p-0">
              <ScrollArea className="h-full">
                <FilterContent />
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Desktop Filters Sidebar */}
          <aside className="hidden lg:block w-72 border-r border-border shrink-0 overflow-y-auto">
            <FilterContent />
          </aside>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {filteredComponents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <Box className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-semibold mb-2">Няма намерени продукти</h3>
                <p className="text-muted-foreground text-sm">
                  Опитай да промениш филтрите или търсенето
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                  Изчисти филтрите
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
                {filteredComponents.map(component => {
                  const compatible = isCompatible(component)
                  
                  return (
                    <Card
                      key={component.id}
                      className={cn(
                        "overflow-hidden transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer group",
                        !compatible && "opacity-60 hover:opacity-80"
                      )}
                      onClick={() => onSelectComponent(component)}
                    >
                      <CardContent className="p-0">
                        <div className="flex gap-4 p-4">
                          {/* Image */}
                          <div className="w-28 h-28 sm:w-36 sm:h-36 bg-muted rounded-lg relative overflow-hidden shrink-0">
                            {component.image_url ? (
                              <Image
                                src={component.image_url}
                                alt={component.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                                <Icon className="h-12 w-12 text-muted-foreground/30" />
                              </div>
                            )}
                            {!compatible && (
                              <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                <Badge variant="destructive" className="text-xs">Несъвместим</Badge>
                              </div>
                            )}
                          </div>
                          
                          {/* Info */}
                          <div className="flex-1 min-w-0 flex flex-col">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs text-muted-foreground font-medium">{component.brand?.name}</p>
                                {!component.in_stock && (
                                  <Badge variant="secondary" className="text-xs py-0">Изчерпан</Badge>
                                )}
                                {component.in_stock && (
                                  <Badge variant="outline" className="text-xs py-0 text-green-500 border-green-500/50">Наличен</Badge>
                                )}
                              </div>
                              <h4 className="font-semibold text-base mb-3 line-clamp-2">{component.name}</h4>
                              
                              {/* Specs Grid */}
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mb-3">
                                {specDisplay.map(({ key, label, suffix }) => {
                                  const value = component.specs?.[key]
                                  if (value === undefined || value === null) return null
                                  return (
                                    <div key={key} className="flex items-center gap-1 text-xs">
                                      <span className="text-muted-foreground">{label}:</span>
                                      <span className="font-medium">{value}{suffix || ''}</span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            
                            {/* Rating & Price */}
                            <div className="flex items-center justify-between pt-3 border-t border-border/50">
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                                <span className="text-sm font-medium">{component.rating.toFixed(1)}</span>
                                <span className="text-xs text-muted-foreground">({component.review_count})</span>
                              </div>
                              <p className="text-xl font-bold text-primary">
                                {formatPrice(component.price)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
