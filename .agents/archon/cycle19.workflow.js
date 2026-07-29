export const meta = {
  name: 'archon-cycle-19',
  description: 'DENTE cycle 19: a state-system log with no tenant column, safety that defaults to permissive, two auth idioms, a ratchet blind to HTTP method, an orphaned public booking form',
  phases: [
    { title: 'Build', detail: 'four reworks; reproduce the reviewer findings before trusting them' },
    { title: 'Attack', detail: 'a different agent per packet; a touched money comparison is REVERT-grade' },
  ],
}

/*
 * DELIBERATELY SHORT LAW. The previous cycles carried a ~15 KB preamble and agents
 * were spending their whole credit window reading it before doing any work — six
 * agents died in a row without committing. This law is ~2 KB on purpose. The rest
 * of the constitution is on disk and the packet says which parts to read.
 */
const LAW = `
You are an implementer on the DENTE dental CRM under lead [ARCHON].
Repo root: C:\\Clinic_MVP\\dental-crm (branch main). Russian-language dental CRM for solo dentists.

═══ THIS IS A SMALL PACKET. FINISH IT AND COMMIT WITHIN MINUTES. ═══
Credit exhaustion has killed six agents in a row here, each before committing. So:
1. Do NOT read the whole constitution. Read ONLY your target file and the two lines this brief names.
2. Make the change. It is mechanical and the brief tells you exactly what.
3. **COMMIT AS SOON AS IT COMPILES.** Then improve if you still have room.
4. Write '<packet dir>/state.md' with one line before you start and one line after you commit. Nothing else.

═══ GIT — THE INDEX IS SHARED, OTHER AGENTS STAGE FILES ═══
    for i in 1 2 3 4 5 6; do git commit -F <msgfile> -- <your paths> && break || sleep 4; done
The '--' and the explicit path list are MANDATORY — a bare 'git commit' takes another agent's staged work.
No 'git push' (lead only). No 'git stash'. No 'git add .'. **NEVER 'git remote -v'** — the remote URLs
contain live plaintext access tokens.

═══ BANNED ═══
No script that writes a source file. No 'node -e' that writes. No regex surgery across files. Editor tools
only; 'node -e' is fine READ-ONLY. One such script destroyed 10,554 Cyrillic characters in this repo.
**Never read, echo or commit anything from '.env' or 'local-secrets/'.**
**NO TOOL ATTRIBUTION IN THE COMMIT** — no 'Co-Authored-By', no '@anthropic.com', no «Generated with»
footer. The owner's standing instruction, already violated 220 times. Write the message to a file, commit
with 'git commit -F', and check 'git log -1 --format=%(trailers)' is EMPTY.

═══ GATES ARE THE LEAD'S (§7a) ═══
Do NOT run 'npm run typecheck', 'npm run build', 'npm test', migrations or seeds — they write shared state
and three other agents are running. **Your own signal is 'node --import tsx --test <one file>'.** Put any
command you need the lead to run into 'leadMustRun'.

═══ COMMIT MESSAGE ═══
Russian, Conventional Commits, prefixed '[ARCHON] ', subject names THE DEFECT not the activity. Body says
WHY. Banned words: improve, enhance, update, cleanup. Example from HEAD:
    fix(документы): квитанция и возврат на верную сумму отклонялись из-за сложения в плавающей точке

═══ HONESTY ═══
Every "proven" entry is a command you actually RAN, with its TRUE exit code — captured WITHOUT a pipe
('cmd > /tmp/log 2>&1; echo $?'), because '$?' after a pipe reports the pipe and the lead has been fooled by
that. If your measurement contradicts this brief, YOUR MEASUREMENT WINS — say so loudly. The lead has been
wrong seven times tonight and expects correction.
`

