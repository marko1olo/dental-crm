# W5-capture-theme-assert — ADVERSARIAL REVIEW (in progress)

Reviewer: adversarial subagent. Read-only on source. Written incrementally — may be killed mid-review.

HEAD at review start: 97460dfd31999a7b44ffb30981a121832b4148f9

## Static verification done so far

### CONFIRMED: the dead key is real, at the exact cited line
`git show f8792f6c9^:scripts/ops-panels-shots.mjs | sed -n '207p'` →
`      window.localStorage.setItem("dente_theme", ${JSON.stringify(theme)});`
Line number matches the claim exactly (207, pre-fix).

### CONFIRMED: nothing reads `dente_theme`
`git grep -n "dente_theme" HEAD -- apps/ packages/` → ONE hit only:
`apps/web/src/store/themeStore.ts:5:const THEME_STORAGE_KEY = "dente_theme_mode";`
So the pre-fix pipeline wrote a key with zero readers. Claim holds.

### CONFIRMED: the fix is reachable, not an invented contract (§10)
`window.__useThemeStore` is a REAL pre-existing global:
`apps/web/src/store/themeStore.ts:33` sets it unconditionally (`typeof window !== "undefined"`),
no dev-only guard. The packet touched only `scripts/` + its own packet dir (verified by --stat:
1 file, 1 file, 8 packet files), so this global pre-existed and was not invented for the fix.

### CONFIRMED: `applyThemeToRoot` / AppShell:66 citation is accurate
`apps/web/src/AppShell.tsx:66` → `applyThemeToRoot(document.documentElement, resolveTheme(themeMode, media.matches))`
inside `ThemeController`, `useEffect` keyed on `[themeMode]`, plus a `prefers-color-scheme` listener
when mode is `auto` (line 70-73). So the mechanism claim — a manual `data-theme` poke is silently
reverted by the app — is structurally correct.

### CONFIRMED: night has an empty <html> class by design
`apps/web/src/lib/themeClasses.ts:49-50`: `darkClass: theme === "dark"`, `lightClass: theme === "light"`.
Night gets neither. The packet's "night 75/88, класс «»" claim is consistent with source.

### CONFIRMED: the debt item about the two other scripts is real
`git grep -n "dente_theme\b" HEAD` → `scripts/comprehensive-visual-audit.mjs:405` and
`scripts/fast-audit.mjs:405` still write the dead key. Both line numbers exactly as declared.

### CONFIRMED: script 2 removal of the blind click is NOT a functional regression
The removed `button:not([disabled])` click dismissed the PIN lock. `nav()` at
`scripts/dente-redesign-shots.mjs:328-340` does type the PIN addressably (staff card click, then
the button whose textContent is `0`, four times). So the capability was not deleted, it was
already duplicated in `nav()`. Claim holds on static reading. NOT proven at runtime (script never run).

## NUMBERS RE-DERIVED BY ME (all reproduce)

| Claim | My measurement | Verdict |
|---|---|---|
| `git grep -c assertThemeBeforeShot HEAD -- scripts/` = 6 / 2 | ops 6, redesign 2 | CONFIRMED |
| diff ops +344/-52 | numstat 344 52 | CONFIRMED |
| diff redesign +269/-33 | numstat 269 33 | CONFIRMED |
| 34 plates, 34 unique md5 | manifest 34/34; `[.shots[].md5] \| unique \| length` = 34 | CONFIRMED |
| duplicateAlert light 93e6…/dark 021c…/night 4e7b… | my `md5sum`: identical three | CONFIRMED |
| no byte-identical pair among all plates | `md5sum *.png \| uniq -d` empty (36 png) | CONFIRMED |
| 88 theme tokens; light 86 / dark 88 / night 75 declared | MY OWN RUN printed exactly 88, 86, 88, 75 | CONFIRMED |
| palette light aaa45b8822ec / dark 970a851ebd9c / night 3f921b636cee, light@720x1100 = light@1600x1000 | MY OWN RUN: identical four fingerprints | CONFIRMED |
| wall clock ~90.5 s | my run 09:08:53.742Z -> 09:10:25.256Z = 91.5 s | CONFIRMED |
| `rg themeMode apps/web` = themeStore, themeClasses, AppShell, workspaceShell, QrGatewayPanel | exactly those five | CONFIRMED |
| only one writer of data-theme in apps/ | `lib/themeClasses.ts:59` only; only caller of setThemeMode outside the store is `workspaceShell.tsx:353` | CONFIRMED |

