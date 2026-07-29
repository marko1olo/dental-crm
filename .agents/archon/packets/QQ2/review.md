## VERDICT: SOUND_WITH_NITS

Пакет QQ2 (`f84685afbcd48aa6245f695eb2d54804fa87db59`). Заявленная задача решена: живая дверь в
`useAppLogic.tsx` закрыта, обе стороны доказаны отрисовкой, мутацию я повторил сам — она бьёт в
поведение, не в сборку. Путь (а) выбран и обоснован письменно, `packages/shared` не тронут ни одним
байтом. Ни один из найденных дефектов не является живым вредом деньгам: это off-by-one в постоянном
тексте, ложное обоснование единственного оставшегося на экране остатка и две дырки в покрытии.

---

## 1. Что проверено командой, дословно, с кодами выхода

### 1.1 EXIT_PASS, COUNT — сошлось поштучно

```
cd apps/web && node --import tsx --import ./testCssStub.mjs --test "src/tests/financeSummary*.test.tsx"
EXIT=0
ℹ tests 9   ℹ suites 2   ℹ pass 9   ℹ fail 0   ℹ cancelled 0   ℹ skipped 0   ℹ todo 0
```

Заявлено `9/9/0/0/0, 2 suites` — совпало ровно. Маска, не список, поэтому дыры «несуществующий путь
даёт код 0» (пункт 3 брифа ревью) тут нет по построению; маска раскрывается в один существующий файл:

```
ls src/tests/financeSummary*.test.tsx  ->  src/tests/financeSummaryUnknownIsNotZero.test.tsx
```

Соседний прогон вместе со стражем денег тоже сошёлся:

```
node --import tsx --import ./testCssStub.mjs --test "src/tests/money*.test.ts" "src/tests/financeSummary*.test.tsx"
EXIT=0   ℹ tests 32   ℹ suites 6   ℹ pass 32   ℹ fail 0   ℹ skipped 0
```

Все четыре пути маски существуют: `financeSummaryUnknownIsNotZero.test.tsx`,
`moneyFieldsStartEmpty.test.ts`, `moneyFormat.test.ts`, `moneyUnknownNotZero.test.ts`.

### 1.2 МУТАЦИЯ ПОВТОРЕНА МНОЙ. Ломает поведение, не компиляцию

Мутация «А» — сторона отрисовки. `apps/web/src/FinancePlanning.tsx` был чист в git
(`git diff --quiet` → чисто), sha256 `4cb22f150de49f69…` снят до правки. Программно вернул `?? 0`
внутрь `money()` во всех четырёх плитках и `?? 0` счётчикам:

```
git diff --stat -- apps/web/src/FinancePlanning.tsx   ->  6 insertions(+), 6 deletions(-)
cd apps/web && node --import tsx --import ./testCssStub.mjs --test "src/tests/financeSummary*.test.tsx"
EXIT=1
ℹ tests 9   ℹ pass 7   ℹ fail 2
✖ сводки нет — ни одна из четырёх плиток не печатает «0 ₽»        actual: '0 ₽',  expected: 'не определено'
✖ сводки нет — счётчики позиций и документов тоже не врут нулём   actual: '0 открытых позиций', expected: 'не определено'
✔ НАСТОЯЩИЙ ноль остаётся «0 ₽» и не прячется
✔ посчитанные суммы доезжают до своих плиток
```

Это и есть главное: тест **различает два утверждения**, а не запрещает символ «0 ₽». Красной стала
только сторона «сводки нет»; сторона настоящих нулей и сторона живых сумм (900/200/700/900) остались
зелёными. `?? 0` типу `(value: number | null) => string` не противоречит, а `tsx` типов не проверяет
вовсе — значит мутация прошла через сборку и упала на поведении. Восстановление проверено хешем:
после `cp` обратно sha256 снова `4cb22f150de49f69…`, `git diff --quiet` чисто.

Расхождение с его цифрой объяснимо и не является противоречием: он заявил 4 fail, потому что кусал
ОБЕ двери одновременно (отрисовку и источник). Моя мутация «А» бьёт только отрисовку → 2 fail;
дверь в источнике даёт ещё 2 (см. ниже). 2 + 2 = 4.

