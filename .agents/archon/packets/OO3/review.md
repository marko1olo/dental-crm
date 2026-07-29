## VERDICT: SOUND_WITH_NITS

Пакет сделан по существу, и сделан именно заявленный предмет. Бита не только предъявлена — я
воспроизвёл её своим мутатором на своей копии дерева, пять раз плюс одна моя собственная мутация,
и все шесть краснеют в ожидаемом месте. Замер исполнителя, противоречащий брифу, я пересчитал
своим скриптом: он верен во всех четырёх пунктах, бриф — нет. Ниты касаются одной ложной фразы в
теле коммита и одной дырки в новом страже, а не поверхности продукта.

---

## ЧТО ПРОВЕРЕНО ДОСЛОВНО, С КОДОМ ВЫХОДА

### Коммиты, гигиена, чужая работа

```
git show --stat c8ee7dc6a   -> 6 файлов: App.tsx, AppHelpers.tsx, три вкладки, новый тест
git show --stat f8abca9c8   -> 1 файл: тот же тест (+76 строк)
git log -1 --format='%(trailers)' c8ee7dc6a   -> пусто
git log -1 --format='%(trailers)' f8abca9c8   -> пусто
git log -2 --format='%H%n%B' | rg -in "claude|anthropic|co-authored|generated with|copilot|cursor"
                                              -> NONE FOUND
автор и коммиттер обоих: marko1olo <marko1olo@users.noreply.github.com>
[ARCHON] в теме: есть у обоих
```

Только заявленные пути. Чужая незакоммиченная работа НЕ подметена:
`apps/web/src/useAppLogic.tsx`, `apps/web/src/components/settings/SettingsClinicTab.tsx`,
`apps/api/src/pricelist/analyzer.ts` и ещё двадцать с лишним файлов остались модифицированными в
рабочем дереве и ни в один из его коммитов не попали. `useAppLogic.tsx` не тронут ни байтом —
подтверждаю по `git show --stat`.

### Его проверка, прогнанная мной

```
cd apps/web && node --import tsx --import ./testCssStub.mjs --test \
  src/tests/settingsTabsPricelistPropsAreRead.test.ts        -> EXIT 0, tests 29, pass 29, fail 0
cd apps/web && node --import tsx --import ./testCssStub.mjs --test \
  src/tests/priceEntryKeepsKopecks.test.ts                   -> EXIT 0, 6/6
cd apps/web && node --import tsx --import ./testCssStub.mjs --test \
  src/tests/panelsAreMounted.test.ts                         -> EXIT 0, 10/10
npm run smoke:settings-view-source                           -> EXIT 0
npm run smoke:web-render-gating-source                       -> EXIT 0
npm run smoke:pricelist-analyzer                             -> EXIT 1 (чужая причина, ниже)
npm run smoke:ui-preferences                                 -> EXIT 1 (чужая причина: Missing marker: saveUiPreferences({ )
npm run check:encoding                                       -> EXIT 1, 4 файла, все чужие review.md
                                                                (HH1, HH4, JJ4, JJ5)
```

`check:encoding` красный ровно на четырёх чужих `review.md` — мохибака и U+FFFD в HH1, HH4, JJ4,
JJ5. Ни один файл OO3 в списке не значится; этот review писан чистым UTF-8.

### БИТА: воспроизведена мной, своим мутатором, на своей копии

