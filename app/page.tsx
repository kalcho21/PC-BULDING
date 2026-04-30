import { createClient } from '@/lib/supabase/server'
import { HomePage } from '@/components/home-page'

export default async function Home() {
  const supabase = await createClient()

  // Fetch categories
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .order('display_order')

  // Fetch featured components (top rated)
  const { data: featuredComponents } = await supabase
    .from('components')
    .select(`
      *,
      category:categories(*),
      brand:brands(*)
    `)
    .eq('in_stock', true)
    .order('rating', { ascending: false })
    .limit(8)

  // Fetch in-stock components for more accurate preset pricing
  const { data: presetComponents } = await supabase
    .from('components')
    .select(`
      *,
      category:categories(*),
      brand:brands(*)
    `)
    .eq('in_stock', true)

  // Get component counts per category
  const { data: componentCounts } = await supabase
    .from('components')
    .select('category_id')

  const categoryCounts: Record<string, number> = {}
  componentCounts?.forEach(c => {
    categoryCounts[c.category_id] = (categoryCounts[c.category_id] || 0) + 1
  })

  return (
    <HomePage
      categories={categories || []}
      featuredComponents={featuredComponents || []}
      presetComponents={presetComponents || []}
      categoryCounts={categoryCounts}
    />
  )
}
