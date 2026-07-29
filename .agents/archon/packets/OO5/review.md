## VERDICT: SOUND_WITH_NITS

Ревью пакета OO5 (стражи dicom и снимков). Проверено по диску, не по отчёту исполнителя.
Всё в этом файле — замеры, выполненные ревьюером заново; чужие числа не переписывались.

---

## 1. Главное требование волны: EXIT_PASS / EXIT_BITE / команда MUTATION

Все три возвращены. EXIT_BITE не только заявлен — он **воспроизведён ревьюером**, а не принят на слово.

Стенд: зеркало дерева из ровно тех 21 файла, которые читают четыре стража
(`C:\temp\oo5rev\tree`, скрипт сборки `C:\temp\oo5rev\setup.sh`). Мутации —
`s.split(from).join(to)` над файлом в зеркале, прогон стража с `cwd` = зеркало, немедленное
восстановление файла. Боевое дерево при мутациях не трогалось (проверено ниже, §3).

Базовая линия зеркала — все четыре зелёные, значит зеркало эквивалентно дереву:

```
node scripts/<страж>.mjs   (cwd=C:/temp/oo5rev/tree)
BASELINE smoke-browser-imaging-scan-progress-source EXIT=0
BASELINE smoke-api-dicom-scan-abort-yield-source    EXIT=0
BASELINE smoke-dicom-workbench-offline-source       EXIT=0
BASELINE smoke-dicom-workbench-ui-cancel-source     EXIT=0
```

### Девять мутаций исполнителя, повторённые ревьюером

`node C:\temp\oo5rev\mutate.mjs`, `node C:\temp\oo5rev\mutate2.mjs`

| мутация | якорей | EXIT | сообщение стража |
|---|---|---|---|
| b2 testid верхней кнопки → `scan-stop` | 1 | **1** | `Settings browser imaging scan UI missing marker: data-testid="browser-cancel-local-imaging-folder-scan"` |
| b3a подпись без `options: ApiDicomScanOptions = {}` | 1 | **1** | `API DICOM scan helper threading missing pattern: /buildDicomFolderWorkupPlan\(\s*input:…/` |
| b3b `buildDicomFolderWorkupPlan(input, workupOrgId)` | 1 | **1** | `API DICOM scan callsite signal propagation missing pattern` |
| b3c-1 `buildDicomFolderSeriesPreview(input, organizationId)` | 1 | **1** | `…must thread scan options at every callsite forbidden pattern hit` |
| b3c-2 `buildDicomFolderSeriesPreview(input, previewOrgId)` | 1 | **1** | `…forbidden pattern hit: buildDicomFolderSeriesPreview(input, previewOrgId` |
| b4a `await` снят у `loadLocalDicomWorkbenchDraft` | 1 | **1** | `Missing marker: const restore = async () => {…` |
| b4b `db.close()` убран из обработчика `versionchange` | 1 | **1** | `…versionchange handler must close the database` |
| b5a `{ signal: controller.signal }` снят у `fetchDicomFolderWorkup` | 1 | **1** | `App local DICOM operation cancel contract missing marker` |
| b5b testid «Остановить КТ» → `stop-ct` | 1 | **1** | `Settings local DICOM cancel UI missing marker: data-testid="cancel-local-dicom-operation"` |

Ни одна из девяти не ломает компиляцию: восемь снимают аргумент/атрибут/вызов, одна снимает
`await`. Это поломки поведения, а не парсинга — доказательство годное.

**Расхождение в отчёте (не в коде):** мутация b3a приведена в отчёте с табами
(`input: DicomFolderWorkupPlanRequest,\n\toptions:`), а `apps/api/src/routes/imaging.ts:6180-6181`
использует два пробела. Дословно из отчёта якорь не находится
(`b3a ANCHOR_MISSING`); с настоящим отступом мутация кусает (`EXIT=1`). Это ошибка
транскрипции в отчёте, а не невыполненная проверка — исправленный вариант кусает.

