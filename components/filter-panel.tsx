'use client'

import { Category, Brand, FilterState } from '@/lib/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import {
  Cpu,
  MonitorUp,
  MemoryStick,
  CircuitBoard,
  HardDrive,
  Zap,
  Box,
  Fan,
  Search,
  X,
  SlidersHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const categoryIcons: Record<string, React.ElementType> = {
  cpu: Cpu,
  gpu: MonitorUp,
  ram: MemoryStick,
  motherboard: CircuitBoard,
  storage: HardDrive,
  psu: Zap,
  case: Box,
  cooling: Fan,
}

// Bulgarian category names
const categoryNamesBg: Record<string, string> = {
  cpu: 'Процесор',
  gpu: 'Видеокарта',
  ram: 'RAM памет',
  motherboard: 'Дънна платка',
  storage: 'Съхранение',
  psu: 'Захранване',
  case: 'Кутия',
  cooling: 'Охлаждане',
}

// Category-specific filter options
const categorySpecificFilters: Record<string, {
  key: string
  label: string
  type: 'multiselect' | 'range'
  options?: string[]
  specKey?: string
  min?: number
  max?: number
  unit?: string
}[]> = {
  cpu: [
    { key: 'socket', label: 'Сокет', type: 'multiselect', options: ['LGA1700', 'LGA1200', 'AM5', 'AM4'], specKey: 'socket' },
    { key: 'cores', label: 'Ядра', type: 'range', min: 2, max: 32, specKey: 'cores' },
    { key: 'architecture', label: 'Архитектура', type: 'multiselect', options: ['Raptor Lake Refresh', 'Raptor Lake', 'Alder Lake', 'Zen 4', 'Zen 4 3D V-Cache', 'Zen 3', 'Zen 2'], specKey: 'architecture' },
  ],
  gpu: [
    { key: 'vram', label: 'Видео памет (GB)', type: 'range', min: 4, max: 24, unit: 'GB', specKey: 'vram' },
    { key: 'vram_type', label: 'Тип VRAM', type: 'multiselect', options: ['GDDR6X', 'GDDR6'], specKey: 'vram_type' },
  ],
  ram: [
    { key: 'type', label: 'Тип памет', type: 'multiselect', options: ['DDR5', 'DDR4'], specKey: 'type' },
    { key: 'speed', label: 'Честота (MHz)', type: 'range', min: 2400, max: 7200, unit: 'MHz', specKey: 'speed' },
    { key: 'capacity', label: 'Капацитет (GB)', type: 'range', min: 8, max: 128, unit: 'GB', specKey: 'capacity' },
    { key: 'rgb', label: 'RGB осветление', type: 'multiselect', options: ['Да', 'Не'], specKey: 'rgb' },
  ],
  motherboard: [
    { key: 'socket', label: 'Сокет', type: 'multiselect', options: ['LGA1700', 'LGA1200', 'AM5', 'AM4'], specKey: 'socket' },
    { key: 'chipset', label: 'Чипсет', type: 'multiselect', options: ['Z790', 'B760', 'B660', 'Z690', 'X670E', 'X670', 'B650', 'B550', 'X570'], specKey: 'chipset' },
    { key: 'form_factor', label: 'Форм фактор', type: 'multiselect', options: ['ATX', 'Micro-ATX', 'Mini-ITX', 'E-ATX'], specKey: 'form_factor' },
    { key: 'memory_type', label: 'Тип памет', type: 'multiselect', options: ['DDR5', 'DDR4'], specKey: 'memory_type' },
    { key: 'wifi', label: 'WiFi', type: 'multiselect', options: ['Да', 'Не'], specKey: 'wifi' },
  ],
  storage: [
    { key: 'type', label: 'Тип', type: 'multiselect', options: ['NVMe SSD', 'SATA SSD', 'HDD'], specKey: 'type' },
    { key: 'capacity', label: 'Капацитет (GB)', type: 'range', min: 250, max: 8000, unit: 'GB', specKey: 'capacity' },
    { key: 'interface', label: 'Интерфейс', type: 'multiselect', options: ['PCIe 5.0 x4', 'PCIe 4.0 x4', 'SATA III'], specKey: 'interface' },
  ],
  psu: [
    { key: 'wattage', label: 'Мощност (W)', type: 'range', min: 450, max: 1600, unit: 'W', specKey: 'wattage' },
    { key: 'efficiency', label: 'Ефективност', type: 'multiselect', options: ['80+ Titanium', '80+ Platinum', '80+ Gold', '80+ Silver', '80+ Bronze'], specKey: 'efficiency' },
    { key: 'modular', label: 'Модулярен', type: 'multiselect', options: ['Fully Modular', 'Semi-Modular', 'Non-Modular'], specKey: 'modular' },
  ],
  case: [
    { key: 'form_factor', label: 'Форм фактор', type: 'multiselect', options: ['Full-Tower', 'Mid-Tower', 'Mini-Tower', 'Mini-ITX'], specKey: 'form_factor' },
    { key: 'side_panel', label: 'Страничен панел', type: 'multiselect', options: ['Tempered Glass', 'Acrylic', 'Steel'], specKey: 'side_panel' },
  ],
  cooling: [
    { key: 'type', label: 'Тип охлаждане', type: 'multiselect', options: ['Air Cooler', 'AIO Liquid Cooler'], specKey: 'type' },
    { key: 'radiator_size', label: 'Радиатор (mm)', type: 'multiselect', options: ['120', '240', '280', '360'], specKey: 'radiator_size' },
    { key: 'rgb', label: 'RGB осветление', type: 'multiselect', options: ['Да', 'Не'], specKey: 'rgb' },
  ],
}

