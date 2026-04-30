'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2, ArrowRight, ShoppingCart } from 'lucide-react'
import { useCart } from '@/components/cart-provider'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function SuccessPage() {
  const { clearCart } = useCart()

  useEffect(() => {
    clearCart()
  }, [clearCart])

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-10">
        <Card className="mx-auto max-w-2xl border-border/60 bg-card/75">
          <CardContent className="flex flex-col items-center px-6 py-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-semibold">Благодарим</h1>
            <p className="mt-3 max-w-lg text-sm text-muted-foreground">
              Количката е изчистена. Можеш да се върнеш към каталога или към количката.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/catalog">
                  Разгледай каталога
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/cart">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Обратно към количката
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
