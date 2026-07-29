# MM7 — перепись идиом авторизации по всем изменяющим маршрутам

Разведка, не правка. Ни один файл кода не изменён намеренно: сведение двух идиом —
решение архитектора, а слепая замена охранника открывает данные.

Область: `apps/api/src/routes/**` (без `*.test.ts` и `routes/tests/`), только
изменяющие методы POST / PUT / PATCH / DELETE. Всего **203** регистрации.

---

## 0. ГЛАВНОЕ: ПОСЫЛКА БРИФА НЕВЕРНА (замер против брифа)

Бриф делит мир так: «общие охранники `requireClinical*` = организация проверена»
против «рукописный `verifyToken` = организация забыта». **Это неверно, и ошибка
направлена в опасную сторону.**

`requireClinicalMutationAccess` и `requireClinicalReadAccess`
(`apps/api/src/accessGuard.ts:81` и `:111`) **не проверяют организацию вообще**.
Они сравнивают один заголовок `x-dente-admin-secret` с одним значением
`DENTE_CLINICAL_ADMIN_SECRET` и возвращают `boolean`:

```
apps/api/src/accessGuard.ts:99    if (timingSafeSecretEqual(..., adminSecret)) {
apps/api/src/accessGuard.ts:100     return true;
```

Секрет **глобальный на весь процесс**, а не на клинику
(`security/authSecret.ts:111 clinicalAdminSecret()` читает одну переменную
окружения). То есть `requireClinical*` отвечает на вопрос «есть ли у звонящего
секрет периметра», а НЕ «какая это клиника». Организацию дают только:

* `requireOrganizationId` / `requireResolvedOrganizationId` /
  `requireResolvedStaffOrAdminOrganizationId`,
* `requireClinicalReadContext` / `requireClinicalMutationContext`,
* `requireStaffIdentity`.

Практический вывод, который меняет смысл всей переписи: **наличие
`requireClinical*` в обработчике не является признаком SOUND.** Маршрут с одним
лишь `requireClinical*` и без организации — это ровно тот дефект, который бриф
искал, а не образец для подражания. Поэтому вердикт SOUND здесь присвоен по
наличию ОБЩЕГО ОХРАННИКА ОРГАНИЗАЦИИ, а не по наличию `requireClinical*`.

Это же понимание уже записано в проекте — `accessGuard.ts:190-199` объясняет,
зачем вообще заведены `*Context`-формы: «`requireClinicalReadAccess` /
`requireClinicalMutationAccess` возвращают boolean (пройден ли гейт), а
`organizationId` приходит из другого источника — подписанного токена. Их легко
перепутать».

### Второй неверный пункт брифа: цифра по `visits.ts`

Бриф: «В `routes/visits.ts` было измерено 5 рукописных против 1 общего».
**Замер показывает обратное: в `visits.ts` рукописных НОЛЬ.** Все четыре маршрута
файла (3 изменяющих + 1 GET) уже переведены на общие `*Context`-охранники:

```
apps/api/src/routes/visits.ts:200   requireClinicalMutationContext(... "visit open")
apps/api/src/routes/visits.ts:238   requireClinicalReadContext(...   "visit draft read")
apps/api/src/routes/visits.ts:253   requireClinicalMutationContext(... "visit draft autosave")
apps/api/src/routes/visits.ts:275   requireClinicalMutationContext(... "visit draft accept")
```

Шапка файла (`visits.ts:8-41`) описывает эту замену как уже выполненную и
приходит к тому же выводу, что и раздел 0 выше. Цифра брифа описывает состояние
ДО той правки — она устарела, а не ошибочна по методу.

---

## 1. HANDWRITTEN_RISK с кодами ответа (сперва RISK, как требует бриф)

### 1.1 ПОДТВЕРЖДЕНО ЖИВЫМ ЗАПРОСОМ — `POST /api/communications/tasks/complete`

`apps/api/src/routes/communications.ts:13`. Организация берётся не у звонящего, а
из **первой строки таблицы `organizations`**:

```
apps/api/src/routes/communications.ts:22
    const [org] = await db.select().from(organizations).limit(1);
```

Это тот самый анти-паттерн, который три соседних файла описывают как **уже
исправленный дефект**, — здесь он живой:

* `routes/billing.ts:371` — «БЫЛО: `getDefaultOrganizationId()` — это
  `SELECT id FROM organizations LIMIT 1`. Оплата любой клиники записывалась в
  ПЕРВУЮ организацию таблицы: деньги попадали в чужую кассу».
* `routes/clinical.ts:57` — «Клиника Б проверяла противопоказания по НАБОРУ
  ПРАВИЛ КЛИНИКИ А».
* `routes/ai.ts:90`, `:104`, `:157` — то же.

Последствия при нескольких клиниках в одной базе: любой держатель общего секрета
периметра закрывает задачи связи в ПЕРВОЙ организации независимо от своей
клиники; строка в `communicationEvents` (`communications.ts:44`) пишется с
`organizationId: org.id`, то есть в историю коммуникаций чужой клиники. Клиника,
не являющаяся первой строкой, не может закрыть даже свою задачу — фильтр прибит
к организации №1.

**Контрольные запросы (живой сервер `127.0.0.1:4100`).** Правило кампании
соблюдено: 404 «маршрута нет» и 404 «нет доступа» различены по телу ответа.

