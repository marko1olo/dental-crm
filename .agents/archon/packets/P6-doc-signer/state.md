# P6-doc-signer — black box

Packet: P6-doc-signer
Lane: DOCS
Claimed files: apps/api/src/db/documentQuery.ts (+ its caller if the real signer must be threaded in)
Compile gate: npm run typecheck -w @dental/api

## Milestones
- STARTED 2026-07-28 — packet dir created, nothing read yet, nothing edited.
- AUTHORITY READ — .agents/AGENTS.md, .agents/INDEX.md, .agents/DOCUMENTS_LIFECYCLE.md read complete.
- HEAD at start = 94c6caa15a1dfcbf1774942a62b7a3dd8e4bdb2c (packet cited f09869601; tree has moved on).
  git status --porcelain on apps/api/src/db/documentQuery.ts = CLEAN. No collision.
- DEFECT CONFIRMED — documentQuery.ts:190 `issuedByUserId: "doctor", // usually from request, hardcoded in sampleData for now`
  Dossier citation ACCURATE (line 190 exactly).
- SECOND DEFECT, SAME FILE, SAME CLASS, NOT IN PACKET BRIEF:
  documentQuery.ts:236 `voidedByUserId: "doctor",` in voidGeneratedDocumentInDb — no comment, same literal.
  Voiding is also a legal act (DOCUMENTS_LIFECYCLE.md §3 "cashier signature"). In claim, will fix both.
- Read path at :73 `issuedByUserId: record.issuedByUserId` and :75 `voidedByUserId: record.voidedByUserId` are honest — confirmed.

## EXECUTION CHAIN — LIVE, NOT DEAD CODE (AGENTS.md §6)
server.ts:359 registerDocumentRoutes(app)
  -> routes/documents.ts:1031 registerDocumentRoutes
     -> :1033 registerIssue -> routes/documents/issue.ts:55 app.post("/api/documents/:id/issue")
        -> issue.ts:175 issueGeneratedDocumentInDb(orgId, id, {...}) -> documentQuery.ts:190  <-- DEFECT
     -> :1034 registerVoid  -> routes/documents/void.ts:59 app.post("/api/documents/:id/void")
        -> void.ts:118 voidGeneratedDocumentInDb(orgId, id, {...}) -> documentQuery.ts:236    <-- DEFECT 2
VERDICT: fully reachable by a user. NOT dead code.

## SEVERITY IS HIGHER THAN THE BRIEF SAYS
db/schema.ts:505 issuedByUserId: uuid("issued_by_user_id").references(() => users.id)
db/schema.ts:507 voidedByUserId: uuid("voided_by_user_id").references(() => users.id)
Both are UUID columns with FK to users.id. The literal "doctor" is not a uuid.
=> Postgres 22P02 invalid input syntax for type uuid. POST /api/documents/:id/issue should be a
   guaranteed 500 and the document is NEVER issued at all. Same precedent documented in
   issue.ts:57-59 for the old "mock-org" string in a uuid column. TO BE PROVEN against live DB/API.

- DB VERIFIED (read-only probe, live 127.0.0.1:5432):
  COLUMN TYPES: [{"column_name":"issued_by_user_id","data_type":"uuid"},{"column_name":"voided_by_user_id","data_type":"uuid"}]
  ROWS BY STATUS: []   (generated_documents is EMPTY — nothing has ever been issued)
  CAST doctor->uuid: "22P02 invalid input syntax for type uuid: \"doctor\""
  => the literal could never have been stored. Issue/void were hard-broken, not merely mis-attributed.

- EDIT WRITTEN (3 files):
  db/documentQuery.ts     — added zod import; added signerUserIdForColumn() guard;
                            issueGeneratedDocumentInDb options.issuedByUserId now REQUIRED string|null
                            (removed `= {}` default); voidGeneratedDocumentInDb options.voidedByUserId
                            same; both literals "doctor" replaced by the validated value.
  routes/documents/issue.ts — passes issuedByUserId: getRequestIdentity(request).userId
  routes/documents/void.ts  — passes voidedByUserId:  getRequestIdentity(request).userId
  DESIGN CHOICE: null when no authenticated staff (column is nullable by design, schema.ts:505/:507).
  Non-null non-UUID throws loudly. No placeholder, no hardcoded UUID.

- GATE PASSED — `npm run typecheck -w @dental/api` EXIT=0, no diagnostics.
- COMMITTED 5136239e62d0bbc4f0ab59380554496e364b54fa
  subject: [ARCHON] fix(документы): выдача падала — подписантом писался литерал «doctor»
  git log -1 --stat: exactly 3 files, 70 insertions / 6 deletions. Russian subject NOT mojibake.
  Pre-commit "Iron Gate" ran gitleaks (no leaks); Biome absent and skipped.

- PROVEN:
  API VERIFIED  POST /api/documents/8ae72f8f-a6de-4535-baa6-612530bc0fc2/issue -> 200
                issuedByUserId = "e44d32ca-7777-4c00-a001-c88f01b92e21" (Петров И.И., owner)
                POST .../void -> 200
  DB VERIFIED   issued_by_user_id = e44d32ca-...; after void voided_by_user_id = e44d32ca-...
  DB VERIFIED   old SQL replayed in a rolled-back txn:
                update generated_documents set issued_by_user_id='doctor' ->
                22P02 invalid input syntax for type uuid: "doctor"
  UNIT VERIFIED node --import tsx --test src/db/documentQuery.test.ts -> 4/4 pass
  TYPECHECK VERIFIED npm run typecheck -w @dental/api EXIT=0 (twice: before and after the test file)
  NEIGHBOURS OK  documents.test.ts + documents/documents.test.ts + documentQuery.test.ts = 24 pass 0 fail
  ENCODING       none of my 4 files flagged by scripts/check-encoding.mjs (baseline 27 entries, all others)

- COMMITTED (2nd) 3ad6d461410ae9a087ce81ad5d2164710c245f4f — the regression test.
  Another agent's commit 0baa1f723 interleaved between my two. My 4 files are clean in the tree.

- PACKET ITEM 6 — getDefaultOrganizationId():
  CONFIRMED call-site-free in documentQuery.ts (only importer of ANY copy is
  clinicalQuery.ts:13, and it imports from pricelistQuery.js). Not removed, per instructions.
  REFUTES the dossier wording: documentQuery's copy does NOT return a hardcoded UUID —
  it is `SELECT ... FROM organizations LIMIT 1`. Same for billingQuery:14 and imagingQuery:148.
  Only pricelistQuery.ts:12 has a literal UUID, and only inside the useInMemory() branch.
  Line moved :80 -> :81 by my zod import.

- DEV-DB RESIDUE from the probe (left deliberately as evidence, lead may delete):
  generated_documents row 8ae72f8f-a6de-4535-baa6-612530bc0fc2, status voided,
  title "P6 проверка подписанта — patient_intake_questionnaire",
  plus its issued HTML snapshot under .dente-data/documents/.
  Exact residue, verified by SQL: generated_documents has 2 rows total, both mine —
  1 draft (never issued, signer null) and 1 voided (signer + voider both e44d32ca-...).

- DONE.
