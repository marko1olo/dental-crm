import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { type TenantDb, withSuperuserBypass, withTenantCtx } from "../../db/rls.js";

/**
 * ОБЩИЙ ИНВЕНТАРЬ ДЛЯ ТЕСТОВ, КОТОРЫЕ СЕЮТ СВОЮ КЛИНИКУ В ЖИВУЮ БАЗУ.
 *
 * ЧТО СЛОМАЛОСЬ И ПОЧЕМУ ЭТО ПОЯВИЛОСЬ. Идентификаторы тестовых клиник
 * выдавались вручную: файл брал себе «блок» вида `dce70000-…-09xx` и считал его
 * своим. Реестра блоков не существовало, поэтому блок `09xx` оказался выдан
 * ТРЁМ файлам сразу — patientCreateDuplicateGuard, portalOtp и
 * speechTranscribeChunkAccess. Организация `…-901` у всех трёх одна и та же, а
 * пациент `…-911` — один и тот же и у первого, и у третьего.
 *
 * `node --test` запускает файлы параллельно, каждый в своём процессе, поэтому
 * три файла одновременно сеяли и удаляли ОДНИ И ТЕ ЖЕ строки живой базы:
 *   - `after` соседа удалял пациента `…-911` посреди чужого теста, и запрет
 *     дублей честно отвечал 201 на «вторую» карту, потому что первой уже не
 *     было;
 *   - `onConflictDoNothing` при совпадении первичного ключа молча оставлял
 *     ЧУЖУЮ строку: пациент `…-911` мог оказаться «Гордеев Илья Максимович»
 *     из теста диктовки, и тест дублей сравнивал своего «Тихонова» с ним;
 *   - `after` соседа удалял организацию `…-901`, и вставка пациента падала на
 *     `patients_organization_id_organizations_id_fk`;
 *   - удаление пациента `…-902` (у одного файла это пациент, у другого —
 *     организация) валилось на `portal_otp_codes_patient_id_fkey`.
 *
 * Набор упавших тестов при этом плавает от прогона к прогону: он зависит от
 * того, какие файлы попали в одно окно параллельности. Ровно так «зелёное»
 * ломается без единой правки в коде приложения.
 *
 * ЧТО ЗДЕСЬ ДАЁТСЯ ВЗАМЕН — механизм, а не разовая уборка:
 *   1. `fixtureUuid` выводит идентификаторы ИЗ ИМЕНИ ФАЙЛА. Двум разным файлам
 *      выдать один и тот же блок больше нельзя: для этого им пришлось бы
 *      совпасть именем. Ручной реестр блоков не нужен, потому что его нет.
 *   2. `withFixtureTenant` даёт СЕВУ тенант-контекст: без него под FORCE RLS
 *      вставка отвергается кодом 42501 (см. ниже).
 *   3. `purgeFixtureOrganizations` убирает клинику по КАТАЛОГУ базы, а не по
 *      поимённому списку таблиц: список устаревает при появлении любой новой
 *      таблицы со ссылкой на организацию, каталог отстать не может. Уборка тоже
 *      идёт под тенант-контекстом — иначе она не видит ни одной своей строки и
 *      удаляет ноль, не сообщая об этом (см. ниже).
 *   4. Уборка вызывается НА ВХОДЕ фикстуры, а не только на выходе. Прогон,
 *      убитый снаружи (Ctrl+C, закрытая труба вида `| head`), до `after` не
 *      доходит и оставляет свои строки в живой базе — следующий прогон обязан
 *      начинать с чистого места, а не наследовать чужой мусор.
 *
 * ГРАНИЦА БЕЗОПАСНОСТИ. Уборка принимает только явные идентификаторы и только
 * из тестового пространства `dce70000-…`; маска по имени или по префиксу
 * организации не поддерживается вообще. Поэтому ни демонстрационная клиника
 * снимков `d0000000-…`, ни рабочая «Стоматология, 1 кабинет» `4a3420d1-…` под
 * эту функцию не подставляются даже по ошибке — она их отвергнет с исключением.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FORCE RLS: ПОЧЕМУ ФИКСТУРЕ НУЖЕН ТЕНАНТ-КОНТЕКСТ, А ОБХОД НЕ ГОДИТСЯ
 * ─────────────────────────────────────────────────────────────────────────────
 * Роль приложения `dental` — NOSUPERUSER/NOBYPASSRLS и владелец таблиц, а RLS
 * стоит в режиме FORCE, то есть распространяется и на владельца. Замеры на
 * живой базе (транзакции откатывались):
 *
 *   INSERT organizations без контекста ................ 42501
 *   INSERT organizations под current_tenant=<свой id> .. OK, 1 строка
 *   INSERT organizations под current_tenant=<чужой id> . 42501
 *   INSERT patients      под current_tenant=<свой id> .. OK, 1 строка
 *   INSERT patients      под чужим тенантом ............ 42501
 *   DELETE patients      под своим тенантом ............ rowCount 1
 *   DELETE organizations без контекста ................. rowCount 0, строка жива
 *
 * ЗАПИСЬ ПОД ОБХОДОМ НЕ РАБОТАЕТ И ЧИНИТЬ ЕЮ НЕЧЕГО. Дизъюнкт
 * `current_setting('app.superuser_bypass', true) = 'on'` стоит в `USING` у всех
 * тенант-таблиц, но в `WITH CHECK` — ТОЛЬКО у `organizations`. Поэтому под одним
 * лишь обходом создаётся организация (и притом любая, ничем не ограниченная), а
 * `users`, `clinics`, `patients` и остальные 130+ таблиц отвечают 42501.
 *
 * ДЛЯ УДАЛЕНИЯ ОБХОД ПРЯМО ОПАСЕН. У `DELETE` нет `WITH CHECK`, он смотрит
 * только в `USING`, где дизъюнкт обхода истинен для КАЖДОЙ строки. Уборка
 * фикстуры под обходом ограничена только собственным `WHERE` — то есть одной
 * опечаткой в предикате сносит данные соседней клиники. Под тенант-контекстом
 * такой опечатке нанести вред нечем: политика оставляет видимыми ровно строки
 * своего арендатора.
 *
 * ТИХАЯ УБОРКА — ОТДЕЛЬНЫЙ ДЕФЕКТ, И ОН ХУЖЕ ГРОМКОГО. `INSERT` без контекста
 * падает с 42501 и виден сразу. `DELETE` без контекста просто не видит строк, а
 * ноль удалённых строк ошибкой не является — PostgreSQL намеренно не отличает
 * «строки нет» от «строку скрыла политика», иначе сам отказ стал бы каналом
 * утечки о существовании строки. Поэтому прежняя уборка отчитывалась об успехе,
 * не сняв ни одной строки, и фикстурные клиники накапливались бы в общей базе.
 * Отсюда правило этого модуля: КАЖДОЕ утверждение об успехе опирается на
 * измеренный `rowCount`, а сам факт исчезновения организации перепроверяется
 * отдельным чтением (`assertNoFixtureOrganizationSurvived`).
 */

