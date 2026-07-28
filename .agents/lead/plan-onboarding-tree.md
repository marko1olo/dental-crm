# План участка: дерево первого запуска — удалять только после показа замены

Разбор вердикта `.agents/lead/verdict-onboarding-tree.md` на живом дереве.
HEAD на момент разбора: `d7e34558f75fe96f753700b2041e15813008ac05`, 2026-07-29.

## Главный вывод, который меняет постановку задачи

Вердикт и задание говорили о ОДНОМ мастере. **В дереве их два, и это разные
реализации.**

| | живой мастер | семишаговый мастер |
|---|---|---|
| файл | `apps/web/src/App.tsx:2081` | `apps/web/src/components/workspace/OnboardingSetupWizard.tsx:20` |
| шагов | 5 (`intro`, `clinic`, `team`, `telegram`, `done`) | 7 |
| гейт | `!onboardingDismissed && !isLocalOnboardingDismissed` (`App.tsx:2081`) | не отрисовывается ничем |
| ключ хранилища | `dental-crm:onboarding:v1` (`App.tsx:2009`) | `dente-onboarding-draft-v1` (`useOnboardingLogic.ts:17`) |
| перекрывает экран новой клиники | **да** | нет |

Ключ `dental-crm:onboarding:v1`, названный в задании, гасит **живой** мастер в
`App.tsx`, а не семишаговый. Семишаговый читает другой ключ и не смонтирован
нигде: его единственный импортёр — `OnboardingPreview.tsx:6`, а `OnboardingPreview`
не импортирует никто (полный поиск по репозиторию, плюс живой гейт
`apps/web/src/tests/panelsAreMounted.test.ts` держит все 11 записей ветки в
`LEGACY_UNMOUNTED_BACKLOG` при потолке `LEGACY_BACKLOG_CEILING = 29`).

Поэтому «недостижим» относится к самому семишаговому мастеру целиком, а не к
шагам внутри него. Проверка задания снята: подозрение, что мастер достижим для
новой организации, на этом дереве не подтверждается.

## Таблица замен — то, без чего удаление запрещено

Обязательное условие вердикта выполнено по пяти шагам из семи. Проверено
существованием файла, строкой монтирования и (для переноса) живыми маршрутами.

| шаг | достижимая замена | путь администратора | вывод |
|---|---|---|---|
| Step1 Specializations (192) | `WorkspaceFeaturesSelector` (`hasOrthodontics`, `hasGnathology`, `hasPediatricMode`, `hasDentalLab`) | Настройки → «Модули» (`SettingsView.tsx:1528`) | замена есть; собственное значение шага (`clinicSchedule.specs`) не читает никто |
| Step2 Infrastructure (61), часть «кресла» | «Кресла и кабинеты» (`SettingsClinicTab.tsx:728`), график по каждому креслу (`:781`) | Настройки → «Клиника» (`SettingsView.tsx:1492`) | замена **шире**: именованные кресла и график на каждое против одного ползунка-счётчика |
| Step2 Infrastructure, часть «часы работы» | **нет** | — | цель №2 ниже |
| Step3 Modules (143) | `SettingsModulesTab` → `WorkspaceFeaturesSelector` | Настройки → «Модули» (`SettingsView.tsx:1528`) | замена шире: 23 флага против 7 |
| Step4 Branding (37) | нет, и возможности тоже нет | — | `THEME_COLORS` встречается только внутри самой ветки мастера; сервер поле `theme` не читает вовсе. Красит сам себя, терять нечего |
| Step5 Staff (385) | `SettingsStaffTab` (`SettingsView.tsx:1490`) — **частично** | Настройки → «Сотрудники» | три поля без замены: цель №1 ниже |
| Step6 Legal (171) | ИНН (`SettingsClinicTab.tsx:392`), ОГРН (`:402`), адрес, поиск реквизитов по ИНН (`:490`) | Настройки → «Клиника» | замена шире |
| Step7 Migration (297) | `MigrationWizard` (`SettingsView.tsx:1563`) | Настройки → «Импорт» | замена шире, см. ниже |

