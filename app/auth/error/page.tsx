import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string; type?: string }>
}) {
  const params = await searchParams
  const errorType = params?.type
  const errorMessage = params?.message || params?.error

  const getErrorContent = () => {
    switch (errorType) {
      case 'expired':
        return {
          title: 'Линкът е изтекъл',
          description: 'Линкът за потвърждение е изтекъл или вече е бил използван.',
          showResend: true,
        }
      case 'invalid':
        return {
          title: 'Невалиден линк',
          description: 'Линкът за потвърждение е невалиден.',
          showResend: true,
        }
      default:
        return {
          title: 'Възникна грешка',
          description: errorMessage || 'Възникна неочаквана грешка. Моля, опитайте отново.',
          showResend: false,
        }
    }
  }

  const content = getErrorContent()

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-background">
      <div className="w-full max-w-md">
        <Card className="border-destructive/20">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">{content.title}</CardTitle>
            <CardDescription className="text-base">
              {content.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {content.showResend && (
              <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
                <p>Можете да поискате нов линк за потвърждение от страницата за регистрация.</p>
              </div>
            )}

            <div className="flex flex-col gap-2">
              {content.showResend && (
                <Button asChild className="w-full">
                  <Link href="/auth/sign-up">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Регистрирай се отново
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="w-full border-primary text-primary hover:bg-primary/10 hover:text-primary">
                <Link href="/auth/login">
                  <ArrowLeft className="mr-2 h-4 w-4 text-primary" />
                  Към страницата за вход
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/">Към началната страница</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
