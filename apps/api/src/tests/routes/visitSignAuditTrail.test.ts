/**
 * СТОРОЖ ЮРИДИЧЕСКОГО СЛЕДА ПОДПИСАНИЯ ПРИЁМА.
 *
 * ЧТО БЫЛО СЛОМАНО, И ЭТО ИЗМЕРЕНО, А НЕ ПРЕДПОЛОЖЕНО. Подписание приёма
 * закрывает дневник: после него из приёма растут документы и счёт, то есть это
 * юридически значимое действие. Путь БЕЗ базы событие в журнал писал
 * (apps/api/src/sampleData.ts, acceptVisitDraft → recordAuditEvent), а путь
 * ЧЕРЕЗ базу (apps/api/src/db/visitsQuery.ts, acceptVisitDraftInDb) — нет.
 * В боевой установке база настоящая, поэтому следа не оставалось вовсе:
 * на живой базе 2026-07-29 до правки было 1081 событие в `audit_events` и НОЛЬ
 * с `entity_type = 'visit'` при 10 подписанных приёмах. Кто и когда закрыл
 * дневник, восстановить было нечем. Тот же ноль независимо назван в
 * apps/api/src/routes/clinical.ts:313.
 *
 * ПОЧЕМУ ЧЕРЕЗ МАРШРУТ, А НЕ ВЫЗОВОМ ФУНКЦИИ. Прямой вызов
 * `acceptVisitDraftInDb` доказал бы только то, что функция умеет писать журнал,
 * но не то, что до неё доходит клиент: POST /api/visits/:id/draft/accept стоит
 * за гейтом клинических изменений и за подписанным токеном, и любой отказ на
 * этом пути оставит журнал пустым при «зелёной» функции. Fastify поднимается в
 * этом же процессе через `app.inject` — сервер разработки на 4100 отдаёт СТАРУЮ
 * сборку и доказательством служить не может.
 *
 * ВТОРОЕ, ЧТО ЗДЕСЬ ОХРАНЯЕТСЯ: ОТКАЗ ЖУРНАЛА НЕ РОНЯЕТ ПОДПИСАНИЕ. Приём
 * подписан — это факт клиники; невозможность записать журнал — беда
 * инфраструктуры. Терять первое из-за второго нельзя, но и молчать нельзя:
 * причина обязана попасть в лог сервера. Проверка подменяет писателя на
 * бросающего (`db.insert` для таблицы `audit_events`) и требует ответа 200,
 * подписанной строки в базе И строки в логе с причиной.
 *
 * ЖИВАЯ БАЗА, СВОЯ КЛИНИКА. Идентификаторы выведены из имени этого файла
 * (`fixtureUuid`), уборка идёт и на входе, и на выходе: прогон, убитый снаружи,
 * до `after` не доходит и оставил бы строки в живой базе. Данные других клиник
 * не читаются и не меняются.
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, describe, test } from "node:test";
import { sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db, pool } from "../../db/client.js";
import { auditEvents, organizations, patients, users, visits } from "../../db/schema.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const NAMESPACE = "visitSignAuditTrail";
const ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
const DOCTOR_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_ID = fixtureUuid(NAMESPACE, 3);
/** Приём для основной проверки: подписан, событие в журнале обязано появиться. */
const VISIT_JOURNAL_OK = fixtureUuid(NAMESPACE, 10);
/** Приём для проверки отказа журнала: подписан, события нет, причина в логе. */
const VISIT_JOURNAL_FAILS = fixtureUuid(NAMESPACE, 11);
/** Приём для проверки полезной нагрузки: конфликт ревизий и клиентская операция. */
const VISIT_JOURNAL_CONFLICT = fixtureUuid(NAMESPACE, 12);

/**
 * Форма записи, общая с путём без базы. Литералы здесь НАМЕРЕННО дословные, а не
 * импортированные из проверяемого модуля: сторож, сверяющий код с самим собой,
 * пройдёт и после переименования события, а журнал читают по этим двум строкам
 * (routes/audit.ts фильтрует entity_type и entity_id).
 */
