import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	auditEvents,
	chairs,
	clinicalAuditLogs,
	clinics,
	organizations,
	patients,
	scheduleTimeReservations,
	serviceCatalogItems,
	treatmentItems,
	users,
	visitDiaries,
	visits,
} from "../../db/schema.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { registerScheduleRoutes } from "../../routes/schedule.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createIdempotentTenantTestApp } from "../support/tenantTestApp.js";

const FIXTURE = "scheduleTimeReservationsAndNextSlotsTest";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const OTHER_ORG_ID = fixtureUuid(FIXTURE, 2);
const CLINIC_ID = fixtureUuid(FIXTURE, 10);
const CHAIR_ID = fixtureUuid(FIXTURE, 20);
const DOCTOR_ID = fixtureUuid(FIXTURE, 30);
const RECEPTION_ID = fixtureUuid(FIXTURE, 31);
const PATIENT_ID = fixtureUuid(FIXTURE, 40);
const SERVICE_ID = fixtureUuid(FIXTURE, 50);

function getTargetDateIso(offsetDays: number): string {
	const d = new Date(Date.now() + offsetDays * 86_400_000);
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Moscow",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(d);
}

describe("Schedule Time Reservations CRUD, Next-Free-Slots & Recent Visits Summary API", () => {
	let app: FastifyInstance;
	let tokenDoctor: string;
	let tokenReception: string;
	let tokenOtherOrg: string;
	let dbAvailable = true;

	before(async () => {
		try {
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.execute(sql`SELECT 1`);
			});
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
				return;
			}
			throw err;
		}

		app = await createIdempotentTenantTestApp();
		await registerScheduleRoutes(app);
		await registerPatientRoutes(app);
		await app.ready();

		tokenDoctor = signToken(
			{
				userId: DOCTOR_ID,
				organizationId: ORG_ID,
				role: "doctor",
				fullName: "Д-р Воронов И.А.",
			},
			authTokenSecret(),
		);

		tokenReception = signToken(
			{
				userId: RECEPTION_ID,
				organizationId: ORG_ID,
				role: "receptionist",
				fullName: "Администратор Смирнова Е.В.",
			},
			authTokenSecret(),
		);

		tokenOtherOrg = signToken(
			{
				userId: fixtureUuid(FIXTURE, 99),
				organizationId: OTHER_ORG_ID,
				role: "doctor",
				fullName: "Чужой Врач",
			},
			authTokenSecret(),
		);

		await db.delete(treatmentItems).where(eq(treatmentItems.organizationId, ORG_ID));
		await db.delete(visitDiaries).where(eq(visitDiaries.organizationId, ORG_ID));
		await db.delete(visits).where(eq(visits.organizationId, ORG_ID));
		await db.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
		await db.delete(scheduleTimeReservations).where(eq(scheduleTimeReservations.organizationId, ORG_ID));
		await db.delete(scheduleTimeReservations).where(eq(scheduleTimeReservations.organizationId, OTHER_ORG_ID));
		await db.delete(serviceCatalogItems).where(eq(serviceCatalogItems.organizationId, ORG_ID));
		await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
		await db.delete(chairs).where(eq(chairs.organizationId, ORG_ID));
		await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));

		await db
			.insert(organizations)
			.values([
				{ id: ORG_ID, name: "Клиника Тест Резервы", inn: "7702345678" },
				{ id: OTHER_ORG_ID, name: "Клиника Чужая", inn: "7702345679" },
			])
			.onConflictDoNothing();

		await db
			.insert(clinics)
			.values({
				id: CLINIC_ID,
				organizationId: ORG_ID,
				name: "Основное отделение",
				timezone: "Europe/Moscow",
			})
			.onConflictDoNothing();

		await db
			.insert(chairs)
			.values({
				id: CHAIR_ID,
				organizationId: ORG_ID,
				clinicId: CLINIC_ID,
				name: "Кресло 1",
				isActive: true,
			})
			.onConflictDoNothing();

		await db
			.insert(users)
			.values([
				{
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					fullName: "Д-р Воронов И.А.",
					role: "doctor",
					isActive: true,
					workingHours: [
						{ weekday: 1, enabled: true, start: "09:00", end: "18:00" },
						{ weekday: 2, enabled: true, start: "09:00", end: "18:00" },
						{ weekday: 3, enabled: true, start: "09:00", end: "18:00" },
						{ weekday: 4, enabled: true, start: "09:00", end: "18:00" },
						{ weekday: 5, enabled: true, start: "09:00", end: "18:00" },
						{ weekday: 6, enabled: true, start: "10:00", end: "16:00" },
						{ weekday: 7, enabled: true, start: "10:00", end: "15:00" },
					],
				},
				{
					id: RECEPTION_ID,
					organizationId: ORG_ID,
					fullName: "Администратор Смирнова Е.В.",
					role: "receptionist",
					isActive: true,
				},
			])
			.onConflictDoNothing();

		await db
			.insert(patients)
			.values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Ковалёв Сергей Петрович",
				phone: "+7 999 555-44-33",
			})
			.onConflictDoNothing();

		await db
			.insert(serviceCatalogItems)
			.values({
				id: SERVICE_ID,
				organizationId: ORG_ID,
				code: "A16.07.002",
				title: "Лечение среднего кариеса светоотверждаемым композитом",
				category: "therapy",
				specialty: "therapist",
				basePriceRub: 4500,
				priceRub: 4500,
				priceKopecks: 450000n,
				basePriceKopecks: 450000n,
				durationMinutes: 45,
			})
			.onConflictDoNothing();
	});

	after(async () => {
		if (!dbAvailable) return;
		await db.delete(treatmentItems).where(eq(treatmentItems.organizationId, ORG_ID));
		await db.delete(visitDiaries).where(eq(visitDiaries.organizationId, ORG_ID));
		await db.delete(visits).where(eq(visits.organizationId, ORG_ID));
		await db.delete(appointments).where(eq(appointments.organizationId, ORG_ID));
		await db.delete(scheduleTimeReservations).where(eq(scheduleTimeReservations.organizationId, ORG_ID));
		await db.delete(serviceCatalogItems).where(eq(serviceCatalogItems.organizationId, ORG_ID));
		await db.delete(patients).where(eq(patients.organizationId, ORG_ID));
		await db.delete(chairs).where(eq(chairs.organizationId, ORG_ID));
		await db.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
		try {
			await db.delete(users).where(eq(users.organizationId, ORG_ID));
			await db.delete(organizations).where(eq(organizations.id, ORG_ID));
			await db.delete(organizations).where(eq(organizations.id, OTHER_ORG_ID));
		} catch (cleanupErr) {
			// FSTEC append-only audit_events / clinical_audit_logs retain references to test org/doctor rows
			const errObj = cleanupErr as { message?: string; cause?: { code?: string; message?: string } };
			const combined = `${errObj?.message ?? ""} ${errObj?.cause?.code ?? ""} ${errObj?.cause?.message ?? ""}`;
			if (!combined.includes("23503") && !combined.includes("foreign key")) {
				throw cleanupErr;
			}
		}
		if (app) await app.close();
	});

	it("1. CRUD /api/schedule/time-reservations: создаёт, читает по дате, изолирует тенанта и удаляет", async () => {
		if (!dbAvailable) return;

		const targetDate = getTargetDateIso(5);
		const invalidRes = await app.inject({
			method: "POST",
			url: "/api/schedule/time-reservations",
			headers: {
				authorization: `Bearer ${tokenDoctor}`,
				"idempotency-key": randomUUID(),
			},
			payload: {
				chairName: "Кресло 1",
				note: "Обед",
				startTime: `${targetDate}T13:00:00+03:00`,
				endTime: `${targetDate}T13:00:00+03:00`,
				unexpectedField: true,
			},
		});
		assert.strictEqual(invalidRes.statusCode, 400);

		const createRes = await app.inject({
			method: "POST",
			url: "/api/schedule/time-reservations",
			headers: {
				authorization: `Bearer ${tokenDoctor}`,
				"idempotency-key": randomUUID(),
			},
			payload: {
				chairName: "Кресло 1",
				reservationType: "lunch",
				startTime: `${targetDate}T13:00:00+03:00`,
				endTime: `${targetDate}T14:00:00+03:00`,
				bookingLocked: true,
				hatchingStyle: "diagonal_red",
				note: "Обеденный перерыв",
			},
		});
		assert.strictEqual(createRes.statusCode, 201);
		const createdJson = createRes.json();
		assert.strictEqual(createdJson.success, true);
		assert.strictEqual(createdJson.data.note, "Обеденный перерыв");
		const createdId = createdJson.data.id as string;

		const listRes = await app.inject({
			method: "GET",
			url: `/api/schedule/time-reservations?date=${targetDate}`,
			headers: { authorization: `Bearer ${tokenDoctor}` },
		});
		assert.strictEqual(listRes.statusCode, 200);
		const listJson = listRes.json();
		assert.ok(Array.isArray(listJson.data));
		assert.ok(listJson.data.some((r: { id: string }) => r.id === createdId));

		// Другая организация не видит чужой резерв и не может его удалить
		const otherListRes = await app.inject({
			method: "GET",
			url: `/api/schedule/time-reservations?date=${targetDate}`,
			headers: { authorization: `Bearer ${tokenOtherOrg}` },
		});
		assert.strictEqual(otherListRes.statusCode, 200);
		assert.strictEqual(otherListRes.json().data.length, 0);

		const otherDeleteRes = await app.inject({
			method: "DELETE",
			url: `/api/schedule/time-reservations/${createdId}`,
			headers: {
				authorization: `Bearer ${tokenOtherOrg}`,
				"idempotency-key": randomUUID(),
			},
		});
		assert.strictEqual(otherDeleteRes.statusCode, 404);

		// Удаление владельцем
		const deleteRes = await app.inject({
			method: "DELETE",
			url: `/api/schedule/time-reservations/${createdId}`,
			headers: {
				authorization: `Bearer ${tokenDoctor}`,
				"idempotency-key": randomUUID(),
			},
		});
		assert.strictEqual(deleteRes.statusCode, 200);
		assert.strictEqual(deleteRes.json().success, true);

		const afterListRes = await app.inject({
			method: "GET",
			url: `/api/schedule/time-reservations?date=${targetDate}`,
			headers: { authorization: `Bearer ${tokenDoctor}` },
		});
		assert.strictEqual(
			afterListRes.json().data.some((r: { id: string }) => r.id === createdId),
			false,
		);
	});

	it("2. GET /api/appointments/next-free-slots учитывает занятые приёмы и scheduleTimeReservations", async () => {
		if (!dbAvailable) return;

		const day5 = getTargetDateIso(5);
		// Занимаем 09:00-10:00 (или 10:00-11:00 для выходного) приёмом и резервом 10:00-11:00
		const apptStart = new Date(`${day5}T09:00:00+03:00`);
		const apptEnd = new Date(`${day5}T10:00:00+03:00`);
		await db.insert(appointments).values({
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			doctorUserId: DOCTOR_ID,
			chairId: CHAIR_ID,
			status: "planned",
			startsAt: apptStart,
			endsAt: apptEnd,
			reason: "Плановый приём",
		});

		// Резервируем 10:00-11:00 на Кресло 1
		await db.insert(scheduleTimeReservations).values({
			organizationId: ORG_ID,
			chairName: "Кресло 1",
			reservationType: "maintenance",
			startTime: `${day5}T10:00:00+03:00`,
			endTime: `${day5}T11:00:00+03:00`,
			bookingLocked: true,
			hatchingStyle: "diagonal_red",
			note: "Плановое обслуживание установки",
		});

		const res = await app.inject({
			method: "GET",
			url: `/api/appointments/next-free-slots?doctorId=${DOCTOR_ID}&offsetsDays=5,7,14,180&durationMinutes=30`,
			headers: { authorization: `Bearer ${tokenDoctor}` },
		});

		assert.strictEqual(res.statusCode, 200);
		const json = res.json();
		assert.strictEqual(json.success, true);
		assert.strictEqual(json.doctorId, DOCTOR_ID);
		assert.strictEqual(json.durationMinutes, 30);
		assert.ok(Array.isArray(json.slots));
		assert.strictEqual(json.slots.length, 4);

		const slot5 = json.slots.find((s: { offsetDays: number }) => s.offsetDays === 5);
		assert.ok(slot5, "Должен вернуться слот для offsetDays=5");
		assert.strictEqual(slot5.localTime, "11:00");
		assert.strictEqual(slot5.chairId, CHAIR_ID);
	});

	it("3. GET /api/patients/:patientId/visits/recent-summary возвращает до 3 подписанных визитов и соблюдает 152-ФЗ", async () => {
		if (!dbAvailable) return;

		const v1Id = randomUUID();
		const v2Id = randomUUID();
		const v3DraftId = randomUUID();

		await db.insert(visits).values([
			{
				id: v1Id,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				status: "signed",
				complaint: "Боль на холодное в области 36 зуба",
				objectiveStatus: "Зуб 36: глубокая кариозная полость",
				diagnosis: "K02.1 Кариес дентина",
				treatmentPlan: "Препарирование и пломбирование 36 зуба",
				doctorSummary: "Щадящая диета 2 часа",
				draftAutosave: {
					draft: {
						recommendations: "Не принимать пищу 2 часа, контроль через 6 месяцев",
					},
				},
				signedAt: new Date("2026-10-01T12:00:00.000Z"),
			},
			{
				id: v2Id,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				status: "signed",
				complaint: "Плановая гигиена",
				objectiveStatus: "Наддесневые отложения в области нижних резцов",
				diagnosis: "K03.6 Отложения на зубах",
				treatmentPlan: "Ультразвуковая чистка + AirFlow",
				doctorSummary: "Реминерализующая паста 14 дней",
				signedAt: new Date("2026-11-10T12:00:00.000Z"),
			},
			{
				id: v3DraftId,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				status: "draft",
				complaint: "Черновик не должен попадать",
				diagnosis: "K02.0",
			},
		]);

		await db.insert(visitDiaries).values({
			organizationId: ORG_ID,
			visitId: v1Id,
			patientId: PATIENT_ID,
			complaint: "Боль на холодное",
			diagnosisIcd10: "K02.1",
			content: "Дневник приёма",
		});

		await db.insert(treatmentItems).values({
			organizationId: ORG_ID,
			patientId: PATIENT_ID,
			visitId: v1Id,
			serviceId: SERVICE_ID,
			toothCode: "36",
			title: "Лечение среднего кариеса светоотверждаемым композитом",
			quantity: "1",
			priceRub: 4500,
			unitPriceRub: 4500,
			priceKopecks: 450000n,
			unitPriceKopecks: 450000n,
			status: "completed",
		});

		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/visits/recent-summary`,
			headers: { authorization: `Bearer ${tokenDoctor}` },
		});

		assert.strictEqual(res.statusCode, 200);
		const json = res.json();
		assert.strictEqual(json.success, true);
		assert.strictEqual(json.data.length, 2, "Черновик не должен попадать в recent-summary");
		assert.strictEqual(json.data[0].id, v2Id, "Самый свежий визит должен идти первым");
		assert.strictEqual(json.data[1].id, v1Id);
		assert.strictEqual(json.data[1].diagnosis, "K02.1 Кариес дентина");
		assert.strictEqual(
			json.data[1].recommendations,
			"Не принимать пищу 2 часа, контроль через 6 месяцев",
		);
		assert.strictEqual(json.data[1].services.length, 1);
		assert.strictEqual(json.data[1].services[0].totalPriceKopecks, 450000);
		assert.strictEqual(json.data[1].services[0].toothCode, "36");

		// Проверка 152-ФЗ: регистратор не имеет доступа к клиническому summary
		const receptionRes = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/visits/recent-summary`,
			headers: { authorization: `Bearer ${tokenReception}` },
		});
		assert.strictEqual(receptionRes.statusCode, 403);

		// Проверка изоляции арендатора
		const otherOrgRes = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/visits/recent-summary`,
			headers: { authorization: `Bearer ${tokenOtherOrg}` },
		});
		assert.strictEqual(otherOrgRes.statusCode, 404);
	});
});
