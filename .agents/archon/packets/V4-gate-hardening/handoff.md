# V4-gate-hardening — handoff

HEAD: d62af23ea13e61ae413cef6f8f53e36cc5a65427
(HEAD на старте пакета: 56bc2ef6d5492b7d2dabed228ebe8d63113c676e; за время работы дерево
проехало через efa07327a → fd3765bd1 → мой коммит. Ни один чужой коммит не касался моих двух
файлов: `git log --oneline -6 -- scripts/smoke-clinical-mutation-guard.mjs
scripts/lib/api-route-census.mjs` последним показывает 637a83789 из сдачи U2.)

Спецификация: `.agents/archon/packets/U2-behavioural-guard-gate/review.md`, прочитана целиком
(222 строки). Все 8 пунктов §8 разобраны ниже, ни один не оставлен без ответа.

## Что было сломано (file:line)

1. **`scripts/lib/api-route-census.mjs:48` (до правки) — сборка не проверялась на свежесть.**
   Проверялось только `existsSync(dist/server.js)`. Дефект был ЖИВОЙ на момент старта пакета:
   через компилятор (`ts.parseJsonConfigFileContent` по `apps/api/tsconfig.json`, 239
   компилируемых файлов) измерено **8 исходников новее своей сборки**, в том числе
   `apps/api/src/routes/auth.ts` (src 06:33:23 > dist 04:21:13), `apps/api/src/db/schema.ts`
   (06:29:52 > 04:21:13), `routes/clinical.ts`, `routes/inventory.ts`,
   `db/domainStateHydration.ts`, `db/recentPatientHistoryQuery.ts`, `routes/diary.ts`,
   `scripts/seedOpsScreenshotDemo.ts`. Файлов без выхода сборки: 0.
2. **`scripts/lib/api-route-census.mjs:68` — `app.log.level = "silent"`.** Забытый `return`
   после охранника даёт ТОТ ЖЕ код ответа, а Fastify сообщает об этом записью уровня 40
   «Reply was already sent…». Молчащий логгер превращал этот дефект в зелёный прогон.
3. **`scripts/smoke-clinical-mutation-guard.mjs:72-79` — 6 имён послаблений из 8.**
   Отсутствовали `DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS`
   (`apps/api/src/routes/schedule.ts:134`) и `DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE`
   (`apps/api/src/routes/telegram.ts:1491`).
4. **`scripts/smoke-clinical-mutation-guard.mjs:81` — второй владелец имени заголовка.**
   `"x-dente-admin-secret"` перепечатан вручную; владелец — `apps/api/src/accessGuard.ts:7`
   (`export const denteAdminSecretHeader`).
5. **Ambient `NODE_ENV=production` ронял гейт на импорте.** Измерено ДО правки:
   `NODE_ENV=production node scripts/smoke-clinical-mutation-guard.mjs` → exit 1,
   `Error: AUTH_TOKEN_SECRET обязателен в production` из
   `dist/security/authSecret.js:82` ← `assertSecurityConfiguration` (`dist/server.js:86`),
   на верхнем уровне модуля, то есть до любой проверки.
6. **Расхождение inject и слушающего порта не было названо.**
   `apps/api/src/security/identity.ts:102-106` `serverAcceptsNetworkConnections()` возвращает
   `request.server.server.listening`; `:112-115` `unverifiedOrganizationUsable()` разрешает
   НЕПРОВЕРЕННОЙ организации ЗАПИСЬ, когда сервер не слушает. Под `app.inject` он не слушает
   никогда, то есть ветку браузера гейт не исполняет ни разу.

## Что изменено

**`scripts/lib/api-route-census.mjs`**
- `assertBuildOutputIsFresh()` — состав сборки берётся у САМОГО компилятора: `rootDir`,
  `outDir` и список файлов из `apps/api/tsconfig.json` через API TypeScript. Ни одного пути и
  ни одного исключения руками (тесты и мёртвый код эпохи PGlite уже исключены конфигурацией).
  Каждый исходник сверяется со своим `dist/*.js` по `mtimeMs`; при расхождении прогон
  отказывается стартовать и печатает файл, оба времени и команду сборки. **Сборку гейт не
  запускает** — смоук не должен менять то, что измеряет, а автосборка ещё и столкнулась бы с
  чужой параллельной сборкой во флоте.
