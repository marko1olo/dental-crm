/**
 * СТОРОЖ: ГЛАВНЫЙ ЭКРАН НЕ СМЕЕТ ВЫДАВАТЬ ИДЕНТИФИКАТОР ПРИЁМА, КОТОРОГО НЕТ.
 *
 * ЧТО БЫЛО. `GET /api/dashboard` на клинику БЕЗ приёмов отдавал
 * `activeVisit.id = "00000000-0000-0000-0000-000000000000"`, а вместе с ним такой
 * же нулевой `patientId`, `status: "draft"`, `revision: 1` и ДВЕ отметки времени,
 * взятые из часов сервера. Замерено через app.inject на живой PostgreSQL
 * 2026-07-29, четыре клиники с нулём визитов, включая живые:
 *
 *   Стоматология, 1 кабинет      (4a3420d1-…) визитов 0 -> activeVisit.id = 000…0
 *   Клиника разметки КЛКТ        (c7000000-…) визитов 0 -> activeVisit.id = 000…0
 *   Чужая клиника разметки КЛКТ  (c7000000-…) визитов 0 -> activeVisit.id = 000…0
 *   своя фикстурная клиника      (dce70000-…) визитов 0 -> activeVisit.id = 000…0
 *
 * Строки с таким идентификатором в базе нет ни одной: `select count(*) from visits
 * where id = '00000000-…'` даёт 0 — сверено своим SQL в том же прогоне.
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ, И ЭТО ИЗМЕРЕНО, А НЕ ПРЕДПОЛОЖЕНО. Нулевой
 * идентификатор — НЕПУСТАЯ строка, то есть правдивая в булевом смысле, и
 * клиентские сторожа вида `if (!dashboard?.activeVisit?.id) return;` её пропускают.
 * Цена уже записана в дереве рядом с каждой заплаткой на клиенте: касса отвечала
 * «Прием для оплаты не найден» на нажатие «Принять оплату»
 * (`apps/web/src/useAppLogic.tsx`, realActiveVisitId), а лента снимков была пуста
 * ВСЕГДА, пока приём не начат (там же, activeImagingStudies) — врач не мог открыть
 * ни прошлогоднюю ОПТГ, ни только что загруженный снимок.
 *
 * ЭТО ТОТ ЖЕ ЗАПРЕЩЁННЫЙ КЛАСС, что и в `tests/unknownIsNotZero.test.ts`:
 * неизвестное, напечатанное нулём. Там это была сумма денег, здесь —
 * идентификатор записи, и от настоящего он не отличается ничем.
 *
 * ЧТО ОХРАНЯЕТСЯ ЗДЕСЬ
 *   1. Идентификатор приёма из сводки либо РАЗРЕШАЕТСЯ в строку `visits` этой
 *      клиники, либо равен РОВНО одной объявленной метке «приёма нет». Третьего
 *      быть не может: случайный uuid, идентификатор чужой клиники или уже
 *      удалённый приём — всё это красное.
 *   2. Заготовка «приёма нет» не выдумывает время: два соседних чтения обязаны
 *      совпасть целиком. Сервер не сообщает, что несуществующий приём изменён.
 *   3. Изменяющие маршруты приёма, получив метку, отвечают отказом, который
 *      называет ПРИЧИНУ и ДЕЙСТВИЕ, а не «приём не найден, выберите актуальный».
 *   4. Метка не несёт клинического содержания: жалоба, диагноз, план — пусты.
 *   5. Рабочий путь не сломан: как только приём в клинике есть, `activeVisit` —
 *      это НАСТОЯЩАЯ строка базы, а не заготовка.
 *
 * ПОЧЕМУ НЕ ПРОВЕРЯЕТСЯ `activeVisit === null`, хотя правильный ответ именно он.
 * Три независимые причины, каждая проверена по исходнику:
 *   * `dashboardSchema` объявляет `activeVisit: visitSchema` без `.nullable()`
 *     (`packages/shared/src/index.ts:4408`), а `visitSchema.id` — `z.string().uuid()`;
 *   * `activeVisit` — общий на процесс мутируемый объект из `sampleData.ts`,
 *     обновляемый через `Object.assign`;
 *   * клиент разыменовывает `dashboard.activeVisit.appointmentId` БЕЗ `?.`
 *     (`apps/web/src/components/schedule/AppointmentCard.tsx:222`, `:241`) —
 *     на `null` карточка расписания упала бы при отрисовке.
 * Правка, от которой падает экран, хуже дефекта. Долг назван в отчёте и в
 * докстринге `db/domainStateHydration.ts`.
 *
 * ТРЕБУЕТСЯ живая PostgreSQL (DATABASE_URL из apps/api/.env).
 * ЗАПУСК: cd apps/api && npx tsx --test src/tests/routes/dashboardActiveVisitIsNotFabricated.test.ts
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { denteAdminSecretHeader } from "../../accessGuard.js";
import { db, pool } from "../../db/client.js";
import { organizations, patients, visits } from "../../db/schema.js";
import { registerDashboardRoutes } from "../../routes/dashboard.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { authTokenSecret, clinicalAdminSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid, purgeFixtureOrganizations } from "../support/fixtureOrganizations.js";

/**
 * ЕДИНСТВЕННОЕ значение, которым сводке разрешено сказать «открытого приёма нет».
 * Записано здесь ЛИТЕРАЛОМ, а не импортом из проверяемого кода: константа,
 * использованная и в ответе, и в ожидании, подтверждает саму себя.
 */
