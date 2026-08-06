/**
 * Сторож входа в программу: сессия, чья клиника отсутствует в базе, обязана
 * получить отказ, а не выдуманную клинику.
 *
 * ЧТО СЛОМАЛОСЬ 29.07.2026 И ПОЧЕМУ ЭТОТ ФАЙЛ ПОЯВИЛСЯ
 *
 * В программу нельзя было войти. Экран разблокировки смены сообщал «В клинике
 * пока нет ни одного действующего сотрудника. Добавьте людей в разделе
 * «Настройки → Кадры»», хотя в базе сотрудники были и все были действующими.
 * Дальше этого экрана пройти нельзя: без сотрудника смену не открыть, а значит
 * недоступен ни один раздел.
 *
 * Причина оказалась не в кадрах и не в заголовках доступа. Токен кабинета
 * назывался организацией, которой в базе НЕТ (её удалили при пересеве, либо
 * токен выдан для другой установки программы). GET /api/dashboard отвечал на
 * такую сессию HTTP 200 и телом «клиника без сотрудников и без пациентов»:
 * db/domainStateHydration.ts складывал «Организация не найдена в базе» в
 * report.warnings, а db/dashboardQuery.ts всего лишь печатал предупреждение в
 * журнал сервера и отдавал сводку. Отказ был превращён в пустоту, и экран
 * пересказал пустоту как «сотрудников нет».
 *
 * ВТОРОЕ, ЧТО ДЕЛАЛ ТОТ ЖЕ ОТВЕТ, и оно опаснее закрытого входа. Доменные
 * коллекции в sampleData.ts общие на процесс. Сотрудники и пациенты в них
 * заменялись пустыми списками, а clinicProfile НЕ сбрасывался — ветка «else»
 * только добавляла предупреждение. Поэтому сессия несуществующей клиники
 * получала реквизиты ПОСЛЕДНЕЙ прочитанной чужой клиники: её название, ИНН и
 * ОГРН. Измерено в живом браузере: токен организации
 * 00000000-0000-0000-0000-000000000001 получил profile.organizationId
 * 4a3420d1-…, clinicName «Стоматология, 1 кабинет», inn 631234567890.
 * Из clinicSettings.profile печатаются договоры, счета и справки для налогового
 * вычета — то есть чужой ИНН уходил в документы.
 *
 * ЧТО ОХРАНЯЕТСЯ ЗДЕСЬ
 *   1. Сессия с организацией, которой нет в базе, получает отказ, а не 200.
 *   2. В теле отказа нет реквизитов чужой клиники.
 *   3. Настоящая клиника по-прежнему получает своих сотрудников — иначе
 *      «починка» закрыла бы вход всем.
 *   4. Отказ не портит общее состояние процесса: следующий запрос настоящей
 *      клиники снова видит своих людей.
 *
 * ТРЕБУЕТСЯ живая PostgreSQL (DATABASE_URL из apps/api/.env).
 * ЗАПУСК: cd apps/api && npx tsx --test src/tests/routes/dashboardOrphanClinicSession.test.ts
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import { type FastifyInstance } from "fastify";
import { db, pool } from "../../db/client.js";
import { withSuperuserBypass } from "../../db/rls.js";
import { organizations, users } from "../../db/schema.js";
import { registerDashboardRoutes } from "../../routes/dashboard.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * Имя своей организации вынесено в константу: по нему же идёт уборка следов
 * прерванного прогона. Сверка на точное равенство, без LIKE, чтобы клиника с
 * похожим названием не попала под удаление.
 */
const GUARD_ORGANIZATION_NAME = "Сторож входа — клиника с людьми";
const GUARD_DOCTOR_NAME = "Сторожевой врач смены";

/**
 * Организация, которой в базе нет. Не «случайный» uuid, а осознанно
 * зарезервированный: если он однажды окажется в базе, тест обязан упасть на
 * посеве, а не тихо проверять не то, что написано.
 */
const ABSENT_ORGANIZATION_ID = "0f0f0f0f-0000-4000-8000-00000000f0f0";

let app: FastifyInstance;
let organizationId = "";
let doctorUserId = "";

