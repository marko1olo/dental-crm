# VISUAL VERDICT — read directly, 2026-07-28

Made by the outgoing lead by **opening the PNG files and looking at the pixels**, not by reading captions.
Five plates read. This is the axis that cannot be delegated: a design verdict from someone who did not open
the image is fabrication.

---

## 0. THE SHOT SET IS PARTLY FABRICATED — verify before trusting any capture

`.dente-redesign-shots/` holds **56 PNGs with only 44 unique MD5 hashes.**

Six desktop files are **one byte-identical file** (`2e0e8e9e68466e9e3e777e19ca863ee1`, 94,732 bytes each):
```
desktop_light_schedule.png   desktop_dark_schedule.png   desktop_night_schedule.png
desktop_light_shift.png      desktop_dark_visit.png      desktop_light_shift_collapsed.png
```
Plus `mobile_light_shift.png` = `mobile_dark_visit.png` (`4272a7…`, 182,054 bytes) and more in that group.
All of the clones are timestamped **2026-07-27 10:18**, later than the honest 03:4x / 04:0x batch.

**And the image itself is not a screen at all — it is a Vite CSS build error overlay:**
```
[plugin:vite:css] [postcss] apps/web/src/styles/main.css:16846:24: Unknown word display
16846|   .nav-copy small {\n    display: none;
```
A literal `\n` escape had been written into `main.css` — the signature of `node -e` / regex file surgery,
the exact failure mode `.agents/AGENTS.md` §8a bans. **The entire stylesheet failed to compile**, and the
screenshot pipeline captured the error overlay six times and filed it under three theme names.

**Verified 2026-07-28: the CSS bug is fixed** — `main.css:16840-16852` is clean, the web server returns 200
and serves a 405 KB `main.css`. So those six files are a **stale artifact of a broken moment**, not a
current defect. They must be regenerated or deleted; leaving them is how the next reviewer certifies
"56 unique screenshots, 0 blank pages" again.

**Standing rule this produces:** every capture batch must be MD5-audited *by the lead*, and any run whose
`waitForViewReady` warned must be discarded, not filed. `dente-redesign-shots.mjs:140` warns and proceeds —
that line is why this happened.

---

## 1. `.dente-ops-shots/light_reports.png` — «Отчёты руководителю». THE BENCHMARK.

This is the best screen in the product and the bar every other view should be judged against.

**What is right, and is worth protecting:**
- Real data, real numbers, real names. 67 400 ₽ / 22 приёма / 5 потеряно / 9 % неявок / 53 000 ₽ долга.
- **It is honest under uncertainty.** The `МАРЖА` column renders `—`, not a made-up number — someone fixed
  that path properly.
- **It warns about its own statistics**: "Данных мало: в меньшей группе 3 приём(ов), а разница становится
  осмысленной примерно от 30. Одна неявка здесь меняет вывод на противоположный." That sentence is worth
  more than the whole competitive-audit folder. This is what product maturity actually looks like.
- It states its own method in a footnote: "В выручку входят только полученные платежи; назначенные и
  возвращённые не учитываются."
- The «Работают ли напоминания» table is a genuine business insight, not a KPI tile.

**What is wrong:**
- **The warning banner's text is clipped at the right edge** — "…смотрите на состав групп, а не на разницу
  д" and it stops. A real overflow defect on a 1288px capture.
- **Three floating elements stack in the bottom-right corner**: a help FAB, a microphone FAB, and the
  «Поиск (Cmd+K)» pill — and the mic FAB sits **on top of the clipped warning banner**. Nobody composed
  that corner; three features each added one thing.
- The bar charts are hand-rolled `div` bars. `recharts@3.10.1` is installed and used elsewhere. Not wrong
  per se — the bars are legible — but it is a second charting vocabulary in the same product.
- **Flat typographic hierarchy**: `ВЫРУЧКА`, `ВРАЧИ`, `ПРИЁМЫ`, `РАБОТАЮТ ЛИ НАПОМИНАНИЯ`, `ДЕБИТОРКА` are
  all the same tiny grey uppercase. Five sections of very different importance rendered identically.
- The 6 KPI tiles are visually equal weight but semantically are not — «получено» is the headline,
  «7 / 0 первичные/повторные» is a footnote. Only the first tile is tinted, and the tint reads as
  "selected", not "primary".

---

## 2. `.dente-redesign-shots/desktop_dark_analytics.png` — the Analytics view is DEAD

The entire content area renders one line of English error text:
```
Failed to execute 'json' on 'Response': Unexpected end of JSON input
```
…inside a dashed-border box, under the heading «Аналитика клиники» with a working «За всё время» period
selector, and a stray 20×20 grey square artifact below it. Nothing else. The rest of the viewport is empty.

Three separate defects in one frame:
1. **The endpoint returns an empty body** and the client `res.json()` throws on it.
2. **The raw browser exception string is rendered to the user**, in English, in a Russian product. There is
   no error state design for this view — the exception message *is* the error state.
3. This is the same view that `AnalyticsDashboardView.tsx:438/:450` renders `+null ₽` and `null%` on when it
   *does* get data (see `RECON_DOSSIER.md` §5.2). **The Analytics screen has never worked.**

