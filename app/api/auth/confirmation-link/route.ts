import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

type Body = {
  email?: string
  /** Същата стойност като ADMIN_DASHBOARD_PASSWORD в .env.local */
  adminPassword?: string
  /** Парола от регистрацията — нужна за generateLink(type: 'signup'). */
  signupPassword?: string
  redirectTo?: string
}

export async function POST(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const expectedAdmin = process.env.ADMIN_DASHBOARD_PASSWORD

  if (!url || !serviceKey || !expectedAdmin) {
    return NextResponse.json(
      {
        error: 'not_configured',
        message:
          'Липсват SUPABASE_SERVICE_ROLE_KEY или ADMIN_DASHBOARD_PASSWORD в .env.local (сървърни променливи).',
      },
      { status: 503 }
    )
  }

  let body: Body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (body.adminPassword !== expectedAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const email = body.email?.trim()
  if (!email?.includes('@')) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
  }

  const redirectTo =
    body.redirectTo ||
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL ||
    `${new URL(request.url).origin}/auth/callback`

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  if (body.signupPassword && body.signupPassword.length >= 6) {
    const { data: signupData, error: signupErr } =
      await supabase.auth.admin.generateLink({
        type: 'signup',
        email,
        password: body.signupPassword,
        options: { redirectTo },
      })
    if (!signupErr && signupData?.properties?.action_link) {
      return NextResponse.json({
        link: signupData.properties.action_link,
        method: 'signup' as const,
      })
    }
  }

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint:
          'Ако акаунтът е нов с парола, подайте и signupPassword (паролата от формата за регистрация).',
      },
      { status: 400 }
    )
  }

  const actionLink = data?.properties?.action_link
  if (!actionLink) {
    return NextResponse.json({ error: 'No link returned' }, { status: 500 })
  }

  return NextResponse.json({ link: actionLink, method: 'magiclink' as const })
}
