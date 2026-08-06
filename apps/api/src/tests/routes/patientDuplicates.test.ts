import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { type FastifyInstance } from "fastify";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { patientDuplicateDecisions } from "../../db/patientsSchema.js";
import {
	appointments,
	clinics,
	organizations,
	patientCommunicationConsents,
	patients,
	payments,
	users,
	visits
} from "../../db/schema.js";
import { registerPatientDuplicateRoutes } from "../../routes/patientDuplicates.js";
import { nameKey } from "../../services/patients/duplicateDetection.js";
import { patientReferenceColumns } from "../../services/patients/patientMerge.js";
import { withFixtureTenant } from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

/**
 * Разбор дублей пациентов.
 *
 * ЗАЧЕМ ПО ЖИВОЙ БАЗЕ. Слияние переносит ссылки в 46 колонках, и список
 * берётся из каталога базы в момент выполнения. На моках проверялся бы сам мок,
 * а не то, что после слияния приёмы, оплаты и визиты действительно оказались в
 * оставшейся карточке.
 *
 * ГЛАВНОЕ, ЧТО ПРОВЕРЯЕТСЯ:
 *   1. Совпадение телефона само по себе дублем не считается — родственники
 *      записаны на один номер.
 *   2. Одинаковое имя при РАЗНЫХ датах рождения — это разные люди.
 *   3. После слияния ни одна запись не потеряна и не осталась у дубля.
 *   4. Карточка не удаляется, а становится архивной ссылкой.
 *   5. Заполненные поля основной карточки не перетираются.
 */

const ORG_ID = "dce70000-0000-4000-8000-000000000801";
const CLINIC_ID = "dce70000-0000-4000-8000-000000000802";
const DOCTOR_ID = "dce70000-0000-4000-8000-000000000803";
const ORG_HEADERS = { "x-organization-id": ORG_ID };

// Пара настоящих дублей: то же имя, та же дата рождения.
const DUP_PRIMARY = "dce70000-0000-4000-8000-000000000811";
const DUP_SECOND = "dce70000-0000-4000-8000-000000000812";
// Родственники: один телефон, разные имена и даты рождения.
const KIN_MOTHER = "dce70000-0000-4000-8000-000000000821";
const KIN_CHILD = "dce70000-0000-4000-8000-000000000822";
// Полные тёзки с разными датами рождения — разные люди.
const TWIN_A = "dce70000-0000-4000-8000-000000000831";
const TWIN_B = "dce70000-0000-4000-8000-000000000832";

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|getaddrinfo|Connection terminated/i.test(message);
}

describe("нормализация имени", () => {
	test("регистр, «ё» и лишние пробелы не мешают сравнению", () => {
		assert.equal(nameKey("Иванов  Пётр   Сергеевич"), nameKey("иванов петр сергеевич"));
		assert.equal(nameKey("СЕМЁНОВА Анна"), nameKey("Семенова Анна"));
		// Знаки препинания из имени выкидываются, дефис в фамилии сохраняется.
		assert.equal(nameKey("Петрова-Водкина, Анна"), "петрова-водкина анна");
	});
});

describe("связи карточки пациента в базе", () => {
	let databaseAvailable = true;

	test("список ссылок берётся из каталога и не пуст", async (context) => {
		let columns: Awaited<ReturnType<typeof patientReferenceColumns>>;
		try {
			columns = await patientReferenceColumns();
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
			databaseAvailable = false;
			return context.skip("база недоступна");
		}

		// Зашивать список в код нельзя: добавят таблицу — слияние начнёт оставлять
		// сирот. Проверяем, что каталог читается и в нём есть ключевые таблицы.
		assert.ok(columns.length >= 30, `найдено всего ${columns.length} ссылок — каталог прочитан не полностью`);
		const names = new Set(columns.map((column) => `${column.tableName}.${column.columnName}`));
		for (const required of [
			"appointments.patient_id",
			"visits.patient_id",
			"payments.patient_id",
			"treatment_items.patient_id",
			"imaging_studies.patient_id",
			"communication_outbox.patient_id"
		]) {
			assert.ok(names.has(required), `в списке ссылок нет ${required}`);
		}
		void databaseAvailable;
	});
});

