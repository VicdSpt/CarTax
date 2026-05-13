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
