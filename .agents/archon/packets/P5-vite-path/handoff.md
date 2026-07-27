# P5-vite-path — отчёт

HEAD: aa649990557f886d93fdd88e54d89029228cffc8 (на момент моего коммита был 94c6caa15;
после меня в дерево коммитили другие агенты, мой коммит 2646c8064 в истории цел)

## Что было сломано

Дефект из пакета подтверждён полностью, цитаты дословно совпали:

| файл | строка | код |
|---|---|---|
| scripts/smoke-workspace-live-routes.mjs | 36 | `const vitePath = path.resolve("apps/web/node_modules/vite/bin/vite.js");` |
| scripts/smoke-workspace-live-settings-actions.mjs | 43 | то же |
| scripts/smoke-workspace-live-core-actions.mjs | 44 | то же |

Файловая проверка: `ls apps/web/node_modules/vite` -> `No such file or directory`;
`ls node_modules/vite/bin/vite.js` -> существует. vite 6.4.3 поднят (hoisted) в корневой
`node_modules`, как и положено в npm-workspaces.

Сообщение об ошибке врало: «Vite binary is missing. Run dependency install before this smoke
test.» (routes:73-75, settings:67-71, core:68-72). Зависимости установлены. Агент, прочитавший
это, чинил бы окружение вместо пути.

Обзор идиомы: `grep "node_modules/vite"` по `scripts/` и `package.json` даёт РОВНО эти три
файла. Четвёртого файла с той же поломкой нет — планировать леду нечего.

## Что изменено

1. **scripts/lib/resolveViteBin.mjs** — новый общий помощник. Настоящее разрешение модулей:
   `createRequire(...).resolve("vite/package.json")`, имя исполняемого файла берётся из поля
   `bin` манифеста, а не зашито строкой. Поиск от корня репозитория и от `apps/web`, корень
   вычисляется от `import.meta.url`, а не от cwd. Если vite не найден — ошибка перечисляет
   все проверенные пути и говорит правду: пакет не удалось разрешить.
2. **Три скрипта** — жёсткая константа удалена; `const vitePath = resolveViteBin();` поставлен
   ровно туда, где стояла проверка `existsSync`, поэтому порядок ошибок (браузер -> dist API ->
   vite) не изменился. В `routes.mjs` объявление осталось внутри ветки `if (!baseTargetUrl)`,
   так что режим с внешним URL по-прежнему vite не требует.

Помощник вынесен в `scripts/lib` (рядом с `findFreePort.mjs`, `sleep.mjs`) осознанно: это
четвёртый файл сверх заявленных трёх. Тройное копирование резолвера было бы ровно тем грехом
«четырёх мёртвых копий getDefaultOrganizationId», который запрещён брифом. Новый файл не
конфликтует с другими агентами — его ни у кого не было.

## ПРОВЕРЕНО

**Дефект реален (файловая система).**
```
$ ls -d apps/web/node_modules/vite
ls: cannot access 'apps/web/node_modules/vite': No such file or directory
$ ls -d node_modules/vite/bin/vite.js
node_modules/vite/bin/vite.js
```

**Синтаксис — гейт пакета.** `node --check` на всех четырёх файлах: SYNTAX OK ×4.

**Резолвер возвращает верный путь (исполнено).**
```
resolved      : C:\Clinic_MVP\dental-crm\node_modules\vite\bin\vite.js
exists on disk: true
search roots  : C:\Clinic_MVP\dental-crm | C:\Clinic_MVP\dental-crm\apps\web
```

**Сообщение об ошибке честное и перечисляет пути (исполнено, роуты C:/nowhere-a, C:/nowhere-b).**
```
Vite could not be resolved from any workspace root. Attempted:
  require.resolve("vite/package.json") from C:/nowhere-a -> MODULE_NOT_FOUND
  C:\nowhere-a\node_modules\vite\package.json -> not on disk
  require.resolve("vite/package.json") from C:/nowhere-b -> MODULE_NOT_FOUND
  C:\nowhere-b\node_modules\vite\package.json -> not on disk
```

**Vite реально стартует во всех трёх смоуках (исполнено).** Из вывода самих скриптов:
```
--- WEB PROCESS STDOUT ---   (smoke:workspace-live-core-actions)
  VITE v6.4.3  ready in 319 ms
  ➜  Local:   http://127.0.0.1:50246/
```
`smoke:workspace-live-settings-actions` — `VITE v6.4.3 ready in 356 ms`.
`smoke:workspace-live-routes` — доходит до браузера и CDP, падает уже на этапе страницы.
Гейт vite пройден во всех трёх. Скрипты больше не умирают на старте.

**API VERIFIED — второй дефект, живой HTTP-запрос к 127.0.0.1:4100:**
```
GET /api/dashboard (без заголовка авторизации) -> HTTP 401
body: {"error":"AuthRequired","message":"Требуется авторизация рабочего кабинета клиники."}
```

