# U2-behavioural-guard-gate — handoff

HEAD: 637a837897c9c1b36bc19230356c73fd86aebeb4
(HEAD when I started: 65dc2d62302a1a268f41871851c98dbbe8199e9a; it moved twice under me,
re-read before each commit.)

## Что было сломано (file:line)

1. `scripts/smoke-clinical-mutation-guard.mjs:110-138` (до правки) — «доказательство» защиты
   маршрутов было счётом текстовых вхождений ИМЕНИ охранника в исходнике против зашитого
   числа. Мера врёт в обе стороны, и обе измерены:
   - **зеленела на прозе**: в `apps/api/src/routes/speech.ts` реальных вызовов охранника
     мутаций стало один вместо двух, а JSDoc с именем охранника удержал счётчик на двух
     (зафиксировано в `.agents/archon/progress.md:421-426`);
   - **краснела на исправном коде**: `node scripts/smoke-clinical-mutation-guard.mjs` выходил
     с кодом **1** на строке 125 с текстом
     `apps/api/src/routes/patients.ts must guard 3 protected route(s), found 0`.
2. `apps/api/src/routes/patients.ts:3` импортирует `requireClinicalMutationAccess` и
   `requireClinicalReadAccess` и **не вызывает ни один из них**. Доступ проверяется вручную в
   каждом обработчике: `patients.ts:121-126`, `140-145`, `164-169`, `200-205` читают
   `x-dente-clinic-token`, вызывают `verifyToken(clinicToken, TOKEN_SECRET())`, отвечают 401
   `AuthRequired`/`AuthExpired` и берут `organizationId` из ПОДПИСАННОГО payload, а не из
   заголовка. Это строже общего помощника. Ошибка гейта была ложной.
3. **Худшее следствие, которого в бумагах не было**: из-за падения на строке 125 вся
   поведенческая часть файла (старые строки 568-767, 22 меняющих и ~50 читающих зондов) не
   выполнялась НИ РАЗУ, и её зашитый список успел сгнить незамеченным. Первый же элемент
   `protectedRequests[0]` — `POST /api/patients` — ожидал 403, а маршрут отвечает 401.
4. Блок строковых утверждений по `apps/web/src/App.tsx` + `useAppLogic.tsx` (старые строки
   140-314) **уже неверен на HEAD**: измерено **9 из 24 искомых подстрок и 4 из 17 групп не
   совпадают**. Оба файла в git чистые, то есть это состояние HEAD, а не грязного дерева.
   Такой блок держал бы гейт защиты маршрутов красным из-за переделки интерфейса.

## Что изменено

- **Новый `scripts/lib/api-route-census.mjs`** — перепись по ЖИВОМУ экземпляру Fastify:
  `createRealApiApp()` поднимает тот же `createDenteApiApp` из `apps/api/dist/server.js`
  (воркеры выключены, логгер переведён в `silent`), `collectRouteTable()` разбирает
  `printRoutes({ commonPrefix: false })` в плоский список `{ method, routePath }`,
  `materializeRouteUrl()` подставляет значения параметров. Ни одного зашитого адреса.
