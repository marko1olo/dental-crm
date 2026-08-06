import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import pg from "pg";
import { db } from "../../db/client.js";
import {
	organizations,
	patientCtPlannings,
	patients,
} from "../../db/schema.js";
import { registerImagingPlanningRoutes } from "../../routes/imaging_planning.js";
import { resetAuthSecretCacheForTests } from "../../security/authSecret.js";
import { CLINIC_TOKEN_HEADER } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * РАЗМЕТКА ПЛАНИРОВАНИЯ ИМПЛАНТАЦИИ ДОХОДИТ ДО БАЗЫ И ВОЗВРАЩАЕТСЯ ОБРАТНО.
 *
 * Запуск: из apps/api
 *   node --import tsx --test src/tests/routes/ctPlanningMarkupPersists.test.ts
 *
 * ЧТО БЫЛО ПЛОХО ДЛЯ КЛИНИКИ. Врач обводил зубную дугу на КЛКТ инструментом
 * «Дуга (Spline)» — это разметка, вокруг которой планируется имплантация, — уходил
 * с экрана и возвращался к пустому снимку. Серверная половина была дописана до
 * конца: таблица, отбор по организации, upsert по паре пациент + исследование.
 * Адреса `/api/imaging/planning/save` и `/api/imaging/planning/load` не
 * упоминались в клиенте НИ РАЗУ.
 *
 * ЧТО ИМЕННО ЗДЕСЬ ДОКАЗЫВАЕТСЯ — ЗАМКНУТЫЙ КРУГ, А НЕ КОД ОТВЕТА 200:
 *  • сохранил -> перечитал -> ровно то же самое, поле за полем;
 *  • строка в базе содержит ИМЕННО разметку. Проверяется отдельным соединением
 *    `pg`, БЕЗ drizzle: разбор колонки — как раз то место, где был дефект, и
 *    проверять его тем же слоем, который его создавал, бессмысленно;
 *  • чужая клиника не видит и не может перезаписать разметку;
 *  • повторное сохранение обновляет ту же строку, а не плодит вторую.
 *
 * ИЗМЕРЕННЫЙ ДЕФЕКТ РАЗБОРА КОЛОНКИ — УСТРАНЁН В ИСТОЧНИКЕ 2026-07-29, И ЭТОТ
 * ТЕСТ ОСТАЁТСЯ ЕГО СТОРОЖЕМ.
 *
 * Было так: `db/schema.ts` объявлял `spline_points_json`, `nerve_points_json`,
 * `implants_json` типом `jsonb`, а миграция, создавшая таблицу, объявила их
 * `text DEFAULT '[]' NOT NULL` (`drizzle/0000_freezing_randall_flagg.sql:828-830`),
 * и в живой базе они действительно `text` — миграция 0118 их не переписывала.
 * Расходился именно `schema.ts`. Цена расхождения: у drizzle `jsonb` при записи
 * делает `JSON.stringify`, то есть строка `[{"x":1}]` попадала в текстовую колонку
 * как `"[{\"x\":1}]"` — с кавычками и экранированием. При чтении тот же класс
 * делает `JSON.parse`, поэтому круг сходился, но в самой базе лежал двойной
 * кодировкой текст, а строка, созданная значением колонки по умолчанию (`'[]'`),
 * возвращалась МАССИВОМ, тогда как строка, записанная маршрутом, — СТРОКОЙ. Одна
 * колонка, два разных типа на выходе.
 *
 * Теперь объявление приведено к базе (`text`, `.notNull().default("[]")`), и
 * маршрут больше НЕ обходит разбор приведениями `::text` — обход снят вместе с
 * причиной. Утверждение ниже про «текст не в двойной кодировке» от этого не
 * стало формальностью: оно единственное, что заметит возврат `jsonb` в
 * объявление, если читать базу тем же слоем, который дефект и создавал. Второй
 * сторож, независимый от маршрутов, — `tests/schemaMatchesLiveDatabase.test.ts`.
 *
 * СТРОКИ ЭТОГО ТЕСТА НЕ УДАЛЯЮТСЯ ПОСЛЕ ПРОГОНА — намеренно: доказательство
 * замкнутого круга требует, чтобы строку можно было увидеть независимым psql
 * после того, как процесс завершился. Очистка идёт в `before`, поэтому прогон
 * идемпотентен и не накапливает мусор.
 */

