/**
 * Живое доказательство того, что настоящего тёзку МОЖНО завести — если в запрос
 * попали телефон или дата рождения, а второй карты одним ФИО быть не должно.
 *
 * ЗАЧЕМ. Экран картотеки держал телефон и дату рождения под
 * `style={{ display: "none" }}`, поэтому в запрос всегда уходили `phone: null`
 * и `birthDate: null`. Сервер на это отвечает 409 и в тексте отказа называет
 * выход — «добавьте телефон или дату рождения». На экране добавить их было
 * нечем: текст отказа называл действие, которого не существовало. Поля сделаны
 * видимыми (apps/web/src/PatientsView.tsx), и вот замер того, что этот выход
 * действительно работает на сервере, а не только описан в отказе.
 *
 * Это НЕ юнит-тест (имя без `.test.ts`, `npm test` его не подхватывает):
 * поведение маршрута мерится на живой PostgreSQL 18 через `app.inject`, потому
 * что dev-API на 4100 отдаёт устаревший код и его ответ ничего не доказывает.
 *
 * ЗАПУСК (cwd apps/api — из него загрузчик поднимает DATABASE_URL):
 *   cd apps/api && node --import tsx src/tests/routes/patientNamesakeCreateProof.ts
 *
 * Своя организация, свои карты, полная уборка в finally. Ни одной записи и ни
 * одного удаления в чужих клиниках: демо-данные общей базы не трогаются.
 * Секрет подписи берётся штатным authTokenSecret() и в вывод не попадает.
 */

import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { pool } from "../../db/client.js";
import { withSuperuserBypass } from "../../db/rls.js";
import { organizations, patients } from "../../db/schema.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * Название организации замера. Вынесено в одно место, потому что по нему же
 * идёт уборка следов прерванного прогона: сверка на точное равенство, без LIKE
 * и без маски, чтобы клиника с похожим названием не попала под удаление.
 */
const PROOF_ORGANIZATION_NAME = "Проверка тёзок — картотека";
const NAMESPACE = "patientNamesakeCreateProof";
const PROOF_ORG_ID = fixtureUuid(NAMESPACE, 1);

/** Полный тёзка: одно и то же ФИО, разные люди. */
const NAMESAKE_FULL_NAME = "Орлова Марина Петровна";
const SEEDED_PHONE = "+7 916 200-10-20";
const SEEDED_BIRTH_DATE = "1970-01-10";
const NAMESAKE_PHONE = "+7 916 555-77-31";
const NAMESAKE_BIRTH_DATE = "1988-04-02";

let failures = 0;

function check(label: string, actual: unknown, expected: unknown): void {
	const ok = JSON.stringify(actual) === JSON.stringify(expected);
	if (!ok) failures += 1;
	console.log(
		`${ok ? "OK  " : "ПРОВАЛ"} ${label}: получено ${JSON.stringify(actual)}, ожидалось ${JSON.stringify(expected)}`,
	);
}

function seeded<Row>(rows: Row[], what: string): Row {
	const row = rows[0];
	if (!row)
		throw new Error(
			`Посев не состоялся: вставка «${what}» не вернула ни одной строки.`,
		);
	return row;
}

async function buildApp(): Promise<FastifyInstance> {
	const app = createTenantTestApp();
	await registerPatientRoutes(app);
	await app.ready();
	return app;
}

type Created = {
	statusCode: number;
	error: string | null;
	message: string | null;
	id: string | null;
};

async function createPatient(
	app: FastifyInstance,
	clinicToken: string,
	payload: {
		fullName: string;
		phone?: string | null;
		birthDate?: string | null;
	},
): Promise<Created> {
	const response = await app.inject({
		method: "POST",
		url: "/api/patients",
		headers: {
			"content-type": "application/json",
			"x-dente-clinic-token": clinicToken,
		},
		payload,
	});
	let body: { error?: string; message?: string; id?: string };
	try {
		body = JSON.parse(response.body) as {
			error?: string;
			message?: string;
			id?: string;
		};
	} catch {
		body = {};
	}
	return {
		statusCode: response.statusCode,
		error: body.error ?? null,
		message: body.message ?? null,
		id: body.id ?? null,
	};
}

async function dropProofOrganizations(): Promise<void> {
	await purgeFixtureOrganizations([PROOF_ORG_ID]);
	const rows = await withSuperuserBypass(async (tx) =>
		tx
			.select({ id: organizations.id })
			.from(organizations)
			.where(eq(organizations.name, PROOF_ORGANIZATION_NAME)),
	);
	for (const row of rows) {
		await withFixtureTenant(row.id, async (tx) => {
			await tx.delete(patients).where(eq(patients.organizationId, row.id));
			await tx.delete(organizations).where(eq(organizations.id, row.id));
		});
	}
}

