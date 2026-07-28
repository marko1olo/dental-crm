# V1-corner-reserve-regression — state

STATUS: DONE

- COMMITTED (1) bda50170d9d4cd170b01a4bff2cc974902ff0a00 — 7 файлов, +735/-144
- COMMITTED (2) 0d728da9d83c65a9bec3d5682ed75014755fe4fb — 3 файла, +119/-1
- PROVEN:
  - typecheck web TRUE_EXIT=0
  - unit угла TRUE_EXIT=0: tests 54 / suites 11 / pass 54 / fail 0
  - вся веб-сюита TRUE_EXIT=0: tests 533 / suites 95 / pass 533 / fail 0
  - браузер: padding-bottom оболочки 96 -> 0, .workspace 80 -> 144 (= резерв),
    хост ровно один, ноль пересечений с .dnt-bottom-nav (зазор 24px на всех окнах),
    подъём вернулся к нулю на всех трёх окнах
  - F4: вызовов elementsFromPoint 295 -> 90 / 130 (390 и 840), время внутри
    getBoundingClientRect −98% / −96% / −93%; на 1600 вызовов +29% — объявлено долгом
- handoff.md написан, каждый пункт F1-F7 разобран как CLOSED / DECLARED DEBT / DISPUTED
- Клейм чист, ничего не оставлено грязным

- EDIT WRITTEN
- GATE PASSED: `npm run typecheck -w @dental/web` TRUE_EXIT=0, вывода нет.
- UNIT: `node --import tsx --test .../cornerDockLayout.test.ts` TRUE_EXIT=0,
  tests 49 / suites 10 / pass 49 / fail 0, duration 202.283 ms.
- COMMITTED bda50170d9d4cd170b01a4bff2cc974902ff0a00 — 7 файлов, +735/-144, только мои.
- КОЛЛИЗИЯ (не блокирующая): HEAD уехал 8ff0ba18e -> a0ee75eba пока я работал.
  Чужой (не-fleet) коммит f50f7f67d «Экран отправки перестал спорить сам с собой;
  плавающие кнопки не вылезают за край» правил МОЙ файл cornerDock.css
  (+29/-7: один диаметр кнопок 3rem, max-width от 100% вместо 100vw,
  --corner-dock-bar-floor как страховка до замера). Его работу НЕ откатывал,
  свои правки F7 положил поверх. Остальные мои файлы он не трогал.
- ABOUT TO RUN (медленно, ~2 мин): node scratch/probe-corner-reserve.mjs after
  — vite HMR уже подхватил правки, сервер НЕ перезапускаю.

STATUS до правки: DEFECT CONFIRMED (но F2 сформулирован рецензентом НЕВЕРНО — см. ниже)
Time: 2026-07-28 (cycle 6)
Agent: implementer under [ARCHON]

## Packet
V1-corner-reserve-regression — rework of U4-fab-corner-owner.
Spec: .agents/archon/packets/U4-fab-corner-owner/review.md (read COMPLETE first).
Claim: the corner-owner component + its CSS from U4 + its tests. NOT App.tsx (dirty).
Gate: npm run typecheck -w @dental/web

## Log
- STARTED — packet dir created, state.md written before any reads.
- AUTHORITY READ — .agents/AGENTS.md, .agents/INDEX.md, .agents/UI_STANDARDS.md,
  U4 review.md / handoff.md / state.md — все полностью.
- HEAD at start: 8ff0ba18e209d6c9c00812af3a4c2dd9fd85a229
- Клейм чист: `git status --porcelain -- apps/web/src/components/floatingCorner
  apps/web/src/styles/dente-redesign.css apps/web/src/components/Omnibar.tsx
  apps/web/src/components/VoiceAssistantUI.tsx` — пустой вывод.
- ОКРУЖЕНИЕ: playwright + chromium-1228 УСТАНОВЛЕНЫ, web 5173 = 200, api 4100 = 200.
  Значит реальный браузерный замер (computed padding-bottom, счётчики за кадр) доступен —
  это ровно то, что рецензент просил как закрывающую проверку F2 и F4.
  Сервер НЕ перезапускаю, только читаю страницу.
- ЗАМЕР BEFORE СНЯТ: `node scratch/probe-corner-reserve.mjs before` exit 0 ->
  scratch/v1-corner-before.json (untracked, НЕ стейджить). Экран #patients, тема light.

## ЧТО ПОКАЗАЛ ЖИВОЙ ЗАМЕР НА HEAD 8ff0ba18e (F2 сформулирован неверно)

| окно | --corner-dock-reserve-block | padding-bottom main.app-shell | padding-bottom .workspace | lift |
|---|---|---|---|---|
| 390x844 | 144px | **96px** | **80px** | 121px |
| 840x900 | 144px | **96px** | **80px** | 116px |
| 1600x1100 | 96px | 0px | 96px | 46px |

Рецензент в F2 утверждает: резерв применяется ДВАЖДЫ и съедает ~304px из 844px
вьюпорта (152+152). Живая страница говорит другое:
- На <=840px резерв не применяется НИ РАЗУ. Оба правила U4 мертвы:
  `main, .app-content` (dente-redesign.css:687, специфичность 0,0,1) проигрывает
  `.app-shell, .workspace, .panel, ... { padding-bottom: calc(96px + env(...)) !important }`
  (main.css:13005-13018, 0,1,0) — отсюда 96px;
  `.app-shell.dente-redesign .workspace` (:813, 0,3,0) проигрывает ПО ПОРЯДКУ
  тому же селектору с shorthand `padding: 10px 12px 80px !important` (:1024, 0,3,0)
  — отсюда 80px.
- Реальная высота панели угла 48px (не 56), поэтому резерв 144px, а не 152px.
- `.workspace` НЕ является скроллером: scrollHeight == clientHeight на всех трёх
  окнах (9659/9659, 6753/6753, 6352/6352). Прокручивается ДОКУМЕНТ (html).
  Значит и 96px, и 80px — это хвостовой отступ в конце документа, а НЕ вычтенные
  из вьюпорта пиксели. Формулировка «304px из 844px вьюпорта» неверна дважды.
- Дефект РЕАЛЬНЫЙ и хуже заявленного: механизм резерва, ради которого U4 писал
  измерение навигации, на телефоне не работает вообще.

## F4 BEFORE (120 кадров прокрутки, замер в браузере)
hits/frame 2.46 (295 попаданий = 59 проходов на 120 кадров), rects/frame 5.74-6.84,
hitMs 21.0-24.4 total, rectMs 12.9-19.8 total,
frame mean 16.71 / 25.66 / 51.18 ms, p95 22.0 / 48.1 / 99.8, max 25.3 / 50.1 / 109.2.
`document.elementsFromPoint` имеет РОВНО одного вызывающего в apps/web/src
(CornerDock.tsx:155), поэтому счётчик hits принадлежит углу и никому больше.
