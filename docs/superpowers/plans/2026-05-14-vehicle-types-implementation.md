# Vehicle Types Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add support for motos/scooters/quads/trikes, utilitaires (≤3.5T MMA), poids lourds (>3.5T), and oldtimer status (plaque O, 30+ years) to the TaxeCar Brussels tax calculator.

**Architecture:** A new `VehicleType` discriminant is added to `lib/taxes.ts` and threaded through the form, API route, and result display. Tax logic branches on vehicleType before applying existing fuel/CC/kW logic. Oldtimer is an override flag that short-circuits all other logic to flat rates.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4, Jest

---

## Context for implementers

- `lib/taxes.ts` — core tax logic. `calculateTMC`, `calculateTC`, `calculate` are the three exports that need extending.
- `components/VehicleForm.tsx` — form component, exports `VehicleFormData` interface consumed by pages.
- `components/TaxResult.tsx` — result display, receives `TaxResult` from `lib/taxes.ts`.
- `app/api/calculate/route.ts` — POST endpoint: validates body, calls `calculate()`, returns JSON.
- `app/page.tsx` and `app/comparaison/page.tsx` — pass form data to API, render TaxResult.
- Tests live in `__tests__/taxes.test.ts` and `__tests__/api-calculate.test.ts`.
- Run tests: `npm test` (Jest, ~2s). All 23 tests must stay green after each task.

---

## Task 1: Extend `lib/taxes.ts` with vehicle type logic

**Files:**
- Modify: `lib/taxes.ts`
- Modify: `__tests__/taxes.test.ts`

### Step 1.1 — Write failing tests for moto TC

Add to the bottom of `__tests__/taxes.test.ts`:

```typescript
describe('calculateTC — moto', () => {
  it('retourne 0 pour une moto ≤250cc', () => {
    expect(calculateTC({ cc: 125, fuelType: 'gasoline', vehicleType: 'moto' })).toBe(0)
    expect(calculateTC({ cc: 250, fuelType: 'gasoline', vehicleType: 'moto' })).toBe(0)
  })
  it('retourne 73.00 pour une moto >250cc', () => {
    expect(calculateTC({ cc: 600, fuelType: 'gasoline', vehicleType: 'moto' })).toBe(73.00)
    expect(calculateTC({ cc: 1200, fuelType: 'gasoline', vehicleType: 'moto' })).toBe(73.00)
  })
})

describe('calculateTMC — moto', () => {
  it('utilise coefficient 1.0 (comme essence) pour la TMC moto à 120 g/km', () => {
    // 271.40 + (120-101)*8.70 = 436.70 × 1.0 = 436.70
    expect(calculateTMC({ co2: 120, fuelType: 'gasoline', vehicleType: 'moto' })).toBeCloseTo(436.70, 1)
  })
  it('retourne 0 si co2=0 pour une moto', () => {
    expect(calculateTMC({ co2: 0, fuelType: 'gasoline', vehicleType: 'moto' })).toBe(0)
  })
})

describe('calculateTC — utilitaire', () => {
  it('retourne le bon tarif pour chaque tranche MMA', () => {
    expect(calculateTC({ cc: 0, fuelType: 'gasoline', vehicleType: 'utility', mma: 500 })).toBe(46.70)
    expect(calculateTC({ cc: 0, fuelType: 'gasoline', vehicleType: 'utility', mma: 1000 })).toBe(46.70)
    expect(calculateTC({ cc: 0, fuelType: 'gasoline', vehicleType: 'utility', mma: 1001 })).toBe(63.76)
    expect(calculateTC({ cc: 0, fuelType: 'gasoline', vehicleType: 'utility', mma: 1500 })).toBe(63.76)
    expect(calculateTC({ cc: 0, fuelType: 'gasoline', vehicleType: 'utility', mma: 2000 })).toBe(85.01)
    expect(calculateTC({ cc: 0, fuelType: 'gasoline', vehicleType: 'utility', mma: 3500 })).toBe(148.76)
  })
})

describe('calculateTMC — utilitaire', () => {
  it('retourne 0 (exonéré) pour un utilitaire', () => {
    expect(calculateTMC({ co2: 150, fuelType: 'diesel', vehicleType: 'utility' })).toBe(0)
  })
})

describe('calculateTC — poids lourd', () => {
  it('retourne 0 pour un poids lourd (pas de calcul)', () => {
    expect(calculateTC({ cc: 0, fuelType: 'diesel', vehicleType: 'truck' })).toBe(0)
  })
})

describe('calculateTMC — poids lourd', () => {
  it('retourne 0 pour un poids lourd (pas de calcul)', () => {
    expect(calculateTMC({ co2: 200, fuelType: 'diesel', vehicleType: 'truck' })).toBe(0)
  })
})

describe('oldtimer (plaque O)', () => {
  it('retourne TMC forfait 61.50 quel que soit le véhicule', () => {
    expect(calculateTMC({ co2: 200, fuelType: 'gasoline', isOldtimer: true })).toBe(61.50)
    expect(calculateTMC({ co2: 200, fuelType: 'diesel', isOldtimer: true })).toBe(61.50)
    expect(calculateTMC({ co2: 0, fuelType: 'gasoline', vehicleType: 'utility', isOldtimer: true })).toBe(61.50)
  })
  it('retourne TC forfait 43.30 quel que soit le véhicule', () => {
    expect(calculateTC({ cc: 4000, fuelType: 'gasoline', isOldtimer: true })).toBe(43.30)
    expect(calculateTC({ cc: 1600, fuelType: 'diesel', isOldtimer: true })).toBe(43.30)
    expect(calculateTC({ cc: 0, fuelType: 'gasoline', vehicleType: 'utility', mma: 3500, isOldtimer: true })).toBe(43.30)
  })
})
```

