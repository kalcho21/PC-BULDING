# PC Конфигуратор

Интерактивен уеб конфигуратор за PC: съвместимост в реално време, оценка на производителност, каталог, количка, потребителски сглобки чрез **Supabase**, плащане чрез **Revolut Personal Pay** (линк) и опционални имейли с **Resend**.

Стек: **Next.js 16** (App Router), **React 19**, **TypeScript**, **Tailwind CSS v4**, **Supabase**, **Three.js** (3D преглед там, където е интегриран).

---

## Съдържание

- [Изисквания](#изисквания)
- [Бърз старт](#бърз-старт)
- [Структура на проекта](#структура-на-проекта)
- [Environment променливи](#environment-променливи)
- [База данни](#база-данни)
- [API маршрути](#api-маршрути)
- [Архитектура и сигурност](#архитектура-и-сигурност)
- [Плащане](#плащане)
- [Известни ограничения](#известни-ограничения)
- [Команди](#команди)
- [Лиценз](#лиценз)

---

## Изисквания

- **Node.js** 20+ (препоръчително LTS; минимум както позволява Next.js 16)
- **pnpm** или **npm** (в репото има и `pnpm-lock.yaml`, и `package-lock.json` — използвай **един** мениджър последователно)
- Проект в **Supabase** с приложена SQL схема

---

## Бърз старт

```bash
git clone https://github.com/kalcho21/PC-BULDING.git
cd PC-BULDING

# Инсталация (избери едно)
pnpm install
# или: npm install

cp .env.example .env.local
# Попълни .env.local — виж секцията по-долу

# В Supabase → SQL Editor изпълни миграциите в подходящ ред (виж „База данни“)

pnpm dev
# или: npm run dev
```

Приложението: [http://localhost:3000](http://localhost:3000).

Production build:

```bash
pnpm build && pnpm start
# или: npm run build && npm run start
```

---

## Структура на проекта

```
├── app/
│   ├── layout.tsx, page.tsx, globals.css
│   ├── admin/           # Админ панел
│   ├── auth/            # Вход, регистрация, callback (Route Handler)
│   ├── builder/         # Конфигуратор
│   ├── builds/          # Сглобки
│   ├── build-compare/
│   ├── cart/
│   ├── catalog/
│   ├── community/
│   ├── compare/
│   ├── component/[slug]/
│   ├── favorites/
│   ├── success/
│   └── api/             # Само съществуващи route handlers — виж по-долу
├── components/          # UI, странични компоненти, cart-provider, shadcn/ui в ui/
├── lib/
│   ├── supabase/
│   │   ├── client.ts    # Browser клиент
│   │   ├── server.ts    # Server клиент (async)
│   │   └── proxy.ts     # updateSession за middleware
│   ├── compatibility.ts, build-wattage.ts, types.ts, …
│   └── …
├── hooks/
├── middleware.ts        # Session refresh; връзка с lib/supabase/proxy.ts
├── scripts/             # SQL за Supabase
├── public/
└── styles/
```

**Middleware:** в root е `middleware.ts`. При `next build` Next.js 16 може да покаже предупреждение за преименуване към конвенцията `proxy` — следвай официалната документация на Next при бъдеща миграция.

**TypeScript:** в `next.config.mjs` е зададено `ignoreBuildErrors: true` — билдът не спира при грешки в типовете; за качество на кода пускай локално проверки/линт.

---

## Environment променливи

Копирай `.env.example` в `.env.local` и попълни.

| Променлива | Задължително | Описание |
|-------------|--------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | да (за auth и данни) | URL на проекта в Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | да* | Стандартният **anon** ключ от Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | да* | Алтернатива на anon, ако ползваш новия формат на ключовете |
| `SUPABASE_SERVICE_ROLE_KEY` | за admin API и частни операции | Само на сървъра; никога в `NEXT_PUBLIC_*` |
| `ADMIN_DASHBOARD_PASSWORD` | силно препоръчително в продукция | Парола за `/admin` (в кода има слаб fallback за dev — виж `lib/admin-api-auth.ts`) |
| `ADMIN_METRICS_PASSWORD` | не | Алтернативно име за същата админ тайна в някои настройки |
| `NEXT_PUBLIC_APP_URL` | препоръчително | Базов URL на приложението |
| `NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL` | по избор | Redirect към `/auth/callback` при нужда |
| `NEXT_PUBLIC_SITE_URL` | по избор | Алтернатива за изграждане на callback URL в `lib/auth-redirect.ts` |
| `RESEND_API_KEY` | за имейли | Resend API ключ |
| `ORDER_EMAIL_FROM` | за имейли | Подател за thank-you имейли |
| `ORDER_NOTIFICATION_EMAIL` | по избор | Документиран в `.env.example`; провери дали го ползва твоят деплой |

\* Трябва да е зададен **поне един** от `NEXT_PUBLIC_SUPABASE_ANON_KEY` или `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — виж `lib/supabase/client.ts`.

**Сигурност:** service role ключ и Resend ключ са секрети — само в среда на сървъра / `.env.local`, не в клиентски код.

---

## База данни

PostgreSQL чрез Supabase; очакват се таблици като компоненти, категории, сглобки, профили, любими и др. (виж съществуващите `.sql` файлове).

Изпълни в **Supabase → SQL Editor** в смислен ред според това коя „линтер“ схема ползваш:

| Файл | Бележка |
|------|---------|
| `scripts/001_create_schema.sql` | Пълна/основна схема (ако е твоят избор) |
| `scripts/001_core_tables.sql` | Алтернатива/допълнение — прочети коментарите вътре преди да смесваш с друг 001 |
| `scripts/002_simple_schema.sql` | Опростен вариант |
| `scripts/003_manual_payment_confirmations.sql` | Ръчни потвърждения на плащания |
| `scripts/004_allow_bank_transfer_payment_method.sql` | Метод банков превод |
| `scripts/005_kingston_fury_beast_1_eur.sql` | Примерни/конкретни данни |
| `scripts/add-new-components.sql` | Примерно попълване на компоненти |

Не смесвай два несъвместими „основни“ 001 скрипта без да провериш дубликати на таблици.

---

## API маршрути

Реално налични под `app/api`:

| Път | Назначение |
|-----|------------|
| `GET/POST …` `/api/admin/builds-list` | Админ: списък сглобки |
| `GET/POST …` `/api/admin/favorites-list` | Админ: любими |
| `GET/POST …` `/api/admin/metrics` | Админ метрики |
| `GET/POST …` `/api/admin/profiles` | Админ профили |
| `/api/auth/confirmation-link` | Потвърждаване/линкове (сървърна логика с service role) |
| `/api/orders/customer-thank-you` | Thank-you имейл след поръчка (Resend) |
| `/api/payments/manual-confirmation` | Ръчно потвърждение (напр. скрийншот Revolut) |

OAuth/session callback за Supabase е при **`app/auth/callback`**, не под `app/api/auth/callback`.

---

## Архитектура и сигурност

- **Страници:** Server Components зареждат данни чрез Supabase server client; интерактивни части са Client Components.
- **Клиент:** `import { createClient } from '@/lib/supabase/client'`
- **Сървър / Route Handler:** `import { createClient } from '@/lib/supabase/server'` (функцията е `async`)
- **Middleware:** `middleware.ts` извиква `updateSession` от `@/lib/supabase/proxy`

**Админ:** достъпът до `/admin` е защитен с парола от env (виж `lib/admin-api-auth.ts`). Задай силна парола в продукция.

**RLS:** политиките в Supabase трябва да съответстват на приложението — не ги отключвай публично без причина.

---

## Плащане

Потокът е ориентиран към **Revolut Personal Pay** — генериране на линк с сума и референция (напр. номер на поръчка), плащане от клиента в приложението Revolut и опционално ръчно потвърждение от админ. Детайлите са в `lib/revolut-personal-url.ts` и свързаните страници (количка, success, admin).

---

## Известни ограничения

- Каталогът може да зарежда много данни наведнъж (без сървърна пагинация в някои сценарии).
- Част от съвместимостта използва опростени допускания (напр. GPU дължина) — виж `lib/compatibility.ts`.
- Количката е предимно клиентска (напр. localStorage) — поведение при презареждане зависи от имплементацията в `components/cart-provider.tsx`.
- Пълната документация за екипа и конвенциите може да е в [`AGENTS.md`](./AGENTS.md) (ако е поддържан).

---

## Команди

```bash
pnpm dev          # или npm run dev
pnpm build        # или npm run build
pnpm start        # или npm run start
pnpm lint         # или npm run lint
```

---

## Лиценз

MIT © [kalcho21](https://github.com/kalcho21)
