# W3-unreachable-views — handoff

HEAD: e2d41dc7488c01320fd292085b26ebc06fb89941
Мои коммиты: `41a22b63d` (основной), `e2d41dc74` (по итогам проверки живого сервера).

## Что было сломано (file:line)

- `apps/web/src/AppRouter.tsx:1-12` — шапка файла дословно: «ВНИМАНИЕ: МЁРТВЫЙ ФАЙЛ».
  `AppRouter.tsx:330-356` — единственные ветки отрисовки пяти разделов.
- `apps/web/src/workspaceShell.tsx:29` (до правки) — `appViews` из 11 записей: ни
  `inventory`, ни `scanner`, ни `leads`, ни `payroll`, ни `inbox`.
- `apps/web/src/AppHelpers.tsx:6121` — `viewFromHash()` сверяет хеш с `appViews` и молча
  откатывается на `"shift"`. Значит и прямой адрес `#inventory` никуда не ведёт.
- `apps/web/src/useAppLogic.tsx:4359-4363` — `getFilteredAppViews(role)` работает жёстким
  охранником маршрута: раздела нет в списке роли → принудительный возврат на «Смену».
  Забыть его в этом списке — то же самое, что не подключить.
- `apps/web/src/tests/panelsAreMounted.test.ts:118-138` (до правки) — страж охранял
  пометку «мёртвый файл» в шапке `AppRouter.tsx` и поимённый список шести панелей,
  но не связку «раздел объявлен → раздел отрисован». Три раздела он пропустил.
- `apps/web/src/__tests__/workspaceShellNav.test.ts:55` (до правки) —
  `assert.equal(appViews.length, 11)` при названии теста «at least the eleven shipped views»:
  подключение любого раздела делало зелёный тест красным.

## Что изменено

### Подключены три раздела (данные под ними настоящие)
| Раздел | Ключ | Данные |
|---|---|---|
| Склад | `inventory` | 8 адресов `routes/inventory.ts` совпадают с `useInventoryLogic` один в один; таблица `inventory_items` с настоящими вставками |
| Стерилизация | `scanner` | `routes/sterilization.ts` (server.ts:412), вставка в `sterilization_logs` + рассылка по вебсокету |
| Обращения | `leads` | 6 адресов `routes/leads.ts` (server.ts:394), перевод обращения в пациента с записью в расписание одной транзакцией |

Каждый — во всех трёх обязательных местах: `workspaceShell.appViews` + `viewLabels`/`viewHints`/
`sidebarIcons`/`actionIcons`, ветка `currentView === …` в `App.tsx` под
`WorkspaceRouteErrorBoundary` + `Suspense`, и строка в `workspacePreload.ts`.
Роли: склад — врач/ассистент/администратор/владелец; стерилизация — врач/ассистент/владелец;
обращения — администратор/управляющий/владелец. §5: `leads` скрыт у режима `solo_doctor`
через `getVisibleRailViews` (одно правило с «Маркетингом», без второй возможности-двойника).

### Удалены как обещание без исполнения
| Файл | Почему |
|---|---|
| `PayrollView.tsx` (871) | `/api/billing/payouts` → **404 на живом сервере**; слова «payouts» нет во всём `apps/api/src`, кроме списка долга `webCallsExistingRoutes.test.ts:60`, где адрес числится «незаконченным разделом» |
| `components/OmnichannelInboxView.tsx` (1306) + `.css` (275, никем не импортировался) | `/api/communications/inbox`, `/inbox/:id`, `/inbox/:id/send`, `/patients/search` → **404 все четыре**. Входящие сервер правда рассылает (`INBOX_NEW_MESSAGE` в 4 местах), но списка нет и отправлять нечем: кнопка уходила в 404 |
| `AppRouter.tsx` (359) | второй маршрутизатор рядом с `App.tsx`, на котором дважды потеряли готовую работу |

### Страж переписан на связку
`tests/panelsAreMounted.test.ts` — 5 тестов: панели (как было) + раздел из реестра обязан
иметь ветку в `App.tsx` + строку в `workspacePreload.ts` + существующий модуль +
`AppRouter.tsx` не должен появиться заново. **На первом же запуске нашёл «Аналитику»:**
раздел был в реестре и отрисовывался, но не предзагружался никогда — а это самый тяжёлый
экран (recharts). Добавлено в `workspacePreload.ts`.

### Исправлено в самих подключаемых разделах
Подключать экран, который врёт, нельзя (§1).
- `LeadsKanbanView`: выдуманный `"00000000-0000-0000-0000-000000000000"` в теле запроса и
  два лишних запроса (`/api/auth/user/me` + `/api/dashboard`) ради него — убраны, организацию
  сервер берёт из токена; отбор врачей переведён на конвенцию проекта
  («активный» + `doctor`/`owner`) вместо несуществующих ролей `"Врач"`/`"admin"` без проверки
  активности; длительность приёма — из `defaultVisitMinutes`, а не зашитый час, и при
  неизвестном значении запись блокируется, а не подставляется 60; причина отказа сервера
  показывается словами вместо «Ошибка записи лида»; сбой загрузки больше не выглядит как
  пустая воронка; пункты «Нет врачей»/«Нет кресел» заменены на объяснение, куда идти.
