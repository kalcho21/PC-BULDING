"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings } from "lucide-react"

export default function AdminSettingsPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-7 w-7" />
          Настройки
        </h1>
        <p className="text-muted-foreground text-sm">
          Административни опции
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Конфигурация</CardTitle>
          <CardDescription>
            Имейл потвърждение, URL за пренасочване и API ключове се управляват в
            конзолата на Supabase и във файла{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.local</code>{" "}
            (напр.{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL
            </code>
            ).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-3">
          <p>
            За потвърждение по имейл добавете в Supabase →{" "}
            <strong>Authentication → URL configuration</strong> всеки адрес от вида{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">…/auth/callback</code>{" "}
            (напр. <code className="text-xs bg-muted px-1 py-0.5 rounded">http://localhost:3001/auth/callback</code> ако ползвате порт 3001).
          </p>
          <p>
            Без пристигащи писма: <strong>Authentication → Emails</strong> (или Custom SMTP), и{" "}
            <strong>Logs → Auth</strong> за грешки. Без SMTP проектът разчита на вградения изпращач на Supabase (лимити).
          </p>
          <p>
            За точни броячи в Аналитика задайте{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">SUPABASE_SERVICE_ROLE_KEY</code> и{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">ADMIN_DASHBOARD_PASSWORD</code> в{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.local</code>, после влезте отново в админ с таблото.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
