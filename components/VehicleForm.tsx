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