Мутация «Б» — дверь в источнике. `useAppLogic.tsx` в дереве живой, поэтому я его НЕ трогал, а
прогнал предикат теста дословно против настоящего до-правочного блоба:

```
git show f84685afb^:apps/web/src/useAppLogic.tsx  (476 264 байта)
PRE-FIX (f84685afb^) | doorReportsUnknown = false | typeAllowsNull = false
WORKING COPY         | doorReportsUnknown = true  | typeAllowsNull = true
```

То есть проверка двери отвергает **настоящий исторический текст**, а не только рукодельный
образец из теста №9. Это закрывает подозрение «помощник теста повторяет последовательность боевой
ветки» — здесь помощник вызывается, и вызывается на реальном блобе.

### 1.3 Числа из сообщения коммита — пересчитаны командой

| Заявлено | Измерено | Итог |
|---|---|---|
| 5 файлов, +481/−76 | `git show --stat` → `5 files, 481 insertions(+), 76 deletions(-)` | верно |
| `%(trailers)` пуст | `git log -1 --format='%(trailers)' \| cat -A` → одна пустая строка | верно |
| атрибуции нет | `co-authored\|anthropic\|claude\|generated with` → 0 | верно |
| автор | `marko1olo <marko1olo@users.noreply.github.com>`, committer тот же | верно |
| «объект из **восьми** нулей» (useAppLogic) | **девять** полей: `grep -c ': 0,'` по блоку `f84685afb^` → **9** | **НЕВЕРНО, см. FOUND-3** |
| «восемь нулей по умолчанию» (`EMPTY_BILLING_SUMMARY`) | 8 полей в удалённом литерале | верно |
| «God-хук на 14 700 строк» | `wc -l` → 14 774 | округление, приемлемо |
| `billingSummarySchema` … `:2056`, поля `nonNegativeMoneyRubSchema` | строка 2056, 6 денежных полей `nonNegativeMoneyRubSchema`, 2 целых счётчика, `insuranceCoverageRub.optional()` | верно |
| «MoneyFormatter объявлен `(value: number \| null) => string`» | `FinancePlanning.tsx:8` — дословно так | верно, но см. FOUND-6 |
| «4 обращения, единственный конечный — App.tsx» | `rg` без тестов: `useAppLogic:5070` (объявление), `useAppLogic:14327` (возврат хука), `App.tsx:1464` (разбор), `App.tsx:4299` (пропс). Единственный `<FinanceView` в дереве — `App.tsx:4284` | верно |
| «8 непрошедших требований» в payment-capture | вывод стража — ровно 8 строк | верно |
| «ни одно из 8 не читает FinanceView.tsx» | `smoke-payment-capture-source.mjs` действительно читает `financeViewSource` (строка 7), но все семь FinanceView-требований (182/187/…/212) ПРОХОДЯТ; восьмое — «PaymentCapture must own payment form markup» — читает `paymentCaptureSource` (строка 223) | верно |
| «`className="payment-capture"` отсутствует и на HEAD» | `git show f84685afb^:…/PaymentCapture.tsx \| rg -c` → 0 | верно |
| «`rubAmountInput.ts` на HEAD содержит `value.replace(/[\s ]/g, "")`» | на `f84685afb^` строка 21 — дословно так | верно |
| «в файле 9 ханков (+89/−40); мой +23/−13, чужой +66/−27» | `numstat` → `89 40`; `git show -U0 \| grep -c '^@@'` → **9** (при -U3 их 3 — он считал по -U0, что и даёт девять) | верно |
| «третий такой случай в этом файле, два предыдущих описаны там же» | `requireIn` поддерживал RegExp ДО него (шапка на строке 17 ссылается на идиому ведущего, коммит `bc0c1e7db`); других образцов-регексов в файле ровно два: строки 191 и 251 | верно |
| «`check-encoding` = 1, 5 проблем, все чужие» | сейчас `EXIT=1`, **4** проблемы: `HH1`, `HH4`, `JJ4`, `JJ5` — все `review.md` чужих пакетов | число уплыло (каталог живой), ни один его файл не помечен |