interface DashboardBody {
	clinicName?: unknown;
	clinicSettings?: {
		profile?: { organizationId?: unknown; clinicName?: unknown; inn?: unknown };
		staff?: unknown;
	};
}

async function requestDashboard(
	orgId: string,
): Promise<{ status: number; body: string; parsed: DashboardBody | null }> {
	const clinicToken = signToken({ organizationId: orgId }, authTokenSecret());
	const response = await app.inject({
		method: "GET",
		url: "/api/dashboard",
		headers: { "x-dente-clinic-token": clinicToken },
	});
	let parsed: DashboardBody | null = null;
	try {
		parsed = JSON.parse(response.body) as DashboardBody;
	} catch {
		parsed = null;
	}
	return { status: response.statusCode, body: response.body, parsed };
}

function staffNames(parsed: DashboardBody | null): string[] {
	const staff = parsed?.clinicSettings?.staff;
	if (!Array.isArray(staff)) return [];
	return staff.map((member) =>
		String((member as { fullName?: unknown })?.fullName ?? ""),
	);
}

before(async () => {
	/*
	 * Следы прерванного прогона удаляются ДО посева: прогон, убитый снаружи, не
	 * доходит до after, и его организация осталась бы в живой базе навсегда.
	 *
	 * ПОИСК идёт под обходом, УДАЛЕНИЕ — под контекстом найденной клиники. Под
	 * FORCE RLS выборка по имени без `app.current_tenant` возвращает ноль строк
	 * при любом содержимом таблицы, то есть цикл ниже не выполнился бы ни разу и
	 * молча отчитался об уборке. Обход накрывает РОВНО чтение списка: под ним
	 * DELETE не ограничен арендатором и одной опечаткой в предикате снёс бы
	 * данные соседней клиники.
	 */
	const stale = await withSuperuserBypass(async (tx) =>
		tx
			.select({ id: organizations.id })
			.from(organizations)
			.where(eq(organizations.name, GUARD_ORGANIZATION_NAME)),
	);
	for (const row of stale) {
		await withFixtureTenant(row.id, async () => {
			await db.delete(users).where(eq(users.organizationId, row.id));
			await db.delete(organizations).where(eq(organizations.id, row.id));
		});
	}

	const absent = await withSuperuserBypass(async (tx) =>
		tx
			.select({ id: organizations.id })
			.from(organizations)
			.where(eq(organizations.id, ABSENT_ORGANIZATION_ID)),
	);
	assert.equal(
		absent.length,
		0,
		`Организация ${ABSENT_ORGANIZATION_ID} внезапно есть в базе — тест проверял бы не то, что написано. Возьмите другой идентификатор.`,
	);

	/*
	 * Идентификатор клиники выдаётся ДО вставки, а не берётся из вставленной
	 * строки. Курицы и яйца здесь нет: в WITH CHECK у `organizations` стоит
	 * `id = current_tenant`, поэтому вставить организацию можно только под её
	 * собственным контекстом, а он задаётся строковым параметром сеанса. Тот же
	 * приём применён в боевой регистрации (routes/auth.ts).
	 */
	organizationId = randomUUID();
	const [organization] = await withFixtureTenant(organizationId, async () =>
		db
			.insert(organizations)
			.values({ id: organizationId, name: GUARD_ORGANIZATION_NAME })
			.returning({ id: organizations.id }),
	);
	assert.ok(
		organization,
		"Посев не состоялся: организация сторожа не создана.",
	);
	organizationId = organization.id;

	const [doctor] = await withFixtureTenant(organizationId, async () =>
		db
			.insert(users)
			.values({
				organizationId,
				fullName: GUARD_DOCTOR_NAME,
				role: "doctor",
				isActive: true,
			})
			.returning({ id: users.id }),
	);
	assert.ok(doctor, "Посев не состоялся: сотрудник сторожа не создан.");
	doctorUserId = doctor.id;

	// Те же два хука, что вешает боевой server.ts: без второго обработчик сводки
	// идёт без тенант-контекста и не видит ни одного сотрудника настоящей клиники.
	app = createTenantTestApp();
	await registerDashboardRoutes(app);
	await app.ready();
});

