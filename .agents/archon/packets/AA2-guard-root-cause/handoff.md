# AA2-guard-root-cause — handoff

HEAD на момент коммита: 82fd6427916f8633afa37d5bf7a8b92441cbd8f1
(родитель 54ee3398ce8783c4f3e274440d0553b8a9192da5; за смену работы HEAD прошёл
f3071534e -> dba665723 -> f9e4a1e57 -> 54ee3398c, каждый раз перечитан заново)

## Что было сломано (file:line)

1. `scripts/lib/component-mount-rules.yml:32-34` — вся перепись внешнего стража стояла на трёх
   шаблонах ast-grep: `export function $NAME($$$PARAMS) { $$$BODY }`,
   `export const $NAME = ($$$PARAMS) => $$$BODY`, `export const $NAME = $WRAPPER($$$WRAPPED)`.
   Аннотация типа на имени не даёт совпасть ни одному. Замер разбором @babel/parser: в apps/web/src
   **34 объявления вида `export const X: React.FC = () =>`** из 195 компонентов, то есть страж не
   видел каждый шестой. Среди невидимых — `pages/PublicBookingWidget.tsx:46` и
   `components/plan/ComparativePlannerDashboard.tsx:150`, ровно те две сироты, которые ведущий нашёл
   руками. Страж печатал «158 компонентов» и был уверен, что это всё дерево.
2. `scripts/check-component-mount-reachability.mjs:658-664` — в списке исключений проверялся на
   истинность ОБЪЕКТ записи (`if (allowed) { ... return false; }`), а `allowed.reason` только
   копировался в вердикт. Плюс `:194` `relativePath.startsWith(entry.path)` — сравнение по ПРЕФИКСУ.
   Итог: `{ path: "apps/web/src", reason: "" }` четырьмя строками гасил все нарушения, прогон печатал
   «[НАРУШЕНИЕ]» (`:738`, потому что `""` ложно) рядом с «нарушений 0» и выходил нулём (`:758`).
3. Ни одного гейта. Скрипта нет ни в корневом `package.json` (139 скриптов), ни в
   `apps/web/package.json` (5). Его собственный тест
   `scripts/tests/check-component-mount-reachability.test.mjs` не был вызван ничем.
4. Третий владелец инварианта, спорящий с двумя работающими:
   `components/documents/DocumentUkepSignButton.tsx` для стража «[НАРУШЕНИЕ]», для
   `apps/web/src/tests/documentsViewDecomposition.test.ts:162-222` — принятое исключение с причиной.
5. `apps/web/src/tests/panelsAreMounted.test.ts` (прежняя редакция) — поимённый `MOUNTED_PANELS`
   из семи панелей плюс обход трёх клинических каталогов. Достижимость считалась разрешением
   импортов **ПО BASENAME** (`:143`), а рендер — текстовым `source.includes("<" + component)`
   (`:205`). Оба даёт ложное ЗЕЛЁНОЕ: `<Badge` совпадает на `<BadgeGroup`, а
   `utils/math/mprMath.ts` объявлял достижимым `mprMath.ts` (три реальные коллизии basename в дереве:
   mprMath, toothGeometry, unifiedPdfGenerator).
6. `apps/web/src/tests/patientCardDecomposition.test.ts:228-280` — третий по счёту обход каталогов,
   признававший «подключён» по факту ИМПОРТА через регулярное выражение по имени модуля. Импорт не
   рендер: импортировать можно из мёртвого файла, ровно так жил AppRouter.tsx.

## Что изменено

* **УДАЛЕНО** (`git rm -f`, 1319 строк): `scripts/check-component-mount-reachability.mjs`,
  `scripts/lib/component-mount-rules.yml`, `scripts/tests/check-component-mount-reachability.test.mjs`.
