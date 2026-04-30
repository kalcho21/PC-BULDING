import { NextResponse } from 'next/server'
import { sendOrderThankYouEmail } from '@/lib/send-order-thank-you-email'

/** Съвпада с формата от createOrderNumber() в количката. */
const ORDER_NUMBER_RE = /^ORD-\d+-[A-Z0-9]+$/i

function isLikelyEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const record = body as Record<string, unknown>
  const email = String(record.email ?? '').trim()
  const orderNumber = String(record.orderNumber ?? '').trim()
  const customerName = String(record.customerName ?? '').trim()

  if (!email || !isLikelyEmail(email)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  if (!ORDER_NUMBER_RE.test(orderNumber)) {
    return NextResponse.json({ error: 'invalid_order_number' }, { status: 400 })
  }

  const result = await sendOrderThankYouEmail({
    to: email,
    orderNumber,
    customerName: customerName || undefined,
  })

  return NextResponse.json({
    ok: true,
    sent: result.ok,
  })
}
