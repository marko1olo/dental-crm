# P1-analytics — отчёт

HEAD (на момент написания): 9d8a71f1cbe9211e43356f7ff8546aeac2169b59
МОЙ КОММИТ: 2cb0787d417defbaf22a561311876e09c3349e13 — проверено, входит в историю HEAD
HEAD на старте пакета: 0b208ef17edba4b8e145bbdbb3e42ea68cd87267 (в задании был f09869601 — дерево ушло вперёд)

---

## Что было сломано

Все пять ссылок досье на `apps/web/src/pages/AnalyticsDashboardView.tsx` ТОЧНЫ. Открыл каждую строку.

| Строка | Что там было | Подтверждено |
|---|---|---|
| :45-46 | `margin: number; completionRate: number` — ложь в типе, сервер отдаёт null | да |
| :50-54 | `formatRub(n)` → `` `${n} ₽` ``, без защиты от null | да |
| :437-439 | `<td className="margin-positive">+{formatRub(doc.margin)}</td>` → «+null ₽» зелёным | да |
| :444-452 | `completionRate >= 80 ? … : >= 60 ? …` → null не проходит оба, значит КРАСНЫЙ «null%» | да |
| :88-90 | `const json = await res.json(); … setData(json.data)`, типизировано как any | да |

Серверная часть тоже подтверждена: `apps/api/src/routes/analytics.ts:131-132` действительно содержит
`margin: null as number | null` и `completionRate: null as number | null`.

### Найдено сверх досье, в том же файле, тот же класс дефекта

1. **:87** `throw new Error('Ошибка сервера: ' + res.status)` выбрасывал готовое русское сообщение
   сервера. `analytics.ts:280-284` отдаёт `{message:"Не удалось построить аналитику. Данные не
   потеряны, повторите позже."}` — пользователь вместо него видел голый код состояния.
2. **:89** `if (mounted && json.success)` без ветки else. При `success:false` не выставлялись НИ
   данные, НИ ошибка: `loading=false, error=null, data=null` → экран рисовал заголовок и пустоту
   под ним. Молчаливый пустой экран.
3. **:100** `setInterval(fetchData, 60_000)`, а `fetchData` начинается с `setLoading(true)`. Раз в
   минуту заполненный дашборд подменялся коробкой «Загрузка аналитики».
4. **:39 + :260-267** тип объявлял `cohortLtvJson` с полем `"Month 1": number`, а сервер это поле
   считать перестал (`analytics.ts:213-218`, там стоит `void m1;`). График рисовал для него
   отдельную `<Area>` и строку легенды «1-й месяц», под которой никогда не было линии.
   **Подтверждено живым ответом:** `cohortLtvJson:[{"cohort":"Июл","Month 12":9629}]` — поля
   `Month 1` в теле нет.
5. Запрос не прерывался при смене периода — ответ на старый период мог перетереть новый.
6. `isEmpty` сервер присылает (`analytics.ts:267-271`), клиент его не объявлял и не читал: сигнал
   «за период данных нет» существовал и выбрасывался.

### Про вторую половину — важная поправка к досье

Скриншот `desktop_dark_analytics.png` показывал английский текст исключения
«Failed to execute 'json' on 'Response': Unexpected end of JSON input». **Сегодня пустое тело этим
эндпоинтом уже не отдаётся** — я его проверил, приходит валидный JSON (225 и 844 байта). Пустое тело
шло от прежней ошибки в самом обработчике (описана в комментарии `analytics.ts:25-32`: гейт
возвращает boolean, его присвоили `orgId`, `typeof orgId !== "string"` срабатывало всегда, обработчик
выходил до первого запроса к базе и Fastify отправлял пустой ответ). Серверную причину починили,
**хрупкость клиента осталась**: любой пустой или не-JSON ответ (прокси, 502, обрыв) снова напечатал
бы английское исключение на весь экран. Именно её и закрывает этот пакет.

---

## Что изменено

### НОВЫЙ `apps/web/src/pages/analyticsDoctorMetrics.ts`
Чистый модуль без React и без импорта CSS — поэтому его грузит `node:test`.
- `formatMarginCell(number|null)` → `{text, tone, title?}`. null/undefined/NaN/Infinity → `—`,
  тон `neutral`, подсказка с причиной. `>0` → `+N ₽` positive. `<0` → `-N ₽` negative.
  `0` → `0 ₽` neutral. Ноль прочерком не подменяется и прочерк нулём — тоже.
- `formatCompletionRate(number|null)` → null → `—` neutral (НЕ красный). Число → `N %` с порогами
  80/60, вынесенными в именованные константы.
