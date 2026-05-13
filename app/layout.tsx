import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { CartProvider } from '@/components/cart-provider'
import { Toaster } from '@/components/ui/sonner'
import { getThemeInitScript } from '@/lib/site-theme'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'PC Конфигуратор - Сглоби мечтания си компютър',
  description: 'Създай и визуализирай персонализирани PC сглобки с 3D преглед в реално време, проверка на съвместимостта и оценка на производителността. Сравни компоненти и намери перфектните части за твоя гейминг или работен компютър.',
  keywords: ['PC конфигуратор', 'сглобка', 'гейминг PC', 'работна станция', 'компютърни части', 'видеокарта', 'процесор', 'сглоби компютър'],
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1a1a2e',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const themeInitScript = getThemeInitScript()

  return (
    <html lang="bg" className="dark bg-background" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased min-h-screen`}>
        <CartProvider>
          {children}
          <Toaster />
          <Analytics />
        </CartProvider>
      </body>
    </html>
  )
}
