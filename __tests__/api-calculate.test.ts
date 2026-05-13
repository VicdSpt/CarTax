/**
 * @jest-environment node
 */
import { POST } from '@/app/api/calculate/route'
import { NextRequest } from 'next/server'

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/calculate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/calculate', () => {
  it('retourne TMC et TC pour un véhicule essence valide', async () => {
    const req = makeRequest({ co2: 120, cc: 1600, fuelType: 'gasoline' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveProperty('tmc')
    expect(data).toHaveProperty('tc')
    expect(data).toHaveProperty('cv')
    expect(typeof data.tmc).toBe('number')
    expect(typeof data.tc).toBe('number')
  })

  it('retourne les forfaits Bruxelles pour un véhicule électrique', async () => {
    const req = makeRequest({ co2: 0, cc: 0, fuelType: 'electric' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.tmc).toBe(74.29)  // forfait minimum TMC électrique Bruxelles 2026
    expect(data.tc).toBe(102.96)  // forfait plafonné TC électrique Bruxelles 2026
  })

  it('retourne 400 si le body est invalide', async () => {
    const req = makeRequest({ co2: 'wrong' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('retourne la TC correcte pour une moto >250cc', async () => {
    const req = makeRequest({ co2: 80, cc: 600, fuelType: 'gasoline', vehicleType: 'moto' })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.tc).toBe(73.00)
  })

  it('retourne TC MMA pour un utilitaire', async () => {
    const req = makeRequest({ co2: 0, cc: 0, fuelType: 'gasoline', vehicleType: 'utility', mma: 2000 })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.tc).toBe(85.01)
    expect(data.tmc).toBe(0)
  })

  it('retourne les forfaits oldtimer', async () => {
    const req = makeRequest({ co2: 200, cc: 4000, fuelType: 'gasoline', isOldtimer: true })
    const res = await POST(req)
    const data = await res.json()
    expect(res.status).toBe(200)
    expect(data.tmc).toBe(61.50)
    expect(data.tc).toBe(43.30)
  })
})
