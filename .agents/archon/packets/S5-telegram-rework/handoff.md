# S5-telegram-rework — сдача

HEAD: 3d4090cfccc2bfae927489ce76059abfcd578eeb (мои коммиты: 3c5189471 — код, 1837a7878 — тест)
HEAD на старте пакета: 723e09fa3e237f94a38288f0a89210240a5b96e6 (двигался под мной: ef5f57287,
1837a7878, 3d4090cfc — чужие пакеты коммитили параллельно)

Это доработка R5. Спецификация — `.agents/archon/packets/R5-telegram-time-bugs/review.md`, прочитана
целиком. Ничего не переписано с нуля, коммиты R5 не отменялись. Ниже каждый нумерованный пункт
ревьюера: ЗАКРЫТО / ЗАЯВЛЕННЫЙ ДОЛГ / СПОР С ДОКАЗАТЕЛЬСТВОМ.

---

## Что было сломано (file:line, подтверждено чтением на 723e09fa3)

### 1. `routes/telegram.ts:554-557` — нечитаемое время отправки означало «пора отправлять»
```ts
const scheduledAtMs = Date.parse(item.scheduledAt);
return !Number.isFinite(scheduledAtMs) || scheduledAtMs <= nowMs;
```
Отказ прочитать дату превращался в разрешение отправить немедленно. Для клиники это напоминание на
следующий вторник, пришедшее пациенту сегодня ночью. Значение читалось на `:909` в
`executeDenteTelegramOutboxDueBatch` — и воркер, и `POST /api/telegram/outbox/send-due`.

Тот же fail-open в двух других местах:
- `sampleData.ts:9729-9730` `prepareDenteTelegramOutboxDelivery` —
  `if (Number.isFinite(scheduledAtMs) && scheduledAtMs > Date.now())`: при NaN защита пропускается
  целиком. Последняя линия обороны, она же охраняет ручной роут `POST /outbox/:itemId/send`.
- `apps/web/src/AppHelpers.tsx:2424-2427` `isTelegramOutboxItemDueForUi` — **этого места нет ни в
  отчёте R5, ни в разборе ревьюера**. Потребители: `SettingsTelegramTab.tsx:1075` (кнопка отправки
  `disabled`, когда НЕ пора) и `useAppLogic.tsx:4590-4598` (фильтр «пора»). То есть кнопка отправки
  была активна для позиции, время которой система не смогла прочитать.

### 2. Признак «фото уже у пациента» жил у попытки, а не у позиции (F3 ревьюера)
`findDenteTelegramOutboxDeliveryReceipt` (`sampleData.ts:8776-8786`) — Map по
`${outboxItemId}:${clientMutationId}`; результат подавался в отправку на `telegram.ts:809`.
`sendTelegramOutboxItem` (`useAppLogic.tsx:13140-13143`) берёт новый `crypto.randomUUID()` на каждый
клик, поэтому повтор оператора признака НЕ находил и звал `sendPhoto` заново — пациент получал фото
второй раз, тот самый дефект, который R5 объявил закрытым. Второй промах того же вида:
`dueOutboxClientMutationId(item.id, item.scheduledAt)` (`telegram.ts:549-552`) включает время в хеш,
поэтому сдвиг `scheduledAt` между тиками менял ключ и терял признак.

### 3. `telegram.ts:822-824` против `AppHelpers.tsx:2394-2409` (F2 ревьюера)
`telegram_photo_sent_text_failed` не был заведён в `telegramBlockedReasonLabels`, поэтому
`telegramHumanMessage` (`AppHelpers.tsx:2415-2422`) не находил подпись и возвращал общее «Нужна
проверка настройки Telegram». Оператора отправляли чинить исправные настройки — и именно эта подсказка
заставляет нажать «отправить» второй раз, то есть доставить пациенту фото повторно.

---

## Что изменено

`apps/api/src/routes/telegram.ts` (+115/−9 в 3c5189471)
1. `telegramOutboxScheduleUnreadableBlockedReason = "telegram_outbox_schedule_unreadable"`.
2. `telegramOutboxScheduleState(scheduledAt, nowMs)` — три состояния (`due` / `not_due` /
   `unreadable`) вместо двух. `isDenteTelegramOutboxItemDue` теперь просто
   `telegramOutboxScheduleState(...) === "due"`, то есть fail-CLOSED.
