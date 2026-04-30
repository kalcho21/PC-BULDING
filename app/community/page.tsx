import Link from 'next/link'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { ArrowRight, Calendar, Globe, Layers, Sparkles, User } from 'lucide-react'
import { Header } from '@/components/header'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getSupabaseServiceConfig } from '@/lib/admin-api-auth'
import { createClient as createServerClient } from '@/lib/supabase/server'

type PublicBuildRow = {
  id: string
  user_id: string | null
  name: string | null
  description: string | null
  total_price: number | null
  performance_score: number | null
  created_at: string
  build_items: {
    id: string
    quantity: number
    component: {
      id: string
      name: string
      category: {
        name: string | null
        slug: string | null
      } | null
    } | null
  }[]
}

type RawPublicBuildRow = {
  id: string
  user_id: string | null
  name: string | null
  description: string | null
  total_price: number | null
  performance_score: number | null
  created_at: string
  build_items: {
    id: string
    quantity: number
    component:
      | PublicBuildRow['build_items'][number]['component']
      | PublicBuildRow['build_items'][number]['component'][]
      | null
  }[]
}

export default async function CommunityPage() {
  const cfg = getSupabaseServiceConfig()
  const supabase = cfg
    ? createSupabaseClient(cfg.url, cfg.serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : await createServerClient()

  const { data: buildsData } = await supabase
    .from('builds')
    .select(`
      id,
      user_id,
      name,
      description,
      total_price,
      performance_score,
      created_at,
      build_items (
        id,
        quantity,
        component:components (
          id,
          name,
          category:categories (
            name,
            slug
          )
        )
      )
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(24)

  const builds = (((buildsData || []) as unknown as RawPublicBuildRow[]).map((build) => ({
    ...build,
    build_items: (build.build_items || []).map((item) => ({
      ...item,
      component: Array.isArray(item.component) ? item.component[0] ?? null : item.component,
    })),
  })) as PublicBuildRow[]).filter((build) => build.build_items?.length > 0)

  const userIds = Array.from(
    new Set(builds.map((build) => build.user_id).filter(Boolean))
  ) as string[]

  let authorMap = new Map<string, { full_name?: string | null; email?: string | null }>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)

    authorMap = new Map(
      (profiles || []).map((profile) => [
        String(profile.id),
        { full_name: profile.full_name, email: profile.email },
      ])
    )
  }

  const formatPrice = (price: number | null) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price || 0)

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('bg-BG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.10),transparent_20%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_22%)]" />
      <Header />

      <main className="container relative mx-auto max-w-6xl px-4 py-6 space-y-6">
        <Card className="overflow-hidden border-border/60 bg-card/70 shadow-lg backdrop-blur">
          <CardContent className="p-0">
            <div className="grid gap-0 lg:grid-cols-[1.4fr_0.9fr]">
              <div className="border-b border-border/60 p-6 lg:border-b-0 lg:border-r">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Публични сглобки от общността
                </div>
                <h1 className="mt-4 text-3xl font-bold">Споделени PC конфигурации</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Разгледай публичните сглобки на други потребители, виж какво са избрали и
                  отвори конфигурацията, за да я прегледаш по-подробно.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 p-6">
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="text-xs text-muted-foreground">Публични</div>
                  <div className="mt-1 text-2xl font-semibold">{builds.length}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="text-xs text-muted-foreground">Създатели</div>
                  <div className="mt-1 text-2xl font-semibold">{authorMap.size}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="text-xs text-muted-foreground">Видимост</div>
                  <div className="mt-1 text-base font-semibold">Публична</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {builds.length === 0 ? (
          <Card className="border-border/60 bg-card/70 shadow-sm backdrop-blur">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Globe className="mb-4 h-14 w-14 text-muted-foreground/30" />
              <h2 className="text-xl font-semibold">Все още няма публични сглобки</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Запази своя конфигурация като публична и тя ще се появи тук за всички.
              </p>
              <Link href="/builder" className="mt-6">
                <Button>Създай публична сглобка</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {builds.map((build) => {
              const author = build.user_id ? authorMap.get(build.user_id) : null
              const authorLabel =
                author?.full_name?.trim() || author?.email?.trim() || 'Потребител от общността'
              const previewParts = build.build_items
                .map((item) => item.component?.category?.name)
                .filter(Boolean)
                .slice(0, 5)

              return (
                <Card
                  key={build.id}
                  className="border-border/60 bg-card/70 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <CardHeader className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge className="rounded-full border-0 bg-primary/10 text-primary">
                        <Globe className="mr-1 h-3.5 w-3.5" />
                        Публична
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(build.created_at)}</span>
                    </div>
                    <div>
                      <CardTitle className="line-clamp-2 text-xl">
                        {build.name?.trim() || 'Публична сглобка'}
                      </CardTitle>
                      <CardDescription className="mt-2 line-clamp-2">
                        {build.description?.trim() || 'Споделена конфигурация от общността.'}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span className="truncate">{authorLabel}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                        <div className="text-xs text-muted-foreground">Цена</div>
                        <div className="mt-1 text-lg font-semibold text-primary">
                          {formatPrice(build.total_price)}
                        </div>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
                        <div className="text-xs text-muted-foreground">Производителност</div>
                        <div className="mt-1 text-lg font-semibold">
                          {build.performance_score || 0}/100
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Layers className="h-4 w-4 text-primary" />
                        Части в сглобката
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {previewParts.map((part, index) => (
                          <Badge key={`${build.id}-${index}`} variant="secondary" className="rounded-full">
                            {part}
                          </Badge>
                        ))}
                        {build.build_items.length > 5 ? (
                          <Badge variant="outline" className="rounded-full">
                            +{build.build_items.length - 5} още
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(build.created_at)}
                      </span>
                      <span>{build.build_items.length} компонента</span>
                    </div>

                    <Link href={`/builder?build=${build.id}`}>
                      <Button className="w-full rounded-xl">
                        Отвори сглобката
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
