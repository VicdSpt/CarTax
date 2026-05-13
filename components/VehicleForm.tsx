'use client'

import { useState } from 'react'
import type { FuelType, Co2Norm } from '@/lib/taxes'

export interface VehicleFormData {
  fuelType: FuelType
  year: number
  co2: number
  cc: number
  co2Norm: Co2Norm
  kw: number
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
  const [form, setForm] = useState<VehicleFormData>({
    fuelType: 'gasoline',
    year: new Date().getFullYear(),
    co2: 0,
    cc: 0,
    co2Norm: 'wltp',
    kw: 0,
  })

  const accent = accentColor === 'green'
    ? 'bg-emerald-600 hover:bg-emerald-700'
    : 'bg-blue-700 hover:bg-blue-800'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 40 }, (_, i) => currentYear - i)

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <select
        value={form.fuelType}
        onChange={e => setForm(f => ({ ...f, fuelType: e.target.value as FuelType }))}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
      >
        {Object.entries(FUEL_LABELS).map(([val, label]) => (
          <option key={val} value={val}>{label}</option>
        ))}
      </select>

      {form.fuelType !== 'electric' && (
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
        </div>
      )}

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

      {form.fuelType !== 'electric' && (
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

      <input
        type="number"
        placeholder={form.kw > 0 ? 'Cylindrée (cc) — optionnel si kW connu' : 'Cylindrée (cc)'}
        value={form.cc || ''}
        onChange={e => setForm(f => ({ ...f, cc: Number(e.target.value) }))}
        min={0}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        disabled={form.fuelType === 'electric'}
      />

      {form.fuelType !== 'electric' && (
        <p className="text-xs text-gray-400 -mt-1">
          Valeur case P1 de votre carte grise (en cm³).
        </p>
      )}

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
