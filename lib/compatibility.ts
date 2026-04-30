import type { Component, Category, CompatibilityIssue, BuildItem } from "./types"

// Game database for FPS estimates
export interface GameFpsEstimate {
  game: string
  resolution: '1080p' | '1440p' | '4K'
  settings: 'Low' | 'Medium' | 'High' | 'Ultra'
  fps: number
}

// GPU performance tiers (based on relative performance)
const gpuPerformanceTiers: Record<string, number> = {
  // NVIDIA RTX 50 Series (2025)
  'RTX 5090': 130,
  'RTX 5080': 110,
  'RTX 5070 Ti': 95,
  'RTX 5070': 82,
  'RTX 5060 Ti': 65,
  'RTX 5060': 52,
  // NVIDIA RTX 40 Series
  'RTX 4090': 100,
  'RTX 4080 SUPER': 85,
  'RTX 4080': 80,
  'RTX 4070 Ti SUPER': 72,
  'RTX 4070 Ti': 68,
  'RTX 4070 SUPER': 62,
  'RTX 4070': 55,
  'RTX 4060 Ti': 45,
  'RTX 4060': 38,
  // NVIDIA RTX 30 Series
  'RTX 3090': 70,
  'RTX 3080': 65,
  'RTX 3070': 52,
  'RTX 3060 Ti': 45,
  'RTX 3060': 38,
  // NVIDIA GTX
  'GTX 1660 Super': 25,
  'GTX 1660': 22,
  // AMD RX 9000 Series (2025)
  'RX 9070 XT': 88,
  'RX 9070': 75,
  'RX 9060 XT': 58,
  'RX 9060': 45,
  // AMD RX 7000 Series
  'RX 7900 XTX': 82,
  'RX 7900 XT': 72,
  'RX 7800 XT': 58,
  'RX 7700 XT': 50,
  'RX 7600': 35,
  // AMD RX 6000 Series
  'RX 6900 XT': 65,
  'RX 6800 XT': 60,
  'RX 6800': 52,
  'RX 6700 XT': 42,
  'RX 6600 XT': 32,
}

// CPU performance impact multipliers
const cpuPerformanceMultipliers: Record<string, number> = {
  // Intel Arrow Lake (2025)
  'Core Ultra 9 285K': 1.05,
  'Core Ultra 7 265K': 1.02,
  'Core Ultra 5 245K': 0.98,
  // Intel 14th Gen
  'i9-14900K': 1.0,
  'i7-14700K': 0.97,
  'i5-14600K': 0.94,
  // Intel 13th Gen
  'i9-13900K': 0.98,
  'i7-13700K': 0.95,
  'i5-13600K': 0.92,
  'i5-13400F': 0.85,
  'i3-13100F': 0.75,
  // Intel 12th Gen
  'i9-12900K': 0.93,
  'i7-12700K': 0.90,
  'i5-12600K': 0.87,
  // AMD Ryzen 9000 (2025)
  'Ryzen 9 9950X3D': 1.08,
  'Ryzen 9 9950X': 1.05,
  'Ryzen 9 9900X': 1.02,
  'Ryzen 7 9800X3D': 1.08, // Best gaming CPU
  'Ryzen 7 9700X': 1.0,
  'Ryzen 5 9600X': 0.96,
  // AMD Ryzen 7000
  'Ryzen 9 7950X3D': 1.02,
  'Ryzen 9 7950X': 0.98,
  'Ryzen 9 7900X3D': 1.03,
  'Ryzen 9 7900X': 0.96,
  'Ryzen 7 7800X3D': 1.02,
  'Ryzen 7 7700X': 0.94,
  'Ryzen 5 7600X': 0.91,
  'Ryzen 5 7600': 0.89,
  // AMD Ryzen 5000
  'Ryzen 9 5950X': 0.90,
  'Ryzen 9 5900X': 0.88,
  'Ryzen 7 5800X3D': 0.96,
  'Ryzen 7 5800X': 0.86,
  'Ryzen 5 5600X': 0.84,
  'Ryzen 5 5600': 0.82,
  'Ryzen 3 4100': 0.65,
}

