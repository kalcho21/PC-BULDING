'use client'

import { Component } from '@/lib/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Heart, 
  Plus, 
  Star, 
  Cpu, 
  MonitorUp, 
  MemoryStick, 
  CircuitBoard, 
  HardDrive, 
  Zap, 
  Box, 
  Fan,
  GitCompare
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

interface ComponentCardProps {
  component: Component
  onAddToBuild?: (component: Component) => void
  onToggleFavorite?: (component: Component) => void
  onCompare?: (component: Component) => void
  isFavorite?: boolean
  isInBuild?: boolean
  isComparing?: boolean
  showActions?: boolean
}

export function ComponentCard({
  component,
  onAddToBuild,
  onToggleFavorite,
  onCompare,
  isFavorite = false,
  isInBuild = false,
  isComparing = false,
  showActions = true,
}: ComponentCardProps) {
  const categorySlug = component.category?.slug || 'cpu'
  const Icon = categoryIcons[categorySlug] || Cpu

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  const getSpecsSummary = () => {
    const specs = component.specs
    switch (categorySlug) {
      case 'cpu':
        return `${specs.cores} Cores / ${specs.threads} Threads • ${specs.boost_clock} GHz`
      case 'gpu':
        return `${specs.vram}GB ${specs.vram_type} • ${specs.boost_clock} MHz`
      case 'ram':
        return `${specs.capacity}GB ${specs.type} • ${specs.speed} MHz`
      case 'motherboard':
        return `${specs.socket} • ${specs.chipset} • ${specs.form_factor}`
      case 'storage':
        return `${specs.capacity >= 1000 ? `${specs.capacity / 1000}TB` : `${specs.capacity}GB`} ${specs.type} • ${specs.read_speed} MB/s`
      case 'psu':
        return `${specs.wattage}W • ${specs.efficiency} • ${specs.modular}`
      case 'case':
        return `${specs.form_factor} • ${specs.radiator_support}mm Rad`
      case 'cooling':
        return `${specs.type} • ${specs.tdp_rating}W TDP`
      default:
        return ''
    }
  }

  return (
    <Card className={cn(
      'group relative overflow-hidden transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5',
      isInBuild && 'border-primary/50 bg-primary/5'
    )}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{component.brand?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{categorySlug}</p>
            </div>
          </div>
          {showActions && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => onToggleFavorite?.(component)}
            >
              <Heart className={cn(
                'h-4 w-4 transition-colors',
                isFavorite ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
              )} />
            </Button>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm mb-1 line-clamp-2 min-h-[2.5rem]">
          {component.name}
        </h3>

        {/* Specs Summary */}
        <p className="text-xs text-muted-foreground mb-3 line-clamp-1">
          {getSpecsSummary()}
        </p>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
          <span className="text-xs font-medium">{component.rating.toFixed(1)}</span>
          <span className="text-xs text-muted-foreground">({component.review_count})</span>
        </div>

        {/* Price and Actions */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-lg font-bold text-primary">{formatPrice(component.price)}</p>
            {component.in_stock ? (
              <Badge variant="secondary" className="text-xs bg-success/10 text-success border-0">
                Наличен
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs bg-destructive/10 text-destructive border-0">
                Изчерпан
              </Badge>
            )}
          </div>
          {showActions && (
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => onCompare?.(component)}
              >
                <GitCompare className={cn(
                  'h-4 w-4',
                  isComparing && 'text-accent'
                )} />
              </Button>
              <Button
                size="icon"
                className="h-8 w-8"
                onClick={() => onAddToBuild?.(component)}
                disabled={isInBuild}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
