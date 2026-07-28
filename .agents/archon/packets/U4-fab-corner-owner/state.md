# U4-fab-corner-owner — state

STATUS: DEFECT CONFIRMED
HEAD at start: e14c09862cf9ba58c7bfa05713695b4fcfece8da

## Что видно на плитах (открыты лично)
`.dente-ops-shots/light_duplicateAlert_ПУСТО.png` — в правом нижнем углу три элемента:
круглая кнопка «?» (~48px), круглая кнопка микрофона (~64px) правее, и ниже плашка
«Поиск (Cmd+K)». Панель «План лечения» с кнопками «Подпи…» и «Сохранить» стоит прямо под ними,
подпись обрезана. Угол никто не компоновал.

`.dente-ops-shots/narrow_full.png` (720x1100) — «?» и микрофон висят в пустой зоне, а круглая
плашка поиска (текст скрыт на узком экране) прижата к верхней кромке нижней навигации
(Смена / Записи / Пациенты / Приём / Ещё) и перекрывает её край.

## Что найдено в коде (реальные строки)
- `apps/web/src/components/VoiceAssistantUI.tsx:102-108` — `createPortal(..., document.body)`,
  `className="fixed right-6 z-50 ..."`, bottom = `calc(var(--floating-corner-bottom,1.5rem) +
  var(--floating-corner-step,48px))`. Остров №1 (кнопка «?» :271 и микрофон :286).
- `apps/web/src/components/Omnibar.tsx:88-105` — второй `createPortal(..., document.body)`,
  `className="omnibar-trigger-btn"`. Остров №2.
- `apps/web/src/styles/dente-redesign.css:825-829` — `:root { --floating-corner-bottom: 1.5rem;
  --floating-corner-step: 48px }`; `:831-855` `.omnibar-trigger-btn { position: fixed !important;
  bottom: var(--floating-corner-bottom) !important; right: 1.5rem !important; z-index: 9998 }`;
  `:875-879` на <=840px переменная становится 4.5rem — ЗАШИТОЕ число вместо измерения
  реальной высоты `.dnt-bottom-nav`.
- `apps/web/src/styles/main.css:16398-16421` — ВТОРОЕ, конкурирующее определение
  `.omnibar-trigger-btn` с `left: 1.5rem` (левый угол). Живо только потому, что
  dente-redesign.css перебивает его `!important`.
- Оба портала целятся в `document.body` независимо: два `position: fixed` острова,
  два z-index (50 и 9998), ни один не знает о другом и о контенте страницы.

## Ограничения дерева
- `apps/web/src/styles/main.css` ГРЯЗНЫЙ (чужой автор, 28 строк .document-anamnesis-*).
  НЕ ТРОГАТЬ и не коммитить.
- `apps/web/src/DocumentsView.tsx` грязный, чужой. НЕ ТРОГАТЬ.
- `App.tsx` монтирует оба компонента (:4729, :4741) — трогать нельзя, значит владелец угла
  должен самомонтироваться, без правок App.tsx.

## Log
- STARTED
- AUTHORITY READ (AGENTS.md, INDEX.md, UI_STANDARDS.md, VISUAL_VERDICT.md — полностью)
- DEFECT CONFIRMED

## Log (продолжение)
- EDIT WRITTEN
- GATE PASSED (typecheck: 0 ошибок в моих файлах, 6 чужих в DocumentsView.tsx)
- COMMITTED 0112f293e878264c66dedb8816b1c48e2557e7e7
- next: proofs (unit re-run, typecheck re-run, vite build CSS parse, mojibake)
- ABOUT TO RUN (slow, ~1-3 min): npm exec --workspace @dental/web -- vite build  (proves cornerDock.css parses and modules bundle; dist/ is gitignored, no git churn)
- PROVEN (unit 35/35 exit 0; web suite 496/496 exit 0; typecheck 0 ошибок в моих файлах; vite build exit 0, CSS угла в бандле; мождибаке 0)
- handoff.md написан

STATUS: DONE
- COMMITTED (2) 952025f058eef2d40b47108be6c8f5410850908b — тест-комментарии + материалы пакета
- Финальный typecheck на HEAD 952025f05: те же 6 чужих ошибок DocumentsView, 0 в моих файлах
- Клейм чист, ничего не оставлено грязным
