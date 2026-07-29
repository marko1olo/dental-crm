/**
 * СТОРОЖ: СЕРВЕР НЕ СМЕЕТ ГОВОРИТЬ «ПРИЁМ НЕ НАЙДЕН» О ПРИЁМЕ, КОТОРЫЙ ЕСТЬ.
 *
 * ЧТО БЫЛО. `GET /api/visits/:visitId/draft/autosave` отвечал одним и тем же
 * отказом на ТРИ разных состояния базы. Замерено через app.inject в своём
 * процессе на живой PostgreSQL 2026-07-29, свои фикстурные клиники:
 *
 *   приём ПОДПИСАН, строка в базе ЕСТЬ  -> 404 {"error":"VisitNotFound",
 *                                          "message":"Прием не найден. Обновите
 *                                          рабочий экран и выберите актуальный прием."}
 *   приёма НЕТ ВОВСЕ                    -> 404 то же самое слово в слово
 *   приём ЧУЖОЙ КЛИНИКИ                 -> 404 то же самое слово в слово
 *
 * Независимая сверка тем же прогоном, `select … from visits where id = <подписанный>`:
 * одна строка, `status = 'signed'`, `revision = 2`, `signed_at` заполнен. Значит
 * выборка приём НАХОДИТ, и 404 «не найден» о нём — ложь, а не слепой запрос.
 * Различие терялось в слое доступа: `db/visitsQuery.ts` возвращал `null` и на
 * «строки нет», и на «строка есть, но это не черновик».
 *
 * ЧЕМ ЭТО ПЛОХО ДЛЯ КЛИНИКИ. Отказ давал НЕВЫПОЛНИМОЕ действие — «выберите
 * актуальный прием». На демо-клинике все 10 приёмов подписаны и черновиков нет ни
 * одного (проверено SQL), а `dashboard.activeVisit` — «последний черновик клиники,
 * иначе последний приём любого статуса». Рабочий экран открывается на подписанном
 * приёме, первым запросом получает «приём не найден», обновление возвращает тот же
 * приём, а выбрать нечего. Человек за стойкой ищет пропавшую запись, которой ничего
 * не угрожает.
 *
 * ЧТО ОХРАНЯЕТСЯ ЗДЕСЬ
 *   1. Три состояния получают РАЗНЫЕ ответы. Слияние обратно в один — красное.
 *   2. Про существующий приём сервер не говорит «не найден».
 *   3. Отказ называет ПРИЧИНУ и ДЕЙСТВИЕ — по наличию, а не дословно (см. ниже).
 *   4. Рабочий путь не сломан: у черновика черновик по-прежнему отдаётся 200.
 *   5. Строка приёма действительно лежит в базе в момент отказа — сверка своим SQL.
 *
 * ПОЧЕМУ ПРОВЕРЯЕТСЯ НАЛИЧИЕ ПРИЧИНЫ, А НЕ ТОЧНАЯ СТРОКА. Тест на дословное
 * совпадение краснеет на любой правке формулировки, и его выключают вместе с
 * настоящим сигналом. В этом же дереве такой тест уже стоит: `routes/visits.test.ts`
 * сверяет сообщение отказа посимвольно. Здесь проверяется то, из-за чего дефект и
 * был дефектом: назвал ли отказ причину и следующий шаг.
 *
 * ТРЕБУЕТСЯ живая PostgreSQL (DATABASE_URL из apps/api/.env).
 * ЗАПУСК: cd apps/api && npx tsx --test src/tests/routes/visitDraftRefusalNamesCause.test.ts
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { sql } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { denteAdminSecretHeader } from "../../accessGuard.js";
import { db, pool } from "../../db/client.js";
import { organizations, patients, visits } from "../../db/schema.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { authTokenSecret, clinicalAdminSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid, purgeFixtureOrganizations } from "../support/fixtureOrganizations.js";

/** Пространство имён = имя этого файла: чужой тест таких же идентификаторов не получит. */
const NAMESPACE = "visitDraftRefusalNamesCause";
const OWN_ORGANIZATION_ID = fixtureUuid(NAMESPACE, 1);
/** Вторая клиника нужна ровно для одной проверки: чужой приём не подтверждается. */
const OTHER_ORGANIZATION_ID = fixtureUuid(NAMESPACE, 2);
const PATIENT_ID = fixtureUuid(NAMESPACE, 11);
const SIGNED_VISIT_ID = fixtureUuid(NAMESPACE, 21);
const VOIDED_VISIT_ID = fixtureUuid(NAMESPACE, 22);
const DRAFT_VISIT_ID = fixtureUuid(NAMESPACE, 23);
/** Приём, которого нет. Ни одна вставка этого файла его не создаёт. */
const ABSENT_VISIT_ID = fixtureUuid(NAMESPACE, 99);