3. Отказ в `executeTelegramOutboxSend` — 409 + причина + русское предупреждение с обрезанным до 64
   символов значением. Стоит ДО проверки `dryRun`, потому что предпросмотр «отправлю» по битому
   времени обманывает так же, как отправка. Через эту функцию идут ОБА входа отправки
   (`POST /outbox/:itemId/send` и `POST /outbox/send-due`), поэтому одно место закрывает оба.
4. `executeDenteTelegramOutboxDueBatch` отдаёт такие позиции в `results` как заблокированные, не
   отправляя их: они попадают в `blockedCount`, в лог воркера и в код ответа роута (409).
   Fail-closed без этого был бы «тихо не отправляем и никому не говорим». `attemptedCount` считает
   только реальные попытки.
5. `telegramOutboxDeliveredPartsForItem(outboxItemId, replay)` — признак ищется по ПОЗИЦИИ среди уже
   экспортированного `denteTelegramOutboxDeliveryReceipts` (`sampleData.ts:243`), поэтому правка
   `sampleData.ts` не потребовалась. Идентификаторы позиций содержат UUID сущностей
   (`sampleData.ts:8617, 8705, 8891, 8938, 9058, 9129, 9257`), поэтому поиск по позиции не
   пересекает организации.

`apps/web/src/AppHelpers.tsx` (+21/−0 в 3c5189471)
6. Подписи для `telegram_photo_sent_text_failed` и `telegram_outbox_schedule_unreadable`.
7. `isTelegramOutboxItemDueForUi` — fail-closed. Потребителей править не потребовалось: кнопка
   отправки сама выключается, позиция сама уходит из фильтра «пора».

`apps/api/src/tests/telegramOutboxPartialDelivery.test.ts` (+167 в 1837a7878) — 10 новых проверок.

Поведение остальных ветвей не менялось: короткая подпись → один вызов; фото отбито → текстовый
вариант; нет фото → только текст; успешная и обычная проваленная квитанции трактуются как раньше.

---

## Разбор ревьюера — каждый пункт

### F1 (BLOCKING, `reachability-overclaim`, telegram.ts:634) — **ЗАКРЫТО: ПРИЗНАЮ, ПЕРЕПРОВЕРИЛ САМ**
Ревьюер прав. Перемерил своим средством (`.tmp/s5-caption-measure.cjs`, только чтение исходников):
самый длинный строковый литерал в `routes/telegram.ts` — 288 символов; худший составной ответ вебхука
— 461 (`careTopicReplyFor`), 352 (`documentSubmenuReplyFor`); абсолютный потолок из двух самых длинных
литералов — 522. Порог подписи 1024 (`telegram.ts:88`). Ветка расщепления из реальной конфигурации не
достигается. Слова R5 исправлены во врезке в его `handoff.md` (пункты 1 и 2), с указанием точных
строк 8 и 19.
**Побочный результат: тем же измерением закрыт и пункт H5 разбора.** `sendWebhookSuggestedReply`
(`telegram.ts:2246-2280`) действительно передаёт `caption: text` без проверки 1024, но потолок этого
пути 522 символа, поэтому 400 от Telegram и потеря визитной карточки тоже недостижимы. Я НЕ расширял
пакет туда — вместо кода предъявляю число.
Что вместо этого закрыто с реальным влиянием: пункт (b) из брифа, прямо предписанный ведущим. Честно:
**(b) тоже латентный** — живого источника нечитаемого значения нет (см. НЕ ПРОВЕРЕНО). Я не выдаю его
за живой. Правило «fail-open на времени отправки не бывает правильным» выполнено безусловно.

### F2 (BLOCKING-ish, `operator-signal-regression`) — **ЗАКРЫТО частично, остаток ЗАЯВЛЕН ДОЛГОМ**
Закрыто: обе причины отказа получили подписи (`AppHelpers.tsx`), поэтому тост больше не отправляет
оператора чинить исправные настройки, а говорит правду — фото у пациента, не ушёл только текст.
Ложное утверждение R5 «оператор видит, что именно лежит у пациента в чате» исправлено во врезке
(пункт 3).
ЗАЯВЛЕННЫЙ ДОЛГ, две части, обе требуют файлов вне моего claim:
- `useAppLogic.tsx:13169` `const reason = telegramHumanMessage(result.blockedReason) || warning;` —
  предупреждения по-прежнему выбрасываются, когда причина непуста. Файл — God Context вне claim.
