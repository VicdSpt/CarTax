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
