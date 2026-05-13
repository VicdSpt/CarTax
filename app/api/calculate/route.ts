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
