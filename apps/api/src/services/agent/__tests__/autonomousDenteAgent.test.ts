/**
 * autonomousDenteAgent.test.ts — Unit & Integration Test Suite for DENTE Autonomous Clinical AI Agent.
 *
 * Verifies:
 * 1. All 7 Clinical AI Tools:
 *    - get_patient_emk_043u (043/u card, FDI 11..48, physiological norm default)
 *    - update_tooth_status (Caries, Pulpitis, Filling, Crown, Extracted, Implant, surfaces validation)
 *    - calculate_804n_estimate (exact integer kopecks, doctor autonomy discounts 0-100%, Mandate 8e)
 *    - check_drug_interactions (penicillin vs clindamycin, NSAIDs vs paracetamol, hypertension, glaucoma, pregnancy, isBlocking: false)
 *    - create_dental_lab_order (VITA shades, FDI teeth, secure token, zero 30-day block)
 *    - book_chairside_appointment (zero mandatory assistant barrier, Mandate 8e)
 *    - draft_043u_soap_diary (StAR protocol, SOAP structure, zero emojis, draft autonomy)
 * 2. Autonomous ReAct Cycle (Thought -> Action -> Observation -> Final Clinical Verdict).
 * 3. Anti-infinite loop safety guard (max 5 iterations).
 * 4. T.A.R.S. 100% Factual Honesty & Zero Sycophancy.
 * 5. Fastify API route integration: POST /api/v1/copilot/agent/execute.
 */

import Fastify from "fastify";
import assert from "node:assert";
import { describe, it } from "node:test";

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

import { copilotRoutes } from "../../../routes/copilot.js";
import {
	AutonomousDenteAgent,
	defaultAutonomousDenteAgent,
} from "../autonomousDenteAgent.js";
import {
	bookChairsideAppointmentTool,
	calculate804nEstimateTool,
	calculateAnestheticDosageTool,
	checkDrugInteractionsTool,
	checkWarehouseSuppliesTool,
	createDentalLabOrderTool,
	draft043uSoapDiaryTool,
	generateInformedConsentIdsTool,
	getPatientEmk043uTool,
	normalizeAnatomicalSurfaces,
	updateToothStatusTool,
} from "../denteAgentTools.js";
import type { AgentContext } from "../context.js";

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