For contrast: the manager-reports panel in §1 does the same job correctly. The product already contains the
answer to its own broken screen.

**The dark theme itself is good** — deep navy ground, elevated card surface, teal accent, legible header
chips, proper contrast. The palette is not the problem.

---

## 3. `.dente-redesign-shots/desktop_light_patients.png` — composition, not colour

**Right:** clean light surface, 14px radii, teal primary, decent field styling, real empty-state copy
(«Выберите пациента в списке или расписании, чтобы увидеть его данные»), a «Сохранено» pill.

**Wrong, in order of damage:**
- **The left rail is 11 unlabelled icons with no text and no visible tooltips.** At least three are the same
  "sparkle" glyph at different positions. A receptionist cannot learn this nav; they will memorise
  positions. `workspaceShell.tsx` already defines `viewLabels` and `viewHints` — the labels exist and are
  not being shown.
- **Two competing "Карточка пациента" blocks on one screen** — an empty-state card top-left saying no
  patient is selected, and a full patient form below saying «Сохранено». Which one is the card?
- **The search magnifier glyph is rendered on top of its own placeholder text** — the icon sits over the
  «П» of «Поиск пациента». A z-index/padding defect, visible at full size.
- **Two search-shaped inputs side by side** («Поиск пациента: ФИО или телефон» and «ФИО, телефон, дата
  рождения (Enter)») with a «+ Создать» button. Search and create are the same visual object.
- The demo-mode banner with an orange CTA is the single most visually dominant element on a clinical screen.
- Header row mixes: date, clinic name, a role chip, a «Недавние 2» chip, four unlabelled icon buttons, and
  the primary «+ Запись». Six independent controls, no grouping, no hierarchy.

---

## 4. `.dente-redesign-shots/mobile_light_patients.png` (390×844) — the header eats the phone

**Right:** the bottom nav is genuinely good — 5 items, **labelled** (Смена / Записи / Пациенты / Приём /
Ещё), clear active state with a tinted pill. Touch targets are large. Text scales without clipping.

**Wrong:**
- **Roughly the top third of the viewport is chrome before any content**: demo banner (two lines + a
  full-width orange button), then date, then clinic name, then a role chip, then one orphan icon button
  sitting alone on its own row, then a full-width «+ Запись». **A patient list screen shows no patients
  above the fold.**
- «Стоматология, 1 …» is **truncated**; the desktop shot shows the full «Стоматология, 1 кабинет».
- The same magnifier-over-placeholder overlap as desktop, more pronounced.
- **A floating search FAB in the bottom-right overlaps content** and duplicates the two search inputs
  already on screen — three ways to search, on a phone.
- «Пациент не выбран» consumes a full card block to communicate nothing on a 390px screen.

---

## 5. THE CONCLUSION THAT ORDERS THE WORK

**The palette, the theme system and the typography are not the problem.** Three coherent themes exist, they
are driven correctly through `data-theme` + a Tailwind custom variant, contrast is broadly fine, and one
screen (manager reports) is genuinely excellent. A "redesign" that repaints things would be wasted motion.

**The gap is composition, hierarchy, and screens that do not work at all.** Concretely, in priority order:

1. **Dead and lying screens.** Analytics renders an exception string; `+null ₽` renders as a green profit.
   No amount of styling fixes a screen with no data path. **A broken screen is a design defect.**
2. **Nobody owns a corner or a header.** Three FABs in one corner, six ungrouped controls in one header,
   two "patient card" blocks on one page. Each feature added its own element and no one composed the result.
   This is the single largest visible quality gap and it is a *layout ownership* problem.
3. **Chrome-to-content ratio, especially on mobile.** The demo banner, the role chip and the date block are
   permanent residents of the most valuable pixels on every screen.
4. **The nav rail is unlabelled while the labels exist in code.**
5. **Small real defects that read as sloppiness**: icon-over-placeholder, clipped warning text, truncated
   clinic name, the stray grey square on Analytics.
6. **No design system to hang any of this on** — 15 CSS files, 21,947 lines, four of them explicit repair
   layers, 122 tokens split across two competing `:root` blocks, 347 hardcoded hexes in `main.css`, zero UI
   primitives beyond three loose components. Every fix above is currently a hand-edit in a 16,895-line file.

So the design axis and the integration axis are **the same campaign**. «Охуенный дизайн» here does not mean
new colours; it means: every screen has data, every corner has an owner, every repeated element is one
component, and the CSS that expresses it is a system rather than twelve sedimentary layers.

---

---

# ADDENDUM — 2026-07-28, read directly by lead [ARCHON]

Four more plates opened with my own visual modality. Two corrections to §0 and three new verdicts.

## A0. THE CLONE COUNT WAS UNDERSTATED, AND MD5 AUDITING IS NOT ENOUGH

**Correction to §0: it is not six cloned desktop files, it is fourteen files across two clone groups.**
Re-audited 2026-07-28:

| md5 | count | files |
|---|---|---|
| `2e0e8e9e…` | **10** | `desktop_{light,dark,night}_{schedule,shift,visit}.png` + `desktop_light_shift_collapsed.png` |
| `4272a7bf…` | **4** | `mobile_{light,dark}_{shift,visit}.png` |

