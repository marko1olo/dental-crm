import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { appointmentActionCodes } from "../../db/communicationsSchema.js";
import {
	appointments,
	clinics,
	communicationOutbox,
	organizations,
	patients,
	users
} from "../../db/schema.js";
import { dayBoundsInTimeZone, registerDayConfirmationRoutes } from "../../routes/dayConfirmations.js";

/**
 * Утренний обзвон.
 *
 * ЗАЧЕМ ЭТОТ ЭКРАН. Подтверждение приёма по ссылке уже работает, но его
 * результата администратор нигде не видел — и продолжал обзванивать всех
 * подряд: половину звонков зря, половину нужных пропуская, потому что не знал,
 * до кого напоминание не дошло.
 *
 * ГЛАВНОЕ, ЧТО ПРОВЕРЯЕТСЯ — поле needsCall. Звонить нужно тому, кто не
 * подтвердил И до кого напоминание не дошло. Доставленное напоминание без
 * ответа поводом для звонка не является: у пациента был выбор.
 */

const ORG_ID = "dce70000-0000-4000-8000-000000000701";
const CLINIC_ID = "dce70000-0000-4000-8000-000000000702";
const DOCTOR_ID = "dce70000-0000-4000-8000-000000000703";
const ORG_HEADERS = { "x-organization-id": ORG_ID };

// Четыре пациента под четыре разных случая.
const CONFIRMED_PATIENT = "dce70000-0000-4000-8000-000000000711";
const DELIVERED_PATIENT = "dce70000-0000-4000-8000-000000000712";
const FAILED_PATIENT = "dce70000-0000-4000-8000-000000000713";
const NO_REMINDER_PATIENT = "dce70000-0000-4000-8000-000000000714";

const CONFIRMED_APPOINTMENT = "dce70000-0000-4000-8000-000000000721";
const DELIVERED_APPOINTMENT = "dce70000-0000-4000-8000-000000000722";
const FAILED_APPOINTMENT = "dce70000-0000-4000-8000-000000000723";
const NO_REMINDER_APPOINTMENT = "dce70000-0000-4000-8000-000000000724";

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|ENOTFOUND|password authentication|does not exist|getaddrinfo|Connection terminated/i.test(message);
}

describe("границы дня в часовом поясе клиники", () => {
	test("сутки начинаются по местному времени, а не по серверному", () => {
		// В клинике на востоке страны «завтра» наступает раньше: считать по
		// серверному поясу значит съехать списком приёмов на сутки.
		const moscow = dayBoundsInTimeZone("2026-07-28", "Europe/Moscow");
		assert.equal(moscow?.from.toISOString(), "2026-07-27T21:00:00.000Z");

		const yekaterinburg = dayBoundsInTimeZone("2026-07-28", "Asia/Yekaterinburg");
		assert.equal(yekaterinburg?.from.toISOString(), "2026-07-27T19:00:00.000Z");

		const utc = dayBoundsInTimeZone("2026-07-28", "UTC");
		assert.equal(utc?.from.toISOString(), "2026-07-28T00:00:00.000Z");
	});

	test("сутки длятся сутки", () => {
		const bounds = dayBoundsInTimeZone("2026-07-28", "Europe/Moscow");
		assert.ok(bounds);
		assert.equal(bounds.to.getTime() - bounds.from.getTime(), 24 * 60 * 60 * 1000 - 1);
	});

	test("испорченная дата и неизвестный пояс не роняют разбор", () => {
		assert.equal(dayBoundsInTimeZone("не дата", "Europe/Moscow"), null);
		assert.equal(dayBoundsInTimeZone("2026-07-28", "Марс/Олимп"), null);
	});
});

