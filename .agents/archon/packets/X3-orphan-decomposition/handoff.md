# X3-orphan-decomposition — сдача

HEAD: **a02eb310b011645ca50d76af3ebecfc8fe268aec** (на момент записи; чужие коммиты идут непрерывно,
за время пакета HEAD прошёл 13b1738 → 6b063df → 1e31a9f00 (мой) → 744797790 → 5e42aac18 → 7483b408 →
a02eb310b (мой)).

## ГЛАВНЫЙ ВЫВОД: ПОСЫЛКА ПАКЕТА НЕВЕРНА — W6 НЕ СОЗДАЛ НИ ОДНОЙ СИРОТЫ

Задание сформулировано как «THE DECOMPOSITION PRODUCED ORPHANS» и ссылается на коммит W6, будто он
сам это признаёт: «вынесенные формы были мёртвыми». Такой фразы в коммите нет.
`git log -1 --format=%B 64d17693` строка 1: «вынесенная форма заявления **не подключалась**, а экран
рисовал её копию» — единственное число, и это описание **дефекта, который W6 ПОЧИНИЛ**: файл
`forms/TaxDeductionApplicationForm.tsx` лежал сиротой ДО пакета W6. Все 11 файлов, созданных самим W6,
находятся в состоянии (а) — импортированы И отрисованы. Проверено поимённо, вывод ниже.

Настоящая сирота в каталоге одна, и она не из W6: `DocumentUkepSignButton.tsx` (существовала до W6,
раскрыта им как долг №1).

## Разбор по каждому файлу каталога документов — (а) / (b) / (c)

Команда: `git grep -n -w -- "<имя>" HEAD -- apps/web/src/DocumentsView.tsx apps/web/src/components/documents`

| файл | состояние | объявление | настоящее применение |
|---|---|---|---|
| forms/InformedConsentForm.tsx | **(а)** | :13 `export function` | DocumentsView:9 import, **:2101 `<InformedConsentForm`** |
| forms/ProcedureSpecificConsentForm.tsx | **(а)** | :21 | DocumentsView:13, **:2109** |
| forms/AnesthesiaConsentLogForm.tsx | **(а)** | :12 | DocumentsView:7, **:2553** |
| forms/PhotoVideoConsentForm.tsx | **(а)** | :17 | DocumentsView:12, **:2643** |
| forms/PersonalDataProcessingConsentForm.tsx | **(а)** | :27 | DocumentsView:11, **:3453** |
| forms/MedicalInterventionRefusalForm.tsx | **(а)** | :23 | DocumentsView:10, **:3457** |
| forms/TaxDeductionApplicationForm.tsx | **(а)** | :31 | DocumentsView:14, **:2090** |
| DocumentPayloadCard.tsx | **(а)** | :29 | отрисован 6 формами: InformedConsent:52, ProcedureSpecific:65, Anesthesia:41, PhotoVideo:41, PersonalData:54, TaxDeduction:65 |
| QuickChipsRow.tsx | **(а)** | :15 | Refusal:87, :95, :103, :111 (4 ряда) |
| documentChipText.ts | **(а)** | :16 | Refusal ×4 + DocumentsView:1152, :1415, :1454, :1470 = **8 из 8** |
| forms/documentFormTypes.ts | **(а)** | :8 `DocumentSelectOption`, :18 `DocumentVisitHints` | DocumentsView:8 + 4 формы (Anesthesia:4/:12, Informed:3, Refusal:5, Procedure:6, PhotoVideo:4, TaxDeduction:8) |
| AnamnesisField.tsx (до W6) | **(а)** | :32 | DocumentsView ×5 (:2002, :2009, :2017, :2048, :2056) + Anesthesia:70 + Procedure:135 |
| **DocumentUkepSignButton.tsx** (до W6) | **(c) СИРОТА** | :16 | **нет ни одного импорта во всём apps/web/src** |

Состояний (b) — «импортирован, но не отрисован» — нет ни одного.

## Что было сломано (file:line, нумерация ревизии 64d17693)