### 1.4 Типы и стражи — прогнал сам

```
npx tsc -p apps/web/tsconfig.json --noEmit   EXIT=0
grep -c "error TS"  ->  0        (лог пуст, 0 байт)
npx tsc … --listFilesOnly | wc -l  ->  2132   (компилятор реально прошёл дерево, не пустой ход)
```

Срез **зелёный целиком**. Его CONTRADICTED-3 (три ошибки 4487/4490/4565 из чужой правки
`visitSchema.nullable()`) на момент ревью уже неактуален — тот автор их закрыл. Заявка была честной:
он их не приписал себе и не правил чужое.

```
node scripts/smoke-finance-view-source.mjs       EXIT=0   { ok: true, … }
npm run smoke:finance-planning-source            EXIT=0
npm run smoke:finance-ledger-source              EXIT=0
npm run smoke:clinical-rule-panel-source         EXIT=0
npm run smoke:payment-capture-source             EXIT=1   (8 требований, разбор в таблице выше)
```

### 1.5 Дерево, чужая работа, остатки

```
git status --porcelain -- apps/web/src scripts packages/shared   (после всех моих откатов)
 M apps/web/src/PaymentCapture.tsx  ScannerView.tsx  workspaceShell.tsx  …/settings/sources/*  …
 M packages/shared/dist/index.d.ts  index.js
?? scripts/lib/shot-audit.mjs
```

Ни одного `__bite*`, `_*tmp*` или `.bak` по его путям — `git status --porcelain | rg -i '__bite|_tmp|\.bak'`
даёт только доисторический чужой мусор в `scratch/` и `*Probe.ts`, к QQ2 отношения не имеющий.
Мой собственный зонд отрисовки (`apps/web/rev-qq2-probe.tsx`) удалён в том же вызове, обе мутации
восстановлены побайтово (sha256 совпал: `4cb22f15…`, `ee77c1a1…`), `git diff --quiet` по всем четырём
его продуктовым путям — чисто.

**Чужая работа подметена — но не потеряна, и посчитана верно.** Коммит унёс восемь чужих ханков
`roundToKopecks` в `useAppLogic.tsx`. Это подтверждается независимо, чужой рукой: ревьюер пакета OO5
записал у себя ещё ДО QQ2 — «единственный оставшийся грязный файл … `apps/web/src/useAppLogic.tsx`
(66+/27−), и это чужой пакет про округление денег до копейки (`roundToKopecks`)»
(`.agents/archon/packets/OO5/review.md:129-131`). Цифра `+66/−27` совпала с его FOUND дословно. То
есть чужая правка лежала в рабочей копии как минимум с OO5, `git` коммитит файлы, а не ханки, и
раскрытие в FOUND — верное решение. Утраты нет, повода для REVERT нет.

### 1.6 Задача — заявленная, не соседняя подешевле

Брифом требовалась ЖИВАЯ дверь `useAppLogic.tsx:5030`. Закрыта именно она: `useAppLogic.tsx:5070`
теперь `useMemo<Dashboard["billingSummary"] | null>` с `if (!dashboard || !documentPatient) return null;`.
Недостижимая дверь `EMPTY_BILLING_SUMMARY` снята **без приписывания ей вреда** — и в коммите, и в
комментарии прямо сказано «вреда за ней не числится, снята как заготовленная ловушка», как и требовал
бриф. Путь (б) не выбран, и отказ обоснован верно: неизвестна вся сводка целиком, поэтому признак
корректно живёт на объекте. `git show --stat` подтверждает — `packages/shared` в коммите нет.

Проверил и то, чего он не заявлял: единственный второй потребитель сводки в дереве,
`ShiftView.tsx:760` — `money(dashboard?.billingSummary?.totalPaidRub)`, — печатает «не определено» сам
по себе, потому что настоящая `money()` (`AppHelpers.tsx:2630`) принимает `undefined`. Второй утечки
нуля там нет. `insuranceCoverageRub` нигде на экран не выводится.

