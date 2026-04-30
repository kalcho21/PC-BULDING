'use client'

import { useEffect, useState } from 'react'
import { Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  DEFAULT_SITE_THEME,
  resolveSiteTheme,
  SITE_THEMES,
  SITE_THEME_STORAGE_KEY,
  type SiteThemeId,
  usesDarkClass,
} from '@/lib/site-theme'

interface ThemePickerProps {
  buttonClassName?: string
  align?: 'start' | 'center' | 'end'
}

export function ThemePicker({
  buttonClassName,
  align = 'end',
}: ThemePickerProps) {
  const [mounted, setMounted] = useState(false)
  const [selectedTheme, setSelectedTheme] = useState<SiteThemeId>(DEFAULT_SITE_THEME)

  useEffect(() => {
    const rootTheme = document.documentElement.dataset.theme
    const storedTheme = window.localStorage.getItem(SITE_THEME_STORAGE_KEY)
    setSelectedTheme(resolveSiteTheme(rootTheme || storedTheme))
    setMounted(true)
  }, [])

  const applyTheme = (theme: SiteThemeId) => {
    const root = document.documentElement
    root.dataset.theme = theme

    if (usesDarkClass(theme)) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }

    window.localStorage.setItem(SITE_THEME_STORAGE_KEY, theme)
    setSelectedTheme(theme)
  }

  const activeTheme = SITE_THEMES.find((theme) => theme.id === selectedTheme) ?? SITE_THEMES[0]
  const triggerClassName = cn(
    'gap-2 rounded-xl text-foreground hover:bg-secondary/80',
    buttonClassName
  )

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={triggerClassName}
        type="button"
        disabled
        aria-hidden="true"
      >
        <Palette className="h-4 w-4" />
        <span className="hidden sm:inline">Тема</span>
        <span className="hidden xl:inline text-muted-foreground">{activeTheme.label}</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={triggerClassName}
        >
          <Palette className="h-4 w-4" />
          <span className="hidden sm:inline">Тема</span>
          <span className="hidden xl:inline text-muted-foreground">{activeTheme.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        className="w-[280px] rounded-2xl border-border/70 bg-popover/95 p-2 backdrop-blur"
      >
        <DropdownMenuLabel className="px-2 py-2">
          Цветова тема
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={selectedTheme}
          onValueChange={(value) => applyTheme(resolveSiteTheme(value))}
        >
          {SITE_THEMES.map((theme) => (
            <DropdownMenuRadioItem
              key={theme.id}
              value={theme.id}
              className="items-start rounded-xl py-3 pr-3 pl-8"
            >
              <span
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0 rounded-full border shadow-sm',
                  theme.swatchClassName
                )}
              />
              <span className="min-w-0">
                <span className="block font-medium">{theme.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {theme.description}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
