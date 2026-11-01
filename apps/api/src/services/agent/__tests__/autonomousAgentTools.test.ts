/**
 * autonomousAgentTools.test.ts — Unit & Integration Test Suite for DENTE Clinical AI Tools.
 *
 * Verifies:
 * 1. get_patient_clinical_card (043/u card, FDI 11..48, physiological norm default)
 * 2. update_tooth_status (Caries, Pulpitis, Filling, incisal/occlusal surface normalization)
 * 3. calculate_treatment_estimate & calculateServicesEstimate (exact kopecks, doctor discounts 0-100%, Mandate 8e)
 * 4. check_drug_interactions (penicillin vs clindamycin, glaucoma, pregnancy, isBlocking: false)
 * 5. create_dental_lab_order (VITA shades, FDI teeth, secure token)
 * 6. book_chairside_appointment (zero mandatory assistant barrier, Mandate 8e)
 * 7. draft_clinical_soap_diary & draftSoapDiary (SOAP structure, zero cartoon emojis)
 * 8. calculate_anesthetic_dosage (Articaine 4%, Mepivacaine 3%, weight-based carpules)
 * 9. generate_informed_consent_ids (statutory IDS codes, 323-FZ / 1051n)
 * 10. check_warehouse_supplies (soft overdraft, Mandate 8e/8n)
 */

import assert from "node:assert";
import { describe, it } from "node:test";
import type { AgentContext } from "../context.js";
import {
	bookChairsideAppointmentTool,
	calculateAnestheticDosageTool,
	calculateServicesEstimateTool,
	calculateTreatmentEstimateTool,
	checkDrugInteractionsTool,
	checkWarehouseSuppliesTool,
	createDentalLabOrderTool,
	draftClinicalSoapDiaryTool,
	draftSoapDiaryTool,
	generateInformedConsentIdsTool,
	getPatientClinicalCardTool,
	getPatientOutpatientRecordTool,
	normalizeAnatomicalSurfaces,
	updateToothStatusTool,
} from "../tools/denteAgentTools.js";

function expect(actual: any) {
	return {
		toBe(expected: any) {
			assert.strictEqual(actual, expected);
		},
		toBeDefined() {
			assert.notStrictEqual(actual, undefined);
		},
		toBeNull() {
			assert.strictEqual(actual, null);
		},
		toEqual(expected: any) {
			assert.deepStrictEqual(actual, expected);
		},
		toBeGreaterThan(expected: number) {
			assert.ok(actual > expected, `Expected ${actual} > ${expected}`);
		},
		toBeGreaterThanOrEqual(expected: number) {
			assert.ok(actual >= expected, `Expected ${actual} >= ${expected}`);
		},
		toBeLessThanOrEqual(expected: number) {
			assert.ok(actual <= expected, `Expected ${actual} <= ${expected}`);
		},
		toMatch(pattern: RegExp) {
			assert.match(String(actual), pattern);
		},
		toContain(item: any) {
			if (typeof actual === "string") {
				assert.ok(actual.includes(item), `Expected string "${actual}" to contain "${item}"`);
			} else if (Array.isArray(actual)) {
				assert.ok(actual.includes(item), `Expected array to contain ${JSON.stringify(item)}`);
			} else {
				assert.ok(Boolean(actual && actual[item]), `Expected object to contain key ${item}`);
			}
		},
		not: {
			toMatch(pattern: RegExp) {
				assert.doesNotMatch(String(actual), pattern);
			},
			toContain(item: any) {
				if (typeof actual === "string") {
					assert.ok(!actual.includes(item), `Expected string "${actual}" not to contain "${item}"`);
				} else if (Array.isArray(actual)) {
					assert.ok(!actual.includes(item), `Expected array not to contain ${JSON.stringify(item)}`);
				}
			},
		},
		rejects: {
			async toThrow(pattern?: RegExp | string) {
				if (pattern !== undefined) {
					await assert.rejects(
						Promise.resolve(actual),
						typeof pattern === "string" ? new RegExp(pattern) : pattern,
					);
				} else {
					await assert.rejects(Promise.resolve(actual));
				}
			},
		},
	};
}