// Base FPS values for popular games at 1080p Ultra with RTX 4090 + top CPU
const baseFpsData: Record<string, { '1080p': number; '1440p': number; '4K': number }> = {
  'Cyberpunk 2077': { '1080p': 180, '1440p': 120, '4K': 65 },
  'Call of Duty: Warzone 2': { '1080p': 240, '1440p': 180, '4K': 110 },
  'Fortnite': { '1080p': 400, '1440p': 280, '4K': 160 },
  'Counter-Strike 2': { '1080p': 500, '1440p': 400, '4K': 280 },
  'Valorant': { '1080p': 600, '1440p': 500, '4K': 350 },
  'Apex Legends': { '1080p': 300, '1440p': 220, '4K': 130 },
  'GTA V': { '1080p': 180, '1440p': 140, '4K': 90 },
  'Red Dead Redemption 2': { '1080p': 140, '1440p': 100, '4K': 55 },
  'Elden Ring': { '1080p': 60, '1440p': 60, '4K': 60 }, // Capped at 60
  'Hogwarts Legacy': { '1080p': 140, '1440p': 95, '4K': 50 },
  'Baldur\'s Gate 3': { '1080p': 160, '1440p': 110, '4K': 60 },
  'Starfield': { '1080p': 130, '1440p': 90, '4K': 45 },
  'Microsoft Flight Simulator': { '1080p': 90, '1440p': 65, '4K': 35 },
  'Minecraft (with RTX)': { '1080p': 180, '1440p': 120, '4K': 70 },
  'League of Legends': { '1080p': 500, '1440p': 400, '4K': 250 },
}

export interface FpsEstimateResult {
  game: string
  estimates: {
    resolution: '1080p' | '1440p' | '4K'
    low: number
    medium: number
    high: number
    ultra: number
  }[]
}

export function estimateFps(
  gpuModel: string | undefined,
  cpuModel: string | undefined
): FpsEstimateResult[] {
  if (!gpuModel) {
    return []
  }

  // Find GPU tier
  let gpuTier = 30 // Default for unknown GPUs
  for (const [model, tier] of Object.entries(gpuPerformanceTiers)) {
    if (gpuModel.toLowerCase().includes(model.toLowerCase())) {
      gpuTier = tier
      break
    }
  }

  // Find CPU multiplier
  let cpuMultiplier = 0.85 // Default for unknown CPUs
  if (cpuModel) {
    for (const [model, mult] of Object.entries(cpuPerformanceMultipliers)) {
      if (cpuModel.toLowerCase().includes(model.toLowerCase())) {
        cpuMultiplier = mult
        break
      }
    }
  }

  const results: FpsEstimateResult[] = []

  for (const [game, baseFps] of Object.entries(baseFpsData)) {
    const estimates: FpsEstimateResult['estimates'] = []

    for (const resolution of ['1080p', '1440p', '4K'] as const) {
      const baseForRes = baseFps[resolution]
      
      // Calculate FPS based on GPU tier and CPU multiplier
      const scaledFps = (baseForRes * (gpuTier / 100)) * cpuMultiplier

      // Settings multipliers
      const settingsMultipliers = {
        ultra: 1.0,
        high: 1.3,
        medium: 1.7,
        low: 2.2,
      }

      estimates.push({
        resolution,
        low: Math.min(Math.round(scaledFps * settingsMultipliers.low), 500),
        medium: Math.min(Math.round(scaledFps * settingsMultipliers.medium), 400),
        high: Math.min(Math.round(scaledFps * settingsMultipliers.high), 300),
        ultra: Math.min(Math.round(scaledFps * settingsMultipliers.ultra), 240),
      })
    }

    results.push({ game, estimates })
  }

  // Sort by game name
  return results.sort((a, b) => a.game.localeCompare(b.game))
}

