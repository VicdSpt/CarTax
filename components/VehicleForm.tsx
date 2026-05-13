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
          <p className="font-medium mb-1">Poids lourd ({'>'} 3,5T)</p>
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