after(async () => {
	await app?.close();
	if (organizationId) {
		await withFixtureTenant(organizationId, async () => {
			await db.delete(users).where(eq(users.organizationId, organizationId));
			await db.delete(organizations).where(eq(organizations.id, organizationId));
		});
	}
	await pool.end();
});

describe("GET /api/dashboard: сессия несуществующей клиники", () => {
	it("настоящая клиника получает своих сотрудников — вход открыт", async () => {
		const response = await requestDashboard(organizationId);
		assert.equal(
			response.status,
			200,
			`Настоящая клиника не получила сводку: ${response.body.slice(0, 300)}`,
		);
		assert.ok(
			staffNames(response.parsed).includes(GUARD_DOCTOR_NAME),
			`Сотрудник клиники не пришёл в ответе, войти в смену нечем. Пришло: ${JSON.stringify(staffNames(response.parsed))}`,
		);
		assert.equal(
			response.parsed?.clinicSettings?.profile?.organizationId,
			organizationId,
		);
	});

	it("клиника, которой нет в базе, получает отказ, а не пустую клинику", async () => {
		const response = await requestDashboard(ABSENT_ORGANIZATION_ID);
		assert.notEqual(
			response.status,
			200,
			"Сессия несуществующей клиники получила HTTP 200. Это и закрывает вход в программу: " +
				"экран смены прочитает пустой список сотрудников как «сотрудников нет» и внутрь не пустит. " +
				`Тело ответа: ${response.body.slice(0, 400)}`,
		);
		assert.ok(
			response.status === 401 || response.status === 403,
			`Ожидался отказ по доступу (401/403), пришло ${response.status}: ${response.body.slice(0, 300)}`,
		);
	});

	it("отказ называет причину по-русски и говорит, что делать", async () => {
		const response = await requestDashboard(ABSENT_ORGANIZATION_ID);
		const message = String(
			(response.parsed as { message?: unknown } | null)?.message ?? "",
		);
		assert.match(
			message,
			/[А-Яа-яЁё]/,
			`Отказ обязан быть по-русски, пришло: ${response.body.slice(0, 300)}`,
		);
		assert.match(
			message,
			/не найдена|не найдено|отсутствует/i,
			`Отказ обязан называть причину — клиники нет в базе. Пришло: ${message}`,
		);
		assert.match(
			message,
			/войдите|войти/i,
			`Отказ обязан называть действие — войти заново. Пришло: ${message}`,
		);
	});

	it("в отказе нет реквизитов чужой клиники", async () => {
		// Сначала читаем настоящую клинику: именно так её реквизиты попадали в
		// общее состояние процесса и утекали в следующий ответ.
		const real = await requestDashboard(organizationId);
		assert.equal(real.status, 200);

		const orphan = await requestDashboard(ABSENT_ORGANIZATION_ID);
		assert.ok(
			!orphan.body.includes(GUARD_ORGANIZATION_NAME),
			`Ответ несуществующей клинике содержит название чужой клиники «${GUARD_ORGANIZATION_NAME}». ` +
				`Из этих реквизитов печатаются договоры и справки. Тело: ${orphan.body.slice(0, 400)}`,
		);
		assert.ok(
			!orphan.body.includes(GUARD_DOCTOR_NAME),
			`Ответ несуществующей клинике содержит сотрудника чужой клиники. Тело: ${orphan.body.slice(0, 400)}`,
		);
	});

	it("после отказа настоящая клиника снова видит своих людей", async () => {
		await requestDashboard(ABSENT_ORGANIZATION_ID);
		const response = await requestDashboard(organizationId);
		assert.equal(
			response.status,
			200,
			`После отказа настоящая клиника перестала грузиться: ${response.body.slice(0, 300)}`,
		);
		assert.ok(
			staffNames(response.parsed).includes(GUARD_DOCTOR_NAME),
			`После отказа сотрудники настоящей клиники пропали: ${JSON.stringify(staffNames(response.parsed))}`,
		);
		assert.ok(
			doctorUserId.length > 0,
			"Идентификатор посеянного сотрудника потерян — уборка не сработает.",
		);
	});
});
