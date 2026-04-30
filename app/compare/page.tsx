"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import type { Component, Category } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowLeft, 
  X, 
  Star, 
  Trophy, 
  Crown, 
  Cpu,
  Monitor,
  MemoryStick,
  CircuitBoard,
  HardDrive,
  Zap,
  Box,
  Fan,
  Gamepad2,
  Search,
  Briefcase,
  Code,
  TrendingUp,
  Video,
  Palette,
  ChevronDown,
  GitCompare,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Header } from "@/components/header"

import { CompareCategoryAnalysis } from "@/components/compare-category-analysis"

const categoryIcons: Record<string, React.ElementType> = {
  cpu: Cpu, gpu: Monitor, ram: MemoryStick, motherboard: CircuitBoard,
  storage: HardDrive, psu: Zap, case: Box, cooling: Fan,
}

const categoryLabels: Record<string, string> = {
  cpu: 'Процесори', gpu: 'Видеокарти', ram: 'RAM Памет', motherboard: 'Дънни платки',
  storage: 'Съхранение', psu: 'Захранвания', case: 'Кутии', cooling: 'Охлаждане',
}

/** Категории с реални критерии вместо оценки „игри/офис“ по рейтинг */
const DEEP_ANALYSIS_SLUGS = new Set(['motherboard', 'cooling', 'case', 'storage', 'psu'])

const useCases = [
  { key: 'gaming', label: 'Игри', icon: Gamepad2, color: 'text-green-500', bgColor: 'bg-green-500' },
  { key: 'office', label: 'Офис', icon: Briefcase, color: 'text-blue-500', bgColor: 'bg-blue-500' },
  { key: 'programming', label: 'Програмиране', icon: Code, color: 'text-purple-500', bgColor: 'bg-purple-500' },
  { key: 'productivity', label: 'Продуктивност', icon: TrendingUp, color: 'text-orange-500', bgColor: 'bg-orange-500' },
  { key: 'video', label: 'Видео', icon: Video, color: 'text-red-500', bgColor: 'bg-red-500' },
  { key: 'design', label: 'Дизайн', icon: Palette, color: 'text-pink-500', bgColor: 'bg-pink-500' },
]

// Realistic CPU benchmark scores (Cinebench, Geekbench based)
// Reference: Ryzen 9 9950X = 100 points in multi-thread
const cpuBenchmarks: Record<string, { gaming: number; office: number; programming: number; productivity: number; video: number; design: number }> = {
  // AMD Ryzen 9000 Series (Zen 5 - 2024/2025)
  'Ryzen 9 9950X': { gaming: 92, office: 85, programming: 100, productivity: 100, video: 100, design: 95 },
  'Ryzen 9 9950X3D': { gaming: 100, office: 82, programming: 95, productivity: 96, video: 95, design: 92 },
  'Ryzen 9 9900X': { gaming: 88, office: 78, programming: 85, productivity: 88, video: 85, design: 82 },
  'Ryzen 7 9800X3D': { gaming: 98, office: 65, programming: 62, productivity: 65, video: 58, design: 62 },
  'Ryzen 7 9700X': { gaming: 82, office: 62, programming: 58, productivity: 62, video: 52, design: 58 },
  'Ryzen 5 9600X': { gaming: 75, office: 52, programming: 48, productivity: 52, video: 42, design: 48 },
  // AMD Ryzen 7000 Series (Zen 4 - 2022/2023)
  'Ryzen 9 7950X3D': { gaming: 95, office: 78, programming: 92, productivity: 92, video: 90, design: 88 },
  'Ryzen 9 7950X': { gaming: 85, office: 75, programming: 90, productivity: 90, video: 88, design: 85 },
  'Ryzen 9 7900X': { gaming: 82, office: 70, programming: 78, productivity: 80, video: 75, design: 75 },
  'Ryzen 7 7800X3D': { gaming: 92, office: 58, programming: 55, productivity: 58, video: 50, design: 55 },
  'Ryzen 7 7700X': { gaming: 78, office: 55, programming: 52, productivity: 55, video: 48, design: 52 },
  'Ryzen 5 7600X': { gaming: 72, office: 48, programming: 45, productivity: 48, video: 40, design: 45 },
  'Ryzen 5 7600': { gaming: 70, office: 45, programming: 42, productivity: 45, video: 38, design: 42 },
  // AMD Ryzen 5000 Series (Zen 3 - 2020/2021)
  'Ryzen 9 5950X': { gaming: 72, office: 65, programming: 75, productivity: 78, video: 75, design: 72 },
  'Ryzen 9 5900X': { gaming: 70, office: 60, programming: 68, productivity: 70, video: 68, design: 65 },
  'Ryzen 7 5800X3D': { gaming: 82, office: 48, programming: 45, productivity: 48, video: 42, design: 45 },
  'Ryzen 7 5800X': { gaming: 65, office: 50, programming: 52, productivity: 55, video: 50, design: 50 },
  'Ryzen 5 5600X': { gaming: 60, office: 42, programming: 40, productivity: 42, video: 35, design: 40 },
  'Ryzen 5 5600': { gaming: 58, office: 40, programming: 38, productivity: 40, video: 32, design: 38 },
  // AMD Ryzen 3000 Series (Zen 2 - 2019) - старо поколение!
  'Ryzen 9 3950X': { gaming: 55, office: 52, programming: 58, productivity: 60, video: 58, design: 55 },
  'Ryzen 9 3900X': { gaming: 52, office: 48, programming: 52, productivity: 55, video: 52, design: 50 },
  'Ryzen 7 3800X': { gaming: 48, office: 40, programming: 42, productivity: 45, video: 42, design: 42 },
  'Ryzen 7 3700X': { gaming: 45, office: 38, programming: 40, productivity: 42, video: 40, design: 40 },
  'Ryzen 5 3600X': { gaming: 42, office: 32, programming: 32, productivity: 35, video: 30, design: 32 },
  'Ryzen 5 3600': { gaming: 40, office: 30, programming: 30, productivity: 32, video: 28, design: 30 },
  'Ryzen 3 3300X': { gaming: 35, office: 25, programming: 22, productivity: 25, video: 20, design: 22 },
  'Ryzen 3 3100': { gaming: 32, office: 22, programming: 20, productivity: 22, video: 18, design: 20 },
  // Intel Arrow Lake (2024/2025)
  'Core Ultra 9 285K': { gaming: 90, office: 82, programming: 95, productivity: 95, video: 92, design: 90 },
  'Core Ultra 7 265K': { gaming: 85, office: 72, programming: 78, productivity: 80, video: 75, design: 75 },
  'Core Ultra 5 245K': { gaming: 78, office: 62, programming: 65, productivity: 68, video: 60, design: 62 },
  // Intel 14th Gen (Raptor Lake Refresh - 2023/2024)
  'i9-14900K': { gaming: 88, office: 78, programming: 88, productivity: 90, video: 85, design: 85 },
  'i7-14700K': { gaming: 82, office: 68, programming: 72, productivity: 75, video: 70, design: 70 },
  'i5-14600K': { gaming: 75, office: 58, programming: 58, productivity: 62, video: 55, design: 58 },
  // Intel 13th Gen (Raptor Lake - 2022/2023)
  'i9-13900K': { gaming: 85, office: 75, programming: 85, productivity: 88, video: 82, design: 82 },
  'i7-13700K': { gaming: 78, office: 65, programming: 68, productivity: 72, video: 65, design: 68 },
  'i5-13600K': { gaming: 72, office: 55, programming: 55, productivity: 58, video: 52, design: 55 },
  'i5-13400F': { gaming: 55, office: 42, programming: 38, productivity: 42, video: 35, design: 38 },
  'i3-13100F': { gaming: 42, office: 32, programming: 28, productivity: 32, video: 25, design: 28 },
  // Intel 12th Gen (Alder Lake - 2021/2022)
  'i9-12900K': { gaming: 75, office: 65, programming: 72, productivity: 75, video: 70, design: 70 },
  'i7-12700K': { gaming: 70, office: 58, programming: 62, productivity: 65, video: 60, design: 62 },
  'i5-12600K': { gaming: 65, office: 50, programming: 50, productivity: 55, video: 48, design: 50 },
  'i5-12400F': { gaming: 52, office: 38, programming: 35, productivity: 40, video: 32, design: 35 },
  // Intel 10th/11th Gen (older)
  'i9-11900K': { gaming: 58, office: 52, programming: 55, productivity: 58, video: 52, design: 52 },
  'i7-11700K': { gaming: 52, office: 45, programming: 48, productivity: 50, video: 45, design: 45 },
  'i9-10900K': { gaming: 55, office: 48, programming: 52, productivity: 55, video: 48, design: 48 },
  'i7-10700K': { gaming: 48, office: 42, programming: 45, productivity: 48, video: 42, design: 42 },
  'i5-10600K': { gaming: 42, office: 35, programming: 35, productivity: 38, video: 32, design: 35 },
}

