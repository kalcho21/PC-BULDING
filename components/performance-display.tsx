'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Gamepad2, Monitor, Cpu, Gauge, Zap, TrendingUp, Info } from 'lucide-react'
import { estimateFps, getPerformanceSummary, type FpsEstimateResult, type PerformanceSummary } from '@/lib/compatibility'
import { cn } from '@/lib/utils'

interface PerformanceDisplayProps {
  gpuModel?: string
  cpuModel?: string
  performanceScore: number
}

export function PerformanceDisplay({ gpuModel, cpuModel, performanceScore }: PerformanceDisplayProps) {
  const [selectedResolution, setSelectedResolution] = useState<'1080p' | '1440p' | '4K'>('1080p')
  
  const fpsEstimates = estimateFps(gpuModel, cpuModel)
  const summary = getPerformanceSummary(gpuModel, cpuModel)

  const getFpsColor = (fps: number) => {
    if (fps >= 144) return 'text-green-400'
    if (fps >= 60) return 'text-yellow-400'
    if (fps >= 30) return 'text-orange-400'
    return 'text-red-400'
  }

  const getFpsBarColor = (fps: number) => {
    if (fps >= 144) return 'bg-green-500'
    if (fps >= 60) return 'bg-yellow-500'
    if (fps >= 30) return 'bg-orange-500'
    return 'bg-red-500'
  }

  if (!gpuModel) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Производителност
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Добавете видеокарта, за да видите очакваната производителност в игри.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card/50 border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Производителност
          </CardTitle>
          <Badge variant="outline" className={cn('text-xs', summary.tierColor)}>
            {summary.tier}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Performance Summary */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{summary.description}</p>
          
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-background/50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Zap className="h-3 w-3" />
                Esports
              </div>
              <div className="font-medium text-green-400">{summary.expectedFps.esports}</div>
            </div>
            <div className="bg-background/50 rounded-lg p-2">
              <div className="flex items-center gap-1 text-muted-foreground mb-1">
                <Gamepad2 className="h-3 w-3" />
                AAA игри
              </div>
              <div className="font-medium text-yellow-400">{summary.expectedFps.aaa}</div>
            </div>
          </div>
        </div>

        {/* Overall Score */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Общ резултат</span>
            <span className="font-medium">{performanceScore}/100</span>
          </div>
          <Progress value={performanceScore} className="h-2" />
        </div>

        {/* Resolution Selector */}
        <div className="flex items-center gap-2">
          <Monitor className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedResolution} onValueChange={(v) => setSelectedResolution(v as any)}>
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1080p">1080p (Full HD)</SelectItem>
              <SelectItem value="1440p">1440p (QHD)</SelectItem>
              <SelectItem value="4K">4K (UHD)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* FPS Estimates */}
        <Tabs defaultValue="popular" className="w-full">
          <TabsList className="w-full h-8 grid grid-cols-2">
            <TabsTrigger value="popular" className="text-xs">Популярни</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">Всички</TabsTrigger>
          </TabsList>
          
          <TabsContent value="popular" className="mt-2 space-y-2">
            {fpsEstimates
              .filter(g => ['Counter-Strike 2', 'Fortnite', 'Cyberpunk 2077', 'Call of Duty: Warzone 2', 'Valorant'].includes(g.game))
              .map((game) => {
                const resData = game.estimates.find(e => e.resolution === selectedResolution)
                if (!resData) return null
                
                return (
                  <FpsGameRow
                    key={game.game}
                    game={game.game}
                    fps={resData.ultra}
                    fpsHigh={resData.high}
                    getFpsColor={getFpsColor}
                    getFpsBarColor={getFpsBarColor}
                  />
                )
              })}
          </TabsContent>
          
          <TabsContent value="all" className="mt-2 space-y-2 max-h-48 overflow-y-auto">
            {fpsEstimates.map((game) => {
              const resData = game.estimates.find(e => e.resolution === selectedResolution)
              if (!resData) return null
              
              return (
                <FpsGameRow
                  key={game.game}
                  game={game.game}
                  fps={resData.ultra}
                  fpsHigh={resData.high}
                  getFpsColor={getFpsColor}
                  getFpsBarColor={getFpsBarColor}
                />
              )
            })}
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground pt-2 border-t border-border/50">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span>144+ FPS</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" />
            <span>60+ FPS</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-orange-500" />
            <span>30+ FPS</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function FpsGameRow({
  game,
  fps,
  fpsHigh,
  getFpsColor,
  getFpsBarColor,
}: {
  game: string
  fps: number
  fpsHigh: number
  getFpsColor: (fps: number) => string
  getFpsBarColor: (fps: number) => string
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 group cursor-default">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{game}</div>
              <div className="h-1.5 bg-background/50 rounded-full overflow-hidden mt-1">
                <div
                  className={cn('h-full rounded-full transition-all', getFpsBarColor(fps))}
                  style={{ width: `${Math.min((fps / 144) * 100, 100)}%` }}
                />
              </div>
            </div>
            <div className={cn('text-xs font-mono font-medium w-14 text-right', getFpsColor(fps))}>
              {fps} FPS
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
          <div className="space-y-1">
            <div className="font-medium">{game}</div>
            <div className="text-muted-foreground">Ultra: {fps} FPS</div>
            <div className="text-muted-foreground">High: {fpsHigh} FPS</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
