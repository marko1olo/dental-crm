/**
 * ЖИВОЕ ДОКАЗАТЕЛЬСТВО ИЗОЛЯЦИИ КЛИНИК: попытка прочитать и записать данные
 * чужой организации со своим подписанным токеном.
 *
 * Это НЕ юнит-тест (имя без `.test.ts`, `npm test` его не подхватывает) —
 * измерительный прибор для разведки `.agents/lead/recon-cross-tenant.md`.
 * Образец формы взят с `src/tests/routes/doctorPayoutsProof.ts`.
 *
 * ЗАПУСК (cwd apps/api — из него загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx src/tests/security/crossTenantReconProof.ts
 *
 * ПОЧЕМУ app.inject, А НЕ ЖИВОЙ СЕРВЕР НА 4100. Процесс на 4100 держит другой
 * исполнитель под `tsx watch`, и его сборка бывает старше дерева: 404 или 403
 * через него не доказывает ничего о текущем коде. Здесь маршруты
 * регистрируются в своём экземпляре Fastify из текущих файлов.
 *
 * ЧТО СЕЕТСЯ. Две организации из тестового пространства `dce70000-…`
 * (`fixtureUuid`), поэтому чужие тесты и данные клиник не задеваются, а уборка
 * идёт по каталогу базы через `purgeFixtureOrganizations`. Уборка вызывается и
 * на входе, и в finally: прогон, убитый снаружи, до finally не доходит.
 *
 * НИЧЕГО НЕ ЧИНИТ. Скрипт только измеряет и печатает фактические ответы.
 */

import { and, eq, sql } from "drizzle-orm";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";
import { db, pool } from "../../db/client.js";
import { appointments, chairs, clinics, organizations, patients, users } from "../../db/schema.js";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { inventoryRoutes } from "../../routes/inventory.js";
import registerToothHistoryRoutes from "../../routes/toothHistory.js";
import { registerWaitlistRoutes } from "../../routes/waitlist.js";
import { registerFamilyFinanceRoutes } from "../../routes/finance_family.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { getRequestIdentity } from "../../security/identity.js";
import { signToken } from "../../utils/cryptoHelper.js";
import { fixtureUuid, isDatabaseUnavailable, purgeFixtureOrganizations } from "../support/fixtureOrganizations.js";

const NAMESPACE = "crossTenantReconProof";

const ORG_A = fixtureUuid(NAMESPACE, 1);
const ORG_B = fixtureUuid(NAMESPACE, 2);
const CLINIC_A = fixtureUuid(NAMESPACE, 3);
const CHAIR_A = fixtureUuid(NAMESPACE, 4);
const DOCTOR_A = fixtureUuid(NAMESPACE, 5);
const PATIENT_A = fixtureUuid(NAMESPACE, 6);
const CLINIC_B = fixtureUuid(NAMESPACE, 7);
const CHAIR_B = fixtureUuid(NAMESPACE, 8);
const DOCTOR_B = fixtureUuid(NAMESPACE, 9);
const PATIENT_B = fixtureUuid(NAMESPACE, 10);

/** ФИО чужого пациента намеренно уникально: его видно в любом ответе поиском. */
const FOREIGN_PATIENT_NAME = "Тайнов Секрет Чужойклиникович";
const FOREIGN_PATIENT_PHONE = "+79990001122";

type Verdict = "УТЕЧКА" | "ЗАКРЫТО" | "СПРАВКА";

let leaks = 0;

function report(verdict: Verdict, label: string, detail: string): void {
	if (verdict === "УТЕЧКА") leaks += 1;
	console.log(`[${verdict}] ${label}\n        ${detail}`);
}

/** Есть ли в ответе ФИО или телефон чужого пациента. */
function carriesForeignIdentity(body: string): boolean {
	return body.includes(FOREIGN_PATIENT_NAME) || body.includes(FOREIGN_PATIENT_PHONE);
}

async function buildApp(): Promise<FastifyInstance> {
	const app = Fastify();
	// Тот же хук, что в apps/api/src/server.ts: он наполняет request.user.
	app.addHook("onRequest", async (request) => {
		getRequestIdentity(request);
	});
	await registerScheduleRoutes(app);
	await registerPatientRoutes(app);
	await registerToothHistoryRoutes(app);
	await registerWaitlistRoutes(app);
	await registerFamilyFinanceRoutes(app);
	// Склад монтируется с префиксом, как в server.ts: его пути начинаются с /:organizationId.
	await app.register(inventoryRoutes, { prefix: "/api/inventory" });
	await app.ready();
	return app;
}

