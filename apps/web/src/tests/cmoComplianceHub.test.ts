/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CMO COMPLIANCE HUB & BATCH SIGNER ENGINE UNIT & INTEGRATION TESTS
 * Testing: Filters, Roszdravnadzor Risk Assessment, PP RF No. 852 24h Limits,
 * EGISZ Validation, Metrics Calculation, and CSV/Print Exporting.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	type ClinicVisitComplianceItem,
	isValidToothNumber,
	calculateOverdueHours,
	isMissingIcdOrTooth,
	isMissingDoctorSignature,
	isPendingOrFailedEgisz,
	isRegisteredRemd,
	assessRoszdravnadzorRisk,
	calculateComplianceMetrics,
	filterComplianceVisits,
	validateVisitForEgisz,
	generateComplianceRegistryCsv,
	generateComplianceRegistryPrintText,
	SAMPLE_COMPLIANCE_VISITS,
} from "../components/emr/audit/cmoComplianceHubEngine";

const MOCK_VISIT_PERFECT: ClinicVisitComplianceItem = {
	id: "test-001",
	visitId: "v-001",
	medicalCardNumber: "СТ-2026-0001",
	patientId: "p-001",
	patientFullName: "Иванов Иван Иванович",
	patientBirthDate: "1990-01-15",
	patientSnils: "123-456-789 01",
	doctorStaffId: "doc-01",
	doctorFullName: "Волкова Екатерина Сергеевна",
	doctorSpecialty: "Врач-стоматолог-терапевт",
	visitDate: "2026-08-25",
	visitTime: "10:00",
	encounterIso: "2026-08-25T10:00:00.000Z",
	serviceName: "Лечение кариеса дентина",
	serviceCode: "A16.07.002.001",
	toothNumber: "16",
	icd10Code: "K02.1",
	diagnosisText: "Кариес дентина зуба 1.6",
	isDoctorSignedUkep: true,
	doctorSignatureHash: "a1b2c3d4e5f60718293a4b5c6d7e8f901234567890abcdef1234567890abcdef",
	isLocked: true,
	lockedAt: "2026-08-25T10:45:00.000Z",
	egiszStatus: "accepted",
	remdSemdOid: "1.2.643.5.1.13.13.12.2.77.8432.100.1.1.51",
	remdDocumentId: "semd-001",
	overdueHours: 2.0,
	isOverdue24h: false,
	qualityScore: 100,
};

const MOCK_VISIT_DEFECTIVE: ClinicVisitComplianceItem = {
	id: "test-002",
	visitId: "v-002",
	medicalCardNumber: "СТ-2026-0002",
	patientId: "p-002",
	patientFullName: "Петров Петр Петрович",
	patientBirthDate: "1980-05-20",
	patientSnils: "987-654-321 00",
	doctorStaffId: "doc-02",
	doctorFullName: "Кузнецов Денис Игоревич",
	doctorSpecialty: "Врач-стоматолог-хирург",
	visitDate: "2026-08-20",
	visitTime: "14:00",
	encounterIso: "2026-08-20T14:00:00.000Z",
	serviceName: "Удаление зуба сложное",
	toothNumber: "", // Missing tooth
	icd10Code: "", // Missing ICD-10
	diagnosisText: "Боли в челюсти",
	isDoctorSignedUkep: false, // Missing doctor signature
	doctorSignatureHash: null,
	isLocked: false,
	egiszStatus: "pending",
	overdueHours: 120.0, // Overdue > 24 hours
	isOverdue24h: true,
	qualityScore: 30,
};