- **`scripts/smoke-clinical-mutation-guard.mjs` перезаписан**:
  - каждому маршруту таблицы отправляется запрос **без учётных данных**; ответ обязан быть
    **401 или 403**. 2xx — дыра; 400 — тоже провал, потому что дойти до валидации тела
    значит пройти охранника;
  - `NODE_ENV=production`, послабления разработки сняты, а **секреты всех административных
    домена и вебхуков заданы синтетическими одноразовыми значениями** (`randomUUID`, поэтому
    выполняется и требование ≥16 символов из `deliveryReceipts.ts:321`). Без этого 24 маршрута
    отвечают 503 «секрет не настроен» и выглядят защищёнными только из-за пустого окружения;
  - гейт **не знает и не спрашивает**, каким идиомом закрыт маршрут: и общий
    `requireClinical*`, и рукописный `verifyToken` проходят одинаково;
  - исключения перечислены поимённо, каждое с причиной и зафиксированным кодом ответа:
    20 записей «публично по замыслу» (27 пар метод+путь), 2 записи ДОЛГА,
    1 запись «нельзя проверить через inject»;
  - **устаревшая запись исключения валит прогон**: если адрес из списка исчез из таблицы
    маршрутов, гейт падает, потому что иначе он оправдывал бы маршрут, которого нет;
  - маршрут из списка исключений, который начал отвечать 401/403, попадает в `warnings`
    («уберите запись»), а не молча остаётся;
  - маршруты, для которых тело проверяется РАНЬШЕ прав (`/api/auth/clinic/set-password`,
    `/api/auth/staff/set-pin`), получают тело правильной формы без единого настоящего
    значения — иначе 400 приходит до охранника и проверка теряет смысл;
  - охранник обязан **ОТКРЫВАТЬСЯ** по верному секрету: по одному GET-маршруту на каждый
    секретный идиом, выведенному из самой переписи. Только чтения — смоук не делает записей;
  - отказоустойчивость проверяется на маршрутах, **выведенных из переписи** по коду ошибки, а
    не по имени файла: production без секрета → 503; только settings-секрет → 503; только
    telegram-секрет → 503; явное послабление для чтений в development → пропуск;
  - публичный `/api/health` проверяется поведением: 200, без слов о персистентности и
    резервных копиях, с жёстким `Content-Security-Policy`;
  - сообщение оператору при битом адресе локального модуля оставлено (это единственная
    поведенческая проверка этого текста в репозитории).

## ПРОВЕРЕНО

**TYPECHECK VERIFIED** — `npm run typecheck -w @dental/api` → exit 0 (дважды: до первого
коммита и перед вторым). Ошибок в `@dental/web` из моих файлов быть не может: оба файла .mjs.

**SMOKE VERIFIED** — `node scripts/smoke-clinical-mutation-guard.mjs` → **exit 0**:
```
"ok": true,
"routeTableEntries": 481,
"probedRoutes": 479,
"mutatingRoutesProbed": 186,
"readRoutesProbed": 292,
"challengedRoutes": 450,
"challengedMutatingRoutes": 172,
"probeElapsedMs": 580
```
Баланс сходится: 479 опрошено − 450 отклонено = 29 = 27 публичных пар + 2 пары долга.
Меняющих: 186 = 172 отклонено + 12 публичных + 2 долга. Пропущено поимённо 2 пары
(GET и HEAD `/api/ws/schedule`).

**SMOKE VERIFIED (через набор)** — `npm run smoke:all -- --only=clinical-mutation-guard`:
```
Running 1 smoke checks matching clinical-mutation-guard.
PASS smoke:clinical-mutation-guard 1810ms
SUMMARY total=1 failed=0 elapsedMs=1810
```

**SMOKE VERIFIED (гейт ловит настоящую регрессию)** — в СБОРКЕ (`apps/api/dist`, не
отслеживается git, восстановлено побайтово) вызов охранника у `POST /api/billing/payments`
заменён комментарием, в котором ИМЯ охранника осталось — ровно то, на чём зеленел старый
счётчик. Прогон:
```
EXIT_RED=1
"ok": false,   "challengedMutatingRoutes": 171,
ПРОВАЛЕНО ПРОВЕРОК: 1
  - НЕ ЗАЩИЩЁН: POST /api/billing/payments без учётных данных ответил 400 (BillingValidationError), ожидались 401 или 403
```
Восстановление: `md5sum` файла до и после совпадает (`d696c686f9a2c890c1b79ebd7ece50a6`),
`git status --porcelain -- apps/api/dist` пуст, повторный прогон → `EXIT=0`,
`challengedMutatingRoutes` снова 172.

**SMOKE VERIFIED (оба идиома проходят в одном прогоне)** — гистограмма фактических ответов:
```
401 AuthRequired: 100        403 ClinicalReadSecretRequired: 100
403 (без кода, HEAD): 78     401 (без кода, HEAD): 61
403 ClinicalAdminSecretRequired: 59
403 SettingsAdminSecretRequired: 14   403 TelegramAdminSecretRequired: 14
401 Unauthorized: 7   401 WebhookSecretMismatch: 4   403 AuditLogImmutable: 4
403 Forbidden: 3   401 ReceiptSecretMismatch: 3
403 DicomWebSettingsAdminSecretRequired: 1   401 WhatsappSignatureMismatch: 1
401 TelegramWebhookSecretMismatch: 1
```

