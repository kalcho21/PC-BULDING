"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Component } from "@/lib/types"
import { FavoriteComponentDetailDialog } from "@/components/favorite-component-detail-dialog"
import { Header } from "@/components/header"
import { ComponentCard } from "@/components/component-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Heart, Lock, Search, Sparkles, Trash2, Layers3 } from "lucide-react"
import Link from "next/link"

interface FavoriteWithComponent {
  id: string
  component: Component
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteWithComponent[]>([])
  const [selectedFav, setSelectedFav] = useState<FavoriteWithComponent | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const fetchSeqRef = useRef(0)

  const fetchData = useCallback(async (opts?: { silent?: boolean }) => {
    const fetchSeq = ++fetchSeqRef.current
    const silent = opts?.silent ?? false
    if (!silent) setLoading(true)
    setLoadError(null)
    setFavorites([])
    const supabase = createClient()

    const {
      data: { user: u },
    } = await supabase.auth.getUser()
    if (fetchSeq !== fetchSeqRef.current) return
    setUser(u)

    if (!u) {
      setFavorites([])
      if (!silent) setLoading(false)
      return
    }

    const { data: favs, error: favErr } = await supabase
      .from("favorites")
      .select(
        `
            id,
            component:components (
              *,
              category:categories (*),
              brand:brands (*)
            )
          `
      )
      .eq("user_id", u.id)
      .order("created_at", { ascending: false })
    if (fetchSeq !== fetchSeqRef.current) return

    if (favErr) {
      setLoadError(favErr.message)
      setFavorites([])
    } else {
      const rows = (favs ?? [])
        .map((row: { id: string; component: Component | Component[] | null }) => {
          const component = Array.isArray(row.component) ? row.component[0] : row.component
          return component ? { id: row.id, component } : null
        })
        .filter((row): row is FavoriteWithComponent => row !== null)
      setFavorites(rows)
    }
    if (!silent) setLoading(false)
  }, [])

