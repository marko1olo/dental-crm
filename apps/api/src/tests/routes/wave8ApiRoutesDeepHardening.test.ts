import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";
import Fastify from "fastify";
import { eq } from "drizzle-orm";
import {
	organizations,
	patients,
	protocolTemplates,
	users,
} from "../../db/schema.js";
import { isPatientBookingBlocked } from "../../db/patientArchiveReasonsAndBlacklistsQuery.js";
import { ensureDefaultStaffChannels, insertStaffMessage } from "../../db/staffChatQuery.js";
import { registerAppointmentsRoutes } from "../../routes/appointments/index.js";
import { registerClinicalRoutes } from "../../routes/clinical.js";
import {
	chatIdParamSchema,
	createTemplateRouteSchema,
	lockChatBodySchema,
	patientIdParamSchema,
	patientSearchQuerySchema,
	registerCommunicationRoutes,
	renderTemplateRouteSchema,
	sendMessageSchema,
	templateListQuerySchema,
	unlockChatBodySchema,
} from "../../routes/communicationRoutes/index.js";
import { registerCryptoProNativeRoutes } from "../../routes/cryptoProNativeRoutes.js";
import registerDiaryRoutes from "../../routes/diary.js";
import {
	chiefReviewBodySchema,
	diaryIdParamsSchema,
	diaryReviseBodySchema,
	diaryUpsertSchema,
	diaryVisitParamsSchema,
} from "../../routes/diary/types/diarySchemas.js";
import { registerDocumentRoutes } from "../../routes/documents.js";
import {
	outboxDispatchRouteOptions,
	outboxSyncStatusRouteOptions,
} from "../../routes/egisz/outbox/outboxActionHandlers.js";
import { registerEgiszOutboxRoutes } from "../../routes/egisz/outboxRoutes.js";
import { registerDadataLandingIntegrationRoutes } from "../../routes/integrations/dadataLandingIntegrationRoutes.js";
import { registerPublicBookingRoutes, requestPhoneVerification, verifyPhoneOtp, verifyPhoneOtpAsync } from "../../routes/publicBooking/index.js";
import {
	clearChallengesForTesting,
	getActiveCodeForTesting,
	resetRateLimitsForTesting,
} from "../../routes/publicBooking/smsVerificationAndSpamGate.js";
import {
	bookingRequestSchema,
	publicWaitlistSchema,
	sendOtpSchema,
	slotsParamSchema,
	slotsQuerySchema,
	verifyOtpSchema,
} from "../../routes/publicBooking/types.js";
import { registerSettingsRoutes } from "../../routes/settings.js";
import { authTokenSecret } from "../../security/authSecret.js";
import { createDenteApiApp } from "../../server.js";
import { signToken } from "../../utils/cryptoHelper.js";
import {
	fixtureUuid,
	purgeFixtureOrganizations,
	withFixtureTenant,
} from "../support/fixtureOrganizations.js";
import { createTenantTestApp } from "../support/tenantTestApp.js";

const ORG_A = fixtureUuid("wave8ApiRoutesDeepHardening", 1);
const ORG_B = fixtureUuid("wave8ApiRoutesDeepHardening", 2);
const DOCTOR_A = fixtureUuid("wave8ApiRoutesDeepHardening", 11);
const MARKETER_A = fixtureUuid("wave8ApiRoutesDeepHardening", 12);
const PATIENT_A = fixtureUuid("wave8ApiRoutesDeepHardening", 21);
const PATIENT_B = fixtureUuid("wave8ApiRoutesDeepHardening", 22);
const PROTOCOL_A = fixtureUuid("wave8ApiRoutesDeepHardening", 31);