// GPU benchmarks (3DMark, gaming benchmarks based)
// Reference: RTX 5090 = 100 points
const gpuBenchmarks: Record<string, { gaming: number; office: number; programming: number; productivity: number; video: number; design: number }> = {
  // NVIDIA RTX 50 Series (Blackwell - 2025)
  'RTX 5090': { gaming: 100, office: 72, programming: 95, productivity: 92, video: 100, design: 98 },
  'RTX 5080': { gaming: 78, office: 68, programming: 82, productivity: 80, video: 85, design: 85 },
  'RTX 5070 Ti': { gaming: 68, office: 62, programming: 72, productivity: 70, video: 75, design: 75 },
  'RTX 5070': { gaming: 58, office: 58, programming: 65, productivity: 62, video: 68, design: 68 },
  'RTX 5060 Ti': { gaming: 45, office: 52, programming: 55, productivity: 52, video: 58, design: 58 },
  'RTX 5060': { gaming: 38, office: 48, programming: 48, productivity: 45, video: 50, design: 50 },
  // NVIDIA RTX 40 Series (Ada Lovelace - 2022-2024)
  'RTX 4090': { gaming: 85, office: 70, programming: 90, productivity: 88, video: 95, design: 92 },
  'RTX 4080 SUPER': { gaming: 70, office: 65, programming: 78, productivity: 75, video: 82, design: 80 },
  'RTX 4080': { gaming: 65, office: 62, programming: 75, productivity: 72, video: 78, design: 78 },
  'RTX 4070 Ti SUPER': { gaming: 58, office: 58, programming: 68, productivity: 65, video: 72, design: 72 },
  'RTX 4070 Ti': { gaming: 52, office: 55, programming: 65, productivity: 62, video: 68, design: 68 },
  'RTX 4070 SUPER': { gaming: 48, office: 52, programming: 60, productivity: 58, video: 62, design: 62 },
  'RTX 4070': { gaming: 42, office: 50, programming: 55, productivity: 52, video: 58, design: 58 },
  'RTX 4060 Ti': { gaming: 35, office: 45, programming: 48, productivity: 45, video: 50, design: 50 },
  'RTX 4060': { gaming: 28, office: 42, programming: 42, productivity: 40, video: 45, design: 45 },
  // NVIDIA RTX 30 Series (Ampere - 2020-2022)
  'RTX 3090 Ti': { gaming: 62, office: 60, programming: 78, productivity: 75, video: 82, design: 80 },
  'RTX 3090': { gaming: 58, office: 58, programming: 75, productivity: 72, video: 78, design: 78 },
  'RTX 3080 Ti': { gaming: 55, office: 55, programming: 70, productivity: 68, video: 75, design: 72 },
  'RTX 3080': { gaming: 50, office: 52, programming: 65, productivity: 62, video: 70, design: 68 },
  'RTX 3070 Ti': { gaming: 42, office: 48, programming: 55, productivity: 52, video: 58, design: 58 },
  'RTX 3070': { gaming: 38, office: 45, programming: 50, productivity: 48, video: 55, design: 52 },
  'RTX 3060 Ti': { gaming: 32, office: 42, programming: 45, productivity: 42, video: 48, design: 48 },
  'RTX 3060': { gaming: 25, office: 38, programming: 40, productivity: 38, video: 42, design: 42 },
  'RTX 3050': { gaming: 18, office: 32, programming: 32, productivity: 30, video: 35, design: 35 },
  // NVIDIA GTX (older)
  'GTX 1660 Super': { gaming: 15, office: 28, programming: 22, productivity: 22, video: 28, design: 28 },
  'GTX 1660 Ti': { gaming: 14, office: 28, programming: 22, productivity: 22, video: 28, design: 28 },
  'GTX 1660': { gaming: 12, office: 25, programming: 20, productivity: 20, video: 25, design: 25 },
  'GTX 1650': { gaming: 10, office: 22, programming: 18, productivity: 18, video: 22, design: 22 },
  'GTX 1050 Ti': { gaming: 6, office: 18, programming: 12, productivity: 12, video: 15, design: 15 },
  // AMD RX 9000 Series (RDNA 4 - 2025)
  'RX 9070 XT': { gaming: 62, office: 58, programming: 68, productivity: 65, video: 72, design: 70 },
  'RX 9070': { gaming: 52, office: 52, programming: 60, productivity: 58, video: 65, design: 62 },
  'RX 9060 XT': { gaming: 38, office: 45, programming: 48, productivity: 45, video: 52, design: 50 },
  'RX 9060': { gaming: 30, office: 40, programming: 42, productivity: 40, video: 45, design: 42 },
  // AMD RX 7000 Series (RDNA 3 - 2022-2024)
  'RX 7900 XTX': { gaming: 68, office: 58, programming: 70, productivity: 68, video: 75, design: 72 },
  'RX 7900 XT': { gaming: 58, office: 55, programming: 62, productivity: 60, video: 68, design: 65 },
  'RX 7900 GRE': { gaming: 50, office: 52, programming: 58, productivity: 55, video: 62, design: 58 },
  'RX 7800 XT': { gaming: 45, office: 48, programming: 52, productivity: 50, video: 58, design: 55 },
  'RX 7700 XT': { gaming: 38, office: 45, programming: 48, productivity: 45, video: 52, design: 50 },
  'RX 7600 XT': { gaming: 28, office: 40, programming: 42, productivity: 40, video: 45, design: 42 },
  'RX 7600': { gaming: 25, office: 38, programming: 38, productivity: 35, video: 42, design: 40 },
  // AMD RX 6000 Series (RDNA 2 - 2020-2022)
  'RX 6950 XT': { gaming: 55, office: 52, programming: 58, productivity: 55, video: 62, design: 58 },
  'RX 6900 XT': { gaming: 52, office: 50, programming: 55, productivity: 52, video: 58, design: 55 },
  'RX 6800 XT': { gaming: 48, office: 48, programming: 52, productivity: 50, video: 55, design: 52 },
  'RX 6800': { gaming: 42, office: 45, programming: 48, productivity: 45, video: 50, design: 48 },
  'RX 6700 XT': { gaming: 32, office: 40, programming: 42, productivity: 40, video: 45, design: 42 },
  'RX 6600 XT': { gaming: 25, office: 35, programming: 35, productivity: 32, video: 38, design: 35 },
  'RX 6600': { gaming: 22, office: 32, programming: 32, productivity: 30, video: 35, design: 32 },
  'RX 6500 XT': { gaming: 12, office: 25, programming: 22, productivity: 20, video: 25, design: 22 },
}

