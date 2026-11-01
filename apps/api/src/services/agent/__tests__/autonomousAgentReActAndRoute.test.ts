/**
 * autonomousAgentReActAndRoute.test.ts — ReAct Cycle, Prompt Parsing & Fastify Route Suite.
 *
 * Verifies:
 * 1. Autonomous ReAct Cycle (Thought -> Action -> Observation -> Final Verdict).
 * 2. Anti-infinite loop safety guard (max 5 iterations).
 * 3. T.A.R.S. 100% Factual Honesty & Zero Sycophancy.
 * 4. Fastify API route integration: POST /api/v1/copilot/agent/execute.
 */

import Fastify from "fastify";
import assert from "node:assert";
import { describe, it } from "node:test";
import { copilotRoutes } from "../../../routes/copilot.js";
import { AutonomousDenteAgent } from "../autonomousDenteAgent.js";

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

describe("DENTE Autonomous AI Engine — ReAct Cycle & API Routes", () => {
	const agent = new AutonomousDenteAgent();

	describe("1. Autonomous ReAct Cycle Execution", () => {
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

			expect(result.isFinished).toBe(true);
			expect(result.totalIterations).toBeLessThanOrEqual(5);
			expect(result.steps.length).toBeGreaterThanOrEqual(4);

			expect(result.thought).toContain("[ИТЕРАЦИЯ 1/5");
			expect(result.thought).toContain("[ИТЕРАЦИЯ 2/5");
			expect(result.thought).toContain("[ИТЕРАЦИЯ 3/5");
			expect(result.thought).toContain("[ИТЕРАЦИЯ 4/5");
			expect(result.thought).toContain("[ИТЕРАЦИЯ 5/5");

			expect(result.actions.length).toBeGreaterThanOrEqual(6);
			const diaryCard = result.actions.find((a) => a.type === "apply_soap_diary");
			const estCard = result.actions.find(
				(a) => a.type === "apply_treatment_estimate" || a.type === "apply_estimate_804n",
			);
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

			expect(result.anestheticDosage).toBeDefined();
			expect(result.anestheticDosage?.safeToProceed).toBe(true);
			expect(result.anestheticDosage?.drugName).toMatch(/мепивакаин|артикаин/i);

			expect(result.informedConsent).toBeDefined();
			expect(result.informedConsent?.consentCode).toBe("IDS-03-ENDO");
			expect(result.informedConsent?.printReady).toBe(true);

			expect(result.warehouseSupplies).toBeDefined();
			expect(result.warehouseSupplies?.doctorAutonomyBlocked).toBe(false);

			const penAlert = result.safetyAlerts.find((a) => a.alertType === "drug_allergy_conflict");
			expect(penAlert).toBeDefined();
			expect(penAlert?.safeAlternative).toMatch(/клиндамицин 300 мг/i);

			const cardioAlert = result.safetyAlerts.find((a) => a.alertType === "somatic_contraindication");
			expect(cardioAlert).toBeDefined();

			expect(result.verdict).toMatch(/ВЕРДИКТ ГЛАВНОГО ВРАЧА DENTE \(T\.A\.R\.S\. 100%\):/);
			expect(result.verdict).toContain("2.6 (26)");
			expect(result.verdict).toContain("K04.0");
			expect(result.verdict).toMatch(/Анестезия:/);
			expect(result.verdict).toMatch(/Смета услуг:/);
			expect(result.verdict).toMatch(/Медицинская карта приёма: SOAP-дневник подготовлен со статусом ЧЕРНОВИК/);
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
			expect(result.verdict).toContain("Физиологическая норма");
		});
	});

	describe("2. Fastify Route: POST /api/v1/copilot/agent/execute", () => {
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