/**
 * Первая группа UUID тестовой клиники. Ни одна живая организация её не
 * использует, и именно она делает уборку заведомо безопасной.
 */
const FIXTURE_UUID_PREFIX = "dce70000";

const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Больше проходов не нужно: цепочки ссылок в схеме короче. */
const MAX_PURGE_PASSES = 8;

/** Слот занимает 4 шестнадцатеричных разряда — 65 536 строк на файл. */
const MAX_SLOT = 0xffff;

/**
 * Организации из общего блока `…-0901`/`…-0902`, который был выдан трём файлам
 * сразу. Эти строки остались в живых базах разработчиков от прогонов, убитых на
 * половине: в моей базе на момент разбора лежала «Клиника диктовки Б»
 * `dce70000-0000-4000-8000-000000000902` от оборванного прогона теста диктовки.
 *
 * После перевода тестов на `fixtureUuid` на эти идентификаторы больше никто не
 * ссылается, то есть сами они уже не исчезнут. Поэтому файлы, которые их
 * породили, подметают их на входе — по явному идентификатору, у каждого своя
 * причина это делать, и на чужой базе уборка сработает так же, как на моей.
 * Пациент `…-0911` и приём `…-0921` перечислять не нужно: они лежат внутри
 * организации `…-0901`, и каталожная уборка снимает их вместе с ней.
 */