describe("CMO Compliance Hub Engine - Validation & Predicates", () => {
	it("isValidToothNumber validates FDI two-digit notation correctly", () => {
		assert.equal(isValidToothNumber("16"), true);
		assert.equal(isValidToothNumber("48"), true);
		assert.equal(isValidToothNumber("55"), true);
		assert.equal(isValidToothNumber("85"), true);
		assert.equal(isValidToothNumber("16-17"), true);
		assert.equal(isValidToothNumber(""), false);
		assert.equal(isValidToothNumber(null), false);
		assert.equal(isValidToothNumber("99"), false);
		assert.equal(isValidToothNumber("0"), false);
	});

	it("calculateOverdueHours computes correct difference from reference time", () => {
		const encounterTime = "2026-08-25T10:00:00.000Z";
		const refTime = new Date("2026-08-26T14:30:00.000Z"); // +28.5 hours
		const hours = calculateOverdueHours(encounterTime, refTime);
		assert.equal(hours, 28.5);

		// Same time
		const sameTime = new Date("2026-08-25T10:00:00.000Z");
		assert.equal(calculateOverdueHours(encounterTime, sameTime), 0);

		// Future time (negative diff)
		const pastRef = new Date("2026-08-24T10:00:00.000Z");
		assert.equal(calculateOverdueHours(encounterTime, pastRef), 0);
	});

	it("isMissingIcdOrTooth correctly flags defect cases", () => {
		assert.equal(isMissingIcdOrTooth(MOCK_VISIT_PERFECT), false);
		assert.equal(isMissingIcdOrTooth(MOCK_VISIT_DEFECTIVE), true);

		// Visit with invalid ICD code format
		const badIcd: ClinicVisitComplianceItem = {
			...MOCK_VISIT_PERFECT,
			icd10Code: "INVALID_123",
		};
		assert.equal(isMissingIcdOrTooth(badIcd), true);

		// Visit with missing tooth on caries treatment
		const missingTooth: ClinicVisitComplianceItem = {
			...MOCK_VISIT_PERFECT,
			toothNumber: "",
			serviceName: "Лечение кариеса дентина",
		};
		assert.equal(isMissingIcdOrTooth(missingTooth), true);
	});

	it("isMissingDoctorSignature identifies unsigned records", () => {
		assert.equal(isMissingDoctorSignature(MOCK_VISIT_PERFECT), false);
		assert.equal(isMissingDoctorSignature(MOCK_VISIT_DEFECTIVE), true);

		// Short/invalid hash
		const shortHash: ClinicVisitComplianceItem = {
			...MOCK_VISIT_PERFECT,
			isDoctorSignedUkep: false,
			doctorSignatureHash: "short",
		};
		assert.equal(isMissingDoctorSignature(shortHash), true);
	});

	it("isPendingOrFailedEgisz and isRegisteredRemd identify transmission states", () => {
		assert.equal(isPendingOrFailedEgisz(MOCK_VISIT_PERFECT), false);
		assert.equal(isRegisteredRemd(MOCK_VISIT_PERFECT), true);

		assert.equal(isPendingOrFailedEgisz(MOCK_VISIT_DEFECTIVE), true);
		assert.equal(isRegisteredRemd(MOCK_VISIT_DEFECTIVE), false);

		const failedItem: ClinicVisitComplianceItem = {
			...MOCK_VISIT_PERFECT,
			egiszStatus: "error",
			remdSemdOid: null,
		};
		assert.equal(isPendingOrFailedEgisz(failedItem), true);
		assert.equal(isRegisteredRemd(failedItem), false);
	});
});

