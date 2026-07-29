export const meta = {
  name: 'archon-cycle-22',
  description: 'DENTE cycle 22: nine pricelist props wired to nowhere, permissive-by-default safety, a ratchet that cannot prove itself, a price lost to a brand name, and a census for missing declarations',
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
    id: 'KK1-nine-props-to-nowhere',
    label: 'KK1 девять пропсов прайса протянуты через приложение и не потребляются',
    dir: '.agents/archon/packets/KK1-nine-props-to-nowhere',
    files: 'apps/web/src/SettingsView.tsx и apps/web/src/useSettingsDerivations.tsx — оба СВОБОДНЫ. Читать можно всё; править только эти два, и apps/web/src/pricelistUiMeta.ts если понадобится удалять',
    gate: 'node --import tsx --test на любой существующий тест настроек; node scripts/check-css-tokens.mjs если тронете стили',
    brief: `
НЕ ОДИН ПРОПС, А ДЕВЯТЬ: ВСЯ ПОВЕРХНОСТЬ ИНТЕРФЕЙСА ПРАЙСА ПРОТЯНУТА ЧЕРЕЗ ПРИЛОЖЕНИЕ И НЕ ПОТРЕБЛЯЕТСЯ.

**ИЗМЕРЕНО ВЕДУЩИМ, подтвердите сами через \`rg\` (не \`grep -r\`).** \`pricelistWarningsText\` объявлен на
\`pricelistUiMeta.ts:151\`, импортирован в \`App.tsx:319\`, положен в объект на \`:1543\`, передан пропсом на
\`:4713\`, проходит \`AppHelpers.tsx:301\` и \`useAppLogic.tsx:813\` — и в ДВУХ местах потребления
закомментирован: \`SettingsView.tsx:662\` и \`useSettingsDerivations.tsx:1111\`.

**Закомментирован не он один, а блок из девяти:** \`pricelistImageName\`, \`pricelistImageNote\`,
\`pricelistItemMaterialText\`, \`pricelistMaterialSummaryText\`, \`pricelistWarningsText\`,
\`pricelistParserModeLabels\`, \`pricelistRecognitionBrandGroups\`, \`pricelistRecognitionServiceGroups\`,
\`pricelistSourceKind\`.

**ПОЧЕМУ ЭТО P0, А НЕ УБОРКА.** Правило отказа от оценки цены обосновано именно этим предупреждением:
«клиника видит price_not_found и проверяет одну строку руками». Раз предупреждение не рисуется НИКОГДА,
обоснование ложно для отгруженного интерфейса, и отказ выглядит как молчаливая потеря цены. А в прайс
клиники сейчас уходят суммы, разобранные с ошибками — ведущий за эту ночь закрыл переплату в 157 раз и
занижение в 12 раз в этом же разборщике. Предупреждения нужны именно там.

**СНАЧАЛА УСТАНОВИТЕ ПРИЧИНУ, НЕ РАССКОММЕНТИРУЙТЕ.** Блок закрыт одним движением — значит это либо
незавершённая декомпозиция, либо обход ошибок «переменная объявлена и не используется». Ответы ведут к
разным правкам. Посмотрите историю через \`git log -S\` по одному из имён и прочитайте коммит, который их
закрыл: там, вероятно, написано зачем.

**ТРИ ДОПУСТИМЫХ ИСХОДА, любой полный успех при обосновании:**
1. **Подключить** — если поверхность в интерфейсе есть и предупреждения есть куда показать. Начните с
   \`pricelistWarningsText\`: он самый нужный, и его отсутствие ломает обоснование правила отказа.
2. **Удалить всю цепочку целиком** — если поверхности нет. Тогда это девять пропсов, протянутых в никуда,
   и снимать их надо ПОЛНОСТЬЮ: объявление, импорт, объект, пропс, тип пропсов, закомментированные строки.
   Оставить протянутыми и закомментированными — худший из трёх исходов, потому что следующий человек
   решит, что так задумано.
3. **Подключить часть, остальное удалить** — с вердиктом по каждому из девяти.

**ЧТО ПРОВЕРИТЬ ПЕРЕД ВЫБОРОМ.** Есть ли на вкладке прайса место, где предупреждение уместно. Учтите
измеренное ограничение: \`SettingsPricesTab.tsx:613-615\` показывает «цена ?» только для \`slice(0,12)\` —
первых двенадцати строк предпросмотра, — так что за их пределами отказ не виден вовсе. Этот файл ЗАНЯТ
другим автором, править его нельзя; если ваш вывод требует правки там, запишите это в \`foundNotFixed\`.

**§3.** Текст предупреждения обязан говорить человеку, что ДЕЛАТЬ. «Цена не найдена» — это половина:
надо назвать строку и сказать, что её нужно проверить руками.
`,
  },
  {
    id: 'KK2-default-permissive-rework',
    label: 'KK2 переделка: незаданное окружение по-прежнему разрешающее',
    dir: '.agents/archon/packets/KK2-default-permissive-rework',
    files: 'apps/api/src/accessGuard.ts и тест рядом с ним',
    gate: 'node --import tsx --test на ваш тест предиката',
    brief: `
ПЕРЕДЕЛКА ПАКЕТА JJ2, ВЕРДИКТ NEEDS_REWORK. Прочитайте \`.agents/archon/packets/JJ2-inverted-default-safety/review.md\`
ЦЕЛИКОМ прежде чем что-либо менять: там названо, что именно не закрыто, и ревьюер измерял, а не рассуждал.

**ИСХОДНЫЙ ДЕФЕКТ, ИЗМЕРЕННЫЙ ВЕДУЩИМ НА HEAD, две площадки:**
    accessGuard.ts:18  return process.env.NODE_ENV !== "production" && ...ALLOW_UNGUARDED_MUTATIONS === "1";
    accessGuard.ts:22  return process.env.NODE_ENV !== "production" && ...ALLOW_UNGUARDED_READS === "1";

\`NODE_ENV !== "production"\` истинно, когда переменная НЕ ЗАДАНА вовсе. \`apps/api/package.json\` объявляет
\`"start": "node dist/server.js"\` и \`NODE_ENV\` не задаёт; ни один Dockerfile тоже. То есть безопасность по
умолчанию перевёрнута: защищает не запрет, а наличие правильно выставленной настройки.

**Сейчас дыра закрыта только тем, что сами флаги нигде не выставлены** — ведущий снял с учёта \`.env.local\`,
который их выставлял (коммит e58838c51). Система держится на ВТОРОМ условии, а не на первом.

**ЧТО СДЕЛАТЬ.** Обход должен требовать ЯВНОГО названного режима: \`NODE_ENV === "development"\` или
\`=== "test"\`, плюс флаг. Тогда пустое окружение перестаёт быть разрешающим.

**ГЛАВНАЯ ЛОВУШКА, И ОНА НЕ ПОВОД ОТКАЗАТЬСЯ ОТ ПРАВКИ.** Многие тесты этого репозитория выставляют
\`ALLOW_UNGUARDED_*\` и рассчитывают на обход, НЕ задавая \`NODE_ENV\`. Ваша правка их уронит. **Это повод
привести тесты в соответствие, а не сохранить дефект**: тест, работающий только потому, что окружение не
настроено, документирует ту же ловушку. Найдите их через \`rg\`, приведите явно и скажите, сколько тронули.

**ДОКАЗАТЕЛЬСТВО — тест на сам предикат, три случая.** Пустое окружение плюс флаг → обхода НЕТ (это и есть
дефект, и почти наверняка он сейчас не покрыт). Названный режим разработки плюс флаг → обход есть.
\`production\` плюс флаг → обхода нет (вероятно уже покрыто).

**НЕ РАСШИРЯЙТЕ.** Только этот файл и его тест. \`.env\`-файлы не читать и не создавать. Параметры хеширования
и идиомы авторизации по маршрутам — другие пакеты.
`,
  },
  {
    id: 'KK3-ratchet-rework',
    label: 'KK3 переделка: храповик адресов, код верен, доказательство нет',
    dir: '.agents/archon/packets/KK3-ratchet-rework',
    files: 'apps/api/src/tests/webCallsExistingRoutes.test.ts',
    gate: 'node --import tsx --test apps/api/src/tests/webCallsExistingRoutes.test.ts',
    brief: `
ПЕРЕДЕЛКА ПАКЕТА JJ4, ВЕРДИКТ NEEDS_REWORK со словами «code is correct and the core defect is closed».
**Прочитайте \`.agents/archon/packets/JJ4-ratchet-blind-to-method/review.md\` ЦЕЛИКОМ** — ревьюер назвал, что
именно осталось, и его требования конкретны.

**КОНТЕКСТ, ИЗМЕРЕННЫЙ ВЕДУЩИМ.** Полный набор api даёт 1258 тестов, 1256 проходят, и одно из двух падений
было в этом файле. Раньше храповик сравнивал ТОЛЬКО путь: адрес с существующим путём и отсутствующим
методом объявлялся живым, а Fastify отвечает на него 404 ровно как на несуществующий путь.

**Разведка подтвердила два таких дефекта ЖИВЫМ сервером** с контрольным запросом, доказывающим, что сервер
различает «нет маршрута» и «нет доступа»:
    DELETE /api/clinical/rules/<uuid>  → 404 Route not found
    PUT    /api/xray/scans/<uuid>      → 404 Route not found
    PATCH  /api/clinical/rules/<uuid>  → 401 AuthRequired   ← КОНТРОЛЬ: маршрут есть, отвечает 401
Первый значит, что **кнопка удаления клинического правила не работает никогда**: врач жмёт «удалить»,
получает отказ, список не меняется.

**ЧТО ДОДЕЛАТЬ.** Прочитайте требования ревьюера и закройте их. Ожидаемо там: доказательство, что тест
ПАДАЕТ на искусственном нарушении класса «путь есть, метод другой» (без этого нельзя утверждать, что
пробел закрыт, а не переформулирован), и вердикт по каждой записи списка долга, которую никто не зовёт —
тест сам объявляет правилом, что такая запись не долг, а мусор.

**НЕ ЧИНИТЕ САМИ МАРШРУТЫ.** Ваш файл — храповик. Отсутствующий \`DELETE /api/clinical/rules\` и
\`PUT /api/xray/scans\` — отдельные пункты очереди, и \`routes/clinical.ts\` может быть занят. Ваша работа —
чтобы храповик их ВИДЕЛ и называл, а не чтобы вы их реализовали.
`,
  },
  {
    id: 'KK4-number-glued-to-letter',
    label: 'KK4 число, приклеенное к букве слева, теряет цену целиком',
    dir: '.agents/archon/packets/KK4-number-glued-to-letter',
    files: 'apps/api/src/pricelist/analyzer.ts и тесты под apps/api/src/pricelist/',
    gate: 'node --import tsx --test по всем четырём наборам под apps/api/src/pricelist/ (все выход 0 сегодня)',
    brief: `
ВЕДУЩИЙ ПРЕВРАТИЛ ПЕРЕПЛАТУ В 157 РАЗ В ОТКАЗ, НО ВЕРНУЮ ЦЕНУ НЕ ВОССТАНОВИЛ. ДОДЕЛАЙТЕ.

**ЧТО УЖЕ СДЕЛАНО (коммит 2918ee42f, не переделывайте).** Разрядная альтернатива \`amountPattern\`
склеивала хвост названия модели с началом цены. Добавлен \`(?!\\d)\`: разрядная группировка обязана
заканчиваться на не-цифре. Измерено до и после:
    «Отбеливание Zoom 4 25000»      4 250   → 25 000    название «Отбеливание Zoom 4»
    «Имплантация Osstem TS3 45000»  3 450   → 45 000    название «Имплантация Osstem TS3»
    «Коронка 12 500 руб»            12 500  → 12 500    настоящие разряды целы
    «Лечение кариеса 1500,50»       1500.5  → 1500.5    копейки целы

**ЧТО ОСТАЛОСЬ, И ЭТО ВАШ ПУНКТ.** «Пломба Filtek Z550 3500» теперь даёт цену \`null\` вместо верных 3500.
Причина: вторая альтернатива \`\\d{3,7}\` находит «550» ВНУТРИ самого «Z550», кандидаты расходятся, и
разборщик отказывается назначать цену. Отказ безопаснее переплаты в 157 раз, но настоящая цена 3500 в
строке видна человеку и должна читаться.

**НАПРАВЛЕНИЕ, НЕ ГОТОВОЕ РЕШЕНИЕ.** Числу, приклеенному к букве СЛЕВА, нужен запрет слева — как у знака
рубля уже есть запрет буквы справа (см. комментарий про \`р\\.?\` и «1500 рублей залога» рядом в файле).
Но проверьте на реальных формах: латиница «Z550», кириллица «А2», дефис «TS-3», точка «e.max 2».
**Инвентарь форм — часть работы**, иначе закроете латиницу и оставите кириллицу.

**ОБЯЗАТЕЛЬНО НЕ СЛОМАЙТЕ ТО, ЧТО ЗЕЛЕНО.** Четыре набора под \`apps/api/src/pricelist/\` сегодня все дают
истинный код выхода 0. Прогоните все четыре и приведите коды, снятые БЕЗ конвейера
(\`cmd > /tmp/log 2>&1; echo $?\`) — \`$?\` после конвейера показывает конвейер, и ведущий на этом уже
обманулся.

**И ЗАКРЕПИТЕ ТЕСТОМ ИМЕННО БРЕНДЫ.** \`rg -niE 'zoom|Z550|TS3|damon' apps/api/src/pricelist/*.test.ts\`
сегодня не находит покрытия. Бренд с цифрой встречается в русских прайсах повсеместно: Zoom 4, Osstem TS3,
Filtek Z550 и Z250, Damon Q, Nobel Active 3.0, IPS e.max. Тест должен падать при откате вашей правки.
`,
  },
  {
    id: 'KK5-missing-declaration-census',
    label: 'KK5 перепись в направлении «объявления не хватает»',
    dir: '.agents/archon/packets/KK5-missing-declaration-census',
    files: 'scripts/smoke-schema-column-parity.mjs либо новый скрипт рядом, и apps/api/src/tests/ если решите тестом',
    gate: 'ваш скрипт или тест падает на искусственном пропуске объявления',
    brief: `
КЛАСС ДЕФЕКТА, КОТОРЫЙ НИ ОДИН СТРАЖ НЕ ЛОВИТ ПО СВОЕМУ ЖЕ ЗАЯВЛЕННОМУ ПРАВИЛУ.

**ИЗМЕРЕНО РЕВЬЮЕРОМ ПАКЕТА JJ1 И ПОДТВЕРЖДЕНО ВЕДУЩИМ.** Таблица \`egisz_logs\` существовала в базе с
миграции 0000 и **не была объявлена в Drizzle вообще**. Именно поэтому она прожила незамеченной: все
инструменты аудита этого проекта ходят по объявлениям Drizzle, а таблицы, которой в объявлениях нет, они
не видят по построению.

**И существующий страж этот класс пропускает НАМЕРЕННО.** \`scripts/smoke-schema-column-parity.mjs\` в своём
собственном заголовке объявляет, что обратное направление дрейфа — колонка есть в базе, объявления нет —
НЕ считается ошибкой. То есть страж честно предупреждает, что этот класс вне его области, и никто другой
его не покрывает.

**ЧТО ПОСТРОИТЬ.** Перепись в направлении «в базе есть, в объявлениях нет»: таблицы и колонки живой базы
против объявлений \`schema.ts\`. Каждое расхождение — либо объявление, либо запись причины с текстом.

**ПОЧЕМУ БЕЗ СПИСКА ИСКЛЮЧЕНИЙ НЕ ПОЛУЧИТСЯ, и это часть задачи.** В базе почти наверняка есть служебные
таблицы, которым в Drizzle делать нечего: журнал самих миграций (\`_dente_migrations\`), возможные
расширения, представления. Список исключений обязан требовать ПРИЧИНУ на запись — как это уже сделано в
\`unauthenticatedByDesign\` в маршрутном гейте и в \`knownUnwiredPatientComponents\` в тесте декомпозиции. И
устаревшая запись в списке исключений должна валить прогон: иначе список гниёт, как уже случилось с пятью
мёртвыми записями в храповике адресов.

**ДОКАЗАТЕЛЬСТВО, КОТОРОЕ ЕДИНСТВЕННО ЧЕГО-ТО СТОИТ.** Покажите, что страж ПАДАЕТ на искусственном
пропуске: временно уберите объявление существующей таблицы и приведите вывод. Без этого утверждение «страж
работает» ничем не отличается от утверждения «страж написан» — ревьюер этой кампании уже доказал, что
другой страж проходил бы и будучи сломанным, собрав дерево вне репозитория.

**БАЗА — ОБЩИЙ ГЕЙТ (§7a).** Читающие \`select\` к \`127.0.0.1:5432\` можно. Ни одной миграции не применять,
ничего не писать в базу. Если вашему стражу нужен свежий \`dist\`, скажите об этом в \`leadMustRun\`.
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
log('Cycle 22: ' + PACKETS.map((p) => p.id).join(', '))
const done = await pipeline(PACKETS, buildStage, reviewStage)
for (let i = 0; i < PACKETS.length; i++) all.push({ packet: PACKETS[i].id, dir: PACKETS[i].dir, review: done[i] || null })
log('Cycle 22 complete.')
return { cycle: 22, results: all }
