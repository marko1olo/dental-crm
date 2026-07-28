# U1-identity-verified — сдача

HEAD: feb39fe35db97746813cd47dc21ebf4f05f619ca
HEAD на старте пакета: 65dc2d62302a1a268f41871851c98dbbe8199e9a
Мои коммиты: `dfe75e1bb`, `31f8a2e37`, `feb39fe35`. Между ними легли коммиты других
агентов (`a6a6f019b`, `e8be281d9`) — история не переписывалась.

## Что было сломано (file:line)

### 1. Метка `verified` записывалась и не проверялась никогда
- `apps/api/src/security/identity.ts:107-113` (до правки) — при
  `DENTE_DEV_ALLOW_HEADER_ORG=1` и `NODE_ENV !== production` организация берётся из
  клиентского заголовка `x-organization-id` и помечается `verified: false`.
- `apps/api/src/security/identity.ts:132-142` (до правки) — `requireOrganizationId`
  проверяет только `!identity.organizationId`. Поля `verified` не читает.
- Замер, а не утверждение: `rg -n "\.verified" apps/api/src` → 4 попадания. Три
  записи внутри `identity.ts` (строки 90, 98, 111) и ОДНО чтение —
  `apps/api/src/tests/security.test.ts:129`. Потребителей в рабочем коде НОЛЬ.
- Радиус: `requireOrganizationId` — 89 текстовых попаданий в 17 файлах. Прямые
  вызовы в 13 файлах маршрутов (`clinical.ts` 38, `imaging.ts` 16, `xray.ts` 6,
  `documents/*`, `egisz.ts`, `dicomweb.ts`, `dashboard.ts`). Транзитивно через
  `accessGuard.ts`: `requireResolvedOrganizationId` (17 файлов маршрутов),
  `requireClinicalReadContext` (8), `requireClinicalMutationContext` (7).
  ЧЕРЕЗ `requireOrganizationId` НЕ ХОДЯТ: `accessGuard.resolveOrganizationId`
  (`diary.ts`, `templates.ts`, `workspaceProfile.ts`) и
  `accessGuard.requireResolvedStaffOrAdminOrganizationId` (14 файлов) — они читают
  `getRequestIdentity(request).organizationId` напрямую (`accessGuard.ts:97` и
  `accessGuard.ts:120`). Поэтому проверка поставлена в источник, а не в аккессор.

### 2. `apply-dev-env.ps1` НЕ ЗАПУСКАЛСЯ ВОВСЕ — досье здесь неверно
Досье и `review.md` S1 (раздел 5) утверждают: «One run of it re-opens this hole».
Замерено обратное. Файл — UTF-8 БЕЗ BOM (первые три байта 35,32,226), а
единственный PowerShell на машине — Windows PowerShell 5.1.26100.8875 (`pwsh` в
PATH нет). BOM-less `.ps1` он разбирает в ANSI-кодировке, поэтому русский текст и
длинные тире превращаются в посторонние кавычки. Прогон копии в песочнице
(временный каталог, поддельные `.env`, настоящие файлы не трогались):

```
powershell -NoProfile -ExecutionPolicy Bypass -File <sandbox>/apply-dev-env.ps1
ParserError: MissingEndCurlyBrace ... apply-dev-env.ps1:47 / :46 / :48 / :80
EXIT=1
flag assignments: .env -> 0   .env.local -> 0   apps/api/.env -> 0
```

Скрипт не выставлял `DENTE_DEV_ALLOW_HEADER_ORG=1` никогда, не применял ни одного
флага и не генерировал `AUTH_TOKEN_SECRET`. Дыра латентная не «на одну команду», а
на «одну команду плюс починку скрипта». Обе части теперь закрыты.

### 3. Production действительно падает на этом флаге — цитата
`apps/api/src/server.ts:91-98` собирает список небезопасных флагов, включая
`"DENTE_DEV_ALLOW_HEADER_ORG"` (строка 95), и `server.ts:100-105`:
```
  if (isProduction) {
    if (unsafeFlags.length > 0) {
      throw new Error(
        `Небезопасные флаги разработки включены в production: ${unsafeFlags.join(", ")}. Отключите их перед запуском.`
      );
```
Именно поэтому дефект был латентным, а не действующим. Дополнительно
`identity.ts:59` возвращает `false` при `NODE_ENV === "production"` — два независимых
рубежа.

## Что изменено

### `apps/api/src/security/identity.ts` (`dfe75e1bb`)
- `identity.ts:74` `READ_ONLY_METHODS` = GET/HEAD/OPTIONS.
- `identity.ts:84` `isStateChangingRequest` — всё, что не из этого набора (и
  неизвестный метод), считается записью.
