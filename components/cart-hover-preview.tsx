'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Cpu } from 'lucide-react'
import { useCart } from '@/components/cart-provider'
import { Button } from '@/components/ui/button'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { cn } from '@/lib/utils'

function formatLinePrice(price: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price)
}

type CartHoverPreviewProps = {
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  className?: string
}

/**
 * Обвива линк/бутон към количката: при посочване показва съдържанието на количката.
 * Ниски openDelay/closeDelay — стандартът на Radix е ~700ms и изглежда „като да не работи“.
 */
export function CartHoverPreview({
  children,
  side = 'bottom',
  align = 'end',
  className,
}: CartHoverPreviewProps) {
  const { items, totalPrice } = useCart()

  return (
    <HoverCard openDelay={120} closeDelay={80}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        side={side}
        align={align}
        sideOffset={6}
        className={cn(
          'z-[200] w-[min(calc(100vw-2rem),20rem)] max-h-[min(70vh,22rem)] overflow-y-auto border-border/60 bg-popover/95 p-3 shadow-lg backdrop-blur-md',
          className,
        )}
      >
        <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          В количката
        </p>
        {items.length === 0 ? (
          <p className="px-1 py-4 text-center text-sm text-muted-foreground">
            Няма добавени продукти.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map(({ component, quantity }) => (
              <li key={component.id}>
                <Link
                  href={`/component/${component.slug}`}
                  className="flex gap-3 rounded-xl p-2 transition-colors hover:bg-secondary/80"
                >
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {component.image_url ? (
                      <Image
                        src={component.image_url}
                        alt={component.name}
                        fill
                        className="object-cover"
                        sizes="48px"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Cpu className="h-5 w-5 text-muted-foreground/50" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium leading-snug">{component.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {quantity} × {formatLinePrice(component.price)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {items.length > 0 ? (
          <div className="mt-3 border-t border-border/60 pt-3">
            <div className="flex items-center justify-between px-1 text-sm">
              <span className="text-muted-foreground">Общо</span>
              <span className="font-semibold tabular-nums">{formatLinePrice(totalPrice)}</span>
            </div>
            <Button asChild className="mt-3 w-full rounded-xl" size="sm">
              <Link href="/cart">Към количката</Link>
            </Button>
          </div>
        ) : (
          <Button asChild variant="outline" className="mt-2 w-full rounded-xl" size="sm">
            <Link href="/catalog">Към каталога</Link>
          </Button>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}
