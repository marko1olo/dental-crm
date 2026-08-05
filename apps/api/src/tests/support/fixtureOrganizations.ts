import { createHash } from "node:crypto";
import { type SQL, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withSuperuserBypass } from "../../db/rls.js";

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
 *   2. `purgeFixtureOrganizations` убирает клинику по КАТАЛОГУ базы, а не по
 *      поимённому списку таблиц: список устаревает при появлении любой новой
 *      таблицы со ссылкой на организацию, каталог отстать не может.
 *   3. Уборка вызывается НА ВХОДЕ фикстуры, а не только на выходе. Прогон,
 *      убитый снаружи (Ctrl+C, закрытая труба вида `| head`), до `after` не
 *      доходит и оставляет свои строки в живой базе — следующий прогон обязан
 *      начинать с чистого места, а не наследовать чужой мусор.
 *
 * ГРАНИЦА БЕЗОПАСНОСТИ. Уборка принимает только явные идентификаторы и только
 * из тестового пространства `dce70000-…`; маска по имени или по префиксу
 * организации не поддерживается вообще. Поэтому ни демонстрационная клиника
 * снимков `d0000000-…`, ни рабочая «Стоматология, 1 кабинет» `4a3420d1-…` под
 * эту функцию не подставляются даже по ошибке — она их отвергнет с исключением.
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

function assertPurgeableFixtureId(organizationId: string): void {
	if (!UUID_SHAPE.test(organizationId)) {
		throw new Error(
			`purgeFixtureOrganizations: «${organizationId}» не UUID в нижнем регистре. Уборка работает только по явным идентификаторам.`,
		);
	}
	if (!organizationId.startsWith(`${FIXTURE_UUID_PREFIX}-`)) {
		throw new Error(
			`purgeFixtureOrganizations: организация ${organizationId} не из тестового пространства ${FIXTURE_UUID_PREFIX}-… и удалена не будет. ` +
				"Данные клиники этой функцией не удаляются — заведите фикстуру через fixtureUuid().",
		);
	}
}

/**
 * Таблица со ссылкой на организацию и признак того, вправе ли текущая роль
 * удалять из неё строки.
 */
type OrganizationScopedTable = {
	readonly name: string;
	readonly deletable: boolean;
};

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
 * Проверяет, что закрытые на дозапись таблицы не держат ни одной строки убираемых
 * организаций.
 *
 * ЗАЧЕМ ЭТО ВООБЩЕ НУЖНО. Строки журнала мешают не сами по себе: обе таблицы
 * журнала стоят на ссылающейся стороне внешнего ключа
 * `organization_id -> organizations.id` без `ON DELETE`. Пока хоть одна запись
 * жива, удаление самой организации отвергается кодом 23503. Удалить журнал ролью
 * приложения нельзя и не должно быть можно, поэтому единственный честный исход —
 * назвать это вслух, с таблицей, организацией и числом строк, а не отдать
 * следующему читателю невнятный отказ по внешнему ключу.
 *
 * ПОЧЕМУ СЧЁТ ИДЁТ ПОД `withSuperuserBypass`. Обе таблицы журнала — под
 * принудительным RLS (`relforcerowsecurity`) с политикой по `app.current_tenant`.
 * Обычный SELECT без тенант-контекста возвращает НОЛЬ СТРОК независимо от того,
 * что в таблице лежит на самом деле. Проверка, построенная на таком счёте, всегда
 * говорила бы «чисто» — то есть была бы не проверкой, а её имитацией. Обход RLS
 * здесь только на ЧТЕНИЕ и в транзакции: `withSuperuserBypass` ставит флаг через
 * `set_config(…, true)`, поэтому он умирает вместе с транзакцией и не утекает на
 * следующего клиента пула.
 */
