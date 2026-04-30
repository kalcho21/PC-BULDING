'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Category, Component } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/components/cart-provider'
import {
  Cpu,
  Monitor,
  HardDrive,
  CircuitBoard,
  MemoryStick,
  Fan,
  Box,
  Zap,
  ChevronRight,
  Sparkles,
  Target,
  Gauge,
  Shield,
  User,
  LayoutDashboard,
  Heart,
  GitCompare,
  Globe,
  Layers,
  LogOut,
  Menu,
  X,
  Users,
  Plus,
  ExternalLink,
  ShoppingCart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { ThemePicker } from '@/components/theme-picker'
import { CartHoverPreview } from '@/components/cart-hover-preview'

interface HomePageProps {
  categories: Category[]
  featuredComponents: Component[]
  presetComponents: Component[]
  categoryCounts: Record<string, number>
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

interface PresetCard {
  name: string
  description: string
  price: string
  /** Целева сума в € — същата се подава в конструктора за синтез около показаната цена */
  targetEur: number
  presetKey: string
  tier: string
  color: string
  borderColor: string
  keyParts: string[]
}

export function HomePage({ categories, featuredComponents, presetComponents, categoryCounts }: HomePageProps) {
  const router = useRouter()
  const { addToCart, totalItems } = useCart()
  const [user, setUser] = useState<{
    id?: string
    email?: string
    displayName?: string | null
  } | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const favoritesRef = useRef<Set<string>>(new Set())
  favoritesRef.current = favorites
  const [selectedPopularComponent, setSelectedPopularComponent] = useState<Component | null>(null)

  useEffect(() => {
    const supabase = createClient()
    void (async () => {
      const { data: auth } = await supabase.auth.getUser()
      const u = auth.user
      if (!u) {
        setUser(null)
        return
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', u.id)
        .maybeSingle()
      const metaName =
        typeof u.user_metadata?.full_name === 'string'
          ? u.user_metadata.full_name
          : typeof u.user_metadata?.name === 'string'
            ? u.user_metadata.name
            : null
      const displayName =
        profile?.full_name?.trim() || metaName?.trim() || null

      const touchKey = `presence_touch_${u.id}`
      const lastTouch =
        typeof window !== 'undefined' ? sessionStorage.getItem(touchKey) : null
      const now = Date.now()
      if (!lastTouch || now - Number(lastTouch) > 5 * 60 * 1000) {
        void supabase
          .from('profiles')
          .upsert(
            {
              id: u.id,
              email: u.email ?? null,
              full_name: displayName,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(touchKey, String(now))
        }
      }

      setUser({
        id: u.id,
        email: u.email,
        displayName,
      })
    })()
  }, [])

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function loadFavoriteIds() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        if (!cancelled) setFavorites(new Set())
        return
      }
      const { data } = await supabase
        .from('favorites')
        .select('component_id')
        .eq('user_id', authUser.id)
      if (cancelled) return
      setFavorites(new Set((data ?? []).map((r) => r.component_id).filter(Boolean)))
    }

    void loadFavoriteIds()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void loadFavoriteIds()
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price)
  }

  const handleToggleFavorite = useCallback(
    async (component: Component) => {
      const supabase = createClient()
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      if (!authUser) {
        toast.error('Влез в профила си, за да запазваш любими.')
        router.push('/auth/login')
        return
      }

      const wasFavorite = favoritesRef.current.has(component.id)
      if (wasFavorite) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', authUser.id)
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
        user_id: authUser.id,
        component_id: component.id,
      })
      if (error && error.code !== '23505') {
        toast.error(error.message || 'Неуспешно добавяне в любими.')
        return
      }
      setFavorites((prev) => new Set(prev).add(component.id))
      toast.success(`${component.name} е добавен в любими`)
    },
    [router]
  )

  const getSpecsList = useCallback((component: Component) => {
    const specs = component.specs || {}
    const categorySlug = component.category?.slug

    switch (categorySlug) {
      case 'cpu':
        return [
          { label: 'Ядра', value: specs.cores },
          { label: 'Boost', value: specs.boost_clock ? `${specs.boost_clock} GHz` : null },
          { label: 'Сокет', value: specs.socket },
        ]
      case 'gpu':
        return [
          { label: 'VRAM', value: specs.vram ? `${specs.vram}GB` : null },
          { label: 'TDP', value: specs.tdp ? `${specs.tdp}W` : null },
        ]
      case 'ram':
        return [
          { label: 'Капацитет', value: specs.capacity ? `${specs.capacity}GB` : null },
          { label: 'Честота', value: specs.speed ? `${specs.speed} MHz` : null },
        ]
      case 'storage':
        return [
          { label: 'Капацитет', value: specs.capacity ? `${specs.capacity}GB` : null },
          { label: 'Тип', value: specs.type ?? null },
        ]
      case 'psu':
        return [
          { label: 'Мощност', value: specs.wattage ? `${specs.wattage}W` : null },
          { label: 'Ефективност', value: specs.efficiency ?? null },
        ]
      default:
        return []
    }
  }, [])

  const presetBuilds = useMemo<PresetCard[]>(() => {
    const bySlug = (slug: string) =>
      presetComponents
        .filter((c) => c.category?.slug === slug && c.in_stock)
        .sort((a, b) => a.price - b.price)
    const pickClosest = (items: Component[], targetPrice: number, filter?: (c: Component) => boolean) => {
      const pool = filter ? items.filter(filter) : items
      if (pool.length === 0) return null
      return pool.reduce((best, curr) =>
        Math.abs(curr.price - targetPrice) < Math.abs(best.price - targetPrice) ? curr : best
      )
    }
    const pickUpper = (items: Component[], targetPrice: number, filter?: (c: Component) => boolean) => {
      const pool = (filter ? items.filter(filter) : items).sort((a, b) => a.price - b.price)
      if (pool.length === 0) return null
      const upper = pool.filter((c) => c.price >= targetPrice)
      if (upper.length > 0) return upper[0]
      return pool[Math.max(0, pool.length - 1)]
    }

    const cpuPool = bySlug('cpu')
    const gpuPool = bySlug('gpu')
    const ramPool = bySlug('ram')
    const mbPool = bySlug('motherboard')
    const storagePool = bySlug('storage')
    const psuPool = bySlug('psu')
    const casePool = bySlug('case')
    const coolingPool = bySlug('cooling')

    const tiers = [
      {
        name: 'Бюджетен Гейминг',
        description: 'Добър старт за 1080p',
        tier: 'Бюджет',
        presetKey: 'entry',
        targetEur: 1050,
        color: 'from-green-500/20 to-emerald-500/20',
        borderColor: 'border-green-500/30',
      },
      {
        name: 'Среден Клас',
        description: 'Баланс цена/производителност',
        tier: 'Среден клас',
        presetKey: 'mid',
        targetEur: 1550,
        color: 'from-blue-500/20 to-cyan-500/20',
        borderColor: 'border-blue-500/30',
      },
      {
        name: 'Високопроизводителен',
        description: 'Максимална мощност за тежки задачи',
        tier: 'Висок клас',
        presetKey: 'high-end',
        targetEur: 2600,
        color: 'from-purple-500/20 to-pink-500/20',
        borderColor: 'border-purple-500/30',
      },
    ]

    return tiers.map((tier) => {
      const isHigh = tier.presetKey === 'high-end'
      const picker = isHigh ? pickUpper : pickClosest
      const b = tier.targetEur
      const cpu = picker(cpuPool, b * 0.2)
      const mb = pickClosest(mbPool, b * 0.13, (c) => !cpu?.specs?.socket || c.specs?.socket === cpu.specs?.socket)
      const ram = pickClosest(ramPool, b * 0.1, (c) => !mb?.specs?.memory_type || c.specs?.type === mb.specs?.memory_type)
      const gpu = picker(gpuPool, b * 0.35)
      const storage = picker(storagePool, b * 0.09)
      const extraStorage = isHigh ? picker(storagePool, b * 0.06) : null
      const psu = picker(psuPool, b * 0.07)
      const casePart = picker(casePool, b * 0.04)
      const cooling = picker(coolingPool, b * 0.02)

      const parts = [cpu, mb, ram, gpu, storage, extraStorage, psu, casePart, cooling].filter(Boolean) as Component[]
      return {
        ...tier,
        price: `~${tier.targetEur} €`,
        keyParts: [cpu?.name, gpu?.name, ram?.name].filter(Boolean) as string[],
      }
    })
  }, [presetComponents])

  const navigation = [
    { name: 'Начало', href: '/', icon: LayoutDashboard, current: true },
    { name: 'Конфигуратор', href: '/builder', icon: Cpu },
    { name: 'Каталог', href: '/catalog', icon: Box },
    { name: 'Сравнение', href: '/compare', icon: GitCompare },
    { name: 'Общност', href: '/community', icon: Globe },
    { name: 'Количка', href: '/cart', icon: ShoppingCart },
    { name: 'Моите Сглобки', href: '/builds', icon: Layers },
    { name: 'Любими', href: '/favorites', icon: Heart },
  ]

  const featureHighlights = [
    { icon: Target, label: 'Съвместимост', desc: 'Автоматична проверка' },
    { icon: Gauge, label: 'Производителност', desc: 'FPS прогнози' },
    { icon: Shield, label: 'Качество', desc: 'Проверени части' },
    { icon: Zap, label: 'Мощност', desc: 'Изчисление на ватаж' },
  ]

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen w-64 border-r border-border/70 bg-card/95 backdrop-blur-xl flex flex-col transition-transform duration-300",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Close button for mobile */}
        <button
          className="absolute top-4 right-4 lg:hidden p-1"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo */}
        <div className="p-4 border-b border-border/70">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/70 shadow-lg shadow-primary/20">
              <Cpu className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">PC Builder</h1>
              <p className="text-xs text-muted-foreground">Модерен конфигуратор</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const linkClass = cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px]',
              item.current
                ? 'bg-primary/10 text-primary ring-1 ring-primary/15'
                : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
            )
            const inner = (
              <>
                <item.icon className="h-5 w-5" />
                {item.name}
                {item.href === '/cart' && totalItems > 0 ? (
                  <span className="ml-auto rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary tabular-nums">
                    {totalItems}
                  </span>
                ) : null}
              </>
            )
            if (item.href === '/cart') {
              return (
                <CartHoverPreview key={item.name} side="right" align="start">
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={linkClass}
                  >
                    {inner}
                  </Link>
                </CartHoverPreview>
              )
            }
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={linkClass}
              >
                {inner}
              </Link>
            )
          })}

          <Link
            href="/admin"
            onClick={() => setSidebarOpen(false)}
            className="mt-4 flex items-center gap-3 border-t border-border/70 px-3 pt-4 py-2.5 rounded-xl text-sm font-medium transition-colors min-h-[44px] text-muted-foreground hover:bg-muted/70 hover:text-foreground"
          >
            <Users className="h-5 w-5" />
            Персонал
          </Link>
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-border/70">
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/40 px-3 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.displayName || user.email}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start gap-2 rounded-xl text-muted-foreground min-h-[44px]"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                Изход
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Button asChild className="w-full min-h-[44px]">
                <Link href="/auth/login">Вход</Link>
              </Button>
              <Button asChild variant="outline" className="w-full min-h-[44px]">
                <Link href="/auth/sign-up">Регистрация</Link>
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="icon"
              className="min-h-[44px] min-w-[44px]"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link href="/" className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              <span className="font-bold">PC Builder</span>
            </Link>
            <Link href="/admin">
              <Button variant="ghost" size="icon" className="min-h-[44px] min-w-[44px]">
                <Users className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Desktop Header with Admin Button */}
        <header className="hidden lg:flex sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl items-center justify-end px-6 py-3">
          <div className="flex items-center gap-2">
            <CartHoverPreview side="bottom" align="end">
              <Button asChild variant="outline" className="rounded-xl border-border/70 bg-background/70">
                <Link href="/cart">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Количка
                  {totalItems > 0 ? (
                    <span className="ml-1 rounded-full bg-primary/12 px-2 py-0.5 text-xs text-primary">
                      {totalItems}
                    </span>
                  ) : null}
                </Link>
              </Button>
            </CartHoverPreview>
            <ThemePicker buttonClassName="rounded-xl border border-border/70 bg-background/70 hover:bg-secondary/80" />
          </div>
        </header>

        <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
          {/* Hero Section */}
          <section className="mb-8 md:mb-12">
            <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/20 via-background to-primary/5">
              <div className="absolute inset-0 bg-grid-white/5" />
              <div className="relative p-6 sm:p-8 md:p-12 lg:p-16">
                <Badge variant="secondary" className="mb-4">
                  <Sparkles className="mr-1 h-3 w-3" />
                  Нова версия 2.0
                </Badge>
                <h2 className="mb-4 max-w-2xl text-2xl font-bold text-balance sm:text-3xl md:text-4xl lg:text-5xl">
                  Сглоби мечтания си <span className="text-primary">компютър</span>
                </h2>
                <p className="mb-6 max-w-xl text-base text-muted-foreground text-pretty sm:mb-8 sm:text-lg">
                  Избери компоненти, провери съвместимостта и създай перфектната PC
                  конфигурация за твоите нужди.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
                  <Button size="lg" asChild className="min-h-[48px] gap-2">
                    <Link href="/builder">
                      Започни Сглобка
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild className="min-h-[48px]">
                    <Link href="/catalog">Разгледай Каталога</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Features */}
          <section className="mb-8 md:mb-12">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
              {featureHighlights.map((feature) => (
                <Card key={feature.label} className="bg-card/50">
                  <CardContent className="p-3 text-center sm:p-4">
                    <feature.icon className="mx-auto mb-2 h-6 w-6 text-primary sm:h-8 sm:w-8" />
                    <p className="text-xs font-medium sm:text-sm">{feature.label}</p>
                    <p className="hidden text-xs text-muted-foreground sm:block">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Quick Start Presets */}
          <section className="mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div>
                <h3 className="text-lg md:text-xl font-semibold">Бърз Старт</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Готови конфигурации за всеки бюджет</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              {presetBuilds.map((preset) => (
                <Card 
                  key={preset.name} 
                  className={cn(
                    "cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]",
                    preset.borderColor
                  )}
                  onClick={() =>
                    router.push(
                      `/builder?preset=${preset.presetKey}&quickBudget=1&budget=${preset.targetEur}`
                    )
                  }
                >
                  <CardContent className={cn("rounded-lg bg-gradient-to-br p-4 sm:p-6", preset.color)}>
                    <Badge variant="outline" className="mb-2 sm:mb-3">{preset.tier}</Badge>
                    <h4 className="mb-1 text-base font-semibold sm:text-lg">{preset.name}</h4>
                    <p className="mb-2 text-xs text-muted-foreground sm:mb-3 sm:text-sm">{preset.description}</p>
                    <p className="text-xl font-bold text-primary sm:text-2xl">{preset.price}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Component Categories */}
          <section className="mb-8 md:mb-12">
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div>
                <h3 className="text-lg md:text-xl font-semibold">Категории</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Разгледай компонентите по тип</p>
              </div>
              <Button variant="ghost" asChild className="hidden sm:flex">
                <Link href="/catalog">
                  Виж всички
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
              {categories.map((category) => {
                const Icon = categoryIcons[category.slug] || Box
                const count = categoryCounts[category.id] || 0
                return (
                  <Link
                    key={category.id}
                    href={`/catalog?category=${category.slug}`}
                    className="group"
                  >
                    <Card className="h-full rounded-[24px] border-border/70 bg-card/70 transition-all hover:border-primary/40 hover:-translate-y-1 hover:shadow-lg group-hover:bg-muted/20">
                      <CardContent className="flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20 shrink-0 sm:h-12 sm:w-12">
                          <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm sm:text-base truncate">{category.name}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{count} продукта</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
            <Button variant="ghost" asChild className="w-full mt-4 sm:hidden">
              <Link href="/catalog">
                Виж всички категории
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </section>

          {/* Featured Components */}
          <section>
            <div className="flex items-center justify-between mb-4 md:mb-6">
              <div>
                <h3 className="text-lg md:text-xl font-semibold">Популярни Продукти</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">Най-високо оценени компоненти с бърз достъп до детайли</p>
              </div>
              <Button variant="ghost" asChild className="hidden sm:flex">
                <Link href="/catalog">
                  Виж всички
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {featuredComponents.slice(0, 8).map((component) => {
                const Icon = categoryIcons[component.category?.slug || ''] || Box
                return (
                  <Card
                    key={component.id}
                    className="group cursor-pointer rounded-[24px] border-border/70 bg-card/70 transition-all hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg"
                    onClick={() => setSelectedPopularComponent(component)}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="mb-3 flex items-start justify-between sm:mb-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted/70">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <Badge variant="secondary" className="rounded-full text-xs">
                          {component.rating.toFixed(1)} ★
                        </Badge>
                      </div>
                      <p className="mb-1 truncate text-xs text-muted-foreground">{component.brand?.name}</p>
                      <h4 className="mb-3 min-h-[40px] text-sm font-medium line-clamp-2 sm:text-base">{component.name}</h4>
                      <p className="text-base font-bold text-primary sm:text-xl">
                        {formatPrice(component.price)}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">Кликни за действия</p>
                        <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            <Button variant="ghost" asChild className="w-full mt-4 sm:hidden">
              <Link href="/catalog">
                Виж всички продукти
                <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </section>
        </div>

        <Dialog open={!!selectedPopularComponent} onOpenChange={(open) => !open && setSelectedPopularComponent(null)}>
          <DialogContent className="max-h-[calc(100vh-2rem)] max-w-2xl overflow-y-auto">
            {selectedPopularComponent ? (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedPopularComponent.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">{selectedPopularComponent.brand?.name}</p>
                      <p className="text-2xl font-bold text-primary">{formatPrice(selectedPopularComponent.price)}</p>
                    </div>
                    <Badge variant={selectedPopularComponent.in_stock ? 'outline' : 'secondary'}>
                      {selectedPopularComponent.in_stock ? 'Наличен' : 'Изчерпан'}
                    </Badge>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-2">
                    {getSpecsList(selectedPopularComponent)
                      .filter((spec) => spec.value)
                      .map((spec) => (
                        <div key={spec.label} className="flex items-center justify-between rounded-lg border border-border p-2.5">
                          <span className="text-sm text-muted-foreground">{spec.label}</span>
                          <span className="text-sm font-medium">{String(spec.value)}</span>
                        </div>
                      ))}
                  </div>

                  <div className="grid gap-2">
                    <Button
                      variant="outline"
                      className="h-auto min-h-11 w-full min-w-0 whitespace-normal py-3 leading-tight"
                      onClick={() => {
                        addToCart(selectedPopularComponent)
                        toast.success(`${selectedPopularComponent.name} е добавен в количката`)
                      }}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Добави в количка
                    </Button>
                    <Button asChild className="h-auto min-h-11 w-full min-w-0 whitespace-normal py-3 leading-tight">
                      <Link href={`/builder?add=${selectedPopularComponent.id}`}>
                        <Plus className="h-4 w-4 mr-2" />
                        Добави в сглобка
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-auto min-h-11 w-full min-w-0 whitespace-normal py-3 leading-tight"
                      onClick={() => void handleToggleFavorite(selectedPopularComponent)}
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4 mr-2",
                          favorites.has(selectedPopularComponent.id) && "fill-red-500 text-red-500"
                        )}
                      />
                      {favorites.has(selectedPopularComponent.id) ? 'В любими' : 'Добави в любими'}
                    </Button>
                    <Button variant="ghost" asChild className="h-auto min-h-11 w-full min-w-0 whitespace-normal py-3 leading-tight">
                      <Link href={`/component/${selectedPopularComponent.slug}`}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Пълни характеристики
                      </Link>
                    </Button>
                  </div>
                </div>
              </>
            ) : null}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
