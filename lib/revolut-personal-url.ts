/**
 * Revolut.Me (SPA): валидни са само пътища като /:username — допълнителни сегменти (/user/eur0.23/…) водят до
 * пренасочване към revolut.com/send-and-receive. Сумата се подава само през query; там се ползва parseInt(amount),
 * затова за EUR изпращаме сума в цели центове (0.23 → 23), не "0.23".
 */
export function buildPersonalRevolutPayUrl(
  baseLink: string,
  amount: number,
  currency: string,
  orderRef: string,
) {
  const trimmed = baseLink.trim()
  if (!trimmed) {
    throw new Error('empty_revolut_link')
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  const url = new URL(withProtocol)
  const ccyUpper = currency.trim().toUpperCase()
  if (!ccyUpper) {
    throw new Error('empty_currency')
  }

  const cents = Math.round(amount * 100)
  if (!Number.isFinite(amount) || cents <= 0) {
    throw new Error('invalid_amount')
  }

  const major = cents / 100
  const amountMajorStr = cents % 100 === 0 ? String(Math.trunc(major)) : major.toFixed(2)

  const noteRaw = orderRef.trim()

  const host = url.hostname.toLowerCase()
  if (host === 'revolut.me' || host.endsWith('.revolut.me')) {
    const segments = url.pathname.split('/').filter(Boolean)
    const user = segments[0]
    if (!user || !/^[a-z0-9._-]+$/i.test(user)) {
      throw new Error('missing_revolut_username')
    }

    const pay = new URL(`https://revolut.me/${encodeURIComponent(user)}`)
    pay.searchParams.set('amount', String(cents))
    pay.searchParams.set('currency', ccyUpper)
    if (noteRaw) {
      pay.searchParams.set('note', noteRaw)
    }
    return pay.toString()
  }

  const withQuery = new URL(url.toString())
  withQuery.searchParams.set('amount', amountMajorStr)
  withQuery.searchParams.set('currency', ccyUpper)
  if (noteRaw) {
    withQuery.searchParams.set('note', noteRaw)
    withQuery.searchParams.set('comment', noteRaw)
  }
  return withQuery.toString()
}