### Коды выхода ДО и ПОСЛЕ — перепроверены на предкоммитных версиях стражей

Не «по логу исполнителя», а прогоном версий из `767222ea4^` (и `36e586681^` для пятого):

```
git show 767222ea4^:scripts/<страж>.mjs > tree/scripts/BEFORE-<страж>.mjs
node scripts/BEFORE-<страж>.mjs

BEFORE smoke-browser-imaging-scan-progress-source EXIT=1
BEFORE smoke-api-dicom-scan-abort-yield-source    EXIT=1
BEFORE smoke-dicom-workbench-offline-source       EXIT=1
BEFORE smoke-dicom-workbench-ui-cancel-source     EXIT=1
BEFORE smoke-imaging-viewer-usability-source      EXIT=1
```

Прогон по боевому дереву после коммитов (истинный код, без конвейера):

```
cd /c/Clinic_MVP/dental-crm
node scripts/<страж>.mjs > /tmp/revOO5/<страж>.log 2>&1; echo $?

smoke-browser-imaging-scan-progress-source EXIT=0
smoke-api-dicom-scan-abort-yield-source    EXIT=0
smoke-dicom-workbench-offline-source       EXIT=0
smoke-dicom-workbench-ui-cancel-source     EXIT=0
smoke-imaging-viewer-usability-source      EXIT=0
```

Таблица ДО/ПОСЛЕ исполнителя (`1 → 0` по всем пяти) подтверждена независимо.
Общие гейты (typecheck, build, весь `npm test`) не запускались — по брифу.

---

## 2. Классы таксономии — проверены, поставлены верно

- **STALE** для `smoke-browser-imaging-scan-progress-source`: подтверждено. Разметка живая и это
  настоящий JSX, а не комментарий:
  `apps/web/src/components/settings/SettingsImportsTab.tsx:3170` — `data-testid="browser-cancel-local-imaging-folder-scan"` внутри `<button onClick={cancelBrowserImagingFolderScan}>`;
  `:3180` — `data-testid="cancel-local-dicom-operation"` внутри `<button onClick={cancelLocalDicomOperation}>`.
  Команда: `rg -n 'browser-cancel-local-imaging-folder-scan|cancel-local-dicom-operation' apps/web apps/api packages`
  → 3 совпадения, все в JSX, 0 в комментариях.
  **Гипотеза брифа «маркер только в `// Compliance:`» здесь НЕ ПОДТВЕРЖДАЕТСЯ.** Исполнитель
  опроверг её верно. В `SettingsImportsTab.tsx` строк `// Compliance:` вообще ноль
  (`rg -c '// Compliance:'` → 0); стена из 517 строк лежит только в
  `apps/web/src/useSettingsDerivations.tsx`, и он в наборы не добавлен — правильно.
- **BRITTLE** для трёх стражей: подтверждено по диффам. Ни одно требование не удалено без замены.
  В `smoke-api-dicom-scan-abort-yield-source` три дословных подстроки заменены на RegExp,
  закрепляющие связь «имя помощника → `options` на своём месте», плюс СВЕРХУ добавлены два
  отрицательных образца. В `smoke-dicom-workbench-ui-cancel-source` изменены только
  нормализация и набор файлов — список требований не тронут. В
  `smoke-dicom-workbench-offline-source` единственная снятая дословная строка
  (`db.onversionchange = () => db.close();`) заменена RegExp в том же коммите.
- **REAL** для `smoke-imaging-viewer-usability-source`: дефект подтверждён замером.
  `rg -n 'decoding' apps/web/src/components/imaging/ShadowAnalystImageSlider.tsx` → **0 совпадений**;
  три `<img>` на строках 75, 89, 96. Главный диагностический снимок декодируется синхронно.
  Отказ исполнителя от чужого файла обоснован: `36e586681` — коммит другого агента, там же
  реестр `KNOWN_MISSING_IMAGING_SURFACES` и настоящий храповик
  (`scripts/smoke-imaging-viewer-usability-source.mjs:477, 500, 510` — при появлении
  `decoding="async"` страж требует убрать долг из реестра). Продуктовый дефект остаётся
  открытым как объявленный долг; это не заслуга и не вина OO5.