- `installLogCapture(app)` — вместо `level="silent"` поток pino подменяется перехватчиком
  (символ ищется по описанию `pino.stream`: pino создаёт его через `Symbol()`, не
  `Symbol.for()`, поэтому `Symbol.for("pino.stream")` НЕ работает — проверено). Уровень
  ставится `warn`, поэтому «request completed» отсекается у источника, а всё от 40 и выше
  доходит до вызывающего. **Перехват проверяет себя сам**: если внутренности pino изменятся,
  функция бросает исключение, а не молча теряет детектор.
- `discoverDevelopmentEscapeFlags()` / `clearDevelopmentEscapes()` / `auditDevelopmentEscapeFlags()`
  — список послаблений дополнен до 8 имён И сверяется с исходниками: снимается ОБЪЕДИНЕНИЕ
  названного и найденного (значит даже незадокументированный флаг будет снят), а найденное и
  не названное валит прогон с именем и file:line.
- `prepareRealApiImportEnvironment()` — окружение загрузки задаёт модуль, а не машина:
  послабления снимаются ДО импорта, `AUTH_TOKEN_SECRET` при отсутствии получает одноразовое
  значение (нигде не печатается), режим загрузки закреплён `development`.
- `loadGuardHeaderNames()` — `denteAdminSecretHeader` из `dist/accessGuard.js`,
  `ORGANIZATION_HEADER` из `dist/security/identity.js`; отсутствие экспорта валит прогон.
- `createRealApiApp()` возвращает `{ app, logCapture, buildFreshness, importEnvironment }`.

**`scripts/smoke-clinical-mutation-guard.mjs`**
- **Проход со СНЯТЫМИ секретами** перед основным: гистограмма ответов и число «секрет домена
  не настроен» теперь МЕРЯЮТСЯ каждым прогоном (`secretsWithheldPosture`), а не пересказываются.
- Открытый в пустом окружении маршрут вне списка исключений валит прогон.
- Записи логгера уровня >= 40 валят прогон; запись о двойном ответе получает отдельный текст и
  не может быть разрешена ничем. Разрешения перечислены поимённо
  (`expectedGuardLogRecords`, сегодня одна запись: `apps/api/src/security/webhookAuth.ts:95-98`,
  отказ охранника вебхука), разрешение без ни одного совпадения попадает в `warnings`.
- `injectionLimitations` — две НАЗВАННЫЕ границы применимости: рукопожатие Upgrade у WebSocket и
  «процесс не слушает сетевой порт» (`identity.ts:102-106` → `:112-115`), каждая с влиянием на
  вердикт и закрывающей командой.
- Безвредность второй границы измеряется, а не утверждается: в production с
  `DENTE_DEV_ALLOW_HEADER_ORG=1` и заголовком организации меняющий маршрут обязан ответить
  401/403 (новая запись в `failClosedChecks`).

## ПРОВЕРЕНО

**SMOKE VERIFIED** — `node scripts/smoke-clinical-mutation-guard.mjs` → **exit 0**:
```
"ok": true,
"routeTableEntries": 464,   "probedRoutes": 462,
"mutatingRoutesProbed": 187, "readRoutesProbed": 274,
"challengedRoutes": 433,    "challengedMutatingRoutes": 173,
"buildFreshness": {"compiledSourceCount":235,"staleOutputCount":0,"missingOutputCount":0},
"logCaptureLevel": "warn",  "probeElapsedMs": 489,  "warnings": []
```
**Числа НЕ совпадают с 481/479/186/450/172, которые лично проверял ведущий, и это не моя
правка.** Контрольный прогон старым способом загрузки (без подготовки окружения, без
закрепления NODE_ENV, `scratch/v4-route-count-control.mjs`) на текущем dist даёт
`OLD_BOOT_ROUTE_TABLE_ENTRIES: 464`, `OLD_BOOT_MUTATING_ENTRIES: 187` — таблица маршрутов
уменьшилась в дереве (между U2 и сейчас прошли коммиты, убиравшие разделы, напр. 1d6886b3f,
fe0b5081f), а не в гейте.

