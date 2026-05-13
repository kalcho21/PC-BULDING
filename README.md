# PC Конфигуратор

Интерактивен **уеб конфигуратор за настолни компютри** на български език: избор на части, проверка на съвместимост, прогноза за производителност и FPS, каталог, количка, запазени сглобки и любими чрез **Supabase**, плащане чрез **Revolut Personal Pay** (линк към сума) и опционални имейли с **Resend**. За аналитика може да се включи **Vercel Analytics**.

**Стек:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Radix UI / shadcn, Supabase, Three.js (3D където е интегрирано), Sonner.

---

## Съдържание

- [Какво прави приложението](#какво-прави-приложението)
- [Изисквания](#изисквания)
- [Бърз старт](#бърз-старт)
- [Маршрути и основни потоци](#маршрути-и-основни-потоци)
- [Структура на проекта](#структура-на-проекта)
- [Модули в `lib/`](#модули-в-lib)
- [Важни компоненти](#важни-компоненти)
- [Environment променливи](#environment-променливи)
- [База данни](#база-данни)
- [API маршрути](#api-маршрути)
- [Архитектура и сигурност](#архитектура-и-сигурност)
- [Конфигуратор: синтез и бюджет](#конфигуратор-синтез-и-бюджет)
- [FPS прогноза](#fps-прогноза)
- [Плащане](#плащане)
- [Известни ограничения](#известни-ограничения)
- [Команди](#команди)
- [Допълнителна документация](#допълнителна-документация)
- [Лиценз](#лиценз)

---

## Какво прави приложението

### Потребителски функции

| Област | Описание |
|--------|----------|
| **Начало** | Категории, популярни компоненти, секция **„Бърз старт“** с три нива (~1050 / 1550 / 2600 €) към конфигуратора. |
| **Каталог** | Търсене и филтри, карти на продуктите, любими, сравнение, детайли. |
| **Детайл на продукт** | `/component/[slug]` — снимка, спецификации, количка, любимо, добавяне в сглобка. |
| **Конфигуратор** | Слотове: CPU, GPU, RAM, дъно, съхранение, PSU, кутия, охладител; съвместимост; обща цена; ватаж; FPS прогноза; обобщение. |
| **Автоматичен синтез** | По тип ползване (гейминг, офис, графика, програмиране) и бюджет — до **три варианта** или **един директен** при бърз старт. |
| **Моите сглобки** | Списък от Supabase; отваряне в конфигуратор с `?build=<id>`; експорт; споделяне на публични сглобки. |
| **Любими** | Списък с любими; **модален преглед** на продукта (без пълна навигация); линк към цяла страница по желание. |
| **Количка и поръчка** | Клиентска количка, поток към плащане (Revolut линк), success страница. |
| **Сравнение** | Сравнение на компоненти и на няколко запазени сглобки. |
| **Общност** | Публични конфигурации от потребители (според имплементацията). |
| **Профил и auth** | Вход, регистрация, профил — чрез Supabase Auth. |
| **Админ** | Защитен панел (`/admin`) — метрики, поръчки, потребители, компоненти (според табовете в проекта). |

### Технически акценти

- **RLS** в Supabase за изолация на потребителски данни.
- **Middleware** за поддържане на сесията (JWT cookie).
- Оценка на производителност чрез **`lib/build-performance-score.ts`** (CPU/GPU/RAM таблици + евристики).
- **FPS** в конфигуратора чрез **`lib/game-fps-estimate.ts`** — калибрирани стойности спрямо референтна система и същите индекси като за performance score.

---

## Изисквания

- **Node.js** 20+ (препоръчително LTS).
- **pnpm** или **npm** — използвай **един** мениджър последователно (в репото могат да има и двата lock файла).
- Проект в **Supabase** с приложена SQL схема и настроен Auth (redirect URL към твоя домейн).

---

## Бърз старт

### Стартиране локално (подробни стъпки)

1. **Инсталирай среда**  
   Инсталирай **Node.js 20 или по-нов** (LTS). Препоръчително е и Git, ако клонираш репото.

2. **Вземи кода проекта**  
   Клонирай хранилището или разархивирай папката с проекта и отвори терминал **в корена** (където е `package.json`).

   ```bash
   git clone https://github.com/kalcho21/PC-BULDING.git
   cd PC-BULDING
   ```

3. **Инсталирай зависимостите**  
   Използвай **един** пакетен мениджър последователно (`pnpm` или `npm`):

   ```bash
   pnpm install
   ```

   или

   ```bash
   npm install
   ```

4. **Настрой променливите на средата**  
   Копирай шаблона и създай `.env.local` в корена на проекта.

   **macOS / Linux:**

   ```bash
   cp .env.example .env.local
   ```

   **Windows (PowerShell):**

   ```powershell
   Copy-Item .env.example .env.local
   ```

   Отвори `.env.local` с редактор и попълни поне данните за Supabase и (по желание) админ паролата — детайли в секцията [Environment променливи](#environment-променливи). За локално е важно да имаш зададен **`NEXT_PUBLIC_APP_URL=http://localhost:3000`** (както в `.env.example`).

5. **Създай и настрой Supabase проект**  
   - Влез в [Supabase](https://supabase.com), създай нов проект.  
   - От **Project Settings → API** копирай **Project URL**, **anon / publishable** ключа и **service role** ключа в съответните полета в `.env.local`.  
   - От **SQL Editor** изпълни миграциите в **логичен ред** и с **един съгласуван „основен“ скрипт** — прегледай таблицата в секцията [База данни](#база-данни) (напр. `scripts/001_create_schema.sql` **или** опростения вариант; не смесвай несъвместими схеми без да прегледаш SQL).  
   - Включи **Row Level Security (RLS)** и политиките, които очаква приложението (виж документацията в `scripts/` и нуждите на auth).

6. **Настрой URL-и за автентикация (локално)**  
   В Supabase: **Authentication → URL Configuration**.  
   - **Site URL:** `http://localhost:3000`  
   - **Redirect URLs:** добави поне `http://localhost:3000/auth/callback` (при нужда и `http://127.0.0.1:3000/auth/callback`).  
   За production после смени с реалния домейн.

7. **Стартирай development сървъра**  

   ```bash
   pnpm dev
   ```

   или

   ```bash
   npm run dev
   ```

8. **Отвори приложението**  
   В браузър: [http://localhost:3000](http://localhost:3000).  
   За админ панела: `/admin` — паролата е от `ADMIN_DASHBOARD_PASSWORD` в `.env.local`.

**Обобщение с команди (ако вече имаш Supabase и `.env.local`):**

```bash
pnpm install   # или npm install
pnpm dev       # или npm run dev
```

**Production билд локално:**

```bash
pnpm build && pnpm start
```

(С `npm`: `npm run build` и после `npm run start`.)

---

## Маршрути и основни потоци

| Път | Описание |
|-----|----------|
| `/` | Начална страница (`HomePage`). |
| `/catalog` | Каталог. |
| `/builder` | Конфигуратор. Параметри: `?budget=1550`, `?preset=entry|mid|high-end`, `?quickBudget=1` (бърз старт — директен вариант, скрит панел синтез при нужда), `?build=<uuid>` (зареждане на запазена сглобка — синтезът е свит по подразбиране), `?add=<componentId>` (добавяне на част). |
| `/cart` | Количка. |
| `/builds` | Моите сглобки. |
| `/favorites` | Любими. |
| `/component/[slug]` | Продуктова страница. |
| `/compare` | Сравнение на компоненти. |
| `/build-compare` | Сравнение на сглобки (`?ids=`). |
| `/community` | Общност. |
| `/profile` | Профил. |
| `/admin` | Админ (парола от env). |
| `/admin/analytics`, `/admin/users`, `/admin/settings`, `/admin/components` | Подстраници на админа (според структурата в `app/admin`). |
| `/auth/login`, `/auth/sign-up`, … | Автентикация. |
| `/success` | Успех след поръчка (или аналог). |

OAuth/session callback за Supabase обикновено е под **`app/auth/callback`** (виж проекта за точния файл).

---

## Структура на проекта

```
├── app/
│   ├── layout.tsx, page.tsx, globals.css
│   ├── admin/              # Админ-панел и подмаршрути
│   ├── api/                # Route Handlers (admin, поръчки, плащания, auth помощни)
│   ├── auth/               # login, sign-up, callback, …
│   ├── builder/
│   ├── builds/
│   ├── build-compare/
│   ├── cart/
│   ├── catalog/
│   ├── community/
│   ├── compare/
│   ├── component/[slug]/
│   ├── favorites/
│   ├── profile/
│   ├── success/
│   └── …
├── components/             # UI: builder-page, catalog-page, home-page, cart-provider, ui/, …
├── lib/
│   ├── supabase/           # client, server, proxy (middleware session)
│   ├── build-performance-score.ts
│   ├── game-fps-estimate.ts
│   ├── compatibility.ts
│   ├── build-wattage.ts
│   ├── types.ts
│   ├── revolut-personal-url.ts
│   ├── admin-api-auth.ts
│   ├── auth-redirect.ts
│   └── …
├── hooks/
├── scripts/                # SQL за Supabase
├── middleware.ts
├── public/
└── next.config.mjs
```

**Middleware:** `middleware.ts` извиква `updateSession` от `lib/supabase/proxy.ts`. При `next build` може да се показват предупреждения за бъдещи конвенции на Next — следвай официалната документация.

**TypeScript:** в `next.config.mjs` може да е зададено `ignoreBuildErrors: true` — за качество пускай локално `tsc` / `eslint`.

---

## Модули в `lib/`

| Файл | Назначение |
|------|------------|
| `build-performance-score.ts` | `cpuBenchmarks` / `gpuBenchmarks`, съвпадение по име/модел, изчисляване на CPU/GPU/RAM performance, общ `analyzeBuildPerformance` за сглобка. Референтни константи за FPS: `FPS_REF_CPU_GAMING`, `FPS_REF_GPU_GAMING`. |
| `game-fps-estimate.ts` | Прогноза FPS @1080p за CS2, Valorant, Fortnite, GTA V, Warzone, Cyberpunk — на база същите индекси и калибрирани `ref1080p` стойности. |
| `compatibility.ts` | Проверка на съвместимост на сглобка, допълнителни FPS помощни функции за сравнение (стари tier таблици по модел). |
| `build-wattage.ts` | Оценка на консумация (W) за избрани компоненти. |
| `types.ts` | TypeScript типове (Component, Build, Category, …). |
| `revolut-personal-url.ts` | Изграждане на линк за Revolut Personal Pay. |
| `admin-api-auth.ts` | Парола/заглавки за админ API и панел. |
| `send-order-thank-you-email.ts` | Логика за имейл към клиент (Resend). |
| `supabase/client.ts` | Браузърен клиент (anon / publishable key). |
| `supabase/server.ts` | Async сървърен клиент. |

---

## Важни компоненти

| Компонент | Роля |
|-----------|------|
| `builder-page.tsx` | Главен конфигуратор: синтез, слотове, обобщение, запис, FPS. |
| `catalog-page.tsx` | Каталог с филтри и любими. |
| `home-page.tsx` | Начало, бърз старт, навигация. |
| `favorite-component-detail-dialog.tsx` | Модал с детайли за продукт от любими. |
| `cart-provider.tsx` | Контекст за количката. |
| `part-selection-modal.tsx` | Избор на част по категория. |
| `performance-display.tsx` | Обобщение на производителност / FPS в други изгледи (част от логиката може да ползва `compatibility.ts`). |
| `header.tsx` | Навигация. |
| `ui/*` | shadcn/Radix примитиви. |

---

## Environment променливи

Копирай `.env.example` в `.env.local` и попълни.

| Променлива | Задължително | Описание |
|------------|--------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | да | URL на Supabase проекта. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | да* | Anon ключ от Settings → API. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | да* | Алтернатива на anon (нов формат ключове). |
| `SUPABASE_SERVICE_ROLE_KEY` | за сървърни операции | Само на сървъра; **никога** в `NEXT_PUBLIC_*`. |
| `ADMIN_DASHBOARD_PASSWORD` | силно препоръчително | Парола за `/admin`. |
| `ADMIN_METRICS_PASSWORD` | не | Алтернативно име за админ тайна. |
| `NEXT_PUBLIC_APP_URL` | препоръчително | Публичен базов URL. |
| `NEXT_PUBLIC_SUPABASE_AUTH_REDIRECT_URL` | по избор | Redirect към callback. |
| `NEXT_PUBLIC_SITE_URL` | по избор | Алтернатива за `lib/auth-redirect.ts`. |
| `RESEND_API_KEY` | за имейли | Resend. |
| `ORDER_EMAIL_FROM` | за имейли | Подател. |
| `ORDER_NOTIFICATION_EMAIL` | по избор | Уведомяване на екипа (ако е свързано в кода). |

\* Трябва поне **един** от anon или publishable ключ — виж `lib/supabase/client.ts`.

**Сигурност:** не комитирай `.env.local`; service role и Resend са секрети.

---

## База данни

PostgreSQL чрез Supabase: категории, марки, компоненти (с JSON specs), профили, любими, сглобки, редове на сглобка, поръчки (според приложените скриптове).

Изпълни в **Supabase → SQL Editor** в осмислен ред (не смесвай два несъвместими „основни“ скрипта без преглед):

| Файл | Бележка |
|------|---------|
| `scripts/001_create_schema.sql` | Основна схема (ако е избраният вариант). |
| `scripts/001_core_tables.sql` | Алтернатива/ядро (категории, марки, компоненти, profiles). |
| `scripts/002_simple_schema.sql` | Опростен вариант. |
| `scripts/003_manual_payment_confirmations.sql` | Ръчни потвърждения на плащания. |
| `scripts/004_allow_bank_transfer_payment_method.sql` | Банков превод. |
| `scripts/005_kingston_fury_beast_1_eur.sql` | Примерни данни. |
| `scripts/add-new-components.sql` | Примерно попълване. |

Настрой **RLS** съобразно правата, които очаква приложението.

---

## API маршрути

Под `app/api` (налични към момента на документиране):

| Път | Назначение |
|-----|------------|
| `/api/admin/builds-list` | Админ: сглобки. |
| `/api/admin/favorites-list` | Админ: любими. |
| `/api/admin/metrics` | Админ метрики. |
| `/api/admin/profiles` | Админ профили. |
| `/api/auth/confirmation-link` | Потвърждения/линкове (service role където е нужно). |
| `/api/orders/customer-thank-you` | Thank-you имейл (Resend). |
| `/api/payments/manual-confirmation` | Ръчно потвърждение на плащане (напр. скрийншот). |

---

## Архитектура и сигурност

- **Server Components** за първоначално зареждане; **Client Components** за интерактивност (`'use client'`).
- Клиент: `import { createClient } from '@/lib/supabase/client'`.
- Сървър / Route Handlers: `import { createClient } from '@/lib/supabase/server'` (async).
- **Админ:** парола от env; виж `lib/admin-api-auth.ts`.
- **RLS:** не отваряй публичен пълен достъп без нужда.

---

## Конфигуратор: синтез и бюджет

- Пресетни нива с целеви суми (напр. **1050 / 1550 / 2600 €**) и таван за squeeze (~12% над цел при обикновен синтез; **~3.5%** при бърз старт с `quickBudget=1`).
- `handlePresetBuild` генерира варианти с различни CPU/GPU рангове; при **бърз старт** може да се приложи само най-добрият вариант без карти „Топ предложения“.
- При **`?build=`** при отваряне от **Моите сглобки** панелът „Настройки за синтезиране“ е **скрит по подразбиране**; може да се покаже с „Покажи настройки за синтезиране“.

---

## FPS прогноза

- В конфигуратора FPS за изброени игри се изчисляват от **`estimateBuildGameFps1080p`** в `lib/game-fps-estimate.ts`.
- Използват се **същите** CPU/GPU gaming индекси като за общия performance score (таблици + евристики при липса на съвпадение).
- Стойностите са **ориентировъчни** (реални драйвъри, настройки и ъпдейти на игри променят резултата).

---

## Плащане

Потокът е ориентиран към **Revolut Personal Pay**: генериране на линк с сума и референция, плащане от клиента, опция за **ръчно потвърждение** от админ. Детайли: `lib/revolut-personal-url.ts` и страниците за количка / success / админ.

---

## Известни ограничения

- Каталогът може да зареди много редове наведнъж (пагинацията зависи от имплементацията).
- Съвместимостта в `lib/compatibility.ts` е **евристична** (не покрива всички edge cases в хардуера).
- Количката е предимно **клиентска** — поведението при нов устройство/браузър зависи от `cart-provider`.
- `ignoreBuildErrors` в Next може да скрие TypeScript проблеми до runtime.

---

## Команди

```bash
pnpm dev          # development
pnpm build        # production build
pnpm start        # стартиране след build
pnpm lint         # eslint
```

---

## Допълнителна документация

- **[AGENTS.md](./AGENTS.md)** — насоки за AI агенти и конвенции в кода (ако е поддържан).

---

## Лиценз

MIT © [kalcho21](https://github.com/kalcho21)