const AUDIT_ENTITY_TYPE = "visit";
const AUDIT_ACTION = "visit_draft_accepted";

/** Текст подменённого отказа базы — по нему проверяется строка лога. */
const INJECTED_FAILURE = "audit_events недоступна: подмена писателя в проверке visitSignAuditTrail";

type AuditRow = {
	readonly id: string;
	readonly organization_id: string;
	readonly actor_user_id: string | null;
	readonly entity_type: string;
	readonly entity_id: string;
	readonly action: string;
	readonly reason: string | null;
	readonly age_seconds: number;
};

type VisitRow = {
	readonly status: string;
	readonly revision: number;
	readonly signed_at: string | null;
	readonly diagnosis: string | null;
};

/**
 * Независимый SQL: запрос написан руками ровно так, как журнал читает маршрут
 * аудита, и ни одного построителя проверяемого модуля не использует.
 */
async function auditRowsForVisit(visitId: string): Promise<AuditRow[]> {
	// Чтение журнала — под тенант-контекстом клиники: `audit_events` под
	// принудительным RLS, и запрос без `app.current_tenant` вернул бы НОЛЬ строк на
	// любом содержимом таблицы, то есть подтверждал бы и «событие есть», и «события
	// нет» одинаково — одной и той же пустотой.
	const result = await withFixtureTenant(ORGANIZATION_ID, async () =>
		db.execute<AuditRow>(sql`
			select id::text as id,
			       organization_id::text as organization_id,
			       actor_user_id::text as actor_user_id,
			       entity_type,
			       entity_id,
			       action,
			       reason,
			       extract(epoch from (now() - created_at))::float8 as age_seconds
			  from audit_events
			 where organization_id = ${ORGANIZATION_ID}::uuid
			   and entity_type = ${AUDIT_ENTITY_TYPE}
			   and entity_id = ${visitId}
			 order by created_at
		`),
	);
	return result.rows as AuditRow[];
}

async function visitRow(visitId: string): Promise<VisitRow> {
	const result = await withFixtureTenant(ORGANIZATION_ID, async () =>
		db.execute<VisitRow>(sql`
			select status::text as status,
			       revision,
			       signed_at::text as signed_at,
			       diagnosis
			  from visits
			 where id = ${visitId}::uuid and organization_id = ${ORGANIZATION_ID}::uuid
		`),
	);
	const row = (result.rows as VisitRow[])[0];
	assert.ok(row, `приём ${visitId} не найден в базе — сверять нечего`);
	return row;
}

function acceptPayload(options: { clientMutationId?: string; baseRevision?: number } = {}) {
	return {
		draft: {
			warnings: [],
			complaint: "Боль при накусывании, вторые сутки",
			anamnesis: "Ранее не лечен",
			objectiveStatus: "Зуб 36: глубокая кариозная полость",
			diagnosis: "K02.1 Кариес дентина",
			treatmentPlan: "Лечение кариеса 36, пломба",
		},
		doctorSummary: "Лечение кариеса 36 выполнено",
		clientMutationId: options.clientMutationId ?? null,
		baseRevision: options.baseRevision ?? null,
		clientSavedAt: null,
	};
}

