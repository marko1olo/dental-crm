# HANDOFF — 2026-07-31 — ScannerView + LeadsKanban message-first (L40–41)

**Repo:** `C:\Clinic_MVP\dental-crm` (NOT hades / Hecton8)  
**HEAD = origin/main = `803858558`**  
**Previous base:** `bca70f14a` (workspace profile stamp)

---

## What closed

| Item | Commit | Files |
|------|--------|--------|
| ScannerView sterilization message-first RU | `36dc0ce02` | `apps/web/src/ScannerView.tsx` |
| LeadsKanban message-first RU | `36dc0ce02` | `apps/web/src/store/leadsStore.ts`, `apps/web/src/components/leads/LeadsKanbanView.tsx` |
| BACKLOG stamp L40–41 | `803858558` | `BACKLOG.md` |

Push: `bca70f14a..803858558` → `origin/main`. Pull: already up to date.

### Gameplay rule (do not regress)

API already returned RU `ValidationError.message` (body Zod earlier: `a0eb58194`).  
**Without UI reading `payload.message`, feature = DECLINED** (status-only English toast).

**Pattern (copy this):**
1. Prefer Cyrillic `payload.message` over `payload.error` / HTTP status English.
2. Keep special cases that change operator action (e.g. `StaffAuthRequired` → PIN shift).
3. Store mutators **rethrow** RU `Error` so UI can `showToast`.
4. Convert path already OK via `bookingFailureMessage` — do not break it.

### ScannerView (`accessFailureMessage`)

Order:
1. Parse `{ error, message }`
2. `StaffAuthRequired` → PIN / shift text (code wins)
3. Cyrillic `serverMessage` → return as-is
4. 401/403 → RU access
5. else `requestFailureCause(status)`

### leadsStore (`leadsFailureMessage`)

- Cyrillic message first
- 401/403 / 404 RU fallbacks
- `fetchLeads` / `updateLeadStatus` / `addLead` / `updateLeadDetails` throw RU
- `updateLeadStatus` rethrows after optimistic rollback

### LeadsKanbanView

- `handleDrop` non-convert: `.catch` → `showToast(err.message)`
- `handleEditSubmit` catch → server RU (not «Ошибка сохранения»)
- `loadError` banner shows store text
- convert: still `bookingFailureMessage`

---

## Proof (do not re-litigate)

| Check | Result |
|-------|--------|
| Inject egiszVkBody | 17/17 GREEN |
| Inject leadsFinanceSterilBody | 20/20 GREEN |
| Live :4100 smoke | `.tmp/smoke_gameplay.txt` |
| steril empty/array | 400 + `Проверьте данные стерилизации: barcode, autoclaveId и status.` MESSAGE_CYR=True |
| lead empty/array | 400 + `Проверьте поля лида: нужно непустое имя.` MESSAGE_CYR=True |
| WP array | 400 RU (regression) |
| noauth steril/lead | 401 |
| Iron Gate | gitleaks clean on both commits |

**Live mint:** `.tmp/mint-demo-token.mjs`  
**Secret for smoke:** `AUTH_TOKEN_SECRET=dev-auth-token-secret-for-tests`  
(console may mojibake Cyrillic; file UTF-8 + `MESSAGE_CYR=True` is ground truth)

---

## BACKLOG state

Open `[ ]` / `[~]` gameplay lines after stamp: **none**.

Stamped:
```
[x] P1 | ScannerView sterilization message-first RU … | ScannerView.tsx | 36dc0ce02
[x] P1 | LeadsKanban message-first RU … | leadsStore.ts + LeadsKanbanView.tsx | 36dc0ce02
```

Earlier closed same theme:
- diary gameplay `ee9c055a9`
- workspace profile body + message-first `c61e6cc36` / stamp `bca70f14a`
- leads+finance+steril body Zod `a0eb58194`

---

## NEXT (replenish — not started coding)

Scan artifact: `.tmp/scan_next_gaps.py` → `.tmp/next_gap_scan.txt`  
(156 pattern hits; 29 web files with `!res.ok` and no message-first helper)

### P1 candidates (ordered)

