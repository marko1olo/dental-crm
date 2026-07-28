# S1-speech-unauthenticated — handoff

HEAD (на момент старта): 40dd853fcda4058c198048629a779e24f797c662
HEAD (после моих коммитов): 46bed6dba2415d4ee1ea2a98c0168e19197e8561

## Что было сломано (file:line)

Дефект РЕАЛЕН, но описание в пакете и в досье НЕВЕРНО. Исправлять нужно досье, а не только код.

**Досье утверждало:** `POST /api/speech/transcribe-chunk` «has no guard whatsoever — no preHandler,
no requireClinicalReadAccess, no requireClinicalMutationAccess», и что speech.ts «imports both at :37
while only ever using the read one».

**Факт на HEAD 40dd853fc:** обработчик `handleSpeechTranscribeChunk` (speech.ts:228-258 до правки)
ПЕРВОЙ СТРОКОЙ вызывал `requireClinicalMutationAccess` (:229). Мутационный гейт вызывался и на :261
(polish-transcript). Лид прочитал строку РЕГИСТРАЦИИ (:282), где действительно стоит только
`bodyLimit`, и не прочитал ТЕЛО обработчика. Файл не менялся с 2026-07-04 (6eea83a56) — это не
правка соседнего агента.

Наблюдения лида (400 без токена) и ревьюера (201 Created без токена) при этом ВЕРНЫ. Причин две, они
независимы:

1. **Гейт — no-op в этой среде.** `apps/api/src/accessGuard.ts:31-33`: при незаданном
   `DENTE_CLINICAL_ADMIN_SECRET` и `clinicalMutationsUnguardedAllowed()` функция делает `return true`
   для запроса БЕЗ учетных данных. Замеренные значения живой среды (печатались только булевы,
   значения секретов не читались):
   - `DENTE_CLINICAL_ADMIN_SECRET` задан — **false**
   - `DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS === "1"` — **true**
   - `NODE_ENV === "production"` — **false**
   Отсюда 400 на пустом теле и 201 на валидном: запрос доходил до валидации схемы, ни разу не быв
   спрошен об учетных данных.

2. **Запись без арендатора — верно при ЛЮБЫХ переменных окружения.** Обработчик никогда не определял
   организацию вызывающего. `validateSpeechClinicalScope` искал пациента (speech.ts:123 до правки) и
   прием (:130) по голому UUID **без предиката organizationId**, а
   `apps/api/src/speech/storage.ts:404-425` (`resolveSpeechChunkOrganizationId`) берет организацию
   сохраняемого фрагмента **ИЗ присланных клиентом patientId/visitId**. Арендатора записи выбирал
   клиент: с токеном клиники А (или вообще без токена) текст диктовки ложился в клиническую запись
   названного пациента клиники Б.

Причина 2 — та, которую можно закрыть внутри моего клейма, и она же закрывает причину 1 для этого
эндпоинта: `requireClinicalMutationContext` требует организацию из подписанного токена, а у
`requireOrganizationId` (`security/identity.ts:132-142`) обхода через переменные окружения нет —
`DENTE_DEV_ALLOW_HEADER_ORG` в этой среде равен false, и даже при "1" нужен заголовок.

### Таблица маршрутов speech.ts — асимметрия и есть находка

Строки — по файлу ПОСЛЕ правки (git 46bed6dba).

| Маршрут | Регистрация | Гейт в обработчике | Арендатор |
|---|---|---|---|
| GET /api/speech/status | :313 | requireClinicalReadAccess :177 | нет |
| GET /api/speech/gateway-health | :314 | requireClinicalReadAccess :182 | нет |
| GET /api/speech/providers/runtime | :315 | requireClinicalReadAccess :187 | нет |
| POST /api/speech/recording-strategy | :316 | requireClinicalReadAccess :192 | нет (расчет, без записи) |
| GET /api/speech/chunks | :317 | requireClinicalReadAccess :205 | **нет** |
| GET /api/speech/recordings/recovery | :318 | requireClinicalReadAccess :223 | **нет** |
| GET /api/speech/recordings/:id/assemble | :319 | requireClinicalReadAccess :239 | **нет** |
| **POST /api/speech/transcribe-chunk** | **:320** | **requireClinicalMutationContext :266 (БЫЛО requireClinicalMutationAccess)** | **ДА, из токена** |
| POST /api/speech/polish-transcript | :321 | requireClinicalMutationAccess :299 | нет (в базу не пишет) |