Про перенос данных — самый дорогой шаг, и здесь вердикт ошибался в обе стороны.
Замер в процессе (`cd apps/api && node --import tsx src/tests/routes/onboardingPurgeProof.ts`):

```
POST /api/system/analyze-legacy-db → HTTP 404
{"message":"Route POST:/api/system/analyze-legacy-db not found",...}

POST /api/migration/upload                       → HTTP 401 (маршрут есть)
POST /api/migration/:runId/map                   → HTTP 401 (маршрут есть)
GET  /api/migration/:runId                       → HTTP 401 (маршрут есть)
GET  /api/migration/:runId/reconciliation        → HTTP 401 (маршрут есть)
POST /api/migration/:runId/execute               → HTTP 401 (маршрут есть)
POST /api/migration/rollback                     → HTTP 401 (маршрут есть)
POST /api/migration/discover                     → HTTP 401 (маршрут есть)
```

То есть Step7 зовёт единственный адрес, которого **не существует** (он же стоит
долгом в `apps/api/src/tests/webCallsExistingRoutes.test.ts:92`, раздел
«Незаконченные разделы»), и умеет только распознать файл. Достижимый
`MigrationWizard` опирается на семь существующих маршрутов и доводит перенос до
исполнения и отката. Замена не «тоже есть», а единственная работающая.

---

## Цели по вреду для клиники

### 1. Ставка врача не задаётся ни на одном достижимом экране — клиника платит по молчаливым 30 %

`apps/web/src/components/settings/SettingsStaffTab.tsx:218-247` (файл 259 строк,
смонтирован `SettingsView.tsx:1490`) собирает только ФИО, роль, e-mail, PIN и
пароль. Поля процента нет.

`apps/web/src/components/workspace/onboarding/steps/Step5Staff.tsx:261` — **единственное
место во всём вебе, где процент врача когда-либо вводился руками**, и оно
недостижимо. Там же телефон (`:141`) и специализация (`:205`), которых в
достижимой вкладке тоже нет.

Писателей `doctor_commissions.commission_pct` на сервере ровно два:
`apps/api/src/routes/workspaceProfile.ts:779` (мёртвый маршрут мастера) и
`apps/api/src/routes/diary.ts:369`, который при первом закрытии приёма молча
вставляет `commissionPct: "30.00"`.

Что это значит для клиники: `apps/web/src/pages/DoctorPayoutDashboard.tsx:400`
честно печатает «не задана», владелец идёт исправлять — и не находит куда. Либо
получает подставленные 30 %, которых никто не согласовывал, и платит по ним.
Деньги, точность до копейки.

**Как доказать:** `rg -n "percentage|commission|Процент|ставк"
apps/web/src/components/settings/SettingsStaffTab.tsx` → пустой вывод;
`rg -n "doctorCommissions" apps/api/src/routes` → только `diary.ts:369` и
`workspaceProfile.ts:779`. Пруф починки: ввести процент во вкладке
«Сотрудники», затем `GET /api/billing/payouts` через `app.inject` с
`denteAdminSecretRequestHeaders` и увидеть введённое число в `commissionPct`.

**Вердикт: debt.** Это причина, по которой Step5Staff нельзя списать как
«заменено». Долг существует уже сейчас, до всякого удаления, — удаление его не
создаёт, но и не имеет права спрятать.

### 2. Часы работы клиники для публичной записи не задаются нигде достижимо

`apps/api/src/routes/publicBooking.ts:103-113` читает `clinicSchedule.workHours`
и `clinicSchedule.workingDays`. В комментарии на `:98-102` прямо написано, что
этот формат пишет онбординг.

Писатель колонки `organizations.clinic_schedule` в API **ровно один** —
`apps/api/src/routes/workspaceProfile.ts:755`, внутри маршрута, который зовёт
только недостижимый мастер (`useOnboardingLogic.ts:158`).

