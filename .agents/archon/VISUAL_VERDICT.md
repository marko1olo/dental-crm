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
