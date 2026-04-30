'use client'

import { BuildState, Component, CompatibilityIssue, PerformanceMetrics } from '@/lib/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Cpu,
  MonitorUp,
  MemoryStick,
  CircuitBoard,
  HardDrive,
  Zap,
  Box,
  Fan,
  Plus,
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Save,
  Share2,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const buildSlots = [
  { key: 'cpu', label: 'Процесор', icon: Cpu, required: true },
  { key: 'gpu', label: 'Видеокарта', icon: MonitorUp, required: true },
  { key: 'motherboard', label: 'Дънна платка', icon: CircuitBoard, required: true },
  { key: 'ram', label: 'RAM памет', icon: MemoryStick, required: true },
  { key: 'storage', label: 'Съхранение', icon: HardDrive, required: true, multiple: true },
  { key: 'psu', label: 'Захранване', icon: Zap, required: true },
  { key: 'case', label: 'Кутия', icon: Box, required: false },
  { key: 'cooling', label: 'Охлаждане', icon: Fan, required: false },
] as const

interface BuildSidebarProps {
  build: BuildState
  onRemoveComponent: (slot: keyof BuildState, index?: number) => void
  onSelectSlot: (slot: string) => void
  selectedSlot: string | null
  compatibilityIssues: CompatibilityIssue[]
  performanceMetrics: PerformanceMetrics
  onSaveBuild?: () => void
  onShareBuild?: () => void
  onClearBuild?: () => void
  onAutoGenerate?: () => void
}

export function BuildSidebar({
  build,
  onRemoveComponent,
  onSelectSlot,
  selectedSlot,
  compatibilityIssues,
  performanceMetrics,
  onSaveBuild,
  onShareBuild,
  onClearBuild,
  onAutoGenerate,
}: BuildSidebarProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(price)
  }

  const calculateTotalPrice = () => {
    let total = 0
    if (build.cpu) total += build.cpu.price
    if (build.gpu) total += build.gpu.price
    if (build.motherboard) total += build.motherboard.price
    if (build.ram) total += build.ram.price
    if (build.psu) total += build.psu.price
    if (build.case) total += build.case.price
    if (build.cooling) total += build.cooling.price
    build.storage.forEach(s => total += s.price)
    return total
  }

  const getComponent = (slot: typeof buildSlots[number]): Component | Component[] | null => {
    if (slot.key === 'storage') {
      return build.storage
    }
    return build[slot.key as keyof Omit<BuildState, 'storage'>]
  }

  const hasErrors = compatibilityIssues.some(i => i.type === 'error')
  const hasWarnings = compatibilityIssues.some(i => i.type === 'warning')

  const filledSlots = buildSlots.filter(slot => {
    const component = getComponent(slot)
    if (Array.isArray(component)) return component.length > 0
    return component !== null
  }).length

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-lg">Твоята сглобка</h2>
          <Badge variant="outline" className="font-mono">
            {filledSlots}/{buildSlots.length}
          </Badge>
        </div>
        <p className="text-2xl font-bold text-primary">{formatPrice(calculateTotalPrice())}</p>
      </div>

      {/* Compatibility Status */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          {hasErrors ? (
            <AlertCircle className="h-4 w-4 text-destructive" />
          ) : hasWarnings ? (
            <AlertTriangle className="h-4 w-4 text-warning" />
          ) : (
            <CheckCircle className="h-4 w-4 text-success" />
          )}
          <span className="text-sm font-medium">
            {hasErrors
              ? 'Проблеми със съвместимостта'
              : hasWarnings
              ? 'Открити предупреждения'
              : 'Всичко е съвместимо'}
          </span>
        </div>
        {compatibilityIssues.length > 0 && (
          <div className="space-y-1">
            {compatibilityIssues.slice(0, 2).map((issue, i) => (
              <p key={i} className={cn(
                'text-xs',
                issue.type === 'error' ? 'text-destructive' : 'text-warning'
              )}>
                {issue.message}
              </p>
            ))}
            {compatibilityIssues.length > 2 && (
              <p className="text-xs text-muted-foreground">
                +{compatibilityIssues.length - 2} още проблема
              </p>
            )}
          </div>
        )}
      </div>

      {/* Components List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {buildSlots.map((slot) => {
            const Icon = slot.icon
            const component = getComponent(slot)
            const isSelected = selectedSlot === slot.key
            const isEmpty = Array.isArray(component) ? component.length === 0 : !component

            if (slot.key === 'storage' && Array.isArray(component)) {
              return (
                <div key={slot.key} className="space-y-2">
                  {component.map((storage, index) => (
                    <Card
                      key={storage.id}
                      className={cn(
                        'cursor-pointer transition-all hover:border-primary/50',
                        isSelected && 'border-primary'
                      )}
                      onClick={() => onSelectSlot(slot.key)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">{slot.label}</p>
                            <p className="text-sm font-medium truncate">{storage.name}</p>
                            <p className="text-xs text-primary">{formatPrice(storage.price)}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={(e) => {
                              e.stopPropagation()
                              onRemoveComponent('storage', index)
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Card
                    className={cn(
                      'cursor-pointer border-dashed transition-all hover:border-primary/50',
                      isSelected && 'border-primary'
                    )}
                    onClick={() => onSelectSlot(slot.key)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary">
                          <Plus className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Добави {slot.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            }

            return (
              <Card
                key={slot.key}
                className={cn(
                  'cursor-pointer transition-all hover:border-primary/50',
                  isSelected && 'border-primary',
                  isEmpty && 'border-dashed'
                )}
                onClick={() => onSelectSlot(slot.key)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-md',
                      isEmpty ? 'bg-secondary' : 'bg-primary/10'
                    )}>
                      {isEmpty ? (
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Icon className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <p className="text-xs text-muted-foreground">{slot.label}</p>
                        {slot.required && isEmpty && (
                          <span className="text-xs text-destructive">*</span>
                        )}
                      </div>
                      {isEmpty ? (
                        <p className="text-sm text-muted-foreground">Избери {slot.label}</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium truncate">
                            {(component as Component).name}
                          </p>
                          <p className="text-xs text-primary">
                            {formatPrice((component as Component).price)}
                          </p>
                        </>
                      )}
                    </div>
                    {!isEmpty && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          onRemoveComponent(slot.key as keyof BuildState)
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </ScrollArea>

      {/* Performance Score */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Производителност</span>
          <span className="text-lg font-bold text-primary">{performanceMetrics.overall}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20">Гейминг</span>
            <Progress value={performanceMetrics.gaming} className="h-2 flex-1" />
            <span className="text-xs font-medium w-8">{performanceMetrics.gaming}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20">Работа</span>
            <Progress value={performanceMetrics.productivity} className="h-2 flex-1" />
            <span className="text-xs font-medium w-8">{performanceMetrics.productivity}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-20">Стрийминг</span>
            <Progress value={performanceMetrics.streaming} className="h-2 flex-1" />
            <span className="text-xs font-medium w-8">{performanceMetrics.streaming}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button 
          className="w-full gap-2" 
          onClick={onAutoGenerate}
        >
          <Sparkles className="h-4 w-4" />
          Автоматична сглобка
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={onSaveBuild}>
            <Save className="h-4 w-4" />
            Запази
          </Button>
          <Button variant="outline" className="flex-1 gap-2" onClick={onShareBuild}>
            <Share2 className="h-4 w-4" />
            Сподели
          </Button>
          <Button variant="outline" size="icon" onClick={onClearBuild}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
