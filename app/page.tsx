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
      setVehicleLabel(`Véhicule ${data.year}`)
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
