import { calculateTMC, calculateTC, calculateCV } from '@/lib/taxes'

describe('calculateCV', () => {
  it('retourne 1 pour une cylindrée très petite', () => {
    expect(calculateCV(100)).toBe(1)
  })
  it('retourne 8 pour 1600cc', () => {
    expect(calculateCV(1600)).toBe(8)
  })
  it('retourne 10 pour 1998cc', () => {
    expect(calculateCV(1998)).toBe(10)
  })
})

describe('calculateTMC', () => {
  it('retourne 0 pour un véhicule électrique', () => {
    expect(calculateTMC({ co2: 0, fuelType: 'electric' })).toBe(0)
  })
  it('retourne 0 pour co2=0 même en essence', () => {
    expect(calculateTMC({ co2: 0, fuelType: 'gasoline' })).toBe(0)
  })
  it('calcule correctement pour 120 g/km essence', () => {
    // 271.40 + (120-101) * 8.70 = 271.40 + 165.30 = 436.70
    expect(calculateTMC({ co2: 120, fuelType: 'gasoline' })).toBeCloseTo(436.70, 1)
  })
  it('applique le coefficient diesel (×1.15) pour 120 g/km', () => {
    expect(calculateTMC({ co2: 120, fuelType: 'diesel' })).toBeCloseTo(436.70 * 1.15, 1)
  })
  it('applique le coefficient hybride (×0.75) pour 80 g/km', () => {
    // 61.50 + (80-1) * 2.10 = 61.50 + 165.90 = 227.40
    expect(calculateTMC({ co2: 80, fuelType: 'hybrid' })).toBeCloseTo(227.40 * 0.75, 1)
  })
})

describe('calculateTC', () => {
  it('retourne 0 pour un véhicule électrique', () => {
    expect(calculateTC({ cc: 0, fuelType: 'electric' })).toBe(0)
  })
  it('retourne le tarif ≤4cv pour une petite cylindrée', () => {
    expect(calculateTC({ cc: 600, fuelType: 'gasoline' })).toBe(77.52)
  })
  it('retourne le bon tarif pour 8cv (1600cc essence)', () => {
    expect(calculateTC({ cc: 1600, fuelType: 'gasoline' })).toBe(264.65)
  })
  it('applique la majoration diesel de 25% pour 8cv', () => {
    expect(calculateTC({ cc: 1600, fuelType: 'diesel' })).toBeCloseTo(264.65 * 1.25, 1)
  })
  it('calcule correctement pour plus de 15cv', () => {
    // 16cv : 959.98 + 133.00 = 1092.98
    expect(calculateTC({ cc: 3200, fuelType: 'gasoline' })).toBeCloseTo(1092.98, 1)
  })
})