---

## FOUND

### FOUND-1. «0 платежей по текущему пациенту» рядом с «не определено» — и обоснование этому измеримо ложное

Его FOUND оставляет `activePaymentsCount` нетронутым с доводом: «это **отдельный пропс со своей
правдой** (`activePayments`), а не поле сводки; гасить его по чужому признаку — значит прятать
настоящий счётчик».

Замер: признак не чужой. Это тот же признак.

```
apps/web/src/useAppLogic.tsx:5042-5047
	const activePayments = useMemo(() => {
		if (!dashboard || !documentPatient) return [];
		...
	}, [dashboard, documentPatient?.id]);
```

Условие `!dashboard || !documentPatient` — **дословно то же**, что в двери, которую он только что
починил 23 строками ниже, в том же файле, в соседнем мемо. Значит когда сводка `null`, список
платежей пуст **по той же причине**, то есть тоже «неизвестно», а не «ноль». «Своей правды» у этого
счётчика в этом состоянии нет.

Что видно на экране — измерено отрисовкой, не рассуждением
(`renderToStaticMarkup(FinancePlanningOverview, { billingSummary: null, activePaymentsCount: 0 })`):

```
<article><span>План лечения</span><strong>не определено</strong><p>не определено</p></article>
<article><span>Оплачено</span><strong>не определено</strong><p>0 платежей по текущему пациенту</p></article>
<article class=""><span>Остаток</span><strong>не определено</strong><p>не определено</p></article>
<article><span>Вычет</span><strong>не определено</strong><p>медицинские услуги, пригодные для справки</p></article>
--- includes '0 платежей': true
--- includes '0 ₽': false
```

Плитка «Оплачено» печатает «не определено» и «0 платежей» одновременно — ровно тот дефект «два
противоположных утверждения в одной плитке», которым он САМ обосновал починку двух других счётчиков
(комментарий `FinancePlanning.tsx`: «„0 открытых позиций“ под суммой „не определено“ — это два
противоположных утверждения в одной плитке»). Довод применён к двум счётчикам из трёх.

Его собственный тест это не ловит: проверка №2 ищет только `"0 открыт"` и `"0 документов"`, а
проверка №1 ищет `"0 ₽"` — в строке «0 платежей» рубля нет. Ноль остался, и охраны над ним нет.

Ущерб: не деньги, а счётчик, и главное утверждение про суммы теперь честное. Поэтому это нит, а не
rework. Но **обоснование в FOUND неверно фактически**, и ведущему не следует принимать «отдельная
правда» на слово: чтобы у счётчика появилась своя правда, гасить надо не по `billingSummary`, а по
тому же `!dashboard || !documentPatient`, из которого он и растёт.

### FOUND-2. Коммит QQ2 УЖЕ на `origin/main`. Не он его отправил — но он опубликован, и REVERT больше не локальная опция

Он написал «Не пушил», и это правда — доказуемо. Но пакет опубликован.

```
git merge-base --is-ancestor f84685afb origin/main   ->  IS ancestor
git reflog show origin/main --date=iso
  f7f4e1453  @{2026-07-29 14:18:07 +0400}: update by push
  0370ed76e  @{2026-07-29 14:07:20 +0400}: update by push
git log -1 --format='%h %ci %s' f84685afb  ->  f84685afb  2026-07-29 14:16:43
git log -1 --format='%h %ci %s' f7f4e1453  ->  f7f4e1453  2026-07-29 14:17:34  fix(перенос): …
```

`f84685afb` **ни разу не появляется как вершина push** — значит QQ2 действительно не пушил. Но
`origin/main` прыгнул с `0370ed76e` сразу на `f7f4e1453` одним push'ем через 84 секунды после его
коммита, и этот push унёс наружу всё, что лежало между: `5d4c5ac24`, `954111dcc`, `b510f99ae`,
`f84685afb` — четыре чужих пакета, включая QQ2.

