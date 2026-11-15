import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { db } from "../../db/client.js";
import { organizations, patients, users } from "../../db/schema.js";
import { TOKEN_SECRET } from "../../routes/auth.js";
import { registerPatientPhotoRoutes } from "../../routes/patients/photoRoutes.js";
import { signToken } from "../../utils/cryptoHelper.js";

const ORG_ID = "00000000-0000-7000-8000-000000000772";
const PATIENT_ID = "00000000-0000-7000-8000-000000000992";
const USER_ID = "00000000-0000-7000-8000-000000000662";

describe("Photo Protocol Blob Leak Inquisition & Fastify Validation (Defect 1 / Mandate 8aq)", () => {
	let app: FastifyInstance;
	let clinicHeaders: Record<string, string>;

	before(async () => {
		try {
			await db
				.insert(organizations)
				.values({ id: ORG_ID, name: "Photo Blob Test Clinic", inn: "7701234591" })
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
					fullName: "Тестовый Пациент Фото",
					phone: "+79998887711",
					administrativeProfile: {
						gender: "male",
					},
				})
				.onConflictDoNothing();
		} catch (e) {
			console.warn("DB setup notice in photo protocol blob leak test:", e);
		}

		app = Fastify({ logger: false });
		registerPatientPhotoRoutes(app);
		await app.ready();

		const token = signToken({ organizationId: ORG_ID }, TOKEN_SECRET(), 3600);

		clinicHeaders = {
			"x-dente-clinic-token": token,
			"content-type": "application/json",
		};
	});

	after(async () => {
		await app.close();
	});

	it("1. Rejects payload with string blob: URL in slots with 400 Bad Request", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/photo-protocol`,
			headers: clinicHeaders,
			payload: {
				presetId: "express_6_slots",
				slots: {
					portrait_smile: "blob:http://localhost:5173/01234567-89ab-cdef-0123-456789abcdef",
				},
			},
		});

		assert.equal(res.statusCode, 400);
		const json = res.json();
		assert.equal(json.error, "ValidationError");
	});

	it("2. Rejects payload with object containing blob: imageUrl with 400 Bad Request", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/photo-protocol`,
			headers: clinicHeaders,
			payload: {
				presetId: "express_6_slots",
				slots: {
					portrait_smile: {
						imageUrl: "blob:http://localhost:5173/01234567-89ab-cdef-0123-456789abcdef",
						slotId: "portrait_smile",
						label: "Улыбка",
					},
				},
			},
		});

		assert.equal(res.statusCode, 400);
		const json = res.json();
		assert.equal(json.error, "ValidationError");
	});

	it("3. Accepts and persists sanitized server URLs cleanly", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/photo-protocol`,
			headers: clinicHeaders,
			payload: {
				presetId: "express_6_slots",
				slots: {
					portrait_smile: {
						imageUrl: "/api/files/patients/00000000-0000-7000-8000-000000000992/attachments/photo1.webp",
						slotId: "portrait_smile",
						label: "Улыбка",
					},
				},
			},
		});

		assert.equal(res.statusCode, 200);
		const json = res.json();
		assert.equal(json.success, true);
		assert.ok(json.protocol?.id);
	});
});
