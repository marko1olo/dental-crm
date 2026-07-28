# W6-monolith-real-split — state

STATUS: DONE — COMMITTED 64d17693613646c67665b41f91a0a3f03fe29f75 (code+test) и 11a9fc13b (запись пакета), PROVEN
HEAD at start: 54db1c590be322d16858cd5d69e70a451bece62e
HEAD before commit: cf40daaccb80920771a31ee51bb61c5a1aa20f9b (moved under me, other author; my files untouched)

## Authority read (complete)
.agents/AGENTS.md, .agents/INDEX.md, .agents/UI_STANDARDS.md.

## Chosen monolith: apps/web/src/DocumentsView.tsx — 5094 -> 4363 lines
Reachable: App.tsx:389 lazy + App.tsx:3900 render; workspacePreload.ts:8.
28 sibling `{selectedDocumentKind === "<kind>" ? … : null}` blocks = the domain seams.

## Confirmed defects (real lines, pre-commit)
1. ORPHAN: components/documents/forms/TaxDeductionApplicationForm.tsx (201 lines) imported by nobody,
   duplicated DocumentsView.tsx:2263-2374 field-for-field, props typed `any`. FIXED (wired + typed).
2. ORPHANS still on disk, NOT in my claim scope, reported: components/documents/NdflTaxCalculatorsWidget.tsx
   (79 lines) and components/documents/DocumentUkepSignButton.tsx (225 lines) — imported by nobody.
3. 28x duplicated card shell with inline `style={{…}}` whose every property is overridden by
   `!important` in styles/dente-redesign.css:1262-1287 => the inline styles rendered nothing.
   FIXED for the 7 extracted forms (6 via DocumentPayloadCard); 21 copies remain in the parent.
4. Dead consts in DocumentsView.tsx: EXTRACT_TREATMENT_CHIPS, EXTRACT_REC_CHIPS, REFUND_REASON_CHIPS.
   REPORTED, not touched.
5. Refusal card uses hex fallbacks in Tailwind arbitrary values. Moved VERBATIM, reported as debt.

## Extracted (all imported and used by the parent in the same commit)
components/documents/DocumentPayloadCard.tsx 41 · QuickChipsRow.tsx 30 · documentChipText.ts 16
forms/documentFormTypes.ts 25 · InformedConsentForm 156 · ProcedureSpecificConsentForm 194
AnesthesiaConsentLogForm 139 · PhotoVideoConsentForm 127 · PersonalDataProcessingConsentForm 148
MedicalInterventionRefusalForm 155 · TaxDeductionApplicationForm 170 (was the 201-line orphan)
tests/documentPayloadForms.test.ts 328

## Gate result (mine, no shared state)
cd apps/web && node --import tsx --test src/tests/documentPayloadForms.test.ts
-> exit 0, tests 25, pass 25, fail 0, duration 487.9 ms.
esbuild parse of all 12 changed source files: exit 0 each.
171 store fields destructured in the extracted forms all exist in DocumentState (870 declared).

## Log
- STARTED / AUTHORITY READ / DEFECT CONFIRMED / EDIT WRITTEN / SELF-CHECK PASSED
- COMMITTED 64d17693613646c67665b41f91a0a3f03fe29f75 (13 files, +1556 -959, only my files)
- PROVEN: test run above; anti-orphan grep in handoff.md
- NEXT: handoff.md, then commit packet docs.