- `metricToneClass(tone)` → только токены темы: `--muted` / `--ok-fg` / `--warn-fg` / `--bad-fg`.
  Класс `.margin-positive` (`#10b981`, `AnalyticsDashboardView.css:93-95`) больше не применяется.
- `formatRub` перенесён сюда, знак вынесен вперёд, сокращение считается по модулю. Для
  неотрицательных чисел поведение бит-в-бит прежнее — KPI-карточки не затронуты.
- `parseDashboardPayload(status, rawBody)` — чистый разбор УЖЕ прочитанного тела. Пустое тело,
  не-JSON, `success:false`, отсутствие `data`, 401/403, 5xx — все ветки возвращают русский текст.
- Честные типы: `margin: number | null`, `completionRate: number | null`, `isEmpty: boolean`,
  `"Month 1"` убрано.

### `apps/web/src/pages/AnalyticsDashboardView.tsx`
- `res.json()` заменён на `res.text()` + `parseDashboardPayload`. Английский текст исключения не
  выходит наружу ни при сбое сети, ни при мусоре в теле: `catch` подставляет свою русскую строку,
  а не `err.message`.
- Четыре состояния вместо одного: загрузка · запрос не удался (русский текст + кнопка «Повторить»)
  · за период данных нет (по `isEmpty`) · данные есть.
- Пятое, промежуточное: данные есть, но фоновое обновление не прошло — цифры остаются, сверху
  полоса с причиной и подписью «Показаны данные на HH:MM». Молча выдавать старые цифры за текущие
  нельзя, стирать их тоже.
- Фоновое обновление больше не гасит экран (`mode: "initial" | "background"`).
- `AbortController`, снимаемый в cleanup эффекта, рядом с существующими `mounted=false` и
  `clearInterval`. Три teardown-а на три ресурса.
- Таблица врачей вынесена в `DoctorProfitabilityTable` со сноской о методе — по образцу
  `components/reports/ManagerReportsPanel.tsx`, чтобы про одно и то же не было двух словарей.
- Убрана фантомная `<Area dataKey="Month 1">` и её градиент.
- `hover:border-[var(--brand-300)]` в фильтре периода → `var(--teal)`: токена `--brand-300` в
  `dente-redesign.css` нет вообще, объявление было невалидным. Заодно убраны hex-фолбэки
  `var(--paper-soft,#f8fafc)` и `var(--focus-ring,rgba(...))` — обе переменные определены во всех
  трёх темах.

### НОВЫЙ `apps/web/src/tests/analyticsDoctorMetrics.test.ts` — 16 проверок, `node:test`.

---

## ПРОВЕРЕНО

**API VERIFIED** — `node --env-file=apps/api/.env --import tsx .agents/archon/packets/P1-analytics/probe-analytics.mts`
(подписанный токен кабинета `x-dente-clinic-token`, живой сервер 127.0.0.1:4100).
Организация `d0000000-0000-4000-8000-00000000d001` «Демо-клиника для снимков», `range=all`:

```
STATUS 200 OK
BODY BYTES: 844
"doctorProfitabilityJson":[
  {"name":"Гаврилов Никита Сергеевич","revenue":44000,"margin":null,"completionRate":null},
  {"name":"Смирнова Елена Владимировна","revenue":23400,"margin":null,"completionRate":null}],
"isEmpty":false
  name="Гаврилов Никита Сергеевич" margin=null (typeof object) completionRate=null (typeof object)
  name="Смирнова Елена Владимировна" margin=null (typeof object) completionRate=null (typeof object)
```

Дефект воспроизведён на настоящих данных: два реальных врача с настоящей выручкой, у обоих
`margin: null` и `completionRate: null`. Старый код напечатал бы им «+null ₽» зелёным и «null%»
красным. Те же байты, пропущенные через отгруженный клиентский код:

```
  -> RENDERED "Гаврилов Никита Сергеевич": margin cell "—" tone=neutral class=text-[var(--muted)] | completion cell "—" tone=neutral class=text-[var(--muted)]
  -> RENDERED "Смирнова Елена Владимировна": margin cell "—" tone=neutral class=text-[var(--muted)] | completion cell "—" tone=neutral class=text-[var(--muted)]
EMPTY BODY -> ok=false message=Сервер вернул пустой ответ. Данные не потеряны — повторите запрос.
```

Вторая организация `4a3420d1-…` «Стоматология, 1 кабинет» отдаёт `isEmpty:true` — это ровно та
ветка «за период данных нет», которой у экрана не было.

**DB VERIFIED** — тот же прогон, прямой SQL к 127.0.0.1:5432:
```
PAID PAYMENT ROWS BY ORG: 1
  org=d0000000-0000-4000-8000-00000000d001 paid_payments=8 sum_rub=67400.00
ALL PAYMENTS BY STATUS: paid=8
payments.amount_rub column type: numeric
```