async function seed(): Promise<void> {
	await db.insert(organizations).values([
		{ id: ORG_A, name: "Разведка изоляции — клиника А" },
		{ id: ORG_B, name: "Разведка изоляции — клиника Б" },
	]);
	await db.insert(clinics).values([
		{ id: CLINIC_A, organizationId: ORG_A, name: "Кабинет А" },
		{ id: CLINIC_B, organizationId: ORG_B, name: "Кабинет Б" },
	]);
	await db.insert(chairs).values([
		{ id: CHAIR_A, organizationId: ORG_A, clinicId: CLINIC_A, name: "Кресло А" },
		{ id: CHAIR_B, organizationId: ORG_B, clinicId: CLINIC_B, name: "Кресло Б" },
	]);
	await db.insert(users).values([
		{ id: DOCTOR_A, organizationId: ORG_A, fullName: "Врач клиники А", role: "doctor" },
		{ id: DOCTOR_B, organizationId: ORG_B, fullName: "Врач клиники Б", role: "doctor" },
	]);
	await db.insert(patients).values([
		{ id: PATIENT_A, organizationId: ORG_A, fullName: "Свой Пациент Аович", phone: "+79990003344" },
		{ id: PATIENT_B, organizationId: ORG_B, fullName: FOREIGN_PATIENT_NAME, phone: FOREIGN_PATIENT_PHONE },
	]);
}

/**
 * ПУНКТ 3 ЗАДАНИЯ: где ещё колонка организации допускает бесхозную строку.
 *
 * Считается по каталогу ЖИВОЙ базы, а не по schema.ts: расхождение между ними
 * само по себе является находкой, и именно живая база решает, достижима ли
 * строка без организации.
 */
async function auditNullableOrganizationColumns(): Promise<void> {
	console.log("\n=== ПУНКТ 3: колонки organization_id, допускающие NULL (живая база) ===");
	const catalog = await db.execute<{ table_name: string; is_nullable: string }>(sql`
		SELECT c.table_name, c.is_nullable
		FROM information_schema.columns AS c
		JOIN information_schema.tables AS t
		  ON t.table_schema = c.table_schema AND t.table_name = c.table_name
		WHERE c.table_schema = 'public'
		  AND c.column_name = 'organization_id'
		  AND t.table_type = 'BASE TABLE'
		ORDER BY c.is_nullable DESC, c.table_name
	`);
	const nullable = catalog.rows.filter((row) => row.is_nullable === "YES");
	console.log(`всего таблиц с organization_id: ${catalog.rows.length}, из них nullable: ${nullable.length}`);
	for (const row of nullable) {
		const counted = await db.execute<{ orphans: number; total: number }>(
			sql`SELECT count(*) FILTER (WHERE organization_id IS NULL)::int AS orphans, count(*)::int AS total FROM ${sql.identifier(row.table_name)}`,
		);
		const stats = counted.rows[0];
		const orphans = stats?.orphans ?? 0;
		const total = stats?.total ?? 0;
		report(
			orphans > 0 ? "УТЕЧКА" : "СПРАВКА",
			`nullable organization_id: ${row.table_name}`,
			`бесхозных строк ${orphans} из ${total}` +
				(orphans > 0 ? " — строка без организации достижима штатно, захват возможен" : " (пока пусто, но колонка позволяет)"),
		);
	}
}

