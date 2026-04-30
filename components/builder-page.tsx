'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { Category, Brand, Component, BuildState, CompatibilityIssue } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/components/cart-provider'
import { estimateBuildWattage } from '@/lib/build-wattage'
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
type BuildPriority = 'balanced' | 'budget' | 'performance' | 'efficiency' | 'brand'

const buildUseCaseOptions: Array<{ value: BuildUseCase; label: string }> = [
  { value: 'gaming', label: 'Гейминг' },
  { value: 'office', label: 'Офис' },
  { value: 'graphics', label: 'Графична обработка' },
  { value: 'programming', label: 'Програмиране' },
]

const buildPriorityOptions: Array<{ value: BuildPriority; label: string }> = [
  { value: 'balanced', label: 'Баланс' },
  { value: 'budget', label: 'Бюджет' },
  { value: 'performance', label: 'Производителност' },
  { value: 'efficiency', label: 'Енергийна ефективност' },
  { value: 'brand', label: 'Марка' },
]

function pickRandom<T>(items: T[]): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(Math.random() * items.length)]
}

function pickRandomNearPrice(
  items: Component[],
  targetPrice: number,
  maxPrice?: number,
  filter?: (item: Component) => boolean
): Component | null {
  const pool = (filter ? items.filter(filter) : items)
    .filter((item) => item.in_stock)
    .filter((item) => (typeof maxPrice === 'number' ? item.price <= maxPrice : true))
  if (pool.length === 0) return null
  const sorted = [...pool].sort(
    (a, b) => Math.abs(a.price - targetPrice) - Math.abs(b.price - targetPrice)
  )
  const shortlist = sorted.slice(0, Math.min(6, sorted.length))
  return pickRandom(shortlist) ?? shortlist[0] ?? null
}

// FPS estimates for popular games
const gameFpsEstimates: Record<string, { base1080p: number; base1440p: number; base4k: number }> = {
  'CS2': { base1080p: 400, base1440p: 280, base4k: 150 },
  'Valorant': { base1080p: 450, base1440p: 350, base4k: 200 },
  'Fortnite': { base1080p: 240, base1440p: 165, base4k: 90 },
  'GTA V': { base1080p: 140, base1440p: 100, base4k: 55 },
  'Warzone': { base1080p: 180, base1440p: 130, base4k: 70 },
  'Cyberpunk 2077': { base1080p: 100, base1440p: 65, base4k: 35 },
}

const cpuBenchmarks: Record<string, { gaming: number; productivity: number }> = {
  'Ryzen 9 9950X3D': { gaming: 100, productivity: 98 },
  'Ryzen 9 9950X': { gaming: 94, productivity: 100 },
  'Ryzen 9 7950X3D': { gaming: 95, productivity: 92 },
  'Ryzen 9 7950X': { gaming: 88, productivity: 93 },
  'Ryzen 7 9800X3D': { gaming: 98, productivity: 72 },
  'Ryzen 7 7800X3D': { gaming: 94, productivity: 64 },
  'Ryzen 7 9700X': { gaming: 85, productivity: 72 },
  'Ryzen 7 7700X': { gaming: 78, productivity: 66 },
  'Ryzen 5 9600X': { gaming: 80, productivity: 58 },
  'Ryzen 5 7600X': { gaming: 74, productivity: 54 },
  'Ryzen 5 7600': { gaming: 72, productivity: 52 },
  'Ryzen 5 7500F': { gaming: 70, productivity: 50 },
  'Ryzen 5 5600X': { gaming: 58, productivity: 42 },
  'Ryzen 5 5600': { gaming: 55, productivity: 40 },
  'Ryzen 3 4100': { gaming: 28, productivity: 20 },
  'Core Ultra 9 285K': { gaming: 94, productivity: 96 },
  'Core Ultra 7 265K': { gaming: 88, productivity: 84 },
  'Core Ultra 5 245K': { gaming: 80, productivity: 72 },
  'i9-14900K': { gaming: 91, productivity: 94 },
  'i7-14700K': { gaming: 84, productivity: 84 },
  'i5-14600K': { gaming: 76, productivity: 68 },
  'i9-13900K': { gaming: 86, productivity: 90 },
  'i7-13700K': { gaming: 78, productivity: 76 },
  'i5-13600K': { gaming: 72, productivity: 64 },
  'i5-12400F': { gaming: 52, productivity: 38 },
}