const PACKETS = [
  {
    id: 'JJ1-egisz-logs-no-tenant',
    label: 'JJ1 журнал обмена с госсистемой без разделения по клиникам',
    dir: '.agents/archon/packets/JJ1-egisz-logs-no-tenant',
    files: 'apps/api/src/db/schema.ts и НОВЫЙ файл миграции в apps/api/drizzle или где лежат остальные миграции — найдите сами через fd',
    gate: 'node --import tsx --test на любой существующий тест схемы; миграцию НЕ применять',
    brief: `
ЖУРНАЛ ОБМЕНА С ГОСУДАРСТВЕННОЙ СИСТЕМОЙ НЕ РАЗДЕЛЁН ПО КЛИНИКАМ И НЕВИДИМ ДЛЯ ПЕРЕПИСИ СХЕМЫ.

**ИЗМЕРЕНО ВЕДУЩИМ НА HEAD, подтвердите каждое сами:**
- Таблица \`egisz_logs\` в живой базе СУЩЕСТВУЕТ: её создаёт миграция
  \`0000_freezing_randall_flagg.sql:521-529\`, 7 колонок, 0 строк.
- Колонки \`organization_id\` у неё НЕТ — запрос по ней падает с «column "organization_id" does not exist».
- \`rg -c 'egiszLogs' apps/api/src/db/schema.ts\` даёт **0**: в Drizzle таблица не объявлена вообще.
- Её перечисление статусов Pending/Sent/Error/Accepted буквально совпадает с \`EgiszMonitor.tsx:23-25\`.

**ПОЧЕМУ ЭТО ДВА ДЕФЕКТА, А НЕ ОДИН.**
1. **Без \`organization_id\` журнал не разделён по клиникам.** Это журнал передачи медицинских данных в
   государственную систему. В многопользовательской базе такая таблица либо принадлежит клинике, либо
   является дырой в изоляции арендаторов.
2. **Без объявления в Drizzle таблицу не видит НИ ОДНА перепись, которая ходит по схеме.** Именно так она
   и прожила незамеченной: инструменты аудита этого проекта читают объявления Drizzle. Таблица есть в
   базе, а ORM о ней не знает.

**ПОРЯДОК РАБОТЫ.**
1. Найдите каталог миграций через \`fd\` (не \`find\`) и прочитайте, как оформлены последние две: нумерация,
   стиль, идёт ли рядом файл журнала/метаданных. Повторите принятый стиль, не выдумывайте свой.
2. Объявите таблицу в \`schema.ts\` рядом с соседями по домену. Колонки — по факту из миграции 0000, а не по
   догадке: прочитайте её.
3. Напишите миграцию, добавляющую \`organization_id\`. **Решите и обоснуйте, как быть с существующими
   строками** — их 0, поэтому \`NOT NULL\` безопасен, но проверьте это сами запросом и напишите в теле
   коммита, чем проверили. Если строк окажется не 0, \`NOT NULL\` без значения по умолчанию сломает
   применение, и тогда нужен другой план.
4. **МИГРАЦИЮ НЕ ПРИМЕНЯТЬ.** Миграции и база — общий гейт ведущего (§7a), и рядом работают другие агенты.
   Напишите файл, положите точную команду применения в \`leadMustRun\` и остановитесь.
5. Если найдёте другие таблицы в базе без объявления в Drizzle — перечислите в \`foundNotFixed\`, это тот же
   класс. Ищите через \`rg\`, а не \`grep -r\`.

**ЧЕГО НЕ ДЕЛАТЬ.** Не выдумывать колонки, которых нет в миграции 0000. Не добавлять индексы «на будущее».
Не трогать код ЕГИСЗ — этим занимается другой пакет. Не применять миграцию.
`,
  },
  {
    id: 'JJ2-inverted-default-safety',
    label: 'JJ2 незаданное окружение считается разрешающим',
    dir: '.agents/archon/packets/JJ2-inverted-default-safety',
    files: 'apps/api/src/accessGuard.ts и тест рядом с ним',
    gate: 'node --import tsx --test на ваш новый тест',
    brief: `
УСЛОВИЕ БЕЗОПАСНОСТИ СФОРМУЛИРОВАНО ТАК, ЧТО ОТСУТСТВИЕ НАСТРОЙКИ ЗНАЧИТ «РАЗРЕШЕНО».

**ИЗМЕРЕНО НА HEAD, две площадки:**
    accessGuard.ts:18  return process.env.NODE_ENV !== "production" && ...ALLOW_UNGUARDED_MUTATIONS === "1";
    accessGuard.ts:22  return process.env.NODE_ENV !== "production" && ...ALLOW_UNGUARDED_READS === "1";

**ПОЧЕМУ ЭТО ЛОВУШКА, А НЕ ПРИДИРКА.** \`NODE_ENV !== "production"\` истинно, когда переменная НЕ ЗАДАНА
вовсе. То есть безопасность по умолчанию перевёрнута: защищает не наличие запрета, а наличие правильно
выставленной настройки. \`apps/api/package.json\` объявляет \`"start": "node dist/server.js"\` и \`NODE_ENV\`
не задаёт; ни один Dockerfile тоже. Сейчас дыра закрыта только тем, что сами флаги
\`ALLOW_UNGUARDED_*\` нигде не выставлены — ведущий снял с учёта \`.env.local\`, который их выставлял
(коммит e58838c51). **То есть система держится на отсутствии второго условия, а не на первом.**

**ЧТО СДЕЛАТЬ.** Перевернуть проверку так, чтобы обход требовал ЯВНОГО разрешения, а не отсутствия
запрета. Например: обход возможен только при \`NODE_ENV === "development"\` или \`=== "test"\` — то есть при
названном режиме, — плюс флаг. Тогда пустое окружение перестаёт быть разрешающим.

**ОБЯЗАТЕЛЬНО ПРОВЕРЬТЕ, ЧТО НЕ СЛОМАЕТЕ ТЕСТЫ.** Многие тесты этого репозитория выставляют
\`ALLOW_UNGUARDED_*\` и рассчитывают на обход. Найдите их через \`rg\` (не \`grep -r\`) и посмотрите, задают ли
они \`NODE_ENV\`. **Если тесты полагаются на незаданное окружение, ваша правка их уронит — и это не повод
отказаться от правки, а повод привести тесты в соответствие**: тест, который работает только потому, что
окружение не настроено, документирует ту же ловушку. Приведите их явно и скажите, сколько тронули.

**ДОКАЗАТЕЛЬСТВО.** Тест на сам предикат: пустое окружение → обхода НЕТ даже с флагом; названный режим
разработки плюс флаг → обход есть; \`production\` плюс флаг → обхода нет. Третий случай наверняка уже
покрыт, первый — почти наверняка нет, и именно он и есть дефект.

**НЕ РАСШИРЯЙТЕ ОБЛАСТЬ.** Только этот файл и его тест. Идиомы авторизации по маршрутам разбирает другой
пакет; \`.env\`-файлы не читать и не создавать.
`,
  },
  {
    id: 'JJ3-two-auth-idioms',
    label: 'JJ3 два идиома авторизации: инвентарь по маршрутам',
    dir: '.agents/archon/packets/JJ3-two-auth-idioms',
    files: 'ЧТЕНИЕ по всему apps/api/src/routes/**. ПРАВКА — только apps/api/src/routes/patients.ts, и только если инвентарь докажет, что сведение безопасно',
    gate: 'node scripts/smoke-clinical-mutation-guard.mjs (ok:true сегодня, 438 маршрутов) — читать его вывод, а не только код выхода',
    brief: `
В ПРОЕКТЕ ДВА СПОСОБА ЗАКРЫВАТЬ МАРШРУТ, И НИКТО НЕ ЗНАЕТ, СКОЛЬКО ГДЕ.

Общий помощник \`requireClinical*\` / \`requireResolvedOrganizationId\` против рукописной проверки: чтение
\`x-dente-clinic-token\`, вызов \`verifyToken\`, ответ 401 и взятие \`organizationId\` из ПОДПИСАННОГО токена.

**ВАЖНО, И ЭТО МЕНЯЕТ ЗАДАЧУ: рукописный идиом СТРОЖЕ общего, а не хуже.** Комментарий в
\`scripts/smoke-clinical-mutation-guard.mjs\` фиксирует это прямо: \`patients.ts\` берёт организацию из
подписанного токена, а не из заголовка, и прежний счётчик-гейт ложно краснел на исправном коде, потому что
искал слово, а не поведение. **Поэтому цель — не «переписать всё на общий помощник», а понять, какой из
двух правильнее, и свести к правильному.**

**ИНВЕНТАРЬ — ЭТО И ЕСТЬ РЕЗУЛЬТАТ ПАКЕТА.** По каждому файлу в \`apps/api/src/routes/\`: какой идиом, и
берётся ли \`organizationId\` из подписанного токена или из заголовка. Вердикт на строку. Ищите через \`rg\`
с ограничением области (\`-g '!Library' -g '!obj'\`), \`grep -r\` на этой машине запрещён.

**ГЛАВНОЕ ПРАВИЛО ПРОВЕРКИ: охранник живёт В ТЕЛЕ ОБРАБОТЧИКА, а не на строке \`app.post(...)\`.** Ведущий
однажды поставил диагноз по строке регистрации и был неправ; это стоячая поправка кампании.

**ПОРЯДОК.**
1. Инвентарь целиком, читая ТЕЛА обработчиков.
2. Назовите, какой идиом строже, и обоснуйте не стилем, а поведением: откуда берётся арендатор, что
   отвечает без учётных данных, что при истёкшем токене.
3. **Сводить начинайте только если инвентарь показал, что это безопасно, и только \`patients.ts\`.** Если
   инвентарь покажет, что сводить надо в другую сторону — то есть общий помощник слабее, — **скажите это
   прямо и НЕ сводите**: тогда задача превращается в усиление общего помощника, а это отдельный пакет с
   правкой десятков маршрутов.
4. Прогоните поведенческий гейт и прочитайте разделы \`payloadBeforeAuthorisation\` и \`warnings\`, а не
   только \`ok\`. Приведите числа.

**ЗАПРЕЩЕНО.** Массовая замена идиома по десяткам файлов в одном пакете. Правка любого файла, кроме
\`patients.ts\`. Утверждение «сведено», если гейт не прогнан.
`,
  },
  {
    id: 'JJ4-ratchet-blind-to-method',
    label: 'JJ4 храповик адресов не сравнивает HTTP-метод и держит пять мёртвых записей',
    dir: '.agents/archon/packets/JJ4-ratchet-blind-to-method',
    files: 'apps/api/src/tests/webCallsExistingRoutes.test.ts',
    gate: 'node --import tsx --test apps/api/src/tests/webCallsExistingRoutes.test.ts',
    brief: `
СУЩЕСТВУЮЩИЙ ХРАПОВИК ОБЪЯВЛЯЕТ АДРЕС ЖИВЫМ, ЕСЛИ СОВПАЛ ПУТЬ, И НЕ СМОТРИТ НА МЕТОД.

Разведка прочитала этот файл целиком и назвала два структурных пробела. **Воспроизведите оба сами, потом
чините.** Досье: \`.agents/archon/recon/RC3-hollow-panel-census/findings.md\`, раздел «ГЛАВНОЕ КОНТЕКСТНОЕ
ОТКРЫТИЕ». Ведущий его прочитал и считает работу качественной.

**ПРОБЕЛ 1 — МЕТОД НЕ СРАВНИВАЕТСЯ ВООБЩЕ (строки ~166, ~221-234).** Регулярка \`serverRoutes()\` захватывает
только путь, а \`isServed()\` сравнивает только сегменты пути. Адрес, у которого путь есть, а нужного
HTTP-метода нет, храповик объявляет живым — **а Fastify отвечает на него 404, ровно как на несуществующий
путь.** Разведка нашла два таких случая своим инструментом. Найдите их сами и починьте сравнение так,
чтобы метод участвовал.

**ПРОБЕЛ 2 — ПЯТЬ ЗАПИСЕЙ ДОЛГА НЕ ЗОВЁТ НИКТО.** Тест сам объявляет правило на строках ~41-42, ~47-49,
~60-61: «адрес, которого никто не зовёт, — не долг, а мусор в списке». Пять его собственных записей это
правило нарушают:
    /api/crm/patient-duplicate-merge-queues       только комментарии в 5 файлах, ни одного fetch
    /api/schedule/external-schedule-action-logs   только комментарий ScheduleView.tsx:1109
    /api/system/ram-watchdogs                     только комментарии SettingsView.tsx:27,1297
    /api/communications/inbox                     только сам файл теста
    /api/communications/patients/search           только сам файл теста
Проверьте каждую через \`rg\` по \`apps/web/src apps/api/src\` и уберите те, что подтвердятся. **Последние две
особенно показательны: адрес существует только в списке долга и больше нигде — это и есть мусор, о котором
предупреждает собственное правило теста.**

**ПОЧЕМУ ЭТО НЕ ЦЕРЕМОНИЯ.** Этот храповик — единственная защита от «веб зовёт адрес, которого нет».
Слепой к методу, он пропускает целый класс: путь совпал, метод не тот, пользователь получает 404 и пустой
экран. А мусор в списке долга обесценивает список: когда в нём есть заведомо мёртвые записи, следующий
человек перестаёт ему верить.

**ДОКАЗАТЕЛЬСТВО.** Тест должен ПАДАТЬ на искусственном нарушении: добавьте в проверку временный случай
«путь есть, метод другой» и покажите, что до правки он проходил, а после падает. Это и есть доказательство
того, что пробел закрыт, а не переформулирован.

**НЕ РАСШИРЯЙТЕ.** Только этот файл. Не удаляйте записи долга, которые действительно кто-то зовёт, — они
законный объявленный долг.
`,
  },
  {
    id: 'JJ5-public-booking-orphan',
    label: 'JJ5 публичная запись: ноль импортёров, живые адреса',
    dir: '.agents/archon/packets/JJ5-public-booking-orphan',
    files: 'apps/web/src/pages/PublicBookingWidget.tsx и, если решите монтировать, точка монтирования — но её укажите в filesChanged и не трогайте workspaceShell.tsx',
    gate: 'node --import tsx --test на существующие тесты монтирования в apps/web/src/tests/',
    brief: `
КОМПОНЕНТ ПУБЛИЧНОЙ ЗАПИСИ НЕ ПОДКЛЮЧЁН НИ К ЧЕМУ. РЕШЕНИЕ, А НЕ ЗАПИСЬ В ЖУРНАЛ.

**ИЗМЕРЕНО ВЕДУЩИМ:** \`apps/web/src/pages/PublicBookingWidget.tsx\` имеет НОЛЬ импортёров и ноль
динамических импортов. Проверьте сами через \`rg\` по \`apps/web/src\` (не \`grep -r\`).

**ПРОЧТИТЕ ФАЙЛ ЦЕЛИКОМ ПРЕЖДЕ ЧЕМ РЕШАТЬ.** Публичная запись на приём — возможность, которую продукт
для маленькой клиники хочет: пациент записывается сам, без звонка. Если компонент рабочий и за ним живые
адреса, удалять его — потеря функции, а не уборка.

**ТРИ ДОПУСТИМЫХ ИСХОДА, и любой из них полный успех, если обоснован:**
1. **Смонтировать** — если компонент рабочий и место монтирования очевидно. Публичная страница записи по
   определению живёт ВНЕ рабочего места врача, то есть это не ещё один раздел в боковой рельсе. Подумайте,
   где именно, и обоснуйте.
2. **Удалить** — если внутри заготовка: адреса, которых нет, поля, которых нет в контракте, выдуманные
   значения. Тогда после удаления обязательно \`rg\` по ВСЕМУ репозиторию, включая \`scripts/\` и
   \`package.json\`: дыра «проверял только apps/» уже один раз сломала дымовой тест на загрузке.
3. **Объявить долгом с письменной причиной** — по образцу
   \`apps/web/src/tests/patientCardDecomposition.test.ts\`, где список
   \`knownUnwiredPatientComponents\` требует причину на запись, и причина там конкретная: названы два
   блокера, включая захардкоженные цены. Ведущий прочитал этот список целиком и считает его образцом.

**ЧТО ПРОВЕРИТЬ ПЕРЕД ВЫБОРОМ.** Существуют ли адреса, которые компонент зовёт (сверьте с таблицей
маршрутов сервера). Есть ли в нём выдуманные значения по умолчанию, захардкоженные цены, английские
строки, обращения к полям, которых нет в контракте. §10: чего нет — то долг с причиной, а не фантазия.

**ЧЕГО НЕ ДЕЛАТЬ.** Не монтировать «чтобы страж замолчал»: смонтированный полуфабрикат хуже честной
сироты, потому что пациент увидит форму, которая не работает. Не трогать \`workspaceShell.tsx\` — он занят
другим автором.
`,
  },
]

