import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  adminDashboardPasswordMatches,
  getSupabaseServiceConfig,
} from '@/lib/admin-api-auth'

export async function POST(request: Request) {
  const cfg = getSupabaseServiceConfig()
  if (!cfg) {
    return NextResponse.json({ configured: false as const })
  }

  let body: { password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!adminDashboardPasswordMatches(body.password)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(cfg.url, cfg.serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let data: Record<string, unknown>[] | null = null
  let error: { message: string } | null = null

  const firstQuery = await supabase
    .from('builds')
    .select(
      'id, name, total_price, created_at, user_id, is_public, profiles(email, full_name)'
    )
    .order('created_at', { ascending: false })
    .limit(2000)
  data = firstQuery.data as Record<string, unknown>[] | null
  error = firstQuery.error

  if (error) {
    const retry = await supabase
      .from('builds')
      .select('id, name, total_price, created_at, user_id, is_public')
      .order('created_at', { ascending: false })
      .limit(2000)
    const rows = (retry.data ?? []) as Record<string, unknown>[]
    const userIds = Array.from(
      new Set(
        rows
          .map((row) => (typeof row.user_id === 'string' ? row.user_id : null))
          .filter(Boolean)
      )
    ) as string[]

    let profileById = new Map<string, { email?: string | null; full_name?: string | null }>()
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)
      profileById = new Map(
        (profiles ?? []).map((profile) => [
          String(profile.id),
          { email: profile.email, full_name: profile.full_name },
        ])
      )
    }

    data = rows.map((row) => ({
      ...row,
      profiles:
        typeof row.user_id === 'string' ? profileById.get(row.user_id) ?? null : null,
    }))
    error = retry.error
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const builds = (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    name: String(row.name ?? 'Untitled build'),
  }))

  return NextResponse.json({
    configured: true as const,
    builds,
  })
}