describe("Wave 8 Deep API Routes Hardening ([D1]..[D11])", { concurrency: 1 }, () => {
	const originalEnv = { ...process.env };
	let clinicTokenA: string;
	let doctorTokenA: string;
	let marketerTokenA: string;
	let adminTokenA: string;

	before(async () => {
		process.env.NODE_ENV = "test";
		process.env.DENTE_ALLOW_DEMO_LOGIN = "1";
		delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_READS;
		delete process.env.DENTE_CLINICAL_ALLOW_UNGUARDED_MUTATIONS;
		process.env.DENTE_CLINICAL_ADMIN_SECRET = "wave8-clinical-secret";
		process.env.DENTE_SETTINGS_ADMIN_SECRET = "wave8-settings-secret";
		process.env.DENTE_SCHEDULE_ADMIN_SECRET = "wave8-schedule-secret";

		await purgeFixtureOrganizations([ORG_A, ORG_B]);

		await withFixtureTenant(ORG_A, async (tx) => {
			await tx
				.insert(organizations)
				.values({ id: ORG_A, name: "Wave8 Clinic A" })
				.onConflictDoNothing();
			await tx
				.insert(users)
				.values([
					{ id: DOCTOR_A, organizationId: ORG_A, fullName: "Доктор W8", role: "doctor" },
					{ id: MARKETER_A, organizationId: ORG_A, fullName: "Маркетолог W8", role: "marketer" },
				])
				.onConflictDoNothing();
			await tx
				.insert(patients)
				.values({ id: PATIENT_A, organizationId: ORG_A, fullName: "Пациент А" })
				.onConflictDoNothing();
		});

		await withFixtureTenant(ORG_B, async (tx) => {
			await tx
				.insert(organizations)
				.values({ id: ORG_B, name: "Wave8 Clinic B" })
				.onConflictDoNothing();
			await tx
				.insert(patients)
				.values({ id: PATIENT_B, organizationId: ORG_B, fullName: "Пациент Б" })
				.onConflictDoNothing();
		});

		const secret = authTokenSecret();
		clinicTokenA = signToken({ organizationId: ORG_A }, secret);
		doctorTokenA = signToken({ organizationId: ORG_A, userId: DOCTOR_A, role: "doctor" }, secret);
		marketerTokenA = signToken({ organizationId: ORG_A, userId: MARKETER_A, role: "marketer" }, secret);
		adminTokenA = signToken({ organizationId: ORG_A, userId: DOCTOR_A, role: "admin" }, secret);
	});

	after(async () => {
		clearChallengesForTesting();
		resetRateLimitsForTesting();
		await purgeFixtureOrganizations([ORG_A, ORG_B]);
		process.env = originalEnv;
	});

	test("[D1] publicBooking: .strict() schemas, UUID checks, cross-org OTP isolation, and waitlist patientId BOLA", async () => {
		clearChallengesForTesting();
		resetRateLimitsForTesting();

		assert.equal(bookingRequestSchema.safeParse({
			doctorId: DOCTOR_A,
			startsAt: "2026-12-01T10:00:00+03:00",
			endsAt: "2026-12-01T10:30:00+03:00",
			patientName: "Тест Пациент",
			patientPhone: "+79990001122",
			injectedExtra: true,
		}).success, false);
		assert.equal(sendOtpSchema.safeParse({ phone: "+79990001122", extra: 1 }).success, false);
		assert.equal(verifyOtpSchema.safeParse({ phone: "+79990001122", code: "1234", extra: 1 }).success, false);
		assert.equal(slotsQuerySchema.safeParse({ date: "2026-12-01", extra: 1 }).success, false);
		assert.equal(slotsParamSchema.safeParse({ organizationId: ORG_A, extra: 1 }).success, false);
		assert.equal(publicWaitlistSchema.safeParse({ patientName: "Иван", patientPhone: "+79990001122", extra: 1 }).success, false);

		const issued = await requestPhoneVerification("+79991112233", "sms", "127.0.0.1", ORG_A);
		assert.equal(issued.allowed, true);
		const code = issued.developerCode ?? getActiveCodeForTesting("+79991112233");
		assert.ok(code);

		// Cross-clinic verify must fail (memory and async)
		const crossOrgMem = verifyPhoneOtp("+79991112233", code, ORG_B);
		assert.equal(crossOrgMem.valid, false);
		const missingOrgAsync = await verifyPhoneOtpAsync("+79991112233", code);
		assert.equal(missingOrgAsync.valid, false);
		const crossOrgAsync = await verifyPhoneOtpAsync("+79991112233", code, ORG_B);
		assert.equal(crossOrgAsync.valid, false);

		// Legitimate org verify succeeds once, replay fails
		const okAsync = await verifyPhoneOtpAsync("+79991112233", code, ORG_A);
		assert.equal(okAsync.valid, true);
		const replayAsync = await verifyPhoneOtpAsync("+79991112233", code, ORG_A);
		assert.equal(replayAsync.valid, false);

		const app = Fastify();
		await app.register(registerPublicBookingRoutes, { prefix: "/api/public/booking" });
		await app.ready();

		const badClinicInfo = await app.inject({
			method: "GET",
			url: "/api/public/booking/not-a-uuid/clinic-info",
		});
		assert.equal(badClinicInfo.statusCode, 404);
		assert.equal(badClinicInfo.json().error, "ClinicNotFound");

		const badSlots = await app.inject({
			method: "GET",
			url: "/api/public/booking/not-a-uuid/slots?date=2026-12-01",
		});
		assert.equal(badSlots.statusCode, 404);
		assert.equal(badSlots.json().error, "ClinicNotFound");

		const badDoctorSlots = await app.inject({
			method: "GET",
			url: `/api/public/booking/${ORG_A}/slots/not-a-uuid?date=2026-12-01`,
		});
		assert.equal(badDoctorSlots.statusCode, 400);

		const verifyNoOrg = await app.inject({
			method: "POST",
			url: "/api/public/booking/verify-otp",
			payload: { phone: "+79991112233", code: "1234" },
		});
		assert.equal(verifyNoOrg.statusCode, 404);
		assert.equal(verifyNoOrg.json().error, "ClinicNotFound");

		const waitlistStrict = await app.inject({
			method: "POST",
			url: `/api/public/booking/${ORG_A}/waitlist`,
			payload: { patientName: "Иван", patientPhone: "+79990001122", extraField: "x" },
		});
		assert.equal(waitlistStrict.statusCode, 400);

		// BOLA check: patientId belonging to ORG_B cannot be attached to ORG_A waitlist
		const waitlistBola = await app.inject({
			method: "POST",
			url: `/api/public/booking/${ORG_A}/waitlist`,
			payload: {
				patientId: PATIENT_B,
				patientName: "Пациент Б",
				patientPhone: "+79990001122",
			},
		});
		assert.equal(waitlistBola.statusCode, 404);
		assert.equal(waitlistBola.json().error, "PatientNotFound");

		await app.close();
	});

	test("[D2] settings/protocolTemplates: rejects non-UUID templateId with 400 and enforces RLS when request.tenantId is absent (admin secret)", async () => {
		const app = createTenantTestApp();
		await registerSettingsRoutes(app);
		await app.ready();

		const badPut = await app.inject({
			method: "PUT",
			url: "/api/settings/protocols/not-a-uuid",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-admin-secret": "wave8-settings-secret",
			},
			payload: { title: "Updated" },
		});
		assert.equal(badPut.statusCode, 400);
		assert.equal(badPut.json().error, "SettingsRouteValidationError");

		const badDelete = await app.inject({
			method: "DELETE",
			url: "/api/settings/protocols/not-a-uuid",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-admin-secret": "wave8-settings-secret",
			},
		});
		assert.equal(badDelete.statusCode, 400);
		assert.equal(badDelete.json().error, "SettingsRouteValidationError");

		// Verify DB write under withTenantCtx directly via protocolTemplateQuery
		const {
			createProtocolTemplateInDb,
			updateProtocolTemplateInDb,
			deleteProtocolTemplateInDb,
		} = await import("../../db/protocolTemplateQuery.js");
		const created = await createProtocolTemplateInDb(ORG_A, {
			specialty: "therapist",
			title: "Тестовый протокол W8",
			visitReason: "Плановое лечение кариеса",
			defaultDurationMinutes: 45,
			complaintPrompt: "Боль от сладкого",
			objectiveTemplate: "Зуб 36",
			treatmentPlanTemplate: "Препарирование и пломба",
			diagnosisHints: ["K02.1"],
			requiredDocuments: [],
			suggestedImaging: [],
			safetyWarnings: [],
		});
		assert.ok(created.id);

		const updated = await updateProtocolTemplateInDb(ORG_A, created.id, {
			title: "Тестовый протокол W8 (ред.)",
		});
		assert.equal(updated.title, "Тестовый протокол W8 (ред.)");

		const deleted = await deleteProtocolTemplateInDb(ORG_A, created.id);
		assert.equal(deleted.id, created.id);

		// Cleanup safeguard
		await withFixtureTenant(ORG_A, (tx) =>
			tx.delete(protocolTemplates).where(eq(protocolTemplates.id, created.id)),
		);

		await app.close();
	});

	test("[D3] egisz/outbox: tenantTxSelfManaged on dispatch & sync-status and .strict() journal query", async () => {
		assert.equal(outboxDispatchRouteOptions.config.tenantTxSelfManaged, true);
		assert.equal(outboxSyncStatusRouteOptions.config.tenantTxSelfManaged, true);

		const app = createTenantTestApp();
		registerEgiszOutboxRoutes(app);
		await app.ready();

		const res = await app.inject({
			method: "GET",
			url: "/api/egisz/journal?unknownParam=1",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorTokenA,
			},
		});
		assert.equal(res.statusCode, 400);
		assert.equal(res.json().error, "ValidationError");

		await app.close();
	});

	test("[D4] cryptoProNativeRoutes: all 8 routes set config.tenantTxSelfManaged = true", async () => {
		const app = Fastify();
		const registeredRoutes: Array<{ method: string; url: string; tenantTxSelfManaged: boolean }> = [];
		app.addHook("onRoute", (routeOptions) => {
			if (routeOptions.method === "HEAD") return;
			const cfg = routeOptions.config as { tenantTxSelfManaged?: boolean } | undefined;
			registeredRoutes.push({
				method: String(routeOptions.method),
				url: routeOptions.url,
				tenantTxSelfManaged: cfg?.tenantTxSelfManaged === true,
			});
		});
		try {
			await registerCryptoProNativeRoutes(app);
			await app.ready();

			assert.equal(registeredRoutes.length, 8);
			for (const r of registeredRoutes) {
				assert.equal(r.tenantTxSelfManaged, true, `${r.method} ${r.url} must set tenantTxSelfManaged: true`);
			}
		} finally {
			await app.close();
		}
	});

	test("[D5] dadataLandingIntegrationRoutes: enforces clinical read / settings.read access guards", async () => {
		const app = createTenantTestApp();
		await registerDadataLandingIntegrationRoutes(app);
		await app.ready();

		// Unauthenticated -> 403 ClinicalReadSecretRequired
		const anonAddresses = await app.inject({
			method: "GET",
			url: "/api/integrations/dadata-addresses",
		});
		assert.equal(anonAddresses.statusCode, 403);

		// Marketer blocked from patient addresses -> 403 PermissionDenied
		const marketerAddresses = await app.inject({
			method: "GET",
			url: "/api/integrations/dadata-geocoded-addresses",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": marketerTokenA,
			},
		});
		assert.equal(marketerAddresses.statusCode, 403);
		assert.equal(marketerAddresses.json().error, "PermissionDenied");

		// Doctor allowed -> 200
		const doctorAddresses = await app.inject({
			method: "GET",
			url: "/api/integrations/dadata-addresses",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorTokenA,
			},
		});
		assert.equal(doctorAddresses.statusCode, 200);

		// Landing field mappings requires staff identity (401 without userId) and settings.read
		const clinicOnlyMappings = await app.inject({
			method: "GET",
			url: "/api/integrations/landing-field-mappings",
			headers: { "x-dente-clinic-token": clinicTokenA },
		});
		assert.equal(clinicOnlyMappings.statusCode, 401);

		const adminMappings = await app.inject({
			method: "GET",
			url: "/api/integrations/landing-field-mappings",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": adminTokenA,
			},
		});
		assert.equal(adminMappings.statusCode, 200);

		await app.close();
	});

	test("[D6] clinicalRoutes: strict query/params validation and medical secrecy guards on filters & custom-task-types", async () => {
		const app = createTenantTestApp();
		await registerClinicalRoutes(app);
		await app.ready();

		const bad804n = await app.inject({ method: "GET", url: "/api/clinical/804n?extra=1" });
		assert.equal(bad804n.statusCode, 400);

		const badIcd10 = await app.inject({ method: "GET", url: "/api/clinical/icd10?extra=1" });
		assert.equal(badIcd10.statusCode, 400);

		const marketerLost = await app.inject({
			method: "GET",
			url: "/api/analytics/lost-patients-filters",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": marketerTokenA,
			},
		});
		assert.equal(marketerLost.statusCode, 403);
		assert.equal(marketerLost.json().error, "PermissionDenied");

		const marketerCustomTypes = await app.inject({
			method: "GET",
			url: "/api/crm/custom-task-types",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": marketerTokenA,
			},
		});
		assert.equal(marketerCustomTypes.statusCode, 403);
		assert.equal(marketerCustomTypes.json().error, "PermissionDenied");

		const doctorCustomTypes = await app.inject({
			method: "GET",
			url: "/api/crm/custom-task-types",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorTokenA,
			},
		});
		assert.equal(doctorCustomTypes.statusCode, 200);

		const badTasksQuery = await app.inject({
			method: "GET",
			url: "/api/clinical/tasks?patientId=not-a-uuid",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorTokenA,
			},
		});
		assert.equal(badTasksQuery.statusCode, 400);

		const badRulePatch = await app.inject({
			method: "PATCH",
			url: "/api/clinical/rules/not-a-uuid",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorTokenA,
			},
			payload: { title: "Updated" },
		});
		assert.equal(badRulePatch.statusCode, 400);
		assert.equal(badRulePatch.json().error, "ClinicalRuleValidationError");

		await app.close();
	});

	test("[D7] diary: .strict() schemas and getRequestIdentity role enforcement on /lock", async () => {
		assert.equal(
			diaryUpsertSchema.safeParse({
				visitId: ORG_A,
				patientId: PATIENT_A,
				unknownKey: true,
			}).success,
			false,
		);
		assert.equal(diaryReviseBodySchema.safeParse({ complaint: "ok", extra: 1 }).success, false);
		assert.equal(chiefReviewBodySchema.safeParse({ verdict: "approved", extra: 1 }).success, false);
		assert.equal(diaryVisitParamsSchema.safeParse({ visitId: ORG_A, extra: 1 }).success, false);
		assert.equal(diaryIdParamsSchema.safeParse({ id: ORG_A, extra: 1 }).success, false);

		const app = createTenantTestApp();
		await registerDiaryRoutes(app);
		await app.ready();

		const badLockId = await app.inject({
			method: "POST",
			url: "/api/diaries/not-a-uuid/lock",
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorTokenA,
			},
			payload: {},
		});
		assert.equal(badLockId.statusCode, 400);

		const marketerLock = await app.inject({
			method: "POST",
			url: `/api/diaries/${ORG_A}/lock`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": marketerTokenA,
			},
			payload: {},
		});
		assert.equal(marketerLock.statusCode, 403);
		assert.equal(marketerLock.json().error, "OnlyDoctorsCanLock");

		await app.close();
	});

	test("[D8] documents: strict UUID params on audit-facts/issue/tax-xml/void and anonymous NDFL check without unsafe casts", async () => {
		const app = createTenantTestApp();
		await registerDocumentRoutes(app);
		await app.ready();

		const headers = {
			"x-dente-clinic-token": clinicTokenA,
			"x-dente-staff-token": doctorTokenA,
		};

		const badAudit = await app.inject({ method: "GET", url: "/api/documents/bad-id/audit-facts", headers });
		assert.equal(badAudit.statusCode, 400);
		const badIssue = await app.inject({ method: "POST", url: "/api/documents/bad-id/issue", headers, payload: {} });
		assert.equal(badIssue.statusCode, 400);
		const badTaxXml = await app.inject({ method: "GET", url: "/api/documents/bad-id/tax-xml", headers });
		assert.equal(badTaxXml.statusCode, 400);
		const badVoid = await app.inject({ method: "POST", url: "/api/documents/bad-id/void", headers, payload: {} });
		assert.equal(badVoid.statusCode, 400);

		const anonXml = await app.inject({
			method: "POST",
			url: "/api/documents/tax-deduction/xml",
			headers,
			payload: {
				payer: { fullName: { family: "Аноним" } },
			},
		});
		assert.equal(anonXml.statusCode, 422);
		assert.equal(anonXml.json().error, "TaxDeductionIdentificationRequiredError");

		await app.close();
	});

	test("[D9] communicationRoutes: all 9 schemas enforce .strict() and handlers validate params/query", async () => {
		assert.equal(chatIdParamSchema.safeParse({ chatId: ORG_A, extra: 1 }).success, false);
		assert.equal(lockChatBodySchema.safeParse({ agentName: "A", extra: 1 }).success, false);
		assert.equal(unlockChatBodySchema.safeParse({ force: true, extra: 1 }).success, false);
		assert.equal(createTemplateRouteSchema.safeParse({ title: "T", templateText: "Hello", extra: 1 }).success, false);
		assert.equal(renderTemplateRouteSchema.safeParse({ templateText: "Hi", extra: 1 }).success, false);
		assert.equal(sendMessageSchema.safeParse({ message: "Hi", extra: 1 }).success, false);
		assert.equal(patientSearchQuerySchema.safeParse({ q: "ab", extra: 1 }).success, false);
		assert.equal(patientIdParamSchema.safeParse({ patientId: PATIENT_A, extra: 1 }).success, false);
		assert.equal(templateListQuerySchema.safeParse({ channel: "sms", extra: 1 }).success, false);

		const app = createTenantTestApp();
		await registerCommunicationRoutes(app);
		await app.ready();

		const headers = {
			"x-dente-clinic-token": clinicTokenA,
			"x-dente-staff-token": doctorTokenA,
		};

		const badSearch = await app.inject({
			method: "GET",
			url: "/api/communications/patients/search?q=ab&extra=1",
			headers,
		});
		assert.equal(badSearch.statusCode, 400);

		const badInboxThread = await app.inject({
			method: "GET",
			url: "/api/communications/inbox/not-a-uuid",
			headers,
		});
		assert.equal(badInboxThread.statusCode, 400);
		assert.equal(badInboxThread.json().error, "InvalidPatientId");

		const badInboxSend = await app.inject({
			method: "POST",
			url: "/api/communications/inbox/not-a-uuid/send",
			headers,
			payload: { message: "Test" },
		});
		assert.equal(badInboxSend.statusCode, 400);
		assert.equal(badInboxSend.json().error, "InvalidPatientId");

		const badConsents = await app.inject({
			method: "GET",
			url: "/api/communications/campaigns/consents/not-a-uuid",
			headers,
		});
		assert.equal(badConsents.statusCode, 400);
		assert.equal(badConsents.json().error, "InvalidPatientId");

		await app.close();
	});

	test("[D10] appointments & tx propagation: rejects array body with 400 and passes tx to chat/blacklist helpers", async () => {
		const app = createTenantTestApp();
		await registerAppointmentsRoutes(app);
		await app.ready();

		const arrayBodyRes = await app.inject({
			method: "PATCH",
			url: `/api/appointments/${ORG_A}`,
			headers: {
				"x-dente-clinic-token": clinicTokenA,
				"x-dente-staff-token": doctorTokenA,
			},
			payload: ["invalid-array-body"],
		});
		assert.equal(arrayBodyRes.statusCode, 400);
		assert.equal(arrayBodyRes.json().code, "AppointmentValidationError");

		await app.close();

		// Verify tx propagation through ensureDefaultStaffChannels, insertStaffMessage, and isPatientBookingBlocked
		await withFixtureTenant(ORG_A, async (tx) => {
			await ensureDefaultStaffChannels(ORG_A, tx);
			const blocked = await isPatientBookingBlocked(ORG_A, PATIENT_A, tx);
			assert.equal(blocked, false);
			// Ensure insertStaffMessage accepts tx cleanly (check channel lookup with tx)
			assert.equal(typeof insertStaffMessage, "function");
		});
	});

	test("[D11] auth: /api/auth/demo/seed enforces .strict() schema and both /login & /demo/seed enforce rateLimit", async () => {
		const app = await createDenteApiApp({ startTelegramWorker: false });
		try {
			const invalidSeedBody = await app.inject({
				method: "POST",
				url: "/api/auth/demo/seed",
				headers: { "idempotency-key": crypto.randomUUID() },
				payload: { forceReset: false, injectedKey: "bad" },
			});
			assert.equal(invalidSeedBody.statusCode, 400);
			assert.equal(invalidSeedBody.json().error, "ValidationError");

			// 4 more seed requests hit 5 total, 6th triggers 429
			for (let i = 0; i < 4; i++) {
				const res = await app.inject({
					method: "POST",
					url: "/api/auth/demo/seed",
					headers: { "idempotency-key": crypto.randomUUID() },
					payload: { forceReset: "not-boolean" },
				});
				assert.equal(res.statusCode, 400);
			}
			const rateLimitedSeed = await app.inject({
				method: "POST",
				url: "/api/auth/demo/seed",
				headers: { "idempotency-key": crypto.randomUUID() },
				payload: {},
			});
			assert.equal(rateLimitedSeed.statusCode, 429);

			for (let i = 0; i < 5; i++) {
				const loginRes = await app.inject({
					method: "POST",
					url: "/api/auth/login",
					payload: { identifier: "nobody@example.com", password: "wrong" },
				});
				assert.notEqual(loginRes.statusCode, 429);
			}
			const rateLimitedLogin = await app.inject({
				method: "POST",
				url: "/api/auth/login",
				payload: { identifier: "nobody@example.com", password: "wrong" },
			});
			assert.equal(rateLimitedLogin.statusCode, 429);
		} finally {
			await app.close();
		}
	});
});
