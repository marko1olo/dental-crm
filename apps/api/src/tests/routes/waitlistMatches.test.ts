/**
 * Маршрут подбора кандидатов на освободившееся окно.
 *
 * Проверяется поведение целиком, а не только «отвечает 200»: кого маршрут
 * пускает, кому отказывает и в каком порядке возвращает людей. Порядок здесь —
 * это то, кому администратор позвонит первым, а значит кто получит приём.
 */

import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { appointmentWaitlists, appointments, chairs, clinics, organizations, patients, users } from "../../db/schema.js";
import { registerWaitlistMatchRoutes } from "../../routes/waitlistMatches.js";

const ORG_ID = "dce70000-0000-4000-8000-000000000801";
const OTHER_ORG = "dce70000-0000-4000-8000-000000000802";
const DOCTOR_A = "dce70000-0000-4000-8000-000000000811";
const DOCTOR_B = "dce70000-0000-4000-8000-000000000812";
const CHAIR_ID = "dce70000-0000-4000-8000-000000000813";
const CLINIC_ID = "dce70000-0000-4000-8000-000000000814";
/** Пациент, чей приём отменён: его окно и предлагаем. */
const CANCELLED_PATIENT = "dce70000-0000-4000-8000-000000000821";
/** Ждёт того же врача и это же время — должен быть первым. */
const BEST_MATCH = "dce70000-0000-4000-8000-000000000822";
/** Ждёт другого врача — ниже. */
const OTHER_DOCTOR_WAITER = "dce70000-0000-4000-8000-000000000823";
/** Срочный, но время не то. */
const URGENT_WRONG_TIME = "dce70000-0000-4000-8000-000000000824";

const CANCELLED_APPOINTMENT = "dce70000-0000-4000-8000-000000000831";
const ACTIVE_APPOINTMENT = "dce70000-0000-4000-8000-000000000832";
const PAST_CANCELLED = "dce70000-0000-4000-8000-000000000833";

/*
 * У СТРОК ЛИСТА ОЖИДАНИЯ ИДЕНТИФИКАТОРЫ ЗАДАНЫ ЯВНО.
 *
 * appointment_waitlists имеет только первичный ключ defaultRandom() и ни одного
 * уникального ограничения. Без явного id вставка каждый раз получала новый ключ,
 * конфликта не возникало НИКОГДА, и onConflictDoNothing() не отсекал ничего.
 * Прогон, упавший до after(), оставлял три строки, следующий досеивал ещё три —
 * а ниже стоит `matches.length === 3`. Замерено на остатке: `actual: 4,
 * expected: 3` при одной лишней строке. Тест краснел на верном ответе маршрута.
 */
const WAIT_BEST = "dce70000-0000-4000-8000-000000000841";
const WAIT_OTHER_DOCTOR = "dce70000-0000-4000-8000-000000000842";
const WAIT_URGENT = "dce70000-0000-4000-8000-000000000843";

const ORG_HEADERS = { "x-organization-id": ORG_ID };

function isMissingDatabase(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /ECONNREFUSED|does not exist|password authentication|ENOTFOUND/i.test(message);
}

/** Завтра в 10:00 по местному времени — окно, которое освободилось. */
function tomorrowAt(hour: number): Date {
	const date = new Date();
	date.setDate(date.getDate() + 1);
	date.setHours(hour, 0, 0, 0);
	return date;
}