- **RESURRECTION** — ни одного случая: ни одно требование не возвращает удалённый дефект.

---

## 3. Коммиты, трейлеры, чужая работа

```
git show --name-only --format="" 767222ea4 5c408401e | sort -u
scripts/smoke-api-dicom-scan-abort-yield-source.mjs
scripts/smoke-browser-imaging-scan-progress-source.mjs
scripts/smoke-dicom-workbench-offline-source.mjs
scripts/smoke-dicom-workbench-ui-cancel-source.mjs
```

- Только заявленные пути. Ни одного файла продукта, ни одного `commitmsg`, ни одной чужой правки.
- `git log -1 --format='%(trailers)'` пуст на обоих коммитах (проверено через `cat -A`: одна пустая строка).
  Автор — `marko1olo <marko1olo@users.noreply.github.com>`. Атрибуции инструмента нет.
- Чужая незакоммиченная работа не подметена: единственный оставшийся грязный файл из
  затронутых стражами — `apps/web/src/useAppLogic.tsx` (66+/27−), и это чужой пакет про
  округление денег до копейки (`roundToKopecks`), к OO5 отношения не имеющий.
- Записи в исходники скриптом нет:
  `rg -n 'writeFile|appendFile|rmSync|unlink|execSync|spawn' <четыре стража>` → NONE.
- Остатков мутаций в дереве нет:
  `rg -n 'data-testid="scan-stop"|data-testid="stop-ct"|previewInput|Math\.random\(\) < 0' apps/web/src apps/api/src`
  → 0 совпадений. Обработчик на диске цел (`AppHelpers.tsx:5318-5321`, `db.close()` на месте).
- Заявленная задача решена, не соседняя подешевле: предмет — те самые пять стражей из брифа,
  четыре сделаны, пятый честно отдан другому агенту с замером времени.

---

## 4. FOUND — новые дефекты, найденные ревьюером

Три требования внутри переписанных стражей **не кусают на настоящей регрессии**. Все три
измерены мутацией по зеркалу, все три компилируются. Один из трёх — того же класса, который
исполнитель сам диагностировал и закрыл в соседнем страже в этом же пакете, но не вымел
у себя.

### F1. Требование к полосе прогресса выполняется именем CSS-класса, а не разметкой

`scripts/smoke-browser-imaging-scan-progress-source.mjs:108-109`. Исполнитель ужесточил
записи `:106-107` до формы `data-testid="…"` и написал рядом десять строк комментария
«ОБА ОБРАЗЦА — С АТРИБУТОМ И ЗАКРЫВАЮЩЕЙ КАВЫЧКОЙ, И ЭТО НЕ ПЕДАНТИЗМ». Следующие две
записи того же списка остались мягкими:

```js
	"browser-imaging-scan-progress",   // :108 — голый токен
	'aria-live="polite"',              // :109 — есть ещё на десяти чужих элементах
```

`browser-imaging-scan-progress` встречается в `SettingsImportsTab.tsx` трижды: `className`
на `:2135` (это ДРУГОЙ элемент — прогресс миграции), `className` на `:3249` и только
`data-testid` на `:3250`. `aria-live="polite"` — 11 раз в склеенном `settingsSource`
(9 в `SettingsImportsTab.tsx`, 2 в `SettingsView.tsx`), из них на самой полосе прогресса — один.