const BUILD_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['packet', 'status', 'commitHash', 'filesChanged', 'inventory', 'proven', 'notProven', 'leadMustRun', 'foundNotFixed', 'summary'],
  properties: {
    packet: { type: 'string' },
    status: { enum: ['COMMITTED', 'PARTIAL', 'BLOCKED', 'NO_CHANGE'] },
    commitHash: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    inventory: { type: 'array', items: { type: 'string' }, description: 'All 11 sites: file:line + CONVERTED / ALREADY CORRECT / NOT MONEY.' },
    proven: { type: 'array', items: { type: 'string' }, description: 'Commands actually run, with TRUE exit codes captured without a pipe.' },
    notProven: { type: 'array', items: { type: 'string' } },
    leadMustRun: { type: 'array', items: { type: 'string' } },
    foundNotFixed: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
}

const REVIEW_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['packet', 'verdict', 'sitesMissed', 'comparisonsTouched', 'testWouldFailOnRevert', 'attributionClean', 'reasoning', 'requiredRework'],
  properties: {
    packet: { type: 'string' },
    verdict: { enum: ['SOUND', 'SOUND_WITH_NITS', 'NEEDS_REWORK', 'REVERT'] },
    sitesMissed: { type: 'array', items: { type: 'string' }, description: 'Money-in-text sites still raw at HEAD, re-derived by YOUR OWN grep.' },
    comparisonsTouched: { type: 'string', description: 'Did the diff alter any money COMPARISON? Quote the diff if so — that is REVERT-grade.' },
    testWouldFailOnRevert: { type: 'string' },
    attributionClean: { type: 'string', description: 'Output of git log -1 --format=%(trailers) for the commit. Must be empty.' },
    reasoning: { type: 'string' },
    requiredRework: { type: 'array', items: { type: 'string' } },
  },
}

