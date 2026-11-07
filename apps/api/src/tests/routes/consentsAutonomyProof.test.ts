import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import Fastify from "fastify";
import { organizations, patients, users } from "../../db/schema.js";
import { registerConsentRoutes } from "../../routes/consents.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const FIXTURE = "consentsAutonomyProof";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const DOCTOR_ID = fixtureUuid(FIXTURE, 2);
const PATIENT_ID = fixtureUuid(FIXTURE, 3);

describe("Consents & Legal Contracts Red Team Autonomy API Proof", () => {
	before(async () => {
		await purgeFixtureOrganizations([ORG_ID]);

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx
				.insert(organizations)
				.values({
					id: ORG_ID,
					name: "Клиника DENTE Юридический Контур",
				})
				.onConflictDoNothing();

			await tx
				.insert(users)
				.values({
					id: DOCTOR_ID,
					organizationId: ORG_ID,
					role: "doctor",
					fullName: "Д-р Правдолюбов Ю. В.",
					isActive: true,
				})
				.onConflictDoNothing();

			await tx
				.insert(patients)
				.values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Иванов Иван Иванович",
					phone: "+79991234567",
					gender: "male",
				})
				.onConflictDoNothing();
		});
	});

	after(async () => {
		await purgeFixtureOrganizations([ORG_ID]);
	});

	it("1. GET /api/patients/:patientId/consents returns structured patient consents", async () => {
		const app = Fastify();
		await registerConsentRoutes(app);

		const token = signToken({ organizationId: ORG_ID, userId: DOCTOR_ID, role: "doctor" }, authTokenSecret());

		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/consents`,
			headers: {
				authorization: `Bearer ${token}`,
			},
		});

		assert.strictEqual(res.statusCode, 200);
		const body = res.json();
		assert.ok(Array.isArray(body.consents), "Consents field must be an array");
	});

	it("2. POST /api/patients/:patientId/consents/share-link generates QR and WhatsApp link for smartphone", async () => {
		const app = Fastify();
		await registerConsentRoutes(app);

		const token = signToken({ organizationId: ORG_ID, userId: DOCTOR_ID, role: "doctor" }, authTokenSecret());

		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/consents/share-link`,
			headers: {
				authorization: `Bearer ${token}`,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				kind: "informed_consent",
				title: "Информированное согласие на анестезию",
				phone: "+7 (999) 123-45-67",
			}),
		});

		assert.strictEqual(res.statusCode, 200);
		const body = res.json();
		assert.ok(body.signUrl.includes("/portal/consents/sign"), "Must contain portal signing URL");
		assert.ok(body.qrSvg.includes("<svg"), "Must return valid vector SVG QR code");
		assert.ok(body.whatsappUrl.includes("wa.me"), "Must generate direct WhatsApp dispatch URL");
	});

	it("3. Rejects unauthorized access with 401 when no auth header is provided", async () => {
		const app = Fastify();
		await registerConsentRoutes(app);

		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/consents`,
		});

		assert.strictEqual(res.statusCode, 401);
	});

	it("4. POST /api/patients/:patientId/consents persists signatureSvg and creates generatedDocuments record", async () => {
		const app = Fastify();
		await registerConsentRoutes(app);

		const token = signToken({ organizationId: ORG_ID, userId: DOCTOR_ID, role: "doctor" }, authTokenSecret());

		const testSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 120"><path d="M 10 20 L 50 60" stroke="#0f172a"/></svg>';
		const testHash = "DENTE-SSOT-TEST-HASH-12345678";

		const postRes = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/consents`,
			headers: {
				authorization: `Bearer ${token}`,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				kind: "informed_consent",
				title: "Информированное добровольное согласие на терапевтическое лечение",
				verificationMethod: "tablet_stylus",
				signatureSvg: testSvg,
				integrityHash: testHash,
				notes: "Подписано пациентом на планшете стилусом",
			}),
		});

		assert.strictEqual(postRes.statusCode, 201, `Expected 201, got ${postRes.statusCode}: ${postRes.body}`);
		const postBody = postRes.json();
		assert.ok(postBody.id, "Must return patient consent ID");
		assert.ok(postBody.documentId, "Must create and link generated document ID");
		assert.strictEqual(postBody.signatureSvg, testSvg, "Must return preserved signatureSvg");
		assert.strictEqual(postBody.integrityHash, testHash, "Must return preserved integrityHash");

		// Проверяем получение через GET с обогащенным JOIN из generatedDocuments
		const getRes = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/consents`,
			headers: {
				authorization: `Bearer ${token}`,
			},
		});

		assert.strictEqual(getRes.statusCode, 200);
		const getBody = getRes.json();
		assert.ok(Array.isArray(getBody.consents), "Consents must be array");
		const found = getBody.consents.find((c: any) => c.kind === "informed_consent");
		assert.ok(found, "Must find saved consent");
		assert.strictEqual(found.signatureSvg, testSvg, "GET must return signatureSvg from joined generatedDocuments");
		assert.strictEqual(found.integrityHash, testHash, "GET must return integrityHash from joined generatedDocuments");
	});

	it("5. POST /api/patients/:patientId/consents accepts consentType and signatureType from studio", async () => {
		const app = Fastify();
		await registerConsentRoutes(app);

		const token = signToken({ organizationId: ORG_ID, userId: DOCTOR_ID, role: "doctor" }, authTokenSecret());
		const signedAt = new Date().toISOString();

		const postRes = await app.inject({
			method: "POST",
			url: `/api/patients/${PATIENT_ID}/consents`,
			headers: {
				authorization: `Bearer ${token}`,
				"content-type": "application/json",
			},
			body: JSON.stringify({
				consentType: "implant",
				isSigned: true,
				signedAt,
				signatureType: "digital_canvas",
				doctorFullName: "Д-р Правдолюбов Ю. В.",
			}),
		});

		assert.strictEqual(postRes.statusCode, 201, `Expected 201, got ${postRes.statusCode}: ${postRes.body}`);
		const postBody = postRes.json();
		assert.ok(postBody.id, "Must return consent ID");
		assert.strictEqual(postBody.kind, "implant");
		assert.strictEqual(postBody.isSigned, true);
		assert.strictEqual(postBody.doctorFullName, "Д-р Правдолюбов Ю. В.");
		assert.strictEqual(postBody.signatureType, "digital_canvas");

		const getRes = await app.inject({
			method: "GET",
			url: `/api/patients/${PATIENT_ID}/consents`,
			headers: {
				authorization: `Bearer ${token}`,
			},
		});

		assert.strictEqual(getRes.statusCode, 200);
		const getBody = getRes.json();
		const found = getBody.consents.find((c: any) => c.kind === "implant");
		assert.ok(found, "Must find saved implant consent in database");
		assert.ok(found.grantedAt, "Must have grantedAt timestamp");
	});
});
