# HANDOFF — 2026-07-31 — API EN 500 → RU message (L42)

**Repo:** `C:\Clinic_MVP\dental-crm` (NOT hades / Hecton8)  
**HEAD = origin/main = `32ea7bcce`**  
**Previous base:** `803858558` (L40–41 stamp)

---

## What closed

| Item | Commit | Files |
|------|--------|--------|
| API EN 500 Failed-to → RU `message` | `afb0fa8f0` | `files.ts`, `waitlist.ts`, `lab.ts`, `inventory.ts` + `en500ReplyMessageRu.test.ts` |
| BACKLOG stamp L42 | `32ea7bcce` | `BACKLOG.md` |

Push: `803858558..32ea7bcce` → `origin/main`. Pull: already up to date. HEAD==origin/main.

### Gameplay rule (do not regress)

Operator UI message-first needs **Cyrillic `payload.message`** on failures.  
English `reply.send({ error: "Failed to …" })` leaks into toasts when UI prefers `error` or dumps body.

**Pattern (API 500 branch):**
```ts
return reply.code(500).send({
  error: "PascalCaseCode",
  message:
    "…RU… Повторите…; если снова не выйдет — сообщите администратору клиники.",
});
```

| Route | Old EN | New code | RU gist |
|-------|--------|----------|---------|
| files (×2 insert) | Failed to insert attachment | `AttachmentNotSaved` | Файл не сохранён… |
| waitlist POST | Failed to add to waitlist | `WaitlistNotSaved` | Пациент не добавлен в лист ожидания… |
| lab create | Failed to create lab order | `LabOrderNotSaved` | Заказ в лабораторию не создан… |
| lab portal GET/POST catch | DatabaseError | `LabPortalError` | Портал лаборатории временно недоступен… |
| inventory create/update | Failed to create/update item | `InventoryItemNotSaved` | Позиция склада не создана/не сохранена… |

`StockNotSaved` on inventory stock PATCH was already RU — untouched.

400 ValidationError paths unchanged (waitlist/lab already RU). AUTH-first unchanged.

---

## Proof (do not re-litigate)

| Check | Result |
|-------|--------|
| Inject `en500ReplyMessageRu.test.ts` | **4/4 GREEN** EXIT 0 |
| Source: no `Failed to` in reply.send on 4 routes | pass |
| Source: codes + ≥6 Cyrillic `message:` | pass |
| POST waitlist noauth | 401 (not 400/500) |
| POST waitlist auth + bad body `[]` | 400 `ValidationError` + Cyrillic message |
| Iron Gate gitleaks | clean both commits |

```bat
cd /d C:\Clinic_MVP\dental-crm\apps\api
set AUTH_TOKEN_SECRET=dev-auth-token-secret-for-tests
node --import tsx --test src/tests/routes/en500ReplyMessageRu.test.ts
```

No mocks. Live Fastify inject for waitlist AUTH-first only (source contract covers all four files).

---

## BACKLOG state

```
[x] P1 | API EN 500→RU message (files/waitlist/lab/inventory reply.send) | files.ts waitlist.ts lab.ts inventory.ts + en500ReplyMessageRu.test.ts | afb0fa8f0
```

L40–41 remain stamped at `36dc0ce02` / docs `803858558`.

Open `[ ]` / `[~]` gameplay lines after L42: **none** from this slice.

---

## NEXT (replenish — not started)

Handoff A still open (web message-first). Scan: `.tmp/next_gap_scan.txt`.

### P1 candidates (ordered)

**A. Web message-first (operator-facing)**  
- `ScheduleView.tsx`
- `PatientReclamationsWidget.tsx` / `PatientTaskTicketsWidget.tsx` / archive-blacklist
- `PatientFamilyCard.tsx`
- `SettingsPricesTab.tsx` / `InsuranceContractsPanel.tsx`
- `OdontogramModule.tsx`
- auth: ClinicLogin / UserLogin / Register / AcceptInvite
- `hooks/useWorkspaceProfile.ts` L224 still has English `Failed to apply preset: …` (save path already message-first)

**FamilyWalletPanel** — already has `refusalToast` Cyrillic-first; defer unless scan still flags bare `!res.ok`.

**B. Remaining API EN in reply bodies**  
Re-scan `apps/api/src/routes` for `Failed to` / bare English 500 after this slice. Internal `throw new Error("Failed…")` in `db/*Query.ts` is lower priority if routes map to RU.

**C. Skip**  
console.error EN, test casts, technical filter regexes.

### Recommended first bite

1. **useWorkspaceProfile preset path** (L224 EN) or **PatientReclamations/TaskTickets** — wire `payload.message` like `leadsFailureMessage`.
2. Or **ScheduleView** if appointment create/update still status-only EN toasts.
3. Stamp BACKLOG → pathspec commit → push → handoff.

---

## Hard rules (Iron Gate)

- Pathspec `git add -- <files>` only — **never** stage `.data`, `.dente-data`, `scratch/pgdata`
- AUTH-first → safeParse → business/DB
- 400 ValidationError RU ≠ 500/404
- No mocks for inject proofs
- dental-crm only; ignore hades side projects

---

## Key file paths

```
apps/api/src/routes/files.ts
apps/api/src/routes/waitlist.ts
apps/api/src/routes/lab.ts
apps/api/src/routes/inventory.ts
apps/api/src/tests/routes/en500ReplyMessageRu.test.ts
BACKLOG.md
docs/AgentTasks/HANDOFF_2026-07-31_message_first_L40_41.md   # prior
docs/AgentTasks/HANDOFF_2026-07-31_message_first_L42_en500.md  # this
.tmp/mint-demo-token.mjs
```

---

## Git one-liners

```bat
git -C C:\Clinic_MVP\dental-crm rev-parse --short HEAD
git -C C:\Clinic_MVP\dental-crm log -5 --oneline
git -C C:\Clinic_MVP\dental-crm status -sb
```

Expect: `32ea7bcce` and `## main...origin/main` (dirty local data OK, do not stage).

---

## Agent instruction (copy-paste)

> Continue dental-crm at `C:\Clinic_MVP\dental-crm`. HEAD should be `32ea7bcce`.  
> L42 API EN500→RU DONE (`afb0fa8f0`). L40–41 DONE.  
> Next: web message-first from HANDOFF NEXT (ScheduleView / reclamations / useWorkspaceProfile preset EN).  
> Pathspec commits. Push/pull main. No mocks. Smoke AUTH_TOKEN_SECRET=dev-auth-token-secret-for-tests.

**End of handoff.**