const DECLARED_NO_VISIT_ID = "00000000-0000-0000-0000-000000000000";

const NAMESPACE = "dashboardActiveVisitIsNotFabricated";
/** Клиника без единого приёма — то состояние, в котором подставлялся нулевой id. */
const EMPTY_ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
/** Клиника с настоящим черновиком — рабочий путь, который правка не должна сломать. */
const STAFFED_ORGANIZATION_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_ID = fixtureUuid(NAMESPACE, 11);
const REAL_VISIT_ID = fixtureUuid(NAMESPACE, 21);

const FIXTURE_ORGANIZATION_IDS = [EMPTY_ORGANIZATION_ID, STAFFED_ORGANIZATION_ID] as const;

type ActiveVisit = {
	id?: unknown;
	organizationId?: unknown;
	patientId?: unknown;
	status?: unknown;
	revision?: unknown;
	complaint?: unknown;
	anamnesis?: unknown;
	objectiveStatus?: unknown;
	diagnosis?: unknown;
	treatmentPlan?: unknown;
	doctorSummary?: unknown;
	createdAt?: unknown;
	updatedAt?: unknown;
};

let app: FastifyInstance;

function headersFor(organizationId: string): Record<string, string> {
	const secret = clinicalAdminSecret();
	return {
		"x-dente-clinic-token": signToken({ organizationId }, authTokenSecret()),
		...(secret ? { [denteAdminSecretHeader]: secret } : {}),
	};
}

async function readActiveVisit(organizationId: string): Promise<ActiveVisit> {
	const response = await app.inject({
		method: "GET",
		url: "/api/dashboard",
		headers: headersFor(organizationId),
	});
	assert.equal(
		response.statusCode,
		200,
		`Сводка главного экрана не отдана: ${response.statusCode} ${response.body.slice(0, 300)}`,
	);
	const parsed = JSON.parse(response.body) as { activeVisit?: ActiveVisit };
	assert.ok(
		parsed.activeVisit && typeof parsed.activeVisit === "object",
		"В сводке нет activeVisit вовсе. Контракт dashboardSchema требует это поле, и клиент " +
			"разыменовывает его без защиты — экран расписания упал бы при отрисовке.",
	);
	return parsed.activeVisit as ActiveVisit;
}

/** Есть ли в базе строка приёма с таким идентификатором у этой клиники. */
async function visitRowExists(organizationId: string, visitId: string): Promise<number> {
	const found = await db.execute<{ n: number }>(sql`
		select count(*)::int as n from visits
		 where id = ${visitId}::uuid and organization_id = ${organizationId}::uuid`);
	return found.rows[0]?.n ?? 0;
}

