/**
 * Возврат пациентов: список и приглашение.
 *
 * Проверяется то, что легко сломать незаметно: полосы по давности, исключение
 * записанных на будущее, и повтор приглашения в пределах месяца.
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { appointments, chairs, clinics, communicationOutbox, organizations, patients, users } from "../../db/schema.js";
import { registerPatientRecallRoutes } from "../../routes/patientRecall.js";

const ORG_ID = "dce70000-0000-4000-8000-000000000701";
const DOCTOR_ID = "dce70000-0000-4000-8000-000000000702";
const CHAIR_ID = "dce70000-0000-4000-8000-000000000703";
const CLINIC_ID = "dce70000-0000-4000-8000-000000000704";
const DUE_PATIENT = "dce70000-0000-4000-8000-000000000711";
const RECENT_PATIENT = "dce70000-0000-4000-8000-000000000712";
const BOOKED_PATIENT = "dce70000-0000-4000-8000-000000000713";

/*
 * ПРИЁМАМ ЗАДАНЫ ЯВНЫЕ ИДЕНТИФИКАТОРЫ.
 *
 * Прежний засев вставлял четыре приёма без id и вообще без onConflictDoNothing:
 * первичный ключ у appointments — defaultRandom(), так что каждый прогон
 * добавлял четыре НОВЫХ приёма. Прогон, упавший до after(), оставлял их в базе,
 * и следующий считал давность визитов по чужим строкам — то есть проходил или
 * падал на данных, которых сам не создавал.
 */
const DUE_PAST_APPOINTMENT = "dce70000-0000-4000-8000-000000000721";
const RECENT_PAST_APPOINTMENT = "dce70000-0000-4000-8000-000000000722";
const BOOKED_PAST_APPOINTMENT = "dce70000-0000-4000-8000-000000000723";
const BOOKED_FUTURE_APPOINTMENT = "dce70000-0000-4000-8000-000000000724";

const ORG_HEADERS = { "x-organization-id": ORG_ID };

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|does not exist|password authentication|ENOTFOUND/i.test(message);
}

function monthsAgo(months: number): Date {
	const date = new Date();
	date.setMonth(date.getMonth() - months);
	return date;
}

