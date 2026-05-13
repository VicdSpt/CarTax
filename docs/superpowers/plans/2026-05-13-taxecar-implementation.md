# TaxeCar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire une web app Next.js permettant de calculer la TMC et la taxe de circulation annuelle pour la Région de Bruxelles-Capitale, avec lookup par plaque belge et vue de comparaison de deux véhicules.

**Architecture:** Next.js 14 App Router avec deux pages (calculateur + comparaison), deux API routes (lookup-plate, calculate), et une bibliothèque de calcul isolée dans `lib/taxes.ts`. Aucune base de données — tout est stateless. Le lookup plaque se fait côté serveur via une API tierce (clé en `.env.local`).

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Jest + React Testing Library, déploiement Vercel.

---

## File Map

| Fichier | Rôle |
|---|---|
| `lib/taxes.ts` | Calcul TMC + TC (barèmes Bruxelles 2024) |
| `lib/plate.ts` | Client API lookup plaque belge |
| `app/api/lookup-plate/route.ts` | Route API — recherche par plaque |
| `app/api/calculate/route.ts` | Route API — calcul TMC + TC |
| `components/VehicleForm.tsx` | Formulaire partagé (plaque + champs manuels) |
| `components/TaxResult.tsx` | Affichage résultat TMC + TC |
| `app/page.tsx` | Page calculateur (single véhicule) |
| `app/comparaison/page.tsx` | Page comparaison (2 véhicules) |
| `app/layout.tsx` | Layout global + nav |
| `__tests__/taxes.test.ts` | Tests logique de calcul |
| `__tests__/plate.test.ts` | Tests client plaque (avec mock) |
| `__tests__/api-calculate.test.ts` | Tests route calculate |

---

## Task 1: Scaffold du projet

**Files:**
- Create: `package.json`, toute la structure Next.js
- Create: `.env.local.example`
- Create: `.gitignore`
- Create: `jest.config.ts`

- [ ] **Step 1: Créer le projet Next.js**

```bash
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --eslint
```

Répondre aux prompts : accepter les valeurs par défaut.

- [ ] **Step 2: Installer les dépendances de test**

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom @types/jest ts-jest
```

- [ ] **Step 3: Créer `jest.config.ts`**

```typescript
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
}

export default createJestConfig(config)
```

- [ ] **Step 4: Créer `jest.setup.ts`**

```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Créer `.env.local.example`**

```
PLATE_API_KEY=your_api_key_here
PLATE_API_URL=https://api.vehicleinfo.be/v1
```

- [ ] **Step 6: Mettre à jour `.gitignore`**

Ajouter à la fin du `.gitignore` existant :

```
.env.local
.superpowers/
```

- [ ] **Step 7: Vérifier que le projet démarre**

```bash
npm run dev
```

Ouvrir http://localhost:3000 — la page Next.js par défaut doit s'afficher.

- [ ] **Step 8: Commit**

```bash
git init
git add .
git commit -m "feat: scaffold Next.js project with TypeScript, Tailwind, Jest"
```

---

## Task 2: Logique de calcul des taxes (`lib/taxes.ts`)

**Files:**
- Create: `lib/taxes.ts`
- Create: `__tests__/taxes.test.ts`

### Contexte des barèmes

**Puissance fiscale (CV fiscaux) depuis la cylindrée :**
`cv = Math.max(1, Math.round(cc / 200))`

**TMC Bruxelles-Capitale 2024** (CO₂ en g/km, carburant essence) :
- 0 g/km (électrique) → €0
- 1–100 → €61.50 + (co2 - 1) × €2.10
- 101–145 → €271.40 + (co2 - 101) × €8.70
- 146–195 → €652.20 + (co2 - 146) × €17.40
- 196+ → €1521.20 + (co2 - 196) × €26.20

Coefficients carburant : essence = 1.0, diesel = 1.15, hybride = 0.75, électrique = 0 (exempté).

**TC annuelle Bruxelles 2024** (par CV fiscal) :