- [ ] **Step 1.2 — Run tests to confirm they fail**

```
npm test
```

Expected: ~14 new failures (TypeError: vehicleType not a valid field)

- [ ] **Step 1.3 — Implement the new taxes.ts**

Replace the entire contents of `lib/taxes.ts` with:

```typescript
export type FuelType = 'gasoline' | 'diesel' | 'hybrid' | 'electric'
export type Co2Norm = 'wltp' | 'nedc'
export type VehicleType = 'car' | 'moto' | 'utility' | 'truck'

export interface TMCInput {
  co2: number
  fuelType: FuelType
  co2Norm?: Co2Norm
  vehicleType?: VehicleType  // defaults to 'car'
  isOldtimer?: boolean
}

export interface TCInput {
  cc: number
  fuelType: FuelType
  kw?: number
  vehicleType?: VehicleType  // defaults to 'car'
  mma?: number               // kg, for utility
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
const MOTO_TC_FLAT      = 73.00   // >250cc
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
  if (vehicleType === 'moto') return tmcFromCo2(co2, co2Norm, 'gasoline')
  return tmcFromCo2(co2, co2Norm, fuelType)
}

export function calculateTC({ cc, fuelType, kw, vehicleType = 'car', mma = 0, isOldtimer = false }: TCInput): number {
  if (isOldtimer) return OLDTIMER_TC
  if (vehicleType === 'truck') return 0
  if (vehicleType === 'utility') {
    return UTILITY_TC_RATES.find(([maxMma]) => mma <= maxMma)?.[1] ?? 148.76
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
```

- [ ] **Step 1.4 — Run tests to confirm all pass**

```
npm test
```

Expected: all tests pass (23 existing + ~14 new = ~37 total)

- [ ] **Step 1.5 — Commit**

```bash
git add lib/taxes.ts __tests__/taxes.test.ts
git commit -m "feat: add VehicleType, moto/utility/truck/oldtimer tax logic"
```

---

## Task 2: Update `components/VehicleForm.tsx`

**Files:**
- Modify: `components/VehicleForm.tsx`

The form now has a vehicle type selector at the top. Fields shown depend on `vehicleType`:

| Field | car | moto | utility | truck |
|---|---|---|---|---|
| fuelType | ✓ | ✗ | ✗ | ✗ |
| WLTP/NEDC toggle | ✓ (non-electric) | ✓ | ✗ | ✗ |
| year | ✓ | ✓ | ✓ | ✗ |
| CO₂ | ✓ (non-electric) | ✓ | ✗ | ✗ |
| co2Unknown checkbox | ✓ | ✓ | ✗ | ✗ |
| cc | ✓ (non-electric) | ✓ | ✗ | ✗ |
| kW | ✓ | ✗ | ✗ | ✗ |
| MMA | ✗ | ✗ | ✓ | ✗ |
| Oldtimer checkbox | ✓ (if year ≥30y) | ✓ (if year ≥30y) | ✓ (if year ≥30y) | ✗ |
| Submit button | ✓ | ✓ | ✓ | ✗ |
| Info truck message | ✗ | ✗ | ✗ | ✓ |

- [ ] **Step 2.1 — Replace VehicleForm.tsx entirely**

```tsx
'use client'

import { useState } from 'react'
import type { FuelType, Co2Norm, VehicleType } from '@/lib/taxes'

export interface VehicleFormData {
  vehicleType: VehicleType
  fuelType: FuelType
  year: number
  co2: number
  cc: number
  co2Norm: Co2Norm
  kw: number
  mma: number
  isOldtimer: boolean
}

interface Props {
  onSubmit: (data: VehicleFormData) => void
  loading?: boolean
  accentColor?: 'blue' | 'green'
}

const FUEL_LABELS: Record<FuelType, string> = {
  gasoline: 'Essence',
  diesel: 'Diesel',
  hybrid: 'Hybride',
  electric: 'Électrique',
}

const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  car: 'Voiture',
  moto: 'Moto / Scooter / Quad / Trike',
  utility: 'Utilitaire (≤ 3,5T)',
  truck: 'Poids lourd (> 3,5T)',
}

export default function VehicleForm({ onSubmit, loading, accentColor = 'blue' }: Props) {
  const currentYear = new Date().getFullYear()

  const [form, setForm] = useState<VehicleFormData>({
    vehicleType: 'car',
    fuelType: 'gasoline',
    year: currentYear,
    co2: 0,
    cc: 0,
    co2Norm: 'wltp',
    kw: 0,
    mma: 0,
    isOldtimer: false,
  })
  const [showNormTooltip, setShowNormTooltip] = useState(false)
  const [co2Unknown, setCo2Unknown] = useState(false)

  const accent = accentColor === 'green'
    ? 'bg-emerald-600 hover:bg-emerald-700'
    : 'bg-blue-700 hover:bg-blue-800'

  const years = Array.from({ length: 40 }, (_, i) => currentYear - i)
  const isOldtimerEligible = currentYear - form.year >= 30

  function estimateCo2(cc: number, fuelType: FuelType): number {
    if (cc <= 0) return 0
    return fuelType === 'diesel' ? Math.round(cc / 17) : Math.round(cc / 15)
  }

  function handleVehicleTypeChange(vehicleType: VehicleType) {
    setForm(f => ({ ...f, vehicleType, isOldtimer: false }))
    setCo2Unknown(false)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  const showFuelType = form.vehicleType === 'car'
  const showCo2Norm = (form.vehicleType === 'car' && form.fuelType !== 'electric') || form.vehicleType === 'moto'
  const showCo2 = (form.vehicleType === 'car' && form.fuelType !== 'electric') || form.vehicleType === 'moto'
  const showCc = (form.vehicleType === 'car' && form.fuelType !== 'electric') || form.vehicleType === 'moto'
  const showKw = form.vehicleType === 'car'
  const showMma = form.vehicleType === 'utility'
  const showYear = form.vehicleType !== 'truck'
  const showOldtimer = form.vehicleType !== 'truck' && isOldtimerEligible

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* Vehicle type */}
      <select
        value={form.vehicleType}
        onChange={e => handleVehicleTypeChange(e.target.value as VehicleType)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
      >
        {Object.entries(VEHICLE_TYPE_LABELS).map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>

      {/* Truck: info message only */}
      {form.vehicleType === 'truck' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          <p className="font-medium mb-1">Poids lourd (> 3,5T)</p>
          <p className="text-xs leading-relaxed">
            Le calcul de la taxe de circulation pour les poids lourds dépend du nombre d'essieux et du type de suspension — ces données ne sont pas publiées publiquement.
          </p>
          <a
            href="https://fisc.brussels"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline text-amber-700 hover:text-amber-900 mt-1 inline-block"
          >
            Consultez Bruxelles Fiscalité →
          </a>
        </div>
      )}

      {/* Fuel type (car only) */}
      {showFuelType && (
        <select
          value={form.fuelType}
          onChange={e => {
            const fuelType = e.target.value as FuelType
            setForm(f => ({ ...f, fuelType, ...(co2Unknown ? { co2: estimateCo2(f.cc, fuelType) } : {}) }))
          }}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {Object.entries(FUEL_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      )}

      {/* CO₂ norm toggle */}
      {showCo2Norm && (
        <div className="flex gap-2 items-center">
          <span className="text-xs text-gray-500 whitespace-nowrap">Norme CO₂ :</span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
            {(['wltp', 'nedc'] as Co2Norm[]).map(norm => (
              <button
                key={norm}
                type="button"
                onClick={() => setForm(f => ({ ...f, co2Norm: norm }))}
                className={`px-3 py-1.5 font-medium transition-colors ${
                  form.co2Norm === norm
                    ? `${accent} text-white`
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {norm.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="relative">
            <button
              type="button"
              onMouseEnter={() => setShowNormTooltip(true)}
              onMouseLeave={() => setShowNormTooltip(false)}
              onClick={() => setShowNormTooltip(v => !v)}
              className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 text-xs font-bold hover:bg-gray-300 transition-colors flex items-center justify-center"
              aria-label="Explication WLTP et NEDC"
            >
              ?
            </button>
            {showNormTooltip && (
              <div className="absolute left-0 top-7 z-20 w-72 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-xs text-gray-600 leading-relaxed">
                <p className="font-semibold text-gray-800 mb-2">WLTP vs NEDC — quelle différence ?</p>
                <p className="mb-2">Ce sont deux méthodes de mesure des émissions CO₂ des véhicules.</p>
                <p className="mb-2">
                  <span className="font-medium text-gray-800">WLTP</span> (depuis 2021) — méthode actuelle, plus réaliste.
                </p>
                <p className="mb-2">
                  <span className="font-medium text-gray-800">NEDC</span> (avant 2021) — ancienne méthode, valeurs généralement 15–25% plus basses.
                </p>
                <p className="mb-2">Bruxelles utilise la valeur <span className="font-medium text-gray-800">WLTP</span> depuis le 1er janvier 2021.</p>
                <p className="text-gray-400">💡 Vérifiez la case V7 de votre carte grise.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Year */}
      {showYear && (
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.year}
            onChange={e => setForm(f => ({ ...f, year: Number(e.target.value), isOldtimer: false }))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* CO₂ field */}
          {showCo2 && (
            <input
              type="number"
              placeholder={co2Unknown ? `~${estimateCo2(form.cc, form.fuelType)} g/km (estimé)` : 'CO₂ (g/km)'}
              value={co2Unknown ? '' : (form.co2 || '')}
              onChange={e => setForm(f => ({ ...f, co2: Number(e.target.value) }))}
              min={0}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              disabled={co2Unknown}
            />
          )}

          {/* MMA field */}
          {showMma && (
            <input
              type="number"
              placeholder="MMA (kg)"
              value={form.mma || ''}
              onChange={e => setForm(f => ({ ...f, mma: Number(e.target.value) }))}
              min={0}
              max={3500}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          )}
        </div>
      )}

      {/* CO₂ unknown checkbox */}
      {showCo2 && (
        <label className="flex items-center gap-2 text-xs text-gray-500 -mt-1 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={co2Unknown}
            onChange={e => {
              const checked = e.target.checked
              setCo2Unknown(checked)
              if (checked) setForm(f => ({ ...f, co2: estimateCo2(f.cc, f.fuelType) }))
              else setForm(f => ({ ...f, co2: 0 }))
            }}
            className="rounded"
          />
          CO₂ absent de ma carte grise (véhicule ancien) — estimation depuis la cylindrée
        </label>
      )}

      {co2Unknown && showCo2 && (
        <p className="text-xs text-amber-600 -mt-1">
          ⚠ CO₂ estimé à ~{estimateCo2(form.cc, form.fuelType)} g/km — résultat approximatif.
        </p>
      )}

      {showCo2 && !co2Unknown && (
        <p className="text-xs text-gray-400 -mt-1">
          Valeur case V7 de votre carte grise.{' '}
          <a
            href="https://www.febiac.be/fr/article/ou-trouver-le-taux-de-co2-exact-de-ma-voiture-a-des-fins-fiscales-wltp-ou-nedc"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-gray-600"
          >
            Trouver ma valeur CO₂
          </a>
        </p>
      )}

      {showMma && (
        <p className="text-xs text-gray-400 -mt-1">
          Masse maximale autorisée — case F1 ou F2 de votre carte grise (en kg).
        </p>
      )}

      {/* CC field */}
      {showCc && (
        <>
          <input
            type="number"
            placeholder={form.kw > 0 ? 'Cylindrée ex: 2000 pour 2.0L (optionnel si kW connu)' : 'Cylindrée ex: 2000 pour 2.0L'}
            value={form.cc || ''}
            onChange={e => {
              const cc = Number(e.target.value)
              setForm(f => ({ ...f, cc, ...(co2Unknown ? { co2: estimateCo2(cc, f.fuelType) } : {}) }))
            }}
            min={0}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-400 -mt-1">Valeur case P1 de votre carte grise (en cm³).</p>
        </>
      )}

      {/* kW field (car only) */}
      {showKw && (
        <>
          <input
            type="number"
            placeholder="Puissance (kW)"
            value={form.kw || ''}
            onChange={e => setForm(f => ({ ...f, kw: Number(e.target.value) }))}
            min={0}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <p className="text-xs text-gray-400 -mt-1">
            {form.fuelType === 'electric'
              ? 'Valeur case P2 de votre carte grise (en kW). Utilisé pour calculer la TC.'
              : 'Valeur case P2 de votre carte grise (en kW). Utilisé si la cylindrée est inconnue.'}
          </p>
          {form.fuelType !== 'electric' && form.cc === 0 && form.kw > 0 && (
            <p className="text-xs text-amber-600 -mt-1">
              ⚠ TC calculée depuis les kW — résultat approximatif. Entrez la cylindrée pour plus de précision.
            </p>
          )}
        </>
      )}

      {/* Oldtimer checkbox */}
      {showOldtimer && (
        <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none border border-amber-200 bg-amber-50 rounded-lg px-3 py-2">
          <input
            type="checkbox"
            checked={form.isOldtimer}
            onChange={e => setForm(f => ({ ...f, isOldtimer: e.target.checked }))}
            className="rounded"
          />
          <span>
            <span className="font-medium text-amber-800">Oldtimer — </span>
            immatriculé avec plaque O (≥ 30 ans). TMC : 61,50 € · TC : 43,30 €/an.
          </span>
        </label>
      )}

      {/* Submit */}
      {form.vehicleType !== 'truck' && (
        <button
          type="submit"
          disabled={loading}
          className={`py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${accent}`}
        >
          {loading ? 'Calcul...' : 'Calculer mes taxes'}
        </button>
      )}
    </form>
  )
}
```

- [ ] **Step 2.2 — Run tests**

```
npm test
```

Expected: all tests still pass (no test covers VehicleForm directly).

- [ ] **Step 2.3 — Commit**

```bash
git add components/VehicleForm.tsx
git commit -m "feat: add vehicle type selector, MMA field, oldtimer checkbox to VehicleForm"
```

---

## Task 3: Update `components/TaxResult.tsx` for oldtimer badge

**Files:**
- Modify: `components/TaxResult.tsx`

Add `vehicleType` and `isOldtimer` from the result. Show an oldtimer badge below the amounts when applicable.

- [ ] **Step 3.1 — Replace TaxResult.tsx entirely**

```tsx
'use client'