Это дефект метода, а не пакета: правило «НЕ ПУШИТЬ» не может исполняться по одному пакету, пока
любой следующий агент пушит свою вершину — он публикует всех непушенных предшественников. Ведущему
это важно знать до того, как он решит, что с QQ2 делать: тихий откат уже невозможен ни для QQ2, ни
для трёх пакетов перед ним.

### FOUND-3. «Восемь нулей» — их девять. Ошибка ушла в ПОСТОЯННЫЙ текст дважды

```
git show f84685afb^:apps/web/src/useAppLogic.tsx | sed -n '/const patientBillingSummary = useMemo/,/^\t\t\t};/p' | grep -c ": 0,"
9
```

Девятое поле — `insuranceCoverageRub: 0` (в схеме оно `.optional()`, но в возвращаемом объекте
стояло и нулём было).

Сказано «восемь»:
* в сообщении коммита — «объект из восьми НАСТОЯЩИХ нулей»;
* в **новом комментарии в исходнике**, `apps/web/src/useAppLogic.tsx` (шапка мемо
  `patientBillingSummary`) — «возвращалась сводка, у которой все восемь полей равны нулю».

Класс тот же, что ведущий назвал в брифе («ноль вместо тридцати в тексте коммита») и что ревьюер QQ3
уже зафиксировал в этой же волне. Оговорка: у `EMPTY_BILLING_SUMMARY` в `FinanceView.tsx` полей
действительно **восемь**, так что там число верное — перепутаны два разных объекта.

Заодно неточность рядом: «Прежний список полей вдобавок лгал о форме данных: в нём стояло
`outstandingPaidRub`». Список, который он ФАКТИЧЕСКИ удалил, содержит восемь корректных полей и
никакого `outstandingPaidRub` — это поле упоминалось только в тексте старого комментария, который он
удалил вместе с ним. По диффу проверено.

### FOUND-4. Снятую ловушку `EMPTY_BILLING_SUMMARY` можно вернуть, и ничего не покраснеет

Замерено мутацией: в `apps/web/src/FinanceView.tsx` умолчание `billingSummary = null` заменено обратно
на встроенный объект из восьми нулей.

```
cd apps/web && node --import tsx --import ./testCssStub.mjs --test "src/tests/financeSummary*.test.tsx"
EXIT=0   ℹ tests 9   ℹ pass 9   ℹ fail 0
node scripts/smoke-finance-view-source.mjs   EXIT=0   { ok: true, … }
```

Оба зелёные. Причина: новый тест никогда не поднимает `FinanceView` — он рендерит
`FinancePlanningOverview` напрямую и всегда передаёт пропс явно. А в
`smoke-finance-view-source.mjs` нет ни одного `forbidIn` на нулевое умолчание.

То есть ловушка снята, но собачки на её место не поставлено: следующий автор, добавляя `Partial`-
умолчание «чтобы не падало», вернёт ровно этот дефект на единственном месте, где он ещё мог бы
появиться, и конвейер промолчит. Живого вреда сегодня нет (ведущий проверил поштучно: `App.tsx`
пропс передаёт всегда, я это подтвердил — `<FinanceView` в дереве один, `App.tsx:4284`), поэтому нит.
Дешёвое закрытие: `forbidIn(financeViewSource, "billingSummary = {", …)`.

Восстановлено побайтово: sha256 `ee77c1a193416937…` до и после, `git diff --quiet` чисто.

### FOUND-5. Правка `remainingDebt` меняет видимое поведение и НЕ покрыта ничем

`FinanceView.tsx:268` `const remainingDebtProp = billingSummary ? { remainingDebt: … } : {};` — при
неизвестной сводке пропс отсутствует. В `PaymentCapture.tsx:643-671` под условием
`remainingDebt !== undefined` висит **весь ряд быстрых сумм**, а не только кнопка долга:

```
{remainingDebt !== undefined && (
  <div className="quick-chips-row" …>
    {remainingDebt > 0 && ( … Долг: {money(Math.round(remainingDebt))} … )}
    {[1000, 2000, 3000, 5000].map(…)}
```

Значит при неизвестной сводке с экрана уходят и 1000/2000/3000/5000. Ни один тест не поднимает
`FinanceView`, а `remainingDebt` не закреплён ни одним требованием стража
(`rg -n 'remainingDebt' scripts/*.mjs` → 0). Изменение видимого поведения без замера.

