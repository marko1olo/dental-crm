# P8-encoding-red — black box

Packet: P8-encoding-red
Lane: PROOF
Claimed files (edit nothing else):
  - scripts/smoke-visit-workflow-forms-lifecycle.mjs
Packet dir: .agents/archon/packets/P8-encoding-red
Compile gate: node scripts/check-encoding.mjs

NOTE ON THIS FILE: the guard scans .md too. Literal mojibake is therefore NEVER written here —
only hex byte sequences and descriptions, exactly as scripts/check-encoding.mjs does for itself
(see its header: the searched characters are written only as escape sequences, or the check would
fire on its own source). I violated this once and flagged my own state.md; fixed by rewriting.

## Milestones
- STARTED — 2026-07-28, state.md written before any read.
- AUTHORITY READ — .agents/AGENTS.md (163 lines) + .agents/INDEX.md (29 lines) read complete.
- DEFECT CONFIRMED — see below.
- EDIT WRITTEN — see below.
- GATE PASSED — see below.
- COMMITTED 679e0ee694e79c220c386ae35ce4443fdd8b9335 — verified via `git log -1 --stat`:
  Russian subject intact (NOT mojibake), exactly 1 file, 1 insertion / 2 deletions,
  no other agent's file rode along. Pre-commit "IRON GATE" hook ran gitleaks (no leaks) and
  correctly skipped Biome ("Biome not found in PATH").

## BEFORE-STATE (node scripts/check-encoding.mjs) — EXIT=1
CRITICAL CORRECTION TO THE BRIEF: the guard reports **28 problems across 28 files**, not one.
My claimed file was ONE of the 28. Fixing it CANNOT make the guard exit 0.
Real target for this packet: 28 -> 27, my file absent. Exit stays 1 on the other 27.
My file's entry was kind [mojibake], line 531.
My file was flagged ONLY for cp1252 mojibake. It had NO U+FFFD — the brief said it had both. WRONG.
The other 27: 11 non-UTF-8 (CP1251) files at repo root + scratch/, 6 U+FFFD "lost text",
10 mojibake, incl. sibling scripts/smoke-patient-forms-lifecycle.mjs:335 with the IDENTICAL token.

## DEFECT CONFIRMED
HEAD at start: 94c6caa15a1dfcbf1774942a62b7a3dd8e4bdb2c (brief said f09869601 — tree moved).
Claimed file was CLEAN in git status before I touched it. 609 lines, read in full.

### The defect is WORSE than "a mojibake string". It is a DISABLED ASSERTION.
scripts/smoke-visit-workflow-forms-lifecycle.mjs:529-533 was:

    assert(
        issuedHtml.includes("<correct Russian: Otmetka o podpisanii>") ||
            issuedHtml.includes("<cp1252 double-encoding of that same string>"),
        `${formCase.kind}: HTML must include signature attestation block`,
    );

Operand B was byte-for-byte the cp1252 mojibake of operand A. Codepoint dump of L531 proved it,
including an invisible U+0081 between the 9th and 10th mojibake glyphs: UTF-8 for Cyrillic "es"
is D1 81, and cp1252 has no glyph for byte 0x81, so it survived as a bare control character.

So the test read: "pass if the product text is correct OR if it is corrupted."
It could not fail on the exact bug it is named after.
Repairing B into clean Russian would have produced `A || A` — a tautological duplicate, dead code,
and a facade under AGENTS.md section 2. The correct fix was to DELETE operand B.

### Source of truth for the reconstruction (3 independent witnesses)
1. apps/api/src/documents/renderDocument.ts:512 — the h2 heading, clean UTF-8, emitted by
   issueSignatureAttestationBlock() for any non-draft doc carrying an attestation. That is every
   case this smoke issues, so operand A matches real product output.
2. scripts/smoke-document-lifecycle.mjs:194 — asserts the SAME string ALONE, no `||`, no fallback.
   That is the correct assertion shape, already present in this repo.
3. apps/api/dist/documents/renderDocument.js:398 — the COMPILED artifact the smoke actually loads
   contains the clean string. dist is NOT stale (built 2026-07-28 00:54 vs src 2026-07-26 18:37).
   Therefore operand B could never match anything, under any input. Provably dead code.

## BASELINE SMOKE — ALREADY RED BEFORE MY EDIT, AND NOT AT MY LINE
`npm run smoke:visit-workflow-forms-lifecycle` EXIT=1 on the UNMODIFIED file at HEAD:
    Error: informed_consent: visit-required form without visit must be blocked
    at scripts/smoke-visit-workflow-forms-lifecycle.mjs:34:24
    at scripts/smoke-visit-workflow-forms-lifecycle.mjs:384:3
Line 384 is the FIRST assertion in the loop. Execution NEVER reaches line 530. Therefore:
  * my encoding fix CANNOT make this smoke pass, and I do not claim it does;
  * my encoding fix cannot have broken it either — it was red before I touched the file.
This is a THIRD baseline-red not listed in the brief (brief listed only smoke-workspace-shell-source
and check-encoding). DOSSIER CORRECTION.

## EDIT WRITTEN
Edit tool only. No node -e, no PowerShell, no regex, no fs script, no whole-file rewrite.
1 insertion, 2 deletions. Deleted operand B and the trailing ` ||`; operand A now stands alone.
Byte proof via `git diff | cat -A` (ASCII-safe rendering):
  removed clean operand : M-PM-^^ M-QM-^B M-PM-< M-PM-5 ... = D0 9E D1 82 D0 BC D0 B5 ... real UTF-8
  removed mojibake      : M-CM-^P M-EM-> M-CM-^Q M-bM-^@M-^Z ... = C3 90 C5 BE C3 91 E2 80 9A ...
                          and M-CM-^Q M-BM-^A = C3 91 C2 81 — the U+0081, confirmed deleted
  added line            : M-PM-^^ M-QM-^B M-PM-< M-PM-5 ... — BYTE-IDENTICAL to the removed clean operand
=> I authored ZERO new bytes of Russian. I only deleted. Corruption was not possible.
`node --check scripts/smoke-visit-workflow-forms-lifecycle.mjs` -> SYNTAX OK.

## GATE PASSED (as far as this packet can pass it)
node scripts/check-encoding.mjs — my file NO LONGER FLAGGED (grep returns nothing).
28 -> 27. Exit is STILL 1 and cannot be 0 from a single-file fix; the brief was wrong about that.
Interim self-inflicted blip: I briefly flagged my OWN state.md by quoting literal mojibake in it
(the guard scans .md). Rewritten with hex-only notation. Final: 27, none of them mine.

## PROVEN
- SMOKE VERIFIED  check-encoding.mjs 28 -> 27, my file absent, my packet docs absent.
- UNIT VERIFIED   read-only node -e: 1 operand remains; hex d09ed182d0bc... = clean 2-byte Cyrillic;
                  no codepoint in 0x80..0x3FF (U+0081 gone); compiled dist contains the string.
- TYPECHECK VERIFIED (syntax only) node --check -> SYNTAX OK.
- NOT VERIFIED    line 530 never executes: the smoke dies at line 384 on a PRE-EXISTING failure,
                  identical before and after my edit. Sibling smoke:document-lifecycle dies at 107
                  with 401, also pre-existing. Two strikes -> stopped, did not build glue.

## DONE
handoff.md written. Packet docs committed separately from the code fix.
Tree left CLEAN for my claim: `git status --porcelain -- <my file>` returns empty.
Nothing of mine left uncommitted.
