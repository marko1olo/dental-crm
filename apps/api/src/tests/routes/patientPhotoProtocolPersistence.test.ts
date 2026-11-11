import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { eq } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import {
	attachments,
	organizations,
	patientPhotoProtocols,
	patients,
	users,
} from "../../db/schema.js";
import { TOKEN_SECRET } from "../../routes/auth.js";
import { registerPatientRoutes } from "../../routes/patients/index.js";
import { signToken } from "../../utils/cryptoHelper.js";

const ORG_ID = "00000000-0000-7000-8000-000000000777";
const OTHER_ORG_ID = "00000000-0000-7000-8000-000000000888";
const PATIENT_ID = "00000000-0000-7000-8000-000000000999";
const USER_ID = "00000000-0000-7000-8000-000000000666";

describe("Patient Photo Protocol Persistence API (PostgreSQL 18, Mandate 8aq / PHO-03)", () => {
	let app: FastifyInstance;
	let clinicHeaders: Record<string, string>;
	let otherOrgHeaders: Record<string, string>;

	before(async () => {
		// Создаем тестовую организацию, пользователя и пациента
		try {
			await db
				.insert(organizations)
				.values([
					{ id: ORG_ID, name: "Photo Test Clinic", inn: "7701234567" },
					{ id: OTHER_ORG_ID, name: "Alien Clinic", inn: "7701234568" },
				])
				.onConflictDoNothing();

			await db
				.insert(users)
				.values({
					id: USER_ID,
					organizationId: ORG_ID,
					passwordHash: "hash",
					fullName: "Доктор Фотографов",
					role: "doctor",
				})
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Пациент Снимков А. И.",
					phone: "+79991112233",
					administrativeProfile: {
						gender: "male",
					},
				})
				.onConflictDoNothing();
		} catch (e) {
			console.warn("DB setup notice in photo protocol test:", e);
		}

		app = Fastify({ logger: false });
		await registerPatientRoutes(app);
		await app.ready();

		const token = signToken({ organizationId: ORG_ID }, TOKEN_SECRET(), 3600);
		clinicHeaders = { "x-dente-clinic-token": token };

		const otherToken = signToken(
			{ organizationId: OTHER_ORG_ID },
			TOKEN_SECRET(),
			3600,
		);
		otherOrgHeaders = { "x-dente-clinic-token": otherToken };
	});

	after(async () => {
		try {
			await db
				.delete(patientPhotoProtocols)
				.where(eq(patientPhotoProtocols.organizationId, ORG_ID));
		} catch {
			// ignore cleanup
		}
		await app.close();
	});

	it("1. GET /api/patients/:patientId/photos returns empty protocol initially without 500 error", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/photos`,
			headers: clinicHeaders,
		});

		assert.equal(res.statusCode, 200);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.ok(Array.isArray(json.photos));
	});

	it("2. POST /api/patients/:patientId/photos persists photo protocol slots in PostgreSQL 18", async () => {
		const payload = {
			presetId: "express_6_slots",
			stage: "before",
			notes: "Первичный эстетический фотопротокол до ортодонтического лечения",
			slots: {
				portrait_smile: {
					slotId: "portrait_smile",
					imageUrl: "/api/attachments/test-photo-1/download",
					uploadedAt: new Date().toISOString(),
					notes: "Широкая улыбка",
				},
				frontal_occlusion: {
					slotId: "frontal_occlusion",
					imageUrl: "/api/attachments/test-photo-2/download",
					uploadedAt: new Date().toISOString(),
					notes: "Фронтальная окклюзия",
				},
			},
		};

		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/photos`,
			headers: clinicHeaders,
			payload,
		});

		assert.equal(res.statusCode, 200);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.equal(json.protocol.presetId, "express_6_slots");
		assert.equal(json.protocol.stage, "before");
		assert.equal(json.protocol.slots.portrait_smile.slotId, "portrait_smile");
		assert.equal(
			json.protocol.slots.portrait_smile.imageUrl,
			"/api/attachments/test-photo-1/download",
		);
	});

	it("3. Subsequent GET /api/patients/:patientId/photos returns persisted protocol data from PostgreSQL 18", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/photos`,
			headers: clinicHeaders,
		});

		assert.equal(res.statusCode, 200);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.ok(json.protocol);
		assert.equal(json.protocol.presetId, "express_6_slots");
		assert.equal(
			json.protocol.slots.frontal_occlusion.imageUrl,
			"/api/attachments/test-photo-2/download",
		);
	});

	it("4. Tenant Isolation: Alien organization cannot access patient photo protocol (returns 404 PatientNotFound)", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/photos`,
			headers: otherOrgHeaders,
		});

		assert.equal(res.statusCode, 404);
	});
});