| № | Запрос | HTTP | Тело (сокращено) |
|---|---|---|---|
| A | `POST /api/communications/tasks/complete`, тело валидно, **БЕЗ КЛЮЧЕЙ** | **404** | `{"error":"CommunicationTaskNotFound","reason":"task_not_found"}` |
| B | то же + `x-organization-id` **ЧУЖОЙ** организации `1111...1111` | **404** | `{"error":"CommunicationTaskNotFound","reason":"task_not_found"}` |
| C | `POST /api/communications/tasks/complete-nope` (заведомо отсутствующий путь) | 404 | `{"error":"RouteNotFound",...}` |
| D | `GET` по тому же пути (метод не зарегистрирован) | 404 | `{"error":"RouteNotFound",...}` |
| E | **Сравнение идиом:** `DELETE /api/clinical/rules/<uuid>` (общий охранник), БЕЗ КЛЮЧЕЙ | **401** | `{"error":"AuthRequired","message":"Требуется авторизация рабочего кабинета клиники."}` |

Что доказывают эти пять строк вместе:

1. A против C/D — **тела разные**. `CommunicationTaskNotFound` бросается
   `communications.ts:32` уже ВНУТРИ `db.transaction` после `tx.select()`.
   Значит маршрут существует, обработчик выполнился, организация была найдена
   (иначе была бы 500 `NoOrganizationFound`, `communications.ts:23`) и база была
   опрошена — для запроса **без единого ключа**.
2. B — заголовок чужой организации ничего не меняет: организация в этом
   обработчике не зависит от звонящего вообще.
3. E — тот же сервер, то же отсутствие ключей, идиома общего охранника отвечает
   **401** и до базы не доходит. Разница 401 против 404-после-запроса-в-базу и
   есть разница между двумя идиомами, замеренная, а не вычитанная.

Замечание об этом стенде: A вернула 404, а не 403, потому что на запущенном
сервере `DENTE_CLINICAL_ADMIN_SECRET` не задан и включён режим без проверки —
`requireClinicalMutationAccess` пропустил запрос по ветке
`accessGuard.ts:88 clinicalMutationsUnguardedAllowed()`. Анонимность — артефакт
dev-конфигурации, **но дефект от неё не зависит**: организация не выводится из
звонящего ни при каком значении секрета, поэтому в production с заданным секретом
любая клиника-держатель секрета всё равно попадает в организацию №1.

### 1.2 СТАТИЧЕСКИ, БЕЗ РАНТАЙМ-ДОКАЗАТЕЛЬСТВА — контрольный контур Telegram

Шесть изменяющих маршрутов `routes/telegram.ts` выбирают арендатора **по данным
клиента** — `organizationId` из строки запроса или тела, — за одним лишь общим
секретом периметра `requireTelegramControlPlaneAccess` (`telegram.ts:1494`,
организацию не даёт):

| Файл:строка | Маршрут | Откуда организация |
|---|---|---|
| `telegram.ts:2680` | `PUT /api/settings/telegram` | глобальные настройки процесса |
| `telegram.ts:2718` | `POST /api/telegram/outbox/:itemId/send` | `resolveTelegramOutboxRuntimeScopeFromQuery(request.query)` |
| `telegram.ts:2733` | `POST /api/telegram/outbox/send-due` | то же, из query |
| `telegram.ts:2750` | `POST /api/telegram/link-codes` | `input.organizationId` из тела |
| `telegram.ts:2829` | `POST /api/telegram/chat-links/:linkId/revoke` | из тела/query |
| `telegram.ts:2854` | `POST /api/telegram/messages/preview` | из query |

`telegram.ts:1455` передаёт `scope.organizationId` прямо в
`resolveTelegramRuntimeContext` — то есть отправитель называет клинику сам. Это
ровно тот класс, который `security/identity.ts:4-8` закрыл для заголовка
`x-organization-id`.

**Рантайм-доказательства НЕТ, и я это не выдаю за проверенное.** Все три пробы
уперлись в закрытый периметр раньше разбора организации:

| Запрос (без ключей) | HTTP | Тело |
|---|---|---|
| `POST /api/telegram/link-codes` с чужим `organizationId` в теле | **503** | `{"error":"TelegramAdminSecretMissing",...}` |
| `POST /api/telegram/outbox/send-due?organizationId=1111...` | **503** | `{"error":"TelegramAdminSecretMissing",...}` |
| `PUT /api/settings/telegram` | **503** | `{"error":"TelegramAdminSecretMissing",...}` |

Гейт закрылся (fail closed) — это правильное поведение, но оно же не даёт
проверить поведение за гейтом без секрета. Вердикт по этим шести:
**HANDWRITTEN_RISK по чтению исходника, не подтверждён запросом.**

### 1.3 Остальные HANDWRITTEN_RISK: границы арендатора нет

Из 55 маршрутов с вердиктом HANDWRITTEN_RISK организацию **не с чем спутать** у
48: пересекать нечего.

* **16 — аутентификация и публичные по замыслу.** `auth.ts` (7: login, register,
  set-password, set-pin, setup/init, invites/accept), `portal.ts` (2: OTP
  пациента), `publicBooking.ts:584` (`/:organizationId/book` — организация в пути
  и есть смысл маршрута), вебхуки провайдеров `telephony.ts` (2), `vk.ts`,
  `max.ts`, `communicationReceipts.ts` (2: квитанции smsru/smsc). У входа в
  систему организация — это РЕЗУЛЬТАТ, а не вход; требовать её до логина нельзя.
* **32 — доступа к данным нет вовсе.** Вычисление без базы за секретом
  периметра: `imaging.ts` (10 DICOM-манифестов, предпросмотров и проверок),
  `smartImports.ts` (4 разведки локальных источников), `speech.ts` (2),
  `ai.ts` (2 персонализации), `egisz.ts:123` (проверка СНИЛС),
  `ingestion.ts:30`. Утечь чужой строкой они не могут — строк они не читают.