- квитанционные warnings и `message_id` не рисует ни один компонент; ближайшее место —
  `SettingsTelegramTab.tsx:1020/1111` (рисует `item.warnings`, а не квитанции). Этот файл в зоне
  второго, не-флотского автора (`components/settings/**`), правка запрещена пакетом.

### F3 (`residual-double-send`) — **ЗАКРЫТО (основной путь и вариант со сдвигом), третий вариант ЗАЯВЛЕН ДОЛГОМ**
- Основной путь (новый `crypto.randomUUID()` оператора) — закрыт `telegramOutboxDeliveredPartsForItem`.
  Доказано исполненным тестом: старый вызов `telegramOutboxDeliveredParts(null)` даёт
  `photoDelivered:false` (фото ушло бы второй раз), новый — `true` с сохранённым `message_id`, и
  фактическая последовательность вызовов Telegram равна `["text"]`, ноль `sendPhoto`.
- Вариант «сдвиг `scheduledAt` меняет due-ключ» — закрыт тем же изменением, есть отдельный тест.
- Вариант «`denteTelegramOutboxDeliveryReceipts.splice(200)` (`sampleData.ts:8817`) вытесняет
  квитанцию» — **ЗАЯВЛЕННЫЙ ДОЛГ**. Закрыть можно только новым хранилищем признака на самой позиции
  либо правкой `sampleData.ts` (вне claim). Ревьюер сам отмечает, что этот предел уже держит
  существующий механизм повтора, то есть он не появился в R5. Влияние после моей правки строго
  меньше: раньше признак терялся при каждом клике оператора, теперь только после вытеснения 200
  квитанций.

### F4 (NIT, до этого пакета) — **ЗАЯВЛЕННЫЙ ДОЛГ, подтверждено запуском**
`node scripts/smoke-telegram-control-ui-source.mjs` → **EXIT=1**,
`ENOENT ...apps/api/drizzle/0008_document_payload_storage.sql` (строка 36). Файла нет; нынешний 0008 —
`0008_add_settings.sql`. Не правлю: `migrationSource` используется на `:648` для проверки набора
подстрок, и слепое выбрасывание удалённой миграции из списка может тихо ослабить гейт — нужно найти,
где живёт DDL перенумерованной миграции. Это `scripts/**`, вне claim пакета.
Закрывающая команда: `node scripts/smoke-telegram-control-ui-source.mjs` (должна дать exit 0).

---

## Вопрос о часовом поясе — поправка R5 подтверждена, новой правки не требуется
- Живой ключ дедупликации сводки `sampleData.ts:9129`
  `staff-digest:${appointmentClinicDateKey(now.toISOString())}:${staffId}` — **клинико-локальный**, не
  UTC и не «+4». Поправка R5 к досье §5.7 стоит.
- UTC-ключ `telegram/outbox.ts:75,77` существует, но недостижим: `git grep -n
  "buildDenteTelegramOutboxItems" HEAD -- apps/` на 723e09fa3 даёт только определение
  (`telegram/outbox.ts:19`) и единственного импортёра `telegram/benchmark.ts:2`. Ни одного роута.
  (`dist/` больше не отслеживается с 589d63a4d, поэтому прежний третий результат исчез.)
- Внутри `routes/telegram.ts` UTC-суточной логики нет вовсе: `grep -n "toISOString().split|slice(0,
  10)"` → пусто.
- Долги §1, оба вне claim: `defaultClinicTimezone = "Europe/Samara"` литералом в `sampleData.ts:179`;
  `routes/dayConfirmations.ts:93` `return tomorrow.toISOString().slice(0, 10)` считает «завтра» в UTC,
  хотя остальной модуль работает в поясе клиники. Второй — живой, рекомендую отдельный пакет
  (R5 рекомендовал то же).

---

## ПРОВЕРЕНО

