## VERDICT: SOUND_WITH_NITS

Ревью пакета PP3 (волна PP). Проверено прогоном по диску, не по докладу. Продукт я не правил,
в репозиторий не писал: все мутации шли по копиям в `C:/tmp-pp3/` (полное дерево `git archive HEAD`
плюс зеркало рабочей копии), после каждой копия восстанавливалась.

Итог одной строкой: **бита настоящая и воспроизведена мной полностью — 22 мутации из 22 краснеют и
называют ИМЕННО своё требование, плюс два храповика реестра, плюс обратная проба на классе REAL.**
Ни одно требование не удалено молча, продукт не тронут ни одним из пяти коммитов, чужая работа в
полёте (26 изменённых файлов + 4 неотслеживаемых скрипта другого автора) не подметена. Три заявления
из четырёх в его `CONTRADICTED` подтверждены; четвёртое я подтвердил и **расширил** — нашёл вторую
жертву класса COMMENT среди стражей, которые ведущий считает ЗЕЛЁНЫМИ.

Ниты, из-за которых не SOUND: один неверный указатель в докладе стража оператору (та самая болезнь,
которую он в этом же пакете лечил у одонтограммы), односторонняя ослабленная пара
«требование/запрет» в финансовом страже, и одна ошибка классификации в отчёте по `payment-capture`.
Ни один из них не отменяет доказанного и не портит продукт.

---

## 1. Прогон всех 19 стражей — истинные коды без конвейера

`node scripts/smoke-<имя>.mjs > /tmp/rev-PP3-<имя>.log 2>&1; echo $?` по каждому (не через `npm run`,
чтобы код был свой, а не обёртки):

| exit | стражи |
|---|---|
| **0** (13) | finance-planning, browser-imaging-scan-progress, browser-migration-scan-progress, document-html-preview, visit-offline-queue, telegram-outbox-sla, telegram-url-ui, telegram-handoff, api-dicom-scan-abort-yield, dicom-workbench-offline, dicom-workbench-ui-cancel, speech-queue, imaging-viewer-usability |
| **1** (6) | segmented-controls-accessibility, payment-capture, dental-persistence-routes, speech-recorder-resilience, speech-final-ready-status, visit-dictation-simplified-actions |

Совпадает с его докладом до строчки: из 19 названных красными было ровно 9, три стали зелёными,
один — честно-красным с классами, пять остались красными.

## 2. Коды ДО — прогон версий стражей из `commit^` по живому дереву

Вытащил `git show <commit>^:scripts/<файл>` в `/tmp/pp3-before/` вместе с `scripts/lib/`
(без lib они падают на `ERR_MODULE_NOT_FOUND`, и это не «красный страж», а моя ошибка изоляции —
первый прогон пришлось выбросить):

| страж | класс | ДО | ПОСЛЕ | моя бита |
|---|---|---|---|---|
| `finance-planning-source` | BRITTLE ×4 | 1 (4 внятных строки) | **0** | **4/4**, контроль 0 |
| `browser-migration-scan-progress-source` | BROKEN + BRITTLE ×2 + STALE ×8 | 1 (**исключение** на маркере 31/34) | **0** | **4/4**, контроль 0 |
| `visit-offline-queue-source` | BROKEN + STALE + BRITTLE ×2 + RESURRECTION | 1 (**исключение** `Missing marker: const [localDraftWasRestored`) | **0** | **6/6**, контроль 0 |
| `segmented-controls-accessibility-source` | COMMENT ×7 + STALE ×11 + BRITTLE ×5 + REAL ×1 | 1 (видимых 11) | 1 (только долг REAL) | **8/8 → exit 2**, +2 храповика → exit 2, контроль 1 |
| `dental-persistence-routes-source` | REAL | 1 | 1 | обратная проба: починка в копии → **0** |
| `payment-capture-source` | не правил (файл в полёте) | 1 | 1 | — |
| `speech-recorder-resilience`, `speech-final-ready-status`, `visit-dictation-simplified-actions` | REAL, прошлая волна | 1 | 1 | не его пакет |

Заявление «падал на маркере №31 из 34» — **пересчитал массив вручную, ровно 34 элемента, и
`const scanCount = Math.min(...)` действительно 31-й.** За ним не исполнялись ни 11 требований к
интерфейсу, ни 5 запретов: оба цикла стоят ниже точки броска.

## 3. Мутации — воспроизвёл сам, продукт не трогая