describe("CMO Compliance Hub Engine - Roszdravnadzor Risk Assessment & Metrics", () => {
	it("assesses zero risk when all records are compliant and in time", () => {
		const refTime = new Date("2026-08-25T15:00:00.000Z");
		const assessment = assessRoszdravnadzorRisk([MOCK_VISIT_PERFECT], refTime);
		assert.equal(assessment.riskLevel, "zero");
		assert.equal(assessment.overdueCount, 0);
		assert.equal(assessment.missingIcdCount, 0);
		assert.equal(assessment.unsignedDoctorCount, 0);
		assert.equal(assessment.riskScore, 0);
		assert.ok(assessment.fineLiabilityRub.includes("0 руб"));
	});

	it("assesses critical risk when multiple cards are overdue >24h per PP RF No. 852", () => {
		const refTime = new Date("2026-08-26T16:00:00.000Z");
		const items: ClinicVisitComplianceItem[] = [
			{ ...MOCK_VISIT_DEFECTIVE, encounterIso: "2026-08-20T10:00:00.000Z" },
			{ ...MOCK_VISIT_DEFECTIVE, encounterIso: "2026-08-21T10:00:00.000Z" },
			{ ...MOCK_VISIT_DEFECTIVE, encounterIso: "2026-08-22T10:00:00.000Z" },
			{ ...MOCK_VISIT_DEFECTIVE, encounterIso: "2026-08-23T10:00:00.000Z" },
			{ ...MOCK_VISIT_DEFECTIVE, encounterIso: "2026-08-24T10:00:00.000Z" },
		];

		const assessment = assessRoszdravnadzorRisk(items, refTime);
		assert.equal(assessment.riskLevel, "critical");
		assert.equal(assessment.overdueCount, 5);
		assert.ok(assessment.riskScore >= 70);
		assert.ok(assessment.statutoryWarning.includes("14.1 КоАП РФ"));
		assert.ok(assessment.fineLiabilityRub.includes("200 000 руб"));
	});

	it("calculates summary compliance rate and defect breakdowns", () => {
		const refTime = new Date("2026-08-26T00:00:00.000Z");
		const items = [MOCK_VISIT_PERFECT, MOCK_VISIT_DEFECTIVE];
		const metrics = calculateComplianceMetrics(items, refTime);

		assert.equal(metrics.totalEncounters, 2);
		assert.equal(metrics.registeredRemdCount, 1);
		assert.equal(metrics.noIcdOrToothCount, 1);
		assert.equal(metrics.notSignedDoctorCount, 1);
		assert.equal(metrics.overdue24hCount, 1);
		assert.equal(metrics.complianceRatePercent, 50.0);
	});

	it("handles empty items array gracefully in metrics", () => {
		const metrics = calculateComplianceMetrics([]);
		assert.equal(metrics.totalEncounters, 0);
		assert.equal(metrics.complianceRatePercent, 100);
		assert.equal(metrics.riskAssessment.riskLevel, "zero");
	});
});