56 files, 44 unique hashes. **Every clone is timestamped `07-27 10:18`**; every honest capture is from the
`01:41`, `03:4x` or `04:0x` batches. One bad run at 10:18 produced all 14.

I opened `desktop_light_schedule.png` myself. It is a **Vite CSS error overlay**, confirmed first-hand:
`[plugin:vite:css] [postcss] main.css:16846:24: Unknown word display`, source line
`.nav-copy small {\n    display: none;` — a literal `\n` escape written into the stylesheet, the
signature of regex/`node -e` file surgery — plus a full postcss stack. That single image is filed under
ten different view-and-theme names. Correction to the earlier note: mobile *schedule* IS valid; the
views with **no valid desktop capture** are `schedule`, `shift`, `visit`.

### A0.1 THE RUBRIC THAT LET THIS THROUGH IS STILL WRONG, AND MINE WAS TOO

`mobile_light_documents.png` has a **unique MD5** and is **116.9 KB**, so it passes the "N/N unique
hashes, ≥40 KB, no blank pages" rubric that certified the last milestone — and it passed my own hash
audit today. **It is not the documents view.** It is the staff PIN lock screen
(«Сотрудники клиники — выберите свой профиль для разблокировки смены»), captured dimmed, and it is
itself broken:
- An **unstyled white box with plain black text** — no card, no radius, no token colours — reading
  «Список сотрудников загружается или пуст. Добавьте персонал в разделе Настройки → Кадры.» It breaks
  out of the layout and **overlaps** the «Выйти из аккаунта клиники» link underneath it.
- The keypad is rendered disabled/greyed while still being the focal element.
- **Desktop copy leaking into a 390 px mobile layout:** «Нажмите на сотрудника слева». There is no
  "left" on this screen; the staff list is above.

**Standing rule, upgraded:** hash-uniqueness proves a file is not a *clone*. It proves nothing about
whether the image shows the view it is named after. `dente-redesign-shots.mjs:140` warns and proceeds
when `waitForViewReady` times out, so a run that never left the auth gate produces MD5-unique,
correctly-sized, completely wrong screenshots. **Only opening the image catches this class.** Any
capture batch must be opened, not hashed. This is why the visual axis is non-delegable.

## A1. `desktop_light_documents.png` — the strongest domain content, the weakest composition

**Right, and worth protecting:** real regulatory literacy on screen — «Налоговый год 2026 · КНД 1151156
с 2024 года; старая справка для 2021-2023». An honest empty state («Последних документов пока нет…»).
A dated provenance line, «Клинический план лечения из визита и прайс-листа · проверено 2026-05-24».
And an anti-fabrication statement written into the UI itself: «План должен брать услуги и суммы из
серверных фактов пациента/визита, а не из свободного текста браузера.» Someone cared here.

**Wrong:**
1. **The global header CTA is «+ Запись» on the documents screen.** The actual primary action,
   «Создать выбранный документ», sits at the bottom in a weaker button. The header CTA is
   context-blind and it is the same on every view.
2. **Nested card soup:** the «Документы к закрытию» card contains six stacked bordered containers
   (empty-state, tax year, document select, clinic template, treatment plan, expander) with near
   identical border, radius and padding. Everything is equally weighted, so nothing reads as primary.
3. Same demo banner, same six ungrouped header controls, same 11-icon rail.
4. «Открыть последний» is a text link competing with the card title on the same line.

## A2. `desktop_light_finance.png` — honest zeros, incoherent payment composer

**Right:** four KPI tiles each carrying an honest sub-label («0 открытых позиций», «0 платежей по
текущему пациенту», «0 документов без оплаты»), and the header states the *cause* of the emptiness —
«СВОДКА ПО ПАЦИЕНТУ: ПАЦИЕНТ НЕ ВЫБРАН». These zeros are truthful, not fabricated. Good actionable
empty state for «Варианты плана». «Фискальный чек и кассир» shows 54-ФЗ awareness.

**Wrong:**
1. **«3800» is pre-filled into «Сумма к оплате (₽)» while no patient is selected and every total on
   screen is 0 ₽.** A number with no derivable source, sitting in a money input. This is a candidate
   defect packet, not merely a layout nit — verify where it comes from.
2. **The payment row is five ungrouped control clusters in one band:** a dictation card (taller,
   top-aligned), three unlabelled preset chips, the amount field, quick-amount chips, and method chips
   wrapping to two rows. Different alignments, two clusters with no label at all.
3. **Placeholder clipped mid-word:** «Пример: Оплата 5000 ка». Same overflow class as the clipped
   warning banner in §1.
4. Two dictation affordances visible at once (header mic + payment dictation card).
5. KPI tiles are equal weight, but «Остаток» — what the patient actually owes — is the operational
   headline. No hierarchy.

## A3. WHAT THE FOUR PLATES SETTLE

The chrome is **identical and identically wrong on every screen**: demo banner, date/clinic block, role
chip, «Недавние» chip, four unlabelled icon buttons, «+ Запись», and an 11-icon unlabelled rail in
which positions 1, 8 and 11 are the same sparkle glyph. It consumes roughly the top quarter of every
desktop view and the top third of every mobile view, and it is context-blind — the same primary CTA on
documents, finance and patients.

