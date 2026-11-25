import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	attachments,
	chairs,
	clinics,
	crmLeads,
	organizations,
	patientPhotoProtocols,
	patients,
	users,
	visits,
} from "../../db/schema.js";
import { registerFilesRoutes } from "../../routes/files.js";
import { registerLeadsRoutes } from "../../routes/leads.js";
import { registerMarketingRoutes } from "../../routes/marketing.js";
import { registerPatientDuplicateRoutes } from "../../routes/patientDuplicates.js";
import { registerPatientRoutes } from "../../routes/patients.js";
import { registerPhotoBridgeRoutes } from "../../routes/photoBridgeRoutes.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const FIXTURE = "wave9LeadsPatientsSecurityAndResilience";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const ORG_NO_DOCTOR_ID = fixtureUuid(FIXTURE, 2);
const PATIENT_ACTIVE_ID = fixtureUuid(FIXTURE, 3);
const PATIENT_ARCHIVED_ID = fixtureUuid(FIXTURE, 4);
const VISIT_ID = fixtureUuid(FIXTURE, 5);
const DOCTOR_ID = fixtureUuid(FIXTURE, 6);
const RECEPTIONIST_ID = fixtureUuid(FIXTURE, 7);
const ADMIN_ONLY_ID = fixtureUuid(FIXTURE, 8);
const CHAIR_ID = fixtureUuid(FIXTURE, 9);
const TRAVERSAL_ATT_ID = fixtureUuid(FIXTURE, 10);
const CLINIC_ID = fixtureUuid(FIXTURE, 11);

