export const SITE_THEME_STORAGE_KEY = 'site-theme'

export const SITE_THEMES = [
  {
    id: 'dark',
    label: 'Нощна',
    description: 'Изчистена черна тема без цветен оттенък',
    swatchClassName: 'bg-zinc-950 border-white/10',
  },
  {
    id: 'light',
    label: 'Бяла',
    description: 'Светла и чиста визия',
    swatchClassName: 'bg-white border-zinc-300',
  },
  {
    id: 'emerald',
    label: 'Зелена',
    description: 'Черно-зелена тема с ясен контраст',
    swatchClassName: 'bg-emerald-500 border-emerald-300/40',
  },
  {
    id: 'ocean',
    label: 'Синя',
    description: 'Студен син tech стил',
    swatchClassName: 'bg-sky-500 border-sky-300/40',
  },
  {
    id: 'violet',
    label: 'Лилава',
    description: 'По-ярък gaming акцент',
    swatchClassName: 'bg-violet-500 border-violet-300/40',
  },
] as const

export type SiteThemeId = (typeof SITE_THEMES)[number]['id']

export const DEFAULT_SITE_THEME: SiteThemeId = 'dark'

const validThemeIds = SITE_THEMES.map((theme) => theme.id)

export function isSiteThemeId(value: string | null | undefined): value is SiteThemeId {
  return Boolean(value && validThemeIds.includes(value as SiteThemeId))
}

export function resolveSiteTheme(value: string | null | undefined): SiteThemeId {
  return isSiteThemeId(value) ? value : DEFAULT_SITE_THEME
}

export function usesDarkClass(theme: SiteThemeId) {
  return theme !== 'light'
}

export function getThemeInitScript() {
  return `(() => {
    try {
      const storageKey = ${JSON.stringify(SITE_THEME_STORAGE_KEY)};
      const defaultTheme = ${JSON.stringify(DEFAULT_SITE_THEME)};
      const validThemes = ${JSON.stringify(validThemeIds)};
      const storedTheme = window.localStorage.getItem(storageKey);
      const theme = validThemes.includes(storedTheme ?? '') ? storedTheme : defaultTheme;
      const root = document.documentElement;
      root.dataset.theme = theme;
      if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        root.classList.add('dark');
      }
    } catch (_error) {
      const root = document.documentElement;
      root.dataset.theme = ${JSON.stringify(DEFAULT_SITE_THEME)};
      root.classList.add('dark');
    }
  })();`
}
