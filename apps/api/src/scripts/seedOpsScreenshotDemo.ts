/**
 * Данные демонстрационной клиники для съёмки рабочих панелей.
 *
 * ЗАЧЕМ. Проверить оформление панелей чтением исходников нельзя: вёрстка,
 * контраст и поведение на узком экране видны только на живом экране с
 * содержимым. В рабочей базе одна организация с тремя пациентами и нулём
 * приёмов — на ней панели покажут пустые состояния, и оценить таблицы не выйдет.
 *
 * ПОЧЕМУ ОТДЕЛЬНАЯ ОРГАНИЗАЦИЯ, А НЕ ДОЗАПИСЬ В СУЩЕСТВУЮЩУЮ. Чужие данные
 * трогать нельзя, а вычистить ровно то, что добавил, проще, когда всё лежит под
 * одним идентификатором арендатора.
 *
 * ЗАПУСК
 *   npx tsx src/scripts/seedOpsScreenshotDemo.ts          — наполнить и выдать токены
 *   npx tsx src/scripts/seedOpsScreenshotDemo.ts --clean   — вычистить данные
 *
 * ============================================================================
 * ПОЧЕМУ ФАЙЛ ПЕРЕПИСАН (2026-08-06)
 * ============================================================================
 *
 * Две независимые поломки, обе измерены на чистом кластере PostgreSQL 18.4
 * (порт 5436, роль `dental` — LOGIN NOSUPERUSER NOBYPASSRLS, 131 миграция):
 *
 * 1. RLS. После 0157–0160 `FORCE ROW LEVEL SECURITY` стоит на 147 таблицах из
 *    148, а роль приложения — владелец таблиц, то есть FORCE распространяется и
 *    на неё. Скрипт не выставлял ни `app.current_tenant`, ни
 *    `app.superuser_bypass`, поэтому под ним:
 *      • `INSERT INTO organizations` отвергается с 42501 (WITH CHECK);
 *      • любой `DELETE` видит НОЛЬ строк и удаляет НОЛЬ, а скрипт всё равно
 *        печатал «Демонстрационная организация удалена». Это ровно тот дефект,
 *        что был найден в migrateStateToDb.ts: сообщение об успехе опиралось на
 *        то, что выполнение дошло до строки, а не на число затронутых строк.
 *
 * 2. Журнал аудита. Миграция 0161 отозвала у роли права `UPDATE, DELETE,
 *    TRUNCATE` на `audit_events` и `clinical_audit_logs` и повесила на обе
 *    таблицы триггеры `ENABLE ALWAYS`. Прежняя строка `db.delete(auditEvents)`
 *    падает с 42501 на уровне ПРАВ (`aclchk.c`, `aclcheck_error`) — то есть до
 *    политик RLS дело не доходит вовсе. Замер на этом дереве:
 *
 *      DrizzleQueryError: Failed query: delete from "audit_events"
 *      where "audit_events"."organization_id" = $1        code: '42501'
 *
 * ============================================================================
 * ЧТО ВЫБРАНО ВЗАМЕН УДАЛЕНИЯ ЖУРНАЛА И ПОЧЕМУ ИМЕННО ЭТО
 * ============================================================================
 *
 * Тот `DELETE` стоял ровно перед удалением организации и существовал только
 * затем, чтобы снять внешний ключ. Ослаблять 0161 запрещено, а обойти её нечем:
 * запрет держат ДВА независимых рубежа — отозванная привилегия и триггер.
 *
 * Дальше решает форма внешних ключей. Измерено на том же кластере
 * (`pg_constraint.confdeltype`), все пять — `a`, то есть NO ACTION:
 *
 *   audit_events_organization_id_organizations_id_fk         audit_events → organizations
 *   audit_events_actor_user_id_users_id_fk                   audit_events → users
 *   clinical_audit_logs_organization_id_organizations_id_fk  clinical_audit_logs → organizations
 *   clinical_audit_logs_user_id_users_id_fk                  clinical_audit_logs → users
 *   clinical_audit_logs_patient_id_patients_id_fk            clinical_audit_logs → patients
 *
 * Значит неудаляемый журнал делает неудаляемыми не только организацию, но и
 * СОТРУДНИКОВ и ПАЦИЕНТОВ, о которых в журнале есть хоть одна запись: попытка
 * отвечает 23503. А записи там появляются сами — любой маршрут, что-то меняющий
 * в демо-клинике, оставляет след, и снимки панелей делаются именно через живые
 * маршруты.
 *
 * Поэтому рассмотрены и отклонены два очевидных выхода:
 *
 *   (а) просто убрать удаление журнала, остальное оставить как было. Не годится:
 *       второй запуск после первой же съёмки упирается в 23503 на организации,
 *       а если бы и не упёрся — `INSERT` той же организации дал бы 23505.
 *       Скрипт стал бы одноразовым, а он вызывается перед каждой съёмкой.
 *   (б) не удалять организацию, а заводить новую с уникальным идентификатором.
 *       Не годится по трём причинам: идентификатор `d0000000-…-d001` закреплён
 *       в `src/tests/support/fixtureOrganizations.test.ts:30` как настоящая
 *       организация, которую уборка фикстур обязана отвергать; каждая съёмка
 *       оставляла бы в базе НАВСЕГДА неудаляемую организацию с журналом, то
 *       есть неограниченно растущий мусор; и «удалить ровно то, что добавил»
 *       перестало бы существовать как свойство.
 *
 * ВЫБРАНО (в): арендатор демо-клиники становится ПОСТОЯННЫМ, а сидер —
 * идемпотентным по нему.
 *   • Журнал не трогается ВООБЩЕ. Обе его таблицы исключены из зачистки
 *     поимённо, с указанием причины; строки `db.delete(auditEvents)` больше нет.
 *   • `organizations`, `users`, `patients` — тоже не удаляются: это ровно те три
 *     таблицы, чьи строки журнал закрепляет ссылками NO ACTION. Их
 *     идентификаторы постоянны, поэтому вместо «удалить и вставить» они
 *     обновляются на месте (`ON CONFLICT (id) DO UPDATE`). Результат — тот же
 *     набор строк, но он не зависит от того, была съёмка до этого или нет.
 *   • Остальные данные демо-клиники (расписание, приёмы, позиции лечения,
 *     платежи, прайс, сообщения, рассылки) чистятся и создаются заново.
 *   • `--clean` поэтому означает «вычистить данные демо-клиники», а не «снести
 *     организацию»: снести её теперь нельзя в принципе, и притворяться, что
 *     можно, — значит печатать успех, которого не было.
 *
 * Это ровно тот путь, который называет сама 0161 в разделе «ЧТО СЛОМАЕТСЯ»:
 * организация живёт дальше вместо удаления. Миграция при этом не ослаблена ни
 * на один бит.
 *
 * ============================================================================
 * МЕХАНИЗМ ДОСТУПА: app.current_tenant, А НЕ app.superuser_bypass
 * ============================================================================
 *
 * Тот же выбор и по тем же доводам, что в migrateStateToDb.ts и seedAuth.ts:
 * дизъюнкт обхода есть в USING, но в WITH CHECK его нет ни у одной таблицы,
 * кроме `organizations`, поэтому под обходом вставки в `users`/`patients`
 * отвечают 42501. Но решает не проходимость, а ОБЛАСТЬ РАЗРУШЕНИЯ: под
 * контекстом арендатора `DELETE` физически не видит чужих строк, каким бы ни
 * было условие в `WHERE`. Здесь зачистка идёт по КАТАЛОГУ базы, то есть по
 * списку таблиц, которого автор не контролирует, — и это единственная причина,
 * по которой такой список вообще допустим.
 *
 * ВСЁ ИДЁТ ОДНОЙ ТРАНЗАКЦИЕЙ, потому что `set_config(..., is_local => true)`
 * обязан жить на том же соединении, что и запросы (с пулом иначе настройка
 * уедет на другое соединение — см. заголовок db/rls.ts). Отсюда точки
 * сохранения в зачистке: в одной транзакции любая ошибка обрывает ВСЮ работу,
 * а зачистке по каталогу отказ отдельной таблицы нужен как рабочий случай.
 *
 * СТРОГИЙ stdout. В stdout уходит РОВНО ОДНА строка — JSON с токенами; её
 * перенаправляют в `.ops-shot-tokens.json` (см. scripts/ops-panels-shots.mjs).
 * Любая проза в stdout делает файл нечитаемым, поэтому весь ход работы, включая
 * измеренные числа, печатается в stderr.
 */

