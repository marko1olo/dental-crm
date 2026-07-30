# P6-doc-signer — отчёт

HEAD: 3ad6d461410ae9a087ce81ad5d2164710c245f4f

Пакет начинался на 94c6caa15a1dfcbf1774942a62b7a3dd8e4bdb2c (бриф ссылался на f09869601 —
дерево ушло вперёд). Между двумя моими коммитами вклинился чужой коммит 0baa1f723.

---

## Что было сломано

**`apps/api/src/db/documentQuery.ts:190`** — цитата дефекта из досье ТОЧНА, строка в строку:

    issuedByUserId: "doctor", // usually from request, hardcoded in sampleData for now

**`apps/api/src/db/documentQuery.ts:236`** — ВТОРОЙ экземпляр того же дефекта, в брифе и в досье
его нет вовсе:

    voidedByUserId: "doctor",

Читающая сторона того же файла честна (`:73 issuedByUserId: record.issuedByUserId`,
`:75 voidedByUserId: record.voidedByUserId`), то есть запись и чтение противоречили друг другу.

### Тяжесть выше, чем сформулировано в пакете

Пакет описывает дефект как «документ приписан литералу». На деле запись была НЕВОЗМОЖНА:

    db/schema.ts:505  issuedByUserId: uuid("issued_by_user_id").references(() => users.id)
    db/schema.ts:507  voidedByUserId: uuid("voided_by_user_id").references(() => users.id)

Обе колонки — `uuid` с внешним ключом на `users.id`. Проверено на живой базе: колонки
действительно `uuid`, а `'doctor'::uuid` даёт `22P02 invalid input syntax for type uuid`.
Значит `POST /api/documents/:id/issue` и `POST /api/documents/:id/void` не «ставили не того
подписанта» — они падали целиком, и документ не выдавался вообще. Ровно этот класс отказа уже
описан в `routes/documents/issue.ts:57-59` для прежней подстановки «mock-org».
Косвенное подтверждение: до моей проверки таблица `generated_documents` была ПУСТА.

### Проверка цепочки вызовов (AGENTS.md §6) — путь ЖИВОЙ, не мёртвый код

    server.ts:359  registerDocumentRoutes(app)
      -> routes/documents.ts:1031  registerDocumentRoutes
         -> :1033 registerIssue -> routes/documents/issue.ts:55  POST /api/documents/:id/issue
            -> issue.ts:175  issueGeneratedDocumentInDb(...)  -> documentQuery.ts:190
         -> :1034 registerVoid  -> routes/documents/void.ts:59  POST /api/documents/:id/void
            -> void.ts:118   voidGeneratedDocumentInDb(...)   -> documentQuery.ts:236

Вызывающих ровно два, оба — маршруты. Не мёртвый код, в отличие от `getDefaultOrganizationId()`.

---

## Что изменено

**`apps/api/src/db/documentQuery.ts`**
- добавлен `import { z } from "zod"` (zod — прямая зависимость apps/api, свой regex не заводился);
- добавлен `signerUserIdForColumn(value, column)`: `null` пропускает, валидный UUID пропускает,
  любая иная строка — громкая ошибка с указанием колонки и полученного значения. Вызывается
  ПЕРВОЙ строкой обеих функций, то есть до любого обращения к базе;
- `issueGeneratedDocumentInDb`: в `options` добавлено **обязательное** поле
  `issuedByUserId: string | null`, а `= {}` у параметра убрано. Раньше значение по умолчанию и
  позволяло слою БД самому придумать подписанта;
- `voidGeneratedDocumentInDb`: то же для `voidedByUserId: string | null`;
- оба литерала `"doctor"` заменены проверенными значениями.

**`apps/api/src/routes/documents/issue.ts`** — импортирует `getRequestIdentity` из уже
используемого `security/identity.js` и передаёт `issuedByUserId: getRequestIdentity(request).userId`.

**`apps/api/src/routes/documents/void.ts`** — то же для `voidedByUserId`.

**`apps/api/src/db/documentQuery.test.ts`** — новый регрессионный тест (второй коммит).

### Почему null, а не 401 и не подставной UUID

Пакет разрешал одно из двух: сделать вход обязательным и падать громко, либо честно
смоделировать отсутствие подписанта как `null`. Выбран `null`, и вот на каких основаниях:

- колонка изначально `nullable` (`schema.ts:505`/`:507`), то есть «подписант не установлен» —
  предусмотренное схемой состояние;
