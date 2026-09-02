import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	getCanalCountForTooth,
	getOrder804nServicesForClinicalCase,
	calculateOrder804nBillingEstimate,
	ORDER_804N_THERAPY_CATALOG,
	ORDER_804N_SURGERY_CATALOG,
	ORDER_804N_PERIO_CATALOG,
	ORDER_804N_ORTHO_CATALOG,
	ORDER_804N_ANESTHESIA_CATALOG,
	ORDER_804N_DIAGNOSTICS_CATALOG,
	type Order804nBillingLineItem,
} from "../toothCanalsAndBilling804n.js";
import {
	generateEmrAutopilotPlan,
	synthesizeFullOdontogramAutopilot,
	validateForm043uCompliance,
} from "../emr/index.js";
import type { FdiToothRecord } from "../documents/forms043u.js";

describe("1-Click EMR Autopilot & Nomenclature 804n Engine", () => {
	describe("Anatomy to Root Canal Count Auto-Resolution", () => {
		it("should accurately resolve single-canal anterior teeth (11-13, 21-23, 31-33, 41-43)", () => {
			const anteriorTeeth = ["11", "12", "13", "21", "22", "23", "31", "32", "33", "41", "42", "43"];
			for (const tooth of anteriorTeeth) {
				assert.strictEqual(getCanalCountForTooth(tooth), 1);
			}
		});

		it("should resolve single-canal single-rooted premolars (15, 25, 34, 35, 44, 45)", () => {
			const singleCanalPremolars = ["15", "25", "34", "35", "44", "45"];
			for (const tooth of singleCanalPremolars) {
				assert.strictEqual(getCanalCountForTooth(tooth), 1);
			}
		});

		it("should resolve 2-canal upper first premolars (14, 24)", () => {
			assert.strictEqual(getCanalCountForTooth("14"), 2);
			assert.strictEqual(getCanalCountForTooth("24"), 2);
		});

		it("should resolve 3-canal permanent molars (16-18, 26-28, 36-38, 46-48)", () => {
			const molars = ["16", "17", "18", "26", "27", "28", "36", "37", "38", "46", "47", "48"];
			for (const tooth of molars) {
				assert.strictEqual(getCanalCountForTooth(tooth), 3);
			}
		});

		it("should respect custom canal overrides (e.g. 4-canal molar MB2)", () => {
			assert.strictEqual(getCanalCountForTooth("16", 4), 4);
			assert.strictEqual(getCanalCountForTooth("26", 4), 4);
			assert.strictEqual(getCanalCountForTooth("36", 4), 4);
			assert.strictEqual(getCanalCountForTooth("14", 3), 3);
		});

		it("should correctly handle primary/deciduous teeth (51-85)", () => {
			assert.strictEqual(getCanalCountForTooth("51"), 1);
			assert.strictEqual(getCanalCountForTooth("61"), 1);
			assert.strictEqual(getCanalCountForTooth("54"), 3); // Upper primary molar
			assert.strictEqual(getCanalCountForTooth("74"), 2); // Lower primary molar
		});
	});

	describe("Order 804n Nomenclature Auto-Mapping", () => {
		it("should map 1-canal endodontics (tooth 11, K04.0) to exact single-canal 804n codes", () => {
			const services = getOrder804nServicesForClinicalCase({
				toothNumber: "11",
				icd10Code: "K04.0",
				canalCount: 1,
				includeAnesthesia: true,
				includeRvg: true,
			});

			const codes = services.map((s) => s.code);
			assert.ok(codes.includes("A16.07.030.001"), "Expected A16.07.030.001 (1 canal instrumentation)");
			assert.ok(codes.includes("A16.07.008.001"), "Expected A16.07.008.001 (1 canal obturation)");
			assert.ok(codes.includes("B01.003.004.005"), "Expected B01.003.004.005 (Infiltration anesthesia)");
			assert.ok(codes.includes("A06.07.007"), "Expected A06.07.007 (RVG)");
			assert.ok(codes.includes("A16.07.002.001"), "Expected A16.07.002.001 (Class I restoration)");
		});

		it("should map 2-canal endodontics (tooth 14, K04.0) to 2-canal 804n codes", () => {
			const services = getOrder804nServicesForClinicalCase({
				toothNumber: "14",
				icd10Code: "K04.0",
				canalCount: 2,
				includeAnesthesia: true,
				includeRvg: true,
			});

			const codes = services.map((s) => s.code);
			assert.ok(codes.includes("A16.07.030.002"), "Expected A16.07.030.002 (2 canal instrumentation)");
			assert.ok(codes.includes("A16.07.008.002"), "Expected A16.07.008.002 (2 canal obturation)");
		});

		it("should map 3-canal and 4-canal molars (tooth 16, 46) to respective 804n codes", () => {
			const services3 = getOrder804nServicesForClinicalCase({
				toothNumber: "16",
				icd10Code: "K04.0",
				canalCount: 3,
			});
			const codes3 = services3.map((s) => s.code);
			assert.ok(codes3.includes("A16.07.030.003"), "Expected 3-canal instrumentation");
			assert.ok(codes3.includes("A16.07.008.003"), "Expected 3-canal obturation");

			const services4 = getOrder804nServicesForClinicalCase({
				toothNumber: "46",
				icd10Code: "K04.0",
				canalCount: 4,
			});
			const codes4 = services4.map((s) => s.code);
			assert.ok(codes4.includes("A16.07.030.004"), "Expected 4-canal instrumentation");
			assert.ok(codes4.includes("A16.07.008.004"), "Expected 4-canal obturation");
			assert.ok(codes4.includes("B01.003.004.004"), "Expected conduction mandibular anesthesia");
		});

		it("should distinguish Class I vs Class II composite restoration codes", () => {
			// Class I (occlusal only)
			const servicesClassI = getOrder804nServicesForClinicalCase({
				toothNumber: "16",
				icd10Code: "K02.1",
				surfaces: ["occlusal"],
			});
			const codesI = servicesClassI.map((s) => s.code);
			assert.ok(codesI.includes("A16.07.002.001"), "Expected Class I code");
			assert.ok(codesI.includes("A16.07.031"), "Expected caries preparation code");

			// Class II (occlusal + mesial with contact point)
			const servicesClassII = getOrder804nServicesForClinicalCase({
				toothNumber: "16",
				icd10Code: "K02.1",
				surfaces: ["occlusal", "mesial"],
			});
			const codesII = servicesClassII.map((s) => s.code);
			assert.ok(codesII.includes("A16.07.002.002"), "Expected Class II contact point code");
			assert.ok(codesII.includes("A16.07.031"), "Expected caries preparation code");
		});

		it("should map surgical tooth extraction with single vs multi-rooted, deciduous, retracted and sutures", () => {
			// Deciduous tooth 54
			const deciduousSurg = getOrder804nServicesForClinicalCase({
				toothNumber: "54",
				icd10Code: "K00.6",
				specialty: "surgery",
			});
			const deciduousCodes = deciduousSurg.map((s) => s.code);
			assert.ok(deciduousCodes.includes("A16.07.001.001"), "Expected deciduous extraction code A16.07.001.001");

			// Single-rooted permanent tooth 11
			const singleSurg = getOrder804nServicesForClinicalCase({
				toothNumber: "11",
				icd10Code: "K08.1",
				specialty: "surgery",
				includeSutures: true,
			});
			const singleCodes = singleSurg.map((s) => s.code);
			assert.ok(singleCodes.includes("A16.07.001.002"), "Expected simple permanent extraction code A16.07.001.002");
			assert.ok(singleCodes.includes("A16.07.097"), "Expected suturing code");

			// Multi-rooted permanent tooth 16
			const multiSurg = getOrder804nServicesForClinicalCase({
				toothNumber: "16",
				icd10Code: "K08.1",
				specialty: "surgery",
				includeSutures: true,
			});
			const multiCodes = multiSurg.map((s) => s.code);
			assert.ok(multiCodes.includes("A16.07.001.003"), "Expected complex extraction code A16.07.001.003");
			assert.ok(multiCodes.includes("A16.07.097"), "Expected suturing code");

			// Retracted/impacted tooth (K01.1 or isRetracted)
			const retractedSurg = getOrder804nServicesForClinicalCase({
				toothNumber: "38",
				icd10Code: "K01.1",
				specialty: "surgery",
			});
			const retractedCodes = retractedSurg.map((s) => s.code);
			assert.ok(retractedCodes.includes("A16.07.024"), "Expected retracted tooth extraction code A16.07.024");
		});

		it("should map periodontics (K05.0 gingivitis vs K05.3 periodontitis)", () => {
			const gingivitis = getOrder804nServicesForClinicalCase({
				toothNumber: "31",
				icd10Code: "K05.0",
				specialty: "periodontics",
			});
			const gingCodes = gingivitis.map((s) => s.code);
			assert.ok(gingCodes.includes("A16.07.051"), "Expected prophy hygiene code");
			assert.ok(gingCodes.includes("A16.07.020"), "Expected ultrasonic scaling code");
			assert.ok(gingCodes.includes("A11.07.010"), "Expected pocket medication code");

			const periodontitis = getOrder804nServicesForClinicalCase({
				toothNumber: "31",
				icd10Code: "K05.3",
				specialty: "periodontics",
			});
			const perioCodes = periodontitis.map((s) => s.code);
			assert.ok(perioCodes.includes("A16.07.039"), "Expected closed curettage code");
			assert.ok(perioCodes.includes("A16.07.020"), "Expected ultrasonic scaling code");
			assert.ok(perioCodes.includes("A11.07.010"), "Expected pocket medication code");
		});

		it("should map orthopedics crown restoration (K08.1_ORTHO)", () => {
			const ortho = getOrder804nServicesForClinicalCase({
				toothNumber: "16",
				icd10Code: "K08.1_ORTHO",
				specialty: "orthopedics",
			});
			const orthoCodes = ortho.map((s) => s.code);
			assert.ok(orthoCodes.includes("A16.07.004"), "Expected crown restoration code");
			assert.ok(orthoCodes.includes("A16.07.004.001"), "Expected crown preparation code");
			assert.ok(orthoCodes.includes("A02.07.010"), "Expected impression code");
			assert.ok(orthoCodes.includes("A16.07.004.002"), "Expected provisional crown code");
		});
	});

	describe("Kopeck-Exact Billing Estimate Calculation", () => {
		it("should calculate exact integer kopecks without floating point errors", () => {
			const estimate = calculateOrder804nBillingEstimate({
				toothNumber: "16",
				icd10Code: "K04.0",
				canalCount: 3,
				includeAnesthesia: true,
				includeRvg: true,
			});

			assert.strictEqual(Number.isInteger(estimate.totalKopecks), true);
			assert.ok(estimate.totalKopecks > 0);
			assert.ok(estimate.lineItems.length >= 4);

			// Check that line sum strictly equals totalKopecks
			const sumLines = estimate.lineItems.reduce((acc: number, item: Order804nBillingLineItem) => acc + (item.totalPriceKopecks ?? item.totalKopecks), 0);
			assert.strictEqual(sumLines, estimate.totalKopecks);
			assert.match(estimate.formattedTotal, /₽$/);
		});
	});

	describe("1-Click EMR Autopilot End-to-End Execution (generateEmrAutopilotPlan)", () => {
		it("should generate fully compliant EMR protocol, 804n codes, and estimate for Pulpitis (K04.0)", () => {
			const result = generateEmrAutopilotPlan({
				toothNumber: "16",
				icd10Code: "K04.0",
				surfaces: ["occlusal", "mesial"],
				doctorFullName: "Иванов Иван Иванович",
				doctorSpecialty: "Врач-стоматолог-терапевт",
				patientFullName: "Петров Петр Петрович",
				medicalCardNumber: "КАРТА-777",
				allergologicalHistory: "Аллергических реакций на местные анестетики нет.",
			});

			assert.strictEqual(result.toothNumber, "16");
			assert.strictEqual(result.icd10Code, "K04.0");
			assert.strictEqual(result.canalCount, 3);
			assert.strictEqual(result.specialty, "endodontics");

			// SOAP verification
			assert.ok(result.diaryEntry.subjectiveComplaints.includes("16"));
			assert.ok(result.diaryEntry.procedureProtocol.includes("коффердам"));
			assert.ok(result.diaryEntry.procedureProtocol.includes("WaveOne"));
			assert.strictEqual(result.soapVisitDiary.assessmentIcd10Code, "K04.0");

			// 804n verification
			const serviceCodes = result.order804nServices.map((s) => s.code);
			assert.ok(serviceCodes.includes("A16.07.030.003"));
			assert.ok(serviceCodes.includes("A16.07.008.003"));

			// Compliance check
			assert.strictEqual(result.complianceAudit.isCompliant, true);
			assert.ok(result.complianceAudit.complianceScore >= 90);
			assert.strictEqual(result.complianceAudit.semanticChecks.icd10Valid, true);
			assert.strictEqual(result.complianceAudit.semanticChecks.rubberDamCompliant, true);
			assert.strictEqual(result.complianceAudit.semanticChecks.rvgControlDocumented, true);
		});

		it("should generate compliant protocol for Tooth Extraction (K08.1)", () => {
			const result = generateEmrAutopilotPlan({
				toothNumber: "28",
				icd10Code: "K08.1",
				doctorFullName: "Сидоров Алексей Сергеевич",
				doctorSpecialty: "Врач-стоматолог-хирург",
				patientFullName: "Смирнова Елена Викторовна",
				medicalCardNumber: "КАРТА-888",
				includeSutures: true,
			});

			assert.strictEqual(result.specialty, "surgery");
			assert.match(result.diaryEntry.procedureProtocol, /синдесмотомия/i);
			assert.match(result.diaryEntry.procedureProtocol, /кюретаж/i);
			assert.match(result.diaryEntry.procedureProtocol, /гемостаз/i);

			const codes = result.order804nServices.map((s) => s.code);
			assert.ok(codes.includes("A16.07.001.003"));
			assert.ok(codes.includes("A16.07.097"));

			assert.strictEqual(result.complianceAudit.isCompliant, true);
			assert.strictEqual(result.complianceAudit.semanticChecks.diagnosisProtocolConsistent, true);
		});

		it("should generate compliant protocol for Initial Caries Icon (K02.0)", () => {
			const result = generateEmrAutopilotPlan({
				toothNumber: "11",
				icd10Code: "K02.0",
				surfaces: ["vestibular"],
				doctorFullName: "Иванов Иван Иванович",
				doctorSpecialty: "Врач-стоматолог-терапевт",
				patientFullName: "Кузнецов Дмитрий Олегович",
				medicalCardNumber: "КАРТА-999",
			});

			assert.strictEqual(result.icd10Code, "K02.0");
			assert.match(result.diaryEntry.procedureProtocol, /icon/i);
			assert.match(result.diaryEntry.procedureProtocol, /фторирован/i);

			const codes = result.order804nServices.map((s) => s.code);
			assert.ok(codes.includes("A11.07.012")); // Fluoridation
			assert.ok(codes.includes("A16.07.002.001"));

			assert.strictEqual(result.complianceAudit.isCompliant, true);
		});
	});

	describe("Full Odontogram Batch Autopilot (synthesizeFullOdontogramAutopilot)", () => {
		it("should batch process all pathological teeth in odontogram and aggregate 804n estimate", () => {
			const odontogramTeeth: FdiToothRecord[] = [
				{ toothNumber: 11, statusCode: "caries_initial", surfaces: ["vestibular"], mobility: "none", furcationInvolvement: "none" },
				{ toothNumber: 16, statusCode: "pulpitis_acute", surfaces: ["occlusal", "mesial"], mobility: "none", furcationInvolvement: "none" },
				{ toothNumber: 24, statusCode: "periodontitis_chronic", surfaces: ["occlusal"], mobility: "none", furcationInvolvement: "none" },
				{ toothNumber: 36, statusCode: "caries_profunda", surfaces: ["occlusal", "distal"], mobility: "none", furcationInvolvement: "none" },
				{ toothNumber: 48, statusCode: "root_remnant", surfaces: [], mobility: "none", furcationInvolvement: "none" },
				{ toothNumber: 21, statusCode: "healthy", surfaces: [], mobility: "none", furcationInvolvement: "none" }, // Should be skipped
				{ toothNumber: 31, statusCode: "extracted_absent", surfaces: [], mobility: "none", furcationInvolvement: "none" }, // Should be skipped
			];

			const fullResult = synthesizeFullOdontogramAutopilot({
				teeth: odontogramTeeth,
				doctorFullName: "Доктор Автопилотов А.А.",
				doctorSpecialty: "Врач-стоматолог-терапевт",
				patientFullName: "Пациентов П.П.",
				medicalCardNumber: "КАРТА-BATCH-001",
				allergologicalHistory: "Аллергии нет.",
			});

			assert.strictEqual(fullResult.totalTeethCount, 7);
			assert.strictEqual(fullResult.pathologyTeethCount, 5);
			assert.strictEqual(fullResult.autopilotItems.length, 5);
			assert.strictEqual(fullResult.diaries.length, 5);

			assert.ok(fullResult.totalKopecks > 0);
			assert.match(fullResult.totalFormattedRub, /₽$/);
			assert.strictEqual(fullResult.isFullyCompliant, true);
			assert.ok(fullResult.overallComplianceScore >= 90);

			// Verify individual teeth diagnoses
			const toothMap = new Map(fullResult.autopilotItems.map((item) => [item.toothNumber, item]));
			assert.strictEqual(toothMap.get("11")?.icd10Code, "K02.0");
			assert.strictEqual(toothMap.get("16")?.icd10Code, "K04.0");
			assert.strictEqual(toothMap.get("16")?.canalCount, 3);
			assert.strictEqual(toothMap.get("24")?.icd10Code, "K04.5");
			assert.strictEqual(toothMap.get("24")?.canalCount, 2);
			assert.strictEqual(toothMap.get("36")?.icd10Code, "K02.1");
			assert.strictEqual(toothMap.get("48")?.icd10Code, "K08.1");
			assert.strictEqual(toothMap.get("48")?.specialty, "surgery");
		});
	});
});
