'use client'

import { useState } from 'react'
import VehicleForm, { type VehicleFormData } from '@/components/VehicleForm'
import TaxResult from '@/components/TaxResult'
import type { TaxResult as TaxResultType } from '@/lib/taxes'
import { formatEur } from '@/lib/format'

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
  })
  if (!res.ok) throw new Error()
  return res.json()
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
        label: `Véhicule A ${data.year}`,
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
        label: `Véhicule B ${data.year}`,
      })
    } catch {
      setVehicleB(s => ({ ...s, loading: false, error: 'Erreur de calcul.' }))
    }
  }

  const showComparison = vehicleA.result && vehicleB.result
  const savingsTMC = showComparison ? vehicleA.result!.tmc - vehicleB.result!.tmc : 0
  const savingsTC5 = showComparison ? (vehicleA.result!.tc - vehicleB.result!.tc) * 5 : 0
  const totalSavings = savingsTMC + savingsTC5

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
              <div className={`text-lg font-bold ${Math.abs(savingsTMC) > 0 ? (savingsTMC > 0 ? 'text-emerald-600' : 'text-blue-600') : 'text-gray-400'}`}>
                {savingsTMC !== 0 ? (savingsTMC > 0 ? '-' : '+') + formatEur(Math.abs(savingsTMC)) : '='}
              </div>
              <div className="text-xs text-gray-400">pour véhicule B</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Écart TC × 5 ans</div>
              <div className={`text-lg font-bold ${Math.abs(savingsTC5) > 0 ? (savingsTC5 > 0 ? 'text-emerald-600' : 'text-blue-600') : 'text-gray-400'}`}>
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