**That makes the shell, not any individual view, the highest-leverage design target.** One owner for
the rail, one for the header, one for the corner. Fixing it once fixes every screen; fixing screens
one at a time never fixes it.

---

---

# ADDENDUM B — 2026-07-28, lead [ARCHON], the ops-shot pipeline

Two more plates opened directly, both from `.dente-ops-shots/` — the ONE pipeline the dossier rates as
trustworthy. **35 files, 35 unique MD5.** It also honestly filed four `_ПУСТО` misses for
`duplicateAlert` (light/dark/night/narrow) instead of shooting a blank and calling it a capture. That
is the behaviour `dente-redesign-shots.mjs:140` lacks, and it is why this pipeline is the one to use.

## B1. `light_duplicateAlert_ПУСТО.png` — the SECOND screen that meets the bar

The panel the pipeline recorded as a miss happens to contain the best table in the product.

**Right, and worth protecting:**
- «Дубли карточек пациентов» — columns ПЕРВАЯ КАРТОЧКА / ВТОРАЯ КАРТОЧКА / ЧЕМ ПОХОЖИ / ЧТО ДЕЛАТЬ.
- **95 % совпадения** with a green check where ФИО and date of birth both match.
- **35 % совпадения** in amber with real clinical-administrative reasoning:
  «Осторожно: Скорее всего это родственники: муж и жена, мать и ребёнок. Объединять нельзя без
  проверки.» A naive product would have merged those two records.
- A footnote stating its own method AND its own safety guarantee: «Совпадение телефона само по себе
  дублем не является… При объединении вторая карточка не удаляется: она остаётся архивной ссылкой на
  первую, а все записи, оплаты и снимки переносятся.»
- Three unambiguous actions per row.
Together with the manager-reports panel, this is the standard the rest of the product should be judged
against — not a visual standard, an **honesty** standard.

**Wrong, and one of these is new:**
1. **NEW DEFECT — solid black rectangles rendered over text.** In the left-hand patient cards
   («Савельева Ольга Игоревна», «Громов Илья Андреевич») a filled black bar sits where a label should
   be, on a light surface. This is rendered content, not redaction. Almost certainly a badge/pill
   resolving to a missing colour — `styles/token-aliases.css` documents **19 undefined `var()` names
   used 56 times**, and an undefined custom property in a `background` collapses exactly like this.
   Worth its own packet: find the offending class, fix the token, and add a guard so an undefined token
   cannot ship.
2. **The three-FAB corner is not merely ugly — it OVERLAPS interactive controls.** The mic FAB clips
   the «Сохранить» button of the treatment-plan panel and truncates «Подпи…». Users cannot reach a
   save button that a floating button is sitting on.
3. «Массовые операции» renders as a low-contrast greyed chip that reads as disabled.

## B2. `narrow_full.png` — the 720×1100 breakpoint, judged for the first time

**Right:** the duplicates table **reflows into a stacked label/value layout** (ПЕРВАЯ КАРТОЧКА /
ВТОРАЯ КАРТОЧКА / ЧЕМ ПОХОЖИ / ЧТО ДЕЛАТЬ as row labels) rather than squashing the columns. That is a
correct responsive pattern and someone did it deliberately. The bottom nav is labelled and has a clear
active state (Смена / Записи / Пациенты / Приём / Ещё).

**Wrong:**
1. **Roughly 45 % of the width is a single empty white panel.** At the exact breakpoint where space is
   scarcest, nearly half of it renders nothing.
2. The same three floating elements pile into the bottom-right, and the search FAB **collides with the
   bottom navigation bar**.

## B3. WHAT ADDENDUM B CHANGES

The composition verdict is now backed by five independent screens, and it has hardened into three
concrete, separately-ownable packets:
- **The corner.** Three FABs that overlap real controls. One owner, one stacking context, one rule
  about what may live there. This is a functional defect, not a taste question — a covered «Сохранить»
  button is unreachable.
- **The token integrity problem, now visible as black boxes on a light card.** 19 undefined `var()`
  names, 56 uses, 347 hardcoded hexes. A build-time or test-time guard against undefined tokens is
  worth more than any individual repaint.
- **Dead space at narrow widths**, alongside the mobile chrome-to-content ratio already recorded.

## 6. STILL UNJUDGED — the next lead must open these personally

Not yet read with my own eyes, so no verdict exists for them:
`visit`, `documents`, `finance`, `imaging`, `communications`, `settings`, `marketing`, `shift`, `schedule`
(the schedule/shift/visit desktop captures are the fabricated clones — **there is currently no valid
desktop capture of those three views at all**), the night theme in any view, the ops-shot panels
(`delivery`, `campaigns`, `callList`, `duplicates`, `duplicateAlert`), and the narrow 720×1100 breakpoint.

**First action for the next lead: `npm run dev`, re-seed the ops tokens, re-run both capture pipelines,
MD5-audit the output personally, and read the plates.** Until that is done, no visual claim about those
views may be made by anyone.

---

# ADDENDUM C — 2026-07-28 09:04, lead [ARCHON], a FRESH capture I ran and audited myself