interface FilterPanelProps {
  categories: Category[]
  brands: Brand[]
  filters: FilterState
  onFilterChange: (filters: Partial<FilterState>) => void
  onClearFilters: () => void
  maxPrice?: number
}

export function FilterPanel({
  categories,
  brands,
  filters,
  onFilterChange,
  onClearFilters,
  maxPrice = 2000,
}: FilterPanelProps) {
  const hasActiveFilters =
    filters.category !== null ||
    filters.brands.length > 0 ||
    filters.priceRange[0] > 0 ||
    filters.priceRange[1] < maxPrice ||
    filters.inStock ||
    filters.search.length > 0 ||
    Object.keys(filters.specFilters || {}).length > 0

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
      maximumFractionDigits: 0,
    }).format(price)
  }

  const handleSpecFilterChange = (filterKey: string, value: string | [number, number], isRange: boolean = false) => {
    const currentSpecFilters = filters.specFilters || {}
    
    if (isRange) {
      onFilterChange({
        specFilters: {
          ...currentSpecFilters,
          [filterKey]: value,
        },
      })
    } else {
      const currentValues = (currentSpecFilters[filterKey] as string[]) || []
      const newValues = currentValues.includes(value as string)
        ? currentValues.filter((v) => v !== value)
        : [...currentValues, value as string]
      
      if (newValues.length === 0) {
        const { [filterKey]: _, ...rest } = currentSpecFilters
        onFilterChange({ specFilters: rest })
      } else {
        onFilterChange({
          specFilters: {
            ...currentSpecFilters,
            [filterKey]: newValues,
          },
        })
      }
    }
  }

  // Get current category's specific filters
  const currentCategoryFilters = filters.category ? categorySpecificFilters[filters.category] || [] : []

  // Count active spec filters
  const activeSpecFilterCount = Object.keys(filters.specFilters || {}).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Филтри</h2>
            {hasActiveFilters && (
              <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                Активни
              </Badge>
            )}
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
              onClick={onClearFilters}
            >
              Изчисти
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Търси компоненти..."
            value={filters.search}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="pl-9 pr-9"
          />
          {filters.search && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6"
              onClick={() => onFilterChange({ search: '' })}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <Accordion type="multiple" defaultValue={['categories', 'price', 'brands', 'specs', 'stock']} className="space-y-2">
            {/* Categories */}
            <AccordionItem value="categories" className="border rounded-lg px-3">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Категории
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 gap-2 pb-3">
                  {categories.map((category) => {
                    const Icon = categoryIcons[category.slug] || Cpu
                    const isSelected = filters.category === category.slug
                    const displayName = categoryNamesBg[category.slug] || category.name
                    return (
                      <Button
                        key={category.id}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          'h-auto py-2 px-3 justify-start gap-2',
                          isSelected && 'bg-primary text-primary-foreground'
                        )}
                        onClick={() =>
                          onFilterChange({
                            category: isSelected ? null : category.slug,
                            specFilters: isSelected ? {} : filters.specFilters, // Clear spec filters when changing category
                          })
                        }
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-xs">{displayName}</span>
                      </Button>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Category-Specific Filters */}
            {currentCategoryFilters.length > 0 && (
              <AccordionItem value="specs" className="border rounded-lg px-3 border-primary/30 bg-primary/5">
                <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                  <div className="flex items-center gap-2">
                    Спецификации
                    {activeSpecFilterCount > 0 && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                        {activeSpecFilterCount}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pb-3 space-y-4">
                    {currentCategoryFilters.map((filter) => (
                      <div key={filter.key} className="space-y-2">
                        <Label className="text-xs text-muted-foreground">{filter.label}</Label>
                        
                        {filter.type === 'multiselect' && filter.options && (
                          <div className="flex flex-wrap gap-1.5">
                            {filter.options.map((option) => {
                              const currentValues = (filters.specFilters?.[filter.key] as string[]) || []
                              const isSelected = currentValues.includes(option)
                              return (
                                <Badge
                                  key={option}
                                  variant={isSelected ? 'default' : 'outline'}
                                  className={cn(
                                    'cursor-pointer text-xs transition-colors',
                                    isSelected 
                                      ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                                      : 'hover:bg-muted'
                                  )}
                                  onClick={() => handleSpecFilterChange(filter.key, option)}
                                >
                                  {option}
                                </Badge>
                              )
                            })}
                          </div>
                        )}
                        
                        {filter.type === 'range' && (
                          <div className="space-y-2">
                            <Slider
                              value={(filters.specFilters?.[filter.key] as [number, number]) || [filter.min!, filter.max!]}
                              onValueChange={(value) => handleSpecFilterChange(filter.key, value as [number, number], true)}
                              min={filter.min}
                              max={filter.max}
                              step={filter.key === 'cores' ? 1 : filter.key === 'speed' ? 200 : filter.key === 'capacity' ? filter.min === 250 ? 250 : 8 : 50}
                              className="mt-2"
                            />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                {(filters.specFilters?.[filter.key] as [number, number])?.[0] || filter.min}
                                {filter.unit && ` ${filter.unit}`}
                              </span>
                              <span>
                                {(filters.specFilters?.[filter.key] as [number, number])?.[1] || filter.max}
                                {filter.unit && ` ${filter.unit}`}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Price Range */}
            <AccordionItem value="price" className="border rounded-lg px-3">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Ценови диапазон
              </AccordionTrigger>
              <AccordionContent>
                <div className="pb-3 space-y-4">
                  <Slider
                    value={filters.priceRange}
                    onValueChange={(value) =>
                      onFilterChange({ priceRange: value as [number, number] })
                    }
                    max={maxPrice}
                    step={10}
                    className="mt-2"
                  />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {formatPrice(filters.priceRange[0])}
                    </span>
                    <span className="text-muted-foreground">
                      {formatPrice(filters.priceRange[1])}
                    </span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Brands */}
            <AccordionItem value="brands" className="border rounded-lg px-3">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  Марки
                  {filters.brands.length > 0 && (
                    <Badge variant="secondary" className="bg-secondary text-secondary-foreground text-xs">
                      {filters.brands.length}
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pb-3 max-h-48 overflow-y-auto">
                  {brands.map((brand) => (
                    <div key={brand.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={brand.id}
                        checked={filters.brands.includes(brand.slug)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            onFilterChange({
                              brands: [...filters.brands, brand.slug],
                            })
                          } else {
                            onFilterChange({
                              brands: filters.brands.filter((b) => b !== brand.slug),
                            })
                          }
                        }}
                      />
                      <Label
                        htmlFor={brand.id}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {brand.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Stock */}
            <AccordionItem value="stock" className="border rounded-lg px-3">
              <AccordionTrigger className="py-3 text-sm font-medium hover:no-underline">
                Наличност
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex items-center space-x-2 pb-3">
                  <Checkbox
                    id="in-stock"
                    checked={filters.inStock}
                    onCheckedChange={(checked) =>
                      onFilterChange({ inStock: checked as boolean })
                    }
                  />
                  <Label
                    htmlFor="in-stock"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Само налични
                  </Label>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>

      {/* Sort */}
      <div className="p-4 border-t border-border">
        <Label className="text-sm font-medium mb-2 block">Сортирай по</Label>
        <Select
          value={filters.sortBy}
          onValueChange={(value) =>
            onFilterChange({ sortBy: value as FilterState['sortBy'] })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="price_asc">Цена: ниска към висока</SelectItem>
            <SelectItem value="price_desc">Цена: висока към ниска</SelectItem>
            <SelectItem value="rating">Най-високо оценени</SelectItem>
            <SelectItem value="name">Име: А-Я</SelectItem>
            <SelectItem value="popular">Най-популярни</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