| CV | Tarif de base |
|---|---|
| ≤4 | €77.52 |
| 5 | €107.95 |
| 6 | €148.74 |
| 7 | €198.19 |
| 8 | €264.65 |
| 9 | €331.35 |
| 10 | €413.59 |
| 11 | €501.83 |
| 12 | €607.02 |
| 13 | €717.81 |
| 14 | €834.77 |
| 15 | €959.98 |
| 16+ | €959.98 + (cv - 15) × €133.00 |

Diesel : majoration de 25% sur le tarif de base. Électrique : €0.

- [ ] **Step 1: Écrire les tests**

Créer `__tests__/taxes.test.ts` :

```typescript
import { calculateTMC, calculateTC, calculateCV } from '@/lib/taxes'

describe('calculateCV', () => {
  it('retourne 1 pour une cylindrée très petite', () => {
    expect(calculateCV(100)).toBe(1)
  })
  it('retourne 8 pour 1600cc', () => {
    expect(calculateCV(1600)).toBe(8)
  })
  it('retourne 10 pour 1998cc', () => {
    expect(calculateCV(1998)).toBe(10)
  })
})

describe('calculateTMC', () => {
  it('retourne 0 pour un véhicule électrique', () => {
    expect(calculateTMC({ co2: 0, fuelType: 'electric' })).toBe(0)
  })
  it('retourne 0 pour co2=0 même en essence', () => {
    expect(calculateTMC({ co2: 0, fuelType: 'gasoline' })).toBe(0)
  })
  it('calcule correctement pour 120 g/km essence', () => {
    // 271.40 + (120-101) * 8.70 = 271.40 + 165.30 = 436.70
    expect(calculateTMC({ co2: 120, fuelType: 'gasoline' })).toBeCloseTo(436.70, 1)
  })
  it('applique le coefficient diesel (×1.15) pour 120 g/km', () => {
    expect(calculateTMC({ co2: 120, fuelType: 'diesel' })).toBeCloseTo(436.70 * 1.15, 1)
  })
  it('applique le coefficient hybride (×0.75) pour 80 g/km', () => {
    // 61.50 + (80-1) * 2.10 = 61.50 + 165.90 = 227.40
    expect(calculateTMC({ co2: 80, fuelType: 'hybrid' })).toBeCloseTo(227.40 * 0.75, 1)
  })
})

describe('calculateTC', () => {
  it('retourne 0 pour un véhicule électrique', () => {
    expect(calculateTC({ cc: 0, fuelType: 'electric' })).toBe(0)
  })
  it('retourne le tarif ≤4cv pour une petite cylindrée', () => {
    expect(calculateTC({ cc: 600, fuelType: 'gasoline' })).toBe(77.52)
  })
  it('retourne le bon tarif pour 8cv (1600cc essence)', () => {
    expect(calculateTC({ cc: 1600, fuelType: 'gasoline' })).toBe(264.65)
  })
  it('applique la majoration diesel de 25% pour 8cv', () => {
    expect(calculateTC({ cc: 1600, fuelType: 'diesel' })).toBeCloseTo(264.65 * 1.25, 1)
  })
  it('calcule correctement pour plus de 15cv', () => {
    // 16cv : 959.98 + 133.00 = 1092.98
    expect(calculateTC({ cc: 3200, fuelType: 'gasoline' })).toBeCloseTo(1092.98, 1)
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

```bash
npx jest __tests__/taxes.test.ts
```

Attendu : FAIL — `Cannot find module '@/lib/taxes'`

- [ ] **Step 3: Implémenter `lib/taxes.ts`**

```typescript
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
    base = 652.20 + (co2 - 146) * 17.40
  } else {
    base = 1521.20 + (co2 - 196) * 26.20
  }

  return Math.round(base * FUEL_TMC_COEFFICIENT[fuelType] * 100) / 100
}