1. **DocumentsView.tsx:191-402 и :408-1013** — два разбора `useDocumentStore()` вынимали 814 полей, из них
   **173 не читались в файле нигде**: полное состояние семи форм, которые экран больше не рисует.
   Компилятор не ловит (`noUnusedLocals` в tsconfig.base.json не включён, `npm run lint` = typecheck).
   Проверка: та же логика по ревизии 64d17693 → `destructured=814 DEAD=173`, по HEAD → `641 DEAD=0`.
2. **DocumentsView.tsx:1313, 1579, 1621, 1640** — четыре обработчика кнопок-подсказок держали свою копию
   выражения `current.trim() ? \`${current}, ${chip.toLowerCase()}\` : chip`, хотя комментарий в
   `documentChipText.ts:11` утверждал, что все восемь мест переведены на одну функцию. Было четыре из восьми.
3. **scripts/smoke-document-payload-ui-source.mjs:4-13** — список читаемых файлов не содержит
   `components/documents/**`, поэтому подсказка «12 цифр, если есть» объявлялась пропавшей. Текст не
   исчезал: он лежит в `forms/TaxDeductionApplicationForm.tsx:80` и НИ В ОДНОМ из восьми читаемых файлов
   (`rg` по всем восьми → exit 1). Второе требование там же (`:589-604`) — «не меньше 28 раз
   `className="document-payload-card"`» — держалось только на дублировании оболочки: шесть видов перешли
   на общий `DocumentPayloadCard`, копий стало 21, и проверка краснела на отсутствии дубликатов.
4. **DocumentPayloadCard.tsx:7** — «четырьмя объектами `style`»; их три (13 свойств).
   **DocumentPayloadCard.tsx:17** и **documentChipText.ts:11** — ссылка на `tests/documentPayloadForms.test.tsx`;
   файла с таким расширением нет, он `.ts`.
   **PersonalDataProcessingConsentForm.tsx:18** — свой `interface DocumentClinicOperator` с четырьмя
   обязательными строками, вторая копия реквизитов клиники рядом с `ClinicProfileDraft` (AppHelpers.tsx:3233).
5. **Проверок на всё это не было ни одной.** Ни мёртвые объявления, ни сирота не ловились ничем.

## Что изменено

- **DocumentsView.tsx 4363 → 4187 строк** (−176). Удалены 173 мёртвых имени; удалялись только те, для
  которых `rg -c -w` по файлу даёт ноль вхождений — проверено поимённо для всех 173, список пуст.
  Четыре обработчика переведены на `appendChipToText` (поведение выражения тождественно).
- **scripts/smoke-document-payload-ui-source.mjs** — каталог `components/documents` читается рекурсивно и
  целиком, а не поимённо: следующая вынесенная форма проверку не уронит. Требование про 28 карточек
  переписано на то, чем оно было по смыслу: считаются **виды документов** (28) и способы их монтирования
  (**21** своя карточка + **7** вынесенных форм = 28), а не количество копий разметки.
- **DocumentPayloadCard.tsx / documentChipText.ts** — исправлены три ложных числа и ссылки.
- **PersonalDataProcessingConsentForm.tsx** — `DocumentClinicOperator` стал
  `Pick<ClinicProfileDraft, "legalName" | "clinicName" | "inn" | "address">`: переименование поля в
  AppHelpers.tsx теперь ломает сборку здесь, а не расходится молча.
- **НОВОЕ: apps/web/src/tests/documentsViewDecomposition.test.ts (223 строки)** — гейт, которого не было.
  Мёртвые объявления и сироты по всему каталогу. Отдельным файлом от `documentPayloadForms.test.ts`
  намеренно: там рисуются формы, туда тянется весь граф импортов приложения, и одна `.css` в этом графе
  гасит весь тест-файл вместе с дешёвыми проверками текста (это произошло во время работы, см. НЕ ПРОВЕРЕНО).
  Файл попадает в `npm test -w @dental/web` — его glob `src/**/*.test.ts` совпадает.

Поведение не менялось: ни одной подписи, подсказки, галочки или порядка полей. В диффе нет ни одной
изменённой пользовательской строки — только комментарии, имена в разборе и тела четырёх обработчиков.

