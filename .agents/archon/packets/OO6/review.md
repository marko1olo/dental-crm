## VERDICT: NEEDS_REWORK

Работа настоящая, EXIT_BITE перепроверен мной по каждому пункту и весь воспроизводится, продукт не тронут.
Коммиты **оставить, не откатывать**. Рework узкий: в поставленном артефакте осталось **три требования,
которые не кусаются**, и два из них — того самого класса «вакуумная проверка», которым пакет озаглавлен.
Одно из них лежит в четырёх строках от собственной починки, в том же коммите, и делает подзаголовок
коммита `f31ff26b2` («Границы функции теперь берёт ts.createSourceFile») неверным для второй из двух
вырезок в том же файле.

---

## 1. Главный гейт волны: EXIT_PASS / EXIT_BITE / MUTATION

Возвращены по всем пяти. **Перепроверил сам, не поверил на слово.**

### Харнесс: почему не monkeypatch

Первая попытка — подмена `fs.readFileSync` — дала **ложную тишину**: `scripts/lib/app-logic-source.mjs:19`
делает **именованный** импорт `import { readFileSync, readdirSync } from "node:fs"`, такая привязка
захватывается на загрузке модуля, и подмена свойства на объекте `fs` её не меняет. Мутации по
`useAppLogic.tsx` молча не применялись. Не поймай я это — три стража «не укусили» бы и я доложил бы
ложный дефект.

Итоговый харнесс — `C:\Clinic_MVP\dental-crm\node_modules\.rev-oo6\shadow.mjs`: копия `apps/web/src` +
`apps/api/src`, мутация пишется в копию, страж запускается **своим настоящим путём** с `cwd` = копия.
Продукт не трогается ни разу; если игла не найдена — выход **98**, а не зелёный. Плюс контроль: перед
каждой мутацией замеряется база на неизменённой копии (`base=0` во всех строках ниже) и no-op мутация
(exit 0). Мутации проверены на разбор через `ts.createSourceFile` + `parseDiagnostics` — **все PARSES-OK**,
то есть сломан смысл, а не синтаксис.

### Коды выхода, истинные, без конвейера

`node scripts/smoke-<имя>.mjs > /tmp/rev-OO6-<имя>.log 2>&1; echo $?`
«ДО» = версия стража из `<commit>^`, прогнанная по **текущему** дереву.

| страж | класс исполнителя | мой класс | ДО | ПОСЛЕ |
|---|---|---|---|---|
| smoke:telegram-outbox-sla-source | BRITTLE | BRITTLE ✔ | 1 | 0 |
| smoke:telegram-handoff-source | BRITTLE | BRITTLE ✔ | 1 | 0 |
| smoke:telegram-url-ui-source | STALE | STALE ✔ | 1 | 0 |
| smoke:document-html-preview-source | STALE | **BRITTLE** (расхождение, ниже) | 1 | 0 |
| smoke:document-payload-ui-source | STALE +1 RESURRECTION | STALE +1 RESURRECTION ✔ | 1 | 0 |

Оба известных симптома брифа воспроизвёл дословно:
`Error: saveTelegramSettings body not found` и
`Error: Missing source end after async function openIssuedDocumentHtml(documentId: string): async function downloadIssuedDocumentPdf(documentId: string, overrideUrl?: string)`.
Второе сообщение само называет причину: замыкающей границей была **сигнатура соседа**
`downloadIssuedDocumentPdf(documentId: string, overrideUrl?: string)`, а живая сигнатура —
`useAppLogic.tsx:12689` — `downloadIssuedDocumentPdf(documentId: string)`. Параметр у **чужой** функции
убрали, и страж потерял границу. Догадка брифа верна, уточнение исполнителя верно.

### EXIT_BITE — перепроверено, все воспроизводятся

`node node_modules/.rev-oo6/shadow.mjs <имя>` (`base` = база на копии, `exit` = страж после мутации)

