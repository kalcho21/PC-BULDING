import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseServiceConfig } from '@/lib/admin-api-auth'
import { sendOrderThankYouEmail } from '@/lib/send-order-thank-you-email'

const PAYMENT_PROOFS_BUCKET = 'payment-proofs'
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_FILE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const ALLOWED_PAYMENT_METHODS = new Set(['revolut'])

type CartItemPayload = {
  id?: string
  name?: string
  slug?: string
  quantity?: number
  unitPrice?: number
  lineTotal?: number
}

function sanitizeFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-_]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function getFileExtension(file: File) {
  const fileName = file.name || 'proof'
  const rawExtension = fileName.includes('.') ? fileName.split('.').pop() || '' : ''
  if (rawExtension) return sanitizeFilePart(rawExtension) || 'png'
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/webp') return 'webp'
  return 'png'
}

export async function POST(request: Request) {
  const serviceConfig = getSupabaseServiceConfig()

  if (!serviceConfig) {
    return NextResponse.json(
      {
        error: 'not_configured',
        message:
          'Липсват NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY в .env.local.',
      },
      { status: 503 },
    )
  }

  let formData: FormData

  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json(
      {
        error: 'invalid_form_data',
        message: 'Невалидни данни от формата.',
      },
      { status: 400 },
    )
  }

  const fullName = String(formData.get('fullName') || '').trim()
  const customerEmail = String(formData.get('customerEmail') || '').trim()
  const orderNumber = String(formData.get('orderNumber') || '').trim()
  const paymentMethod = String(formData.get('paymentMethod') || '').trim()
  const currency = String(formData.get('currency') || 'EUR').trim().toUpperCase()
  const totalAmount = Number(formData.get('totalAmount') || 0)
  const itemsRaw = String(formData.get('items') || '[]')
  const paymentProof = formData.get('paymentProof')

  if (!fullName || !orderNumber) {
    return NextResponse.json(
      {
        error: 'missing_fields',
        message: 'Името и номерът на поръчката са задължителни.',
      },
      { status: 400 },
    )
  }

  if (!ALLOWED_PAYMENT_METHODS.has(paymentMethod)) {
    return NextResponse.json(
      {
        error: 'invalid_payment_method',
        message: 'Невалиден начин на плащане.',
      },
      { status: 400 },
    )
  }

  if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
    return NextResponse.json(
      {
        error: 'invalid_amount',
        message: 'Сумата за плащане е невалидна.',
      },
      { status: 400 },
    )
  }

  if (!(paymentProof instanceof File)) {
    return NextResponse.json(
      {
        error: 'missing_proof',
        message: 'Прикачи скрийншот от плащането.',
      },
      { status: 400 },
    )
  }

  if (!ALLOWED_FILE_TYPES.has(paymentProof.type)) {
    return NextResponse.json(
      {
        error: 'invalid_file_type',
        message: 'Скрийншотът трябва да е PNG, JPG или WEBP.',
      },
      { status: 400 },
    )
  }

  if (paymentProof.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      {
        error: 'file_too_large',
        message: 'Скрийншотът трябва да е до 5 MB.',
      },
      { status: 400 },
    )
  }

  let items: CartItemPayload[]

  try {
    const parsed = JSON.parse(itemsRaw)
    items = Array.isArray(parsed) ? parsed : []
  } catch {
    return NextResponse.json(
      {
        error: 'invalid_items',
        message: 'Списъкът с артикули е невалиден.',
      },
      { status: 400 },
    )
  }

  const supabase = createClient(serviceConfig.url, serviceConfig.serviceKey)
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

  if (bucketsError) {
    return NextResponse.json(
      {
        error: 'storage_unavailable',
        message: 'Неуспешна връзка със storage услугата.',
      },
      { status: 500 },
    )
  }

  const bucketExists = buckets.some(
    (bucket) => bucket.id === PAYMENT_PROOFS_BUCKET || bucket.name === PAYMENT_PROOFS_BUCKET,
  )

  if (!bucketExists) {
    const { error: createBucketError } = await supabase.storage.createBucket(PAYMENT_PROOFS_BUCKET, {
      public: false,
      fileSizeLimit: MAX_FILE_SIZE_BYTES,
      allowedMimeTypes: [...ALLOWED_FILE_TYPES],
    })

    if (createBucketError) {
      return NextResponse.json(
        {
          error: 'bucket_create_failed',
          message: 'Неуспешно създаване на bucket за screenshot файловете.',
        },
        { status: 500 },
      )
    }
  }

  const fileExtension = getFileExtension(paymentProof)
  const originalBaseName = paymentProof.name.replace(/\.[^.]+$/, '') || 'payment-proof'
  const safeBaseName = sanitizeFilePart(originalBaseName) || 'payment-proof'
  const proofPath = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}-${safeBaseName}.${fileExtension}`
  const proofBuffer = Buffer.from(await paymentProof.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from(PAYMENT_PROOFS_BUCKET)
    .upload(proofPath, proofBuffer, {
      contentType: paymentProof.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json(
      {
        error: 'upload_failed',
        message: 'Неуспешно качване на screenshot файла.',
      },
      { status: 500 },
    )
  }

  const { data: insertedConfirmation, error: insertError } = await supabase
    .from('manual_payment_confirmations')
    .insert({
      order_number: orderNumber,
      full_name: fullName,
      payment_method: paymentMethod,
      total_amount: totalAmount,
      currency,
      cart_items: items,
      proof_bucket: PAYMENT_PROOFS_BUCKET,
      proof_path: proofPath,
      proof_file_name: paymentProof.name,
      proof_content_type: paymentProof.type,
      proof_size_bytes: paymentProof.size,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError) {
    await supabase.storage.from(PAYMENT_PROOFS_BUCKET).remove([proofPath])

    return NextResponse.json(
      {
        error: 'insert_failed',
        message:
          'Неуспешно записване на поръчката. Провери дали SQL за manual_payment_confirmations е изпълнен.',
      },
      { status: 500 },
    )
  }

  if (customerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    void sendOrderThankYouEmail({
      to: customerEmail,
      orderNumber,
      customerName: fullName,
    })
  }

  return NextResponse.json({
    success: true,
    confirmationId: insertedConfirmation.id,
    message: 'Поръчката е приета.',
  })
}
