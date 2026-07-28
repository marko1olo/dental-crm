# X3-orphan-decomposition — state

STATUS: **DONE**
Commits (both mine, pathspec form, index verified empty before each):
  1e31a9f00a68532a884a640dfa4d0c5092ca26a8  5 files, +77 −206   F1 + F2 + F3
  a02eb310b011645ca50d76af3ebecfc8fe268aec  1 file,  +223       the gate that did not exist
HEAD moved during the packet: 13b1738 → 6b063df → 1e31a9f00 (mine) → 744797790 → 5e42aac18 →
7483b408 → a02eb310b (mine) → f0121f0c2 (final observation).
ROLE: implementer, lane WEB.
CLAIM: apps/web/src/DocumentsView.tsx, apps/web/src/components/documents/**,
apps/web/src/tests/documentPayloadForms.test.ts + documentsViewDecomposition.test.ts,
scripts/smoke-document-payload-ui-source.mjs (F2 is explicitly about it).

## Resumption note
A prior X3 instance died between 13:46 and 14:00 having written source edits but committed nothing and
left state.md at AUTHORITY READ. Its edits were verified by content as F1/F2/F3 work (not a foreign
collision) and carried forward. Authority docs were re-read by this instance in full.

## Result
- W6 produced ZERO orphans. All 11 extracted files are state (a) imported AND rendered. Per-file table
  with git grep line numbers is in handoff.md. The packet premise is wrong and is corrected there.
- One true orphan in the directory, pre-existing, NOT from W6: DocumentUkepSignButton.tsx — declared
  debt, named in code via knownUnwiredDocumentComponents so it cannot be forgotten.
- DocumentsView.tsx 5094 (W6^) → 4363 (W6) → 4187 (HEAD). Store destructures 814 → 641, DEAD 173 → 0.
- 28 document-kind mounts = 21 own cards + 7 extracted forms.

## Gates run by me (no shared state)
- node --import tsx --test src/tests/documentsViewDecomposition.test.ts → exit 0, 18/18 (re-run at
  final HEAD f0121f0c2, still 18/18).
- Negative control on the same logic: 64d17693 → DEAD=173; HEAD → DEAD=0.
- node scripts/smoke-document-payload-ui-source.mjs → exit 1, 50 missing; both W6-caused needles green.
- npm run smoke:web-text-encoding → exit 0, 429 files, 0 mojibake.

## BLOCKED, not mine
documentPayloadForms.test.ts cannot run in this worktree: another agent's UNCOMMITTED
components/workspaceActions/ (untracked) imports .css, reached via AppHelpers.tsx:305 →
workspaceShell.tsx:29 (dirty). Import is NOT in HEAD. Same file was 25/25 exit 0 at 14:10 against the
exact bytes now in HEAD. Closing command in handoff.md.

## Lead owns (§7a)
npm run typecheck -w @dental/web · npm test -w @dental/web · UI VERIFIED in light/dark/night.