async function assertAppendOnlyTablesAreEmptyFor(
	tables: readonly string[],
	targets: readonly string[],
	idList: SQL,
): Promise<void> {
	if (tables.length === 0) return;

	const held = await withSuperuserBypass(async (tx) => {
		const found: string[] = [];
		for (const table of tables) {
			const result = await tx.execute<{ organization_id: string; total: number }>(sql`
				SELECT organization_id::text AS organization_id, count(*)::int AS total
				FROM ${sql.identifier(table)}
				WHERE organization_id IN (${idList})
				GROUP BY organization_id
				ORDER BY organization_id
			`);
			for (const row of result.rows) {
				found.push(`${table}: ${row.organization_id} — строк ${row.total}`);
			}
		}
		return found;
	});

	if (held.length === 0) return;

	throw new Error(
		`purgeFixtureOrganizations: организации ${targets.join(", ")} оставили записи в журнале аудита, ` +
			`поэтому удалить их нельзя: ${held.join("; ")}. ` +
			"Журнал открыт только на дозапись (миграция 0161_audit_append_only.sql, мера РСБ.7 приказа ФСТЭК России N 21), " +
			"роль приложения не удаляет из него ни одной строки. " +
			"Тест, дописывающий журнал под фикстурной клиникой, обязан либо не удалять эту клинику, либо получить отдельный идентификатор на прогон.",
	);
}

/**
 * Удаляет тестовые клиники целиком: сначала всё, что на них ссылается, затем
 * сами организации.
 *
 * Проходов несколько, потому что перечисленные таблицы ссылаются и друг на
 * друга (приём → пациент, задание ИИ → приём): строка не удалится, пока жива
 * ссылающаяся на неё. Проходы прекращаются, когда очередной не сдвинул ни одной
 * таблицы. Остаток не замалчивается: он превращается в исключение с именами
 * таблиц, потому что тихо оставленный мусор в следующем прогоне читается как
 * данные клиники.
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
 */
export async function purgeFixtureOrganizations(organizationIds: readonly string[]): Promise<void> {
	const targets = [...new Set(organizationIds)];
	for (const organizationId of targets) assertPurgeableFixtureId(organizationId);
	if (targets.length === 0) return;

	/*
	 * Список организаций — отдельный связанный параметр на каждую, а не один
	 * массив. Массив в шаблоне `sql` drizzle разбирает как набор фрагментов
	 * запроса, а не как одно значение, и `= ANY(${targets}::uuid[])` давал
	 * синтаксически битый SQL: падали ВСЕ таблицы подряд, включая независимые.
	 */
	const idList = sql.join(
		targets.map((id) => sql`${id}::uuid`),
		sql`, `,
	);

	const catalog = await organizationScopedTables();
	const appendOnly = catalog.filter((table) => !table.deletable).map((table) => table.name);

	let remaining = catalog.filter((table) => table.deletable).map((table) => table.name);
	let lastFailure: unknown = null;
	for (let pass = 0; pass < MAX_PURGE_PASSES && remaining.length > 0; pass += 1) {
		const blocked: string[] = [];
		for (const table of remaining) {
			try {
				await db.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE organization_id IN (${idList})`);
			} catch (error) {
				// Мешает ссылка из ещё не очищенной таблицы — вернёмся следующим проходом.
				// Причина сохраняется: молча проглоченная ошибка выглядит потом как
				// «мешает внешний ключ», хотя запрос может быть просто неверным.
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
			`purgeFixtureOrganizations: не удалось очистить таблицы ${remaining.join(", ")} для ${targets.join(", ")}. ` +
				`Последняя ошибка базы: ${reason}`,
		);
	}

	/*
	 * Журнал проверяется ДО удаления организации, а не после отказа по внешнему
	 * ключу: 23503 назвал бы имя ограничения, а не причину, по которой строки
	 * журнала неудаляемы, и следующий читатель пошёл бы искать дефект в уборке.
	 */
	await assertAppendOnlyTablesAreEmptyFor(appendOnly, targets, idList);

	await db.execute(sql`DELETE FROM organizations WHERE id IN (${idList})`);
}

