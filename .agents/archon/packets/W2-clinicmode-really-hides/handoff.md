# W2-clinicmode-really-hides — handoff

HEAD на старте: e75df11857f4e2e7202bb4e7ffa557c487147720
Мои коммиты: 58fabefb3938871b40b271d49a56b79b25f79d99, 47c09002a
Не закоммичено (обосновано ниже): apps/web/src/workspaceShell.tsx,
apps/web/src/__tests__/clinicModeSurface.test.ts

## Что было сломано (file:line)

### 1. Дефект из наряда подтверждён, но его механизм в досье описан НЕВЕРНО
`apps/web/src/store/settingsStore.ts:158` действительно содержал
`clinicMode: "network_clinic", // default`. Но **это поле не управляло ничем.**

`clinicMode` из этого хранилища достаётся в шести местах и ни в одном не используется:
useSettingsDerivations.tsx:1333, SettingsView.tsx:872, LegacyMigrationStudio.tsx:1335,
SettingsAuditTab.tsx:1244, SettingsImportsTab.tsx:1241, SmartImportStudio.tsx:1339.
`setClinicMode` там же — и его не вызывает никто во всём проекте
(`rg -n "setClinicMode" apps/web/src` даёт только объявления и мёртвые деструктуризации).

Вывод, который меняет наряд: **простая замена умолчания на "solo_doctor" не изменила бы ни одного
пикселя.** Настоящий режим приходит с сервера в `dashboard.clinicSettings.profile.mode`, а его
умолчание — не "network_clinic", а `"one_chair"`
(`apps/api/src/db/domainStateHydration.ts:350` — `clinicModeSchema.catch("one_chair")`,
`apps/api/src/sampleData.ts:283`).

### 2. Что режим клиники скрывал ДО правки, а что нет

| Поверхность | Где решается | Скрыто у отдельного врача |
|---|---|---|
| Рассылки по базе (CampaignPanel) | CommunicationsView.tsx:355 | ДА |
| Разрез отчётов по врачам | ManagerReportsPanel.tsx:166 | ДА |
| Занятость кресел | ManagerReportsPanel.tsx:167 | ДА |
| Строка «Ассистент» в карточке приёма | components/schedule/AppointmentCard.tsx:282 | ДА |
| Выбор ассистента в форме записи | components/schedule/NewAppointmentForm.tsx:376 | ДА |
| Ассистент по умолчанию | ScheduleView.tsx:242, AppHelpers.tsx:4508/4531 | ДА |
| Требование «ассистент обязателен» | AppHelpers.tsx:4665 | ДА |
| Задачи и правила ассистента на приёме | VisitView.tsx:1202/1223 | ДА |
| **Навигационная рельса** | workspaceShell.tsx:117 | **НЕТ — фильтр только по роли** |
| **Переключатель роли (5 ролей)** | workspaceShell.tsx:315-337 | **НЕТ — не фильтруется вообще** |
| Поле clinicMode в settingsStore | settingsStore.ts:158 | не участвует нигде |

То есть режим управлял содержимым трёх панелей и полем ассистента, но **не управлял двумя самыми
заметными кусками организационной обвязки**: составом меню и выбором роли. Отдельный врач получал
ту же рельсу и тот же выбор «Ассистент / Администратор / Управляющий», что и сеть филиалов.

### 3. Дефект, найденный собственным тестом (не рассуждением)
В моей же первой версии `resolveClinicMode` проверка принадлежности шла через
`value in CAPABILITIES_BY_MODE`. Оператор `in` идёт по цепочке прототипов, поэтому строка
`"toString"` проходила за режим клиники, таблица возвращала на неё функцию
`Object.prototype.toString`, и следующий `.includes` падал бы с TypeError. Исправлено в 47c09002a
сравнением со списком `clinicModes`; заодно убраны страховки `?? FULL` и `if (!allowed)`, которые
после явной проверки прикрывали уже невозможный случай и скрыли бы возврат такой дыры.

## Что изменено

**Закоммичено (58fabefb3, 47c09002a):**
- `apps/web/src/store/settingsStore.ts` — `clinicMode: ClinicMode | null`, умолчание `null`
  («сервер ещё не сказал») вместо подстановки самого крупного режима. Комментарий называет настоящий
  источник правды и путь его изменения.
- `apps/web/src/useSettingsDerivations.tsx` — убраны две мёртвые привязки, вместо них указание на
  `dashboard.clinicSettings.profile.mode` и на `lib/clinicCapabilities.ts`.
- `apps/web/src/lib/clinicCapabilities.ts` — расширена ЕДИНСТВЕННАЯ существующая таблица режимов
  (нового перечисления и второй системы флагов не заводил, §10):
  возможность `marketingSection`; таблица ролей `ROLES_BY_MODE` + `visibleStaffRoles()`;
  `resolveClinicMode()`; `clinicModes`; `isClinicMode()`.
