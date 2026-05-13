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
