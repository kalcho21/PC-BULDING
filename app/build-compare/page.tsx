'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Build, Component } from '@/lib/types'
import { Header } from '@/components/header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GitCompare, ArrowLeft, Trophy, Gauge, Euro, Layers } from 'lucide-react'

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

function BuildComparePageContent() {
  const searchParams = useSearchParams()
  const [builds, setBuilds] = useState<BuildWithItems[]>([])
  const [loading, setLoading] = useState(true)

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

  const bestPerformance = useMemo(
    () => (builds.length ? Math.max(...builds.map((build) => build.performance_score || 0)) : 0),
    [builds]
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
                  Сравни цена, рейтинг и избраните компоненти между цели конфигурации.
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
              {builds.map((build) => (
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
                        <div className="font-semibold">{build.performance_score || 0}/100</div>
                        {build.performance_score === bestPerformance ? (
                          <div className="text-xs text-primary">Най-висок рейтинг</div>
                        ) : null}
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
              ))}
            </div>

            <Card className="border-border/60 bg-card/75">
              <CardHeader>
                <CardTitle>Компоненти по категории</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-3 text-left text-sm text-muted-foreground">Категория</th>
                      {builds.map((build) => (
                        <th key={build.id} className="p-3 text-left text-sm">
                          <div className="flex items-center gap-2">
                            <span>{build.name}</span>
                            {build.performance_score === bestPerformance ? (
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