before(async () => {
	// Уборка НА ВХОДЕ: прогон, убитый снаружи, до `after` не доходит, и его строки
	// в живой базе следующий прогон читает как данные клиники.
	await purgeFixtureOrganizations(FIXTURE_ORGANIZATION_IDS);

	await db.insert(organizations).values([
		{ id: EMPTY_ORGANIZATION_ID, name: "Сторож нулевого приёма — клиника без приёмов" },
		{ id: STAFFED_ORGANIZATION_ID, name: "Сторож нулевого приёма — клиника с приёмом" },
	]);
	await db.insert(patients).values({
		id: PATIENT_ID,
		organizationId: STAFFED_ORGANIZATION_ID,
		fullName: "Настоящев Приём Черновикович",
		birthDate: "1979-11-02",
		phone: "+7 900 000-00-02",
	});
	await db.insert(visits).values({
		id: REAL_VISIT_ID,
		organizationId: STAFFED_ORGANIZATION_ID,
		patientId: PATIENT_ID,
		status: "draft",
		revision: 1,
		complaint: "скол пломбы 46",
	});

	app = Fastify();
	// Тот же хук, что в apps/api/src/server.ts: он наполняет личность запроса.
	app.addHook("onRequest", async (request) => {
		getRequestIdentity(request);
	});
	await registerDashboardRoutes(app);
	await registerVisitRoutes(app);
	await app.ready();
});

after(async () => {
	await app?.close();
	await purgeFixtureOrganizations(FIXTURE_ORGANIZATION_IDS);
	const leftovers = await db.execute<{ rows_left: number }>(sql`
		select (
			(select count(*) from organizations where id in (${EMPTY_ORGANIZATION_ID}::uuid, ${STAFFED_ORGANIZATION_ID}::uuid))
			+ (select count(*) from visits where organization_id in (${EMPTY_ORGANIZATION_ID}::uuid, ${STAFFED_ORGANIZATION_ID}::uuid))
			+ (select count(*) from patients where organization_id in (${EMPTY_ORGANIZATION_ID}::uuid, ${STAFFED_ORGANIZATION_ID}::uuid))
		)::int as rows_left`);
	assert.equal(
		leftovers.rows[0]?.rows_left,
		0,
		"Сторож не убрал свои строки из живой базы. За прошлым агентом их убирали руками, и его следы " +
			"дали ложный провал в чужом сквозном сценарии.",
	);
	await pool.end();
});