const FIXTURE_ORGANIZATION_IDS = [OWN_ORGANIZATION_ID, OTHER_ORGANIZATION_ID] as const;

type Refusal = {
	readonly status: number;
	readonly body: string;
	readonly error: string;
	readonly reason: string;
	readonly message: string;
};

let app: FastifyInstance;

function headersFor(organizationId: string): Record<string, string> {
	const secret = clinicalAdminSecret();
	return {
		"x-dente-clinic-token": signToken({ organizationId }, authTokenSecret()),
		...(secret ? { [denteAdminSecretHeader]: secret } : {}),
	};
}

async function readDraft(organizationId: string, visitId: string): Promise<Refusal> {
	const response = await app.inject({
		method: "GET",
		url: `/api/visits/${visitId}/draft/autosave`,
		headers: headersFor(organizationId),
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
		error: String(parsed.error ?? ""),
		reason: String(parsed.reason ?? ""),
		message: String(parsed.message ?? ""),
	};
}

/**
 * Названа ли ПРИЧИНА. Не дословная строка, а факт: отказ обязан сказать, ЧТО с
 * приёмом, а не только что чего-то нет.
 */
function namesCause(message: string, expected: RegExp): boolean {
	return expected.test(message);
}

/**
 * Названо ли ДЕЙСТВИЕ. Набор глаголов, а не одна фраза: правка формулировки не
 * должна валить сторожа, а вот отказ без следующего шага — обязан.
 */
function namesNextStep(message: string): boolean {
	return /откройте|создайте|войдите|обновите|повторите|выберите|заполните|сообщите/i.test(message);
}

before(async () => {
	// Уборка НА ВХОДЕ: прогон, убитый снаружи, до `after` не доходит и оставляет
	// свои строки в живой базе. Следующий прогон обязан начинать с чистого места.
	await purgeFixtureOrganizations(FIXTURE_ORGANIZATION_IDS);

	await db.insert(organizations).values([
		{ id: OWN_ORGANIZATION_ID, name: "Сторож отказа черновика — своя клиника" },
		{ id: OTHER_ORGANIZATION_ID, name: "Сторож отказа черновика — чужая клиника" },
	]);
	await db.insert(patients).values({
		id: PATIENT_ID,
		organizationId: OWN_ORGANIZATION_ID,
		fullName: "Приёмов Подписанный Черновикович",
		birthDate: "1988-03-14",
		phone: "+7 900 000-00-14",
	});
	await db.insert(visits).values([
		{
			id: SIGNED_VISIT_ID,
			organizationId: OWN_ORGANIZATION_ID,
			patientId: PATIENT_ID,
			status: "signed",
			revision: 2,
			complaint: "боль при накусывании на 36",
			diagnosis: "K02.1 Кариес дентина",
			signedAt: new Date(),
		},
		{
			id: VOIDED_VISIT_ID,
			organizationId: OWN_ORGANIZATION_ID,
			patientId: PATIENT_ID,
			status: "voided",
			revision: 1,
		},
		{
			id: DRAFT_VISIT_ID,
			organizationId: OWN_ORGANIZATION_ID,
			patientId: PATIENT_ID,
			status: "draft",
			revision: 1,
			complaint: "плановый осмотр",
		},
	]);

	app = Fastify();
	// Тот же хук, что в apps/api/src/server.ts: без него личность запроса пуста и
	// маршрут отвечает 401 вместо проверяемых состояний.
	app.addHook("onRequest", async (request) => {
		getRequestIdentity(request);
	});
	await registerVisitRoutes(app);
	await app.ready();
});

after(async () => {
	await app?.close();
	await purgeFixtureOrganizations(FIXTURE_ORGANIZATION_IDS);
	const leftovers = await db.execute<{ rows_left: number }>(sql`
		select (
			(select count(*) from organizations where id in (${OWN_ORGANIZATION_ID}::uuid, ${OTHER_ORGANIZATION_ID}::uuid))
			+ (select count(*) from visits where organization_id in (${OWN_ORGANIZATION_ID}::uuid, ${OTHER_ORGANIZATION_ID}::uuid))
			+ (select count(*) from patients where organization_id in (${OWN_ORGANIZATION_ID}::uuid, ${OTHER_ORGANIZATION_ID}::uuid))
		)::int as rows_left`);
	assert.equal(
		leftovers.rows[0]?.rows_left,
		0,
		"Сторож не убрал свои строки из живой базы. Оставленные фикстуры читаются следующим прогоном как " +
			"данные клиники и дают ложный провал в чужом сценарии — так уже было.",
	);
	await pool.end();
});

describe("GET /api/visits/:visitId/draft/autosave: отказ называет состояние приёма", () => {
	it("подписанный приём ЕСТЬ в базе в тот же момент, когда маршрут отвечает отказом", async () => {
		const refusal = await readDraft(OWN_ORGANIZATION_ID, SIGNED_VISIT_ID);

		// Сверка НЕЗАВИСИМАЯ: своим SQL, а не тем же маршрутом. Без неё «приём есть»
		// оставалось бы утверждением теста о самом себе.
		const stored = await db.execute<{
			id: string;
			status: string;
			revision: number;
			signed_at: string | null;
			no_draft: boolean;
		}>(sql`select id::text as id, status::text as status, revision, signed_at::text as signed_at,
		              draft_autosave is null as no_draft
		         from visits where id = ${SIGNED_VISIT_ID}::uuid`);
		assert.equal(
			stored.rows.length,
			1,
			"Посев не состоялся: подписанного приёма нет в базе, и проверять «сервер врёт о существующем приёме» не на чем.",
		);
		assert.equal(stored.rows[0]?.status, "signed");
		assert.equal(stored.rows[0]?.no_draft, true, "У подписанного приёма фикстуры не должно быть черновика.");

		assert.ok(
			!/не найден/i.test(refusal.message),
			`Сервер сказал «не найден» о приёме, который в базе ЕСТЬ (status=${stored.rows[0]?.status}, ` +
				`revision=${stored.rows[0]?.revision}, signed_at=${stored.rows[0]?.signed_at}). Для человека за стойкой ` +
				`это «приём потерялся»: он начинает искать запись, которой ничего не угрожает. Ответ: ${refusal.body}`,
		);
		assert.notEqual(
			refusal.error,
			"VisitNotFound",
			`Машинный код отказа утверждает отсутствие приёма, который есть. Ответ: ${refusal.body}`,
		);
	});

	it("отказ по подписанному приёму называет причину и следующий шаг", async () => {
		const refusal = await readDraft(OWN_ORGANIZATION_ID, SIGNED_VISIT_ID);

		assert.match(refusal.message, /[А-Яа-яЁё]/, `Отказ обязан быть по-русски: ${refusal.body}`);
		assert.ok(
			namesCause(refusal.message, /подписан/i),
			`Отказ не называет ПРИЧИНУ. Правда об этом состоянии одна: приём подписан, поэтому черновика у него ` +
				`нет. Пришло: «${refusal.message}»`,
		);
		assert.ok(
			namesNextStep(refusal.message),
			`Отказ не называет ДЕЙСТВИЕ. Отказ без следующего шага — это код ответа русскими словами, то есть тот ` +
				`же дефект: врач у кресла жмёт одно и то же, пока не позовёт администратора. Пришло: «${refusal.message}»`,
		);
		assert.ok(
			!/выберите актуальный прием/i.test(refusal.message),
			"Отказ предлагает выбрать актуальный приём. Выбирать нечего: приём на месте, он подписан, а других " +
				"черновиков в клинике может не быть вовсе — на демо-клинике их ноль при десяти подписанных приёмах.",
		);
	});

	it("аннулированный приём получает свою причину, а не причину подписанного", async () => {
		const voided = await readDraft(OWN_ORGANIZATION_ID, VOIDED_VISIT_ID);
		const signed = await readDraft(OWN_ORGANIZATION_ID, SIGNED_VISIT_ID);

		assert.ok(
			namesCause(voided.message, /аннулир/i),
			`Аннулированный приём назван не своей причиной: «${voided.message}». Подписанный дописывают новым ` +
				"приёмом, аннулированный не дописывают вовсе — это разные действия, значит и разные тексты.",
		);
		assert.ok(namesNextStep(voided.message), `Отказ по аннулированному приёму без действия: «${voided.message}»`);
		assert.notEqual(
			voided.message,
			signed.message,
			"Аннулированный и подписанный приём получили один текст. Слияние состояний в один отказ — это тот " +
				"самый дефект, только на одну ступень мельче.",
		);
		assert.notEqual(voided.reason, signed.reason, "Машинная причина у двух разных состояний совпала.");
	});

	it("отсутствующий приём и существующий получают РАЗНЫЕ ответы", async () => {
		const absent = await readDraft(OWN_ORGANIZATION_ID, ABSENT_VISIT_ID);
		const signed = await readDraft(OWN_ORGANIZATION_ID, SIGNED_VISIT_ID);

		// Про отсутствующий приём «не найден» — правда, и трогать её не нужно.
		const absentCount = await db.execute<{ n: number }>(
			sql`select count(*)::int as n from visits where id = ${ABSENT_VISIT_ID}::uuid`,
		);
		assert.equal(absentCount.rows[0]?.n, 0, "Приём, объявленный отсутствующим, оказался в базе — проверка не о том.");
		assert.equal(absent.error, "VisitNotFound", `Отсутствующий приём обязан называться ненайденным: ${absent.body}`);
		assert.ok(namesNextStep(absent.message), `Отказ по отсутствующему приёму без действия: «${absent.message}»`);

		assert.notEqual(
			absent.message,
			signed.message,
			"«Приёма нет вовсе» и «приём есть, он подписан» получили один и тот же текст. Это и есть исходный " +
				"дефект: одно из двух утверждений обязано быть ложью, и врёт оно про существующий приём.",
		);
		assert.notEqual(
			absent.error,
			signed.error,
			"Два разных состояния базы отдают один машинный код. Клиент по нему ветвиться не может, а следующий " +
				"инженер прочитает «не найден» и пойдёт искать пропавшую строку.",
		);
	});

	it("приём чужой клиники не подтверждается ни существованием, ни статусом", async () => {
		const foreign = await readDraft(OTHER_ORGANIZATION_ID, SIGNED_VISIT_ID);

		assert.equal(
			foreign.error,
			"VisitNotFound",
			`Чужой приём обязан отвечать «не найден»: подтвердить его существование другой клинике нельзя. ` +
				`Ответ: ${foreign.body}`,
		);
		assert.ok(
			!/подписан|аннулир/i.test(foreign.message),
			`Чужой клинике назван СТАТУС приёма — это утечка факта о приёме другой организации: ${foreign.body}`,
		);
		assert.ok(
			!foreign.body.includes(SIGNED_VISIT_ID),
			`Ответ чужой клинике содержит идентификатор приёма своей: ${foreign.body}`,
		);
	});

	it("рабочий путь не сломан: у черновика черновик по-прежнему отдаётся", async () => {
		const response = await app.inject({
			method: "GET",
			url: `/api/visits/${DRAFT_VISIT_ID}/draft/autosave`,
			headers: headersFor(OWN_ORGANIZATION_ID),
		});
		assert.equal(
			response.statusCode,
			200,
			`Черновик приёма перестал открываться — правка задела верный путь: ${response.body.slice(0, 300)}`,
		);
		const body = JSON.parse(response.body) as { serverDraft?: { visitId?: string; draft?: { complaint?: string } } };
		assert.equal(body.serverDraft?.visitId, DRAFT_VISIT_ID, "Черновик отдан не по тому приёму.");
		assert.equal(
			body.serverDraft?.draft?.complaint,
			"плановый осмотр",
			"Заготовка черновика собирается из полей САМОГО приёма; жалоба потерялась.",
		);
	});
});