- `identity.ts:102` `serverAcceptsNetworkConnections` — читает
  `request.server.server.listening`; неизвестное состояние трактуется как сетевое.
- `identity.ts:112` `unverifiedOrganizationUsable` — единственное место решения:
  чтение можно всегда, запись — только пока процесс не слушает порт.
- `identity.ts:186-199` — пост-условие на СОБРАННОЙ личности:
  `if (identity.organizationId && !identity.verified && !unverifiedOrganizationUsable(request))`
  → `organizationId` обнуляется, на запросе ставится метка причины, в лог уходит
  предупреждение. `userId/role/fullName` из подписанного токена сотрудника
  сохраняются: недостоверна была только организация.
- `identity.ts:220-235` `requireOrganizationId` отвечает 401
  `UnverifiedOrganizationCannotMutate` вместо общего `AuthRequired`, когда причина
  именно эта.

Почему различие взято по `listening`, а не по `NODE_ENV`/`request.ip`: замерено
пробой на живом Fastify 5.8.5 — при `app.inject` до `listen()` `listening === false`,
после `listen()` и по настоящему сокету `true`, а `request.ip` РАВЕН `127.0.0.1` во
всех трёх случаях. То есть `ip` неотличим у теста и у локального curl, а `listening`
отличает «постороннего отправителя не существует» от «отправителем может быть кто
угодно».

### `apply-dev-env.ps1` (`31f8a2e37`)
- Переведён в ASCII целиком: BOM репозиторные инструменты не пишут, а ASCII
  разбирается одинаково в PowerShell 5.1 и 7. Скрипт заработал.
- Обычный запуск больше НЕ пишет `DENTE_DEV_ALLOW_HEADER_ORG` ни в один файл.
- Флаг вынесен в явный ключ `-AllowHeaderOrg`, печатает красный блок и пишется в
  ОДИН файл — корневой `.env.local` (API его читает:
  `apps/api/src/env/loadServerEnv.ts:65-72` `baseEnvFiles`), а не в три.
- Ранее выставленный флаг скрипт находит и называет по имени файла, но НЕ правит
  чужой `.env` построчно.
- Маркер идемпотентности перенесён на `DENTE_ALLOW_DEMO_LOGIN` и сверяется по
  присваиванию в начале строки, а не по упоминанию (первая версия правки находила
  имя флага в собственном комментарии и докладывала свою же прозу — поймано
  прогоном, исправлено до коммита).
- `AUTH_TOKEN_SECRET` генерируется криптографическим RNG вместо `Get-Random`
  (PRNG, засеянный часами). Значение не печатается.

### `apps/api/src/tests/security/unverifiedOrganizationMutation.test.ts` (`feb39fe35`)
Новый тест: настоящие маршруты `routes/clinical.ts` в двух приложениях одного
процесса — одно слушает `127.0.0.1:0` и принимает настоящие HTTP-запросы, второе не
слушает и вызывается через `app.inject`.

## ПРОВЕРЕНО

**UNIT VERIFIED** — `node --import tsx --test apps/api/src/tests/security/unverifiedOrganizationMutation.test.ts`
```
✔ живой сервер: клиническая запись по одному заголовку организации отклонена (30.1755ms)
✔ живой сервер: POST-чтение по одному заголовку организации тоже отклонено (3.8052ms)
✔ живой сервер: запрос вообще без заголовков получает обычный AuthRequired (2.2366ms)
✔ живой сервер: подписанный токен кабинета по-прежнему пишет (4.6288ms)
✔ живой сервер: чтение по заголовку организации остаётся рабочим (3.0041ms)
✔ app.inject без слушающего порта: заголовок организации работает и на POST (14.8342ms)
ℹ tests 6  pass 6  fail 0  skipped 0   TRUE_EXIT=0
```
Матрица закрывает и отказ, и сохранённое поведение: `POST /api/clinical/rules`
(настоящая клиническая запись) по одному заголовку на слушающем сервере → 401
`UnverifiedOrganizationCannotMutate`; тот же сервер с подписанным токеном → 200;
`app.inject` на неслушающем приложении с тем же заголовком → 200.

**UNIT VERIFIED** — `npm test -w @dental/api`, два прогона:
- прогон 1: `tests 958  pass 958  fail 0  skipped 0`, TRUE_EXIT=0, но в хвосте
  отчёта висит падение хука `after` в `src/tests/routes/portalOtp.test.ts:147`:
  `delete from "organizations"` нарушает FK `patients_organization_id_organizations_id_fk`.
- прогон 2: `tests 958  pass 958  fail 0  skipped 0`, TRUE_EXIT=0, раздела
  `failing tests` НЕТ.