| мутация | ожидание | база | exit | итог |
|---|---|---|---|---|
| sla-drop-negation (снять `!`) | 1 | 0 | 1 | OK |
| sla-drop-early-return (удалить ранний выход) | 1 | 0 | 1 | OK |
| sla-reformat-one-line (8 строк → 1) | **0** терпимость | 0 | 0 | OK |
| sla-drop-argument (потерять `nowMs`) — *моя добавка* | 1 | 0 | 1 | OK |
| sla-return-not-empty-array (`return skipped`) — *моя добавка* | 1 | 0 | 1 | OK |
| handoff-swap-operands (операнды `??` местами) | 1 | 0 | 1 | OK |
| handoff-drop-fallback (убрать `?? read…()`) — *моя добавка* | 1 | 0 | 1 | OK |
| handoff-reformat-one-line — *моя добавка* | **0** терпимость | 0 | 0 | OK |
| url-swap-portal-draft (портал ← черновик картинки) | 1 | 0 | 1 | OK |
| url-send-raw-webhook-draft (сырой черновик в PUT) | 1 | 0 | 1 | OK |
| url-normalize-after-put (снять нормализацию) — *моя добавка* | 1 | 0 | 1 | OK |
| html-preview-blob-clone (`window.open` → `fetch`+`createObjectURL`) | 1 | 0 | 1 | OK |
| html-preview-drop-secret-branch (`if (false)`) | 1 | 0 | 1 | OK |
| html-preview-neighbour-signature (вернуть `overrideUrl?` соседу) | **0** терпимость | 0 | 0 | OK |
| payload-hardcode-kind (`kind` → `"informed_consent"`) | 1 | 0 | 1 | OK |
| **payload-active-patient-in-create** (бывшая вакуумная) | 1 | 0 | 1 | **OK** |
| payload-drop-org-from-load (убрать организацию) | 1 | 0 | 1 | OK |
| payload-default-deduction-code-1 (`""` → `"1"`) | 1 | 0 | 1 | OK |
| payload-validate-after-fetch (проверка после POST) — *моя добавка* | 1 | 0 | 1 | OK |

Ни одна мутация не сломала разбор. Ключевая — `payload-active-patient-in-create`
(`patientId: documentPatient.id` → `patientId: activePatient.id` внутри `createDocument`): бывшая
вакуумная проверка теперь **краснеет**, сообщение
`createDocument still posts documents for activePatient.id`. Заявка исполнителя подтверждена.

### Вакуумная проверка, которую он нашёл — подтверждаю независимо

Старая версия (`f31ff26b2^`, строки 410-413, 432) вырезала блок регуляркой с замыкающим маркером
`\n {2}async function updateDocumentStatus` — **два пробела**, файл набран **табуляциями**. Замерено:

```
old end-marker regex matches: false
tab-indented equivalent present: true
old full-block capture: NULL -> ?? "" gives empty string
"".includes("patientId: activePatient.id") = false
```

`?? ""` превращал промах в пустую строку, запрет был всегда false. Не молчал по-другому — не работал вообще.

---

## 2. Коммиты

| коммит | пути | трейлеры | автор |
|---|---|---|---|
| `33d88c79a` | только `scripts/smoke-telegram-{handoff,outbox-sla}-source.mjs` | пусто | marko1olo |
| `2dc0e5e81` | только `scripts/smoke-{document-html-preview,telegram-url-ui}-source.mjs` | пусто | marko1olo |
| `f31ff26b2` | только `scripts/smoke-document-payload-ui-source.mjs` | пусто | marko1olo |

`git show --stat --format='%(trailers)'` — трейлеры пусты у всех трёх, ни одного `co-authored` /
`anthropic` / `generated`. Продуктовых файлов в коммитах нет. Чужая незакоммиченная работа не подметена:
`apps/web/src/useAppLogic.tsx` был `M` ещё до моего входа (66 вставок / 27 удалений), в коммиты не попал,
и моих мутаций в нём нет (проверил `git diff | rg 'if \(false\)|createObjectURL\(await|patientId: activePatient'`
→ ничего). Копия из теневого дерева восстановлена побайтово: `a.equals(b) = true`.

Кодировка пяти скриптов: BOM=false, utf8-round-trip=true, mojibake=false у всех пяти. Заявка верна.

### Решена заявленная задача, не соседняя подешевле

Да. Где нужен разбор TypeScript — зовётся TypeScript (`ts.createSourceFile` + обход дерева), по образцу
MM2. Требования переписаны на **связь**, а не на обёртку: связка «ярлык поля → его черновик» для шести
адресов Telegram, порядок «ref первого рендера → только потом адрес», «отрицание оконного стража → ранний
`return []`», «проверка полей → до POST». Терпимость к формату — не снятое требование: обе мутации
переформатирования остались зелёными, а все семантические покраснели. RESURRECTION снята с причиной
законно: текст «Перед созданием CRM проверит…» убран намеренно, причина записана комментарием в
`apps/web/src/DocumentsView.tsx:1161-1162` («программа говорила о себе аббревиатурой»), подсказка жива и
различает «заполните форму» / «можно создать сразу», а тот же страж на строке 804 запрещает
`"Telegram-бота DENTE"` ровно по той же причине — игла требовала запрещённого.

