# TaxeCar — Extension Types de Véhicules

**Date:** 2026-05-14  
**Région cible:** Bruxelles-Capitale  
**Statut:** Approuvé

---

## Objectif

Étendre le calculateur pour supporter les motos/scooters/quads/trikes, les utilitaires (≤ 3,5T MMA), et les poids lourds (> 3,5T), ainsi que le statut oldtimer (plaque O, 30+ ans).

---

## Nouveau champ : type de véhicule

Un sélecteur `VehicleType` est ajouté en tête de formulaire :

| Valeur | Label UI |
|---|---|
| `car` | Voiture |
| `moto` | Moto / Scooter / Quad / Trike |
| `utility` | Utilitaire (≤ 3,5T) |
| `truck` | Poids lourd (> 3,5T) |

Le type de véhicule conditionne les champs affichés et la logique fiscale appliquée.

---

## Logique fiscale par type

### Voiture (`car`)
Inchangée — logique actuelle complète (TMC CO₂, TC CV fiscaux, WLTP/NEDC, kW fallback, oldtimer).

### Moto / Scooter / Quad / Trike (`moto`)

**TC annuelle :**
- Cylindrée ≤ 250 cc → **€ 0** (exempt)
- Cylindrée > 250 cc → **€ 73,00** (forfait Bruxelles 2026)

**TMC :**
- Même formule CO₂ que voiture essence (coefficient 1.0)
- Si CO₂ = 0 → TMC = € 0 (CO₂ souvent non disponible pour motos)

**Champs affichés :** année, CO₂ (optionnel), cylindrée (cc), WLTP/NEDC toggle  
**Champs masqués :** kW, MMA  
**Oldtimer applicable** : oui (même conditions 30+ ans)

### Utilitaire ≤ 3,5T (`utility`)

**TC annuelle — barème MMA Bruxelles 2026 :**

| MMA (kg) | TC annuelle |
|---|---|
| 0 – 1 000 | € 46,70 |
| 1 001 – 1 500 | € 63,76 |
| 1 501 – 2 000 | € 85,01 |
| 2 001 – 2 500 | € 106,26 |
| 2 501 – 3 000 | € 127,51 |
| 3 001 – 3 500 | € 148,76 |

**TMC :** € 0 (utilitaires exonérés de TMC à Bruxelles)

**Champs affichés :** année, MMA (kg)  
**Champs masqués :** CO₂, cc, kW, WLTP/NEDC  
**Oldtimer applicable** : oui

### Poids lourd > 3,5T (`truck`)

Calcul basé sur nombre d'essieux + type de suspension — données non publiées publiquement, trop complexe à encoder fiablement.

**Comportement :** afficher un encadré informatif :
> "Le calcul de la taxe de circulation pour les poids lourds (> 3,5T) dépend du nombre d'essieux et du type de suspension. Consultez [Bruxelles Fiscalité](https://fisc.brussels) pour obtenir votre tarif exact."

Aucun calcul TMC/TC effectué. Aucun champ de saisie affiché.

---

## Statut Oldtimer (plaque O)

**Condition d'affichage :** `currentYear - year >= 30`  
**Déclencheur :** case à cocher "Immatriculé avec plaque O (oldtimer)"

**Forfaits si cochée (Bruxelles 2026) :**
- TMC : **€ 61,50** (fixe)
- TC : **€ 43,30** (fixe)

**Comportement :**
- La case apparaît automatiquement dès que l'année rend le véhicule éligible (≥ 30 ans)
- Si cochée, les forfaits remplacent le calcul normal quel que soit le type de véhicule
- Afficher un badge "Oldtimer" dans TaxResult avec une note : "Usage restreint (occasionnel / domicile-travail). Plaque O requise."

---

## Architecture — fichiers modifiés

### `lib/taxes.ts`
- Ajouter `VehicleType = 'car' | 'moto' | 'utility' | 'truck'`
- Ajouter constante `MOTO_TC_FLAT = 73.00`
- Ajouter table `UTILITY_TC_BY_MMA: [maxMma: number, rate: number][]`
- Ajouter constante `OLDTIMER_TMC = 61.50`, `OLDTIMER_TC = 43.30`
- Modifier `calculateTC` : brancher sur `vehicleType`
- Modifier `calculateTMC` : brancher sur `vehicleType` (utility → 0, oldtimer → 61.50)
- Modifier `calculate` : accepter `vehicleType`, `mma`, `isOldtimer`

### `components/VehicleForm.tsx`
- Ajouter `vehicleType` dans `VehicleFormData`
- Ajouter `mma: number` dans `VehicleFormData`
- Ajouter `isOldtimer: boolean` dans `VehicleFormData`
- Sélecteur type véhicule en tête de formulaire
- Affichage conditionnel des champs selon `vehicleType`
- Champ MMA visible uniquement pour `utility`
- Case oldtimer visible si `currentYear - year >= 30` et `vehicleType !== 'truck'`
- Message informatif affiché pour `truck`

### `components/TaxResult.tsx`
- Badge "Oldtimer" si `isOldtimer`
- Détail TC : mention MMA pour utilitaires

### `__tests__/taxes.test.ts`
- Tests motos : ≤250cc → TC 0, >250cc → TC 73, TMC CO₂ normale
- Tests utilitaires : chaque tranche MMA, TMC = 0
- Tests oldtimer : TMC 61.50, TC 43.30, toutes combinaisons type/carburant
- Tests truck : pas de calcul (fonction retourne null ou valeur sentinelle)

---

## Hors scope

- Wallonie / Flandre
- Réductions familiales
- Viapass (taxe kilométrique poids lourds)
- Motos électriques (même forfait €73 que thermique — à confirmer si différent)
