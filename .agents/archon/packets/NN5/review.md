## VERDICT: NEEDS_REWORK

Пакет в основном сделан честно: шесть стражей действительно перешли 1 → 0, классы BROKEN/STALE/REAL
поставлены верно там, где я проверял по продукту, храповики кусают, извлекатель тела функции починен
по-настоящему. Рework нужен из-за одного пункта, который бриф называет отдельно: **заголовочное требование
стража настроек стало зелёным, не проверяя ничего**, и это ровно тот случай («проверка прошла бы и на
сломанном коде»), при котором вердикт задан правилом. Плюс две записи его `FOUND` неверны и, если их
поставить в очередь как есть, породят выдуманный и мёртвый пакеты.

## Что проверено, дословно, истинный код выхода без конвейера

Рабочее дерево (то, что видит `npm run`):

```
for n in imaging-viewer-usability-source shift-visit-usability-source documents-view-source \
         settings-view-source schedule-view-source onboarding-configuration-source; do
  npm run smoke:$n > /tmp/rev-NN5-$n.log 2>&1; echo "$n EXIT=$?"; done
imaging-viewer-usability-source EXIT=0
shift-visit-usability-source EXIT=0
documents-view-source EXIT=0
settings-view-source EXIT=0
schedule-view-source EXIT=0
onboarding-configuration-source EXIT=0
```

Колонка «до» проверена независимо — версия каждого стража ИЗ РОДИТЕЛЬСКОГО коммита прогнана по сегодняшним
исходникам (`git show <hash>^:scripts/… > /tmp/oldscripts/…`, запуск из корня репозитория, только чтение):

| страж | код до | первая брошенная ошибка «до» |
|---|---|---|
| shift-visit-usability | 1 | Shift call action must be disabled when the phone is missing. |
| schedule-view | 1 | ScheduleView must own schedule panel. |
| documents-view | 1 | App.tsx must guard duplicate document creation. |
| onboarding-configuration | 1 | new staff creation must save dirty clinic profile before inheriting working hours |
| settings-view | 1 | DICOMweb archive check must use the Settings admin secret boundary. |
| imaging-viewer-usability | 1 | Imaging viewer primary study image must decode asynchronously… |

Совпадает с шестью сообщениями брифа и с его таблицей: «до 1 / после 0» подтверждено, не на слово.

Коммиты: `c3cfd665e`, `7067b05bf`, `b6b6c3ac1`, `36e586681`. `git log -1 --format='%(trailers)'` пуст у всех
четырёх, автор `marko1olo`, атрибуции инструмента нет. Трогают ровно 6 файлов `scripts/smoke-*.mjs` и 4
`.agents/archon/packets/NN5-source-guards-batch-2/commitmsg*.txt` (идиом коммит-сообщения в файле уже принят
в этой кампании: `OO1`, `OO2`, `NN1`, `NN3`). **Ни одной правки продукта** — заявленное «продукт не чинится»
верно. `scripts/smoke-*` из его шести в `git status` не висят: работа зафиксирована целиком.

## КУСАЕТ ЛИ ЗАЩИТА (мутационные пробы)

Метод: копия живого дерева в `/tmp/nn5probe` (продукт на диске не менялся), точечная мутация одного файла,
прогон стража, откат. Базовая линия — все шесть зелёные в копии.

| мутация (сломанный продукт) | страж | результат |
|---|---|---|
| у `<img>` просмотрщика появился `decoding="async"` | imaging | КУСАЕТ 1 (храповик долга) |
| у `<img>` просмотрщика появился `loading="lazy"` | imaging | КУСАЕТ 1 |
| `<ShadowAnalystImageSlider` заменён другим просмотрщиком | imaging | КУСАЕТ 1 |
| снят `aria-disabled={!visitPatientHasCallablePhone}` | shift | КУСАЕТ 1 |
| обработчик звонка потерял ранний возврат | shift | КУСАЕТ 1 |
| снят `if (documentCreateSavingKind) {` | documents | КУСАЕТ 1 |
| убран текст «Дождитесь завершения текущего создания документа.» | documents | КУСАЕТ 1 |
| панель расписания переименована | schedule | КУСАЕТ 1 |
| в `hasOpenVisit` вернулась сверка `status === "draft"` | schedule | КУСАЕТ 1 (храповик) |
| `<EmptyState>` получил `className="schedule-empty-state"` | schedule | КУСАЕТ 1 (храповик) |
| «Админ-доступ активен для расписания» вернулась в разметку | schedule | КУСАЕТ 1 (запрет) |
| барьер загрузки откатился к `!dashboard \|\| !activePatient` | onboarding | КУСАЕТ 1 |
| `saveClinicProfileIfDirty` вынесен ИЗ тела `addStaffMember` (текст оставлен в файле) | onboarding | КУСАЕТ 1 |
| **у вызова `/api/imaging/dicomweb/check` снят `auth.settingsAccessHeaders` (у остальных 10 оставлен)** | settings | **ЗЕЛЁНЫЙ 0** |
| **из `apps/api/src/routes/imaging.ts` удалён вызов `requireDicomWebSettingsAccess` (объявление оставлено)** | settings | **ЗЕЛЁНЫЙ 0** |

