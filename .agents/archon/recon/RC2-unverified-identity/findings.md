# RC2-unverified-identity — findings

СТАТУС: в работе (пишется по мере подтверждения)
HEAD на момент начала: b989f82ccdd26f158154d92ee0750e0dcb1332b8 (Tue Jul 28 20:56:11 2026 +0400)
Роль: read-only. Ни один файл вне этого каталога не изменялся.

Тип факта: [SRC] исходник, [RUN] живой процесс, [DB] база, [GIT] история/индекс git.

---

## 1. identity.ts — что реально делает (прочитан целиком, 274 строки)

[SRC] (a) ПОДТВЕРЖДЕНО. apps/api/src/security/identity.ts:174-180 берёт organizationId из
заголовка и ставит verified: false.

[SRC] (b) ПОДТВЕРЖДЕНО ФОРМАЛЬНО, НО ФОРМУЛИРОВКА БРИФА ВВОДИТ В ЗАБЛУЖДЕНИЕ.
requireOrganizationId (:220-241) действительно не содержит слова verified. Но проверка
перенесена ВЫШЕ, в getRequestIdentity (:192-201), которую requireOrganizationId вызывает первой
строкой. «Никто не читает verified» — уже неправда: читает unverifiedOrganizationUsable
(:112-115). Комментарий :182-188 объясняет почему так: organizationId читают ещё
accessGuard.resolveOrganizationId, requireResolvedStaffOrAdminOrganizationId,
security/permissions.ts и request.user — проверка в одном аккессоре не накрыла бы остальных.

[SRC] ГЛАВНОЕ, ЧЕГО В БРИФЕ НЕТ: отбрасывается ТОЛЬКО запись, чтение разрешено всегда.
identity.ts:112-115 — unverifiedOrganizationUsable: если запрос не меняет состояние, сразу
return true, и условие сокета для GET вообще не вычисляется. READ_ONLY_METHODS = GET/HEAD/OPTIONS
(:74). Значит при включённом флаге чтение чужой клиники по заголовку без токена разрешено И НА
СЛУШАЮЩЕМ ПОРТУ. Запись отбивается 401 UnverifiedOrganizationCannotMutate (:226-232).

[SRC] (c) ПОДТВЕРЖДЕНО. serverAcceptsNetworkConnections (:102-106) читает
request.server.server.listening; неизвестное состояние трактуется как сетевое. Под app.inject
сокет не слушает -> false -> запись по заголовку РАЗРЕШЕНА. Поведенческий гейт на app.inject
проверяет ветку, ПРОТИВОПОЛОЖНУЮ браузерной: в тесте запись по заголовку проходит, в браузере
запрещена. Это не «то же, но слабее», а другая ветка.

---

## 2. Условия, при которых непроверенный organization_id принимается

Конъюнкция для ЧТЕНИЯ (все И):
1. NODE_ENV !== "production" — identity.ts:69
2. DENTE_DEV_ALLOW_HEADER_ORG === "1" — identity.ts:70
3. нет валидного clinic-токена и нет staff-токена с организацией — identity.ts:174
4. authTokenSecret() не бросает — identity.ts:141-147
5. заголовок x-organization-id непустой — identity.ts:175
Для ЗАПИСИ добавляется 6-е: request.server.server.listening === false, т.е. только
внутрипроцессный app.inject. Через сеть запись по заголовку недостижима.

[SRC] ВТОРОЙ ПРЕДОХРАНИТЕЛЬ, которого бриф не называет. apps/api/src/server.ts:87-107,
assertSecurityConfiguration(), вызов на модульном уровне :137 до подъёма сервера. При
NODE_ENV === "production" БРОСАЕТ, если любой из шести флагов равен "1":
DENTE_CLINICAL_ALLOW_UNGUARDED_READS, DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS,
DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS, DENTE_DEV_ALLOW_HEADER_ORG, DENTE_ALLOW_DEMO_LOGIN,
DENTE_ALLOW_DEMO_FIXTURES.

### ОТВЕТ НА ПРЯМОЙ ВОПРОС ЗАДАНИЯ
В production-развёртывании (NODE_ENV=production) заголовочный путь НЕДОСТИЖИМ, причём дважды:
devHeaderOrgAllowed() вернёт false по первому условию, а если флаг всё же выставлен — сервер не
стартует вовсе. Это ОПАСНОСТЬ РАЗРАБОТКИ, А НЕ ЖИВАЯ ДЫРА.

Оговорка, которая важнее самого флага (см. §5): «production» здесь определяется переменной
NODE_ENV, а репозиторий КОММИТИТ NODE_ENV=development в отслеживаемые git файлы. Fail-fast из
server.ts привязан к той же переменной, которую поставляет сам репозиторий. Комментарий
identity.ts:62-66 знает про это: npm start не выставляет NODE_ENV вовсе.