Это НЕ моя поломка и не регресс: `portalOtp.test.ts` и
`speechTranscribeChunkAccess.test.ts` делят один UUID организации
`dce70000-0000-4000-8000-000000000901` (`rg -ln` даёт ровно эти два файла), и
уборка одного натыкается на фикстуру другого. Изолированный прогон
`node --import tsx --test apps/api/src/tests/routes/portalOtp.test.ts` → `tests 7
pass 7 fail 0`, TRUE_EXIT=0. Мой тест не делает НИ ОДНОЙ записи в базу (`rg -n
"insert|delete|update"` по файлу даёт только `delete process.env....`).
Семь тестов на `DENTE_DEV_ALLOW_HEADER_ORG` (фактически девять файлов:
`patientRecall`, `patientDuplicates`, `managerReports`, `dayConfirmations`,
`communicationsOutbox`, `communicationCampaigns`, `appointmentReminders`,
`routes/clinical`, `ai`) не изменялись и проходят.

**TYPECHECK VERIFIED** — `npm run typecheck -w @dental/api` → TRUE_EXIT=0 (дважды:
после правки `identity.ts` и после добавления теста).

**SMOKE VERIFIED (песочница, не репозиторий)** — `apply-dev-env.ps1` прогнан
четырьмя сценариями на копии во временном каталоге с поддельными `.env`:
- до правки: `EXIT=1`, ParserError, изменённых файлов 0;
- после правки, обычный запуск: `EXIT=0`, dev-флаги легли в три файла,
  присваиваний `DENTE_DEV_ALLOW_HEADER_ORG` — `0 / 0 / 0`, `AUTH_TOKEN_SECRET`
  сгенерирован;
- повторный запуск: три «already set», дубликатов нет (`DENTE_ALLOW_DEMO_LOGIN`
  по одной строке в каждом файле, `AUTH_TOKEN_SECRET` одна строка);
- `-AllowHeaderOrg`: красный блок предупреждения, присваивания флага
  `.env -> 0`, `.env.local -> 1`, `apps/api/.env -> 0`;
- предварительно вооружённый файл: предупреждение называет ровно
  `apps/api/.env` и ни один из двух остальных;
- в записанных `.env` ноль байт со старшим битом (ASCII, мождибаке невозможно).

**API VERIFIED (только как контроль отсутствия регресса)** — живой общий сервер
`127.0.0.1:4100`, который поднят через `tsx watch` и подхватил правку:
```
GET  /api/health                                      -> 200
POST /api/clinical/rules  + x-organization-id, без токена -> 401 {"error":"AuthRequired"}
GET  /api/clinical/tasks  + x-organization-id, без токена -> 401 {"error":"AuthRequired"}
```
Читать это надо честно: на работающей машине `DENTE_DEV_ALLOW_HEADER_ORG` НЕ
выставлен, поэтому 401 приходит из ветки «флаг выключен», а не из моей новой.
Проба доказывает, что сервер жив и правка ничего не сломала, и что коробка
безопасна сегодня. Она НЕ доказывает новую ветку.

**Мождибаке** — `identity.ts` 0 битых строк / 3333 кириллических символа;
новый тест 0 / 1814; BOM нет ни в одном.

## НЕ ПРОВЕРЕНО

1. **Новая ветка отказа на живом общем сервере.** Нужно вооружить флаг и
   перезапустить общий процесс — это действие ведущего, мне перезапуск запрещён.
   Закрывающая команда (выполнять ведущему):
   `powershell -ExecutionPolicy Bypass -File .\apply-dev-env.ps1 -AllowHeaderOrg`,
   перезапуск API, затем
   `curl -s -w "\nHTTP:%{http_code}\n" -X POST http://127.0.0.1:4100/api/clinical/rules -H "Content-Type: application/json" -H "x-organization-id: dce70000-0000-4000-8000-0000000009c1" -d "{...валидное правило...}"`
   → ожидается 401 `UnverifiedOrganizationCannotMutate`, а `GET /api/clinical/tasks`
   с тем же заголовком → 200.
2. **DB VERIFIED, что отказанная запись не создала строку.** Отказ происходит до
   любого запроса к базе (`clinical.ts:82` стоит перед
   `createClinicalRuleInDb`), поэтому строке взяться неоткуда, но SQL-замера я не
   делал. Закрывающая команда: `psql -h 127.0.0.1 -p 5432 -c "select count(*) from clinical_rules where organization_id = 'dce70000-0000-4000-8000-0000000009c1'"`
   → ожидается 0.