async function main(): Promise<void> {
	// Следы прерванного прогона: уборка ДО посева, иначе вторая организация с тем
	// же названием даст «дубль» из чужого прогона, а не из замера.
	await dropProofOrganizations();

	const organization = await withFixtureTenant(PROOF_ORG_ID, async (tx) => {
		const inserted = await tx
			.insert(organizations)
			.values({ id: PROOF_ORG_ID, name: PROOF_ORGANIZATION_NAME })
			.onConflictDoNothing()
			.returning({ id: organizations.id });
		return inserted[0] ?? { id: PROOF_ORG_ID };
	});
	const app = await buildApp();
	try {
		const clinicToken = signToken(
			{ organizationId: organization.id },
			authTokenSecret(),
		);

		await withFixtureTenant(organization.id, async (tx) => {
			seeded(
				await tx
					.insert(patients)
					.values({
						organizationId: organization.id,
						fullName: NAMESAKE_FULL_NAME,
						phone: SEEDED_PHONE,
						birthDate: SEEDED_BIRTH_DATE,
					})
					.returning({ id: patients.id }),
				"первая карта тёзки",
			);
		});

		console.log(
			`\n=== ОРГАНИЗАЦИЯ ЗАМЕРА «${PROOF_ORGANIZATION_NAME}» (${organization.id}) ===`,
		);
		console.log(
			`посеяна карта «${NAMESAKE_FULL_NAME}», телефон ${SEEDED_PHONE}, дата рождения ${SEEDED_BIRTH_DATE}`,
		);

		console.log(
			"\n=== 1. ОДНО ФИО, БОЛЬШЕ НИЧЕГО — то, что уходило со скрытыми полями ===",
		);
		const nameOnly = await createPatient(app, clinicToken, {
			fullName: NAMESAKE_FULL_NAME,
			phone: null,
			birthDate: null,
		});
		check("вторая карта одним ФИО отклонена", nameOnly.statusCode, 409);
		check(
			"отказ назван PatientNameDuplicateError",
			nameOnly.error,
			"PatientNameDuplicateError",
		);
		console.log(`  текст отказа: ${nameOnly.message}`);
		check(
			"отказ называет действие, а не код ответа",
			Boolean(nameOnly.message?.includes("добавьте телефон или дату рождения")),
			true,
		);

		console.log(
			"\n=== 2. ТОТ ЖЕ ТЁЗКА С ТЕЛЕФОНОМ — поле, которое было скрыто ===",
		);
		const withPhone = await createPatient(app, clinicToken, {
			fullName: NAMESAKE_FULL_NAME,
			phone: NAMESAKE_PHONE,
			birthDate: null,
		});
		check("тёзка с другим телефоном заведён", withPhone.statusCode, 201);
		console.log(
			`  создана карта ${withPhone.id ?? "—"}, телефон ${NAMESAKE_PHONE}`,
		);

		console.log(
			"\n=== 3. ТОТ ЖЕ ТЁЗКА С ДАТОЙ РОЖДЕНИЯ — второе скрытое поле ===",
		);
		const withBirthDate = await createPatient(app, clinicToken, {
			fullName: NAMESAKE_FULL_NAME,
			phone: null,
			birthDate: NAMESAKE_BIRTH_DATE,
		});
		check(
			"тёзка с другой датой рождения заведён",
			withBirthDate.statusCode,
			201,
		);
		console.log(
			`  создана карта ${withBirthDate.id ?? "—"}, дата рождения ${NAMESAKE_BIRTH_DATE}`,
		);

		console.log(
			"\n=== 4. НАСТОЯЩИЙ ДУБЛЬ ОСТАЁТСЯ ЗАПРЕЩЁННЫМ (тот же телефон) ===",
		);
		const realDuplicate = await createPatient(app, clinicToken, {
			fullName: NAMESAKE_FULL_NAME,
			phone: SEEDED_PHONE,
			birthDate: null,
		});
		check(
			"карта с тем же ФИО и тем же телефоном отклонена",
			realDuplicate.statusCode,
			409,
		);
		console.log(`  текст отказа: ${realDuplicate.message}`);

		console.log("\n=== 5. НОВЫЙ ЧЕЛОВЕК ОДНИМ ФИО ЗАВОДИТСЯ КАК И РАНЬШЕ ===");
		const freshName = await createPatient(app, clinicToken, {
			fullName: "Кузнецов Пётр Алексеевич",
			phone: null,
			birthDate: null,
		});
		check(
			"новое ФИО без телефона и даты рождения проходит",
			freshName.statusCode,
			201,
		);

		const counted = await withSuperuserBypass(async (tx) =>
			tx.execute(sql`
				select count(*)::int as cards
				  from patients
				 where organization_id = ${organization.id}
				   and full_name = ${NAMESAKE_FULL_NAME}
			`),
		);
		console.log(
			`\nкарт с ФИО «${NAMESAKE_FULL_NAME}» в клинике замера: ${JSON.stringify(counted.rows)}`,
		);
		check(
			"тёзок в клинике ровно три, и ни один не создан вторым ФИО",
			counted.rows[0],
			{ cards: 3 },
		);
	} finally {
		await app.close();
		await dropProofOrganizations();
		const leftovers = await withSuperuserBypass(async (tx) =>
			tx
				.select({ id: organizations.id })
				.from(organizations)
				.where(eq(organizations.name, PROOF_ORGANIZATION_NAME)),
		);
		console.log(`\nуборка: организаций замера осталось ${leftovers.length}`);
		await pool.end();
	}

	console.log(
		failures === 0
			? "\nИТОГ: все проверки пройдены."
			: `\nИТОГ: провалов ${failures}.`,
	);
	if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
	console.error("Замер не состоялся:", error);
	process.exitCode = 1;
});
