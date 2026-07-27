# C2-clinical-not-persisted — сдача

HEAD: b78dfc69b3025605de9104e9cae8cdda46bfefc0 (на момент написания; ветка движется под
двумя другими агентами и не-флотовым автором)

Мои коммиты: **2f18e4406** (исправление) и **669c812a5** (починка SQL + тест на живой базе).

---

## Что было сломано (file:line)

**1. Задача передачи между этапами не сохранялась.**
- `apps/api/src/services/clinical/ClinicalRouter.ts:3` — `// Mocking db imports to keep it
  simple and compileable in the backend`
- `:4-13` — собственный `interface ClinicalTask` вместо модели БД
- `:43-44` — `// In a real implementation, we would insert into the DB via Drizzle:` /
  `// await db.insert(clinicalTasks).values({...})`
- `:46-57` — объект собирался в памяти, печатался в `console.log` и возвращался вызывающему

**2. Модуль был МЁРТВ. Ноль вызывающих в проде.** (проверка цепочки исполнения, §6)
```
rg -n "ClinicalRouter" --glob '!node_modules'
  apps/api/src/services/clinical/ClinicalRouter.ts:15   (сам класс)
  apps/api/src/services/clinical/ClinicalRouter.ts:56   (console.log внутри него же)
  apps/api/src/services/clinical/ClinicalRouter.test.ts:3,6  (его собственный тест)
  scratch/*.txt                                          (старые слепки вывода тестов)
rg "services/clinical|handlePhaseCompletion" apps/ packages/ scripts/
  -> только сам файл и его тест. Динамического импорта тоже нет.
```
Ни один роут его не вызывал, в `server.ts` он не регистрировался.
**Вывод по severity: до этого коммита ни один живой пользователь не терял данные, потому
что дойти до этого кода было нельзя вообще.** Терялась не информация, а доверие: это была
фабрикация, а не работающая функция. Тест при этом был зелёным ровно потому, что проверял
поля объекта, собранного в памяти, — то есть подтверждал сам дефект.

**3. Таблица уже существовала — мигрировать было нечего.**
`clinical_tasks` создана первой же миграцией
`apps/api/drizzle/0000_freezing_randall_flagg.sql:210` и физически есть в живой БД
`127.0.0.1:5432/dental_crm`. Чтение `information_schema` подтвердило все 11 колонок, а
enum `clinical_task_status` = `pending,in_progress,completed,cancelled` — ровно тот
union, что был захардкожен в TS на `:10`. **Строк в таблице было 0: за всё время в неё не
записали ничего.**
Модели `clinicalTasks` в `db/schema.ts` нет и не было (`rg "clinicalTasks|clinical_tasks"`
по `src/` даёт ноль попаданий вне комментария на `:44`).

**4. Дыра в мультиарендности, найденная при подключении.**
Внешние ключи `clinical_tasks` проверяют только существование строки, но не её
принадлежность организации:
```
clinical_tasks_patient_id_patients_id_fk => FOREIGN KEY (patient_id) REFERENCES patients(id)
```
Клиника А могла записать задачу со своим `organization_id` и `patient_id` клиники Б.

---

## Что изменено

- `apps/api/src/db/clinicalTasksQuery.ts` — **НОВЫЙ**. Слой доступа к существующей таблице:
  `insertClinicalTaskInDb`, `getClinicalTasksFromDb`, `ClinicalTaskOwnershipError`.
  Параметризованный SQL через общий пул, потому что модели в `db/schema.ts` нет, а трогать
  `db/schema.ts` пакет запрещает. Приём не выдуман: так же сделан
  `db/patientServiceLineagesQuery.ts`. Добавлена проверка принадлежности организации для
  пациента, плана лечения и врача.
- `apps/api/src/services/clinical/ClinicalRouter.ts` — переписан. Мок-интерфейс, `uuidv4` и
  `console.log` убраны; задача пишется в БД и возвращается с настоящими `id`/`created_at`.
  Появился `listTasks` — путь чтения. Описание собирается только из известных частей:
  раньше завершение этапа без зубов и без комментария давало строку с пустыми разделами.
- `apps/api/src/routes/clinical.ts` — **подключение вызывающего**:
  `POST /api/clinical/phase-completions`, `GET /api/clinical/tasks`.
  `registerClinicalRoutes` уже вызывается в `server.ts:356`, так что `server.ts` я не трогал
  (он занят не-флотовым автором).
- `apps/api/src/services/clinical/ClinicalRouter.test.ts` — переписан на живую БД.