// Performance summary for quick overview
export interface PerformanceSummary {
  tier: 'Budget' | 'Entry' | 'Mid-Range' | 'High-End' | 'Enthusiast' | 'Ultra'
  tierColor: string
  description: string
  recommendedResolution: '1080p' | '1440p' | '4K'
  expectedFps: {
    esports: string
    aaa: string
  }
}

export function getPerformanceSummary(
  gpuModel: string | undefined,
  cpuModel: string | undefined
): PerformanceSummary {
  let gpuTier = 0
  if (gpuModel) {
    for (const [model, tier] of Object.entries(gpuPerformanceTiers)) {
      if (gpuModel.toLowerCase().includes(model.toLowerCase())) {
        gpuTier = tier
        break
      }
    }
  }

  if (gpuTier >= 80) {
    return {
      tier: 'Ultra',
      tierColor: 'text-purple-400',
      description: 'Върхова производителност за 4K гейминг с ray tracing',
      recommendedResolution: '4K',
      expectedFps: { esports: '200+ FPS', aaa: '60-120 FPS' },
    }
  } else if (gpuTier >= 65) {
    return {
      tier: 'Enthusiast',
      tierColor: 'text-cyan-400',
      description: 'Отлична производителност за 4K и VR гейминг',
      recommendedResolution: '4K',
      expectedFps: { esports: '144+ FPS', aaa: '50-90 FPS' },
    }
  } else if (gpuTier >= 50) {
    return {
      tier: 'High-End',
      tierColor: 'text-green-400',
      description: 'Плавен 1440p гейминг с високи настройки',
      recommendedResolution: '1440p',
      expectedFps: { esports: '144+ FPS', aaa: '60-100 FPS' },
    }
  } else if (gpuTier >= 35) {
    return {
      tier: 'Mid-Range',
      tierColor: 'text-yellow-400',
      description: 'Добър баланс за 1080p/1440p гейминг',
      recommendedResolution: '1440p',
      expectedFps: { esports: '100+ FPS', aaa: '45-75 FPS' },
    }
  } else if (gpuTier >= 20) {
    return {
      tier: 'Entry',
      tierColor: 'text-orange-400',
      description: 'Подходящ за 1080p гейминг със средни настройки',
      recommendedResolution: '1080p',
      expectedFps: { esports: '60+ FPS', aaa: '30-50 FPS' },
    }
  } else {
    return {
      tier: 'Budget',
      tierColor: 'text-red-400',
      description: 'Базов гейминг и ежедневни задачи',
      recommendedResolution: '1080p',
      expectedFps: { esports: '30-60 FPS', aaa: '20-40 FPS' },
    }
  }
}

// Socket compatibility mapping
const socketCompatibility: Record<string, string[]> = {
  "LGA1851": ["LGA1851"],
  "LGA1700": ["LGA1700"],
  "AM5": ["AM5"],
  "AM4": ["AM4"],
  "LGA1200": ["LGA1200"],
}

// Memory type compatibility
const memoryCompatibility: Record<string, string[]> = {
  "DDR5": ["DDR5"],
  "DDR4": ["DDR4"],
}

export interface CompatibilityResult {
  isCompatible: boolean
  issues: CompatibilityIssue[]
  warnings: CompatibilityIssue[]
  recommendations: string[]
}