  useEffect(() => {
    void fetchData()
    const supabase = createClient()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void fetchData()
    })
    return () => {
      sub.subscription.unsubscribe()
    }
  }, [fetchData])

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") {
        void fetchData({ silent: true })
      }
    }
    window.addEventListener("focus", onVisible)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.removeEventListener("focus", onVisible)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [fetchData])

  const handleRemoveFavorite = async (favoriteId: string) => {
    const supabase = createClient()
    await supabase.from("favorites").delete().eq("id", favoriteId)
    setFavorites((prev) => prev.filter((f) => f.id !== favoriteId))
    setSelectedFav((cur) => (cur?.id === favoriteId ? null : cur))
  }

  const filteredFavorites = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("bg")
    if (!query) return favorites

    return favorites.filter((fav) =>
      [
        fav.component.name,
        fav.component.brand?.name,
        fav.component.category?.name,
        fav.component.model,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("bg")
        .includes(query)
    )
  }, [favorites, searchQuery])

  const totalFavoriteValue = useMemo(
    () => favorites.reduce((sum, fav) => sum + (fav.component.price || 0), 0),
    [favorites]
  )

  const uniqueCategories = useMemo(
    () => new Set(favorites.map((fav) => fav.component.category?.name).filter(Boolean)).size,
    [favorites]
  )

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price)

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="flex h-[50vh] items-center justify-center rounded-3xl border border-border/60 bg-card/60 backdrop-blur">
            <div className="animate-pulse text-muted-foreground">
              Зареждане на любими…
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto rounded-3xl border border-border/60 bg-card/70 p-8 text-center shadow-lg backdrop-blur">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold mb-4">Влезте, за да виждате любими</h1>
            <p className="text-muted-foreground mb-8">
              Любимите се запазват към вашия акаунт. Влезте или се регистрирайте,
              после добавяйте продукти от каталога с иконата сърце.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/auth/login">
                <Button>Вход</Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button variant="outline">Регистрация</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.10),transparent_20%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_22%)]" />
      <Header />

      <main className="container mx-auto px-4 py-6 relative space-y-6">
        <Card className="overflow-hidden border-border/60 bg-card/70 shadow-lg backdrop-blur">
          <CardContent className="p-0">
            <div className="grid gap-0 lg:grid-cols-[1.4fr_0.9fr]">
              <div className="border-b border-border/60 p-6 lg:border-b-0 lg:border-r">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Модерен изглед
                </div>
                <h1 className="mt-4 text-3xl font-bold">Моите любими</h1>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  Частите, които сте запазили от каталога, събрани в по-чист и по-модерен изглед.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 p-6">
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="text-xs text-muted-foreground">Продукти</div>
                  <div className="mt-1 text-2xl font-semibold">{favorites.length}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="text-xs text-muted-foreground">Категории</div>
                  <div className="mt-1 text-2xl font-semibold">{uniqueCategories}</div>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="text-xs text-muted-foreground">Обща стойност</div>
                  <div className="mt-1 text-lg font-semibold">{formatPrice(totalFavoriteValue)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {loadError ? (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="py-6 text-sm text-destructive">
              Неуспешно зареждане: {loadError}
            </CardContent>
          </Card>
        ) : null}

        {favorites.length === 0 && !loadError ? (
          <Card className="bg-card/70 border-border/60 backdrop-blur">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Heart className="w-16 h-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Все още няма любими</h3>
              <p className="text-muted-foreground text-center max-w-md mb-6">
                Отворете каталога и натиснете сърцето върху продукт — така той се
                записва тук и можете да го виждате по име и цена.
              </p>
              <Link href="/catalog">
                <Button variant="outline">Към каталога</Button>
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {favorites.length > 0 ? (
          <>
            <Card className="border-border/60 bg-card/70 shadow-sm backdrop-blur">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Layers3 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Запазени продукти</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {filteredFavorites.length} от {favorites.length} продукта
                      {searchQuery.trim() ? " съвпадат с търсенето" : ""}
                    </p>
                  </div>
                  <div className="relative w-full lg:max-w-sm">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Търси по име, марка или категория..."
                      className="h-11 rounded-xl border-border/60 bg-background/80 pl-9"
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="text-foreground font-medium inline-flex flex-wrap items-baseline gap-x-1 gap-y-1">
                    {favorites.slice(0, 4).map((f, idx) => (
                      <span key={f.id} className="inline">
                        {idx > 0 ? (
                          <span className="text-muted-foreground font-normal"> · </span>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setSelectedFav(f)}
                          className="text-left text-primary hover:underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
                        >
                          {f.component.name}
                        </button>
                      </span>
                    ))}
                    {favorites.length > 4 ? (
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        и още {favorites.length - 4}
                      </span>
                    ) : null}
                  </span>
                </p>
              </CardContent>
            </Card>

            {filteredFavorites.length === 0 ? (
              <Card className="border-border/60 bg-card/70 backdrop-blur">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Search className="mb-4 h-12 w-12 text-muted-foreground/30" />
                  <h3 className="text-xl font-semibold">Няма съвпадения</h3>
                  <p className="mt-2 max-w-md text-center text-sm text-muted-foreground">
                    Пробвайте с друга дума за търсене, за да откриете запазен продукт.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredFavorites.map((fav) => (
                <div key={fav.id} className="relative group/card">
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-0 transition-opacity duration-200 group-hover/card:opacity-100 pointer-events-none" />
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedFav(fav)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedFav(fav)
                      }
                    }}
                    className="block w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    <ComponentCard
                      component={fav.component}
                      isFavorite={true}
                      showActions={false}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-3 right-3 z-10 h-9 w-9 rounded-full border border-border/60 bg-background/85 backdrop-blur hover:bg-destructive hover:text-destructive-foreground"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      void handleRemoveFavorite(fav.id)
                    }}
                    aria-label={`Премахни ${fav.component.name} от любими`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              </div>
            )}
          </>
        ) : null}
      </main>

      <FavoriteComponentDetailDialog
        item={selectedFav}
        open={selectedFav !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedFav(null)
        }}
        onRemovedFromFavorites={(favoriteRowId) => {
          setFavorites((prev) => prev.filter((f) => f.id !== favoriteRowId))
          setSelectedFav(null)
        }}
      />
    </div>
  )
}
