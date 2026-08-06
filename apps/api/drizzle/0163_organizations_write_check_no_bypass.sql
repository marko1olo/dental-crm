-- 0163_organizations_write_check_no_bypass.sql
--
-- КОРЕНЬ АРЕНДАТОРОВ ПЕРЕСТАЁТ БЫТЬ ЕДИНСТВЕННОЙ ТАБЛИЦЕЙ, В КОТОРУЮ МОЖНО
-- ПИСАТЬ МЕЖАРЕНДНО ПОД ОБХОДОМ RLS
--
-- ============================================================================
-- ЧТО ИЗМЕРЕНО НА ЖИВОЙ БАЗЕ (PostgreSQL 18.4, роль dental: rolsuper=false,
-- rolbypassrls=false, владелец таблиц, FORCE ROW LEVEL SECURITY). Все замеры
-- сделаны в транзакциях, которые были откачены; каждая попытка шла в
-- собственной точке сохранения, поэтому отказ одной не смазывал следующую.
-- ============================================================================
--
-- ИНВЕНТАРЬ ПЕРИМЕТРА:
--   политик в pg_policy ......................................... 147
--   из них с дизъюнктом обхода в USING .......................... 147
--   из них с дизъюнктом обхода в WITH CHECK ..................... 1  <- organizations
--   политик с WITH CHECK = NULL ................................. 0
--   таблиц public с ENABLE RLS .................................. 147
--   таблиц public с FORCE RLS ................................... 147
--   «ENABLE без FORCE» .......................................... 0
--
-- ЧТО ЭТА ЕДИНИЦА ДАЁТ СЕГОДНЯ. Соединение с `app.superuser_bypass = 'on'` и
-- БЕЗ всякого `app.current_tenant`:
--
--   INSERT организации с произвольным id ............... ПРОШЁЛ, 1 строка
--   UPDATE названия ЧУЖОЙ клиники ...................... ПРОШЁЛ, 1 строка
--   UPDATE login_id и password_hash ЧУЖОЙ клиники ...... ПРОШЁЛ, 1 строка
--   UPDATE названия ВСЕХ клиник одним оператором ....... ПРОШЁЛ, 11 строк
--   UPDATE со сменой id чужой клиники .................. отказ 23503 (внешний
--                                                        ключ журнала аудита,
--                                                        НЕ политика)
--   DELETE чужой клиники ............................... отказ 23503 (там же)
--
-- Третья строка — это не «порча справочника». Колонки `login_id` и
-- `password_hash` таблицы `organizations` — учётные данные входа в кабинет
-- клиники (`routes/auth.ts`, `/api/auth/clinic/login`). Возможность переписать
-- их у чужой клиники равна захвату её учётной записи. Ни к какой другой из 147
-- таблиц это не относится: у них в `WITH CHECK` дизъюнкта обхода нет, и та же
-- попытка отвечает 42501 (проверено на `ai_jobs` в том же прогоне).
--
-- ============================================================================
-- ПОЧЕМУ ДИЗЪЮНКТ ЗДЕСЬ ОКАЗАЛСЯ, И ПОЧЕМУ ЭТО ОБОСНОВАНИЕ НЕВЕРНО
-- ============================================================================
--
-- Он поставлен осознанно в 0159_rls_force_and_write_check.sql (PART 4), и его
-- шапка не скрывает цену: «под обходом, writes to organizations remain
-- unconstrained… any code path that turns bypass on can still create or modify
-- arbitrary organization rows». Обоснование там же:
--
--   «Creating a new organization is inherently a pre-tenant operation -- at
--    INSERT time there is no app.current_tenant to match, so a strict check
--    would make registration impossible.»
--
-- ЭТО УТВЕРЖДЕНИЕ ЛОЖНО ДЛЯ ЭТОГО ДЕРЕВА, и опровергает его сам боевой код.
-- Регистрация клиники НЕ создаёт организацию до арендатора: идентификатор
-- генерируется в Node ДО вставки и им же выставляется контекст.
--
--   routes/auth.ts, POST /api/auth/register:
--     const organizationId = crypto.randomUUID();
--     await withTenantCtx(organizationId, async (tx) => {
--       await tx.insert(organizations).values({ id: organizationId, … });
--       await tx.insert(users).values({ organizationId, … });   // ← у users
--     });                                                       //   обхода нет
--
--   routes/auth.ts, POST /api/auth/setup/init — та же форма.
--   scripts/migrateStateToDb.ts, scripts/seedAuth.ts,
--   scripts/seedOpsScreenshotDemo.ts, tests/support/fixtureOrganizations.ts —
--   тоже. Комментарий в auth.ts говорит об этом дословно: «Курицы и яйца здесь
--   нет: app.current_tenant — обычный строковый параметр, он ничем не связан с
--   содержимым таблицы».
--
-- Политика сверяет `id = current_tenant`, поэтому под таким контекстом
-- создаётся РОВНО названная строка: попытка вставить организацию с ЛЮБЫМ другим
-- id отвергается кодом 42501 (замерено). То есть тенант-контекст здесь строго
-- сильнее обхода, а не слабее.
--
-- ПЕРЕПИСЬ ПИШУЩИХ В organizations (весь apps/api/src и scripts, все формы
-- вызова, включая namespace-форму schema.organizations):
--
--   HTTP-достижимые:
--     routes/auth.ts:738   UPDATE  withTenantCtx(targetOrganizationId)
--                                  POST /api/auth/clinic/set-password
--     routes/auth.ts:950   INSERT  withTenantCtx(pre-generated uuid)
--                                  POST /api/auth/setup/init
--     routes/auth.ts:1030  INSERT  withTenantCtx(pre-generated uuid)
--                                  POST /api/auth/register
--     db/settingsQuery.ts:348 UPDATE  прокси db в транзакции авто-обёртки
--                                  POST /api/settings/clinic/mode
--     db/settingsQuery.ts:369 UPDATE  то же
--                                  PUT  /api/settings/clinic/profile
--     routes/workspaceProfile.ts:741 UPDATE  то же
--                                  POST /api/workspace/profile
--     routes/workspaceProfile.ts:820 UPDATE  то же
--                                  POST /api/workspace/preset/:name
--   Скрипты:
--     scripts/seedAuth.ts:343/350, scripts/seedOpsScreenshotDemo.ts:431,
--     scripts/migrateStateToDb.ts:412 — все под withTenantCtx;
--     scripts/verify-migration-{http,formats,engine}.ts — на голом db, без
--     всякого контекста; они и СЕГОДНЯ получают 42501 на вставке и ноль строк на
--     удалении, эта миграция их состояния не меняет.
--
-- НИ ОДИН пишущий не идёт под обходом. Проверены все 22 производственные области
-- `withSuperuserBypass` — записи в `organizations` нет ни в одной; единственный
-- обход в auth.ts — `readUnderBypass`, read-only по построению.
--
-- ============================================================================
-- ЗАМЕР «ДО И ПОСЛЕ», СДЕЛАННЫЙ ЭТИМ ЖЕ ВЫРАЖЕНИЕМ В ОТКАЧЕННОЙ ТРАНЗАКЦИИ
-- ============================================================================
--
-- Сужение применялось внутри BEGIN … ROLLBACK, и в той же транзакции
-- проигрывались обе стороны: нападение и законные пути.
--
--   НАПАДЕНИЕ (обход, арендатора нет)          ДО          ПОСЛЕ
--     INSERT произвольной организации          ПРОШЁЛ      42501
--     UPDATE названия чужой клиники            ПРОШЁЛ      42501
--     UPDATE учётных данных чужой клиники      ПРОШЁЛ      42501
--     UPDATE всех клиник одним оператором      ПРОШЁЛ 11   42501
--     UPDATE со сменой id чужой клиники        23503       42501
--     DELETE чужой клиники                     23503       23503  ← НЕ закрыто
--
--   ЗАКОННЫЕ ПУТИ                              ДО          ПОСЛЕ
--     register/setup: INSERT organizations     ПРОШЁЛ      ПРОШЁЛ
--     register/setup: INSERT владельца         ПРОШЁЛ      ПРОШЁЛ
--     set-password: UPDATE своей клиники       ПРОШЁЛ      ПРОШЁЛ
--     settings/workspace: UPDATE своей         ПРОШЁЛ      ПРОШЁЛ
--     чтение своей клиники под контекстом      ПРОШЁЛ      ПРОШЁЛ
--     readUnderBypass: поиск дубля логина      ПРОШЁЛ      ПРОШЁЛ
--     readUnderBypass: счёт всех организаций   ПРОШЁЛ      ПРОШЁЛ
--
-- То есть у сужения нулевая цена для всех семи законных форм и полный эффект
-- для пяти из шести форм нападения.
--
-- ============================================================================
-- ЧТО ЭТА МИГРАЦИЯ НЕ ЗАКРЫВАЕТ. СКАЗАНО ЗДЕСЬ, ЧТОБЫ НЕ ИСКАЛИ ПОТОМ
-- ============================================================================
--
-- 1. DELETE. У `DELETE` нет `WITH CHECK` вообще — PostgreSQL смотрит только в
--    `USING`, а там дизъюнкт обхода остаётся и обязан остаться (см. ниже).
--    Значит под обходом чужую организацию по-прежнему можно удалить, если её не
--    держит внешний ключ. Это НЕ особенность `organizations`: ровно так же
--    обстоит дело со всеми 147 таблицами периметра, и об этом уже написано в
--    tests/support/fixtureOrganizations.ts. Лечится не политикой, а тем, что
--    удаление арендатора вообще не должно быть достижимо ролью приложения.
--
-- 2. Дизъюнкт в `USING` НЕ ТРОГАЕТСЯ. Самостоятельная регистрация обязана
--    искать организацию по логину ДО того, как арендатор существует
--    (`readUnderBypass` в routes/auth.ts, проверка дубля). Убрать обход из
--    `USING` — сломать регистрацию по-настоящему, в отличие от `WITH CHECK`.
--    Замер это подтверждает: L6/L7 выше идут именно под обходом.
--
-- 3. Ветка ADMIN_SETUP_KEY в POST /api/auth/clinic/set-password берёт
--    `organizationId` ИЗ ТЕЛА ЗАПРОСА и им же выставляет контекст. Политика
--    сверяет `id = current_tenant`, поэтому такая проверка тавтологична: RLS там
--    не защищает ничего, вся защита — на сравнении ключа. Это отдельный дефект
--    прикладного уровня, миграцией он не лечится и здесь только назван.
--
-- 4. `.agents/DATABASE.md` (раздел про асимметрию чтения и записи) утверждает,
--    что дизъюнкта обхода в `WITH CHECK` нет НИ У ОДНОЙ таблицы, и запрещает
--    «чинить» асимметрию. До этой миграции документ был неверен ровно на одну
--    таблицу — на корень арендаторов. После неё он становится верным. Документ
--    правится отдельно; эта миграция приводит базу в состояние, которое он
--    описывает.
--
-- ============================================================================
-- ФОРМА: ALTER POLICY, БЕЗ no-transaction, БЕЗ NOT VALID
-- ============================================================================
--
-- `ALTER POLICY … WITH CHECK (…)` — правка ОДНОЙ строки pg_policy. Прохода по
-- таблице нет: `WITH CHECK` по определению применяется только к новым и
-- изменяемым строкам и существующие не проверяет. Поэтому пара
-- «ADD CONSTRAINT NOT VALID + VALIDATE», нужная в 0162, здесь неприменима —
-- проверять нечего, а `ACCESS EXCLUSIVE` держится доли миллисекунды.
--
-- Файл НЕ помечен `-- no-transaction` намеренно: он состоит из одного изменения
-- состояния, и атомарность здесь бесплатна. `-- no-transaction` нужен там, где
-- длинная блокировка обязана быть разбита (0162) или где оператор запрещён
-- внутри транзакционного блока (CREATE INDEX CONCURRENTLY); ни то, ни другое
-- сюда не относится.
--
-- ЗАЧЕМ lock_timeout. Кластер общий. `ALTER POLICY` берёт `ACCESS EXCLUSIVE` —
-- единственный уровень, останавливающий даже чтение, — а очередь блокировок в
-- PostgreSQL это FIFO: упершись в чужую долгую транзакцию, DDL заблокирует за
-- собой всех. С таймаутом он падает быстро, миграция не отмечается применённой,
-- и повторный прогон делает то же самое с нуля.
--
-- ПОЧЕМУ ALTER, А НЕ DROP + CREATE. `DROP POLICY` на таблице с включённым RLS
-- оставляет её без единой политики, и до `CREATE` любое чтение возвращает ноль
-- строк, а любая запись отвергается. Внутри транзакции окна не видно, но и
-- нужды в этой паре нет: `ALTER POLICY` заменяет `using_expression` и
-- `check_expression` независимо, поэтому здесь указан ТОЛЬКО `WITH CHECK`, и
-- `USING` физически не может пострадать от опечатки.
--
-- ============================================================================
-- ИДЕМПОТЕНТНОСТЬ
-- ============================================================================
--
-- `ALTER POLICY` идемпотентен по состоянию (повторное присвоение того же
-- выражения ничего не меняет), но НЕ по существованию: на отсутствующей политике
-- он падает с 42704. Поэтому:
--   • политики нет вообще -> исключение с внятным текстом. Это означает, что
--     0159 не применялась, и молча пропустить такое нельзя: таблица останется
--     без изоляции, а миграция отметится успешной;
--   • дизъюнкта в WITH CHECK уже нет -> сообщение и выход, база не трогается;
--   • дизъюнкт есть -> сужение.
-- Признак берётся из каталога (`pg_get_expr(polwithcheck, polrelid)`), а не из
-- номера миграции: каталог отстать не может.