**UNIT VERIFIED** — `node --import tsx --test apps/api/src/tests/telegramOutboxPartialDelivery.test.ts`
→ **TRUE_EXIT=0**, `tests 18 / suites 3 / pass 18 / fail 0`. Часы фиксированные
(`fixedNowMs = Date.parse("2026-07-28T02:00:00+04:00")`), `Date.now()` в новых проверках не зовётся.
Новые 10:
```
✔ часы теста действительно фиксированы
✔ нечитаемое время НЕ считается наступившим — иначе сообщение уходит не в свой день
✔ прошедшее время — пора, будущее — не пора, ровно текущее — пора
✔ состояние считается от переданных часов, а не от системных
✔ повтор с ДРУГИМ clientMutationId находит доставленное фото
✔ повтор оператора с новым mutation id досылает ТОЛЬКО текст — фото второй раз не уходит
✔ сдвиг scheduledAt меняет due-ключ, но признак всё равно находится
✔ квитанция ЧУЖОЙ позиции не отменяет отправку фото
✔ нет ни одной квитанции по позиции — фото обязано уйти
✔ квитанция с message_id предпочтительнее квитанции без него
```
Ни одного обращения к api.telegram.org: отправители внедряются в тот же шов, который в бою получает
настоящие транспортные функции.

**TYPECHECK VERIFIED** — `npm run typecheck -w @dental/api` → **EXIT=0**, ноль ошибок.

**Полный набор API** — `npm test -w @dental/api` → **TRUE_EXIT=0**,
`tests 949 / suites 154 / pass 949 / fail 0`. Ни одного провала. (На разборе ревьюера было 918 —
за ночь добавили тесты другие пакеты и 10 моих. Флак `dayConfirmations`, красневший у R5, сейчас
зелёный.)

**Измерение достижимости (F1)** — `node .tmp/s5-caption-measure.cjs` → EXIT=0. Только чтение
исходников, ничего не пишет, сети нет. Числа приведены в разборе F1 выше.

**F4 подтверждён запуском** — `node scripts/smoke-telegram-control-ui-source.mjs` → EXIT=1, ENOENT.

## НЕ ПРОВЕРЕНО

- **Отказ по нечитаемому времени НЕ прогонялся через живой роут или `app.inject()`.** Проверены
  экспортированные `telegramOutboxScheduleState` и `telegramOutboxDeliveredPartsForItem`; сама
  постановка отказа в `executeTelegramOutboxSend` и выдача заблокированных позиций в пакетном ответе
  — СТАТИЧЕСКИЙ разбор по строкам, не исполнение. Причина, честно: чтобы позиция дошла до
  `deliveryStatus === "ready"`, нужны токен бота в env, активная привязка чата и расшифровываемый
  `chatTransportRef` (ключ шифрования в env). Фикстура, которая это не обеспечит, молча даст
  `blocked` по другой причине и будет «проверять» пустоту — этого делать не стал.
  Закрывающая команда (написать тест, а не запустить существующий): node:test, который поднимает
  Fastify через `registerTelegramRoutes`, задаёт `DENTE_TELEGRAM_ADMIN_SECRET`,
  `DENTE_TELEGRAM_BOT_TOKEN`, `DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY`, сеет пациента + активную привязку
  + `communicationTasks[0].dueAt = "следующий вторник"` и делает
  `app.inject({method:"POST", url:"/api/telegram/outbox/send-due", payload:{dryRun:false, limit:1}})`,
  ожидая 409 и `blockedReason === "telegram_outbox_schedule_unreadable"`.
- **Живой сервер моего кода не исполняет.** API 127.0.0.1:4100 поднят БЕЗ `--watch`; перезапуск
  общего сервера мне запрещён. Закрывающая команда (только ведущий): перезапустить API и вызвать
  `POST /api/telegram/outbox/send-due`.
- **Реальная доставка в Telegram не проверялась и не будет** — запрещено пакетом. Закрывающая команда
  (НЕ запускать без решения ведущего и живого токена клиники):
  `curl -X POST http://127.0.0.1:4100/api/telegram/outbox/send-due -H "x-dente-clinic-token: <token>" -H "content-type: application/json" -d '{"dryRun":false,"limit":1}'`
- **UI не проверял** — это право ведущего. Изменения `AppHelpers.tsx` (подписи и fail-closed) в
  браузере не наблюдались. Закрывающая команда (ведущий): открыть Настройки → Telegram, вкладка
  очереди, и посмотреть подпись отказа и состояние кнопки отправки.
- **DB VERIFIED нет.** Квитанции живут в памяти и в `.data/dental-crm-state.json`, таблицы нет —
  SQL проверять нечего. Новой долговечности я не добавлял и на неё не претендую.