Я не запускал его `oo3-make-bite.mjs`. Собрал независимую копию дерева
(`C:\Users\Admin\AppData\Local\Temp\revOO3\` — шесть файлов в структуре, которую ждут относительные
пути теста) и свой мутатор `C:\Users\Admin\AppData\Local\Temp\revOO3-mutate.mjs`, который перед
каждой мутацией восстанавливает копию из исходников и проверяет, что якорь найден РОВНО один раз
(иначе выход 9 — мутация вслепую не проходит). Базовая линия копии: **EXIT 0, 29/29**.

| мутация (в моей копии) | EXIT | что покраснело |
|---|---|---|
| A: `pricelistWarningsText,` обратно в блок `SettingsAuditTab` | **1** | «ни одно прайсовое имя не обрывается…», «pricelistWarningsText либо читается…», «долг не растёт и не врёт» — 26 pass / 3 fail |
| B: в `SettingsView` `{pricelistWarningsText([warning])}` → `{warning}` | **1** | «родитель действительно рисует снятые с вкладок подписи» — 28/1 |
| C: `zzzNeverReadProbeName,` в блок `SettingsAuditTab` (долг 339 против 338) | **1** | «долг не растёт и не врёт» — 28/1 |
| D: проброс `pricelistWarningsText={…}` обратно в `<SettingsView …>` в `App.tsx` | **1** | «App.tsx не пробрасывает эти имена» — 28/1 |
| E (**моя, его в списке не было**): `pricelistImageNote,` обратно в `SettingsPricesTab` | **1** | «ни одно прайсовое имя…», «pricelistImageNote либо читается…», «мешок вычищен полностью» — 26/3 |

Ни одна из пяти не ломает компиляцию вместо поведения: все пять — текстовое восстановление
исходного дефектного состояния, которое компилировалось и до правки (`props: Record<string, any>`,
`[key: string]: any` в `SettingsViewProps`), а сам тест файлы не компилирует, он читает их текстом.
Мутация E важна отдельно: она доказывает, что `everyNameMustBeRead: true` у `SettingsPricesTab` —
не декорация, а работающее требование полной чистоты.

`git status` по его путям после всех прогонов: чисто, кроме чужого `SettingsClinicTab.tsx`, который
был модифицирован до меня.

### БИТА №5 (страж прайса): воспроизведена НАСТОЯЩИМ скриптом, а не перенесённой стадией

Исполнитель вынес стадию проверки исходников в отдельный файл и прогнал её там. Это слабее, чем
нужно, — ровно тот класс, которым кампания уже обжигалась («помощник теста повторял
последовательность боевой ветки вместо её вызова»). Я сделал сильнее: собрал песочницу
`C:\Users\Admin\AppData\Local\Temp\revOO3root\` (копия `apps/api/dist`, копия `analyzer.ts` с
принудительно старой mtime, восемь его UI-файлов, junction `node_modules` → репозиторий) и запустил
**настоящий** `scripts/smoke-pricelist-analyzer.mjs` с cwd в песочнице.

```
cd revOO3root && node C:/Clinic_MVP/dental-crm/scripts/smoke-pricelist-analyzer.mjs
  -> EXIT 0
  {"rows":11,"parserMode":"deterministic","categories":[...],"uiSourceLocalized":true,
   "invalidImageWarnings":["image_payload_invalid","groq_skipped_invalid_image_payload",
   "no_pricelist_rows_detected"]}
```

То есть на исходниках ПОСЛЕ OO3 страж проходит все одиннадцать утверждений, включая
локализационную стадию. Мутация в песочнице:

```
pricelistUiMeta.ts: "Требуется ручная проверка прайса" -> "material_uncertain"
  -> EXIT 1: Missing pricelist/QR UI localization snippet: Требуется ручная проверка прайса
```

Бита №5 подтверждена настоящим скриптом.

### Требование брифа «смоук обязан быть 0» — не выполнено, и это НЕ его вина

```
npm run smoke:pricelist-analyzer -> EXIT 1
Error: Сборка старше исходника: dist/pricelist/analyzer.js собран 2026-07-29T07:04:49.809Z,
       а src/pricelist/analyzer.ts изменён 2026-07-29T07:46:52.012Z.
```

Страж умирает на строке 26 своего же файла, до первого `readFileSync` любого файла OO3. Причина —
`apps/api/src/pricelist/analyzer.ts`, который правят другие пакеты этой же волны (fb9eb4787,
e804abd70) и который прямо сейчас модифицирован в рабочем дереве. Лечится только
`npm run build -w @dental/api`. Проверил обе mtime сам: dist 11:04:49, src 11:46:52.

### Замер исполнителя против брифа: пересчитан своим скриптом, ВЕРЕН ЗАМЕР

Свой обходчик (`C:\Users\Admin\AppData\Local\Temp\revOO3-analyze2.mjs`, повторяет только границы
блока, дальше считает по-своему) на HEAD:

```
SettingsPricesTab.tsx : names=24  dead=0    прайсовых имён 24-х осталось 18, мёртвых из них 0
SettingsAuditTab.tsx  : names=478 dead=338  прайсовых имён осталось 0
SettingsImportsTab.tsx: names=481 dead=251  прайсовых имён осталось 0
```

Совпало с его 24/0, 478/338, 481/251 до единицы. Дополнительно проверил два способа получить
ложно-живое имя, оба пусты во всех трёх файлах: имён, «живых» только за счёт текста ВЫШЕ блока
(строка импорта, объявление верхнего уровня) — ноль; имён, «живых» только внутри строковых
литералов — ноль. То есть его ноль по прайсовым именам настоящий, а не артефакт разбора.

Четыре противоречия брифу проверены по пред-OO3 блобам (`git show c8ee7dc6a^:…`):

| имя | PricesTab | AuditTab | ImportsTab | почему бриф соврал |
|---|---|---|---|---|
| `pricelistRecognitionBrandGroups` | 2/2 | 2/2 | 2/2 | вторая строка — `const typedPricelistRecognitionBrandGroups = … as StringTokenGroup[]`, а сам `typed…` имел `rg -cw` = **1** в обеих тяжёлых вкладках, то есть был мёртв |
| `pricelistRecognitionServiceGroups` | 2/2 | 2/2 | 2/2 | то же, `typedPricelistRecognitionServiceGroups` = 1 |
| `pricelistSourceKind` | 6/**4** | 2/**1** | 2/**1** | двойка набегала подстрокой: `rg` считает СТРОКИ, а строка `pricelistSourceKindLabels,` содержит `pricelistSourceKind`. По `-w` — единица |
| `pricelistAnalysis` | 2/2 | 2/2 | 2/2 | вторая строка — мёртвый `typedPricelistAnalysis` (`-cw` = 1) |

Итог: «живые, не трогай» в брифе верно только для `SettingsPricesTab`; в двух тяжёлых вкладках все
три имени были мертвы, а сам критерий «>1 ⇒ используется» пробивается и подстрокой, и мёртвым
`typed…`-алиасом. Исполнитель нашёл оба пробоя и обошёл их. `SettingsPricesTab` действительно
`export function SettingsPricesTab()` без пропсов и монтируется как `<SettingsPricesTab />`
(SettingsView.tsx:1831), мешок собирается внутри `SettingsView.tsx:1188` из
`{...appLogic, ...settingsStore, ...derivations}` — цепочки из брифа не существует, подтверждаю.

### Решение «снять, а не нарисовать» — обосновано, и обратная сторона закрыта

`SettingsView.tsx:1619` открывает `settingsTab === "prices"`, внутри него на 1677/1705/1750/1807/1824
живые вызовы всех четырёх подписей, и `<SettingsPricesTab />` на 1831 — в той же ветке, ниже них.
Второй показ был бы одним текстом дважды на одном экране. Значения при этом настоящие, не undefined:
в возвращаемом объекте `useAppLogic.tsx` (строки 14360-14370) все шесть имён присутствуют, а
`SettingsView` берёт их из `useAppLogicContext()` (668-671). Вызов не упадёт.

Удалённые импорты типов не осталось кому ломать: `rg -cw` по `DentalMaterialKind`,
`DentalRestorationType`, `PricelistSourceKind`, `DentalPricelistAnalysisResponse`, `StringTokenGroup`
в трёх вкладках после правки — ноль совпадений; по `pricelistParserModeLabels`,
`pricelistItemMaterialText`, `pricelistMaterialSummaryText`, `pricelistWarningsText` в `App.tsx` и
`AppHelpers.tsx` — ноль. Снятые 6 пробросов ничего не могли задеть: `SettingsView` объявлен как
`SettingsView({ activeStaffUser }: SettingsViewProps)`, и я пересчитал сам — в элемент передаётся
**493** пропса.

### Пункты 6 и 7 задания

Подстановки нуля вместо «неизвестно» в правке нет: диффы только удаляют строки и добавляют
комментарии, `?? 0` / `|| 0` не появилось. Пакет мёртвый код СНИМАЛ, а не включал, поэтому свежей
утечки сырых значений на экран он не создаёт. Но поверхность, на которую он ссылается как на
живую, сама льёт сырое — см. FOUND №1.

---

## ЧТО ОСТАЛОСЬ НЕПРОВЕРЕННЫМ

- Общий typecheck и `npm run build` не запускал (запрещено). Отсутствие битых ссылок на снятые
  импорты установлено `rg -cw`, не компилятором. Дырка узкая, но она есть.
- Отрисовка вкладок в браузере не проверялась: доказательство пакета текстовое по своей природе
  (мёртвый пропс не имеет наблюдаемого поведения), а `panelsAreMounted` 10/10 — это монтирование,
  не пиксели.
- FOUND №1 доказан исполнением функции-стока, но не сквозным прогоном через Groq: ключа нет,
  платный вызов запрещён. Ветка модели в этом окружении не исполняется.

---

## FOUND

### 1. Сырой английский машинный токен на экране русской клиники — ровно класс OO2, на той самой поверхности, которой пакет оправдывает снятие пропсов

`apps/web/src/pricelistUiMeta.ts`, последняя строка `pricelistWarningText`:

```ts
return pricelistWarningLabels[normalized] ?? normalized.replace(/[_-]+/g, " ");
```

Не опознанный код предупреждения печатается КАК ЕСТЬ, с заменой подчёркиваний на пробелы.
Доказано исполнением (`node --import tsx`, вызов `pricelistWarningsText` напрямую):

```
["crown_type_guessed"]   ->  "crown type guessed"
["price_range_detected"] ->  "price range detected"
["needs_manual_review"]  ->  "needs manual review"
["confidence_low"]       ->  "confidence low"
["Price ambiguous"]      ->  "Price ambiguous"
```

Достижимость проверена по коду целиком, а не предположена:

- `apps/api/src/pricelist/analyzer.ts:1457` — промпт требует у модели поле `warnings` НА КАЖДУЮ
  позицию;
- `groqSystemPrompt()` перечисляет допустимые значения для `category`, `specialty`, `materialKind`,
  `restorationType`, `crownType` — и НЕ перечисляет для `warnings`. Это тот же дефект, который
  коммит fb9eb4787 этой же волны только что закрыл для `crownType` («промпт не перечислял
  допустимые crownType»), оставленный незакрытым в соседнем поле того же объекта;
- `analyzer.ts:1573-1577` `asWarnings` пропускает ЛЮБУЮ строку: только `trim` и `slice(0, 8)`,
  никакого белого списка;
- `analyzer.ts:1636` — `warnings: Array.from(new Set([...fallback.warnings, ...asWarnings(record.warnings)]))`,
  где `record` — ответ модели;
- схема в `packages/shared` — `warnings: z.array(z.string())`, без enum;
- сток — `SettingsView.tsx:1677` и `:1807`, живая вкладка «Цены».

**И маска, которая должна была это ловить, не ловит ничего.** `technicalPricelistWarningPattern`
(`/\b(groq|openai|…|invalid)\b/i`) стоит ПЕРЕД картой подписей и выглядит как защита от машинных
токенов. Но `_` — символ слова в JS-регулярках, поэтому `\b` не встаёт на границе подчёркивания, и
на snake_case — единственной форме, в которой машинные коды здесь и приезжают — паттерн не
срабатывает НИКОГДА. Доказано исполнением:

```
["groq_timeout_error"]  ->  "groq timeout error"      <- имя поставщика на экране клиники
["groq_schema_invalid"] ->  "groq schema invalid"
["api_key_missing"]     ->  "api key missing"
["http_502_upstream"]   ->  "http 502 upstream"
["json_parse_failed"]   ->  "json parse failed"
["invalid payload"]     ->  "Требуется ручная проверка прайса"   <- срабатывает только через пробел
```

Отдельно: первая строка нарушает продуктовое правило, которое этот же страж прайса охраняет с
другой стороны (`forbiddenUiSnippets` держит `"Groq {typedPricelistAnalysis.aiVision"`, а сам страж
падает, если `aiVision.reason` содержит `Groq`). Клинике показывают «Нейро-проверка», а не имя
поставщика — но через `warnings` имя поставщика проходит.

Свои собственные коды разборщика при этом покрыты все: восемь из `buildWarnings`, плюс
`groq_key_pool_empty`, `groq_skipped_invalid_image_payload`, `image_payload_invalid`, префиксы
`groq_failed:` и `pricelist_rows_skipped:` — перечислил и сверил с картой, дырок нет. Enum-карты
тоже полны: 23 значения `materialKind` и 19 `restorationType` — ни одного отсутствующего в
`dentalMaterialKindLabels` / `dentalRestorationTypeLabels`. Так что вектор ровно один и он именно
нейро-путь. Не вина OO3 — дефект был до него; но пакет опирается на эту поверхность как на «живую и
правильную», и она правильная только пока модель не пришлёт своё слово.

### 2. Страж, которого бриф требовал как доказательство, слеп к дефекту этого пакета — доказано прогоном НАСТОЯЩЕГО стража против дефекта

Я положил в песочницу пред-OO3 версии всех восьми файлов (`git show c8ee7dc6a^:…`), убедился, что
дефект на месте (`rg -c pricelistWarningsText` = **1** и в `SettingsAuditTab.tsx`, и в
`SettingsPricesTab.tsx` — единственная строка деструктуризации), и запустил настоящий
`smoke-pricelist-analyzer.mjs`:

```
cd revOO3root && node .../scripts/smoke-pricelist-analyzer.mjs   -> EXIT 0
```

Зелёный на дефекте. Причина в конструкции: `uiSource` — склейка восьми файлов, среди них
`pricelistUiMeta.ts`, где `pricelistWarningsText`, `pricelistItemMaterialText`,
`pricelistMaterialSummaryText` ОБЪЯВЛЕНЫ. Требование `uiSource.includes("pricelistWarningsText")`
выполняется строкой `export function pricelistWarningsText(...)` и не спрашивает, рисует ли это
хоть кто-нибудь. Утверждение исполнителя (CONTRADICTED №4) не просто правдоподобно — оно проверено
исполнением. Требование брифа «смоук обязан быть 0» доказательством этого пакета не является и не
могло им быть.

### 3. Новый страж обходится ОДНИМ ДВОЕТОЧИЕМ, и обходной формы уже одна штука лежит в обеих вкладках, которые он охраняет

`readTab` кладёт в `destructuredNames` только строки вида `/^[A-Za-z_][A-Za-z0-9_]*$/`, а сигнал
«запись мешка другого вида» намеренно отфильтрован: `unparsedLines.filter((line) => !line.includes(":"))`.
Значит переименованная деструктуризация невидима сразу для обеих половин проверки. Мутация в моей
копии — исходный дефект, записанный через переименование:

```
SettingsAuditTab.tsx: + "    pricelistWarningsText: unusedWarningsText,"
  -> EXIT 0, tests 29, pass 29, fail 0
```

Зелено. Тот же дефект, та же вкладка, то же имя — только с двоеточием.

И это не гипотеза: форма уже присутствует. `apps/web/src/components/settings/SettingsAuditTab.tsx:1221`
и то же место в `SettingsImportsTab.tsx`:

```
    setTelegramAdminSecretDraft: propsSetTelegramAdminSecretDraft,
```

`rg -cw propsSetTelegramAdminSecretDraft` = **1** в каждом файле, то есть цель переименования вынута
из мешка и не читается нигде — ровно третий, незаконный исход, который страж и заводили ловить.
Следствия: храповик 338/251 занижен на единицу в каждой вкладке, и «мешок вычищен полностью» у
`SettingsPricesTab` держится лишь потому, что там переименований пока нет. Починка дешёвая:
разбирать `name: alias` и класть в список ПСЕВДОНИМ (читают именно его), а из фильтра
«другого вида» двоеточие убрать.

### 4. Четыре мёртвых импорта того же семейства остались в файле, который он правил, а тело коммита утверждает обратное

`c8ee7dc6a` заявляет: «Ни одного `rg -c` со значением 1 по цепочке не осталось». Не так —
`apps/web/src/AppHelpers.tsx`, в тех же двух import-блоках, которые он и редактировал:

```
pricelistRecognitionBrandGroups     1
pricelistRecognitionServiceGroups   1
dentalMaterialKindLabels            1
dentalRestorationTypeLabels         1
pricelistSourceKindLabels           3   (живой)
```

Первые два — прайсовые, так что его формулировка в FOUND («снял только прайсовые в своих файлах»)
тоже неточна: снято четыре прайсовых импорта, оставлено два прайсовых и два материаловых, в одном
и том же файле, в одном и том же коммите. Вреда нет — мёртвый импорт инертен, а `AppHelpers.tsx`
живой модуль на 538 экспортов, который тянут двадцать с лишним файлов. Дефект — во фразе, не в
коде. Это и есть главный нит вердикта: ложное «ни одного не осталось» в теле коммита следующий
читатель примет за замер.

### 5. Мёртвый `dist` держит стража прайса красным для ВСЕЙ волны, и обойти это можно без пересборки

Подтверждаю его наблюдение и добавляю рецепт, который сам применил: страж можно прогнать честно, не
собирая чужой файл в полёте — песочница с копией `dist`, копией `analyzer.ts` со сдвинутой mtime и
junction на `node_modules` даёт настоящий скрипт с настоящим кодом выхода. Ведущему это дешевле,
чем отдавать `npm run build -w @dental/api` шести агентам одновременно. Правильная починка всё
равно за ведущим: пересобрать api один раз после волны.

### 6. `noUnusedLocals` выключен, и это единственная причина, по которой весь класс существует

`tsconfig.base.json` не включает `noUnusedLocals`, а `npm run lint` сводится к
`check:encoding && check:dynamic-imports && typecheck`. Ни один гейт не видит ни мёртвого импорта,
ни мёртвой деструктуризации. Он это назвал; добавлю масштаб, который сам замерил: **338 + 251 = 589**
мёртвых имён только в двух вкладках настроек, и **492 из 493** пропсов, передаваемых в
`<SettingsView …>`, выбрасываются молча из-за `[key: string]: any` в `SettingsViewProps`. Пока
индексная подпись стоит, компилятор не поможет даже при включённом `noUnusedLocals` — она гасит
сигнал на границе.

---

## ПОЧЕМУ НЕ SOUND И ПОЧЕМУ НЕ NEEDS_REWORK

Не `SOUND`: тело коммита `c8ee7dc6a` содержит проверяемо ложное утверждение о полноте замера
(FOUND №4), а новый страж имеет обход в одно двоеточие, причём обходная форма уже лежит в обеих
охраняемых вкладках и занижает его же храповик (FOUND №3).

Не `NEEDS_REWORK`: EXIT_BITE предъявлен, и я воспроизвёл его сам — четыре его мутации плюс своя
пятая плюс биту стража настоящим скриптом, все шесть краснеют в ожидаемом месте, ни одна не ломает
компиляцию вместо поведения. Заявленный предмет закрыт: 50 мёртвых имён снято, прайсовых мёртвых
имён во всех трёх вкладках ноль по моему независимому обходу, второй конец цепочки в `App.tsx`
закрыт и охраняется, обратная сторона (потеря поверхности в родителе) охраняется отдельно. Требование
брифа про `smoke:pricelist-analyzer == 0` не выполнено по чужой причине, которую я подтвердил, и сам
этот страж, как я показал прогоном, к дефекту пакета слеп — так что его зелёный ничего бы не добавил.

Не `REVERT`: чужие правки не потеряны, секретов нет, кириллица цела (`check:encoding` не показывает
ни одного файла OO3), скрипт в исходники не писал — все мутации шли в копии вне репозитория,
`git status` по его путям чист.

Ничего долгоживущего я не запускал: ни серверов, ни баз, ни портов. Мои артефакты — вне
репозитория, в `C:\Users\Admin\AppData\Local\Temp\revOO3*`, плюс junction
`revOO3root\node_modules` → `node_modules` репозитория (только чтение, удаляется вместе с папкой).
