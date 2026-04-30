export type OrderThankYouEmailParams = {
  to: string
  orderNumber: string
  customerName?: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Изпраща имейл до клиента чрез Resend.
 * Изисква RESEND_API_KEY и (препоръчително) ORDER_EMAIL_FROM в .env.local.
 */
export async function sendOrderThankYouEmail(
  params: OrderThankYouEmailParams,
): Promise<{ ok: true } | { ok: false; reason: 'not_configured' | 'send_failed' }> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const from =
    process.env.ORDER_EMAIL_FROM?.trim() || 'PC Builder <onboarding@resend.dev>'

  if (!apiKey) {
    console.warn('[order-email] RESEND_API_KEY липсва — пропускаме имейл до клиента.')
    return { ok: false, reason: 'not_configured' }
  }

  const { to, orderNumber, customerName } = params
  const safeOrder = escapeHtml(orderNumber)
  const greeting = customerName?.trim()
    ? `Здравейте, ${escapeHtml(customerName.trim())},`
    : 'Здравейте,'

  const html = `<!DOCTYPE html>
<html lang="bg">
<body style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; line-height: 1.6; color: #111;">
  <p>${greeting}</p>
  <p>Благодарим Ви за поръчката!</p>
  <p>Номер на поръчката: <strong>${safeOrder}</strong></p>
  <p>Ще я обработим възможно най-скоро. При нужда ще се свържем с Вас на този имейл адрес.</p>
  <p>С уважение,<br/>Екипът</p>
</body>
</html>`

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: `Благодарим за поръчката №${orderNumber}`,
      html,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('[order-email] Resend грешка', response.status, detail)
    return { ok: false, reason: 'send_failed' }
  }

  return { ok: true }
}