describe("Wave 9 Red-Team Fixer Proof: Leads, Marketing, Files, Photos & Patients", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	let clinicToken = "";
	let clinicNoDocToken = "";
	let doctorStaffToken = "";
	let receptionistStaffToken = "";
	let adminNoDocToken = "";

	before(async () => {
		try {
			await purgeFixtureOrganizations([ORG_ID, ORG_NO_DOCTOR_ID]);
			const secret = authTokenSecret();
			clinicToken = signToken({ organizationId: ORG_ID, clinicId: ORG_ID }, secret, 3600);
			clinicNoDocToken = signToken({ organizationId: ORG_NO_DOCTOR_ID, clinicId: ORG_NO_DOCTOR_ID }, secret, 3600);
			doctorStaffToken = signToken(
				{ userId: DOCTOR_ID, organizationId: ORG_ID, role: "doctor", staffId: DOCTOR_ID },
				secret,
				3600,
			);
			receptionistStaffToken = signToken(
				{ userId: RECEPTIONIST_ID, organizationId: ORG_ID, role: "receptionist", staffId: RECEPTIONIST_ID },
				secret,
				3600,
			);
			adminNoDocToken = signToken(
				{ userId: ADMIN_ONLY_ID, organizationId: ORG_NO_DOCTOR_ID, role: "admin", staffId: ADMIN_ONLY_ID },
				secret,
				3600,
			);

			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx
					.insert(organizations)
					.values({ id: ORG_ID, name: "Wave9 Test Clinic" })
					.onConflictDoNothing();
				await tx
					.insert(clinics)
					.values({ id: CLINIC_ID, organizationId: ORG_ID, name: "Wave9 Main Branch" })
					.onConflictDoNothing();
				await tx.insert(users).values([
					{
						id: DOCTOR_ID,
						organizationId: ORG_ID,
						email: "w9-doc@test.local",
						passwordHash: "hash",
						fullName: "Врач Тестовый",
						role: "doctor",
						isActive: true,
					},
					{
						id: RECEPTIONIST_ID,
						organizationId: ORG_ID,
						email: "w9-rec@test.local",
						passwordHash: "hash",
						fullName: "Админ Регистратор",
						role: "receptionist",
						isActive: true,
					},
				]).onConflictDoNothing();
				await tx.insert(chairs).values({
					id: CHAIR_ID,
					organizationId: ORG_ID,
					clinicId: CLINIC_ID,
					name: "Кресло 1",
					isActive: true,
				}).onConflictDoNothing();
				await tx.insert(patients).values([
					{
						id: PATIENT_ACTIVE_ID,
						organizationId: ORG_ID,
						fullName: "Волков Павел Сергеевич",
						phone: "+79991112233",
						status: "active",
					},
					{
						id: PATIENT_ARCHIVED_ID,
						organizationId: ORG_ID,
						fullName: "Архивов Пётр Иванович",
						phone: "+79991112244",
						status: "archived",
					},
				]).onConflictDoNothing();
				await tx.insert(visits).values({
					id: VISIT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ACTIVE_ID,
					status: "draft",
				}).onConflictDoNothing();
				await tx.insert(attachments).values({
					id: TRAVERSAL_ATT_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ACTIVE_ID,
					fileName: "secret.txt",
					mimeType: "text/plain",
					storagePath: "../../package.json",
					sha256: "0".repeat(64),
				}).onConflictDoNothing();
			});

			await withFixtureTenant(ORG_NO_DOCTOR_ID, async (tx) => {
				await tx
					.insert(organizations)
					.values({ id: ORG_NO_DOCTOR_ID, name: "Wave9 NoDoc Clinic" })
					.onConflictDoNothing();
				await tx.insert(users).values({
					id: ADMIN_ONLY_ID,
					organizationId: ORG_NO_DOCTOR_ID,
					email: "w9-admin-only@test.local",
					passwordHash: "hash",
					fullName: "Только Админ",
					role: "admin",
					isActive: true,
				}).onConflictDoNothing();
			});

			app = createTenantTestApp();
			await registerLeadsRoutes(app);
			await registerMarketingRoutes(app);
			await registerFilesRoutes(app);
			await registerPatientRoutes(app);
			await registerPhotoBridgeRoutes(app);
			await registerPatientDuplicateRoutes(app);
			await app.ready();
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				databaseAvailable = false;
				return;
			}
			throw err;
		}
	});

	const uploadedFilesToClean: string[] = [];

	after(async () => {
		await app?.close();
		for (const p of uploadedFilesToClean) {
			await fs.rm(p, { force: true }).catch(() => undefined);
		}
		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID, ORG_NO_DOCTOR_ID]);
		}
	});

	const staffHeaders = () => ({
		"x-dente-clinic-token": clinicToken,
		"x-dente-staff-token": doctorStaffToken,
	});

	test("L01 & L02: .strict() schemas, expectedRevenue validation, UUID checks & PUT expectedRevenueKopecks", async (t) => {
		if (!databaseAvailable) return t.skip("БД недоступна");

		// Invalid expectedRevenue rejected (400), not swallowed as null
		const badRevRes = await app.inject({
			method: "POST",
			url: "/api/leads",
			headers: staffHeaders(),
			payload: { name: "Лид с мусором", expectedRevenue: "abc-invalid" },
		});
		assert.equal(badRevRes.statusCode, 400);

		// Unknown extra field rejected (.strict())
		const extraFieldRes = await app.inject({
			method: "POST",
			url: "/api/leads",
			headers: staffHeaders(),
			payload: { name: "Лид 1", injectedExtra: 123 },
		});
		assert.equal(extraFieldRes.statusCode, 400);

		// Non-UUID :id rejected with 400 instead of PG 22P02 500
		const badUuidRes = await app.inject({
			method: "GET",
			url: "/api/leads/not-a-uuid/stage-history",
			headers: staffHeaders(),
		});
		assert.equal(badUuidRes.statusCode, 400);

		// Create & PUT updates expectedRevenueKopecks cleanly
		const createRes = await app.inject({
			method: "POST",
			url: "/api/leads",
			headers: staffHeaders(),
			payload: { name: "Имплантация тест", phone: "+79998887766", expectedRevenue: 10000 },
		});
		assert.equal(createRes.statusCode, 200);
		const created = createRes.json() as { id: string };

		const putRes = await app.inject({
			method: "PUT",
			url: `/api/leads/${created.id}`,
			headers: staffHeaders(),
			payload: { name: "Имплантация тест", expectedRevenue: 25000.5 },
		});
		assert.equal(putRes.statusCode, 200);

		const [row] = await withFixtureTenant(ORG_ID, (tx) =>
			tx.select().from(crmLeads).where(eq(crmLeads.id, created.id)),
		);
		assert.equal(Number(row?.expectedRevenueKopecks), 2500050);

		// PATCH /status accepts dropReason + reason and rejects extra fields
		const badStatus = await app.inject({
			method: "PATCH",
			url: `/api/leads/${created.id}/status`,
			headers: staffHeaders(),
			payload: { status: "trash", dropReason: "дорого", hackerFlag: true },
		});
		assert.equal(badStatus.statusCode, 400);

		const okStatus = await app.inject({
			method: "PATCH",
			url: `/api/leads/${created.id}/status`,
			headers: staffHeaders(),
			payload: { status: "trash", dropReason: "дорого", reason: "дорого" },
		});
		assert.equal(okStatus.statusCode, 200);
		assert.equal(okStatus.json().dropReason, "дорого");
	});

	test("L03 & L04: convert validates Idempotency-Key, allows converted -> consult_booked, and never falls back to admin user", async (t) => {
		if (!databaseAvailable) return t.skip("БД недоступна");

		const createRes = await app.inject({
			method: "POST",
			url: "/api/leads",
			headers: staffHeaders(),
			payload: { name: "Конверсия этап 2", phone: "+79997776655" },
		});
		const leadId = createRes.json().id as string;

		// Invalid Idempotency-Key -> 400
		const badIdemRes = await app.inject({
			method: "POST",
			url: `/api/leads/${leadId}/create-patient`,
			headers: { ...staffHeaders(), "Idempotency-Key": "not-uuid" },
		});
		assert.equal(badIdemRes.statusCode, 400);

		// Create patient sets status = converted
		const cpRes = await app.inject({
			method: "POST",
			url: `/api/leads/${leadId}/create-patient`,
			headers: staffHeaders(),
		});
		assert.equal(cpRes.statusCode, 201);
		const [leadAfterCp] = await withFixtureTenant(ORG_ID, (tx) =>
			tx.select().from(crmLeads).where(eq(crmLeads.id, leadId)),
		);
		assert.equal(leadAfterCp?.status, "converted");

		// Now convert with appointment dates -> must succeed (NOT 409) and move to consult_booked
		const idemKey = "01950000-0000-7000-8000-000000000001";
		const startsAt = new Date(Date.now() + 86_400_000).toISOString();
		const endsAt = new Date(Date.now() + 86_400_000 + 1800_000).toISOString();
		const convRes = await app.inject({
			method: "POST",
			url: `/api/leads/${leadId}/convert`,
			headers: { ...staffHeaders(), "Idempotency-Key": idemKey },
			payload: { appointmentStart: startsAt, appointmentEnd: endsAt },
		});
		assert.equal(convRes.statusCode, 200, convRes.body);
		assert.equal(convRes.headers["idempotency-key"], idemKey);
		const [leadAfterConv] = await withFixtureTenant(ORG_ID, (tx) =>
			tx.select().from(crmLeads).where(eq(crmLeads.id, leadId)),
		);
		assert.equal(leadAfterConv?.status, "consult_booked");

		// Clinic with only admin user (no doctor) must fail with 400 DoctorNotFound instead of scheduling on admin
		const noDocLeadRes = await app.inject({
			method: "POST",
			url: "/api/leads",
			headers: {
				"x-dente-clinic-token": clinicNoDocToken,
				"x-dente-staff-token": adminNoDocToken,
			},
			payload: { name: "Лид без врача", phone: "+79990009988" },
		});
		assert.equal(noDocLeadRes.statusCode, 200);
		const noDocLeadId = noDocLeadRes.json().id as string;

		const noDocConvRes = await app.inject({
			method: "POST",
			url: `/api/leads/${noDocLeadId}/convert`,
			headers: {
				"x-dente-clinic-token": clinicNoDocToken,
				"x-dente-staff-token": adminNoDocToken,
			},
			payload: { appointmentStart: startsAt, appointmentEnd: endsAt },
		});
		assert.equal(noDocConvRes.statusCode, 400);
		assert.equal(noDocConvRes.json().error, "DoctorNotFound");
	});

	test("L05: marketing promos validate Idempotency-Key & .strict()", async (t) => {
		if (!databaseAvailable) return t.skip("БД недоступна");

		const badReset = await app.inject({
			method: "POST",
			url: "/api/marketing/romi-channels/reset",
			headers: { ...staffHeaders(), "Idempotency-Key": "invalid-uuid" },
		});
		assert.equal(badReset.statusCode, 400);

		const badPromo = await app.inject({
			method: "POST",
			url: "/api/marketing/promos",
			headers: staffHeaders(),
			payload: {
				id: "p1",
				title: "Test",
				discountText: "10%",
				promoCode: "TEST10",
				templates: { sms: "a", whatsapp: "b", telegram: "c" },
				extraUnknownKey: "nope",
			},
		});
		assert.equal(badPromo.statusCode, 400);
	});

	test("P01: downloadAttachment blocks invalid UUID & path traversal", async (t) => {
		if (!databaseAvailable) return t.skip("БД недоступна");

		const badUuid = await app.inject({
			method: "GET",
			url: "/api/attachments/not-uuid/download",
			headers: staffHeaders(),
		});
		assert.equal(badUuid.statusCode, 400);

		const trav = await app.inject({
			method: "GET",
			url: `/api/attachments/${TRAVERSAL_ATT_ID}/download`,
			headers: staffHeaders(),
		});
		assert.equal(trav.statusCode, 400);
		assert.equal(trav.json().error, "InvalidStoragePath");
	});

	test("P02 & P03: photo-protocol upserts without duplicates, blocks chairside bypass & validates magic bytes", async (t) => {
		if (!databaseAvailable) return t.skip("БД недоступна");

		const prevDemoLogin = process.env.DENTE_ALLOW_DEMO_LOGIN;
		const prevDemoMode = process.env.DENTE_DEMO_MODE;
		const prevDemoShowcase = process.env.DENTE_DEMO_SHOWCASE;
		delete process.env.DENTE_ALLOW_DEMO_LOGIN;
		delete process.env.DENTE_DEMO_MODE;
		delete process.env.DENTE_DEMO_SHOWCASE;
		try {
			const chairsideRes = await app.inject({
				method: "GET",
				url: "/api/patients/chairside/photos",
				headers: staffHeaders(),
			});
			assert.equal(chairsideRes.statusCode, 404);
		} finally {
			if (prevDemoLogin !== undefined) process.env.DENTE_ALLOW_DEMO_LOGIN = prevDemoLogin;
			if (prevDemoMode !== undefined) process.env.DENTE_DEMO_MODE = prevDemoMode;
			if (prevDemoShowcase !== undefined) process.env.DENTE_DEMO_SHOWCASE = prevDemoShowcase;
		}

		// Upsert same visit + stage twice => only 1 row in DB
		for (const note of ["v1", "v2"]) {
			const res = await app.inject({
				method: "POST",
				url: `/api/visits/${VISIT_ID}/photo-protocol`,
				headers: staffHeaders(),
				payload: {
					presetId: "express_6_slots",
					stage: "during",
					notes: note,
					slots: { frontal_smile: "/api/attachments/ok.webp" },
				},
			});
			assert.equal(res.statusCode, 200);
		}
		const protoRows = await withFixtureTenant(ORG_ID, (tx) =>
			tx
				.select()
				.from(patientPhotoProtocols)
				.where(
					and(
						eq(patientPhotoProtocols.visitId, VISIT_ID),
						eq(patientPhotoProtocols.organizationId, ORG_ID),
					),
				),
		);
		assert.equal(protoRows.length, 1);
		assert.equal(protoRows[0]?.notes, "v2");

		// Photo bridge: reject invalid magic bytes & accept multi-part form with slotId + WEBP
		const sessRes = await app.inject({
			method: "POST",
			url: "/api/photo-bridge/session",
			headers: staffHeaders(),
			payload: { patientId: PATIENT_ACTIVE_ID, visitId: VISIT_ID },
		});
		assert.equal(sessRes.statusCode, 201);
		const token = sessRes.json().token as string;

		const fakeImg = await app.inject({
			method: "POST",
			url: `/api/photo-bridge/upload/${token}`,
			payload: {
				imageBase64: Buffer.from("not-an-image-script").toString("base64"),
				fileName: "evil.webp",
			},
		});
		assert.equal(fakeImg.statusCode, 400);
		assert.equal(fakeImg.json().error, "UnsupportedImageMagicBytes");

		const boundary = "----Wave9Boundary123";
		const multiPayload = Buffer.concat([
			Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="slotId"\r\n\r\nocclusal_upper\r\n`),
			Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="tooth.webp"\r\nContent-Type: image/webp\r\n\r\n`),
			Buffer.from("RIFF\x20\x00\x00\x00WEBPVP8 \x0a\x00\x00\x00testbytes"),
			Buffer.from(`\r\n--${boundary}--\r\n`),
		]);
		const okMulti = await app.inject({
			method: "POST",
			url: `/api/photo-bridge/upload/${token}`,
			headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
			payload: multiPayload,
		});
		assert.equal(okMulti.statusCode, 201, okMulti.body);
		assert.equal(okMulti.json().photo.slotId, "occlusal_upper");
		const uploadedId = okMulti.json().photo.id as string;
		const [attRow] = await withFixtureTenant(ORG_ID, (tx) =>
			tx.select().from(attachments).where(eq(attachments.id, uploadedId)),
		);
		if (attRow?.storagePath) {
			uploadedFilesToClean.push(path.resolve(process.cwd(), "uploads", attRow.storagePath));
		}
	});

	test("P04, P05 & P06: archived header spoof blocked, strict merge/reclamation, and predict-no-show 404", async (t) => {
		if (!databaseAvailable) return t.skip("БД недоступна");

		const spoofRes = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ARCHIVED_ID}`,
			headers: {
				"x-dente-clinic-token": clinicToken,
				"x-dente-staff-token": receptionistStaffToken,
				"x-clinical-role": "doctor",
				"x-can-sign-medical-records": "true",
			},
		});
		assert.equal(spoofRes.statusCode, 403);

		const strictMerge = await app.inject({
			method: "POST",
			url: "/api/patients/duplicates/merge",
			headers: staffHeaders(),
			payload: {
				primaryPatientId: PATIENT_ACTIVE_ID,
				duplicatePatientId: PATIENT_ARCHIVED_ID,
				unexpectedKey: true,
			},
		});
		assert.equal(strictMerge.statusCode, 400);

		const missingRisk = await app.inject({
			method: "POST",
			url: "/api/ai/predict-no-show",
			headers: staffHeaders(),
			payload: { patientId: fixtureUuid(FIXTURE, 99) },
		});
		assert.equal(missingRisk.statusCode, 404);
		assert.equal(missingRisk.json().error, "PatientNotFound");

		const badRecl = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ACTIVE_ID}/reclamations`,
			headers: staffHeaders(),
			payload: { complicationDetails: "Скол пломбы", toothNumber: 99 },
		});
		assert.equal(badRecl.statusCode, 400);
	});
});