const gpuBenchmarks: Record<string, { gaming: number; creator: number }> = {
  'RTX 5090': { gaming: 100, creator: 100 },
  'RTX 5080': { gaming: 88, creator: 90 },
  'RTX 5070 Ti': { gaming: 77, creator: 80 },
  'RTX 5070': { gaming: 68, creator: 72 },
  'RTX 4090': { gaming: 95, creator: 98 },
  'RTX 4080 SUPER': { gaming: 84, creator: 86 },
  'RTX 4080': { gaming: 80, creator: 82 },
  'RTX 4070 Ti SUPER': { gaming: 72, creator: 76 },
  'RTX 4070 Ti': { gaming: 68, creator: 72 },
  'RTX 4070 SUPER': { gaming: 63, creator: 66 },
  'RTX 4070': { gaming: 58, creator: 60 },
  'RTX 4060 Ti': { gaming: 46, creator: 48 },
  'RTX 4060': { gaming: 38, creator: 40 },
  'RX 9070 XT': { gaming: 78, creator: 72 },
  'RX 9070': { gaming: 68, creator: 64 },
  'RX 7900 XTX': { gaming: 82, creator: 74 },
  'RX 7900 XT': { gaming: 72, creator: 66 },
  'RX 7800 XT': { gaming: 58, creator: 54 },
  'RX 7700 XT': { gaming: 50, creator: 46 },
  'RX 7600 XT': { gaming: 38, creator: 34 },
}

const gameProfiles = {
  'CS2': { base: 950, gpuWeight: 0.42, cpuWeight: 0.48, ramWeight: 0.1, vramMin: 6 },
  'Valorant': { base: 1000, gpuWeight: 0.4, cpuWeight: 0.5, ramWeight: 0.1, vramMin: 6 },
  'Fortnite': { base: 420, gpuWeight: 0.6, cpuWeight: 0.28, ramWeight: 0.12, vramMin: 8 },
  'GTA V': { base: 260, gpuWeight: 0.55, cpuWeight: 0.35, ramWeight: 0.1, vramMin: 6 },
  'Warzone': { base: 280, gpuWeight: 0.68, cpuWeight: 0.22, ramWeight: 0.1, vramMin: 10 },
  'Cyberpunk 2077': { base: 190, gpuWeight: 0.75, cpuWeight: 0.15, ramWeight: 0.1, vramMin: 12 },
} as const