export function checkBuildCompatibility(
  buildItems: BuildItem[],
  categories: Category[]
): CompatibilityResult {
  const issues: CompatibilityIssue[] = []
  const warnings: CompatibilityIssue[] = []
  const recommendations: string[] = []

  // Get components by category
  const getComponentByCategory = (slug: string): Component | undefined => {
    const category = categories.find(c => c.slug === slug)
    if (!category) return undefined
    return buildItems.find(item => item.component.category_id === category.id)?.component
  }

  const cpu = getComponentByCategory("cpu")
  const motherboard = getComponentByCategory("motherboard")
  const ram = getComponentByCategory("ram")
  const gpu = getComponentByCategory("gpu")
  const psu = getComponentByCategory("psu")
  const cooler = getComponentByCategory("cooling")
  const pcCase = getComponentByCategory("case")

  // CPU + Motherboard socket compatibility
  if (cpu && motherboard) {
    const cpuSocket = (cpu.specs as Record<string, unknown>).socket as string
    const mbSocket = (motherboard.specs as Record<string, unknown>).socket as string

    if (cpuSocket && mbSocket && cpuSocket !== mbSocket) {
      issues.push({
        type: "error",
        source: "cpu",
        target: "motherboard",
        message: `CPU socket (${cpuSocket}) is not compatible with motherboard socket (${mbSocket})`,
        suggestion: `Choose a motherboard with ${cpuSocket} socket or a CPU with ${mbSocket} socket`,
      })
    }
  }

  // Motherboard + RAM type compatibility
  if (motherboard && ram) {
    const mbMemoryType = (motherboard.specs as Record<string, unknown>).memory_type as string
    const ramType = (ram.specs as Record<string, unknown>).type as string

    if (mbMemoryType && ramType && mbMemoryType !== ramType) {
      issues.push({
        type: "error",
        source: "ram",
        target: "motherboard",
        message: `RAM type (${ramType}) is not compatible with motherboard memory slots (${mbMemoryType})`,
        suggestion: `Choose ${mbMemoryType} RAM or a motherboard that supports ${ramType}`,
      })
    }

    // Check RAM speed support (warning only)
    const ramSpeed = (ram.specs as Record<string, unknown>).speed as number
    if (ramSpeed && ramSpeed > 6400) {
      warnings.push({
        type: "warning",
        source: "ram",
        target: "motherboard",
        message: `RAM speed (${ramSpeed}MHz) may require manual XMP/EXPO profile activation`,
        suggestion: "Enable XMP/EXPO in BIOS for optimal performance",
      })
    }
  }

  // GPU clearance in case
  if (gpu && pcCase) {
    const gpuLength = 300 // Approximate, would need real data
    const maxGpuLength = (pcCase.specs as Record<string, unknown>).max_gpu_length as number

    if (maxGpuLength && gpuLength > maxGpuLength) {
      issues.push({
        type: "error",
        source: "gpu",
        target: "case",
        message: `GPU may not fit in the case (max GPU length: ${maxGpuLength}mm)`,
        suggestion: "Choose a larger case or a more compact GPU",
      })
    }
  }

  // CPU cooler height in case
  if (cooler && pcCase) {
    const coolerHeight = (cooler.specs as Record<string, unknown>).height as number
    const maxCoolerHeight = (pcCase.specs as Record<string, unknown>).max_cpu_cooler_height as number

    if (coolerHeight && maxCoolerHeight && coolerHeight > maxCoolerHeight) {
      issues.push({
        type: "error",
        source: "cooling",
        target: "case",
        message: `CPU cooler (${coolerHeight}mm) is too tall for the case (max: ${maxCoolerHeight}mm)`,
        suggestion: "Choose a lower profile cooler or a larger case",
      })
    }
  }

  // PSU wattage check
  if (psu) {
    const psuWattage = (psu.specs as Record<string, unknown>).wattage as number
    let estimatedPower = 100 // Base system power

    if (cpu) {
      const cpuTdp = (cpu.specs as Record<string, unknown>).tdp as number
      estimatedPower += cpuTdp || 65
    }

    if (gpu) {
      const gpuTdp = (gpu.specs as Record<string, unknown>).tdp as number
      estimatedPower += gpuTdp || 150
    }

    // Add 20% headroom
    const recommendedPower = Math.ceil(estimatedPower * 1.2)

    if (psuWattage && psuWattage < recommendedPower) {
      warnings.push({
        type: "warning",
        source: "psu",
        target: "system",
        message: `PSU wattage (${psuWattage}W) may be insufficient for your build (estimated: ${estimatedPower}W, recommended: ${recommendedPower}W)`,
        suggestion: `Consider a PSU with at least ${recommendedPower}W`,
      })
    }

    if (psuWattage && psuWattage >= recommendedPower * 1.5) {
      recommendations.push(
        `Your PSU has plenty of headroom (${psuWattage}W vs ${estimatedPower}W needed). Great for future upgrades!`
      )
    }
  }

  // Cooler socket compatibility
  if (cooler && cpu) {
    const cpuSocket = (cpu.specs as Record<string, unknown>).socket as string
    const supportedSockets = (cooler.specs as Record<string, unknown>).socket_support as string[]

    if (cpuSocket && supportedSockets && !supportedSockets.includes(cpuSocket)) {
      issues.push({
        type: "error",
        source: "cooling",
        target: "cpu",
        message: `CPU cooler does not support ${cpuSocket} socket`,
        suggestion: `Choose a cooler that supports ${cpuSocket} socket`,
      })
    }
  }

  // Check for missing essential components
  const essentialCategories = ["cpu", "motherboard", "ram", "psu", "case"]
  essentialCategories.forEach(slug => {
    if (!getComponentByCategory(slug)) {
      warnings.push({
        type: "warning",
        source: slug,
        target: "system",
        message: `Missing ${slug.toUpperCase()} - your build is incomplete`,
        suggestion: `Add a ${slug.toUpperCase()} to complete your build`,
      })
    }
  })

  // Recommendations
  if (cpu && !cooler) {
    const cpuTdp = (cpu.specs as Record<string, unknown>).tdp as number
    if (cpuTdp && cpuTdp > 65) {
      recommendations.push(
        "Your CPU has a high TDP. Consider adding an aftermarket cooler for better thermals and quieter operation."
      )
    }
  }

  if (gpu && !getComponentByCategory("storage")) {
    recommendations.push(
      "Don't forget to add storage! An NVMe SSD is recommended for best performance."
    )
  }

  return {
    isCompatible: issues.length === 0,
    issues,
    warnings,
    recommendations,
  }
}

