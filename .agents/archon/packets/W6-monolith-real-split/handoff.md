# W6-monolith-real-split — сдача

HEAD: 64d17693613646c67665b41f91a0a3f03fe29f75
(на старте пакета было 54db1c590; перед коммитом HEAD ушёл на cf40daaccb — чужой автор, мои файлы он не трогал:
`git log 54db1c590..cf40daacc --stat` не содержит DocumentsView.tsx и components/documents/**)

Выбранный монолит: **apps/web/src/DocumentsView.tsx**. Досье называло 5 053 строки, реальный `wc -l` — 5 094.
Файл был чистым в `git status --porcelain` на момент выбора. Экран живой: `App.tsx:389` (lazy) +
`App.tsx:3900` (отрисовка), `workspacePreload.ts:8`.

Почему он, а не самый большой файл: у него самые чёткие доменные швы — 28 соседних блоков
`{selectedDocumentKind === "<вид документа>" ? (<article className="document-payload-card">…) : null}`,
каждый со своим набором полей. Это границы по домену, а не по числу строк.

## Что было сломано (file:line — до коммита)

1. **apps/web/src/components/documents/forms/TaxDeductionApplicationForm.tsx:6** — вынесенный компонент,
   которого не импортировал НИКТО. `rg TaxDeductionApplicationForm apps/web/src` находил только
   одноимённый **тип** из `@dental/shared`. Экран рисовал ту же форму копией в
   **DocumentsView.tsx:2263-2374** — поле в поле, тот же текст. Две копии одной формы: правка в мёртвом
   файле не доходила до пациента, правка в копии расходилась с ним молча. Пропсы были `any`.
2. **DocumentsView.tsx: 28 копий оболочки карточки** с `style={{ … }}` на `<details>`, `<summary>` и на
   блоке содержимого. Эти inline-стили не рисовали ничего: в **styles/dente-redesign.css:1262-1287** те же
   свойства объявлены с `!important` (`.document-manual-override`, `.document-manual-override > summary`,
   `.document-payload-collapsed-content`), а важное авторское объявление сильнее атрибута style.
   dente-redesign.css подключён (**main.tsx:13**), main.css:416 это прямо признаёт («unlayered wins»).
   То есть код обещал `borderRadius: 8px`, `marginTop: 16px`, `gap: 16px`, `color: var(--brand-700)`,
   а экран показывал `10px`, `12px`, `10px`, `var(--teal-dark)`.
3. **DocumentsView.tsx: один компонент на 5 094 строки** — 28 форм в одной функции, ~130 пропсов и
   два подряд идущих `useDocumentStore()` без селектора (строки 189 и 406 до правки).

## Что изменено

Родитель: **5 094 -> 4 363 строки** (-731). Все вынесенные файлы импортированы и применены родителем
в ЭТОМ ЖЕ коммите.

| файл | строк |
|---|---|
| components/documents/DocumentPayloadCard.tsx | 41 |
| components/documents/QuickChipsRow.tsx | 30 |
| components/documents/documentChipText.ts | 16 |
| components/documents/forms/documentFormTypes.ts | 25 |
| components/documents/forms/InformedConsentForm.tsx | 156 |
| components/documents/forms/ProcedureSpecificConsentForm.tsx | 194 |
| components/documents/forms/AnesthesiaConsentLogForm.tsx | 139 |
| components/documents/forms/PhotoVideoConsentForm.tsx | 127 |
| components/documents/forms/PersonalDataProcessingConsentForm.tsx | 148 |
| components/documents/forms/MedicalInterventionRefusalForm.tsx | 155 |
| components/documents/forms/TaxDeductionApplicationForm.tsx | 201 -> 170 (был мёртвым) |
| tests/documentPayloadForms.test.ts | 328 |

Контракт пропсов узкий: значения и сеттеры (171 поле) формы читают из хранилища документов сами, сверху
приходят только подсказки визита (`DocumentVisitHints`: врач, жалоба, зона лечения) и справочники
вариантов. Ни один компонент не принимает «19 пропсов-ломтей».

Что НЕ менялось: ни одной подписи, подсказки, галочки или порядка полей. Оболочка формы отказа оставлена
своей (наведение на сводке, фокус-обводка и `hover:scale` на кнопках-подсказках) — общая карточка их не
имеет, замена изменила бы экран.

## ПРОВЕРЕНО

- **UNIT VERIFIED** — `cd apps/web && node --import tsx --test src/tests/documentPayloadForms.test.ts`
  -> **exit 0, `tests 25 · pass 25 · fail 0`, duration_ms 487.9**. Все семь форм рисуются
  по-настоящему (`renderToStaticMarkup`), проверяются: перенесённый текст полей и галочек, настоящие
  справочники из AppHelpers (`taxApplicationFormOptions`, `procedureSpecificConsentProcedureOptions`,
  `photoVideoMaterialOptions`), вызов редактора строк зубов, 16 кнопок-подсказок отказа, три
  `readOnly` поля оператора ПДн, отсутствие атрибута `style` в общей карточке, наличие `!important`
  у перекрывающих свойств в CSS, и логика `appendChipToText` (пустое поле, дописывание через запятую,
  обрезка пробелов, три нажатия подряд).
- **Анти-сирота (git grep по HEAD)** — у каждого вынесенного файла есть и объявление, и применение:
  `git grep -n "InformedConsentForm" HEAD -- apps/web/src` -> `DocumentsView.tsx:8` (import),
  `DocumentsView.tsx:2277` (`<InformedConsentForm`), `forms/InformedConsentForm.tsx:13` (export).
  То же для ProcedureSpecificConsentForm (12 / 2285), AnesthesiaConsentLogForm (6 / 2729),
  PhotoVideoConsentForm (11 / 2819), PersonalDataProcessingConsentForm (10 / 3629),
  MedicalInterventionRefusalForm (9 / 3633), TaxDeductionApplicationForm (13 / 2266).
  DocumentPayloadCard применяют 6 форм, QuickChipsRow — 4 раза в форме отказа, appendChipToText — 4 раза.
- **Копии больше нет** — `rg "Заявитель / налогоплательщик" apps/web/src/DocumentsView.tsx` пусто;
  проверка на это есть в тесте.
- **Разбор всех 12 изменённых файлов** — `node_modules/.bin/esbuild --jsx=automatic --format=esm <файл>`
  -> exit 0 у каждого (проверка синтаксиса, НЕ типов; ничего общего не пишет).
- **171 поле хранилища** во вынесенных формах существует в `DocumentState` (870 объявленных полей) —
  сверено чтением documentStore.ts, расхождений 0.
- **SMOKE VERIFIED** — `npm run smoke:web-text-encoding` -> exit 0, `checkedFiles 430, mojibakeHits 0,
  garbledQuestionHits 0`. `node scripts/check-css-tokens.mjs` -> exit 0, «не разрешается ни в одной теме:
  0 имён».

## НЕ ПРОВЕРЕНО

- **Типы.** `npm run typecheck -w @dental/web` НЕ запускался: гейт пишет общий
  `apps/web/tsconfig.tsbuildinfo` и принадлежит ведущему (§7a). Закрывающая команда:
  `npm run typecheck -w @dental/web`. Риск сосредоточен в четырёх местах: (1) переименование
  импорта типа `TaxDeductionApplicationForm as TaxDeductionApplicationFormKind` в DocumentsView.tsx:21 и
  его единственное применение на строке 1045; (2) удалённый локальный тип `DocumentSelectOption` —
  теперь импортируется из `components/documents/forms/documentFormTypes`; (3) `exactOptionalPropertyTypes:
  true` в tsconfig.base.json и необязательные пропсы `DocumentVisitHints` (значения приходят из
  `props: Record<string, any>`, поэтому должны проходить); (4) `renderToothRowsEditor: () => ReactNode`.
- **Внешний вид.** UI VERIFIED мне не принадлежит. Утверждение «экран не изменился» опирается на
  каскад CSS (важное авторское объявление сильнее атрибута style) и на тест, который это соотношение
  фиксирует, а не на снимок экрана. Сверить нужно два вида документов: «Согласие на ПДн» (общая
  карточка) и «Отказ от вмешательства» (своя оболочка) в темах light / dark / night. Закрывающая
  команда — снимок ведущего с открытым разделом «Документы» и выбранным видом документа.
- **Число перерисовок.** Две подписки на всё хранилище в родителе (DocumentsView.tsx:189 и 406 до
  правки) остались; вынесенные формы подписываются так же, без селектора. Выигрыш по перерисовкам не
  измерялся и не заявляется.

## Коммит

`64d17693613646c67665b41f91a0a3f03fe29f75` — 13 файлов, +1556 −959, только мои файлы
(`git show --stat 64d17693`). Индекс перед коммитом был пуст (`git diff --cached --name-only` — пусто),
чужого в коммит не попало.

## Долг (найдено, НЕ починено — это рефакторинг, а не место для новых правок)

1. **Ещё две сироты в том же каталоге:** `components/documents/NdflTaxCalculatorsWidget.tsx` (79 строк) и
   `components/documents/DocumentUkepSignButton.tsx` (225 строк) — их не импортирует никто
   (`rg` по apps/web/src, исключая сам каталог, даёт 0 совпадений). Вторая — кнопка подписания УКЭП,
   то есть готовая возможность, до которой пользователь не может добраться ничем. Подключать её здесь
   значило бы добавить возможность на экран, а пакет это запрещает.
2. **21 копия оболочки карточки** с мёртвыми inline-стилями осталась в DocumentsView.tsx (строки 1274,
   1401, 1541, 1693, 1776, 1920, 1996, 2088, 2166, 2301 и далее). Перевод их на DocumentPayloadCard —
   следующий заход того же вида, механический и безопасный.
3. **Hex-подстановки в форме отказа:** `bg-[var(--surface-100,#f8fafc)]`, `border-[var(--line,#e2e8f0)]`,
   `text-[var(--brand-700,#0f766e)]`, `text-[var(--ink,#334155)]`,
   `focus:ring-[var(--focus-ring,rgba(20,184,166,0.5))]`. Перенесены дословно. Нарушают «токены, никогда
   не статический hex»; запасные значения светлой темы просочатся в dark/night, если переменная
   когда-нибудь не объявится.
4. **Мёртвые константы в DocumentsView.tsx:** `EXTRACT_TREATMENT_CHIPS` (строка 42),
   `EXTRACT_REC_CHIPS` (43), `REFUND_REASON_CHIPS` (44 после правки) — объявлены и не используются
   нигде. `EXTRACT_DIAGNOSIS_CHIPS` используется (строка ~3044).
5. **`DocumentsViewProps = Record<string, any>`** (DocumentsView.tsx:37) — ~130 пропсов без типов.
   Вынесенные формы получили настоящие типы, родитель — нет.
6. **Тест требует рабочего каталога apps/web:** в корне репозитория нет `tsconfig.json`, поэтому tsx
   собирает JSX старым способом и падает на «React is not defined». Команда в шапке теста.