function asFiniteNumber(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function clampScore(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function normalizeName(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseCacheAmount(cache: unknown): number {
  if (typeof cache !== 'string') return 0
  const match = cache.match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : 0
}

function matchBenchmark<T>(map: Record<string, T>, component: Component | null): T | null {
  if (!component) return null
  const normalizedModel = normalizeName(component.model)
  const normalizedName = normalizeName(component.name)
  const entries = Object.entries(map).sort((a, b) => b[0].length - a[0].length)

  for (const [key, value] of entries) {
    const normalizedKey = normalizeName(key)
    if (
      normalizedModel.includes(normalizedKey) ||
      normalizedName.includes(normalizedKey)
    ) {
      return value
    }
  }

  return null
}

export function BuilderPage({ categories, brands, components }: BuilderPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { totalItems } = useCart()
  const [build, setBuild] = useState<BuildState>(initialBuildState)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [buildName, setBuildName] = useState('Моята Сглобка')
  const [summarySheetOpen, setSummarySheetOpen] = useState(false)
  const [savingBuild, setSavingBuild] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveBuildPublic, setSaveBuildPublic] = useState(false)
  const lastLoadedBuildRef = useRef<string | null>(null)
  const lastAddedComponentRef = useRef<string | null>(null)
  const [buildUseCase, setBuildUseCase] = useState<BuildUseCase>('gaming')
  const [buildPriority, setBuildPriority] = useState<BuildPriority>('balanced')
  const [preferredBrand, setPreferredBrand] = useState<string>('all')

  // Sort categories by order
  const sortedCategories = useMemo(() => {
    return categories.sort((a, b) => {
      const orderA = categoryConfig[a.slug]?.order || 99
      const orderB = categoryConfig[b.slug]?.order || 99
      return orderA - orderB
    })
  }, [categories])

  const availableBrandOptions = useMemo(
    () => brands.filter((brand) => components.some((component) => component.brand?.id === brand.id)),
    [brands, components]
  )

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

  const cpuPerformance = useMemo(() => {
    if (!build.cpu) return { gaming: 0, productivity: 0 }

    const matched = matchBenchmark(cpuBenchmarks, build.cpu)
    if (matched) return matched

    const cores = asFiniteNumber(build.cpu.specs?.cores, 4)
    const threads = asFiniteNumber(build.cpu.specs?.threads, Math.max(cores, 4))
    const boost = asFiniteNumber(build.cpu.specs?.boost_clock, 4)
    const base = asFiniteNumber(build.cpu.specs?.base_clock, 3.2)
    const cache = parseCacheAmount(build.cpu.specs?.cache)
    const architecture = normalizeName(build.cpu.specs?.architecture)

    let archFactor = 1
    if (architecture.includes('zen 5')) archFactor = 1.1
    else if (architecture.includes('zen 4')) archFactor = 1.05
    else if (architecture.includes('zen 2')) archFactor = 0.88

    const gaming = clampScore(
      ((cores / 8) * 26 + (threads / 16) * 16 + (boost / 5.8) * 34 + (base / 4.2) * 10 + (cache / 96) * 14) *
        archFactor,
      12,
      100
    )
    const productivity = clampScore(
      ((cores / 16) * 38 + (threads / 32) * 26 + (boost / 5.8) * 18 + (cache / 96) * 10) *
        archFactor,
      12,
      100
    )

    return { gaming, productivity }
  }, [build.cpu])

  const gpuPerformance = useMemo(() => {
    if (!build.gpu) return { gaming: 0, creator: 0 }

    const matched = matchBenchmark(gpuBenchmarks, build.gpu)
    if (matched) return matched

    const vram = asFiniteNumber(build.gpu.specs?.vram, 8)
    const busWidth = asFiniteNumber(build.gpu.specs?.bus_width, 128)
    const tdp = asFiniteNumber(build.gpu.specs?.tdp, 150)
    const rawCuda = asFiniteNumber(build.gpu.specs?.cuda_cores, 0)
    const rawStream = asFiniteNumber(build.gpu.specs?.stream_processors, 0)
    const normalizedShaders = rawCuda > 0 ? rawCuda : rawStream * 0.42

    const gaming = clampScore(
      (normalizedShaders / 18000) * 50 +
        (vram / 24) * 22 +
        (busWidth / 384) * 18 +
        (tdp / 420) * 10,
      10,
      100
    )
    const creator = clampScore(gaming * 0.94 + (vram / 24) * 10, 10, 100)

    return { gaming, creator }
  }, [build.gpu])

  const ramPerformance = useMemo(() => {
    if (!build.ram) return 0
    const capacity = asFiniteNumber(build.ram.specs?.capacity, 8)
    const speed = asFiniteNumber(build.ram.specs?.speed, 3200)
    const isDdr5 = normalizeName(build.ram.specs?.type).includes('ddr5')
    return clampScore(
      (capacity / 32) * 55 + (speed / 6400) * 35 + (isDdr5 ? 8 : 0),
      10,
      100
    )
  }, [build.ram])

  const storagePerformance = useMemo(() => {
    if (build.storage.length === 0) return 0
    const speeds = build.storage.map((s) => asFiniteNumber(s.specs?.read_speed, 550))
    const fastest = Math.max(...speeds)
    return clampScore((fastest / 7500) * 100, 12, 100)
  }, [build.storage])

  // Calculate performance score (0-100)
  const performanceScore = useMemo(() => {
    const weightedParts: Array<{ score: number; weight: number }> = []

    if (build.gpu) weightedParts.push({ score: gpuPerformance.gaming, weight: 0.44 })
    if (build.cpu) weightedParts.push({ score: cpuPerformance.gaming * 0.62 + cpuPerformance.productivity * 0.38, weight: 0.34 })
    if (build.ram) weightedParts.push({ score: ramPerformance, weight: 0.12 })
    if (build.storage.length > 0) weightedParts.push({ score: storagePerformance, weight: 0.07 })
    if (build.cooling) weightedParts.push({ score: 92, weight: 0.03 })

    if (weightedParts.length === 0) return 0

    const score =
      weightedParts.reduce((sum, part) => sum + part.score * part.weight, 0) /
      weightedParts.reduce((sum, part) => sum + part.weight, 0)

    const populatedSlots = [
      build.cpu,
      build.gpu,
      build.ram,
      build.motherboard,
      build.psu,
      build.case,
      build.cooling,
      build.storage.length > 0,
    ].filter(Boolean).length

    const completionFactor = 0.58 + (Math.min(populatedSlots, 8) / 8) * 0.42
    return clampScore(score * completionFactor, 0, 100)
  }, [build, gpuPerformance, cpuPerformance, ramPerformance, storagePerformance])

  const getPerformanceTier = (score: number) => {
    if (score >= 78) return { label: 'Върхов Клас', color: 'text-purple-400', bgColor: 'bg-purple-500/20' }
    if (score >= 60) return { label: 'Много Добър', color: 'text-cyan-400', bgColor: 'bg-cyan-500/20' }
    if (score >= 42) return { label: 'Добър', color: 'text-green-400', bgColor: 'bg-green-500/20' }
    if (score >= 20) return { label: 'Базов', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20' }
    return { label: 'Слаб', color: 'text-red-400', bgColor: 'bg-red-500/20' }
  }

  // Calculate FPS estimates
  const fpsEstimates = useMemo(() => {
    if (!build.gpu) {
      return Object.keys(gameFpsEstimates).map((game) => ({ game, fps: 0 }))
    }

    const gpuScore = gpuPerformance.gaming / 100
    const cpuScore = Math.max(cpuPerformance.gaming / 100, 0.3)
    const ramCapacity = build.ram ? asFiniteNumber(build.ram.specs?.capacity, 8) : 8
    const ramSpeed = build.ram ? asFiniteNumber(build.ram.specs?.speed, 3200) : 3200
    const ramFactor = Math.min(
      1.08,
      Math.max(0.55, (ramCapacity / 32) * 0.6 + (ramSpeed / 6400) * 0.4)
    )
    const vram = asFiniteNumber(build.gpu.specs?.vram, 8)

    return Object.keys(gameFpsEstimates).map((game) => {
      const profile = gameProfiles[game as keyof typeof gameProfiles]
      const vramPenalty =
        vram >= profile.vramMin
          ? 1
          : Math.max(0.64, 1 - (profile.vramMin - vram) * 0.08)

      const combinedFactor =
        gpuScore * profile.gpuWeight +
        cpuScore * profile.cpuWeight +
        ramFactor * profile.ramWeight

      return {
        game,
        fps: Math.max(18, Math.round(profile.base * combinedFactor * vramPenalty)),
      }
    })
  }, [build.gpu, build.ram, gpuPerformance, cpuPerformance])

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
    toast.info('Сглобката е изчистена')
  }, [])

  // Handle preset builds based on budget - WITH COMPATIBILITY CHECK
  const handlePresetBuild = useCallback((preset: string) => {
    const budgets: Record<string, { target: number; max: number; label: string }> = {
      'entry': { target: 900, max: 1000, label: 'Бюджетен' },
      'mid': { target: 1500, max: 1650, label: 'Среден Клас' },
      'high-end': { target: 2500, max: 2700, label: 'Висок Клас' },
    }
    
    const budget = budgets[preset] || budgets['mid']
    const newBuild: BuildState = { ...initialBuildState }
    
    // Allocate budget percentages based on preset tier
    const allocations: Record<string, Record<string, number>> = {
      'entry': {
        gpu: 0.30,
        cpu: 0.22,
        motherboard: 0.15,
        ram: 0.12,
        storage: 0.10,
        psu: 0.06,
        case: 0.03,
        cooling: 0.02,
      },
      'mid': {
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
    
    const baseAllocations = allocations[preset] || allocations['mid']
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
    const targetBudget = budget.target

    const matchesBrandPreference = (component: Component) =>
      preferredBrand === 'all' || component.brand?.slug === preferredBrand

    const matchesEfficiencyPreference = (component: Component) => {
      if (buildPriority !== 'efficiency') return true
      const categorySlug = component.category?.slug
      switch (categorySlug) {
        case 'cpu':
          return (component.specs?.tdp || 0) <= 120
        case 'gpu':
          return (component.specs?.tdp || 0) <= 260
        case 'psu':
          return ['80+ Gold', '80+ Platinum', '80+ Titanium'].includes(component.specs?.efficiency || '')
        case 'cooling':
          return String(component.specs?.type || '').toLowerCase().includes('air')
        default:
          return true
      }
    }

    const withPriority = (items: Component[], categorySlug: string) => {
      let pool = items.filter((item) => item.in_stock)

      if (buildPriority === 'brand' && preferredBrand !== 'all') {
        const preferredPool = pool.filter(matchesBrandPreference)
        if (preferredPool.length > 0) pool = preferredPool
      }

      if (buildPriority === 'efficiency') {
        const efficientPool = pool.filter(matchesEfficiencyPreference)
        if (efficientPool.length > 0) pool = efficientPool
      }

      if (buildUseCase === 'office' && categorySlug === 'gpu') {
        pool = [...pool].sort((a, b) => a.price - b.price)
      }

      return pool
    }

    const getTargetPrice = (categoryKey: string, multiplier = 1) => {
      const base = targetBudget * (tierAllocations[categoryKey] || 0)
      if (buildPriority === 'performance') return base * 1.12 * multiplier
      if (buildPriority === 'budget') return base * 0.86 * multiplier
      return base * multiplier
    }

    const getMaxPrice = (categoryKey: string, multiplier = 1.25) => {
      const base = targetBudget * (tierAllocations[categoryKey] || 0)
      if (buildPriority === 'performance') return base * 1.55 * multiplier
      if (buildPriority === 'budget') return base * 1.05 * multiplier
      return base * multiplier
    }

    // Step 1: Pick CPU first
    const selectedCpu = pickRandomNearPrice(
      withPriority(components.filter((c) => c.category?.slug === 'cpu'), 'cpu'),
      getTargetPrice('cpu'),
      getMaxPrice('cpu')
    ) ?? pickRandom(withPriority(components.filter((c) => c.category?.slug === 'cpu'), 'cpu')) ?? null
    
    if (selectedCpu) {
      newBuild.cpu = selectedCpu
      const cpuSocket = selectedCpu.specs?.socket
      
      // Step 2: Pick motherboard that matches CPU socket
      const selectedMb = pickRandomNearPrice(
        withPriority(components.filter((c) => c.category?.slug === 'motherboard'), 'motherboard'),
        getTargetPrice('motherboard'),
        getMaxPrice('motherboard'),
        (c) => !cpuSocket || c.specs?.socket === cpuSocket
      ) ?? pickRandom(
        withPriority(components.filter((c) =>
          c.category?.slug === 'motherboard' &&
          (!cpuSocket || c.specs?.socket === cpuSocket)
        ), 'motherboard')
      ) ?? null
      
      if (selectedMb) {
        newBuild.motherboard = selectedMb
        const mbMemoryType = selectedMb.specs?.memory_type
        
        // Step 3: Pick RAM that matches motherboard memory type
        newBuild.ram = pickRandomNearPrice(
          withPriority(components.filter((c) => c.category?.slug === 'ram'), 'ram'),
          getTargetPrice('ram'),
          getMaxPrice('ram'),
          (c) => !mbMemoryType || c.specs?.type === mbMemoryType
        ) ?? pickRandom(
          withPriority(components.filter((c) =>
            c.category?.slug === 'ram' &&
            (!mbMemoryType || c.specs?.type === mbMemoryType)
          ), 'ram')
        ) ?? null
      }
    }
    
    // Step 4: Pick GPU (no compatibility constraints)
    newBuild.gpu = pickRandomNearPrice(
      withPriority(components.filter((c) => c.category?.slug === 'gpu'), 'gpu'),
      getTargetPrice('gpu'),
      getMaxPrice('gpu')
    ) ?? pickRandom(withPriority(components.filter((c) => c.category?.slug === 'gpu'), 'gpu')) ?? null
    
    // Step 5: Pick storage
    const selectedStorage = pickRandomNearPrice(
      withPriority(components.filter((c) => c.category?.slug === 'storage'), 'storage'),
      getTargetPrice('storage'),
      getMaxPrice('storage', 1.35)
    ) ?? pickRandom(withPriority(components.filter((c) => c.category?.slug === 'storage'), 'storage')) ?? null
    
    newBuild.storage = selectedStorage ? [selectedStorage] : []
    
    const estimatedWatt = estimateBuildWattage(newBuild)

    newBuild.psu = pickRandomNearPrice(
      withPriority(components.filter((c) => c.category?.slug === 'psu'), 'psu'),
      getTargetPrice('psu'),
      getMaxPrice('psu', 1.35),
      (c) => (c.specs?.wattage || 0) >= estimatedWatt * 1.15
    ) ?? pickRandomNearPrice(
      withPriority(components.filter((c) => c.category?.slug === 'psu'), 'psu'),
      getTargetPrice('psu'),
      getMaxPrice('psu', 1.35),
      (c) => (c.specs?.wattage || 0) >= estimatedWatt
    ) ?? pickRandom(
      withPriority(components.filter((c) => c.category?.slug === 'psu'), 'psu')
    ) ?? null
    
    // Step 7: Pick case that supports motherboard form factor
    const mbFormFactor = newBuild.motherboard?.specs?.form_factor
    
    // Helper to check if case supports motherboard form factor
    const caseSupportsMotherboard = (caseComponent: Component, formFactor: string | undefined): boolean => {
      if (!formFactor) return true
      const supported = caseComponent.specs?.motherboard_support || []
      const caseFormFactor = caseComponent.specs?.form_factor || ''
      
      // If motherboard_support array exists and has items, check it
      if (Array.isArray(supported) && supported.length > 0) {
        return supported.includes(formFactor)
      }
      
      // Otherwise, use case form factor hierarchy:
      // Full-Tower supports all (ATX, Micro-ATX, Mini-ITX, E-ATX)
      // Mid-Tower supports ATX, Micro-ATX, Mini-ITX
      // Mini-Tower supports Micro-ATX, Mini-ITX (NOT ATX!)
      // Mini-ITX supports Mini-ITX only
      const formFactorHierarchy: Record<string, string[]> = {
        'Full-Tower': ['E-ATX', 'ATX', 'Micro-ATX', 'Mini-ITX'],
        'Mid-Tower': ['ATX', 'Micro-ATX', 'Mini-ITX'],
        'Mini-Tower': ['Micro-ATX', 'Mini-ITX'], // Does NOT support ATX!
        'Mini-ITX': ['Mini-ITX'],
      }
      
      const supportedFactors = formFactorHierarchy[caseFormFactor] || []
      return supportedFactors.includes(formFactor)
    }
    
    const caseCandidates = components
      .filter(c => {
        if (c.category?.slug !== 'case' || !c.in_stock) return false
        if (buildPriority === 'brand' && preferredBrand !== 'all' && !matchesBrandPreference(c)) return false
        return caseSupportsMotherboard(c, mbFormFactor)
      })
    
    newBuild.case = pickRandomNearPrice(
      caseCandidates,
      getTargetPrice('case'),
      getMaxPrice('case', 1.5)
    ) ?? pickRandom(caseCandidates) ?? null
    
    // Step 8: Pick cooling
    newBuild.cooling = pickRandomNearPrice(
      withPriority(components.filter((c) => c.category?.slug === 'cooling'), 'cooling'),
      getTargetPrice('cooling'),
      getMaxPrice('cooling', 1.5)
    ) ?? pickRandom(withPriority(components.filter((c) => c.category?.slug === 'cooling'), 'cooling')) ?? null

    const totalPickedPrice =
      (newBuild.cpu?.price || 0) +
      (newBuild.gpu?.price || 0) +
      (newBuild.ram?.price || 0) +
      (newBuild.motherboard?.price || 0) +
      (newBuild.psu?.price || 0) +
      (newBuild.case?.price || 0) +
      (newBuild.cooling?.price || 0) +
      newBuild.storage.reduce((sum, item) => sum + item.price, 0)

    const maxGpuPrice = Math.max(0, budget.max - (totalPickedPrice - (newBuild.gpu?.price || 0)))
    if (newBuild.gpu && maxGpuPrice > 0 && buildPriority === 'performance') {
      const betterGpu = pickRandomNearPrice(
        withPriority(components.filter((c) => c.category?.slug === 'gpu' && c.price <= maxGpuPrice), 'gpu'),
        Math.min(maxGpuPrice, targetBudget * tierAllocations.gpu),
        maxGpuPrice
      )
      if (betterGpu) newBuild.gpu = betterGpu
    }
    
    // Count how many components were added
    const addedCount = [
      newBuild.gpu, newBuild.cpu, newBuild.motherboard, newBuild.ram,
      newBuild.storage.length > 0, newBuild.psu, newBuild.case, newBuild.cooling
    ].filter(Boolean).length
    
    setBuild(newBuild)
    
    if (addedCount >= 6) {
      toast.success(`${budget.label} ${buildUseCase} конфигурация е създадена!`)
    } else if (addedCount > 0) {
      toast.success(`Добавени са ${addedCount} компонента. Добави останалите ръчно.`)
    } else {
      toast.error('Не бяха намерени налични компоненти')
    }
  }, [buildPriority, buildUseCase, components, normalizeAllocations, preferredBrand])

  const handleAutoGenerate = useCallback(() => {
    const r = Math.random()
    const preset = r < 0.34 ? 'entry' : r < 0.67 ? 'mid' : 'high-end'
    handlePresetBuild(preset)
  }, [handlePresetBuild])

  useEffect(() => {
    if (searchParams.get('build')) return
    const preset = searchParams.get('preset')
    if (preset) {
      handlePresetBuild(preset)
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
        priority: buildPriority,
        preferredBrand,
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
        `Тип конфигурация: ${buildUseCase}`,
        `Приоритет: ${buildPriority}`,
        `Предпочитана марка: ${preferredBrand === 'all' ? 'Няма' : preferredBrand}`,
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
      buildPriority,
      buildUseCase,
      compatibilityIssues,
      estimatedWattage,
      filledSlots,
      performanceScore,
      preferredBrand,
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
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-lg bg-muted/40 p-2">
              <div className="text-muted-foreground">Тип</div>
              <div className="font-medium">
                {buildUseCaseOptions.find((option) => option.value === buildUseCase)?.label}
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 p-2">
              <div className="text-muted-foreground">Приоритет</div>
              <div className="font-medium">
                {buildPriorityOptions.find((option) => option.value === buildPriority)?.label}
              </div>
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
            {/* Mobile Auto Generate Button */}
            <Button 
              variant="default" 
              onClick={handleAutoGenerate}
              className="w-full sm:hidden gap-2 min-h-[48px] mb-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Wand2 className="h-4 w-4" />
              Автоматична Генерация
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportBuild('txt')}
              disabled={filledSlots === 0}
              className="w-full sm:hidden gap-2 min-h-[48px] mb-4"
            >
              <Download className="h-4 w-4" />
              Експорт на конфигурация
            </Button>

            <Card className="border-border/60 bg-card/75">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Настройки за синтезиране</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label>Приоритет</Label>
                  <Select value={buildPriority} onValueChange={(value: BuildPriority) => setBuildPriority(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {buildPriorityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Предпочитана марка</Label>
                  <Select value={preferredBrand} onValueChange={setPreferredBrand}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Без предпочитание</SelectItem>
                      {availableBrandOptions.map((brand) => (
                        <SelectItem key={brand.id} value={brand.slug}>
                          {brand.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-3 rounded-xl border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
                  Автоматичното генериране вече взема предвид типа конфигурация, приоритета и
                  предпочитаната марка. Така покриваш по-точно изискването от дипломната тема.
                </div>
              </CardContent>
            </Card>

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
