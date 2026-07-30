# Z2-contract-rejects-kopecks — state

STATUS: DEFECT CONFIRMED
HEAD at start: 423a7a39d24ec83af825e64849eac4774ea54b1e
packages/shared/src/index.ts is CLEAN in git status (only packages/shared/dist/* dirty — generated,
NEVER stage). NO collision on my claim.

CONFIRMED at real lines (rg -n "[Rr]ub\w*\s*:" packages/shared/src/index.ts => exactly 45 hits):
- 38 x z.number().int(...)  -> reject 1500.50
- 5  x moneyRub family      -> :1645 :1734 :1735 :1982 :4407
- 2  x other                -> :4082 z.number().nonnegative(), :8211 z.number()
moneyRubSchema :23-25, kopecksAreExact :20-21, comment :12-13 — all confirmed verbatim.
DB side confirmed numeric(12,2) in apps/api/src/db/schema.ts (:442 :443 :465 :466 :467 :481 :535 :567
:1724 :2149 :2249 ...). packages/shared/src/utils/money.ts (199 lines) already holds the kopeck algebra.

## Packet
Money lane. 38 of 45 money fields in packages/shared/src/index.ts are `z.number().int()` and
therefore REJECT 1500.50. moneyRubSchema (:23-25) already exists and is wired to 5 fields.

## Claim
- packages/shared/src/index.ts (money field schemas only)
- its node:test
- minimum API/web sites required to keep both sides in sync
FORBIDDEN: renderDocument.ts (Z1), panelStateText.ts + consumers, speech/**, routes/speech.ts,
routes/telegram.ts, components/workspaceActions/**, all §7a shared gates.

## Log
- [ ] STARTED  <- here
- [ ] AUTHORITY READ
- [ ] DEFECT CONFIRMED/ABSENT
- [ ] INVENTORY DONE
- [ ] EDIT WRITTEN
- [ ] SELF-CHECK PASSED
- [ ] COMMITTED <hash>
- [ ] PROVEN
- [ ] DONE
