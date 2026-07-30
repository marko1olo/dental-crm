import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../../db/client.js";

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
 * Таблицы, где есть ссылка на организацию, — по каталогу базы.
 *
 * Имя таблицы приходит из `information_schema` и подставляется через
 * `sql.identifier`, идентификатор организации — параметром запроса. Склейки
 * значения в текст SQL здесь нет.
 */
async function tablesReferencingOrganization(): Promise<string[]> {
	const catalog = await db.execute<{ table_name: string }>(sql`
		SELECT c.table_name
		FROM information_schema.columns AS c
		JOIN information_schema.tables AS t
		  ON t.table_schema = c.table_schema AND t.table_name = c.table_name
		WHERE c.table_schema = 'public'
		  AND c.column_name = 'organization_id'
		  AND c.table_name <> 'organizations'
		  AND t.table_type = 'BASE TABLE'
		ORDER BY c.table_name
	`);
	return catalog.rows.map((row) => row.table_name);
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

	let remaining = await tablesReferencingOrganization();
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

	await db.execute(sql`DELETE FROM bi_analytics_snapshots WHERE organization_id IN (${idList})`).catch(() => {});
	await db.execute(sql`DELETE FROM organizations WHERE id IN (${idList})`);
}
