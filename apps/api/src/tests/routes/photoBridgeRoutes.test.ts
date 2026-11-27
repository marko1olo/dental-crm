import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import Fastify, { type FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { attachments, organizations, patients, users } from "../../db/schema.js";
import { TOKEN_SECRET } from "../../routes/auth.js";
import { registerPhotoBridgeRoutes } from "../../routes/photoBridgeRoutes.js";
import { signToken } from "../../utils/cryptoHelper.js";

const ORG_ID = "00000000-0000-7000-8000-000000000771";
const OTHER_ORG_ID = "00000000-0000-7000-8000-000000000881";
const PATIENT_ID = "00000000-0000-7000-8000-000000000991";
const USER_ID = "00000000-0000-7000-8000-000000000661";

describe("Chairside Photo QR Bridge API (Fastify / PostgreSQL 18, Mandate 8e / PHO-01)", () => {
	let app: FastifyInstance;
	let clinicHeaders: Record<string, string>;
	let otherOrgHeaders: Record<string, string>;
	let createdToken = "";

	before(async () => {
		try {
			await db
				.insert(organizations)
				.values([
					{ id: ORG_ID, name: "QR Bridge Test Clinic", inn: "7701234599" },
					{ id: OTHER_ORG_ID, name: "Alien Bridge Clinic", inn: "7701234598" },
				])
				.onConflictDoNothing();

			await db
				.insert(users)
				.values({
					id: USER_ID,
					organizationId: ORG_ID,
					passwordHash: "hash",
					fullName: "Доктор Ортодонтов",
					role: "doctor",
				})
				.onConflictDoNothing();

			await db
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Смирнов Алексей Викторович",
					phone: "+79998887766",
					administrativeProfile: {
						gender: "male",
					},
				})
				.onConflictDoNothing();
		} catch (e) {
			console.warn("DB setup notice in photo bridge test:", e);
		}

		app = Fastify({ logger: false });
		registerPhotoBridgeRoutes(app);
		await app.ready();

		const token = signToken({ organizationId: ORG_ID }, TOKEN_SECRET(), 3600);
		clinicHeaders = { "x-dente-clinic-token": token };

		const otherToken = signToken({ organizationId: OTHER_ORG_ID }, TOKEN_SECRET(), 3600);
		otherOrgHeaders = { "x-dente-clinic-token": otherToken };
	});

	after(async () => {
		try {
			await db.delete(attachments).where(eq(attachments.organizationId, ORG_ID));
		} catch {
			// ignore cleanup
		}
		await app.close();
	});

	it("1. POST /api/photo-bridge/session refuses without clinic authorization token (401)", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/photo-bridge/session",
			payload: { patientId: PATIENT_ID },
		});
		assert.equal(res.statusCode, 401);
	});

	it("2. POST /api/photo-bridge/session rejects alien organization patient (404 Tenant Isolation)", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/photo-bridge/session",
			headers: otherOrgHeaders,
			payload: { patientId: PATIENT_ID },
		});
		assert.equal(res.statusCode, 404);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "PatientNotFound");
	});

	it("3. POST /api/photo-bridge/session creates a valid 15-minute token and upload URL", async () => {
		const res = await app.inject({
			method: "POST",
			url: "/api/photo-bridge/session",
			headers: clinicHeaders,
			payload: { patientId: PATIENT_ID, presetId: "express_6_slots" },
		});

		assert.equal(res.statusCode, 201);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.ok(typeof json.token === "string" && json.token.length === 32);
		assert.equal(json.patientInitials, "Смирнов А. В.");
		assert.equal(json.ttlSeconds, 900);
		assert.ok(json.uploadPath.includes(json.token));

		createdToken = json.token;
	});

	it("4. GET /api/photo-bridge/session/:token returns public session data for doctor smartphone", async () => {
		const res = await app.inject({
			method: "GET",
			url: `/api/photo-bridge/session/${createdToken}`,
		});

		assert.equal(res.statusCode, 200);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.equal(json.token, createdToken);
		assert.equal(json.patientInitials, "Смирнов А. В.");
		assert.equal(json.presetId, "express_6_slots");
		assert.equal(json.photosCount, 0);
	});

	it("5. GET /api/photo-bridge/session/:token returns 410 for nonexistent or expired token", async () => {
		const res = await app.inject({
			method: "GET",
			url: "/api/photo-bridge/session/invalid_or_expired_token_12345",
		});

		assert.equal(res.statusCode, 410);
		const json = JSON.parse(res.body);
		assert.equal(json.error, "SessionExpiredOrNotFound");
	});

	it("6. POST /api/photo-bridge/upload/:token successfully accepts multipart/binary photo and records attachment", async () => {
		const boundary = "---------------------------974767299852498929531610575";
		const dummyImageData = Buffer.from("RIFF....WEBPVP8 ...fake-clinical-intraoral-image-bytes...");

		const payload = Buffer.concat([
			Buffer.from(`--${boundary}\r\n`),
			Buffer.from('Content-Disposition: form-data; name="file"; filename="smile.webp"\r\n'),
			Buffer.from("Content-Type: image/webp\r\n\r\n"),
			dummyImageData,
			Buffer.from(`\r\n--${boundary}--\r\n`),
		]);

		const res = await app.inject({
			method: "POST",
			url: `/api/photo-bridge/upload/${createdToken}?slotId=frontal_smile`,
			headers: {
				"content-type": `multipart/form-data; boundary=${boundary}`,
			},
			payload,
		});

		assert.equal(res.statusCode, 201);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.equal(json.photo.slotId, "frontal_smile");
		assert.ok(json.photo.url.startsWith("/api/attachments/"));
	});

	it("7. POST /api/photo-bridge/upload/:token also accepts direct JSON photo payload from smartphone browser", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/photo-bridge/upload/${createdToken}`,
			headers: {
				"content-type": "application/json",
			},
			payload: {
				slotId: "upper_occlusal",
				fileName: "upper_arch.webp",
				dataUrl: "data:image/webp;base64,UklGRkAAAABXRUJQVlA4WAoAAAAQAAAAAQAAQUxQSAAAAA==",
			},
		});

		assert.equal(res.statusCode, 201);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.equal(json.photo.slotId, "upper_occlusal");
		assert.ok(json.photo.url.startsWith("/api/attachments/"));
	});

	it("7b. POST /api/photo-bridge/upload/:token rejects dangerous non-image file extensions (415)", async () => {
		const res = await app.inject({
			method: "POST",
			url: `/api/photo-bridge/upload/${createdToken}`,
			headers: { "content-type": "application/json" },
			payload: {
				slotId: "upper_occlusal",
				fileName: "payload.html",
				imageBase64: "data:text/html;base64,PGgxPkhlbGxvPC9oMT4=",
			},
		});
		assert.equal(res.statusCode, 415);
	});

	it("7c. POST /api/photo-bridge/upload/:token supports slotId-before-file multipart & Idempotency-Key deduplication", async () => {
		const boundary = "----SlotBeforeFileBoundary99";
		const dummyImageData = Buffer.from("RIFF....WEBPVP8 ...slot-before-file-bytes...");
		const payload = Buffer.concat([
			Buffer.from(`--${boundary}\r\n`),
			Buffer.from('Content-Disposition: form-data; name="slotId"\r\n\r\n'),
			Buffer.from("lower_occlusal\r\n"),
			Buffer.from(`--${boundary}\r\n`),
			Buffer.from('Content-Disposition: form-data; name="file"; filename="lower.webp"\r\n'),
			Buffer.from("Content-Type: image/webp\r\n\r\n"),
			dummyImageData,
			Buffer.from(`\r\n--${boundary}--\r\n`),
		]);
		const idemKey = "018f4b20-1234-7abc-8def-111122223333";

		const firstRes = await app.inject({
			method: "POST",
			url: `/api/photo-bridge/upload/${createdToken}`,
			headers: {
				"content-type": `multipart/form-data; boundary=${boundary}`,
				"idempotency-key": idemKey,
			},
			payload,
		});
		assert.equal(firstRes.statusCode, 201, firstRes.body);
		const firstJson = JSON.parse(firstRes.body);
		assert.equal(firstJson.photo.slotId, "lower_occlusal");

		const replayRes = await app.inject({
			method: "POST",
			url: `/api/photo-bridge/upload/${createdToken}`,
			headers: {
				"content-type": `multipart/form-data; boundary=${boundary}`,
				"idempotency-key": idemKey,
			},
			payload,
		});
		assert.equal(replayRes.statusCode, 201);
		assert.equal(replayRes.headers["idempotency-replayed"], "true");
		const replayJson = JSON.parse(replayRes.body);
		assert.equal(replayJson.photo.id, firstJson.photo.id);
	});

	it("7d. POST /api/photo-bridge/upload/:token rejects oversized multipart payload with 413", async () => {
		const boundary = "----OversizeBoundary99";
		const oversizeChunk = Buffer.alloc(25 * 1024 * 1024 + 4096, 0x41);
		oversizeChunk.write("RIFF", 0);
		oversizeChunk.write("WEBP", 8);
		const payload = Buffer.concat([
			Buffer.from(`--${boundary}\r\n`),
			Buffer.from('Content-Disposition: form-data; name="file"; filename="huge.webp"\r\n'),
			Buffer.from("Content-Type: image/webp\r\n\r\n"),
			oversizeChunk,
			Buffer.from(`\r\n--${boundary}--\r\n`),
		]);

		const res = await app.inject({
			method: "POST",
			url: `/api/photo-bridge/upload/${createdToken}`,
			headers: {
				"content-type": `multipart/form-data; boundary=${boundary}`,
			},
			payload,
		});
		assert.equal(res.statusCode, 413);
	});

	it("8. GET /api/photo-bridge/poll/:token requires clinic auth & blocks cross-tenant access, then delivers photos", async () => {
		const unauthRes = await app.inject({
			method: "GET",
			url: `/api/photo-bridge/poll/${createdToken}`,
		});
		assert.equal(unauthRes.statusCode, 401);

		const crossTenantRes = await app.inject({
			method: "GET",
			url: `/api/photo-bridge/poll/${createdToken}`,
			headers: otherOrgHeaders,
		});
		assert.equal(crossTenantRes.statusCode, 403);

		const res = await app.inject({
			method: "GET",
			url: `/api/photo-bridge/poll/${createdToken}`,
			headers: clinicHeaders,
		});

		assert.equal(res.statusCode, 200);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.equal(json.count, 3);
		assert.equal(json.photos[0].slotId, "frontal_smile");
		assert.equal(json.photos[1].slotId, "upper_occlusal");
		assert.equal(json.photos[2].slotId, "lower_occlusal");
	});

	it("9. DELETE /api/photo-bridge/session/:token blocks unauthorized/cross-tenant deletion and terminates cleanly for owner", async () => {
		const unauthDel = await app.inject({
			method: "DELETE",
			url: `/api/photo-bridge/session/${createdToken}`,
		});
		assert.equal(unauthDel.statusCode, 401);

		const crossTenantDel = await app.inject({
			method: "DELETE",
			url: `/api/photo-bridge/session/${createdToken}`,
			headers: otherOrgHeaders,
		});
		assert.equal(crossTenantDel.statusCode, 403);

		const res = await app.inject({
			method: "DELETE",
			url: `/api/photo-bridge/session/${createdToken}`,
			headers: clinicHeaders,
		});

		assert.equal(res.statusCode, 200);
		const json = JSON.parse(res.body);
		assert.equal(json.success, true);
		assert.equal(json.deleted, true);

		// Subsequent poll returns 410
		const pollRes = await app.inject({
			method: "GET",
			url: `/api/photo-bridge/poll/${createdToken}`,
			headers: clinicHeaders,
		});
		assert.equal(pollRes.statusCode, 410);
	});
});