import { sql } from "drizzle-orm";
import { pool } from "../db/client.js";
import { communicationCampaigns } from "../db/communicationsSchema.js";
import { type TenantDb, withTenantCtx } from "../db/rls.js";
import {
	appointments,
	chairs,
	clinics,
	communicationOutbox,
	communicationTemplates,
	organizations,
	patients,
	payments,
	serviceCatalogItems,
	treatmentItems,
	users,
	visits
} from "../db/schema.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";

const ORG_ID = "d0000000-0000-4000-8000-00000000d001";
const ORG_NAME = "Демо-клиника для снимков";
const CLINIC_ID = "d0000000-0000-4000-8000-00000000d002";
const CHAIR_A = "d0000000-0000-4000-8000-00000000d003";
const CHAIR_B = "d0000000-0000-4000-8000-00000000d004";
const DOCTOR_A = "d0000000-0000-4000-8000-00000000d005";
const DOCTOR_B = "d0000000-0000-4000-8000-00000000d006";
const ADMIN_USER = "d0000000-0000-4000-8000-00000000d007";

/**
 * Имя и значение переменной, разрешающей разрушительную зачистку. Литерал тот
 * же, что у migrateStateToDb.ts, и это осознанно: действие ОДНО И ТО ЖЕ —
 * стереть данные одного арендатора, — меняется только арендатор. Заводить под
 * него третий литерал значило бы просить у оператора отдельное разрешение на то
 * же самое разрушение, а разрешение, которое требуют дважды под разными
 * именами, перестают читать.
 */
const DESTRUCTIVE_RESET_ENV_NAME = "DENTAL_ALLOW_DESTRUCTIVE_DB_RESET";
const DESTRUCTIVE_RESET_ENV_VALUE = "YES";

/**
 * Журнал аудита. Не чистится и не может быть очищен: миграция 0161 отозвала
 * права `UPDATE, DELETE, TRUNCATE` и повесила триггеры `ENABLE ALWAYS`.
 * Перечислен здесь явно, чтобы зачистка по каталогу не билась о него каждым
 * проходом и не выдавала его в «не удалось очистить» как поломку — это не
 * поломка, а требуемое поведение.
 */
const AUDIT_JOURNAL_TABLES = new Set(["audit_events", "clinical_audit_logs"]);

/**
 * Таблицы арендатора, чьи строки журнал закрепляет ссылками NO ACTION
 * (`organizations` исключена из выборки каталога отдельно, по своей колонке).
 * Их строки живут постоянно и обновляются на месте по первичному ключу.
 */
const PINNED_BY_JOURNAL_TABLES = new Set(["users", "patients"]);

/** Больше проходов не нужно: цепочки ссылок в схеме короче. */
const MAX_SWEEP_PASSES = 8;

/** Имя таблицы из каталога подставляется в SQL только после этой проверки. */
const SAFE_TABLE_NAME = /^[a-z_][a-z0-9_]*$/;