/** ПУНКТ 4 ЗАДАНИЯ: чужие идентификаторы в пути и теле при своём токене. */
async function attemptCrossTenant(app: FastifyInstance): Promise<void> {
	const clinicTokenA = signToken({ organizationId: ORG_A }, authTokenSecret());
	const staffTokenA = signToken({ organizationId: ORG_A, userId: DOCTOR_A, role: "owner" }, authTokenSecret());
	const headersA = { "x-dente-clinic-token": clinicTokenA, "x-dente-staff-token": staffTokenA };

	console.log("\n=== ПУНКТ 4: токен клиники А против данных клиники Б ===");
	console.log(`клиника А ${ORG_A}, клиника Б ${ORG_B}`);
	console.log(`чужой пациент ${PATIENT_B} «${FOREIGN_PATIENT_NAME}»\n`);

	const cases: {
		label: string;
		method: "GET" | "POST" | "PUT";
		url: string;
		/*
		 * Тело запроса — именно объект, а не `unknown`.
		 *
		 * С `unknown` в тип попадает и `null`, а `app.inject` его не принимает:
		 * подбор перегрузки срывается, и дальше компилятор перестаёт видеть у
		 * ответа `statusCode` и `body` — восемь ошибок типов из одной. Все тела
		 * здесь и так объекты JSON, поэтому сужение ничего не стоит.
		 */
		payload?: Record<string, unknown>;
		/** Ожидаемый отказ. Ответ 2xx с чужими данными = утечка. */
		expectRejected: boolean;
	}[] = [
		{
			label: "GET /api/patients/:чужой/archive-status",
			method: "GET",
			url: `/api/patients/${PATIENT_B}/archive-status`,
			expectRejected: true,
		},
		{
			label: "GET /api/patients/:чужой/communication-timelines",
			method: "GET",
			url: `/api/patients/${PATIENT_B}/communication-timelines`,
			expectRejected: true,
		},
		{
			label: "GET /api/odontogram/tooth-history/:чужой/11",
			method: "GET",
			url: `/api/odontogram/tooth-history/${PATIENT_B}/11`,
			expectRejected: true,
		},
		{
			label: "PUT /api/patients/:чужой (правка чужой карты)",
			method: "PUT",
			url: `/api/patients/${PATIENT_B}`,
			payload: { fullName: "Переписано клиникой А" },
			expectRejected: true,
		},
		{
			label: "GET /api/inventory/:чужая_организация (склад по адресу)",
			method: "GET",
			url: `/api/inventory/${ORG_B}`,
			expectRejected: true,
		},
		{
			label: "GET /api/finance/family/patient/:чужой (кошелёк семьи)",
			method: "GET",
			url: `/api/finance/family/patient/${PATIENT_B}`,
			expectRejected: true,
		},
		{
			label: "POST /api/waitlist с чужим пациентом в теле",
			method: "POST",
			url: "/api/waitlist",
			payload: { patientId: PATIENT_B, priorityLevel: 1 },
			expectRejected: true,
		},
		{
			label: "POST /api/appointments с чужим пациентом в теле",
			method: "POST",
			url: "/api/appointments",
			payload: {
				patientId: PATIENT_B,
				doctorUserId: DOCTOR_A,
				chairId: CHAIR_A,
				status: "planned",
				startsAt: "2026-09-01T09:00:00.000Z",
				endsAt: "2026-09-01T10:00:00.000Z",
			},
			expectRejected: true,
		},
		{
			label: "POST /api/appointments с чужим ВРАЧОМ и чужим КРЕСЛОМ",
			method: "POST",
			url: "/api/appointments",
			payload: {
				patientId: PATIENT_A,
				doctorUserId: DOCTOR_B,
				chairId: CHAIR_B,
				status: "planned",
				startsAt: "2026-09-02T09:00:00.000Z",
				endsAt: "2026-09-02T10:00:00.000Z",
			},
			expectRejected: true,
		},
	];

	for (const testCase of cases) {
		const response = await app.inject({
			method: testCase.method,
			url: testCase.url,
			headers: headersA,
			...(testCase.payload === undefined ? {} : { payload: testCase.payload }),
		});
		const body = response.body ?? "";
		const short = body.length > 260 ? `${body.slice(0, 260)}…` : body;
		const accepted = response.statusCode >= 200 && response.statusCode < 300;
		const leakedName = carriesForeignIdentity(body);

		if (leakedName) {
			report("УТЕЧКА", testCase.label, `HTTP ${response.statusCode}, в ответе ФИО/телефон чужого пациента: ${short}`);
			continue;
		}
		if (accepted && testCase.expectRejected) {
			report("УТЕЧКА", testCase.label, `HTTP ${response.statusCode} — запрос ПРИНЯТ, хотя ссылается на чужую клинику: ${short}`);
			continue;
		}
		report("ЗАКРЫТО", testCase.label, `HTTP ${response.statusCode} ${short}`);
	}

	// Последствие принятой записи важнее кода ответа: осталась ли в базе строка
	// клиники А, ссылающаяся на пациента/врача/кресло клиники Б.
	console.log("\n=== ПОСЛЕДСТВИЕ В БАЗЕ: приёмы клиники А со ссылкой за её пределы ===");
	const crossRows = await db.execute<{
		appointment_id: string;
		foreign_patient: string | null;
		foreign_doctor: string | null;
		foreign_chair: string | null;
	}>(sql`
		SELECT a.id::text AS appointment_id,
		       p.full_name AS foreign_patient,
		       u.full_name AS foreign_doctor,
		       ch.name     AS foreign_chair
		  FROM appointments a
		  LEFT JOIN patients p ON p.id = a.patient_id     AND p.organization_id  <> a.organization_id
		  LEFT JOIN users    u ON u.id = a.doctor_user_id AND u.organization_id  <> a.organization_id
		  LEFT JOIN chairs  ch ON ch.id = a.chair_id      AND ch.organization_id <> a.organization_id
		 WHERE a.organization_id = ${ORG_A}
		   AND (p.id IS NOT NULL OR u.id IS NOT NULL OR ch.id IS NOT NULL)
	`);
	if (crossRows.rows.length === 0) {
		report("ЗАКРЫТО", "приёмы со ссылкой за пределы организации", "ни одной строки — целостность арендатора удержана");
	} else {
		for (const row of crossRows.rows) {
			report(
				"УТЕЧКА",
				"приём клиники А ссылается за её пределы",
				`приём ${row.appointment_id}: пациент=${row.foreign_patient ?? "—"}, врач=${row.foreign_doctor ?? "—"}, кресло=${row.foreign_chair ?? "—"}`,
			);
		}
	}

	// Тот же вопрос по ВСЕЙ живой базе, а не только по посеянным клиникам:
	// сколько межклиничных ссылок уже лежит в данных.
	const wholeBase = await db.execute<{ patient_cross: number; doctor_cross: number; chair_cross: number }>(sql`
		SELECT count(*) FILTER (WHERE p.id IS NOT NULL)::int  AS patient_cross,
		       count(*) FILTER (WHERE u.id IS NOT NULL)::int  AS doctor_cross,
		       count(*) FILTER (WHERE ch.id IS NOT NULL)::int AS chair_cross
		  FROM appointments a
		  LEFT JOIN patients p ON p.id = a.patient_id     AND p.organization_id  <> a.organization_id
		  LEFT JOIN users    u ON u.id = a.doctor_user_id AND u.organization_id  <> a.organization_id
		  LEFT JOIN chairs  ch ON ch.id = a.chair_id      AND ch.organization_id <> a.organization_id
	`);
	console.log(`\nПо всей базе приёмов с межклиничной ссылкой: ${JSON.stringify(wholeBase.rows[0])}`);
}

