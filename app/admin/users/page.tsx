"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Users, Mail, Calendar } from "lucide-react"

interface UserProfile {
  id: string
  email?: string | null
  full_name: string | null
  created_at: string | null
  updated_at?: string | null
  last_online_at?: string | null
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            email: user.email ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" }
        )
      }

      const pw =
        typeof window !== "undefined"
          ? sessionStorage.getItem("admin_metrics_password") || "1324"
          : null

      if (pw) {
        try {
          const res = await fetch("/api/admin/profiles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: pw }),
          })
          const payload = await res.json()
          if (payload.configured && Array.isArray(payload.users)) {
            setUsers(payload.users as UserProfile[])
            setLoading(false)
            return
          }
        } catch {
          /* fall back */
        }
      }

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
      setUsers((data as UserProfile[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  const formatDate = (dateStr?: string | null) =>
    dateStr
      ? new Date(dateStr).toLocaleDateString("bg-BG", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Няма данни"

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-pulse text-muted-foreground">Зареждане...</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Потребители</h1>
        <p className="text-muted-foreground text-sm">
          Регистрирани клиенти в системата
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Списък ({users.length})
          </CardTitle>
          <CardDescription>Имейл, име, регистрация и последно онлайн</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">
              Няма регистрирани потребители
            </p>
          ) : (
            <ScrollArea className="h-[min(70vh,560px)]">
              <div className="space-y-3 pr-4">
                {users.map((user) => (
                  <Card key={user.id} className="bg-muted/30">
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">
                              {user.full_name || "Без име"}
                            </p>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Mail className="h-3 w-3 shrink-0" />
                              <span className="truncate">{user.email || "—"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="secondary" className="text-xs">
                            {user.id.slice(0, 8)}…
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Рег: {formatDate(user.created_at)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Онлайн: {formatDate(user.last_online_at || user.updated_at)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