describe("подбор на освободившееся окно", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	const originalEnv = process.env;

	/** Одна и та же уборка до засева и после прогона — иначе она не уборка. */
	async function purgeFixtures(): Promise<void> {
		await db.delete(appointmentWaitlists).where(eq(appointmentWaitlists.organizationId, ORG_ID));
		await db.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
		await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
		await db.delete(chairs).where(eq(chairs.organizationId, ORG_ID));
		await db.delete(users).where(eq(users.organizationId, ORG_ID));
		await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
		await db.delete(organizations).where(eq(organizations.id, ORG_ID));
		await db.delete(organizations).where(eq(organizations.id, OTHER_ORG));
	}

	before(async () => {
		process.env = { ...originalEnv, DENTE_DEV_ALLOW_HEADER_ORG: "1" };
		app = Fastify();
		await registerWaitlistMatchRoutes(app);

		try {
			// Уборка ПЕРЕД засевом, а не только после: прогон, упавший до after(),
			// иначе оставляет строки листа ожидания, и подбор находит лишних.
			await purgeFixtures();

			await db
				.insert(organizations)
				.values([
					{ id: ORG_ID, name: "Клиника листа ожидания" },
					{ id: OTHER_ORG, name: "Соседняя клиника" }
				])
				.onConflictDoNothing();
			await db
				.insert(users)
				.values([
					{ id: DOCTOR_A, organizationId: ORG_ID, fullName: "Врач Первый", role: "doctor" },
					{ id: DOCTOR_B, organizationId: ORG_ID, fullName: "Врач Второй", role: "doctor" }
				])
				.onConflictDoNothing();
			// Кресло стоит в клинике: chairs.clinic_id объявлен notNull, поэтому
			// клиника заводится здесь же, как в остальных тестах по живой базе.
			await db
				.insert(clinics)
				.values({ id: CLINIC_ID, organizationId: ORG_ID, name: "Главная", timezone: "Europe/Moscow" })
				.onConflictDoNothing();
			await db
				.insert(chairs)
				.values({ id: CHAIR_ID, organizationId: ORG_ID, clinicId: CLINIC_ID, name: "Кресло" })
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values([
					{ id: CANCELLED_PATIENT, organizationId: ORG_ID, fullName: "Отменивший Пациент", phone: "+7 916 000-08-01" },
					{ id: BEST_MATCH, organizationId: ORG_ID, fullName: "Подходящий Пациент", phone: "+7 916 000-08-02" },
					{ id: OTHER_DOCTOR_WAITER, organizationId: ORG_ID, fullName: "Ждёт Другого", phone: "+7 916 000-08-03" },
					{ id: URGENT_WRONG_TIME, organizationId: ORG_ID, fullName: "Срочный Неудобный", phone: "+7 916 000-08-04" }
				])
				.onConflictDoNothing();

			await db
				.insert(appointments)
				.values([
					// Отменённое окно завтра в 10:00 у первого врача.
					{
						id: CANCELLED_APPOINTMENT,
						organizationId: ORG_ID,
						patientId: CANCELLED_PATIENT,
						doctorUserId: DOCTOR_A,
						chairId: CHAIR_ID,
						status: "cancelled",
						startsAt: tomorrowAt(10),
						endsAt: new Date(tomorrowAt(10).getTime() + 3_600_000)
					},
					// Живой приём: подбор по нему запрещён.
					{
						id: ACTIVE_APPOINTMENT,
						organizationId: ORG_ID,
						patientId: CANCELLED_PATIENT,
						doctorUserId: DOCTOR_A,
						chairId: CHAIR_ID,
						status: "planned",
						startsAt: tomorrowAt(12),
						endsAt: new Date(tomorrowAt(12).getTime() + 3_600_000)
					},
					// Отменённое окно в прошлом: предлагать некому.
					{
						id: PAST_CANCELLED,
						organizationId: ORG_ID,
						patientId: CANCELLED_PATIENT,
						doctorUserId: DOCTOR_A,
						chairId: CHAIR_ID,
						status: "cancelled",
						startsAt: new Date(Date.now() - 3 * 24 * 3_600_000),
						endsAt: new Date(Date.now() - 3 * 24 * 3_600_000 + 3_600_000)
					}
				])
				.onConflictDoNothing();

			await db
				.insert(appointmentWaitlists)
				.values([
					{
						id: WAIT_BEST,
						organizationId: ORG_ID,
						patientId: BEST_MATCH,
						preferredDoctorId: DOCTOR_A,
						priorityLevel: "medium",
						preferredTimeRanges: ["09:00-13:00"],
						status: "waiting"
					},
					{
						id: WAIT_OTHER_DOCTOR,
						organizationId: ORG_ID,
						patientId: OTHER_DOCTOR_WAITER,
						preferredDoctorId: DOCTOR_B,
						priorityLevel: "medium",
						preferredTimeRanges: ["09:00-13:00"],
						status: "waiting"
					},
					{
						id: WAIT_URGENT,
						organizationId: ORG_ID,
						patientId: URGENT_WRONG_TIME,
						preferredDoctorId: DOCTOR_A,
						priorityLevel: "high",
						preferredTimeRanges: ["18:00-20:00"],
						status: "waiting"
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

	test("первым идёт тот, кому окно действительно подходит", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/appointments/${CANCELLED_APPOINTMENT}/waitlist-matches`,
			headers: ORG_HEADERS
		});
		assert.equal(response.statusCode, 200, response.body);
		const body = JSON.parse(response.body) as {
			matches: { patientId: string; sameDoctor: boolean; timeFits: boolean; reason: string }[];
			slot: { from: string; doctorName: string | null };
		};

		assert.equal(body.matches.length, 3, response.body);
		const first = body.matches[0];
		assert.ok(first);
		assert.equal(first.patientId, BEST_MATCH, "тот же врач и подходящее время должны быть первыми");
		assert.equal(first.sameDoctor, true);
		assert.equal(first.timeFits, true);
		// Объяснение обязательно: «первый в списке» без причины заставляет
		// администратора перепроверять всё руками.
		assert.ok(first.reason.includes("этого же врача"), first.reason);

		// Окно названо временем, а не датой в машинном виде.
		assert.equal(body.slot.from, "10:00");
		assert.equal(body.slot.doctorName, "Врач Первый");
	});

	test("срочный, но с неподходящим временем, не вытесняет подходящего", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/appointments/${CANCELLED_APPOINTMENT}/waitlist-matches`,
			headers: ORG_HEADERS
		});
		const body = JSON.parse(response.body) as { matches: { patientId: string; priorityLevel: string }[] };

		const urgentIndex = body.matches.findIndex((match) => match.patientId === URGENT_WRONG_TIME);
		const bestIndex = body.matches.findIndex((match) => match.patientId === BEST_MATCH);
		assert.ok(bestIndex < urgentIndex, "срочность не важнее того, подходит ли человеку это время");
	});

	test("по живому приёму подбор запрещён и объяснён", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/appointments/${ACTIVE_APPOINTMENT}/waitlist-matches`,
			headers: ORG_HEADERS
		});
		assert.equal(response.statusCode, 400, response.body);
		const message = JSON.parse(response.body).message as string;
		// Отказ должен объяснять, а не просто запрещать: иначе администратор
		// решит, что сломалось.
		assert.ok(message.includes("ещё занято"), message);
	});

	test("окно в прошлом предлагать некому", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/appointments/${PAST_CANCELLED}/waitlist-matches`,
			headers: ORG_HEADERS
		});
		assert.equal(response.statusCode, 400, response.body);
		assert.ok(JSON.parse(response.body).message.includes("в прошлом"), response.body);
	});

	test("приём чужой клиники не находится", async (context) => {
		if (!databaseAvailable) return context.skip("база недоступна");

		const response = await app.inject({
			method: "GET",
			url: `/api/appointments/${CANCELLED_APPOINTMENT}/waitlist-matches`,
			headers: { "x-organization-id": OTHER_ORG }
		});
		// Не 403 и не пустой список: чужой клинике нельзя даже подтверждать, что
		// такой приём существует.
		assert.equal(response.statusCode, 404, response.body);
	});
});