## НЕ ПРОВЕРЕНО

**SMOKE VERIFIED не заявляю ни для одного из трёх. Ни один не завершился с кодом 0.**
Мой дефект устранён, но за ним обнаружился второй, к пути vite отношения не имеющий.

| смоук | текущее падение | команда воспроизведения |
|---|---|---|
| workspace-live-routes | `Error: shift app shell did not become ready: false` (exit 1) | `npm run smoke:workspace-live-routes` |
| workspace-live-core-actions | `SMOKE TEST FAILED: Error: HTTP 401` (exit 1) | `npm run smoke:workspace-live-core-actions` |
| workspace-live-settings-actions | `SMOKE TEST FAILED: Error: HTTP 401` (exit 1) | `npm run smoke:workspace-live-settings-actions` |

Причина падения `workspace-live-routes` — вывод по аналогии, не доказательство: этот скрипт
не печатает логи API при падении, поэтому 401 в его изолированном экземпляре я своими глазами
не видел. Конфигурация API у него та же, а `.app-shell` в вебе рендерится (App.tsx:2032 и
App.tsx:2299), значит приложение не дошло до рендера. Закрывающая команда:
`npm run smoke:workspace-live-routes` с временным дампом `webProcess.stderr()`/`apiProcess.stderr()`
в блоке catch, как это уже сделано в двух других скриптах.

## Коммит

`2646c8064a8272b7cb23b53e89c78529b2a05f24`
`[ARCHON] fix(смоук-тесты): три живых теста не запускались — vite искали там, где его нет`
6 файлов, кириллица в теме целая, чужих файлов не затянуто.
НЕ трогал (чужая незакоммиченная работа в `scripts/`): `ops-panels-shots.mjs`,
`smoke-visit-workflow-forms-lifecycle.mjs`.

## Долг / Blockers

**BLOCKER — второй дефект, НЕ мой, НЕ чинил (правило двух страйков).**
Три живых смоука не авторизуются в API вообще, а `/api/dashboard` с некоторых пор требует
подписанный токен:
- `apps/api/src/routes/dashboard.ts:12` — `const orgId = requireOrganizationId(request, reply);`
- `apps/api/src/security/identity.ts:132-142` — при отсутствии организации `reply.code(401)`
  `{"error":"AuthRequired"}`
- `apps/api/src/routes/dashboard.ts:7-11` — комментарий прямо фиксирует, что это осознанное
  усиление безопасности: раньше без токена orgId молча становился `00000000-...-0001`, и любой
  анонимный запрос получал финансовую сводку демо-организации.

Защита правильная — устарели смоуки. Один и тот же 401 повторился в двух прогонах из двух,
печатающих логи, поэтому обвязку с авторизацией я навешивать не стал.

Важно для того, кто возьмёт следующий пакет: `DENTE_CLINICAL_ALLOW_UNGUARDED_READS=1` (его
выставляет только `routes.mjs`) НЕ помогает — `dashboard.ts` зовёт `requireOrganizationId`
напрямую и в `accessGuard` не заглядывает.

Что я предлагаю сделать вместо глушения: авторизовать смоуки по-настоящему, и обе стороны сразу.
Node-часть (`fetchJson` к `/api/dashboard`, `/api/ai/recognition-jobs`) должна слать
`x-dente-clinic-token`, подписанный через `signToken({organizationId}, TOKEN_SECRET())`; браузеру
тот же токен нужно положить до загрузки приложения (`Page.addScriptToEvaluateOnNewDocument`),
иначе React-приложение так и не отрендерит `.app-shell`. Это отдельный пакет: он требует
разобраться, как веб-клиент хранит и отправляет токен кабинета, и трогает файлы вне моей заявки.

**Долг документации (не чинил, вне заявки):**
- `.agents/COMMANDS_AND_TESTS.md` — ни один из трёх смоуков в таблице не значится вообще;
  строка 44 даёт неверный ключ `smoke:documents-lifecycle` (реальный — `smoke:document-lifecycle`);
  строки 14 и 50 приказывают `npx @biomejs/biome check --write .` (Biome не установлен);
  строка 21 всё ещё называет базу PGlite.
- `.agents/AGENTS.md:141` — «Тесты: Playwright (headless Chromium)», хотя конфигурации
  Playwright и `.spec`-файлов в репозитории нет.

**Поправка к брифу:** `.agents/AGENTS.md:7` в живом дереве УЖЕ исправлен и говорит «native
PostgreSQL 18 at 127.0.0.1:5432 (pg.Pool, DATABASE_URL required; PGlite is NOT installed)».
Утверждение брифа, что строка 7 всё ещё про PGlite, устарело.
