import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { and, eq } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { requireAuthTokenSecret } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	organizations,
	patientConsents,
	patients,
} from "../../db/schema.js";
import { portalRoutes } from "../../routes/portal.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const FIXTURE = "portalConsentsAutonomy";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const PATIENT_ID = fixtureUuid(FIXTURE, 2);
const PATIENT_PHONE = "+7 913 770-99-88";

describe("Patient Portal Consents Autonomy (Mandates 8e, 8i, 8k)", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	let validToken: string;
	const originalEnv = { ...process.env };

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.DENTE_AUTH_TOKEN_SECRET =
			process.env.DENTE_AUTH_TOKEN_SECRET || "portal-autonomy-test-secret-32-chars-key!";

		validToken = signToken(
			{
				sub: PATIENT_ID,
				organizationId: ORG_ID,
				kind: "portal",
			},
			requireAuthTokenSecret(),
			3600,
		);

		app = Fastify({ logger: false });
		await app.register(portalRoutes, { prefix: "/api/portal" });
		await app.ready();

		try {
			await purgeFixtureOrganizations([ORG_ID]);
			await withFixtureTenant(ORG_ID, async () => {
				await db.insert(organizations).values({
					id: ORG_ID,
					name: "Стоматология ДЕНТЕ Автономия Согласий",
				});

				await db.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Иванов Иван Иванович",
					phone: PATIENT_PHONE,
				});
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_ID]);
		}
		await app.close();
		for (const key of Object.keys(process.env)) {
			if (!(key in originalEnv)) delete process.env[key];
		}
		Object.assign(process.env, originalEnv);
	});

	test("Test 1: POST /api/portal/consents/pd_152/sign with empty body or portal_pep signs via 63-FZ PEP stamp", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const res = await app.inject({
			method: "POST",
			url: "/api/portal/consents/pd_152/sign",
			headers: {
				authorization: `Bearer ${validToken}`,
				"x-forwarded-for": "10.0.0.15",
			},
			payload: {},
		});

		assert.equal(res.statusCode, 200);
		const body = res.json() as {
			success: boolean;
			consentId: string;
			status: string;
			signatureMethod: string;
			signatureSvg: string;
			integrityHash: string;
			signedAtIso: string;
		};

		assert.equal(body.success, true);
		assert.equal(body.consentId, "pd_152");
		assert.equal(body.status, "signed");
		assert.equal(body.signatureMethod, "portal_pep");
		assert.ok(
			body.signatureSvg.includes("ПОДПИСАНО ПЭП (63-ФЗ)"),
			"SVG stamp must contain 'ПОДПИСАНО ПЭП (63-ФЗ)'",
		);
		assert.ok(
			body.signatureSvg.includes("Личный кабинет пациента"),
			"SVG stamp must cite portal context",
		);
		assert.equal(body.integrityHash.length, 64, "Integrity hash must be 64-char hex");
		assert.ok(body.signedAtIso);

		// Verify database state in patientConsents
		const consentsInDb = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(patientConsents)
				.where(
					and(
						eq(patientConsents.patientId, PATIENT_ID),
						eq(patientConsents.kind, "pd_152"),
					),
				),
		);
		assert.equal(consentsInDb.length, 1);
		assert.ok(consentsInDb[0]?.grantedAt !== null);
		assert.equal(consentsInDb[0]?.revokedAt, null);

		// Verify explicit signatureMethod: "portal_pep" also succeeds identically
		const resPepExplicit = await app.inject({
			method: "POST",
			url: "/api/portal/consents/pd_152/sign",
			headers: {
				authorization: `Bearer ${validToken}`,
			},
			payload: { signatureMethod: "portal_pep" },
		});
		assert.equal(resPepExplicit.statusCode, 200);
		const bodyPep = resPepExplicit.json() as { signatureMethod: string; signatureSvg: string };
		assert.equal(bodyPep.signatureMethod, "portal_pep");
		assert.ok(bodyPep.signatureSvg.includes("ПОДПИСАНО ПЭП (63-ФЗ)"));
	});

	test("Test 2: POST /api/portal/consents/id_treatment_general/sign with signatureMethod: 'paper_physical' signs with paper stamp", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const res = await app.inject({
			method: "POST",
			url: "/api/portal/consents/id_treatment_general/sign",
			headers: {
				authorization: `Bearer ${validToken}`,
				"x-forwarded-for": "10.0.0.22",
			},
			payload: {
				signatureMethod: "paper_physical",
			},
		});

		assert.equal(res.statusCode, 200);
		const body = res.json() as {
			success: boolean;
			consentId: string;
			status: string;
			signatureMethod: string;
			signatureSvg: string;
			integrityHash: string;
			signedAtIso: string;
		};

		assert.equal(body.success, true);
		assert.equal(body.consentId, "id_treatment_general");
		assert.equal(body.status, "signed");
		assert.equal(body.signatureMethod, "paper_physical");
		assert.ok(
			body.signatureSvg.includes("ПОДПИСАНО НА БУМАГЕ"),
			"SVG stamp must contain 'ПОДПИСАНО НА БУМАГЕ'",
		);
		assert.ok(
			body.signatureSvg.includes("Подшито в карту 043/у"),
			"SVG stamp must cite outpatient medical record 043/u",
		);
		assert.equal(body.integrityHash.length, 64, "Integrity hash must be 64-char hex");
		assert.ok(body.signedAtIso);

		// Verify database state in patientConsents
		const consentsInDb = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(patientConsents)
				.where(
					and(
						eq(patientConsents.patientId, PATIENT_ID),
						eq(patientConsents.kind, "id_treatment_general"),
					),
				),
		);
		assert.equal(consentsInDb.length, 1);
		assert.ok(consentsInDb[0]?.grantedAt !== null);
		assert.equal(consentsInDb[0]?.revokedAt, null);

		// Verify audit trail in patient administrativeProfile
		const patientRow = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(patients)
				.where(eq(patients.id, PATIENT_ID))
				.limit(1),
		);
		const adminProfile = patientRow[0]?.administrativeProfile as {
			consentSignatures?: Record<string, { signatureMethod: string; signatureSvg: string; ipAddress: string }>;
		};
		assert.ok(adminProfile?.consentSignatures?.["id_treatment_general"]);
		assert.equal(
			adminProfile.consentSignatures["id_treatment_general"].signatureMethod,
			"paper_physical",
		);
		assert.ok(
			adminProfile.consentSignatures["id_treatment_general"].signatureSvg.includes("ПОДПИСАНО НА БУМАГЕ"),
		);
		assert.equal(
			adminProfile.consentSignatures["id_treatment_general"].ipAddress,
			"10.0.0.22",
		);
	});
});
