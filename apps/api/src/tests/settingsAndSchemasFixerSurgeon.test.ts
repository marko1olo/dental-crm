import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	batchUpdateLeadStageSchema,
	patchLeadStageSchema,
	leadStageHistoryEntrySchema,
	photoVideoConsentPayloadSchema,
	xrayCbctReferralPayloadSchema,
	medicalDocumentReleaseReceiptPayloadSchema,
	medicalRecordExtractPayloadSchema,
	structuredAnamnesisSchema,
	dentalMedicalCard043uOrganizationSchema,
	dentalMedicalCard043uPatientSchema,
	dentalMedicalCard043uDoctorSchema,
	dentalMedicalCard043uPayloadSchema,
	medicalRecordCopyRequestPayloadSchema,
	postVisitRecommendationsPayloadSchema,
	treatmentPlanPayloadSchema,
	treatmentPlanAcceptancePayloadSchema,
	updateClinicProfileSchema,
	createStaffMemberSchema,
	updateStaffWorkingHoursSchema,
	updateStaffAuthorityGrantsSchema,
	updateChairWorkingHoursSchema,
	createChairSchema,
	installmentPaymentSchedulePayloadSchema,
	minorLegalRepresentativeConsentPayloadSchema,
	warrantyServiceMemoPayloadSchema,
	anesthesiaDoseRowSchema,
	anesthesiaConsentPayloadSchema,
	clinicalToothRowSchema,
	prescriptionMedicationPayloadSchema,
	labWorkOrderPayloadSchema,
	informedConsentPayloadSchema,
	procedureSpecificConsentPayloadSchema,
	personalDataProcessingConsentPayloadSchema,
	medicalInterventionRefusalPayloadSchema,
} from "@dental/shared";
import { db } from "../db/client.js";
import {
	organizations,
	clinics,
	users,
	patients,
	visits,
	periodontogramSnapshots,
	toothStates,
	toothStateHistory,
} from "../db/schema.js";
import { idempotencyKeys } from "../db/schema/idempotency.js";
import {
	psrSextantEntrySchema,
	patchTeethPayloadSchema,
	patchSitesPayloadSchema,
} from "../services/periodontogramService.js";
import { registerClinicProfileRoutes } from "../routes/settings/clinicProfileRoutes.js";
import { registerVisitPerioRoutes } from "../routes/visits/visitPerioRoutes.js";
import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";
import {
	fixtureUuid,
	isDatabaseUnavailable,
	withFixtureTenant,
} from "./support/fixtureOrganizations.js";
import { createTenantTestApp } from "./support/tenantTestApp.js";

const FIXTURE = "settingsFixer";
const ORG_ID = fixtureUuid(FIXTURE, 1);
const ADMIN_ID = fixtureUuid(FIXTURE, 10);
const DOCTOR_ID = fixtureUuid(FIXTURE, 11);
const PATIENT_ID = fixtureUuid(FIXTURE, 20);
const VISIT_ID = fixtureUuid(FIXTURE, 30);
const CLINIC_ID = fixtureUuid(FIXTURE, 40);