13 из 15 кусают. Два зелёных — это одно и то же требование, обе его половины (см. FOUND-1).

Проверено и то, что он измерял: извлекатель тела функции действительно починен —
`addStaffMember` 1640, `addChair` 1556, `dismissOnboarding` 1580, `continueOnboardingInDraftMode` 1566,
`buildOnboardingFirstAppointmentIssues` 1867 символов, `boundaryFound=true` у всех пяти (было 571 907).
Реестр долга не надут артефактом переводов строк: после нормализации CRLF→LF во всём дереве копии
(243 файла) оба стража остались зелёными, ни один храповик «долг закрыт» не сработал — значит 40 и 53
записи не прячут исполненные требования.

Подставленных нулей вместо «неизвестно» в его коде нет: `appSource.match(...) ?? []` и
`imagingRequireOutcomes.get(msg)?.fail ?? 0` оба закрыты встречной проверкой, которая падает на нуле
(«долг закрыт» / «реестр разошёлся с проверками»), и она стоит РАНЬШЕ. Удаления требований проверены
поштучно и в каждом случае заменены кусающим запретом или храповиком.

## ЧТО НАДО ПЕРЕДЕЛАТЬ (узко)

1. `scripts/smoke-settings-view-source.mjs:305-325` — вернуть требованию
   «DICOMweb archive check must use the Settings admin secret boundary» связь с предметом. Сейчас клиентская
   половина проверяет ОТДЕЛЬНО наличие строки `/api/imaging/dicomweb/check` и ОТДЕЛЬНО, что где-то в склейке
   есть `headers: auth.settingsAccessHeaders({ "Content-Type": "application/json" })` — а таких вызовов в
   `useAppLogic.tsx` одиннадцать, поэтому снятие секрета именно с проверки архива страж не замечает.
   Требуется образец по блоку `fetch("/api/imaging/dicomweb/check", { … })`, а не по файлу. Серверная
   половина (`requireIn(imagingRoutesSource, "requireDicomWebSettingsAccess")`) выполняется ОБЪЯВЛЕНИЕМ на
   строке 159 и переживает удаление вызова со строки 6294 — нужен вызов
   (`if (!(await requireDicomWebSettingsAccess(request, reply))) return;`). Он сам сослался в комментарии на
   строку 159, то есть на объявление, и обязательную по записке ведущего проверку «страж ещё кусает по
   сломанной копии» для этого требования не делал — она бы это показала.
2. Убрать из очереди неверную причину по пустому расписанию и стереть её же из комментария долга
   `scripts/smoke-schedule-view-source.mjs:636-650`: `EmptyState` принимает `className` (FOUND-2).
3. Снять из очереди `requireScheduleMutationAccess` — он уже вызывается (FOUND-3).

Остальное в пакете править не нужно: наборы файлов, `requirePattern`, `assertLoose`, разделённые
формулировки и оба реестра долга проверены и держат.

## FOUND

**FOUND-1. Граница админского секрета DICOMweb не проверяется НИ ОДНОЙ стороной — доказано двумя пробами.**
`apps/web/src/useAppLogic.tsx:10160-10165` (клиент) и `apps/api/src/routes/imaging.ts:159, 6294` (сервер).
Снял секрет с клиентского вызова — `smoke:settings-view-source` вышел 0. Удалил серверный вызов
`if (!(await requireDicomWebSettingsAccess(request, reply))) return;`, оставив объявление, —
снова 0. Третьей защиты нет: `scripts/check-guarded-route-headers.mjs:36-43` СОЗНАТЕЛЬНО исключает
`requireDicomWebSettingsAccess` из своего списка («я не проверял, что она требует именно
`x-dente-admin-secret`»). То есть проверка архива снимков сегодня охраняется только тем, что никто её не
трогал, и это ровно тот же механизм, который в этой волне уже дал `1f4614ea2` (охрана расписания была
написана и не вызывалась). Поведение в продукте на месте — дефект в том, что его исчезновение никто не
заметит.

**FOUND-2. `EmptyState` принимает `className` — причина, записанная в долг, неверна, а настоящий дефект
дешевле.** `apps/web/src/components/EmptyState.tsx:10` объявляет `className?: string`, строка 25 клеит его в
корневой `div`. Значит утверждение «компонент не принимает ни `data-testid`, ни `className`»
(его FOUND и комментарий долга `smoke-schedule-view-source.mjs:636-650`) верно только про `data-testid`.
Настоящий дефект: `apps/web/src/ScheduleView.tsx:1033` не передаёт `className="schedule-empty-state"`, и из
одного пропущенного атрибута следуют три вещи — `scripts/smoke-daily-surfaces-keyboard-accessibility.mjs:307`
красный, четыре правила `.schedule-empty-state` в `apps/web/src/styles/main.css:9241,9252,9259,13904` сироты,
у пустого расписания нет адреса. Проверено: мутация, добавляющая этот `className`, роняет
`smoke:schedule-view-source` его же храповиком — то есть закрывать долг надо двумя правками, а не переписывать
компонент.