const ORG_MINE = "c7000000-0000-4000-8000-00000000c001";
const ORG_FOREIGN = "c7000000-0000-4000-8000-00000000c002";
const PATIENT_MINE = "c7000000-0000-4000-8000-00000000e001";
const PATIENT_FOREIGN = "c7000000-0000-4000-8000-00000000e002";
const STUDY_UID = "1.2.840.113619.2.55.3.604688.9.1755193200.1";
const TEST_SECRET = "ct-planning-markup-persists-secret-".padEnd(48, "q");

/**
 * Разметка с дробными координатами и отрицательным Z: именно такие приходят из
 * мировой системы cornerstone. Целые числа скрыли бы потерю точности.
 */
const SPLINE_POINTS = [
	{ x: -31.457, y: 12.004, z: -48.5 },
	{ x: -12.25, y: 41.875, z: -48.5 },
	{ x: 14.5, y: 40.125, z: -48.5 },
	{ x: 33.0625, y: 9.5, z: -48.5 },
];

const IMPLANTS = [
	{
		id: "impl-36",
		fdiCode: "36",
		diameter: 4,
		length: 10,
		startWorld: [10, 20, -50] as [number, number, number],
		endWorld: [10, 20, -60] as [number, number, number],
		boneDensity: { averageHU: 650, classification: "D2" },
		distanceToNerve: 2.236,
	},
];

function clinicHeaders(organizationId: string): Record<string, string> {
	return {
		[CLINIC_TOKEN_HEADER]: signToken({ organizationId }, TEST_SECRET, 3600),
		"content-type": "application/json",
	};
}

/** Отдельное соединение, не знающее ни про drizzle, ни про схему. */
async function rawPlanningRows(): Promise<
	{
		spline: string;
		nerve: string;
		implants: string;
		org: string;
		study: string;
	}[]
> {
	const url = process.env.DATABASE_URL;
	assert.ok(
		url,
		"DATABASE_URL не задан — независимую проверку базы выполнить нечем",
	);
	const client = new pg.Client({ connectionString: url });
	await client.connect();
	try {
		/*
		 * Роль приложения работает под FORCE RLS, и это соединение своего
		 * арендатора не называет: без флага обхода SELECT вернул бы НОЛЬ строк
		 * независимо от содержимого таблицы, то есть проверка «в базе лежит
		 * именно разметка» превратилась бы в проверку пустоты. Обход накрывает
		 * РОВНО одно чтение трёх колонок и умирает вместе с соединением; ничего
		 * не пишется и не удаляется. Тенант-контекст здесь не годится: под ним
		 * счёт строк не отличил бы «строки нет» от «строку скрыла политика», и
		 * утверждения `rows.length === 1` и `row.org === ORG_MINE` перестали бы
		 * ловить чужую строку по тому же пациенту.
		 */
		await client.query(
			"select set_config('app.superuser_bypass', 'on', false)",
		);
		const result = await client.query<{
			spline_points_json: string;
			nerve_points_json: string;
			implants_json: string;
			organization_id: string;
			study_instance_uid: string;
		}>(
			"select organization_id, study_instance_uid, spline_points_json, nerve_points_json, implants_json " +
				"from patient_ct_plannings where patient_id = $1 order by created_at",
			[PATIENT_MINE],
		);
		return result.rows.map((row) => ({
			org: row.organization_id,
			study: row.study_instance_uid,
			spline: row.spline_points_json,
			nerve: row.nerve_points_json,
			implants: row.implants_json,
		}));
	} finally {
		await client.end();
	}
}

