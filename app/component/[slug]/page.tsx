"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useCart } from "@/components/cart-provider"
import type { Component, Category, Brand } from "@/lib/types"
import { Header } from "@/components/header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Star, ShoppingCart, Heart, Share2, Check, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"

export default function ComponentDetailPage() {
  const router = useRouter()
  const { addToCart, getQuantity } = useCart()
  const params = useParams()
  const slug = params.slug as string
  const [component, setComponent] = useState<Component | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [similarComponents, setSimilarComponents] = useState<Component[]>([])
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const favoritesRef = useRef<Set<string>>(new Set())
  favoritesRef.current = favorites

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()
    async function loadFavoriteIds() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        if (!cancelled) setFavorites(new Set())
        return
      }
      const { data } = await supabase
        .from("favorites")
        .select("component_id")
        .eq("user_id", user.id)
      if (!cancelled) {
        setFavorites(new Set((data ?? []).map((r) => r.component_id).filter(Boolean)))
      }
    }
    void loadFavoriteIds()
    return () => {
      cancelled = true
    }
  }, [])

  const handleToggleFavorite = async () => {
    if (!component) return
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Влез в профила си, за да запазваш любими.")
      router.push("/auth/login")
      return
    }
    const wasFavorite = favoritesRef.current.has(component.id)
    if (wasFavorite) {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("component_id", component.id)
      if (error) {
        toast.error("Неуспешно премахване от любими.")
        return
      }
      setFavorites((prev) => {
        const next = new Set(prev)
        next.delete(component.id)
        return next
      })
      toast.info("Премахнато от любими.")
      return
    }
    const { error } = await supabase.from("favorites").insert({
      user_id: user.id,
      component_id: component.id,
    })
    if (error && error.code !== "23505") {
      toast.error(error.message || "Неуспешно добавяне в любими.")
      return
    }
    setFavorites((prev) => new Set(prev).add(component.id))
    toast.success("Добавено в любими.")
  }

  useEffect(() => {
    async function fetchComponent() {
      const supabase = createClient()
      
      const { data: comp } = await supabase
        .from("components")
        .select("*")
        .eq("slug", slug)
        .single()

      if (comp) {
        setComponent(comp)

        const [{ data: cat }, { data: br }, { data: similar }] = await Promise.all([
          supabase.from("categories").select("*").eq("id", comp.category_id).single(),
          supabase.from("brands").select("*").eq("id", comp.brand_id).single(),
          supabase
            .from("components")
            .select("*")
            .eq("category_id", comp.category_id)
            .neq("id", comp.id)
            .limit(4)
        ])

        setCategory(cat)
        setBrand(br)
        setSimilarComponents(similar || [])
      }

      setLoading(false)
    }

    fetchComponent()
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="animate-pulse text-muted-foreground">Зареждане на продукта...</div>
        </div>
      </div>
    )
  }

  if (!component) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <p className="text-muted-foreground">Продуктът не е намерен</p>
          <Link href="/">
            <Button variant="outline" className="border-primary text-primary hover:bg-primary/10 hover:text-primary">
              <ArrowLeft className="w-4 h-4 mr-2 text-primary" />
              Назад към началото
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const specs = component.specs as Record<string, unknown>

  const formatSpecValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return "Няма данни"
    if (typeof value === "boolean") return value ? "Да" : "Не"
    if (Array.isArray(value)) return value.join(", ")
    
    const units: Record<string, string> = {
      cores: " ядра",
      threads: " нишки",
      base_clock: " GHz",
      boost_clock: " GHz",
      tdp: "W",
      cache: "",
      vram: " GB",
      cuda_cores: " ядра",
      capacity: " GB",
      speed: " MHz",
      wattage: "W",
      read_speed: " MB/s",
      write_speed: " MB/s",
      max_gpu_length: " mm",
      max_cpu_cooler_height: " mm",
      height: " mm",
      radiator_size: " mm",
      fan_size: " mm",
    }

    return `${value}${units[key] || ""}`
  }

  const formatSpecLabel = (key: string): string => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6">
        <Link href="/" className="inline-flex items-center text-primary hover:text-primary/90 mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2 text-primary" />
          Назад към началото
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Product Image */}
          <div className="relative aspect-square bg-card rounded-xl border border-border overflow-hidden">
            {component.image_url ? (
              <Image
                src={component.image_url}
                alt={component.name}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-contain bg-white p-2"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent flex items-center justify-center">
                <div className="text-center">
                  <div className="w-48 h-48 mx-auto bg-muted rounded-lg flex items-center justify-center mb-4">
                    <span className="text-6xl font-bold text-muted-foreground/30">
                      {category?.name?.charAt(0) || "?"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">Няма снимка</p>
                </div>
              </div>
            )}
            {!component.in_stock && (
              <Badge variant="destructive" className="absolute top-4 right-4">
                Изчерпан
              </Badge>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="mb-2">
              <Badge variant="outline" className="text-primary border-primary/30">
                {category?.name}
              </Badge>
            </div>
            
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">{component.name}</h1>
            
            <p className="text-muted-foreground mb-4">
              от <span className="text-foreground font-medium">{brand?.name}</span>
              {component.model && <span className="ml-2">Модел: {component.model}</span>}
            </p>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-5 h-5 ${
                      i < Math.floor(component.rating || 0)
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {component.rating?.toFixed(1)} ({component.review_count} ревюта)
              </span>
            </div>

            <p className="text-muted-foreground mb-6">{component.description}</p>

            <div className="flex-1" />

            <div className="border-t border-border pt-6">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Цена</p>
                  <p className="text-4xl font-bold text-primary">
                    {formatPrice(component.price)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {component.in_stock ? (
                    <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                      <Check className="w-3 h-3 mr-1" /> Наличен
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <X className="w-3 h-3 mr-1" /> Изчерпан
                    </Badge>
                  )}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_auto_auto]">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-auto min-h-12 w-full min-w-0 whitespace-normal py-3 leading-tight"
                  onClick={() => {
                    addToCart({
                      ...component,
                      category: category ?? component.category,
                      brand: brand ?? component.brand,
                    })
                    toast.success(`${component.name} е добавен в количката.`)
                  }}
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  {getQuantity(component.id) > 0
                    ? `В количката (${getQuantity(component.id)})`
                    : "Добави в количка"}
                </Button>
                <Button size="lg" className="h-auto min-h-12 w-full min-w-0 whitespace-normal bg-primary py-3 leading-tight hover:bg-primary/90" asChild>
                  <Link href={`/builder?add=${component.id}`}>
                    <Check className="w-5 h-5 mr-2" />
                    Добави в сглобка
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-auto min-h-12 w-full min-w-0 whitespace-normal py-3 leading-tight"
                  onClick={() => void handleToggleFavorite()}
                >
                  <Heart className={`w-5 h-5 ${favorites.has(component.id) ? "fill-red-500 text-red-500" : ""}`} />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-auto min-h-12 w-full min-w-0 whitespace-normal py-3 leading-tight"
                  onClick={() => {
                    void navigator.clipboard.writeText(window.location.href)
                    toast.success("Линкът е копиран.")
                  }}
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Specifications Tabs */}
        <Tabs defaultValue="specs" className="mb-12">
          <TabsList className="bg-card border border-border">
            <TabsTrigger value="specs">Спецификации</TabsTrigger>
            <TabsTrigger value="compatibility">Съвместимост</TabsTrigger>
            <TabsTrigger value="reviews">Ревюта</TabsTrigger>
          </TabsList>

          <TabsContent value="specs" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Технически характеристики</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(specs).map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                    >
                      <span className="text-sm text-muted-foreground">
                        {formatSpecLabel(key)}
                      </span>
                      <span className="font-medium">
                        {formatSpecValue(key, value)}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compatibility" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Информация за съвместимост</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {category?.slug === "cpu" && Boolean(specs.socket) && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium mb-2">Съвместимост на сокета</p>
                      <p className="text-sm text-muted-foreground">
                        Този процесор е със сокет <span className="text-primary font-medium">{String(specs.socket)}</span>. 
                        Увери се, че дънната платка поддържа същия сокет.
                      </p>
                    </div>
                  )}
                  {category?.slug === "gpu" && Boolean(specs.tdp) && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium mb-2">Изисквания за захранване</p>
                      <p className="text-sm text-muted-foreground">
                        Тази видеокарта има TDP <span className="text-primary font-medium">{String(specs.tdp)}W</span>. 
                        Препоръчително захранване: {Number(specs.tdp) * 2}W или повече.
                      </p>
                    </div>
                  )}
                  {category?.slug === "ram" && Boolean(specs.type) && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="font-medium mb-2">Тип памет</p>
                      <p className="text-sm text-muted-foreground">
                        Памет тип <span className="text-primary font-medium">{String(specs.type)}</span>. 
                        Увери се, че дънната платка поддържа {String(specs.type)}.
                      </p>
                    </div>
                  )}
                  {category?.slug === "motherboard" && (
                    <div className="space-y-3">
                      {Boolean(specs.socket) && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="font-medium mb-2">Сокет за процесор</p>
                          <p className="text-sm text-muted-foreground">
                            Поддържа процесори със сокет <span className="text-primary font-medium">{String(specs.socket)}</span>.
                          </p>
                        </div>
                      )}
                      {Boolean(specs.memory_type) && (
                        <div className="p-4 bg-muted/50 rounded-lg">
                          <p className="font-medium mb-2">Поддръжка на памет</p>
                          <p className="text-sm text-muted-foreground">
                            Поддържа <span className="text-primary font-medium">{String(specs.memory_type)}</span> памет 
                            до {String(specs.max_memory)}GB в {String(specs.memory_slots)} слота.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Потребителски ревюта</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-8 mb-8 p-6 bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <p className="text-5xl font-bold text-primary">{component.rating?.toFixed(1)}</p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.floor(component.rating || 0)
                              ? "fill-yellow-500 text-yellow-500"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {component.review_count} ревюта
                    </p>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[5, 4, 3, 2, 1].map((stars) => (
                      <div key={stars} className="flex items-center gap-3">
                        <span className="text-sm w-12">{stars} зв.</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-yellow-500"
                            style={{
                              width: `${stars === 5 ? 70 : stars === 4 ? 20 : stars === 3 ? 7 : 3}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-center text-muted-foreground">
                  Подробните ревюта ще бъдат добавени скоро...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Similar Products */}
        {similarComponents.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Подобни продукти</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {similarComponents.map((comp) => (
                <Link key={comp.id} href={`/component/${comp.slug}`}>
                  <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer h-full">
                    <CardContent className="p-4">
                      <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden relative">
                        {comp.image_url ? (
                          <Image
                            src={comp.image_url}
                            alt={comp.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <span className="text-3xl font-bold text-muted-foreground/30">
                            {category?.name?.charAt(0)}
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium line-clamp-2 mb-2">{comp.name}</h3>
                      <p className="text-primary font-bold">{formatPrice(comp.price)}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