const mockCtx: AgentContext = {
	organizationId: "00000000-0000-7000-8000-000000000001",
	clinicId: "00000000-0000-7000-8000-000000000001",
	userId: "00000000-0000-7000-8000-000000000002",
	sessionId: "test-sess-01",
	mode: "autonomous",
	role: "doctor",
	permissions: [
		"clinical.read",
		"clinical.write",
		"billing.calculate",
		"schedule.write",
		"warehouse.read",
		"documents.generate",
	],
	tools: {} as any,
	db: null as any,
};

describe("DENTE Autonomous AI Engine — Clinical Tools Suite", () => {
	it("get_patient_clinical_card: returns patient record and FDI dental formula with physiological norm default", async () => {
		const res = await getPatientClinicalCardTool.handler(mockCtx, {
			patientId: "pat-emk-001",
		});

		expect(res.patient.id).toBe("pat-emk-001");
		expect(res.patient.card043Number).toMatch(/043|МК/i);
		expect(res.isPhysiologicalNorm).toBe(true);
		expect(res.somaticStatus).toMatch(/соматически здоров|норма/i);

		expect(res.dentalFormula[11]).toBeDefined();
		expect(res.dentalFormula[26]).toBeDefined();
		expect(res.dentalFormula[48]).toBeDefined();
		expect(res.dentalFormula[26]!.statusCode).toBe("Norm");
	});

	it("update_tooth_status: updates status and normalizes anatomical surfaces", async () => {
		const res = await updateToothStatusTool.handler(mockCtx, {
			patientId: "pat-tooth-001",
			tooth: 26,
			status: "пульпит",
			surfaces: ["O", "M"],
			diagnosisText: "K04.0 Острый пульпит",
		});

		expect(res.success).toBe(true);
		expect(res.toothNumber).toBe(26);
		expect(res.fdiFormatted).toBe("2.6 (26)");
		expect(res.statusCode).toBe("P");
		expect(res.surfaces).toContain("O");
		expect(res.surfaces).toContain("M");
	});

	it("update_tooth_status: maps incisal surface for anterior teeth (11..13, 21..23)", () => {
		const incisorSurfaces = normalizeAnatomicalSurfaces(11, ["O", "M"]);
		expect(incisorSurfaces).toContain("I");
		expect(incisorSurfaces).not.toContain("O");

		const molarSurfaces = normalizeAnatomicalSurfaces(16, ["O", "M"]);
		expect(molarSurfaces).toContain("O");
	});

	it("update_tooth_status: throws error on invalid FDI tooth code", async () => {
		await expect(
			updateToothStatusTool.handler(mockCtx, {
				patientId: "pat-tooth-002",
				tooth: 99,
				status: "кариес",
			}),
		).rejects.toThrow(/вне допустимого диапазона|Некорректный номер зуба/i);
	});

	it("calculate_treatment_estimate: computes exact integer kopecks with doctor discount (Mandate 8e)", async () => {
		const res = await calculateTreatmentEstimateTool.handler(mockCtx, {
			patientId: "pat-bill-001",
			toothNumber: 26,
			category: "endodontics",
			discountPercent: 20,
		});

		expect(res.items.length).toBeGreaterThan(0);
		expect(res.discountPercent).toBe(20);
		expect(res.doctorAutonomyApplied).toBe(true);

		const expectedDiscountKopecks = Math.round(res.subtotalKopecks * 0.2);
		const expectedTotalKopecks = res.subtotalKopecks - expectedDiscountKopecks;
		expect(res.discountKopecks).toBe(expectedDiscountKopecks);
		expect(res.totalKopecks).toBe(expectedTotalKopecks);
		expect(res.totalRub).toBe(expectedTotalKopecks / 100);
		expect(res.formattedTotal).toMatch(/₽|руб/i);
	});

	it("calculate_treatment_estimate: supports 100% doctor discount without admin block (warranty remake)", async () => {
		const res = await calculateTreatmentEstimateTool.handler(mockCtx, {
			patientId: "pat-bill-002",
			toothNumber: 14,
			category: "therapy",
			discountPercent: 100,
		});

		expect(res.discountPercent).toBe(100);
		expect(res.totalKopecks).toBe(0);
		expect(res.totalRub).toBe(0);
		expect(res.doctorAutonomyApplied).toBe(true);
	});

	it("check_drug_interactions: detects penicillin allergy vs amoxicillin with Clindamycin 300 mg", async () => {
		const res = await checkDrugInteractionsTool.handler(mockCtx, {
			patientId: "pat-ddi-001",
			plannedDrugs: ["Амоксициллин 500 мг", "Артикаин 4%"],
			knownAllergies: ["Пенициллины"],
		});

		expect(res.safeToProceed).toBe(true);
		const alert = res.alerts.find((a) => a.alertType === "drug_allergy_conflict");
		expect(alert).toBeDefined();
		expect(alert?.severity).toBe("critical");
		expect(alert?.safeAlternative).toMatch(/клиндамицин\s+300\s*мг/i);
		expect(alert?.isBlocking).toBe(false);
		expect(res.recommendedAntibiotic).toMatch(/клиндамицин 300 мг/i);
	});

	it("check_drug_interactions: detects closed-angle glaucoma contraindication to epinephrine", async () => {
		const res = await checkDrugInteractionsTool.handler(mockCtx, {
			patientId: "pat-ddi-002",
			plannedDrugs: ["Артикаин 1:100 000"],
			somaticConditions: ["Закрытоугольная глаукома"],
		});

		const alert = res.alerts.find((a) => a.alertType === "somatic_contraindication");
		expect(alert).toBeDefined();
		expect(alert?.title).toMatch(/глаукома/i);
		expect(alert?.safeAlternative).toMatch(/скандонест|мепивакаин/i);
		expect(alert?.isBlocking).toBe(false);
	});

	it("check_drug_interactions: detects pregnancy advisory with Articaine 1:200 000", async () => {
		const res = await checkDrugInteractionsTool.handler(mockCtx, {
			patientId: "pat-ddi-003",
			plannedDrugs: ["Артикаин 4% 1:100 000"],
			somaticConditions: ["Беременность 2 триместр"],
		});

		const alert = res.alerts.find((a) => a.alertType === "pregnancy_advisory");
		expect(alert).toBeDefined();
		expect(alert?.safeAlternative).toMatch(/1:200\s*000/i);
		expect(alert?.isBlocking).toBe(false);
	});

	it("create_dental_lab_order: generates ZTL order with VITA shade, FDI teeth, and portal token", async () => {
		const res = await createDentalLabOrderTool.handler(mockCtx, {
			patientId: "pat-lab-001",
			toothCodes: [26, "2.7"],
			workType: "Коронка цельноциркониевая ZrO2",
			material: "Диоксид циркония",
			vitaShade: "A2",
			dueDate: "2026-10-05",
			clinicalNotes: "Анатомическая форма, плотный апроксимальный контакт",
		});

		expect(res.success).toBe(true);
		expect(res.toothCodes).toEqual([26, 27]);
		expect(res.toothFdi).toBe("26, 27");
		expect(res.vitaShade).toBe("A2");
		expect(res.status).toBe("draft");
		expect(res.portalToken).toBeDefined();
		expect(res.portalUrl).toContain(res.portalToken);
		expect(res.isExpired30DaysBlocked).toBe(false);
	});

	it("book_chairside_appointment: books appointment without mandatory assistant barrier (Mandate 8e)", async () => {
		const res = await bookChairsideAppointmentTool.handler(mockCtx, {
			patientId: "pat-book-001",
			doctorUserId: "00000000-0000-7000-8000-000000000002",
			startsAt: "2026-09-28T14:00:00.000Z",
			durationMinutes: 45,
			reason: "Постоянная обтурация каналов зуба 2.6",
		});

		expect(res.success).toBe(true);
		expect(res.appointmentId).toBeDefined();
		expect(res.status).toBe("planned");
		expect(res.assistantRequired).toBe(false);
		expect(res.startsAt).toBe("2026-09-28T14:00:00.000Z");
		expect(res.endsAt).toBe("2026-09-28T14:45:00.000Z");
	});

	it("draft_clinical_soap_diary: generates complete StAR Form note with zero cartoon emojis", async () => {
		const res = await draftClinicalSoapDiaryTool.handler(mockCtx, {
			patientId: "pat-diary-001",
			toothNumber: 26,
			diagnosisCode: "K04.0",
			complaints: "Острая ночная боль в зубе 2.6",
		});

		expect(res.success).toBe(true);
		expect(res.status).toBe("draft");
		expect(res.readyForOneClickApply).toBe(true);
		expect(res.isDraftEditable).toBe(true);

		const diary = res.soapDiary;
		expect(diary.assessment.icd10Code).toBe("K04.0");
		expect(diary.assessment.fdiToothFormatted).toContain("2.6");
		expect(diary.subjective.complaints).toContain("Острая ночная боль");
		expect(diary.plan.procedureProtocol).toContain("A16.07.030");

		expect(diary.renderedText043).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
		expect(diary.renderedText043).toMatch(/ДНЕВНИК ПРИЁМА ВРАЧА-СТОМАТОЛОГА/i);
	});

	it("Mandate 8ap: clean semantic tools parity (getPatientOutpatientRecord, calculateServicesEstimate, draftSoapDiary)", async () => {
		const emrRes = await getPatientOutpatientRecordTool.handler(mockCtx, {
			patientId: "pat-sem-001",
		});
		expect(emrRes.isPhysiologicalNorm).toBe(true);

		const estRes = await calculateServicesEstimateTool.handler(mockCtx, {
			patientId: "pat-sem-001",
			toothNumber: 16,
			serviceCodes: ["A16.07.030", "A16.07.082"],
			discountPercent: 15,
		});
		expect(estRes.items.length).toBe(2);
		expect(estRes.discountPercent).toBe(15);

		const soapRes = await draftSoapDiaryTool.handler(mockCtx, {
			patientId: "pat-sem-001",
			toothNumber: 16,
			diagnosisCode: "K02.1",
		});
		expect(soapRes.success).toBe(true);
		expect(soapRes.soapDiary.assessment.icd10Code).toBe("K02.1");
	});

	it("calculate_anesthetic_dosage: calculates safe carpules by body weight for Articaine 4% 1:100 000", async () => {
		const res = await calculateAnestheticDosageTool.handler(mockCtx, {
			patientWeightKg: 70,
			anestheticType: "articaine_1_100000",
			somaticConditions: [],
		});

		expect(res.success).toBe(true);
		expect(res.drugName).toContain("Артикаин 4%");
		expect(res.concentrationPercent).toBe(4);
		expect(res.mgPerCarpule).toBe(68);
		expect(res.patientWeightKg).toBe(70);
		expect(res.maxCarpules).toBe(7);
		expect(res.recommendedCarpules).toBe(1);
		expect(res.epinephrineMcgPerCarpule).toBe(17);
		expect(res.isCardiovascularRisk).toBe(false);
		expect(res.safeToProceed).toBe(true);
		expect(res.doctorAutonomyBlocked).toBe(false);
	});

	it("calculate_anesthetic_dosage: automatically selects Mepivacaine 3% without vasoconstrictor for cardiac patient", async () => {
		const res = await calculateAnestheticDosageTool.handler(mockCtx, {
			patientWeightKg: 70,
			anestheticType: "auto",
			somaticConditions: ["Артериальная гипертензия II ст", "Ишемическая болезнь сердца"],
		});

		expect(res.success).toBe(true);
		expect(res.drugName).toMatch(/мепивакаин\s*3%/i);
		expect(res.isCardiovascularRisk).toBe(true);
		expect(res.vasoconstrictorRatio).toBeNull();
		expect(res.epinephrineMcgPerCarpule).toBe(0);
		expect(res.maxCarpules).toBe(5);
		expect(res.safeToProceed).toBe(true);
		expect(res.doctorAutonomyBlocked).toBe(false);
	});

	it("calculate_anesthetic_dosage: soft warning on overdose without blocking doctor autonomy", async () => {
		const res = await calculateAnestheticDosageTool.handler(mockCtx, {
			patientWeightKg: 60,
			anestheticType: "articaine_1_100000",
			plannedCarpules: 10,
		});

		expect(res.plannedCarpules).toBe(10);
		expect(res.warning).toMatch(/превышает безопасный предел/i);
		expect(res.safeToProceed).toBe(true);
		expect(res.doctorAutonomyBlocked).toBe(false);
	});

	it("generate_informed_consent_ids: matches statutory IDS-03-ENDO for pulpitis with service codes", async () => {
		const res = await generateInformedConsentIdsTool.handler(mockCtx, {
			patientId: "pat-ids-001",
			procedureType: "endodontics",
			diagnosisCode: "K04.0",
			toothNumber: 26,
		});

		expect(res.success).toBe(true);
		expect(res.consentCode).toBe("IDS-03-ENDO");
		expect(res.consentTitle).toMatch(/эндодонтическ/i);
		expect(res.regulatoryBasis).toMatch(/323-ФЗ.*1051н/i);
		expect(res.nomenclature804nCodes).toContain("A16.07.030");
		expect(res.nomenclature804nCodes).toContain("A16.07.008.001");
		expect(res.printReady).toBe(true);
		expect(res.isDraftEditable).toBe(true);
		expect(res.doctorAutonomyBlocked).toBe(false);

		expect(res.renderedLegalText).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
		expect(res.renderedLegalText).toMatch(/ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ/i);
	});

	it("generate_informed_consent_ids: matches statutory IDS-02-THERAPY for caries K02.1", async () => {
		const res = await generateInformedConsentIdsTool.handler(mockCtx, {
			patientId: "pat-ids-002",
			procedureType: "therapy",
			diagnosisCode: "K02.1",
			toothNumber: 14,
		});

		expect(res.success).toBe(true);
		expect(res.consentCode).toBe("IDS-02-THERAPY");
		expect(res.nomenclature804nCodes).toContain("A16.07.002.001");
		expect(res.printReady).toBe(true);
	});

	it("check_warehouse_supplies: validates supplies with Mandate 8e soft overdraft protection", async () => {
		const inStockRes = await checkWarehouseSuppliesTool.handler(mockCtx, {
			itemName: "Артикаин 4% (карпулы 1.7 мл)",
			requestedQuantity: 2,
		});

		expect(inStockRes.success).toBe(true);
		expect(inStockRes.doctorAutonomyBlocked).toBe(false);
		expect(inStockRes.sanpinCompliant).toBe(true);
		expect(inStockRes.criticalMaterials.length).toBeGreaterThan(0);

		const overdraftRes = await checkWarehouseSuppliesTool.handler(mockCtx, {
			itemName: "Артикаин 4% дефицит",
			requestedQuantity: 2,
		});

		expect(overdraftRes.success).toBe(true);
		expect(overdraftRes.isSoftOverdraft).toBe(true);
		expect(overdraftRes.deficitCount).toBe(2);
		expect(overdraftRes.warning).toMatch(/мягкий овердрафт.*не заблокирована/i);
		expect(overdraftRes.doctorAutonomyBlocked).toBe(false);
	});
});