* **НОВОЕ** `apps/web/src/tests/utils/componentReachability.ts` (849 строк) — единственная перепись.
  Разбор @babel/parser, один проход на файл, результат кэшируется на процесс, подпроцессов ноль.
  Форма объявления не значит ничего: аннотация типа, memo/forwardRef, класс — те же узлы.
  Достижимость считается от `main.tsx` только по рёбрам, ведущим к рендеру: `import` ради побочного
  эффекта и голый `import()` рёбрами НЕ являются (иначе `workspacePreload.ts` отбелил бы всё дерево),
  `lazy(() => import("./X").then((m) => ({ default: m.X })))` — является. Импорты разрешаются ПО
  ПУТИ, не по basename. Рендером считается постановка ТЕГОМ из достижимого модуля, а имя связывается
  через привязку импорта и через ре-экспорт-бочку.
* **ПЕРЕПИСАНО** `apps/web/src/tests/panelsAreMounted.test.ts` — единственный владелец инварианта.
  Поимённый список семи панелей заменён обратным утверждением по всей переписи. Два списка:
  `DECLARED_UNMOUNTED` (2 записи, поле `reason` обязательно и проверяется как строка) и
  `LEGACY_UNMOUNTED_BACKLOG` (32 записи, поля причины НЕТ сознательно — 33 ненаписанных причины были
  бы отпиской, а отписка гасит стража так же, как пустая строка) с потолком 32, который нельзя
  поднять. Сохранены прежние проверки реестра разделов и отсутствия второго маршрутизатора; добавлена
  проверка, что удалённый страж не вернулся.
* **ОБРЕЗАНО** `apps/web/src/tests/patientCardDecomposition.test.ts` — третий обход сирот убран,
  на его месте объяснение, почему это не ослабление. Проверки самой формы реквизитов (9 штук)
  остались. Файл был НЕ ЗАКОММИЧЕН вообще (`git log --all` по нему пуст) — теперь в истории.
* Причина по `ComparativePlannerDashboard.tsx` перенесена в `DECLARED_UNMOUNTED` и перепроверена.
* `pages/PublicBookingWidget.tsx` — решение (c): заявленный долг с причиной. НЕ УДАЛЕНА, НЕ ИЗМЕНЕНА.

## Решение по pages/PublicBookingWidget.tsx: (c) карантин с причиной

Прочитан целиком (477 строк). Это работающая онлайн-запись: три шага, состояния загрузки/ошибки/
пустоты на каждом, человеческий русский текст вместо кодов, разбор 409 с возвратом на выбор времени и
перезапросом слотов, дата по МЕСТНОМУ времени пациента. Адреса живые: `apps/api/src/server.ts:457`.
Удалять работающую функцию ради зелёного стража — неверный ход.
Подключить нельзя из этого задания: у `apps/web` одна точка входа (`apps/web/index.html`), в
`vite.config.ts:63-64` только `manualChunks` без `rollupOptions.input`, а `main.tsx:33-39` сначала
вызывает `installApiAuthFetch()` (подставляет токен кабинета во ВСЕ запросы к `/api/`) и лишь потом
безусловно рендерит `AppShell`. Пациент — единственный внешний посетитель; отдать ему клинический
токен нельзя. Нужен либо второй вход Vite, либо развилка по адресу до AppShell — решение об
архитектуре публичного контура, и правится оно в `main.tsx` / `AppShell.tsx` / `vite.config.ts`,
которых в моём claim нет.

## ПРОВЕРЕНО

* **UNIT VERIFIED** `node --import tsx --import ./testCssStub.mjs --test src/tests/panelsAreMounted.test.ts`
  из `apps/web` — `pass 9 / fail 0`, TRUE_EXIT=0. Печатает
  `перепись: 315 файлов, 195 компонентов, 3853 мс`.
* **UNIT VERIFIED** тот же прогон `src/tests/patientCardDecomposition.test.ts` — `pass 9 / fail 0`, exit 0.
* **UNIT VERIFIED** `src/tests/documentsViewDecomposition.test.ts` (третий владелец, НЕ в моём claim)
  exit 0 — противоречия я не внёс.