3. **`apply-dev-env.ps1` на PowerShell 7.** `pwsh` в PATH нет. ASCII-файл не может
   разобраться иначе, но замера не было. Закрывающая команда:
   `pwsh -NoProfile -File <копия>/apply-dev-env.ps1`.
4. **Поведение скрипта на настоящих `.env` этой машины.** Прогонял только копию в
   песочнице: запускать его на рабочих `.env` без нужды — риск для чужих
   креденшелов. Закрывающая команда (осознанно, ведущим):
   `powershell -ExecutionPolicy Bypass -File .\apply-dev-env.ps1`.
5. **UI VERIFIED** — не мой уровень, не заявляю.

## Коммит
- `dfe75e1bb` `fix(доступ): организация из dev-заголовка помечалась непроверенной и всё равно писала карты`
  — 1 файл, `apps/api/src/security/identity.ts`, +99.
  **ОТКЛОНЕНИЕ, раскрываю сам: в этом субъекте нет обязательного префикса
  `[ARCHON] `.** Не исправлял через `--amend`: между этим коммитом и следующим моим
  в ветку легли `a6a6f019b` и `e8be281d9` от других агентов, а `--amend` после
  сдвига HEAD перепишет ЧУЖОЙ коммит. Два следующих коммита префикс несут.
- `31f8a2e37` `[ARCHON] fix(окружение): apply-dev-env.ps1 не запускался вовсе и по замыслу вооружал заголовочный обход в трёх .env`
  — 1 файл, `apply-dev-env.ps1`, +173/-43.
- `feb39fe35` `[ARCHON] test(доступ): не было теста на запись по одному заголовку организации без токена`
  — 1 файл, новый тест, +219.
Ни в одном коммите нет чужих файлов, `apps/api/dist/**`, `.data/*.json`,
`tsbuildinfo` и `scratch/**`. Индекс перед каждым коммитом проверялся
`git diff --cached --name-only` и был пуст.

## Долг

1. **`accessGuard.ts` мне был запрещён, и там осталась вторая дверь.**
   `accessGuard.ts:96-98` `resolveOrganizationId` и `accessGuard.ts:115-130`
   `requireResolvedStaffOrAdminOrganizationId` читают `getRequestIdentity(...).organizationId`
   напрямую. Моё пост-условие обнуляет организацию в источнике, поэтому сегодня
   они тоже закрыты — но у правила два потенциальных владельца: любой, кто снова
   начнёт доверять заголовку ближе к маршруту, обойдёт проверку. Правильный
   следующий шаг — сделать `resolveOrganizationId` тонкой обёрткой над
   `requireOrganizationId` либо удалить её (3 файла маршрутов: `diary.ts`,
   `templates.ts`, `workspaceProfile.ts`).
2. **Читающий POST на живом сервере с заголовком организации теперь тоже 401.**
   Отличить `POST /api/clinical/rules/evaluate` (чтение) от
   `POST /api/clinical/rules` (запись) до выбора обработчика нельзя, поэтому любой
   не-GET считается записью. Это осознанный fail-closed: разработчику стоит
   одного входа в кабинет. Если понадобится вернуть удобство — только явным
   списком читающих POST-маршрутов, не флагом.
3. **Русская операторская документация из `apply-dev-env.ps1` утрачена.** Файл
   переведён в ASCII, потому что PowerShell 5.1 не разбирает BOM-less UTF-8, а BOM
   инструменты репозитория не пишут. Альтернатива, если русский текст нужен:
   записать файл с UTF-8 BOM (мне недоступно) либо вынести документацию в
   `.agents/`.
4. **Фикстуры тестов конфликтуют по UUID организации `...0901`.**
   `portalOtp.test.ts` и `speechTranscribeChunkAccess.test.ts` делят один
   идентификатор, и уборка первого падает на FK от второго. Пре-существующее,
   недетерминированное (прогон 1 — да, прогон 2 — нет), к моему пакету отношения
   не имеет. Речь заморожена, поэтому чинить надо `portalOtp.test.ts`, взяв
   собственный UUID.
5. **`identity.ts:174-182`, краевой случай.** Токен сотрудника БЕЗ
   `organizationId` в полезной нагрузке плюс dev-заголовок даёт `userId` из
   подписанного токена и организацию из заголовка. Запись такой личности теперь
   отклоняется, чтение — нет. Патологический случай, `signToken` в рабочем коде
   организацию всегда кладёт; фиксирую, чтобы это не нашли как «дыру».
6. **Досье требует правки.** Пункт «`apply-dev-env.ps1` — one run re-opens the
   hole» неверен: скрипт не запускался. Формулировка должна быть «скрипт по
   замыслу вооружал флаг в трёх файлах, но падал с ParserError до первой записи».