### Расширение клейма, объявляю честно
Клейм был «ClinicalRouter.ts (+ caller wiring if required, + a node:test)». Я дополнительно
создал **новый** файл `apps/api/src/db/clinicalTasksQuery.ts`. Обоснование: новый файл =
нулевая поверхность конфликта с соседями, а размазывать SQL по сервису значит положить его
не в тот слой. `routes/clinical.ts` — это и есть «caller wiring», прямо разрешённое клеймом;
перед правкой файл был чистым (`git status --porcelain` пуст), коллизии не было.

---

## ПРОВЕРЕНО

**TYPECHECK VERIFIED** — `npm run typecheck -w @dental/api`, выход 0. Прогонялся дважды,
перед каждым коммитом. Доказывает только то, что сборка не сломана.

**UNIT VERIFIED** — `cd apps/api && node --import tsx --test src/services/clinical/ClinicalRouter.test.ts`
```
✔ задача передачи записывается в clinical_tasks и читается обратно (7.0229ms)
✔ повторная отправка того же завершения не плодит вторую открытую задачу (3.9068ms)
✔ описание не содержит пустых разделов, когда зубы и комментарий не указаны (1.3518ms)
✔ неизвестный код этапа возвращает null и ничего не пишет (0.7706ms)
✔ пациент чужой клиники отклоняется, а не записывается под своей организацией (1.2382ms)
ℹ tests 5   ℹ pass 5   ℹ fail 0   ℹ skipped 0
```
Организация и пациент ищутся в базе на старте, а не захардкожены. Созданные строки
удаляются в `after`, пул закрывается там же.

**API VERIFIED + DB VERIFIED** — `cd apps/api && node --import tsx ../../.agents/archon/packets/C2-clinical-not-persisted/proof.ts`
против уже запущенного сервера `127.0.0.1:4100`:
```
POST /api/clinical/phase-completions -> 201
  {"id":"74f6e6dc-d996-435d-8643-eddfe246c839", ... ,"taskType":"prosthetics_handoff",
   "status":"pending","title":"Этап II: передача в ортопедию", ...
   "createdAt":"2026-07-28 01:46:39.998127+04"}
SQL SELECT * FROM clinical_tasks WHERE id = 74f6e6dc-...
  row found: true   status: pending   organization_id: 4a3420d1-...
  title bytes(base64): 0K3RgtCw0L8gSUk6INC/0LXRgNC10LTQsNGH0LAg0LIg0L7RgNGC0L7Qv9C10LTQuNGO
  -> декодируется в «Этап II: передача в ортопедию»: UTF-8 в базе целый, не мождибаке
GET  /api/clinical/tasks?patientId=... -> 200, count 1, содержит задачу
SECOND GET                              -> 200, ВСЁ ЕЩЁ содержит задачу
DUPLICATE POST                          -> 201, тот же id (второй строки нет)
POST неизвестный этап                   -> 400
GET без токена                          -> 401
cleanup: строка удалена, rowcount clinical_tasks снова 0
```
Второй GET — это и есть ответ на формулировку пакета: передача переживает ответ, следующий
врач её видит.

**Регрессия по всему API** — `npm test -w @dental/api`: `tests 883 / pass 882 / fail 1`.
Единственный упавший — `src/tests/routes/dayConfirmations.test.ts:217`,
«по умолчанию берётся завтрашний день в поясе клиники», ожидалось `2026-07-28`, получено
`2026-07-29`. **Не мой:** файл импортирует только `db/client`, `db/communicationsSchema` и
`routes/dayConfirmations` — ничего из того, что я трогал. Тест ломается в узком окне после
полуночи (сейчас 01:46 UTC+4, «завтра в Москве» уже 29-е). Подробнее — в разделе «Долг».

---

## НЕ ПРОВЕРЕНО

- **UI.** Ни один экран не показывает `clinical_tasks`, и я не имею права на UI-проверку.
  Врач увидит передачу только через API. Закрывается: лид открывает `127.0.0.1:5173`,
  после того как появится экран, читающий `GET /api/clinical/tasks`.
- **Что кто-то реально вызывает новый POST из продукта.** Роут существует и отвечает, но
  фронтенд его пока не дёргает: `rg -n "phase-completions" apps/web/src` даёт ноль.
  Передача этапа по-прежнему не инициируется из интерфейса. Закрывается: отдельный пакет на
  кнопку «завершить этап» в клиническом экране.
- **Гонка двух одновременных POST.** Защита от дублей — `INSERT ... WHERE NOT EXISTS`, без
  уникального индекса она не транзакционная. Закрывается: миграция с
  `CREATE UNIQUE INDEX ... ON clinical_tasks (organization_id, patient_id, task_type, title,
  md5(description)) WHERE status IN ('pending','in_progress')` плюс нагрузочный прогон
  двух параллельных запросов.