function buildStage(p) {
  return agent(
    LAW +
    '\n═══════════════════════════════════════════════════════════════\n' +
    'YOUR PACKET: ' + p.id + '\n' +
    'OWNED SCOPE: ' + p.files + '\n' +
    'FORBIDDEN: every other file; all shared gates; any money COMPARISON in your own file.\n' +
    'YOUR SIGNAL: ' + p.gate + '\n' +
    'PACKET DIR (create first, one line in state.md): ' + p.dir + '\n' +
    '═══════════════════════════════════════════════════════════════\n' + p.brief +
    '\nCOMMIT AS SOON AS IT COMPILES, then add the test in a second commit if you have room.\n',
    { label: p.label, phase: 'Build', schema: BUILD_SCHEMA }
  )
}

function reviewStage(built, p) {
  if (!built) {
    return { packet: p.id, verdict: 'NEEDS_REWORK', sitesMissed: [], comparisonsTouched: 'unknown', testWouldFailOnRevert: 'unknown', attributionClean: 'unknown', reasoning: 'Builder died. Read ' + p.dir + '/state.md — work may already be committed.', requiredRework: ['Resume ' + p.id] }
  }
  if (!built.commitHash) {
    return { packet: p.id, verdict: 'SOUND_WITH_NITS', sitesMissed: [], comparisonsTouched: 'n/a', testWouldFailOnRevert: 'n/a', attributionClean: 'n/a', reasoning: built.summary || 'No commit.', requiredRework: built.foundNotFixed || [] }
  }
  return agent(
    'You are an ADVERSARIAL REVIEWER on the DENTE dental CRM (C:\\Clinic_MVP\\dental-crm) reporting to lead\n' +
    '[ARCHON]. You did NOT write this code. READ-ONLY: no edits, no git add/commit/push, never\n' +
    "'git remote -v' (live tokens). Do NOT run npm typecheck/build/test — other agents are mid-edit and you\n" +
    'would read a half-written tree. You MAY run "node --import tsx --test <one file>", read-only rg/grep,\n' +
    'git show/grep, and read-only node -e. Write findings to ' + p.dir + '/review.md AS YOU GO — reviewers\n' +
    'die on credits here constantly and an unwritten finding is lost.\n\n' +
    'COMMIT: ' + built.commitHash + '\nFILES: ' + JSON.stringify(built.filesChanged) + '\n' +
    'CLAIMED INVENTORY: ' + JSON.stringify(built.inventory || []) + '\n' +
    'CLAIMED PROVEN: ' + JSON.stringify(built.proven || []) + '\n\n' +
    'CHECK EXACTLY FIVE THINGS, each by running something:\n' +
    '1. **Did it miss a site?** Re-derive with YOUR OWN grep over guards.ts at HEAD — count interpolations\n' +
    '   of a money value into text that are still raw. The lead measured 11 raw and 4 already correct at\n' +
    '   dispatch; report YOUR numbers, not the brief\'s.\n' +
    '2. **Did it touch a money COMPARISON?** That is REVERT-grade. The comparisons use integer kopecks with\n' +
    '   NO epsilon on purpose: a tolerance that hides float drift also hides a genuine one-kopeck\n' +
    '   discrepancy, and these gates release payment receipts. Quote the diff if any comparison changed.\n' +
    '3. **Did it convert something that is NOT money?** «${index + 1}» is a line number. A count of rows is\n' +
    '   a count. Converting either is a defect.\n' +
    '4. **Would its test fail if the fix were reverted?** Name the assertion that breaks. A test that\n' +
    '   passes either way is ceremony. If it added no test, say so plainly.\n' +
    '5. **Attribution:** run "git log -1 --format=%(trailers) ' + built.commitHash + '" and report the\n' +
    '   output. It MUST be empty. Also grep the body for «Co-Authored-By» and «anthropic».\n\n' +
    'Also sweep for: «руб. ₽» (would mean formatKopecksRu was used where a decimal string belongs), a\n' +
    'second money helper beside @dental/shared, mojibake in the diff or subject, and any English string\n' +
    'reaching a user. Reserve REVERT for a changed comparison or a tolerance introduced. Never award SOUND\n' +
    'to a claim you could not reproduce.',
    { label: 'attack:' + p.id, phase: 'Attack', schema: REVIEW_SCHEMA }
  )
}

const all = []
log('Cycle 19: ' + PACKETS.map((p) => p.id).join(', '))
const done = await pipeline(PACKETS, buildStage, reviewStage)
for (let i = 0; i < PACKETS.length; i++) all.push({ packet: PACKETS[i].id, dir: PACKETS[i].dir, review: done[i] || null })
log('Cycle 19 complete.')
return { cycle: 19, results: all }