/** Фамилии вымышленные: в снимках не должно быть настоящих пациентов. */
const PATIENT_NAMES = [
	"Орлова Марина Петровна",
	"Ковалёв Сергей Иванович",
	"Белкина Анна Дмитриевна",
	"Тихонов Артём Олегович",
	"Савельева Ольга Игоревна",
	"Громов Илья Андреевич",
	"Юдина Екатерина Львовна",
	"Панфилов Роман Викторович"
];

/** Пациенты под список возврата: сроки с последнего приёма разные намеренно. */
const RECALL_DUE = "d0000000-0000-4000-8000-0000000009b1";
const RECALL_OVERDUE = "d0000000-0000-4000-8000-0000000009b2";
const RECALL_LOST = "d0000000-0000-4000-8000-0000000009b3";
const RECALL_NEVER = "d0000000-0000-4000-8000-0000000009b4";

/**
 * Отказ по защите. Отдельный класс нужен, чтобы верхний уровень напечатал
 * объяснение вместо стека вызовов: стек здесь не несёт информации.
 */
class SeedRefusedError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "SeedRefusedError";
	}
}

function patientId(index: number): string {
	return `d0000000-0000-4000-8000-0000000${String(100 + index).padStart(5, "0")}`;
}

function appointmentId(index: number): string {
	return `d0000000-0000-4000-8000-0000000${String(200 + index).padStart(5, "0")}`;
}

/**
 * `NODE_ENV=production` распознаётся здесь как ЗАПРЕТ, а не как разрешение,
 * поэтому обычная ловушка с незаданным NODE_ENV (пустое окружение — типовое
 * состояние боевой установки) ничего лишнего не открывает: основную защиту
 * несёт подсчёт строк ниже, он от NODE_ENV не зависит.
 */
function productionModeActive(): boolean {
	return process.env.NODE_ENV?.trim().toLowerCase() === "production";
}

function destructiveResetAuthorized(): boolean {
	return process.env[DESTRUCTIVE_RESET_ENV_NAME] === DESTRUCTIVE_RESET_ENV_VALUE;
}

/**
 * Выполняет шаг под точкой сохранения и возвращает ошибку вместо того, чтобы
 * её бросить.
 *
 * ЗАЧЕМ. Зачистка по каталогу устроена как повторные проходы: строка не
 * удалится, пока жива ссылающаяся на неё, и таблица, отказавшая на первом
 * проходе, обязана быть повторена на следующем. Вне транзакции это работало
 * само собой — каждый оператор был отдельной транзакцией. Внутри одной
 * транзакции ПЕРВЫЙ ЖЕ отказ переводит её в состояние, где любой следующий
 * оператор отвечает 25P02, то есть прежний `try/catch` тихо превратился бы в
 * «все таблицы заблокированы» с потерей всей работы. Точка сохранения
 * откатывает ровно неудавшийся оператор.
 */
async function runInSavepoint(tx: TenantDb, run: () => Promise<void>): Promise<Error | null> {
	await tx.execute(sql`SAVEPOINT sweep_step`);
	try {
		await run();
		await tx.execute(sql`RELEASE SAVEPOINT sweep_step`);
		return null;
	} catch (error) {
		await tx.execute(sql`ROLLBACK TO SAVEPOINT sweep_step`);
		await tx.execute(sql`RELEASE SAVEPOINT sweep_step`);
		return error instanceof Error ? error : new Error(String(error));
	}
}

/**
 * Таблицы арендатора, которые зачистка имеет право трогать, — по каталогу базы,
 * а не по списку в коде.
 *
 * ЗАЧЕМ КАТАЛОГ. Поимённый список ломается каждый раз, когда в системе
 * появляется новая таблица со ссылкой на организацию: пересев падает с
 * «violates foreign key constraint», и снимки перестают сниматься вовсе. За
 * сутки это случилось трижды — решения по дублям, журнал действий, лист
 * ожидания. Каталог отстать не может.
 *
 * Прежде здесь рядом с зачисткой стоял ещё и поимённый список из четырнадцати
 * `db.delete(...)`. Он удалён: все четырнадцать таблиц отбирались по колонке
 * `organization_id`, то есть целиком входили в эту же выборку, и единственным
 * его собственным содержимым была строка удаления журнала аудита, которую
 * теперь запрещает база.
 */