Ran `node scripts/ops-panels-shots.mjs` against the live pair (api 200, web 200) with fresh
`.ops-shot-tokens.json`. Exit 0. **35 files, 33 unique MD5.** Then opened plates with my own eyes.

## C1. THE LIGHT THEME CAPTURE OF THE DUPLICATES PANEL IS NOT LIGHT

| file | md5 |
|---|---|
| `light_duplicateAlert.png` | `bdbf6e8a09e4` |
| `night_duplicateAlert.png` | `bdbf6e8a09e4` — **byte-identical to light** |
| `dark_duplicateAlert.png` | `021c73856027` — different |

I opened `night_duplicateAlert.png`: it is a warm dark olive panel with an amber left border. Since
light is byte-identical to it, **the light-theme run rendered the night panel.**

The tokens are not the problem — all three values exist and differ:
`token-aliases.css:130` `--srf-chip-soft: #f7fbf9` (light), `:140` `#16211f` (dark),
`:149` `#1a1714` (night); consumed at `main.css:9583`. The captured surface matches the NIGHT value.

Most likely cause, for whoever takes the packet: the theme is persisted in `localStorage`
(`dente_theme_mode`, via `store/themeStore.ts` → `applyThemeToRoot` → `root.dataset.theme`), and the
panel is shot **before the switch to light has been applied** — a race between theme application and
capture, not a palette defect. Note the pipeline's own log line during the narrow run printed
`html: класс «dark», data-theme «dark» | --srf-chip-soft: #16211f`, i.e. it *can* read the applied
theme — so the capture script has the means to assert it and does not.

**Consequence for the campaign: every light-theme plate from this pipeline is suspect until the capture
asserts `data-theme` immediately before shooting.** That assertion is cheap and belongs in the pipeline.

## C2. STALE `_ПУСТО` ARTIFACTS REMOVED

Four `*_duplicateAlert_ПУСТО.png` files dated **07-27 22:19–22:21** were still on disk while the
09:03–09:04 run captured that panel successfully. Nothing in `.dente-ops-shots/` is tracked (0 files in
`git ls-files`), so they were pure untracked residue that would tell the next reviewer the panel cannot
be captured. Deleted. Same class as the cloned redesign shots and the stale `dist`: **an artifact that
outlives the condition it recorded becomes a lie.**

## C3. WHAT THE FRESH PLATES CONFIRM AND REFUTE