Мутатор мой (`C:/tmp-pp3/mutate.mjs`, иглы с табами — из файлов, `s.split(from).join(to)` по копии,
восстановление после каждого прогона). Ни одна мутация не ломает разбор — все стражи читают текст,
так что «сломал компиляцию» здесь невозможно в принципе; каждая мутация снимает СВЯЗЬ или
возвращает ДЕФЕКТ.

**finance-planning — 4/4, каждая называет ровно одно своё требование:**
- `activePaymentsCount={(activePayments ?? []).length}` → `={0}` → *FinanceView must pass active payment count*
- `scenarios={activeTreatmentPlanScenarios ?? []}` → `={dashboard?.treatmentPlanScenarios ?? []}` → *must pass patient-specific plan scenarios*
- `className="finance-summary-grid bg-white` → `className="bg-white` → *FinancePlanning must own finance summary markup*
- `(services ?? []).slice(0, 6)` → `(services ?? [])` → *Service catalog strip must stay compact*

**browser-migration — 4/4.** Отдельно проверил его самое сильное утверждение — что запрет
потокового обхода **не исполнялся никогда**. Заменил в копии поток на материализацию всего
`FileList`:
`for (let fileIndex = 0; …) { … fileList.item(fileIndex)` → `const files = Array.from(fileList); for (const file of files.slice(0, browserMigrationScanFileLimit)) {`
- НОВЫЙ страж: `EXIT=1`, называет оба запрета — `Array.from(fileList)` и `files.slice(0, browserMigrationScanFileLimit)`.
- СТАРЫЙ (`HEAD~`): `EXIT=1`, и в докладе **та же самая жалоба на перенос строки в `scanCount`** — про
  материализацию всего списка файлов ни слова. Запрет действительно был мёртвым.

**visit-offline-queue — 6/6.** Ключевая — храповик RESURRECTION:
`await deletePendingVisitSaveFromIndexedDb(item.id).catch(() => {});` → `await savePendingVisitSaves(remaining, activeOrganizationId);`
краснеет **сразу двумя** сообщениями: пропало безопасное поведение И вернулся дефект.
Тот же прогон старым стражем (`HEAD~2`) — `Error: Missing marker: const [localDraftWasRestored`,
о возврате потери данных ни слова. Класс подтверждён по продукту: `savePendingVisitSaves(remaining`
не встречается в `apps/web/src` нигде, а `useVisitLogic.ts:613-626` несёт комментарий, описывающий
и старое поведение, и саму потерю записи при живом сообщении «сохранено локально».

**segmented-controls — 8/8, каждая `EXIT=2` и ровно один сломанный лок:**
РВГ-сенсор, микроскоп, рабочие дни, режим клиники, фильтр снимков `all`, фильтр снимков `kind`,
источник прайса, тумблер ИИ прайса. Плюс оба храповика:
- долг **закрыт** (дописал `aria-pressed` в `SettingsAiTab`) → `EXIT=2`, «ДОЛГ ЗАКРЫТ … иначе реестр начнёт врать»;
- ключ реестра **разошёлся** с текстом требования → `EXIT=2`, «РЕЕСТР РАЗОШЁЛСЯ С ПРОВЕРКАМИ».

Это самый крепкий идиом объявленного долга в кампании: падает и когда долг закрыт, и когда реестр
перестал соответствовать утверждениям.

**dental-persistence (REAL) — обратная проба.** В копии заменил
`wsBroker.broadcastToOrganization(organizationId, {` на `wsBroker.broadcastToPatient(organizationId, patientId, {`
→ `EXIT=0`. Значит страж красный ровно и только из-за отсутствия поведения в продукте.

## 4. Класс COMMENT — пересчитал СВОИМ инструментом

Не поверил его цифре и написал свою вырезку комментариев (`C:/tmp-pp3/comment-probe.mjs`, своя
реализация, не его `codeOnly`). Прогон СТАРОГО стража по 8 файлам разметки, каждый по очереди:

```
apps/web/src/SettingsView.tsx: длина сохранена, перевернулось=7, ложно позеленело=0
apps/web/src/App.tsx / ImagingView / VisitView / SettingsClinicTab /
SettingsPricesTab / SettingsAiTab / SettingsImportsTab: перевернулось=0, ложно позеленело=0
```

**Ровно 7, все в `SettingsView.tsx`, ложных переворотов 0, длина текста сохранена.** Перевернувшиеся:
режим клиники, роль сотрудника, специальность сотрудника, рабочие дни расписания, три переключателя
оснащения кресла — совпадает с его перечислением дословно.