* **4 — заглушки и запрет-всем**, разобраны в разделе 4.

---

## 2. ИТОГОВЫЙ СЧЁТ ПО ТРЁМ ВЕРДИКТАМ

| Вердикт | Количество |
|---|---|
| **SOUND** — общий охранник организации, арендатор из подписанного токена | **111** |
| **HANDWRITTEN_OK** — организация проверена, но рукописным кодом (долг стиля) | **37** |
| **HANDWRITTEN_RISK** — организация НЕ установлена в обработчике | **55** |
| **ВСЕГО** | **203** |

Разбор 55 HANDWRITTEN_RISK по наличию границы арендатора — **обязательная
оговорка, без которой счёт вводит в заблуждение**:

| Подгруппа RISK | Кол-во | Чем это является |
|---|---|---|
| Трогает данные арендатора **и границу можно пересечь** | **3** | 1 подтверждён запросом (`communications.ts`), 2 статически (`telegram` outbox: send, send-due) |
| Контрольный контур Telegram без обращения к базе | 4 | статически RISK (`settings/telegram`, `link-codes`, `chat-links/revoke`, `messages/preview`) |
| Аутентификация / публичные / вебхуки провайдеров | 16 | организация — результат или часть публичного контракта |
| Данных не касается (вычисление за секретом периметра) | 32 | утечь нечем |

**Называть 55 «потенциальным доступом в чужую клинику» было бы неправдой.**
Пересекаемых границ — 7 маршрутов (3 + 4), и из них живым запросом подтверждён
**один**: `communications.ts:13`.

Приоритетные разделы брифа (клиника, деньги, документы) прошли перепись **чисто**:

| Файл | Изменяющих | Вердикт |
|---|---|---|
| `routes/clinical.ts` | 6 | 6 SOUND |
| `routes/billing.ts` | 1 | 1 SOUND (`requireResolvedOrganizationId`) |
| `routes/documents/*.ts` | 5 | 5 SOUND (create, issue, sign, sign-ukep, void) |
| `routes/visits.ts` | 3 | 3 SOUND |
| `routes/finance_family.ts` | 5 | 5 SOUND |
| `routes/insurance.ts` | 3 | 3 SOUND (`requireResolvedStaffOrAdminOrganizationId`) |
| `routes/patients.ts` | 10 | 10 HANDWRITTEN_OK (`requireClinicOrganizationId`, `patients.ts:327`) |
| `routes/schedule.ts` | 3 | 3 HANDWRITTEN_OK (`verifyToken` внутри обработчика) |

---

## 3. КОМАНДА, КОТОРОЙ СОБРАН СПИСОК (дословно, для повтора)

Перепись населения — 203 регистрации. Привязка к получателю Fastify
обязательна: она отсекает Drizzle `db.delete(table)` и `Map.delete(key)`, которые
дают ложные срабатывания.

```bash
cd /c/Clinic_MVP/dental-crm
rg --no-heading -g '!node_modules' -g '!dist' -g '!.git' -g '!*.test.ts' -n \
   -e '\b(app|server|fastify|instance|router)\.(post|put|patch|delete)\b' \
   apps/api/src/routes/ | wc -l          # -> 203
```

Объявления и все вызывающие обоих идиом:

```bash
rg --no-heading -g '!node_modules' -g '!dist' -g '!.git' -n \
   -e 'requireClinical|requireOrganizationId|requireResolved|requireStaffIdentity' \
   apps/api/src/                          # общие охранники
rg --no-heading -g '!node_modules' -g '!dist' -g '!*.test.ts' -c \
   -e 'verifyToken' apps/api/src/routes/   # рукописная идиома
```

Живой анти-паттерн «первая строка organizations»:

```bash
rg --no-heading -g '!node_modules' -g '!dist' -g '!*.test.ts' -n \
   -e 'from\(organizations\)[\s\S]{0,80}?limit\(1\)|getDefaultOrganizationId' \
   apps/api/src --multiline
```

**Оговорка о методе, важная для повторяемости.** Вердикт по каждому маршруту
нельзя получить одной `rg`: охранник может стоять в `preHandler` в объекте опций
(так сделаны 6 маршрутов `telegram.ts`), может быть локальной обёрткой файла
(`requireSettingsAccess`, `requireClinicOrganizationId`,
`requireDicomWebSettingsAccess`, `requirePayoutAccess`), а обработчик может быть
именованной функцией в стороне (`updateAppointmentHandler` в `schedule.ts`,
`rejectMutation` в `audit.ts`). Классификация сделана по **AST TypeScript 5.9.3**
(разбор всего выражения регистрации, включая опции, с разыменованием именованных
обработчиков). Скрипты переписи — только чтение, лежат вне репозитория в
`.tmp/mm7-census*.mjs` / `.tmp/mm7-table.mjs`; воспроизводится так:

```bash
node .tmp/mm7-table.mjs > /tmp/mm7_table.md   # таблица раздела 5
node .tmp/mm7-census4.mjs                     # 203 строки + счёт по вердиктам
```

Две попытки классифицировать регулярным выражением **дали неверные числа и
отброшены**, это стоит записать, чтобы их не повторяли: подсчёт балансом скобок
по сырому тексту ломается на скобках внутри строк и комментариев, а ручное
«обнуление» строк и комментариев рассыпается на регулярных литералах, содержащих
`//` (например `url.replace(/https?:\/\//, "")`) — в `imaging.ts` это дало
рассинхрон на 33 маршрута. Число 203 совпало с AST только после этого.