**SMOKE VERIFIED (patients.ts проходит)** — все меняющие маршруты префикса `/api/patients`
без учётных данных:
```
POST /api/patients                                   -> 401 {"error":"AuthRequired"}
PUT  /api/patients/:patientId                        -> 401 {"error":"AuthRequired"}
PUT  /api/patients/:patientId/administrative-profile  -> 401 {"error":"AuthRequired"}
POST /api/patients/:patientId/archive-status          -> 401 {"error":"AuthRequired"}
POST /api/patients/:patientId/tooth-states/batch      -> 401 {"error":"AuthRequired"}
POST /api/patients/:patientId/treatment-plans         -> 401 {"error":"AuthRequired"}
POST /api/patients/:patientId/attachments             -> 401 {"error":"AuthRequired"}
POST /api/patients/duplicates/merge                   -> 403 {"error":"ClinicalAdminSecretRequired"}
POST /api/patients/duplicates/dismiss                 -> 403 {"error":"ClinicalAdminSecretRequired"}
POST /api/patients/recall-candidates/invite           -> 403 {"error":"ClinicalAdminSecretRequired"}
```
Гейт больше не различает эти два идиома — в этом и был смысл.

**API VERIFIED (живой сервер 127.0.0.1:4100)**
```
GET  /api/health                     -> 200
POST /api/patients          '{}'     -> 401 {"error":"AuthRequired"}
POST /api/billing/payments  '{}'     -> 400 {"error":"BillingValidationError", ...}
```
Второй результат — не дыра, а доказательство того, ЗАЧЕМ гейт задаёт окружение сам:
`apps/api/.env` объявляет `DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS` (подтверждено ИМЯ
переменной, значение не читалось), и на этом стенде клинический охранник пропускает
анонима по `accessGuard.ts:31-33`. **Проба против живого сервера не может заменить этот
гейт.** `POST /api/patients` отвечает 401 независимо от флагов, потому что его проверка от
окружения не зависит.

**Замер производительности** — до правки вывода: 12 060 мс общего времени (588 мс на опрос,
925 мс на импорт, остальное — ожидание закрытия пула PostgreSQL и таймеров). После:
**1 963 мс** при том же количестве опрошенных маршрутов, в наборе — 1 810 мс.

## НЕ ПРОВЕРЕНО

- **Авторизация WebSocket `/api/ws/schedule`.** `app.inject` не выполняет рукопожатие
  Upgrade, поэтому оба метода этого адреса пропущены поимённо и напечатаны в отчёте.
  Закрывающая команда: живой WS-клиент против 127.0.0.1:4100, например
  `node -e "const ws=new (require('ws'))('ws://127.0.0.1:4100/api/ws/schedule');ws.on('close',(c)=>console.log('close',c));ws.on('message',(m)=>console.log(String(m)))"`
  (пакет `ws` уже стоит в apps/api).
- **`TypeError: socket.close is not a function` при настоящем сокете.** Наблюдалось только
  при инъекции HEAD (реального сокета нет), поэтому production-поведение НЕ доказано.
  Закрывающая команда: тот же живой WS-клиент, который молчит дольше таймаута
  аутентификации, и наблюдение `apps/api/src/routes/websocket.ts` в этот момент.
- **Что охранник открывается по верному секрету у МЕНЯЮЩИХ маршрутов.** Проверено только на
  чтениях (по одному GET на секретный идиом), чтобы смоук не выполнил настоящую запись в
  базу. Закрывающая команда (осознанно НЕ включена в гейт):
  `node scripts/smoke-payment-idempotency.mjs`, который проходит охранника с настоящим
  секретом и проверяет запись.
- **Что 2 заглушки долга ничего не меняют в базе.** Прочитан код (`settings.ts:637-643`
  возвращает литерал и не обращается к базе), запрос против базы не делался.
  Закрывающая команда: `psql -h 127.0.0.1 -p 5432 -c "select count(*) from patients"` до и
  после `curl -X POST http://127.0.0.1:4100/api/settings/reset-zero`.