## Числа (реальные, обе ревизии прочитаны через `git show | wc -l`)

| файл | 64d17693^ | 64d17693 (W6) | HEAD |
|---|---|---|---|
| DocumentsView.tsx | **5094** | **4363** | **4187** |
| DocumentPayloadCard.tsx | — | 41 | 42 |
| QuickChipsRow.tsx | — | 30 | 30 |
| documentChipText.ts | — | 16 | 19 |
| forms/documentFormTypes.ts | — | 25 | 25 |
| forms/InformedConsentForm.tsx | — | 156 | 156 |
| forms/ProcedureSpecificConsentForm.tsx | — | 194 | 194 |
| forms/AnesthesiaConsentLogForm.tsx | — | 139 | 139 |
| forms/PhotoVideoConsentForm.tsx | — | 127 | 127 |
| forms/PersonalDataProcessingConsentForm.tsx | — | 148 | 150 |
| forms/MedicalInterventionRefusalForm.tsx | — | 155 | 155 |
| forms/TaxDeductionApplicationForm.tsx | 201 (сирота) | 170 | 170 |
| tests/documentPayloadForms.test.ts | — | 328 | 328 |
| tests/documentsViewDecomposition.test.ts | — | — | **223** |

Рецензент оценивал достижимое сокращение в «~4192». Фактически **4187**: сняты не только 171 поле семи
форм, но и две пред-существовавшие мёртвые записи (`isDocumentIngesting`, `setIsDocumentIngesting`).

## ПРОВЕРЕНО

- **UNIT VERIFIED** — `cd apps/web && node --import tsx --test src/tests/documentsViewDecomposition.test.ts`
  → **TRUE_EXIT=0, `tests 18 · suites 2 · pass 18 · fail 0`, duration_ms 625.1**. Проверяются: оба разбора
  хранилища найдены; каждая строка разбора распознана (нераспознанная роняет проверку, а не пропускается);
  ноль мёртвых объявлений; четыре вызова `appendChipToText` в экране и четыре в форме отказа и ни одной
  оставшейся своей копии; и поимённо все 13 файлов каталога — 12 «его кто-то импортирует», один
  «заявленный долг, подключения нет».
- **Отрицательный контроль (гейт умеет краснеть)** — та же логика, прогнанная по двум ревизиям
  `git show <rev>:apps/web/src/DocumentsView.tsx | node -e '<read-only>'`:
  `64d17693: lines=4363 blocks=2 destructured=814 DEAD=173` (первые: personalDataActions,
  personalDataAutomatedDecisionAllowed, personalDataCategories, personalDataConsentGivenAt) и
  `HEAD: lines=4187 blocks=2 destructured=641 DEAD=0`. 814 − 173 = 641 сходится, и цифра 173 совпадает с
  рецензией дословно. Дополнительно гейт краснел трижды в ходе разработки на настоящих ошибках (3 блока
  вместо 2 — из-за литерала в комментарии; 4 ложно-мёртвых поля — из-за порядка снятия комментариев).
- **Ни одно из 173 удалённых имён не осталось в файле** — цикл `rg -c -w` по каждому из 173:
  вывод между маркерами пуст.
- **F2, первая игла** — `rg -n "12 цифр, если есть"` по всему `apps/web/src` даёт ровно одно вхождение:
  `components/documents/forms/TaxDeductionApplicationForm.tsx:80`; `rg` по всем восьми файлам старого
  списка → **exit 1** (нет нигде). То есть игла была ненаходима, а не потеряна.
- **F2, второе требование** — реальные числа по DocumentsView.tsx: `selectedDocumentKind` монтирований
  **28**, из них своя `<article className="document-payload-card">` — **21**, вынесенная `<XForm` — **7**,
  сумма **28**. Старое правило требовало `className="document-payload-card"` ≥ 28, фактически 21 → красно
  по построению после выноса.