### Forensics claim CONFIRMED by a stronger method than the builder used
The builder claimed `dente_theme_mode` had ZERO occurrences in the capture profile's leveldb.
When I ran it, `dente_theme_mode` has NINE — because the builder's own fixed pipeline has since
written it. I settled the ordering with byte offsets in the append-only log
(`%TEMP%/dente-ops-shot-profile/Default/Local Storage/leveldb/000009.log`):

    bare dente_theme      : offsets 64, 168, 9127, 18127, 18344, 22789, 23006,
                            27451, 27668, 27772, 32390, 36842, 37059, 37163   (14 — matches claim)
    dente_theme_mode      : offsets 46538, 46647, 46755, 46967, 47076,
                            52016, 52124, 52233, 52342                        (9, ALL later)

Every correct-key write is strictly after every dead-key write. The dead-key era is real and the
correct key first appears only post-fix. Forensic claim stands.

---

## THE DEFECT I FOUND: THE FIX MADE THE PIPELINE UNABLE TO EXIT 0

**`scripts/ops-panels-shots.mjs:70-76` and `scripts/dente-redesign-shots.mjs:64-70` — REGRESSION,
and it falsifies the packet's central proof claim.**

Both commits deleted `browser.kill()` from the end of the script body and moved it into
`process.on("exit", …)`. Verified in the diffs: `-browser.kill();` at old line 521 (ops) / 380
(redesign), `+    browser.kill();` inside the new exit handler in both. At HEAD, `browser.kill()`
exists ONLY inside `process.on("exit")` in both files; there is no `process.exit()` anywhere.

The browser is spawned with `stdio: ["ignore","ignore","pipe"]`. Nobody ever reads `browser.stderr`.
That live pipe keeps the libuv loop referenced, so the loop never drains, so `process.on("exit")`
never fires, so the browser is never killed, so the pipe never closes. Deadlock — on the SUCCESS path.

MY RUN, the packet's own claimed proof command:
- all 34 plates written, audit clean, final line printed at 09:10:25.256Z
- process still alive at 09:20:04Z — **11.2 minutes**, doing nothing
- four `msedge.exe` on `--remote-debugging-port=9341` still alive with it
- TRUE EXIT CODE observed: **1**, and only because I force-killed it. Never 0.

Minimal reproduction isolating the mechanism (two 12-second timeouts):

    spawn(child, {stdio:["ignore","ignore","pipe"]}) + kill only in process.on("exit")
      -> exit 124 (TIMED OUT, hangs forever)
    same child, child.kill() as the last statement of the body  (THE PRE-FIX SHAPE)
      -> exit 0 immediately

Consequences:
1. **"SMOKE VERIFIED: `node scripts/ops-panels-shots.mjs` TRUE EXIT 0" is DISPROVED.** The committed
   code cannot return 0. The green path returns nothing at all.
2. The handler was added with the stated purpose "без этой строки на общей машине оставался бы висеть
   headless Edge". It achieves the exact opposite: it *guarantees* a leaked Edge on every green run.
   Pre-fix, `browser.kill()` in the body always ran on success.
3. The RED path still exits 1 correctly (an unhandled top-level rejection bypasses the loop), which
   is why the guard-red demo genuinely showed exit 1. So the packet proved the failure path and
   never actually held the success path's exit code in its hand.
4. Any CI step, script or agent that runs this pipeline and waits for it now hangs indefinitely.

Fix: keep `process.on("exit")` as a crash-path safety net, and either restore an explicit
`browser.kill()` + `process.exit(0)` after a clean audit, or `browser.unref()` / attach a drain on
`browser.stderr` so the loop can empty.

---

## DEFECT 2: THE SECOND SCRIPT IS BRICKED — IT CANNOT TAKE ONE SHOT

**`scripts/dente-redesign-shots.mjs:295` + `:302-314` — the packet made a broken predicate fatal.**

I ran the command the builder declared as the closing command for its own NOT VERIFIED item:

    node scripts/dente-redesign-shots.mjs
    TRUE EXIT: 1
    Error: Раздел «shift» не открылся за 10 с: контейнер #shift, .shift-hero, .panel
           не появился или остался aria-busy. Снимать нечего, прогон остановлен.
    png written: 1   (only НЕ_ОТКРЫЛСЯ_shift.png)