**SMOKE VERIFIED (замер вместо прозы, пункт 1)** — `secretsWithheldPosture` из того же прогона:
```
"probedRoutes": 462, "secretUnconfiguredRoutes": 276, "challengedRoutes": 157,
"statusHistogram": {"200":8,"400":16,"401":150,"403":7,"404":5,"503":276}
```
**276** — ровно та цифра, которую независимо измерил ревизор (276 из 479 при 479 опрошенных;
у меня 276 из 462, потому что маршрутов стало меньше, а секретных доменов — столько же).
Заявленные в сдаче U2 «24» неверны и опровергнуты дважды.

**SMOKE VERIFIED (проверка свежести СРАБАТЫВАЕТ — оба направления)**
Органическое срабатывание, без подготовки: первый же прогон после моей правки упал, потому что
чужой агент правил `routes/clinical.ts` после моей сборки:
```
EXIT=1
Error: СБОРКА УСТАРЕЛА: ... Соберите API и повторите: npm run build -w @dental/api
Исходников новее своей сборки: 1
  - apps/api/src/routes/clinical.ts  исходник 2026-07-28T06:47:12.068Z новее сборки 2026-07-28T06:39:42.309Z
```
Управляемая демонстрация: `touch apps/api/src/security/identity.ts` (только mtime, содержимое
не менялось, `git status --porcelain` по файлу пуст до и после):
```
STALE_DEMO_EXIT=1
Error: СБОРКА УСТАРЕЛА: проверка подняла бы apps/api/dist/server.js, собранный до правок исходников...
  - apps/api/src/security/identity.ts  исходник 2026-07-28T06:57:56.281Z новее сборки 2026-07-28T06:49:39.057Z
```
Затем `npm run build -w @dental/api` → `BUILD_EXIT=0`, повторный прогон → `GATE_EXIT=0`,
`ok: true`, те же 464/462/187/433/173. Guard красный и зелёный — оба состояния показаны.

**SMOKE VERIFIED (детектор двойного ответа СРАБАТЫВАЕТ)** — воспроизведён ровно тот дефект,
на котором прошлый гейт зеленел (§3 ревью). В СБОРКЕ (`apps/api/dist`, git её не отслеживает)
у `POST /api/billing/payments` снят короткий выход после охранника:
`if (!(await requireClinicalMutationAccess(...))) return;` → `await requireClinicalMutationAccess(...);`
```
EXIT_MISSING_RETURN=1
ok: false,  challengedMutatingRoutes: 173   ← НЕ ИЗМЕНИЛОСЬ
вхождений «НЕ ЗАЩИЩЁН» в отчёте: 0          ← код ответа не сдвинулся ВООБЩЕ
ПРОВАЛЕНО ПРОВЕРОК: 2
  - ОБРАБОТЧИК ОТВЕТИЛ ДВАЖДЫ: Reply was already sent, did you forget to "return reply" in "/api/billing/payments" (POST)? (запрос req-1a) — охранник ответил, но тело обработчика продолжило работу: потерян «return» после охранника
  - ОБРАБОТЧИК ОТВЕТИЛ ДВАЖДЫ: ... (запрос req-e4)
```
Это и есть доказательство ценности пункта 3: критерий «код ответа» не увидел НИЧЕГО, прогон
покраснел только из-за логгера. Восстановление побайтовое: `md5` до и после совпадает
(`d696c686f9a2c890c1b79ebd7ece50a6`), `git status --porcelain -- apps/api/dist` пуст,
повторный прогон → exit 0.

**SMOKE VERIFIED (сверка инвентаря послаблений СРАБАТЫВАЕТ)** — из списка временно убрано
`DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS`:
```
EXIT_FLAG_NOT_DECLARED=1
  - ПОСЛАБЛЕНИЕ НЕ ВНЕСЕНО В СПИСОК: DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS (apps/api/src/routes/schedule.ts:134) снимается по факту находки, но отсутствует в developmentEscapeFlagNames
```
Восстановлено через `git checkout -- scripts/lib/api-route-census.mjs`,
`git status --porcelain -- scripts/` пуст. В зелёном прогоне: declared 8, discovered 5
(accessGuard.ts:18, accessGuard.ts:22, schedule.ts:134, imaging.ts:149, telegram.ts:1491),
undeclared 0, `clearedEscapeFlagCount: 8`.

