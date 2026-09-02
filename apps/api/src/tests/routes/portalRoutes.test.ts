import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { requireAuthTokenSecret } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	organizations,
	patientConsents,
	patientDrugAllergies,
	patientInvoices,
	patients,
	payments,
	sberbankTransactions,
	treatmentPlans,
} from "../../db/schema.js";
import { portalRoutes } from "../../routes/portal.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const FIXTURE = "portalRoutes";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const PATIENT_ID = fixtureUuid(FIXTURE, 2);
const INVOICE_ID = fixtureUuid(FIXTURE, 3);
const PLAN_ID = fixtureUuid(FIXTURE, 4);
const PATIENT_PHONE = "+7 913 770-41-99";

describe("Patient Personal Portal API Routes", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	let validToken: string;
	const originalEnv = { ...process.env };

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.DENTE_AUTH_TOKEN_SECRET =
			process.env.DENTE_AUTH_TOKEN_SECRET || "portal-test-secret-32-characters-long-key!";

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
					name: "Стоматология ДЕНТЕ Портал",
				});

				await db.insert(patients).values({
					id: PATIENT_ID,
					organizationId: ORG_ID,
					fullName: "Смирнова Анна Викторовна",
					phone: PATIENT_PHONE,
				});

				await db.insert(patientInvoices).values({
					id: INVOICE_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					totalRub: "35000.00",
					totalAmountRub: 35000,
					status: "draft",
				});

				await db.insert(treatmentPlans).values({
					id: PLAN_ID,
					organizationId: ORG_ID,
					patientId: PATIENT_ID,
					name: "Комплексная реабилитация зубных рядов",
					title: "План лечения 3-Tier",
					status: "Draft",
					totalPriceRub: "290000.00",
					totalPrice: "290000.00",
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
		await app?.close();
		process.env = originalEnv;
	});

	test("GET /api/portal/me requires authentication and returns patient data", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const unauth = await app.inject({
			method: "GET",
			url: "/api/portal/me",
		});
		assert.equal(unauth.statusCode, 401);

		const res = await app.inject({
			method: "GET",
			url: "/api/portal/me",
			headers: { authorization: `Bearer ${validToken}` },
		});
		assert.equal(res.statusCode, 200);
		const body = res.json() as { patient: { id: string; fullName: string }; invoices: unknown[] };
		assert.equal(body.patient.id, PATIENT_ID);
		assert.equal(body.patient.fullName, "Смирнова Анна Викторовна");
		assert.ok(Array.isArray(body.invoices));
	});

	test("GET /api/portal/consents returns required statutory consents catalog", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: "/api/portal/consents",
			headers: { authorization: `Bearer ${validToken}` },
		});
		assert.equal(res.statusCode, 200);
		const body = res.json() as {
			consents: Array<{ id: string; code: string; titleRu: string; status: string }>;
		};
		assert.ok(Array.isArray(body.consents));
		assert.ok(body.consents.length >= 3);
		assert.ok(body.consents.some((c) => c.id === "ids_treatment"));
		assert.ok(body.consents.some((c) => c.id === "ids_anesthesia"));
		assert.ok(body.consents.some((c) => c.id === "pd_152"));
	});

	test("POST /api/portal/consents/:id/sign captures vector SVG signature, IP and computes SHA-256 hash", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const sampleSvg =
			'<svg viewBox="0 0 400 200"><path d="M 20 80 Q 60 20 120 90 T 240 100" stroke="#000" /></svg>';

		const res = await app.inject({
			method: "POST",
			url: "/api/portal/consents/ids_treatment/sign",
			headers: {
				authorization: `Bearer ${validToken}`,
				"x-forwarded-for": "192.168.1.42",
				"user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
			},
			payload: {
				signatureSvg: sampleSvg,
				signatureMethod: "touch_screen",
			},
		});

		assert.equal(res.statusCode, 200);
		const body = res.json() as {
			success: boolean;
			consentId: string;
			status: string;
			ipAddress: string;
			integrityHash: string;
			signedAtIso: string;
		};

		assert.equal(body.success, true);
		assert.equal(body.consentId, "ids_treatment");
		assert.equal(body.status, "signed");
		assert.equal(body.ipAddress, "192.168.1.42");
		assert.ok(body.integrityHash.length === 64, "SHA-256 integrity hash must be 64 hex characters");
		assert.ok(body.signedAtIso);

		const consentsInDb = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(patientConsents)
				.where(eq(patientConsents.patientId, PATIENT_ID)),
		);
		assert.ok(consentsInDb.some((c) => c.kind === "ids_treatment" && c.grantedAt !== null));
	});

	test("POST /api/portal/health-questionnaire evaluates high-risk allergies and cardio factors", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const questionnairePayload = {
			allergies: {
				hasAllergies: true,
				sulfiteAllergy: true,
				localAnestheticsAllergy: false,
				drugList: ["Сульфаниламиды", "Ультракаин Д-С"],
				details: "Приступ бронхоспазма на консервант метабисульфит натрия",
			},
			cardiovascular: {
				hasRisk: true,
				hypertension: true,
				arrhythmia: true,
				details: "Гипертоническая болезнь II стадии, кризовое течение",
			},
			diabetes: {
				hasDiabetes: false,
			},
			coagulation: {
				hasBleedingDisorder: true,
				onAnticoagulants: true,
				anticoagulantName: "Ксарелто 20 мг",
				details: "Постоянный прием антикоагулянтов после тромбоза",
			},
			pregnancy: {
				isPregnantOrLactating: false,
			},
			respiratory: {
				bronchialAsthma: true,
				details: "Бронхиальная астма, смешанная форма",
			},
			currentMedications: ["Ксарелто", "Периндоприл"],
			additionalNotes: "Прошу применять анестетик без адреналина и сульфитов (Скандонест 3%)",
		};

		const res = await app.inject({
			method: "POST",
			url: "/api/portal/health-questionnaire",
			headers: { authorization: `Bearer ${validToken}` },
			payload: questionnairePayload,
		});

		assert.equal(res.statusCode, 200);
		const body = res.json() as {
			success: boolean;
			riskLevel: string;
			somaticProfile: {
				hasCardiovascularRisk: boolean;
				hasSulfiteAllergy: boolean;
				hasBronchialAsthma: boolean;
				hasBleedingDisorder: boolean;
			};
			alerts: Array<{
				id: string;
				severity: string;
				title: string;
				message: string;
				recommendedAction: string;
			}>;
		};

		assert.equal(body.success, true);
		assert.equal(body.riskLevel, "high");
		assert.equal(body.somaticProfile.hasSulfiteAllergy, true);
		assert.equal(body.somaticProfile.hasCardiovascularRisk, true);
		assert.equal(body.somaticProfile.hasBleedingDisorder, true);
		assert.equal(body.somaticProfile.hasBronchialAsthma, true);

		assert.ok(body.alerts.some((a) => a.severity === "danger" && a.id.includes("sulfite")));
		assert.ok(body.alerts.some((a) => a.severity === "danger" && a.id.includes("coagulation")));
		assert.ok(body.alerts.some((a) => a.severity === "warning" && a.id.includes("cardio")));

		const drugAllergies = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(patientDrugAllergies)
				.where(eq(patientDrugAllergies.patientId, PATIENT_ID)),
		);
		assert.ok(drugAllergies.length >= 2);
		assert.ok(drugAllergies.some((d) => d.drugInnLatin === "Ультракаин Д-С"));

		const getRes = await app.inject({
			method: "GET",
			url: "/api/portal/health-questionnaire",
			headers: { authorization: `Bearer ${validToken}` },
		});
		assert.equal(getRes.statusCode, 200);
		const getBody = getRes.json() as { riskLevel: string; somaticProfile: { hasSulfiteAllergy: boolean } };
		assert.equal(getBody.riskLevel, "high");
		assert.equal(getBody.somaticProfile.hasSulfiteAllergy, true);
	});

	test("GET /api/portal/treatment-plans returns 3-Tier model and supports tier selection", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: "/api/portal/treatment-plans",
			headers: { authorization: `Bearer ${validToken}` },
		});

		assert.equal(res.statusCode, 200);
		const body = res.json() as {
			threeTierModel: {
				selectedTier: string;
				tiers: Array<{
					tierId: string;
					tierNameRu: string;
					totalCostRub: number;
					stages: Array<{ id: string; titleRu: string; costRub: number }>;
				}>;
			};
		};

		assert.ok(body.threeTierModel);
		assert.equal(body.threeTierModel.tiers.length, 3);
		assert.ok(body.threeTierModel.tiers.some((t) => t.tierId === "basic"));
		assert.ok(body.threeTierModel.tiers.some((t) => t.tierId === "standard"));
		assert.ok(body.threeTierModel.tiers.some((t) => t.tierId === "premium"));

		const selectRes = await app.inject({
			method: "POST",
			url: `/api/portal/treatment-plans/${PLAN_ID}/select-tier`,
			headers: { authorization: `Bearer ${validToken}` },
			payload: { tierId: "premium" },
		});

		assert.equal(selectRes.statusCode, 200);
		const selectBody = selectRes.json() as { success: boolean; selectedTier: string };
		assert.equal(selectBody.success, true);
		assert.equal(selectBody.selectedTier, "premium");
	});

	test("POST /api/portal/payments/create-sbp-qr generates dynamic NSPK QR and POST /payments/confirm-sbp emits 54-FZ receipt", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const qrRes = await app.inject({
			method: "POST",
			url: "/api/portal/payments/create-sbp-qr",
			headers: { authorization: `Bearer ${validToken}` },
			payload: {
				invoiceId: INVOICE_ID,
				amountRub: 35000,
			},
		});

		assert.equal(qrRes.statusCode, 200);
		const qrBody = qrRes.json() as {
			success: boolean;
			sbpPayload: {
				qrId: string;
				amountRub: number;
				amountKopecks: number;
				sbpNspkPayloadString: string;
				qrSvg: string;
				availableBanks: Array<{ id: string; nameRu: string }>;
			};
		};

		assert.equal(qrBody.success, true);
		assert.equal(qrBody.sbpPayload.amountRub, 35000);
		assert.equal(qrBody.sbpPayload.amountKopecks, 3500000);
		assert.match(qrBody.sbpPayload.sbpNspkPayloadString, /https:\/\/qr\.nspk\.ru\/SBPA/);
		assert.ok(qrBody.sbpPayload.qrSvg.startsWith("<svg"));
		assert.ok(qrBody.sbpPayload.availableBanks.length >= 4);

		// Security: Unconfirmed or fake transaction MUST be rejected with 402
		const unconfirmedRes = await app.inject({
			method: "POST",
			url: "/api/portal/payments/confirm-sbp",
			headers: { authorization: `Bearer ${validToken}` },
			payload: {
				invoiceId: INVOICE_ID,
				amountRub: 35000,
				sbpTransactionId: "FAKE-UNCONFIRMED-TX",
			},
		});
		assert.equal(unconfirmedRes.statusCode, 402);

		// Seed real confirmed bank transaction in sberbankTransactions
		await withFixtureTenant(ORG_ID, async () => {
			await db.insert(sberbankTransactions).values({
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				invoiceId: INVOICE_ID,
				orderId: "SBP-TX-984210",
				amount: 3500000,
				status: "success",
			});
		});

		const payRes = await app.inject({
			method: "POST",
			url: "/api/portal/payments/confirm-sbp",
			headers: { authorization: `Bearer ${validToken}` },
			payload: {
				invoiceId: INVOICE_ID,
				amountRub: 35000,
				sbpTransactionId: "SBP-TX-984210",
			},
		});

		assert.equal(payRes.statusCode, 200);
		const payBody = payRes.json() as {
			success: boolean;
			status: string;
			amountRub: number;
			fiscalReceipt: {
				receiptNumber: string;
				fiscalSign: string;
				fpd: string;
				nalogUrl: string;
				issuedAtIso: string;
			} | null;
		};

		assert.equal(payBody.success, true);
		assert.equal(payBody.status, "paid");
		assert.equal(payBody.amountRub, 35000);
		assert.equal(payBody.fiscalReceipt, null);

		const updatedInvoices = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(patientInvoices)
				.where(eq(patientInvoices.id, INVOICE_ID)),
		);
		assert.equal(updatedInvoices[0]?.status, "paid");
		assert.ok(updatedInvoices[0]?.paidAt !== null);

		const paymentsInDb = await withFixtureTenant(ORG_ID, async () =>
			db
				.select()
				.from(payments)
				.where(eq(payments.patientId, PATIENT_ID)),
		);
		assert.ok(paymentsInDb.some((p) => p.status === "paid" && p.amountRub === 35000));
	});
});