**UNIT VERIFIED** — `node --import tsx --test apps/web/src/tests/analyticsDoctorMetrics.test.ts`
```
ℹ tests 16
ℹ pass 16
ℹ fail 0
ℹ duration_ms 183.6412
```

**TYPECHECK VERIFIED** — `npm run typecheck -w @dental/web` → `EXIT=0`, пустой вывод. Прогнан дважды:
до коммита и повторно на текущем рабочем дереве (уже с чужой правкой поверх) — оба раза 0.
Отдельно напоминаю: типизация здесь слепа по построению, именно она пропускала «+null ₽» неделями.
Сама по себе она ничего о поведении не доказывает.

**Кодировка** — три моих файла: UTF-8, без BOM (первые байты `696d70` / `2f2a2a`), сигнатур
мождибаке нет.

---

## НЕ ПРОВЕРЕНО

- **Внешний вид в браузере.** UI VERIFIED не заявляю — скриншоты за ведущим. Закрывается снимком
  экрана «Аналитика» под организацией `d0000000-0000-4000-8000-00000000d001` в темах
  light/dark/night: в колонках «Прибыль» и «Успешность» должен стоять серый прочерк, под таблицей —
  сноска о методе.
- **Кнопка «Повторить» и полоса устаревших данных вживую.** Логика покрыта юнит-тестами на разбор,
  но клика по кнопке никто не делал. Закрывается: остановить API, открыть «Аналитику», нажать
  «Повторить». Автотеста нет — Playwright в репозитории без конфига и без единого .spec, Vitest не
  установлен; писать туда было бы фикцией.
- **Ветка «фоновое обновление упало, данные на экране остались».** Требует, чтобы сервер упал между
  двумя опросами. Закрывается тем же ручным сценарием: дождаться загрузки, остановить API, подождать
  60 секунд.
- **Рендер ненулевой прибыли.** Сегодня сервер отдаёт только null, поэтому ветки `+N ₽` / `-N ₽`
  доказаны юнит-тестом, а не живым ответом. Живого доказательства не будет, пока в БД не появятся
  себестоимость и процент врача.
- **`npm run smoke:*`** по этому экрану не запускал: смоука для аналитики в репозитории нет.

---

## Коммит

`2cb0787d417defbaf22a561311876e09c3349e13`
`[ARCHON] fix(аналитика): «+null ₽» зелёным как прибыль и «null%» красным`

Ровно три файла, все мои:
```
 apps/web/src/pages/AnalyticsDashboardView.tsx
 apps/web/src/pages/analyticsDoctorMetrics.ts      (новый)
 apps/web/src/tests/analyticsDoctorMetrics.test.ts (новый)
```
Русская тема коммита цела, не мождибаке. Iron Gate (pre-commit) пройден: gitleaks — утечек нет;
Biome пропущен, его нет в PATH.

---

## Долг / Blockers

### 1. КОЛЛИЗИЯ — чужая правка в МОЁМ заявленном файле, поверх моего коммита

После моего коммита другой агент отредактировал
`apps/web/src/pages/AnalyticsDashboardView.tsx` (сейчас ` M`, не закоммичено) и удалил
`apps/web/src/components/analytics/LostPatientsFiltersWidget.tsx` (в индексе `D `, с диска пропал).
Его правка меняет строку 25 моего файла:
```
-import { LostPatientsFiltersWidget } from "../components/analytics/LostPatientsFiltersWidget";
+import { RecallListPanel } from "../components/patients/RecallListPanel";
```
Я к ней НЕ ПРИКАСАЛСЯ: не стажировал, не откатывал, не правил. Правка легла поверх моего коммита
корректно (в её контексте виден мой новый комментарий), и `npm run typecheck -w @dental/web` на
текущем дереве возвращает 0. Отмечаю, потому что риск реальный: в истории уже есть
`9d8a71f1c fix(сборка): HEAD не собирался — VisitView импортировал удалённый VisitDictation` —
тот же сценарий, уже один раз сломавший сборку. Владельцу этой правки нужно её закоммитить.

### 2. Выход за букву заявки (осознанный, объявляю)

Заявка называла `AnalyticsDashboardView.tsx` «+ новый файл теста». Я создал ДВА новых файла:
тест и чистый модуль `analyticsDoctorMetrics.ts`. Без него требование пакета «вынести решение в
чистую функцию и покрыть node:test» невыполнимо: `AnalyticsDashboardView.tsx` делает
`import "./AnalyticsDashboardView.css"`, а Node на импорте CSS падает. Оба файла НОВЫЕ, поэтому
пересечься с чужой работой не могли.