// Performance scoring system
export function calculatePerformanceScore(
  buildItems: BuildItem[],
  categories: Category[],
  useCase: "gaming" | "workstation" | "general" = "general"
): number {
  let score = 0
  let maxScore = 100

  const getComponentByCategory = (slug: string): Component | undefined => {
    const category = categories.find(c => c.slug === slug)
    if (!category) return undefined
    return buildItems.find(item => item.component.category_id === category.id)?.component
  }

  const cpu = getComponentByCategory("cpu")
  const gpu = getComponentByCategory("gpu")
  const ram = getComponentByCategory("ram")
  const storage = getComponentByCategory("storage")

  // Weight factors based on use case
  const weights = {
    gaming: { cpu: 25, gpu: 45, ram: 15, storage: 15 },
    workstation: { cpu: 40, gpu: 25, ram: 20, storage: 15 },
    general: { cpu: 30, gpu: 30, ram: 20, storage: 20 },
  }

  const w = weights[useCase]

  // CPU score (based on cores, clock speed, and price tier)
  if (cpu) {
    const cores = (cpu.specs as Record<string, unknown>).cores as number || 4
    const boostClock = (cpu.specs as Record<string, unknown>).boost_clock as number || 3.0
    
    // Normalize: 16+ cores = 100%, 4 cores = 25%
    const coreScore = Math.min((cores / 16) * 100, 100)
    // Normalize: 6.0GHz = 100%, 3.0GHz = 50%
    const clockScore = Math.min((boostClock / 6.0) * 100, 100)
    
    score += ((coreScore * 0.6 + clockScore * 0.4) / 100) * w.cpu
  }

  // GPU score (based on VRAM, CUDA cores, and price tier)
  if (gpu) {
    const vram = (gpu.specs as Record<string, unknown>).vram as number || 4
    const cudaCores = (gpu.specs as Record<string, unknown>).cuda_cores as number
    const streamProcessors = (gpu.specs as Record<string, unknown>).stream_processors as number
    const computeUnits = cudaCores || streamProcessors || 2048

    // Normalize: 24GB = 100%, 4GB = 17%
    const vramScore = Math.min((vram / 24) * 100, 100)
    // Normalize: 16384 cores = 100%, 2048 = 12.5%
    const coreScore = Math.min((computeUnits / 16384) * 100, 100)
    
    score += ((vramScore * 0.4 + coreScore * 0.6) / 100) * w.gpu
  }

  // RAM score (based on capacity and speed)
  if (ram) {
    const capacity = (ram.specs as Record<string, unknown>).capacity as number || 8
    const speed = (ram.specs as Record<string, unknown>).speed as number || 2400

    // Normalize: 64GB = 100%, 8GB = 12.5%
    const capacityScore = Math.min((capacity / 64) * 100, 100)
    // Normalize: 6400MHz = 100%, 2400MHz = 37.5%
    const speedScore = Math.min((speed / 6400) * 100, 100)
    
    score += ((capacityScore * 0.6 + speedScore * 0.4) / 100) * w.ram
  }

  // Storage score (based on type and speed)
  if (storage) {
    const readSpeed = (storage.specs as Record<string, unknown>).read_speed as number || 500
    const storageType = (storage.specs as Record<string, unknown>).type as string

    let typeMultiplier = 0.5
    if (storageType?.includes("NVMe")) typeMultiplier = 1.0
    else if (storageType?.includes("SATA SSD")) typeMultiplier = 0.75
    else if (storageType?.includes("HDD")) typeMultiplier = 0.3

    // Normalize: 7500MB/s = 100%, 500MB/s = 6.7%
    const speedScore = Math.min((readSpeed / 7500) * 100, 100) * typeMultiplier
    
    score += (speedScore / 100) * w.storage
  }

  return Math.round(score)
}