**SMOKE VERIFIED (ambient production больше не роняет прогон)** —
`NODE_ENV=production node scripts/smoke-clinical-mutation-guard.mjs` → **exit 0**, `ok: true`,
в отчёте `"importEnvironment": {"ambientNodeEnv":"production","bootNodeEnv":"development",
"assignedAuthTokenSecret":true,"clearedEscapeFlagCount":8}`. До правки — exit 1 и стек.

**SMOKE VERIFIED (через набор)** — `npm run smoke:all -- --only=clinical-mutation-guard`:
```
Running 1 smoke checks matching clinical-mutation-guard.
PASS smoke:clinical-mutation-guard 2985ms
SUMMARY total=1 failed=0 elapsedMs=2985
```

**BUILD VERIFIED** — `npm run build -w @dental/api` → exit 0 (трижды за пакет; `tsc -p
tsconfig.json`, то есть компилятор прошёл по всем 235 файлам). Мои два файла — `.mjs`,
типизацией не покрыты; `git status --porcelain -- apps/api/dist` пуст после всех прогонов.

**Замер стоимости** — прогон в наборе стал дольше: 1810 мс (U2) → **2985 мс**. Цена названа:
второй проход по 462 маршрутам (`elapsedMs` 850/489 у двух проходов) и разбор конфигурации
компилятора (импорт `typescript` 137 мс + разбор 14 мс, измерено отдельно).

## НЕ ПРОВЕРЕНО

- **Что перехват логгера ловит записи уровня 50/60 (error/fatal).** Проверены уровень 40 из
  родительского логгера (самопроверка внутри `installLogCapture`) и уровень 40 из
  ЗАПРОСНОГО дочернего логгера (двойной ответ). Порог в коде один (`>= 40`), но 50/60 не
  наблюдались. Закрывающая команда: в копии гейта добавить `app.log.error("проба")` после
  `installLogCapture` и убедиться, что прогон краснеет.
- **Что проверка свежести ведёт себя верно при УДАЛЁННОМ исходнике** (лишний `.js` в dist без
  своего `.ts`). Сверка идёт от списка компилятора к dist, обратное направление не
  проверяется вовсе — брошенный файл сборки не будет замечен. Закрывающая команда:
  `node -e "require('fs').writeFileSync('apps/api/dist/routes/zombie.js','')"` и прогон гейта
  (ожидаемо exit 0 — то есть это НЕ покрыто).
- **Авторизация WebSocket `/api/ws/schedule`** — как и в U2: `app.inject` не делает Upgrade,
  оба метода пропущены поимённо. Закрывающая команда: живой WS-клиент против запущенного
  сервера (пакет `ws` стоит в apps/api).
- **Ветка `listening = true` у `identity.ts:102-106`.** Гейт её не исполняет ни разу (см.
  `injectionLimitations`). Измерено только то, что расхождение безвредно, потому что
  заголовочная организация в production не открывает запись (`failClosedChecks`:
  `POST /api/hr/recent-patients` → 401 при `DENTE_DEV_ALLOW_HEADER_ORG=1`). Закрывающая
  команда: тот же запрос против живого сервера на слушающем порту при NODE_ENV=development.
- **`npm test -w @dental/api` (844 теста) не запускался.** Изменены только два `.mjs`; ни один
  тест их не импортирует. Закрывающая команда: `npm test -w @dental/api`.
- **UI не проверялся** и проверяться не мог: пакет не касается интерфейса.

## Пункты ревью §8 — по одному

1. **«24» → 276. CLOSED, сильнее требования.** Требовалась правка числа в бумаге; вместо этого
   число МЕРЯЕТ сам гейт на каждом прогоне (`secretsWithheldPosture.secretUnconfiguredRoutes`
   = 276), поэтому расходиться с реальностью ему больше негде. Ложное «24» из сдачи U2
   опровергнуто и здесь названо ложным.
2. **Проверка свежести dist. CLOSED и ДОКАЗАНА в обе стороны** (органическое срабатывание +
   touch/rebuild выше). Выбран отказ, а не автосборка — обоснование в коде и в коммите.
3. **Перехватывающий логгер. CLOSED и ДОКАЗАН** на настоящем `FST_ERR_REP_ALREADY_SENT` при
   неизменившемся коде ответа.