- **`treatmentPlanId` / `assignedDoctorId` на живых данных.** Код их принимает и проверяет
  принадлежность организации, но в проверке я передавал только `patientId`. Закрывается:
  `POST /api/clinical/phase-completions` с реальным `treatmentPlanId` из `treatment_plans`
  и `assignedDoctorId` из `users`, затем `SELECT treatment_plan_id, assigned_doctor_id
  FROM clinical_tasks WHERE id = ...`.
- **Поведение при `NODE_ENV=production`.** Всё проверялось в dev, где
  `DENTE_CLINICAL_ALLOW_UNGUARDED_*` включены, а `DENTE_CLINICAL_ADMIN_SECRET` пуст
  (скрипт напечатал `clinical admin secret configured: false`). В production роуты
  потребуют `x-dente-admin-secret`. Закрывается: прогон с заданным
  `DENTE_CLINICAL_ADMIN_SECRET` и заголовком.

---

## Коммит

- **2f18e4406** `[ARCHON] fix(клиника): передача между этапами лечения не доходила до базы и не имела роута`
  — 3 файла, +423/−55.
- **669c812a5** `[ARCHON] fix(клиника): запись задачи падала на приведении record к clinical_task_status[]`
  — 2 файла, +220/−66.

Оба через `git commit -F <msgfile> -- <явный список путей>`. `git diff --cached --name-only`
перед каждым показывал только мои файлы, чужого в индексе не было. `git log -1 --stat`
подтвердил: русский заголовок целый, мождибаке нет.

**Почему коммита два.** Первый прошёл typecheck и был закоммичен по протоколу
(«коммить, как только код верен и гейт зелёный»), но при первом же реальном вызове упал с
PostgreSQL `42846 cannot cast type record to clinical_task_status[]`. drizzle разворачивает
JS-массив в шаблоне `sql` не в один параметр-массив, а в перечисление плейсхолдеров
`($1, $2)`, и `($1, $2)::clinical_task_status[]` читается как приведение записи к массиву.
**Между 2f18e4406 и 669c812a5 HEAD содержал нерабочий SQL — компилируемый, но падающий.**
Это ровно тот случай, ради которого в правилах написано, что зелёный typecheck не является
доказательством работы: битый SQL живёт внутри строки шаблона, и компилятор его не видит.

Замечание к атрибуции: git-автор на этой машине — `marko1olo` для всех сессий, флотовых и
нет. Единственный маркер принадлежности — префикс `[ARCHON]` в заголовке.

---

## Долг

1. **Модели `clinicalTasks` в `db/schema.ts` нет.** Таблица существует в БД и в миграции, но
   Drizzle-модели у неё нет — доступ идёт явным SQL. Пакет запрещал трогать `db/schema.ts`,
   поэтому это отдельная задача: добавить `pgTable("clinical_tasks", ...)`, сгенерировать
   миграцию (она должна выйти пустой, если модель совпадает с фактической таблицей) и
   перевести `clinicalTasksQuery.ts` на модель.
2. **Снапшоты drizzle оборваны.** `drizzle/meta/_journal.json` содержит 28 записей
   (`0000`…`0027`), а снапшотов на диске только `0000_snapshot.json`…`0008_snapshot.json`.
   Для миграций 0009–0027 снапшотов нет. Это не моё и не сегодняшнее, но следующая
   `drizzle-kit generate` будет считать diff от `0008`. Проверить до пункта 1.
3. **Нет уникального индекса** для защиты от дублей (см. «НЕ ПРОВЕРЕНО»).
4. **Локализация.** Строки заголовков и описаний задач — русские, лежат прямо в
   `ClinicalRouter.ts`. Библиотеки i18n в проекте нет, серверных словарей подписей не
   существует вовсе (`workspaceUiLabels.ts` и прочие — на стороне web). Это осознанный
   вклад в общий долг, а не заявка на работающий перевод.
5. **`src/tests/routes/dayConfirmations.test.ts:217` падает после полуночи.** Ожидание
   «завтра» вычисляется в фикстуре не в том поясе, в каком его считает роут
   (`Europe/Moscow` против локального UTC+4). Днём тест зелёный, ночью красный. Чинить
   надо тест/роут, а не подгонять ожидание.
6. **`scratch/` не в `.gitignore`.** Там уже лежат чужие непроиндексированные файлы. При
   общем индексе и `git add .` это готовая авария. Свой файл из `scratch/` я убрал,
   скрипт проверки перенёс в каталог пакета.
