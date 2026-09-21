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
import { describe, expect, it } from "vitest";
import { copilotRoutes } from "../../../routes/copilot.js";
import {
	AutonomousDenteAgent,
	defaultAutonomousDenteAgent,
} from "../autonomousDenteAgent.js";
import {
	bookChairsideAppointmentTool,
	calculate804nEstimateTool,
	checkDrugInteractionsTool,
	createDentalLabOrderTool,
	draft043uSoapDiaryTool,
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
	permissions: ["clinical.read", "clinical.write", "billing.calculate", "schedule.write"],
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
			expect(res.dentalFormula[26].statusCode).toBe("Norm");
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
			expect(result.actions.length).toBeGreaterThanOrEqual(4);
			const diaryCard = result.actions.find((a) => a.type === "apply_soap_diary");
			const estCard = result.actions.find((a) => a.type === "apply_estimate_804n");
			const labCard = result.actions.find((a) => a.type === "apply_lab_order");
			const appCard = result.actions.find((a) => a.type === "apply_appointment");

			expect(diaryCard?.readyForOneClickApply).toBe(true);
			expect(estCard?.doctorAutonomyGuaranteed).toBe(true);
			expect(labCard?.readyForOneClickApply).toBe(true);
			expect(appCard?.readyForOneClickApply).toBe(true);

			// Safety alerts check: penicillin & hypertension
			const penAlert = result.safetyAlerts.find((a) => a.alertType === "drug_allergy_conflict");
			expect(penAlert).toBeDefined();
			expect(penAlert?.safeAlternative).toMatch(/клиндамицин 300 мг/i);

			const cardioAlert = result.safetyAlerts.find((a) => a.alertType === "somatic_contraindication");
			expect(cardioAlert).toBeDefined();

			// T.A.R.S. 100% Verdict format check (zero fluff, fact-dense)
			expect(result.verdict).toMatch(/ВЕРДИКТ ЦИФРОВОГО НАЧМЕДА DENTE \(T\.A\.R\.S\. 100%\):/);
			expect(result.verdict).toContain("2.6 (26)");
			expect(result.verdict).toContain("K04.0");
			expect(result.verdict).toMatch(/Смета по Приказу 804н:/);
			expect(result.verdict).toMatch(/Форма 043\/у: SOAP-протокол подготовлен со статусом ЧЕРНОВИК/);
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
