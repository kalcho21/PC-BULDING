import { createClient } from '@/lib/supabase/server'
import { CatalogPage } from '@/components/catalog-page'

export const metadata = {
  title: 'Каталог Компоненти - PC Конфигуратор',
  description: 'Разгледайте нашия богат каталог от компютърни компоненти - процесори, видеокарти, RAM памет, дънни платки, съхранение и още.',
}

export default async function Catalog() {
  const supabase = await createClient()

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('display_order')

  const { data: brands } = await supabase
    .from('brands')
    .select('*')
    .order('name')

  const { data: components } = await supabase
    .from('components')
    .select(`
      *,
      category:categories(*),
      brand:brands(*)
    `)
    .order('name')

  return (
    <CatalogPage
      categories={categories || []}
      brands={brands || []}
      components={components || []}
    />
  )
}