Что это значит для клиники: пока колонка пуста, `resolveDaySchedule` уходит в
запас 09:00–18:00. Клиника с графиком 8–20 теряет утренние и вечерние слоты в
публичном виджете записи, и вернуть их через интерфейс нечем. Пациент видит
«нет свободного времени» там, где клиника открыта.

**Как доказать:**
`rg -n "clinicSchedule:" apps/api/src --glob '!**/dist/**'` → один писатель
(`workspaceProfile.ts:755`), плюс объявление в схеме и параметр читателя. Запрос
к базе: `psql "$DATABASE_URL" -c "select id, name, clinic_schedule from
organizations;"` — показать, что колонка пуста у живых организаций.

**Вердикт: debt.** Возможность реальная и потерянная, замены нет. Это не повод
монтировать мастер: часы работы должны появиться во вкладке «Клиника» рядом с
«Кресла и кабинеты», где уже есть график на каждое кресло.

### 3. Удалить ветку семишагового мастера — 2013 строк, замены показаны

Файлы (все свободны по `git status --porcelain`, размеры пересчитаны `wc -l`):

```
apps/web/src/OnboardingPreview.tsx                                    47
apps/web/src/components/workspace/OnboardingSetupWizard.tsx          353
apps/web/src/components/workspace/onboarding/useOnboardingLogic.ts   197
.../onboarding/steps/Step1Specializations.tsx                        192
.../onboarding/steps/Step2Infrastructure.tsx                          61
.../onboarding/steps/Step3Modules.tsx                                143
.../onboarding/steps/Step4Branding.tsx                                37
.../onboarding/steps/Step5Staff.tsx                                  385
.../onboarding/steps/Step6Legal.tsx                                  171
.../onboarding/steps/Step7Migration.tsx                              297
.../onboarding/ui/SharedOnboardingUI.tsx                             130
```

Что плохо для клиники: второй мастер первого запуска рядом с живым. Два пути
первичной настройки уже разъехались — живой не отправляет нагрузку онбординга,
семишаговый отправляет её без авторизации. Пока обе копии лежат в дереве,
каждая правка первого запуска делается вслепую: инженер правит ту, которую
человек не видит. Это уже случилось однажды: коммит `ab3312595` описывает, как
предыдущий пакет починил выбор роли в **третьей**, тоже недостижимой копии
(`WorkspaceOnboardingInline` + восемь `InlineStep*`) и заверил правку меткой
достижимости. Правка не доходила до людей вообще.

Удаление не отнимает у клиники ничего: по пяти шагам замена показана в таблице
выше и она шире исходной, Step4 не несёт возможности вовсе, а разрывы по Step5 и
Step2 существуют независимо от удаления и заведены целями 1 и 2.

**Как доказать:** `cd apps/web && npx tsx --test src/tests/panelsAreMounted.test.ts`
— сейчас 9/9 зелёных при `LEGACY_BACKLOG_CEILING = 29`; после удаления опустить
потолок до 18 и снова получить 9/9. Затем `npm run typecheck` и
`npx madge --circular --extensions ts,tsx apps/api/src apps/web/src`.

**Вердикт: delete.**

### 4. Мастер сообщал бы об успехе, переименовав клинику в «Клиника DENTE»

Три дефекта в одной цепочке, все проверены:

1. `apps/api/src/routes/workspaceProfile.ts:747` —
   `name: payload.name || payload.legal?.name || "Клиника DENTE"`. Мастер не
   отправляет `name` никогда, а его `legal` — это `{ inn, ogrn, address }` без
   имени (`useOnboardingLogic.ts:104`). Значит успешный проход мастера
   **перезаписал бы название клиники строкой «Клиника DENTE»**.
2. `apps/api/src/routes/workspaceProfile.ts:872-878` — `catch` транзакции пишет
   в журнал и молча обновляет только `updatedAt`. Клиенту уходит тот же ответ.
3. `apps/web/src/components/workspace/onboarding/useOnboardingLogic.ts:158-168` —
   `await fetch(...)` без проверки `res.ok`, `catch` только `console.error`,
   после чего безусловные `setFadeOut(true)` и `onComplete()`. Настоящий ответ
   маршрута на этот запрос замерен в процессе: **HTTP 401
   `{"error":"Unauthorized"}`**.