- **`node scripts/smoke-document-payload-ui-source.mjs`** → TRUE_EXIT=1, **50 missing**. Обе иглы,
  относящиеся к W6, зелёные: «12 цифр» отсутствует в списке missing, требование про монтирование карточек
  тоже. Остальные 50 — не из этого выноса (рецензент атрибутировал 51 как пред-существующие; сегодняшнее
  число ниже, потому что HEAD ушёл вперёд и чужие коммиты правили App.tsx, useAppLogic и documentStore,
  которые эта проверка читает — стало быть, 52 рецензента сегодня не воспроизводится по чужой причине).
- **SMOKE VERIFIED** — `npm run smoke:web-text-encoding` → TRUE_EXIT=0,
  `checkedFiles 429, mojibakeHits 0, garbledQuestionHits 0`.
- **Гигиена git** — `git log -1 --stat` по каждому коммиту: только мои файлы, русская тема без
  мождибаке. Индекс перед каждым коммитом проверен (`git diff --cached --name-only`); чужого не попало.
- **Гейт действительно запускается** — `apps/web/package.json` `"test": "node --import tsx --test
  \"src/**/*.test.ts\" ..."`, новый файл под этот glob попадает.

## НЕ ПРОВЕРЕНО

- **Типы.** `npm run typecheck -w @dental/web` НЕ запускался: пишет общий `apps/web/tsconfig.tsbuildinfo`,
  гейт принадлежит ведущему (§7a). Закрывающая команда: **`npm run typecheck -w @dental/web`**.
  Риск узкий: удалялись только имена с нулём вхождений, добавленный тип — `Pick` от существующего.
- **`documentPayloadForms.test.ts` (25 проверок) в этом рабочем каталоге НЕ ЗАПУСКАЕТСЯ, и не по моей
  причине.** Чужая НЕЗАКОММИЧЕННАЯ правка: непроиндексированный каталог
  `apps/web/src/components/workspaceActions/`, чей `WorkspaceActions.tsx:4` делает `import
  "./workspaceActions.css"`, подключён из грязного `workspaceShell.tsx:29`, а до него тест доходит через
  `AppHelpers.tsx:305`. Под tsx это `ERR_UNKNOWN_FILE_EXTENSION ".css"` и падает ВЕСЬ файл теста.
  Доказательства: импорта нет в HEAD (`git grep "workspaceActions/WorkspaceActions" HEAD --
  apps/web/src/workspaceShell.tsx` → exit 1); три импортёра грязные; `import('./src/AppHelpers.tsx')`,
  `import('./src/store/documentStore.ts')` и любая форма падают одинаково; чужой тест
  `src/tests/anamnesisStartsEmpty.test.ts` → exit 0, 18/18, то есть tsx исправен.
  В **14:10 этот же файл теста дал exit 0, `tests 25 · pass 25 · fail 0`, duration_ms 733.5** — против
  ровно тех байтов DocumentsView.tsx и форм, которые сейчас лежат в HEAD (файл теста байт-в-байт равен
  HEAD, `git status` по нему пуст). Закрывающая команда после того, как сосед закоммитит или уберёт
  импорт .css: **`cd apps/web && node --import tsx --test src/tests/documentPayloadForms.test.ts`**.
- **Вся веб-сюита.** `npm test -w @dental/web` не запускался (общее состояние, §7a). Закрывающая
  команда — она же. Ожидание: пока чужой `.css`-импорт не закоммичен и не убран, красно будет всё, что
  импортирует AppHelpers.
- **Внешний вид.** UI VERIFIED мне не принадлежит и никем до сих пор не закрыт (рецензент это указал в
  «WHAT I COULD NOT DO»). Мой дифф не менял ни разметки, ни классов, ни строк — только объявления,
  комментарии и тела четырёх обработчиков, — поэтому визуальный риск моего пакета нулевой на бумаге, но
  снимок не брался. Закрывающая команда — снимок ведущего с открытым разделом «Документы» в темах
  light / dark / night, вид «Согласие на ПДн» (общая карточка) и «Отказ от вмешательства» (своя оболочка).
- **Каскад `!important`.** Утверждение рецензента я не перепроверял побайтово; проверки CSS в
  `documentPayloadForms.test.ts` (три `it` на `!important`) прошли в моём прогоне в 14:10, но сейчас файл
  не запускается по причине выше.

