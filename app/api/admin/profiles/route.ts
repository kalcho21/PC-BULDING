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

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(2000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const emailByUserId = new Map<string, string>()
  const authMetaByUserId = new Map<
    string,
    { created_at: string | null; last_sign_in_at: string | null }
  >()
  try {
    let page = 1
    const perPage = 1000
    for (;;) {
      const { data: authData, error: listErr } =
        await supabase.auth.admin.listUsers({ page, perPage })
      if (listErr) break
      const batch = authData?.users ?? []
      for (const u of batch) {
        if (u.email) emailByUserId.set(u.id, u.email)
        authMetaByUserId.set(u.id, {
          created_at: u.created_at ?? null,
          last_sign_in_at: u.last_sign_in_at ?? null,
        })
      }
      if (batch.length < perPage) break
      page += 1
      if (page > 50) break
    }
  } catch {
    /* имейлите остават само от profiles, ако има колона */
  }

  const profileById = new Map<string, Record<string, unknown>>(
    (profiles ?? []).map((p) => [String((p as Record<string, unknown>).id), p as Record<string, unknown>])
  )

  const allUserIds = new Set<string>([
    ...profileById.keys(),
    ...authMetaByUserId.keys(),
  ])

  const rows = Array.from(allUserIds).map((id) => {
    const profile = profileById.get(id) ?? {}
    const authMeta = authMetaByUserId.get(id)
    const fromProfile =
      typeof profile.email === 'string' ? profile.email : null
    const fromAuth = emailByUserId.get(id) ?? null

    return {
      id,
      ...profile,
      email: fromProfile ?? fromAuth,
      created_at:
        typeof profile.created_at === 'string'
          ? profile.created_at
          : authMeta?.created_at ?? null,
      last_online_at:
        authMeta?.last_sign_in_at ??
        (typeof profile.updated_at === 'string' ? profile.updated_at : null),
    }
  })

  rows.sort((a, b) => {
    const aCreated = a.created_at ? new Date(a.created_at).getTime() : 0
    const bCreated = b.created_at ? new Date(b.created_at).getTime() : 0
    return bCreated - aCreated
  })

  return NextResponse.json({ configured: true as const, users: rows })
}
