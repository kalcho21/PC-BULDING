import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  if (error) {
    const errorMessage = error_description || error
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(errorMessage)}`
    )
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent('Липсват настройки за Supabase.')}`
    )
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent('Невалиден линк за потвърждение.')}`
    )
  }

  const cookieStore = await cookies()

  // Важно: Set-Cookie от exchangeCodeForSession трябва да се прикачи към ТОЗИ redirect,
  // иначе сесията не стига до браузъра и при следващ вход изглежда „имейлът не е потвърден“.
  const redirectOnSuccess = NextResponse.redirect(`${origin}/auth/verified`)

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          redirectOnSuccess.cookies.set(name, value, options)
        })
      },
    },
  })

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

  if (exchangeError) {
    if (exchangeError.message.includes('expired')) {
      return NextResponse.redirect(
        `${origin}/auth/error?type=expired&message=${encodeURIComponent('Линкът за потвърждение е изтекъл. Моля, поискайте нов.')}`
      )
    }
    if (exchangeError.message.includes('already')) {
      return NextResponse.redirect(
        `${origin}/auth/login?message=${encodeURIComponent('Имейлът вече е потвърден. Можете да влезете.')}`
      )
    }
    return NextResponse.redirect(
      `${origin}/auth/error?message=${encodeURIComponent(exchangeError.message)}`
    )
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const fullName =
        typeof user.user_metadata?.full_name === 'string'
          ? user.user_metadata.full_name
          : typeof user.user_metadata?.name === 'string'
            ? user.user_metadata.name
            : null

      await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email ?? null,
          full_name: fullName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
    }
  } catch {
    /* ignore profile sync errors during callback */
  }

  return redirectOnSuccess
}
