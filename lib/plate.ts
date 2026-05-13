import type { FuelType } from './taxes'

export interface VehicleData {
  make: string
  model: string
  year: number
  fuelType: FuelType
  co2: number
  cc: number
}

export class PlateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PlateError'
  }
}

export async function lookupPlate(plate: string): Promise<VehicleData> {
  const apiKey = process.env.PLATE_API_KEY
  const apiUrl = process.env.PLATE_API_URL

  if (!apiKey || !apiUrl) {
    throw new PlateError('API configuration manquante')
  }

  const normalizedPlate = plate.replace(/\s+/g, '').toUpperCase()

  try {
    const response = await fetch(`${apiUrl}/vehicles/${encodeURIComponent(normalizedPlate)}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new PlateError(`Plaque introuvable (HTTP ${response.status})`)
    }

    const data = await response.json()
    return data as VehicleData
  } catch (err) {
    if (err instanceof PlateError) throw err
    throw new PlateError('Impossible de contacter le service de lookup')
  }
}