/** Контрольный опыт: проверка обязана краснеть. Своя клиника читается штатно. */
async function proveTheProbeCanGoGreen(app: FastifyInstance): Promise<void> {
	console.log("\n=== КОНТРОЛЬ: тот же запрос по СВОЕМУ пациенту обязан пройти ===");
	const headersA = {
		"x-dente-clinic-token": signToken({ organizationId: ORG_A }, authTokenSecret()),
		"x-dente-staff-token": signToken({ organizationId: ORG_A, userId: DOCTOR_A, role: "owner" }, authTokenSecret()),
	};
	const own = await app.inject({ method: "GET", url: `/api/patients/${PATIENT_A}/archive-status`, headers: headersA });
	console.log(`  свой пациент: HTTP ${own.statusCode} ${own.body.slice(0, 160)}`);
	if (own.statusCode !== 200) {
		console.log("  ВНИМАНИЕ: прибор не отличает отказ по изоляции от общей поломки маршрута — вывод выше недостоверен.");
	}
	const anonymous = await app.inject({ method: "GET", url: `/api/patients/${PATIENT_A}/archive-status` });
	console.log(`  без токена: HTTP ${anonymous.statusCode} (ожидается 401)`);
}

async function main(): Promise<void> {
	// Периметровый секрет в этой проверке не участвует: измеряется изоляция арендатора.
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
	process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
	process.env.DENTE_SCHEDULE_ALLOW_UNGUARDED_MUTATIONS = "1";

	const app = await buildApp();
	try {
		await purgeFixtureOrganizations([ORG_A, ORG_B]);
		await seed();
		await auditNullableOrganizationColumns();
		await attemptCrossTenant(app);
		await proveTheProbeCanGoGreen(app);
	} finally {
		await app.close();
		// Приёмы посеянных клиник могли уехать на чужого пациента — уборка идёт по
		// каталогу и снимает их вместе с организацией.
		await db.delete(appointments).where(and(eq(appointments.organizationId, ORG_A)));
		await purgeFixtureOrganizations([ORG_A, ORG_B]);
		console.log(leaks === 0 ? "\nНАРУШЕНИЙ НЕ НАЙДЕНО" : `\nНАРУШЕНИЙ: ${leaks}`);
		await pool.end();
	}
}

main().catch((error) => {
	if (isDatabaseUnavailable(error)) {
		console.error("База недоступна — доказательство не получено, выводы делать нельзя.");
		console.error(error instanceof Error ? error.message : String(error));
		process.exitCode = 2;
		return;
	}
	console.error(error);
	process.exitCode = 1;
});