describe("подписание приёма оставляет след в audit_events на пути через базу", () => {
	let app: FastifyInstance;
	let staffToken = "";
	const originalEnv = { ...process.env };

	async function seedDraftVisit(visitId: string): Promise<void> {
		await db.insert(visits).values({
			id: visitId,
			organizationId: ORGANIZATION_ID,
			patientId: PATIENT_ID,
			status: "draft",
			revision: 1,
		});
	}

	before(async () => {
		/*
		 * Гейт клинических изменений остаётся включённым по смыслу: он проходится
		 * штатным режимом разработки, а не отключением проверки. Секрет
		 * администратора снимается, потому что подставлять его в тест значило бы
		 * держать секрет в исходниках.
		 */
		process.env.NODE_ENV = "test";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		delete process.env.DENTE_CLINICAL_ADMIN_SECRET;

		// Уборка следов прерванного прогона ДО посева: см. докстринг фикстуры.
		await purgeFixtureOrganizations([ORGANIZATION_ID]);

		// Весь сев — под контекстом своей клиники: WITH CHECK тенант-таблиц требует
		// `organization_id = current_tenant`, поэтому без контекста первая же вставка
		// отвергается кодом 42501, а под обходом RLS — тоже, кроме `organizations`.
		await withFixtureTenant(ORGANIZATION_ID, async () => {
			await db
				.insert(organizations)
				.values({
					id: ORGANIZATION_ID,
					name: "Сторож журнала подписания приёма",
				})
				.onConflictDoNothing();
			await db.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORGANIZATION_ID,
				fullName: "Врач сторожа журнала",
				role: "doctor",
			});
			await db.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORGANIZATION_ID,
				fullName: "Пациент сторожа журнала",
				status: "active",
			});
			for (const visitId of [VISIT_JOURNAL_OK, VISIT_JOURNAL_FAILS, VISIT_JOURNAL_CONFLICT]) {
				await seedDraftVisit(visitId);
			}
		});

		staffToken = signToken(
			{ organizationId: ORGANIZATION_ID, userId: DOCTOR_ID, role: "doctor" },
			authTokenSecret(),
		);

		app = createTenantTestApp();
		await registerVisitRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		await purgeFixtureOrganizations([ORGANIZATION_ID]);
		// Счёт под контекстом клиники: под ним видны ровно её строки журнала, то
		// есть то самое множество, о котором утверждает проверка ниже.
		const leftovers = await withFixtureTenant(ORGANIZATION_ID, async () =>
			db.execute<{ n: number }>(sql`
				select count(*)::int as n from audit_events where organization_id = ${ORGANIZATION_ID}::uuid
			`),
		);
		assert.equal((leftovers.rows as { n: number }[])[0]?.n, 0, "сторож не убрал свои строки журнала");
		process.env = originalEnv;
		await pool.end();
	});

	test("после подписания через маршрут в журнале появляется ровно одно событие приёма", async () => {
		const before = await auditRowsForVisit(VISIT_JOURNAL_OK);
		assert.equal(before.length, 0, "до подписания события быть не должно — иначе сверка ничего не значит");

		const response = await app.inject({
			method: "POST",
			url: `/api/visits/${VISIT_JOURNAL_OK}/draft/accept`,
			headers: { "x-dente-clinic-token": staffToken, "x-dente-staff-token": staffToken },
			payload: acceptPayload(),
		});
		assert.equal(response.statusCode, 200, `маршрут не подписал приём: ${response.body}`);

		const signed = await visitRow(VISIT_JOURNAL_OK);
		assert.equal(signed.status, "signed");
		assert.equal(signed.revision, 2);
		assert.ok(signed.signed_at, "подписание обязано заполнить signed_at");

		const rows = await auditRowsForVisit(VISIT_JOURNAL_OK);
		assert.equal(
			rows.length,
			1,
			"после подписания приёма в audit_events нет ровно одной строки. Подписание закрывает дневник, " +
				"из него растут документы и счёт: без события в журнале восстановить, кто и когда закрыл " +
				"дневник, нечем. Путь БЕЗ базы это событие пишет (sampleData.ts, acceptVisitDraft), путь " +
				"через базу обязан писать его тоже — db/visitsQuery.ts, acceptVisitDraftInDb.",
		);
		const row = rows[0];
		assert.ok(row);
		assert.equal(row.entity_type, AUDIT_ENTITY_TYPE, "журнал читают по entity_type — он обязан быть 'visit'");
		assert.equal(row.action, AUDIT_ACTION, "имя действия обязано совпадать с путём без базы");
		assert.equal(row.entity_id, VISIT_JOURNAL_OK, "событие обязано указывать на подписанный приём");
		assert.equal(row.organization_id, ORGANIZATION_ID, "событие ушло не в ту клинику");
		assert.ok(
			row.age_seconds >= 0 && row.age_seconds < 300,
			`created_at события отстоит от «сейчас» на ${row.age_seconds} с — это не время подписания`,
		);
		assert.ok(row.reason, "событие без причины ничего не восстанавливает");
		assert.match(
			row.reason ?? "",
			/Ревизия 1 -> 2/,
			`полезная нагрузка обязана называть переход ревизии, как и путь без базы. Получено: ${row.reason}`,
		);
		assert.match(
			row.reason ?? "",
			/draft -> signed/,
			`событие обязано называть, что приём подписан, а не только принят. Получено: ${row.reason}`,
		);

		/*
		 * ДОЛГ, ЗАФИКСИРОВАННЫЙ УТВЕРЖДЕНИЕМ, А НЕ ОБЕЩАНИЕМ. Токен сотрудника
		 * здесь подписан настоящим врачом (DOCTOR_ID), и в журнале всё равно NULL:
		 * маршрут не передаёт сотрудника в слой доступа
		 * (requireClinicalMutationContext возвращает только organizationId), а
		 * acceptVisitDraftSchema поля актора не имеет. Подставлять сюда врача из
		 * записи расписания нельзя — подписать может заведующий, и журнал соврал бы.
		 * КОГДА маршрут начнёт передавать getRequestIdentity(request).userId,
		 * поменяйте это утверждение на равенство с DOCTOR_ID: покраснение здесь
		 * означает, что долг закрыт, а не что что-то сломалось.
		 */
		assert.equal(
			row.actor_user_id,
			null,
			"актор внезапно записан: маршрут начал передавать сотрудника в слой доступа — обновите это " +
				"утверждение на равенство DOCTOR_ID и снимите долг из отчёта.",
		);
	});

	test("отказ записи в журнал не отменяет подписание, но попадает в лог с причиной", async () => {
		const realInsert = db.insert.bind(db);
		const ownInsert = Object.getOwnPropertyDescriptor(db, "insert");
		const realConsoleError = console.error;
		const captured: string[] = [];

		/*
		 * Подменяется ровно вставка в `audit_events`; все прочие вставки идут в базу
		 * как обычно. Так проверяется отказ ИМЕННО журнала, а не общий сбой базы,
		 * который снёс бы и само подписание.
		 */
		Object.defineProperty(db, "insert", {
			configurable: true,
			writable: true,
			value: ((table: unknown) => {
				if (table === auditEvents) throw new Error(INJECTED_FAILURE);
				return (realInsert as (target: unknown) => unknown)(table);
			}) as unknown as typeof db.insert,
		});
		console.error = (...args: unknown[]) => {
			captured.push(args.map((value) => (value instanceof Error ? value.message : String(value))).join(" "));
		};

		let response: Awaited<ReturnType<typeof app.inject>>;
		try {
			response = await app.inject({
				method: "POST",
				url: `/api/visits/${VISIT_JOURNAL_FAILS}/draft/accept`,
				headers: { "x-dente-clinic-token": staffToken, "x-dente-staff-token": staffToken },
				payload: acceptPayload({ clientMutationId: "storozh-otkaz-zhurnala" }),
			});
		} finally {
			console.error = realConsoleError;
			if (ownInsert) Object.defineProperty(db, "insert", ownInsert);
			else Reflect.deleteProperty(db, "insert");
		}

		assert.equal(
			response.statusCode,
			200,
			"отказ журнала уронил подписание. Приём подписан — это факт клиники, и терять его из-за " +
				`вспомогательной таблицы нельзя. Ответ маршрута: ${response.body}`,
		);
		const body = JSON.parse(response.body) as { saveReceipt?: { status?: string; serverRevision?: number } };
		assert.equal(body.saveReceipt?.status, "accepted", "врач обязан получить полную квитанцию, а не обрывок");
		assert.equal(body.saveReceipt?.serverRevision, 2);

		const signed = await visitRow(VISIT_JOURNAL_FAILS);
		assert.equal(signed.status, "signed", "подпись обязана остаться в базе при отказе журнала");
		assert.equal(signed.revision, 2);
		assert.ok(signed.signed_at);
		assert.equal(signed.diagnosis, "K02.1 Кариес дентина", "текст врача обязан сохраниться целиком");

		assert.equal(
			(await auditRowsForVisit(VISIT_JOURNAL_FAILS)).length,
			0,
			"подмена писателя не сработала — значит проверка ничего не измерила",
		);

		const complaint = captured.find((line) => line.includes(VISIT_JOURNAL_FAILS));
		assert.ok(
			complaint,
			`отказ журнала проглочен молча: в логе нет ни строки про приём ${VISIT_JOURNAL_FAILS}. Пустой ` +
				`catch здесь означает, что событие потеряно И об этом никто не узнает. Строк в логе: ` +
				`${captured.length}${captured.length ? ` (${captured.join(" | ").slice(0, 300)})` : ""}`,
		);
		assert.ok(
			complaint.includes(INJECTED_FAILURE),
			`в логе нет причины отказа базы, только упоминание приёма: ${complaint}`,
		);
		assert.match(
			complaint,
			/audit_events/,
			`строка лога не называет, ЧТО не записалось: ${complaint}`,
		);
		console.log(`  лог отказа журнала: ${complaint}`);
	});

	test("полезная нагрузка события несёт конфликт ревизий и клиентскую операцию", async () => {
		const response = await app.inject({
			method: "POST",
			url: `/api/visits/${VISIT_JOURNAL_CONFLICT}/draft/accept`,
			headers: { "x-dente-clinic-token": staffToken, "x-dente-staff-token": staffToken },
			// Клиент правил приём с ревизии 0, на сервере уже была 1.
			payload: acceptPayload({ clientMutationId: "storozh-konflikt-zhurnala", baseRevision: 0 }),
		});
		assert.equal(response.statusCode, 200, response.body);

		const rows = await auditRowsForVisit(VISIT_JOURNAL_CONFLICT);
		assert.equal(rows.length, 1);
		const reason = rows[0]?.reason ?? "";
		assert.match(
			reason,
			/Клиентская операция storozh-konflikt-zhurnala\./,
			`клиентская операция обязана быть в событии, как и на пути без базы. Получено: ${reason}`,
		);
		assert.match(
			reason,
			/уже была ревизия 1/,
			`конфликт ревизий обязан быть в событии, как и на пути без базы. Получено: ${reason}`,
		);
	});

	test("оба пути пишут одно имя действия: журнал приёма нельзя развести на две половины", () => {
		/*
		 * Расхождение формы между путём с базой и без — самостоятельный дефект:
		 * журнал читают одним запросом по entity_type/entity_id, и два имени одного
		 * действия дали бы две несводимые половины истории приёма. Проверяется
		 * дословная строка в пути без базы, потому что общей константы на два пути
		 * в проекте нет (это долг).
		 */
		const sampleDataPath = path.resolve(
			path.dirname(fileURLToPath(import.meta.url)),
			"../../sampleData.ts",
		);
		assert.ok(
			existsSync(sampleDataPath),
			`путь без базы (${sampleDataPath}) переехал или удалён — сверьте форму записи журнала заново ` +
				"и поправьте этот сторож: он охраняет совпадение имён действия у двух путей.",
		);
		const source = readFileSync(sampleDataPath, "utf8");
		assert.ok(
			source.includes(`action: "${AUDIT_ACTION}"`),
			`путь без базы больше не пишет действие «${AUDIT_ACTION}». Имена действия у двух путей ` +
				"разошлись: журнал приёма распадётся на две половины, и ни один запрос не соберёт историю " +
				"целиком. Приведите оба пути к одному имени (db/visitsQuery.ts и sampleData.ts).",
		);
	});
});