describe("разметка планирования имплантации доходит до базы и читается обратно", () => {
	const originalEnv = { ...process.env };
	let app: FastifyInstance;

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.AUTH_TOKEN_SECRET = TEST_SECRET;
		// Заголовок организации не участвует: клиника берётся только из
		// подписанного токена, и отбор проверяется именно на нём.
		delete process.env.DENTE_DEV_ALLOW_HEADER_ORG;
		resetAuthSecretCacheForTests();

		/*
		 * Уборка и сев идут ПО КЛИНИКАМ, каждая под своим тенант-контекстом:
		 * `app.current_tenant` хранит ровно одного арендатора, а под FORCE RLS
		 * вставка чужой организации отвергается кодом 42501, тогда как DELETE без
		 * контекста снимает ноль строк и об этом молчит.
		 */
		await withFixtureTenant(ORG_MINE, async () => {
			await db
				.delete(patientCtPlannings)
				.where(eq(patientCtPlannings.patientId, PATIENT_MINE));
			await db.delete(patients).where(eq(patients.organizationId, ORG_MINE));
			await db.delete(organizations).where(eq(organizations.id, ORG_MINE));
		});
		await withFixtureTenant(ORG_FOREIGN, async () => {
			await db
				.delete(patientCtPlannings)
				.where(eq(patientCtPlannings.patientId, PATIENT_FOREIGN));
			await db.delete(patients).where(eq(patients.organizationId, ORG_FOREIGN));
			await db.delete(organizations).where(eq(organizations.id, ORG_FOREIGN));
		});

		await withFixtureTenant(ORG_MINE, async () => {
			await db
				.insert(organizations)
				.values({ id: ORG_MINE, name: "Клиника разметки КЛКТ" });
			await db.insert(patients).values({
				id: PATIENT_MINE,
				organizationId: ORG_MINE,
				fullName: "Имплантов Пётр Сергеевич",
			});
		});
		await withFixtureTenant(ORG_FOREIGN, async () => {
			await db
				.insert(organizations)
				.values({ id: ORG_FOREIGN, name: "Чужая клиника разметки КЛКТ" });
			await db.insert(patients).values({
				id: PATIENT_FOREIGN,
				organizationId: ORG_FOREIGN,
				fullName: "Чужов Иван Иванович",
			});
		});

		app = createTenantTestApp();
		await registerImagingPlanningRoutes(app);
		await app.ready();
	});

	after(async () => {
		await app?.close();
		process.env = originalEnv;
		resetAuthSecretCacheForTests();
	});

	test("сохранил -> перечитал -> ровно то же самое", async () => {
		const saved = await app.inject({
			method: "POST",
			url: "/api/imaging/planning/save",
			headers: clinicHeaders(ORG_MINE),
			payload: {
				patientId: PATIENT_MINE,
				studyInstanceUid: STUDY_UID,
				splinePointsJson: JSON.stringify(SPLINE_POINTS),
				nervePointsJson: JSON.stringify([]),
				implantsJson: JSON.stringify(IMPLANTS),
			},
		});
		assert.equal(saved.statusCode, 200, `сохранение отказало: ${saved.body}`);

		const loaded = await app.inject({
			method: "GET",
			url: `/api/imaging/planning/load?studyUid=${encodeURIComponent(STUDY_UID)}&patientId=${PATIENT_MINE}`,
			headers: clinicHeaders(ORG_MINE),
		});
		assert.equal(loaded.statusCode, 200, `чтение отказало: ${loaded.body}`);

		const planning = loaded.json().planning as Record<string, unknown> | null;
		assert.ok(planning, "маршрут чтения вернул пустоту сразу после сохранения");

		// Круг замкнулся: разобранная обратно разметка совпадает с отправленной.
		assert.deepEqual(
			JSON.parse(String(planning.splinePointsJson)),
			SPLINE_POINTS,
			"обведённая дуга вернулась не той, какой ушла",
		);
		assert.deepEqual(JSON.parse(String(planning.implantsJson)), IMPLANTS);
		assert.deepEqual(JSON.parse(String(planning.nervePointsJson)), []);

		// И тип на выходе — строка, а не то массив, то строка в зависимости от
		// того, кто записал строку таблицы.
		assert.equal(typeof planning.splinePointsJson, "string");
		assert.equal(typeof planning.nervePointsJson, "string");
		assert.equal(typeof planning.implantsJson, "string");
	});

	test("в базе лежит именно разметка, а не текст в двойной кодировке", async () => {
		const rows = await rawPlanningRows();
		assert.equal(
			rows.length,
			1,
			`строк разметки у пациента ${rows.length}, ожидалась одна`,
		);
		const row = rows[0]!;
		assert.equal(row.org, ORG_MINE);
		assert.equal(row.study, STUDY_UID);

		// Побайтово тот текст, который отправил клиент. Двойная кодировка дала бы
		// здесь строку, начинающуюся с кавычки.
		assert.equal(
			row.spline,
			JSON.stringify(SPLINE_POINTS),
			"в колонке дуги лежит не тот текст, который отправил клиент",
		);
		assert.equal(row.implants, JSON.stringify(IMPLANTS));
		assert.equal(row.nerve, "[]");
		assert.ok(
			!row.spline.startsWith('"'),
			`разметка записана в двойной кодировке: ${row.spline.slice(0, 40)}`,
		);
	});

	test("повторное сохранение обновляет ту же строку, а не плодит вторую", async () => {
		const changed = [...SPLINE_POINTS, { x: 40.5, y: -3.25, z: -48.5 }];
		const saved = await app.inject({
			method: "POST",
			url: "/api/imaging/planning/save",
			headers: clinicHeaders(ORG_MINE),
			payload: {
				patientId: PATIENT_MINE,
				studyInstanceUid: STUDY_UID,
				splinePointsJson: JSON.stringify(changed),
				implantsJson: JSON.stringify(IMPLANTS),
			},
		});
		assert.equal(saved.statusCode, 200, saved.body);

		const rows = await rawPlanningRows();
		assert.equal(
			rows.length,
			1,
			`после второго сохранения строк ${rows.length}, ожидалась одна`,
		);
		assert.equal(
			rows[0]!.spline,
			JSON.stringify(changed),
			"правка дуги не доехала до базы",
		);

		// Возврат к исходной разметке: следующий тест и независимый psql должны
		// видеть ровно то, что описано в SPLINE_POINTS.
		const restored = await app.inject({
			method: "POST",
			url: "/api/imaging/planning/save",
			headers: clinicHeaders(ORG_MINE),
			payload: {
				patientId: PATIENT_MINE,
				studyInstanceUid: STUDY_UID,
				splinePointsJson: JSON.stringify(SPLINE_POINTS),
				implantsJson: JSON.stringify(IMPLANTS),
			},
		});
		assert.equal(restored.statusCode, 200, restored.body);
	});

	test("чужая клиника не видит разметку и не может её перезаписать", async () => {
		const foreignRead = await app.inject({
			method: "GET",
			url: `/api/imaging/planning/load?studyUid=${encodeURIComponent(STUDY_UID)}&patientId=${PATIENT_MINE}`,
			headers: clinicHeaders(ORG_FOREIGN),
		});
		assert.equal(
			foreignRead.statusCode,
			404,
			`чужая клиника прочитала разметку пациента: ${foreignRead.body}`,
		);
		assert.ok(
			!foreignRead.body.includes("31.457"),
			"в ответе чужой клинике утекли координаты обведённой дуги",
		);

		const foreignWrite = await app.inject({
			method: "POST",
			url: "/api/imaging/planning/save",
			headers: clinicHeaders(ORG_FOREIGN),
			payload: {
				patientId: PATIENT_MINE,
				studyInstanceUid: STUDY_UID,
				splinePointsJson: JSON.stringify([{ x: 0, y: 0, z: 0 }]),
			},
		});
		assert.equal(foreignWrite.statusCode, 404, foreignWrite.body);

		// И запись чужой клиники не тронула строку.
		const rows = await rawPlanningRows();
		assert.equal(rows.length, 1);
		assert.equal(
			rows[0]!.spline,
			JSON.stringify(SPLINE_POINTS),
			"чужая клиника перезаписала разметку пациента",
		);
	});

	test("своя разметка того же исследования у разных клиник не путается", async () => {
		const foreignOwn = await app.inject({
			method: "POST",
			url: "/api/imaging/planning/save",
			headers: clinicHeaders(ORG_FOREIGN),
			payload: {
				patientId: PATIENT_FOREIGN,
				studyInstanceUid: STUDY_UID,
				splinePointsJson: JSON.stringify([{ x: 99, y: 99, z: 99 }]),
			},
		});
		assert.equal(foreignOwn.statusCode, 200, foreignOwn.body);

		const mine = await app.inject({
			method: "GET",
			url: `/api/imaging/planning/load?studyUid=${encodeURIComponent(STUDY_UID)}&patientId=${PATIENT_MINE}`,
			headers: clinicHeaders(ORG_MINE),
		});
		const planning = mine.json().planning as Record<string, unknown>;
		assert.deepEqual(
			JSON.parse(String(planning.splinePointsJson)),
			SPLINE_POINTS,
			"разметка чужой клиники по тому же исследованию подменила свою",
		);

		await withFixtureTenant(ORG_FOREIGN, async () => {
			await db
				.delete(patientCtPlannings)
				.where(
					and(
						eq(patientCtPlannings.organizationId, ORG_FOREIGN),
						eq(patientCtPlannings.patientId, PATIENT_FOREIGN),
					),
				);
		});
	});

	test("запрос без токена кабинета отказывает русским текстом с действием", async () => {
		const saved = await app.inject({
			method: "POST",
			url: "/api/imaging/planning/save",
			headers: { "content-type": "application/json" },
			payload: { patientId: PATIENT_MINE, studyInstanceUid: STUDY_UID },
		});
		assert.equal(saved.statusCode, 401, saved.body);
		const message = String(saved.json().message ?? "");
		assert.ok(
			/[А-Яа-яЁё]/.test(message),
			`отказ без русского текста: ${saved.body}`,
		);
		assert.ok(
			/Войдите в кабинет/.test(message),
			`в отказе нет действия, которое лечит причину: ${message}`,
		);

		const loaded = await app.inject({
			method: "GET",
			url: `/api/imaging/planning/load?studyUid=${STUDY_UID}&patientId=${PATIENT_MINE}`,
		});
		assert.equal(loaded.statusCode, 401, loaded.body);
		assert.ok(/Войдите в кабинет/.test(String(loaded.json().message ?? "")));
	});

	test("испорченное тело отказывает разбором, а не общей ошибкой сервера", async () => {
		// БЫЛО: любой промах zod ловился общим catch и возвращал 500
		// «Internal server error» — врач читал это как поломку сервера, хотя
		// причина в запросе, и повторять действие бессмысленно.
		const saved = await app.inject({
			method: "POST",
			url: "/api/imaging/planning/save",
			headers: clinicHeaders(ORG_MINE),
			payload: { patientId: "не-идентификатор", studyInstanceUid: STUDY_UID },
		});
		assert.equal(
			saved.statusCode,
			400,
			`ожидался отказ разбора, пришло: ${saved.body}`,
		);
		assert.ok(
			/[А-Яа-яЁё]/.test(String(saved.json().message ?? "")),
			saved.body,
		);

		const loaded = await app.inject({
			method: "GET",
			url: "/api/imaging/planning/load?patientId=не-идентификатор",
			headers: clinicHeaders(ORG_MINE),
		});
		assert.equal(loaded.statusCode, 400, loaded.body);
	});
});
