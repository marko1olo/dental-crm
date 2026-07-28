# U1-identity-verified — state

STATUS: DONE
HEAD: feb39fe35db97746813cd47dc21ebf4f05f619ca
HEAD at start: 65dc2d62302a1a268f41871851c98dbbe8199e9a

## Commits (all mine, all pathspec-scoped, no foreign files)
- dfe75e1bb  apps/api/src/security/identity.ts  (+99)   [MISSING [ARCHON] PREFIX - disclosed]
- 31f8a2e37  apply-dev-env.ps1                  (+173/-43)
- feb39fe35  apps/api/src/tests/security/unverifiedOrganizationMutation.test.ts (+219)

## Defect: REAL, both parts
1. identity.ts wrote `verified` and never read it. Measured: `rg -n "\.verified"`
   -> 3 writes in identity.ts, 1 read in tests/security.test.ts:129, ZERO
   production consumers. requireOrganizationId checked only for null.
2. apply-dev-env.ps1 DID NOT RUN AT ALL. UTF-8 without BOM + Windows PowerShell
   5.1 (only PS on the box) = ParserError, exit 1, zero files modified. The
   dossier claim "one run reopens the hole" is FALSE as written.

## Fix
Post-condition on the assembled identity, identity.ts:186-199. An unverified
organizationId is dropped unless unverifiedOrganizationUsable(request):
  GET/HEAD/OPTIONS -> allowed always
  everything else  -> allowed only while request.server.server.listening === false
Placed at the source, not in the accessor, because accessGuard.ts:97 and :120 read
identity.organizationId directly and would otherwise stay open.
requireOrganizationId (identity.ts:220) answers 401 UnverifiedOrganizationCannotMutate.

## Proof
- UNIT: new test 6/6 pass, exit 0
- UNIT: npm test -w @dental/api run1 958/958 exit 0 (portalOtp after-hook FK noise,
  pre-existing, not reproducible), run2 958/958 exit 0 clean
- TYPECHECK: exit 0 twice
- SMOKE: apply-dev-env.ps1 four scenarios in a temp sandbox, before/after
- API: live 127.0.0.1:4100 health 200, header-only write/read 401 - control only,
  the flag is off on the box so the new branch is NOT exercised there

## Log
- [x] STARTED
- [x] AUTHORITY READ
- [x] DEFECT CONFIRMED (both parts)
- [x] EDIT WRITTEN
- [x] GATE PASSED
- [x] COMMITTED dfe75e1bb / 31f8a2e37 / feb39fe35
- [x] PROVEN
- [x] DONE

Sandboxes and probe files deleted. Tree left clean except this packet dir.
