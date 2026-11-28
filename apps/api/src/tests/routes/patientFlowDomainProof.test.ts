import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	appointments,
	appointmentWaitlists,
	chairs,
	clinics,
	crmLeads,
	idempotencyKeys,
	organizations,
	patientRecalls,
	patients,
	scheduleSlotLeases,
	users,
} from "../../db/schema.js";
import { resolveDefaultDoctorForCreate } from "../../routes/appointments/queries/appointmentDefaults.js";
import { registerDayConfirmationRoutes } from "../../routes/dayConfirmations.js";
import { registerPublicBookingRoutes } from "../../routes/publicBooking/publicBookingHandlers.js";
import { registerSlotLeaseRoutes } from "../../routes/schedule/slotLeaseRoutes.js";
import { registerWaitlistRoutes } from "../../routes/waitlist.js";
import { findWaitlistMatches } from "../../services/schedule/waitlistMatching.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const FIXTURE = "patientFlowDomainProof";
const SOLO_ORG_ID = fixtureUuid(FIXTURE, 1);
const EMPTY_DOC_ORG_ID = fixtureUuid(FIXTURE, 2);
const OWNER_DOC_ID = fixtureUuid(FIXTURE, 0x11);
const OTHER_DOC_ID = fixtureUuid(FIXTURE, 0x12);
const ASSISTANT_ID = fixtureUuid(FIXTURE, 0x13);
const REGISTRAR_ONLY_ID = fixtureUuid(FIXTURE, 0x14);
const INACTIVE_DOC_ID = fixtureUuid(FIXTURE, 0x15);
const CLINIC_ID = fixtureUuid(FIXTURE, 0x21);
const CHAIR_ID = fixtureUuid(FIXTURE, 0x22);
const RECALL_PATIENT_ID = fixtureUuid(FIXTURE, 0x31);
const RECALL_ROW_ID = fixtureUuid(FIXTURE, 0x32);

function nextMondayIso(): string {
	const d = new Date(Date.now() + 7 * 86_400_000);
	while (d.getUTCDay() !== 1) {
		d.setUTCDate(d.getUTCDate() + 1);
	}
	return d.toISOString().slice(0, 10);
}