// Build presets for auto-generation
export interface BuildPreset {
  name: string
  description: string
  budget: number
  useCase: "gaming" | "workstation" | "general"
  priorities: {
    cpu: number
    gpu: number
    ram: number
    storage: number
    psu: number
    case: number
    cooling: number
  }
}

export const buildPresets: BuildPreset[] = [
  {
    name: "Budget Gaming",
    description: "Entry-level gaming PC for 1080p gaming",
    budget: 800,
    useCase: "gaming",
    priorities: { cpu: 0.15, gpu: 0.35, ram: 0.1, storage: 0.15, psu: 0.1, case: 0.08, cooling: 0.07 },
  },
  {
    name: "Mid-Range Gaming",
    description: "Solid 1440p gaming performance",
    budget: 1500,
    useCase: "gaming",
    priorities: { cpu: 0.18, gpu: 0.35, ram: 0.12, storage: 0.12, psu: 0.1, case: 0.07, cooling: 0.06 },
  },
  {
    name: "High-End Gaming",
    description: "4K gaming powerhouse",
    budget: 3000,
    useCase: "gaming",
    priorities: { cpu: 0.15, gpu: 0.4, ram: 0.1, storage: 0.12, psu: 0.1, case: 0.07, cooling: 0.06 },
  },
  {
    name: "Content Creator",
    description: "Video editing and 3D rendering workstation",
    budget: 2500,
    useCase: "workstation",
    priorities: { cpu: 0.3, gpu: 0.25, ram: 0.15, storage: 0.12, psu: 0.08, case: 0.05, cooling: 0.05 },
  },
  {
    name: "Productivity Pro",
    description: "Office work and light multitasking",
    budget: 600,
    useCase: "general",
    priorities: { cpu: 0.25, gpu: 0.15, ram: 0.2, storage: 0.2, psu: 0.1, case: 0.05, cooling: 0.05 },
  },
]