**A. Web message-first (operator-facing, same class as L40–41)**  
Files without message-first helper (sample from scan):
- `apps/web/src/components/finance/FamilyWalletPanel.tsx`
- `apps/web/src/ScheduleView.tsx`
- `apps/web/src/components/patients/PatientFamilyCard.tsx`
- `apps/web/src/components/patients/PatientReclamationsWidget.tsx`
- `apps/web/src/components/patients/PatientTaskTicketsWidget.tsx`
- `apps/web/src/components/patients/PatientArchiveAndBlacklistWidget.tsx`
- `apps/web/src/components/settings/SettingsPricesTab.tsx`
- `apps/web/src/components/settings/InsuranceContractsPanel.tsx`
- `apps/web/src/components/odontogram/OdontogramModule.tsx`
- auth: ClinicLogin / UserLogin / Register / AcceptInvite
- `hooks/useWorkspaceProfile.ts` still has English `Failed to apply preset: …` (L224) — save path already message-first; preset path may still leak EN

**B. API English 500 strings that can reach client `error` field**
- `apps/api/src/routes/files.ts` — `"Failed to insert attachment"`
- `apps/api/src/routes/waitlist.ts` — `"Failed to add to waitlist"`
- `apps/api/src/routes/lab.ts` — `"Failed to create lab order"`
- `apps/api/src/routes/inventory.ts` — `"Failed to create/update item"`

Internal `throw new Error("Failed to …")` in `db/*Query.ts` is lower priority if route maps to RU; prefer fixing **reply.send({ error: "Failed…" })** first.

**C. Do not waste cycles on**
- console.error English
- test `as` casts on `response.json()`
- technical filter regexes that *mention* "Failed to fetch"

### Recommended first bite for next agent

1. **FamilyWalletPanel** or **PatientReclamations/TaskTickets** — wire `payload.message` Cyrillic like `leadsFailureMessage` / `workspaceProfileServerDetail`.
2. Or **files.ts + waitlist.ts** EN 500 → RU `message` + inject 400/500 body proof.
3. Stamp new BACKLOG lines before commit; pathspec only.
4. Smoke with `AUTH_TOKEN_SECRET=dev-auth-token-secret-for-tests`.
5. Commit → push origin main → pull → HEAD==origin/main.
6. Write/update this handoff.

---

## Hard rules (Iron Gate)

- Pathspec `git add -- <files>` only — **never** `git add .` / stage `.data`, `.dente-data`, `scratch/pgdata`
- AUTH-first → safeParse → business/DB
- 400 ValidationError RU ≠ 500/404
- No mocks for inject proofs
- No AppHelpers import from `useWorkspaceProfile` (cycle)
- dental-crm only; ignore hades side projects

---

## Key file paths

```
apps/web/src/ScannerView.tsx
apps/web/src/store/leadsStore.ts
apps/web/src/components/leads/LeadsKanbanView.tsx
apps/web/src/hooks/useWorkspaceProfile.ts          # reference message-first
apps/api/src/routes/sterilization.ts               # RU already
apps/api/src/routes/leads.ts                       # RU already
BACKLOG.md
.tmp/smoke_gameplay.txt
.tmp/next_gap_scan.txt
.tmp/scan_next_gaps.py
.tmp/mint-demo-token.mjs
```

---

## Git one-liners

```bat
git -C C:\Clinic_MVP\dental-crm rev-parse --short HEAD
git -C C:\Clinic_MVP\dental-crm log -5 --oneline
git -C C:\Clinic_MVP\dental-crm status -sb
```

Expect: `803858558` and `## main...origin/main` (dirty tree local data OK, do not stage).

---

## Agent instruction (copy-paste)

> Continue dental-crm at `C:\Clinic_MVP\dental-crm`. HEAD should be `803858558`.  
> L40–41 message-first DONE. BACKLOG open empty — pick next P1 from HANDOFF section NEXT.  
> Prefer operator-visible RU `payload.message` over EN status. Pathspec commits. Push/pull main. Document handoff.  
> Subagents discover/critique OK. No mocks. Smoke with AUTH_TOKEN_SECRET=dev-auth-token-secret-for-tests.

**End of handoff.**