export function calculateTC({ cc, fuelType }: TCInput): number {
  if (fuelType === 'electric') return 0

  const cv = calculateCV(cc)
  const clampedCV = Math.min(cv, 15)
  const base = cv <= 15
    ? (TC_RATES[clampedCV] ?? TC_RATES[4])
    : 959.98 + (cv - 15) * 133.00

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
```

- [ ] **Step 4: Lancer les tests**

```bash
npx jest __tests__/taxes.test.ts
```

Attendu : PASS — tous les tests verts.

- [ ] **Step 5: Commit**

```bash
git add lib/taxes.ts __tests__/taxes.test.ts
git commit -m "feat: add Brussels TMC and TC calculation logic with tests"
```

---

## Task 3: Client lookup plaque (`lib/plate.ts`)

**Files:**
- Create: `lib/plate.ts`
- Create: `__tests__/plate.test.ts`

- [ ] **Step 1: Écrire les tests**

Créer `__tests__/plate.test.ts` :

```typescript
import { lookupPlate, PlateError } from '@/lib/plate'

global.fetch = jest.fn()

const mockFetch = global.fetch as jest.Mock

describe('lookupPlate', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    process.env.PLATE_API_KEY = 'test-key'
    process.env.PLATE_API_URL = 'https://api.example.com/v1'
  })

  it('retourne les données du véhicule pour une plaque valide', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        make: 'Volkswagen',
        model: 'Golf',
        year: 2019,
        fuelType: 'gasoline',
        co2: 120,
        cc: 1598,
      }),
    })

    const result = await lookupPlate('1-ABC-123')
    expect(result).toEqual({
      make: 'Volkswagen',
      model: 'Golf',
      year: 2019,
      fuelType: 'gasoline',
      co2: 120,
      cc: 1598,
    })
  })

  it('lance PlateError si la plaque est introuvable (404)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    await expect(lookupPlate('9-ZZZ-999')).rejects.toThrow(PlateError)
  })

  it('lance PlateError si l\'API est down', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    await expect(lookupPlate('1-ABC-123')).rejects.toThrow(PlateError)
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

```bash
npx jest __tests__/plate.test.ts
```

Attendu : FAIL — `Cannot find module '@/lib/plate'`

- [ ] **Step 3: Implémenter `lib/plate.ts`**

```typescript
import type { FuelType } from './taxes'

export interface VehicleData {
  make: string
  model: string
  year: number
  fuelType: FuelType
  co2: number
  cc: number
}

export class PlateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlateError'
  }
}

export async function lookupPlate(plate: string): Promise<VehicleData> {
  const apiKey = process.env.PLATE_API_KEY
  const apiUrl = process.env.PLATE_API_URL

  if (!apiKey || !apiUrl) {
    throw new PlateError('API configuration manquante')
  }

  const normalizedPlate = plate.replace(/\s+/g, '').toUpperCase()

  try {
    const response = await fetch(`${apiUrl}/vehicles/${encodeURIComponent(normalizedPlate)}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new PlateError(`Plaque introuvable (HTTP ${response.status})`)
    }

    const data = await response.json()
    return data as VehicleData
  } catch (err) {
    if (err instanceof PlateError) throw err
    throw new PlateError('Impossible de contacter le service de lookup')
  }
}
```

- [ ] **Step 4: Lancer les tests**

```bash
npx jest __tests__/plate.test.ts
```

Attendu : PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/plate.ts __tests__/plate.test.ts
git commit -m "feat: add Belgian license plate lookup client with error handling"
```

---

## Task 4: API Routes

**Files:**
- Create: `app/api/lookup-plate/route.ts`
- Create: `app/api/calculate/route.ts`
- Create: `__tests__/api-calculate.test.ts`

- [ ] **Step 1: Écrire les tests pour la route calculate**

Créer `__tests__/api-calculate.test.ts` :

```typescript
import { POST } from '@/app/api/calculate/route'
import { NextRequest } from 'next/server'

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/calculate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/calculate', () => {
  it('retourne TMC et TC pour un véhicule essence valide', async () => {
    const req = makeRequest({ co2: 120, cc: 1600, fuelType: 'gasoline' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveProperty('tmc')
    expect(data).toHaveProperty('tc')
    expect(data).toHaveProperty('cv')
    expect(typeof data.tmc).toBe('number')
    expect(typeof data.tc).toBe('number')
  })

  it('retourne 0 pour un véhicule électrique', async () => {
    const req = makeRequest({ co2: 0, cc: 0, fuelType: 'electric' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.tmc).toBe(0)
    expect(data.tc).toBe(0)
  })

  it('retourne 400 si le body est invalide', async () => {
    const req = makeRequest({ co2: 'wrong' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

```bash
npx jest __tests__/api-calculate.test.ts
```

Attendu : FAIL.

- [ ] **Step 3: Implémenter `app/api/calculate/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { calculate } from '@/lib/taxes'
import type { FuelType } from '@/lib/taxes'