---

## 4. ПОБОЧНЫЕ НАХОДКИ (не про организации; в очередь, не в этот пакет)

1. **`PUT /api/treatment-plans/:planId/signature` ничего не подписывает.**
   `routes/diary.ts:891-894` — обработчик целиком: `requireClinicalMutationAccess`
   и `return reply.send({ success: true })`. Ни базы, ни `planId`. Врач
   подписывает план лечения, получает «успех», подписи нет нигде. Рядом
   `diary.ts:885` `POST /api/diaries/sync-progress` — такая же заглушка с
   `success: true`.
2. **`requireScheduleMutationAccess` объявлен и не вызывается ни разу.**
   `routes/schedule.ts:137`; во всём `apps/api/src` ровно одно вхождение — само
   объявление. Секрета периметра на изменении расписания нет; изоляцию держит
   только токен кабинета. Мёртвый охранник хуже отсутствующего: и рецензент, и
   поиск по имени находят его в файле. То же у `requireClinicToken`
   (`routes/auth.ts:65`) — одно вхождение, объявление.
3. **`apps/api/src/audit.ts:13`** — ещё одна живая `organizations ... limit(1)`
   вне `routes/` (файл не мой, в перепись не входит).
4. **Инвертированный предикат безопасности, 4 копии.** `accessGuard.ts:42-50`
   перечисляет их и просит переписать на `unguardedBypassAllowed`. Замер: все
   четыре ещё на месте — `imaging.ts` (`dicomWebSettingsUnguardedAllowed`),
   `schedule.ts:133`, `settings.ts:555`, `telegram.ts:1490`. Все читают
   `NODE_ENV !== "production"`, то есть истинны при НЕЗАДАННОМ `NODE_ENV`, а
   `npm start` его не задаёт.
5. **`insurance.ts:246`** — `UPDATE ... WHERE id = contractId` без предиката
   организации. Сейчас безопасно: выше стоит `SELECT` с фильтром по организации и
   404. Но сам UPDATE не самодостаточен — снятие проверки выше открывает запись в
   чужой договор.
6. **`POST /api/settings/reset-demo` и `reset-zero`** (`settings.ts:1228`, `:1232`)
   — без охранника вообще, отвечают `{success: true}` и не делают ничего.
   Достижимы анонимно; врут об успехе.

---

## 5. ПОЛНАЯ ПЕРЕПИСЬ: 203 ИЗМЕНЯЮЩИХ МАРШРУТА

Сортировка: сперва HANDWRITTEN_RISK, затем HANDWRITTEN_OK, затем SOUND; внутри
вердикта — приоритетные файлы брифа (клиника, деньги, документы) первыми.
Колонка «Периметр» — общий секрет, организацию не дающий. Колонка «Данные» —
доходит ли обработчик до строк арендатора.