SET LOCAL lock_timeout = '5s';

DO $do$
DECLARE
  v_check text;
BEGIN
  SELECT pg_get_expr(p.polwithcheck, p.polrelid)
    INTO v_check
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
   WHERE c.relname = 'organizations'
     AND c.relnamespace = 'public'::regnamespace
     AND p.polname = 'tenant_isolation';

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Политика tenant_isolation на organizations не найдена: миграция 0159 не применялась. Корень арендаторов остался бы без изоляции, поэтому 0163 останавливается вместо тихого пропуска.';
  END IF;

  IF v_check IS NULL THEN
    RAISE EXCEPTION
      'У политики tenant_isolation на organizations нет WITH CHECK: тогда проверку записи задаёт USING, где дизъюнкт обхода стоит и обязан остаться. Такое состояние 0163 не описывает — разберите вручную.';
  END IF;

  IF v_check NOT LIKE '%superuser_bypass%' THEN
    RAISE NOTICE
      'organizations.tenant_isolation: дизъюнкт обхода в WITH CHECK уже отсутствует, изменений не требуется.';
    RETURN;
  END IF;

  ALTER POLICY tenant_isolation ON organizations
    WITH CHECK (id = NULLIF(current_setting('app.current_tenant', true), '')::uuid);

  RAISE NOTICE
    'organizations.tenant_isolation: WITH CHECK сужен до id = app.current_tenant; USING не изменён и по-прежнему пропускает обход для чтений до арендатора.';
END
$do$;

-- Проверка результата в том же файле: если по какой-то причине выражение не
-- сменилось, миграция обязана упасть, а не отметиться применённой.
DO $do$
DECLARE
  v_check text;
  v_using text;
BEGIN
  SELECT pg_get_expr(p.polwithcheck, p.polrelid),
         pg_get_expr(p.polqual, p.polrelid)
    INTO v_check, v_using
    FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
   WHERE c.relname = 'organizations'
     AND c.relnamespace = 'public'::regnamespace
     AND p.polname = 'tenant_isolation';

  IF v_check LIKE '%superuser_bypass%' THEN
    RAISE EXCEPTION 'organizations.tenant_isolation: WITH CHECK всё ещё содержит дизъюнкт обхода: %', v_check;
  END IF;

  IF v_using NOT LIKE '%superuser_bypass%' THEN
    RAISE EXCEPTION 'organizations.tenant_isolation: из USING пропал дизъюнкт обхода — регистрация клиники потеряет проверку дубля логина: %', v_using;
  END IF;
END
$do$;
