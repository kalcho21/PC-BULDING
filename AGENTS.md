# AGENTS.md — PC Конфигуратор

> Този файл е предназначен за AI агенти (Cursor, Copilot, Claude, Codex и др.) и описва архитектурата, конвенциите и правилата за работа с проекта.

---

## 🧭 Обзор на проекта

**PC Конфигуратор** е Next.js 16 (App Router) уеб приложение на **български език**, което позволява на потребителите да сглобяват компютърни конфигурации с проверка на съвместимостта, 3D визуализация и Revolut плащане.

### Технологичен стек

| Слой | Технология | Версия |
|---|---|---|
| Framework | Next.js (App Router) | 16.1.6 |
| UI | React | 19.2.4 |
| Език | TypeScript | 5.7.3 |
| Стилове | Tailwind CSS | v4 |
| UI компоненти | shadcn/ui + Radix UI | latest |
| 3D | Three.js + @react-three/fiber | ^0.183 / ^9.5 |
| База данни | Supabase (PostgreSQL + Auth + RLS) | ^2.97 |
| Форми | react-hook-form + Zod | ^7.54 / ^3.24 |
| Плащания | Revolut Personal Pay (линк-базирано) | — |
| Имейл | Resend API | — |
| Аналитика | Vercel Analytics | 1.6.1 |
| Пакет мениджър | pnpm (има и package-lock.json) | — |

---

## 📁 Структура на папките

```
/
├── app/                        # Next.js App Router pages
│   ├── layout.tsx              # Root layout — CartProvider, Toaster, Analytics
│   ├── page.tsx                # Начална страница (Server Component)
│   ├── globals.css             # Глобални стилове + CSS переменни
│   ├── admin/                  # /admin — Административен панел
│   ├── api/
│   │   ├── admin/              # Admin API routes (protected)
│   │   ├── auth/               # Supabase auth callbacks
│   │   ├── orders/
│   │   │   ├── customer-thank-you/  # POST → изпраща thank-you имейл
│   │   │   └── revolut-notification/ # Revolut webhook
│   │   └── payments/
│   │       ├── manual-confirmation/  # Upload на скрийншот за потвърждение
│   │       ├── revolut-checkout/
│   │       ├── stripe-checkout/     # ⚠️ Legacy — не се използва активно
│   │       ├── stripe-intent/       # ⚠️ Legacy
│   │       └── stripe-webhook/      # ⚠️ Legacy
│   ├── auth/                   # /auth/login, /auth/register, /auth/callback
│   ├── build-compare/          # Сравнение на сглобки
│   ├── builder/                # /builder — Главен PC конфигуратор
│   ├── builds/                 # Лични и публични сглобки
│   ├── cart/                   # Количка + Revolut плащане
│   ├── catalog/                # Каталог с всички компоненти
│   ├── community/              # Публични сглобки от потребители
│   ├── compare/                # Сравнение на компоненти
│   ├── component/              # /component/[slug] — детайли
│   ├── favorites/              # Любими компоненти
│   └── success/                # Страница след успешна поръчка
│
├── components/
│   ├── ui/                     # shadcn/ui примитиви (НЕ редактирай без нужда)
│   ├── builder-page.tsx        # Главният Builder компонент (1801 реда)
│   ├── catalog-page.tsx        # Каталог с филтри (1185 реда)
│   ├── home-page.tsx           # Начална страница (client component)
│   ├── header.tsx              # Навигация
│   ├── cart-provider.tsx       # React Context за количката
│   ├── cart-hover-preview.tsx  # Hover preview на количката
│   ├── part-selection-modal.tsx # Модал за избор на компонент
│   ├── build-sidebar.tsx       # Десен панел в Builder
│   ├── performance-display.tsx # Визуализация на performance score
│   ├── filter-panel.tsx        # Панел с филтри
│   ├── component-card.tsx      # Карта на компонент
│   ├── theme-picker.tsx        # Смяна на тема
│   └── theme-provider.tsx      # next-themes провайдър
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # createClient() — browser
│   │   ├── server.ts           # createClient() — server (async, cookies)
│   │   └── proxy.ts            # updateSession() — за middleware
│   ├── types.ts                # Всички TypeScript интерфейси
│   ├── compatibility.ts        # Логика за съвместимост + FPS оценки
│   ├── build-wattage.ts        # estimateBuildWattage(build) функция
│   ├── revolut-personal-url.ts # buildPersonalRevolutPayUrl()
│   ├── send-order-thank-you-email.ts # sendOrderThankYouEmail() чрез Resend
│   ├── auth-redirect.ts        # Помощни функции за redirect след auth
│   ├── admin-api-auth.ts       # Проверка на ADMIN_DASHBOARD_PASSWORD
│   ├── signup-temp-storage.ts  # Временно съхранение при регистрация
│   ├── site-theme.ts           # getThemeInitScript() — предотвратява flash
│   └── utils.ts                # cn() utility (clsx + tailwind-merge)
│
├── scripts/                    # SQL миграции (изпълни в ред в Supabase)
│   ├── 001_create_schema.sql   # Пълна схема (препоръчителна)
│   ├── 002_simple_schema.sql   # Опростена алтернатива
│   ├── 003_manual_payment_confirmations.sql
│   ├── 004_allow_bank_transfer_payment_method.sql
│   └── add-new-components.sql  # Примерни данни за компоненти
│
├── hooks/                      # Custom React hooks
├── public/                     # Статични assets (иконки, изображения)
├── middleware.ts               # ⚠️ DEPRECATED — трябва да се преименува в proxy.ts
│                               # (Next.js 16 показва warning за това)
├── next.config.mjs
├── tsconfig.json
└── components.json             # shadcn/ui конфигурация
```