Замер: удалены `data-testid="browser-imaging-scan-progress"`, `role="status"` и
`aria-live="polite"` у настоящей полосы прогресса (`:3250-3252`) — **страж остался зелёным,
код выхода 0** (`R6b-progress-loses-testid-and-arialive`). Полоса перестаёт быть live-region
для скринридера и теряет тестовый крючок, страж молчит: требование держит имя CSS-класса.
Команда проверки:
`rg -n 'browser-imaging-scan-progress' apps/web/src/components/settings/SettingsImportsTab.tsx`
→ `:2135 className`, `:3249 className`, `:3250 data-testid`.

Лечение — то же, что исполнитель применил двумя строками выше: `'data-testid="browser-imaging-scan-progress"'`
и привязка `aria-live` к этому же элементу образцом, а не отдельным токеном.

### F2. Долговечное сохранение с organizationId требуется у ОДНОГО из двух вызовов

`scripts/smoke-dicom-workbench-offline-source.mjs:301`:

```js
	"const savedLocally = await saveLocalDicomWorkbenchDraft(manifest, clientSavedAt, activeOrganizationId);",
```

Вызовов с `manifest` — **два**: `apps/web/src/useAppLogic.tsx:10066` и `:10653`
(третий, `:10246`, с `result` — покрыт отдельной строкой `:302`). `includesMarker` по всему
склеенному `source` удовлетворяется любым из двух.

Замер: у второго вызова (`:10653`) снят `activeOrganizationId` — **код выхода 0**
(`R5b-one-of-two-manifest-saves`). Снят у обоих — код выхода 1 (`R5c`, контроль:
`DICOM workbench UI must await durable local recovery path: …`).

Это ровно тот дефект, который исполнитель нашёл искусственной поломкой и закрыл в
`5c408401e` для `smoke-api-dicom-scan-abort-yield-source` («требование выполнялось ПЕРВЫМ
совпадением при двух вызовах»), — и не вымел в страже, который переписывал тяжелее всех.
Продуктовое следствие: `saveLocalDicomWorkbenchDraft` имеет
`organizationId: string | null | undefined = null` (`AppHelpers.tsx:5422`), то есть при потере
аргумента черновик уезжает в ключ по умолчанию — черновики двух клиник в одном браузере
сходятся в один ключ, и страж этого не увидит.

Команда: `rg -n 'saveLocalDicomWorkbenchDraft\(' apps/web/src/useAppLogic.tsx` → `:10066`, `:10246`, `:10653`.

### F3. Новый храповик «у каждого вызова» привязан к буквальному имени `input`

`scripts/smoke-api-dicom-scan-abort-yield-source.mjs:176-177` (коммит `5c408401e`):

```js
	/buildDicomFolderSeriesPreview\(\s*input,(?!\s*options)[^)]{0,60}/,
	/buildDicomFolderWorkupPlan\(\s*input,(?!\s*options)[^)]{0,60}/,
```

Отрицательный образец срабатывает только если первый аргумент вызова записан буквально как
`input`. Замер: `buildDicomFolderSeriesPreview(previewInput, previewOrgId)` у одного из двух
вызовов — **код выхода 0** (`R1b-plausible-rename-one-callsite`); то же с
`({ ...input }, previewOrgId)` — 0 (`R1`). То есть переименование локальной переменной в
одном маршруте бесшумно снимает весь новый храповик, и маршрут без `AbortSignal` снова
уезжает молча — сценарий, ради которого коммит и написан. Заголовок коммита
«требование ловит регрессию любого одного вызова» шире, чем то, что образец реально держит.

Побочно: `(?!\s*options)` — префиксная проверка, поэтому аргумент `optionsЧтоУгодно`
её тоже проходит.

### Нит N1. `versionchange` требует наличия `db.close()` в теле, а не его достижимости

`scripts/smoke-dicom-workbench-offline-source.mjs:125`:
`/db\.onversionchange\s*=\s*\(\)\s*=>\s*\{?[^}]*db\.close\(\)/`.
Замер: тело обработчика оставлено, но закрытие спрятано под ложным условием
(`if (Math.random() < 0) db.close();`) — **код выхода 0** (`R4b-close-unreachable`).
Полное исчезновение `db.close()` кусает (b4b, код 1), так что связь закреплена; но правдоподобная
регрессия «закрытие ушло под новый флаг» проходит. Для текстового стража это граница
возможного, отмечаю как нит, а не как дефект.

