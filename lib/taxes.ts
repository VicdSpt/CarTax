export type FuelType = 'gasoline' | 'diesel' | 'hybrid' | 'electric'

export interface TMCInput {
  co2: number
  fuelType: FuelType
}

export interface TCInput {
  cc: number
  fuelType: FuelType
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

export function calculateTMC({ co2, fuelType }: TMCInput): number {
  if (fuelType === 'electric' || co2 === 0) return 0

  let base: number
  if (co2 <= 100) {
    base = 61.50 + (co2 - 1) * 2.10
  } else if (co2 <= 145) {
    base = 271.40 + (co2 - 101) * 8.70
  } else if (co2 <= 195) {
    base = 654.20 + (co2 - 146) * 17.40
  } else {
    base = 1521.20 + (co2 - 196) * 26.20
  }

  return Math.round(base * FUEL_TMC_COEFFICIENT[fuelType] * 100) / 100
}

export function calculateTC({ cc, fuelType }: TCInput): number {
  if (fuelType === 'electric') return 0

  const cv = calculateCV(cc)
  let base: number
  if (cv > 15) {
    base = 959.98 + (cv - 15) * 133.00
  } else {
    base = TC_RATES[Math.max(4, cv)]
  }

  const dieselMultiplier = fuelType === 'diesel' ? 1.25 : 1.0
  return Math.round(base * dieselMultiplier * 100) / 100
}

export function calculate(input: {
  co2: number
  cc: number
  fuelType: FuelType
}): TaxResult {
  const cv = calculateCV(input.cc)
  const tmc = calculateTMC({ co2: input.co2, fuelType: input.fuelType })
  const tc = calculateTC({ cc: input.cc, fuelType: input.fuelType })

  return {
    tmc,
    tc,
    cv,
    tmcDetail: `Basé sur ${input.co2} g/km CO₂, coefficient ${FUEL_TMC_COEFFICIENT[input.fuelType]}`,
    tcDetail: `${cv} CV fiscaux (${input.cc} cc)${input.fuelType === 'diesel' ? ' + majoration diesel 25%' : ''}`,
  }
}