---

## 🗃️ База данни — Supabase

### Главни таблици

| Таблица | Описание | RLS |
|---|---|---|
| `categories` | CPU, GPU, RAM, motherboard, storage, psu, case, cooling | Публично четене |
| `brands` | AMD, Intel, NVIDIA, Corsair, etc. | Публично четене |
| `components` | Всички PC компоненти с `specs JSONB` | Публично четене (is_active=true) |
| `builds` | Потребителски сглобки | Owner + is_public |
| `build_items` | Компоненти в сглобка (join) | Следва builds |
| `profiles` | Разширение на auth.users | Owner only |
| `favorites` | Любими компоненти | Owner only |
| `manual_payment_confirmations` | Revolut поръчки за ръчна проверка | Admin via service role |
| `compatibility_rules` | Правила за съвместимост | Публично четене |
| `compatibility_logs` | История на проверките | Owner only |
| `price_history` | История на цените | Публично четене |

### Важни Supabase заявки (примери)

```typescript
// Вземи всички компоненти с категория и марка
const { data } = await supabase
  .from('components')
  .select('*, category:categories(*), brand:brands(*)')
  .eq('in_stock', true)

// Вземи сглобките на потребителя
const { data } = await supabase
  .from('builds')
  .select('*, items:build_items(*, component:components(*, category:categories(*), brand:brands(*)))')
  .eq('user_id', user.id)

// Добави в любими
await supabase.from('favorites').insert({ user_id, component_id })
```

### `components.specs` JSONB полета

Specs са различни за всяка категория:

```typescript
// CPU: socket, cores, threads, base_clock, boost_clock, tdp, cache, architecture
// GPU: vram, vram_type, cuda_cores, stream_processors, tdp, bus_width, pcie
// RAM: type (DDR4/DDR5), capacity, modules, speed, cas_latency, voltage, rgb
// Motherboard: socket, chipset, form_factor, memory_type, memory_slots, max_memory, wifi, bluetooth
// Storage: type, capacity, interface, read_speed, write_speed, form_factor
// PSU: wattage, efficiency, modular, form_factor, fan_size, pcie_connectors
// Case: form_factor, motherboard_support[], max_gpu_length, max_cpu_cooler_height, side_panel
// Cooling: type, radiator_size, height, tdp_rating, socket_support[], fan_count, rgb
```

---

## 🔐 Автентикация

- Използва **Supabase Auth** с SSR (`@supabase/ssr`)
- `lib/supabase/client.ts` → за Client Components
- `lib/supabase/server.ts` → за Server Components и API Routes (async)
- `lib/supabase/proxy.ts` → за middleware (session refresh)
- `middleware.ts` → обхваща всички routes освен static files