4. **Расхождение inject/сокет названо. CLOSED.** `injectionLimitations` рядом с уже
   объявленным слепым пятном WebSocket; утверждение о равенстве с браузерным путём снято в
   шапке файла («`app.inject` — не браузер»); безвредность подтверждена пробой, а не прозой.
5. **Два флага послаблений. CLOSED и УСИЛЕНО:** имена добавлены, и список теперь сверяется с
   исходниками, так что следующий флаг не спрячется. Доказано срабатывание сверки.
6. **`AUTH_TOKEN_SECRET`/NODE_ENV до импорта. CLOSED.** Одно уточнение к формулировке ревью:
   закреплять при загрузке именно `production` нельзя — `dist/server.js` потребовал бы ещё и
   `WEB_ORIGIN` (`apps/api/src/server.ts:266-272`), а придумывать чужой адрес гейту запрещено
   (§1). Поэтому загрузка закреплена `development`, а `production` выставляется до первого
   зонда, как и раньше. Это безопасно и проверено: ни один маршрут не регистрируется по
   условию на NODE_ENV (`rg -n 'NODE_ENV' apps/api/src/server.ts` → 90/120/242/268/280, ни
   одной регистрации), охранники читают окружение на каждый запрос, а контрольный прогон
   подтвердил ту же таблицу маршрутов при старом способе загрузки.
7. **Два веб-утверждения. DECLARED DEBT — вне claim.** Перемерены сейчас, оба ВСЁ ЕЩЁ прошли
   бы: `/function denteClinical(Read|Mutation)Headers[^{]*\{[^}]*telegramControlPlaneHeaders/`
   по `apps/web/src/App.tsx` → не совпадает (утверждение верно);
   `appSource.includes('fetch("/api/health"')` → false (утверждение верно). Мой claim —
   только два скрипта охраны маршрутов, и возвращать текстовые утверждения о вебе в гейт
   защиты маршрутов нельзя: он снова начнёт краснеть от переделки интерфейса. Дома названы
   точно: первое — `scripts/smoke-telegram-control-ui-source.mjs` (уже проверяет
   `telegramControlPlaneHeaders`, строка 239); второе — `scripts/smoke-dental-persistence-routes-source.mjs`
   (уже читает исходники вебa, запись в package.json есть). Закрывающая команда после
   переноса: `node scripts/smoke-telegram-control-ui-source.mjs && node scripts/smoke-dental-persistence-routes-source.mjs`.
8. **`denteAdminSecretHeader` из dist. CLOSED**, плюс тем же способом закрыт второй такой же
   случай: `ORGANIZATION_HEADER` из `dist/security/identity.js` вместо новой строки в скрипте.

## Прочие находки ревью (§2–§6)

- **§2 (число 276) — CLOSED**, см. пункт 1.
- **§3 (ложное зелёное при потерянном `return`) — CLOSED**, см. пункт 3.
- **§4 (черствая сборка) — CLOSED**, см. пункт 2.
- **§5 (завышенное утверждение о достижимости) — CLOSED**, см. пункт 4.
- **§6 «Unlock probe принимает любое изменение кода ошибки за открытие»** — DECLARED DEBT, не
  трогал. Ревизор сам пометил это как свойство приложения, а не дефект пакета: `GET
  /api/settings/telegram` отдаёт 200 по одному глобальному секрету без тенант-идентичности.
  Гейт печатает это в `guardUnlockProbes` и ничего не утверждает. Ужесточать здесь — значит
  краснеть на существующем поведении приложения, что вне лана PROOF: чинить надо маршрут.
- **§6 «Потеряны утверждения о неверном секрете и о послаблении мутаций»** — ревизор сам
  закрыл это: `apps/api/src/tests/accessGuard.test.ts` покрывает оба случая. Ничего не делал.

## Исправления ЛОЖНЫХ утверждений прошлой сдачи (в бумаге их переписать нельзя — коммит запушен)

1. **`U2/handoff.md:47` — «Без этого 24 маршрута отвечают 503» — НЕВЕРНО.** Настоящая цифра
   **276** (измерено ревизором на 479 маршрутах и мной на 462: `503 = 276` в обоих случаях).
   «24»/«26» — из ПРОТЕКАЮЩЕЙ конфигурации (`NODE_ENV=development` с тремя флагами
   послаблений в «1»), которую гейт сознательно НЕ использует.
