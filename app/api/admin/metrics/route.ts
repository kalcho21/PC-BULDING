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

  const [
    { count: components },
    { count: users },
    { count: builds },
    { count: favorites },
    { count: categories },
    { count: brands },
  ] = await Promise.all([
    supabase.from('components').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('builds').select('*', { count: 'exact', head: true }),
    supabase.from('favorites').select('*', { count: 'exact', head: true }),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('brands').select('*', { count: 'exact', head: true }),
  ])

  return NextResponse.json({
    configured: true as const,
    components: components ?? 0,
    users: users ?? 0,
    builds: builds ?? 0,
    favorites: favorites ?? 0,
    categories: categories ?? 0,
    brands: brands ?? 0,
  })
}