## Пункты рецензии — все до единого

| пункт | вердикт |
|---|---|
| §1 дефект у родителя был настоящим | **ПОДТВЕРЖДЁН** (не мой пункт; сирота до W6 существовала, W6 её починил) |
| §2 числа воспроизводятся | **ПОДТВЕРЖДЁН**, с одной поправкой состояния: строка «orphans 225 + 79» была верна на момент рецензии, но `NdflTaxCalculatorsWidget.tsx` (79 строк) удалён чужим коммитом **a457fb49f в 14:07** (после W6 в 12:41). Сегодня в каталоге сирота одна — 225 строк. Ни W6, ни рецензент не ошиблись; изменилось состояние дерева |
| §3 каскад `!important` верен | **ПОДТВЕРЖДЁН рецензентом, мной не перепроверялся** (см. НЕ ПРОВЕРЕНО) |
| §4 поведение и копия сохранены | **ПОДТВЕРЖДЁН**; мой дифф пользовательских строк не касается |
| §5 typecheck: файлы пакета чисты, 3 ошибки чужие | **ПОДТВЕРЖДЁН**; те 3 ошибки уже устранены другим пакетом (`LazyWorkspaceView` выведен через `Exclude<AppView,"shift">`). Мой typecheck — за ведущим (§7a) |
| §6 гигиена git чистая | **ПОДТВЕРЖДЁН**, и для моих двух коммитов тоже |
| **F1** 171/173 мёртвых объявления | **ЗАКРЫТ.** 814 → 641, DEAD 173 → 0, плюс гейт, которого не было |
| **F2** сломанная игла smoke | **ЗАКРЫТ.** Игла находится; второе требование той же проверки, тоже сломанное выносом (21 < 28), переписано на смысл. Остальные 50 — не из выноса |
| **F3.1** «четырьмя объектами style» вместо трёх | **ЗАКРЫТ.** DocumentPayloadCard.tsx:7 — «ТРЕМЯ … 13 свойств» |
| **F3.2** ссылки на `.test.tsx`, которого нет | **ЗАКРЫТ.** DocumentPayloadCard.tsx:17 и documentChipText.ts:11 → `.ts` |
| **F3.3** `DocumentClinicOperator` дублировал `ClinicProfileDraft` | **ЗАКРЫТ** в части второй копии: теперь `Pick<ClinicProfileDraft, …>`. Часть про nullable-хранилище — **ЗАЯВЛЕННЫЙ ДОЛГ**, см. ниже |
| **WHAT I COULD NOT DO** — вид в light/dark/night | **ЗАЯВЛЕННЫЙ ДОЛГ**, UI VERIFIED принадлежит ведущему |

## Исправления ложных утверждений (их нельзя переписать в закоммиченном тексте)

1. **Посылка задания X3** («вынос породил сирот», со ссылкой на признание в коммите W6) — **неверна**.
   Такой фразы в коммите нет, а все 11 файлов W6 подключены и отрисованы. Просьба к ведущему занести в
   `.agents/archon/progress.md`: W6 сирот не создал; единственная сирота каталога существовала до W6 и
   была им раскрыта как долг.
2. **W6 handoff.md, долг №1** — сейчас верен только наполовину: `NdflTaxCalculatorsWidget.tsx` больше не
   существует (удалён a457fb49f в 14:07). Осталась только `DocumentUkepSignButton.tsx`.
3. **`state.md` предыдущего экземпляра этого пакета** (13:46) перечислял `NdflTaxCalculatorsWidget.tsx`
   как лежащую на диске сироту — на 13:46 это было верно, к 14:07 файла уже нет. Строка исправлена.
4. **Комментарий `documentChipText.ts:11-14` до этого пакета** утверждал, что на функцию переведены все
   восемь мест. Было четыре. Теперь утверждение стало правдой, и его держит проверка.

## Коммит