2. **`U2/handoff.md` (раздел «Что изменено») — «логгер переведён в `silent`» подано как
   улучшение.** Это была потеря детектора: `637a837897` удалил единственный сигнал, ловящий
   ответ «дважды». Исправлено этим пакетом.
3. **Утверждение о полной эквивалентности браузерному пути** (в сдаче U2 звучало как
   «каждый охранник, который проверяет гейт, — тот же, в который стучится браузер») —
   **НЕВЕРНО** для `identity.ts:102-115`. Снято в шапке скрипта и названо в
   `injectionLimitations`.
4. **Мой собственный коммит `d62af23ea` не имеет префикса «[ARCHON] » в теме.** Форма
   нарушена, историю не переписываю (запрет пакета на перезапись). Префикс поставлен на
   второй коммит пакета. **Ведущему: занести пункты 1–4 в `.agents/archon/progress.md`**, там
   их будут читать.

## Коммит

- `d62af23ea13e61ae413cef6f8f53e36cc5a65427` — `fix(охрана маршрутов): гейт зеленел на
  устаревшей сборке и не видел ответ «дважды»` (4 файла, +848 −64: два скрипта, `state.md`,
  `commitmsg.txt`). Форма с pathspec, `git log -1 --stat` показывает только мои файлы,
  русская тема цела. `apps/api/dist`, `apps/api/.data`, `apps/web/tsconfig.tsbuildinfo`,
  `scratch/**` не индексировались. Чужие файлы в общем индексе на момент моей первой попытки
  (`.agents/archon/packets/V6-narrow-dead-width/*`) не были ни закоммичены мной, ни сняты
  с индекса.
- Второй коммит — этот handoff и `state.md`.

## Долг

1. **`apps/api/src/server.ts:92-97` — тот же пробел в списке небезопасных флагов**, что был у
   гейта: перечислено 6 имён, `DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS` и
   `DENTE_TELEGRAM_ALLOW_UNGUARDED_CONTROL_PLANE` отсутствуют. Практический вред сегодня
   ограничен (оба флага сами проверяют `NODE_ENV !== "production"`, поэтому в production
   бесполезны), но fail-fast на старте и предупреждение оператору неполны. **Вне моего claim**
   и в зоне второго, не-флотового автора — не трогал. Правильное лечение — экспортировать
   список из одного места и читать его и сервером, и гейтом.
2. **Гейт теперь ТРЕБУЕТ свежую сборку.** Во флоте, где трое правят `apps/api/src`
   параллельно, это значит «сначала `npm run build -w @dental/api`, потом гейт». Это
   осознанная цена: зелёный прогон по вчерашней сборке — ложь. Замечание для набора смоуков:
   `scripts/run-smoke-suite.mjs` сборку не делает, поэтому в CI перед набором нужен шаг
   сборки, иначе набор будет краснеть по причине сборки, а не безопасности.
3. **Разрешённая запись логгера одна** (`webhookAuth.ts:95-98`). На другой машине или при
   недоступной базе может появиться легитимная запись уровня >= 40, и прогон покраснеет с
   точным текстом. Это выбранное направление ошибки (fail closed), но список разрешений
   придётся пополнять — только с исходником и причиной.
2b. **Юнит-тест на `assertBuildOutputIsFresh()` и `installLogCapture()` не добавлен**: любой
   такой файл — вне выданного claim (только два скрипта). Место для него:
   `apps/api/src/tests/` или новый `scripts/lib/*.test.mjs`, запуск
   `node --import tsx --test <файл>`. Все три поведения вместо этого доказаны прогонами выше.
4. **Два маршрута-заглушки** `POST /api/settings/reset-demo` и `POST /api/settings/reset-zero`
   (`apps/api/src/routes/settings.ts:637-643`) по-прежнему отвечают `{"success":true}` любому
   анониму. Записаны в гейте как ДОЛГ с зафиксированным кодом 200. Вне claim.
5. **Мёртвый импорт** `requireClinicalMutationAccess`/`requireClinicalReadAccess` в
   `apps/api/src/routes/patients.ts:3` — он и породил ложное «found 0» у старого гейта. Вне claim.
6. **Обратное направление проверки сборки не покрыто**: брошенный `.js` в dist без своего
   `.ts` не будет замечен (см. «НЕ ПРОВЕРЕНО»).
