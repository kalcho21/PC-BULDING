'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCart } from '@/components/cart-provider'
import { CartHoverPreview } from '@/components/cart-hover-preview'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  Cpu, 
  House,
  LayoutDashboard, 
  Heart, 
  GitCompare, 
  Globe,
  User as UserIcon,
  Menu,
  Layers,
  LogOut,
  ShoppingCart,
  MoreHorizontal,
  Wrench,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { ThemePicker } from '@/components/theme-picker'

const primaryNavigation = [
  { name: 'Начало', href: '/', icon: House },
  { name: 'Каталог', href: '/catalog', icon: LayoutDashboard },
  { name: 'Сглобка', href: '/builder', icon: Wrench },
  { name: 'Сглобки', href: '/builds', icon: Layers },
]

const secondaryNavigation = [
  { name: 'Сравнение', href: '/compare', icon: GitCompare },
  { name: 'Общност', href: '/community', icon: Globe },
  { name: 'Любими', href: '/favorites', icon: Heart },
]

export function Header() {
  const pathname = usePathname()
  const { totalItems } = useCart()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<{
    email?: string
    displayName?: string | null
  } | null>(null)

  useEffect(() => {
    const supabase = createClient()

    async function applyAuthUser(u: User | null) {
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

      setUser({ email: u.email, displayName })
    }

    void supabase.auth.getUser().then(({ data }) => applyAuthUser(data.user))

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void applyAuthUser(session?.user ?? null)
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setUser(null)
    window.location.assign('/')
  }

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-14 sm:h-16 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary">
              <Cpu className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-base sm:text-lg hidden sm:block">PC Конфигуратор</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {primaryNavigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden lg:flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 rounded-xl">
                    <MoreHorizontal className="h-4 w-4" />
                    Още
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl">
                  {secondaryNavigation.map((item) => {
                    const Icon = item.icon
                    return (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link href={item.href} className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {item.name}
                        </Link>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="hidden sm:inline-block">
              <CartHoverPreview side="bottom" align="end">
                <Button
                  asChild
                  variant={pathname === '/cart' ? 'default' : 'outline'}
                  size="sm"
                  className="relative gap-2 rounded-xl px-3"
                  aria-haspopup="true"
                >
                  <Link href="/cart" title="Посочи за преглед на количката">
                    <ShoppingCart className="h-4 w-4" />
                    <span className="hidden xl:inline">Количка</span>
                    {totalItems > 0 ? (
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-primary">
                        {totalItems}
                      </span>
                    ) : null}
                  </Link>
                </Button>
              </CartHoverPreview>
            </div>

            <ThemePicker />

            {user ? (
              <div className="hidden sm:flex items-center gap-2 max-w-[240px]">
                <Link
                  href="/profile"
                  className="text-sm text-foreground truncate hover:text-primary hover:underline"
                  title="Моят профил"
                >
                  {user.displayName || user.email}
                </Link>
                <Button variant="ghost" size="sm" className="shrink-0 gap-1 rounded-xl" asChild>
                  <Link href="/profile">
                    <UserIcon className="h-4 w-4" />
                    <span className="hidden xl:inline">Профил</span>
                  </Link>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1 shrink-0 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden xl:inline">Изход</span>
                </Button>
              </div>
            ) : (
              <>
                <Link href="/auth/login" className="hidden sm:block">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-foreground hover:bg-transparent hover:text-foreground"
                  >
                    <UserIcon className="h-4 w-4" />
                    Вход
                  </Button>
                </Link>
                <Link href="/auth/sign-up" className="hidden md:block">
                  <Button
                    size="sm"
                    className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                  >
                    Регистрация
                  </Button>
                </Link>
              </>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Отвори меню</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] bg-background">
                <div className="flex flex-col gap-4 pt-8">
                  {[...primaryNavigation, ...secondaryNavigation, { name: 'Количка', href: '/cart', icon: ShoppingCart }].map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-4 py-3 text-base font-medium rounded-lg transition-colors',
                          isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {item.name}
                      </Link>
                    )
                  })}
                  <div className="border-t border-border pt-4 mt-4 space-y-2">
                    <div className="rounded-xl border border-border/70 bg-card/60 p-3">
                      <p className="mb-2 text-sm font-medium">Цвят на сайта</p>
                      <ThemePicker buttonClassName="w-full justify-between rounded-lg bg-secondary/50 hover:bg-secondary" />
                    </div>
                    {user ? (
                      <>
                        <p className="px-4 text-sm text-muted-foreground truncate">
                          {user.displayName || user.email}
                        </p>
                        <Link href="/profile" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="mb-2 w-full gap-2">
                            <UserIcon className="h-4 w-4" />
                            Профил
                          </Button>
                        </Link>
                        <Button
                          variant="default"
                          className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => {
                            setMobileMenuOpen(false)
                            void handleLogout()
                          }}
                        >
                          <LogOut className="h-4 w-4" />
                          Изход
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link href="/auth/login" onClick={() => setMobileMenuOpen(false)}>
                          <Button variant="outline" className="w-full mb-2">
                            Вход
                          </Button>
                        </Link>
                        <Link href="/auth/sign-up" onClick={() => setMobileMenuOpen(false)}>
                          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                            Регистрация
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    </>
  )
}
