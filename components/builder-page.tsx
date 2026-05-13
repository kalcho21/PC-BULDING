'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Category, Brand, Component, BuildState, CompatibilityIssue } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/components/cart-provider'
import { estimateBuildWattage } from '@/lib/build-wattage'
import {
  analyzeBuildPerformance,
  matchBenchmark,
  cpuBenchmarks,
  gpuBenchmarks,
  asFiniteNumber,
  clampScore,
  normalizeName,
  parseCacheAmount,
} from '@/lib/build-performance-score'
import { estimateBuildGameFps1080p } from '@/lib/game-fps-estimate'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PartSelectionModal } from '@/components/part-selection-modal'
import { toast } from 'sonner'
import {
  Cpu,
  Monitor,
  HardDrive,
  CircuitBoard,
  MemoryStick,
  Fan,
  Box,
  Zap,
  Plus,
  X,
  AlertTriangle,
  CheckCircle2,
  ArrowLeft,
  Trash2,
  Wand2,
  Save,
  Share2,
  ChevronRight,
  Flame,
  Gamepad2,
  Briefcase,
  Video,
  Code,
  ShoppingCart,
  Menu,
  Download,
  Trophy,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BuilderPageProps {
  categories: Category[]
  brands: Brand[]
  components: Component[]
}

const categoryConfig: Record<string, { icon: React.ElementType; label: string; order: number }> = {
  case: { icon: Box, label: 'Кутия', order: 1 },
  cpu: { icon: Cpu, label: 'Процесор', order: 2 },
  motherboard: { icon: CircuitBoard, label: 'Дънна платка', order: 3 },
  gpu: { icon: Monitor, label: 'Видеокарта', order: 4 },
  ram: { icon: MemoryStick, label: 'RAM памет', order: 5 },
  cooling: { icon: Fan, label: 'Охлаждане', order: 6 },
  storage: { icon: HardDrive, label: 'Съхранение', order: 7 },
  psu: { icon: Zap, label: 'Захранване', order: 8 },
}

const initialBuildState: BuildState = {
  cpu: null,
  gpu: null,
  ram: null,
  motherboard: null,
  storage: [],
  psu: null,
  case: null,
  cooling: null,
}

type BuildUseCase = 'gaming' | 'office' | 'graphics' | 'programming'

/** Пресети за разпределение на бюджета по категории */
type BuilderBudgetPreset = 'entry' | 'mid' | 'high-end'

function allocationTierForTargetEur(eur: number): BuilderBudgetPreset {
  if (eur < 1250) return 'entry'
  if (eur < 2000) return 'mid'
  return 'high-end'
}

type BuilderPresetInput = BuilderBudgetPreset | { customTargetEur: number }

type BuilderPresetBuildOptions = {
  /** Бърз старт от началната страница — без карти „Топ предложения“, директно най-добрият вариант */
  skipVariantCards?: boolean
}

/** Нормален синтез: повече гъвкавост преди squeeze. */
const DEFAULT_BUDGET_MAX_FACTOR = 1.12
/** Бърз старт: общата сума да не надвишава целта с повече от ~3.5% (вместо +12%). */
const QUICK_START_BUDGET_MAX_FACTOR = 1.035

const buildUseCaseOptions: Array<{ value: BuildUseCase; label: string }> = [
  { value: 'gaming', label: 'Гейминг' },
  { value: 'office', label: 'Офис' },
  { value: 'graphics', label: 'Графична обработка' },
  { value: 'programming', label: 'Програмиране' },
]

/** Най-висок score под тавана по цена; при равенство — по-скъпият (обикновено по-висок клас). */
function pickBestUnderCap(
  items: Component[],
  maxPrice: number,
  scoreFn: (c: Component) => number,
  filter?: (c: Component) => boolean
): Component | null {
  const pool = items
    .filter((c) => c.in_stock)
    .filter((c) => !Number.isFinite(maxPrice) || maxPrice <= 0 || c.price <= maxPrice)
    .filter((c) => !filter || filter(c))
  if (pool.length === 0) return null
  return [...pool].sort((a, b) => {
    const d = scoreFn(b) - scoreFn(a)
    if (Math.abs(d) > 0.0001) return d
    return b.price - a.price
  })[0]
}

function pickBestWithBudgetSlack(
  items: Component[],
  maxPrice: number,
  scoreFn: (c: Component) => number,
  filter?: (c: Component) => boolean
): Component | null {
  return (
    pickBestUnderCap(items, maxPrice, scoreFn, filter) ??
    pickBestUnderCap(items, maxPrice * 1.4, scoreFn, filter) ??
    pickBestUnderCap(items, Number.POSITIVE_INFINITY, scoreFn, filter) ??
    pickCheapestUnderCap(items, maxPrice, filter)
  )
}

/** k=0 е най-добрият; k=1 вторият по score и т.н. */
function pickKthBestWithBudgetSlack(
  items: Component[],
  maxPrice: number,
  scoreFn: (c: Component) => number,
  k: number,
  filter?: (c: Component) => boolean
): Component | null {
  const rankAtCap = (cap: number) => {
    const pool = items
      .filter((c) => c.in_stock)
      .filter((c) => !Number.isFinite(cap) || cap <= 0 || c.price <= cap)
      .filter((c) => !filter || filter(c))
    if (pool.length === 0) return null
    const sorted = [...pool].sort((a, b) => {
      const d = scoreFn(b) - scoreFn(a)
      if (Math.abs(d) > 0.0001) return d
      return b.price - a.price
    })
    const idx = Math.min(Math.max(0, k), sorted.length - 1)
    return sorted[idx] ?? null
  }
  return rankAtCap(maxPrice) ?? rankAtCap(maxPrice * 1.4) ?? rankAtCap(Number.POSITIVE_INFINITY) ?? null
}

/** Висок клас: първо най-висока цена в тавана; при равна цена — по-висок score за типа. */
function pickExpensiveFirstUnderCap(
  items: Component[],
  maxPrice: number,
  scoreFn: (c: Component) => number,
  filter?: (c: Component) => boolean
): Component | null {
  const pool = items
    .filter((c) => c.in_stock)
    .filter((c) => !Number.isFinite(maxPrice) || maxPrice <= 0 || c.price <= maxPrice)
    .filter((c) => !filter || filter(c))
  if (pool.length === 0) return null
  return [...pool].sort((a, b) => {
    if (b.price !== a.price) return b.price - a.price
    return scoreFn(b) - scoreFn(a)
  })[0]
}

function pickExpensiveFirstWithBudgetSlack(
  items: Component[],
  maxPrice: number,
  scoreFn: (c: Component) => number,
  filter?: (c: Component) => boolean
): Component | null {
  return (
    pickExpensiveFirstUnderCap(items, maxPrice, scoreFn, filter) ??
    pickExpensiveFirstUnderCap(items, maxPrice * 1.4, scoreFn, filter) ??
    pickExpensiveFirstUnderCap(items, Number.POSITIVE_INFINITY, scoreFn, filter) ??
    pickCheapestUnderCap(items, maxPrice, filter)
  )
}

function pickKthExpensiveFirstWithBudgetSlack(
  items: Component[],
  maxPrice: number,
  scoreFn: (c: Component) => number,
  k: number,
  filter?: (c: Component) => boolean
): Component | null {
  const rankAtCap = (cap: number) => {
    const pool = items
      .filter((c) => c.in_stock)
      .filter((c) => !Number.isFinite(cap) || cap <= 0 || c.price <= cap)
      .filter((c) => !filter || filter(c))
    if (pool.length === 0) return null
    const sorted = [...pool].sort((a, b) => {
      if (b.price !== a.price) return b.price - a.price
      return scoreFn(b) - scoreFn(a)
    })
    const idx = Math.min(Math.max(0, k), sorted.length - 1)
    return sorted[idx] ?? null
  }
  return rankAtCap(maxPrice) ?? rankAtCap(maxPrice * 1.4) ?? rankAtCap(Number.POSITIVE_INFINITY) ?? null
}

/** Fallback под max цена — никога скъп „случаен“ компонент */
function pickCheapestUnderCap(
  items: Component[],
  maxPrice: number,
  filter?: (item: Component) => boolean
): Component | null {
  const pool = items
    .filter((item) => item.in_stock)
    .filter((item) => (typeof maxPrice === 'number' ? item.price <= maxPrice : true))
    .filter((item) => !filter || filter(item))
  if (pool.length === 0) return null
  return [...pool].sort((a, b) => a.price - b.price)[0]
}

function caseFitsMotherboardFormFactor(caseComponent: Component, formFactor: string | undefined): boolean {
  if (!formFactor) return true
  const supported = caseComponent.specs?.motherboard_support || []
  const caseFormFactor = caseComponent.specs?.form_factor || ''

  if (Array.isArray(supported) && supported.length > 0) {
    return supported.includes(formFactor)
  }

  const formFactorHierarchy: Record<string, string[]> = {
    'Full-Tower': ['E-ATX', 'ATX', 'Micro-ATX', 'Mini-ITX'],
    'Mid-Tower': ['ATX', 'Micro-ATX', 'Mini-ITX'],
    'Mini-Tower': ['Micro-ATX', 'Mini-ITX'],
    'Mini-ITX': ['Mini-ITX'],
  }

  const supportedFactors = formFactorHierarchy[caseFormFactor] || []
  return supportedFactors.includes(formFactor)
}

function totalBuildPriceState(build: BuildState): number {
  let t = 0
  if (build.cpu) t += build.cpu.price
  if (build.gpu) t += build.gpu.price
  if (build.ram) t += build.ram.price
  if (build.motherboard) t += build.motherboard.price
  if (build.psu) t += build.psu.price
  if (build.case) t += build.case.price
  if (build.cooling) t += build.cooling.price
  for (const s of build.storage) t += s.price
  return t
}

/** Намалява цената с по-евтини (но съвместими) части, докато сумата ≤ cap */
function squeezeBuildUnderCap(build: BuildState, allComponents: Component[], capEuro: number): BuildState {
  const cur: BuildState = {
    ...build,
    storage: [...build.storage],
  }

  const sum = () => totalBuildPriceState(cur)

  for (let iter = 0; iter < 120 && sum() > capEuro; iter++) {
    const mbForm = cur.motherboard?.specs?.form_factor
    const cpuSocket = cur.cpu?.specs?.socket
    const mbSocket = cur.motherboard?.specs?.socket
    const memType = cur.motherboard?.specs?.memory_type

    const minPsuWatts = () => Math.ceil(estimateBuildWattage(cur) * 1.12)

    let bestOldPrice = -1
    let applySwap: (() => void) | null = null

    const consider = (current: Component, replacement: Component, doSwap: () => void) => {
      if (replacement.price >= current.price) return
      if (current.price > bestOldPrice) {
        bestOldPrice = current.price
        applySwap = doSwap
      }
    }

    if (cur.gpu) {
      const alts = allComponents.filter(
        (c) => c.category?.slug === 'gpu' && c.in_stock && c.price < cur.gpu!.price
      )
      const next = [...alts].sort((a, b) => a.price - b.price)[0]
      if (next) consider(cur.gpu, next, () => { cur.gpu = next })
    }

    if (cur.cpu) {
      const alts = allComponents.filter(
        (c) =>
          c.category?.slug === 'cpu' &&
          c.in_stock &&
          c.price < cur.cpu!.price &&
          (!mbSocket || c.specs?.socket === mbSocket)
      )
      const next = [...alts].sort((a, b) => a.price - b.price)[0]
      if (next) consider(cur.cpu, next, () => { cur.cpu = next })
    }

    if (cur.motherboard) {
      const alts = allComponents.filter(
        (c) =>
          c.category?.slug === 'motherboard' &&
          c.in_stock &&
          c.price < cur.motherboard!.price &&
          (!cpuSocket || c.specs?.socket === cpuSocket)
      )
      const next = [...alts].sort((a, b) => a.price - b.price)[0]
      if (next) consider(cur.motherboard, next, () => { cur.motherboard = next })
    }

    if (cur.ram) {
      const alts = allComponents.filter(
        (c) =>
          c.category?.slug === 'ram' &&
          c.in_stock &&
          c.price < cur.ram!.price &&
          (!memType || c.specs?.type === memType)
      )
      const next = [...alts].sort((a, b) => a.price - b.price)[0]
      if (next) consider(cur.ram, next, () => { cur.ram = next })
    }

    cur.storage.forEach((st, idx) => {
      const alts = allComponents.filter(
        (c) => c.category?.slug === 'storage' && c.in_stock && c.price < st.price
      )
      const next = [...alts].sort((a, b) => a.price - b.price)[0]
      if (next) consider(st, next, () => { cur.storage[idx] = next })
    })

    if (cur.psu) {
      const wMin = minPsuWatts()
      const alts = allComponents.filter(
        (c) =>
          c.category?.slug === 'psu' &&
          c.in_stock &&
          c.price < cur.psu!.price &&
          (c.specs?.wattage || 0) >= wMin
      )
      const next = [...alts].sort((a, b) => a.price - b.price)[0]
      if (next) consider(cur.psu, next, () => { cur.psu = next })
    }

    if (cur.case) {
      const alts = allComponents.filter(
        (c) =>
          c.category?.slug === 'case' &&
          c.in_stock &&
          c.price < cur.case!.price &&
          caseFitsMotherboardFormFactor(c, mbForm)
      )
      const next = [...alts].sort((a, b) => a.price - b.price)[0]
      if (next) consider(cur.case, next, () => { cur.case = next })
    }

    if (cur.cooling) {
      const alts = allComponents.filter(
        (c) => c.category?.slug === 'cooling' && c.in_stock && c.price < cur.cooling!.price
      )
      const next = [...alts].sort((a, b) => a.price - b.price)[0]
      if (next) consider(cur.cooling, next, () => { cur.cooling = next })
    }

    const swapFn = applySwap
    if (!swapFn) break
    ;(swapFn as () => void)()
  }

  return cur
}

/**
 * Ако основният алгоритъм е оставил празни слотове (тесни max цени и пр.),
 * допълва слотовете. При high-end: най-скъпите съвместими в тавана; иначе по score.
 */
function ensureCompleteBuild(
  build: BuildState,
  allComponents: Component[],
  budgetMaxEuro: number,
  useCase: BuildUseCase,
  preferMostExpensive = false
): BuildState {
  const b: BuildState = { ...build, storage: [...build.storage] }

  const cheapestIn = (pool: Component[]): Component | null =>
    pool.length ? [...pool].sort((a, x) => a.price - x.price)[0] : null

  const expensiveIn = (pool: Component[]): Component | null =>
    pool.length ? [...pool].sort((a, x) => x.price - a.price)[0] : null

  const pickForSlot = (
    pool: Component[],
    softCap: number,
    scoreFn: (c: Component) => number,
    filter?: (c: Component) => boolean
  ): Component | null => {
    if (pool.length === 0) return null
    if (preferMostExpensive) {
      return (
        pickExpensiveFirstWithBudgetSlack(pool, softCap, scoreFn, filter) ??
        expensiveIn(pool.filter((c) => c.in_stock))
      )
    }
    return (
      pickBestWithBudgetSlack(pool, softCap, scoreFn, filter) ?? cheapestIn(pool.filter((c) => c.in_stock))
    )
  }

  for (let iter = 0; iter < 28; iter++) {
    const total = totalBuildPriceState(b)
    const softCap = Math.max(budgetMaxEuro * 1.22 - total, 100)

    let progressed = false

    if (!b.cpu) {
      const pool = allComponents.filter((c) => c.category?.slug === 'cpu' && c.in_stock)
      const p = pickForSlot(pool, softCap, (c) => scoreCpuForUseCase(c, useCase))
      if (p) {
        b.cpu = p
        progressed = true
        continue
      }
      break
    }

    const cpuSocket = b.cpu.specs?.socket

    if (!b.motherboard) {
      const pool = allComponents.filter(
        (c) =>
          c.category?.slug === 'motherboard' &&
          c.in_stock &&
          (!cpuSocket || c.specs?.socket === cpuSocket)
      )
      const p = pickForSlot(pool, softCap, (c) => scoreMotherboardForUseCase(c, useCase))
      if (p) {
        b.motherboard = p
        progressed = true
        continue
      }
    }

    const mbMem = b.motherboard?.specs?.memory_type
    if (!b.ram) {
      let pool = allComponents.filter(
        (c) =>
          c.category?.slug === 'ram' && c.in_stock && (!mbMem || c.specs?.type === mbMem)
      )
      let p = pickForSlot(pool, softCap, (c) => scoreRamForUseCase(c, useCase))
      if (!p) {
        pool = allComponents.filter((c) => c.category?.slug === 'ram' && c.in_stock)
        p = pickForSlot(pool, softCap, (c) => scoreRamForUseCase(c, useCase))
      }
      if (p) {
        b.ram = p
        progressed = true
        continue
      }
    }

    if (!b.gpu) {
      const pool = allComponents.filter((c) => c.category?.slug === 'gpu' && c.in_stock)
      const p = pickForSlot(pool, softCap, (c) => scoreGpuForUseCase(c, useCase))
      if (p) {
        b.gpu = p
        progressed = true
        continue
      }
    }

    if (b.storage.length === 0) {
      const pool = allComponents.filter((c) => c.category?.slug === 'storage' && c.in_stock)
      const p = pickForSlot(pool, softCap, (c) => scoreStorageForUseCase(c, useCase))
      if (p) {
        b.storage = [p]
        progressed = true
        continue
      }
    }

    const minW = Math.ceil(estimateBuildWattage(b) * 1.1)
    if (!b.psu) {
      let pool = allComponents.filter(
        (c) =>
          c.category?.slug === 'psu' && c.in_stock && (c.specs?.wattage || 0) >= minW
      )
      let p = pickForSlot(pool, softCap, (c) => scorePsuForUseCase(c, useCase, minW))
      if (!p) {
        pool = allComponents.filter((c) => c.category?.slug === 'psu' && c.in_stock)
        p = pickForSlot(pool, softCap, (c) => scorePsuForUseCase(c, useCase, minW))
      }
      if (p) {
        b.psu = p
        progressed = true
        continue
      }
    }

    const mbForm = b.motherboard?.specs?.form_factor
    if (!b.case) {
      let pool = allComponents.filter(
        (c) =>
          c.category?.slug === 'case' && c.in_stock && caseFitsMotherboardFormFactor(c, mbForm)
      )
      let p = pickForSlot(pool, softCap, (c) => scoreCaseForUseCase(c, useCase))
      if (!p) {
        pool = allComponents.filter((c) => c.category?.slug === 'case' && c.in_stock)
        p = pickForSlot(pool, softCap, (c) => scoreCaseForUseCase(c, useCase))
      }
      if (p) {
        b.case = p
        progressed = true
        continue
      }
    }

    if (!b.cooling) {
      const pool = allComponents.filter((c) => c.category?.slug === 'cooling' && c.in_stock)
      const cpuTdp = asFiniteNumber(b.cpu?.specs?.tdp, 125)
      const p = pickForSlot(pool, softCap, (c) => scoreCoolingForUseCase(c, useCase, cpuTdp))
      if (p) {
        b.cooling = p
        progressed = true
        continue
      }
    }

    if (!progressed) break
  }

  return b
}

function psuEfficiencyTierScore(eff: string): number {
  const e = eff.toLowerCase()
  if (e.includes('titanium')) return 100
  if (e.includes('platinum')) return 88
  if (e.includes('gold')) return 72
  if (e.includes('silver')) return 56
  if (e.includes('bronze')) return 42
  return 28
}

function scoreCpuForUseCase(c: Component, useCase: BuildUseCase): number {
  const matched = matchBenchmark(cpuBenchmarks, c)
  const cores = asFiniteNumber(c.specs?.cores, 4)
  const threads = asFiniteNumber(c.specs?.threads, Math.max(cores, 4))
  const boost = asFiniteNumber(c.specs?.boost_clock, 4)
  const base = asFiniteNumber(c.specs?.base_clock, 3.2)
  const cache = parseCacheAmount(c.specs?.cache)
  const tdp = asFiniteNumber(c.specs?.tdp, 65)
  const architecture = normalizeName(c.specs?.architecture)

  let archFactor = 1
  if (architecture.includes('zen 5')) archFactor = 1.1
  else if (architecture.includes('zen 4')) archFactor = 1.05
  else if (architecture.includes('zen 2')) archFactor = 0.88

  const gaming =
    matched?.gaming ??
    clampScore(
      ((cores / 8) * 26 + (threads / 16) * 16 + (boost / 5.8) * 34 + (base / 4.2) * 10 + (cache / 96) * 14) *
        archFactor,
      12,
      100
    )

  const productivity =
    matched?.productivity ??
    clampScore(
      ((cores / 16) * 38 + (threads / 32) * 26 + (boost / 5.8) * 18 + (cache / 96) * 10) * archFactor,
      12,
      100
    )

  const programmingBlend = clampScore(
    productivity * 0.48 + gaming * 0.35 + (cache / 96) * 22 + (boost / 5.8) * 12,
    12,
    100
  )

  const officeBlend = clampScore(
    productivity * 0.38 +
      gaming * 0.12 +
      (cores >= 6 ? 10 : 0) -
      Math.max(0, tdp - 65) * 0.15 +
      (tdp <= 65 ? 8 : 0),
    15,
    100
  )

  const graphicsBlend = clampScore(productivity * 0.62 + gaming * 0.28 + (cache / 96) * 12, 12, 100)

  switch (useCase) {
    case 'gaming':
      return gaming
    case 'office':
      return officeBlend
    case 'graphics':
      return graphicsBlend
    case 'programming':
      return programmingBlend
    default:
      return gaming
  }
}

function scoreGpuForUseCase(c: Component, useCase: BuildUseCase): number {
  const matched = matchBenchmark(gpuBenchmarks, c)
  const vram = asFiniteNumber(c.specs?.vram, 8)
  const busWidth = asFiniteNumber(c.specs?.bus_width, 128)
  const tdp = asFiniteNumber(c.specs?.tdp, 150)
  const rawCuda = asFiniteNumber(c.specs?.cuda_cores, 0)
  const rawStream = asFiniteNumber(c.specs?.stream_processors, 0)
  const normalizedShaders = rawCuda > 0 ? rawCuda : rawStream * 0.42

  const gaming =
    matched?.gaming ??
    clampScore(
      (normalizedShaders / 18000) * 50 + (vram / 24) * 22 + (busWidth / 384) * 18 + (tdp / 420) * 10,
      10,
      100
    )

  const creator =
    matched?.creator ?? clampScore(gaming * 0.94 + (vram / 24) * 12 + (normalizedShaders / 18000) * 8, 10, 100)

  const graphicsBlend = clampScore(creator * 0.58 + gaming * 0.28 + (vram / 24) * 18, 10, 100)

  const programmingBlend = clampScore(
    gaming * 0.28 + creator * 0.42 + (vram / 32) * 22 + (busWidth / 384) * 8,
    10,
    100
  )

  const officeBlend = clampScore(
    42 + Math.max(0, 95 - tdp / 4.2) * 0.65 + gaming * 0.14 + (vram >= 8 ? 10 : vram >= 6 ? 5 : 0),
    8,
    100
  )

  switch (useCase) {
    case 'gaming':
      return gaming
    case 'graphics':
      return graphicsBlend
    case 'programming':
      return programmingBlend
    case 'office':
      return officeBlend
    default:
      return gaming
  }
}

function scoreRamForUseCase(c: Component, useCase: BuildUseCase): number {
  const capacity = asFiniteNumber(c.specs?.capacity, 8)
  const speed = asFiniteNumber(c.specs?.speed, 3200)
  const isDdr5 = normalizeName(c.specs?.type).includes('ddr5')
  const base = clampScore((capacity / 32) * 55 + (speed / 6400) * 35 + (isDdr5 ? 10 : 0), 10, 100)

  switch (useCase) {
    case 'gaming':
      return base
    case 'office':
      return clampScore(
        (Math.min(capacity, 32) / 32) * 50 + (speed / 5200) * 35 + (isDdr5 ? 6 : 0) + (capacity >= 16 ? 6 : 0),
        10,
        100
      )
    case 'graphics':
      return clampScore((capacity / 64) * 58 + (speed / 6400) * 38 + (isDdr5 ? 14 : 0), 10, 100)
    case 'programming':
      return clampScore((capacity / 48) * 52 + (speed / 6400) * 42 + (isDdr5 ? 12 : 0), 10, 100)
    default:
      return base
  }
}

function scoreStorageForUseCase(c: Component, useCase: BuildUseCase): number {
  const read = asFiniteNumber(c.specs?.read_speed, 500)
  const write = asFiniteNumber(c.specs?.write_speed, 400)
  const cap = asFiniteNumber(c.specs?.capacity, 512)
  const rawIface = `${String(c.specs?.interface || '')} ${String(c.specs?.type || '')}`.toLowerCase()
  const nvme = rawIface.includes('nvme') || rawIface.includes('pcie')

  const speedScore = clampScore(
    (read / 7200) * 52 + (write / 5500) * 28 + (nvme ? 22 : rawIface.includes('sata') && !rawIface.includes('hdd') ? 12 : 4),
    8,
    100
  )

  switch (useCase) {
    case 'gaming':
      return clampScore(speedScore * 0.92 + Math.min(cap / 2048, 1) * 12, 8, 100)
    case 'office':
      return clampScore(speedScore * 0.78 + (cap >= 500 ? 8 : 0), 8, 100)
    case 'graphics':
      return clampScore(speedScore * 0.88 + Math.min(cap / 2048, 1) * 18 + (nvme ? 6 : 0), 8, 100)
    case 'programming':
      return clampScore(speedScore * 0.95 + Math.min(cap / 1024, 1) * 14 + (nvme ? 8 : 0), 8, 100)
    default:
      return speedScore
  }
}

function scoreMotherboardForUseCase(c: Component, useCase: BuildUseCase): number {
  const m2 = asFiniteNumber(c.specs?.m2_slots, 1)
  const maxMem = asFiniteNumber(c.specs?.max_memory, 64)
  const pcie = asFiniteNumber(c.specs?.pcie_slots, 2)
  const ddr5 = normalizeName(c.specs?.memory_type).includes('ddr5')
  const wifi = c.specs?.wifi ? 7 : 0

  let s =
    m2 * 7 +
    Math.min(maxMem / 128, 1) * 28 +
    pcie * 3.5 +
    (ddr5 ? 10 : 0) +
    wifi +
    (c.rating || 4) * 2.2

  switch (useCase) {
    case 'gaming':
      s += pcie * 4 + m2 * 3
      break
    case 'graphics':
      s += Math.min(maxMem / 128, 1) * 22 + m2 * 5
      break
    case 'programming':
      s += m2 * 5 + Math.min(maxMem / 128, 1) * 18
      break
    case 'office':
      s += 6
      break
    default:
      break
  }

  return s
}

function scorePsuForUseCase(c: Component, useCase: BuildUseCase, minWatts: number): number {
  const w = asFiniteNumber(c.specs?.wattage, 0)
  const eff = psuEfficiencyTierScore(String(c.specs?.efficiency || ''))
  const headroom = w >= minWatts ? Math.min(22, ((w - minWatts) / Math.max(minWatts, 1)) * 18) : -40
  let s = eff + headroom + Math.min(w / 1200, 1) * 10 + (c.rating || 4) * 1.5
  if (useCase === 'office') s += eff * 0.08
  return s
}

function scoreCaseForUseCase(c: Component, useCase: BuildUseCase): number {
  const fanSlots = asFiniteNumber(c.specs?.fan_slots, 2)
  const incFans = asFiniteNumber(c.specs?.included_fans, 1)
  const gpuLen = asFiniteNumber(c.specs?.max_gpu_length, 300)
  const rad = asFiniteNumber(c.specs?.radiator_support, 0)
  const side = String(c.specs?.side_panel || '').toLowerCase()
  const mesh = side.includes('mesh') || side.includes('мреж')

  let s =
    fanSlots * 3.5 +
    incFans * 5 +
    gpuLen / 38 +
    rad / 45 +
    (mesh ? 18 : 0) +
    (c.rating || 4) * 2.5

  switch (useCase) {
    case 'gaming':
      s += mesh ? 14 : 0
      break
    case 'office':
      s += incFans * 3
      break
    case 'graphics':
      s += gpuLen / 50 + fanSlots * 2
      break
    case 'programming':
      s += (mesh ? 8 : 0) + fanSlots * 2
      break
    default:
      break
  }

  return s
}

function scoreCoolingForUseCase(c: Component, useCase: BuildUseCase, cpuTdp: number): number {
  const rating = asFiniteNumber(c.specs?.tdp_rating, 95)
  const rad = asFiniteNumber(c.specs?.radiator_size, 0)
  const noise = asFiniteNumber(c.specs?.noise_level, 0)
  const typ = String(c.specs?.type || '').toLowerCase()
  const aio = typ.includes('водно') || typ.includes('aio') || typ.includes('liquid')

  const headroom = cpuTdp > 0 ? Math.min(35, (rating / Math.max(cpuTdp, 35)) * 28) : rating / 4

  let s = headroom + rad / 42 + (aio ? 12 : 7) + (c.rating || 4) * 2

  if (noise > 0) {
    s += Math.max(0, 16 - noise / 5)
  } else {
    s += 5
  }

  if (useCase === 'gaming' && rad >= 240) s += 12
  if (useCase === 'office' && noise > 0) s += 8

  return s
}

type SynthesisRanks = { cpuRank: number; gpuRank: number }

function buildComponentSignature(b: BuildState): string {
  const ids: string[] = []
  if (b.cpu) ids.push(b.cpu.id)
  if (b.gpu) ids.push(b.gpu.id)
  if (b.ram) ids.push(b.ram.id)
  if (b.motherboard) ids.push(b.motherboard.id)
  if (b.psu) ids.push(b.psu.id)
  if (b.case) ids.push(b.case.id)
  if (b.cooling) ids.push(b.cooling.id)
  for (const s of b.storage) ids.push(s.id)
  return [...ids].sort().join('|')
}

/** Обобщена „пригодност“ за подредба на топ вариантите (по-високо = по-подходящ за избрания тип). */
function totalBuildFitScore(b: BuildState, useCase: BuildUseCase): number {
  const minPsuW = Math.ceil(estimateBuildWattage(b) * 1.15)
  const cpuTdp = asFiniteNumber(b.cpu?.specs?.tdp, 125)
  let s = 0
  if (b.cpu) s += scoreCpuForUseCase(b.cpu, useCase)
  if (b.gpu) s += scoreGpuForUseCase(b.gpu, useCase) * 1.08
  if (b.ram) s += scoreRamForUseCase(b.ram, useCase) * 0.88
  for (const st of b.storage) s += scoreStorageForUseCase(st, useCase) * 0.82
  if (b.motherboard) s += scoreMotherboardForUseCase(b.motherboard, useCase) * 0.38
  if (b.psu) s += scorePsuForUseCase(b.psu, useCase, Math.max(minPsuW, 380)) * 0.28
  if (b.case) s += scoreCaseForUseCase(b.case, useCase) * 0.22
  if (b.cooling) s += scoreCoolingForUseCase(b.cooling, useCase, cpuTdp) * 0.22
  return s
}

function synthesizeBuildWithRanks(
  components: Component[],
  budget: { target: number; max: number; label: string },
  tierAllocations: Record<string, number>,
  useCase: BuildUseCase,
  ranks: SynthesisRanks,
  preferMostExpensive: boolean
): BuildState {
  const newBuild: BuildState = { ...initialBuildState }
  const targetBudget = budget.target
  const tightBudget =
    targetBudget <= 1200 || budget.max <= targetBudget * 1.06

  const getMaxPrice = (categoryKey: string, multiplier = 1.25) => {
    const base = targetBudget * (tierAllocations[categoryKey] || 0)
    const capMult = tightBudget ? Math.min(multiplier, 1.12) : multiplier
    return base * capMult
  }

  const pickRanked = (
    pool: Component[],
    maxP: number,
    scoreFn: (c: Component) => number,
    k: number,
    filter?: (c: Component) => boolean
  ) =>
    preferMostExpensive
      ? pickKthExpensiveFirstWithBudgetSlack(pool, maxP, scoreFn, k, filter)
      : pickKthBestWithBudgetSlack(pool, maxP, scoreFn, k, filter)

  const pickOne = (
    pool: Component[],
    maxP: number,
    scoreFn: (c: Component) => number,
    filter?: (c: Component) => boolean
  ) =>
    preferMostExpensive
      ? pickExpensiveFirstWithBudgetSlack(pool, maxP, scoreFn, filter)
      : pickBestWithBudgetSlack(pool, maxP, scoreFn, filter)

  const selectedCpu = pickRanked(
    components.filter((c) => c.category?.slug === 'cpu'),
    getMaxPrice('cpu'),
    (c) => scoreCpuForUseCase(c, useCase),
    ranks.cpuRank
  )

  if (selectedCpu) {
    newBuild.cpu = selectedCpu
    const cpuSocket = selectedCpu.specs?.socket

    const selectedMb =
      pickOne(
        components.filter((c) => c.category?.slug === 'motherboard'),
        getMaxPrice('motherboard'),
        (c) => scoreMotherboardForUseCase(c, useCase),
        (c) => !cpuSocket || c.specs?.socket === cpuSocket
      ) ??
      pickCheapestUnderCap(
        components.filter((c) => c.category?.slug === 'motherboard'),
        getMaxPrice('motherboard'),
        (c) => !cpuSocket || c.specs?.socket === cpuSocket
      )

    if (selectedMb) {
      newBuild.motherboard = selectedMb
      const mbMemoryType = selectedMb.specs?.memory_type

      newBuild.ram =
        pickOne(
          components.filter((c) => c.category?.slug === 'ram'),
          getMaxPrice('ram'),
          (c) => scoreRamForUseCase(c, useCase),
          (c) => !mbMemoryType || c.specs?.type === mbMemoryType
        ) ??
        pickCheapestUnderCap(
          components.filter((c) => c.category?.slug === 'ram'),
          getMaxPrice('ram'),
          (c) => !mbMemoryType || c.specs?.type === mbMemoryType
        )
    }
  }

  newBuild.gpu =
    pickRanked(
      components.filter((c) => c.category?.slug === 'gpu'),
      getMaxPrice('gpu'),
      (c) => scoreGpuForUseCase(c, useCase),
      ranks.gpuRank
    ) ?? pickCheapestUnderCap(components.filter((c) => c.category?.slug === 'gpu'), getMaxPrice('gpu'))

  const selectedStorage =
    pickOne(
      components.filter((c) => c.category?.slug === 'storage'),
      getMaxPrice('storage', 1.35),
      (c) => scoreStorageForUseCase(c, useCase)
    ) ??
    pickCheapestUnderCap(
      components.filter((c) => c.category?.slug === 'storage'),
      getMaxPrice('storage', 1.35)
    )

  newBuild.storage = selectedStorage ? [selectedStorage] : []

  const estimatedWatt = estimateBuildWattage(newBuild)

  newBuild.psu =
    pickOne(
      components.filter((c) => c.category?.slug === 'psu'),
      getMaxPrice('psu', 1.35),
      (c) => scorePsuForUseCase(c, useCase, estimatedWatt * 1.15),
      (c) => (c.specs?.wattage || 0) >= estimatedWatt * 1.15
    ) ??
    pickOne(
      components.filter((c) => c.category?.slug === 'psu'),
      getMaxPrice('psu', 1.35),
      (c) => scorePsuForUseCase(c, useCase, estimatedWatt),
      (c) => (c.specs?.wattage || 0) >= estimatedWatt
    ) ??
    pickCheapestUnderCap(
      components.filter((c) => c.category?.slug === 'psu'),
      getMaxPrice('psu', 1.35) * 1.25,
      (c) => (c.specs?.wattage || 0) >= estimatedWatt * 1.15
    ) ??
    pickCheapestUnderCap(
      components.filter((c) => c.category?.slug === 'psu'),
      budget.max * 0.25,
      (c) => (c.specs?.wattage || 0) >= estimatedWatt
    )

  const mbFormFactor = newBuild.motherboard?.specs?.form_factor

  const caseCandidates = components.filter(
    (c) => c.category?.slug === 'case' && c.in_stock && caseFitsMotherboardFormFactor(c, mbFormFactor)
  )

  newBuild.case =
    pickOne(caseCandidates, getMaxPrice('case', 1.5), (c) => scoreCaseForUseCase(c, useCase)) ??
    pickCheapestUnderCap(caseCandidates, getMaxPrice('case', 1.5))

  const cpuTdpPick = asFiniteNumber(newBuild.cpu?.specs?.tdp, 125)
  newBuild.cooling =
    pickOne(
      components.filter((c) => c.category?.slug === 'cooling'),
      getMaxPrice('cooling', 1.5),
      (c) => scoreCoolingForUseCase(c, useCase, cpuTdpPick)
    ) ??
    pickCheapestUnderCap(
      components.filter((c) => c.category?.slug === 'cooling'),
      getMaxPrice('cooling', 1.5)
    )

  const filledBuild = ensureCompleteBuild(newBuild, components, budget.max, useCase, preferMostExpensive)
  return squeezeBuildUnderCap(filledBuild, components, budget.max)
}

export function BuilderPage({ categories, brands, components }: BuilderPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { totalItems } = useCart()
  const [build, setBuild] = useState<BuildState>(initialBuildState)
  const [synthesisResults, setSynthesisResults] = useState<Array<{ build: BuildState; fitScore: number }>>([])
  const [selectedSynthesisRank, setSelectedSynthesisRank] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [buildName, setBuildName] = useState('Моята Сглобка')
  const [summarySheetOpen, setSummarySheetOpen] = useState(false)
  const [savingBuild, setSavingBuild] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveBuildPublic, setSaveBuildPublic] = useState(false)
  const lastLoadedBuildRef = useRef<string | null>(null)
  const lastAddedComponentRef = useRef<string | null>(null)
  const [buildUseCase, setBuildUseCase] = useState<BuildUseCase>('gaming')
  const [customBudgetInput, setCustomBudgetInput] = useState('1550')
  /** От началната страница: quickBudget=1 — панелът „синтез“ е скрит и се зарежда директно най-добрият вариант (без карти „Топ предложения“). */
  const fromHomeBudgetShortcut = searchParams.get('quickBudget') === '1'
  /** Заредена запазена сглобка от URL (?build=...) — без панел синтез, докато не се покаже ръчно. */
  const openedSavedBuildFromUrl = Boolean(searchParams.get('build'))
  const [synthesisPanelRevealed, setSynthesisPanelRevealed] = useState(false)
  const hideSynthesisSettings =
    (fromHomeBudgetShortcut || openedSavedBuildFromUrl) && !synthesisPanelRevealed

  // Sort categories by order
  const sortedCategories = useMemo(() => {
    return categories.sort((a, b) => {
      const orderA = categoryConfig[a.slug]?.order || 99
      const orderB = categoryConfig[b.slug]?.order || 99
      return orderA - orderB
    })
  }, [categories])

  const normalizeAllocations = useCallback((allocations: Record<string, number>) => {
    const total = Object.values(allocations).reduce((sum, value) => sum + value, 0)
    if (!total) return allocations

    return Object.fromEntries(
      Object.entries(allocations).map(([key, value]) => [key, value / total])
    ) as Record<string, number>
  }, [])

  // Calculate total price
  const totalPrice = useMemo(() => {
    let total = 0
    if (build.cpu) total += build.cpu.price
    if (build.gpu) total += build.gpu.price
    if (build.ram) total += build.ram.price
    if (build.motherboard) total += build.motherboard.price
    if (build.psu) total += build.psu.price
    if (build.case) total += build.case.price
    if (build.cooling) total += build.cooling.price
    build.storage.forEach(s => total += s.price)
    return total
  }, [build])

  const estimatedWattage = useMemo(() => estimateBuildWattage(build), [build])

  const { performanceScore } = useMemo(() => analyzeBuildPerformance(build), [build])

  const getPerformanceTier = (score: number) => {
    if (score >= 78) return { label: 'Върхов Клас', color: 'text-purple-400', bgColor: 'bg-purple-500/20' }
    if (score >= 60) return { label: 'Много Добър', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' }
    if (score >= 42) return { label: 'Добър', color: 'text-green-400', bgColor: 'bg-green-500/20' }
    if (score >= 20) return { label: 'Базов', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' }
    return { label: 'Слаб', color: 'text-red-400', bgColor: 'bg-red-500/20' }
  }

  // FPS @1080p: калибрирани спрямо реф. система + таблични/евристични gaming индекси (lib/game-fps-estimate)
  const fpsEstimates = useMemo(() => estimateBuildGameFps1080p(build), [build])

  // Compatibility issues
  const compatibilityIssues = useMemo<CompatibilityIssue[]>(() => {
    const issues: CompatibilityIssue[] = []

    if (build.cpu && build.motherboard) {
      const cpuSocket = build.cpu.specs?.socket
      const mbSocket = build.motherboard.specs?.socket
      if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
        issues.push({
          type: 'error',
          message: `Сокет на CPU (${cpuSocket}) не съвпада с дънната платка (${mbSocket})`,
          components: [build.cpu.id, build.motherboard.id],
        })
      }
    }

    if (build.ram && build.motherboard) {
      const ramType = build.ram.specs?.type
      const mbMemoryType = build.motherboard.specs?.memory_type
      if (ramType && mbMemoryType && ramType !== mbMemoryType) {
        issues.push({
          type: 'error',
          message: `Тип RAM (${ramType}) не е съвместим с дънната платка (${mbMemoryType})`,
          components: [build.ram.id, build.motherboard.id],
        })
      }
    }

    if (build.psu && estimatedWattage > 0) {
      const psuWattage = build.psu.specs?.wattage || 0
      if (psuWattage < estimatedWattage * 1.2) {
        issues.push({
          type: 'warning',
          message: `Захранването (${psuWattage}W) може да е недостатъчно`,
          components: [build.psu.id],
        })
      }
    }

    if (build.case && build.motherboard) {
      const supportedFormFactors = build.case.specs?.motherboard_support || []
      const mbFormFactor = build.motherboard.specs?.form_factor
      const caseFormFactor = build.case.specs?.form_factor || ''
      
      // Check motherboard_support array first
      if (mbFormFactor && Array.isArray(supportedFormFactors) && supportedFormFactors.length > 0) {
        if (!supportedFormFactors.includes(mbFormFactor)) {
          issues.push({
            type: 'error',
            message: `Кутията не поддържа ${mbFormFactor} дънни платки`,
            components: [build.case.id, build.motherboard.id],
          })
        }
      } else if (mbFormFactor && caseFormFactor) {
        // Use form factor hierarchy
        const formFactorHierarchy: Record<string, string[]> = {
          'Full-Tower': ['E-ATX', 'ATX', 'Micro-ATX', 'Mini-ITX'],
          'Mid-Tower': ['ATX', 'Micro-ATX', 'Mini-ITX'],
          'Mini-Tower': ['Micro-ATX', 'Mini-ITX'],
          'Mini-ITX': ['Mini-ITX'],
        }
        const supported = formFactorHierarchy[caseFormFactor] || []
        if (supported.length > 0 && !supported.includes(mbFormFactor)) {
          issues.push({
            type: 'error',
            message: `${caseFormFactor} кутията не поддържа ${mbFormFactor} дънни платки`,
            components: [build.case.id, build.motherboard.id],
          })
        }
      }
    }

    return issues
  }, [build, estimatedWattage])

  const hasErrors = compatibilityIssues.some(i => i.type === 'error')
  const hasWarnings = compatibilityIssues.some(i => i.type === 'warning')

  const getComponentForCategory = (categorySlug: string): Component | null => {
    switch (categorySlug) {
      case 'cpu': return build.cpu
      case 'gpu': return build.gpu
      case 'ram': return build.ram
      case 'motherboard': return build.motherboard
      case 'psu': return build.psu
      case 'case': return build.case
      case 'cooling': return build.cooling
      case 'storage': return build.storage[0] || null
      default: return null
    }
  }

  const handleSelectComponent = useCallback((component: Component) => {
    const categorySlug = component.category?.slug
    
    setBuild(prev => {
      const newBuild = { ...prev }
      switch (categorySlug) {
        case 'cpu': newBuild.cpu = component; break
        case 'gpu': newBuild.gpu = component; break
        case 'ram': newBuild.ram = component; break
        case 'motherboard': newBuild.motherboard = component; break
        case 'psu': newBuild.psu = component; break
        case 'case': newBuild.case = component; break
        case 'cooling': newBuild.cooling = component; break
        case 'storage':
          if (!prev.storage.some(s => s.id === component.id)) {
            newBuild.storage = [...prev.storage, component]
          }
          break
      }
      return newBuild
    })
    
    toast.success(`${component.name} е добавен`)
    setSelectedCategory(null)
  }, [])

  const handleRemoveComponent = useCallback((categorySlug: string, index?: number) => {
    setBuild(prev => {
      const newBuild = { ...prev }
      if (categorySlug === 'storage' && typeof index === 'number') {
        newBuild.storage = prev.storage.filter((_, i) => i !== index)
      } else {
        switch (categorySlug) {
          case 'cpu': newBuild.cpu = null; break
          case 'gpu': newBuild.gpu = null; break
          case 'ram': newBuild.ram = null; break
          case 'motherboard': newBuild.motherboard = null; break
          case 'psu': newBuild.psu = null; break
          case 'case': newBuild.case = null; break
          case 'cooling': newBuild.cooling = null; break
          case 'storage': newBuild.storage = []; break
        }
      }
      return newBuild
    })
    toast.info('Компонентът е премахнат')
  }, [])

  const handleClearBuild = useCallback(() => {
    setBuild(initialBuildState)
    setSynthesisResults([])
    setSelectedSynthesisRank(0)
    toast.info('Сглобката е изчистена')
  }, [])

  // Handle preset builds based on budget - WITH COMPATIBILITY CHECK
  const handlePresetBuild = useCallback((input: BuilderPresetInput, opts?: BuilderPresetBuildOptions) => {
    const budgets: Record<BuilderBudgetPreset, { target: number; max: number; label: string }> = {
      entry: { target: 1050, max: Math.round(1050 * DEFAULT_BUDGET_MAX_FACTOR), label: 'Бюджетен' },
      mid: { target: 1550, max: Math.round(1550 * DEFAULT_BUDGET_MAX_FACTOR), label: 'Среден Клас' },
      'high-end': { target: 2600, max: Math.round(2600 * DEFAULT_BUDGET_MAX_FACTOR), label: 'Висок Клас' },
    }

    const allocations: Record<BuilderBudgetPreset, Record<string, number>> = {
      entry: {
        gpu: 0.30,
        cpu: 0.22,
        motherboard: 0.15,
        ram: 0.12,
        storage: 0.10,
        psu: 0.06,
        case: 0.03,
        cooling: 0.02,
      },
      mid: {
        gpu: 0.35,
        cpu: 0.20,
        motherboard: 0.12,
        ram: 0.10,
        storage: 0.10,
        psu: 0.07,
        case: 0.04,
        cooling: 0.02,
      },
      'high-end': {
        gpu: 0.40,
        cpu: 0.18,
        motherboard: 0.12,
        ram: 0.08,
        storage: 0.08,
        psu: 0.06,
        case: 0.05,
        cooling: 0.03,
      },
    }

    let budget: { target: number; max: number; label: string }
    let allocationKey: BuilderBudgetPreset

    if (typeof input === 'object' && input !== null && 'customTargetEur' in input) {
      const raw = Number(String(input.customTargetEur).replace(',', '.'))
      if (!Number.isFinite(raw)) {
        toast.error('Невалиден бюджет.')
        return
      }
      const target = Math.min(20000, Math.max(400, Math.round(raw)))
      budget = {
        target,
        max: Math.round(target * DEFAULT_BUDGET_MAX_FACTOR),
        label: `По бюджет ${target} €`,
      }
      allocationKey = allocationTierForTargetEur(target)
    } else {
      const presetKey =
        input === 'entry' || input === 'mid' || input === 'high-end' ? input : 'mid'
      budget = budgets[presetKey]
      allocationKey = presetKey
    }

    if (opts?.skipVariantCards) {
      budget = {
        ...budget,
        max: Math.round(budget.target * QUICK_START_BUDGET_MAX_FACTOR),
      }
    }

    const baseAllocations = allocations[allocationKey]
    const useCaseAdjustments: Record<BuildUseCase, Record<string, number>> = {
      gaming: { gpu: 0.08, cpu: 0.04, ram: 0.01, storage: -0.03, case: -0.02, cooling: 0.01, motherboard: 0.01, psu: 0 },
      office: { gpu: -0.1, cpu: 0.03, ram: 0.02, storage: 0.03, psu: 0.02, case: 0, cooling: 0, motherboard: 0 },
      graphics: { gpu: 0.08, cpu: 0.02, ram: 0.03, storage: 0.03, psu: 0.01, cooling: 0.01, case: -0.02, motherboard: 0 },
      programming: { gpu: -0.1, cpu: 0.06, ram: 0.04, storage: 0.03, motherboard: 0.02, psu: 0.01, case: -0.03, cooling: -0.03 },
    }
    const tierAllocations = normalizeAllocations(
      Object.fromEntries(
        Object.entries(baseAllocations).map(([key, value]) => [
          key,
          Math.max(0.02, value + (useCaseAdjustments[buildUseCase][key] || 0)),
        ])
      ) as Record<string, number>
    )

    const preferMostExpensive = allocationKey === 'high-end'

    const rankPlans: SynthesisRanks[] = [
      { cpuRank: 0, gpuRank: 0 },
      { cpuRank: 1, gpuRank: 0 },
      { cpuRank: 0, gpuRank: 1 },
      { cpuRank: 2, gpuRank: 0 },
      { cpuRank: 0, gpuRank: 2 },
      { cpuRank: 1, gpuRank: 1 },
    ]

    const seenSig = new Set<string>()
    const variantBuilds: BuildState[] = []

    for (const ranks of rankPlans) {
      if (variantBuilds.length >= 3) break
      const b = synthesizeBuildWithRanks(
        components,
        budget,
        tierAllocations,
        buildUseCase,
        ranks,
        preferMostExpensive
      )
      const sig = buildComponentSignature(b)
      if (seenSig.has(sig)) continue
      seenSig.add(sig)
      variantBuilds.push(b)
    }

    const scored = variantBuilds.map((b) => ({
      build: b,
      fitScore: totalBuildFitScore(b, buildUseCase),
      totalPrice: totalBuildPriceState(b),
    }))

    if (preferMostExpensive) {
      scored.sort((a, b) => b.totalPrice - a.totalPrice || b.fitScore - a.fitScore)
    } else {
      scored.sort((a, b) => b.fitScore - a.fitScore)
    }

    const top = scored.slice(0, 3).map(({ build, fitScore }) => ({ build, fitScore }))
    if (opts?.skipVariantCards) {
      setSynthesisResults([])
    } else {
      setSynthesisResults(top)
    }
    setSelectedSynthesisRank(0)
    const finalBuild = top[0]?.build ?? initialBuildState
    setBuild(finalBuild)

    const useCaseLabel =
      buildUseCaseOptions.find((o) => o.value === buildUseCase)?.label ?? buildUseCase

    const addedCount = [
      finalBuild.gpu,
      finalBuild.cpu,
      finalBuild.motherboard,
      finalBuild.ram,
      finalBuild.storage.length > 0,
      finalBuild.psu,
      finalBuild.case,
      finalBuild.cooling,
    ].filter(Boolean).length

    if (top.length === 0) {
      toast.error('Не бяха намерени налични компоненти')
    } else if (opts?.skipVariantCards && addedCount === 8) {
      toast.success(`${budget.label} — сглобката за „${useCaseLabel}“ е готова (най-добрият вариант).`)
    } else if (opts?.skipVariantCards && addedCount >= 6) {
      toast.warning(
        `Най-добрият вариант е зареден (${addedCount}/8 слота) — провери каталога за липсващи части.`
      )
    } else if (opts?.skipVariantCards && addedCount > 0) {
      toast.warning(`Частична сглобка (${addedCount} компонента) — допълни ръчно.`)
    } else if (addedCount === 8) {
      toast.success(
        `${budget.label} — ${top.length} топ варианта за „${useCaseLabel}“. Избери от картите „Топ предложения“ по-долу.`
      )
    } else if (addedCount >= 6) {
      toast.warning(
        `Генерирани ${top.length} варианта; най-добрият има ${addedCount}/8 слота — провери каталога.`
      )
    } else if (addedCount > 0) {
      toast.warning(`Генерирани ${top.length} варианта с ${addedCount} компонента — допълни ръчно.`)
    } else {
      toast.error('Не бяха намерени налични компоненти')
    }
  }, [buildUseCase, components, normalizeAllocations])

  const handleAutoGenerate = useCallback(() => {
    const r = Math.random()
    const preset = r < 0.34 ? 'entry' : r < 0.67 ? 'mid' : 'high-end'
    handlePresetBuild(preset)
  }, [handlePresetBuild])

  const handleCustomBudgetGenerate = useCallback(() => {
    const raw = Number(String(customBudgetInput).replace(',', '.'))
    if (!Number.isFinite(raw)) {
      toast.error('Въведи число за бюджета.')
      return
    }
    handlePresetBuild({ customTargetEur: raw })
  }, [customBudgetInput, handlePresetBuild])

  useEffect(() => {
    if (searchParams.get('build')) return
    const skipVariantCards = searchParams.get('quickBudget') === '1'
    const budgetParam = searchParams.get('budget')
    if (budgetParam) {
      const n = Number(budgetParam.replace(',', '.'))
      if (Number.isFinite(n) && n >= 400) {
        handlePresetBuild({ customTargetEur: n }, { skipVariantCards })
      }
      return
    }
    const preset = searchParams.get('preset')
    if (preset) {
      handlePresetBuild(
        preset === 'entry' || preset === 'mid' || preset === 'high-end' ? preset : 'mid',
        { skipVariantCards }
      )
    }
  }, [searchParams, handlePresetBuild])

  useEffect(() => {
    const componentId = searchParams.get('add')
    if (!componentId) {
      lastAddedComponentRef.current = null
      return
    }
    if (lastAddedComponentRef.current === componentId) return

    const component = components.find((c) => c.id === componentId)
    if (!component) return

    setBuild((prev) => {
      const next = { ...prev }
      const slug = component.category?.slug
      switch (slug) {
        case 'cpu':
          next.cpu = component
          break
        case 'gpu':
          next.gpu = component
          break
        case 'ram':
          next.ram = component
          break
        case 'motherboard':
          next.motherboard = component
          break
        case 'psu':
          next.psu = component
          break
        case 'case':
          next.case = component
          break
        case 'cooling':
          next.cooling = component
          break
        case 'storage':
          if (!prev.storage.some((s) => s.id === component.id)) {
            next.storage = [...prev.storage, component]
          }
          break
        default:
          break
      }
      return next
    })

    lastAddedComponentRef.current = componentId
    toast.success(`${component.name} е добавен в текущата сглобка.`)
  }, [searchParams, components])

  useEffect(() => {
    const buildId = searchParams.get('build')
    if (!buildId) {
      lastLoadedBuildRef.current = null
      return
    }
    if (lastLoadedBuildRef.current === buildId) return

    let cancelled = false
    void (async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      const { data: row, error } = await supabase
        .from('builds')
        .select(
          `
          *,
          build_items (
            quantity,
            component:components (
              *,
              category:categories (*),
              brand:brands (*)
            )
          )
        `
        )
        .eq('id', buildId)
        .maybeSingle()

      if (cancelled) return
      if (error || !row) {
        toast.error(error?.message || 'Сглобката не е намерена или няма достъп.')
        return
      }

      const rowUserId =
        typeof (row as { user_id?: unknown }).user_id === 'string'
          ? ((row as { user_id?: string }).user_id ?? null)
          : null
      const rowIsPublic = Boolean((row as { is_public?: unknown }).is_public)
      if (!rowIsPublic && (!user || rowUserId !== user.id)) {
        setBuild(initialBuildState)
        setBuildName('Моята Сглобка')
        toast.error('Тази сглобка принадлежи на друг профил.')
        return
      }

      const pool = components
      const next: BuildState = {
        cpu: null,
        gpu: null,
        ram: null,
        motherboard: null,
        storage: [],
        psu: null,
        case: null,
        cooling: null,
      }

      const mergeWithPool = (c: Component): Component => {
        const full = pool.find((p) => p.id === c.id)
        if (!full) return c
        const mergedSpecs =
          typeof full.specs === 'object' &&
          full.specs &&
          typeof c.specs === 'object' &&
          c.specs
            ? { ...full.specs, ...c.specs }
            : full.specs || c.specs
        return {
          ...full,
          ...c,
          specs: mergedSpecs,
          category: c.category ?? full.category,
          brand: c.brand ?? full.brand,
        }
      }

      type ItemRow = {
        quantity: number | null
        component: Component | null
      }
      const items = (row.build_items as ItemRow[] | null) ?? []
      for (const item of items) {
        if (!item?.component) continue
        const c = mergeWithPool(item.component)
        const slug = c.category?.slug
        if (!slug) continue
        const q = Math.max(1, asFiniteNumber(item.quantity, 1))
        switch (slug) {
          case 'cpu':
            next.cpu = c
            break
          case 'gpu':
            next.gpu = c
            break
          case 'ram':
            next.ram = c
            break
          case 'motherboard':
            next.motherboard = c
            break
          case 'psu':
            next.psu = c
            break
          case 'case':
            next.case = c
            break
          case 'cooling':
            next.cooling = c
            break
          case 'storage':
            for (let i = 0; i < q; i++) next.storage.push(c)
            break
          default:
            break
        }
      }

      setBuild(next)
      const r = row as { name?: string; title?: string }
      setBuildName((r.name || r.title || 'Моята Сглобка').trim() || 'Моята Сглобка')
      lastLoadedBuildRef.current = buildId
      toast.success('Сглобката е заредена.')
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, components])

  const filledSlots = useMemo(() => {
    let count = 0
    if (build.cpu) count++
    if (build.gpu) count++
    if (build.ram) count++
    if (build.motherboard) count++
    if (build.psu) count++
    if (build.case) count++
    if (build.cooling) count++
    count += build.storage.length
    return count
  }, [build])

  const handleSaveBuild = useCallback(async () => {
    if (filledSlots === 0) {
      toast.error('Добави поне един компонент, преди да запазиш.')
      return
    }
    setSavingBuild(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Влез в профила си, за да запазиш сглобката.')
        router.push('/auth/login?redirect=/builder')
        return
      }

      const name = buildName.trim() || 'Моята Сглобка'
      const { data: newBuild, error: buildErr } = await supabase
        .from('builds')
        .insert({
          user_id: user.id,
          name,
          description: null,
          is_public: saveBuildPublic,
          total_price: totalPrice,
          performance_score: performanceScore,
        })
        .select('id')
        .single()

      if (buildErr || !newBuild) {
        toast.error(buildErr?.message || 'Неуспешно записване на сглобката.')
        return
      }

      const counts = new Map<string, number>()
      const add = (id: string) => counts.set(id, (counts.get(id) || 0) + 1)
      if (build.cpu) add(build.cpu.id)
      if (build.gpu) add(build.gpu.id)
      if (build.ram) add(build.ram.id)
      if (build.motherboard) add(build.motherboard.id)
      if (build.psu) add(build.psu.id)
      if (build.case) add(build.case.id)
      if (build.cooling) add(build.cooling.id)
      build.storage.forEach((s) => add(s.id))

      const rows = [...counts.entries()].map(([component_id, quantity]) => ({
        build_id: newBuild.id,
        component_id,
        quantity,
      }))

      if (rows.length > 0) {
        const { error: itemsErr } = await supabase.from('build_items').insert(rows)
        if (itemsErr) {
          await supabase.from('builds').delete().eq('id', newBuild.id)
          toast.error(itemsErr.message || 'Неуспешно записване на компонентите.')
          return
        }
      }

      toast.success(
        saveBuildPublic
          ? 'Сглобката е запазена и публикувана в общността.'
          : 'Сглобката е запазена в „Моите сглобки“.'
      )
      router.push('/builds')
    } finally {
      setSavingBuild(false)
    }
  }, [
    build,
    buildName,
    filledSlots,
    performanceScore,
    router,
    saveBuildPublic,
    totalPrice,
  ])

  const handleExportBuild = useCallback(
    (format: 'json' | 'txt') => {
      if (filledSlots === 0) {
        toast.error('Няма какво да експортираш.')
        return
      }

      const groupedComponents = [
        ['Процесор', build.cpu],
        ['Видеокарта', build.gpu],
        ['RAM', build.ram],
        ['Дънна платка', build.motherboard],
        ['Захранване', build.psu],
        ['Кутия', build.case],
        ['Охлаждане', build.cooling],
      ].filter(([, component]) => Boolean(component))

      const payload = {
        name: buildName,
        useCase: buildUseCase,
        totalPrice,
        estimatedWattage,
        performanceScore,
        compatibilityIssues,
        components: {
          cpu: build.cpu,
          gpu: build.gpu,
          ram: build.ram,
          motherboard: build.motherboard,
          psu: build.psu,
          case: build.case,
          cooling: build.cooling,
          storage: build.storage,
        },
      }

      const textContent = [
        `Име: ${buildName}`,
        `Тип конфигурация: ${buildUseCaseOptions.find((o) => o.value === buildUseCase)?.label ?? buildUseCase}`,
        `Обща цена: ${formatPrice(totalPrice)}`,
        `Консумация: ${estimatedWattage}W`,
        `Производителност: ${performanceScore}/100`,
        '',
        ...groupedComponents.map(
          ([label, component]) =>
            `${label}: ${(component as Component).name} - ${formatPrice((component as Component).price)}`
        ),
        ...build.storage.map(
          (storage, index) => `Съхранение ${index + 1}: ${storage.name} - ${formatPrice(storage.price)}`
        ),
      ].join('\n')

      const content = format === 'json' ? JSON.stringify(payload, null, 2) : textContent
      const mimeType = format === 'json' ? 'application/json' : 'text/plain;charset=utf-8'
      const blob = new Blob([content], { type: mimeType })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${buildName.trim().replace(/\s+/g, '-').toLowerCase() || 'build'}.${
        format === 'json' ? 'json' : 'txt'
      }`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      toast.success('Конфигурацията е експортирана.')
    },
    [
      build,
      buildName,
      buildUseCase,
      compatibilityIssues,
      estimatedWattage,
      filledSlots,
      performanceScore,
      totalPrice,
    ]
  )

  const totalSlots = 8

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price)
  }

  const performanceTier = getPerformanceTier(performanceScore)

  // Summary content for mobile sheet and desktop sidebar
  const SummaryContent = () => (
    <div className="space-y-4">
      {/* Price Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Обобщение</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted/40 p-2 text-sm">
            <div className="text-muted-foreground">Тип конфигурация</div>
            <div className="font-medium">
              {buildUseCaseOptions.find((option) => option.value === buildUseCase)?.label}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Обща цена</span>
            <span className="text-2xl font-bold text-primary">{formatPrice(totalPrice)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Консумация
            </span>
            <span className="font-medium">{estimatedWattage}W</span>
          </div>
        </CardContent>
      </Card>

      {/* Compatibility */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            {hasErrors ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : hasWarnings ? (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            Съвместимост
          </CardTitle>
        </CardHeader>
        <CardContent>
          {compatibilityIssues.length === 0 ? (
            <p className="text-sm text-muted-foreground">Всички компоненти са съвместими</p>
          ) : (
            <div className="space-y-2">
              {compatibilityIssues.map((issue, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "p-2 rounded-lg text-sm",
                    issue.type === 'error' ? "bg-destructive/10 text-destructive" : "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400"
                  )}
                >
                  {issue.message}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Rating */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Производителност</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Рейтинг</span>
            <Badge className={cn(performanceTier.bgColor, performanceTier.color, "border-0")}>
              {performanceTier.label}
            </Badge>
          </div>
          <Progress value={performanceScore} className="h-2" />
          
          <Separator />
          
          {/* Use case suitability */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Подходящ за:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: Briefcase, label: 'Офис', min: 10 },
                { icon: Gamepad2, label: 'Игри', min: 30 },
                { icon: Video, label: 'Видео', min: 50 },
                { icon: Code, label: 'Програмиране', min: 40 },
              ].map(({ icon: Icon, label, min }) => (
                <div
                  key={label}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg text-sm",
                    performanceScore >= min ? "bg-green-500/10 text-green-600 dark:text-green-400" : "bg-muted text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* FPS Estimates */}
      {build.gpu && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              FPS Прогноза (1080p)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {fpsEstimates.slice(0, 4).map(({ game, fps }) => (
                <div key={game} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{game}</span>
                  <Badge variant={fps >= 60 ? "default" : "secondary"}>
                    {fps} FPS
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="outline"
              size="icon"
              asChild
              className="min-h-[44px] min-w-[44px] border-2 border-primary bg-transparent text-primary shadow-sm hover:bg-primary/10 hover:text-primary"
            >
              <Link href="/" aria-label="Към началната страница">
                <ArrowLeft className="h-5 w-5 text-primary" />
              </Link>
            </Button>
            <div>
              <h1 className="font-semibold text-base sm:text-lg">{buildName}</h1>
              <p className="text-xs text-muted-foreground">{filledSlots}/{totalSlots} компонента</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="hidden sm:flex gap-2 min-h-[44px]">
              <Link href="/cart">
                <ShoppingCart className="h-4 w-4" />
                Количка
                {totalItems > 0 ? (
                  <span className="rounded-full bg-primary/12 px-2 py-0.5 text-xs text-primary">
                    {totalItems}
                  </span>
                ) : null}
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportBuild('txt')}
              disabled={filledSlots === 0}
              className="hidden sm:flex gap-2 min-h-[44px]"
            >
              <Download className="h-4 w-4" />
              Експорт
            </Button>
            <Button 
              variant="default" 
              size="sm" 
              onClick={handleAutoGenerate}
              className="hidden sm:flex gap-2 min-h-[44px] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Wand2 className="h-4 w-4" />
              Автоматично
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setSaveDialogOpen(true)}
              disabled={savingBuild || filledSlots === 0}
              className="gap-2 min-h-[44px]"
            >
              <Save className="h-4 w-4" />
              {savingBuild ? 'Запазване…' : 'Запази'}
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleClearBuild}
              className="text-destructive min-h-[44px] min-w-[44px]"
            >
              <Trash2 className="h-5 w-5" />
            </Button>
            {/* Mobile Summary Button */}
            <Sheet open={summarySheetOpen} onOpenChange={setSummarySheetOpen}>
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="default" size="sm" className="gap-2 min-h-[44px]">
                  <ShoppingCart className="h-4 w-4" />
                  {formatPrice(totalPrice)}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px] p-4 overflow-y-auto">
                <SummaryContent />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 lg:py-6">
        <div className="flex gap-6">
          {/* Components List */}
          <div className="flex-1 space-y-3">
            {!hideSynthesisSettings ? (
            <Button 
              variant="default" 
              onClick={handleAutoGenerate}
              className="w-full sm:hidden gap-2 min-h-[48px] mb-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Wand2 className="h-4 w-4" />
              Автоматична Генерация
            </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => handleExportBuild('txt')}
              disabled={filledSlots === 0}
              className="w-full sm:hidden gap-2 min-h-[48px] mb-4"
            >
              <Download className="h-4 w-4" />
              Експорт на конфигурация
            </Button>

            {hideSynthesisSettings ? (
              <div className="rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
                <button
                  type="button"
                  className="text-primary underline underline-offset-2 hover:text-primary/90"
                  onClick={() => setSynthesisPanelRevealed(true)}
                >
                  Покажи настройки за синтезиране
                </button>
                <span className="ml-2">(тип конфигурация, ръчен бюджет)</span>
              </div>
            ) : null}

            {!hideSynthesisSettings ? (
            <Card className="border-border/60 bg-card/75">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Настройки за синтезиране</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 max-w-md">
                  <Label>Тип конфигурация</Label>
                  <Select value={buildUseCase} onValueChange={(value: BuildUseCase) => setBuildUseCase(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {buildUseCaseOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="min-w-[140px] flex-1 space-y-2">
                      <Label htmlFor="custom-budget-eur">Бюджет (€)</Label>
                      <Input
                        id="custom-budget-eur"
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder="напр. 1380"
                        value={customBudgetInput}
                        onChange={(e) => setCustomBudgetInput(e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      className="w-full gap-2 bg-primary text-primary-foreground sm:w-auto"
                      onClick={handleCustomBudgetGenerate}
                    >
                      <Wand2 className="h-4 w-4" />
                      Синтезирай топ 3 варианта
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setCustomBudgetInput('1050')
                        handlePresetBuild('entry')
                      }}
                    >
                      Бюджетен (1050 €)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setCustomBudgetInput('1550')
                        handlePresetBuild('mid')
                      }}
                    >
                      Среден (1550 €)
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => {
                        setCustomBudgetInput('2600')
                        handlePresetBuild('high-end')
                      }}
                    >
                      Висок (2600 €)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            ) : null}

            {synthesisResults.length > 0 ? (
              <Card className="border-primary/35 bg-gradient-to-br from-primary/8 via-card to-card shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary shrink-0" />
                    Топ предложения
                  </CardTitle>
                  <p className="text-sm text-muted-foreground font-normal leading-relaxed">
                    {synthesisResults.length} варианта за „
                    {buildUseCaseOptions.find((o) => o.value === buildUseCase)?.label}“, подредени по оценка за този тип.
                    Избери картата и натисни „Използвай“, за да я заредиш в сглобката.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {synthesisResults.map((row, idx) => (
                      <div
                        key={`${buildComponentSignature(row.build)}-${idx}`}
                        className={cn(
                          'flex flex-col rounded-xl border p-4 gap-3 transition-all',
                          selectedSynthesisRank === idx
                            ? 'border-primary bg-primary/10 ring-2 ring-primary/40'
                            : 'border-border/60 bg-card/80'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-foreground">Вариант {idx + 1}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Оценка {Math.round(row.fitScore)} · Обща сума{' '}
                              {formatPrice(totalBuildPriceState(row.build))}
                            </p>
                          </div>
                          {idx === 0 ? (
                            <Badge className="shrink-0 bg-primary text-primary-foreground">Най-висок</Badge>
                          ) : null}
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-1 flex-1 min-h-0">
                          {row.build.cpu ? (
                            <li className="line-clamp-2">
                              <span className="text-foreground/90">CPU:</span> {row.build.cpu.name}
                            </li>
                          ) : null}
                          {row.build.gpu ? (
                            <li className="line-clamp-2">
                              <span className="text-foreground/90">GPU:</span> {row.build.gpu.name}
                            </li>
                          ) : null}
                          {row.build.ram ? (
                            <li className="line-clamp-2">
                              <span className="text-foreground/90">RAM:</span> {row.build.ram.name}
                            </li>
                          ) : null}
                        </ul>
                        <Button
                          type="button"
                          size="sm"
                          className="w-full mt-auto"
                          variant={selectedSynthesisRank === idx ? 'default' : 'outline'}
                          onClick={() => {
                            setBuild(row.build)
                            setSelectedSynthesisRank(idx)
                            toast.success(`Зареден е вариант ${idx + 1}`)
                          }}
                        >
                          Използвай този вариант
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {sortedCategories.map((category) => {
              const config = categoryConfig[category.slug]
              if (!config) return null
              
              const Icon = config.icon
              const component = getComponentForCategory(category.slug)
              const isStorage = category.slug === 'storage'
              const storageComponents = isStorage ? build.storage : []
              
              return (
                <Card key={category.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    {/* Category Header */}
                    <div className="flex items-center justify-between p-3 sm:p-4 bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm sm:text-base">{config.label}</h3>
                          <p className="text-xs text-muted-foreground">
                            {components.filter(c => c.category?.slug === category.slug).length} налични
                          </p>
                        </div>
                      </div>
                      <Button
                        variant={component || storageComponents.length > 0 ? "outline" : "default"}
                        size="sm"
                        onClick={() => setSelectedCategory(category.slug)}
                        className="min-h-[44px] min-w-[44px] sm:min-w-0"
                      >
                        <Plus className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">
                          {component || storageComponents.length > 0 ? 'Смени' : 'Добави'}
                        </span>
                      </Button>
                    </div>

                    {/* Selected Component(s) */}
                    {isStorage && storageComponents.length > 0 ? (
                      <div className="divide-y divide-border">
                        {storageComponents.map((storage, idx) => (
                          <div key={storage.id} className="flex items-center gap-3 p-3 sm:p-4">
                            <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg bg-muted overflow-hidden shrink-0">
                              {storage.image_url ? (
                                <Image
                                  src={storage.image_url}
                                  alt={storage.name}
                                  width={64}
                                  height={64}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Icon className="h-6 w-6 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm line-clamp-1">{storage.name}</p>
                              <p className="text-xs text-muted-foreground">{storage.brand?.name}</p>
                              <div className="flex items-center gap-2 mt-1">
                                {storage.specs?.capacity && (
                                  <Badge variant="secondary" className="text-xs">
                                    {storage.specs.capacity}GB
                                  </Badge>
                                )}
                                {storage.specs?.type && (
                                  <Badge variant="outline" className="text-xs">
                                    {storage.specs.type}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold text-primary">{formatPrice(storage.price)}</p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive mt-1"
                                onClick={() => handleRemoveComponent('storage', idx)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : component ? (
                      <div className="flex items-center gap-3 p-3 sm:p-4">
                        <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg bg-muted overflow-hidden shrink-0">
                          {component.image_url ? (
                            <Image
                              src={component.image_url}
                              alt={component.name}
                              width={64}
                              height={64}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icon className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm line-clamp-1">{component.name}</p>
                          <p className="text-xs text-muted-foreground">{component.brand?.name}</p>
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {category.slug === 'cpu' && component.specs?.cores && (
                              <Badge variant="secondary" className="text-xs">
                                {component.specs.cores} ядра
                              </Badge>
                            )}
                            {category.slug === 'gpu' && component.specs?.vram && (
                              <Badge variant="secondary" className="text-xs">
                                {component.specs.vram}GB VRAM
                              </Badge>
                            )}
                            {category.slug === 'ram' && component.specs?.capacity && (
                              <Badge variant="secondary" className="text-xs">
                                {component.specs.capacity}GB
                              </Badge>
                            )}
                            {category.slug === 'psu' && component.specs?.wattage && (
                              <Badge variant="secondary" className="text-xs">
                                {component.specs.wattage}W
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-primary">{formatPrice(component.price)}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive mt-1"
                            onClick={() => handleRemoveComponent(category.slug)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Desktop Summary Sidebar */}
          <aside className="hidden lg:block w-80 shrink-0">
            <div className="sticky top-20">
              <SummaryContent />
            </div>
          </aside>
        </div>
      </main>

      {/* Part Selection Modal */}
      <PartSelectionModal
        open={selectedCategory !== null}
        onClose={() => setSelectedCategory(null)}
        category={categories.find(c => c.slug === selectedCategory) || null}
        categories={categories}
        components={components}
        brands={brands}
        onSelectComponent={handleSelectComponent}
        currentBuild={build}
      />

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Запази сглобка</DialogTitle>
            <DialogDescription>
              Въведи име, за да я намираш по-лесно по-късно.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="build-name">Име на сглобката</Label>
            <Input
              id="build-name"
              value={buildName}
              onChange={(e) => setBuildName(e.target.value)}
              placeholder="Например: Гейминг PC 2026"
              autoFocus
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
            <div className="space-y-1">
              <Label htmlFor="build-public">Видимост</Label>
              <p className="text-sm text-muted-foreground">
                Ако е публична, ще се показва в секцията с общностни сглобки.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">
                {saveBuildPublic ? 'Публична' : 'Скрита'}
              </span>
              <Switch
                id="build-public"
                checked={saveBuildPublic}
                onCheckedChange={setSaveBuildPublic}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Отказ
            </Button>
            <Button
              onClick={async () => {
                await handleSaveBuild()
                setSaveBuildPublic(false)
                setSaveDialogOpen(false)
              }}
              disabled={savingBuild || !buildName.trim()}
            >
              {savingBuild ? 'Запазване…' : 'Запази'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
