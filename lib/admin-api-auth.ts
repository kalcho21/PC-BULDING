/**
 * Admin dashboard uses sessionStorage password (see app/admin/page.tsx).
 * API routes accept the same secret; env vars override the default for production.
 */
export function getAdminDashboardPassword(): string {
  return (
    process.env.ADMIN_DASHBOARD_PASSWORD?.trim() ||
    process.env.ADMIN_METRICS_PASSWORD?.trim() ||
    '1324'
  )
}

export function adminDashboardPasswordMatches(input: string | undefined): boolean {
  if (!input) return false
  return input === getAdminDashboardPassword()
}

export function getSupabaseServiceConfig():
  | { url: string; serviceKey: string }
  | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) return null
  return { url, serviceKey }
}