### Admin панел
- `/admin` е защитен с **ADMIN_DASHBOARD_PASSWORD** env var (не Supabase auth)
- Използва `lib/admin-api-auth.ts` за проверка на паролата в API routes

---

## 💰 Плащане — Revolut Personal Pay

**Flow:**
1. Потребителят попълва имена + имейл в `/cart`
2. Системата генерира `ORD-XXXXXX-YYYY` номер
3. `buildPersonalRevolutPayUrl()` генерира Revolut линк с сума + бележка
4. Клиентът отваря Revolut и плаща ръчно
5. `POST /api/orders/customer-thank-you` → изпраща имейл чрез Resend
6. Администраторът потвърждава ръчно от `/admin`

**Stripe** — присъства в `/api/payments/stripe-*` но НЕ е активен в UI. Може да се игнорира.

---

## 🧩 Ключови компоненти — описание

### `BuilderPage` (`components/builder-page.tsx`)
- Главната функционалност на приложението
- Управлява `BuildState` (cpu, gpu, ram, motherboard, storage[], psu, case, cooling)
- Изчислява performance score (0-100) с hardcoded benchmark данни за CPU/GPU
- FPS оценки за 6 игри (CS2, Valorant, Fortnite, GTA V, Warzone, Cyberpunk)
- `handlePresetBuild()` — автоматична сглобка по бюджет (entry/mid/high-end)
- Проверява съвместимост: сокет, RAM тип, PSU ватове, форм фактор на кутия
- Запазва сглобки в Supabase, поддържа публични/частни

### `CatalogPage` (`components/catalog-page.tsx`)
- Филтриране по категория, марка, цена, наличност, търсене
- Advanced spec филтри за всяка категория (сокет, чипсет, VRAM и т.н.)
- Grid/List изглед, сортиране
- Интеграция с favorites (Supabase)
- Добавяне в количката

### `compatibility.ts` (`lib/compatibility.ts`)
- `checkBuildCompatibility()` — пълна проверка (сокет, RAM, PSU, кутия, охлаждане)
- `estimateFps()` — FPS оценки за 15 игри при различни резолюции и настройки
- `getPerformanceSummary()` — tier класификация (Budget → Ultra)
- `calculatePerformanceScore()` — score за gaming/workstation/general
- `generateBuildFromPreset()` — автоматично генериране по бюджет пресет

### `build-wattage.ts` (`lib/build-wattage.ts`)
- `estimateBuildWattage(build)` — изчислява очакваната консумация
- Реалистично: CPU TDP × 1.32, GPU TDP × 1.1, + overhead за останалите части
- Ако GPU.specs.tdp липсва → инферира от модел (RTX/RX серия)

### `cart-provider.tsx` (`components/cart-provider.tsx`)
- React Context с `items`, `addToCart`, `removeFromCart`, `setQuantity`, `clearCart`
- Данните НЕ се пазят в Supabase — само в памет (localStorage не се използва)

---

## 📡 API Routes

| Route | Метод | Описание | Auth |
|---|---|---|---|
| `/api/auth/callback` | GET | Supabase OAuth callback | — |
| `/api/orders/customer-thank-you` | POST | Изпраща thank-you имейл | Без auth |
| `/api/orders/revolut-notification` | POST | Revolut webhook | Без auth |
| `/api/payments/manual-confirmation` | POST | Upload на скрийншот | Без auth |
| `/api/payments/revolut-checkout` | POST | Генерира Revolut линк | Без auth |
| `/api/payments/stripe-*` | * | Legacy Stripe routes | — |
| `/api/admin/*` | POST | Admin операции | ADMIN_DASHBOARD_PASSWORD |

---

## ⚙️ ENV Променливи