describe("возврат пациентов", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const originalEnv = process.env;

	/** Одна и та же уборка до засева и после прогона — иначе она не уборка. */
	async function purgeFixtures(): Promise<void> {
		await db.delete(communicationOutbox).where(eq(communicationOutbox.organizationId, ORG_ID));
		await db.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
		await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
		await db.delete(chairs).where(eq(chairs.organizationId, ORG_ID));
		await db.delete(users).where(eq(users.organizationId, ORG_ID));
		await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
		await db.delete(organizations).where(eq(organizations.id, ORG_ID));
	}

	before(async () => {
		process.env = { ...originalEnv, DENTE_DEV_ALLOW_HEADER_ORG: "1" };
		app = Fastify();
		await registerPatientRecallRoutes(app);

		try {
			/*
			 * Уборка ПЕРЕД засевом. Здесь она снимает не только приёмы: остаток в
			 * communication_outbox от упавшего прогона делал проверку «повторное
			 * приглашение в том же месяце не отправляется» самоисполняющейся —
			 * маршрут отвечал duplicate=true уже на ПЕРВОЕ приглашение, и проверка
			 * зеленела, ничего не проверив.
			 */
			await purgeFixtures();

			await db.insert(organizations).values({ id: ORG_ID, name: "Клиника возврата" }).onConflictDoNothing();
			await db
				.insert(users)
				.values({ id: DOCTOR_ID, organizationId: ORG_ID, fullName: "Врач Возвратов", role: "doctor" })
				.onConflictDoNothing();
			// Кресло стоит в клинике: chairs.clinic_id объявлен notNull, поэтому
			// клиника заводится здесь же, как в остальных тестах по живой базе.
			await db
				.insert(clinics)
				.values({ id: CLINIC_ID, organizationId: ORG_ID, name: "Главная", timezone: "Europe/Moscow" })
				.onConflictDoNothing();
			await db
				.insert(chairs)
				.values({ id: CHAIR_ID, organizationId: ORG_ID, clinicId: CLINIC_ID, name: "Кресло 1" })
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values([
					{ id: DUE_PATIENT, organizationId: ORG_ID, fullName: "Давний Пациент", phone: "+7 916 000-09-01" },
					{ id: RECENT_PATIENT, organizationId: ORG_ID, fullName: "Недавний Пациент", phone: "+7 916 000-09-02" },
					{ id: BOOKED_PATIENT, organizationId: ORG_ID, fullName: "Уже Записан", phone: "+7 916 000-09-03" }
				])
				.onConflictDoNothing();

			await db
				.insert(appointments)
				.values([
					// Девять месяцев назад — попадает в список.
					{
						id: DUE_PAST_APPOINTMENT,
						organizationId: ORG_ID,
						patientId: DUE_PATIENT,
						doctorUserId: DOCTOR_ID,
						chairId: CHAIR_ID,
						status: "completed",
						startsAt: monthsAgo(9),
						endsAt: new Date(monthsAgo(9).getTime() + 3_600_000)
					},
					// Месяц назад — звать рано.
					{
						id: RECENT_PAST_APPOINTMENT,
						organizationId: ORG_ID,
						patientId: RECENT_PATIENT,
						doctorUserId: DOCTOR_ID,
						chairId: CHAIR_ID,
						status: "completed",
						startsAt: monthsAgo(1),
						endsAt: new Date(monthsAgo(1).getTime() + 3_600_000)
					},
					// Давно не был, НО уже записан на будущее — звать не нужно.
					{
						id: BOOKED_PAST_APPOINTMENT,
						organizationId: ORG_ID,
						patientId: BOOKED_PATIENT,
						doctorUserId: DOCTOR_ID,
						chairId: CHAIR_ID,
						status: "completed",
						startsAt: monthsAgo(20),
						endsAt: new Date(monthsAgo(20).getTime() + 3_600_000)
					},
					{
						id: BOOKED_FUTURE_APPOINTMENT,
						organizationId: ORG_ID,
						patientId: BOOKED_PATIENT,
						doctorUserId: DOCTOR_ID,
						chairId: CHAIR_ID,
						status: "planned",
						startsAt: new Date(Date.now() + 7 * 24 * 3_600_000),
						endsAt: new Date(Date.now() + 7 * 24 * 3_600_000 + 3_600_000)
					}
				])
				.onConflictDoNothing();
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

	test("зовут давних, не зовут недавних и уже записанных", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/patients/recall-candidates", headers: ORG_HEADERS });
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body) as { candidates: { patientId: string; band: string; monthsSinceLastVisit: number }[] };

		const ids = body.candidates.map((row) => row.patientId);
		assert.ok(ids.includes(DUE_PATIENT), `девять месяцев без осмотра — должен быть в списке: ${response.body}`);
		assert.ok(!ids.includes(RECENT_PATIENT), "был месяц назад — звать рано");
		// Самое важное правило: у человека уже назначен приём, его ждут.
		assert.ok(!ids.includes(BOOKED_PATIENT), "записан на будущее — звать не нужно");

		const due = body.candidates.find((row) => row.patientId === DUE_PATIENT);
		assert.equal(due?.band, "due");
		assert.equal(due?.monthsSinceLastVisit, 9, "месяцы считаются календарно");
	});

	test("приглашение ставится в очередь как реклама, а не как служебное сообщение", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients/recall-candidates/invite",
			headers: ORG_HEADERS,
			payload: { patientId: DUE_PATIENT, channel: "sms", body: "Пора на профилактический осмотр." }
		});
		assert.equal(response.statusCode, 200, response.body);

		const [row] = await db
			.select({ scope: communicationOutbox.scope, intent: communicationOutbox.intent })
			.from(communicationOutbox)
			.where(eq(communicationOutbox.patientId, DUE_PATIENT));

		assert.ok(row, "сообщение не поставлено в очередь");
		// Приглашение прийти — продвижение услуги: без согласия его отправлять
		// нельзя, и область обязана быть рекламной.
		assert.equal(row.scope, "marketing");
		assert.equal(row.intent, "recall");
	});

	test("повторное приглашение в том же месяце не отправляется", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients/recall-candidates/invite",
			headers: ORG_HEADERS,
			payload: { patientId: DUE_PATIENT, channel: "sms", body: "Ещё раз про осмотр." }
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body) as { duplicate: boolean; message: string };

		assert.equal(body.duplicate, true, response.body);
		assert.ok(body.message.includes("уже приглашали"), body.message);
	});

	test("канал, который не отправляется машиной, отклоняется с объяснением", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "POST",
			url: "/api/patients/recall-candidates/invite",
			headers: ORG_HEADERS,
			payload: { patientId: DUE_PATIENT, channel: "phone", body: "Позвоните пациенту." }
		});

		assert.equal(response.statusCode, 400, response.body);
		assert.ok(JSON.parse(response.body).message.includes("позвонить"), response.body);
	});
});
