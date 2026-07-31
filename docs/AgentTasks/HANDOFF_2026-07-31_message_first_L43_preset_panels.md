# HANDOFF — 2026-07-31 — L43 preset message-first + schedule/settings panel wire

**Repo:** `C:\Clinic_MVP\dental-crm` (NOT hades / Hecton8)  
**Base after L42 handoff:** `320382c3b`  
**This slice commits (see git log):**

| Item | Commit | Files |
|------|--------|--------|
| applyWorkspacePreset EN→RU message-first (+ blacklist/lost-patients bundle) | `28b2cef0f` | `useWorkspaceProfile.ts`, PatientsView, NewAppointmentForm, … |
| Schedule DayConfirmations+FreedSlots + Settings messengers mount | `3f7dbcd6b` | `ScheduleView.tsx`, `SettingsView.tsx` |
| Settings rules de-dupe + BACKLOG L43/L44 stamp | *(this push)* | `SettingsView.tsx`, `BACKLOG.md`, this handoff |

---

## What closed

### L43 — useWorkspaceProfile preset path (message-first)

Was:
```ts
if (!res.ok) throw new Error(`Failed to apply preset: ${presetName}`);
console.warn("Failed to fetch preset from server, using local fallback:", error);
```

Now (same helper as `saveWorkspaceFlags`, no AppHelpers import = no cycle):
- `workspaceProfileServerDetail(rawBody)` → Cyrillic `payload.message` / `error`
- RU fallbacks: 401/403 / 500 / other status
- throw: `Пресет рабочего места не применён (${presetName}): ${reason}. Берём локальный набор.`
- console.warn RU: `Пресет с сервера не получен, используем локальный набор:`

Local solo/clinic/enterprise fallback unchanged.

**Proof:** source contract — no `Failed to apply preset` in file; RU strings present. Bundled in `28b2cef0f`.

### L44 — Schedule / Settings panel wire

- `ScheduleView.tsx`: toggles + mount `DayConfirmationsPanel`, `FreedSlotsPanel` (components already on disk).
- `SettingsView.tsx`: mount `settingsTab === "messengers"` → `SettingsMessengersTab` (tab id was unreachable).
- **Fix after `3f7dbcd6b`:** duplicate `settingsTab === "rules"` mount removed (bare + ErrorBoundary). Single rules mount wrapped in `ErrorBoundary`.

---

## BACKLOG state

```
[x] P1 | API EN 500→RU message … | afb0fa8f0
[x] P1 | useWorkspaceProfile applyWorkspacePreset message-first RU … | 28b2cef0f
[x] P1 | ScheduleView DayConfirmations+FreedSlots panels + Settings messengers tab wire | 3f7dbcd6b
```

---

## NEXT (replenish — not started)

Web message-first still open (operator-facing):

1. `PatientReclamationsWidget` / `PatientTaskTicketsWidget` / archive-blacklist toasts — prefer `payload.message` Cyrillic (like `leadsFailureMessage`).
2. `ScheduleView` appointment create/update error paths if still status-only EN.
3. Auth screens: ClinicLogin / UserLogin / Register / AcceptInvite EN leaks.
4. `OdontogramModule`, `SettingsPricesTab`, `InsuranceContractsPanel`, `PatientFamilyCard`.
5. API re-scan `Failed to` in `apps/api/src/routes` after L42 (internal Query throws lower priority).

**Skip:** console.error EN, test fixtures, technical filter regexes.

### Recommended first bite

Patient reclamations / task tickets message-first → pathspec commit → BACKLOG stamp → push → handoff.

---

## Hard rules (Iron Gate)

- Pathspec `git add -- <files>` only — **never** stage `.data`, `.dente-data`, `scratch/pgdata`
- AUTH-first → safeParse → business/DB
- 400 ValidationError RU ≠ 500/404
- No mocks for inject proofs
- dental-crm only; ignore hades side projects
- `useWorkspaceProfile` must NOT import AppHelpers (static cycle)

---

## Key paths

```
apps/web/src/hooks/useWorkspaceProfile.ts
apps/web/src/ScheduleView.tsx
apps/web/src/SettingsView.tsx
apps/web/src/components/schedule/DayConfirmationsPanel.tsx
apps/web/src/components/schedule/FreedSlotsPanel.tsx
apps/web/src/components/settings/SettingsMessengersTab.tsx
apps/web/src/components/settings/SettingsRulesTab.tsx
BACKLOG.md
docs/AgentTasks/HANDOFF_2026-07-31_message_first_L42_en500.md
docs/AgentTasks/HANDOFF_2026-07-31_message_first_L43_preset_panels.md
```

---

## Git one-liners

```bat
git -C C:\Clinic_MVP\dental-crm rev-parse --short HEAD
git -C C:\Clinic_MVP\dental-crm log -8 --oneline
git -C C:\Clinic_MVP\dental-crm status -sb
```

Expect clean working tree (or dirty local data only — do not stage) and `HEAD == origin/main` after push.

---

## Agent instruction (copy-paste)

> Continue dental-crm at `C:\Clinic_MVP\dental-crm`.  
> L42 EN500→RU DONE (`afb0fa8f0`). L43 preset message-first DONE (`28b2cef0f`).  
> L44 schedule/settings panel wire DONE (`3f7dbcd6b` + rules de-dupe).  
> Next: PatientReclamations / TaskTickets / Schedule appointment errors message-first RU.  
> Pathspec commits. Push/pull main. No mocks. No AppHelpers import from useWorkspaceProfile.

**End of handoff.**
