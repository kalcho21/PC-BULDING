/**
 * Прогноза FPS @1080p по игри: калибрирана спрямо референсна система
 * (Ryzen 5 5600X-class CPU + RTX 3060-class GPU) и реалните gaming индекси
 * от gpuBenchmarks/cpuBenchmarks (или евристики от спецификации).
 */

import type { BuildState } from '@/lib/types'
import {
  computeCpuPerformance,
  computeGpuPerformance,
  computeRamPerformance,
  asFiniteNumber,
  FPS_REF_CPU_GAMING,
  FPS_REF_GPU_GAMING,
} from '@/lib/build-performance-score'

export { FPS_REF_CPU_GAMING, FPS_REF_GPU_GAMING }

export type GameFpsCalibration = {
  /** Средни реалистични FPS @1080p при референтна система (без RT, типични high/competitive настройки). */
  ref1080p: number
  /** Експонента за относителен GPU индекс (сума с exCpu ≈ 1 за мащаб при 1,1). */
  exGpu: number
  exCpu: number
  exRam: number
  vramMinGb: number
}

/** Референтни стойности – съгласувани с общи бенчмаркове/ревюта за 5600X + RTX 3060 клас. */
export const GAME_FPS_CALIBRATION: Record<string, GameFpsCalibration> = {
  CS2: { ref1080p: 270, exGpu: 0.46, exCpu: 0.5, exRam: 0.04, vramMinGb: 4 },
  Valorant: { ref1080p: 340, exGpu: 0.35, exCpu: 0.58, exRam: 0.07, vramMinGb: 4 },
  Fortnite: { ref1080p: 132, exGpu: 0.72, exCpu: 0.24, exRam: 0.04, vramMinGb: 6 },
  'GTA V': { ref1080p: 88, exGpu: 0.62, exCpu: 0.32, exRam: 0.06, vramMinGb: 4 },
  Warzone: { ref1080p: 92, exGpu: 0.78, exCpu: 0.18, exRam: 0.04, vramMinGb: 8 },
  'Cyberpunk 2077': { ref1080p: 46, exGpu: 0.84, exCpu: 0.14, exRam: 0.02, vramMinGb: 8 },
}

const GAME_ORDER = [
  'CS2',
  'Valorant',
  'Fortnite',
  'GTA V',
  'Warzone',
  'Cyberpunk 2077',
] as const

function clampRatio(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v))
}

function vramPenalty(gb: number, minGb: number): number {
  if (gb >= minGb) return 1
  return Math.max(0.52, 1 - (minGb - gb) * 0.11)
}

/**
 * Очаквани FPS @1080p за всяка игра от GAME_ORDER / калибрацията.
 */
export function estimateBuildGameFps1080p(build: BuildState): Array<{ game: string; fps: number }> {
  if (!build.gpu) {
    return GAME_ORDER.map((game) => ({ game, fps: 0 }))
  }

  const { gaming: cpuG } = computeCpuPerformance(build.cpu)
  const { gaming: gpuG } = computeGpuPerformance(build.gpu)
  const ramScore = computeRamPerformance(build.ram)

  const gpuR = clampRatio(gpuG / FPS_REF_GPU_GAMING, 0.17, 2.2)
  const cpuR = clampRatio(cpuG / FPS_REF_CPU_GAMING, 0.17, 2.0)
  const ramR = 0.94 + 0.06 * (ramScore / 100)

  const vramGb = asFiniteNumber(build.gpu.specs?.vram, 8)

  return GAME_ORDER.map((game) => {
    const cal = GAME_FPS_CALIBRATION[game]
    const pen = vramPenalty(vramGb, cal.vramMinGb)

    const raw =
      cal.ref1080p *
      Math.pow(gpuR, cal.exGpu) *
      Math.pow(cpuR, cal.exCpu) *
      Math.pow(ramR, cal.exRam) *
      pen

    const fps = Math.round(Math.max(24, Math.min(720, raw)))
    return { game, fps }
  })
}
