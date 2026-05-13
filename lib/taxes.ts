export type FuelType = 'gasoline' | 'diesel' | 'hybrid' | 'electric'
export type Co2Norm = 'wltp' | 'nedc'

export interface TMCInput {
  co2: number
  fuelType: FuelType
  co2Norm?: Co2Norm  // defaults to 'wltp'
}

export interface TCInput {
  cc: number
  fuelType: FuelType
  kw?: number  // used for electric vehicles
}

export interface TaxResult {
  tmc: number
  tc: number
  cv: number
  tmcDetail: string
  tcDetail: string
}

const TC_RATES: Record<number, number> = {
  4: 77.52,
  5: 107.95,
  6: 148.74,
  7: 198.19,
  8: 264.65,
  9: 331.35,
  10: 413.59,
  11: 501.83,
  12: 607.02,
  13: 717.81,
  14: 834.77,
  15: 959.98,
}

const FUEL_TMC_COEFFICIENT: Record<FuelType, number> = {
  gasoline: 1.0,
  diesel: 1.15,
  hybrid: 0.75,
  electric: 0,
}

export function calculateCV(cc: number): number {
  return Math.max(1, Math.round(cc / 200))
}

export function calculateTMC({ co2, fuelType, co2Norm = 'wltp' }: TMCInput): number {
  if (fuelType === 'electric' || co2 === 0) return 0

  const effectiveCo2 = co2Norm === 'nedc' ? Math.round(co2 * 1.21) : co2

  let base: number
  if (effectiveCo2 <= 100) {
    base = 61.50 + (effectiveCo2 - 1) * 2.10
  } else if (effectiveCo2 <= 145) {
    base = 271.40 + (effectiveCo2 - 101) * 8.70
  } else if (effectiveCo2 <= 195) {
    base = 654.20 + (effectiveCo2 - 146) * 17.40
  } else {
    base = 1521.20 + (effectiveCo2 - 196) * 26.20
  }

  return Math.round(base * FUEL_TMC_COEFFICIENT[fuelType] * 100) / 100
}

export function calculateTC({ cc, fuelType, kw }: TCInput): number {
  let cv: number

  if (fuelType === 'electric') {
    if (!kw || kw === 0) return TC_RATES[4]
    cv = Math.max(1, Math.ceil(kw / 7.5))
  } else if (cc > 0) {
    cv = calculateCV(cc)
  } else if (kw && kw > 0) {
    // Fallback approximation when only kW is known (not precise for Belgian TC)
    cv = Math.max(1, Math.round(kw / 5.5))
  } else {
    return TC_RATES[4]  // minimum if no data
  }

  const base = cv > 15
    ? 959.98 + (cv - 15) * 133.00
    : TC_RATES[Math.max(4, cv)]

  const dieselMultiplier = fuelType === 'diesel' ? 1.25 : 1.0
  return Math.round(base * dieselMultiplier * 100) / 100
}

export function calculate(input: {
  co2: number
  cc: number
  fuelType: FuelType
  co2Norm?: Co2Norm
  kw?: number
}): TaxResult {
  const usedKwFallback = input.fuelType !== 'electric' && (input.cc === 0 || !input.cc) && input.kw && input.kw > 0

  const cv = input.fuelType === 'electric' && input.kw
    ? Math.max(1, Math.ceil(input.kw / 7.5))
    : (input.cc > 0 || !input.kw)
      ? calculateCV(input.cc || 0)
      : Math.max(1, Math.round(input.kw / 5.5))

  const tmc = calculateTMC({ co2: input.co2, fuelType: input.fuelType, co2Norm: input.co2Norm })
  const tc = calculateTC({ cc: input.cc, fuelType: input.fuelType, kw: input.kw })

  const normLabel = input.co2Norm === 'nedc' ? ' (NEDC→WLTP ×1.21)' : ''
  return {
    tmc,
    tc,
    cv,
    tmcDetail: `Basé sur ${input.co2} g/km CO₂${normLabel}, coefficient ${FUEL_TMC_COEFFICIENT[input.fuelType]}`,
    tcDetail: input.fuelType === 'electric' && input.kw
      ? `${cv} CV fiscaux (${input.kw} kW)`
      : usedKwFallback
        ? `~${cv} CV fiscaux (estimé depuis ${input.kw} kW — résultat approximatif)`
        : `${cv} CV fiscaux (${input.cc} cc)${input.fuelType === 'diesel' ? ' + majoration diesel 25%' : ''}`,
  }
}