const VALID_FUEL_TYPES: FuelType[] = ['gasoline', 'diesel', 'hybrid', 'electric']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { co2, cc, fuelType } = body

    if (
      typeof co2 !== 'number' ||
      typeof cc !== 'number' ||
      !VALID_FUEL_TYPES.includes(fuelType)
    ) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }

    const result = calculate({ co2, cc, fuelType })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Implémenter `app/api/lookup-plate/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { lookupPlate, PlateError } from '@/lib/plate'

export async function GET(req: NextRequest) {
  const plate = req.nextUrl.searchParams.get('plate')

  if (!plate || plate.trim().length < 4) {
    return NextResponse.json({ error: 'Plaque invalide' }, { status: 400 })
  }

  try {
    const vehicleData = await lookupPlate(plate.trim())
    return NextResponse.json(vehicleData)
  } catch (err) {
    if (err instanceof PlateError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Lancer les tests**

```bash
npx jest __tests__/api-calculate.test.ts
```

Attendu : PASS.

- [ ] **Step 6: Commit**

```bash
git add app/api/calculate/route.ts app/api/lookup-plate/route.ts __tests__/api-calculate.test.ts
git commit -m "feat: add calculate and lookup-plate API routes"
```

---

## Task 5: Composant `VehicleForm`

**Files:**
- Create: `components/VehicleForm.tsx`

Ce composant gère les deux modes de saisie : plaque (lookup automatique) et champs manuels.

- [ ] **Step 1: Créer `components/VehicleForm.tsx`**

```typescript
'use client'

import { useState } from 'react'
import type { FuelType } from '@/lib/taxes'

