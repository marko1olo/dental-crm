import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
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
	type ClinicVisitComplianceItem,
} from "../cmoComplianceHubEngine";

describe("cmoComplianceHubEngine - Tooth and Clinical Formatting Validation", () => {
	it("validates FDI permanent and deciduous tooth numbers correctly", () => {
		// Valid permanent teeth (11-48)
		assert.equal(isValidToothNumber("11"), true);
		assert.equal(isValidToothNumber("16"), true);
		assert.equal(isValidToothNumber("28"), true);
		assert.equal(isValidToothNumber("36"), true);
		assert.equal(isValidToothNumber("48"), true);

		// Valid deciduous teeth (51-85)
		assert.equal(isValidToothNumber("51"), true);
		assert.equal(isValidToothNumber("65"), true);
		assert.equal(isValidToothNumber("73"), true);
		assert.equal(isValidToothNumber("85"), true);

		// Valid tooth ranges
		assert.equal(isValidToothNumber("11-18"), true);
		assert.equal(isValidToothNumber("33-43"), true);

		// Invalid teeth
		assert.equal(isValidToothNumber(null), false);
		assert.equal(isValidToothNumber(undefined), false);
		assert.equal(isValidToothNumber(""), false);
		assert.equal(isValidToothNumber("0"), false);
		assert.equal(isValidToothNumber("99"), false);
		assert.equal(isValidToothNumber("tooth_16"), false);
	});

	it("calculates overdue hours since encounter completion accurately", () => {
		const refTime = new Date("2026-08-28T12:00:00Z");

		// 10 hours ago
		const encounter10h = "2026-08-28T02:00:00Z";
		assert.equal(calculateOverdueHours(encounter10h, refTime), 10);

		// 26.5 hours ago (overdue > 24h)
		const encounter26_5h = "2026-08-27T09:30:00Z";
		assert.equal(calculateOverdueHours(encounter26_5h, refTime), 26.5);

		// Future or invalid timestamp
		assert.equal(calculateOverdueHours("2026-08-28T15:00:00Z", refTime), 0);
		assert.equal(calculateOverdueHours("invalid-date", refTime), 0);
	});
});

describe("cmoComplianceHubEngine - Item Screening and Defect Detector", () => {
	const baseItem: ClinicVisitComplianceItem = {
		id: "comp-001",
		visitId: "vis-101",
		medicalCardNumber: "СТ-2026-0843",
		patientId: "pat-101",
		patientFullName: "Смирнов Алексей Владимирович",
		patientBirthDate: "1988-06-14",
		patientSnils: "142-890-432 78",
		doctorStaffId: "doc-01",
		doctorFullName: "Волкова Екатерина Сергеевна",
		doctorSpecialty: "Врач-стоматолог-терапевт",
		visitDate: "2026-08-27",
		visitTime: "10:00",
		encounterIso: "2026-08-27T07:00:00Z",
		serviceName: "Лечение глубокого кариеса зуба",
		serviceCode: "A16.07.002",
		toothNumber: "16",
		icd10Code: "K02.1",
		diagnosisText: "Кариес дентина зуба 1.6",
		isDoctorSignedUkep: true,
		doctorSignatureHash: "a4f891b8d234e6c7901ef5b89a03b51e7845cd1209384756abcdef1234567890",
		doctorSignatureDate: "2026-08-27T10:45:00Z",
		isLocked: true,
		lockedAt: "2026-08-27T10:45:00Z",
		egiszStatus: "accepted",
		remdSemdOid: "1.2.643.5.1.13.100.1.1.834.43.2026.001928",
		remdDocumentId: "remd-doc-89123",
		egiszTransactionId: "egisz-tx-99201",
		overdueHours: 5,
		isOverdue24h: false,
		qualityScore: 100,
	};

	it("detects missing ICD-10 or missing tooth for tooth-bound dental procedures", () => {
		// Valid item
		assert.equal(isMissingIcdOrTooth(baseItem), false);

		// Missing ICD-10
		const itemWithoutIcd = { ...baseItem, icd10Code: null };
		assert.equal(isMissingIcdOrTooth(itemWithoutIcd), true);

		// Caries service missing tooth number
		const itemWithoutTooth = { ...baseItem, toothNumber: null };
		assert.equal(isMissingIcdOrTooth(itemWithoutTooth), true);

		// Non-tooth service (e.g. consultation) without tooth is allowed if ICD is present
		const consultItem = { ...baseItem, serviceName: "Первичная консультация врача-стоматолога", toothNumber: null, icd10Code: "Z01.2" };
		assert.equal(isMissingIcdOrTooth(consultItem), false);
	});

	it("detects lack of doctor electronic signature (УКЭП по 63-ФЗ / 947н)", () => {
		assert.equal(isMissingDoctorSignature(baseItem), false);

		const unsignedItem = { ...baseItem, isDoctorSignedUkep: false, doctorSignatureHash: null };
		assert.equal(isMissingDoctorSignature(unsignedItem), true);

		// Short/invalid hash without isDoctorSignedUkep flag
		const invalidHashItem = { ...baseItem, isDoctorSignedUkep: false, doctorSignatureHash: "abc" };
		assert.equal(isMissingDoctorSignature(invalidHashItem), true);
	});

	it("evaluates EGISZ transmission and REMD registration statuses", () => {
		assert.equal(isRegisteredRemd(baseItem), true);
		assert.equal(isPendingOrFailedEgisz(baseItem), false);

		const pendingItem = { ...baseItem, egiszStatus: "pending" as const, remdSemdOid: null };
		assert.equal(isRegisteredRemd(pendingItem), false);
		assert.equal(isPendingOrFailedEgisz(pendingItem), true);

		const errorItem = { ...baseItem, egiszStatus: "error" as const, remdSemdOid: null };
		assert.equal(isRegisteredRemd(errorItem), false);
		assert.equal(isPendingOrFailedEgisz(errorItem), true);
	});
});

