# X1-corner-redesign — state

STATUS: AUTHORITY READ (session 2 — session 1 agent died after DEFECT CONFIRMED, wrote no code)
HEAD at start of session 2: 6b063df202561552d36537a9087c0eda3b01bcdb
HEAD at start of session 1: 13b17385668937370ff2594829661d221843c3ca (moved under us — re-derived)

## Authority read (complete)
.agents/AGENTS.md, .agents/INDEX.md, .agents/UI_STANDARDS.md,
.agents/archon/VISUAL_VERDICT.md (incl. addenda A, B, C),
.agents/archon/packets/U4-fab-corner-owner/review.md,
.agents/archon/packets/V1-corner-reserve-regression/review.md.

## Collision check
`git status --porcelain` at start: dirty = .agents/AGENTS.md, apps/api/.data/*.json,
apps/web/tsconfig.tsbuildinfo, packages/shared/dist/*, scratch/audit-settings-props.mjs.
NONE of my claimed files are dirty. apps/web/src/App.tsx is CLEAN.
apps/web/src/workspaceShell.tsx is CLEAN.

## Defect confirmed at real lines
- cornerDockLayout.ts:126 `CORNER_OBSTACLE_BLOCK_SHARE = 0.5`
- cornerDockLayout.ts:261-270 `cornerBlocksTarget` = overlapArea / targetArea >= 0.5.
  For equal heights that is barWidth/targetWidth -> unreachable above 336px (bar 168 @390)
  and above 556px (bar 278 @1600). `button.primary-button` «Запись» is 364x44 -> 0.4615 max.
- CornerDock.tsx:160-190 `collectObstacles` — 5x `document.elementsFromPoint` per pass
- CornerDock.tsx:349-352 capture-phase window scroll listener -> a layout pass per scroll
- cornerDock.css:39-48 `position: fixed` + `--corner-dock-lift` in `bottom: calc(...)`
- dente-redesign.css:843-845 the single reserve consumer
  `.app-shell.dente-redesign .workspace { padding-bottom: var(--corner-dock-reserve-block,48px) }`

## Hosts located
- header: apps/web/src/workspaceShell.tsx:412 `<header className="topbar">`,
  `.top-actions` at :443 (six ungrouped controls, VISUAL_VERDICT §3)
- bottom nav: apps/web/src/App.tsx:4827 `<nav className="dnt-bottom-nav">` (5 labelled items)
- residents: components/VoiceAssistantUI.tsx (help+voice+notice), components/Omnibar.tsx (search)

## SESSION 2 FINDING — session 1 left 4 UNTRACKED, ORPHANED files
Written 13:57-14:02, then the agent died. Untracked (`git ls-files` empty, no `git log`):
- apps/web/src/components/workspaceActions/workspaceActionsPlacement.ts (8107 B)
- apps/web/src/components/workspaceActions/workspaceActionsLabels.ts   (7304 B)
- apps/web/src/components/workspaceActions/WorkspaceActions.tsx        (14378 B)
- apps/web/src/components/workspaceActions/workspaceActions.css        (18142 B)
Read all four IN FULL. Quality is good, tokens only, Russian in a dictionary.
BUT NOTHING IMPORTS THEM => half-product under §1/§5. Session 2 finishes the wiring.

Remaining work: rewire VoiceAssistantUI+Omnibar off CornerDockSlot, mount the two anchors,
move voiceMeter, DELETE floatingCorner/**, drop the reserve consumer, write the test, COMMIT.

## COLLISION — App.tsx (reported, NOT touched)
At 14:17 `apps/web/src/App.tsx` became ` M` and I did not dirty it (my Edit was REJECTED with
"File has been modified since read"). That is the second, non-fleet author. I did NOT edit,
revert or stage App.tsx.
CONSEQUENCE, and it made the design better: the nav host is reached WITHOUT editing App.tsx —
`WorkspaceActionsMount` inserts its own container into the live `.dnt-bottom-nav` and portals
into it. One mount point (workspaceShell `.top-actions`), zero App.tsx edits.

## COMMITTED f0121f0c293f664777d919e6fdc960eb7d139cfa
14 files, +1857 / -2360. Subject UTF-8 verified via `od -c` («угол» = 321 203 320 263 320 276
320 273). ONLY my files in the commit. gitleaks: no leaks found.
Deleted: floatingCorner/{CornerDock.tsx, cornerDock.css, cornerDockLayout.ts,
cornerDockLayout.test.ts} + 2 detected as renames (cornerDockLabels.ts -> workspaceActionsLabels.ts
59%, voiceMeter.ts -> workspaceActions/voiceMeter.ts 63%). Directory gone.

## Log
- [x] STARTED
- [x] AUTHORITY READ
- [x] DEFECT CONFIRMED
- [x] EDIT WRITTEN
- [x] SELF-CHECK PASSED (26/26, exit 0)
- [x] COMMITTED f0121f0c2
- [x] PROVEN
- [x] DONE

## Second commit 5fd41faad7b54d822d8660792405f402a37f7563
The 6th nav item took an equal width share and pushed «Пациенты» onto a 2nd line at 390px:
nav grew 64 -> 76px, label span 24px vs 12px. `flex: 0 0 auto` on the trigger returns the
width to the five neighbours. Re-measured: nav 64px, all six labels span 12px = one line.

## Proof summary (full numbers in handoff.md)
- UNIT: 26/26 pass, exit 0.
- MEASURED live: old dock hosts 0; reserve var ""; position:fixed in bottom-right corner = 0 at
  1600x1100 and only `.dnt-bottom-nav` itself at narrow; trailing dead space 390x844 = 188px
  computed / 190px actual vs 299px before (-111px, 35.4% -> 22.5% of viewport); 0
  elementsFromPoint and 0 getBoundingClientRect over 120 scroll frames at all three viewports;
  «Запись» 364x44 with 0 fixed elements over its centre; phone panel really opens (hidden
  true->false, 390x299, 0px gap to nav top, 3 labelled actions each 57-73px tall).
- SMOKE: check-css-tokens 0 unresolvable; smoke:web-text-encoding 0 mojibake.
- NOT MINE: `npm run typecheck -w @dental/web`, `npm test -w @dental/web` (§7a, lead's).

## Second collision, reported not touched
After my commit, dente-redesign.css line 1 lost its BOM. Not my hunk (mine were 683-922).
Left dirty, not reverted, not staged.
