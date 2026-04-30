/**
 * URL за потвърждение на имейл и OAuth (трябва да е в списъка Redirect URLs в Supabase).
 * В dev използваме текущия origin, за да съвпада портът (3000, 3001, …), а не закован localhost:3000 в .env.
 */
export function getAuthCallbackUrl(): string {
  if (typeof window !== 'undefined') {
    const envUrl = process.env.NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL
    if (envUrl) {
      try {
        if (new URL(envUrl).origin === window.location.origin) return envUrl
      } catch {
        /* ignore invalid env */
      }
    }
    return `${window.location.origin}/auth/callback`
  }

  const fromEnv =
    process.env.NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL ||
    (process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')}/auth/callback`
      : '')
  return fromEnv || ''
}