- **Живого источника нечитаемого `scheduledAt` не найдено; (b) остаётся латентным.** Проверены все
  производители, включая три, которых R5 не проверял: `taxApplicationScheduledAt`
  (`sampleData.ts:8983-8991`), `documentReadyScheduledAt` (`:9061-9065`), `postVisitCheckupScheduledAt`
  (`:9270-9281`) — все делают `Date.parse` + `Number.isFinite` с падением на `nowIso`. Единственный
  проброс `scheduledAt: task.dueAt` (`:9969`): все писатели в памяти ставят `now`
  (`:7084, 7100, 7589, 7605, 8044, 8060, 8352, 8368`), гидратация из БД — `isoOrNow(task.dueAt)`
  (`domainStateHydration.ts:580` → `:96-105`). Схема ничего не запрещает: `scheduledAt: z.string()`
  (`packages/shared/src/index.ts:2337`), `dueAt: z.string()` (`:2026`) — без `.datetime()`.
  Закрывающая команда, чтобы объявить дефект живым: найти путь записи `dueAt`/`scheduledAt` из
  внешнего ввода — `git grep -n "dueAt" -- apps/api/src/routes apps/api/src/services` (сегодня даёт
  только `new Date(...)`).

---

## Коммиты
- `3c5189471` — `[ARCHON] fix(телеграм): нечитаемое время отправки считалось наступившим, а фото уходило дважды`
  (2 файла: `apps/api/src/routes/telegram.ts` +115/−9, `apps/web/src/AppHelpers.tsx` +21)
- `1837a7878` — `[ARCHON] test(телеграм): fail-open на времени отправки и повтор оператора не были покрыты ни одним тестом`
  (1 файл: `apps/api/src/tests/telegramOutboxPartialDelivery.test.ts` +167)

`git log -1 --stat` проверен по обоим: русские темы читаемы, мождибаке нет, чужих файлов нет.
`apps/api/dist/**`, `.data/*.json`, `tsbuildinfo`, `scratch/**` не стагились ни разу.

**Отчёт об общем индексе.** Перед коммитом теста `git diff --cached --name-only` показал два чужих
файла, поставленных в индекс пакетом S6-speech-audio-rework
(`.agents/archon/packets/S6-speech-audio-rework/commitmsg-test.txt`,
`apps/api/src/speech/tests/assemblyAiRetention.test.ts`). Я НЕ снимал их с индекса и не откатывал:
коммит сделан с явным pathspec и забрал ровно один мой файл (`1 file changed, 167 insertions(+)`).

## Долг
1. **F2, остаток:** `useAppLogic.tsx:13169` выбрасывает предупреждения, когда причина непуста;
   квитанционные warnings и `message_id` не рисует никто. Оба файла вне claim, второй — в зоне
   не-флотского автора.
2. **F3, третий вариант:** предел 200 квитанций (`sampleData.ts:8817`) может вытеснить признак.
3. **F4:** смоук `scripts/smoke-telegram-control-ui-source.mjs` не запускается вовсе (ENOENT).
4. **`sampleData.ts:9729-9730, 9945, 10054`** остаются fail-open. Отправку это уже не открывает —
   отказ стоит в общем для обоих роутов `executeTelegramOutboxSend`, то есть строго позже, — но
   фильтр «due» и `dueCount` по-прежнему считают позицию с нечитаемым временем наступившей, поэтому
   счётчик в ответе завышается. Файл вне claim пакета.
5. **`sampleData_opt.ts`** — полный неиспользуемый дубль очереди со всеми теми же fail-open
   (R5 указал `:7052, 7227-7228, 7319-7320, 7946`). Ноль импортёров; удалять или подключать — решение
   ведущего.
6. **i18n:** новые русские строки в `routes/telegram.ts` добавлены литералами рядом с десятком таких
   же (`telegramTransportFailureLabels` и др.); серверного словаря в модуле нет. Заявляю как добавку
   к существующему долгу. Две новые подписи в `AppHelpers.tsx` легли в существующий словарь
   `telegramBlockedReasonLabels` — там долга нет.
7. **Косметика в теле коммита 3c5189471:** в слове «обa» латинская `a`. Опечатка, не мождибаке;
   историю ради одного символа не переписывал.
