import type { BuildState, Component } from '@/lib/types'

function parseRecommendedPsuWatts(text: string): number | null {
  const patterns = [
    /(\d{3,4})\s*W(?:\s*(?:PSU|power|recommended|minimum))?/gi,
    /PSU[:\s]+(\d{3,4})\s*W/gi,
    /захранване[^\d]{0,12}(\d{3,4})\s*W/gi,
  ]
  for (const re of patterns) {
    const m = re.exec(text)
    if (m) {
      const w = parseInt(m[1], 10)
      if (w >= 350 && w <= 1600) return w
    }
  }
  return null
}

function inferGpuTdpFromProduct(gpu: Component): number {
  const blob = `${gpu.name} ${gpu.model || ''} ${gpu.description || ''}`
  const rec = parseRecommendedPsuWatts(blob)
  if (rec) {
    return Math.min(700, Math.round(rec * 0.52))
  }

  const rtx = blob.match(/RTX\s*(\d{4})/i)
  if (rtx) {
    const model = parseInt(rtx[1], 10)
    const tier = model % 100
    const gen = Math.floor(model / 100)
    if (gen >= 50) {
      if (tier >= 90) return 575
      if (tier >= 80) return 340
      if (tier >= 70) return 250
      if (tier >= 60) return 200
      if (tier >= 50) return 135
      return 110
    }
    if (gen >= 40) {
      if (tier >= 90) return 450
      if (tier >= 80) return 320
      if (tier >= 70) return 220
      if (tier >= 60) return 115
      return 115
    }
    if (gen >= 30) {
      if (tier >= 90) return 350
      if (tier >= 80) return 250
      if (tier >= 70) return 200
      if (tier >= 60) return 170
      return 120
    }
  }

  const rx = blob.match(/RX\s*(\d{4})/i) || blob.match(/\bRX\s*(\d{3})\b/i)
  if (rx) {
    const model = parseInt(rx[1], 10)
    const tier = model % 100
    if (tier >= 90 || model >= 7900) return 355
    if (tier >= 80 || model >= 7800) return 263
    if (tier >= 70 || model >= 7700) return 230
    if (tier >= 60 || model >= 7600) return 180
    if (tier >= 50) return 150
    return 130
  }

  return 200
}

function gpuLoadWatts(gpu: Component | null): number {
  if (!gpu) return 0
  const tdp = gpu.specs?.tdp
  if (typeof tdp === 'number' && tdp >= 75) {
    return Math.round(tdp * 1.1)
  }
  return inferGpuTdpFromProduct(gpu)
}

/** Estimated AC-side load + realistic spikes (not the same as a PSU sizing calculator, but closer than raw TDP sums). */
export function estimateBuildWattage(build: BuildState): number {
  let w = 40

  if (build.cpu) {
    const base = build.cpu.specs?.tdp || 65
    w += Math.round(base * 1.32)
  }

  w += gpuLoadWatts(build.gpu)

  if (build.motherboard) w += 28

  if (build.ram) {
    const modules = build.ram.specs?.modules || 2
    w += 6 + Math.min(20, modules * 3)
  }

  build.storage.forEach(() => {
    w += 7
  })

  if (build.cooling) {
    const type = String(build.cooling.specs?.type || '').toLowerCase()
    if (type.includes('aio') || type.includes('liquid')) {
      w += 20
    } else {
      const fans = build.cooling.specs?.fan_count || 1
      w += Math.max(6, fans * 3)
    }
  }

  if (build.case) {
    const fans = build.case.specs?.included_fans || 0
    w += fans * 3
  }

  w += 18

  return Math.ceil(w * 1.15)
}