async function sweepableTables(tx: TenantDb): Promise<string[]> {
	const catalog = await tx.execute<{ table_name: string }>(sql`
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
	return catalog.rows
		.map((row) => row.table_name)
		.filter(
			(name) =>
				SAFE_TABLE_NAME.test(name) &&
				!AUDIT_JOURNAL_TABLES.has(name) &&
				!PINNED_BY_JOURNAL_TABLES.has(name)
		);
}

/**
 * Считает строки арендатора в перечисленных таблицах. Запрос идёт внутри той же
 * транзакции, где уже выставлен `app.current_tenant`, поэтому счёт всегда
 * относится только к демо-клинике; условие по колонке оставлено для той
 * единственной таблицы из 148, на которой RLS не включён.
 */
async function countTenantRows(
	tx: TenantDb,
	tables: readonly string[]
): Promise<{ total: number; byTable: string[] }> {
	let total = 0;
	const byTable: string[] = [];
	for (const table of tables) {
		const counted = await tx.execute<{ found: number }>(
			sql`SELECT count(*)::int AS found FROM ${sql.identifier(table)} WHERE organization_id = ${ORG_ID}`
		);
		const found = counted.rows[0]?.found ?? 0;
		if (found > 0) {
			byTable.push(`${table}: ${found}`);
			total += found;
		}
	}
	return { total, byTable };
}

/**
 * Чистит данные демо-клиники под её же контекстом арендатора.
 *
 * ЗАЩИТА СОРАЗМЕРНА РАЗРУШЕНИЮ, как в migrateStateToDb.ts:
 *   • у арендатора нет ни одной строки — удалять нечего, разворачивание на
 *     чистой машине идёт без единой дополнительной переменной;
 *   • строки есть — требуется явное `DENTAL_ALLOW_DESTRUCTIVE_DB_RESET=YES`;
 *   • `NODE_ENV=production` — отказ безусловный, с флагом и без.
 * Количество строк печатается ДО принятия решения, поэтому масштаб виден из
 * вывода команды, а не из чтения исходников.
 *
 * Возвращает число фактически удалённых строк — не «дошли до конца», а
 * измеренное `rowCount` по каждому оператору.
 */
async function clearTenantData(tx: TenantDb): Promise<number> {
	const tables = await sweepableTables(tx);
	const { total, byTable } = await countTenantRows(tx, tables);

	if (total === 0) {
		console.error(`Очистка: у демо-клиники ${ORG_ID} нет ни одной строки — удалять нечего.`);
		return 0;
	}

	console.error(`Очистка затронет ${total} строк демо-клиники ${ORG_ID}:`);
	for (const line of byTable) console.error(`   ${line}`);

	if (productionModeActive()) {
		throw new SeedRefusedError(
			[
				`ОТКАЗ: NODE_ENV=production, а база содержит ${total} строк демонстрационной клиники.`,
				"Демонстрационные данные не сеются в боевую базу ни при каких флагах."
			].join("\n")
		);
	}

	if (!destructiveResetAuthorized()) {
		throw new SeedRefusedError(
			[
				`ОТКАЗ: зачистка удалила бы ${total} существующих строк демо-клиники ${ORG_ID}.`,
				`Чтобы разрешить это осознанно, задайте ${DESTRUCTIVE_RESET_ENV_NAME}="${DESTRUCTIVE_RESET_ENV_VALUE}".`,
				"Ничего не удалено, транзакция откачена."
			].join("\n")
		);
	}

	console.error(
		`Разрешено переменной ${DESTRUCTIVE_RESET_ENV_NAME}=${DESTRUCTIVE_RESET_ENV_VALUE}. Удаляю...`
	);

	let removed = 0;
	let remaining = tables;
	let lastFailure: Error | null = null;
	for (let pass = 0; pass < MAX_SWEEP_PASSES && remaining.length > 0; pass += 1) {
		const blocked: string[] = [];
		for (const table of remaining) {
			const failure = await runInSavepoint(tx, async () => {
				const deleted = await tx.execute(
					sql`DELETE FROM ${sql.identifier(table)} WHERE organization_id = ${ORG_ID}`
				);
				removed += deleted.rowCount ?? 0;
			});
			if (failure) {
				// Мешает ссылка из ещё не очищенной таблицы — вернёмся следующим
				// проходом. Причина сохраняется: молча проглоченная ошибка выглядит
				// потом как «мешает внешний ключ», хотя запрос может быть неверным.
				lastFailure = failure;
				blocked.push(table);
			}
		}
		if (blocked.length === remaining.length) break;
		remaining = blocked;
	}

	if (remaining.length > 0) {
		throw new SeedRefusedError(
			[
				`ОТКАЗ: не удалось очистить таблицы ${remaining.join(", ")}.`,
				`Последняя ошибка базы: ${lastFailure?.message ?? "(нет)"}`,
				"Остаток не замалчивается: следующая вставка получила бы 23505 на тех же",
				"строках, и причина выглядела бы как поломка сева. Транзакция откачена."
			].join("\n")
		);
	}

	console.error(`Очистка завершена: удалено ${removed} строк из ${tables.length} таблиц.`);
	return removed;
}

/**
 * Создаёт или обновляет постоянные строки арендатора — организацию, кабинет,
 * кресла, сотрудников и карточки пациентов.
 *
 * ПОЧЕМУ ОБНОВЛЕНИЕ, А НЕ «УДАЛИТЬ И ВСТАВИТЬ». Организацию, сотрудников и
 * пациентов закрепляет журнал аудита ссылками NO ACTION (см. заголовок файла):
 * после первой же съёмки их удаление отвечает 23503. Кабинет и кресла журнал не
 * закрепляет, но их идентификаторы такие же постоянные, и обновление на месте
 * избавляет от зависимости от порядка удаления.
 *
 * Значения обновляемых колонок берутся из `excluded`, то есть из той же строки,
 * что подавалась на вставку. Второго списка литералов не заводится — именно
 * расхождение двух списков уже стоило этому файлу потерянных копеек в прайсе.
 */
async function upsertTenantIdentity(tx: TenantDb): Promise<void> {
	const organization = await tx
		.insert(organizations)
		.values({ id: ORG_ID, name: ORG_NAME })
		.onConflictDoUpdate({ target: organizations.id, set: { name: sql`excluded."name"` } })
		.returning({ id: organizations.id });
	console.error(`Организация: ${organization.length} строк (${ORG_NAME})`);

	const clinic = await tx
		.insert(clinics)
		.values({
			id: CLINIC_ID,
			organizationId: ORG_ID,
			name: "Клиника на Ленина",
			phone: "+7 495 120-30-40",
			timezone: "Europe/Moscow"
		})
		.onConflictDoUpdate({
			target: clinics.id,
			set: {
				name: sql`excluded."name"`,
				phone: sql`excluded."phone"`,
				timezone: sql`excluded."timezone"`
			}
		})
		.returning({ id: clinics.id });
	console.error(`Кабинет: ${clinic.length} строк`);

	const chairRows = await tx
		.insert(chairs)
		.values([
			{ id: CHAIR_A, organizationId: ORG_ID, clinicId: CLINIC_ID, name: "Кресло 1" },
			{ id: CHAIR_B, organizationId: ORG_ID, clinicId: CLINIC_ID, name: "Кресло 2" }
		])
		.onConflictDoUpdate({
			target: chairs.id,
			set: { name: sql`excluded."name"`, clinicId: sql`excluded."clinic_id"` }
		})
		.returning({ id: chairs.id });
	console.error(`Кресла: ${chairRows.length} строк`);

	const staffRows = await tx
		.insert(users)
		.values([
			{ id: DOCTOR_A, organizationId: ORG_ID, fullName: "Смирнова Елена Владимировна", role: "doctor" },
			{ id: DOCTOR_B, organizationId: ORG_ID, fullName: "Гаврилов Никита Сергеевич", role: "doctor" },
			{ id: ADMIN_USER, organizationId: ORG_ID, fullName: "Администратор клиники", role: "administrator" }
		])
		.onConflictDoUpdate({
			target: users.id,
			set: { fullName: sql`excluded."full_name"`, role: sql`excluded."role"` }
		})
		.returning({ id: users.id });
	console.error(`Сотрудники: ${staffRows.length} строк`);

	// Намеренные дубли: настоящий (то же имя и дата рождения) и мнимый
	// (родственники на одном номере). Нужны, чтобы разбор дублей на снимке
	// показывал и уверенную пару, и пару с предупреждением.
	const DUPLICATE_REAL = "d0000000-0000-4000-8000-0000000009a1";
	const DUPLICATE_KIN = "d0000000-0000-4000-8000-0000000009a2";

	const patientRows = await tx
		.insert(patients)
		.values([
			{
				id: DUPLICATE_REAL,
				organizationId: ORG_ID,
				// Имя в другом регистре и с двойным пробелом, дата рождения та же, что
				// у первого пациента списка: это уверенный дубль.
				fullName: "орлова  марина петровна",
				birthDate: "1970-01-10",
				phone: "+7 916 200-10-20",
				email: null
			},
			{
				id: DUPLICATE_KIN,
				organizationId: ORG_ID,
				fullName: "Орлов Кирилл Сергеевич",
				birthDate: null,
				phone: "+7 916 200-10-20",
				email: null
			},
			/*
			 * Пациенты, которых пора звать обратно. Нужны, чтобы список возврата было
			 * на чём проверить: у остальных демонстрационных пациентов приёмы свежие,
			 * и список выходил пустым — а пустой список не показывает ни полос, ни
			 * сортировки, ни того, как выглядит «скорее всего ушёл».
			 */
			{
				id: RECALL_DUE,
				organizationId: ORG_ID,
				fullName: "Зорина Татьяна Львовна",
				birthDate: "1985-03-14",
				phone: "+7 916 300-10-31",
				email: "zorina@example.ru"
			},
			{
				id: RECALL_OVERDUE,
				organizationId: ORG_ID,
				fullName: "Лапин Егор Дмитриевич",
				birthDate: "1978-11-02",
				phone: "+7 916 300-10-32",
				email: null
			},
			{
				id: RECALL_LOST,
				organizationId: ORG_ID,
				fullName: "Ветрова Ирина Павловна",
				birthDate: "1966-07-21",
				phone: "+7 916 300-10-33",
				email: null
			},
			{
				id: RECALL_NEVER,
				organizationId: ORG_ID,
				fullName: "Сомов Артур Вадимович",
				birthDate: "1992-05-05",
				phone: "+7 916 300-10-34",
				email: null
			},
			...PATIENT_NAMES.map((fullName, index) => ({
				id: patientId(index),
				organizationId: ORG_ID,
				fullName,
				// У одного пациента телефона нет намеренно: панель обзвона обязана
				// показать это отдельно.
				phone:
					index === 5
						? null
						: `+7 916 ${String(200 + index).padStart(3, "0")}-10-${String(20 + index).padStart(2, "0")}`,
				email: index % 3 === 0 ? `patient${index}@example.ru` : null,
				birthDate: `19${70 + index}-0${(index % 9) + 1}-1${index % 9}`
			}))
		])
		.onConflictDoUpdate({
			target: patients.id,
			set: {
				fullName: sql`excluded."full_name"`,
				birthDate: sql`excluded."birth_date"`,
				phone: sql`excluded."phone"`,
				email: sql`excluded."email"`
			}
		})
		.returning({ id: patients.id });
	console.error(`Пациенты: ${patientRows.length} строк`);
}

/**
 * Наполняет демо-клинику операционными данными. Всё, что здесь создаётся, перед
 * этим было удалено зачисткой, поэтому вставка обычная, без разрешения
 * конфликтов: если строка всё-таки уцелела, база обязана ответить 23505, а не
 * тихо обновить чужой ряд.
 */
async function seedOperationalData(tx: TenantDb): Promise<void> {
	const now = new Date();
	const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
	tomorrow.setHours(9, 0, 0, 0);

	const monthsAgo = (months: number): Date => {
		const date = new Date(now.getTime());
		date.setMonth(date.getMonth() - months);
		return date;
	};

	const recallAppointments = await tx
		.insert(appointments)
		.values([
			// Восемь месяцев назад — пора на профилактику.
			{
				id: "d0000000-0000-4000-8000-0000000009c1",
				organizationId: ORG_ID,
				patientId: RECALL_DUE,
				doctorUserId: DOCTOR_A,
				chairId: CHAIR_A,
				status: "completed" as const,
				startsAt: monthsAgo(8),
				endsAt: new Date(monthsAgo(8).getTime() + 60 * 60_000)
			},
			// Четырнадцать месяцев — пропущен осмотр.
			{
				id: "d0000000-0000-4000-8000-0000000009c2",
				organizationId: ORG_ID,
				patientId: RECALL_OVERDUE,
				doctorUserId: DOCTOR_B,
				chairId: CHAIR_B,
				status: "completed" as const,
				startsAt: monthsAgo(14),
				endsAt: new Date(monthsAgo(14).getTime() + 60 * 60_000)
			},
			// Тридцать месяцев — скорее всего лечится в другом месте.
			{
				id: "d0000000-0000-4000-8000-0000000009c3",
				organizationId: ORG_ID,
				patientId: RECALL_LOST,
				doctorUserId: DOCTOR_A,
				chairId: CHAIR_A,
				status: "completed" as const,
				startsAt: monthsAgo(30),
				endsAt: new Date(monthsAgo(30).getTime() + 60 * 60_000)
			},
			// Записывался дважды и оба раза не пришёл: завершённых приёмов нет вовсе.
			{
				id: "d0000000-0000-4000-8000-0000000009c4",
				organizationId: ORG_ID,
				patientId: RECALL_NEVER,
				doctorUserId: DOCTOR_B,
				chairId: CHAIR_B,
				status: "no_show" as const,
				startsAt: monthsAgo(3),
				endsAt: new Date(monthsAgo(3).getTime() + 60 * 60_000)
			},
			{
				id: "d0000000-0000-4000-8000-0000000009c5",
				organizationId: ORG_ID,
				patientId: RECALL_NEVER,
				doctorUserId: DOCTOR_B,
				chairId: CHAIR_B,
				status: "cancelled" as const,
				startsAt: monthsAgo(2),
				endsAt: new Date(monthsAgo(2).getTime() + 60 * 60_000)
			}
		])
		.returning({ id: appointments.id });

	// Завтрашние приёмы под список обзвона: подтверждённые, ожидающие и отменённый.
	const statuses = [
		"confirmed",
		"planned",
		"planned",
		"planned",
		"confirmed",
		"planned",
		"cancelled",
		"planned"
	] as const;
	const tomorrowAppointments = await tx
		.insert(appointments)
		.values(
			PATIENT_NAMES.map((_unused, index) => ({
				id: appointmentId(index),
				organizationId: ORG_ID,
				patientId: patientId(index),
				doctorUserId: index % 2 === 0 ? DOCTOR_A : DOCTOR_B,
				chairId: index % 2 === 0 ? CHAIR_A : CHAIR_B,
				status: statuses[index] ?? "planned",
				startsAt: new Date(tomorrow.getTime() + index * 45 * 60_000),
				endsAt: new Date(tomorrow.getTime() + index * 45 * 60_000 + 40 * 60_000)
			}))
		)
		.returning({ id: appointments.id });

	// Прошедшие приёмы этого месяца — под отчёты.
	const pastBase = new Date(now.getFullYear(), now.getMonth(), 2, 10, 0, 0);
	const pastAppointments = Array.from({ length: 14 }, (_unused, index) => ({
		id: `d0000000-0000-4000-8000-0000000${String(300 + index).padStart(5, "0")}`,
		organizationId: ORG_ID,
		patientId: patientId(index % PATIENT_NAMES.length),
		doctorUserId: index % 3 === 0 ? DOCTOR_B : DOCTOR_A,
		chairId: index % 2 === 0 ? CHAIR_A : CHAIR_B,
		status: (index % 7 === 0 ? "no_show" : index % 5 === 0 ? "cancelled" : "completed") as
			| "no_show"
			| "cancelled"
			| "completed",
		startsAt: new Date(pastBase.getTime() + index * 26 * 60 * 60_000),
		endsAt: new Date(pastBase.getTime() + index * 26 * 60 * 60_000 + 60 * 60_000)
	}));
	const pastRows = await tx.insert(appointments).values(pastAppointments).returning({ id: appointments.id });
	console.error(
		`Приёмы: ${recallAppointments.length + tomorrowAppointments.length + pastRows.length} строк ` +
			`(возврат ${recallAppointments.length}, завтра ${tomorrowAppointments.length}, прошедшие ${pastRows.length})`
	);

	/*
	 * ПРАЙС КЛИНИКИ. Без него демонстрационная клиника не может ни договор
	 * посчитать, ни счёт, ни справку для налогового вычета — сервер прямо об этом
	 * предупреждает при каждой сборке сводки: «Прайс-лист пуст: в справочнике
	 * услуг клиники нет ни одной позиции».
	 *
	 * Цены с копейками намеренно: рубли с копейками — это тот случай, где
	 * сложение в плавающей точке уже отклоняло верные квитанции, и цепочке денег
	 * нужен материал, на котором копейка видна.
	 */
	const catalog = [
		{ code: "T01", title: "Лечение кариеса", category: "therapy" as const, specialty: "therapist" as const, price: 7200.5, minutes: 60 },
		{ code: "H01", title: "Профессиональная гигиена", category: "hygiene" as const, specialty: "hygienist" as const, price: 5400, minutes: 45 },
		{ code: "T02", title: "Лечение пульпита", category: "therapy" as const, specialty: "therapist" as const, price: 14800.99, minutes: 90 },
		{ code: "P01", title: "Установка коронки", category: "prosthetics" as const, specialty: "orthopedist" as const, price: 26500, minutes: 60 },
		{ code: "C01", title: "Консультация", category: "consultation" as const, specialty: "universal" as const, price: 1500.5, minutes: 30 }
	];
	const catalogIds = new Map<string, string>();
	/*
	 * ЦЕНА ПОЗИЦИИ БЕРЁТСЯ ИЗ ПРАЙСА, А НЕ ИЗ ВТОРОГО МАССИВА.
	 *
	 * Прежде ниже стоял второй список цен — `[7200, 5400, 14800, 26500]`,
	 * круглый, — и позиции лечения с платежами заполнялись ИЗ НЕГО, тогда как
	 * прайс рядом объявляет `7200.5` и `14800.99`. Замер на живой демо-клинике: в
	 * прайсе `7200.50` и `14800.99`, в позициях `7200.00` и `14800.00`. Потеря
	 * 3,48 ₽ прямо в демо-данных при пяти позициях.
	 *
	 * Беда не в трёх рублях, а в том, ЧТО ЭТО ЗА ДАННЫЕ. Комментарий выше прямо
	 * говорит: «цепочке денег нужен материал, на котором копейка видна». Второй
	 * массив стирал копейки ровно там, где они должны быть видны, — и снимки
	 * визуального гейта, и сквозные денежные сценарии сверяли круглые числа.
	 *
	 * Теперь источник один: цена приходит из того же прайса, на который позиция
	 * ссылается через `service_id`.
	 */
	const catalogPrices = new Map<string, number>();
	let catalogRows = 0;
	for (const [index, service] of catalog.entries()) {
		const id = `d0000000-0000-4000-8000-0000000${String(600 + index).padStart(5, "0")}`;
		catalogIds.set(service.title, id);
		catalogPrices.set(service.title, service.price);
		const inserted = await tx
			.insert(serviceCatalogItems)
			.values({
				id,
				organizationId: ORG_ID,
				code: service.code,
				title: service.title,
				category: service.category,
				specialty: service.specialty,
				basePriceRub: service.price,
				priceRub: service.price,
				durationMinutes: service.minutes,
				taxDeductible: true
			})
			.returning({ id: serviceCatalogItems.id });
		catalogRows += inserted.length;
	}
	console.error(`Прайс: ${catalogRows} строк`);

	// Визиты, позиции лечения и платежи — чтобы в отчётах были деньги и долг.
	const completed = pastAppointments.filter((appointment) => appointment.status === "completed");
	let visitRows = 0;
	let itemRows = 0;
	let paymentRows = 0;
	for (const [index, appointment] of completed.entries()) {
		const visitId = `d0000000-0000-4000-8000-0000000${String(400 + index).padStart(5, "0")}`;
		const visitInserted = await tx
			.insert(visits)
			.values({
				id: visitId,
				organizationId: ORG_ID,
				patientId: appointment.patientId,
				appointmentId: appointment.id,
				status: "signed",
				createdAt: appointment.startsAt
			})
			.returning({ id: visits.id });
		visitRows += visitInserted.length;

		const itemTitle =
			["Лечение кариеса", "Профессиональная гигиена", "Лечение пульпита", "Установка коронки"][index % 4] ??
			"Приём";
		/*
		 * Позиции без цены в прайсе быть не может: `itemTitle` берётся из того же
		 * списка заголовков, что и прайс. Если списки разойдутся, посев обязан
		 * упасть с внятной причиной, а не тихо подставить запасное число — тихая
		 * подстановка и была исходным дефектом.
		 */
		const itemPriceRub = catalogPrices.get(itemTitle);
		if (itemPriceRub === undefined) {
			throw new SeedRefusedError(
				`Посев демо-данных остановлен: позиции «${itemTitle}» нет в прайсе этой же сеялки. ` +
					"Список заголовков позиций и список прайса разошлись — добавьте услугу в прайс, " +
					"иначе позиция получит цену, не совпадающую с прайсом, и копейки в демо снова исчезнут."
			);
		}
		const itemInserted = await tx
			.insert(treatmentItems)
			.values({
				organizationId: ORG_ID,
				patientId: appointment.patientId,
				visitId,
				// Ссылка на прайс, а не только название: без неё позиция лечения
				// «висит в воздухе», правила списания материалов её не находят, а
				// изменение цены в прайсе не связано с уже назначенным лечением.
				serviceId: catalogIds.get(itemTitle) ?? null,
				title: itemTitle,
				quantity: "1",
				priceRub: itemPriceRub,
				unitPriceRub: itemPriceRub,
				discountRub: index % 5 === 0 ? 800 : 0,
				status: "completed"
			})
			.returning({ id: treatmentItems.id });
		itemRows += itemInserted.length;

		// Часть приёмов оплачена не полностью — иначе дебиторка будет пустой.
		if (index % 4 !== 3) {
			const paymentInserted = await tx
				.insert(payments)
				.values({
					organizationId: ORG_ID,
					patientId: appointment.patientId,
					visitId,
					amountRub: itemPriceRub,
					status: "paid",
					paidAt: appointment.startsAt
				})
				.returning({ id: payments.id });
			paymentRows += paymentInserted.length;
		}
	}
	console.error(`Приёмы врача: ${visitRows} строк, позиции лечения: ${itemRows}, платежи: ${paymentRows}`);

	// Шаблоны и очередь сообщений — под пульт отправки.
	const templateRows = await tx
		.insert(communicationTemplates)
		.values([
			{
				organizationId: ORG_ID,
				title: "Напоминание о приёме",
				channel: "sms",
				intent: "appointment_confirmation",
				audienceRole: "administrator",
				body: "{patient}, напоминаем: приём {date} в {time}, {clinic}. Подтвердить: {confirmLink}",
				variablesJson: JSON.stringify(["patient", "date", "time", "clinic", "confirmLink"]),
				isActive: true
			},
			{
				organizationId: ORG_ID,
				title: "Приглашение на профилактический осмотр",
				channel: "sms",
				intent: "recall",
				audienceRole: "administrator",
				body: "{patient}, приглашаем на профилактический осмотр. {clinic}",
				variablesJson: JSON.stringify(["patient", "clinic"]),
				isActive: true
			},
			{
				organizationId: ORG_ID,
				title: "Справка для налогового вычета готова",
				channel: "email",
				intent: "document_ready",
				audienceRole: "administrator",
				body: "{patient}, справка готова. Заберите её в клинике или скачайте в портале: {link}",
				variablesJson: JSON.stringify(["patient", "link"]),
				isActive: false
			}
		])
		.returning({ id: communicationTemplates.id });
	/*
	 * Идентификатор шаблона обязателен для очереди и рассылки. Прежде он брался
	 * как `reminderTemplate?.id ?? null`: при пустом ответе базы очередь молча
	 * уходила без шаблона, и панель показывала сообщения, не привязанные ни к
	 * чему. Пустой ответ здесь означает, что вставка не состоялась, — это отказ.
	 */
	const reminderTemplateId = templateRows[0]?.id;
	if (reminderTemplateId === undefined) {
		throw new SeedRefusedError(
			"Посев остановлен: вставка шаблонов сообщений вернула 0 строк, привязать очередь не к чему."
		);
	}
	console.error(`Шаблоны сообщений: ${templateRows.length} строк`);

	const outboxStates = [
		{ status: "delivered" as const, error: null, detail: "SMS.RU 103: Доставлено" },
		{ status: "sent" as const, error: null, detail: null },
		{ status: "failed" as const, error: "Не доставлено: истёк срок жизни сообщения", detail: "SMS.RU 104" },
		{ status: "queued" as const, error: null, detail: null },
		{
			status: "suppressed" as const,
			error: "SMS-шлюз не настроен: нет ключей доступа в окружении сервера.",
			detail: null
		},
		{ status: "delivered" as const, error: null, detail: "SMS.RU 110: Прочитано" }
	];
	const outboxRows = await tx
		.insert(communicationOutbox)
		.values(
			outboxStates.map((state, index) => ({
				organizationId: ORG_ID,
				patientId: patientId(index),
				templateId: reminderTemplateId,
				channel: (index % 3 === 2 ? "email" : "sms") as "sms" | "email",
				intent: "appointment_confirmation" as const,
				recipientAddress: index % 3 === 2 ? `patient${index}@example.ru` : `7916${String(200 + index)}1020`,
				body: `${PATIENT_NAMES[index]?.split(" ")[1] ?? "Пациент"}, напоминаем: приём завтра в ${9 + index}:00, Клиника на Ленина.`,
				status: state.status,
				attempts: state.status === "failed" ? 3 : state.status === "queued" ? 0 : 1,
				sentAt:
					state.status === "delivered" || state.status === "sent"
						? new Date(now.getTime() - index * 3_600_000)
						: null,
				deliveredAt: state.status === "delivered" ? new Date(now.getTime() - index * 3_500_000) : null,
				lastErrorMessage: state.error,
				receiptDetail: state.detail,
				dedupeKey: `reminder:${appointmentId(index)}:24`
			}))
		)
		.returning({ id: communicationOutbox.id });
	console.error(`Очередь сообщений: ${outboxRows.length} строк`);

	// Рассылка в состоянии «выполняется» — чтобы панель кампаний не была пустой.
	const campaignRows = await tx
		.insert(communicationCampaigns)
		.values({
			organizationId: ORG_ID,
			title: "Осмотр для тех, кто давно не был",
			templateId: reminderTemplateId,
			channel: "sms",
			scope: "marketing",
			status: "running",
			audienceJson: JSON.stringify({ status: "active", hasFutureAppointment: false }),
			audienceSnapshotJson: JSON.stringify({
				takenAt: now.toISOString(),
				criteria: ["активные пациенты", "нет будущей записи"],
				matched: 6,
				deliverable: 2,
				excluded: { no_contact: 1, no_consent: 3, excluded_by_criteria: 0, status_mismatch: 0 },
				queued: 2,
				alreadyQueued: 0,
				skipped: 0
			}),
			launchedAt: new Date(now.getTime() - 2 * 3_600_000)
		})
		.returning({ id: communicationCampaigns.id });
	console.error(`Рассылки: ${campaignRows.length} строк`);
}

async function clean(): Promise<void> {
	const removed = await withTenantCtx(ORG_ID, (tx) => clearTenantData(tx));
	console.error("");
	console.error(`Данные демо-клиники вычищены: ${removed} строк.`);
	console.error(
		"Организация, её сотрудники и карточки пациентов оставлены намеренно: журнал аудита " +
			"закрепляет их ссылками NO ACTION, и удаление отвечает 23503 (миграция 0161)."
	);
}

async function seed(): Promise<void> {
	await withTenantCtx(ORG_ID, async (tx) => {
		await clearTenantData(tx);
		await upsertTenantIdentity(tx);
		await seedOperationalData(tx);
	});

	const clinicToken = signToken({ organizationId: ORG_ID, clinicName: ORG_NAME }, authTokenSecret(), 3600);
	const staffToken = signToken(
		{ userId: ADMIN_USER, fullName: "Администратор клиники", role: "administrator", organizationId: ORG_ID },
		authTokenSecret(),
		3600
	);

	// Единственная строка в stdout: её перенаправляют в .ops-shot-tokens.json.
	console.log(JSON.stringify({ organizationId: ORG_ID, clinicToken, staffToken }));
}

const shouldClean = process.argv.includes("--clean");
await (shouldClean ? clean() : seed())
	.then(async () => {
		await pool.end();
		process.exit(0);
	})
	.catch(async (error: unknown) => {
		if (error instanceof SeedRefusedError) {
			console.error("");
			console.error(error.message);
		} else {
			console.error("Ошибка посева демо-данных:", error);
		}
		await pool.end();
		process.exit(1);
	});