describe("DENTE Autonomous AI Engine & Extended Tools Suite", () => {
	const agent = new AutonomousDenteAgent();

	// ─── 1. EXTENDED TOOLS AUDIT ───────────────────────────────────────────────
	describe("1. Extended Clinical Tools", () => {
		it("get_patient_emk_043u: returns patient record and FDI dental formula with physiological norm default", async () => {
			const res = await getPatientEmk043uTool.handler(mockCtx, {
				patientId: "pat-emk-001",
			});

			expect(res.patient.id).toBe("pat-emk-001");
			expect(res.patient.card043Number).toMatch(/043\/у/i);
			expect(res.isPhysiologicalNorm).toBe(true);
			expect(res.somaticStatus).toMatch(/соматически здоров|норма/i);

			// Odontogram FDI teeth 11..48 must all be present
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
			// For incisors, Occlusal is normalized to Incisal 'I'
			expect(incisorSurfaces).toContain("I");
			expect(incisorSurfaces).not.toContain("O");

			const molarSurfaces = normalizeAnatomicalSurfaces(16, ["O", "M"]);
			// For molars, Occlusal remains 'O'
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

		it("calculate_804n_estimate: computes exact integer kopecks with doctor discount (Mandate 8e)", async () => {
			const res = await calculate804nEstimateTool.handler(mockCtx, {
				patientId: "pat-bill-001",
				toothNumber: 26,
				category: "endodontics",
				discountPercent: 20,
			});

			expect(res.items.length).toBeGreaterThan(0);
			expect(res.discountPercent).toBe(20);
			expect(res.doctorAutonomyApplied).toBe(true);

			// Exact integer kopeck validation: totalKopecks must equal subtotal - discount
			const expectedDiscountKopecks = Math.round(res.subtotalKopecks * 0.2);
			const expectedTotalKopecks = res.subtotalKopecks - expectedDiscountKopecks;
			expect(res.discountKopecks).toBe(expectedDiscountKopecks);
			expect(res.totalKopecks).toBe(expectedTotalKopecks);
			expect(res.totalRub).toBe(expectedTotalKopecks / 100);
			expect(res.formattedTotal).toMatch(/₽|руб/i);
		});

		it("calculate_804n_estimate: supports 100% doctor discount without admin block (warranty remake)", async () => {
			const res = await calculate804nEstimateTool.handler(mockCtx, {
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

			expect(res.safeToProceed).toBe(true); // Mandate 8e: soft advisory, isBlocking: false
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
			expect(res.assistantRequired).toBe(false); // Mandate 8e
			expect(res.startsAt).toBe("2026-09-28T14:00:00.000Z");
			expect(res.endsAt).toBe("2026-09-28T14:45:00.000Z");
		});

		it("draft_043u_soap_diary: generates complete StAR Form 043/у note with zero cartoon emojis", async () => {
			const res = await draft043uSoapDiaryTool.handler(mockCtx, {
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

			// Mandate 8d Sin 7 check: ZERO cartoon emojis in official Russian Form 043/u text
			expect(diary.renderedText043).not.toMatch(/[\u{1F300}-\u{1F9FF}]/u);
			expect(diary.renderedText043).toMatch(/ДНЕВНИК ПРИЁМА ВРАЧА-СТОМАТОЛОГА/i);
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
			// 70 kg * 7.0 mg/kg = 490 mg max / 68 mg = 7 carpules
			expect(res.maxCarpules).toBe(7);
			expect(res.recommendedCarpules).toBe(1);
			expect(res.epinephrineMcgPerCarpule).toBe(17);
			expect(res.isCardiovascularRisk).toBe(false);
			expect(res.safeToProceed).toBe(true);
			expect(res.doctorAutonomyBlocked).toBe(false); // Mandate 8e
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
			// 70 kg * 4.4 mg/kg = 300 mg max / 51 mg = 5 carpules
			expect(res.maxCarpules).toBe(5);
			expect(res.safeToProceed).toBe(true);
			expect(res.doctorAutonomyBlocked).toBe(false);
		});

		it("calculate_anesthetic_dosage: soft warning on overdose without blocking doctor autonomy", async () => {
			const res = await calculateAnestheticDosageTool.handler(mockCtx, {
				patientWeightKg: 60,
				anestheticType: "articaine_1_100000",
				plannedCarpules: 10, // Exceeds safe limit
			});

			expect(res.plannedCarpules).toBe(10);
			expect(res.warning).toMatch(/превышает безопасный предел/i);
			expect(res.safeToProceed).toBe(true); // Mandate 8e: soft warning, never disabled
			expect(res.doctorAutonomyBlocked).toBe(false);
		});

		it("generate_informed_consent_ids: matches statutory IDS-03-ENDO for pulpitis with 804n codes", async () => {
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

			// Mandate 8d Sin 7 check: ZERO cartoon emojis in rendered legal text
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
			expect(inStockRes.doctorAutonomyBlocked).toBe(false); // Mandate 8e
			expect(inStockRes.sanpinCompliant).toBe(true);
			expect(inStockRes.criticalMaterials.length).toBeGreaterThan(0);

			// Soft overdraft check on depleted supply (itemName with 'дефицит')
			const overdraftRes = await checkWarehouseSuppliesTool.handler(mockCtx, {
				itemName: "Артикаин 4% дефицит",
				requestedQuantity: 2,
			});

			expect(overdraftRes.success).toBe(true);
			expect(overdraftRes.isSoftOverdraft).toBe(true);
			expect(overdraftRes.deficitCount).toBe(2);
			expect(overdraftRes.warning).toMatch(/мягкий овердрафт.*не заблокирована/i);
			expect(overdraftRes.doctorAutonomyBlocked).toBe(false); // Mandate 8e: zero blocks!
		});
	});

	// ─── 2. AUTONOMOUS REACT ENGINE CYCLE ──────────────────────────────────────
	describe("2. Autonomous ReAct Cycle Execution", () => {
		it("executes complete 5-step ReAct cycle: Thought -> Action -> Observation -> Verdict", async () => {
			const result = await agent.execute({
				patientId: "pat-react-001",
				toothNumber: 26,
				complaints: "Острая приступообразная боль в зубе 2.6, усиливается ночью",
				diagnoses: ["K04.0 Пульпит"],
				allergies: ["Аллергия на пенициллин"],
				somaticHistory: ["Гипертоническая болезнь II ст"],
				discountPercent: 10,
				labOrderRequest: {
					workType: "Коронка цельноциркониевая ZrO2",
					material: "Диоксид циркония",
					vitaShade: "A2",
					dueDate: "2026-10-10",
				},
				appointmentRequest: {
					startsAt: "2026-09-30T10:00:00.000Z",
					durationMinutes: 30,
					reason: "Повторный осмотр и фиксация коронки 2.6",
				},
			});

			// ReAct Invariants
			expect(result.isFinished).toBe(true);
			expect(result.totalIterations).toBeLessThanOrEqual(5); // Anti-infinite loop
			expect(result.steps.length).toBeGreaterThanOrEqual(4);

			// Thought trace check
			expect(result.thought).toContain("[ИТЕРАЦИЯ 1/5");
			expect(result.thought).toContain("[ИТЕРАЦИЯ 2/5");
			expect(result.thought).toContain("[ИТЕРАЦИЯ 3/5");
			expect(result.thought).toContain("[ИТЕРАЦИЯ 4/5");
			expect(result.thought).toContain("[ИТЕРАЦИЯ 5/5");

			// Actions cards check
			expect(result.actions.length).toBeGreaterThanOrEqual(6);
			const diaryCard = result.actions.find((a) => a.type === "apply_soap_diary");
			const estCard = result.actions.find((a) => a.type === "apply_estimate_804n");
			const labCard = result.actions.find((a) => a.type === "apply_lab_order");
			const appCard = result.actions.find((a) => a.type === "apply_appointment");
			const anesthCard = result.actions.find((a) => a.type === "apply_anesthetic_dosage");
			const idsCard = result.actions.find((a) => a.type === "print_informed_consent");
			const warehouseCard = result.actions.find((a) => a.type === "check_warehouse_supplies");

			expect(diaryCard?.readyForOneClickApply).toBe(true);
			expect(estCard?.doctorAutonomyGuaranteed).toBe(true);
			expect(labCard?.readyForOneClickApply).toBe(true);
			expect(appCard?.readyForOneClickApply).toBe(true);
			expect(anesthCard?.readyForOneClickApply).toBe(true);
			expect(idsCard?.readyForOneClickApply).toBe(true);
			expect(warehouseCard?.doctorAutonomyGuaranteed).toBe(true);

			// Extended Clinical AI tools results check
			expect(result.anestheticDosage).toBeDefined();
			expect(result.anestheticDosage?.safeToProceed).toBe(true);
			expect(result.anestheticDosage?.drugName).toMatch(/мепивакаин|артикаин/i);

			expect(result.informedConsent).toBeDefined();
			expect(result.informedConsent?.consentCode).toBe("IDS-03-ENDO");
			expect(result.informedConsent?.printReady).toBe(true);

			expect(result.warehouseSupplies).toBeDefined();
			expect(result.warehouseSupplies?.doctorAutonomyBlocked).toBe(false);

			// Safety alerts check: penicillin & hypertension
			const penAlert = result.safetyAlerts.find((a) => a.alertType === "drug_allergy_conflict");
			expect(penAlert).toBeDefined();
			expect(penAlert?.safeAlternative).toMatch(/клиндамицин 300 мг/i);

			const cardioAlert = result.safetyAlerts.find((a) => a.alertType === "somatic_contraindication");
			expect(cardioAlert).toBeDefined();

			// T.A.R.S. 100% Verdict format check (zero fluff, fact-dense)
			expect(result.verdict).toMatch(/ВЕРДИКТ ГЛАВНОГО ВРАЧА DENTE \(T\.A\.R\.S\. 100%\):/);
			expect(result.verdict).toContain("2.6 (26)");
			expect(result.verdict).toContain("K04.0");
			expect(result.verdict).toMatch(/Анестезия:/);
			expect(result.verdict).toMatch(/Смета по Приказу 804н:/);
			expect(result.verdict).toMatch(/Форма 043\/у: SOAP-протокол подготовлен со статусом ЧЕРНОВИК/);
			expect(result.verdict).toMatch(/ИДС: IDS-03-ENDO/);
			expect(result.verdict).toMatch(/Склад:/);
		});

		it("parses natural language clinical prompt into structured actions", async () => {
			const result = await agent.execute({
				patientId: "pat-nl-001",
				prompt: "Пациент жалуется на сильную боль в зубе 4.6, пульпит. Аллергия на пенициллин, гипертония. Сделай скидку 15% и дневник 043/у.",
			});

			expect(result.toothNumber).toBe(46);
			expect(result.fdiToothFormatted).toBe("4.6 (46)");
			expect(result.estimate804n?.discountPercent).toBe(15);
			expect(result.safetyAlerts.length).toBeGreaterThan(0);
			expect(result.soapDiary?.assessment.icd10Code).toBe("K04.0");
		});

		it("defaults cleanly to physiological norm when patient has clean profile", async () => {
			const result = await agent.execute({
				patientId: "pat-norm-001",
				toothNumber: 11,
				complaints: "",
				mode: "autonomous",
			});

			expect(result.isFinished).toBe(true);
			const normAlert = result.safetyAlerts.find((a) => a.alertType === "physiological_norm");
			expect(normAlert).toBeDefined();
			expect(result.verdict).toContain("Физиологическая норма (Мандат 8e)");
		});
	});

	// ─── 3. FASTIFY ROUTE INTEGRATION: POST /api/v1/copilot/agent/execute ─────
	describe("3. Fastify Route: POST /api/v1/copilot/agent/execute", () => {
		it("processes HTTP request and returns 200 with autonomous agent result", async () => {
			const app = Fastify();
			await app.register(copilotRoutes);

			const response = await app.inject({
				method: "POST",
				url: "/api/v1/copilot/agent/execute",
				payload: {
					patientId: "00000000-0000-7000-8000-000000000001",
					toothNumber: "2.6",
					complaints: "Острая ночная боль в зубе 2.6",
					diagnoses: ["K04.0 Пульпит"],
					allergies: ["Пенициллин"],
					somaticHistory: ["Гипертония"],
					discountPercent: 10,
					mode: "autonomous",
				},
			});

			expect(response.statusCode).toBe(200);
			const json = JSON.parse(response.body);
			expect(json.ok).toBe(true);
			expect(json.data).toBeDefined();

			const data = json.data;
			expect(data.patientId).toBe("00000000-0000-7000-8000-000000000001");
			expect(data.toothNumber).toBe(26);
			expect(data.isFinished).toBe(true);
			expect(data.totalIterations).toBeLessThanOrEqual(5);
			expect(data.actions.length).toBeGreaterThan(0);
			expect(data.verdict).toContain("T.A.R.S. 100%");

			await app.close();
		});

		it("rejects invalid request payload with missing patientId (400)", async () => {
			const app = Fastify();
			await app.register(copilotRoutes);

			const response = await app.inject({
				method: "POST",
				url: "/api/v1/copilot/agent/execute",
				payload: {
					toothNumber: "2.6",
				},
			});

			expect(response.statusCode).toBe(400);
			const json = JSON.parse(response.body);
			expect(json.error).toBe("ValidationError");

			await app.close();
		});
	});
});