**FOUND-3. Запись «requireScheduleMutationAccess не вызывается» устарела до сдачи пакета.**
`apps/api/src/routes/schedule.ts:363` — `if (!(await requireScheduleMutationAccess(request, reply, protectedArea))) return null;`,
починено коммитом `1f4614ea2` в этой же волне. Комментарий продукта `ScheduleView.tsx:246-256`, на который он
ссылается, тоже уже неправда. Ставить это в очередь — мёртвый пакет.

**FOUND-4. `functionBody` по-прежнему падает ОТКРЫТО, и именно это дало дефект в 571 907 символов.**
`scripts/smoke-onboarding-configuration-source.mjs:96-104`: `const end = offset >= 0 ? … : appSource.length`.
Сегодня граница находится у всех пяти функций, но следующая смена отступа (или функция последней в склейке)
снова молча превратит «внутри `addStaffMember`» в «где-нибудь ниже по файлам», без единого красного. Лечится
одной строкой — `assert(offset >= 0, …)` — и это тот же класс, что он только что вычистил.

**FOUND-5. Запрет на явный `any` в компонентах расписания исчез вместе с сужением области.**
`forbidIn(scheduleViewSource, ": any", …)` теперь судит только `ScheduleView.tsx` (там ноль вхождений).
Числовой храповик он завёл только для `Record<string, any>` (2), а `key: any, value: any`
(`apps/web/src/components/schedule/AppointmentCard.tsx:36`) не считает никто: явный `any` можно теперь
добавлять в `components/schedule/*.tsx` без красного. Сужение по существу верное (сообщение называет
`ScheduleView`), не хватает второго счётчика.

**FOUND-6 (мелочь, замерено).** `smoke-settings-view-source.mjs` и `smoke-imaging-viewer-usability-source.mjs`
не нормализуют `\r\n`, а 9 из 24 добавленных файлов настроек — CRLF (`SettingsTelegramTab.tsx` 1126,
`SettingsClinicTab.tsx` 1093, `InsuranceContractsPanel.tsx` 675, `SettingsRulesTab.tsx` 614,
`SettingsStaffTab.tsx` 513, `SettingsProfileTab.tsx` 451, `SettingsBpmnTab.tsx` 425, `SettingsAccessTab.tsx` 303,
`SettingsMessengersTab.tsx` 138). Любой многострочный needle по этим файлам не совпадёт никогда, чем бы ни был
код. На сегодняшнюю раскладку долга это НЕ влияет (прогон по нормализованной копии остался зелёным), но
`smoke-schedule-view-source.mjs` нормализацию делает, а эти два — нет; расхождение стоит свести.

## Подтверждено из его отчёта (проверено по диску, не по словам)

517 строк `// Compliance:` в `apps/web/src/useSettingsDerivations.tsx` — есть, и файл сознательно не добавлен
в набор: строка `className="settings-zone" id="settings"` встречается ровно в двух местах — `App.tsx` и этот
реестр комментариев, то есть добавь его — и требование «выполнилось» бы комментарием.
`apps/web/src/imagingUiLabels.ts:1` — живая подделка подтверждена: needle есть только в комментарии, настоящее
объявление на 16-19 разложено форматтером. `ShadowAnalystImageSlider.tsx` — три `<img>`, `decoding="async"`
ноль вхождений, `alt` зашит тремя строками (вердикт REAL верен). `ShiftView.tsx:68-69` — мёртвые пропсы
`activePatientHasCallablePhone`/`activePatientCallablePhone` (в теле работает `visitPatient*`), при этом
`ShiftView.tsx:96` статус приёма проверяет правильно, а `ScheduleView.tsx:983` — нет
(`applyActiveVisit`, `apps/api/src/db/domainStateHydration.ts:902-908`, при отсутствии черновика берёт `latest`
любого статуса: дефект достижим). `buildOfflineDraft` — 6 вхождений, ни одного `onClick`.
`buildOnboardingFirstAppointmentIssues` — две копии (`useAppLogic.tsx:2966`, `useScheduleLogic.ts:368`).
`useAppLogic.tsx:13753` — `setError(\`Быстрый приём: ${err.message ?? "Ошибка сети"}\`)`.
`VisitView.tsx:1020,1063,1117,1160` — `aria-label={\`Зуб ${code}\`}` против правильного
`ToothChart.tsx:369`. Перенос требования про «тяжелые данные снимков» на `apps/api/src/routes/smartImports.ts:2874`
верен: текст пишет сервер.

## Что не запускалось

Общие гейты — `typecheck`, `build`, полный `npm test` — не запускались: они ведущего. Мутационные пробы шли в
копии `/tmp/nn5probe`, исходники репозитория ими не менялись; временные каталоги `/tmp/nn5probe` и
`/tmp/oldscripts` остались на диске, ничего запущенного не осталось (все прогоны — короткие `node`,
без серверов и портов).