### `?? 0` / `|| 0` вместо «неизвестно»

Не подставлено. В пяти стражах ни одного `?? 0` / `|| 0` в вычислениях. `?? []` на строках 845/856/860
только вокруг `.match()` для подсчёта монтирований — промах даёт пустой список и **красноту**, а не ноль.

---

## FOUND

### F1. Единственный `forbiddenSnippets` стража SLA не может сработать никогда — вакуумная проверка в файле, который пакет правил

`scripts/smoke-telegram-outbox-sla-source.mjs:70-72`:

```js
const forbiddenSnippets = [
	'task.patientId === patientId && task.visitId === visitId && task.intent === "post_visit_instruction"\n  );\n  if (hasTask) return true;',
];
```

Три несовпадения разом: игла на `\n`, а `apps/api/src/sampleData.ts` — **CRLF** (12738 CRLF, 0 одиночных
LF); игла на **двух пробелах**, файл на **табуляциях**; игла в одну строку, живой код разнесён по строкам.

```
forbidden needle present: false
first line of needle present: false
has "\n  );": false      has "\r\n  );": false      has "\r\n\t\t);": true
```

**Доказано мутацией, не чтением.** Убираю из `postVisitInstructionAlreadyCovered` вызов, который этот
запрет и охраняет:

```
sla-drop-outbox-claim-guard | base=0 | expect=1 | exit=0 | !! ОЖИДАЛСЯ 1
```

```
node node_modules/.rev-oo6/shadow.mjs sla-drop-outbox-claim-guard
# `task.intent === "post_visit_instruction" &&\r\n\t\t\tpostVisitInstructionTaskKeepsOutboxClaim(task),`
#   → `task.intent === "post_visit_instruction",`
```

Страж остаётся **ЗЕЛЁНЫМ**. Потерянное поведение — дословно из `reason` самого стража: *«let failed/skipped
post-visit tasks suppress fallback»*. Без `postVisitInstructionTaskKeepsOutboxClaim(task)` **проваленная или
отменённая** задача после визита снова считается покрытием, и пациент не получает послевизитных
рекомендаций вообще. `requiredSnippets` это не ловит: там стоит голое имя
`"postVisitInstructionTaskKeepsOutboxClaim"`, и оно совпадает с **объявлением** функции — обёртка есть,
связь порвана. Ровно то, что пакет обещал закрепить, в том же файле, четырьмя строками ниже добавленной
регулярки.

Команда воспроизведения на продукте:
`rg -n 'postVisitInstructionTaskKeepsOutboxClaim' apps/api/src/sampleData.ts` → 8965 (объявление), 9291 (вызов).

### F2. Вторая вырезка в `smoke-document-payload-ui-source.mjs` осталась на `indexOf` по отступу — окно 6018 строк вместо функции на 24

`scripts/smoke-document-payload-ui-source.mjs:878-881`:

```js
const communicationDocumentWorkflowBlock =
	/function openCommunicationTaskDocumentWorkflow\([\s\S]*?\n {2}\}/.exec(
		source,
	)?.[0] ?? "";
```

Замыкающий маркер `\n {2}\}` — **два пробела**, `useAppLogic.tsx` на **табуляциях**. Тот же дефект, что
исполнитель заменил на `ts.createSourceFile` на строках 590-628, в **том же файле, в том же коммите**.
Ленивый `[\s\S]*?` не находит границу и бежит до первого 2-пробельного `}` — за конец `useAppLogic.tsx`
(14744 строк) и внутрь склеенного `AppHelpers.tsx`. Замерено:

```
matched: true
block chars: 182576   lines: 6018
true declaration site: apps/web/src/useAppLogic.tsx:12963   (функция — 12963-12986, 24 строки)
last 260 chars of block: ...DocumentIssueSignatureDraft { const fallback: ... }   ← это AppHelpers.tsx
```

**Доказано мутацией.** Добавляю вызов `createDocument(` в **другую, невиновную** функцию
`completeCommunicationTask` (`useAppLogic.tsx:12988`, внутри окна, но вне проверяемой функции):

```
workflow-window-false-positive | base=0 | expect=0 | exit=1 | !! ОЖИДАЛСЯ 0
log: "communication document workflow must not auto-create documents"
```

Страж краснеет и называет функцию, которая **не тронута**. Запрет «communication document workflow must
not auto-create documents» сейчас зелёный не потому, что проверен, а потому что в этих 182 КБ случайно нет
подстроки `createDocument(`. Симметрично: четыре требования `includes` на строках 883-912 может выполнить
любая из ~6000 посторонних строк окна, а не проверяемая функция. Подзаголовок коммита `f31ff26b2`
«Границы функции теперь берёт `ts.createSourceFile`» верен для `createDocument` и неверен для этой вырезки.

