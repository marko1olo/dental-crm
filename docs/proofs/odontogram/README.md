# Clinical Odontogram & Radial Menu SSOT — 4-State Visual Proofs

## 📸 Red Team 4-State Inspection Gate

| State | Dimensions | Path | Size |
|---|---|---|---|
| ☀️ **PC Light** | 1440×900 | [`docs/proofs/odontogram/01_odontogram_pc_light_1440x900.png`](./01_odontogram_pc_light_1440x900.png) | ~263 KB |
| 🌙 **PC Dark** | 1440×900 | [`docs/proofs/odontogram/02_odontogram_pc_dark_1440x900.png`](./02_odontogram_pc_dark_1440x900.png) | ~262 KB |
| 📱 **Mobile Light** | 390×844 | [`docs/proofs/odontogram/03_odontogram_mobile_light_390x844.png`](./03_odontogram_mobile_light_390x844.png) | ~55 KB |
| 📱 **Mobile Dark** | 390×844 | [`docs/proofs/odontogram/04_odontogram_mobile_dark_390x844.png`](./04_odontogram_mobile_dark_390x844.png) | ~57 KB |

---

## 🎯 Architectural Invariants & Autopsy Summary

1. **Toolbar Consolidation (Mandate 8b / 8zi Sweet Spot: 232 lines):**
   - Smashed 5 micro-components into `OdontogramQuickBar.tsx` ($\le 40$px height).
   - Mode selectors (Анатомическая / ГОСТ / Детская) & Dentition selector (Взрослый / Детский / Сменный) integrated cleanly.
   - QuickActions dropdown & MoreMenu dropdown integrated without prop-drilling hell.

2. **Single Primary CTA Button Rule:**
   - Strictly 1 Primary CTA button: `✓ Санирован` with `#0d9488` background, white shield icon, and 1-click physiological norm (Mandate 8e).
   - All other toolbar buttons are neutral secondary buttons (`border: 1px solid var(--line)`, `background: transparent`).

3. **End-to-End Live Cohesion (Fastify API -> PostgreSQL 18 -> SOAP Diary):**
   - Implemented canonical mutation endpoint `POST /api/odontogram/status` with atomic transaction in `tooth_states`, audit history in `tooth_state_history`, and WebSocket broker broadcast.
   - Dispatch of `dente-apply-soap-protocol` on tooth status mutation dynamically updates the visit diary and diagnosis package without page reload.

4. **Apple HIG Touch Ergonomics (390×844):**
   - Native Bottom Sheet Drawer (`ToothRadialMobileSheet.tsx` / `ToothActionMobileSheet.tsx`) with tactile drag handle (36×5px).
   - Sticky action bar in the Natural Thumb Zone with 48px height touch target for `✓ Здоров / Интактный (Норма)`.
   - All surface and action touch targets $\ge 44\times 44$px.
   - 0px horizontal drift.
