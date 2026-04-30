'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Layers, Heart, Wrench, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')

  useEffect(() => {
    void (async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.replace(`/auth/login?redirect=${encodeURIComponent('/profile')}`)
        return
      }

      setUserId(user.id)
      setEmail(user.email ?? '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()

      const metaName =
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === 'string'
            ? user.user_metadata.name
            : ''

      setFullName((profile?.full_name ?? metaName ?? '').trim())
      setLoading(false)
    })()
  }, [router])

  const handleSave = useCallback(async () => {
    if (!userId) return
    const supabase = createClient()
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles').upsert(
        {
          id: userId,
          email: email || null,
          full_name: fullName.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Профилът е запазен.')
    } finally {
      setSaving(false)
    }
  }, [userId, email, fullName])

  if (loading) {
    return (
      <div className="min-h-svh flex flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          Зареждане…
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-background">
      <Header />
      <main className="container mx-auto max-w-lg px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">Моят профил</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Лични данни и бърз достъп до сглобките и любимите ти компоненти.
          </p>
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>Данни за акаунта</CardTitle>
            <CardDescription>
              Имейлът идва от достъпа ти и не може да се промени оттук.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-email">Имейл</Label>
              <Input id="profile-email" type="email" value={email} disabled readOnly className="bg-muted/40" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-name">Пълно име</Label>
              <Input
                id="profile-name"
                type="text"
                autoComplete="name"
                placeholder="Име и фамилия"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <Button className="w-full sm:w-auto" onClick={() => void handleSave()} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Запазване…
                </>
              ) : (
                'Запази промените'
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
            <Link href="/builds">
              <Layers className="h-5 w-5" />
              <span>Моите сглобки</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
            <Link href="/favorites">
              <Heart className="h-5 w-5" />
              <span>Любими</span>
            </Link>
          </Button>
          <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
            <Link href="/builder">
              <Wrench className="h-5 w-5" />
              <span>Нова сглобка</span>
            </Link>
          </Button>
        </div>
      </main>
    </div>
  )
}
