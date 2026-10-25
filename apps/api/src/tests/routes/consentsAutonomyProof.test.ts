import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Fastify from "fastify";
import { registerConsentRoutes } from "../../routes/consents.js";
import { registerDocumentRoutes } from "../../routes/documents.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { signToken } from "../../utils/cryptoHelper.js";

describe("Consents & Legal Contracts Red Team Autonomy API Proof", () => {
	it("1. GET /api/patients/:patientId/consents returns structured patient consents", async () => {
		const app = Fastify();
		await registerConsentRoutes(app);

		const patientId = "00000000-0000-0000-0000-000000000001";
		const orgId = "00000000-0000-0000-0000-000000000002";
		const token = signToken({ organizationId: orgId, userId: "00000000-0000-0000-0000-000000000003", role: "doctor" }, authTokenSecret());

		const res = await app.inject({
			method: "GET",
			url: `/api/patients/${patientId}/consents`,
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

		const patientId = "00000000-0000-0000-0000-000000000001";
		const orgId = "00000000-0000-0000-0000-000000000002";
		const token = signToken({ organizationId: orgId, userId: "00000000-0000-0000-0000-000000000003", role: "doctor" }, authTokenSecret());

		const res = await app.inject({
			method: "POST",
			url: `/api/patients/${patientId}/consents/share-link`,
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
			url: "/api/patients/00000000-0000-0000-0000-000000000001/consents",
		});

		assert.strictEqual(res.statusCode, 401);
	});
});