export const LEGACY_SHARED_FIXTURE_ORGANIZATION_IDS = [
	"dce70000-0000-4000-8000-000000000901",
	"dce70000-0000-4000-8000-000000000902",
] as const;

/**
 * Идентификатор строки фикстуры, выведенный из имени пространства.
 *
 * `namespace` — имя тестового файла (`"portalOtp"`, `"speechTranscribeChunk"`).
 * `slot` — номер строки внутри файла; какой слот чему соответствует, решает сам
 * файл, и за его пределы это не выходит.
 *
 * Форма остаётся корректным UUID версии 4 (ниббл версии `4`, вариант `8`),
 * потому что колонки объявлены как `uuid` и PostgreSQL разбирает значение.
 * Пространство под хеш — 18 шестнадцатеричных разрядов, 72 бита: совпадение
 * блоков у двух разных имён исключено практически.
 */
export function fixtureUuid(namespace: string, slot: number): string {
	if (namespace.trim() === "") {
		throw new Error("fixtureUuid: пространство имён пусто — передайте имя тестового файла.");
	}
	if (!Number.isInteger(slot) || slot < 0 || slot > MAX_SLOT) {
		throw new Error(`fixtureUuid: слот ${slot} вне диапазона 0..${MAX_SLOT}.`);
	}
	const digest = createHash("sha256").update(namespace).digest("hex");
	const group2 = digest.slice(0, 4);
	const group3 = `4${digest.slice(4, 7)}`;
	const group4 = `8${digest.slice(7, 10)}`;
	const group5 = `${digest.slice(10, 18)}${slot.toString(16).padStart(4, "0")}`;
	return `${FIXTURE_UUID_PREFIX}-${group2}-${group3}-${group4}-${group5}`;
}

/**
 * База недоступна — то есть до неё не дошёл запрос, а не «запрос дошёл и база
 * ответила отказом».
 *
 * ПОЧЕМУ НЕ ПРОСТО /does not exist/. Прежний вариант этой проверки, скопированный
 * в каждый тест по живой базе, включал `does not exist` без уточнения. Под него
 * подходит и `column "…" does not exist`, и `relation "…" does not exist` — то
 * есть РАСХОЖДЕНИЕ СХЕМЫ С КОДОМ, самая важная поломка из всех, какие тест
 * может застать. Она молча превращалась в `context.skip("база недоступна")`, и
 * прогон оставался зелёным при нерабочей миграции. Здесь допускаются только
 * отсутствующая база и отсутствующая роль — случаи, когда подключиться нельзя в
 * принципе; всё остальное обязано падать громко.
 *
 * ОТКАЗ ПОЛИТИКИ (42501) СЮДА НЕ ВХОДИТ И ВХОДИТЬ НЕ ДОЛЖЕН. Это не «базы нет»,
 * а «фикстура сеет без тенант-контекста» — то есть дефект самой фикстуры,
 * который обязан быть виден, а не спрятан за `context.skip`.
 */
export function isDatabaseUnavailable(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return (
		/ECONNREFUSED|ENOTFOUND|EHOSTUNREACH|ETIMEDOUT|getaddrinfo|Connection terminated|Client has encountered a connection error|password authentication failed/i.test(
			message,
		) ||
		/database "[^"]*" does not exist/i.test(message) ||
		/role "[^"]*" does not exist/i.test(message)
	);
}

function assertFixtureUuidShape(organizationId: string, caller: string): void {
	if (!UUID_SHAPE.test(organizationId)) {
		throw new Error(
			`${caller}: «${organizationId}» не UUID в нижнем регистре. Тенант-контекст ставится значением из аргумента, ` +
				"и битое значение уронило бы каждую политику на приведении ::uuid (22P02) вместо понятного отказа.",
		);
	}
}