- `apps/web/src/tests/clinicCapabilities.test.ts` — +91 строка: разбор чужого значения, составы ролей
  по режимам (списки печатаются), запрет отрезать роль владельца, немонотонность и порядок ролей.

**НЕ закоммичено, лежит на диске (см. «Долг»):**
- `apps/web/src/workspaceShell.tsx` — новая `getVisibleRailViews(role, mode)`; `WorkspaceSidebar`
  читает режим из того же контекста, что и CommunicationsView, и фильтрует меню; `WorkspaceTopbar`
  показывает только существующие при режиме роли.
  `getFilteredAppViews(role)` намеренно оставлена без режима: её результат работает охранником
  маршрута в useAppLogic.tsx:4358-4363 (`if (!allowedViews.includes(currentView))` → выброс на
  «Смену»). Пустить режим туда значило бы удалить раздел, а не скрыть его (§4).
- `apps/web/src/__tests__/clinicModeSurface.test.ts` — 7 проверок, печатает оба состава меню.

## ПРОВЕРЕНО

**UNIT VERIFIED** — `node --import tsx --test src/tests/clinicCapabilities.test.ts` (из apps/web),
exit 0, `tests 13 / pass 13 / fail 0`. Покрывает ровно закоммиченный код. Печатает:
```
  отдельный врач: doctor, owner
  один кабинет:   doctor, administrator, assistant, owner
  малая клиника:  doctor, administrator, assistant, manager, owner
  сеть:           doctor, administrator, assistant, manager, owner
```
Роли отдельного врача: 2 из 5. Убраны ассистент, администратор, управляющий — сотрудники, которых
у него нет. «Владелец» оставлен намеренно и это закрыто отдельной проверкой: роль задаёт состав
разделов, у роли «Врач» нет ни «Оплат», ни «Настроек», и без владельца отдельный врач потерял бы
доступ к кассе и к тому месту, где режим меняется обратно.

**UNIT VERIFIED (против рабочего дерева, НЕ против HEAD)** —
`node --import tsx --test src/__tests__/clinicModeSurface.test.ts`, exit 0, `tests 7 / pass 7`.
Печатает оба состава меню:
```
  отдельный врач (12): Смена, Записи, Пациенты, Снимки, Прием, Документы, Оплаты, Аналитика, Связь, Склад, Стерилизация, Настройки
  сеть           (14): Смена, Записи, Пациенты, Снимки, Прием, Документы, Оплаты, Аналитика, Связь, Склад, Стерилизация, Обращения, Настройки, Маркетинг/SEO
```
Состав отдельного врача — строгое подмножество состава сети. Ни один раздел лечения (записи,
пациенты, снимки, приём, документы, оплаты) не скрыт ни в одном из четырёх режимов — это отдельная
проверка. Разница в 14 против 12 достигнута совместно с чужой правкой того же файла (см. «Долг»):
«Маркетинг/SEO» скрываю я, «Обращения» — второй автор в моей же функции.

**Прогон соседних тестов, ничего не сломал:** `src/tests/panelsAreMounted.test.ts` exit 0
(`pass 2`) — каждая запись реестра имеет живую ветку отрисовки в рабочем дереве.

**Кодировка:** `npm run smoke:web-text-encoding` exit 0 —
`{"ok": true, "checkedFiles": 429, "mojibakeHits": 0, "garbledQuestionHits": 0}`.

**Коммиты:** `git log --stat` показывает в 58fabefb3 ровно 3 моих файла, в 47c09002a ровно 2 моих
файла. Русские заголовки не побиты. Чужих файлов и чужих удалений не подхвачено, хотя во время
работы второй автор удалял файлы (`git rm` попадает в индекс мгновенно) — спасла форма
`git commit -F <msg> -- <явные пути>`.

## НЕ ПРОВЕРЕНО

- **Типизация всего пакета.** Не мой гейт (§7a, общий `.tsbuildinfo`). Закрывается ведущим:
  `npm run typecheck -w @dental/web`
- **Внешний вид.** Рельса и переключатель роли в режимах solo_doctor и network_clinic глазами не
  проверены — UI VERIFIED мне запрещён. Закрывается ведущим: снимки экрана solo против network после
  того, как workspaceShell.tsx будет закоммичен.
- **Реальное поведение в браузере.** Что `WorkspaceSidebar` действительно получает режим из
  контекста, доказано только статически: `AppLogicProvider` открывается в App.tsx:2318, а
  `WorkspaceSidebar` стоит внутри на 2323, и `dashboard` есть в возвращаемом объекте useAppLogic
  (строка 13719). Прогоном в браузере не подтверждено. Закрывается ведущим:
  открыть 127.0.0.1:5173, сменить режим в настройках на «Отдельный врач» и посмотреть меню и
  переключатель роли.
