# Form Validation & UX Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add client-side validation to VehicleForm that blocks submission when required fields are missing, with clear inline error messages.

**Architecture:** All changes are in `components/VehicleForm.tsx`. A computed `validationError` string is derived from form state on every render — no new state needed. The submit button is disabled when `validationError` is non-empty, and the error is displayed above the button.

**Tech Stack:** Next.js 16, React, TypeScript, Tailwind v4

---

## Files

- Modify: `components/VehicleForm.tsx`

No new files. No API changes. No lib changes. This is pure UI.

---

## Validation Rules

| vehicleType | fuelType | isOldtimer | Blocking condition | Error message |
|---|---|---|---|---|
| `car` | non-electric | false | `cc === 0 && kw === 0` | "Entrez la cylindrée (case P1) ou la puissance en kW (case P2) pour calculer la TC." |
| `car` | electric | false | never | — |
| `car` | any | true | never | — |
| `moto` | any | false | `cc === 0` | "Entrez la cylindrée (case P1) — nécessaire pour savoir si votre moto est exonérée (≤ 250cc) ou non." |
| `moto` | any | true | never | — |
| `utility` | any | false | `mma === 0` | "Entrez la MMA (case F1 ou F2) pour calculer la taxe de circulation." |
| `utility` | any | true | never | — |
| `truck` | any | any | no submit button | — |

---

## Task 1: Add validation to VehicleForm

**Files:**
- Modify: `components/VehicleForm.tsx`

This is a single-task implementation. All changes go into one file.

- [ ] **Step 1.1 — Add `validationError` computed variable**

In `components/VehicleForm.tsx`, add this block after the `showOldtimer` line (around line 84, after all the `show*` variables):

```typescript
  const validationError: string | null = (() => {
    if (form.isOldtimer) return null
    if (form.vehicleType === 'car' && form.fuelType !== 'electric') {
      if (form.cc === 0 && form.kw === 0) {
        return 'Entrez la cylindrée (case P1) ou la puissance en kW (case P2) pour calculer la TC.'
      }
    }
    if (form.vehicleType === 'moto') {
      if (form.cc === 0) {
        return 'Entrez la cylindrée (case P1) — nécessaire pour savoir si votre moto est exonérée (≤ 250cc) ou non.'
      }
    }
    if (form.vehicleType === 'utility') {
      if (form.mma === 0) {
        return 'Entrez la MMA (case F1 ou F2) pour calculer la taxe de circulation.'
      }
    }
    return null
  })()
```

- [ ] **Step 1.2 — Show the error message and disable the button**

Find the submit button block (currently around line 325):

```tsx
      {/* Submit */}
      {form.vehicleType !== 'truck' && (
        <button
          type="submit"
          disabled={loading}
          className={`py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${accent}`}
        >
          {loading ? 'Calcul...' : 'Calculer mes taxes'}
        </button>
      )}
```

Replace it with:

```tsx
      {/* Submit */}
      {form.vehicleType !== 'truck' && (
        <>
          {validationError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {validationError}
            </p>
          )}
          <button
            type="submit"
            disabled={loading || !!validationError}
            className={`py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50 ${accent}`}
          >
            {loading ? 'Calcul...' : 'Calculer mes taxes'}
          </button>
        </>
      )}
```

- [ ] **Step 1.3 — Also highlight the MMA field border when it's required but empty**

Find the MMA input (currently around line 208):

```tsx
          {/* MMA field */}
          {showMma && (
            <input
              type="number"
              placeholder="MMA (kg)"
              value={form.mma || ''}
              onChange={e => setForm(f => ({ ...f, mma: Number(e.target.value) }))}
              min={0}
              max={3500}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          )}
```

Replace with:

```tsx
          {/* MMA field */}
          {showMma && (
            <input
              type="number"
              placeholder="MMA (kg) *"
              value={form.mma || ''}
              onChange={e => setForm(f => ({ ...f, mma: Number(e.target.value) }))}
              min={0}
              max={3500}
              className={`border rounded-lg px-3 py-2 text-sm ${
                !form.isOldtimer && form.mma === 0
                  ? 'border-red-300 bg-red-50'
                  : 'border-gray-300'
              }`}
            />
          )}
```

- [ ] **Step 1.4 — Also highlight the CC field border for moto when empty**

Find the CC input (currently around line 269):

```tsx
          <input
            type="number"
            placeholder={form.kw > 0 ? 'Cylindrée ex: 2000 pour 2.0L (optionnel si kW connu)' : 'Cylindrée ex: 2000 pour 2.0L'}
            value={form.cc || ''}
            onChange={e => {
              const cc = Number(e.target.value)
              setForm(f => ({ ...f, cc, ...(co2Unknown ? { co2: estimateCo2(cc, f.fuelType) } : {}) }))
            }}
            min={0}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
```

Replace with:

```tsx
          <input
            type="number"
            placeholder={form.vehicleType === 'moto' ? 'Cylindrée ex: 600 (cm³) *' : form.kw > 0 ? 'Cylindrée ex: 2000 pour 2.0L (optionnel si kW connu)' : 'Cylindrée ex: 2000 pour 2.0L'}
            value={form.cc || ''}
            onChange={e => {
              const cc = Number(e.target.value)
              setForm(f => ({ ...f, cc, ...(co2Unknown ? { co2: estimateCo2(cc, f.fuelType) } : {}) }))
            }}
            min={0}
            className={`border rounded-lg px-3 py-2 text-sm ${
              form.vehicleType === 'moto' && !form.isOldtimer && form.cc === 0
                ? 'border-red-300 bg-red-50'
                : 'border-gray-300'
            }`}
          />
```

- [ ] **Step 1.5 — Run tests to confirm nothing broke**

```
npm test
```

Expected: 39 tests pass (VehicleForm has no unit tests, but the build must compile cleanly).

- [ ] **Step 1.6 — Commit**

```bash
git add components/VehicleForm.tsx
git commit -m "feat: add form validation with inline error messages"
```

---

## Self-review

**Spec coverage:**
- ✅ Car (thermal, non-oldtimer): blocked when cc=0 AND kw=0 → Task 1.1 + 1.2
- ✅ Car (electric): never blocked → validationError returns null for electric
- ✅ Car (oldtimer): never blocked → first check is `if (form.isOldtimer) return null`
- ✅ Moto: blocked when cc=0 → Task 1.1 + 1.4 (red border + error)
- ✅ Moto (oldtimer): never blocked → isOldtimer guard
- ✅ Utility: blocked when mma=0 → Task 1.1 + 1.3 (red border + error)
- ✅ Utility (oldtimer): never blocked → isOldtimer guard
- ✅ Truck: no submit button → unchanged

**Placeholder scan:** None found.

**Type consistency:** `validationError` is `string | null` throughout. `!!validationError` correctly converts to boolean for `disabled` prop.