## Что изменено

Только `apps/api/src/routes/speech.ts` (+ новый тест). accessGuard.ts и server.ts не тронуты.

1. `handleSpeechTranscribeChunk` (:266) — вместо `requireClinicalMutationAccess` вызывает
   `requireClinicalMutationContext`. Аксессор существующий, не изобретён: тот же приём, что в
   `patientRecall.ts:68`, `patientDuplicates.ts:100`, `imports.ts:352`, `migrationRuns.ts:203`.
2. `validateSpeechClinicalScope` получила обязательное поле `options.organizationId: string | null`.
   Когда оно задано, пациент и прием ищутся с `and(eq(id), eq(organizationId))` — чужая карта отвечает
   404 «не найден» и не подтверждает существование UUID.
3. Три read-обработчика передают `organizationId: null` ЯВНО. Поведение чтения не изменено ни на
   байт; поле сделано обязательным, чтобы пробел был виден в коде, а не подразумевался умолчанием.
4. Добавлен импорт `and` из drizzle-orm.

Совместимость с живым клиентом: все три вызывающих места web отправляют `x-dente-clinic-token` —
`AppHelpers.tsx:4061-4068` (`denteAdminSecretRequestHeaders`, используется в
`useVoiceAssistant.ts:196` и `useShortDictation.ts:95`) и `AppHelpers.tsx:6059-6061`
(`denteClinicalMutationHeaders`, `useVisitLogic.ts:658`). Залогиненный интерфейс не ломается.

## ПРОВЕРЕНО

- **UNIT VERIFIED** — `node --import tsx --test apps/api/src/tests/routes/speechTranscribeChunkAccess.test.ts`
  → `tests 7 | pass 7 | fail 0 | skipped 0`, exit 0. Пропусков ноль, значит база была доступна и
  ветка успеха реально исполнилась. Проверки:
  1. без учетных данных — **401 AuthRequired** (было 201/400);
  2. пустое тело без токена — 401, а НЕ `SpeechChunkValidationError` (раньше признаком дефекта было
     именно то, что запрос доходил до схемы);
  3. с действующим токеном кабинета — **201**, `chunk.organizationId === ORG_A`,
     `chunk.patientId === PATIENT_A`, текст диктовки сохранён;
  4. токен клиники Б + patientId клиники А — **404 SpeechClinicalScopeError** «не найден»;
  5. токен клиники Б + visitId клиники А — **404**;
  6. **контрольная**: соседний read `/api/speech/status` при ТЕХ ЖЕ переменных окружения отдаёт
     **200 без единого заголовка** — значит 401 у записи получен новой проверкой, а не средой;
  7. токен, подписанный чужим секретом — **401**.
  Флаг `DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS=1` в тесте выставлен НАМЕРЕННО, как в живой среде:
  если бы защита держалась на нём, проверка 1 провалилась бы.
- **TYPECHECK VERIFIED** — `npm run typecheck -w @dental/api` → exit 0 (дважды: до и после теста).
- **SMOKE VERIFIED** (полный набор) — `npm test -w @dental/api` → `tests 925 | pass 925 | fail 0 |
  skipped 0`, exit 0. Ни один существующий тест не опирался на открытость эндпоинта, то есть дефект
  не был закодирован в тестах. Внешний провайдер не вызывался: передаётся только `localTranscript`
  без `audioBase64`, `speech/gateway.ts:2018-2021` сохраняет такой фрагмент как `fallback_text` и в
  сеть не выходит.

## НЕ ПРОВЕРЕНО

- **API VERIFIED недоступен в этом пакете.** Общий dev-сервер на 127.0.0.1:4100 запущен без
  `--watch` и мой код не подхватывает; перезапускать его запрещено. Закрывающая команда, когда лид
  перезапустит сервер:
  `curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:4100/api/speech/transcribe-chunk -H "Content-Type: application/json" -d "{}"`
  → ожидается `401`. И с токеном:
  `curl -s -X POST http://127.0.0.1:4100/api/speech/transcribe-chunk -H "Content-Type: application/json" -H "x-dente-clinic-token: <подписанный токен>" -d "<валидный чанк>"` → ожидается `201`.