```env
# Задължителни
NEXT_PUBLIC_SUPABASE_URL=             # Supabase project URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY= # Supabase anon/publishable key
SUPABASE_SERVICE_ROLE_KEY=            # Service role (само server-side)
ADMIN_DASHBOARD_PASSWORD=             # Парола за /admin

# Незадължителни (имейл)
RESEND_API_KEY=                       # Resend API ключ
ORDER_EMAIL_FROM=                     # "PC Builder <orders@example.com>"
ORDER_NOTIFICATION_EMAIL=             # Имейл за нотификации

# Legacy (не се използва активно)
STRIPE_SECRET_KEY=
NEXT_PUBLIC_APP_URL=
```

Supabase клиентът приема **и двете** имена:
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (стандартно)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (нашето)

---

## ⚠️ Известни проблеми и технически дълг

| Проблем | Файл | Приоритет | Статус |
|---|---|---|---|
| `middleware.ts` трябва да се преименува на `proxy.ts` | `middleware.ts` | Средно | ✅ Поправено — `proxy.ts` създаден |
| Stripe routes присъстват, но не се използват в UI | `app/api/payments/stripe-*` | Ниско | 🟡 Остава (наследство) |
| Количката не се запазва след презареждане | `cart-provider.tsx` | Средно | ✅ Поправено — `localStorage` се използва |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` не е стандартното Supabase env var | `.env.local` | Ниско | 🟡 Клиентът приема и двете имена |
| `components` се зарежда целево на server и се предава като props — не се пагинира | `app/catalog/page.tsx` | Средно | 🔴 Отворено |
| GPU дължина не се проверява реално (hardcoded 300mm) | `lib/compatibility.ts:364` | Средно | 🔴 Отворено |

---

## 🧱 Конвенции за код

### TypeScript
- Всички интерфейси са в `lib/types.ts`
- `Component.specs` е `ComponentSpecs` — optional полета за всяка категория
- Суpabase заявки използват generic тип inferrence (не е нужно да го указваш)

### Стилове
- Tailwind CSS v4 — използвай utility класове
- `cn()` от `lib/utils.ts` за условни класове
- shadcn/ui компоненти са в `components/ui/` — не ги редактирай директно
- Тъмна тема по подразбиране (`dark` клас на `<html>`)

### Именуване
- Файлове: `kebab-case.tsx`
- Компоненти: `PascalCase`
- Функции: `camelCase`
- Database таблици: `snake_case`
- Категории (slug): `cpu`, `gpu`, `ram`, `motherboard`, `storage`, `psu`, `case`, `cooling`

### Supabase
- Browser: `import { createClient } from '@/lib/supabase/client'`
- Server: `import { createClient } from '@/lib/supabase/server'` (async!)
- Никога не слагай service role key в client-side код

### Езикови конвенции
- UI текстовете са на **български**
- Code коментарите могат да са на английски или български
- Error messages в `toast.*()` са на български

---

## 🏗️ Data Flow

```
Server Component (page.tsx)
  → Supabase Server Client
  → Fetch categories, components, builds
  → Pass as props to Client Component

Client Component (e.g. builder-page.tsx, catalog-page.tsx)
  → Receives data as props (no re-fetching)
  → Local state за UI (useState)
  → Direct Supabase calls само за mutations (add favorite, save build)
  → CartProvider Context за количката
```

---

## 🔧 Команди

```bash
# Dev сървър
pnpm dev   # или npm run dev

# Build
pnpm build

# Lint
pnpm lint
```

---

## 📋 Задачи за AI агент

Когато правиш промени в този проект:

1. **Не нарушавай** съвместимостта с Supabase RLS политиките
2. **Запазвай** българския текст в UI компонентите
3. **Провери** дали промяна в `lib/types.ts` не чупи другите файлове
4. **Не добавяй** нови npm пакети без необходимост — вече има много зависимости
5. **Използвай** `cn()` от `lib/utils.ts` за Tailwind класове
6. **Пази** service role key само в server-side код (API routes, Server Components)
7. **Middleware** — ако трябва да го редактираш, имай предвид че трябва преименуване на `proxy.ts`
8. **Stripe** — не изтривай Stripe routes, но не разчитай на тях за нова функционалност
9. **Performance** — `components` масивът може да е голям; не го филтрирай на всеки render без `useMemo`
10. **SQL** — нови таблици добави като нов файл в `/scripts/` с пореден номер
