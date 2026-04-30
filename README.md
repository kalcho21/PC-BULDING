# 🖥️ PC Конфигуратор

> Сглоби мечтания си компютър — с 3D преглед в реално време, проверка на съвместимостта и Revolut плащане.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss)

---

## 📋 Съдържание

- [За проекта](#-за-проекта)
- [Функционалности](#-функционалности)
- [Технологии](#-технологии)
- [Структура](#-структура)
- [Инсталация](#-инсталация)
- [Конфигурация](#-конфигурация)
- [База данни](#-база-данни)
- [Плащане](#-плащане)

---

## 🎯 За проекта

**PC Конфигуратор** е уеб приложение, което позволява на потребителите да избират и сглобяват персонализирани компютърни конфигурации. Системата проверява съвместимостта на компонентите в реално време, визуализира сглобката в 3D и предоставя оценка на производителността.

---

## ✨ Функционалности

- 🏗️ **PC Builder** — визуален конфигуратор с drag-and-drop избор на компоненти
- 🔄 **Проверка на съвместимостта** — сокет, форм-фактор, мощност и охлаждане
- 🎮 **3D визуализация** — Three.js преглед на сглобката
- 📊 **Оценка на производителността** — gaming, productivity, rendering, streaming
- 🛒 **Количка** — добавяне на части и Revolut плащане
- 🔍 **Каталог** — филтриране по категория, марка, цена, наличност
- ⚖️ **Сравнение** — сравняване на компоненти и сглобки
- ❤️ **Любими** — запазване на любими компоненти
- 👥 **Общност** — публични сглобки от потребители
- 🔐 **Автентикация** — вход/регистрация чрез Supabase Auth
- 🛠️ **Админ панел** — управление на компоненти, поръчки и потребители

---

## 🛠️ Технологии

| Категория | Технология |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19 + shadcn/ui + Radix UI |
| Стилове | Tailwind CSS v4 |
| 3D | Three.js + @react-three/fiber |
| База данни | Supabase (PostgreSQL) |
| Автентикация | Supabase Auth |
| Форми | react-hook-form + Zod |
| Плащания | Revolut Personal Pay |
| Имейл | Resend |
| Аналитика | Vercel Analytics |

---

## 📁 Структура

```
├── app/
│   ├── admin/              # Административен панел
│   ├── api/
│   │   ├── auth/           # Auth callbacks
│   │   ├── orders/         # Поръчки и имейли
│   │   └── payments/       # Плащания (Revolut, Stripe)
│   ├── builder/            # PC Конфигуратор
│   ├── cart/               # Количка
│   ├── catalog/            # Каталог с компоненти
│   ├── community/          # Публични сглобки
│   ├── compare/            # Сравнение на компоненти
│   ├── builds/             # Лични сглобки
│   └── favorites/          # Любими
├── components/             # React компоненти
├── lib/
│   ├── supabase/           # Supabase клиент
│   ├── compatibility.ts    # Логика за съвместимост
│   ├── types.ts            # TypeScript типове
│   └── ...
└── scripts/                # SQL миграции
```

---

## 🚀 Инсталация

### Изисквания

- Node.js 18+
- pnpm (препоръчително) или npm

### Стъпки

```bash
# 1. Клонирай репото
git clone https://github.com/kalcho21/PC-BULDING.git
cd PC-BULDING

# 2. Инсталирай зависимостите
pnpm install
# или
npm install

# 3. Копирай .env файла
cp .env.example .env.local

# 4. Попълни .env.local с реалните ключове (виж секцията по-долу)

# 5. Стартирай dev сървъра
pnpm dev
# или
npm run dev
```

Приложението ще бъде достъпно на [http://localhost:3000](http://localhost:3000)

---

## ⚙️ Конфигурация

Копирай `.env.example` като `.env.local` и попълни следните стойности:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase — от Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...

# Resend — за имейли при поръчка (незадължителен)
RESEND_API_KEY=re_xxxxxxxxx
ORDER_NOTIFICATION_EMAIL=orders@example.com
ORDER_EMAIL_FROM=PC Builder <orders@example.com>

# Админ достъп
ADMIN_DASHBOARD_PASSWORD=your_password
```

---

## 🗄️ База данни

Проектът използва **Supabase (PostgreSQL)** с Row Level Security.

### Главни таблици

| Таблица | Описание |
|---|---|
| `components` | Всички PC компоненти |
| `categories` | Категории (CPU, GPU, RAM...) |
| `brands` | Производители |
| `builds` | Потребителски сглобки |
| `build_items` | Компоненти в сглобка |
| `profiles` | Потребителски профили |
| `favorites` | Любими компоненти |
| `compatibility_rules` | Правила за съвместимост |

### Миграции

SQL скриптовете са в папка `/scripts/`. Изпълни ги в ред в Supabase SQL Editor:

```
scripts/001_create_schema.sql     — Основна схема
scripts/002_simple_schema.sql     — Опростена схема
scripts/003_manual_payment_confirmations.sql
scripts/004_allow_bank_transfer_payment_method.sql
scripts/add-new-components.sql    — Примерни данни
```

---

## 💳 Плащане

Плащането се осъществява чрез **Revolut Personal Pay**:

1. Клиентът попълва имена и имейл в количката
2. Системата генерира уникален номер на поръчката (`ORD-XXXXXX-YYYY`)
3. Клиентът отваря Revolut линк с предварително попълнена сума и бележка
4. Администраторът потвърждава плащането ръчно от `/admin`
5. Клиентът получава имейл потвърждение (чрез Resend)

---

## 📝 Лиценз

MIT © [kalcho21](https://github.com/kalcho21)