export function generateBuildFromPreset(
  preset: BuildPreset,
  components: Component[],
  categories: Category[]
): Component[] {
  const selectedComponents: Component[] = []
  const budget = preset.budget

  // Helper to get category ID by slug
  const getCategoryId = (slug: string): string | undefined => {
    return categories.find(c => c.slug === slug)?.id
  }

  // Helper to get best component for budget
  const selectBestComponent = (
    categorySlug: string,
    maxBudget: number,
    additionalFilter?: (c: Component) => boolean
  ): Component | undefined => {
    const categoryId = getCategoryId(categorySlug)
    if (!categoryId) return undefined

    let filtered = components.filter(c => 
      c.category_id === categoryId && 
      c.price <= maxBudget &&
      c.in_stock
    )

    if (additionalFilter) {
      filtered = filtered.filter(additionalFilter)
    }

    // Sort by rating * price efficiency
    return filtered.sort((a, b) => {
      const scoreA = (a.rating || 4) * (a.price / maxBudget)
      const scoreB = (b.rating || 4) * (b.price / maxBudget)
      return scoreB - scoreA
    })[0]
  }

  // Select components based on priorities
  const categoryBudgets: Record<string, number> = {
    cpu: budget * preset.priorities.cpu,
    gpu: budget * preset.priorities.gpu,
    ram: budget * preset.priorities.ram,
    storage: budget * preset.priorities.storage,
    psu: budget * preset.priorities.psu,
    case: budget * preset.priorities.case,
    cooling: budget * preset.priorities.cooling,
    motherboard: budget * 0.15, // Fixed percentage for motherboard
  }

  // First, select CPU to determine socket
  const cpu = selectBestComponent("cpu", categoryBudgets.cpu)
  if (cpu) {
    selectedComponents.push(cpu)
    
    // Select motherboard compatible with CPU
    const cpuSocket = (cpu.specs as Record<string, unknown>).socket as string
    const motherboard = selectBestComponent("motherboard", categoryBudgets.motherboard, (c) => {
      const mbSocket = (c.specs as Record<string, unknown>).socket as string
      return mbSocket === cpuSocket
    })
    
    if (motherboard) {
      selectedComponents.push(motherboard)
      
      // Select RAM compatible with motherboard
      const mbMemoryType = (motherboard.specs as Record<string, unknown>).memory_type as string
      const ram = selectBestComponent("ram", categoryBudgets.ram, (c) => {
        const ramType = (c.specs as Record<string, unknown>).type as string
        return ramType === mbMemoryType
      })
      if (ram) selectedComponents.push(ram)
    }
  }

  // Select GPU
  const gpu = selectBestComponent("gpu", categoryBudgets.gpu)
  if (gpu) selectedComponents.push(gpu)

  // Select storage
  const storage = selectBestComponent("storage", categoryBudgets.storage)
  if (storage) selectedComponents.push(storage)

  // Calculate power needed and select PSU
  let powerNeeded = 200
  if (cpu) powerNeeded += ((cpu.specs as Record<string, unknown>).tdp as number) || 65
  if (gpu) powerNeeded += ((gpu.specs as Record<string, unknown>).tdp as number) || 150
  
  const psu = selectBestComponent("psu", categoryBudgets.psu, (c) => {
    const wattage = (c.specs as Record<string, unknown>).wattage as number
    return wattage >= powerNeeded * 1.2
  })
  if (psu) selectedComponents.push(psu)

  // Select case
  const pcCase = selectBestComponent("case", categoryBudgets.case)
  if (pcCase) selectedComponents.push(pcCase)

  // Select cooler if CPU TDP > 65W
  if (cpu) {
    const cpuTdp = ((cpu.specs as Record<string, unknown>).tdp as number) || 65
    if (cpuTdp > 65) {
      const cpuSocket = (cpu.specs as Record<string, unknown>).socket as string
      const cooler = selectBestComponent("cooling", categoryBudgets.cooling, (c) => {
        const supported = (c.specs as Record<string, unknown>).socket_support as string[]
        return !supported || supported.includes(cpuSocket)
      })
      if (cooler) selectedComponents.push(cooler)
    }
  }

  return selectedComponents
}