describe("GET /api/dashboard: приём в сводке либо есть в базе, либо назван отсутствующим", () => {
	it("клиника без приёмов: идентификатор приёма не разрешается в строку базы", async () => {
		// Посев проверяется отдельно: без этого «приёмов нет» было бы допущением.
		const seeded = await db.execute<{ n: number }>(
			sql`select count(*)::int as n from visits where organization_id = ${EMPTY_ORGANIZATION_ID}::uuid`,
		);
		assert.equal(seeded.rows[0]?.n, 0, "У клиники фикстуры не должно быть ни одного приёма.");

		const active = await readActiveVisit(EMPTY_ORGANIZATION_ID);
		const id = String(active.id ?? "");

		const resolvable = await visitRowExists(EMPTY_ORGANIZATION_ID, id);
		assert.equal(
			resolvable,
			0,
			"Сводка отдала идентификатор приёма, который в базе есть, хотя приёмов у клиники ноль. Проверка не о том.",
		);
		assert.equal(
			id,
			DECLARED_NO_VISIT_ID,
			`Сводка выдала НЕРАЗРЕШИМЫЙ идентификатор приёма «${id}», и это не объявленная метка «приёма нет». ` +
				"Клиент отличает метку от настоящего приёма только сравнением с одним конкретным значением " +
				"(apps/web/src/components/visit/visitIdentity.ts, NIL_UUID). Любое другое неразрешимое значение " +
				"уедет с врачом в кассу и в документы как настоящий приём.",
		);
		assert.equal(
			String(active.patientId ?? ""),
			DECLARED_NO_VISIT_ID,
			"Пациент заготовки — не метка. Тогда сводка называет ПАЦИЕНТА, привязанного к приёму, которого нет.",
		);
	});

	it("заготовка «приёма нет» не несёт клинического содержания", async () => {
		const active = await readActiveVisit(EMPTY_ORGANIZATION_ID);

		for (const [field, value] of [
			["жалоба", active.complaint],
			["анамнез", active.anamnesis],
			["объективный статус", active.objectiveStatus],
			["диагноз", active.diagnosis],
			["план лечения", active.treatmentPlan],
			["заключение врача", active.doctorSummary],
		] as const) {
			assert.equal(
				value,
				null,
				`В заготовке «приёма нет» заполнено поле «${field}» значением ${JSON.stringify(value)}. ` +
					"Это запись о лечении приёма, которого не существует: она уедет в документ и в ЭМК.",
			);
		}
		assert.equal(
			active.organizationId,
			EMPTY_ORGANIZATION_ID,
			"Заготовка называет ДРУГУЮ клинику. Доменные коллекции общие на процесс, и это ровно тот путь, " +
				"которым в ответ попадали реквизиты последней прочитанной чужой клиники.",
		);
	});

	it("сервер не сообщает, что несуществующий приём изменён: два чтения совпадают", async () => {
		const first = await readActiveVisit(EMPTY_ORGANIZATION_ID);
		// Пауза больше разрешения часов: иначе «совпало» могло бы означать лишь то,
		// что два запроса уложились в одну миллисекунду.
		await new Promise((resolve) => setTimeout(resolve, 30));
		const second = await readActiveVisit(EMPTY_ORGANIZATION_ID);

		assert.equal(
			second.updatedAt,
			first.updatedAt,
			`Время изменения несуществующего приёма разъехалось между двумя чтениями: ` +
				`${JSON.stringify(first.updatedAt)} против ${JSON.stringify(second.updatedAt)}. ` +
				"Это выдуманный факт: изменять было нечего. Клиент читает это поле как отметку свежести " +
				"серверной записи и сравнивает её со временем ЛОКАЛЬНО сохранённого черновика врача " +
				"(apps/web/src/useAppLogic.tsx) — пока сервер отвечает «изменён сейчас», серверная отметка " +
				"новее любой локальной всегда, и набранное врачом не восстанавливается никогда.",
		);
		assert.equal(second.createdAt, first.createdAt, "Время создания несуществующего приёма тоже меняется от запроса к запросу.");
		assert.deepEqual(
			second,
			first,
			"Заготовка «приёма нет» отличается между двумя соседними чтениями одной и той же клиники. " +
				"Про несуществующий приём двух разных ответов быть не может.",
		);
	});

	it("рабочий путь не сломан: при живом приёме сводка отдаёт НАСТОЯЩУЮ строку базы", async () => {
		const active = await readActiveVisit(STAFFED_ORGANIZATION_ID);
		const id = String(active.id ?? "");

		assert.notEqual(
			id,
			DECLARED_NO_VISIT_ID,
			"У клиники есть черновик приёма, а сводка отдала метку «приёма нет». Правка сломала главный экран: " +
				"врач не откроет карту приёма, а касса не примет оплату по нему.",
		);
		assert.equal(
			await visitRowExists(STAFFED_ORGANIZATION_ID, id),
			1,
			`Идентификатор приёма из сводки «${id}» не разрешается в строку visits этой клиники. Именно это ` +
				"правило и охраняет весь файл: сводка обязана называть приём, который есть.",
		);
		assert.equal(active.id, REAL_VISIT_ID, "Сводка назвала не тот приём, что посеян.");
		assert.equal(active.complaint, "скол пломбы 46", "Настоящие поля приёма потерялись по дороге в сводку.");
		assert.equal(active.status, "draft");
	});
});