It dies on the FIRST of 11 views. Zero of the 45 shots are taken.

**And the error message is FALSE.** I opened the diagnostic PNG the packet itself added. It shows the
shift view **fully rendered in the light theme**: «СЕЙЧАС В РАБОТЕ», «Расписание приемов на сегодня»,
«Что сделать сейчас», the nav rail, the patient card. The container appeared and is not aria-busy.
The packet's own diagnostic artefact refutes the packet's own error text.

Mechanism — a pre-existing selector bug the packet promoted from harmless to fatal without checking it:

    const sel = panelMap[viewName] || '.panel';            // '#shift, .shift-hero, .panel'
    const ready = Boolean(document.querySelector('#shift, .shift-hero, .panel')
                  && !document.querySelector('#shift, .shift-hero, .panel[aria-busy="true"]'));

In a CSS selector list, `[aria-busy="true"]` binds ONLY to the last item (`.panel`). The second
`querySelector` therefore matches any `#shift` or `.shift-hero` **regardless of aria-busy**, so
`ready` is permanently `false`. `ShiftView.tsx:173` renders `<section className="shift-hero" id="shift">`,
so both match. All 11 mapped views have an `id="<view>"` container (9 in `App.tsx`, plus `ShiftView.tsx`
and `MarketingView.tsx:136`), so the predicate is permanently false for **every** view.

The predicate line is byte-identical at the parent (`59b685f32^` line 133 == HEAD line 295), so the
bug is pre-existing and NOT the builder's. What the builder did was replace `console.warn` with
`throw` on top of a predicate that never becomes true — and never ran the result. Pre-fix the script
warned and shot anyway (the A0.1 disease, 56 files / 44 unique md5). Post-fix it produces nothing.
Directionally right, operationally dead.

This also voids the packet's own mitigation story: its NOT PROVEN item 4 says «От класса A0.1 …
защищает только падение waitForViewReady, добавленное во второй сценарий». That defence is not
merely unproven — it is broken, and it fires on healthy runs.

---

## DEFECT 3 (PROOF AUDIT): THE COMMIT MESSAGE ASSERTS A CAUSE ITS OWN FORENSICS REFUTE

`f8792f6c9` body: «…data-theme молча возвращается к значению из хранилища. **Так** плита
light_duplicateAlert.png оказалась побайтово равна ночной (VISUAL_VERDICT.md, C1): светлый прогон
снял ночную панель.»

The stored value was `auto` — that is the packet's own forensic finding (the correct key had never
been written). And `apps/web/src/lib/themeClasses.ts:46`:

    const theme = themeMode === "auto" ? (prefersDark ? "dark" : "light") : themeMode;

`auto` resolves to **light or dark, never night**. I confirmed there is exactly one writer of
`data-theme` in `apps/` (`themeClasses.ts:59`) and one caller of `setThemeMode` outside the store
(`workspaceShell.tsx:353`, the UI switcher) — no clock-based night switch, no second writer. So the
mechanism named in the commit body **cannot** produce night pixels under a light name.

The handoff says this plainly («Точный путь … остаётся неизвестным … а `dente_theme_mode` в том
профиле не появлялся»). The commit message does not — it states the causation as established with
«Так». The commit body is the artefact that outlives the packet folder. §8b: never present plausible
as verified.

---

## SMALLER FINDINGS

4. **No expected-plate-count assertion** (`ops-panels-shots.mjs:735-755`). The audit counts what was
   written and md5-dedupes it, but nothing asserts that the expected plates EXIST. A run that
   captures 3 of 34 panels prints «нет плиты» for the rest and finishes green. For an anti-fabrication
   pipeline, «34 плиты, 34 уникальных md5» means nothing without «34 из 34 ожидаемых». The builder
   documents the symptom (run 1: 1 plate, 24 `_ПУСТО`) but did not close it.

5. **The md5 audit throws after the evidence is already on disk.** Plates and `theme-audit.json` are
   written first; the collision check runs at the very end. Byte-identical plates therefore survive
   in the directory for the next reader to glob. The theme guard, by contrast, throws before writing —
   the right shape. (Also: this is the ONLY guard that would have caught C1 if the DOM state was
   honest and the pixels were not, and it is the one the packet never proved red.)