Что плохо для клиники: администратор нажимает «Запустить DENTE», видит плавное
угасание и считает клинику настроенной. Не сохранено ничего. Это тот же класс
дефекта, что трижды встречался в проекте: запрос без токенов получает 401, а
экран выглядит не сломанным, а пустым.

**Как доказать:** уже доказано, вывод дословно выше в разделе про перенос.
Повтор: `cd apps/api && node --import tsx src/tests/routes/onboardingPurgeProof.ts`.

**Вердикт: delete** вместе с целью 3 — чинить клиентскую часть незачем, она
уходит. Но строка `workspaceProfile.ts:747` **остаётся на сервере** и уходит в
цель 6: маршрут с таким запасом имени опасен для любого будущего писателя.

### 5. Два выдуманных числа внутри ветки — их нельзя «спасать» при разборе

- `apps/web/src/components/workspace/onboarding/steps/Step6Legal.tsx:143-147` —
  загрузка логотипа целиком фальшивая:
  `onClick={() => { if (!logoUploaded) { setTimeout(() => setLogoUploaded(true), 1500); } }}`.
  Ни `<input type="file">`, ни запроса. Через 1,5 секунды экран пишет «Логотип
  загружен». Поля `logoUploaded` нет даже в нагрузке (`useOnboardingLogic.ts:149-157`).
- `apps/web/src/components/workspace/OnboardingSetupWizard.tsx:344` — в итоговой
  колонке жёстко напечатано `4521 пац.` при `migrationStatus === "done"`, тогда
  как настоящее число Step7 положил в `detectedSummary.patientsFound`.

Что плохо для клиники: обещание, которого не было. Клиника уверена, что логотип
в системе, и обнаруживает обратное на первом договоре; «4521 пациент» — цифра, по
которой принимают решение о переходе с прежней программы.

**Как доказать:** `rg -n "setLogoUploaded\(true\)"
apps/web/src/components/workspace/onboarding/steps/Step6Legal.tsx` и
`rg -n "4521" apps/web/src`.

**Вердикт: delete.** Записано отдельной целью не ради работы, а как предупреждение
исполнителю цели 3: при разборе ветки эти два места выглядят готовой
функциональностью и просят переноса в настройки. Переносить нечего.

### 6. Маршрут онбординга остаётся без писателя — решение ведущего, чужая зона

После цели 3 без единого писателя остаются
`POST /api/workspace/onboarding/complete` (`apps/api/src/routes/workspaceProfile.ts:713`)
и `clinicModeFromOnboarding` (`:153`, применяется `:742`).

Это не мусор. Маршрут — единственное место, где режим клиники **выводится** из
числа кресел и людей, а не выбирается вручную, и на самой функции есть тест
(`apps/api/src/tests/clinicModeOneVocabulary.test.ts:110-113`). Ручной выбор
режима достижим и работает: `SettingsClinicTab.tsx:260` рисует `mode-grid` и
зовёт `changeClinicMode(mode)`, серверная проверка — `routes/settings.ts:356`.

Три вещи, которые придётся решить одним решением, а не по отдельности: судьба
маршрута, запас имени `"Клиника DENTE"` на `:747` (цель 4) и единственный
писатель `clinic_schedule` на `:755` (цель 2). Снять маршрут — и цель 2 теряет
последнего писателя вовсе; оставить как есть — и на сервере появится фасад без
писателя.

**Как доказать:** после решения — `rg -n "onboarding/complete" apps/web/src`
(должно быть пусто, если маршрут снят) либо новый писатель из живого лёгкого
онбординга с прогоном `onboardingPurgeProof.ts`.

**Вердикт: debt.** Зона сервера, не моя. Передаю ведущему целиком, потому что
это одно решение из трёх связанных частей, а не три правки.

---

## Что из вердикта не подтвердилось