### 3. Найдено, НЕ починено (вне пакета)

- `apps/web/src/pages/AnalyticsDashboardView.css:93-95` — `.margin-positive { color:#10b981 }`,
  статический hex мимо темы. Класс больше нигде не используется; файл не в моей заявке, поэтому
  оставлен. Кандидат на удаление.
- `AnalyticsDashboardView.tsx`, оформление графиков: `stroke="#27272a"`, `stroke="#a1a1aa"`,
  `fill:"#fff"`, `background={{fill:"#27272a"}}`, `wrapperStyle={{color:"#a1a1aa"}}`, градиент
  `#8b5cf6`, а также `color="#3b82f6" / "#10b981" / "#8b5cf6" / "#f59e0b"` у четырёх KpiCard —
  зашитые цвета в теме с тремя палитрами. Это тёмные значения: в светлой теме сетка и подписи осей
  почти чёрные на белом. Переписывать все четыре виджета — отдельный пакет, он столкнулся бы с
  визуальным вердиктом ведущего.
- `apps/api/src/routes/analytics.ts:92-95, 154` — сервер отдаёт цвета (`fill:"#a1a1aa"` и т. д.)
  в JSON. Палитра в API-ответе: тему на бэкенде не переключить. Архитектурный долг.
- `<Bar dataKey="value">` (воронка планов) не использует приходящий `fill` — цвета из ответа
  сервера игнорируются, полосы рисуются цветом recharts по умолчанию.
- `formatRub` округляет до `K`/`M`. Для KPI «Выручка» это скрывает разницу между 45 001 и 45 499 ₽.
  Не трогал: правило о копейках относится к платежам и документам, а не к плитке дашборда, но
  руководитель читает по ней состояние клиники.
- Десять мёртвых импортов в шапке файла (`ArrowUpRight`, `Filter`, `PieChart`, `BarChart`, `Cell`,
  `Line`, `Pie`, `RechartsPie`, `useIsActiveTab`, `Legend` используется). Существовали до меня, на
  рантайм не влияют, диф ради них не раздувал.

### 4. Поправки к брифу и досье

- Ссылки досье на `AnalyticsDashboardView.tsx` точны все пять. Дрейфа нет.
- В брифе: «HEAD f09869601». Фактический HEAD на старте — `0b208ef17`, f09869601 был на 5 коммитов
  раньше.
- В брифе: «amountRub is an INTEGER column in payments». **Неверно.** `information_schema` на живой
  БД: `payments.amount_rub column type: numeric`. Живая сумма — `67400.00`. Утверждение «копейки
  сейчас округляются по всему репозиторию» на `payments` не опирается.
- Про аутентификацию для проб: рецепт из брифа неполон. `authTokenSecret()` читает
  `AUTH_TOKEN_SECRET`, а он лежит в `apps/api/.env`, НЕ в корневом `.env`. Скрипт, запущенный из
  корня, подхватывает корневой `.env`, получает не тот секрет и стабильно ловит 401 AuthRequired.
  Рабочая команда: `node --env-file=apps/api/.env --import tsx <скрипт>`. Дев-секрет иначе берётся
  из `path.resolve(process.cwd(), ".data")/dev-auth-secret` (`security/authSecret.ts:41-44`), то
  есть зависит от рабочего каталога. Стоит вписать в досье — на этом теряется время.
- `node scripts/check-encoding.mjs` красный НЕ на одном файле, как сказано в брифе, а на пяти:
  `smoke-document-issue-chains.mjs`, `smoke-patient-forms-lifecycle.mjs`, `smoke-tax-knd-xml.mjs`,
  `smoke-telegram-validation.mjs` (U+FFFD, текст утрачен), `smoke-visit-workflow-forms-lifecycle.mjs`.
  Ни одного моего среди них нет.

### 5. i18n

Экран получил новый русский текст в JSX напрямую: сообщения об ошибках, копия пустого состояния,
кнопка «Повторить», сноска о методе. Через словарь я это не проводил — существующие словари
(`workspaceUiLabels.ts` и соседние) аналитику не обслуживают, а заводить для одного экрана новый
значило бы создать ещё один параллельный словарь. **Долг признаю явно:** плюс ~10 строк к тем
~14 814 строкам с кириллицей в 314 файлах. Селектор языка в `App.tsx` по-прежнему фиктивный —
один вариант, ничего не меняет.

---

## Артефакты пакета

- `state.md` — чёрный ящик, писался по ходу.
- `commitmsg.txt` — тело коммита.
- `probe-analytics.mts` — read-only проба API+БД. Ничего не пишет. Запуск:
  `node --env-file=apps/api/.env --import tsx .agents/archon/packets/P1-analytics/probe-analytics.mts`
