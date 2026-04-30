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
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Cpu, AlertCircle } from 'lucide-react'
import { getAuthCallbackUrl } from '@/lib/auth-redirect'
import { SIGNUP_PASSWORD_SESSION_KEY } from '@/lib/signup-temp-storage'

export default function SignUpPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const translateError = (errorMessage: string): string => {
    const lower = errorMessage.toLowerCase()
    const translations: Record<string, string> = {
      'User already registered': 'Потребител с този имейл вече съществува.',
      'Password should be at least 6 characters': 'Паролата трябва да е поне 6 символа.',
      'Invalid email': 'Невалиден имейл адрес.',
      'Signup requires a valid password': 'Въведете валидна парола.',
    }
    if (translations[errorMessage]) return translations[errorMessage]
    if (lower.includes('already registered') || lower.includes('already been registered'))
      return 'Потребител с този имейл вече съществува.'
    if (lower.includes('password') && lower.includes('6'))
      return 'Паролата трябва да е поне 6 символа.'
    if (lower.includes('invalid') && lower.includes('email'))
      return 'Невалиден имейл адрес.'
    if (lower.includes('fetch') || lower.includes('network') || lower.includes('failed to fetch'))
      return 'Няма връзка със сървъра. Проверете интернета и настройките на Supabase.'
    return errorMessage
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    if (password !== repeatPassword) {
      setError('Паролите не съвпадат')
      setIsLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Паролата трябва да е поне 6 символа')
      setIsLoading(false)
      return
    }

    try {
      console.log('[v0] Sign-up attempt for:', email)
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getAuthCallbackUrl(),
          data: {
            full_name: fullName,
          },
        },
      })
      
      console.log('[v0] Sign-up response:', { 
        user: data?.user?.email, 
        session: !!data?.session,
        error: error?.message 
      })
      
      if (error) throw error

      if (data?.user) {
        await supabase.from('profiles').upsert(
          {
            id: data.user.id,
            email: data.user.email ?? email,
            full_name: fullName.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
      }

      if (
        data?.user &&
        Array.isArray(data.user.identities) &&
        data.user.identities.length === 0
      ) {
        setError(
          'Този имейл вече е регистриран. Опитайте вход с този адрес.'
        )
        setIsLoading(false)
        return
      }

      if (data?.session?.user) {
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: data.session.user.id,
            email: data.session.user.email ?? email,
            full_name: fullName.trim() || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        if (profileError) {
          console.warn('[sign-up] profile upsert:', profileError.message)
        }
      }
      
      // Check if email confirmation is required
      if (data?.user && !data?.session) {
        console.log('[v0] Email confirmation required, trying direct login fallback')
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          })

        if (!signInError && signInData?.session?.user) {
          await supabase.from('profiles').upsert(
            {
              id: signInData.session.user.id,
              email: signInData.session.user.email ?? email,
              full_name: fullName.trim() || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id' }
          )
          try {
            sessionStorage.removeItem(SIGNUP_PASSWORD_SESSION_KEY)
          } catch {
            /* ignore */
          }
          router.push('/')
          router.refresh()
          return
        }

        try {
          sessionStorage.setItem(SIGNUP_PASSWORD_SESSION_KEY, password)
        } catch {
          /* ignore */
        }
        router.push(
          `/auth/sign-up-success?email=${encodeURIComponent(email)}`
        )
      } else if (data?.session) {
        console.log('[v0] Signed up and logged in directly')
        try {
          sessionStorage.removeItem(SIGNUP_PASSWORD_SESSION_KEY)
        } catch {
          /* ignore */
        }
        router.push('/')
        router.refresh()
      } else {
        try {
          sessionStorage.setItem(SIGNUP_PASSWORD_SESSION_KEY, password)
        } catch {
          /* ignore */
        }
        router.push(
          `/auth/sign-up-success?email=${encodeURIComponent(email)}`
        )
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Възникна грешка'
      console.log('[v0] Sign-up error:', errorMessage)
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

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Регистрация</CardTitle>
              <CardDescription>
                Създайте безплатен акаунт за достъп до всички функции
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSignUp}>
                <div className="flex flex-col gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="fullName">Пълно име</Label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Иван Иванов"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="h-11"
                    />
                  </div>
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
                      placeholder="Минимум 6 символа"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="repeat-password">Повторете паролата</Label>
                    <Input
                      id="repeat-password"
                      type="password"
                      required
                      value={repeatPassword}
                      onChange={(e) => setRepeatPassword(e.target.value)}
                      className="h-11"
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" className="w-full h-11" disabled={isLoading}>
                    {isLoading ? 'Създаване на акаунт...' : 'Регистрация'}
                  </Button>
                </div>
                <div className="mt-4 text-center text-sm">
                  Вече имате акаунт?{' '}
                  <Link
                    href="/auth/login"
                    className="text-primary underline underline-offset-4 hover:text-primary/80"
                  >
                    Вход
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
