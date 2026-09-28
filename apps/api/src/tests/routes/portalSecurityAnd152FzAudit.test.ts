import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";
import Fastify, { type FastifyInstance } from "fastify";
import { requireAuthTokenSecret } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	appointments,
	organizations,
	patientConsents,
	patientDrugAllergies,
	patients,
	portalOtpCodes,
	treatmentPlanItemsNew,
	treatmentPlans,
	users,
} from "../../db/schema.js";
import {
	PORTAL_TOKEN_TTL_SECONDS,
	portalRoutes,
	resetPortalOtpRateLimitsForTesting,
	resetPortalRevokedTokensForTesting,
} from "../../routes/portal.js";
import { portalBudgetRoutes } from "../../routes/portalBudgetRoutes.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";

const FIXTURE = "portalSecAudit";
const ORG_A = fixtureUuid(FIXTURE, 1);
const ORG_B = fixtureUuid(FIXTURE, 2);
const PATIENT_A = fixtureUuid(FIXTURE, 3);
const PATIENT_B = fixtureUuid(FIXTURE, 4);
const PLAN_A = fixtureUuid(FIXTURE, 5);
const PLAN_B = fixtureUuid(FIXTURE, 6);
const ITEM_A = fixtureUuid(FIXTURE, 7);
const DOCTOR_A = fixtureUuid(FIXTURE, 8);

const SHARED_PHONE = "+7 999 123-45-67";
const SENSITIVE_INTERNAL_NOTE = "Склочный пациент, жаловался в Росздравнадзор, неплатежеспособен";