| Вердикт | Файл:строка | Метод | Путь | Источник организации | Периметр | Данные |
|---|---|---|---|---|---|---|
| HANDWRITTEN_RISK | `apps/api/src/routes/lab.ts:302` | POST | `/api/portal/lab-order/:token/status` | NONE | - | tenant data |
| HANDWRITTEN_RISK | `apps/api/src/routes/imaging.ts:6224` | POST | `/api/imaging/visiograph-ai` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/imaging.ts:6275` | POST | `/api/imaging/dicomweb/check` | NONE | requireDicomWebSettingsAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/imaging.ts:6287` | POST | `/api/imaging/dicom/viewer-launch-manifest` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/imaging.ts:6299` | POST | `/api/imaging/dicom/viewer-tool-state` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/imaging.ts:6311` | POST | `/api/imaging/dicom/render-cache-plan` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/imaging.ts:6323` | POST | `/api/imaging/dicom/workstation-readiness` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/imaging.ts:6335` | POST | `/api/imaging/dicom/viewer-workbench-manifest` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/imaging.ts:6388` | POST | `/api/imaging/dicom/local-folder-discovery` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/imaging.ts:6400` | POST | `/api/imaging/local-organizer/scan-preview` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/imaging.ts:6427` | POST | `/api/imaging/dicom/first-frame-preview` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/diary.ts:885` | POST | `/api/diaries/sync-progress` | NONE | requireClinicalMutationAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/diary.ts:891` | PUT | `/api/treatment-plans/:planId/signature` | NONE | requireClinicalMutationAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/communications.ts:13` | POST | `/api/communications/tasks/complete` | NONE | requireClinicalMutationAccess | tenant data |
| HANDWRITTEN_RISK | `apps/api/src/routes/ai.ts:185` | POST | `/api/ai/treatment-plan-personalize` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/ai.ts:198` | POST | `/api/ai/post-visit-personalize` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/audit.ts:74` | DELETE | `/api/audit/logs` | NONE | - | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/audit.ts:75` | DELETE | `/api/audit/logs/:id` | NONE | - | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/audit.ts:76` | PUT | `/api/audit/logs/:id` | NONE | - | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/audit.ts:77` | PATCH | `/api/audit/logs/:id` | NONE | - | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/auth.ts:81` | POST | `/api/auth/clinic/login` | NONE | - | AUTH (org is the result of login, not an input) |
| HANDWRITTEN_RISK | `apps/api/src/routes/auth.ts:278` | POST | `/api/auth/clinic/set-password` | NONE | - | AUTH (org is the result of login, not an input) |
| HANDWRITTEN_RISK | `apps/api/src/routes/auth.ts:338` | POST | `/api/auth/staff/set-pin` | NONE | - | AUTH (org is the result of login, not an input) |
| HANDWRITTEN_RISK | `apps/api/src/routes/auth.ts:400` | POST | `/api/auth/setup/init` | NONE | - | AUTH (org is the result of login, not an input) |
| HANDWRITTEN_RISK | `apps/api/src/routes/auth.ts:467` | POST | `/api/auth/register` | NONE | - | AUTH (org is the result of login, not an input) |
| HANDWRITTEN_RISK | `apps/api/src/routes/auth.ts:511` | POST | `/api/auth/login` | NONE | - | AUTH (org is the result of login, not an input) |
| HANDWRITTEN_RISK | `apps/api/src/routes/auth.ts:631` | POST | `/api/auth/invites/accept` | NONE | - | AUTH (org is the result of login, not an input) |
| HANDWRITTEN_RISK | `apps/api/src/routes/communicationReceipts.ts:76` | POST | `/api/communications/receipts/smsru` | NONE | - | WEBHOOK (SMS provider delivery receipt) |
| HANDWRITTEN_RISK | `apps/api/src/routes/communicationReceipts.ts:109` | POST | `/api/communications/receipts/smsc` | NONE | - | WEBHOOK (SMS provider delivery receipt) |
| HANDWRITTEN_RISK | `apps/api/src/routes/egisz.ts:123` | POST | `/api/clinical/egisz/validate-doctor-snils` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/ingestion.ts:30` | POST | `/api/ingestion/extract` | NONE | requireClinicalMutationAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/max.ts:253` | POST | `/api/max/webhook` | NONE | - | WEBHOOK (provider callback) |
| HANDWRITTEN_RISK | `apps/api/src/routes/portal.ts:256` | POST | `/auth/send-otp` | NONE | - | AUTH (patient portal OTP) |
| HANDWRITTEN_RISK | `apps/api/src/routes/portal.ts:476` | POST | `/auth/verify-otp` | NONE | - | AUTH (patient portal OTP) |
| HANDWRITTEN_RISK | `apps/api/src/routes/publicBooking.ts:584` | POST | `/:organizationId/book` | NONE | - | PUBLIC (org named in the path by design) |
| HANDWRITTEN_RISK | `apps/api/src/routes/settings.ts:1228` | POST | `/api/settings/reset-demo` | NONE | - | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/settings.ts:1232` | POST | `/api/settings/reset-zero` | NONE | - | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/smartImports.ts:5609` | POST | `/api/imports/smart/local-source-discovery` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/smartImports.ts:5621` | POST | `/api/imports/smart/local-source-workup` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/smartImports.ts:5633` | POST | `/api/imports/smart/local-source-probe` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/smartImports.ts:5678` | POST | `/api/imports/smart/clinic-public-lookup` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/speech.ts:316` | POST | `/api/speech/recording-strategy` | NONE | requireClinicalReadAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/speech.ts:321` | POST | `/api/speech/polish-transcript` | NONE | requireClinicalMutationAccess | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/telegram.ts:2641` | POST | `/api/telegram/webhook` | NONE | - | tenant data |
| HANDWRITTEN_RISK | `apps/api/src/routes/telegram.ts:2642` | POST | `/api/telegram/webhook/:organizationId/:botConfigId` | NONE | - | tenant data |
| HANDWRITTEN_RISK | `apps/api/src/routes/telegram.ts:2643` | POST | `/api/telegram/webhook/:organizationId` | NONE | - | tenant data |
| HANDWRITTEN_RISK | `apps/api/src/routes/telegram.ts:2680` | PUT | `/api/settings/telegram` | NONE | - | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/telegram.ts:2718` | POST | `/api/telegram/outbox/:itemId/send` | NONE | - | tenant data |
| HANDWRITTEN_RISK | `apps/api/src/routes/telegram.ts:2733` | POST | `/api/telegram/outbox/send-due` | NONE | - | tenant data |
| HANDWRITTEN_RISK | `apps/api/src/routes/telegram.ts:2750` | POST | `/api/telegram/link-codes` | NONE | - | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/telegram.ts:2829` | POST | `/api/telegram/chat-links/:linkId/revoke` | NONE | - | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/telegram.ts:2854` | POST | `/api/telegram/messages/preview` | NONE | - | no data access |
| HANDWRITTEN_RISK | `apps/api/src/routes/telephony.ts:12` | POST | `/:organizationId/webhook` | NONE | - | WEBHOOK (provider callback, org in path) |
| HANDWRITTEN_RISK | `apps/api/src/routes/telephony.ts:109` | POST | `/:organizationId/sms/webhook` | NONE | - | WEBHOOK (provider callback, org in path) |
| HANDWRITTEN_RISK | `apps/api/src/routes/vk.ts:19` | POST | `/api/public/:organizationId/vk/webhook` | NONE | - | WEBHOOK (provider callback, org in path) |
| HANDWRITTEN_OK | `apps/api/src/routes/patients.ts:363` | POST | `/api/patients` | requireClinicOrganizationId | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/patients.ts:401` | PUT | `/api/patients/:patientId` | requireClinicOrganizationId | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/patients.ts:433` | PUT | `/api/patients/:patientId/administrative-profile` | requireClinicOrganizationId | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/patients.ts:593` | POST | `/api/patients/:patientId/reclamations` | requireClinicOrganizationId | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/patients.ts:646` | PUT | `/api/patients/:patientId/reclamations/:reclamationId` | requireClinicOrganizationId | - | no data access |
| HANDWRITTEN_OK | `apps/api/src/routes/patients.ts:689` | DELETE | `/api/patients/:patientId/reclamations/:reclamationId` | requireClinicOrganizationId | - | no data access |
| HANDWRITTEN_OK | `apps/api/src/routes/patients.ts:766` | POST | `/api/patients/:patientId/tickets` | requireClinicOrganizationId | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/patients.ts:831` | PUT | `/api/patients/:patientId/tickets/:ticketId` | requireClinicOrganizationId | - | no data access |
| HANDWRITTEN_OK | `apps/api/src/routes/patients.ts:874` | DELETE | `/api/patients/:patientId/tickets/:ticketId` | requireClinicOrganizationId | - | no data access |
| HANDWRITTEN_OK | `apps/api/src/routes/patients.ts:937` | POST | `/api/patients/:patientId/archive-status` | requireClinicOrganizationId | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/ai.ts:304` | POST | `/api/ai/predict-no-show` | verifyToken (inline) | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/auth.ts:175` | POST | `/api/auth/staff/unlock` | verifyToken (inline) | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/auth.ts:568` | POST | `/api/auth/invites/create` | verifyToken (inline) | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/auth.ts:706` | POST | `/api/auth/user/update-password` | verifyToken (inline) | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/auth.ts:732` | POST | `/api/auth/user/update-pin` | verifyToken (inline) | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/schedule.ts:167` | POST | `/api/appointments` | verifyToken (inline) | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/schedule.ts:243` | PATCH | `/api/appointments/:appointmentId` | verifyToken (inline) | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/schedule.ts:244` | PUT | `/api/schedule/appointments/:appointmentId` | verifyToken (inline) | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:628` | PUT | `/api/settings/preferences` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:641` | POST | `/api/settings/clinic/mode` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:653` | PUT | `/api/settings/clinic/profile` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:669` | POST | `/api/settings/staff` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:684` | POST | `/api/settings/staff/:staffId/credentials` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:710` | PUT | `/api/settings/staff/:staffId/working-hours` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:745` | PUT | `/api/settings/staff/:staffId` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:788` | DELETE | `/api/settings/staff/:staffId` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:839` | PUT | `/api/settings/staff/:staffId/commission` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:882` | POST | `/api/settings/chairs` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:895` | PUT | `/api/settings/chairs/:chairId/working-hours` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:926` | PUT | `/api/settings/chairs/:chairId` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:967` | DELETE | `/api/settings/chairs/:chairId` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:1013` | POST | `/api/settings/catalog` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:1040` | PUT | `/api/settings/catalog/:serviceId` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:1089` | DELETE | `/api/settings/catalog/:serviceId` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:1128` | POST | `/api/settings/protocols` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:1155` | PUT | `/api/settings/protocols/:templateId` | requireSettingsAccess | - | tenant data |
| HANDWRITTEN_OK | `apps/api/src/routes/settings.ts:1204` | DELETE | `/api/settings/protocols/:templateId` | requireSettingsAccess | - | tenant data |
| SOUND | `apps/api/src/routes/clinical.ts:51` | POST | `/api/clinical/rules/evaluate` | requireOrganizationId | requireClinicalReadAccess | tenant data |
| SOUND | `apps/api/src/routes/clinical.ts:80` | POST | `/api/clinical/rules` | requireOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/clinical.ts:92` | PATCH | `/api/clinical/rules/:ruleId` | requireOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/clinical.ts:124` | DELETE | `/api/clinical/rules/:ruleId` | requireOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/clinical.ts:151` | POST | `/api/clinical/phase-completions` | requireOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/clinical.ts:386` | POST | `/api/hr/recent-patients` | requireStaffIdentity | - | no data access |
| SOUND | `apps/api/src/routes/billing.ts:357` | POST | `/api/billing/payments` | requireResolvedOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/finance_family.ts:233` | POST | `/api/finance/family` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/finance_family.ts:291` | PUT | `/api/finance/family/:id` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/finance_family.ts:351` | DELETE | `/api/finance/family/:id` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/finance_family.ts:394` | POST | `/api/finance/family/pay` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/finance_family.ts:526` | POST | `/api/finance/family/topup` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/documents/create.ts:60` | POST | `/api/documents` | requireOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/documents/issue.ts:55` | POST | `/api/documents/:id/issue` | requireOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/documents/sign.ts:8` | POST | `/api/documents/:id/sign` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/documents/signUkep.ts:8` | POST | `/api/documents/:id/sign-ukep` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/documents/void.ts:59` | POST | `/api/documents/:id/void` | requireOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/visits.ts:199` | POST | `/api/appointments/:appointmentId/visit` | requireClinicalMutationContext | - | tenant data |
| SOUND | `apps/api/src/routes/visits.ts:252` | PUT | `/api/visits/:visitId/draft/autosave` | requireClinicalMutationContext | - | tenant data |
| SOUND | `apps/api/src/routes/visits.ts:274` | POST | `/api/visits/:visitId/draft/accept` | requireClinicalMutationContext | - | tenant data |
| SOUND | `apps/api/src/routes/odontogram.ts:226` | POST | `/api/patients/:patientId/tooth-states/batch` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/odontogram.ts:368` | POST | `/api/patients/:patientId/treatment-plans` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/xray.ts:99` | POST | `/api/xray/scans` | requireOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/xray.ts:144` | POST | `/api/xray/scans/:id/analyze` | requireOrganizationId | requireClinicalReadAccess | tenant data |
| SOUND | `apps/api/src/routes/xray.ts:249` | DELETE | `/api/xray/scans/:id` | requireOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/lab.ts:78` | POST | `/api/clinical/lab-orders` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/lab.ts:174` | PUT | `/api/clinical/lab-orders/:id` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/lab.ts:251` | DELETE | `/api/clinical/lab-orders/:id` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/imaging.ts:6239` | POST | `/api/imaging/imports/preview` | requireOrganizationId | requireClinicalReadAccess | tenant data |
| SOUND | `apps/api/src/routes/imaging.ts:6257` | POST | `/api/imaging/dicom/series-preview` | requireOrganizationId | requireClinicalReadAccess | tenant data |
| SOUND | `apps/api/src/routes/imaging.ts:6347` | POST | `/api/imaging/dicom/workbench-bundles` | requireOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/imaging.ts:6412` | POST | `/api/imaging/dicom/folder-series-preview` | requireOrganizationId | requireClinicalReadAccess | tenant data |
| SOUND | `apps/api/src/routes/imaging.ts:6439` | POST | `/api/imaging/dicom/folder-workup-plan` | requireOrganizationId | requireClinicalReadAccess | no data access |
| SOUND | `apps/api/src/routes/imaging.ts:6454` | POST | `/api/imaging/imports/commit` | requireOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/imaging.ts:6472` | POST | `/api/imaging/folders/scan-preview` | requireOrganizationId | requireClinicalReadAccess | tenant data |
| SOUND | `apps/api/src/routes/imaging.ts:6538` | PUT | `/api/imaging/studies/:id/viewer-session` | requireOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/imaging.ts:6565` | POST | `/api/imaging/studies` | requireOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/imaging.ts:6614` | POST | `/api/imaging/studies/:id/analyze` | requireOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/insurance.ts:89` | POST | `/api/insurance/contracts` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/insurance.ts:162` | PUT | `/api/insurance/contracts/:contractId` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/insurance.ts:273` | DELETE | `/api/insurance/contracts/:contractId` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/inventory.ts:74` | POST | `/:organizationId` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/inventory.ts:152` | PATCH | `/:organizationId/:itemId/stock` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/inventory.ts:312` | PUT | `/:organizationId/:itemId` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/inventory.ts:408` | DELETE | `/:organizationId/:itemId` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/inventory.ts:497` | POST | `/:organizationId/rules` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/inventory.ts:588` | DELETE | `/:organizationId/rules/:ruleId` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/pricelist.ts:26` | POST | `/api/pricelist/analyze` | requireResolvedOrganizationId | requireClinicalReadAccess | tenant data |
| SOUND | `apps/api/src/routes/diary.ts:483` | POST | `/api/diaries` | resolveOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/diary.ts:669` | POST | `/api/diaries/:id/lock` | resolveOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/diary.ts:773` | POST | `/api/diaries/:id/revise` | resolveOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/ai.ts:103` | POST | `/api/ai/recognition-jobs` | requireResolvedOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/ai.ts:156` | POST | `/api/ai/visit-note-draft` | requireResolvedOrganizationId | requireClinicalReadAccess | tenant data |
| SOUND | `apps/api/src/routes/ai.ts:217` | POST | `/api/ai/parse-dictation` | resolveOrganizationId | requireClinicalReadAccess | tenant data |
| SOUND | `apps/api/src/routes/communicationsOutbox.ts:237` | POST | `/api/communications/templates` | requireClinicalMutationContext | - | tenant data |
| SOUND | `apps/api/src/routes/communicationsOutbox.ts:272` | PATCH | `/api/communications/templates/:templateId` | requireClinicalMutationContext | - | tenant data |
| SOUND | `apps/api/src/routes/communicationsOutbox.ts:317` | POST | `/api/communications/templates/preview` | requireClinicalReadContext | - | no data access |
| SOUND | `apps/api/src/routes/communicationsOutbox.ts:362` | PUT | `/api/communications/settings` | requireClinicalMutationContext | - | tenant data |
| SOUND | `apps/api/src/routes/communicationsOutbox.ts:463` | PUT | `/api/communications/consents/:patientId` | requireClinicalMutationContext | - | tenant data |
| SOUND | `apps/api/src/routes/communicationsOutbox.ts:562` | POST | `/api/communications/outbox` | requireClinicalMutationContext | - | tenant data |
| SOUND | `apps/api/src/routes/communicationsOutbox.ts:635` | POST | `/api/communications/outbox/:outboxId/cancel` | requireClinicalMutationContext | - | tenant data |
| SOUND | `apps/api/src/routes/communicationsOutbox.ts:666` | POST | `/api/communications/outbox/:outboxId/retry` | requireClinicalMutationContext | - | tenant data |
| SOUND | `apps/api/src/routes/communicationsOutbox.ts:700` | POST | `/api/communications/outbox/dispatch` | requireClinicalMutationContext | - | no data access |
| SOUND | `apps/api/src/routes/communicationsOutbox.ts:720` | POST | `/api/communications/reminders/run` | requireClinicalMutationContext | - | no data access |
| SOUND | `apps/api/src/routes/communicationsOutbox.ts:760` | POST | `/api/communications/campaigns` | requireClinicalMutationContext | - | no data access |
| SOUND | `apps/api/src/routes/communicationsOutbox.ts:810` | POST | `/api/communications/campaigns/:campaignId/launch` | requireClinicalMutationContext | - | no data access |
| SOUND | `apps/api/src/routes/communicationsOutbox.ts:831` | POST | `/api/communications/campaigns/:campaignId/cancel` | requireClinicalMutationContext | - | no data access |
| SOUND | `apps/api/src/routes/files.ts:24` | POST | `/api/patients/:patientId/attachments` | requireResolvedOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/files.ts:143` | POST | `/api/files/visits/:visitId/attachments` | requireResolvedOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/imaging_planning.ts:23` | POST | `/api/imaging/planning/save` | requireResolvedOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/imports.ts:323` | POST | `/api/imports/patients/intake` | requireClinicalReadContext | - | tenant data |
| SOUND | `apps/api/src/routes/imports.ts:337` | POST | `/api/imports/patients/preview` | requireClinicalReadContext | - | tenant data |
| SOUND | `apps/api/src/routes/imports.ts:351` | POST | `/api/imports/patients/commit` | requireClinicalMutationContext | - | tenant data |
| SOUND | `apps/api/src/routes/leads.ts:50` | POST | `/api/leads` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/leads.ts:70` | PATCH | `/api/leads/:id/status` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/leads.ts:106` | PUT | `/api/leads/:id` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/leads.ts:132` | DELETE | `/api/leads/:id` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/leads.ts:156` | POST | `/api/leads/:id/convert` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/max.ts:140` | PUT | `/api/max/settings` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/max.ts:300` | POST | `/api/max/send` | requireResolvedOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/migration.ts:100` | POST | `/api/migration/analyze` | requireClinicalReadContext | - | no data access |
| SOUND | `apps/api/src/routes/migration.ts:126` | POST | `/api/migration/run` | requireClinicalMutationContext | - | no data access |
| SOUND | `apps/api/src/routes/migration.ts:277` | POST | `/api/migration/rollback` | requireClinicalMutationContext | - | no data access |
| SOUND | `apps/api/src/routes/migrationRuns.ts:199` | POST | `/api/migration/upload` | requireClinicalMutationContext | - | tenant data |
| SOUND | `apps/api/src/routes/migrationRuns.ts:316` | POST | `/api/migration/:runId/map` | requireClinicalMutationContext | - | no data access |
| SOUND | `apps/api/src/routes/migrationRuns.ts:360` | POST | `/api/migration/:runId/stage` | requireClinicalMutationContext | - | no data access |
| SOUND | `apps/api/src/routes/migrationRuns.ts:391` | POST | `/api/migration/:runId/execute` | requireClinicalMutationContext | - | no data access |
| SOUND | `apps/api/src/routes/migrationRuns.ts:566` | POST | `/api/migration/discover` | requireClinicalMutationContext | - | no data access |
| SOUND | `apps/api/src/routes/migrationRuns.ts:643` | POST | `/api/migration/dicom/inspect` | requireClinicalMutationContext | - | no data access |
| SOUND | `apps/api/src/routes/patientDuplicates.ts:99` | POST | `/api/patients/duplicates/merge` | requireClinicalMutationContext | - | no data access |
| SOUND | `apps/api/src/routes/patientDuplicates.ts:133` | POST | `/api/patients/duplicates/dismiss` | requireClinicalMutationContext | - | no data access |
| SOUND | `apps/api/src/routes/patientRecall.ts:67` | POST | `/api/patients/recall-candidates/invite` | requireClinicalMutationContext | - | no data access |
| SOUND | `apps/api/src/routes/smartImports.ts:5595` | POST | `/api/imports/smart/preview` | requireResolvedOrganizationId | requireClinicalReadAccess | no data access |
| SOUND | `apps/api/src/routes/smartImports.ts:5645` | POST | `/api/imports/smart/migration-autopilot` | requireResolvedOrganizationId | requireClinicalReadAccess | no data access |
| SOUND | `apps/api/src/routes/smartImports.ts:5659` | POST | `/api/imports/smart/migration-autopilot/report.csv` | requireResolvedOrganizationId | requireClinicalReadAccess | no data access |
| SOUND | `apps/api/src/routes/smartImports.ts:5690` | POST | `/api/imports/smart/report.csv` | requireResolvedOrganizationId | requireClinicalReadAccess | no data access |
| SOUND | `apps/api/src/routes/smartImports.ts:5709` | POST | `/api/imports/smart/report.safe.csv` | requireResolvedOrganizationId | requireClinicalReadAccess | no data access |
| SOUND | `apps/api/src/routes/smartImports.ts:5728` | POST | `/api/imports/smart/commit` | requireResolvedOrganizationId | requireClinicalMutationAccess | no data access |
| SOUND | `apps/api/src/routes/speech.ts:320` | POST | `/api/speech/transcribe-chunk` | requireClinicalMutationContext | - | tenant data |
| SOUND | `apps/api/src/routes/sterilization.ts:33` | POST | `/api/sterilization/scan` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/sterilization.ts:74` | POST | `/api/sterilization/link` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/templates.ts:99` | POST | `/api/templates` | resolveOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/templates.ts:141` | DELETE | `/api/templates/:id` | resolveOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/templates.ts:174` | POST | `/api/templates/seed` | resolveOrganizationId | requireClinicalMutationAccess | tenant data |
| SOUND | `apps/api/src/routes/waitlist.ts:72` | POST | `/api/waitlist` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/waitlist.ts:166` | PUT | `/api/waitlist/:id` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/waitlist.ts:234` | DELETE | `/api/waitlist/:id` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/whatsapp.ts:181` | PUT | `/api/whatsapp/settings` | requireResolvedStaffOrAdminOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/whatsapp.ts:471` | POST | `/api/whatsapp/send` | requireResolvedOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/workspaceProfile.ts:534` | POST | `/api/workspace/profile` | resolveOrganizationId | - | tenant data |
| SOUND | `apps/api/src/routes/workspaceProfile.ts:590` | POST | `/api/workspace/preset/:name` | resolveOrganizationId | - | tenant data |