function assertPurgeableFixtureId(organizationId: string): void {
	assertFixtureUuidShape(organizationId, "purgeFixtureOrganizations");
	if (!organizationId.startsWith(`${FIXTURE_UUID_PREFIX}-`)) {
		throw new Error(
			`purgeFixtureOrganizations: организация ${organizationId} не из тестового пространства ${FIXTURE_UUID_PREFIX}-… и удалена не будет. ` +
				"Данные клиники этой функцией не удаляются — заведите фикстуру через fixtureUuid().",
		);
	}
}

/**
 * ЕДИНСТВЕННАЯ ТОЧКА ВХОДА ДЛЯ СЕВА ФИКСТУРЫ.
 *
 * Выполняет `seed` в транзакции, где `app.current_tenant` уже равен
 * `organizationId`. Все запросы внутри — включая обычные `db.insert(...)`,
 * потому что `db` из `db/client.ts` подхватывает активную транзакцию через
 * `AsyncLocalStorage`, — идут под этим контекстом и проходят `WITH CHECK`.
 *
 * ПОЧЕМУ ИДЕНТИФИКАТОР ЗАДАЁТСЯ ЗАРАНЕЕ, А НЕ БЕРЁТСЯ ИЗ ВСТАВЛЕННОЙ СТРОКИ.
 * Курицы и яйца здесь нет: `app.current_tenant` — обычный строковый параметр
 * сеанса, он ничем не связан с содержимым таблицы, а политика `organizations`
 * сверяет `id = current_tenant`. Под таким контекстом создаётся РОВНО названная
 * строка: вставка организации с любым другим `id` отвергается кодом 42501
 * (замерено). Это строго уже обхода, под которым запись в `organizations` не
 * ограничена ничем. Тот же приём применён в боевом коде — `routes/auth.ts`
 * (`/api/auth/register`, `/api/auth/setup/init`), `scripts/migrateStateToDb.ts`,
 * `scripts/seedAuth.ts`; четвёртого способа заводить организацию в этом дереве
 * нет и заводить не нужно.
 *
 * ДЕТЕРМИНИРОВАННОСТЬ `fixtureUuid` ПРИ ЭТОМ СОХРАНЯЕТСЯ и обязана сохраняться:
 * идентификатор выводится из имени файла именно для того, чтобы уборка НА ВХОДЕ
 * находила мусор от убитого прогона. Случайный `crypto.randomUUID()` (как в
 * боевой регистрации, где клиника создаётся один раз и навсегда) эту находимость
 * уничтожил бы.
 *
 * ГРАНИЦА. Проверяется только форма UUID, а не префикс `dce70000-`: часть
 * фикстур живёт в других пространствах идентификаторов, и запрет писать туда
 * ничего бы не защитил — та же строка вставлялась бы просто мимо этой функции.
 * Настоящая граница безопасности стоит на УДАЛЕНИИ, где цена ошибки необратима:
 * `purgeFixtureOrganizations` принимает только `dce70000-…`.
 *
 * @param organizationId UUID организации, от имени которой сеется фикстура.
 * @param seed           Тело сева. Может пользоваться и переданным `tx`, и
 *                       общим `db` — это одна и та же транзакция.
 */
export async function withFixtureTenant<T>(
	organizationId: string,
	seed: (tx: TenantDb) => Promise<T>,
): Promise<T> {
	assertFixtureUuidShape(organizationId, "withFixtureTenant");
	return withTenantCtx(organizationId, seed);
}

/**
 * Таблица со ссылкой на организацию и признак того, вправе ли текущая роль
 * удалять из неё строки.
 */
type OrganizationScopedTable = {
	readonly name: string;
	readonly deletable: boolean;
};