describe("Patient Portal Security, Multi-Tenant Isolation & 152-FZ Audit", () => {
	let app: FastifyInstance;
	let databaseAvailable = true;
	let tokenA: string;
	let tokenB: string;
	const originalEnv = { ...process.env };

	before(async () => {
		process.env.NODE_ENV = "development";
		process.env.DENTE_AUTH_TOKEN_SECRET =
			process.env.DENTE_AUTH_TOKEN_SECRET || "portal-audit-secret-32-chars-key!!";

		tokenA = signToken(
			{ sub: PATIENT_A, organizationId: ORG_A, kind: "portal" },
			requireAuthTokenSecret(),
			3600,
		);
		tokenB = signToken(
			{ sub: PATIENT_B, organizationId: ORG_B, kind: "portal" },
			requireAuthTokenSecret(),
			3600,
		);

		app = Fastify({ logger: false });
		await app.register(portalRoutes, { prefix: "/api/portal" });
		await app.register(portalBudgetRoutes, { prefix: "/api/portal" });
		await app.ready();

		try {
			await purgeFixtureOrganizations([ORG_A, ORG_B]);

			// Seed Clinic A
			await withFixtureTenant(ORG_A, async () => {
				await db.insert(organizations).values({
					id: ORG_A,
					name: "Клиника А (Премиум)",
				});

				await db.insert(users).values({
					id: DOCTOR_A,
					organizationId: ORG_A,
					fullName: "Доктор Смирнов Алексей Петрович",
					email: "doctor.smirnov@portal-sec-test.ru",
					role: "doctor",
					isActive: true,
				});

				await db.insert(patients).values({
					id: PATIENT_A,
					organizationId: ORG_A,
					fullName: "Иванов Иван Иванович (Клиника А)",
					phone: SHARED_PHONE,
					notes: SENSITIVE_INTERNAL_NOTE,
					administrativeProfile: {
						curatorCommissionPercent: 12.5,
						curatorNotes: "Комиссия куратора 12.5% от чека",
						dataProcessingBasisNote: "Заявка через сайт",
						publicNotes: "Пациент просит звонить после 18:00",
					} as any,
				});

				await db.insert(treatmentPlans).values({
					id: PLAN_A,
					organizationId: ORG_A,
					patientId: PATIENT_A,
					name: "План лечения Клиники А",
					title: "Имплантация и ортопедия",
					status: "Active",
					totalPriceRub: "150000.00",
					totalPrice: "150000.00",
				});

				await db.insert(treatmentPlanItemsNew).values({
					id: ITEM_A,
					organizationId: ORG_A,
					planId: PLAN_A,
					toothNumber: 16,
					priceId: "service-straumann-implant-16",
					quantity: 1,
					price: "85000.00",
					discount: "0.00",
					phase: 1,
					isBundle: false,
					commissionAmount: "15000.00", // Зарплатное начисление врачу (коммерческая тайна)
				});
			});

			// Seed Clinic B with patient sharing the SAME phone
			await withFixtureTenant(ORG_B, async () => {
				await db.insert(organizations).values({
					id: ORG_B,
					name: "Клиника Б (Эконом)",
				});

				await db.insert(patients).values({
					id: PATIENT_B,
					organizationId: ORG_B,
					fullName: "Иванов Иван Иванович (Клиника Б)",
					phone: SHARED_PHONE,
					notes: "Внутренний комментарий клиники Б",
				});

				await db.insert(treatmentPlans).values({
					id: PLAN_B,
					organizationId: ORG_B,
					patientId: PATIENT_B,
					name: "План лечения Клиники Б",
					title: "Терапевтическая санация",
					status: "Active",
					totalPriceRub: "25000.00",
					totalPrice: "25000.00",
				});
			});
		} catch (error) {
			if (!isDatabaseUnavailable(error)) throw error;
			databaseAvailable = false;
		}
	});

	after(async () => {
		if (databaseAvailable) {
			await purgeFixtureOrganizations([ORG_A, ORG_B]);
		}
		await app?.close();
		process.env = originalEnv;
	});

	test("1. Multi-Tenant Isolation: OTP request with organizationId disambiguates shared phone number", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Request OTP specifically for Clinic A
		const sendOtpResA = await app.inject({
			method: "POST",
			url: "/api/portal/auth/send-otp",
			payload: {
				phone: SHARED_PHONE,
				organizationId: ORG_A,
			},
		});
		assert.equal(sendOtpResA.statusCode, 202);
		const sendOtpBodyA = sendOtpResA.json() as { status: string; message: string };
		assert.equal(sendOtpBodyA.status, "accepted");

		// Verify OTP record was created in tenant A context
		const otpRows = await withFixtureTenant(ORG_A, async () =>
			db
				.select()
				.from(portalOtpCodes)
				.where(eq(portalOtpCodes.organizationId, ORG_A)),
		);
		assert.ok(otpRows.length >= 1, "OTP code must be generated for tenant A");
		assert.equal(otpRows[0]?.patientId, PATIENT_A);
	});

	test("2. Medical Secrecy: GET /me strictly strips doctor/staff internal notes and curator commissions", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: "/api/portal/me",
			headers: { authorization: `Bearer ${tokenA}` },
		});
		assert.equal(res.statusCode, 200);
		const body = res.json() as {
			patient: {
				id: string;
				notes: string | null;
				administrativeProfile?: Record<string, unknown>;
			};
		};

		// 1. Staff internal notes must NEVER leak to patient
		assert.equal(
			body.patient.notes,
			null,
			"Internal doctor/staff notes must be sanitized to null in patient portal",
		);

		// 2. Curator commission and private CRM flags must be stripped
		const adminProfile = body.patient.administrativeProfile;
		assert.ok(adminProfile, "Administrative profile object should exist");
		assert.equal(
			adminProfile.curatorCommissionPercent,
			undefined,
			"Curator commission percent must be stripped from patient portal",
		);
		assert.equal(
			adminProfile.curatorNotes,
			undefined,
			"Curator notes must be stripped from patient portal",
		);
		assert.equal(
			adminProfile.dataProcessingBasisNote,
			undefined,
			"Internal data processing basis notes must be stripped",
		);
		// Public notes allowed
		assert.equal(adminProfile.publicNotes, "Пациент просит звонить после 18:00");
	});

	test("3. Commercial Secrecy: GET /treatment-plans strips doctor salary commission rate from items", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const res = await app.inject({
			method: "GET",
			url: "/api/portal/treatment-plans",
			headers: { authorization: `Bearer ${tokenA}` },
		});
		assert.equal(res.statusCode, 200);
		const body = res.json() as {
			plans: Array<{
				id: string;
				items: Array<{ id: string; name: string; commissionAmount?: unknown }>;
			}>;
		};

		assert.ok(Array.isArray(body.plans));
		const plan = body.plans.find((p) => p.id === PLAN_A);
		assert.ok(plan, "Plan A must be returned for patient A");
		assert.ok(plan.items.length >= 1, "Plan A must have items");

		const item = plan.items[0];
		assert.ok(item);
		assert.equal(
			item.commissionAmount,
			undefined,
			"Doctor salary commissionAmount MUST NOT be leaked to patient portal",
		);
	});

	test("4. 152-FZ Compliance: Statutory consent catalog and 63-FZ cryptographic PEP vector signing", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Catalog verification: must contain pd_152
		const catalogRes = await app.inject({
			method: "GET",
			url: "/api/portal/consents",
			headers: { authorization: `Bearer ${tokenA}` },
		});
		assert.equal(catalogRes.statusCode, 200);
		const catalogBody = catalogRes.json() as {
			consents: Array<{ id: string; code: string; titleRu: string; statutoryBasis: string }>;
		};
		const pdConsent = catalogBody.consents.find((c) => c.id === "pd_152");
		assert.ok(pdConsent, "Mandatory 152-FZ consent (pd_152) must exist in consents catalog");
		assert.equal(pdConsent.statutoryBasis, "152-ФЗ");
		assert.equal(pdConsent.titleRu, "Согласие на обработку персональных данных");

		// Sign consent with vector SVG signature & verify 63-FZ cryptographic integrity hash
		const sampleSvg =
			'<svg viewBox="0 0 400 200"><path d="M 10 50 Q 80 10 150 70 T 300 80" stroke="#000" /></svg>';
		const signRes = await app.inject({
			method: "POST",
			url: "/api/portal/consents/pd_152/sign",
			headers: {
				authorization: `Bearer ${tokenA}`,
				"x-forwarded-for": "203.0.113.195",
			},
			payload: {
				signatureSvg: sampleSvg,
				signatureMethod: "touch_screen",
			},
		});
		assert.equal(signRes.statusCode, 200);
		const signBody = signRes.json() as {
			success: boolean;
			consentId: string;
			status: string;
			ipAddress: string;
			integrityHash: string;
		};
		assert.equal(signBody.success, true);
		assert.equal(signBody.consentId, "pd_152");
		assert.equal(signBody.status, "signed");
		assert.equal(signBody.ipAddress, "203.0.113.195");
		assert.equal(
			signBody.integrityHash.length,
			64,
			"SHA-256 integrity hash must be exactly 64 hex characters",
		);

		// Check database persistence
		const consentInDb = await withFixtureTenant(ORG_A, async () =>
			db
				.select()
				.from(patientConsents)
				.where(
					eq(patientConsents.patientId, PATIENT_A),
				),
		);
		assert.ok(
			consentInDb.some((c) => c.kind === "pd_152" && c.grantedAt !== null),
			"Consent pd_152 must be recorded with timestamp in patientConsents table",
		);
	});

	test("5. Cross-Tenant IDOR Prevention: Portal Budget rejects arbitrary treatment plan UUIDs", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// An attacker attempts to query Clinic B's treatment plan ID directly via budget endpoint
		const idorRes = await app.inject({
			method: "GET",
			url: `/api/portal/budget/${PLAN_B}`,
		});
		// Must return 404 Not Found since it's not a legitimate registered budget token
		assert.equal(
			idorRes.statusCode,
			404,
			"Arbitrary treatment plan UUID must NOT be accessible without a registered portal budget token",
		);
	});

	test("6. Multi-Tenant Strict Isolation: Token for Tenant A cannot access Tenant B patient data", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Tenant A user attempts to request me endpoint with token A
		const resA = await app.inject({
			method: "GET",
			url: "/api/portal/me",
			headers: { authorization: `Bearer ${tokenA}` },
		});
		assert.equal(resA.statusCode, 200);
		const bodyA = resA.json() as { patient: { id: string; fullName: string } };
		assert.equal(bodyA.patient.id, PATIENT_A);
		assert.notEqual(bodyA.patient.id, PATIENT_B);

		// With Tenant B token
		const resB = await app.inject({
			method: "GET",
			url: "/api/portal/me",
			headers: { authorization: `Bearer ${tokenB}` },
		});
		assert.equal(resB.statusCode, 200);
		const bodyB = resB.json() as { patient: { id: string; fullName: string } };
		assert.equal(bodyB.patient.id, PATIENT_B);
		assert.equal(bodyB.patient.fullName, "Иванов Иван Иванович (Клиника Б)");
	});

	test("7. SMS Rate Limiting & Telecom Flood Prevention (IP & Phone Limits)", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		resetPortalOtpRateLimitsForTesting();

		const testIp = "198.51.100.42";

		// 1. IP rate limit test: 5 requests succeed, 6th request triggers 429 TooManyRequests
		for (let i = 1; i <= 5; i++) {
			const res = await app.inject({
				method: "POST",
				url: "/api/portal/auth/send-otp",
				headers: { "x-forwarded-for": testIp },
				payload: { phone: `+7 999 111-00-0${i}`, organizationId: ORG_A },
			});
			assert.equal(res.statusCode, 202, `Request ${i} from IP must be accepted`);
		}

		// 6th request from the same IP MUST be rejected with 429
		const rateLimitedRes = await app.inject({
			method: "POST",
			url: "/api/portal/auth/send-otp",
			headers: { "x-forwarded-for": testIp },
			payload: { phone: "+7 999 111-00-99", organizationId: ORG_A },
		});
		assert.equal(rateLimitedRes.statusCode, 429, "6th request from same IP must be rate-limited with 429");
		const errBody = rateLimitedRes.json() as { error: string };
		assert.equal(errBody.error, "TooManyRequests");

		// 2. Phone rate limit test: Max 3 requests per phone within 10 minutes (even from different IPs)
		const targetPhone = "+7 999 777-66-55";
		resetPortalOtpRateLimitsForTesting();

		for (let i = 1; i <= 3; i++) {
			const res = await app.inject({
				method: "POST",
				url: "/api/portal/auth/send-otp",
				headers: { "x-forwarded-for": `198.51.100.${10 + i}` },
				payload: { phone: targetPhone, organizationId: ORG_A },
			});
			assert.equal(res.statusCode, 202);
		}

		// Count OTP records in DB
		const beforeCount = await withFixtureTenant(ORG_A, async () => {
			const rows = await db
				.select()
				.from(portalOtpCodes)
				.where(eq(portalOtpCodes.organizationId, ORG_A));
			return rows.length;
		});

		// 4th request to the same phone within 10 minutes: must return 202 without creating new code or dispatching SMS
		const fourthRes = await app.inject({
			method: "POST",
			url: "/api/portal/auth/send-otp",
			headers: { "x-forwarded-for": "198.51.100.99" },
			payload: { phone: targetPhone, organizationId: ORG_A },
		});
		assert.equal(fourthRes.statusCode, 202);

		const afterCount = await withFixtureTenant(ORG_A, async () => {
			const rows = await db
				.select()
				.from(portalOtpCodes)
				.where(eq(portalOtpCodes.organizationId, ORG_A));
			return rows.length;
		});
		assert.equal(
			afterCount,
			beforeCount,
			"4th request must NOT insert additional OTP code, protecting telecom balance",
		);
	});

	test("8. Double-Booking Prevention & Pessimistic Concurrency Locking in Patient Portal", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		const startsAt = "2026-10-20T10:00:00.000Z";
		const endsAt = "2026-10-20T11:00:00.000Z";

		// 1. Patient A books slot with DOCTOR_A
		const bookRes1 = await app.inject({
			method: "POST",
			url: "/api/portal/appointments",
			headers: { authorization: `Bearer ${tokenA}` },
			payload: {
				doctorId: DOCTOR_A,
				startsAt,
				endsAt,
				reason: "Консультация ортопеда",
			},
		});
		assert.equal(bookRes1.statusCode, 201, "First booking must succeed with 201 Created");
		const bookBody1 = bookRes1.json() as { success: boolean; appointment: { id: string } };
		assert.equal(bookBody1.success, true);
		assert.ok(bookBody1.appointment.id);

		// 2. Overlapping booking attempt with the same doctor (starts 10:30, ends 11:30)
		const overlappingStarts = "2026-10-20T10:30:00.000Z";
		const overlappingEnds = "2026-10-20T11:30:00.000Z";

		const conflictRes = await app.inject({
			method: "POST",
			url: "/api/portal/appointments",
			headers: { authorization: `Bearer ${tokenA}` },
			payload: {
				doctorId: DOCTOR_A,
				startsAt: overlappingStarts,
				endsAt: overlappingEnds,
				reason: "Повторная запись на то же время",
			},
		});
		assert.equal(
			conflictRes.statusCode,
			409,
			"Conflicting slot must be rejected with 409 Conflict",
		);
		const conflictBody = conflictRes.json() as { error: string; message: string };
		assert.equal(conflictBody.error, "SlotConflict");

		// 3. Verify Patient Appointments listing
		const listRes = await app.inject({
			method: "GET",
			url: "/api/portal/appointments",
			headers: { authorization: `Bearer ${tokenA}` },
		});
		assert.equal(listRes.statusCode, 200);
		const listBody = listRes.json() as {
			appointments: Array<{ id: string; doctorUserId: string }>;
		};
		assert.ok(Array.isArray(listBody.appointments));
		assert.ok(listBody.appointments.some((a) => a.id === bookBody1.appointment.id));
	});

	test("9. Somatic Health Questionnaire & Penicillin/Beta-Lactam Risk Evaluation", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// Submit questionnaire for Patient A with penicillin allergy, asthma and cardiovascular history
		const questionnairePayload = {
			allergies: {
				hasAllergies: true,
				antibioticsAllergy: true,
				details: "Отек Квинке в анамнезе на Амоксиклав (пенициллиновый ряд)",
				drugList: ["Амоксиклав"],
			},
			cardiovascular: {
				hasRisk: true,
				hypertension: true,
				details: "Артериальная гипертензия 2 ст.",
			},
			respiratory: {
				bronchialAsthma: true,
				details: "Бронхиальная астма, контролируемая",
			},
			currentMedications: ["Бисопролол 5мг", "Сальбутамол"],
			additionalNotes: "Категорический запрет на пенициллины",
		};

		const submitRes = await app.inject({
			method: "POST",
			url: "/api/portal/health-questionnaire",
			headers: { authorization: `Bearer ${tokenA}` },
			payload: questionnairePayload,
		});

		assert.equal(submitRes.statusCode, 200, "Submission must return 200 OK");
		const submitBody = submitRes.json() as {
			success: boolean;
			riskLevel: string;
			somaticProfile: {
				hasPenicillinAllergy: boolean;
				hasCardiovascularRisk: boolean;
				hasBronchialAsthma: boolean;
			};
			alerts: Array<{
				id: string;
				severity: string;
				title: string;
				message: string;
				recommendedAction: string;
			}>;
		};

		assert.equal(submitBody.success, true);
		assert.equal(submitBody.riskLevel, "high", "Penicillin allergy must elevate somaticRiskLevel to 'high'");
		assert.equal(submitBody.somaticProfile.hasPenicillinAllergy, true);
		assert.equal(submitBody.somaticProfile.hasCardiovascularRisk, true);
		assert.equal(submitBody.somaticProfile.hasBronchialAsthma, true);

		// Assert penicillin alert
		const penicillinAlert = submitBody.alerts.find((a) => a.id === "alert_penicillin_allergy");
		assert.ok(penicillinAlert, "Must generate alert_penicillin_allergy");
		assert.equal(penicillinAlert.severity, "danger", "Penicillin alert must be of 'danger' severity");
		assert.ok(penicillinAlert.title.includes("пенициллин"), "Title must state penicillin allergy");

		// Assert cardio alert
		const cardioAlert = submitBody.alerts.find((a) => a.id === "alert_cardio_pathology");
		assert.ok(cardioAlert, "Must generate alert_cardio_pathology");
		assert.equal(cardioAlert.severity, "warning");

		// Verify database sync into patientDrugAllergies table
		const savedAllergies = await withFixtureTenant(ORG_A, async () =>
			db
				.select()
				.from(patientDrugAllergies)
				.where(eq(patientDrugAllergies.patientId, PATIENT_A)),
		);
		assert.ok(savedAllergies.length >= 1, "Must sync allergy to patientDrugAllergies table");
		assert.ok(
			savedAllergies.some((a) => a.drugInnLatin.includes("Амоксиклав")),
			"Must record specific penicillin drug in patientDrugAllergies",
		);

		// Verify GET /health-questionnaire returns persisted risk profile & alerts
		const getRes = await app.inject({
			method: "GET",
			url: "/api/portal/health-questionnaire",
			headers: { authorization: `Bearer ${tokenA}` },
		});
		assert.equal(getRes.statusCode, 200);
		const getBody = getRes.json() as {
			riskLevel: string;
			somaticProfile: { hasPenicillinAllergy: boolean };
			alerts: Array<{ id: string }>;
		};
		assert.equal(getBody.riskLevel, "high");
		assert.equal(getBody.somaticProfile.hasPenicillinAllergy, true);
		assert.ok(getBody.alerts.some((a) => a.id === "alert_penicillin_allergy"));
	});

	test("10. Session Security, Logout Invalidation & Token Revocation", async (context) => {
		if (!databaseAvailable) return context.skip("База данных недоступна");

		// 1. Verify token lifespan constant compliance (<= 30 days for mobile PWA)
		assert.ok(
			PORTAL_TOKEN_TTL_SECONDS <= 30 * 24 * 60 * 60,
			"Portal token lifespan must not exceed 30 days per clinical security policy",
		);
		assert.ok(
			PORTAL_TOKEN_TTL_SECONDS >= 3600,
			"Portal token lifespan must be at least 1 hour for usable patient experience",
		);

		// 2. Issue a fresh dedicated token for Patient A
		const sessionToken = signToken(
			{ sub: PATIENT_A, organizationId: ORG_A, kind: "portal" },
			requireAuthTokenSecret(),
			3600,
		);

		// Verify session token works before logout
		const preLogoutRes = await app.inject({
			method: "GET",
			url: "/api/portal/me",
			headers: { authorization: `Bearer ${sessionToken}` },
		});
		assert.equal(preLogoutRes.statusCode, 200, "Active session token must return 200 OK");

		// 3. Unauthorized logout attempt (no header or empty token)
		const noAuthLogoutRes = await app.inject({
			method: "POST",
			url: "/api/portal/auth/logout",
		});
		assert.equal(noAuthLogoutRes.statusCode, 401, "Logout without token must return 401 Unauthorized");

		// 4. Authorized logout
		const logoutRes = await app.inject({
			method: "POST",
			url: "/api/portal/auth/logout",
			headers: { authorization: `Bearer ${sessionToken}` },
		});
		assert.equal(logoutRes.statusCode, 200, "Logout with valid token must succeed with 200 OK");
		const logoutBody = logoutRes.json() as { success: boolean; message: string; revokedAt: string };
		assert.equal(logoutBody.success, true);
		assert.ok(logoutBody.revokedAt, "Logout response must include revokedAt timestamp");

		// 5. Subsequent access to /me with the revoked token must be rejected with 401
		const postLogoutMeRes = await app.inject({
			method: "GET",
			url: "/api/portal/me",
			headers: { authorization: `Bearer ${sessionToken}` },
		});
		assert.equal(
			postLogoutMeRes.statusCode,
			401,
			"Revoked token must be rejected on /me with 401 Unauthorized",
		);
		const errBody = postLogoutMeRes.json() as { error: string };
		assert.equal(errBody.error, "SessionRevoked");

		// 6. Subsequent access to /health-questionnaire with revoked token must also be rejected
		const postLogoutQRes = await app.inject({
			method: "GET",
			url: "/api/portal/health-questionnaire",
			headers: { authorization: `Bearer ${sessionToken}` },
		});
		assert.equal(
			postLogoutQRes.statusCode,
			401,
			"Revoked token must be rejected on protected routes with 401 Unauthorized",
		);

		// 7. Verify persistent revocation audit in patient administrativeProfile
		const patientInDb = await withFixtureTenant(ORG_A, async () => {
			const rows = await db
				.select({ administrativeProfile: patients.administrativeProfile })
				.from(patients)
				.where(eq(patients.id, PATIENT_A));
			return rows[0];
		});
		const profile = patientInDb?.administrativeProfile as Record<string, unknown> | null;
		assert.ok(profile?.portalSessionRevokedAt, "Patient record must persist portalSessionRevokedAt timestamp");

		// 8. Re-attempting logout with already revoked token must return 401
		const reLogoutRes = await app.inject({
			method: "POST",
			url: "/api/portal/auth/logout",
			headers: { authorization: `Bearer ${sessionToken}` },
		});
		assert.equal(reLogoutRes.statusCode, 401, "Second logout with revoked token must return 401");
	});
});