- **Смена режима из настроек в режимы one_chair и network_clinic.** `changeClinicMode`
  (useAppLogic.tsx:7302) реально шлёт POST /api/settings/clinic/mode и перечитывает профиль — но
  `components/settings/SettingsClinicTab.tsx:323-324` предлагает только два режима из четырёх
  («Частный кабинет», «Стандартный»), причём через черновик профиля, а не через changeClinicMode.
  Все четыре режима предлагает только мастер настройки (App.tsx:2548). Не проверял, доходит ли
  черновик до сервера. Оба файла вне моего наряда.
- **`node scripts/smoke-workspace-shell-source.mjs` — exit 1**, две претензии:
  «Sidebar view hints must collapse on mobile to protect bottom navigation» и «ScheduleView must not
  force smooth programmatic scrolling». Ни то, ни другое я не трогал: мобильного свёртывания подписей
  и ScheduleView мои правки не касаются. Кому принадлежит эта краснота — не установил.

## Коммит

- `58fabefb3938871b40b271d49a56b79b25f79d99` — fix(режимы клиники): неизвестный режим клиники
  подменялся самым крупным. Файлы: lib/clinicCapabilities.ts, store/settingsStore.ts,
  useSettingsDerivations.tsx.
- `47c09002a` — fix(режимы клиники): строка "toString" проходила за режим и роняла разбор
  возможностей. Файлы: lib/clinicCapabilities.ts, tests/clinicCapabilities.test.ts.

## Долг

1. **ГЛАВНОЕ. `apps/web/src/workspaceShell.tsx` и `__tests__/clinicModeSurface.test.ts` лежат
   незакоммиченными, и это осознанное решение, а не забывчивость.**
   Второй автор правил этот файл одновременно со мной: добавил разделы `inventory`, `scanner`,
   `leads` в реестр (11 → 14) и дописал фильтр `leads` внутрь моей новой функции. Его работу я не
   откатывал и не «поправлял». Но в HEAD веток отрисовки для этих трёх разделов нет — измерено:
   ```
   git show HEAD:apps/web/src/App.tsx | rg 'currentView === "(inventory|scanner|leads)"'   -> пусто
   git show HEAD:apps/web/src/workspacePreload.ts | rg "Inventory|Scanner|Leads"           -> пусто
   ```
   Коммит этого файла без его `App.tsx` и `workspacePreload.ts` повесил бы на рельсу три раздела,
   которые ничего не рисуют, и покрасил бы `tests/panelsAreMounted.test.ts` в красный на HEAD.
   **Файл должен уехать одним коммитом вместе с App.tsx и workspacePreload.ts второго автора.**
   App.tsx мне запрещён (наряд W3), поэтому сделать это сам я не могу.
   После этого коммита прогнать: `node --import tsx --test src/__tests__/clinicModeSurface.test.ts`.
2. **`apps/web/src/__tests__/workspaceShellNav.test.ts` красный из-за чужой правки:**
   `assert.equal(appViews.length, 11)` против фактических 14 (`actual: 14, expected: 11`). Название
   проверки говорит «at least the eleven shipped views», а утверждение стоит на равенство. Чинить
   не стал — это гейт чужого наряда. На момент сдачи второй автор уже держит этот файл изменённым.
3. **Поле `settingsStore.clinicMode` по-прежнему никем не читается.** Я убрал из него подстановку
   и мёртвую пару привязок в своём файле, но остальные четыре мёртвые деструктуризации живут в
   `SettingsView.tsx` и `components/settings/**` — зона второго, не-флотского автора, править
   запрещено. Удалять поле из хранилища нельзя, пока они там: деструктуризация несуществующего
   свойства типизированного объекта — ошибка компиляции в четырёх файлах.
4. **`GET /api/workspace/profile` (apps/api/src/routes/workspaceProfile.ts:437-457) отдаёт
   захардкоженный enterprise-набор флагов**, игнорируя организацию, базу и режим клиники: любой
   клинике возвращается `hasMarketingModule: true`, `hasMultipleChairs: true`,
   `workspacePreset: "enterprise"`, `numberOfDoctors` не участвует. А `POST` на тот же адрес
   (строки 475-510) деструктурирует семнадцать флагов и не записывает ни один — обновляет только
   `updatedAt` и возвращает `{ok: true}`. Это фасад из §2. Рядом лежит полностью описанная таблица
   `WORKSPACE_PRESETS` (включая `solo_therapist` с `hasMarketingModule: false`), которой никто не
   пользуется на чтении. Вторая, независимая от clinicMode система модульности, и она мертва.
   Вне моего наряда (apps/api). Это самый крупный оставшийся кусок §5.
5. **i18n-долг признаю прямо:** библиотеки перевода в проекте нет, новые подписи режимов и ролей я
   не заводил — беру существующие `clinicModeLabels` и `staffRoleLabels` из
   `workspaceUiLabels.ts`. Строка «раздел продвижения и отзывов» добавлена в
   `describeHiddenCapabilities` рядом с шестью такими же русскими строками, которые уже там лежали.
