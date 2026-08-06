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
 *   1. Клиника без приёмов получает `activeVisit: null` — РОВНО `null`, а не
 *      заготовку с нулевым идентификатором и не любой другой неразрешимый uuid.
 *      Идентификатор приёма, если он есть, обязан РАЗРЕШАТЬСЯ в строку `visits`
 *      этой клиники. Третьего быть не может.
 *   2. Поле `activeVisit` в ответе ПРИСУТСТВУЕТ. `null` — это утверждение
 *      «открытого приёма нет»; отсутствие поля — молчание, которое не отличить от
 *      «сервер не посчитал».
 *   3. Ответ проходит `dashboardSchema` разбором. Это и есть доказательство, что
 *      контракт теперь УМЕЕТ сказать «приёма нет»: пока `activeVisit` был
 *      объявлен без `.nullable()`, разбор такого ответа падал, и сервер выдумывал
 *      приём просто потому, что сказать правду ему было нечем.
 *   4. Два соседних чтения совпадают целиком. Сервер не сообщает, что
 *      несуществующий приём изменён.
 *   5. Изменяющие маршруты приёма, получив нулевой идентификатор, отвечают
 *      отказом, который называет ПРИЧИНУ и ДЕЙСТВИЕ, а не «приём не найден,
 *      выберите актуальный». Эти две проверки остаются нужными и после того, как
 *      сводка перестала выдавать метку: нулевой идентификатор всё ещё может
 *      прийти от клиента со СТАРОЙ сводкой в памяти, и «приём не найден» — ложь
 *      про приём, которого никто не терял.
 *   6. Рабочий путь не сломан: как только приём в клинике есть, `activeVisit` —
 *      это НАСТОЯЩАЯ строка базы.
 *
 * ЧЕГО ЗДЕСЬ БОЛЬШЕ НЕТ И ПОЧЕМУ. До правки этот файл ТРЕБОВАЛ метку: он
 * проверял, что неразрешимый идентификатор равен ровно нулевому ууиду, и что
 * поля заготовки пусты. Требование было верным на тот день и названо честно —
 * убрать метку мешали две вещи вне области того прогона:
 *   * `dashboardSchema` объявлял `activeVisit: visitSchema` без `.nullable()`, а
 *     `visitSchema.id` — `z.string().uuid()`, который не принимает ни `null`, ни
 *     пустую строку;
 *   * клиент разыменовывал `dashboard.activeVisit.appointmentId` БЕЗ `?.`
 *     (`apps/web/src/components/schedule/AppointmentCard.tsx`) — на `null`
 *     карточка расписания падала при отрисовке, а с ней весь экран расписания.
 * Обе закрыты, поэтому требование перевёрнуто: теперь красным становится сама
 * выдумка. Утверждения не ослаблены — их стало больше, и метка из разрешённого
 * значения превратилась в запрещённое.
 *
 * ТРЕБУЕТСЯ живая PostgreSQL (DATABASE_URL из apps/api/.env).
 * ЗАПУСК: cd apps/api && npx tsx --test src/tests/routes/dashboardActiveVisitIsNotFabricated.test.ts
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { dashboardSchema } from "@dental/shared";
import { sql } from "drizzle-orm";
import { type FastifyInstance } from "fastify";
import { denteAdminSecretHeader } from "../../accessGuard.js";
import { db, pool } from "../../db/client.js";
import { withSuperuserBypass } from "../../db/rls.js";
import { organizations, patients, visits } from "../../db/schema.js";
import { registerDashboardRoutes } from "../../routes/dashboard.js";
import { registerVisitRoutes } from "../../routes/visits.js";
import { authTokenSecret, clinicalAdminSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid, purgeFixtureOrganizations, withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * Нулевой идентификатор — теперь ЗАПРЕЩЁННОЕ значение в сводке, а не разрешённая
 * метка. Записан здесь ЛИТЕРАЛОМ, а не импортом из проверяемого кода: константа,
 * использованная и в ответе, и в ожидании, подтверждает саму себя.
 *
 * Ниже он нужен дважды: как значение, которого в сводке быть НЕ должно, и как
 * идентификатор, который клиент со старой сводкой в памяти всё ещё присылает в
 * изменяющие маршруты приёма.
 */
const NIL_VISIT_ID = "00000000-0000-0000-0000-000000000000";

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

/**
 * Читает сводку и отдаёт поле `activeVisit` как есть — включая `null`.
 *
 * Присутствие ключа проверяется здесь же: `null` обязан быть НАПИСАН, а не
 * получиться из отсутствия поля. Для клиента это разные ответы — «приёма нет» и
 * «про приём не сказано».
 */
async function readActiveVisit(organizationId: string): Promise<ActiveVisit | null> {
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
	const parsed = JSON.parse(response.body) as Record<string, unknown>;
	assert.ok(
		Object.hasOwn(parsed, "activeVisit"),
		"В сводке НЕТ ключа activeVisit вовсе. Контракт объявляет поле обязательным и разрешает ему " +
			"быть только `null`: отсутствие поля — молчание, которое клиент не отличит от «сервер не " +
			"посчитал», а `null` — утверждение «открытого приёма нет».",
	);
	const active = parsed.activeVisit;
	assert.ok(
		active === null || (typeof active === "object" && !Array.isArray(active)),
		`Поле activeVisit не приём и не null, а ${JSON.stringify(active)}.`,
	);

	/*
	 * Разбор контрактом стоит здесь, а не отдельным утверждением: он обязан
	 * проходить на КАЖДОМ чтении, которое делает этот файл, включая рабочий путь.
	 * Пока `activeVisit` был объявлен без `.nullable()`, ответ с `null` не прошёл
	 * бы разбор — именно поэтому сервер и выдумывал приём.
	 */
	const contract = dashboardSchema.safeParse(parsed);
	assert.ok(
		contract.success,
		"Сводка не проходит собственный контракт dashboardSchema: " +
			JSON.stringify(contract.success ? [] : contract.error.issues.slice(0, 6)),
	);

	return active as ActiveVisit | null;
}

/** Есть ли в базе строка приёма с таким идентификатором у этой клиники. */
async function visitRowExists(organizationId: string, visitId: string): Promise<number> {
	// Счёт идёт под тенант-контекстом этой клиники: под FORCE RLS чтение без
	// `app.current_tenant` возвращает ноль строк молча, и «приём разрешается в
	// строку visits» доказывалось бы нулём при любом состоянии базы.
	const found = await withFixtureTenant(organizationId, async (tx) =>
		tx.execute<{ n: number }>(sql`
			select count(*)::int as n from visits
			 where id = ${visitId}::uuid and organization_id = ${organizationId}::uuid`),
	);
	return found.rows[0]?.n ?? 0;
}

before(async () => {
	// Уборка НА ВХОДЕ: прогон, убитый снаружи, до `after` не доходит, и его строки
	// в живой базе следующий прогон читает как данные клиники.
	await purgeFixtureOrganizations(FIXTURE_ORGANIZATION_IDS);

	/*
	 * Сев идёт ПО КЛИНИКАМ, каждая под своим тенант-контекстом. `app.current_tenant`
	 * хранит ровно одного арендатора, а в WITH CHECK у `organizations` стоит
	 * `id = current_tenant`: одним оператором на массив из двух организаций вставка
	 * отвергается кодом 42501. Пациент и приём — строки клиники с приёмом, поэтому
	 * сеются под её контекстом.
	 */
	await withFixtureTenant(EMPTY_ORGANIZATION_ID, async () => {
		await db
			.insert(organizations)
			.values({ id: EMPTY_ORGANIZATION_ID, name: "Сторож нулевого приёма — клиника без приёмов" });
	});
	await withFixtureTenant(STAFFED_ORGANIZATION_ID, async () => {
		await db
			.insert(organizations)
			.values({ id: STAFFED_ORGANIZATION_ID, name: "Сторож нулевого приёма — клиника с приёмом" });
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
	});

	// Те же два хука, что вешает боевой server.ts: без них обработчик сводки идёт
	// без тенант-контекста и читает ноль строк у клиники, которую только что засеяли.
	app = createTenantTestApp();
	await registerDashboardRoutes(app);
	await registerVisitRoutes(app);
	await app.ready();
});

after(async () => {
	await app?.close();
	await purgeFixtureOrganizations(FIXTURE_ORGANIZATION_IDS);
	/*
	 * Остаток считается ПОД ОБХОДОМ, и только читается. Под контекстом своего
	 * арендатора этот счёт бесполезен по построению: он не отличит «строку
	 * удалили» от «строку скрыла политика», то есть всегда отвечал бы нулём и
	 * подтверждал бы сам себя. Обход накрывает одно чтение трёх счётчиков.
	 */
	const leftovers = await withSuperuserBypass(async (tx) =>
		tx.execute<{ rows_left: number }>(sql`
			select (
				(select count(*) from organizations where id in (${EMPTY_ORGANIZATION_ID}::uuid, ${STAFFED_ORGANIZATION_ID}::uuid))
				+ (select count(*) from visits where organization_id in (${EMPTY_ORGANIZATION_ID}::uuid, ${STAFFED_ORGANIZATION_ID}::uuid))
				+ (select count(*) from patients where organization_id in (${EMPTY_ORGANIZATION_ID}::uuid, ${STAFFED_ORGANIZATION_ID}::uuid))
			)::int as rows_left`),
	);
	assert.equal(
		leftovers.rows[0]?.rows_left,
		0,
		"Сторож не убрал свои строки из живой базы. За прошлым агентом их убирали руками, и его следы " +
			"дали ложный провал в чужом сквозном сценарии.",
	);
	await pool.end();
});

describe("GET /api/dashboard: приём в сводке либо есть в базе, либо назван отсутствующим", () => {
	it("клиника без приёмов: сводка отдаёт РОВНО null, а не выдуманный приём", async () => {
		// Посев проверяется отдельно: без этого «приёмов нет» было бы допущением.
		const seeded = await withFixtureTenant(EMPTY_ORGANIZATION_ID, async (tx) =>
			tx.execute<{ n: number }>(
				sql`select count(*)::int as n from visits where organization_id = ${EMPTY_ORGANIZATION_ID}::uuid`,
			),
		);
		assert.equal(seeded.rows[0]?.n, 0, "У клиники фикстуры не должно быть ни одного приёма.");

		const active = await readActiveVisit(EMPTY_ORGANIZATION_ID);

		assert.equal(
			active,
			null,
			`У клиники ноль приёмов, а сводка отдала объект приёма ${JSON.stringify(active)}. ` +
				"Любой приём здесь — выдумка: разрешиться в строку базы он не может, потому что строк нет. " +
				"Непустой идентификатор проходит клиентские сторожа `if (!dashboard?.activeVisit?.id) return;` " +
				"как настоящий и уезжает с врачом в кассу и в документы.",
		);
	});

	it("нулевой идентификатор приёма в сводке запрещён отдельным утверждением", async () => {
		/*
		 * Отдельная проверка, а не следствие предыдущей: `null` мог бы вернуться, а
		 * нулевой ууид — уехать в другое поле сводки. Здесь ищется САМА СТРОКА в
		 * теле ответа на месте приёма, чтобы правка «вернули заготовку, но под
		 * другим именем» тоже краснела.
		 */
		const response = await app.inject({
			method: "GET",
			url: "/api/dashboard",
			headers: headersFor(EMPTY_ORGANIZATION_ID),
		});
		const parsed = JSON.parse(response.body) as { activeVisit?: unknown };
		const printed = JSON.stringify(parsed.activeVisit ?? null);

		assert.ok(
			!printed.includes(NIL_VISIT_ID),
			`На месте приёма в сводке стоит нулевой идентификатор: ${printed}. Это тот же запрещённый класс, ` +
				"что и неизвестное, напечатанное нулём (tests/unknownIsNotZero.test.ts) — только напечатали не " +
				"сумму денег, а идентификатор записи, и от настоящего он не отличается ничем.",
		);
		assert.equal(
			await visitRowExists(EMPTY_ORGANIZATION_ID, NIL_VISIT_ID),
			0,
			"Строка приёма с нулевым идентификатором ЕСТЬ в базе. Тогда проверка не о том, и её надо переписать.",
		);
	});

	it("сервер не сообщает, что несуществующий приём изменён: два чтения совпадают", async () => {
		const first = await readActiveVisit(EMPTY_ORGANIZATION_ID);
		// Пауза больше разрешения часов: иначе «совпало» могло бы означать лишь то,
		// что два запроса уложились в одну миллисекунду.
		await new Promise((resolve) => setTimeout(resolve, 30));
		const second = await readActiveVisit(EMPTY_ORGANIZATION_ID);

		assert.deepEqual(
			second,
			first,
			"Ответ про отсутствующий приём отличается между двумя соседними чтениями одной клиники. " +
				"Про несуществующий приём двух разных ответов быть не может. До правки здесь расходилось " +
				"время изменения: клиент читает его как отметку свежести серверной записи и сравнивает со " +
				"временем ЛОКАЛЬНО сохранённого черновика врача — пока сервер отвечает «изменён сейчас», " +
				"серверная отметка новее любой локальной всегда, и набранное врачом не восстанавливается никогда.",
		);
		assert.equal(second, null, "Оба чтения совпали, но не на `null`. Совпадение выдумки — всё ещё выдумка.");
	});

	it("рабочий путь не сломан: при живом приёме сводка отдаёт НАСТОЯЩУЮ строку базы", async () => {
		const active = await readActiveVisit(STAFFED_ORGANIZATION_ID);

		assert.ok(
			active,
			"У клиники есть черновик приёма, а сводка отдала `null`. Правка сломала главный экран: врач не " +
				"откроет карту приёма, а касса не примет оплату по нему.",
		);
		const id = String(active.id ?? "");
		assert.notEqual(id, NIL_VISIT_ID, "Настоящий приём подменён нулевым идентификатором.");
		assert.equal(
			await visitRowExists(STAFFED_ORGANIZATION_ID, id),
			1,
			`Идентификатор приёма из сводки «${id}» не разрешается в строку visits этой клиники. Именно это ` +
				"правило и охраняет весь файл: сводка обязана называть приём, который есть.",
		);
		assert.equal(active.id, REAL_VISIT_ID, "Сводка назвала не тот приём, что посеян.");
		assert.equal(active.complaint, "скол пломбы 46", "Настоящие поля приёма потерялись по дороге в сводку.");
		assert.equal(active.status, "draft");
		assert.equal(
			active.organizationId,
			STAFFED_ORGANIZATION_ID,
			"Приём в сводке принадлежит ДРУГОЙ клинике. Доменные коллекции общие на процесс, и это ровно тот " +
				"путь, которым в ответ попадали реквизиты последней прочитанной чужой клиники.",
		);
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
		patientId: NIL_VISIT_ID,
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
			url: `/api/visits/${NIL_VISIT_ID}/draft/${suffix}`,
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
		const before = await withFixtureTenant(EMPTY_ORGANIZATION_ID, async (tx) =>
			tx.execute<{ n: number }>(
				sql`select count(*)::int as n from visits where organization_id = ${EMPTY_ORGANIZATION_ID}::uuid`,
			),
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

		const after = await withFixtureTenant(EMPTY_ORGANIZATION_ID, async (tx) =>
			tx.execute<{ n: number }>(
				sql`select count(*)::int as n from visits where organization_id = ${EMPTY_ORGANIZATION_ID}::uuid`,
			),
		);
		assert.equal(
			after.rows[0]?.n,
			before.rows[0]?.n,
			"Отказ по метке «приёма нет» изменил число приёмов клиники. Подписание не смеет создавать приём.",
		);
	});
});
