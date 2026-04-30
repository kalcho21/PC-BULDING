import { createClient } from '@/lib/supabase/server'
import { BuilderPage } from '@/components/builder-page'

export const metadata = {
  title: 'PC Конфигуратор - Сглоби своя компютър',
  description: 'Избери компоненти и създай перфектната PC конфигурация',
}

export default async function Builder() {
  const supabase = await createClient()

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('display_order')

  // Fetch brands
  const { data: brands } = await supabase
    .from('brands')
    .select('*')
    .order('name')

  // Fetch all components with category and brand data
  const { data: components } = await supabase
    .from('components')
    .select(`
      *,
      category:categories(*),
      brand:brands(*)
    `)
    .order('name')

  return (
    <BuilderPage
      categories={categories || []}
      brands={brands || []}
      components={components || []}
    />
  )
}