- **DB VERIFIED отдельным SQL не делался.** Факт записи проверен через ответ API внутри
  node:test (`chunk.organizationId`, `chunk.patientId`, текст). Закрывающая команда:
  `psql "$DATABASE_URL" -c "select organization_id, input_storage_path from ai_jobs where input_storage_path like 'speech/%' order by created_at desc limit 5;"`
- **UI VERIFIED** — не мой уровень claim, не заявляю.
- Влияние отдельного дефекта общего пути (токен с organizationId, которого нет ни в одной строке
  `organizations`, принимается как валидный): **моя правка от него защищена по факту, но не
  доказана тестом.** Такой токен даёт organizationId, по которому не найдётся ни один пациент и ни
  один прием, поэтому запись упрётся в 404 и в чужую карту не попадёт. Отдельного теста на это я не
  писал.

## ЦЕНЗ: пишущие маршруты без гейта (ТОЛЬКО ОТЧЁТ, НИЧЕГО НЕ ИСПРАВЛЯЛ)

### Метод (и почему ему можно верить)
Read-only анализ через `node -e` по `apps/api/src/routes/**/*.ts` (63 файла, тесты исключены).
Ключевое: **разрешение именованных обработчиков**. Регистрация вида
`app.post("/x", handleX)` не содержит имени гейта — именно на этом досье и ошиблось. Скрипт строит
карту тел функций файла (объявления `function`, в т.ч. вложенные с отступом, и стрелочные
`const NAME = (...) =>`) и присоединяет тело обработчика к области поиска. Дополнительно учитываются
файловые `addHook("preHandler"|"onRequest")` и словарь гейтов, **выведенный из кода**
(`rg -o "\b(require|enforce|assert|verify|ensure)[A-Z]\w*"` по routes/), а не придуманный.

Скрипт пришлось прогнать пять раз, и каждая итерация ловила ложные срабатывания — привожу, чтобы
доверие было обоснованным, а не декларативным:
- итерация 1 (36 «дыр») — словарь не знал второго идиома авторизации: `patients.ts`, `visits.ts`
  проверяют токен вручную через `verifyToken(clinicToken, TOKEN_SECRET())`;
- итерация 3 (20) — не ловились ОБЪЯВЛЕНИЯ ФУНКЦИЙ С ОТСТУПОМ, из-за чего `schedule.ts`
  (`updateAppointmentHandler`) выглядел незащищённым;
- итерация 4 (17) — шаблон `const NAME = (` совпадал с обычным `const body = (request.body as ...)`,
  что обрезало область поиска и ложно «разоружало» `auth.ts` set-password/set-pin/setup-init;
- итерация 5 (14 → 6) — **самый важный пропуск**: искалось только `app.`, а `inventory.ts`,
  `portal.ts`, `publicBooking.ts`, `telephony.ts` регистрируют на `server.`. 15 пишущих маршрутов
  не сканировались вовсе. После добавления `server|fastify|instance` их стало 183, а не 168.

Проверено также, что цензу нечего пропустить мимо: пишущих регистраций вне `routes/` нет,
идиом `app.route({ method })` в проекте не встречается, глобального auth-хука нет —
`server.ts:303` вешает `onRequest`, который только ставит security-заголовки и разбирает личность
(`getRequestIdentity`), НО НИЧЕГО НЕ ЗАПРЕЩАЕТ. Значит каждый маршрут обязан защищаться сам.

### Итог: 183 пишущих регистрации, 177 с гейтом, 6 без. Все шесть прочитаны глазами.