export interface VehicleFormData {
  fuelType: FuelType
  year: number
  co2: number
  cc: number
  make?: string
  model?: string
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

export default function VehicleForm({ onSubmit, loading, accentColor = 'blue' }: Props) {
  const [plate, setPlate] = useState('')
  const [plateLoading, setPlateLoading] = useState(false)
  const [plateError, setPlateError] = useState('')
  const [form, setForm] = useState<VehicleFormData>({
    fuelType: 'gasoline',
    year: new Date().getFullYear(),
    co2: 0,
    cc: 0,
  })

  const accent = accentColor === 'green'
    ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600'
    : 'bg-blue-700 hover:bg-blue-800 border-blue-700'

  async function handlePlateSearch() {
    if (!plate.trim()) return
    setPlateLoading(true)
    setPlateError('')
    try {
      const res = await fetch(`/api/lookup-plate?plate=${encodeURIComponent(plate.trim())}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setForm({
        fuelType: data.fuelType,
        year: data.year,
        co2: data.co2,
        cc: data.cc,
        make: data.make,
        model: data.model,
      })
    } catch {
      setPlateError('Plaque introuvable — remplis le formulaire manuellement.')
    } finally {
      setPlateLoading(false)
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 40 }, (_, i) => currentYear - i)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {/* Plaque */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Plaque belge (ex: 1-ABC-123)"
          value={plate}
          onChange={e => setPlate(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="button"
          onClick={handlePlateSearch}
          disabled={plateLoading || !plate.trim()}
          className={`px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${accent}`}
        >
          {plateLoading ? '...' : 'Rechercher'}
        </button>
      </div>

      {plateError && (
        <p className="text-sm text-amber-600">{plateError}</p>
      )}

      {form.make && (
        <p className="text-sm text-emerald-700 font-medium">
          ✓ {form.make} {form.model} {form.year}
        </p>
      )}

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <div className="flex-1 h-px bg-gray-200" />
        ou saisir manuellement
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Carburant */}
      <select
        value={form.fuelType}
        onChange={e => setForm(f => ({ ...f, fuelType: e.target.value as FuelType }))}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
      >
        {Object.entries(FUEL_LABELS).map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>

      {/* Année + CO2 */}
      <div className="grid grid-cols-2 gap-2">
        <select
          value={form.year}
          onChange={e => setForm(f => ({ ...f, year: Number(e.target.value) }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <input
          type="number"
          placeholder="CO₂ (g/km)"
          value={form.co2 || ''}
          onChange={e => setForm(f => ({ ...f, co2: Number(e.target.value) }))}
          min={0}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          disabled={form.fuelType === 'electric'}
        />
      </div>

      {/* Cylindrée */}
      <input
        type="number"
        placeholder="Cylindrée (cc)"
        value={form.cc || ''}
        onChange={e => setForm(f => ({ ...f, cc: Number(e.target.value) }))}
        min={0}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        disabled={form.fuelType === 'electric'}
      />

      <button
        type="submit"
        disabled={loading}
        className={`py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${accent}`}
      >
        {loading ? 'Calcul...' : 'Calculer mes taxes'}
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/VehicleForm.tsx
git commit -m "feat: add VehicleForm component with plate lookup and manual input"
```

---

## Task 6: Composant `TaxResult`

**Files:**
- Create: `components/TaxResult.tsx`

- [ ] **Step 1: Créer `components/TaxResult.tsx`**

```typescript
'use client'

import { useState } from 'react'
import type { TaxResult as TaxResultType } from '@/lib/taxes'

interface Props {
  result: TaxResultType
  vehicleLabel?: string
  accentColor?: 'blue' | 'green'
}

function formatEur(amount: number) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

export default function TaxResult({ result, vehicleLabel, accentColor = 'blue' }: Props) {
  const [showDetail, setShowDetail] = useState(false)

  const headerBg = accentColor === 'green' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-blue-50 text-blue-800 border-blue-200'
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

- [ ] **Step 2: Commit**

```bash
git add components/TaxResult.tsx
git commit -m "feat: add TaxResult component with expandable detail"
```

---

## Task 7: Layout global + page calculateur

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Mettre à jour `app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Link from 'next/link'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TaxeCar — Calculateur de taxes auto Bruxelles',
  description: 'Calculez votre TMC et taxe de circulation pour la Région de Bruxelles-Capitale',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-6">
            <Link href="/" className="font-bold text-blue-700 text-lg">🚗 TaxeCar</Link>
            <div className="flex gap-2 ml-auto">
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Calculateur
              </Link>
              <Link
                href="/comparaison"
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Comparaison
              </Link>
            </div>
          </div>
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Remplacer `app/globals.css`**

Garder seulement les directives Tailwind :

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: Remplacer `app/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import VehicleForm, { type VehicleFormData } from '@/components/VehicleForm'
import TaxResult from '@/components/TaxResult'
import type { TaxResult as TaxResultType } from '@/lib/taxes'

export default function CalculatorPage() {
  const [result, setResult] = useState<TaxResultType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [vehicleLabel, setVehicleLabel] = useState('')

  async function handleSubmit(data: VehicleFormData) {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ co2: data.co2, cc: data.cc, fuelType: data.fuelType }),
      })
      if (!res.ok) throw new Error()
      const json = await res.json()
      setResult(json)
      setVehicleLabel(
        data.make ? `${data.make} ${data.model} ${data.year}` : `Véhicule ${data.year}`
      )
    } catch {
      setError('Erreur lors du calcul. Vérifie les valeurs saisies.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Calculez vos taxes auto à Bruxelles
        </h1>
        <p className="text-gray-500 text-sm">
          TMC (mise en circulation) + Taxe de circulation annuelle — Région de Bruxelles-Capitale
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <VehicleForm onSubmit={handleSubmit} loading={loading} />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-6">
          {error}
        </div>
      )}

      {result && (
        <TaxResult result={result} vehicleLabel={vehicleLabel} accentColor="blue" />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Vérifier visuellement**

```bash
npm run dev
```

Ouvrir http://localhost:3000 — tester un calcul manuel (ex: essence, 120 g/km, 1600 cc). Le résultat doit s'afficher. Tester le détail accordéon.

- [ ] **Step 5: Commit**

```bash
git add app/layout.tsx app/page.tsx app/globals.css
git commit -m "feat: add calculator page with layout and nav"
```

---

## Task 8: Page comparaison

**Files:**
- Create: `app/comparaison/page.tsx`

- [ ] **Step 1: Créer `app/comparaison/page.tsx`**

```typescript
'use client'

import { useState } from 'react'
import VehicleForm, { type VehicleFormData } from '@/components/VehicleForm'
import TaxResult from '@/components/TaxResult'
import type { TaxResult as TaxResultType } from '@/lib/taxes'

interface VehicleState {
  result: TaxResultType | null
  loading: boolean
  error: string
  label: string
}

const initialState: VehicleState = { result: null, loading: false, error: '', label: '' }

async function fetchTaxes(data: VehicleFormData): Promise<TaxResultType> {
  const res = await fetch('/api/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ co2: data.co2, cc: data.cc, fuelType: data.fuelType }),
  })
  if (!res.ok) throw new Error()
  return res.json()
}

function formatEur(amount: number) {
  return new Intl.NumberFormat('fr-BE', { style: 'currency', currency: 'EUR' }).format(amount)
}

export default function ComparaisonPage() {
  const [vehicleA, setVehicleA] = useState<VehicleState>(initialState)
  const [vehicleB, setVehicleB] = useState<VehicleState>(initialState)

  async function handleSubmitA(data: VehicleFormData) {
    setVehicleA(s => ({ ...s, loading: true, error: '' }))
    try {
      const result = await fetchTaxes(data)
      setVehicleA({
        result,
        loading: false,
        error: '',
        label: data.make ? `${data.make} ${data.model} ${data.year}` : `Véhicule A ${data.year}`,
      })
    } catch {
      setVehicleA(s => ({ ...s, loading: false, error: 'Erreur de calcul.' }))
    }
  }

  async function handleSubmitB(data: VehicleFormData) {
    setVehicleB(s => ({ ...s, loading: true, error: '' }))
    try {
      const result = await fetchTaxes(data)
      setVehicleB({
        result,
        loading: false,
        error: '',
        label: data.make ? `${data.make} ${data.model} ${data.year}` : `Véhicule B ${data.year}`,
      })
    } catch {
      setVehicleB(s => ({ ...s, loading: false, error: 'Erreur de calcul.' }))
    }
  }

  const showComparison = vehicleA.result && vehicleB.result
  const savingsTMC = showComparison ? vehicleA.result!.tmc - vehicleB.result!.tmc : 0
  const savingsTC5 = showComparison ? (vehicleA.result!.tc - vehicleB.result!.tc) * 5 : 0
  const totalSavings = savingsTMC + savingsTC5
  const cheaperIsB = totalSavings > 0

  return (
    <div>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Comparer deux véhicules</h1>
        <p className="text-gray-500 text-sm">
          Calculez et comparez les taxes des deux véhicules côte à côte
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Véhicule A */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-blue-600" />
            <span className="font-semibold text-slate-700">Véhicule A</span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border-2 border-blue-200 p-5 mb-4">
            <VehicleForm onSubmit={handleSubmitA} loading={vehicleA.loading} accentColor="blue" />
          </div>
          {vehicleA.error && (
            <p className="text-sm text-red-600 mb-3">{vehicleA.error}</p>
          )}
          {vehicleA.result && (
            <TaxResult result={vehicleA.result} vehicleLabel={vehicleA.label} accentColor="blue" />
          )}
        </div>

        {/* Véhicule B */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-emerald-600" />
            <span className="font-semibold text-slate-700">Véhicule B</span>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border-2 border-emerald-200 p-5 mb-4">
            <VehicleForm onSubmit={handleSubmitB} loading={vehicleB.loading} accentColor="green" />
          </div>
          {vehicleB.error && (
            <p className="text-sm text-red-600 mb-3">{vehicleB.error}</p>
          )}
          {vehicleB.result && (
            <TaxResult result={vehicleB.result} vehicleLabel={vehicleB.label} accentColor="green" />
          )}
        </div>
      </div>

      {/* Bilan comparatif */}
      {showComparison && (
        <div className="mt-8 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 font-semibold text-slate-700 text-sm">
            ⚖️ Bilan comparatif (sur 5 ans)
          </div>
          <div className="p-5 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xs text-gray-500 mb-1">Écart TMC</div>
              <div className={`text-lg font-bold ${Math.abs(savingsTMC) > 0 ? (cheaperIsB ? 'text-emerald-600' : 'text-blue-600') : 'text-gray-400'}`}>
                {savingsTMC !== 0 ? (savingsTMC > 0 ? '-' : '+') + formatEur(Math.abs(savingsTMC)) : '='}
              </div>
              <div className="text-xs text-gray-400">pour véhicule B</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Écart TC × 5 ans</div>
              <div className={`text-lg font-bold ${Math.abs(savingsTC5) > 0 ? (cheaperIsB ? 'text-emerald-600' : 'text-blue-600') : 'text-gray-400'}`}>
                {savingsTC5 !== 0 ? (savingsTC5 > 0 ? '-' : '+') + formatEur(Math.abs(savingsTC5)) : '='}
              </div>
              <div className="text-xs text-gray-400">pour véhicule B</div>
            </div>
            <div className="border-l border-gray-100 pl-4">
              <div className="text-xs text-gray-500 mb-1">Économie totale</div>
              <div className={`text-2xl font-bold ${totalSavings > 0 ? 'text-emerald-600' : totalSavings < 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                {totalSavings === 0 ? '=' : formatEur(Math.abs(totalSavings))}
              </div>
              <div className="text-xs text-gray-400">
                {totalSavings > 0 ? 'en faveur de B' : totalSavings < 0 ? 'en faveur de A' : 'identiques'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Vérifier visuellement**

```bash
npm run dev
```

Ouvrir http://localhost:3000/comparaison. Calculer deux véhicules différents (ex: essence 120g/km vs électrique). Le bilan comparatif doit apparaître en bas.

- [ ] **Step 3: Commit**

```bash
git add app/comparaison/page.tsx
git commit -m "feat: add vehicle comparison page with 5-year savings summary"
```

---

## Task 9: Active nav links + polish final

**Files:**
- Create: `components/NavLink.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Créer `components/NavLink.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  href: string
  children: React.ReactNode
}

export default function NavLink({ href, children }: Props) {
  const pathname = usePathname()
  const active = pathname === href

  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-700 text-white'
          : 'text-gray-600 hover:bg-gray-100'
      }`}
    >
      {children}
    </Link>
  )
}
```

- [ ] **Step 2: Mettre à jour `app/layout.tsx`** pour utiliser `NavLink`

Remplacer les deux `<Link>` dans la nav par :

```typescript
import NavLink from '@/components/NavLink'

// Dans le JSX, remplacer :
<NavLink href="/">Calculateur</NavLink>
<NavLink href="/comparaison">Comparaison</NavLink>
```

- [ ] **Step 3: Vérifier que le lien actif est bien mis en évidence**

Naviguer entre les deux pages — le lien actif doit avoir le fond bleu.

- [ ] **Step 4: Lancer tous les tests**

```bash
npx jest
```

Attendu : PASS sur tous les tests.

- [ ] **Step 5: Build de production**

```bash
npm run build
```

Attendu : compilation sans erreurs TypeScript ni ESLint.

- [ ] **Step 6: Commit final**

```bash
git add components/NavLink.tsx app/layout.tsx
git commit -m "feat: add active nav link component, complete TaxeCar MVP"
```

---

## Self-Review

**Couverture spec :**
- ✅ TMC + TC calculés (Task 2)
- ✅ Lookup par plaque (Task 3 + 4)
- ✅ Saisie manuelle (Task 5)
- ✅ Fallback silencieux si plaque introuvable (Task 3 + 5)
- ✅ Vue comparaison 2 véhicules (Task 8)
- ✅ Bilan comparatif 5 ans (Task 8)
- ✅ Responsive Tailwind (all tasks)
- ✅ Nav avec deux onglets (Task 7 + 9)

**Placeholder scan :** Aucun TBD ou TODO dans le plan.

**Cohérence des types :**
- `FuelType` défini dans `lib/taxes.ts`, importé dans `lib/plate.ts`, `components/VehicleForm.tsx`, routes API — ✅ cohérent.
- `TaxResult` (type) exporté depuis `lib/taxes.ts`, utilisé dans `TaxResult.tsx` et les pages — ✅ cohérent.
- `calculate()` dans `lib/taxes.ts` retourne `TaxResult` utilisé dans `app/api/calculate/route.ts` — ✅ cohérent.
