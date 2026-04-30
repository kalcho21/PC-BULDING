'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { Cpu, CheckCircle2, AlertCircle } from 'lucide-react'
import { SIGNUP_PASSWORD_SESSION_KEY } from '@/lib/signup-temp-storage'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const msg = searchParams.get('message')
    if (msg) {
      setMessage(decodeURIComponent(msg))
    }
  }, [searchParams])

  const translateError = (errorMessage: string): string => {
    const lowerMsg = errorMessage.toLowerCase()

    if (lowerMsg.includes('invalid login credentials') || lowerMsg.includes('invalid credentials')) {
      return 'Невалидни данни за вход. Проверете имейла и паролата.'
    }
    const looksLikeEmailUnconfirmed =
      lowerMsg.includes('email not confirmed') ||
      lowerMsg.includes('email_not_confirmed') ||
      lowerMsg.includes('email address not confirmed') ||
      lowerMsg.includes('confirm your email') ||
      /email.+not.+confirm/.test(lowerMsg)
    if (looksLikeEmailUnconfirmed) {
      return 'Имейлът все още не е потвърден в акаунта. Ако вече сте отворили линка от писмото: опитайте отново „Изпрати отново“ от страницата след регистрация, или отворете линка в същия браузър и завършете пренасочването към сайта. Проверете и в Supabase → Authentication → Users дали за този имейл има дата при Email Confirmed.'
    }
    if (lowerMsg.includes('user not found')) {
      return 'Потребител с този имейл не съществува. Моля, регистрирайте се първо.'
    }
    if (lowerMsg.includes('too many requests') || lowerMsg.includes('rate limit')) {
      return 'Твърде много опити. Моля, изчакайте няколко минути и опитайте отново.'
    }
    if (lowerMsg.includes('network') || lowerMsg.includes('fetch')) {
      return 'Грешка при свързване. Проверете интернет връзката си.'
    }
    if (lowerMsg.includes('password')) {
      return 'Грешна парола. Моля, опитайте отново.'
    }
    
    return errorMessage
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    console.log('[v0] Login attempt for:', email)

    try {
      const supabase = createClient()
      console.log('[v0] Supabase client created')
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      console.log('[v0] Login response:', { data: data?.user?.email, error: error?.message })
      
      if (error) {
        console.log('[v0] Login error:', error.message, (error as { code?: string }).code)
        throw error
      }
      
      if (data?.user) {
        console.log('[v0] Login successful, redirecting...')
        await supabase.from('profiles').upsert(
          {
            id: data.user.id,
            email: data.user.email ?? email,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        try {
          sessionStorage.removeItem(SIGNUP_PASSWORD_SESSION_KEY)
        } catch {
          /* ignore */
        }
        const next = searchParams.get('redirect')
        const safe =
          next &&
          next.startsWith('/') &&
          !next.startsWith('//') &&
          !next.includes('\\')
            ? next
            : '/'
        window.location.assign(safe)
      } else {
        throw new Error('Неуспешен вход')
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Възникна грешка'
      console.log('[v0] Catch error:', errorMessage)
      setError(translateError(errorMessage))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-background">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Cpu className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">PC Builder</span>
          </div>

          {message && (
            <Alert className="border-success/20 bg-success/10">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertDescription className="text-success">{message}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Вход</CardTitle>
              <CardDescription>
                Въведете вашите данни за достъп до акаунта
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-2">
                    <Label htmlFor="email">Имейл</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Парола</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="space-y-2">
                        <span>{error}</span>
                        {email.trim() ? (
                          <div>
                            <Link
                              href={`/auth/sign-up-success?email=${encodeURIComponent(email.trim())}`}
                              className="text-sm font-medium underline underline-offset-4"
                            >
                              Страница за повторно изпращане на линк
                            </Link>
                          </div>
                        ) : null}
                      </AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
                    {isLoading ? 'Влизане...' : 'Вход'}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Нямате акаунт?{' '}
                  <Link
                    href="/auth/sign-up"
                    className="text-primary underline underline-offset-4 hover:text-primary/80"
                  >
                    Регистрация
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-svh items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Зареждане...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