1. **Стража достижимости, на котором стоит весь вердикт, в дереве нет.** Вердикт
   открывается ссылкой `node scripts/check-component-mount-reachability.mjs`
   («было 30, стало 28») и опирается на «10 нарушений из 26». Файла нет:
   ```
   ls: cannot access 'scripts/check-component-mount-reachability.mjs': No such file or directory
   ls: cannot access 'scripts/lib/component-mount-rules.yml': No such file or directory
   ```
   Удалён другим исполнителем, это записано в
   `.agents/lead/done-payouts-screen.md:200-204`. Ни одна цифра достижимости из
   вердикта на текущем дереве не воспроизводима. Живой гейт —
   `apps/web/src/tests/panelsAreMounted.test.ts`, и он зелёный (9/9), включая
   отдельную проверку «внешнего стража достижимости в дереве больше нет».

2. **Обе «студии импорта», которые вердикт велел проверить, уже удалены.**
   Вердикт: «Проверить `SettingsImportsTab` и `SmartImportStudio`/`LegacyMigrationStudio`:
   обе студии сами в списке сирот». `fd 'SmartImportStudio|LegacyMigrationStudio'
   apps/web` → пусто; разбор удаления лежит в `panelsAreMounted.test.ts:208`.
   При этом настоящую замену Step7 — `MigrationWizard` (`SettingsView.tsx:1563`,
   семь живых маршрутов) — вердикт не называет ни разу. Самый дорогой шаг он
   отправил проверять по двум удалённым файлам мимо работающего инструмента.

3. **Вердикт молчит о том, что сервер игнорирует два шага из семи.** Тип нагрузки
   на `workspaceProfile.ts:717-725` не содержит ни `modules`, ни `theme`, и в теле
   маршрута их нет: `sed -n '712,900p' … | rg "modules|theme|featureFlags"` →
   пусто. Step3Modules и Step4Branding не сохранялись бы даже у смонтированного
   мастера. Это усиливает удаление, но вердикт выдал Step3 за живую возможность
   («он же в `WorkspaceFeaturesSelector` … наконец сохраняется на сервер») — верно
   про селектор, неверно про шаг.

4. **Номера строк вердикта уехали.** «`App.tsx:2450` („Можно начать прием без
   мастера")» — на живом дереве это `App.tsx:2504`, гейт полосы на `:2501`.
   Смещение 54 строки: файл правили после разведки. Утверждение по сути верное,
   адрес — нет.

5. **Одну гипотезу я снял сам, не подтвердилась.** Предполагал коллизию
   `email: s.id + "@clinic.local"` (`workspaceProfile.ts:769`) между
   организациями. `apps/api/src/db/schema.ts:308` — `email: text("email")` без
   `.unique()`. Коллизии нет, дефекта нет.

6. **Своя ошибка инструмента, из-за которой два первых замера были ложью.** Дважды
   запустил `rg -rn "<шаблон>"`; ripgrep прочитал это как `--replace=n` и подменил
   каждое совпадение буквой `n`. В выводе получились несуществующие
   `scripts/n.mjs` и `n.tsx`, и я почти записал «страж называется n.mjs». Оба
   поиска перезапущены без `-r`, и именно исправленный прогон дал пункты 1 и 2
   выше. Правило на будущее: в ripgrep `-r` — это замена, а не «recursive».

## Не цель

- **Живой мастер `App.tsx:2081-2400`** — работает и достижим, вне этой задачи.
  Обратная декомпозиция (вынести живой мастер в компоненты) записана долгом в
  коммите `ab3312595` и остаётся долгом.
- **`OnboardingPreview.tsx` как страница разработчика.** Шапка обещает адрес
  `http://localhost:5174/#onboarding-preview`, но разбора маршрута хеша я не
  делал: `main.tsx`/`AppShell.tsx` — чужая зона, там же лежит решение по
  `GuestLabPortal`. Если ведущий захочет сохранить страницу предпросмотра, цель 3
  отменяется целиком, потому что вся ветка висит на этом корне.
