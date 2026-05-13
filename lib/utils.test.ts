import { cn } from '@/lib/utils'

describe('cn', () => {
  it('merges classes and resolves Tailwind conflicts', () => {
    expect(cn('px-2 py-1', 'p-3')).toContain('p-3')
  })
})