- **`1e31a9f00a68532a884a640dfa4d0c5092ca26a8`** — 5 файлов, +77 −206: DocumentsView.tsx,
  DocumentPayloadCard.tsx, documentChipText.ts, forms/PersonalDataProcessingConsentForm.tsx,
  scripts/smoke-document-payload-ui-source.mjs.
- **`a02eb310b011645ca50d76af3ebecfc8fe268aec`** — 1 файл, +223:
  apps/web/src/tests/documentsViewDecomposition.test.ts.

Оба — пathspec-формой с `--`, индекс перед каждым проверен и был пуст, `git log -1 --stat` показывает
только мои файлы. `git stash` не применялся, дерево в моей части чистое.

## Долг (найдено, НЕ починено — это рефакторинг)

1. **`components/documents/DocumentUkepSignButton.tsx` (225 строк) — сирота, и я её СОЗНАТЕЛЬНО не тронул.**
   Она не из выноса W6, а серверный путь у неё рабочий:
   `apps/api/src/routes/documents/signUkep.ts:8` объявляет `POST /api/documents/:id/sign-ukep`, PDF берётся
   из `routes/documents/pdf.ts:63`. Подключить её — значит **добавить пользователю возможность**, а пакет
   это прямо запрещает («no new features»); удалить — значит выбросить готовый путь подписания УКЭП.
   Поэтому она названа в коде: `knownUnwiredDocumentComponents` в
   `tests/documentsViewDecomposition.test.ts`, и проверка потребует убрать её из списка, как только
   кто-нибудь её подключит. Забыть её теперь нельзя. **Решение за ведущим — это отдельный пакет.**
2. **Внутри той же кнопки — фасад, который может только упасть.** `DocumentUkepSignButton.tsx:136-151`
   рисует кнопку «Тестовое подписание (DEV)» в ветке `!hasPlugin`, а `handleSign` (:82-93) при
   `hasPlugin === false` немедленно бросает «Подписание невозможно: отсутствует плагин или сертификат».
   То есть DEV-кнопка не может сработать ни при каких условиях. Не починено намеренно: правка
   поведения — не рефакторинг. Пункт для отдельного пакета вместе с №1.
3. **`clinicProfileDraft` может быть `null`, а форма разыменовывает его без проверки.**
   `store/appStore.ts:18` типизирует поле как `any`, `:243` кладёт начальное `null`;
   `forms/PersonalDataProcessingConsentForm.tsx:62, :69, :74` читают `.legalName`, `.inn`, `.address`
   напрямую; значение приходит из `DocumentsView.tsx:75` (`props: Record<string, any>`, то есть типы не
   помогут). `Pick<ClinicProfileDraft, …>` эту половину не закрывает — он про имена полей, не про null.
   На практике `useAppLogic.tsx:4023-4034` гидратирует черновик сразу, как появляется `dashboard`
   (либо из профиля, либо `emptyClinicProfileDraft`), поэтому падения я НЕ наблюдал и не заявляю.
   Пред-существующее, у родителя было так же.
4. **21 копия оболочки карточки** с мёртвыми inline-стилями осталась в DocumentsView.tsx (числа мои:
   28 монтирований, 21 своя копия). Механический следующий заход того же вида.
5. **Hex-подстановки в форме отказа** (`bg-[var(--surface-100,#f8fafc)]` и ещё четыре) — перенесены
   дословно W6, нарушают «токены, никогда не статический hex». Не мой пакет.
6. **Мёртвые константы в DocumentsView.tsx**: `EXTRACT_TREATMENT_CHIPS`, `EXTRACT_REC_CHIPS`,
   `REFUND_REASON_CHIPS` — объявлены и не используются. Мой гейт их не ловит: он про поля хранилища.
   Расширять его на константы модуля я не стал — это была бы правка сверх пакета.
7. **`DocumentsViewProps = Record<string, any>`** (DocumentsView.tsx:37) — ~130 пропсов без типов.
8. **Проверка сирот слабее в одном месте:** упоминание имени в хвостовом комментарии (в одной строке с
   кодом) сойдёт за использование. Это сознательный выбор в пользу «никогда не краснеть на пустом
   месте»; описано в шапке функции `withoutComments`.