| file:line | маршрут | вердикт |
|---|---|---|
| `apps/api/src/routes/portal.ts:250` | POST /auth/send-otp | **публичный по замыслу** — вход пациента по OTP. Ограничение частоты есть: `security/rateLimit.ts:79` покрывает `^/api/portal/`. |
| `apps/api/src/routes/portal.ts:451` | POST /auth/verify-otp | **публичный по замыслу**, то же ограничение частоты. |
| `apps/api/src/routes/publicBooking.ts:396` | POST /:organizationId/book | **публичный по замыслу** — онлайн-запись без аккаунта. Свой антифлуд в обработчике: `isRateLimited(request.ip)` → 429. |
| `apps/api/src/routes/lab.ts:302` | POST /api/portal/lab-order/:token/status | **публичный по замыслу**, токен в URL и есть учётные данные; статус валидируется белым списком (комментарий в коде это фиксирует). |
| `apps/api/src/routes/settings.ts:383` | POST /api/settings/reset-demo | **без гейта, но инертный**: тело — `return { success: true, message: "…больше не поддерживается…" }`. Ничего не меняет. |
| `apps/api/src/routes/settings.ts:387` | POST /api/settings/reset-zero | то же самое. |

**Вывод ценза, обратный гипотезе пакета:** асимметрия speech.ts была УНИКАЛЬНА. Других пишущих
маршрутов с реальными побочными эффектами и без гейта не найдено. Пакет предполагал, что «this
asymmetry may not be unique» — по этому цензу это не подтвердилось.

### Что censusом найдено, но НЕ является «отсутствием гейта» (для следующего цикла)
1. **Чтение диктовки не проверяет арендатора.** `GET /api/speech/chunks` (:317),
   `/recordings/recovery` (:318), `/recordings/:id/assemble` (:319) стоят на булевом
   `requireClinicalReadAccess`, который в этой среде (`DENTE_CLINICAL_ALLOW_UNGUARDED_READS=1`,
   секрет не задан) пропускает запрос без учетных данных — это доказано проверкой 6 моего теста
   (200 на `/api/speech/status` без заголовков). Организация им не передаётся вовсе. Кандидат в
   следующий пакет; я намеренно не менял, чтобы не ломать панели, которые читают состояние шлюза
   до входа, — проверить это я не могу без UI-уровня.
2. **`settings.ts:383/387` — фасад `{ success: true }`** при неработающей операции. Прямое нарушение
   §2 (ZERO MOCKS: «Never a facade returning {success:true}»). Плюс `request`/`reply` в них не
   используются. Кандидат на удаление маршрутов, а не на гейт. Файл чужой (не-fleet автор) — не трогал.
3. **Два параллельных идиома авторизации** в одном проекте: общие аксессоры `accessGuard.ts` и
   рукописные блоки `verifyToken(clinicToken, TOKEN_SECRET())` (`patients.ts:140-146`,
   `visits.ts:96-102`, `:121-127`). Именно эта разноголосица делает цензы дорогими и позволила
   дыре в speech.ts выжить: глазами по регистрациям её не видно. Архитектурный долг.
4. **`accessGuard.ts` — escape hatch в форме, где «не настроено» значит «пускать всех».**
   Контрпример гигиены лежит в этом же репозитории: `communicationReceipts.ts:33-49`
   (`guardReceiptCall`) при незаданном секрете отвечает **503 и отказывает**, без оглядки на
   NODE_ENV. `requireClinicalMutationAccess`/`requireClinicalReadAccess` в том же случае
   **пропускают**. Ту же форму, но в webhook-контексте, имеет `telegram.ts:2299-2310`: без
   настроенного секрета 503 только в production. Не мой пакет (запрещено править accessGuard.ts) —
   но это корень, а не симптом, и следующий цикл стоит нацелить сюда.

## Коммиты

- `8f4d42fe361fb5ad65382cfd7c08e873a710cbb8` — `fix(диктовка): фрагмент речи писался в карту
  пациента без токена и в чужую клинику` (speech.ts + state.md + commitmsg.txt)
- `46bed6dba2415d4ee1ea2a98c0168e19197e8561` — `test(диктовка): закрыт регресс — запись фрагмента
  без токена и в чужую клинику` (новый node:test + commitmsg-test.txt)

Коммиты делались pathspec-формой с явным списком путей. Индекс перед каждым коммитом проверялся
`git diff --cached --name-only` — посторонних файлов в нём не было. `apps/api/dist/**`,
`apps/api/.data/*.json` не стадились.

## Переподтверждение после ухода HEAD (S2 переписал файл, от которого я завислю)