import { useState } from 'react'
import type { TaxResult as TaxResultType } from '@/lib/taxes'
import { formatEur } from '@/lib/format'

interface Props {
  result: TaxResultType
  vehicleLabel?: string
  accentColor?: 'blue' | 'green'
}

export default function TaxResult({ result, vehicleLabel, accentColor = 'blue' }: Props) {
  const [showDetail, setShowDetail] = useState(false)

  const headerBg = accentColor === 'green'
    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
    : 'bg-blue-50 text-blue-800 border-blue-200'
  const detailBg = accentColor === 'green' ? 'text-emerald-700' : 'text-blue-700'

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {vehicleLabel && (
        <div className={`px-4 py-2 text-sm font-semibold border-b ${headerBg}`}>
          {vehicleLabel}
        </div>
      )}

      <div className="grid grid-cols-2">
        <div className="p-4 border-r border-gray-100">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">TMC</div>
          <div className="text-2xl font-bold text-slate-800">{formatEur(result.tmc)}</div>
          <div className="text-xs text-gray-400 mt-1">Taxe unique d'immatriculation</div>
        </div>
        <div className="p-4">
          <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">TC annuelle</div>
          <div className="text-2xl font-bold text-slate-800">{formatEur(result.tc)}</div>
          <div className="text-xs text-gray-400 mt-1">Par an</div>
        </div>
      </div>

      {result.isOldtimer && (
        <div className="px-4 py-2 bg-amber-50 border-t border-amber-100 text-xs text-amber-700">
          <span className="font-semibold">🏛 Oldtimer (plaque O)</span> — usage restreint : occasionnel, domicile-travail ou rassemblements autorisés. Usage commercial interdit.
        </div>
      )}

      <button
        onClick={() => setShowDetail(v => !v)}
        className="w-full px-4 py-2 text-xs text-gray-500 bg-gray-50 border-t border-gray-100 text-left hover:bg-gray-100 transition-colors"
      >
        {showDetail ? '▲' : '▾'} Détail du calcul
      </button>

      {showDetail && (
        <div className={`px-4 py-3 text-xs space-y-1 bg-gray-50 border-t border-gray-100 ${detailBg}`}>
          <div>• {result.tmcDetail}</div>
          <div>• {result.tcDetail}</div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3.2 — Run tests**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 3.3 — Commit**

```bash
git add components/TaxResult.tsx
git commit -m "feat: add oldtimer badge to TaxResult"
```

---

## Task 4: Update API route and app pages

**Files:**
- Modify: `app/api/calculate/route.ts`
- Modify: `app/page.tsx`
- Modify: `app/comparaison/page.tsx`
- Modify: `__tests__/api-calculate.test.ts`

### Step 4.1 — Update the API route

Replace `app/api/calculate/route.ts` with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { calculate } from '@/lib/taxes'
import type { FuelType, Co2Norm, VehicleType } from '@/lib/taxes'

const VALID_FUEL_TYPES: FuelType[] = ['gasoline', 'diesel', 'hybrid', 'electric']
const VALID_CO2_NORMS: Co2Norm[] = ['wltp', 'nedc']
const VALID_VEHICLE_TYPES: VehicleType[] = ['car', 'moto', 'utility', 'truck']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { co2, cc, fuelType, co2Norm, kw, vehicleType, mma, isOldtimer } = body

    if (
      typeof co2 !== 'number' ||
      typeof cc !== 'number' ||
      !VALID_FUEL_TYPES.includes(fuelType) ||
      (co2Norm !== undefined && !VALID_CO2_NORMS.includes(co2Norm)) ||
      (vehicleType !== undefined && !VALID_VEHICLE_TYPES.includes(vehicleType))
    ) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }

    const result = calculate({
      co2,
      cc,
      fuelType,
      co2Norm: co2Norm ?? 'wltp',
      kw: typeof kw === 'number' ? kw : undefined,
      vehicleType: vehicleType ?? 'car',
      mma: typeof mma === 'number' ? mma : undefined,
      isOldtimer: isOldtimer === true,
    })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
```

- [ ] **Step 4.2 — Add API test for new vehicle types**

Add to `__tests__/api-calculate.test.ts`:

```typescript
it('retourne la TC correcte pour une moto >250cc', async () => {
  const req = makeRequest({ co2: 80, cc: 600, fuelType: 'gasoline', vehicleType: 'moto' })
  const res = await POST(req)
  const data = await res.json()
  expect(res.status).toBe(200)
  expect(data.tc).toBe(73.00)
  expect(data.tmc).toBeCloseTo(calculateTMC({ co2: 80, fuelType: 'gasoline' }), 1)
})

it('retourne TC MMA pour un utilitaire', async () => {
  const req = makeRequest({ co2: 0, cc: 0, fuelType: 'gasoline', vehicleType: 'utility', mma: 2000 })
  const res = await POST(req)
  const data = await res.json()
  expect(res.status).toBe(200)
  expect(data.tc).toBe(85.01)
  expect(data.tmc).toBe(0)
})

it('retourne les forfaits oldtimer', async () => {
  const req = makeRequest({ co2: 200, cc: 4000, fuelType: 'gasoline', isOldtimer: true })
  const res = await POST(req)
  const data = await res.json()
  expect(res.status).toBe(200)
  expect(data.tmc).toBe(61.50)
  expect(data.tc).toBe(43.30)
})
```

Note: `makeRequest` in the test file already constructs a NextRequest from a body object. `calculateTMC` must be imported at the top of the test file — check the existing imports and add it if missing.

- [ ] **Step 4.3 — Run tests**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 4.4 — Update app/page.tsx to pass new fields**

In `app/page.tsx`, update the `handleSubmit` function's fetch body:

```typescript
body: JSON.stringify({
  co2: data.co2,
  cc: data.cc,
  fuelType: data.fuelType,
  co2Norm: data.co2Norm,
  kw: data.kw,
  vehicleType: data.vehicleType,
  mma: data.mma,
  isOldtimer: data.isOldtimer,
}),
```

Also update the vehicleLabel to include vehicle type:

```typescript
const VEHICLE_TYPE_LABELS_SHORT: Record<string, string> = {
  car: 'Voiture',
  moto: 'Moto',
  utility: 'Utilitaire',
  truck: 'Poids lourd',
}
// ...
setVehicleLabel(`${VEHICLE_TYPE_LABELS_SHORT[data.vehicleType] ?? 'Véhicule'} ${data.year}`)
```

- [ ] **Step 4.5 — Update app/comparaison/page.tsx to pass new fields**

Find the fetch call(s) in `app/comparaison/page.tsx` and add the same new fields:

```typescript
body: JSON.stringify({
  co2: data.co2,
  cc: data.cc,
  fuelType: data.fuelType,
  co2Norm: data.co2Norm,
  kw: data.kw,
  vehicleType: data.vehicleType,
  mma: data.mma,
  isOldtimer: data.isOldtimer,
}),
```

- [ ] **Step 4.6 — Run all tests**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 4.7 — Commit**

```bash
git add app/api/calculate/route.ts app/page.tsx app/comparaison/page.tsx __tests__/api-calculate.test.ts
git commit -m "feat: wire vehicleType/mma/isOldtimer through API route and pages"
```

---

## Self-review checklist

**Spec coverage:**
- ✅ VehicleType: car / moto / utility / truck
- ✅ Moto TC: ≤250cc → 0, >250cc → €73
- ✅ Moto TMC: CO₂ formula coefficient 1.0
- ✅ Utility TC: MMA table (6 brackets)
- ✅ Utility TMC: €0
- ✅ Truck: no calculation, info message
- ✅ Oldtimer: checkbox when year ≥30y, TMC €61.50, TC €43.30, badge in TaxResult
- ✅ API route updated
- ✅ Pages updated
- ✅ TDD throughout

**Type consistency check:**
- `VehicleType` exported from `lib/taxes.ts` ✅
- `VehicleFormData` includes `vehicleType`, `mma`, `isOldtimer` ✅
- `TaxResult` includes `vehicleType`, `isOldtimer` ✅
- `TCInput` / `TMCInput` accept `vehicleType`, `mma`, `isOldtimer` with defaults ✅