Само обоснование, однако, проверку выдерживает, и это я подтверждаю замером по цепочке:
`activePatient`/`selectedPatient` выводятся из `dashboard` (`hooks/domains/usePatientLogic.ts:140-167`),
поэтому `!dashboard ⇒ !documentPatient`, и `billingSummary === null ⟺ !documentPatient`; а
`paymentPatientContextReady = Boolean(documentPatient && !openVisitBelongsToSomeoneElse)`
(`usePatientLogic.ts:198`). То есть всякий раз, когда чипы исчезают, приём оплаты уже заперт и на
экране стоит «Выберите пациента, за которого принимаете оплату». Живого вреда нет — но и доказательства
нет, а держится оно на трёх файлах, которые могут разъехаться.

### FOUND-6. CONTRADICTED-1 сформулирован так, что вводит в заблуждение насчёт контракта денег

Он пишет: «`MoneyFormatter` … объявлен `(value: number | null) => string` — `undefined` он **не
принимает**», и делает из этого вывод, что `?? null` вынужденное.

Про локальный псевдоним это правда (`FinancePlanning.tsx:8`). Про настоящую функцию — нет:

```
apps/web/src/AppHelpers.tsx:2630
export function money(value: number | string | null | undefined) {
  …
  if (typeof amount !== "number" || !Number.isFinite(amount)) return moneyUnknownLabel;
```

Общая `money()` `undefined` принимает и для него возвращает «не определено». Я это измерил на живой
отрисовке: `ShiftView.tsx:760` вызывает `money(dashboard?.billingSummary?.totalPaidRub)` без всякого
`?? null` — и печатает «не определено» правильно. Значит `money(billingSummary?.totalPaidRub)` без
`?? null` вело бы себя в рантайме **идентично**; `?? null` удовлетворяет добровольно суженному
псевдониму этого файла, а не контракт денег.

Решение не дефект (сам он его называет намеренным, и локальная узость типа — законный выбор), но
формулировка «`undefined` он не принимает» подталкивает читателя к выводу, что общий контракт денег
`undefined` отвергает. Не отвергает. Ведущему стоит держать это в виду при следующем пакете про
`money()`, чтобы не расширять то, что уже широко.

---

## 2. Что осталось за пределами этого пакета (не претензия к QQ2)

* `components/settings/SettingsPricesTab.tsx:376` — `money(item.basePriceRub ?? item.priceRub ?? 0)`.
  Его указатель проверен, строка на диске дословно такая: тот же класс дефекта, чужой файл.
* `apps/web/src/FinanceView.tsx:430` — `remainingDebtRub={billingSummary?.totalDueRub ?? 0}` в
  `FamilyWalletPanel`. Оставлено сознательно, с комментарием; проверил и подтверждаю безвредность:
  кнопка-подсказка рисуется под `debtSuggestionRub > 0`
  (`components/finance/FamilyWalletPanel.tsx:395, 699`), так что при неизвестной сводке подсказки
  просто нет и никакой нулевой суммы на экран не попадает.
* `scripts/smoke-finance-view-source.mjs:153` требует подстроку
  `'billingSummary: Dashboard["billingSummary"]'`, поэтому теперь пропустит и `| undefined`, и
  `| any`. Ослабление досталось по наследству от подстрочного `requireIn`, не им внесено.
* `node scripts/check-encoding.mjs` = 1: четыре порчи, все в `review.md` пакетов `HH1`, `HH4`, `JJ4`,
  `JJ5`. Кириллица QQ2 цела — ни один его файл не помечен.

## 3. Долгоживущего не оставлено

Ни серверов, ни БД, ни портов, ни фоновых процессов. Все мои запуски — короткие: `node --test`,
`npx tsc --noEmit`, пять стражей, `check-encoding`, один разовый зонд отрисовки (удалён в том же
вызове). Обе мутации откачены с проверкой sha256; по всем четырём продуктовым путям QQ2
`git diff --quiet` чисто.