describe("метка «приёма нет» в изменяющих маршрутах приёма", () => {
	/**
	 * ПОЧЕМУ ЭТИ ДВЕ ПРОВЕРКИ ЖИВУТ ЗДЕСЬ, А НЕ В ФАЙЛЕ ПРО МАРШРУТ ПРИЁМА. Они
	 * проверяют не маршрут, а СУДЬБУ выдуманного идентификатора: клиент берёт его
	 * из этой самой сводки и отправляет обратно, потому что непустая строка проходит
	 * его собственные сторожа `if (!dashboard?.activeVisit?.id) return;` (замерено на
	 * `useVisitLogic.ts`: так делают и syncVisitDraftAutosave, и acceptDraftToVisit).
	 * Дефект один и тот же, и разводить его по двум файлам значит потерять связь.
	 */
	const nilAutosave = {
		patientId: DECLARED_NO_VISIT_ID,
		selectedSpecialty: "therapist",
		transcript: "врач набрал текст на клинике, где приём не открыт",
		draft: {
			warnings: [],
			complaint: "боль при накусывании",
			anamnesis: "",
			objectiveStatus: "",
			diagnosis: "",
			treatmentPlan: "",
		},
	};

	async function callWithNilId(
		method: "PUT" | "POST",
		suffix: "autosave" | "accept",
		payload: unknown,
	): Promise<{ status: number; body: string; reason: string; message: string }> {
		const response = await app.inject({
			method,
			url: `/api/visits/${DECLARED_NO_VISIT_ID}/draft/${suffix}`,
			headers: { ...headersFor(EMPTY_ORGANIZATION_ID), "content-type": "application/json" },
			payload: payload as Record<string, unknown>,
		});
		let parsed: Record<string, unknown> = {};
		try {
			parsed = JSON.parse(response.body) as Record<string, unknown>;
		} catch {
			parsed = {};
		}
		return {
			status: response.statusCode,
			body: response.body,
			reason: String(parsed.reason ?? ""),
			message: String(parsed.message ?? ""),
		};
	}

	it("автосохранение по метке отказывает причиной, а не «приём не найден»", async () => {
		const refusal = await callWithNilId("PUT", "autosave", nilAutosave);

		assert.ok(
			!/не найден/i.test(refusal.message),
			`Отказ говорит «приём не найден» про идентификатор, который сервер сам же и выдал как метку ` +
				`«приёма нет». Приём никто не терял — его не открывали. Ответ: ${refusal.body}`,
		);
		assert.match(
			refusal.message,
			/не открыт/i,
			`Отказ не называет ПРИЧИНУ — в клинике не открыт ни один приём. Пришло: «${refusal.message}»`,
		);
		assert.match(
			refusal.message,
			/откройте прием/i,
			`Отказ не называет ВЫПОЛНИМОЕ действие. Прежний текст предлагал «выберите актуальный прием», ` +
				`которого не существует, — врач жмёт одно и то же. Пришло: «${refusal.message}»`,
		);
		assert.equal(refusal.reason, "no_active_visit", `Машинная причина отказа не названа: ${refusal.body}`);
	});

	it("подписание по метке отказывает своим текстом и ничего не записывает в базу", async () => {
		const before = await db.execute<{ n: number }>(
			sql`select count(*)::int as n from visits where organization_id = ${EMPTY_ORGANIZATION_ID}::uuid`,
		);
		const refusal = await callWithNilId("POST", "accept", {
			draft: {
				warnings: [],
				complaint: "боль при накусывании",
				anamnesis: null,
				objectiveStatus: null,
				diagnosis: null,
				treatmentPlan: null,
			},
			doctorSummary: null,
		});

		assert.ok(
			!/не найден/i.test(refusal.message),
			`Подписание отвечает «приём не найден» про метку «приёма нет»: ${refusal.body}`,
		);
		assert.match(refusal.message, /не открыт/i, `Отказ подписания без причины: «${refusal.message}»`);
		assert.match(refusal.message, /откройте прием/i, `Отказ подписания без действия: «${refusal.message}»`);
		assert.ok(
			/подписывать нечего|подписывать/i.test(refusal.message),
			`Отказ подписания повторяет текст автосохранения дословно: врач читает «записывать некуда» там, ` +
				`где нажал «подписать». Пришло: «${refusal.message}»`,
		);

		const after = await db.execute<{ n: number }>(
			sql`select count(*)::int as n from visits where organization_id = ${EMPTY_ORGANIZATION_ID}::uuid`,
		);
		assert.equal(
			after.rows[0]?.n,
			before.rows[0]?.n,
			"Отказ по метке «приёма нет» изменил число приёмов клиники. Подписание не смеет создавать приём.",
		);
	});
});