И подделка воспроизведена **живьём**, а не выведена: снял `aria-pressed={newChairHasXraySensor}` с
ЖИВОГО переключателя в `SettingsClinicTab.tsx` —
- НОВЫЙ страж: `EXIT=2`, `! Settings chair RVG toggle must expose selected state.`
- СТАРЫЙ страж: `EXIT=1`, **требование РВГ не назвал вообще** — считал выполненным по
  закомментированной строке в другом файле.

Это шестая форма «зелёного теста, который ничего не проверяет» из списка кампании, поймана на живом
дефекте доступности.

## 5. Коммиты

`git show --stat` по всем пяти. Все `[ARCHON]`, `%(trailers)` пуст у всех пяти, автор `marko1olo`,
в телах ноль вхождений `claude|anthropic|co-authored|generated with`, mojibake-маркеров в правленых
скриптах 0.

Пути — ровно заявленные, по два файла на коммит (`.agents/archon/packets/PP3/commitmsg-*.txt` +
один `scripts/smoke-*.mjs`). **Ни один коммит не содержит ни одного файла из `apps/` или
`packages/`.** Чужая работа в полёте на месте: 26 изменённых продуктовых файлов
(`PaymentCapture.tsx`, `useAppLogic.tsx`, `SettingsClinicTab.tsx`, `schema.ts`, `visits.ts`, …) и
4 неотслеживаемых скрипта другого автора (`scripts/check-declared-guards.mjs`,
`scripts/lib/shot-audit.mjs`, `scripts/tests/check-declared-guards.test.mjs`,
`scripts/tests/zz-bypass-probe.test.mjs`) — не тронуты. Остатков мутационных копий (`__bite*`,
`_*tmp*`) в дереве нет.

## 6. Его CONTRADICTED — проверка

1. **Три из девяти чинить было нечего.** Верно. Все три стража речи перестроены коммитом
   `6f157084c` («три стража речи прятали снесённый слой за одной строкой и вырожденными
   утверждениями»), у каждого реестр объявленного отсутствия, раздел «НЕОЦЕНИМО» для вырожденных
   утверждений и разведённые коды выхода. Красные ПО ЗАМЫСЛУ.
2. **«32 зелёных / 9 красных» не измеряет покрытие.** Верно, и **хуже, чем он написал** — см. FOUND-4.
3. **Вторая площадка класса COMMENT.** Верно. Более того, `SettingsView.tsx` держит не один такой
   блок: крупные хвостовые комментарии на 1264-1287, 1384-1414, 1935-2007 (его находка) и
   **2010-2018** — последний вообще замыкает файл.
4. **`payment-capture` красен одинаково по рабочей копии и по HEAD.** Проверил: развернул чистый
   `git archive HEAD` в `C:/tmp-pp3/head`, прогнал — `EXIT=1`, и `diff` двух докладов пуст
   (`ОДИНАКОВО`). Те же 8 требований. Грязь файла действительно не причина.
   Его классификацию проверил по HEAD и подтверждаю в главном: `rubAmountInput.ts` осознанно перешёл
   на копейки, а требования `!/^\d+$/.test(compactAmount)` и `Number.isSafeInteger(amountRub)`
   вернули бы запрет копеек, которые продукт обещает врачу текстом
   «сумма указывается цифрами, копейки после запятой: 1500,50» — чистый RESURRECTION.
   `value.replace(/[\s ]/g, "")` против продуктового `value.replace(/[\s ]/g, "")`: проверил
   байты — `od -c` даёт `302 240`, то есть в продукте литеральный NBSP, поведение то же. BRITTLE.
   Четыре требования по HEAD не находятся нигде (проверил каждое `rg -lF` по `apps/web/src` — пусто).
   **Восьмое классифицировано неверно — см. FOUND-2.**

## 7. Что осталось / чего я НЕ проверял

- `payment-capture-source` остаётся красным: 8 требований, разобраны но не починены. Бриф это прямо
  разрешал («скажи это и оставь на потом»), и он сделал больше требуемого — измерил по HEAD и
  назвал класс каждому. Это не триггер переделки, но слой **не добит**: 6 красных из 19, из них
  5 законно (REAL) и 1 отложен.
- Общие гейты (`typecheck`, `build`, весь `npm test`) не запускал — они ведущего.
- Долг класса REAL по одонтограмме и пресетам распознавания — правка в продукте, не в этом пакете.
- Пункт 7 задания (мёртвый код / снятые `as any` / сырые значения на экран) к этому пакету не
  применим: пакет не включал мёртвого кода и не трогал типов, продукт не изменён ни на байт.
