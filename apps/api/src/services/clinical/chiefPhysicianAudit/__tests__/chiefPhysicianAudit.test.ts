/**
 * chiefPhysicianAudit.test.ts — Модульные тесты декомпозированной архитектуры chiefPhysicianAudit.
 * Проверка Layer 0, Layer 1, Layer 2, Layer 3 и тонкого фасада сервиса.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	ChiefPhysicianAuditError,
	ChiefPhysicianAuditService,
	calculateComplianceScore,
	calculateCompletenessIndex,
	checkEgiszRemdCompliance,
	detectProtocolDefects,
	evaluateOrder203nCriteria,
	generateManagementAuditSummary,
	generateQualityActText,
	isAuthorizedReviewerRole,
	isChiefDoctorVerdict,
} from "../index.js";

describe("chiefPhysicianAudit — Layer 0 & Layer 1: Pure Scoring Engine", () => {
	it("isChiefDoctorVerdict validates all 3 legal verdicts", () => {
		assert.equal(isChiefDoctorVerdict("approved"), true);
		assert.equal(isChiefDoctorVerdict("deficiencies_found"), true);
		assert.equal(isChiefDoctorVerdict("critical_violation"), true);
		assert.equal(isChiefDoctorVerdict("arbitrary"), false);
	});

	it("isAuthorizedReviewerRole checks role permissions correctly", () => {
		assert.equal(isAuthorizedReviewerRole("chief_doctor"), true);
		assert.equal(isAuthorizedReviewerRole("owner"), true);
		assert.equal(isAuthorizedReviewerRole("admin"), true);
		assert.equal(isAuthorizedReviewerRole("doctor"), false);
		assert.equal(isAuthorizedReviewerRole("nurse"), false);
	});

	it("calculateCompletenessIndex computes percentage based on filled sections", () => {
		const emptyIndex = calculateCompletenessIndex(null);
		assert.equal(emptyIndex, 0);

		const fullIndex = calculateCompletenessIndex({
			anamnesis: "Жалобы на скол пломбы 25 зуба неделю назад.",
			statusLocalis: "25 зуб — дефект фотополимерной пломбы по I классу Блэка.",
			diagnosisIcd10: "K02.1",
			treatmentDescription: "Препарирование, адгезивный протокол, пломба SDR + Ceram.x.",
			recommendations: "Гигиена полости рта, контрольный осмотр через 6 месяцев.",
			instrumentTrayBarcode: "BARCODE-STERIL-123",
		});
		assert.equal(fullIndex, 100);

		const partialIndex = calculateCompletenessIndex({
			anamnesis: "Болит зуб",
			statusLocalis: "Кариес",
			diagnosisIcd10: "K02",
		});
		assert.ok(partialIndex > 0 && partialIndex < 100);
	});

	it("detectProtocolDefects accurately identifies missing elements", () => {
		const fullCriteria = {
			informedConsentPresent: true,
			anamnesisComplete: true,
			statusLocalisComplete: true,
			icd10DiagnosisValid: true,
			treatmentPlanAdequate: true,
			instrumentTraceabilityValid: true,
		};
		const noDefects = detectProtocolDefects(fullCriteria);
		assert.equal(noDefects.length, 0);

		const deficientCriteria = {
			informedConsentPresent: false,
			anamnesisComplete: false,
			statusLocalisComplete: true,
			icd10DiagnosisValid: false,
			treatmentPlanAdequate: true,
			instrumentTraceabilityValid: false,
		};
		const defects = detectProtocolDefects(deficientCriteria);
		assert.equal(defects.length, 4);
		assert.ok(defects.some((d) => d.criterionKey === "informedConsentPresent"));
		assert.ok(defects.some((d) => d.criterionKey === "icd10DiagnosisValid"));
		assert.ok(defects.some((d) => d.criterionKey === "anamnesisComplete"));
		assert.ok(defects.some((d) => d.criterionKey === "instrumentTraceabilityValid"));
	});
});

describe("chiefPhysicianAudit — Layer 2: EGISZ REMD Non-Blocking Check", () => {
	it("checkEgiszRemdCompliance advises on missing fields without blocking", () => {
		const result = checkEgiszRemdCompliance({
			diary: {
				anamnesis: "Острая боль в области зуба 36 при накусывании.",
				statusLocalis: "36 зуб — глубокая кариозная полость, перкуссия слабо болезненна.",
				diagnosisIcd10: "K04.0",
				diagnosisTooth: "36",
				treatmentDescription: "Экстирпация пульпы, медикаментозная обработка каналов.",
			},
			patient: {
				snils: "123-456-789 01",
				fullName: "Иванов Иван",
			},
			attendingDoctor: {
				fullName: "Смирнова Анна Викторовна",
				specialty: "Стоматолог-терапевт",
			},
			criteriaEvaluation: {
				informedConsentPresent: true,
			},
		});

		assert.equal(result.isReadyForRemd, true);
		assert.ok(result.readinessScorePct >= 80);
		assert.equal(result.missingRemdFields.length, 0);
	});

	it("checkEgiszRemdCompliance identifies missing SNILS and invalid ICD-10", () => {
		const result = checkEgiszRemdCompliance({
			diary: {
				anamnesis: "Коротко",
				statusLocalis: "",
				diagnosisIcd10: "INVALID",
			},
			patient: {
				snils: null,
			},
			attendingDoctor: null,
		});

		assert.equal(result.isReadyForRemd, false);
		assert.ok(result.missingRemdFields.includes("snils_patient"));
		assert.ok(result.missingRemdFields.includes("diagnosis_icd10"));
		assert.ok(result.advisoryWarnings.length > 0);
		assert.ok(result.recommendations.length > 0);
	});
});

describe("chiefPhysicianAudit — Layer 3: Report Generator", () => {
	it("generateManagementAuditSummary calculates aggregate statistics", () => {
		const records = [
			{
				id: "aud-1",
				organizationId: "org-1",
				visitId: "v-1",
				diaryId: "d-1",
				patientId: "p-1",
				reviewerDoctorId: "doc-1",
				reviewerDoctorFullName: "Главврач",
				reviewerRole: "Главный врач",
				attendingDoctorId: "doc-2",
				attendingDoctorFullName: "Лечащий врач",
				verdict: "approved" as const,
				verdictLabel: "Соответствует",
				notes: null,
				actNumber: "АКТ-1",
				protocolNumber: "ВК-1",
				criteriaEvaluation: {
					informedConsentPresent: true,
					anamnesisComplete: true,
					statusLocalisComplete: true,
					icd10DiagnosisValid: true,
					treatmentPlanAdequate: true,
					instrumentTraceabilityValid: true,
				},
				complianceScorePct: 100,
				expertSummary: "...",
				recommendations: null,
				reviewedAt: "2026-10-10T12:00:00Z",
				createdAt: "2026-10-10T12:00:00Z",
			},
			{
				id: "aud-2",
				organizationId: "org-1",
				visitId: "v-2",
				diaryId: "d-2",
				patientId: "p-2",
				reviewerDoctorId: "doc-1",
				reviewerDoctorFullName: "Главврач",
				reviewerRole: "Главный врач",
				attendingDoctorId: "doc-2",
				attendingDoctorFullName: "Лечащий врач",
				verdict: "deficiencies_found" as const,
				verdictLabel: "Дефекты",
				notes: "Исправить ИДС",
				actNumber: "АКТ-2",
				protocolNumber: "ВК-2",
				criteriaEvaluation: {
					informedConsentPresent: false,
					anamnesisComplete: true,
					statusLocalisComplete: true,
					icd10DiagnosisValid: true,
					treatmentPlanAdequate: true,
					instrumentTraceabilityValid: true,
				},
				complianceScorePct: 83,
				expertSummary: "...",
				recommendations: "Исправить",
				reviewedAt: "2026-10-10T12:00:00Z",
				createdAt: "2026-10-10T12:00:00Z",
			},
		];

		const summary = generateManagementAuditSummary(records);
		assert.equal(summary.totalAudited, 2);
		assert.equal(summary.approvedCount, 1);
		assert.equal(summary.deficienciesCount, 1);
		assert.equal(summary.criticalCount, 0);
		assert.equal(summary.averageScorePct, 92);
		assert.ok(summary.topDefects.some((d) => d.defectTitle === "Отсутствие ИДС"));
	});
});

describe("chiefPhysicianAudit — Facade Parity", () => {
	it("ChiefPhysicianAuditService facade exposes all static methods", () => {
		assert.equal(typeof ChiefPhysicianAuditService.reviewDiary, "function");
		assert.equal(typeof ChiefPhysicianAuditService.getDiaryReviews, "function");
		assert.equal(typeof ChiefPhysicianAuditService.evaluateCriteria, "function");
		assert.equal(typeof ChiefPhysicianAuditService.calculateScore, "function");
		assert.equal(typeof ChiefPhysicianAuditService.generateAct, "function");
		assert.equal(typeof ChiefPhysicianAuditService.isAuthorizedRole, "function");
	});
});
