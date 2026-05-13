import { NextRequest, NextResponse } from 'next/server'
import { calculate } from '@/lib/taxes'
import type { FuelType, Co2Norm } from '@/lib/taxes'

const VALID_FUEL_TYPES: FuelType[] = ['gasoline', 'diesel', 'hybrid', 'electric']
const VALID_CO2_NORMS: Co2Norm[] = ['wltp', 'nedc']

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { co2, cc, fuelType, co2Norm, kw } = body

    if (
      typeof co2 !== 'number' ||
      typeof cc !== 'number' ||
      !VALID_FUEL_TYPES.includes(fuelType) ||
      (co2Norm !== undefined && !VALID_CO2_NORMS.includes(co2Norm))
    ) {
      return NextResponse.json({ error: 'Paramètres invalides' }, { status: 400 })
    }

    const result = calculate({
      co2,
      cc,
      fuelType,
      co2Norm: co2Norm ?? 'wltp',
      kw: typeof kw === 'number' ? kw : undefined,
    })
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