* **UNIT VERIFIED (отрицательный контроль, 5 из 5 сработали)** — гейт не «проходит, ничего не
  проверяя». Правки внесены, прогон снят, файл восстановлен `git checkout`:
  1. `reason: "   "` => «Долг заявлен с пустой причиной: components/Badge.tsx:Badge»;
  2. удалена строка наследия => «Компонент существует, и пользователь его увидеть не может:
     components/HelpHUD.tsx:21 HelpHUD [orphaned]»;
  3. дописана 33-я строка => «в LEGACY_UNMOUNTED_BACKLOG 33 записей при потолке 32»;
  4. в наследие внесён смонтированный `AppShell.tsx:AppShell` => «Компонент записан
     несмонтированным, но перепись его так уже не видит»;
  5. три файла стража возвращены пустышками => «... вернулся в дерево».
  Прогоны: exit 1, `fail 4 / pass 5` и exit 1, `fail 2 / pass 7`.
* **ЗАМЕР ВРЕМЕНИ (реальный, не заявленный)**: перепись 315 файлов — **3853 мс**; весь файл теста
  `duration_ms 4855`, при повторе 6615 мс на загруженной машине. Удалённый тест стража шёл 4 м 33 с.
  Потолок в тесте 60 000 мс — ловит возврат к процессу-на-файл, а не разброс.
* **SMOKE VERIFIED** `npm run smoke:web-text-encoding` — `{"ok":true,"checkedFiles":423,
  "mojibakeHits":0,"garbledQuestionHits":0,"requiredSnippets":13}`, exit 0.
* **Одиночный typecheck ДВУХ МОИХ ФАЙЛОВ** (не проектный гейт, отдельная конфигурация):
  `npx tsc --noEmit --skipLibCheck --strict --target es2022 --module esnext --moduleResolution bundler
  --types node src/tests/utils/componentReachability.ts src/tests/panelsAreMounted.test.ts` => exit 0.
* **Удаление проверено repo-wide**, а не по `apps/`:
  `git grep -n "check-component-mount-reachability" HEAD -- .` и то же для `component-mount-rules` —
  ИМПОРТОВ ноль. Найдены только упоминания в прозе: `.agents/lead/accept-orphans-clinical.md:239,241`,
  `.agents/lead/recon-doctor-payouts.md:19`, `.agents/lead/verdict-onboarding-tree.md:4`,
  `apps/web/src/components/reports/ManagerReportsPanel.tsx:595`,
  `apps/web/src/pages/DoctorPayoutDashboard.tsx:8`. Ни один не `import`/`require`, загрузчик ничего не
  ломает. В `package.json` (корень и apps/web) упоминаний нет.

## НЕ ПРОВЕРЕНО

* Проектный typecheck и весь набор тестов — гейты ведущего по §7a. Закрывается:
  `npm run typecheck -w @dental/web` и `npm test -w @dental/web`.
* Что перепись не даёт ЛОЖНОГО ЗЕЛЁНОГО на компоненте, который рендерится только через
  `React.createElement` в рантайме по строковому имени (карта `Record<string, ComponentType>`).
  Такой формы в дереве я не искал. Закрывается:
  `rg -n "createElement\(\s*[a-zA-Z]+\[" apps/web/src` и разбор найденного.
* Что `pages/PublicBookingWidget.tsx` действительно работает против живого сервера. HTTP-вызов я не
  делал: страница не смонтирована ни в одном контуре, дёргать её адреса в обход интерфейса — не
  доказательство её работы. Закрывается (сначала выбрав контур):
  `curl -s -o - -w "%{http_code}" http://127.0.0.1:4100/api/public/booking/<orgId>/doctors`.
* Стабильность списков при параллельной работе фронта — см. «Долг», п.1.

## Коммит