Починка — та же, что он уже написал рядом: `documentUiFunctionSource("openCommunicationTaskDocumentWorkflow")`.

### F3. `smoke-document-html-preview-source.mjs`: требование о запасном скачивании при заблокированном окне выполняет ЧУЖОЙ вызов

`scripts/smoke-document-html-preview-source.mjs:141-145` требует в теле `openIssuedDocumentHtml`:

```js
requireIn(openIssuedDocumentHtmlSource,
  "await downloadIssuedDocumentHtml(documentId, { preserveError: true });",
  "Popup-blocked issued HTML preview must immediately invoke the safe archive download fallback.");
```

В функции этот вызов стоит **дважды** (`useAppLogic.tsx:12670` — ветка секрета админа, `12683` — ветка
заблокированного окна). `includes` выполняет **любой из двух**, поэтому требование о ветке
заблокированного окна не проверяется.

**Доказано мутацией:**

```
html-preview-drop-popup-fallback | base=0 | expect=1 | exit=0 | !! ОЖИДАЛСЯ 1
```

Удаляю только вызов на 12683. Страж **ЗЕЛЁНЫЙ**. Что видит оператор в мутированной сборке (вывод харнесса):

```
setError('Браузер заблокировал новое окно документа. CRM запускает скачивание архивного HTML; …');
}  catch (error) {
```

Сообщение обещает «CRM запускает скачивание», а не скачивается ничего — ровно тот отказ, который
требование и написано ловить. Починка: привязать вызов к ветке, а не к телу — например
`/if \(opened\)[\s\S]*?await downloadIssuedDocumentHtml\(documentId, \{ preserveError: true \}\);/`
после `window.open`, либо считать вхождения (`=== 2`).

### F4. Восемь строк русского интерфейса испорчены лишней заглавной `И`, а страж кодировки зелёный — семейство не покрыто

Не пакета OO6: внесено `471fb19ef` («chore: complete phase 5 testing and ui verification»), часть
перенесена в `useVisitLogic` при `567186f5b`. Пакет трогал только `scripts/`. Но **живой дефект на экране
русской клиники**, и продукт я не правлю.

| файл:строка | текст на экране | должно быть |
|---|---|---|
| `apps/web/src/useAppLogic.tsx:7703` | `РаспознаИвание не подготовлено` | Распознавание |
| `apps/web/src/useAppLogic.tsx:7713` | `РаспознаИвание не подготовлено` | Распознавание |
| `apps/web/src/useAppLogic.tsx:12668` | `CRM запускает защищенное скачиИвание архивного HTML.` | скачивание |
| `apps/web/src/useAppLogic.tsx:12681` | `CRM запускает скачиИвание архивного HTML; …` | скачивание |
| `apps/web/src/useAppLogic.tsx:13317` | `Связка Telegram не отозИвана` | отозвана |
| `apps/web/src/useAppLogic.tsx:13324` | `Связка Telegram не отозИвана` | отозвана |
| `apps/web/src/hooks/domains/useVisitLogic.ts:685` | `РаспознаИвание речи не выполнено: …` | Распознавание |
| `apps/web/src/hooks/domains/useVisitLogic.ts:1315` | `РаспознаИвание: аудио-фрагмент … больше лимита` | Распознавание |

Не mojibake: коды чистые, `И` = U+0418 между `и`=U+0438 и `в`=U+0432. Во всех восьми случаях лишняя `И`
вставлена **непосредственно перед `в`** — подпись машинной правки, а не опечатки.

Замерено, что этого никто не видит:

```
node scripts/smoke-web-text-encoding.mjs ; echo $?   →  0
{ "ok": true, "checkedFiles": 470, "mojibakeHits": 0, "garbledQuestionHits": 0 }
```

Причина в `scripts/lib/mojibakePattern.mjs`: `createMojibakePattern()` знает четыре семейства —
Latin-1/CP1252, U+FFFD, `Ве`+знак, `ве`+`Ђ`, `Р/С`+южнославянская. Порча **внутри одной кириллицы**
(`И` между строчными) не подходит ни к одному, и 470 файлов проходят чистыми. Собственный комментарий
этого файла говорит, что он уже один раз пропустил 17 сломанных строк другого семейства — это третье.

