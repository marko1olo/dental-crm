# P4-stack-leak — ADVERSARIAL REVIEW

Reviewer: adversarial subagent (did not write this code). Posture: disbelief by default.
Review HEAD at time of writing: `9d8a71f1cbe9211e43356f7ff8546aeac2169b59`
Commit ordered for attack: `1530ccdc75a49dc4a8e05c0b214ba182732e661f` (this is the **docs** commit; the
actual code lives in `800bde54f` and `068cc6f0c`, so all three were attacked).

STATUS: IN PROGRESS — written incrementally, sections appended as evidence lands.

---

## 0. What the packet actually consists of

| Commit | Subject | Files |
|---|---|---|
| `800bde54f` | `fix(разделы): сотруднику клиники показывали стек JavaScript` | 2 (boundary + test) |
| `068cc6f0c` | `fix(разделы): переименование сломало проверку исходников smoke` | 3 — **one is a foreign deletion** |
| `1530ccdc7` | `docs(пакет P4): отчёт по утечке стека в границе ошибок разделов` | 5 (all packet docs) |

---

## 1. Attack surface

| # | Hypothesis | Result | Evidence |
|---|---|---|---|
| H1 | The defect was real at `workspaceRouteErrorBoundary.tsx:22` before the fix | **CONFIRMED** | `git show 800bde54f^:apps/web/src/workspaceRouteErrorBoundary.tsx` line 22 is verbatim `return error instanceof Error ? \`[Error] ${error.message}\n${error.stack \|\| ''}\` : String(error);` and old `render()` drew `{this.state.detail}` into `<small>` with no mode branch. |
| H2 | The fix is on dead code | **DISPROVED** | `rg -n "WorkspaceRouteErrorBoundary" apps/web/src` — `App.tsx:326` imports it and instantiates it at lines 3476, 3637, 3700, 3734, 3856, 3998, 4082, 4118, 4165, 4719 (imaging, schedule, patients, visit, documents, finance, communications, analytics, settings, marketing). Every routed workspace view. Chain terminates in rendered JSX, not in an unused export. |
| H3 | The leak is still open in a real production build | **DISPROVED** | esbuild probe reproducing Vite's static define: `npx --no-install esbuild apps/web/src/workspaceRouteErrorBoundary.tsx --bundle --format=esm --jsx=automatic --external:react --minify --define:import.meta.env.PROD=true`. Output contains `includeDiagnostics:!1` at the only call site, so `diagnostics` is `""` and the diagnostics `<small>` evaluates to `null`. |
| H4 | Builder's claim "the diagnostics branch is dead code after build" | **DISPROVED (builder's framing is wrong, but not a leak)** | Same probe: `function p(t){...\`[Error] ${t.message}\n${e}\`...}` — the stack formatter **survives minification with PROD=true**, because the flag arrives as a runtime property of an argument to an *exported* function, which no bundler can prove constant. It is unreachable only because the single in-app call site passes `!1`. |
| H5 | Soft-retry button recovers a chunk-load failure | **CONFIRMED AS BROKEN** | React 19.2.7 `lazyInitializer` (`node_modules/react/cjs/react.development.js:481,513`): on rejection it sets `payload._status = 2; payload._result = error` and every later call ends at `throw payload._result;`. The route components are module-level constants (`App.tsx:385-396`, `const PatientsView = lazy(...)`), never recreated. `setState({presentation:null})` re-renders the same memoised payload → immediate re-throw. For the chunk case — the exact case whose hint says «Файлы раздела не загрузились» — «Повторить открытие» can never succeed; it redraws the same panel with a fresh timestamp. |
| H6 | Hollow facade / fabricated constant | *pending* | |
| H7 | Second owner of an existing concept | *pending* | |
| H8 | `useAppLogic.tsx` return block touched | *pending* | |
| H9 | Listener/interval/subscription without teardown | *pending* | |
| H10 | Hardcoded hex / static px / undeclared Russian literals | *pending* | |
| H11 | Mojibake in diff or commit subject | *pending* | |
| H12 | The new unit test is orphaned (never runs in CI) | *pending* | |

---

## 2. Proof audit (every BUILDER CLAIMED PROVEN re-run verbatim)

| Builder claim | Re-run | Verdict |
|---|---|---|
| UNIT `node --import tsx --test apps/web/src/tests/workspaceRouteErrorBoundary.test.ts` → 8/8 | Re-run. `tests 8 / suites 1 / pass 8 / fail 0 / duration_ms 147.0771`, EXIT=0 | **REPRODUCES** |
| TYPECHECK `npm run typecheck -w @dental/web` → exit 0, empty | Re-run. `> tsc -b --noEmit`, no output, `TYPECHECK_EXIT=0` | **REPRODUCES** (at current HEAD, i.e. *after* the lead's repair commit — see §4) |
| SMOKE `node scripts/smoke-workspace-shell-source.mjs` → exit 1 with exactly 2 documented baseline failures | Re-run. Exit 1, output: `- Sidebar view hints must collapse on mobile to protect bottom navigation` / `- ScheduleView must not force smooth programmatic scrolling`. The builder's third failure is gone. | **REPRODUCES** |
| SMOKE `node scripts/smoke-app-update-recovery-source.mjs` → exit 0 | Re-run. `app update recovery source smoke passed`, EXIT=0 | **REPRODUCES** |
| ENCODING `node scripts/check-encoding.mjs` → exit 1, "all five entries are scripts/*.mjs", neither of my files listed | Re-run. Exit 1 with **ten** entries, four of which are repo-root `scratch_screenshot_*.js` / `script.cjs`, not `scripts/*.mjs`. | **MATERIAL CLAIM HOLDS** (no builder file in the list) / **COUNT AND COMPOSITION WRONG** — likely drift from concurrent agents, but the builder stated a specific composition that is not what the script prints. |
| COMMIT INTEGRITY `git log -1 --stat` after each commit | Re-run via `git show --stat`. `800bde54f` = 2 files (both the builder's). `1530ccdc7` = 5 files (all `.agents/archon/packets/P4-stack-leak/*`). `068cc6f0c` = 3 files, third is `apps/web/src/components/visit/VisitDictation.tsx | 399 ---------` | **REPRODUCES, including the contamination the builder self-reported** |

---

*(sections 3-6 appended below as the review continues)*
