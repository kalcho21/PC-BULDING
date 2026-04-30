"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { BarChart3 } from "lucide-react"

export default function AdminAnalyticsPage() {
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>(
    []
  )
  const [loading, setLoading] = useState(true)

  const axisColor = "var(--foreground)"
  const gridColor = "var(--border)"

  useEffect(() => {
    async function load() {
      const pw =
        typeof window !== "undefined"
          ? sessionStorage.getItem("admin_metrics_password")
          : null

      if (pw) {
        try {
          const res = await fetch("/api/admin/metrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password: pw }),
          })
          const data = await res.json()
          if (data.configured) {
            setChartData([
              { name: "Компоненти", value: data.components },
              { name: "Потребители", value: data.users },
              { name: "Сглобки", value: data.builds },
              { name: "Любими", value: data.favorites },
              { name: "Категории", value: data.categories },
              { name: "Марки", value: data.brands },
            ])
            setLoading(false)
            return
          }
        } catch {
          /* fall back to anon client */
        }
      }

      const supabase = createClient()
      const [
        { count: components },
        { count: users },
        { count: builds },
        { count: favorites },
        { count: categories },
        { count: brands },
      ] = await Promise.all([
        supabase.from("components").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("builds").select("*", { count: "exact", head: true }),
        supabase.from("favorites").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
        supabase.from("brands").select("*", { count: "exact", head: true }),
      ])

      setChartData([
        { name: "Компоненти", value: components || 0 },
        { name: "Потребители", value: users || 0 },
        { name: "Сглобки", value: builds || 0 },
        { name: "Любими", value: favorites || 0 },
        { name: "Категории", value: categories || 0 },
        { name: "Марки", value: brands || 0 },
      ])
      setLoading(false)
    }
    load()
  }, [])

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
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-7 w-7" />
          Аналитика
        </h1>
        <p className="text-muted-foreground text-sm">
          Обобщени числа от базата данни
        </p>
      </div>

      <Card className="border border-border/70">
        <CardHeader>
          <CardTitle>Разпределение</CardTitle>
          <CardDescription>
            Ключови показатели за магазина и потребителите
          </CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 4, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="name"
                stroke={axisColor}
                tick={{ fontSize: 11, fill: axisColor }}
                tickLine={{ stroke: axisColor }}
                axisLine={{ stroke: axisColor }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={72}
              />
              <YAxis
                allowDecimals={false}
                stroke={axisColor}
                tick={{ fontSize: 12, fill: axisColor }}
                tickLine={{ stroke: axisColor }}
                axisLine={{ stroke: axisColor }}
              />
              <Tooltip
                cursor={{ fill: 'transparent', strokeWidth: 0 }}
                contentStyle={{
                  backgroundColor: "var(--popover)",
                  color: "var(--popover-foreground)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px color-mix(in oklch, var(--background), transparent 55%)",
                }}
                labelStyle={{ color: "var(--popover-foreground)", fontWeight: 600 }}
                itemStyle={{ color: "var(--popover-foreground)" }}
              />
              <Bar
                dataKey="value"
                fill="var(--primary)"
                stroke="var(--primary)"
                strokeWidth={1}
                radius={[4, 4, 0, 0]}
                activeBar={false}
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