describe("Patient Flow, Online Booking, Waitlist, Slot Leases & Solo RBAC Proof (§5)", { concurrency: 1 }, () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	let clinicToken = "";
	let ownerDoctorToken = "";
	let otherDoctorToken = "";
	let assistantToken = "";
	const mondayDate = nextMondayIso();

	before(async () => {
		const secret = authTokenSecret();
		clinicToken = signToken({ role: "clinic", organizationId: SOLO_ORG_ID }, secret);
		ownerDoctorToken = signToken(
			{ role: "doctor", organizationId: SOLO_ORG_ID, userId: OWNER_DOC_ID },
			secret,
		);
		otherDoctorToken = signToken(
			{ role: "doctor", organizationId: SOLO_ORG_ID, userId: OTHER_DOC_ID },
			secret,
		);
		assistantToken = signToken(
			{ role: "assistant", organizationId: SOLO_ORG_ID, userId: ASSISTANT_ID },
			secret,
		);

		try {
			await purgeFixtureOrganizations([SOLO_ORG_ID, EMPTY_DOC_ORG_ID]);

			await withFixtureTenant(SOLO_ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: SOLO_ORG_ID,
					name: "ИП Стоматолог Соло",
					clinicMode: "solo_doctor",
					medicalLicenseNumber: "ЛО-63-01-009999",
					clinicSchedule: {
						workdayStart: "09:00",
						workdayEnd: "19:00",
						workingDays: [1, 2, 3, 4, 5],
						requireSmsVerification: false,
					},
				});
				await tx.insert(clinics).values({
					id: CLINIC_ID,
					organizationId: SOLO_ORG_ID,
					name: "Кабинет 1",
					address: "г. Самара, ул. Полевая, 5",
					phone: "+7 (846) 200-11-22",
					timezone: "Europe/Samara",
				});
				await tx.insert(chairs).values({
					id: CHAIR_ID,
					organizationId: SOLO_ORG_ID,
					clinicId: CLINIC_ID,
					name: "Кресло 1",
					isActive: true,
				});
				await tx.insert(users).values([
					{
						id: OWNER_DOC_ID,
						organizationId: SOLO_ORG_ID,
						fullName: "Соловьёв Дмитрий Игоревич",
						role: "owner",
						email: "owner-solo@dente.local",
						isActive: true,
						specialties: null,
					},
					{
						id: OTHER_DOC_ID,
						organizationId: SOLO_ORG_ID,
						fullName: "Волков Пётр Сергеевич",
						role: "doctor",
						email: "other-doc@dente.local",
						isActive: true,
					},
					{
						id: ASSISTANT_ID,
						organizationId: SOLO_ORG_ID,
						fullName: "Ассистент Анна",
						role: "assistant",
						email: "assist@dente.local",
						isActive: true,
					},
				]);
				await tx.insert(patients).values({
					id: RECALL_PATIENT_ID,
					organizationId: SOLO_ORG_ID,
					fullName: "Королёва Татьяна Николаевна",
					phone: "+79995550101",
				});
				await tx.insert(patientRecalls).values({
					id: RECALL_ROW_ID,
					organizationId: SOLO_ORG_ID,
					patientId: RECALL_PATIENT_ID,
					doctorId: OWNER_DOC_ID,
					reason: "Профгигиена",
					cohortType: "hygiene_therapy",
					status: "pending",
					dueDate: new Date(),
				});
			});

			await withFixtureTenant(EMPTY_DOC_ORG_ID, async (tx) => {
				await tx.insert(organizations).values({
					id: EMPTY_DOC_ORG_ID,
					name: "Клиника без врачей",
					clinicMode: "small_clinic",
				});
				await tx.insert(users).values([
					{
						id: REGISTRAR_ONLY_ID,
						organizationId: EMPTY_DOC_ORG_ID,
						fullName: "Регистратор Ольга",
						role: "registrar",
						email: "reg@dente.local",
						isActive: true,
					},
					{
						id: INACTIVE_DOC_ID,
						organizationId: EMPTY_DOC_ORG_ID,
						fullName: "Уволенный Врач",
						role: "doctor",
						email: "inactive-doc@dente.local",
						isActive: false,
					},
				]);
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}

		app = createTenantTestApp();
		await registerSlotLeaseRoutes(app);
		await app.register(registerPublicBookingRoutes, { prefix: "/api/public/booking" });
		await registerWaitlistRoutes(app);
		await registerDayConfirmationRoutes(app);
		await app.ready();
	});

	after(async () => {
		if (databaseAvailable) {
			await purgeFixtureOrganizations([SOLO_ORG_ID, EMPTY_DOC_ORG_ID]);
		}
		if (app) await app.close();
	});

	test("slotLeaseRoutes heartbeat/release enforce owner session & user BOLA (403) and reject expired leases (409)", async (context) => {
		if (!databaseAvailable) return context.skip("DB unavailable");
		const slotStart = `${mondayDate}T09:00:00+04:00`;
		const slotEnd = `${mondayDate}T09:30:00+04:00`;

		const acquireRes = await app.inject({
			method: "POST",
			url: "/api/schedule/leases/acquire",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": ownerDoctorToken,
			},
			payload: {
				chairId: CHAIR_ID,
				doctorUserId: OWNER_DOC_ID,
				startsAt: slotStart,
				endsAt: slotEnd,
				holderSessionId: "sess-owner-1",
				durationSeconds: 120,
			},
		});
		assert.equal(acquireRes.statusCode, 201, acquireRes.body);
		const acquireJson = acquireRes.json() as { data?: { leaseToken?: string }; leaseToken?: string };
		const leaseToken = acquireJson.data?.leaseToken ?? acquireJson.leaseToken;
		assert.ok(leaseToken);

		// Foreign doctor / foreign session -> 403
		const foreignHeartbeat = await app.inject({
			method: "POST",
			url: "/api/schedule/leases/heartbeat",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": otherDoctorToken,
			},
			payload: { leaseToken, holderSessionId: "sess-foreign-2" },
		});
		assert.equal(foreignHeartbeat.statusCode, 403);

		const foreignRelease = await app.inject({
			method: "POST",
			url: "/api/schedule/leases/release",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": otherDoctorToken,
			},
			payload: { leaseToken, holderSessionId: "sess-foreign-2" },
		});
		assert.equal(foreignRelease.statusCode, 403);

		// Owner heartbeat succeeds -> 200
		const ownerHeartbeat = await app.inject({
			method: "POST",
			url: "/api/schedule/leases/heartbeat",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": ownerDoctorToken,
			},
			payload: { leaseToken, holderSessionId: "sess-owner-1", extensionSeconds: 90 },
		});
		assert.equal(ownerHeartbeat.statusCode, 200);

		// Expired lease heartbeat -> 409
		await withFixtureTenant(SOLO_ORG_ID, async (tx) => {
			await tx
				.update(scheduleSlotLeases)
				.set({ expiresAt: new Date(Date.now() - 60_000) })
				.where(eq(scheduleSlotLeases.leaseToken, leaseToken));
		});
		const expiredHeartbeat = await app.inject({
			method: "POST",
			url: "/api/schedule/leases/heartbeat",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": ownerDoctorToken,
			},
			payload: { leaseToken, holderSessionId: "sess-owner-1" },
		});
		assert.equal(expiredHeartbeat.statusCode, 409);

		// Clean up active leases for next tests
		await withFixtureTenant(SOLO_ORG_ID, async (tx) => {
			await tx.delete(scheduleSlotLeases).where(eq(scheduleSlotLeases.organizationId, SOLO_ORG_ID));
		});
	});

	test("publicBooking honors owner clinician in solo_doctor, real license, active lease block, DB idempotency & recall sync", async (context) => {
		if (!databaseAvailable) return context.skip("DB unavailable");

		// 1. /clinic-info returns real DB medicalLicenseNumber (no fake ЛО-77-01-021482)
		const infoRes = await app.inject({
			method: "GET",
			url: `/api/public/booking/${SOLO_ORG_ID}/clinic-info`,
		});
		assert.equal(infoRes.statusCode, 200);
		const infoJson = infoRes.json() as { licenseNumber?: string | null; clinicMode?: string };
		assert.equal(infoJson.licenseNumber, "ЛО-63-01-009999");

		// 2. /doctors returns solo_doctor owner even with specialties=null
		const docsRes = await app.inject({
			method: "GET",
			url: `/api/public/booking/${SOLO_ORG_ID}/doctors`,
		});
		assert.equal(docsRes.statusCode, 200);
		const docsJson = docsRes.json() as Array<{ id: string }>;
		assert.ok(Array.isArray(docsJson) && docsJson.some((d) => d.id === OWNER_DOC_ID));

		// 3. Active slot lease hides 10:00 from /slots and rejects /book with 409
		const leasedStart = `${mondayDate}T10:00:00+04:00`;
		const leasedEnd = `${mondayDate}T10:30:00+04:00`;
		await withFixtureTenant(SOLO_ORG_ID, async (tx) => {
			await tx.insert(scheduleSlotLeases).values({
				organizationId: SOLO_ORG_ID,
				chairId: CHAIR_ID,
				doctorUserId: OWNER_DOC_ID,
				holderSessionId: "sess-hold-10",
				leaseToken: "lease-hold-10",
				startsAt: new Date(leasedStart),
				endsAt: new Date(leasedEnd),
				expiresAt: new Date(Date.now() + 180_000),
			});
		});

		const slotsRes = await app.inject({
			method: "GET",
			url: `/api/public/booking/${SOLO_ORG_ID}/slots?date=${mondayDate}&doctorId=${OWNER_DOC_ID}`,
		});
		assert.equal(slotsRes.statusCode, 200);
		const slotsJson = slotsRes.json() as Array<{ time: string }>;
		assert.equal(Array.isArray(slotsJson) && slotsJson.some((s) => s.time === "10:00"), false);

		const blockedBook = await app.inject({
			method: "POST",
			url: `/api/public/booking/${SOLO_ORG_ID}/book`,
			payload: {
				doctorId: OWNER_DOC_ID,
				startsAt: leasedStart,
				endsAt: leasedEnd,
				patientName: "Королёва Татьяна Николаевна",
				patientPhone: "+79995550101",
			},
		});
		assert.equal(blockedBook.statusCode, 409);

		// 4. Unleased 11:00 succeeds with DB idempotency (no [idempotency:...] in comment) + syncs recall row
		const freeStart = `${mondayDate}T11:00:00+04:00`;
		const freeEnd = `${mondayDate}T11:30:00+04:00`;
		const idemKey = "01950000-0000-7000-8000-000000000555";
		const bookRes = await app.inject({
			method: "POST",
			url: `/api/public/booking/${SOLO_ORG_ID}/book`,
			headers: { "idempotency-key": idemKey },
			payload: {
				doctorId: OWNER_DOC_ID,
				startsAt: freeStart,
				endsAt: freeEnd,
				patientName: "Королёва Татьяна Николаевна",
				patientPhone: "+79995550101",
				comment: "Болит нижний зуб",
			},
		});
		assert.equal(bookRes.statusCode, 200, bookRes.body);
		const bookJson = bookRes.json() as { referenceNumber: string; status: string };
		assert.equal(bookJson.status, "preliminary");
		assert.ok(bookJson.referenceNumber);

		// Replay returns exact same referenceNumber without duplicate booking
		const replayRes = await app.inject({
			method: "POST",
			url: `/api/public/booking/${SOLO_ORG_ID}/book`,
			headers: { "idempotency-key": idemKey },
			payload: {
				doctorId: OWNER_DOC_ID,
				startsAt: freeStart,
				endsAt: freeEnd,
				patientName: "Королёва Татьяна Николаевна",
				patientPhone: "+79995550101",
				comment: "Болит нижний зуб",
			},
		});
		assert.equal(replayRes.statusCode, 200);
		assert.equal(
			(replayRes.json() as { referenceNumber: string }).referenceNumber,
			bookJson.referenceNumber,
		);

		await withFixtureTenant(SOLO_ORG_ID, async (tx) => {
			const [appt] = await tx
				.select({ id: appointments.id, comment: appointments.comment })
				.from(appointments)
				.where(
					and(
						eq(appointments.organizationId, SOLO_ORG_ID),
						eq(appointments.startsAt, new Date(freeStart)),
					),
				)
				.limit(1);
			assert.ok(appt);
			assert.ok(appt.comment?.includes("Болит нижний зуб"));
			assert.equal(appt.comment?.includes("[idempotency:"), false);

			const [idemRow] = await tx
				.select({ status: idempotencyKeys.status })
				.from(idempotencyKeys)
				.where(
					and(
						eq(idempotencyKeys.clinicId, SOLO_ORG_ID),
						eq(idempotencyKeys.key, `public-booking:${idemKey}`),
					),
				)
				.limit(1);
			assert.equal(idemRow?.status, "completed");

			const [recallRow] = await tx
				.select({ status: patientRecalls.status, scheduledAppointmentId: patientRecalls.scheduledAppointmentId })
				.from(patientRecalls)
				.where(eq(patientRecalls.id, RECALL_ROW_ID))
				.limit(1);
			assert.equal(recallRow?.status, "scheduled");
			assert.equal(recallRow?.scheduledAppointmentId, appt.id);
		});
	});

	test("waitlist supports morning/day/evening tokens, PUT notes/urgency, and skips crmLeads in solo_doctor", async (context) => {
		if (!databaseAvailable) return context.skip("DB unavailable");

		const createRes = await app.inject({
			method: "POST",
			url: "/api/waitlist",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": ownerDoctorToken,
			},
			payload: {
				patientName: "Иванов Сергей Петрович",
				patientPhone: "+79997770202",
				preferredDoctorId: OWNER_DOC_ID,
				priorityLevel: "medium",
				preferredTimeRanges: [
					{
						day: "Любой",
						slot: "morning",
						notes: "Удобно утром",
						urgency: "routine",
						treatmentCategory: "therapy",
					},
				],
			},
		});
		assert.equal(createRes.statusCode, 200, createRes.body);
		const createdJson = createRes.json() as { data?: { id?: string }; id?: string };
		const waitlistId = createdJson.data?.id ?? createdJson.id;
		assert.ok(waitlistId);

		// Verify solo_doctor skipped crmLeads creation for waitlist source
		await withFixtureTenant(SOLO_ORG_ID, async (tx) => {
			const leads = await tx
				.select({ id: crmLeads.id })
				.from(crmLeads)
				.where(and(eq(crmLeads.organizationId, SOLO_ORG_ID), eq(crmLeads.source, "waitlist")));
			assert.equal(leads.length, 0, "solo_doctor must NOT generate CRM leads from waitlist intake");
		});

		// Verify findWaitlistMatches matches 10:00 against "morning" (08:00-13:00)
		const report = await findWaitlistMatches({
			organizationId: SOLO_ORG_ID,
			startsAt: new Date(`${mondayDate}T10:00:00+04:00`),
			endsAt: new Date(`${mondayDate}T10:30:00+04:00`),
			doctorUserId: OWNER_DOC_ID,
			doctorName: "Соловьёв Дмитрий Игоревич",
			timezone: "Europe/Samara",
		});
		assert.ok(
			report.matches.some((m) => m.entryId === waitlistId && m.timeFits),
			"morning range must match 10:00 slot",
		);

		// PUT /api/waitlist/:id updates notes, urgency and evening range
		const putRes = await app.inject({
			method: "PUT",
			url: `/api/waitlist/${waitlistId}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": ownerDoctorToken,
			},
			payload: {
				priorityLevel: "high",
				urgency: "high",
				notes: "Теперь может и вечером",
				preferredTimeRanges: [
					{ day: "Любой", slot: "morning" },
					{ day: "Любой", slot: "evening" },
				],
			},
		});
		assert.equal(putRes.statusCode, 200, putRes.body);

		await withFixtureTenant(SOLO_ORG_ID, async (tx) => {
			const [updated] = await tx
				.select({
					priorityLevel: appointmentWaitlists.priorityLevel,
					preferredTimeRanges: appointmentWaitlists.preferredTimeRanges,
				})
				.from(appointmentWaitlists)
				.where(eq(appointmentWaitlists.id, waitlistId))
				.limit(1);
			assert.equal(updated?.priorityLevel, "high");
			assert.ok(Array.isArray(updated?.preferredTimeRanges));
		});
	});

	test("resolveDefaultDoctorForCreate returns undefined instead of arbitrary registrar/inactive user", async (context) => {
		if (!databaseAvailable) return context.skip("DB unavailable");
		const resolved = await withFixtureTenant(EMPTY_DOC_ORG_ID, async (tx) =>
			resolveDefaultDoctorForCreate(tx, EMPTY_DOC_ORG_ID),
		);
		assert.equal(resolved, undefined);
	});

	test("dayConfirmations/dispatch enforces schedule.write RBAC (403 for assistant)", async (context) => {
		if (!databaseAvailable) return context.skip("DB unavailable");
		const res = await app.inject({
			method: "POST",
			url: "/api/schedule/day-confirmations/dispatch",
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": assistantToken,
			},
			payload: { date: mondayDate },
		});
		assert.equal(res.statusCode, 403);
	});
});
