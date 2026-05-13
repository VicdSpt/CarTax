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
  it('retourne le forfait minimum pour un véhicule électrique', () => {
    expect(calculateTMC({ co2: 0, fuelType: 'electric' })).toBe(74.29)
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
  it('est continu à la frontière 145-146 g/km (co2=146 >= co2=145)', () => {
    const at145 = calculateTMC({ co2: 145, fuelType: 'gasoline' })
    const at146 = calculateTMC({ co2: 146, fuelType: 'gasoline' })
    expect(at146).toBeGreaterThanOrEqual(at145)
  })
})

describe('calculateTC', () => {
  it('retourne le tarif minimum pour un électrique sans kW', () => {
    expect(calculateTC({ cc: 0, fuelType: 'electric' })).toBe(102.96)
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

describe('calculateTMC — NEDC norm', () => {
  it('applique le coefficient NEDC (×1.21) pour 100 g/km NEDC', () => {
    // effectiveCo2 = round(100 * 1.21) = 121 → bracket 101-145
    // 271.40 + (121-101) * 8.70 = 271.40 + 174.00 = 445.40
    expect(calculateTMC({ co2: 100, fuelType: 'gasoline', co2Norm: 'nedc' })).toBeCloseTo(445.40, 1)
  })
  it('WLTP par défaut (pas de co2Norm) donne le même résultat que co2Norm: wltp', () => {
    const withDefault = calculateTMC({ co2: 120, fuelType: 'gasoline' })
    const withWltp = calculateTMC({ co2: 120, fuelType: 'gasoline', co2Norm: 'wltp' })
    expect(withDefault).toBe(withWltp)
  })
})

describe('calculateTC — fallback kW pour thermique', () => {
  it('utilise kW si cc=0 pour estimer les CV fiscaux', () => {
    // 150 kW → round(150/5.5) = 27 CV → 959.98 + (27-15)*133 = 959.98 + 1596 = 2555.98
    expect(calculateTC({ cc: 0, fuelType: 'gasoline', kw: 150 })).toBeCloseTo(2555.98, 1)
  })
  it('préfère cc sur kW si les deux sont fournis', () => {
    const withCc = calculateTC({ cc: 1600, fuelType: 'gasoline' })
    const withBoth = calculateTC({ cc: 1600, fuelType: 'gasoline', kw: 150 })
    expect(withCc).toBe(withBoth)
  })
  it('retourne le tarif minimum si cc=0 et kW=0', () => {
    expect(calculateTC({ cc: 0, fuelType: 'gasoline', kw: 0 })).toBe(77.52)
  })
})

describe('calculateTC — véhicule électrique avec kW', () => {
  it('retourne le forfait plafonné Bruxelles quelle que soit la puissance', () => {
    // Bruxelles 2026 : TC électrique = forfait ~102.96€ (non basé sur kW)
    expect(calculateTC({ cc: 0, fuelType: 'electric', kw: 150 })).toBe(102.96)
    expect(calculateTC({ cc: 0, fuelType: 'electric', kw: 202 })).toBe(102.96)
    expect(calculateTC({ cc: 0, fuelType: 'electric', kw: 50 })).toBe(102.96)
    expect(calculateTC({ cc: 0, fuelType: 'electric', kw: 0 })).toBe(102.96)
    expect(calculateTC({ cc: 0, fuelType: 'electric' })).toBe(102.96)
  })
})

describe('calculateTC — moto', () => {
  it('retourne 0 pour une moto ≤250cc', () => {
    expect(calculateTC({ cc: 125, fuelType: 'gasoline', vehicleType: 'moto' })).toBe(0)
    expect(calculateTC({ cc: 250, fuelType: 'gasoline', vehicleType: 'moto' })).toBe(0)
  })
  it('retourne 73.00 pour une moto >250cc', () => {
    expect(calculateTC({ cc: 600, fuelType: 'gasoline', vehicleType: 'moto' })).toBe(73.00)
    expect(calculateTC({ cc: 1200, fuelType: 'gasoline', vehicleType: 'moto' })).toBe(73.00)
  })
})

describe('calculateTMC — moto', () => {
  it('utilise coefficient 1.0 (comme essence) pour la TMC moto à 120 g/km', () => {
    // 271.40 + (120-101)*8.70 = 436.70 × 1.0 = 436.70
    expect(calculateTMC({ co2: 120, fuelType: 'gasoline', vehicleType: 'moto' })).toBeCloseTo(436.70, 1)
  })
  it('retourne 0 si co2=0 pour une moto', () => {
    expect(calculateTMC({ co2: 0, fuelType: 'gasoline', vehicleType: 'moto' })).toBe(0)
  })
})

describe('calculateTC — utilitaire', () => {
  it('retourne le bon tarif pour chaque tranche MMA', () => {
    expect(calculateTC({ cc: 0, fuelType: 'gasoline', vehicleType: 'utility', mma: 500 })).toBe(46.70)
    expect(calculateTC({ cc: 0, fuelType: 'gasoline', vehicleType: 'utility', mma: 1000 })).toBe(46.70)
    expect(calculateTC({ cc: 0, fuelType: 'gasoline', vehicleType: 'utility', mma: 1001 })).toBe(63.76)
    expect(calculateTC({ cc: 0, fuelType: 'gasoline', vehicleType: 'utility', mma: 1500 })).toBe(63.76)
    expect(calculateTC({ cc: 0, fuelType: 'gasoline', vehicleType: 'utility', mma: 2000 })).toBe(85.01)
    expect(calculateTC({ cc: 0, fuelType: 'gasoline', vehicleType: 'utility', mma: 3500 })).toBe(148.76)
  })
})

describe('calculateTMC — utilitaire', () => {
  it('retourne 0 (exonéré) pour un utilitaire', () => {
    expect(calculateTMC({ co2: 150, fuelType: 'diesel', vehicleType: 'utility' })).toBe(0)
  })
})

describe('calculateTC — poids lourd', () => {
  it('retourne 0 pour un poids lourd (pas de calcul)', () => {
    expect(calculateTC({ cc: 0, fuelType: 'diesel', vehicleType: 'truck' })).toBe(0)
  })
})

describe('calculateTMC — poids lourd', () => {
  it('retourne 0 pour un poids lourd (pas de calcul)', () => {
    expect(calculateTMC({ co2: 200, fuelType: 'diesel', vehicleType: 'truck' })).toBe(0)
  })
})

describe('oldtimer (plaque O)', () => {
  it('retourne TMC forfait 61.50 quel que soit le véhicule', () => {
    expect(calculateTMC({ co2: 200, fuelType: 'gasoline', isOldtimer: true })).toBe(61.50)
    expect(calculateTMC({ co2: 200, fuelType: 'diesel', isOldtimer: true })).toBe(61.50)
    expect(calculateTMC({ co2: 0, fuelType: 'gasoline', vehicleType: 'utility', isOldtimer: true })).toBe(61.50)
  })
  it('retourne TC forfait 43.30 quel que soit le véhicule', () => {
    expect(calculateTC({ cc: 4000, fuelType: 'gasoline', isOldtimer: true })).toBe(43.30)
    expect(calculateTC({ cc: 1600, fuelType: 'diesel', isOldtimer: true })).toBe(43.30)
    expect(calculateTC({ cc: 0, fuelType: 'gasoline', vehicleType: 'utility', mma: 3500, isOldtimer: true })).toBe(43.30)
  })
})