- **`npm test -w @dental/api` (844 теста) не запускался** в этом пакете: изменены только два
  .mjs-скрипта, ни один тест их не импортирует. Закрывающая команда:
  `npm test -w @dental/api`.

## Коммит

- `e8be281d9765e06e25842939fdd387a4c5dfd37b` — перезапись гейта и новый
  `scripts/lib/api-route-census.mjs` (2 файла, +742 −696).
- `637a837897c9c1b36bc19230356c73fd86aebeb4` — вывод гейта тонул в логе запросов, прогон
  висел 10 секунд (2 файла, +22 −7).

Оба коммита сделаны формой с pathspec, `git log -1 --stat` показывает только мои файлы,
русские заголовки целы (не мождибаке). `apps/api/dist`, `apps/api/.data`,
`apps/web/tsconfig.tsbuildinfo`, `scratch/**` не индексировались.

## Долг

1. **`POST /api/settings/reset-demo` и `POST /api/settings/reset-zero`**
   (`apps/api/src/routes/settings.ts:637-643`) — фасады: отвечают `{"success":true}` любому
   анониму и ничего не делают, параметры `request`/`reply` не используются. Нарушение §2
   (facade returning `{success:true}`). Записаны в гейте как ДОЛГ с ожидаемым кодом 200,
   поэтому их исправление сразу потребует убрать запись. **Не в моём claim** —
   `apps/api/src/routes/settings.ts` мне не выделен.
2. **`apps/api/src/routes/patients.ts:3`** — мёртвый импорт `requireClinicalMutationAccess`
   и `requireClinicalReadAccess`: он и породил ложное «found 0». Удалить его — отдельная
   правка в чужом файле; **не в моём claim**.
3. **Удалены утверждения о проводке веба**, которых больше нет нигде в репозитории:
   `appSource.includes('fetch("/api/system/persistence/verify",')` и
   `!appSource.includes('fetch("/api/health"')`. Причина: гейт защиты маршрутов не должен
   краснеть из-за переделки интерфейса — 9 из 24 подстрок этого блока уже не совпадают с
   HEAD. Смысловая половина заменена НАСТОЯЩЕЙ проверкой: публичный `/api/health` не
   отдаёт сведений о персистентности. Если проводка веба нужна как отдельная проверка, её
   место — `scripts/smoke-dental-persistence-routes-source.mjs`, и запись в `package.json`
   для неё уже есть.
4. **Удалены три утверждения о CSP по тексту `apps/api/src/server.ts`** — они дословно
   дублируются в `scripts/smoke-document-html-preview-source.mjs:128-153` (проверено),
   потери покрытия нет. Взамен добавлена проверка настоящего заголовка
   `Content-Security-Policy` у JSON-ответа. Ветка `text/html` поведением НЕ проверяется:
   для неё нужен выпущенный документ.
5. **Старый положительный обход** (~72 зашитых запроса с верным секретом) заменён на 4
   выведенных зонда по одному на секретный идиом, только GET. Меньше запросов сознательно:
   зонды с верным секретом по меняющим маршрутам писали бы в живую базу.
6. **4 маршрута журнала аудита** (`DELETE/PUT/PATCH /api/audit/logs...`) отвечают без
   учётных данных `403 AuditLogImmutable`. Гейт считает это отказом (любой 403 — отказ), и
   это безопасно, но отказ дан по неизменяемости, а не по правам. Если журнал когда-нибудь
   станет изменяемым, охранник прав должен появиться раньше этой проверки.
7. **`RECON_DOSSIER.md` не содержит раздела про этот гейт вовсе** (поиск по `U2`,
   `guard gate`, `behavioural` — пусто). Исправлять в досье нечего; описание дефекта в
   `.agents/archon/progress.md:421-437` подтверждено по обоим направлениям, но там не
   зафиксировано главное следствие — падение на строке 125 отключало ВСЮ поведенческую
   часть файла и её зашитый список успел сгнить.