`82fd6427916f8633afa37d5bf7a8b92441cbd8f1` — 9 файлов, +1687 / -1573.
`git log -1 --stat` перечитан: русский заголовок целый, мозаики нет, чужих файлов нет.
В индексе на момент коммита лежали ЧУЖИЕ файлы (`rebookingConversionRulesQuery.ts`,
`RebookingConversionRulesWidget.tsx`, `pages/DoctorPayoutDashboard.css`,
`pages/FinancialDashboard.css`, `pages/FinancialDashboard.tsx`) — не тронуты, pathspec защитил, в
коммит не попали.

## КОЛЛИЗИЯ, О КОТОРОЙ НАДО ЗНАТЬ ВЕДУЩЕМУ

`scripts/check-component-mount-reachability.mjs` был **ГРЯЗНЫМ**: 32 незакоммиченные строки, вводящие
`DEBT_CEILING = 26` — то есть ХРАПОВИК ВНУТРЬ СТРАЖА, которого пакет велит удалить. Правка ссылается
на `.agents/lead/verdict-onboarding-tree.md`, то есть авторство ведущего, и по времени файла (16:05)
предшествует выдаче пакета (17:33). Я прочёл это как «правка отменена самим приказом»: пакет назван
двухстрочным «инструмент удаляется, а не затачивается», сам файл прямо назван моим claim, и
`.agents/lead/accept-orphans-clinical.md:241` в HEAD жалуется, что файл «всё ещё лежит на диске».
Удалил — но **не уничтожил**: полный diff сохранён в
`.agents/archon/packets/AA2-guard-root-cause/preserved-uncommitted-guard-edit.diff` и закоммичен
вместе с изменением. Если решение было обратным, идея храповика уже реализована в тесте
(`LEGACY_BACKLOG_CEILING`), но правильнее, чем в удалённом страже: там потолок не мешал пустой
причине гасить нарушение.

## Долг

1. **Списки чувствительны к параллельной работе.** `LEGACY_UNMOUNTED_BACKLOG` снят в 18:2x. За время
   моей работы `components/finance/CashDayTally.tsx` успел появиться сиротой и через минуты стать
   смонтированным (`FinanceView.tsx:10,337`) — файл до сих пор `??`. Если ведущий на разборе волны
   увидит ОДНО новое имя в «Компонент существует, и пользователь его увидеть не может» — это свежая
   сирота от параллельного пакета, а не моя поломка: сообщение называет файл, строку и два выхода.
   Так гейт и должен себя вести.
2. **Третий обход сирот остался в `apps/web/src/tests/documentsViewDecomposition.test.ts`** (не мой
   claim, не тронут). Его исключение `DocumentUkepSignButton` теперь согласовано с моим наследием, но
   владельцев инварианта всё ещё два. Слить его в перепись — отдельное задание на один файл.
2b. Прежний тест умел проверять, что ИМЕНОВАННАЯ панель не удалена вместе со своим рендером; перепись
   так не умеет (удалили и файл, и вызов — она молчит). Частично закрыто соседом:
   `apps/web/src/tests/operationsPanelsStyling.test.ts:24-27` держит четыре из тех панелей поимённо.
3. **Прозаические ссылки на удалённый файл** в `ManagerReportsPanel.tsx:595` и
   `pages/DoctorPayoutDashboard.tsx:8` теперь указывают в никуда. Оба вне claim, поэтому не правил;
   на загрузку не влияет, но при чтении сбивает.
4. **33 несмонтированных компонента остаются несмонтированными.** Из них 11 — одна ветка мастера
   первого запуска (`OnboardingPreview.tsx` -> `OnboardingSetupWizard.tsx` -> 7 шагов + 2 элемента
   `SharedOnboardingUI`), у неё уже есть вердикт ведущего в `.agents/lead/verdict-onboarding-tree.md`.
   Разбор остальных — не это задание; они перечислены поимённо и больше не могут спрятать новую сироту.
5. **Долг i18n не добавлен**: весь новый текст — сообщения падений тестов, пользователь их не видит,
   словарь не нужен.