/** Что именно сняла уборка. Числа измерены, а не предположены. */
export interface FixturePurgeReport {
	/** Сколько строк ушло из самой `organizations` (0..targets.length). */
	readonly organizationsRemoved: number;
	/** Сколько строк ушло из зависимых таблиц суммарно. */
	readonly rowsRemoved: number;
	/** Таблицы, где `rowCount` оказался больше нуля. */
	readonly tablesTouched: readonly string[];
}

/**
 * Таблицы, где есть ссылка на организацию, — по каталогу базы.
 *
 * Имя таблицы приходит из `information_schema` и подставляется через
 * `sql.identifier`, идентификатор организации — параметром запроса. Склейки
 * значения в текст SQL здесь нет.
 *
 * ПОЧЕМУ ЗДЕСЬ ЖЕ СПРАШИВАЕТСЯ ПРАВО НА УДАЛЕНИЕ. С миграции
 * `0161_audit_append_only.sql` часть таблиц журнала аудита закрыта на дозапись:
 * право DELETE у роли `dental` отозвано, поверх стоят триггеры-сторожа. Такая
 * таблица отвечает на DELETE кодом 42501 ВСЕГДА — проверка прав срабатывает до
 * того, как база посмотрит на условие, поэтому отказ приходит даже когда под
 * условие не подпадает ни одной строки (замерено: DELETE по заведомо
 * несуществующей организации даёт 42501 на обеих таблицах журнала).
 *
 * Признак берётся из каталога, а не из списка имён в коде, ровно по той же
 * причине, по которой из каталога берётся сам список таблиц: поимённый перечень
 * устаревает при первой же следующей миграции, которая закроет ещё одну таблицу,
 * а `has_table_privilege` отстать не может.
 *
 * Каталог читается ОДИН РАЗ на вызов уборки и переиспользуется для всех
 * организаций списка: `information_schema` под RLS не ходит, и результат от
 * арендатора не зависит.
 */
async function organizationScopedTables(): Promise<OrganizationScopedTable[]> {
	const catalog = await db.execute<{ table_name: string; deletable: boolean }>(sql`
		SELECT c.table_name,
		       has_table_privilege(
		         current_user,
		         format('%I.%I', c.table_schema, c.table_name),
		         'DELETE'
		       ) AS deletable
		FROM information_schema.columns AS c
		JOIN information_schema.tables AS t
		  ON t.table_schema = c.table_schema AND t.table_name = c.table_name
		WHERE c.table_schema = 'public'
		  AND c.column_name = 'organization_id'
		  AND c.table_name <> 'organizations'
		  AND t.table_type = 'BASE TABLE'
		ORDER BY c.table_name
	`);
	return catalog.rows.map((row) => ({ name: row.table_name, deletable: row.deletable }));
}

/**
 * Проверяет, что закрытые на дозапись таблицы не держат ни одной строки убираемой
 * организации.
 *
 * ЗАЧЕМ ЭТО ВООБЩЕ НУЖНО. Строки журнала мешают не сами по себе: обе таблицы
 * журнала стоят на ссылающейся стороне внешнего ключа
 * `organization_id -> organizations.id` без `ON DELETE`. Пока хоть одна запись
 * жива, удаление самой организации отвергается кодом 23503. Удалить журнал ролью
 * приложения нельзя и не должно быть можно, поэтому единственный честный исход —
 * назвать это вслух, с таблицей, организацией и числом строк, а не отдать
 * следующему читателю невнятный отказ по внешнему ключу.
 *
 * ПОЧЕМУ СЧЁТ ИДЁТ ПОД ТЕНАНТ-КОНТЕКСТОМ, А НЕ ПОД ОБХОДОМ. Обе таблицы журнала
 * под принудительным RLS (`relforcerowsecurity`) с политикой по
 * `app.current_tenant`. Обычный SELECT БЕЗ контекста возвращает НОЛЬ СТРОК
 * независимо от того, что в таблице лежит на самом деле, — проверка, построенная
 * на таком счёте, всегда говорила бы «чисто», то есть была бы не проверкой, а её
 * имитацией. Раньше это лечилось обходом; теперь вся уборка идёт внутри
 * `withTenantCtx(organizationId)`, и под ним политика оставляет видимыми ровно
 * строки этой организации — то есть ровно то множество, которое здесь и
 * считается. Обход стал не нужен, и это правильная сторона размена: чем меньше
 * мест, где тестовая обвязка снимает изоляцию, тем лучше.
 */