- `ScannerView`: список автоклавов был зашит тремя названиями — справочника в базе нет
  (`autoclave_id` это свободный текст), подсказки берутся из уже записанных в журнал;
  `logs: any[]` → типизировано; `log.autoclaveId || "ОСНОВНОЙ"` выдавал отсутствие названия
  за конкретный аппарат; недоступный сервер выдавался за пустой журнал; `.scanner-select-group`
  и `.scanner-select` в `ScannerView.css` не существовали вовсе, поля были без подписей.
- `InventoryView`: «Склад пуст. Добавьте первый материал.» показывалось и тогда, когда
  клиника не определена и запрос остатков не уходил — кладовщик заносил бы материалы поверх
  настоящих остатков.

## ПРОВЕРЕНО

**UNIT VERIFIED** — `node --import tsx --test src/tests/panelsAreMounted.test.ts src/__tests__/workspaceShellNav.test.ts`
(cwd `apps/web`), истинный код возврата **0**:
```
✔ workspace navigation rail mapping (2.5624ms)
✔ каждая рабочая панель отрисовывается из живого модуля (145.1251ms)
✔ каждый раздел из реестра отрисовывается в App.tsx (2.471ms)
✔ каждый раздел из реестра умеет предзагружаться (0.5549ms)
✔ модуль каждого предзагружаемого раздела действительно существует (25.2987ms)
✔ второго маршрутизатора рядом с App.tsx больше нет (0.2317ms)
ℹ tests 12  ℹ pass 12  ℹ fail 0
```
Страж доказан работающим, а не только зелёным: до добавления строки `analytics` он падал
именно на ней (`AssertionError … не зарегистрированы в workspacePreload.ts: analytics`).

**API VERIFIED** — `node --import tsx .agents/archon/packets/W3-unreachable-views/probe-routed-views.mts`
против живого сервера `127.0.0.1:4100`, токены выписаны настоящим `AUTH_TOKEN_SECRET`:
```
organization: 4a3420d1-6ffb-4459-bd8f-7f7087f5e191 (Стоматология, 1 кабинет)
DB rows: inventory_items=0 sterilization_logs=0 crm_leads=0
staff user: e44d32ca-7777-4c00-a001-c88f01b92e21
GET /api/inventory/4a3420d1-6ffb-4459-bd8f-7f7087f5e191 -> 200 array(0)
GET /api/sterilization/logs -> 200 array(0)
GET /api/leads -> 200 array(0)
ALL 200
```
Оговорка про код возврата: процесс печатает всё и затем падает на assert-е libuv в
teardown под Windows (`!(handle->flags & UV_HANDLE_CLOSING)`), поэтому наблюдаемый
`TRUE_EXIT=127`. Доказательство — три строки со статусами, не код процесса.

**404 подтверждён на живом сервере** для удалённых разделов (`curl`):
```
/api/billing/payouts                    -> 404 {"message":"Route GET:/api/billing/payouts not found"}
/api/communications/inbox               -> 404
/api/communications/patients/search?q=a -> 404
/api/sterilization/logs                 -> 401 AuthRequired   (маршрут есть)
/api/leads                              -> 401 AuthRequired   (маршрут есть)
```

**Удаления полные** — `git grep -n "<Name>" HEAD -- apps/`:
`PayrollView` → пусто (exit 1). `OmnichannelInboxView` → пусто (exit 1).
`AppRouter` → только текст комментариев и `existsSync`-страж; `git cat-file -e HEAD:apps/web/src/AppRouter.tsx`
→ `does not exist in 'HEAD'`.

**SMOKE VERIFIED** — `node scripts/check-css-tokens.mjs` → exit 0,
`НЕ РАЗРЕШАЕТСЯ НИ В ОДНОЙ ТЕМЕ: 0 имён, 0 вхождений`.
`npm run smoke:web-text-encoding` → exit 0, `mojibakeHits: 0`, 416 файлов.

## НЕ ПРОВЕРЕНО

1. **Типы. Гейт не мой (§7a).** Закрывается: `npm run typecheck -w @dental/web`.
   `tsx` типы стирает, поэтому запуск теста компилятором НЕ является. Наиболее вероятные
   места отказа — мои правки в `LeadsKanbanView.tsx` (`dashboard?.clinicSettings?.staff`
   приводится к локальному типу `BookableDoctor[]`; `StaffMember` и `Chair` присваиваемы,
   проверено по схемам `packages/shared/src/index.ts:1458,1477`) и три ветки в `App.tsx`.