- **The FAB corner fix is real and visible.** In `narrow_full.png` (720×1100) the three floating
  buttons now sit in a horizontal row above the bottom navigation and no longer collide with it. The
  functional defect from addendum B1 — a floating button parked on top of «Сохранить» — is gone at this
  breakpoint. (The separate reserve regression found by the U4 reviewer is a different question and is
  packet V1's.)
- **The 45 % dead width at 720×1100 is STILL OPEN**, confirmed with my own eyes: the right-hand ~45 %
  of the viewport is one empty bordered container. Packet V6 is aimed correctly.
- **The copy has genuinely improved and it is worth naming.** The duplicates panel now leads with
  «Похоже, у этого пациента есть ещё карточки: 2. Пока карточки не объединены, приёмы, оплаты и снимки
  разложены по разным местам, и долг не виден целиком.» — consequence-first, no jargon — and the
  actions are differentiated by confidence («Перенести сюда» at 95 %, «Всё равно перенести сюда» at
  35 %). The footnote explains the method and promises the second card survives as an archival link.
  This is the standard the rest of the product should be held to.

---

# ADDENDUM D — 2026-07-28, lead [ARCHON]: the theme race is CLOSED, and my own audit had a flaw

## D1. MY OWN VERIFICATION WAS WRONG: AN MD5 AUDIT OF A FOLDER IS NOT AN AUDIT OF A RUN

In addendum C I reported the capture batch as «35 files, 33 unique MD5». **Two of those 35 were not
part of the run.** `diag_analytics.png` and `diag_schedule.png` are dated **07-27 20:15** — seventeen
hours older than the batch — and **no script in `scripts/` writes a `diag_` prefix at all**
(`rg -n "diag_" scripts/` returns nothing). They were orphans from an ad-hoc run by something that no
longer exists, sitting inside the one folder the campaign treats as trustworthy and inflating every
count taken from it.

I opened `diag_schedule.png`: **it is the login screen**, not the schedule view — a violet gradient over
a winter photograph with EMAIL / ПАРОЛЬ fields and «Войти в профиль». The Director's rule names this case
exactly: «скрин логина — не скрин расписания».

**The correction to my method, which matters more than the two files:** scope an audit to the files the
run actually produced — by timestamp or by the pipeline's own manifest — never to the folder listing.
`find .dente-ops-shots -name '*.png' -newermt '<run start>'` gives **34** files for the real run and
isolates the 2 orphans. Both orphans deleted (untracked; nothing in `git ls-files .dente-ops-shots/`).

This is the fifth instance of the same class in this campaign: stale `_ПУСТО` markers, 14 cloned PNGs,
a stale `apps/api/dist`, a red-by-construction `smoke:wave16`, and now `diag_*`. **An artifact that
outlives the condition it recorded becomes a lie**, and it lies most effectively inside a folder that
has a good reputation.

## D2. THE THEME RACE IS FIXED — MEASURED, THEN LOOKED AT

Packet W5 (`f8792f6c9`, `59b685f32`) was still returning NEEDS_REWORK on other counts, but its core
claim holds and I verified it two ways rather than reading the commit.

**By measurement**, on the fresh 07-28 13:4x run, across all seven panels that have three theme variants:

| panel | light | dark | night |
|---|---|---|---|
| duplicateAlert | `93e6129260` | `021c738560` | `4e7b41ae89` |
| recall | `50ba918ec9` | `9e316ba1f6` | `6c48ff5166` |
| reports | `e72f0701da` | `5647e38773` | `8da0ef506e` |
| delivery | `f52286cb8c` | `6449e5d0bf` | `181ad8b593` |
| campaigns | `e9335229a3` | `dfceec96ec` | `59f4bcdfd9` |
| callList | `090697e925` | `46639b1cfb` | `742ccd974c` |
| duplicates | `ebc799c2d1` | `75f40e9185` | `bb27b492fd` |

**Zero collisions.** Previously `light_duplicateAlert` was byte-identical to `night_duplicateAlert`
(`bdbf6e8a09e4`) and `dark_recall` to `night_recall` (`9e316ba1f6`).

**By eye**, because distinct hashes prove the themes DIFFER, not that «light» is light: I opened
`light_duplicateAlert.png`. It is a warm cream panel with an amber left border, dark text and white
buttons — nothing like the dark olive night variant I opened this morning. Tokens do not burn; contrast
is fine.

## D3. THE DUPLICATES PANEL IS NOW THE BEST-WRITTEN SURFACE IN THE PRODUCT

Worth naming as the standard, because §3 is otherwise the hardest rule to point at concretely:
- It leads with the CONSEQUENCE, not the mechanism: «Похоже, у этого пациента есть ещё карточки: 2. Пока
  карточки не объединены, приёмы, оплаты и снимки разложены по разным местам, и долг не виден целиком.»
- It grades its own confidence: «95 % совпадения» with a green check where ФИО and date of birth match;
  «35 % совпадения» in amber where only the phone matches.
- It warns against the trap a naive product would fall into: «Осторожно: Скорее всего это родственники:
  муж и жена, мать и ребёнок. Объединять нельзя без проверки.»
- **Its actions are differentiated by confidence** — «Перенести сюда» at 95 %, «Всё равно перенести
  сюда» at 35 %. The user is told the risk in the verb.
Every empty, loading and error state in this product should be judged against this panel.

## ADDENDUM E — THE FIRST HONEST DESKTOP CAPTURE OF THE CAMPAIGN, AND WHY THE EARLIER ONES WERE NOT

**Every desktop shot before 17:49 tonight showed a COLLAPSED sidebar under a filename promising the
default state.** The capture script collapsed the rail with a blind click on one line and restored it on
another, only on the happy path. Collapse persists in `localStorage`. A previous run died between those
two lines and left the rail collapsed permanently; every later run inherited it. Nothing in the filename
or `theme-audit.json` said so. Fixed by making the state SET, not inherited (`setSidebarCollapsed`), with
an assertion after each toggle, so the script is self-healing and a failed click stops the run.

### E.1 — WHAT THE EXPANDED RAIL ACTUALLY LOOKS LIKE: THIS IS THE BEST PART OF THE PRODUCT
Judged by the lead's own eyes on `desktop_light_analytics.png` (130,839 bytes, 1440×900, light).
Every section carries a name AND a plain-Russian subtitle saying what it is for:

    Смена — что делать сейчас            Оплаты — оплаты и долги
    Записи — очередь, врачи и кресла     Аналитика — отчёты и воронки
    Пациенты — карточки и контакты       Связь — сообщения и задачи
    Снимки — рентген, КЛКТ и КТ          Склад — материалы, остатки и сроки
    Приём — приём и диктовка             Стерилизация — лотки и журнал автоклава
    Документы — договоры и справки       Обращения — звонки и заявки до записи
                                         Настройки — клиника, импорт и доступы
                                         Маркетинг/SEO — продвижение и отзывы

**This satisfies §3 properly.** A person who has never seen a dental CRM can find «звонки и заявки до
записи» without being taught the word «Обращения». No jargon, no icons-only guessing.

### E.2 — THE EMPTY STATES ARE GENUINELY EXCELLENT AND SHOULD NOT BE TOUCHED
Analytics, empty: «За выбранный период данных нет» / «Это не нулевые показатели, а отсутствие записей:
за выбранный период не было ни оплат, ни приёмов. Выберите другой период вверху страницы.»
**It distinguishes ZERO from NO DATA and then points at the exact control.** Most commercial products get
that wrong. Schedule, empty: «Расписание не сломалось: выберите сегодняшний день, сбросьте фильтры или
сразу откройте форму новой записи» with all three as real buttons. Visit, empty: «Пациент не выбран» /
«Выберите пациента в разделе «Пациенты» или создайте запись в «Записях», чтобы начать приём.» This is the
standard the rest of the product should be measured against.

### E.3 — CONFIRMED BY EYE: THE TOPBAR IS THE §4 DEFECT, AND THE ROW-2 REGRESSION IS REAL
Earlier the lead measured `.topbar` growing 107→187px at 1600px after the corner redesign. **Now visually
confirmed at 1440px.** The top-right holds SEVEN controls on row 1 — Поиск, Голос, Справка, an unlabelled
database-like icon, Настроить, an unlabelled microphone icon — and then pushes **«Запись», the primary
action of a dental CRM, alone onto row 2** beside an unlabelled red padlock.

Three separate defects in that one corner:
1. **Three unlabelled icon buttons** (database, microphone, padlock). §3: a user cannot know what they do.
2. **«Голос» exists as a labelled button AND there is a separate bare microphone icon.** Two controls that
   look like the same capability. Either they differ — then say how — or one is redundant.
3. **The primary action is demoted to its own row** while lower-value icons keep row 1, and the red
   padlock's alarm colour pulls the eye away from it. §4: this is piling on, not fitting in.

### E.4 — SMALLER, STILL REAL
- ~270px of a 900px screen is spent before content begins: a demo banner, then a band holding «Роль
  Владелец сменить» and «Недавние 0 сменить», then a gap. «Недавние 0» is a chip whose content is a zero.
- Analytics says «За всё время» in the selector and «за выбранный период» in the empty state. With "all
  time" chosen, "no data for the selected period" reads as a filter problem when it is an empty clinic.
- Schedule has a **full-width unlabelled empty input** above the filters — no label, no placeholder.
- Schedule offers «Создать запись» and «Новая запись» on one screen for the same action.
- Schedule's readiness line ends «…и ещё 3» — the user is told three more blockers exist but not what.

### E.5 — THE INSTRUMENT COULD CERTIFY A BLANK PAGE. THAT HOLE IS NOW CLOSED.
A 5,851-byte pure-white frame was written as `desktop_light_shift.png` and logged as a SUCCESS:
«снимок desktop_light_shift.png (6 КБ, тема «light», палитра aaa45b8822ec)». The theme audit passed
because palette tokens live on `:root` and survive an empty body. The renderer had died — the next CDP
call timed out — while the DOM still satisfied the container check. So DOM-side readiness cannot detect a
dead paint. A byte-size floor now rejects the frame BEFORE it reaches disk, with the threshold derived
from this run's real numbers: smallest honest frame 59,516 bytes (imaging), blank frame 5,851 bytes,
floor 20,000. The blank file was deleted, not kept.

**Standing rule: the lead does not capture while the fleet is editing web source.** The dev server serves
whatever is on disk, so a mid-edit tree yields frames that are evidence of nothing. Tonight's third run
died exactly that way.

### E.6 — STILL WITHOUT ANY HONEST CAPTURE
`shift` (the blank frame was its only desktop attempt tonight), `communications` (timed out at 10 s, then
at 30 s — the container appears but slowly; the old error text contradicted itself by naming the container
as missing while listing it as present, and that message is now re-read at failure time), `settings`,
`marketing`, and **every dark-theme and mobile frame**. No verdict is offered on those. Nine shots exist;
seven are trustworthy; two are honest failure diagnostics.

## ADDENDUM F — FIRST COMPLETE DARK-THEME SET, AND «СНИМКИ» IS BLANK IN IT

Captured with the machine quiet (71 node processes, down from 128): **28 frames — 11 desktop light, 11
desktop dark, 5 mobile light, 1 collapsed** — every one above the 20,000-byte floor, smallest 61,451.
Palette fingerprint `fb13b9804418`. This is the first time the campaign has had dark-theme desktop frames
for all eleven views.

### F.1 — THE TWO TOPBAR DEFECTS THE LEAD FOUND ARE FIXED, VERIFIED BY EYE
Addendum E charged that «Запись» — the primary action of a dental CRM — was pushed alone onto row 2 behind
an unlabelled red padlock, and that three icon buttons carried no label. In `desktop_dark_shift.png`:
**«Запись» is now FIRST on row 1, filled teal**, ahead of «Поиск», «Голос», «Справка», «Настроить»; and the
padlock is now a labelled **«Заблокировать»** button. The regression is closed. Credit to the fleet packet.

### F.2 — CONFIRMED DEFECT, AND IT IS THE WORST VISUAL FINDING SO FAR: «СНИМКИ» RENDERS NOTHING IN NIGHT THEME
Same view, same data, same capture run, two themes:

- `desktop_light_imaging.png` (176 KB) is **fully populated and genuinely good**: heading «СНИМКИ ПАЦИЕНТА
  / Прицельные, ОПТГ, ТРГ, КТ и фото в одной ленте»; three real actions «Папка DICOM», «Файлы»,
  «Добавить снимок вручную»; three status cards including «В ленте / 0 / локально и на сервере, без
  удаления сырья» and «Режим / просмотрщик / ИИ только помогает, решение остается за врачом»; and two
  excellent empty states — «Снимков по пациенту нет / Загрузите архивы DICOM/КТ…» and «Пациент не выбран /
  Лента показывает снимки того пациента, который назван в шапке экрана. Выберите пациента в картотеке или
  откройте приём — снимки подтянутся сами.» That last string is among the best §3 writing in the product.
- `desktop_dark_imaging.png` (61 KB — **the smallest frame of the run, because there is nothing to
  compress**) renders the **sidebar only**. The entire content area is void: no heading, no buttons, no
  status cards, no empty state, no error. A dentist opening «Снимки — рентген, КЛКТ и КТ» in night theme
  cannot tell whether it is loading, broken, or empty.

**Ruled out as a scroll artefact, by measurement.** The dark frame is scrolled roughly 230 px down (its nav
rail starts at «Снимки» and the theme switcher is visible at the bottom). At that offset it should show what
light shows between y≈290 and y≈1130 — which in light is the populated panel. It shows 840 px of nothing
instead. A 230 px scroll cannot produce 840 px of void.

**Honest limit on this finding.** It rests on one capture per theme, not on a reproduction in a live browser
— the lead has no interactive browser session, and headless capture is all that is available. The theme
audit did assert the night palette applied, and the frame is 61 KB rather than a blank 6 KB, so the shell
DID render; only the section content is missing. So: the observation is confirmed, the mechanism is not.
A packet must reproduce it before changing anything.

### F.3 — A THIRD THEME EXISTS AND THE CAPTURE NAMES IT WRONG
The switcher at the bottom of the rail reads **«День | Ночь | Тепло»** — three themes, not two, and «Тепло»
has never been captured or judged at all. The capture pipeline calls the second one `dark` while the
interface calls it «Ночь». Not a defect in the product, but the file names promise a mapping the UI does not
use, and the lead has already been burned once by filenames that promised a state they did not show.

### F.4 — SMALLER, STILL REAL (from `desktop_dark_shift.png`)
- **«дел: 2»** as a counter label. «дел» is not a word a patient-facing operator parses; «2 дела» is.
- **«Импортов: 0. Последних событий аудита: 4.»** — machine phrasing in a task card. Zero imports tells the
  user nothing and suggests no action.
- Three similar actions carry three different visual weights: «Запись» filled teal, «Записать пациента»
  filled teal of another shade, «Открыть расписание» outlined. §4: same importance should look the same.
- **«Недавние 0 сменить»** — still a chip whose entire content is a zero. Flagged in Addendum E, unchanged.
- The band holding «Роль Владелец сменить» and that chip still costs ~150 px before content begins.

### F.5 — STILL WITHOUT ANY JUDGED CAPTURE
The «Тепло» theme entirely; mobile dark entirely; mobile light for 6 of 11 views (the run died during
mobile). Two honest failure diagnostics were written (`ПУСТО_НЕ_ОТКРЫЛСЯ_*`). No verdict is offered on
those surfaces.

### F.6 — THE LEAD TRIED TO DEMOLISH ITS OWN FINDING AND FAILED. IT IS REAL.
Before dispatching a packet the lead attacked F.2 itself, to avoid sending an agent after a capture
artefact. Four candidate mechanisms, each tested and each RULED OUT:

1. **A token that resolves in light but not in night** — ruled out. `node scripts/check-css-tokens.mjs`
   exits 0: «Все var() разрешаются: каждое имя объявлено, либо его запас не светлый литерал.»
2. **Text and background painted the same colour** — ruled out. `premium.css` styles the panel body with
   `background: var(--glass-panel); color: var(--text-primary)`, and it defines BOTH for all three themes:
   light `rgba(255,255,255,0.95)` + `#0f1e1b`; dark `rgba(16,26,25,0.80)` + `#e9f2ef`; night
   `rgba(28,23,20,0.82)` + `#f1e8dd`. Every pair is legible.
3. **A rule hiding content under a dark scope** — ruled out. No `[data-theme="night"|"dark"]` rule in any
   stylesheet sets `display:none`, `opacity:0`, `visibility:hidden` or `height:0`.
4. **A crashed view swallowed silently** — ruled out twice over. `workspaceRouteErrorBoundary.tsx:151-180`
   renders a real Russian panel on error — heading, a «не открылось» pill, «Раздел временно не открылся»,
   a support reference and two buttons — so a caught throw would be VISIBLE, not void. And the Suspense
   fallback at `App.tsx:3589` is not blank either: it carries «Снимки пациента» and a «загрузка» pill, so
   a stuck lazy chunk would also be visible.

**Then the artefact hypothesis died on a measurement the lead had not thought of.** Byte sizes of all
eleven dark frames from the same sequential loop:

    imaging 61,451  ← the defect
    schedule 118,707 · visit 124,571 · patients 136,184 · analytics 153,225 · finance 187,177
    settings 187,318 · marketing 188,547 · communications 190,018 · documents 196,956 · shift 199,110

**Ten of eleven dark views rendered fully. Imaging alone is less than half the next smallest.** A
mid-transition frame would strike views at random; it would not single out the one view whose LIGHT
counterpart is the largest of the set (176 KB, the most content of any view). The frames are taken by one
loop, in order, with the same readiness assertion applied to each.

**So: the observation is confirmed and now strongly supported, and the mechanism is genuinely unknown.**
Every mechanism testable from source has been eliminated by the lead. That is precisely why the packet's
first duty is to REPRODUCE, and why it is told that reporting the finding as unreproducible is a full
success rather than a failure — the remaining explanations require running the thing, not reading it.
