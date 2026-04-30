import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Моят профил — PC Конфигуратор',
  description: 'Управление на профила, сглобки и любими компоненти',
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children
}