async function assertAppendOnlyTablesAreEmptyFor(
	tx: TenantDb,
	tables: readonly string[],
	organizationId: string,
): Promise<void> {
	if (tables.length === 0) return;

	const held: string[] = [];
	for (const table of tables) {
		const result = await tx.execute<{ total: number }>(sql`
			SELECT count(*)::int AS total
			FROM ${sql.identifier(table)}
			WHERE organization_id = ${organizationId}::uuid
		`);
		const total = result.rows[0]?.total ?? 0;
		if (total > 0) held.push(`${table}: строк ${total}`);
	}

	if (held.length === 0) return;

	throw new Error(
		`purgeFixtureOrganizations: организация ${organizationId} оставила записи в журнале аудита, ` +
			`поэтому удалить её нельзя: ${held.join("; ")}. ` +
			"Журнал открыт только на дозапись (миграция 0161_audit_append_only.sql, мера РСБ.7 приказа ФСТЭК России N 21), " +
			"роль приложения не удаляет из него ни одной строки. " +
			"Тест, дописывающий журнал под фикстурной клиникой, обязан либо не удалять эту клинику, либо получить отдельный идентификатор на прогон.",
	);
}

/**
 * Снимает одну тестовую клинику целиком под её собственным тенант-контекстом.
 *
 * Проходов несколько, потому что таблицы ссылаются и друг на друга (приём →
 * пациент, задание ИИ → приём): строка не удалится, пока жива ссылающаяся на
 * неё. Проходы прекращаются, когда очередной не сдвинул ни одной таблицы.
 * Остаток не замалчивается: он превращается в исключение с именами таблиц,
 * потому что тихо оставленный мусор в следующем прогоне читается как данные
 * клиники.
 *
 * ЗАЧЕМ SAVEPOINT НА КАЖДЫЙ DELETE. Раньше проходы шли в автокоммите, где
 * неудачный `DELETE` был сам по себе и соседей не задевал. Внутри транзакции это
 * не так: любая ошибка переводит транзакцию в состояние 25P02, и КАЖДЫЙ
 * следующий оператор падает с «current transaction is aborted» — цикл проходов,
 * ради которого всё это написано, выродился бы в один проход, где после первой
 * же ссылочной блокировки не удаляется вообще ничего. `SAVEPOINT` + `ROLLBACK TO`
 * возвращает транзакцию в рабочее состояние ровно на один оператор назад
 * (проверено на живой базе: после 23503 и отката к точке сохранения счёт строк
 * в той же транзакции выполняется нормально).
 *
 * ТАБЛИЦЫ ЖУРНАЛА АУДИТА В ЭТОТ ЦИКЛ НЕ ПОПАДАЮТ, И ЭТО НЕ ПОБЛАЖКА. С миграции
 * 0161 у роли приложения нет права DELETE на `audit_events` и
 * `clinical_audit_logs`; отказ 42501 приходит на КАЖДОМ проходе и не зависит ни
 * от условия запроса, ни от числа строк. Для цикла «мешает ссылка из ещё не
 * очищенной таблицы — вернёмся следующим проходом» это вечно заблокированная
 * таблица: цикл честно доходил до предела и падал исключением ВСЕГДА, даже когда
 * журнал по этим организациям пуст.
 *
 * Цена этой ошибки была не в упавшей уборке. `after`-хук четырёх файлов диктовки
 * снимает консультационную блокировку PostgreSQL ПОСЛЕ уборки; исключение из
 * уборки уносило хук целиком, `release()` не вызывался, сессия-держатель
 * оставалась жива, и остальные участники очереди ждали её до конца прогона.
 * Набор тестов переставал завершаться вообще — измерено, воспроизведено на
 * `speech/tests/storage.test.ts` (EXIT=124 по внешнему таймауту).
 *
 * Правильное разделение проходит не по «получилось/не получилось», а по природе
 * отказа: FK-блокировка временна и снимается следующим проходом, отзыв права
 * постоянен и следующим проходом не снимется никогда. Первое лечится циклом,
 * второе — знанием о том, что удалять эту таблицу не нужно и не положено.
 * Поэтому право спрашивается заранее, а непустой журнал становится отдельным,
 * названным вслух отказом (см. `assertAppendOnlyTablesAreEmptyFor`).
 *
 * ЗДЕСЬ БОЛЬШЕ НЕТ ОТДЕЛЬНОГО УДАЛЕНИЯ `bi_analytics_snapshots` С `.catch(() => {})`.
 * Оно было и лишним, и вредным: у таблицы есть колонка `organization_id`,
 * то есть каталожный цикл выше берёт её сам (проверено запросом к
 * `information_schema`), а проглоченная ошибка означала бы, что уборка отчиталась
 * об успехе, ничего не проверив. Ровно этот приём и просили не применять.
 */