describe("Settings & Schemas Fixer Surgeon Suite (Zod Strict Deficit & Idempotency Seals)", () => {
	let app: FastifyInstance;
	let tokenAdmin: string;
	let tokenDoctor: string;
	let dbAvailable = true;

	before(async () => {
		try {
			await withFixtureTenant(ORG_ID, async (tx) => {
				await tx.execute(sql`SELECT 1`);
			});
		} catch (err) {
			if (isDatabaseUnavailable(err)) {
				dbAvailable = false;
				console.warn("[SETTINGS_FIXER_TEST] Database unavailable, will run pure schema checks");
				return;
			}
			throw err;
		}

		await withFixtureTenant(ORG_ID, async (tx) => {
			await tx.delete(idempotencyKeys).where(eq(idempotencyKeys.clinicId, ORG_ID));
			await tx.delete(periodontogramSnapshots).where(eq(periodontogramSnapshots.organizationId, ORG_ID));
			await tx.delete(toothStateHistory).where(eq(toothStateHistory.organizationId, ORG_ID));
			await tx.delete(toothStates).where(eq(toothStates.organizationId, ORG_ID));
			await tx.delete(visits).where(eq(visits.organizationId, ORG_ID));
			await tx.delete(patients).where(eq(patients.organizationId, ORG_ID));
			await tx.delete(users).where(eq(users.organizationId, ORG_ID));
			await tx.delete(clinics).where(eq(clinics.organizationId, ORG_ID));
			await tx.delete(organizations).where(eq(organizations.id, ORG_ID));

			await tx.insert(organizations).values({
				id: ORG_ID,
				name: "Клиника DENTE Хирургический Профиль",
				email: "fixer-surgeon@test.local",
			}).onConflictDoNothing();

			await tx.insert(clinics).values({
				id: CLINIC_ID,
				organizationId: ORG_ID,
				name: "Главный филиал Хирург",
				timezone: "Europe/Samara",
			}).onConflictDoNothing();

			await tx.insert(users).values({
				id: ADMIN_ID,
				organizationId: ORG_ID,
				email: "admin.fixer@test.local",
				fullName: "Администратор Хирург",
				role: "admin",
				isStaff: true,
				isActive: true,
			}).onConflictDoNothing();

			await tx.insert(users).values({
				id: DOCTOR_ID,
				organizationId: ORG_ID,
				email: "doctor.fixer@test.local",
				fullName: "Врач Хирург Пародонтолог",
				role: "doctor",
				isStaff: true,
				isActive: true,
			}).onConflictDoNothing();

			await tx.insert(patients).values({
				id: PATIENT_ID,
				organizationId: ORG_ID,
				fullName: "Пародонтологический Пациент",
				birthDate: "1990-01-01",
				phone: "+7 (999) 777-66-55",
			}).onConflictDoNothing();

			await tx.insert(visits).values({
				id: VISIT_ID,
				organizationId: ORG_ID,
				patientId: PATIENT_ID,
				status: "draft",
			}).onConflictDoNothing();
		});

		app = await createTenantTestApp();
		registerClinicProfileRoutes(app);
		registerVisitPerioRoutes(app);

		const secret = authTokenSecret();
		tokenAdmin = signToken(
			{
				userId: ADMIN_ID,
				organizationId: ORG_ID,
				role: "admin",
			},
			secret,
			3600,
		);
		tokenDoctor = signToken(
			{
				userId: DOCTOR_ID,
				organizationId: ORG_ID,
				role: "doctor",
			},
			secret,
			3600,
		);
	});

	after(async () => {
		if (app) {
			await app.close();
		}
	});

	// ─── 1. ZOD SCHEMAS .strict() SEALING ──────────────────────────────────────────
	it("1. Sealed Zod schemas reject unrecognized extraneous keys (.strict() gate)", () => {
		// 1a. Lead schemas
		const leadBatchRes = batchUpdateLeadStageSchema.safeParse({
			leadIds: [fixtureUuid("lead", 1)],
			toStage: "contacted",
			__extraneousLeak: true,
		});
		assert.equal(leadBatchRes.success, false, "batchUpdateLeadStageSchema must reject extra fields");

		const leadPatchRes = patchLeadStageSchema.safeParse({
			toStage: "consult_booked",
			__extraneousLeak: 123,
		});
		assert.equal(leadPatchRes.success, false, "patchLeadStageSchema must reject extra fields");

		const leadHistoryRes = leadStageHistoryEntrySchema.safeParse({
			id: fixtureUuid("hist", 1),
			organizationId: ORG_ID,
			leadId: fixtureUuid("lead", 1),
			toStage: "new",
			createdAt: new Date().toISOString(),
			__extraneousLeak: "junk",
		});
		assert.equal(leadHistoryRes.success, false, "leadStageHistoryEntrySchema must reject extra fields");

		// 1b. Post-visit recommendations & Treatment plans
		const postVisitRes = postVisitRecommendationsPayloadSchema.safeParse({
			careTopic: "hygiene",
			procedureName: "Профгигиена",
			toothOrArea: "Все зубы",
			performedAt: "2026-11-24",
			doctorFullName: "Врач",
			allowedAfter: ["Пить воду"],
			temporaryRestrictions: ["Без кофе"],
			medicationAndRinsePlan: ["Хлоргексидин"],
			hygieneInstructions: ["Мягкая щетка"],
			nutritionInstructions: ["Теплая пища"],
			urgentWarningSigns: ["Кровотечение"],
			clinicContactInstruction: "Звоните",
			telegramSummary: "Все ок",
			patientReceivedPrintedCopy: true,
			patientUnderstandsUrgentSigns: true,
			safeForTelegramSending: true,
			__extraneousLeak: "fail",
		});
		assert.equal(postVisitRes.success, false, "postVisitRecommendationsPayloadSchema must reject extra fields");

		// Treatment plan with extraneous key at root
		const planRootRes = treatmentPlanPayloadSchema.safeParse({
			clinicalReason: "Кариес",
			diagnosisSummary: "К02.1",
			teethOrArea: "16",
			clinicalToothRows: [
				{
					toothOrArea: "16",
					surfaces: ["occlusal"],
					status: "caries",
					diagnosisOrFinding: "Кариес эмали",
					indication: "Пломбирование",
					plannedAction: "Пломба",
				},
			],
			treatmentGoals: ["Восстановление"],
			plannedStages: [
				{
					stageName: "Этап 1",
					plannedServices: "Анестезия, пломба",
					plannedTiming: "1 визит",
				},
			],
			estimatedTotalRub: "5000.00",
			alternatives: ["Вкладка"],
			risksAndLimitations: ["Скол"],
			plannedAt: "2026-11-24",
			patientQuestionsAnswered: true,
			planRequiresSeparateConsent: true,
			planRequiresNewApprovalOnChange: true,
			__extraneousLeak: "fail",
		});
		assert.equal(planRootRes.success, false, "treatmentPlanPayloadSchema must reject extra root fields");

		// Treatment plan with extraneous key in plannedStages
		const planStageRes = treatmentPlanPayloadSchema.safeParse({
			clinicalReason: "Кариес",
			diagnosisSummary: "К02.1",
			teethOrArea: "16",
			clinicalToothRows: [
				{
					toothOrArea: "16",
					surfaces: ["occlusal"],
					status: "caries",
					diagnosisOrFinding: "Кариес эмали",
					indication: "Пломбирование",
					plannedAction: "Пломба",
				},
			],
			treatmentGoals: ["Восстановление"],
			plannedStages: [
				{
					stageName: "Этап 1",
					plannedServices: "Анестезия, пломба",
					plannedTiming: "1 визит",
					__stageGarbage: "leak",
				},
			],
			estimatedTotalRub: "5000.00",
			alternatives: ["Вкладка"],
			risksAndLimitations: ["Скол"],
			plannedAt: "2026-11-24",
			patientQuestionsAnswered: true,
			planRequiresSeparateConsent: true,
			planRequiresNewApprovalOnChange: true,
		});
		assert.equal(planStageRes.success, false, "treatmentPlanPayloadSchema must reject extra stage fields in plannedStages");

		// 1c. Clinic Scale & Profile schemas
		const updateProfileExtraRes = updateClinicProfileSchema.safeParse({
			clinicName: "Клиника",
			__badField: true,
		});
		assert.equal(updateProfileExtraRes.success, false, "updateClinicProfileSchema must reject extra fields");

		const updateProfileValidWithBranch = updateClinicProfileSchema.safeParse({
			clinicName: "Клиника Новая",
			branchId: CLINIC_ID,
			clinicId: null,
		});
		assert.equal(updateProfileValidWithBranch.success, true, "updateClinicProfileSchema accepts branchId and clinicId");

		const staffMemberExtraRes = createStaffMemberSchema.safeParse({
			fullName: "Тестовый Доктор",
			role: "doctor",
			__extraneous: 1,
		});
		assert.equal(staffMemberExtraRes.success, false, "createStaffMemberSchema must reject extra fields");

		const chairExtraRes = createChairSchema.safeParse({
			name: "Кресло 1",
			__garbage: "no",
		});
		assert.equal(chairExtraRes.success, false, "createChairSchema must reject extra fields");

		// 1d. Periodontogram schemas
		const psrExtraRes = psrSextantEntrySchema.safeParse({
			code: 2,
			__extra: "leak",
		});
		assert.equal(psrExtraRes.success, false, "psrSextantEntrySchema must reject extra fields");

		const patchTeethExtraRes = patchTeethPayloadSchema.safeParse({
			teeth: [
				{
					toothNumber: 16,
					isPresent: true,
				},
			],
			__leak: 1,
		});
		assert.equal(patchTeethExtraRes.success, false, "patchTeethPayloadSchema must reject extra envelope fields");

		const patchSitesExtraRes = patchSitesPayloadSchema.safeParse({
			sites: [
				{
					toothNumber: 16,
					siteCode: "V",
					probingDepthMm: 3,
				},
			],
			__leak: 1,
		});
		assert.equal(patchSitesExtraRes.success, false, "patchSitesPayloadSchema must reject extra envelope fields");
	});

	// ─── 2. CLINIC PROFILE ROUTES IDEMPOTENCY & BRANCH VALIDATION (DEF-SETT-01, DEF-SETT-02) ─
	it("2. clinicProfileRoutes requires valid UUID Idempotency-Key and returns header (DEF-SETT-01)", async (t) => {
		if (!dbAvailable) return t.skip();

		// 2a. Невалидный UUID в заголовке Idempotency-Key -> 400
		const resInvalidIdem = await app.inject({
			method: "PATCH",
			url: "/api/settings/clinic/profile",
			headers: {
				"x-dente-staff-token": tokenAdmin,
				"idempotency-key": "not-a-valid-uuid",
			},
			payload: {
				clinicName: "Новое Имя Клиники",
			},
		});
		assert.equal(resInvalidIdem.statusCode, 400);
		const errBody = JSON.parse(resInvalidIdem.body);
		assert.equal(errBody.error, "SettingsValidationError");

		// 2b. Валидный UUIDv7 в Idempotency-Key -> 200 и возврат заголовка Idempotency-Key
		const validIdempotencyKey = fixtureUuid("idem", 101);
		const resValidIdem = await app.inject({
			method: "PATCH",
			url: "/api/settings/clinic/profile",
			headers: {
				"x-dente-staff-token": tokenAdmin,
				"idempotency-key": validIdempotencyKey,
			},
			payload: {
				clinicName: "DENTE Профиль Обновлен",
				branchId: CLINIC_ID,
			},
		});
		assert.equal(resValidIdem.statusCode, 200);
		assert.equal(resValidIdem.headers["idempotency-key"], validIdempotencyKey);
		const bodySuccess = JSON.parse(resValidIdem.body);
		assert.ok(bodySuccess.profile);

		// 2c. Попытка передать неизвестное поле отвергается валидацией Zod .strict()
		const resStrictProfile = await app.inject({
			method: "PATCH",
			url: "/api/settings/clinic/profile",
			headers: {
				"x-dente-staff-token": tokenAdmin,
			},
			payload: {
				clinicName: "Тест",
				__extraneousLeak: 123,
			},
		});
		assert.equal(resStrictProfile.statusCode, 400);
	});

	// ─── 3. VISIT PERIO ROUTES IDEMPOTENCY REPLAY & CLEAN NORMALIZATION (DEF-PERIO-01, DEF-PERIO-02) ─
	it("3. visitPerioRoutes enforces Idempotency-Key, handles replay, and purges restBody leaks (DEF-PERIO-01, DEF-PERIO-02)", async (t) => {
		if (!dbAvailable) return t.skip();

		// 3a. Невалидный UUID в Idempotency-Key -> 400
		const resInvalidIdem = await app.inject({
			method: "POST",
			url: `/api/visits/${VISIT_ID}/perio`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
				"idempotency-key": "invalid-perio-key",
			},
			payload: {
				teeth: [{ toothNumber: 11, isPresent: true }],
			},
		});
		assert.equal(resInvalidIdem.statusCode, 400);
		const errJson = JSON.parse(resInvalidIdem.body);
		assert.equal(errJson.error, "ValidationError");

		// 3b. Валидное первичное сохранение с teethData и psr (проверка нормализации DEF-PERIO-02)
		const perioIdempotencyKey = fixtureUuid("perioIdem", 201);
		const resFirst = await app.inject({
			method: "POST",
			url: `/api/visits/${VISIT_ID}/perio`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
				"idempotency-key": perioIdempotencyKey,
			},
			payload: {
				teethData: [{ toothNumber: 11, isPresent: true, mobility: 1 }],
				psr: {
					"1": { code: 2, asterisk: false },
				},
				// Постороннее поле не должно со спредом ...restBody завалить строгую схему
				__arbitraryJunkThatUsedToLeak: "garbage",
			},
		});

		assert.equal(resFirst.statusCode, 200);
		assert.equal(resFirst.headers["idempotency-key"], perioIdempotencyKey);
		const firstJson = JSON.parse(resFirst.body);
		assert.equal(firstJson.success, true);
		assert.equal(firstJson.visitId, VISIT_ID);

		// 3c. Повторный вызов с тем же Idempotency-Key -> idempotency-replayed: true (DEF-PERIO-01)
		const resReplay = await app.inject({
			method: "POST",
			url: `/api/visits/${VISIT_ID}/perio`,
			headers: {
				"x-dente-staff-token": tokenDoctor,
				"idempotency-key": perioIdempotencyKey,
			},
			payload: {
				teethData: [{ toothNumber: 11, isPresent: true, mobility: 1 }],
			},
		});

		assert.equal(resReplay.statusCode, 200);
		const replayedHeader = resReplay.headers["idempotency-replayed"] || resReplay.headers["x-idempotency-replayed"];
		assert.equal(replayedHeader, "true", "Повторный запрос должен вернуть заголовок idempotency-replayed: true");
		const replayJson = JSON.parse(resReplay.body);
		assert.equal(replayJson.success, true);
		assert.deepEqual(replayJson.visitId, firstJson.visitId);
	});
});