describe("поиск и слияние дублей", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const originalEnv = { ...process.env };
	const visitId = "dce70000-0000-4000-8000-000000000841";
	const paymentId = "dce70000-0000-4000-8000-000000000861";

	/**
	 * Одна и та же уборка до засева и после прогона — иначе она не уборка.
	 *
	 * Под тенант-контекстом: без `app.current_tenant` под FORCE RLS ни `DELETE`,
	 * ни `UPDATE` не видят ни одной строки клиники и снимают ноль, ошибкой это не
	 * считается. Контекст заодно сужает удаление до своего арендатора.
	 */
	async function purgeFixtures(): Promise<void> {
		await withFixtureTenant(ORG_ID, async () => {
			await db.delete(patientDuplicateDecisions).where(eq(patientDuplicateDecisions.organizationId, ORG_ID));
			await db.delete(patientCommunicationConsents).where(eq(patientCommunicationConsents.organizationId, ORG_ID));
			await db.delete(payments).where(eq(payments.organizationId, ORG_ID));
			await db.delete(visits).where(eq(visits.organizationId, ORG_ID));
			await db.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
			// Ссылка карточки на карточку снимается до удаления: иначе своя же FK.
			await db.update(patients).set({ mergedIntoPatientId: null }).where(eq(patients.organizationId, ORG_ID));
			await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
			await db.delete(users).where(eq(users.organizationId, ORG_ID));
			await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
			await db.delete(organizations).where(eq(organizations.id, ORG_ID));
		});
	}

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		// Оба хука боевого server.ts: организация из запроса кладётся в
		// request.tenantId, а обработчик оборачивается в withTenantCtx. Без второго
		// маршрут под FORCE RLS не увидел бы ни одной карточки и списки дублей
		// приходили бы пустыми.
		app = createTenantTestApp();
		await registerPatientDuplicateRoutes(app);

		try {
			/*
			 * Уборка ПЕРЕД засевом. Здесь она критична вдвойне: слияние ПЕРЕПИСЫВАЕТ
			 * фикстуры — переносит ссылки, ставит карточке статус archived и
			 * mergedIntoPatientId. Остаток от упавшего прогона означает, что второй
			 * прогон начинает с УЖЕ ОБЪЕДИНЁННЫХ карточек, и onConflictDoNothing по
			 * их id молча оставляет их такими: «слияние переносит все записи»
			 * получает 409 «уже объединена» вместо 200.
			 */
			await purgeFixtures();

			/*
			 * Весь сев — под тенант-контекстом клиники. Под FORCE RLS в WITH CHECK
			 * тенант-таблиц дизъюнкта обхода нет: вставка без `app.current_tenant`
			 * отвергается кодом 42501 на каждой из этих таблиц.
			 */
			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(organizations).values({ id: ORG_ID, name: "Клиника дублей" }).onConflictDoNothing();
				await db
					.insert(clinics)
					.values({ id: CLINIC_ID, organizationId: ORG_ID, name: "Главная", timezone: "Europe/Moscow" })
					.onConflictDoNothing();
				await db
					.insert(users)
					.values({ id: DOCTOR_ID, organizationId: ORG_ID, fullName: "Врач Тестовый", role: "doctor" })
					.onConflictDoNothing();

				await db
					.insert(patients)
					.values([
						// Дубли: то же имя, та же дата рождения. У основной нет телефона —
						// проверим, что он подтянется из дубля.
						{ id: DUP_PRIMARY, organizationId: ORG_ID, fullName: "Орлова Марина Петровна", birthDate: "1985-04-12", phone: null, notes: "Аллергия на лидокаин" },
						{ id: DUP_SECOND, organizationId: ORG_ID, fullName: "орлова  марина петровна", birthDate: "1985-04-12", phone: "+7 916 500-10-20", email: "orlova@example.ru" },
						// Родственники на одном номере.
						{ id: KIN_MOTHER, organizationId: ORG_ID, fullName: "Ковалёва Ольга Ивановна", birthDate: "1978-02-03", phone: "+7 916 700-30-40" },
						{ id: KIN_CHILD, organizationId: ORG_ID, fullName: "Ковалёв Артём Сергеевич", birthDate: "2012-09-15", phone: "89167003040" },
						// Полные тёзки, даты рождения разные.
						{ id: TWIN_A, organizationId: ORG_ID, fullName: "Смирнов Иван Иванович", birthDate: "1990-01-01" },
						{ id: TWIN_B, organizationId: ORG_ID, fullName: "Смирнов Иван Иванович", birthDate: "1975-06-20" }
					])
					.onConflictDoNothing();

				// У дубля есть приём, визит, оплата и согласие — всё это должно
				// оказаться в основной карточке.
				await db
					.insert(appointments)
					.values({
						id: "dce70000-0000-4000-8000-000000000851",
						organizationId: ORG_ID,
						patientId: DUP_SECOND,
						doctorUserId: DOCTOR_ID,
						status: "completed",
						startsAt: new Date("2026-07-10T09:00:00Z"),
						endsAt: new Date("2026-07-10T10:00:00Z")
					})
					.onConflictDoNothing();
				await db
					.insert(visits)
					.values({ id: visitId, organizationId: ORG_ID, patientId: DUP_SECOND, status: "signed" })
					.onConflictDoNothing();
				/*
				 * У ОПЛАТЫ ИДЕНТИФИКАТОР ЗАДАН ЯВНО.
				 *
				 * У payments только первичный ключ defaultRandom() и НИ ОДНОГО
				 * уникального ограничения — есть лишь обычный индекс по (org, paid_at).
				 * Без явного id вставка каждый раз получала новый ключ, конфликта не
				 * возникало никогда, и onConflictDoNothing() не отсекал ничего. Прогон,
				 * упавший до after(), оставлял оплату в базе, следующий добавлял вторую —
				 * а ниже стоит `movedPayments.length === 1`, то есть тест краснел бы на
				 * верном слиянии.
				 *
				 * Согласия ниже трогать не нужно: у patient_communication_consents есть
				 * unique(org, patient, channel, scope), по нему onConflictDoNothing()
				 * действительно срабатывает и без id.
				 */
				await db
					.insert(payments)
					.values({ id: paymentId, organizationId: ORG_ID, patientId: DUP_SECOND, visitId, amountRub: 5400, status: "paid" })
					.onConflictDoNothing();
				// Согласие есть у ОБОИХ по одному каналу — это конфликт уникальности,
				// который слияние обязано разобрать.
				await db
					.insert(patientCommunicationConsents)
					.values([
						{ organizationId: ORG_ID, patientId: DUP_PRIMARY, channel: "sms", scope: "service", state: "granted", source: "contract" },
						{ organizationId: ORG_ID, patientId: DUP_SECOND, channel: "sms", scope: "service", state: "revoked", source: "staff" }
					])
					.onConflictDoNothing();
			});
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await purgeFixtures();
		}
		await app.close();
		process.env = originalEnv;
	});

	test("настоящий дубль находится с высокой уверенностью", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/patients/duplicates", headers: ORG_HEADERS });
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);

		const pair = body.candidates.find(
			(candidate: { leftPatientId: string; rightPatientId: string }) =>
				[candidate.leftPatientId, candidate.rightPatientId].includes(DUP_PRIMARY) &&
				[candidate.leftPatientId, candidate.rightPatientId].includes(DUP_SECOND)
		);
		assert.ok(pair, `дубль не найден: ${JSON.stringify(body.candidates)}`);
		assert.equal(pair.reason, "same_name_and_birth_date");
		assert.ok(pair.confidence >= 0.9);
		assert.equal(pair.caution, null);
	});

	test("родственники на одном номере — не дубль, и это сказано словами", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/patients/duplicates", headers: ORG_HEADERS });
		const body = JSON.parse(response.body);

		const pair = body.candidates.find(
			(candidate: { leftPatientId: string; rightPatientId: string }) =>
				[candidate.leftPatientId, candidate.rightPatientId].includes(KIN_MOTHER) &&
				[candidate.leftPatientId, candidate.rightPatientId].includes(KIN_CHILD)
		);
		// Даты рождения разные — такую пару вообще не предлагаем.
		assert.equal(pair, undefined, `родственники предложены как дубль: ${JSON.stringify(pair)}`);
		assert.ok(body.note.includes("родственники"), body.note);
	});

	test("полные тёзки с разными датами рождения не предлагаются", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/patients/duplicates", headers: ORG_HEADERS });
		const body = JSON.parse(response.body);
		const pair = body.candidates.find(
			(candidate: { leftPatientId: string; rightPatientId: string }) =>
				[candidate.leftPatientId, candidate.rightPatientId].includes(TWIN_A) &&
				[candidate.leftPatientId, candidate.rightPatientId].includes(TWIN_B)
		);
		assert.equal(pair, undefined, "разные люди предложены как дубль");
	});

	test("«это разные люди» запоминается и пара исчезает из списка", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const dismissed = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/dismiss",
			headers: ORG_HEADERS,
			payload: { leftPatientId: TWIN_A, rightPatientId: TWIN_B, reason: "разные люди, проверено по паспорту" }
		});
		assert.equal(dismissed.statusCode, 200, dismissed.body);

		const response = await app.inject({ method: "GET", url: "/api/patients/duplicates", headers: ORG_HEADERS });
		assert.ok(JSON.parse(response.body).dismissedPairs >= 1);
	});

	test("слияние переносит все записи и ничего не теряет", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: ORG_HEADERS,
			payload: { primaryPatientId: DUP_PRIMARY, duplicatePatientId: DUP_SECOND, reason: "одна и та же пациентка" }
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.ok, true);

		/*
		 * Сверка по базе идёт под тенант-контекстом клиники. Без него SELECT под
		 * FORCE RLS не видит ни одной строки: «перенесено» читалось бы как ноль
		 * строк у основной карточки, а «у дубля не осталось ничего» проходило бы
		 * при любом содержимом базы — то есть перестало бы быть проверкой.
		 */
		const movedAppointments = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: appointments.id })
				.from(appointments)
				.where(and(eq(appointments.organizationId, ORG_ID), eq(appointments.patientId, DUP_PRIMARY)))
		);
		assert.equal(movedAppointments.length, 1);

		const movedPayments = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ amountRub: payments.amountRub })
				.from(payments)
				.where(and(eq(payments.organizationId, ORG_ID), eq(payments.patientId, DUP_PRIMARY)))
		);
		assert.equal(movedPayments.length, 1);
		assert.equal(movedPayments[0]?.amountRub, 5400);

		const movedVisits = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ id: visits.id })
				.from(visits)
				.where(and(eq(visits.organizationId, ORG_ID), eq(visits.patientId, DUP_PRIMARY)))
		);
		assert.equal(movedVisits.length, 1);

		// У дубля не осталось ничего.
		const leftoverAppointments = await withFixtureTenant(ORG_ID, async () =>
			db.select({ id: appointments.id }).from(appointments).where(eq(appointments.patientId, DUP_SECOND))
		);
		assert.equal(leftoverAppointments.length, 0);
		const leftoverPayments = await withFixtureTenant(ORG_ID, async () =>
			db.select({ id: payments.id }).from(payments).where(eq(payments.patientId, DUP_SECOND))
		);
		assert.equal(leftoverPayments.length, 0);

		// Ответ перечисляет перенесённое, а не говорит «готово».
		assert.ok(body.movedRows["appointments.patient_id"] >= 1, JSON.stringify(body.movedRows));
		assert.ok(body.summary.includes("Перенесено записей"), body.summary);
	});

	test("конфликт согласий разобран в пользу основной карточки", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// У обоих было согласие по SMS: у основной granted, у дубля revoked.
		// Уникальность не позволяет держать оба — остаться должно согласие
		// основной карточки, ту, которую администратор оставляет жить.
		// Чтение под контекстом: без него список согласий пришёл бы пустым, и
		// `consents.length === 1` упало бы на верно разобранном конфликте.
		const consents = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ state: patientCommunicationConsents.state })
				.from(patientCommunicationConsents)
				.where(
					and(
						eq(patientCommunicationConsents.organizationId, ORG_ID),
						eq(patientCommunicationConsents.patientId, DUP_PRIMARY),
						eq(patientCommunicationConsents.channel, "sms")
					)
				)
		);
		assert.equal(consents.length, 1, JSON.stringify(consents));
		assert.equal(consents[0]?.state, "granted");
	});

	test("карточка не удалена, а стала архивной ссылкой", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Под контекстом клиники: без него карточка не видна, и «карточка дубля
		// удалена — этого делать нельзя» прозвучало бы о политике, а не о слиянии.
		const [merged] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ status: patients.status, mergedInto: patients.mergedIntoPatientId, notes: patients.notes })
				.from(patients)
				.where(eq(patients.id, DUP_SECOND))
		);

		// Медицинские данные не удаляются: карточка остаётся и объясняет, куда
		// объединена.
		assert.ok(merged, "карточка дубля удалена — этого делать нельзя");
		assert.equal(merged?.status, "archived");
		assert.equal(merged?.mergedInto, DUP_PRIMARY);
		assert.ok(merged?.notes?.includes("объединена"), merged?.notes ?? "");
	});

	test("пустые поля основной карточки дозаполнены, заполненные не тронуты", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		// Тот же контекст, что и у маршрута: иначе основная карточка не читается
		// вовсе и сверять дозаполненные поля было бы не с чем.
		const [primary] = await withFixtureTenant(ORG_ID, async () =>
			db
				.select({ phone: patients.phone, email: patients.email, notes: patients.notes })
				.from(patients)
				.where(eq(patients.id, DUP_PRIMARY))
		);

		// Телефона и почты не было — подтянулись из дубля.
		assert.equal(primary?.phone, "+7 916 500-10-20");
		assert.equal(primary?.email, "orlova@example.ru");
		// Заметка про аллергию сохранена: её нельзя терять ни при каких условиях.
		assert.ok(primary?.notes?.includes("Аллергия на лидокаин"), primary?.notes ?? "");
	});

	test("повторное слияние той же карточки отклоняется", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: ORG_HEADERS,
			payload: { primaryPatientId: DUP_PRIMARY, duplicatePatientId: DUP_SECOND }
		});
		assert.equal(response.statusCode, 409, response.body);
		assert.ok(JSON.parse(response.body).message.includes("уже объединена"));
	});

	test("слияние карточки с самой собой отклоняется", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: ORG_HEADERS,
			payload: { primaryPatientId: KIN_MOTHER, duplicatePatientId: KIN_MOTHER }
		});
		assert.equal(response.statusCode, 400, response.body);
	});

	test("карточка чужой организации не сливается", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: { "x-organization-id": "dce70000-0000-4000-8000-0000000008ff" },
			payload: { primaryPatientId: KIN_MOTHER, duplicatePatientId: KIN_CHILD }
		});
		assert.equal(response.statusCode, 409, response.body);
		assert.ok(JSON.parse(response.body).message.includes("не найдена"));
	});

	test("дубли конкретной карточки доступны отдельно", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/patients/${KIN_MOTHER}/duplicates`,
			headers: ORG_HEADERS
		});
		assert.equal(response.statusCode, 200, response.body);
		assert.equal(JSON.parse(response.body).patientId, KIN_MOTHER);
	});
});
