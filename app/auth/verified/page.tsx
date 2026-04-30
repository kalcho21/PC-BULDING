'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function VerifiedPage() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const supabase = createClient()
    void supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user
      if (user) {
        const fullName =
          typeof user.user_metadata?.full_name === 'string'
            ? user.user_metadata.full_name
            : typeof user.user_metadata?.name === 'string'
              ? user.user_metadata.name
              : null

        await supabase.from('profiles').upsert(
          {
            id: user.id,
            email: user.email ?? null,
            full_name: fullName,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
      }
      router.refresh()
    })
  }, [router])

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          router.push('/')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [router])

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-background">
      <div className="w-full max-w-md">
        <Card className="border-success/20 bg-success/5">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <CardTitle className="text-2xl text-success">Успешна верификация!</CardTitle>
            <CardDescription className="text-base">
              Вашият имейл адрес е успешно потвърден.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Вече можете да използвате всички функции на PC Builder.
              Автоматично пренасочване след {countdown} секунди...
            </p>
            <div className="flex flex-col gap-2">
              <Button asChild className="w-full">
                <Link href="/">Към PC Builder</Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/builds">Моите конфигурации</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