describe("cmoComplianceHubEngine - Roszdravnadzor Risk Assessment and Fines (PP RF 852)", () => {
	const refTime = new Date("2026-08-28T12:00:00Z");

	it("evaluates zero risk when all records are compliant and transmitted within 24h", () => {
		const compliantItems: ClinicVisitComplianceItem[] = [
			{
				id: "c1",
				visitId: "v1",
				medicalCardNumber: "СТ-001",
				patientId: "p1",
				patientFullName: "Иванов И.И.",
				patientBirthDate: "1990-01-01",
				patientSnils: "111-222-333 44",
				doctorStaffId: "doc-01",
				doctorFullName: "Волкова Е.С.",
				doctorSpecialty: "Терапевт",
				visitDate: "2026-08-28",
				visitTime: "09:00",
				encounterIso: "2026-08-28T06:00:00Z",
				serviceName: "Лечение кариеса",
				toothNumber: "16",
				icd10Code: "K02.1",
				isDoctorSignedUkep: true,
				doctorSignatureHash: "abcdef1234567890abcdef",
				isLocked: true,
				egiszStatus: "accepted",
				remdSemdOid: "1.2.643.5.1.13.100.1.1.834.43.001",
				overdueHours: 6,
				isOverdue24h: false,
				qualityScore: 100,
			},
		];

		const assessment = assessRoszdravnadzorRisk(compliantItems, refTime);
		assert.equal(assessment.riskLevel, "zero");
		assert.equal(assessment.riskScore, 0);
		assert.equal(assessment.overdueCount, 0);
		assert.match(assessment.fineLiabilityRub, /0 руб/);
	});

	it("evaluates critical risk when 5+ encounters exceed the 24-hour statutory deadline", () => {
		const overdueItems: ClinicVisitComplianceItem[] = Array.from({ length: 5 }, (_, i) => ({
			id: `ov-${i}`,
			visitId: `v-${i}`,
			medicalCardNumber: `СТ-00${i}`,
			patientId: `p-${i}`,
			patientFullName: `Пациент ${i}`,
			patientBirthDate: "1985-05-10",
			patientSnils: "123-456-789 00",
			doctorStaffId: "doc-02",
			doctorFullName: "Петров П.П.",
			doctorSpecialty: "Хирург",
			visitDate: "2026-08-25",
			visitTime: "10:00",
			encounterIso: "2026-08-25T07:00:00Z",
			serviceName: "Удаление зуба сложное",
			toothNumber: "38",
			icd10Code: "K04.5",
			isDoctorSignedUkep: false,
			isLocked: false,
			egiszStatus: "error",
			egiszErrorMessage: "Timeout communicating with EGISZ REMD gateway",
			overdueHours: 77,
			isOverdue24h: true,
			qualityScore: 40,
		}));

		const assessment = assessRoszdravnadzorRisk(overdueItems, refTime);
		assert.equal(assessment.riskLevel, "critical");
		assert.equal(assessment.overdueCount, 5);
		assert.match(assessment.fineLiabilityRub, /200 000 руб/);
		assert.match(assessment.statutoryWarning, /ПП РФ № 852/);
	});
});

