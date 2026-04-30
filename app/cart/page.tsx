'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Header } from '@/components/header'
import { useCart } from '@/components/cart-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  Cpu,
  ArrowRight,
  Smartphone,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { buildPersonalRevolutPayUrl } from '@/lib/revolut-personal-url'

const REVOLUT_PAY_URL = 'https://revolut.me/kbenchev'

function createOrderNumber() {
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `ORD-${Date.now().toString().slice(-6)}-${randomPart}`
}

export default function CartPage() {
  const { items, totalItems, totalPrice, setQuantity, removeFromCart, clearCart } = useCart()
  const [orderNumber, setOrderNumber] = useState('')
  const [payerName, setPayerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price)

  useEffect(() => {
    if (items.length === 0) {
      setOrderNumber('')
      return
    }
    setOrderNumber((prev) => prev || createOrderNumber())
  }, [items.length])

  const revolutPaymentUrl = useMemo(() => {
    if (items.length === 0 || totalPrice <= 0 || !orderNumber) {
      return null
    }
    try {
      return buildPersonalRevolutPayUrl(REVOLUT_PAY_URL, totalPrice, 'EUR', orderNumber)
    } catch {
      return null
    }
  }, [items.length, totalPrice, orderNumber])

  const openRevolutGuarded = () => {
    if (!payerName.trim()) {
      toast.error('Попълни име и фамилия преди плащане.')
      return
    }
    if (!customerEmail.trim()) {
      toast.error('Попълни имейл — ще изпратим потвърждение с номера на поръчката.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      toast.error('Въведи валиден имейл адрес.')
      return
    }
    if (!revolutPaymentUrl || !orderNumber) {
      toast.error('Липсва линк за плащане. Опитай отново.')
      return
    }

    window.open(revolutPaymentUrl, '_blank', 'noopener,noreferrer')

    void fetch('/api/orders/customer-thank-you', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: customerEmail.trim(),
        orderNumber,
        customerName: payerName.trim(),
      }),
    }).catch(() => {
      /* best-effort */
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3 rounded-full">
              Отделно от сглобката
            </Badge>
            <h1 className="text-3xl font-semibold">Количка</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Следи по-лесно кои части искаш да купиш, без да променяш текущата сглобка.
            </p>
          </div>
          {items.length > 0 ? (
            <Button variant="outline" className="rounded-xl" onClick={clearCart}>
              <Trash2 className="mr-2 h-4 w-4" />
              Изчисти количката
            </Button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <Card className="border-border/60 bg-card/75">
            <CardContent className="flex flex-col items-center px-6 py-16 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10">
                <ShoppingCart className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Количката е празна</h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Добавяй части от каталога, началната страница или продуктовия прозорец, за да
                виждаш какво си избрал за покупка.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <Link href="/catalog">
                    Разгледай каталога
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/builder">
                    <Cpu className="mr-2 h-4 w-4" />
                    Отвори сглобка
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.5fr_0.85fr]">
            <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.component.id} className="border-border/60 bg-card/75">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-muted">
                        {item.component.image_url ? (
                          <Image
                            src={item.component.image_url}
                            alt={item.component.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Cpu className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm text-muted-foreground">{item.component.brand?.name}</p>
                          <Badge variant="outline" className="rounded-full capitalize">
                            {item.component.category?.name || item.component.category?.slug}
                          </Badge>
                        </div>
                        <Link
                          href={`/component/${item.component.slug}`}
                          className="mt-1 block text-lg font-semibold hover:text-primary"
                        >
                          {item.component.name}
                        </Link>
                        <div className="mt-3 flex flex-wrap items-center gap-3">
                          <span className="text-xl font-semibold text-primary">
                            {formatPrice(item.component.price)}
                          </span>
                          <Badge
                            variant={item.component.in_stock ? 'secondary' : 'destructive'}
                            className="rounded-full"
                          >
                            {item.component.in_stock ? 'Наличен' : 'Изчерпан'}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex flex-row items-center justify-between gap-4 sm:flex-col sm:items-end">
                        <div className="flex items-center rounded-xl border border-border bg-background/70 p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => setQuantity(item.component.id, item.quantity - 1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => setQuantity(item.component.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Общо</p>
                          <p className="text-lg font-semibold">
                            {formatPrice(item.component.price * item.quantity)}
                          </p>
                        </div>

                        <Button
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeFromCart(item.component.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Премахни
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <aside className="lg:sticky lg:top-24 h-fit">
              <Card className="overflow-hidden border-border/60 bg-card shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Плащане с Revolut</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-2xl border border-border/60 bg-muted/40 px-4 py-4">
                    <p className="text-base font-semibold tracking-tight text-foreground">
                      Дължима сума: {totalPrice.toFixed(2)} EUR
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      ({totalItems} артикула)
                    </p>
                  </div>

                  <div className="space-y-4 rounded-2xl border border-border/60 bg-background/80 p-4">
                    <h3 className="text-sm font-semibold text-foreground">Стъпка 1: твоите данни</h3>

                    <div className="space-y-2">
                      <Label htmlFor="payer-name">Име и фамилия</Label>
                      <Input
                        id="payer-name"
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                        placeholder="Име Фамилия"
                        autoComplete="name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customer-email">Имейл за потвърждение</Label>
                      <Input
                        id="customer-email"
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Ще получиш имейл „Благодарим за поръчката“ с номера на поръчката.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Smartphone className="h-4 w-4 text-primary" />
                      Стъпка 2: плати в Revolut
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Линкът е за общата сума от количката:{' '}
                      <span className="font-semibold text-foreground">{totalPrice.toFixed(2)} EUR</span>
                      {orderNumber ? (
                        <>
                          {' '}
                          с бележка{' '}
                          <span className="font-mono text-foreground">{orderNumber}</span>.
                        </>
                      ) : null}{' '}
                      Провери сумата и бележката в Revolut преди потвърждение.
                    </p>
                    {revolutPaymentUrl ? (
                      <Button
                        type="button"
                        className="mt-4 w-full rounded-xl"
                        onClick={openRevolutGuarded}
                      >
                        Отвори Revolut
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button className="mt-4 w-full rounded-xl" type="button" disabled>
                        Отвори Revolut
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
      </main>
    </div>
  )
}
