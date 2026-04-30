'use client'

import { useMemo, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ChevronDown, Mail } from 'lucide-react'
import Link from 'next/link'
import { getAuthCallbackUrl } from '@/lib/auth-redirect'
import { SIGNUP_PASSWORD_SESSION_KEY } from '@/lib/signup-temp-storage'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function SignUpSuccessContent() {
  const searchParams = useSearchParams()
  const emailFromQuery = useMemo(() => searchParams.get('email') || '', [searchParams])
   const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [adminPw, setAdminPw] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkMessage, setLinkMessage] = useState('')
  const [generatedLink, setGeneratedLink] = useState('')

  const fetchConfirmationLink = async () => {
    if (!emailFromQuery) {
      setLinkMessage('Липсва имейл. Регистрирайте се отново.')
      return
    }
    if (!adminPw.trim()) {
      setLinkMessage('Въведете админ паролата от .env (ADMIN_DASHBOARD_PASSWORD).')
      return
    }

    setLinkLoading(true)
    setLinkMessage('')
    setGeneratedLink('')

    let signupPassword: string | undefined
    try {
      signupPassword =
        sessionStorage.getItem(SIGNUP_PASSWORD_SESSION_KEY) || undefined
    } catch {
      signupPassword = undefined
    }

    try {
      const res = await fetch('/api/auth/confirmation-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailFromQuery,
          adminPassword: adminPw,
          signupPassword,
          redirectTo: getAuthCallbackUrl(),
        }),
      })
      const payload = await res.json()

      if (res.status === 503 && payload.message) {
        setLinkMessage(
          `${payload.message} След това поставете service_role ключа от Supabase → Settings → API.`
        )
        return
      }

      if (!res.ok) {
        setLinkMessage(payload.error || payload.message || 'Грешка при генериране на линк.')
        return
      }

      if (payload.link) {
        setGeneratedLink(payload.link)
        setLinkMessage(
          payload.method === 'signup'
            ? 'Отворете линка в същия браузър, за да потвърдите акаунта.'
            : 'Линк за вход (magic link). Ако не сработи, задайте SUPABASE_SERVICE_ROLE_KEY и опитайте веднага след регистрация (паролата се пази временно в сесията).'
        )
        try {
          sessionStorage.removeItem(SIGNUP_PASSWORD_SESSION_KEY)
        } catch {
          /* ignore */
        }
      }
    } catch {
      setLinkMessage('Мрежова грешка. Опитайте отново.')
    } finally {
      setLinkLoading(false)
    }
  }

  const copyLink = async () => {
    if (!generatedLink) return
    try {
      await navigator.clipboard.writeText(generatedLink)
      setLinkMessage('Копирано в клипборда.')
    } catch {
      setLinkMessage('Неуспешно копиране — маркирайте линка на ръка.')
    }
  }

  const handleResend = async () => {
    if (!emailFromQuery) {
      setResendMessage('Няма открит имейл. Опитайте регистрация отново.')
      return
    }

    setResendLoading(true)
    setResendMessage('')
    const supabase = createClient()
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: emailFromQuery,
      options: {
        emailRedirectTo: getAuthCallbackUrl(),
      },
    })

    if (error) {
      const msg = error.message?.toLowerCase() ?? ''
      if (msg.includes('rate') || msg.includes('too many')) {
        setResendMessage('Твърде много заявки. Изчакайте няколко минути.')
      } else {
        setResendMessage(
          `Неуспешно изпращане: ${error.message}. Проверете настройките за имейл в Supabase (Authentication → Emails).`
        )
      }
    } else {
      setResendMessage('Изпратихме нов имейл за потвърждение.')
    }
    setResendLoading(false)
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-background">
      <div className="w-full max-w-lg">
        <Card className="border-primary/20">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Проверете имейла си</CardTitle>
            <CardDescription className="text-base">
              Изпратихме ви линк за потвърждение на имейл адреса.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Следващи стъпки:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Отворете имейла си</li>
                <li>Намерете съобщението от PC Builder</li>
                <li>Кликнете на линка за потвърждение</li>
                <li>Влезте в акаунта си</li>
              </ol>
            </div>

            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">Защо няма имейл (често с Supabase)</p>
              <ul className="list-disc list-inside space-y-2">
                <li>
                  Жълтата лента <strong>„Set up custom SMTP“</strong> в{' '}
                  <strong>Authentication → Emails</strong> означава, че вграденият изпращач има{' '}
                  <strong>строги лимити</strong> и често не е подходящ за тестове/продукция. Отворете раздела{' '}
                  <strong>SMTP Settings</strong>, настройте реален SMTP (напр. Resend, Brevo, Gmail SMTP) —{' '}
                  <a
                    className="text-primary underline underline-offset-2"
                    href="https://supabase.com/docs/guides/auth/auth-smtp"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    документация SMTP
                  </a>
                  .
                </li>
                <li>
                  При много опити за регистрация може да сте ударили rate limit — изчакайте или преминете на Custom SMTP.
                </li>
                <li>
                  <strong>Authentication → URL configuration</strong> — добавете{' '}
                  <code className="text-xs bg-background px-1 rounded">
                    {typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '…/auth/callback'}
                  </code>{' '}
                  към <em>Redirect URLs</em> (и реалния си домейн при deploy).
                </li>
                <li>
                  <strong>Authentication → Providers → Email</strong> — провайдърът е Enabled; от същия екран проверете настройките за потвърждение на имейл.
                </li>
                <li>
                  <strong>Logs → Auth</strong> — вижте дали има грешка при изпращане на писмото.
                </li>
              </ul>
            </div>

            <Collapsible className="rounded-lg border border-border bg-card/50">
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 p-4 text-left text-sm font-medium hover:bg-muted/50 rounded-lg">
                <span>Няма SMTP още? Вземи линк за потвърждение от сървъра (за тест)</span>
                <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 space-y-3 text-sm text-muted-foreground">
                <p>
                  Нужни са <code className="text-xs bg-muted px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> и{' '}
                  <code className="text-xs bg-muted px-1 rounded">ADMIN_DASHBOARD_PASSWORD</code> в{' '}
                  <code className="text-xs bg-muted px-1 rounded">.env.local</code>. Service role ключът е тайна — само на сървъра.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="admin-pw-success">Админ парола</Label>
                  <Input
                    id="admin-pw-success"
                    type="password"
                    autoComplete="off"
                    value={adminPw}
                    onChange={(e) => setAdminPw(e.target.value)}
                    placeholder="Както при вход в админ таблото"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={linkLoading}
                  onClick={fetchConfirmationLink}
                >
                  {linkLoading ? 'Генериране…' : 'Генерирай линк'}
                </Button>
                {linkMessage ? (
                  <p className="text-xs text-foreground/90">{linkMessage}</p>
                ) : null}
                {generatedLink ? (
                  <div className="space-y-2">
                    <Label>Линк</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={generatedLink} className="font-mono text-xs" />
                      <Button type="button" variant="outline" onClick={copyLink}>
                        Копирай
                      </Button>
                    </div>
                    <Button asChild className="w-full" variant="default">
                      <a href={generatedLink} rel="noopener noreferrer">
                        Отвори линка
                      </a>
                    </Button>
                  </div>
                ) : null}
              </CollapsibleContent>
            </Collapsible>

            <div className="text-center text-sm text-muted-foreground">
              <p>Не виждате имейла? Проверете папка &quot;Спам&quot;.</p>
              {emailFromQuery ? <p className="mt-1">Имейл: {emailFromQuery}</p> : null}
            </div>

            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={handleResend} disabled={resendLoading}>
                {resendLoading ? 'Изпращане...' : 'Изпрати отново'}
              </Button>
              {resendMessage ? (
                <p className="text-center text-sm text-muted-foreground">{resendMessage}</p>
              ) : null}
              <Button asChild className="w-full">
                <Link href="/auth/login">Към страницата за вход</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function SignUpSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Зареждане...</div>
        </div>
      }
    >
      <SignUpSuccessContent />
    </Suspense>
  )
}
