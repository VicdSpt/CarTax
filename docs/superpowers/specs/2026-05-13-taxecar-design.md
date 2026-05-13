# TaxeCar — Design Spec

**Date:** 2026-05-13  
**Région cible:** Bruxelles-Capitale (Belgique)  
**Statut:** Approuvé

---

## Objectif

Application web permettant de calculer les taxes automobiles belges (TMC + TC) pour la Région de Bruxelles-Capitale, en fonction des caractéristiques d'un véhicule. Destinée à un usage personnel et au partage entre amis.

---

## Fonctionnalités

### 1. Calculateur (page principale)
- Saisie par **plaque d'immatriculation belge** : pré-remplit automatiquement le formulaire via API tierce
- Saisie **manuelle** : formulaire avec champs carburant, année, CO₂ (g/km), cylindrée (cc)
- Fallback silencieux : si la plaque est introuvable ou l'API est down, le formulaire reste vide et l'utilisateur saisit manuellement
- Affichage du résultat : **TMC** (taxe unique) + **TC annuelle**, avec détail du calcul disponible

### 2. Comparaison (page dédiée)
- Deux colonnes indépendantes (Véhicule A / Véhicule B), chacune avec son propre formulaire (plaque ou manuel)
- Résultats TMC + TC affichés côte à côte
- **Bilan comparatif** : économie calculée sur 5 ans entre les deux véhicules

---

## Stack technique

| Élément | Choix |
|---|---|
| Framework | Next.js 14 (App Router) |
| Langage | TypeScript |
| Style | Tailwind CSS |
| Déploiement | Vercel (gratuit) |
| Base de données | Aucune (one-shot, pas de persistance) |

---

## Architecture

```
TaxeCar/
├── app/
│   ├── page.tsx                    ← Calculateur (page principale)
│   ├── comparaison/page.tsx        ← Vue comparaison 2 véhicules
│   └── api/
│       ├── lookup-plate/route.ts   ← Recherche par plaque (API tierce)
│       └── calculate/route.ts      ← Calcul TMC + TC
├── lib/
│   ├── taxes.ts                    ← Logique de calcul (barèmes officiels Bruxelles 2024)
│   └── plate.ts                    ← Intégration API plaque
└── components/
    ├── VehicleForm.tsx             ← Formulaire partagé (plaque + champs manuels)
    └── TaxResult.tsx               ← Affichage résultat TMC + TC
```

---

## Logique de calcul

### TMC (Taxe de Mise en Circulation)
Taxe unique payée à l'immatriculation. Calculée sur les émissions CO₂ avec coefficient correcteur selon le carburant.

| CO₂ (g/km) | Tarif |
|---|---|
| 0 (électrique) | € 0 |
| 1–100 | Taux réduit progressif |
| 101–145 | Taux standard |
| 146+ | Malus progressif |

- Électrique : exempté (€ 0)
- Diesel : coefficient majorant
- Hybride : coefficient réduit
- Barèmes exacts : Région de Bruxelles-Capitale, mis à jour 2024

### TC (Taxe de Circulation annuelle)
Basée sur la **puissance fiscale** (CV fiscaux), calculée depuis la cylindrée ou la puissance moteur.

| CV fiscaux | Tarif annuel (indicatif) |
|---|---|
| ≤ 4 cv | ~€ 100 |
| 5–7 cv | ~€ 200–350 |
| 8–12 cv | ~€ 400–700 |
| 13+ cv | ~€ 800+ |

- Diesel : malus supplémentaire
- Électrique : € 0
- Barèmes exacts encodés dans `lib/taxes.ts`

---

## Intégration plaque belge

- **API tierce** : vehicleinfo.be (données DIV officielles)
- **Données retournées** : marque, modèle, année, carburant, CO₂, cylindrée, puissance
- **Clé API** : stockée dans `.env.local`, jamais exposée côté client
- **Flow** : `plaque → /api/lookup-plate → API tierce → pré-remplissage formulaire`
- **Fallback** : silencieux vers saisie manuelle si plaque introuvable ou API indisponible

---

## UI/UX

- Web app responsive (desktop + mobile)
- Design épuré, couleurs bleues (calculateur) et vertes (comparaison / véhicule B)
- Navigation simple : deux onglets (Calculateur / Comparaison)
- Détail du calcul disponible en accordéon sous les résultats
- Pas d'authentification, pas de compte utilisateur

---

## Hors scope

- Historique des véhicules consultés
- Autres régions belges (Wallonie, Flandre)
- Application mobile native
- Authentification / comptes utilisateurs