### Нит N2. Собственные комментарии стражей отравили аудиторскую команду ведущего

Бриф опирался на `rg -l useSettingsDerivations scripts/` → 0. Сейчас **5**:
`smoke-browser-imaging-scan-progress-source.mjs:26`, `smoke-dicom-workbench-ui-cancel-source.mjs:26`,
`smoke-imaging-viewer-usability-source.mjs:34`, `smoke-settings-view-source.mjs:34`,
`smoke-pricelist-analyzer.mjs:114`. Все пять — упоминания в комментариях вида
«useSettingsDerivations.tsx СОЗНАТЕЛЬНО НЕ ЧИТАЕТСЯ». Ни один страж файл не читает
(проверено: ни одного `readFile` с этим именем), так что вывод брифа по существу верен,
но команда-индикатор перестала работать. Аудит стены комментариев теперь нужно вести по
`readFile`, а не по имени файла.

### Нит N3. Нормализация не различает живую разметку и мёртвую ветку

`{isLocalDicomOperationActive ? (` → `{false ? (` вокруг кнопки «Остановить КТ» —
**код выхода 0** (`R3b`). То же для полосы прогресса (`R7`). Это врождённое свойство всех
`*-source.mjs` в репозитории (текст, а не рантайм), пакетом OO5 не введено и им не ухудшено;
пишу, чтобы у ведущего не осталось иллюзии, что зелёный `*-source` страж доказывает наличие
элемента на экране.

---

## 5. Отдельные пункты чеклиста

- **Зелёный тест, не проверяющий ничего** — по существу нет: 9 из 9 мутаций исполнителя кусают
  (8 дословно, одна после исправления отступа), плюс мой контроль `R2-signal-not-forwarded`
  (все 22 `signal: controller.signal` → `signal: null`) даёт код 1. Три требования из F1-F3
  зелены на настоящей регрессии, но это три требования из многих десятков, а не страж целиком.
- **Ноль вместо «неизвестно»** — в диффах OO5 нет ни `?? 0`, ни `|| 0`. Единственный `?? []`
  (`(appSource.match(…) ?? []).length` с порогом `< 8`) — предсуществующий, не тронут.
  Замечу для ведущего: `?? 0`-подобный `Number.isFinite(value) ? … : 0` появился в
  незакоммиченном `useAppLogic.tsx` из ЧУЖОГО пакета про копейки — это не OO5, но проверить стоит.
- **Мёртвый код / сырые значения на экране** — пакет не включал мёртвый код и не касался
  продукта: изменены четыре файла в `scripts/`. Экранной поверхности нет, кириллица не тронута.
- **Вред, требующий REVERT** — нет: чужие правки целы, секретов нет, кириллица цела,
  скрипты в исходники не пишут.

## 6. Что осталось непроверенным

- Число «35 непройденных требований на четырёх стражах» я не пересчитывал: подстановка
  печати вместо `throw` по четырём предкоммитным версиям стоит дороже, чем стоит само число.
  Проверено то, от чего зависит вердикт: ДО=1 и ПОСЛЕ=0 по каждому из пяти, и что ни одно
  требование не удалено без равносильной замены.
- Рантайма нет ни у одного из пяти стражей — это текстовые проверки. Что кнопка отмены
  реально останавливает обход папки в браузере, не показано ни исполнителем, ни мной.
- Пятый страж (`smoke-imaging-viewer-usability-source`) и коммит `36e586681` — предмет
  чужого пакета; я подтвердил только продуктовый дефект и работоспособность храповика.

Ничего длительного не оставлено: только короткие прогоны `node`, все завершились.
Временное зеркало `C:\temp\oo5rev` удалено после замеров.
