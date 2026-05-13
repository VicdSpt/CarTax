import { lookupPlate, PlateError } from '@/lib/plate'

global.fetch = jest.fn()

const mockFetch = global.fetch as jest.Mock

describe('lookupPlate', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    process.env.PLATE_API_KEY = 'test-key'
    process.env.PLATE_API_URL = 'https://api.example.com/v1'
  })

  it('retourne les données du véhicule pour une plaque valide', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        make: 'Volkswagen',
        model: 'Golf',
        year: 2019,
        fuelType: 'gasoline',
        co2: 120,
        cc: 1598,
      }),
    })

    const result = await lookupPlate('1-ABC-123')
    expect(result).toEqual({
      make: 'Volkswagen',
      model: 'Golf',
      year: 2019,
      fuelType: 'gasoline',
      co2: 120,
      cc: 1598,
    })
  })

  it('lance PlateError si la plaque est introuvable (404)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
    await expect(lookupPlate('9-ZZZ-999')).rejects.toThrow(PlateError)
  })

  it('lance PlateError si l\'API est down', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    await expect(lookupPlate('1-ABC-123')).rejects.toThrow(PlateError)
  })
})
