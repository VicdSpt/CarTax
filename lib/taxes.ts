export type FuelType = 'gasoline' | 'diesel' | 'hybrid' | 'electric'
export type Co2Norm = 'wltp' | 'nedc'
export type VehicleType = 'car' | 'moto' | 'utility' | 'truck'

export interface TMCInput {
  co2: number
  fuelType: FuelType
  co2Norm?: Co2Norm
  vehicleType?: VehicleType
  isOldtimer?: boolean
}

export interface TCInput {
  cc: number
  fuelType: FuelType
  kw?: number
  vehicleType?: VehicleType
  mma?: number
  isOldtimer?: boolean
}

export interface TaxResult {
  tmc: number
  tc: number
  cv: number
  tmcDetail: string
  tcDetail: string
  vehicleType: VehicleType
  isOldtimer: boolean
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

// Brussels 2026 flat rates (indexed annually)
const ELECTRIC_TMC_FLAT = 74.29
const ELECTRIC_TC_FLAT  = 102.96
const MOTO_TC_FLAT      = 73.00
const OLDTIMER_TMC      = 61.50
const OLDTIMER_TC       = 43.30

// [maxMma (inclusive), annualRate]
const UTILITY_TC_RATES: [number, number][] = [
  [1000, 46.70],
  [1500, 63.76],
  [2000, 85.01],
  [2500, 106.26],
  [3000, 127.51],
  [3500, 148.76],
]

const FUEL_TMC_COEFFICIENT: Record<FuelType, number> = {
  gasoline: 1.0,
  diesel: 1.15,
  hybrid: 0.75,
  electric: 0,
}

export function calculateCV(cc: number): number {
  return Math.max(1, Math.round(cc / 200))
}

function tmcFromCo2(co2: number, co2Norm: Co2Norm, fuelType: FuelType): number {
  if (co2 === 0) return 0
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

export function calculateTMC({ co2, fuelType, co2Norm = 'wltp', vehicleType = 'car', isOldtimer = false }: TMCInput): number {
  if (isOldtimer) return OLDTIMER_TMC
  if (vehicleType === 'truck' || vehicleType === 'utility') return 0
  if (fuelType === 'electric') return ELECTRIC_TMC_FLAT
  // Motos always use the gasoline coefficient (1.0) per Brussels TMC rules
  if (vehicleType === 'moto') return tmcFromCo2(co2, co2Norm, 'gasoline')
  return tmcFromCo2(co2, co2Norm, fuelType)
}

export function calculateTC({ cc, fuelType, kw, vehicleType = 'car', mma = 0, isOldtimer = false }: TCInput): number {
  if (isOldtimer) return OLDTIMER_TC
  if (vehicleType === 'truck') return 0
  if (vehicleType === 'utility') {
    return UTILITY_TC_RATES.find(([maxMma]) => mma <= maxMma)?.[1] ?? UTILITY_TC_RATES.at(-1)![1]
  }
  if (vehicleType === 'moto') {
    return cc <= 250 ? 0 : MOTO_TC_FLAT
  }
  // car
  if (fuelType === 'electric') return ELECTRIC_TC_FLAT
  let cv: number
  if (cc > 0) {
    cv = calculateCV(cc)
  } else if (kw && kw > 0) {
    cv = Math.max(1, Math.round(kw / 5.5))
  } else {
    return TC_RATES[4]
  }
  const base = cv > 15 ? 959.98 + (cv - 15) * 133.00 : TC_RATES[Math.max(4, cv)]
  const dieselMultiplier = fuelType === 'diesel' ? 1.25 : 1.0
  return Math.round(base * dieselMultiplier * 100) / 100
}

export function calculate(input: {
  co2: number
  cc: number
  fuelType: FuelType
  co2Norm?: Co2Norm
  kw?: number
  vehicleType?: VehicleType
  mma?: number
  isOldtimer?: boolean
}): TaxResult {
  const vehicleType = input.vehicleType ?? 'car'
  const isOldtimer = input.isOldtimer ?? false
  const co2Norm = input.co2Norm ?? 'wltp'

  const usedKwFallback = vehicleType === 'car'
    && input.fuelType !== 'electric'
    && !input.cc
    && !!input.kw

  const cv = (vehicleType !== 'car' || input.fuelType === 'electric')
    ? 0
    : input.cc > 0
      ? calculateCV(input.cc)
      : input.kw
        ? Math.max(1, Math.round(input.kw / 5.5))
        : 0

  const tmc = calculateTMC({ co2: input.co2, fuelType: input.fuelType, co2Norm, vehicleType, isOldtimer })
  const tc  = calculateTC({ cc: input.cc, fuelType: input.fuelType, kw: input.kw, vehicleType, mma: input.mma, isOldtimer })

  const normLabel = co2Norm === 'nedc' ? ' (NEDC→WLTP ×1.21)' : ''
  let tmcDetail: string
  let tcDetail: string

  if (isOldtimer) {
    tmcDetail = `Forfait oldtimer Bruxelles (plaque O)`
    tcDetail  = `Forfait oldtimer Bruxelles (plaque O)`
  } else if (vehicleType === 'truck') {
    tmcDetail = `Poids lourd — consultez Bruxelles Fiscalité`
    tcDetail  = `Poids lourd — consultez Bruxelles Fiscalité`
  } else if (vehicleType === 'utility') {
    tmcDetail = `Utilitaire — TMC exonérée`
    tcDetail  = `Basé sur MMA ${input.mma ?? 0} kg`
  } else if (vehicleType === 'moto') {
    tmcDetail = input.co2 > 0
      ? `Basé sur ${input.co2} g/km CO₂${normLabel}, coefficient 1.0`
      : `CO₂ non disponible — TMC = 0`
    tcDetail  = input.cc <= 250 ? `Moto ≤250cc — TC exonérée` : `Forfait moto Bruxelles 2026`
  } else if (input.fuelType === 'electric') {
    tmcDetail = `Forfait électrique Bruxelles (montant minimum indexé)`
    tcDetail  = `Forfait électrique plafonné Bruxelles 2026`
  } else {
    tmcDetail = `Basé sur ${input.co2} g/km CO₂${normLabel}, coefficient ${FUEL_TMC_COEFFICIENT[input.fuelType]}`
    tcDetail  = usedKwFallback
      ? `~${cv} CV fiscaux (estimé depuis ${input.kw} kW — résultat approximatif)`
      : `${cv} CV fiscaux (${input.cc} cc)${input.fuelType === 'diesel' ? ' + majoration diesel 25%' : ''}`
  }

  return { tmc, tc, cv, tmcDetail, tcDetail, vehicleType, isOldtimer }
}