const gameFpsEstimates: Record<
  string,
  { base: number; label: string; vramMin: number; busTarget: number; rtHeavy?: boolean }
> = {
  'CS2': { base: 420, label: 'CS2', vramMin: 6, busTarget: 128 },
  'Valorant': { base: 480, label: 'Valorant', vramMin: 6, busTarget: 128 },
  'Fortnite': { base: 235, label: 'Fortnite', vramMin: 8, busTarget: 192 },
  'GTA V': { base: 185, label: 'GTA V', vramMin: 6, busTarget: 128 },
  'Warzone': { base: 170, label: 'Warzone', vramMin: 10, busTarget: 256 },
  'Cyberpunk 2077': { base: 115, label: 'Cyberpunk 2077', vramMin: 12, busTarget: 256, rtHeavy: true },
}

type ScoreMap = Record<string, number>

const clampScore = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, Math.round(value)))

const safeNumber = (value: unknown, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

const normalizeName = (value: string | null | undefined) =>
  (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const parseCacheAmount = (cache: unknown) => {
  if (typeof cache !== 'string') return 0
  const match = cache.match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : 0
}

function ComparePageContent() {
  const searchParams = useSearchParams()
  const [components, setComponents] = useState<(Component | null)[]>([null, null, null])
  const [allComponents, setAllComponents] = useState<Component[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQueries, setSearchQueries] = useState<string[]>(['', '', ''])
  const [openDropdown, setOpenDropdown] = useState<number | null>(null)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const [{ data: comps }, { data: cats }] = await Promise.all([
        supabase.from("components").select("*, categories(*), brands(*)").order("name"),
        supabase.from("categories").select("*").order("display_order"),
      ])

      const mappedComps = (comps || []).map(c => ({
        ...c, category: c.categories, brand: c.brands,
      }))

      setAllComponents(mappedComps)
      setCategories(cats || [])

      const ids = searchParams.get("ids")?.split(",").filter(Boolean) || []
      if (ids.length > 0 && mappedComps) {
        const preSelected = ids.slice(0, 3).map(id => 
          mappedComps.find(c => c.id === id) || null
        )
        while (preSelected.length < 3) preSelected.push(null)
        setComponents(preSelected)
        
        const firstComp = preSelected.find(Boolean)
        if (firstComp?.category?.slug) {
          setSelectedCategory(firstComp.category.slug)
        }
      }
      setLoading(false)
    }
    fetchData()
  }, [searchParams])

  const matchBenchmarkTable = (
    benchmarkMap: Record<string, ScoreMap>,
    component: Component
  ): ScoreMap | null => {
    const normalizedModel = normalizeName(component.model)
    const normalizedName = normalizeName(component.name)
    const entries = Object.entries(benchmarkMap).sort((a, b) => b[0].length - a[0].length)

    for (const [key, scores] of entries) {
      const normalizedKey = normalizeName(key)
      if (
        normalizedModel.includes(normalizedKey) ||
        normalizedName.includes(normalizedKey)
      ) {
        return scores
      }
    }

    return null
  }

  const refineCpuScores = (component: Component, baseScores: ScoreMap): ScoreMap => {
    const specs = component.specs || {}
    const cores = safeNumber(specs.cores, 4)
    const threads = safeNumber(specs.threads, Math.max(cores, 4))
    const baseClock = safeNumber(specs.base_clock, 3.2)
    const boostClock = safeNumber(specs.boost_clock, 4.0)
    const cache = parseCacheAmount(specs.cache)
    const architecture = normalizeName(specs.architecture)
    const model = normalizeName(component.model || component.name)

    let architectureFactor = 1
    if (architecture.includes('zen 5') || model.includes('ryzen 9 9') || model.includes('ryzen 7 9')) architectureFactor = 1.12
    else if (architecture.includes('zen 4') || model.includes('ryzen 7 7') || model.includes('ryzen 5 7')) architectureFactor = 1.06
    else if (architecture.includes('zen 2') || model.includes('3rd gen')) architectureFactor = 0.9
    else if (model.includes('core ultra')) architectureFactor = 1.1
    else if (model.includes('14900') || model.includes('14700') || model.includes('14600')) architectureFactor = 1.08
    else if (model.includes('13900') || model.includes('13700') || model.includes('13600')) architectureFactor = 1.04
    else if (model.includes('11900') || model.includes('11700')) architectureFactor = 0.9
    else if (model.includes('10900') || model.includes('10700') || model.includes('10600')) architectureFactor = 0.86

    const coreImpact = Math.min((cores / 16) * 28, 28)
    const threadImpact = Math.min((threads / 32) * 22, 22)
    const boostImpact = Math.min((boostClock / 5.8) * 20, 20)
    const baseClockImpact = Math.min((baseClock / 4.2) * 10, 10)
    const cacheImpact = Math.min((cache / 96) * 12, 12)
    const totalFactor = architectureFactor * (0.82 + (coreImpact + threadImpact + boostImpact + baseClockImpact + cacheImpact) / 100)

    return {
      gaming: clampScore(baseScores.gaming * (0.9 + boostImpact / 50 + cacheImpact / 60) * architectureFactor, 8, 100),
      office: clampScore(baseScores.office * (0.94 + baseClockImpact / 80) * architectureFactor, 8, 100),
      programming: clampScore(baseScores.programming * totalFactor, 8, 100),
      productivity: clampScore(baseScores.productivity * totalFactor * 1.02, 8, 100),
      video: clampScore(baseScores.video * (architectureFactor + threadImpact / 90 + coreImpact / 120), 8, 100),
      design: clampScore(baseScores.design * (architectureFactor + boostImpact / 120), 8, 100),
    }
  }

  const refineGpuScores = (component: Component, baseScores: ScoreMap): ScoreMap => {
    const specs = component.specs || {}
    const vram = safeNumber(specs.vram, 8)
    const busWidth = safeNumber(specs.bus_width, 128)
    const tdp = safeNumber(specs.tdp, 150)
    const rawCuda = safeNumber(specs.cuda_cores, 0)
    const rawStream = safeNumber(specs.stream_processors, 0)
    const normalizedShaderCount =
      rawCuda > 0 ? rawCuda : rawStream > 0 ? rawStream * 0.42 : 1600
    const rtUnits =
      safeNumber(specs.ray_tracing_cores, 0) + safeNumber(specs.ray_accelerators, 0)
    const tensorUnits = safeNumber(specs.tensor_cores, 0)
    const model = normalizeName(component.model || component.name)
    const isNvidia = model.includes('rtx') || model.includes('gtx')
    const vramType = normalizeName(specs.vram_type)

    const shaderImpact = Math.min((normalizedShaderCount / 18000) * 34, 34)
    const vramImpact = Math.min((vram / 24) * 22, 22)
    const bandwidthImpact = Math.min((busWidth / 384) * 18, 18)
    const powerImpact = Math.min((tdp / 420) * 10, 10)
    const rayImpact = Math.min((rtUnits / 180) * 10, 10)
    const tensorImpact = Math.min((tensorUnits / 500) * 6, 6)
    const memoryBonus =
      vramType.includes('gddr7') ? 1.06 : vramType.includes('gddr6x') ? 1.03 : 1
    const contentFactor =
      0.86 +
      (shaderImpact + vramImpact + bandwidthImpact + powerImpact + rayImpact + tensorImpact) / 100

    return {
      gaming: clampScore(baseScores.gaming * contentFactor * memoryBonus, 6, 100),
      office: clampScore(baseScores.office * (0.96 + vramImpact / 80), 8, 100),
      programming: clampScore(baseScores.programming * (0.9 + shaderImpact / 70 + vramImpact / 90), 8, 100),
      productivity: clampScore(baseScores.productivity * (0.9 + shaderImpact / 80 + bandwidthImpact / 100), 8, 100),
      video: clampScore(baseScores.video * (0.92 + vramImpact / 70 + (isNvidia ? 0.06 : 0.02)), 8, 100),
      design: clampScore(baseScores.design * (0.92 + vramImpact / 75 + bandwidthImpact / 100 + rayImpact / 140), 8, 100),
    }
  }

  // Get benchmark scores for a component
  const getBenchmarkScores = (component: Component): ScoreMap => {
    const category = component.category?.slug

    if (category === 'cpu') {
      const matchedScores = matchBenchmarkTable(cpuBenchmarks, component)
      const baseScores = matchedScores ?? calculateCpuScores(component)
      return refineCpuScores(component, baseScores)
    }

    if (category === 'gpu') {
      const matchedScores = matchBenchmarkTable(gpuBenchmarks, component)
      const baseScores = matchedScores ?? calculateGpuScores(component)
      return refineGpuScores(component, baseScores)
    }

    return calculateGenericScores(component)
  }
  
  const calculateCpuScores = (component: Component): ScoreMap => {
    const specs = component.specs || {}
    const cores = safeNumber(specs.cores, 4)
    const threads = safeNumber(specs.threads, Math.max(cores, 4))
    const baseClock = safeNumber(specs.base_clock, 3.1)
    const boostClock = safeNumber(specs.boost_clock, 4.0)
    const cache = parseCacheAmount(specs.cache)

    const coreScore = Math.min((cores / 16) * 34, 34)
    const threadScore = Math.min((threads / 32) * 24, 24)
    const clockScore = Math.min((boostClock / 5.8) * 20, 20)
    const baseScore = Math.min((baseClock / 4.0) * 10, 10)
    const cacheScore = Math.min((cache / 96) * 12, 12)
    const total = coreScore + threadScore + clockScore + baseScore + cacheScore

    return {
      gaming: clampScore(total * 1.02, 10, 100),
      office: clampScore(total * 0.72, 8, 100),
      programming: clampScore(total * 0.96, 10, 100),
      productivity: clampScore(total, 10, 100),
      video: clampScore(total * 0.94, 10, 100),
      design: clampScore(total * 0.88, 10, 100),
    }
  }
  
  const calculateGpuScores = (component: Component): ScoreMap => {
    const specs = component.specs || {}
    const vram = safeNumber(specs.vram, 8)
    const tdp = safeNumber(specs.tdp, 150)
    const rawCuda = safeNumber(specs.cuda_cores, 0)
    const rawStream = safeNumber(specs.stream_processors, 0)
    const busWidth = safeNumber(specs.bus_width, 128)
    const normalizedShaderCount =
      rawCuda > 0 ? rawCuda : rawStream > 0 ? rawStream * 0.42 : 1600

    const shaderScore = Math.min((normalizedShaderCount / 18000) * 46, 46)
    const vramScore = Math.min((vram / 24) * 24, 24)
    const bandwidthScore = Math.min((busWidth / 384) * 18, 18)
    const powerScore = Math.min((tdp / 420) * 12, 12)
    const total = shaderScore + vramScore + bandwidthScore + powerScore

    return {
      gaming: clampScore(total * 1.02, 8, 100),
      office: clampScore(total * 0.54, 10, 100),
      programming: clampScore(total * 0.78, 10, 100),
      productivity: clampScore(total * 0.72, 10, 100),
      video: clampScore(total * 0.84, 10, 100),
      design: clampScore(total * 0.8, 10, 100),
    }
  }
  
  const calculateGenericScores = (component: Component): ScoreMap => {
    const rating = component.rating || 4
    const baseScore = (rating / 5) * 42 + 18
    
    return {
      gaming: clampScore(baseScore),
      office: clampScore(baseScore),
      programming: clampScore(baseScore),
      productivity: clampScore(baseScore),
      video: clampScore(baseScore),
      design: clampScore(baseScore),
    }
  }

  const getFilteredComponents = (index: number) => {
    if (!selectedCategory) return []
    const searchQuery = searchQueries[index].toLowerCase()
    return allComponents.filter(c => {
      if (c.category?.slug !== selectedCategory) return false
      if (components.some(selected => selected?.id === c.id)) return false
      if (searchQuery) {
        return (
          c.name.toLowerCase().includes(searchQuery) ||
          c.brand?.name.toLowerCase().includes(searchQuery) ||
          c.model?.toLowerCase().includes(searchQuery)
        )
      }
      return true
    })
  }

  const handleSelectComponent = (index: number, componentId: string) => {
    const component = allComponents.find(c => c.id === componentId)
    setComponents(prev => {
      const newComps = [...prev]
      newComps[index] = component || null
      return newComps
    })
    setSearchQueries(prev => {
      const newQueries = [...prev]
      newQueries[index] = ''
      return newQueries
    })
    setOpenDropdown(null)
  }

  const handleRemoveComponent = (index: number) => {
    setComponents(prev => {
      const newComps = [...prev]
      newComps[index] = null
      return newComps
    })
  }

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug)
    setComponents([null, null, null])
    setSearchQueries(['', '', ''])
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(price)
  }

  const activeComponents = components.filter(Boolean) as Component[]

  const useDeepAnalysis = Boolean(
    selectedCategory && DEEP_ANALYSIS_SLUGS.has(selectedCategory)
  )
  
  const allSpecKeys = [...new Set(
    activeComponents.flatMap(c => Object.keys(c.specs as Record<string, unknown> || {}))
  )]

  const lowerIsBetter = ["tdp", "cas_latency", "noise_level", "voltage"]
  
  const getWinner = (key: string): string | null => {
    if (activeComponents.length < 2) return null
    
    const values = activeComponents.map(c => {
      const val = (c.specs as Record<string, unknown>)?.[key]
      return { id: c.id, value: typeof val === "number" ? val : null }
    }).filter(v => v.value !== null)

    if (values.length < 2) return null

    const isLowerBetter = lowerIsBetter.includes(key)
    const winner = values.reduce((best, current) => {
      if (isLowerBetter) {
        return current.value! < best.value! ? current : best
      }
      return current.value! > best.value! ? current : best
    })

    return winner.id
  }

  const formatSpecValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return "-"
    if (typeof value === "boolean") return value ? "Да" : "Не"
    if (Array.isArray(value)) return value.join(", ")
    
    const units: Record<string, string> = {
      cores: "", threads: "", base_clock: " GHz", boost_clock: " GHz",
      tdp: "W", vram: " GB", cuda_cores: "", stream_processors: "",
      capacity: " GB", speed: " MHz", wattage: "W", read_speed: " MB/s",
      write_speed: " MB/s", max_gpu_length: "mm", max_cpu_cooler_height: "mm",
    }
    return `${value}${units[key] || ""}`
  }

  const formatSpecLabel = (key: string): string => {
    const labels: Record<string, string> = {
      cores: 'Ядра', threads: 'Нишки', base_clock: 'Базова честота',
      boost_clock: 'Турбо честота', tdp: 'TDP', vram: 'VRAM',
      vram_type: 'Тип VRAM', cuda_cores: 'CUDA ядра',
      stream_processors: 'Stream Processors', capacity: 'Капацитет',
      speed: 'Честота', type: 'Тип', socket: 'Сокет', chipset: 'Чипсет',
      form_factor: 'Форм фактор', memory_type: 'Тип памет', wattage: 'Мощност',
      efficiency: 'Ефективност', modular: 'Модулност', read_speed: 'Скорост четене',
      write_speed: 'Скорост запис', cas_latency: 'CAS Latency',
      memory_slots: 'Слотове RAM', max_memory: 'Макс. RAM (GB)', m2_slots: 'M.2 слотове',
      pcie_slots: 'PCIe слотове', usb_ports: 'USB портове', wifi: 'Wi‑Fi', bluetooth: 'Bluetooth',
      motherboard_support: 'Поддържани дъна', fan_slots: 'Слотове вентилатори', included_fans: 'Включени вентилатори',
      radiator_support: 'Макс. радиатор (мм)', drive_bays_2_5: '2.5\" отсеци', drive_bays_3_5: '3.5\" отсеци',
      radiator_size: 'Радиатор (мм)', fan_count: 'Брой вентилатори', height: 'Височина (мм)',
      tdp_rating: 'TDP рейтинг (W)', socket_support: 'Сокети', noise_level: 'Шум (dB)', rpm_max: 'Макс. RPM',
      atx_version: 'ATX версия', pcie_connectors: 'PCIe конектори', sata_connectors: 'SATA конектори',
      warranty_years: 'Гаранция (г.)', tbw: 'TBW', dram: 'DRAM кеш', rpm: 'RPM',
      interface: 'Интерфейс', modules: 'Модули', max_gpu_length: 'Макс. GPU дължина', max_cpu_cooler_height: 'Макс. охладител',
      side_panel: 'Страничен панел',
    }
    return labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  }

  const calculateFps = (component: Component, game: string): number => {
    if (component.category?.slug !== 'gpu') return 0
    const profile = gameFpsEstimates[game]
    if (!profile) return 0

    const scores = getBenchmarkScores(component)
    const specs = component.specs || {}
    const vram = safeNumber(specs.vram, 8)
    const busWidth = safeNumber(specs.bus_width, 128)
    const rtUnits =
      safeNumber(specs.ray_tracing_cores, 0) + safeNumber(specs.ray_accelerators, 0)
    const model = normalizeName(component.model || component.name)
    const isNvidia = model.includes('rtx') || model.includes('gtx')

    const vramPenalty =
      vram >= profile.vramMin
        ? 1
        : Math.max(0.62, 1 - (profile.vramMin - vram) * 0.09)
    const bandwidthFactor = Math.min(
      1.08,
      Math.max(0.82, 0.85 + busWidth / Math.max(profile.busTarget * 2, 1))
    )
    const rayTracingFactor = profile.rtHeavy
      ? Math.min(
          1.12,
          Math.max(
            isNvidia ? 0.9 : 0.82,
            (isNvidia ? 0.92 : 0.84) + rtUnits / 220
          )
        )
      : 1

    const fps =
      profile.base *
      (scores.gaming / 100) *
      vramPenalty *
      bandwidthFactor *
      rayTracingFactor

    return Math.max(12, Math.round(fps))
  }

  // Get comparison with percentage differences
  const getComparisonWithDifferences = (useCase: string) => {
    if (activeComponents.length < 2) return []
    
    const scores = activeComponents.map(c => ({
      component: c,
      score: getBenchmarkScores(c)[useCase] || 0
    }))
    
    const maxScore = Math.max(...scores.map(s => s.score))
    
    return scores.map(s => ({
      ...s,
      isLeader: s.score === maxScore,
      difference:
        maxScore > 0 && s.score !== maxScore
          ? Math.round(((maxScore - s.score) / maxScore) * 100)
          : 0,
      percentOfLeader:
        maxScore > 0
          ? Math.round((s.score / maxScore) * 100)
          : 0,
      normalizedScore:
        maxScore > 0
          ? Math.round((s.score / maxScore) * 100)
          : 0,
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.10),transparent_20%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_22%)]" />
      <Header />
      <main className="flex-1">
      <div className="container relative mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start">
          <Button            variant="outline"
            size="icon"
            asChild
            className="shrink-0 h-11 w-11 rounded-full border-primary bg-transparent text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Link href="/" aria-label="Към началната страница">
              <ArrowLeft className="h-5 w-5 text-primary" />
            </Link>
          </Button>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <GitCompare className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Сравнение на продукти
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base">
                  За дъно, охлаждане, кутия, диск и захранване ползвай таба <strong className="text-foreground">„Детайлен
                  анализ“</strong>. За CPU, GPU и RAM — оценки по приложение и пълна таблица със спецификации.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Intro when nothing picked */}
        {!selectedCategory && (
          <Card className="mb-8 overflow-hidden border-border/60 bg-gradient-to-br from-card via-card to-muted/30 shadow-sm backdrop-blur">
            <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row gap-6 items-center sm:items-start">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Sparkles className="h-8 w-8" />
              </div>
              <div className="space-y-2 text-center sm:text-left">
                <h2 className="text-lg font-semibold">Започни от категория</h2>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Процесори, видеокарти, RAM и останалите части се сравняват по различни показатели.
                  След избор на категория попълни колоните по-долу и отвори разделите за подробности.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category Selection */}
        <Card className="mb-8 border-border/60 bg-card/70 shadow-sm backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Избери категория</CardTitle>
            <p className="text-sm text-muted-foreground font-normal">
              При смяна на категория изборът в колоните се нулира.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {categories.map((cat) => {
                const Icon = categoryIcons[cat.slug] || Box
                const active = selectedCategory === cat.slug
                return (
                  <Button
                    key={cat.id}
                    variant="ghost"
                    onClick={() => handleCategoryChange(cat.slug)}
                    className={cn(
                      "h-auto min-h-[52px] py-3 px-4 justify-start gap-3 rounded-xl border-2 font-semibold shadow-sm",
                      "bg-primary text-primary-foreground border-primary",
                      "hover:bg-primary/90 hover:text-primary-foreground hover:border-primary",
                      active && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                    )}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span className="text-left leading-tight">
                      {categoryLabels[cat.slug] || cat.name}
                    </span>
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Component Selection */}
        {selectedCategory && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[0, 1, 2].map(index => (
              <Card key={index} className={cn(
                "relative overflow-visible border-border/60 bg-card/70 shadow-sm transition-all duration-200 hover:shadow-lg",
                components[index] && "ring-2 ring-primary/80 bg-primary/5"
              )}>
                <CardContent className="p-4">
                  {components[index] ? (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge variant="outline" className="mb-2 rounded-full bg-background/80">
                          {index === 0 ? <Crown className="h-3 w-3 mr-1" /> : index === 1 ? <Trophy className="h-3 w-3 mr-1" /> : null}
                          Продукт {index + 1}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveComponent(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex gap-3">
                        <div className="w-20 h-20 rounded-2xl border border-border/60 bg-muted/40 overflow-hidden shrink-0">
                          {components[index]?.image_url ? (
                            <Image src={components[index]!.image_url!} alt={components[index]!.name} width={80} height={80} className="w-full h-full object-contain bg-white/80 p-2" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              {(() => { const Icon = categoryIcons[selectedCategory] || Box; return <Icon className="h-8 w-8 text-muted-foreground/30" /> })()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground">{components[index]?.brand?.name}</p>
                          <h4 className="font-medium text-sm line-clamp-2">{components[index]?.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                            <span className="text-xs">{components[index]?.rating.toFixed(1)}</span>
                          </div>
                          <p className="text-lg font-bold text-primary mt-1">{formatPrice(components[index]!.price)}</p>
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                            {components[index]?.model || components[index]?.category?.name || "Компонент"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="relative space-y-3">
                      <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-center">
                        <div className="text-sm font-medium">Слот {index + 1}</div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Потърси и избери продукт за сравнение
                        </p>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Търси продукт..."
                          value={searchQueries[index]}
                          onChange={(e) => {
                            const newQueries = [...searchQueries]
                            newQueries[index] = e.target.value
                            setSearchQueries(newQueries)
                            setOpenDropdown(index)
                          }}
                          onFocus={() => setOpenDropdown(index)}
                          className="h-11 rounded-xl border-border/60 bg-background/80 pl-9 pr-8"
                        />
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      </div>
                      
                      {openDropdown === index && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-2xl">
                          <ScrollArea className="h-64">
                            {getFilteredComponents(index).length === 0 ? (
                              <p className="p-4 text-sm text-muted-foreground text-center">Няма намерени продукти</p>
                            ) : (
                              getFilteredComponents(index).slice(0, 20).map(comp => (
                                <button
                                  key={comp.id}
                                  className="flex w-full items-center gap-3 border-b border-border/50 p-3 text-left transition-colors hover:bg-accent last:border-0"
                                  onClick={() => handleSelectComponent(index, comp.id)}
                                >
                                  <div className="h-10 w-10 overflow-hidden rounded-lg border border-border/50 bg-muted shrink-0">
                                    {comp.image_url ? (
                                      <Image src={comp.image_url} alt={comp.name} width={40} height={40} className="h-full w-full object-contain bg-white/80 p-1" />
                                    ) : null}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs text-muted-foreground">{comp.brand?.name}</p>
                                    <p className="text-sm font-medium truncate">{comp.name}</p>
                                  </div>
                                  <p className="text-sm font-bold text-primary shrink-0">{formatPrice(comp.price)}</p>
                                </button>
                              ))
                            )}
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Comparison Results */}
        {activeComponents.length >= 2 && (
          <Tabs defaultValue={useDeepAnalysis ? "analysis" : "performance"} className="space-y-6">
            <TabsList
              className={cn(
                "grid h-auto w-full max-w-md rounded-2xl border border-border/60 bg-card/70 p-2 shadow-sm",
                useDeepAnalysis
                  ? "max-w-sm grid-cols-2"
                  : selectedCategory === "gpu"
                    ? "grid-cols-3"
                    : "grid-cols-2"
              )}
            >
              {!useDeepAnalysis && <TabsTrigger value="performance">Приложение</TabsTrigger>}
              {useDeepAnalysis && <TabsTrigger value="analysis">Детайлен анализ</TabsTrigger>}
              <TabsTrigger value="specs">Спецификации</TabsTrigger>
              {!useDeepAnalysis && selectedCategory === "gpu" && (
                <TabsTrigger value="fps">FPS в игри</TabsTrigger>
              )}
            </TabsList>

            {useDeepAnalysis && selectedCategory && (
              <TabsContent value="analysis" className="space-y-6">
                <CompareCategoryAnalysis
                  categorySlug={selectedCategory}
                  components={activeComponents}
                  formatPrice={formatPrice}
                />
              </TabsContent>
            )}

            {!useDeepAnalysis && (
            <TabsContent value="performance" className="space-y-6">
              <Card className="border-border/60 bg-card/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-yellow-500" />
                    Сравнение по приложение
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Процентите показват колко по-слаб е продуктът спрямо най-добрия в категорията
                  </p>
                </CardHeader>
                <CardContent className="space-y-8">
                  {useCases.map(useCase => {
                    const comparison = getComparisonWithDifferences(useCase.key)
                    const UseCaseIcon = useCase.icon
                    
                    return (
                      <div key={useCase.key} className="space-y-4">
                        <div className="flex items-center gap-2">
                          <UseCaseIcon className={cn("h-5 w-5", useCase.color)} />
                          <h3 className="font-semibold text-lg">{useCase.label}</h3>
                        </div>
                        
                        <div className="grid gap-3">
                          {comparison.map(({ component, normalizedScore, isLeader, difference, percentOfLeader }) => (
                            <div key={component.id} className={cn(
                              "p-4 rounded-lg border transition-all",
                              isLeader ? "bg-primary/5 border-primary" : "bg-muted/30"
                            )}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {isLeader && <Crown className="h-4 w-4 text-yellow-500" />}
                                  <span className="font-medium">{component.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={cn(
                                    "text-lg font-bold",
                                    isLeader ? "text-primary" : "text-muted-foreground"
                                  )}>
                                    {normalizedScore}%
                                  </span>
                                  {!isLeader && (
                                    <Badge variant="destructive" className="text-xs">
                                      -{difference}% по-слаб
                                    </Badge>
                                  )}
                                  {isLeader && (
                                    <Badge className="bg-green-500 text-xs">
                                      Лидер
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Progress 
                                value={percentOfLeader} 
                                className={cn("h-3", isLeader ? "[&>div]:bg-primary" : "[&>div]:bg-muted-foreground/50")}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {/* Summary */}
              <Card className="border-border/60 bg-card/70 shadow-sm">
                <CardHeader>
                  <CardTitle>Обобщение</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    {activeComponents.map(component => {
                      const normalizedByUseCase = Object.fromEntries(
                        useCases.map((uc) => {
                          const rows = getComparisonWithDifferences(uc.key)
                          const row = rows.find((r) => r.component.id === component.id)
                          return [uc.key, row?.normalizedScore ?? 0] as const
                        })
                      ) as Record<string, number>

                      const avgNormalized = Math.round(
                        useCases.reduce((s, uc) => s + (normalizedByUseCase[uc.key] ?? 0), 0) /
                          useCases.length
                      )
                      const bestUseCase = useCases.reduce((best, uc) =>
                        (normalizedByUseCase[uc.key] ?? 0) > (normalizedByUseCase[best.key] ?? 0)
                          ? uc
                          : best
                      )
                      const worstUseCase = useCases.reduce((worst, uc) =>
                        (normalizedByUseCase[uc.key] ?? 0) < (normalizedByUseCase[worst.key] ?? 0)
                          ? uc
                          : worst
                      )

                      return (
                        <Card key={component.id} className="border-2">
                          <CardContent className="p-4 space-y-3">
                            <h4 className="font-semibold text-center line-clamp-2">{component.name}</h4>
                            
                            <div className="text-center">
                              <p className="text-sm text-muted-foreground">Средно спрямо лидерите</p>
                              <p className="text-3xl font-bold text-primary">{avgNormalized}%</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Същите проценти като в „Сравнение по приложение“ (100% = най-добрият в колоните)
                              </p>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Най-добър за:</span>
                                <Badge className="bg-green-500">
                                  {bestUseCase.label} ({normalizedByUseCase[bestUseCase.key]}%)
                                </Badge>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">По-слаб за:</span>
                                <Badge variant="secondary">
                                  {worstUseCase.label} ({normalizedByUseCase[worstUseCase.key]}%)
                                </Badge>
                              </div>
                              <div className="flex justify-between pt-2 border-t">
                                <span className="text-muted-foreground">Цена:</span>
                                <span className="font-bold">{formatPrice(component.price)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            )}

            <TabsContent value="specs">
              <Card className="border-border/60 bg-card/70 shadow-sm">
                <CardHeader>
                  <CardTitle>Сравнение на спецификации</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium text-muted-foreground">Спецификация</th>
                          {activeComponents.map(c => (
                            <th key={c.id} className="text-left p-3 font-medium min-w-[150px]">{c.name}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allSpecKeys.map(key => {
                          const winner = getWinner(key)
                          return (
                            <tr key={key} className="border-b hover:bg-muted/50">
                              <td className="p-3 text-muted-foreground">{formatSpecLabel(key)}</td>
                              {activeComponents.map(c => {
                                const val = (c.specs as Record<string, unknown>)?.[key]
                                const isWinner = winner === c.id
                                return (
                                  <td key={c.id} className={cn("p-3", isWinner && "text-primary font-semibold")}>
                                    <div className="flex items-center gap-2">
                                      {formatSpecValue(key, val)}
                                      {isWinner && <Trophy className="h-4 w-4 text-yellow-500" />}
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        })}
                        <tr className="border-t-2 font-semibold">
                          <td className="p-3">Цена</td>
                          {activeComponents.map(c => (
                            <td key={c.id} className="p-3 text-primary">{formatPrice(c.price)}</td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {selectedCategory === "gpu" && !useDeepAnalysis && (
              <TabsContent value="fps">
                <Card className="border-border/60 bg-card/70 shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gamepad2 className="h-5 w-5 text-green-500" />
                      Очаквани FPS в игри (1080p, High настройки)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {Object.entries(gameFpsEstimates).map(([game, { label }]) => {
                        const fpsList = activeComponents.map(c => ({
                          component: c,
                          fps: calculateFps(c, game)
                        }))
                        const maxFps = Math.max(...fpsList.map(f => f.fps))
                        
                        return (
                          <div key={game} className="space-y-3">
                            <h4 className="font-semibold">{label}</h4>
                            <div className="grid gap-2">
                              {fpsList.map(({ component, fps }) => {
                                const isLeader = fps === maxFps
                                const percentOfLeader = maxFps > 0 ? Math.round((fps / maxFps) * 100) : 0
                                const difference = isLeader ? 0 : Math.round(((maxFps - fps) / maxFps) * 100)
                                
                                return (
                                  <div key={component.id} className="flex items-center gap-4">
                                    <span className="w-40 text-sm truncate">{component.name}</span>
                                    <div className="flex-1">
                                      <Progress value={percentOfLeader} className={cn("h-6", isLeader ? "[&>div]:bg-green-500" : "")} />
                                    </div>
                                    <div className="flex items-center gap-2 min-w-[140px] justify-end">
                                      <Badge className={isLeader ? "bg-green-500" : "bg-muted"}>
                                        {fps} FPS
                                      </Badge>
                                      {!isLeader && fps > 0 && (
                                        <span className="text-xs text-red-500">-{difference}%</span>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}

        {activeComponents.length < 2 && selectedCategory && (
          <Card className="border-dashed border-border/70 bg-muted/20">
            <CardContent className="py-12 px-6 text-center space-y-3">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Search className="h-7 w-7" />
              </div>
              <p className="font-medium text-foreground">
                Добави поне два продукта в колоните по-горе
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Ползвай полетата за търсене във всяка колона. Когато има два или три избрани
                продукта, ще се появят табовете за приложение, спецификации и (за видеокарти) FPS.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      </main>
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-svh flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Зареждане...</div>
        </main>
      }
    >
      <ComparePageContent />
    </Suspense>
  )
}