describe("список подтверждений на день", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const originalEnv = { ...process.env };
	// Приёмы ставятся на завтра: обзвон делают накануне, и это же значение по
	// умолчанию у маршрута.
	const tomorrowNoon = new Date(Date.now() + 24 * 60 * 60 * 1000);
	tomorrowNoon.setUTCHours(9, 0, 0, 0);
	const isoDate = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Moscow",
		year: "numeric",
		month: "2-digit",
		day: "2-digit"
	}).format(tomorrowNoon);

	before(async () => {
		process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS = "1";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";
		process.env.NODE_ENV = "development";

		app = Fastify();
		await registerDayConfirmationRoutes(app);

		try {
			await db.insert(organizations).values({ id: ORG_ID, name: "Клиника обзвона" }).onConflictDoNothing();
			await db
				.insert(clinics)
				.values({ id: CLINIC_ID, organizationId: ORG_ID, name: "Главная", timezone: "Europe/Moscow" })
				.onConflictDoNothing();
			await db
				.insert(users)
				.values({ id: DOCTOR_ID, organizationId: ORG_ID, fullName: "Смирнов Сергей Сергеевич", role: "doctor" })
				.onConflictDoNothing();
			await db
				.insert(patients)
				.values([
					{ id: CONFIRMED_PATIENT, organizationId: ORG_ID, fullName: "Подтвердил Пётр", phone: "+7 916 000-07-01" },
					{ id: DELIVERED_PATIENT, organizationId: ORG_ID, fullName: "Получил Павел", phone: "+7 916 000-07-02" },
					{ id: FAILED_PATIENT, organizationId: ORG_ID, fullName: "Недоставлен Дмитрий", phone: "+7 916 000-07-03" },
					// Без телефона: напоминание отправить некуда, звонить тоже.
					{ id: NO_REMINDER_PATIENT, organizationId: ORG_ID, fullName: "Безномера Николай", phone: null }
				])
				.onConflictDoNothing();

			const slot = (offsetHours: number) => ({
				startsAt: new Date(tomorrowNoon.getTime() + offsetHours * 3_600_000),
				endsAt: new Date(tomorrowNoon.getTime() + offsetHours * 3_600_000 + 3_600_000)
			});

			await db
				.insert(appointments)
				.values([
					{ id: CONFIRMED_APPOINTMENT, organizationId: ORG_ID, patientId: CONFIRMED_PATIENT, doctorUserId: DOCTOR_ID, status: "confirmed", ...slot(0) },
					{ id: DELIVERED_APPOINTMENT, organizationId: ORG_ID, patientId: DELIVERED_PATIENT, doctorUserId: DOCTOR_ID, status: "planned", ...slot(1) },
					{ id: FAILED_APPOINTMENT, organizationId: ORG_ID, patientId: FAILED_PATIENT, doctorUserId: DOCTOR_ID, status: "planned", ...slot(2) },
					{ id: NO_REMINDER_APPOINTMENT, organizationId: ORG_ID, patientId: NO_REMINDER_PATIENT, doctorUserId: DOCTOR_ID, status: "planned", ...slot(3) }
				])
				.onConflictDoNothing();

			await db
				.insert(communicationOutbox)
				.values([
					{
						organizationId: ORG_ID,
						patientId: CONFIRMED_PATIENT,
						channel: "sms",
						intent: "appointment_confirmation",
						recipientAddress: "79160000701",
						body: "Напоминание",
						status: "delivered",
						sentAt: new Date(),
						deliveredAt: new Date(),
						receiptDetail: "SMS.RU 103: Доставлено",
						dedupeKey: `reminder:${CONFIRMED_APPOINTMENT}:24`
					},
					{
						organizationId: ORG_ID,
						patientId: DELIVERED_PATIENT,
						channel: "sms",
						intent: "appointment_confirmation",
						recipientAddress: "79160000702",
						body: "Напоминание",
						status: "delivered",
						sentAt: new Date(),
						deliveredAt: new Date(),
						receiptDetail: "SMS.RU 103: Доставлено",
						dedupeKey: `reminder:${DELIVERED_APPOINTMENT}:24`
					},
					{
						organizationId: ORG_ID,
						patientId: FAILED_PATIENT,
						channel: "sms",
						intent: "appointment_confirmation",
						recipientAddress: "79160000703",
						body: "Напоминание",
						status: "failed",
						lastErrorMessage: "Не доставлено: истёк срок жизни сообщения",
						dedupeKey: `reminder:${FAILED_APPOINTMENT}:24`
					}
				])
				.onConflictDoNothing();

			// Пациент нажал ссылку — это видно отдельно от статуса записи.
			await db
				.insert(appointmentActionCodes)
				.values({
					code: "ConfirmAA1",
					organizationId: ORG_ID,
					appointmentId: CONFIRMED_APPOINTMENT,
					action: "confirm",
					expiresAt: new Date(Date.now() + 86_400_000),
					usedAt: new Date()
				})
				.onConflictDoNothing();
		} catch (error) {
			if (!isMissingDatabase(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await db.delete(appointmentActionCodes).where(eq(appointmentActionCodes.organizationId, ORG_ID));
			await db.delete(communicationOutbox).where(eq(communicationOutbox.organizationId, ORG_ID));
			await db.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
			await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
			await db.delete(users).where(eq(users.organizationId, ORG_ID));
			await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
			await db.delete(organizations).where(eq(organizations.id, ORG_ID));
		}
		await app.close();
		process.env = originalEnv;
	});

	test("по умолчанию берётся завтрашний день в поясе клиники", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({ method: "GET", url: "/api/schedule/day-confirmations", headers: ORG_HEADERS });
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.date, isoDate, `ожидалась дата ${isoDate}`);
		assert.equal(body.timeZone, "Europe/Moscow");
		assert.equal(body.summary.total, 4, JSON.stringify(body.summary));
	});

	test("звонить нужно только тем, до кого напоминание не дошло", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/schedule/day-confirmations?date=${isoDate}`,
			headers: ORG_HEADERS
		});
		const body = JSON.parse(response.body);
		const byId = new Map(body.rows.map((row: { appointmentId: string }) => [row.appointmentId, row]));

		// Подтвердил — звонить не нужно.
		assert.equal(byId.get(CONFIRMED_APPOINTMENT)?.needsCall, false);
		// Напоминание доставлено, ответа нет: выбор у пациента был, звонок не нужен.
		assert.equal(byId.get(DELIVERED_APPOINTMENT)?.needsCall, false);
		// Напоминание не доставлено — человек просто ничего не знает.
		assert.equal(byId.get(FAILED_APPOINTMENT)?.needsCall, true);
		// Напоминание вообще не ставилось.
		assert.equal(byId.get(NO_REMINDER_APPOINTMENT)?.needsCall, true);

		assert.equal(body.summary.needsCall, 2, JSON.stringify(body.summary));
		assert.equal(body.summary.confirmed, 1);
		assert.equal(body.summary.awaiting, 3);
		assert.equal(body.summary.withoutPhone, 1);
	});

	test("состояние напоминания и причина отказа видны в строке", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/schedule/day-confirmations?date=${isoDate}`,
			headers: ORG_HEADERS
		});
		const body = JSON.parse(response.body);
		const byId = new Map(body.rows.map((row: { appointmentId: string }) => [row.appointmentId, row]));

		assert.equal(byId.get(DELIVERED_APPOINTMENT)?.reminder.state, "delivered");
		assert.equal(byId.get(FAILED_APPOINTMENT)?.reminder.state, "failed");
		assert.ok(byId.get(FAILED_APPOINTMENT)?.reminder.detail?.includes("истёк срок"));
		assert.equal(byId.get(NO_REMINDER_APPOINTMENT)?.reminder.state, "not_queued");
	});

	test("нажатие ссылки видно отдельно от статуса записи", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/schedule/day-confirmations?date=${isoDate}`,
			headers: ORG_HEADERS
		});
		const body = JSON.parse(response.body);
		const byId = new Map(body.rows.map((row: { appointmentId: string }) => [row.appointmentId, row]));

		assert.notEqual(byId.get(CONFIRMED_APPOINTMENT)?.patientClickedAt, null);
		assert.equal(byId.get(DELIVERED_APPOINTMENT)?.patientClickedAt, null);
	});

	test("строки идут по времени приёма", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/schedule/day-confirmations?date=${isoDate}`,
			headers: ORG_HEADERS
		});
		const body = JSON.parse(response.body);
		const times = body.rows.map((row: { startsAt: string }) => new Date(row.startsAt).getTime());
		assert.deepEqual(times, [...times].sort((left, right) => left - right));
		// Врач подставлен по идентификатору, а не «Врач клиники».
		assert.equal(body.rows[0].doctorName, "Смирнов Сергей Сергеевич");
	});

	test("день без приёмов помечен явно", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/schedule/day-confirmations?date=2020-01-01",
			headers: ORG_HEADERS
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body);
		assert.equal(body.isEmpty, true);
		assert.equal(body.summary.total, 0);
		assert.deepEqual(body.rows, []);
	});

	test("испорченная дата отклоняется", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: "/api/schedule/day-confirmations?date=28.07.2026",
			headers: ORG_HEADERS
		});
		assert.equal(response.statusCode, 400, response.body);
	});

	test("данные чужой организации не видны", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/schedule/day-confirmations?date=${isoDate}`,
			headers: { "x-organization-id": "dce70000-0000-4000-8000-0000000007ff" }
		});
		assert.equal(response.statusCode, 200, response.body);
		assert.equal(JSON.parse(response.body).summary.total, 0);
	});
});