- гейт маршрута — `requireClinicalMutationAccess` (секрет админа) плюс `requireOrganizationId`
  (токен кабинета). Входа сотрудника он не требует. Ввести это требование — смена политики
  доступа, а не починка дефекта, и она сломала бы сценарии с одним лишь токеном кабинета;
- в реальном продукте подписант почти всегда есть: `apps/web/src/lib/apiAuthFetch.ts:87` и
  `AppHelpers.tsx:4067` шлют `x-dente-staff-token` на каждом авторизованном запросе;
- подставной UUID был бы пятой копией того же нарушения §1, что и мёртвые
  `getDefaultOrganizationId()`.

Ключевое: неизвестный подписант теперь записывается как «неизвестен», а не выдаёт себя за
известного. Любая попытка записать строку вместо UUID отвергается с внятным текстом.

---

## ПРОВЕРЕНО

**TYPECHECK VERIFIED** — `npm run typecheck -w @dental/api`, дважды (после правки кода и после
добавления теста):

    > tsc -p tsconfig.json --noEmit
    TYPECHECK_EXIT=0

**API VERIFIED** — живой сервер `127.0.0.1:4100`, подписанные токены кабинета и сотрудника
(HMAC по `AUTH_TOKEN_SECRET`), реальная организация `4a3420d1-6ffb-4459-bd8f-7f7087f5e191`,
реальный сотрудник `e44d32ca-7777-4c00-a001-c88f01b92e21` (Петров Иван Иванович, owner).
Скрипт: `.agents/archon/packets/P6-doc-signer/probe-issue.mjs`

    HEALTH: 200 {"ok":true,"service":"dental-crm-api",...}
    CREATE patient_intake_questionnaire: 201
    ISSUE  patient_intake_questionnaire: 200
      >>> issuedByUserId in RESPONSE: "e44d32ca-7777-4c00-a001-c88f01b92e21"
    VOID: 200

**DB VERIFIED** — чтение `generated_documents` на `127.0.0.1:5432` после каждого шага:

    DB ROW AFTER ISSUE: [{"id":"8ae72f8f-a6de-4535-baa6-612530bc0fc2","status":"issued",
      "issued_by_user_id":"e44d32ca-7777-4c00-a001-c88f01b92e21","voided_by_user_id":null}]
    DB ROW AFTER VOID:  [{"id":"8ae72f8f-a6de-4535-baa6-612530bc0fc2","status":"voided",
      "issued_by_user_id":"e44d32ca-7777-4c00-a001-c88f01b92e21",
      "voided_by_user_id":"e44d32ca-7777-4c00-a001-c88f01b92e21"}]

**DB VERIFIED** — старый SQL воспроизведён на реальной строке внутри транзакции с ROLLBACK:

    update generated_documents set issued_by_user_id='doctor' where id=...
    -> 22P02 invalid input syntax for type uuid: "doctor"

Это и есть доказательство, что прежний код не мог работать вовсе. Тип колонок прочитан
из `information_schema`: `issued_by_user_id` и `voided_by_user_id` — оба `uuid`.

**UNIT VERIFIED** — `node --import tsx --test src/db/documentQuery.test.ts`:

    ✔ литерал «doctor» отвергается до запроса в базу
    ✔ любая не-UUID строка отвергается, а не только «doctor»
    ✔ литерал «doctor» отвергается до запроса в базу (аннулирование)
    ✔ null проходит guard и не считается ошибкой
    ℹ tests 4  ℹ pass 4  ℹ fail 0

**Соседние тесты не сломаны** — `node --import tsx --test src/tests/routes/documents.test.ts
src/documents/documents.test.ts src/db/documentQuery.test.ts`:

    ℹ tests 24  ℹ pass 24  ℹ fail 0

**Кодировка** — `node scripts/check-encoding.mjs` красный по базовой линии (27 записей), но
ни один из четырёх моих файлов в список не попал (проверено grep-ом по выводу: 0 совпадений).

---

## НЕ ПРОВЕРЕНО

- **Смоки документов не запускались.** `scripts/smoke-document-lifecycle.mjs` и соседние грузят
  `apps/api/dist/**`, то есть СТАРУЮ сборку — моей правки там нет, и результат ничего не сказал бы
  о ней. Закрывается: `npm run build -w @dental/api && npm run smoke:document-lifecycle`
  (сборка общая, трогать её при трёх параллельных агентах я не стал).
- **Поведение при пропущенном `x-dente-staff-token` на живом маршруте** (ожидается запись `null`)
  проверено юнит-тестом, но не HTTP-запросом.
  Закрывается: повторить `probe-issue.mjs`, убрав `x-dente-staff-token` из `headers`.
