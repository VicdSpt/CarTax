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
})
