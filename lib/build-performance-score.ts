/**
 * Единна логика за оценка на производителност като в конфигуратора (CPU/GPU/RAM/диск + completion factor).
 * Използва се при запазване и при страницата за сравнение, за да не доминира остаряло performance_score от DB.
 */

import type { BuildState, Component } from '@/lib/types'

export const cpuBenchmarks: Record<string, { gaming: number; productivity: number }> = {
  'Ryzen 9 9950X3D': { gaming: 100, productivity: 98 },
  'Ryzen 9 9950X': { gaming: 94, productivity: 100 },
  'Ryzen 9 7950X3D': { gaming: 95, productivity: 92 },
  'Ryzen 9 7950X': { gaming: 88, productivity: 93 },
  'Ryzen 9 7900X3D': { gaming: 93, productivity: 88 },
  'Ryzen 9 7900X': { gaming: 87, productivity: 91 },
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

export const gpuBenchmarks: Record<string, { gaming: number; creator: number }> = {
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

export function asFiniteNumber(v: unknown, fallback: number): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

export function clampScore(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(value)))
}

export function normalizeName(value: string | null | undefined): string {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseCacheAmount(cache: unknown): number {
  if (typeof cache !== 'string') return 0
  const match = cache.match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : 0
}

export function matchBenchmark<T>(map: Record<string, T>, component: Component | null): T | null {
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

export function computeCpuPerformance(cpu: Component | null): { gaming: number; productivity: number } {
  if (!cpu) return { gaming: 0, productivity: 0 }

  const matched = matchBenchmark(cpuBenchmarks, cpu)
  if (matched) return matched

  const cores = asFiniteNumber(cpu.specs?.cores, 4)
  const threads = asFiniteNumber(cpu.specs?.threads, Math.max(cores, 4))
  const boost = asFiniteNumber(cpu.specs?.boost_clock, 4)
  const base = asFiniteNumber(cpu.specs?.base_clock, 3.2)
  const cache = parseCacheAmount(cpu.specs?.cache)
  const architecture = normalizeName(cpu.specs?.architecture)

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
    ((cores / 16) * 38 + (threads / 32) * 26 + (boost / 5.8) * 18 + (cache / 96) * 10) * archFactor,
    12,
    100
  )

  return { gaming, productivity }
}

export function computeGpuPerformance(gpu: Component | null): { gaming: number; creator: number } {
  if (!gpu) return { gaming: 0, creator: 0 }

  const matched = matchBenchmark(gpuBenchmarks, gpu)
  if (matched) return matched

  const vram = asFiniteNumber(gpu.specs?.vram, 8)
  const busWidth = asFiniteNumber(gpu.specs?.bus_width, 128)
  const tdp = asFiniteNumber(gpu.specs?.tdp, 150)
  const rawCuda = asFiniteNumber(gpu.specs?.cuda_cores, 0)
  const rawStream = asFiniteNumber(gpu.specs?.stream_processors, 0)
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
}

export function computeRamPerformance(ram: Component | null): number {
  if (!ram) return 0
  const capacity = asFiniteNumber(ram.specs?.capacity, 8)
  const speed = asFiniteNumber(ram.specs?.speed, 3200)
  const isDdr5 = normalizeName(ram.specs?.type).includes('ddr5')
  return clampScore(
    (capacity / 32) * 55 + (speed / 6400) * 35 + (isDdr5 ? 8 : 0),
    10,
    100
  )
}

export function computeStoragePerformance(storage: Component[]): number {
  if (storage.length === 0) return 0
  const speeds = storage.map((s) => asFiniteNumber(s.specs?.read_speed, 550))
  const fastest = Math.max(...speeds)
  return clampScore((fastest / 7500) * 100, 12, 100)
}

export interface BuildPerformanceAnalysis {
  cpuPerformance: { gaming: number; productivity: number }
  gpuPerformance: { gaming: number; creator: number }
  ramPerformance: number
  storagePerformance: number
  performanceScore: number
}

export function analyzeBuildPerformance(build: BuildState): BuildPerformanceAnalysis {
  const cpuPerformance = computeCpuPerformance(build.cpu)
  const gpuPerformance = computeGpuPerformance(build.gpu)
  const ramPerformance = computeRamPerformance(build.ram)
  const storagePerformance = computeStoragePerformance(build.storage)

  const weightedParts: Array<{ score: number; weight: number }> = []

  if (build.gpu) weightedParts.push({ score: gpuPerformance.gaming, weight: 0.44 })
  if (build.cpu)
    weightedParts.push({
      score: cpuPerformance.gaming * 0.62 + cpuPerformance.productivity * 0.38,
      weight: 0.34,
    })
  if (build.ram) weightedParts.push({ score: ramPerformance, weight: 0.12 })
  if (build.storage.length > 0) weightedParts.push({ score: storagePerformance, weight: 0.07 })
  if (build.cooling) weightedParts.push({ score: 92, weight: 0.03 })

  let performanceScore = 0
  if (weightedParts.length > 0) {
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
    performanceScore = clampScore(score * completionFactor, 0, 100)
  }

  return {
    cpuPerformance,
    gpuPerformance,
    ramPerformance,
    storagePerformance,
    performanceScore,
  }
}

export function computeBuilderStylePerformanceScore(build: BuildState): number {
  return analyzeBuildPerformance(build).performanceScore
}