Команда: `rg -n '[а-я]И[а-я]' apps/web/src --glob '*.ts*'`
(ложные срабатывания, НЕ дефекты: `КодИсследования` — имя колонки CSV в
`useSettingsDerivations.tsx:38` и `SettingsImportsTab.tsx:3822`; `Иванова Марина` — имя в примере).

### F5. Его три FOUND — проверил, все три верны

- **`apps/api/src/sampleData_opt.ts`** — 429 705 байт, исключён в `apps/api/tsconfig.json:49`. Импортов
  нет: `rg -l sampleData_opt apps` даёт три файла, и все три — **только упоминания в комментарии/имени
  теста** (`money/patientDebt.ts:114`, `money/patientDebt.test.ts:590`, `telegram/legacyMocks.ts:8`),
  ни одного `import`. Односрочная запись, которую требовала игла стража SLA, есть там ровно 1 раз и 0 раз
  в живом `sampleData.ts` — игла совпадала бы с мёртвой копией.
- **Ловушка замера Git Bash** — подтверждена: `node -e "console.log(process.argv[2])" x '/api/settings'`
  печатает `C:/Program Files/Git/api/settings`. `rg -c -F '/api/settings/telegram' apps/web/src` → 0
  совпадений; `rg -c -F 'api/settings/telegram' apps/web/src` → 2 файла
  (`hooks/useTelegramSettings.ts`, `components/settings/SettingsMarketingTab.tsx`). Любой поиск роута
  `/api/...` через Git Bash недобирает молча. Ценно для всей волны.
- **`scratch/` не в `.gitignore`** — `git check-ignore -v scratch/` пусто, exit 1; в каталоге лежит
  чужое незакоммиченное (`scratch/audit-settings-props.mjs` — `M`, плюс ~десяток `??`).

### F6. Нит: `?.includes` на запрете — fail-open

`scripts/smoke-document-payload-ui-source.mjs:662`:
`if (fullCreateDocumentBlock?.includes("patientId: activePatient.id"))` — при `null` даёт `undefined`,
запрет молча проходит. Сейчас не выстрелит: `null` уже отдельно докладывается строкой 632
(`createDocument declaration not found…`), страж всё равно покраснеет. Но форма — та же, что у починенной
вакуумной проверки; надёжнее ранний выход по `!fullCreateDocumentBlock`, а не `?.`.

### F7. Нит: класс `smoke:document-html-preview-source` заявлен STALE, по его же таксономии это BRITTLE

Заявлено STALE («текст переехал при разборе монолита, чини набор файлов»), но набор файлов страж по
существу не менял, а красноту вызвало **удаление параметра `overrideUrl?: string` у соседней функции** —
то есть правка чужого кода, что в таксономии брифа BRITTLE. Сам исполнитель это и описал в CONTRADICTED,
но в таблицу класса не перенёс. Починка от этого не меняется; расхождение в учёте класса.

---

## Что осталось (объём рework)

1. `smoke-telegram-outbox-sla-source.mjs:70-72` — заменить мёртвый `forbiddenSnippets` на требование
   связи: `postVisitInstructionTaskKeepsOutboxClaim(task)` обязан стоять **внутри** предиката
   `communicationTasks.some(...)` в `postVisitInstructionAlreadyCovered`. Проверка укуса —
   `sla-drop-outbox-claim-guard` обязан дать 1.
2. `smoke-document-payload-ui-source.mjs:878-881` — вторая вырезка на
   `documentUiFunctionSource("openCommunicationTaskDocumentWorkflow")`. Проверка —
   `workflow-window-false-positive` обязан дать 0, и удаление `setSelectedDocumentKind(kind)` из самой
   функции обязано дать 1.
3. `smoke-document-html-preview-source.mjs:141-145` — привязать запасное скачивание к ветке
   заблокированного окна. Проверка — `html-preview-drop-popup-fallback` обязан дать 1.

Не требуется и не просить: правок в `apps/api/src/routes/telegram.ts` не было и не нужно; продуктовые
дефекты F4 — отдельным пакетом, не здесь.

## Хвосты

Долгоживущего не запускал: портов не занимал, серверов и БД не поднимал, фоновых процессов не оставил.
Ревьюерский харнесс — `C:\Clinic_MVP\dental-crm\node_modules\.rev-oo6\` (`shadow.mjs`, `specs*.mjs`,
`syntax.mjs`, `probe-block.mjs`, `tree/` — копия исходников ~18 МБ). Каталог внутри `node_modules/`,
закрыт `.gitignore:1`, в `git status` не виден; можно удалить целиком одной командой
`rm -rf node_modules/.rev-oo6`. Продуктовое дерево и `scripts/` мной не изменены.