async function purgeOneFixtureOrganization(
	organizationId: string,
	deletable: readonly string[],
	appendOnly: readonly string[],
): Promise<FixturePurgeReport> {
	return withTenantCtx(organizationId, async (tx) => {
		const tablesTouched: string[] = [];
		let rowsRemoved = 0;
		let remaining = [...deletable];
		let lastFailure: unknown = null;

		for (let pass = 0; pass < MAX_PURGE_PASSES && remaining.length > 0; pass += 1) {
			const blocked: string[] = [];
			for (const table of remaining) {
				await tx.execute(sql`SAVEPOINT fixture_purge_step`);
				try {
					const deleted = await tx.execute(
						sql`DELETE FROM ${sql.identifier(table)} WHERE organization_id = ${organizationId}::uuid`,
					);
					await tx.execute(sql`RELEASE SAVEPOINT fixture_purge_step`);
					// rowCount — единственное честное свидетельство того, что уборка
					// что-то сделала. «Код дошёл сюда» свидетельством не является:
					// именно так прежняя уборка отчитывалась об успехе, сняв ноль строк.
					const removed = deleted.rowCount ?? 0;
					if (removed > 0) {
						rowsRemoved += removed;
						tablesTouched.push(table);
					}
				} catch (error) {
					// Мешает ссылка из ещё не очищенной таблицы — вернёмся следующим
					// проходом. Причина сохраняется: молча проглоченная ошибка выглядит
					// потом как «мешает внешний ключ», хотя запрос может быть просто
					// неверным.
					await tx.execute(sql`ROLLBACK TO SAVEPOINT fixture_purge_step`);
					await tx.execute(sql`RELEASE SAVEPOINT fixture_purge_step`);
					lastFailure = error;
					blocked.push(table);
				}
			}
			if (blocked.length === remaining.length) break;
			remaining = blocked;
		}

		if (remaining.length > 0) {
			const reason = lastFailure instanceof Error ? lastFailure.message : String(lastFailure);
			throw new Error(
				`purgeFixtureOrganizations: не удалось очистить таблицы ${remaining.join(", ")} для ${organizationId}. ` +
					`Последняя ошибка базы: ${reason}`,
			);
		}

		/*
		 * Журнал проверяется ДО удаления организации, а не после отказа по внешнему
		 * ключу: 23503 назвал бы имя ограничения, а не причину, по которой строки
		 * журнала неудаляемы, и следующий читатель пошёл бы искать дефект в уборке.
		 */
		await assertAppendOnlyTablesAreEmptyFor(tx, appendOnly, organizationId);

		const removedOrganization = await tx.execute(
			sql`DELETE FROM organizations WHERE id = ${organizationId}::uuid`,
		);
		return {
			organizationsRemoved: removedOrganization.rowCount ?? 0,
			rowsRemoved,
			tablesTouched,
		};
	});
}