6. **1581 lines of duplicated pipeline committed** as `guard-red-demo.mjs` / `guard-red-demo-md5.mjs`.
   I diffed both against `scripts/ops-panels-shots.mjs`: today they differ only in OUT, cdpPort,
   profile and the isolated sabotage block — honest copies. But they are snapshots: as `scripts/`
   changes they rot silently, and a future agent re-running them to "prove the guard" would be
   proving a stale copy.

7. **The cited smoke does not cover the changed files.** `scripts/smoke-web-text-encoding.mjs:7`
   walks `apps/web/src` only. It is not evidence about `scripts/`. I ran the repo's own
   `createMojibakePattern()` against both changed scripts and both packet docs myself:
   0 mojibake hits, 0 garbled-question hits, no BOM. Clean — but the builder's citation was the
   wrong instrument.

8. **`className` is read but never asserted.** `THEME_STATE_EXPRESSION` returns `className` and the
   log prints it, yet no check compares it to the theme. The hybrid-theme defect the pre-fix comment
   describes was exactly a stale-class defect. It is structurally impossible now (`applyThemeToRoot`
   sets attribute and classes together), so this is a nit — but note that tokens overridden by
   class-only selectors (`token-aliases.css:160`, `html.dark:not([data-theme])`) are invisible to the
   fingerprint, because discovery keys on `[data-theme=` alone.

9. **The filename/theme cross-check silently no-ops for 10 of 34 plates.**
   `THEMES.find((c) => fileName.includes(c))` returns undefined for `narrow_*` (8), `finance_full`,
   `communications_full`. Those still get the data-theme/mode/palette checks, so nothing is
   fabricated — but the name check is not the universal guard the handoff implies, and it would
   misfire if a panel slug ever contained "light"/"dark"/"night".

---

## WHAT REPRODUCED — CREDIT WHERE DUE

- Guard goes red: `guard-red-demo.mjs` → **TRUE EXIT 1, 0 png written**, error text verbatim
  identical to the claim, thrown from `assertThemeBeforeShot` before the shutter.
- API: `/api/patients/duplicates` with the on-disk token and the app's real headers
  (`x-dente-clinic-token` / `x-dente-staff-token`, per `apps/web/src/lib/apiAuthFetch.ts:22-23`) →
  **HTTP 200, candidates 3**. (My first 401 was my own wrong header, not the token.)
- `npm run smoke:web-text-encoding` → **TRUE EXIT 0**, mojibakeHits 0, garbledQuestionHits 0,
  430 files.
- `node --check` PARSE OK on both scripts.
- Clean rename: no dangling `setTheme(` call left in script 1.
- No hardcoded hex introduced in either diff.
- Script 2's removed blind `button:not([disabled])` click is genuinely redundant — `nav()` at
  `:328-340` types the PIN addressably.
- No rebuild was needed for this proof surface: the API on 4100 runs `npm run dev -w @dental/api`
  (source via tsx), not `apps/api/dist`. The stale-dist trap does not apply to this packet.

## GIT HYGIENE — CLEAN

- `f8792f6c9` → exactly 1 file, `scripts/ops-panels-shots.mjs`.
- `59b685f32` → exactly 1 file, `scripts/dente-redesign-shots.mjs`.
- `97460dfd3` → exactly the 8 declared packet files.
- One author throughout, no other agent's work swept in, `git status --porcelain -- scripts/` empty
  (so the version I ran is the version committed), `git ls-files .dente-ops-shots` = 0.
- Russian subjects intact, no mojibake in any of the three messages.

## DISCLOSURE — ARTEFACTS I CHANGED ON DISK (both untracked)

- `.dente-ops-shots/` now holds **MY** run (09:08:53Z–09:10:25Z), not the builder's. The builder's
  manifest and md5 list are preserved at `_rev_builder-manifest.json` / `_rev_builder-md5.txt`.
- `.dente-redesign-shots/` I emptied before running script 2; it now holds only my
  `НЕ_ОТКРЫЛСЯ_shift.png`.
- I force-killed my own hung node 28428 and its 4 Edge children. No other process touched.

## VERDICT: NEEDS_REWORK

Not REVERT. Script 1's guard is real, is proven red, and replaces captures that asserted nothing;
the theme is now driven through the app's own store with the correct key, and that is a genuine
improvement worth keeping. But the packet's central green-path proof does not exist, and the second
commit ships a script that cannot run.