Между моими коммитами в ветку легли `d6c1eed82` и `f11f64153` (пакет S2). `d6c1eed82` изменил
**`apps/api/src/speech/storage.ts`** (202 строки) — тот самый файл, чей
`resolveSpeechChunkOrganizationId` определяет организацию сохраняемого фрагмента, то есть прямая
зависимость моей правки. Поэтому все проверки прогнаны ПОВТОРНО на HEAD `cb15cdec9` уже с правкой S2:

- `node --import tsx --test apps/api/src/tests/routes/speechTranscribeChunkAccess.test.ts`
  → `tests 7 | pass 7 | fail 0 | skipped 0`, exit 0
- `npm run typecheck -w @dental/api` → exit 0
- `npm test -w @dental/api` → `tests 931 | pass 931 | fail 0 | skipped 0`, exit 0
  (931, а не 925: S2 добавил свой набор `speech/tests/storageIdentity.test.ts`)

Мой гейт присутствует на HEAD: `git grep -n` находит
`requireClinicalMutationContext(request, reply, "speech chunk transcribe")` в
`apps/api/src/routes/speech.ts:266`. Конфликта с S2 нет: он правил storage-слой, я — маршрут.

## Отступление от брифинга, признаю сам

Брифинг требовал префикс `[ARCHON] ` в теме коммита. Мои три коммита (`8f4d42fe3`, `46bed6dba`,
`cb15cdec9`) ушли БЕЗ этого префикса — недосмотр мой, тема и тело в остальном соответствуют
(Conventional Commits, русская область и тема, названа суть дефекта, а не активность).

Историю НЕ переписываю осознанно: `8f4d42fe3` и `46bed6dba` уже не последние — поверх них лежат
коммиты другого агента (`d6c1eed82`, `f11f64153`), и любой rebase/amend переписал бы ЧУЖИЕ коммиты
и сменил бы их хеши в общей ветке. Цена исправления префикса несоизмеримо ниже цены порчи чужой
работы, поэтому оставляю как есть и сообщаю. Если лид хочет префикс — это его вызов на его условиях.

## Коллизия (сообщаю, не исправляю)

`apps/api/src/server.ts` в состоянии ` M` — грязный НЕ мной, я его не открывал на запись, не
ревертил и не стадил. Это правка другого автора в его зоне. Мой файл `speech.ts` на старте был чист.

## Долг

- Read-эндпоинты диктовки без проверки арендатора (см. пункт 1 выше) — сознательно не закрыто в
  этом пакете, пробел сделан видимым в коде через явный `organizationId: null` и комментарий
  speech.ts:113-125.
- Фрагмент с `patientId === null` и `visitId === null` проходит проверку контекста (для записи
  `requirePatientOrVisit` не выставлен), а затем `storage.ts:424` бросает
  `SpeechChunkOrganizationScopeError`, который в `handleSpeechTranscribeChunk` не перехватывается —
  клиент получит 500 вместо внятного 400. Данные при этом не пишутся, дыры нет. Не чинил: это
  меняло бы поведение вне мандата пакета.
- i18n-долга не добавлено: новых пользовательских строк нет, переиспользованы существующие
  сообщения («Пациент для диктовки не найден.», «Прием для диктовки не найден.»).

## Поправки в досье (исправлять досье, не код)

1. `transcribe-chunk` НЕ был «без гейта вообще»: `requireClinicalMutationAccess` вызывался на
   speech.ts:229. Ошибка — чтение строки регистрации вместо тела обработчика.
2. «speech.ts imports both … while only ever using the read one» — неверно: мутационный гейт
   использовался на :229 и :261.
3. Настоящая механика — no-op гейта из-за env-флагов ПЛЮС полное отсутствие определения арендатора.
   Формулировка «unauthenticated endpoint» верна по наблюдаемому поведению, но причина в досье
   названа не та, и по ней нельзя было бы найти вторую половину дефекта (межклинический доступ).
4. Пакет заявляет «~313 HTTP handlers across 53 route files». Фактически: **63** файла маршрутов,
   **183** пишущих регистрации (GET не считал).
5. Брифинг заявляет «844 tests» для `npm test -w @dental/api`. Фактически на 46bed6dba — **925**.