/**
 * Наблюдение вместо рассуждения: после уборки строк убранных организаций в базе
 * быть не должно.
 *
 * ЗАЧЕМ ОТДЕЛЬНОЕ ЧТЕНИЕ, ЕСЛИ `rowCount` УЖЕ ПОСЧИТАН. `rowCount` говорит,
 * сколько строк сняла КОНКРЕТНАЯ команда, и ничего не говорит о том, не осталось
 * ли строки, которую эта команда не увидела. Ровно этот разрыв и дал прежний
 * дефект: уборка доходила до конца, ничего не сняв, и молчала. Проверка ниже
 * закрывает его наблюдением за результатом.
 *
 * ПОЧЕМУ ПОД ОБХОДОМ, А НЕ ПОД КОНТЕКСТОМ. Контекст своего арендатора для
 * проверки «строки нет» бесполезен по построению: чтение под ним не отличит
 * «удалили» от «не видим». Обход здесь — ОДНО ЧТЕНИЕ ОДНОЙ КОЛОНКИ в
 * транзакции, флаг ставится через `set_config(…, true)` и умирает вместе с ней,
 * не утекая на следующего клиента пула. Это тот же приём, которым `routes/auth.ts`
 * отличает «логина нет» от «политика скрыла строку», и та же ловушка, на которой
 * трижды за кампанию получали ложный ноль.
 */
async function assertNoFixtureOrganizationSurvived(targets: readonly string[]): Promise<void> {
	const survivors = await withSuperuserBypass(async (tx) => {
		const found = await tx.execute<{ id: string; name: string }>(sql`
			SELECT id::text AS id, name
			FROM organizations
			WHERE id IN (${sql.join(
				targets.map((id) => sql`${id}::uuid`),
				sql`, `,
			)})
			ORDER BY id
		`);
		return found.rows;
	});

	if (survivors.length === 0) return;

	throw new Error(
		"purgeFixtureOrganizations: уборка отчиталась о завершении, но в базе остались тестовые клиники " +
			`${survivors.map((row) => `${row.id} «${row.name}»`).join(", ")}. ` +
			"Счёт сделан под обходом RLS, поэтому это не «не вижу из-за политики», а действительно живые строки.",
	);
}

/**
 * Удаляет тестовые клиники целиком: сначала всё, что на них ссылается, затем
 * сами организации. Возвращает измеренные числа — вызывающий вправе на них
 * опереться, и именно они, а не факт возврата из функции, означают, что уборка
 * что-то сделала.
 *
 * Каждая организация убирается в СВОЕЙ транзакции под СВОИМ тенант-контекстом:
 * `app.current_tenant` хранит ровно одного арендатора, и списком его не задать.
 * Побочный выигрыш — уборка соседа не откатывается из-за отказа на этой клинике.
 */
export async function purgeFixtureOrganizations(
	organizationIds: readonly string[],
): Promise<FixturePurgeReport> {
	const targets = [...new Set(organizationIds)];
	for (const organizationId of targets) assertPurgeableFixtureId(organizationId);
	if (targets.length === 0) {
		return { organizationsRemoved: 0, rowsRemoved: 0, tablesTouched: [] };
	}

	const catalog = await organizationScopedTables();
	const appendOnly = catalog.filter((table) => !table.deletable).map((table) => table.name);
	const deletable = catalog.filter((table) => table.deletable).map((table) => table.name);

	let organizationsRemoved = 0;
	let rowsRemoved = 0;
	const tablesTouched = new Set<string>();

	for (const organizationId of targets) {
		const removed = await purgeOneFixtureOrganization(organizationId, deletable, appendOnly);
		organizationsRemoved += removed.organizationsRemoved;
		rowsRemoved += removed.rowsRemoved;
		for (const table of removed.tablesTouched) tablesTouched.add(table);
	}

	await assertNoFixtureOrganizationSurvived(targets);

	return {
		organizationsRemoved,
		rowsRemoved,
		tablesTouched: [...tablesTouched].sort(),
	};
}