describe("CMO Compliance Hub Engine - Filtering & Search", () => {
	const refTime = new Date("2026-08-25T18:00:00.000Z");

	it("filters by 'no_icd_or_tooth' category tab", () => {
		const result = filterComplianceVisits(
			SAMPLE_COMPLIANCE_VISITS,
			"no_icd_or_tooth",
			"all",
			"all",
			"",
			refTime
		);
		assert.ok(result.length >= 1);
		assert.ok(result.every((r) => isMissingIcdOrTooth(r)));
	});

	it("filters by 'not_signed_doctor' category tab", () => {
		const result = filterComplianceVisits(
			SAMPLE_COMPLIANCE_VISITS,
			"not_signed_doctor",
			"all",
			"all",
			"",
			refTime
		);
		assert.ok(result.length >= 1);
		assert.ok(result.every((r) => !r.isDoctorSignedUkep));
	});

	it("filters by 'pending_or_failed_egisz' category tab", () => {
		const result = filterComplianceVisits(
			SAMPLE_COMPLIANCE_VISITS,
			"pending_or_failed_egisz",
			"all",
			"all",
			"",
			refTime
		);
		assert.ok(result.length >= 1);
		assert.ok(result.every((r) => r.egiszStatus !== "accepted"));
	});

	it("filters by 'registered_remd' category tab", () => {
		const result = filterComplianceVisits(
			SAMPLE_COMPLIANCE_VISITS,
			"registered_remd",
			"all",
			"all",
			"",
			refTime
		);
		assert.ok(result.length >= 1);
		assert.ok(result.every((r) => r.egiszStatus === "accepted" && Boolean(r.remdSemdOid)));
	});

	it("filters by 'overdue_24h' category tab", () => {
		const result = filterComplianceVisits(
			SAMPLE_COMPLIANCE_VISITS,
			"overdue_24h",
			"all",
			"all",
			"",
			refTime
		);
		assert.ok(result.length >= 1);
		assert.ok(result.every((r) => calculateOverdueHours(r.encounterIso, refTime) > 24 && r.egiszStatus !== "accepted"));
	});

	it("filters by attending doctor staff ID", () => {
		const result = filterComplianceVisits(
			SAMPLE_COMPLIANCE_VISITS,
			"all",
			"all",
			"doc-01",
			"",
			refTime
		);
		assert.ok(result.length >= 1);
		assert.ok(result.every((r) => r.doctorStaffId === "doc-01"));
	});

	it("performs text search across patient, SNILS, card number, and ICD", () => {
		const searchPatient = filterComplianceVisits(
			SAMPLE_COMPLIANCE_VISITS,
			"all",
			"all",
			"all",
			"Смирнов",
			refTime
		);
		assert.equal(searchPatient.length, 1);
		assert.equal(searchPatient[0]?.patientFullName, "Смирнов Алексей Владимирович");

		const searchSnils = filterComplianceVisits(
			SAMPLE_COMPLIANCE_VISITS,
			"all",
			"all",
			"all",
			"154890",
			refTime
		);
		assert.equal(searchSnils.length, 1);

		const searchIcd = filterComplianceVisits(
			SAMPLE_COMPLIANCE_VISITS,
			"all",
			"all",
			"all",
			"K04.03",
			refTime
		);
		assert.equal(searchIcd.length, 1);
	});
});

describe("CMO Compliance Hub Engine - EGISZ Validation & Exporting", () => {
	it("validateVisitForEgisz reports valid for complete record", () => {
		const res = validateVisitForEgisz(MOCK_VISIT_PERFECT);
		assert.equal(res.isValid, true);
		assert.equal(res.issues.length, 0);
	});

	it("validateVisitForEgisz identifies all missing required fields", () => {
		const res = validateVisitForEgisz(MOCK_VISIT_DEFECTIVE);
		assert.equal(res.isValid, false);
		assert.ok(res.issues.some((i) => i.includes("МКБ-10")));
		assert.ok(res.issues.some((i) => i.includes("УКЭП")));
	});

	it("generateComplianceRegistryCsv produces valid CSV with headers", () => {
		const csv = generateComplianceRegistryCsv([MOCK_VISIT_PERFECT, MOCK_VISIT_DEFECTIVE]);
		assert.ok(csv.includes("Дата приема;Время;Номер карты"));
		assert.ok(csv.includes("СТ-2026-0001"));
		assert.ok(csv.includes("K02.1"));
		assert.ok(csv.includes("1.2.643.5.1.13.13.12.2.77.8432.100.1.1.51"));
	});

	it("generateComplianceRegistryPrintText formats comprehensive Chief Medical Officer report", () => {
		const metrics = calculateComplianceMetrics([MOCK_VISIT_PERFECT, MOCK_VISIT_DEFECTIVE]);
		const text = generateComplianceRegistryPrintText(
			[MOCK_VISIT_PERFECT, MOCK_VISIT_DEFECTIVE],
			metrics,
			"За август 2026 г."
		);

		assert.ok(text.includes("СВОДНЫЙ РЕЕСТР КОНТРОЛЯ КАЧЕСТВА КАРТ 043/У"));
		assert.ok(text.includes("Постановление Правительства РФ № 852"));
		assert.ok(text.includes("ОЦЕНКА РИСКА ПРОВЕРКИ РОСЗДРАВНАДЗОРА"));
		assert.ok(text.includes("РЕЕСТР ПРИЕМОВ С ДЕФЕКТАМИ И ПРОСРОЧКОЙ"));
		assert.ok(text.includes("СТ-2026-0002"));
	});
});