2. **Вид на экране.** Закрывается ведущим: открыть `#inventory`, `#scanner`, `#leads`.
   Замечание к §4: рельса выросла с 11 до 14 записей. По ролям это 10/8/9/7, но у роли
   `owner` — все 14 (13 у `solo_doctor` после моего гейта, 12 после гейта «Маркетинга» от W2).
   Измерено по CSS: `.sidebar { min-height: 100vh }` **без `overflow`**,
   `.sidebar nav { gap: 2px }`, `.nav-item { padding: 9px 10px }` со значком + подписью +
   подсказкой. При 14 записях подвал рельсы (переключатель темы и кнопка «свернуть») может
   уехать за нижний край на экране высотой 900px и ниже. Я это НЕ правил: чинится в
   `styles/dente-redesign.css:281` (`min-height` → `height` + `overflow-y:auto` на
   `.sidebar nav`), а `styles/` вне моего клейма и без снимка экрана менять раскладку вслепую
   нельзя. Закрывается: снимок рельсы у роли `owner` при высоте окна 900px.
3. **Данные в трёх подключённых разделах.** `inventory_items`, `sterilization_logs`,
   `crm_leads` в базе **пусты (0/0/0)** — ведущий увидит пустые состояния, а не таблицы.
   Это не поломка: маршруты отвечают 200. Закрывается: завести материал через
   `POST /api/inventory/:orgId` и лоток через `POST /api/sterilization/scan`.
4. **Полный прогон записи обращения в пациента.** Читающие адреса проверены; `POST
   /api/leads/:id/convert` НЕ вызывался — он создаёт пациента и запись в расписании,
   а писать в общую живую базу без разрешения ведущего я не стал.
   Закрывается: `POST /api/leads/<id>/convert` с обоими токенами по существующему обращению.
5. **Остальная часть набора тестов.** Мой сигнал — только два файла. Закрывается:
   `npm test -w @dental/web`.

## Коммит

- `41a22b63d` — 13 файлов, +792 −2966. **Внимание: этот коммит несёт ~50 строк
  незакоммиченной работы пакета W2** в `apps/web/src/workspaceShell.tsx`
  (`getVisibleRailViews`, чтение режима в `WorkspaceSidebar`/`WorkspaceTopbar`,
  `visibleStaffRoles`). Файл назван в моём клейме как «(appViews)», W2 правил в нём
  соседние функции одновременно со мной. Ничего не откатывал и не сбрасывал.
  HEAD от этого не ломается: `lib/clinicCapabilities.ts` был чист, а его символы уже
  лежали в HEAD (`47c09002a`, `58fabefb3`).
- `e2d41dc74` — 2 файла, +33 −15: разбор `StaffAuthRequired` и снятие вероятной ошибки типов.
- Индекс при обоих коммитах был пуст; коммит с явным pathspec.

## Долг

1. **`apps/api/src/tests/webCallsExistingRoutes.test.ts:60,64,65`** — строки
   `/api/billing/payouts`, `/api/communications/inbox`, `/api/communications/patients/search`
   стали мусором в списке долга: их больше никто не зовёт. Комментарий самого файла
   («адрес, которого никто не зовёт, — не долг, а мусор в списке») требует их убрать и
   уменьшить границу `KNOWN_MISSING.length <= 26`. `apps/api` вне моего клейма — не трогал.
2. **Две осиротевшие таблицы стилей**: `components/InventoryView.css` и
   `components/LeadsKanbanView.css` не импортирует никто. Разделы отрисовываются без них
   (и всегда отрисовывались). Подключать не стал: изменит вид, а вид проверяет ведущий.
3. **`ScannerView.css` перекрашивается по `prefers-color-scheme`, а не по `[data-theme]`** —
   12 блоков. Тёмные варианты не срабатывают при переключении темы в приложении. Мои новые
   правила написаны на `[data-theme]`; существующие не переписывал (это визуальная правка).
4. **`components/InventoryView.tsx`**: `paperBg`/`paperSoftBg`/`borderColor` — строки классов
   Tailwind (`"bg-white dark:bg-slate-900"`), подставляемые внутрь `style={{ background: … }}`,
   то есть невалидный CSS. 50 использований. Не мой дефект и не правился: это сплошная
   визуальная переделка файла на 1487 строк.
5. **`store/leadsStore.ts`** ходит по `VITE_API_URL ?? "http://localhost:4100/api"` и читает
   токены из `localStorage` напрямую, минуя `lib/apiAuthFetch.ts`. Файл вне клейма.
6. **§5 для `leads`** реализован повторным использованием возможности `marketingSection`
   (одно правило — один флаг). Если W2/ведущий решит, что воронке нужна своя возможность
   `leadFunnel`, менять надо `lib/clinicCapabilities.ts` (файл W2) и одну строку
   `getVisibleRailViews`.
7. **`payroll` как раздел не сделан, а удалён.** Если он нужен, недостающая половина —
   `GET /api/billing/payouts`: выручка по визиту, себестоимость материалов из
   `procedure_material_rules`, процент врача. Ни поля процента у сотрудника, ни маржи в
   прайсе сейчас нет (об этом уже написано в удалённом файле и в `FinanceView.tsx`).
   Это работа по `apps/api` + схеме, а не по вёрстке.