describe("cmoComplianceHubEngine - Filtering, Validation and Statutory Exports", () => {
	const refTime = new Date("2026-08-28T12:00:00Z");

	const sampleVisits: ClinicVisitComplianceItem[] = [
		{
			id: "vis-1",
			visitId: "v1",
			medicalCardNumber: "СТ-2026-001",
			patientId: "p1",
			patientFullName: "Смирнов Алексей Владимирович",
			patientBirthDate: "1988-06-14",
			patientSnils: "142-890-432 78",
			doctorStaffId: "doc-01",
			doctorFullName: "Волкова Екатерина Сергеевна",
			doctorSpecialty: "Врач-стоматолог-терапевт",
			visitDate: "2026-08-28",
			visitTime: "09:00",
			encounterIso: "2026-08-28T06:00:00Z",
			serviceName: "Лечение кариеса дентина",
			toothNumber: "16",
			icd10Code: "K02.1",
			diagnosisText: "Кариес дентина зуба 1.6",
			isDoctorSignedUkep: true,
			doctorSignatureHash: "a4f891b8d234e6c7901ef5b89a03b51e7845cd1209384756abcdef1234567890",
			isLocked: true,
			egiszStatus: "accepted",
			remdSemdOid: "1.2.643.5.1.13.100.1.1.834.43.001",
			overdueHours: 6,
			isOverdue24h: false,
			qualityScore: 100,
		},
		{
			id: "vis-2",
			visitId: "v2",
			medicalCardNumber: "СТ-2026-002",
			patientId: "p2",
			patientFullName: "Кузнецова Ольга Михайловна",
			patientBirthDate: "1995-11-20",
			patientSnils: "155-789-012 34",
			doctorStaffId: "doc-02",
			doctorFullName: "Михайлов Денис Андреевич",
			doctorSpecialty: "Врач-стоматолог-хирург",
			visitDate: "2026-08-26",
			visitTime: "14:00",
			encounterIso: "2026-08-26T11:00:00Z",
			serviceName: "Удаление зуба",
			toothNumber: null,
			icd10Code: null,
			isDoctorSignedUkep: false,
			isLocked: false,
			egiszStatus: "not_ready",
			overdueHours: 49,
			isOverdue24h: true,
			qualityScore: 40,
		},
	];

	it("filters compliance visits by doctor, category and text search accurately", () => {
		const doc1Visits = filterComplianceVisits(sampleVisits, "all", "all", "doc-01", "", refTime);
		assert.equal(doc1Visits.length, 1);
		assert.equal(doc1Visits[0]?.id, "vis-1");

		const missingIcdVisits = filterComplianceVisits(sampleVisits, "no_icd_or_tooth", "all", "all", "", refTime);
		assert.equal(missingIcdVisits.length, 1);
		assert.equal(missingIcdVisits[0]?.id, "vis-2");

		const overdueVisits = filterComplianceVisits(sampleVisits, "overdue_24h", "all", "all", "", refTime);
		assert.equal(overdueVisits.length, 1);
		assert.equal(overdueVisits[0]?.id, "vis-2");

		const searchName = filterComplianceVisits(sampleVisits, "all", "all", "all", "Кузнецова", refTime);
		assert.equal(searchName.length, 1);
		assert.equal(searchName[0]?.id, "vis-2");

		const searchSnils = filterComplianceVisits(sampleVisits, "all", "all", "all", "142-890", refTime);
		assert.equal(searchSnils.length, 1);
		assert.equal(searchSnils[0]?.id, "vis-1");
	});

	it("validates individual visit readiness for EGISZ REMD submission", () => {
		const validRes = validateVisitForEgisz(sampleVisits[0]!);
		assert.equal(validRes.isValid, true);
		assert.equal(validRes.issues.length, 0);

		const invalidRes = validateVisitForEgisz(sampleVisits[1]!);
		assert.equal(invalidRes.isValid, false);
		assert.ok(invalidRes.issues.some((iss) => iss.includes("МКБ-10")));
		assert.ok(invalidRes.issues.some((iss) => iss.includes("УКЭП")));
	});

	it("generates statutory CSV registry and printable text report", () => {
		const metrics = calculateComplianceMetrics(sampleVisits, refTime);

		const csv = generateComplianceRegistryCsv(sampleVisits);
		assert.ok(csv.includes("Дата приема;Время;Номер карты"));
		assert.ok(csv.includes("СТ-2026-001"));
		assert.ok(csv.includes("Кузнецова Ольга Михайловна"));

		const printText = generateComplianceRegistryPrintText(sampleVisits, metrics, "Август 2026");
		assert.ok(printText.includes("СВОДНЫЙ РЕЕСТР КОНТРОЛЯ КАЧЕСТВА КАРТ 043/У"));
		assert.ok(printText.includes("Постановление Правительства РФ № 852"));
		assert.ok(printText.includes("Всего приемов за период: 2"));
	});
});