- Ничего долгоживущего не запускал: все прогоны синхронные и завершились, портов не занимал,
  дерева `C:/tmp-pp3/{mirror,full,head}` и `/tmp/pp3-before/` — мои временные, к удалению.

---

## FOUND

### FOUND-1. Он повторил ровно тот дефект, который в этом же пакете лечил: указатель в реестре долга врёт на 38 строк

`scripts/smoke-segmented-controls-accessibility-source.mjs`, текст записи реестра
`KNOWN_MISSING_SEGMENTED_SURFACES` (он же печатается оператору при КАЖДОМ красном прогоне, он же
стоит в шапке стража, он же ушёл в его доклад):

> `REAL — components/settings/SettingsAiTab.tsx:266 держит выбранный пресет ТОЛЬКО классом оформления…`

Строка **304**, не 266. Проверил все 19 координат, названных в правленых стражах — **18 сходятся
точно** (`SettingsView.tsx:1935/2007/1586/1831/1835/1894`, `SettingsClinicTab.tsx:424`,
`SettingsPricesTab.tsx:475/549`, `ImagingView.tsx:618/627`, `visitStore.ts:169`,
`AppHelpers.tsx:5361`, `useVisitLogic.ts:484/1203`, `useAppLogic.tsx:9044/9166/9455`), не сходится
одна — и это самая важная, единственная обращённая к оператору. На строке 266 лежит
`href={provider.sourceUrl}` из карточки провайдера, к пресетам распознавания отношения не имеющая.

Не «уехало со временем»: `git show 9b654d3ea:apps/web/src/components/settings/SettingsAiTab.tsx`
даёт 304 **на момент его собственного коммита**, и после него файл никто не трогал
(`git log 9b654d3ea..HEAD -- …SettingsAiTab.tsx` пуст).

Цена: в коммите `438510451` он сам зафиксировал этот класс дефекта («страж, отправляющий читателя
не на ту строку, обесценивает верный диагноз») и решил его правильно — вычислением номера строки на
месте прогона:
```js
const broadcastLine = odontogramRoutes
	.slice(0, odontogramRoutes.indexOf("wsBroker.broadcastToOrganization"))
	.split("\n").length;
```
В сегментном страже он этого не сделал и захардкодил неверное число. Лечится тем же приёмом.

### FOUND-2. Восьмое требование `payment-capture` классифицировано неверно: токен ЕСТЬ, класс BRITTLE, а не «нет нигде»

Его доклад: *«Восьмое: `className="payment-capture"` — в HEAD есть только `payment-capture-detail-section` / `-detail-grid`, голого токена нет.»*

По чистому HEAD (`C:/tmp-pp3/head`):
```
rg -o 'className="payment-capture[^"]*"' apps/web/src/PaymentCapture.tsx
className="payment-capture bg-white dark:bg-slate-900 border border-slate-200 … rounded-xl p-4"
className="payment-capture-detail-grid"
className="payment-capture-detail-section"
className="payment-capture-feedback"
className="payment-capture-missing"
className="payment-capture-safeguard"
```
Токен `payment-capture` **стоит на элементе**, к нему просто приписаны классы оформления. Это
дословно тот же случай, что `finance-summary-grid` в его же пакете, и лечится его же
`classNameToken()`. Требование «PaymentCapture must own payment form markup» **выполнено**, страж
краснеет за форму записи.

Почему это не придирка: он сказал ведущему, что разметки нет. Следующий исполнитель по такому
докладу пойдёт писать разметку, которая уже есть, — и либо продублирует её, либо потратит проход
впустую. Из 8 требований `payment-capture` в реальности: 3 RESURRECTION, 1 BRITTLE (NBSP),
**1 BRITTLE (этот)**, 3 REAL.

### FOUND-3. Он ослабил требование и НЕ ослабил его близнеца-запрет — запрет теперь спит ровно на том написании, которым пользуется продукт

`scripts/smoke-finance-planning-source.mjs`. Требование он перевёл на образец (строка 162):
```js
requirePattern(financeSource, classNameToken("finance-summary-grid"), "FinancePlanning must own finance summary markup");
```
`classNameToken` принимает токен в списке классов — правильно. Но парный ЗАПРЕТ (строка 136) остался
дословным:
```js
forbidIn(appSource, 'className="finance-summary-grid"', "App.tsx must not inline finance summary cards");
```
До его правки обе стороны были дословными и говорили на одном языке. Теперь — нет. Проверил
мутацией по копии `App.tsx`:

