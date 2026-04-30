"use client"

import { createClient } from "@/lib/supabase/client"
import { useCart } from "@/components/cart-provider"
import type { Component } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ArrowLeft,
  Star,
  ShoppingCart,
  Heart,
  Check,
  X,
  ExternalLink,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export type FavoriteDetailItem = {
  id: string
  component: Component
}

function formatSpecValue(key: string, value: unknown): string {
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

function formatSpecLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

type FavoriteComponentDetailDialogProps = {
  item: FavoriteDetailItem | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** При премахване от любими от модала — обнови списъка и затвори */
  onRemovedFromFavorites?: (favoriteRowId: string) => void
}

export function FavoriteComponentDetailDialog({
  item,
  open,
  onOpenChange,
  onRemovedFromFavorites,
}: FavoriteComponentDetailDialogProps) {
  const { addToCart, getQuantity } = useCart()
  const component = item?.component ?? null
  const category = component?.category ?? null
  const brand = component?.brand ?? null

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(price)

  const close = () => onOpenChange(false)

  const handleToggleFavorite = async () => {
    if (!component || !item) return
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      toast.error("Влез в профила си, за да управляваш любими.")
      return
    }

    const { error } = await supabase
      .from("favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("component_id", component.id)

    if (error) {
      toast.error("Неуспешно премахване от любими.")
      return
    }
    toast.info("Премахнато от любими.")
    onRemovedFromFavorites?.(item.id)
    close()
  }

  const specs = (component?.specs ?? {}) as Record<string, unknown>

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(92vh,920px)] w-[calc(100%-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:w-full sm:max-w-5xl"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">
          {component ? component.name : "Детайли за продукт"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          Преглед на запазения продукт, действия и спецификации
        </DialogDescription>

        <div className="flex shrink-0 items-center gap-2 border-b border-border bg-card/95 px-3 py-2 pr-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full"
            onClick={close}
            aria-label="Затвори прегледа"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="text-sm text-muted-foreground">Назад към любими</span>
        </div>

        {!component ? null : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="grid gap-8 p-4 md:grid-cols-2 md:gap-10 md:p-6 lg:gap-12">
                <div className="relative flex w-full flex-col items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-b from-card via-muted/15 to-muted/30 p-5 shadow-inner ring-1 ring-inset ring-white/[0.04] md:p-6">
                  {component.image_url ? (
                    <div className="relative w-full max-w-[440px] rounded-xl bg-white p-4 shadow-lg ring-1 ring-black/[0.06] dark:bg-zinc-50 md:p-6">
                      <img
                        src={component.image_url}
                        alt={component.name}
                        className="mx-auto h-auto max-h-[min(380px,45vh)] w-full object-contain object-center"
                        decoding="async"
                      />
                    </div>
                  ) : (
                    <div className="flex min-h-[160px] w-full max-w-[440px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 py-10">
                      <div className="flex h-28 w-28 items-center justify-center rounded-xl bg-muted/80 md:h-36 md:w-36">
                        <span className="text-4xl font-bold text-muted-foreground/35 md:text-5xl">
                          {category?.name?.charAt(0) || "?"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">Няма снимка</p>
                    </div>
                  )}
                  {!component.in_stock ? (
                    <Badge variant="destructive" className="absolute right-4 top-4 shadow-md">
                      Изчерпан
                    </Badge>
                  ) : null}
                </div>

              <div className="flex min-w-0 flex-col gap-1 md:pl-1">
                <div className="mb-2">
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {category?.name}
                  </Badge>
                </div>
                <h2 className="mb-2 text-xl font-bold leading-tight md:text-2xl lg:text-3xl">
                  {component.name}
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  от <span className="font-medium text-foreground">{brand?.name}</span>
                  {component.model ? (
                    <span className="ml-2">Модел: {component.model}</span>
                  ) : null}
                </p>
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 md:h-5 md:w-5 ${
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
                {component.description ? (
                  <p className="mb-4 line-clamp-4 text-sm text-muted-foreground md:line-clamp-6">
                    {component.description}
                  </p>
                ) : null}

                <div className="mt-auto space-y-4 border-t border-border pt-5">
                  <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="mb-0.5 text-xs text-muted-foreground">Цена</p>
                      <p className="text-3xl font-bold tabular-nums text-primary md:text-4xl">
                        {formatPrice(component.price)}
                      </p>
                    </div>
                    {component.in_stock ? (
                      <Badge className="border-green-500/30 bg-green-500/10 text-green-500">
                        <Check className="mr-1 h-3 w-3" /> Наличен
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <X className="mr-1 h-3 w-3" /> Изчерпан
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Button
                        size="lg"
                        variant="outline"
                        className="h-12 shrink-0 justify-center gap-2 px-4 text-base font-medium"
                        onClick={() => {
                          addToCart({
                            ...component,
                            category: category ?? component.category,
                            brand: brand ?? component.brand,
                          })
                          toast.success(`${component.name} е добавен в количката.`)
                        }}
                      >
                        <ShoppingCart className="h-4 w-4 shrink-0" />
                        <span className="truncate">
                          {getQuantity(component.id) > 0
                            ? `В количката (${getQuantity(component.id)})`
                            : "Добави в количка"}
                        </span>
                      </Button>
                      <Button
                        size="lg"
                        className="h-12 shrink-0 justify-center gap-2 bg-primary px-4 text-base font-medium hover:bg-primary/90"
                        asChild
                      >
                        <Link
                          href={`/builder?add=${component.id}`}
                          className="inline-flex h-full w-full items-center justify-center gap-2"
                        >
                          <Check className="h-4 w-4 shrink-0" />
                          <span>Добави в сглобка</span>
                        </Link>
                      </Button>
                    </div>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-12 w-full shrink-0 justify-center gap-2 px-4 text-base font-medium"
                      onClick={() => void handleToggleFavorite()}
                      aria-label="Премахни от любими"
                    >
                      <Heart className="h-4 w-4 shrink-0 fill-red-500 text-red-500" />
                      <span>Премахни от любими</span>
                    </Button>
                  </div>

                  <Button variant="link" className="h-auto px-0 text-primary" asChild>
                    <Link
                      href={`/component/${encodeURIComponent(component.slug)}`}
                      className="inline-flex items-center gap-1"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Отвори на цяла страница
                    </Link>
                  </Button>
                </div>
              </div>
            </div>

            <div className="border-t border-border px-4 pb-6 pt-2 md:px-6">
              <Tabs defaultValue="specs" className="w-full">
                <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-card">
                  <TabsTrigger value="specs">Спецификации</TabsTrigger>
                  <TabsTrigger value="compatibility">Съвместимост</TabsTrigger>
                  <TabsTrigger value="reviews">Ревюта</TabsTrigger>
                </TabsList>

                <TabsContent value="specs" className="mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Технически характеристики</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {Object.entries(specs).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex min-h-[3rem] flex-col justify-center gap-0.5 rounded-xl bg-muted/50 px-3.5 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                          >
                            <span className="shrink-0 text-muted-foreground">{formatSpecLabel(key)}</span>
                            <span className="min-w-0 break-words text-right font-medium sm:max-w-[55%] sm:text-right">
                              {formatSpecValue(key, value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="compatibility" className="mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Съвместимост</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 text-sm">
                        {category?.slug === "cpu" && Boolean(specs.socket) ? (
                          <div className="rounded-lg bg-muted/50 p-3">
                            <p className="mb-1 font-medium">Сокет</p>
                            <p className="text-muted-foreground">
                              Процесор със сокет{" "}
                              <span className="font-medium text-primary">{String(specs.socket)}</span>.
                            </p>
                          </div>
                        ) : null}
                        {category?.slug === "gpu" && Boolean(specs.tdp) ? (
                          <div className="rounded-lg bg-muted/50 p-3">
                            <p className="mb-1 font-medium">Захранване</p>
                            <p className="text-muted-foreground">
                              TDP <span className="font-medium text-primary">{String(specs.tdp)}W</span>.
                            </p>
                          </div>
                        ) : null}
                        {category?.slug === "ram" && Boolean(specs.type) ? (
                          <div className="rounded-lg bg-muted/50 p-3">
                            <p className="mb-1 font-medium">Тип памет</p>
                            <p className="text-muted-foreground">
                              <span className="font-medium text-primary">{String(specs.type)}</span>.
                            </p>
                          </div>
                        ) : null}
                        {category?.slug === "motherboard" ? (
                          <div className="space-y-2">
                            {Boolean(specs.socket) ? (
                              <div className="rounded-lg bg-muted/50 p-3">
                                <p className="mb-1 font-medium">Сокет</p>
                                <p className="text-muted-foreground">
                                  <span className="font-medium text-primary">{String(specs.socket)}</span>
                                </p>
                              </div>
                            ) : null}
                            {Boolean(specs.memory_type) ? (
                              <div className="rounded-lg bg-muted/50 p-3">
                                <p className="mb-1 font-medium">Памет</p>
                                <p className="text-muted-foreground">
                                  {String(specs.memory_type)} до {String(specs.max_memory)}GB
                                </p>
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reviews" className="mt-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Ревюта</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap items-center gap-6 rounded-lg bg-muted/50 p-4">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-primary">
                            {component.rating?.toFixed(1)}
                          </p>
                          <div className="mt-1 flex justify-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${
                                  i < Math.floor(component.rating || 0)
                                    ? "fill-yellow-500 text-yellow-500"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {component.review_count} ревюта
                          </p>
                        </div>
                        <p className="flex-1 text-sm text-muted-foreground">
                          Подробните ревюта ще бъдат добавени скоро…
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