---

## 5. Dev-флаг: кто пишет и что попадает в git

[SRC] (d) ОПРОВЕРГНУТО В ЧАСТИ «ТРИ ФАЙЛА». apply-dev-env.ps1 прочитан целиком (211 строк):
- обычный запуск НЕ пишет DENTE_DEV_ALLOW_HEADER_ORG; в блоке devFlags (:55-70) его нет, а
  :67-69 прямо говорят, что имя флага не упоминается даже текстом, чтобы греп остался осмысленным;
- флаг пишется только по явному ключу -AllowHeaderOrg (:156-167) и В ОДИН файл — repo-root
  .env.local (:153, headerOrgTarget);
- три файла (.env, .env.local, apps/api/.env, :131-135) получают только безопасный набор;
- скрипт сам предупреждает: An earlier version of this script wrote it into every env file
  (:180), и просит удалить строку.
Итог: «пишет в три env-файла» описывает ПРЕЖНЮЮ версию скрипта. Один файл.

[GIT] НО ЭТОТ ОДИН ФАЙЛ ОТСЛЕЖИВАЕТСЯ GIT, И ЭТО ХУЖЕ, ЧЕМ ТРИ ИГНОРИРУЕМЫХ.
Команда и её вывод:
    git ls-files -- .env .env.local apps/api/.env .env.example 2>/dev/null
      .env
      .env.example
      .env.local
    git status --porcelain --ignored -- .env .env.local apps/api/.env .env.example
      !! apps/api/.env
.env и .env.local ЛЕЖАТ В ИНДЕКСЕ git, т.е. коммитятся и отгружаются. Правило .gitignore:47
(.env*) их не спасает: игнор не действует на уже отслеживаемый файл. Игнорируется только
apps/api/.env.
ЛОВУШКА ИНСТРУМЕНТА: первая проверка git check-ignore -v БЕЗ --no-index показала лишь
apps/api/.env — именно потому, что остальные два в индексе. С --no-index печатает все три.
Инструмент почти соврал мне в благоприятную сторону; отслеживаемость доказывает ls-files.
Следовательно apply-dev-env.ps1 -AllowHeaderOrg дописывает беспарольный выбор арендатора внутрь
файла, который отслеживается git, где его подхватит любой git add .env.local.

[GIT] Сейчас флаг в git НЕ армирован — проверено, а не предположено:
    for f in .env .env.local; do git show HEAD:$f | rg -c "^[ \t]*DENTE_DEV_ALLOW_HEADER_ORG[ \t]*="; done
      0
      0
    git show HEAD:.env.example | rg -n DENTE_DEV_ALLOW_HEADER_ORG
      62:# DENTE_DEV_ALLOW_HEADER_ORG=1     # определять организацию по x-organization-id без токена
В .env.example строка ЗАКОММЕНТИРОВАНА. Единственный коммит, когда-либо трогавший флаг в
env-файлах: 4ad7b10ec chore: sync 328 files, и там это .env.example, а не .env
(git log --oneline -S DENTE_DEV_ALLOW_HEADER_ORG -- .env .env.local .env.example).

[GIT] ЗАТО АРМИРОВАНЫ ТРИ ДРУГИХ ФЛАГА ИЗ ТОГО ЖЕ СПИСКА unsafeFlags. Значения читались только
по белому списку НЕ-секретных имён; ни одно секретное значение не печаталось.
    W='^[ \t]*(NODE_ENV|DENTE_CLINICAL_ALLOW_UNGUARDED_READS|DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS|DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS|DENTE_DEV_ALLOW_HEADER_ORG|DENTE_ALLOW_DEMO_LOGIN|DENTE_ALLOW_DEMO_FIXTURES)[ \t]*='
    git show HEAD:.env | rg -N "$W"
      DENTE_CLINICAL_ALLOW_UNGUARDED_READS=1
      DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS=1
      DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS=1
      NODE_ENV=development
    git show HEAD:.env.local | rg -N "$W"
      NODE_ENV=development
      DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS=1
      DENTE_CLINICAL_ALLOW_UNGUARDED_READS=1
      DENTE_SETTINGS_ALLOW_UNGUARDED_MUTATIONS=1
Рабочее дерево совпадает с HEAD по этим строкам (тот же W по файлам напрямую, --no-ignore).
Это тот же список, из-за которого server.ts отказывается стартовать в production. ТРИ ИЗ ШЕСТИ
УЖЕ В КОММИТЕ, вместе с NODE_ENV=development, который и отключает проверку.
env/loadServerEnv.ts applyParsedEnv ставит значение только если process.env[name] === undefined,
поэтому развёртывание, экспортирующее NODE_ENV=production в окружение, перебьёт файл — а
npm start без экспорта получит development из коммита.