| вклеено в `App.tsx` | EXIT |
|---|---|
| `className="finance-summary-grid"` (дословно) | **1** — запрет сработал |
| `className="finance-summary-grid bg-white dark:bg-slate-900 rounded-xl"` | **0** — ЗАПРЕТ ПРОСПАЛ |

Второе — это ровно то написание, которым сводка размечена в `FinancePlanning.tsx` сегодня. То есть
разбор монолита можно откатить копипастом живой строки, и страж финансового планирования останется
зелёным. Дыра ровно в один токен: `plan-scenario-grid` и `service-catalog-strip` дословны с обеих
сторон и потому пока согласованы. Лечится заменой `forbidIn` на `classNameToken` в App.tsx.

### FOUND-4. Не его пакет, крупнее его находки: `smoke:web-render-gating-source` ЗЕЛЁН исключительно из-за девятистрочного комментария в конце `SettingsView.tsx` — и ведущий считает его одним из 32 зелёных

Он нашёл класс COMMENT в своём страже и остановился. Я прогнал его же приём по ВСЕМ 16 стражам,
читающим `SettingsView.tsx` (все 16 — чистые читатели текста, процессов не запускают; проверил
`rg 'cdp\.mjs|resolveViteBin|findFreePort|spawn|execFile|createServer'`), на полном дереве
`git archive HEAD`. Заражён ещё **ровно один** — и это тот, что сейчас зелёный:

```
smoke-web-render-gating-source.mjs: сырой=0  безКомментариев=1   <<< ЗЕЛЁНЫЙ ПО КОММЕНТАРИЮ
      "missingSettingsTabs": ["{settingsTab === \"clinic\" ? (",
                              "{settingsTab === \"access\" ? (",
                              "{settingsTab === \"telegram\" ? ("]
```

Сузил до точной причины — удалил **только** хвостовой блок `SettingsView.tsx:2010-2018` и ничего
больше: `EXIT` 0 → **1**, те же три требования. Вот весь блок, он замыкает файл:
```
2010  /*
2011  {settingsTab === "clinic" ? (
2012            <section className="clinic-config"
2013  {settingsTab === "access" ? (
2014            <section className="access-settings"
2015  {settingsTab === "telegram" ? (
2016            <section className="telegram-settings"
2017  */
```
Девять строк, ноль исполняемого кода, и ровно три иглы, которых стражу не хватает. Про умысел
ничего не утверждаю — утверждаю следствие.

Что за этим на самом деле (класс STALE, поведение в продукте ЕСТЬ и оно правильное):
- `SettingsView.tsx:1586` — `{settingsTab === "clinic" ? <SettingsClinicTab … /> : null}`
- `SettingsView.tsx:1587` — `{settingsTab === "access" ? <SettingsAccessTab … /> : null}`
- `SettingsView.tsx:1601` — `{settingsTab === "telegram" && activeStaffUser?.role !== "doctor" ? (`

Условность ветки — суть стража — соблюдена всеми тремя. Игла не совпадает потому, что clinic и
access переехали в компоненты, а у telegram появилась проверка роли.

Отдельно: **шапка стража теперь врёт**. `smoke-web-render-gating-source.mjs:93-96` утверждает
«Три вкладки (clinic, access, telegram) по-прежнему лежат разметкой в самом SettingsView, остальные
смонтированы компонентами». По HEAD это неверно для clinic и access — они смонтированы
компонентами на 1586/1587. Обоснование стража описывает мир, которого больше нет, а зелёным его
держит закомментированная копия того самого мира.

Практическое следствие, и оно близко: удалить мёртвый хвостовой комментарий — очевидная и желанная
уборка. В день, когда её сделают, `smoke:web-render-gating-source` покраснеет на трёх вкладках и
сообщением отправит человека восстанавливать условный рендер, который никуда не девался. Тогда же
покраснеют и 7 требований сегментного стража — если бы этот пакет их не перевёл на живые файлы.

Правка (не моя, я не правлю): `requiredSettingsTabGates` перевести на образцы вида
`settingsTab === "clinic"` + условная ветка, набор файлов расширить живыми вкладками, и **вырезать
комментарии перед сравнением** — механизм уже написан и отлажен в
`scripts/smoke-segmented-controls-accessibility-source.mjs` (`codeOnly`), переиспользовать его, а не
писать второй.
