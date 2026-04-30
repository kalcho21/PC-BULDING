'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Build, BuildState, Component } from '@/lib/types'
import { estimateBuildWattage } from '@/lib/build-wattage'
import { analyzeBuildPerformance } from '@/lib/build-performance-score'
import { estimateFps, getPerformanceSummary } from '@/lib/compatibility'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { GitCompare, ArrowLeft, Trophy, Gauge, Euro, Layers, Zap, Gamepad2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BuildWithItems extends Build {
  build_items: {
    id: string
    quantity: number
    component: Component
  }[]
}

const categoryOrder = [
  'cpu',
  'gpu',
  'motherboard',
  'ram',
  'storage',
  'psu',
  'case',
  'cooling',
]

/** Игри за ред в таблицата FPS — съвпадат с ключовете в `estimateFps`. */
const FPS_COMPARE_GAMES = [
  'Counter-Strike 2',
  'Valorant',
  'Fortnite',
  'Call of Duty: Warzone 2',
  'Cyberpunk 2077',
  'GTA V',
] as const

function componentModelLabel(c: Component | null): string | undefined {
  if (!c) return undefined
  const m = c.model?.trim()
  return m || c.name
}

function buildWithItemsToBuildState(build: BuildWithItems): BuildState {
  const firstBySlug = (slug: string): Component | null => {
    const item = build.build_items.find((row) => row.component?.category?.slug === slug)
    return item?.component ?? null
  }

  const storageComponents: Component[] = build.build_items
    .filter((row) => row.component?.category?.slug === 'storage')
    .flatMap((row) => Array.from({ length: Math.max(1, row.quantity) }, () => row.component))

  return {
    cpu: firstBySlug('cpu'),
    gpu: firstBySlug('gpu'),
    ram: firstBySlug('ram'),
    motherboard: firstBySlug('motherboard'),
    storage: storageComponents,
    psu: firstBySlug('psu'),
    case: firstBySlug('case'),
    cooling: firstBySlug('cooling'),
  }
}

function BuildComparePageContent() {
  const searchParams = useSearchParams()
  const [builds, setBuilds] = useState<BuildWithItems[]>([])
  const [loading, setLoading] = useState(true)
  const [fpsResolution, setFpsResolution] = useState<'1080p' | '1440p' | '4K'>('1080p')

  useEffect(() => {
    const ids = (searchParams.get('ids') || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 3)

    if (ids.length === 0) {
      setBuilds([])
      setLoading(false)
      return
    }

    void (async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('builds')
        .select(
          `
          *,
          build_items (
            id,
            quantity,
            component:components (
              *,
              category:categories (*),
              brand:brands (*)
            )
          )
        `
        )
        .in('id', ids)

      setBuilds((data as BuildWithItems[] | null) ?? [])
      setLoading(false)
    })()
  }, [searchParams])

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price || 0)

  const bestPrice = useMemo(
    () => (builds.length ? Math.min(...builds.map((build) => build.total_price || 0)) : 0),
    [builds]
  )

  const buildMetrics = useMemo(() => {
    return builds.map((build) => {
      const state = buildWithItemsToBuildState(build)
      const analyzed = analyzeBuildPerformance(state)
      const gpuModel = componentModelLabel(state.gpu)
      const cpuModel = componentModelLabel(state.cpu)
      const fpsResults = estimateFps(gpuModel, cpuModel)
      const summary = getPerformanceSummary(gpuModel, cpuModel)
      const wattage = estimateBuildWattage(state)

      const ramItem = build.build_items.find((row) => row.component?.category?.slug === 'ram')
      const ramCapacity = state.ram?.specs?.capacity
      const ramGb =
        typeof ramCapacity === 'number' && ramCapacity > 0
          ? Math.round(ramCapacity * Math.max(1, ramItem?.quantity ?? 1))
          : null

      const psuWatts = typeof state.psu?.specs?.wattage === 'number' ? state.psu.specs.wattage : null

      return {
        state,
        gpuModel,
        cpuModel,
        fpsResults,
        summary,
        wattage,
        ramGb,
        psuWatts,
        livePerformanceScore: analyzed.performanceScore,
      }
    })
  }, [builds])

  const bestPerformance = useMemo(
    () =>
      buildMetrics.length ? Math.max(...buildMetrics.map((row) => row.livePerformanceScore)) : 0,
    [buildMetrics]
  )

  const getCategoryComponent = (build: BuildWithItems, categorySlug: string) => {
    const items = build.build_items.filter((item) => item.component?.category?.slug === categorySlug)
    if (items.length === 0) return 'Няма'
    return items.map((item) => `${item.component.name}${item.quantity > 1 ? ` x${item.quantity}` : ''}`).join(', ')
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                <GitCompare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-semibold">Сравнение на сглобки</h1>
                <p className="text-sm text-muted-foreground">
                  Сравни цена, рейтинг, приблизителни FPS в игри, консумация и избраните компоненти.
                </p>
              </div>
            </div>
          </div>
          <Button asChild variant="outline">
            <Link href="/builds">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Назад
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border/60 bg-card/75 p-10 text-center text-muted-foreground">
            Зареждане...
          </div>
        ) : builds.length < 2 ? (
          <div className="rounded-2xl border border-border/60 bg-card/75 p-10 text-center">
            <p className="text-lg font-medium">Избери поне 2 сглобки за сравнение.</p>
            <Button asChild className="mt-4">
              <Link href="/builds">Към сглобките</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-3">
              {builds.map((build, idx) => {
                const m = buildMetrics[idx]
                const hasGpu = Boolean(m?.gpuModel)
                return (
                <Card key={build.id} className="border-border/60 bg-card/75">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span className="line-clamp-2">{build.name}</span>
                      <Badge variant={build.is_public ? 'default' : 'secondary'}>
                        {build.is_public ? 'Публична' : 'Скрита'}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Euro className="h-4 w-4" />
                        Цена
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{formatPrice(build.total_price || 0)}</div>
                        {build.total_price === bestPrice ? (
                          <div className="text-xs text-primary">Най-ниска цена</div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Gauge className="h-4 w-4" />
                        Производителност
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{m?.livePerformanceScore ?? 0}/100</div>
                        {(m?.livePerformanceScore ?? 0) === bestPerformance && bestPerformance > 0 ? (
                          <div className="text-xs text-primary">Най-висок рейтинг</div>
                        ) : null}
                        <div className="text-[11px] text-muted-foreground">
                          По текущите части (като в конфигуратора)
                        </div>
                      </div>
                    </div>
                    {hasGpu && m ? (
                      <div className="flex items-start justify-between gap-2 rounded-xl bg-muted/30 p-3">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Gamepad2 className="h-4 w-4 shrink-0" />
                          Клас (GPU)
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={cn('text-xs', m.summary.tierColor)}>
                            {m.summary.tier}
                          </Badge>
                          <p className="mt-1 max-w-[14rem] text-xs text-muted-foreground leading-snug">
                            {m.summary.description}
                          </p>
                          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <span className="text-muted-foreground">Esports · </span>
                              <span className="font-medium text-green-400">{m.summary.expectedFps.esports}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">AAA · </span>
                              <span className="font-medium text-amber-400">{m.summary.expectedFps.aaa}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Zap className="h-4 w-4" />
                        Консумация (~)
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{m ? `${m.wattage} W` : '—'}</div>
                        <div className="text-xs text-muted-foreground">ориентировъчно натоварване</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-muted/30 p-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Layers className="h-4 w-4" />
                        Части
                      </div>
                      <div className="font-semibold">{build.build_items.length}</div>
                    </div>
                  </CardContent>
                </Card>
                )
              })}
            </div>

            {buildMetrics.some((m) => m.gpuModel) ? (
              <Card className="border-border/60 bg-card/75">
                <CardHeader className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Gamepad2 className="h-5 w-5 text-primary" />
                      FPS в игри (Ultra)
                    </CardTitle>
                    <Tabs
                      value={fpsResolution}
                      onValueChange={(v) => setFpsResolution(v as '1080p' | '1440p' | '4K')}
                    >
                      <TabsList className="h-9">
                        <TabsTrigger value="1080p" className="text-xs px-3">
                          1080p
                        </TabsTrigger>
                        <TabsTrigger value="1440p" className="text-xs px-3">
                          1440p
                        </TabsTrigger>
                        <TabsTrigger value="4K" className="text-xs px-3">
                          4K
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Приблизителни стойности по модел CPU/GPU от каталога; реалните FPS зависят от настройки,
                    драйвери и конкретна игра.
                  </p>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="p-3 text-left text-sm text-muted-foreground">Игра</th>
                        {builds.map((build, bi) => (
                          <th key={build.id} className="p-3 text-left text-sm">
                            <div className="flex items-center gap-2">
                              <span className="line-clamp-2">{build.name}</span>
                              {!buildMetrics[bi]?.gpuModel ? (
                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                  без GPU
                                </Badge>
                              ) : null}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {FPS_COMPARE_GAMES.map((gameName) => {
                        const fpsValues = builds.map((_, bi) => {
                          const results = buildMetrics[bi]?.fpsResults ?? []
                          const row = results.find((r) => r.game === gameName)
                          const est = row?.estimates.find((e) => e.resolution === fpsResolution)
                          return est?.ultra ?? null
                        })
                        const valid = fpsValues.filter((v): v is number => v != null && v > 0)
                        const maxFps = valid.length ? Math.max(...valid) : 0
                        return (
                          <tr key={gameName} className="border-b border-border/60">
                            <td className="p-3 text-sm font-medium">{gameName}</td>
                            {fpsValues.map((fps, bi) => (
                              <td key={`${gameName}-${builds[bi]?.id}`} className="p-3 text-sm">
                                {fps == null || fps <= 0 ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : (
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-1.5 font-semibold',
                                      fps === maxFps && maxFps > 0 ? 'text-primary' : ''
                                    )}
                                  >
                                    {fps === maxFps && maxFps > 0 ? (
                                      <Trophy className="h-3.5 w-3.5 text-yellow-500 shrink-0" />
                                    ) : null}
                                    {fps} FPS
                                  </span>
                                )}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/60 bg-card/75 border-dashed">
                <CardContent className="py-6 text-sm text-muted-foreground">
                  За сравнение на FPS добави видеокарта в двете сглобки. Оценките се базират на модела на CPU и GPU.
                </CardContent>
              </Card>
            )}

            <Card className="border-border/60 bg-card/75">
              <CardHeader>
                <CardTitle>Компоненти по категории</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 text-left text-sm text-muted-foreground">Категория</th>
                      {builds.map((build, bi) => (
                        <th key={build.id} className="p-3 text-left text-sm">
                          <div className="flex items-center gap-2">
                            <span>{build.name}</span>
                            {(buildMetrics[bi]?.livePerformanceScore ?? 0) === bestPerformance &&
                            bestPerformance > 0 ? (
                              <Trophy className="h-4 w-4 text-yellow-500" />
                            ) : null}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {categoryOrder.map((categorySlug) => (
                      <tr key={categorySlug} className="border-b border-border/60 align-top">
                        <td className="p-3 font-medium uppercase text-xs tracking-wide text-muted-foreground">
                          {categorySlug}
                        </td>
                        {builds.map((build) => (
                          <td key={`${build.id}-${categorySlug}`} className="p-3 text-sm">
                            {getCategoryComponent(build, categorySlug)}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-b border-border/60 align-top">
                      <td className="p-3 font-medium uppercase text-xs tracking-wide text-muted-foreground">
                        RAM (GB)
                      </td>
                      {builds.map((build, bi) => (
                        <td key={`${build.id}-ram-gb`} className="p-3 text-sm">
                          {buildMetrics[bi]?.ramGb != null ? `${buildMetrics[bi].ramGb} GB` : '—'}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b border-border/60 align-top">
                      <td className="p-3 font-medium uppercase text-xs tracking-wide text-muted-foreground">
                        PSU (номинал)
                      </td>
                      {builds.map((build, bi) => (
                        <td key={`${build.id}-psu-nom`} className="p-3 text-sm">
                          {buildMetrics[bi]?.psuWatts != null ? `${buildMetrics[bi].psuWatts} W` : '—'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

export default function BuildComparePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-svh flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Зареждане...</div>
        </main>
      }
    >
      <BuildComparePageContent />
    </Suspense>
  )
}