- **UI не проверялся** — показывает ли «Паспорт документа» реального подписанта. Это лид.
- **Полный набор тестов API не гонялся** (`npm test -w @dental/api`) — три агента правят дерево,
  чужие падения не были бы моими. Прогнаны только документные файлы.

---

## Коммит

1. `5136239e62d0bbc4f0ab59380554496e364b54fa`
   `[ARCHON] fix(документы): выдача падала — подписантом писался литерал «doctor»`
   3 файла, +70/−6. Только мои файлы.
2. `3ad6d461410ae9a087ce81ad5d2164710c245f4f`
   `[ARCHON] test(документы): замок на подписанта — литерал вместо UUID больше не пройдёт`
   1 файл, +76.

Русские заголовки в git не побиты. Между коммитами вклинился чужой `0baa1f723` — это не моё.

---

## Долг / Blockers

**Исправления к досье** (правится ДОСЬЕ, не код):

1. `RECON_DOSSIER.md:315` про `documentQuery.ts:190` — строка и текст верны, но тяжесть занижена.
   Это не «нет реального подписанта», а полный отказ выдачи (22P02). Формулировку стоит усилить.
2. Досье вообще не упоминает `documentQuery.ts:236` `voidedByUserId: "doctor"` — тот же дефект
   в аннулировании. Исправлено в этом же пакете.
3. `RECON_DOSSIER.md:321` утверждает, что все четыре копии `getDefaultOrganizationId()` возвращают
   захардкоженный UUID. Это ВЕРНО ЛИШЬ ДЛЯ ОДНОЙ: `pricelistQuery.ts:12`, и только в ветке
   `useInMemory()`. `billingQuery.ts:14`, `imagingQuery.ts:148` и `documentQuery.ts:81` делают
   `SELECT ... FROM organizations LIMIT 1` — тоже нарушение изоляции арендаторов («первая
   организация в таблице»), но UUID там не захардкожен. Формулировку надо развести.
4. Копия в `documentQuery.ts` — **подтверждаю: вызывающих ноль**. Единственный импорт любой из
   копий — `clinicalQuery.ts:13`, и он берёт её из `pricelistQuery.js`. Не удалял, как указано.
   Строка сместилась `:80 -> :81` из-за добавленного мной импорта zod.
5. Бриф говорит, что `check-encoding.mjs` красный на одном файле
   (`smoke-visit-workflow-forms-lifecycle.mjs`). Фактически записей 27 — среди них
   `script.cjs`, `scratch_screenshot_visit2.cjs`, `smoke-document-issue-chains.mjs`,
   `smoke-tax-knd-xml.mjs`, `smoke-patient-forms-lifecycle.mjs` и другие. Базовая линия хуже
   заявленной. Ни один из них не мой.

**Найдено, НЕ исправлено:**

6. `.agents/DOCUMENTS_LIFECYCLE.md:59` обещает, что аттестация подписи содержит «Signatory user ID
   and full name» и «IP address and PIN pad authentication checksum». В реальной схеме
   `documentIssueSignatureAttestationSchema` (`packages/shared/src/index.ts:3942-3956`) НЕТ ни
   идентификатора пользователя, ни IP, ни контрольной суммы PIN — только `staffFullName` и
   `staffRole` свободным текстом. Документ описывает несуществующие поля. Не мой пакет: правка
   схемы задела бы P2 (`db/schema.ts`) и общий пакет.
7. Политический вопрос для следующего пакета: обязать ли выдачу и аннулирование документа входом
   сотрудника (`requireStaffIdentity` -> 401 вместо `null`). Сейчас юридический документ можно
   выдать с одним лишь токеном кабинета, и подписант останется пустым. Это смена политики
   доступа, требующая продуктового решения, а не дефект — поэтому здесь не делалась.
8. `documentQuery.ts:16` импортирует `randomUUID`, `:3` импортирует `inArray` — оба, судя по
   всему, не используются. Не трогал: вне дефекта, а файл сейчас читают несколько агентов.

**Остатки в dev-базе** (оставлены намеренно как доказательство, лид может удалить):
`generated_documents` содержит ровно 2 строки, обе мои — один `draft` (не выдан, подписант `null`)
и один `voided` `8ae72f8f-a6de-4535-baa6-612530bc0fc2` с реальным подписантом и аннулировавшим.
Плюс HTML-снимок выданного документа в `.dente-data/documents/`.

**Блокеров нет.**
