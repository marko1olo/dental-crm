/**
 * chairsideSentinelEngine.test.ts — Unit & Integration Test Suite for Chairside Sentinel Engine.
 *
 * Verifies:
 * 1. Drug-drug & allergy conflict detection (Penicillin vs Amoxicillin -> Clindamycin 300 mg).
 * 2. Somatic contraindications (Hypertension, NSAID allergies).
 * 3. Autonomous Order 804n package formation for Pulpitis (2.6 K04.0) & Caries (K02.1).
 * 4. StAR-compliant Form 043/у SOAP diary synthesis.
 * 5. Mandate 8e Compliance (0 blocking exceptions, physiological norm by default, 1-click drafts).
 * 6. Fastify route integration: POST /api/v1/copilot/sentinel/analyze.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import Fastify from "fastify";
import { copilotRoutes } from "../../../routes/copilot.js";
import {
	ChairsideSentinelEngine,
	defaultChairsideSentinel,
	formatFdiTooth,
	getCanalsForTooth,
	parseFdiTooth,
} from "../chairsideSentinelEngine.js";

describe("ChairsideSentinelEngine — Autonomous Proactive Chairside Sentinel", () => {
	const engine = new ChairsideSentinelEngine();

	describe("1. Tooth & Canal Resolution Utilities", () => {
		test("parses various FDI tooth formats (2.6, 26, '2.6', 'зуб 26')", () => {
			assert.strictEqual(parseFdiTooth(26), 26);
			assert.strictEqual(parseFdiTooth("26"), 26);
			assert.strictEqual(parseFdiTooth(2.6), 26);
			assert.strictEqual(parseFdiTooth("2.6"), 26);
			assert.strictEqual(parseFdiTooth("зуб 2.6"), 26);
			assert.strictEqual(parseFdiTooth("зуб 47"), 47);
			assert.strictEqual(parseFdiTooth(null), null);
			assert.strictEqual(parseFdiTooth(undefined), null);
		});

		test("formats FDI tooth accurately", () => {
			assert.strictEqual(formatFdiTooth(26), "2.6 (26)");
			assert.strictEqual(formatFdiTooth(11), "1.1 (11)");
			assert.strictEqual(formatFdiTooth(null), "Не указан");
		});

		test("resolves anatomical canal counts correctly", () => {
			// Upper and lower molars: 3 canals
			assert.strictEqual(getCanalsForTooth(26), 3);
			assert.strictEqual(getCanalsForTooth(16), 3);
			assert.strictEqual(getCanalsForTooth(36), 3);
			assert.strictEqual(getCanalsForTooth(47), 3);
			// Incisors & canines: 1 canal
			assert.strictEqual(getCanalsForTooth(11), 1);
			assert.strictEqual(getCanalsForTooth(21), 1);
			assert.strictEqual(getCanalsForTooth(33), 1);
			// Upper first premolar: 2 canals
			assert.strictEqual(getCanalsForTooth(14), 2);
			assert.strictEqual(getCanalsForTooth(24), 2);
		});
	});

	describe("2. Drug Conflicts & Allergy Detection (Penicillin vs Amoxicillin)", () => {
		test("detects penicillin allergy vs amoxicillin conflict with Clindamycin 300 mg alternative", async () => {
			const result = await engine.analyzeVisitContext({
				patientId: "pat-allergy-01",
				toothNumber: 26,
				allergies: ["Аллергия на пенициллин"],
				activeServices: ["Амоксициллин 500 мг (по 1 таб 3 раза в день)"],
				mode: "autonomous",
			});

			const conflictAlert = result.alerts.find(
				(a) => a.alertType === "drug_allergy_conflict",
			);
			assert.ok(
				conflictAlert,
				"Must generate a critical drug allergy conflict alert",
			);
			assert.strictEqual(conflictAlert.severity, "critical");
			assert.match(
				conflictAlert.message,
				/пенициллин/i,
				"Message must mention penicillin allergy",
			);
			assert.match(
				conflictAlert.message,
				/амоксициллин/i,
				"Message must mention amoxicillin",
			);
			assert.ok(conflictAlert.safeAlternative, "Must suggest safe alternative");
			assert.match(
				conflictAlert.safeAlternative,
				/клиндамицин\s+300\s*мг/i,
				"Safe alternative must explicitly include Clindamycin 300 mg",
			);
			assert.strictEqual(
				conflictAlert.isBlocking,
				false,
				"Mandate 8e: Must NEVER block the doctor",
			);
		});

		test("detects penicillin allergy vs amoxiclav/augmentin conflict", async () => {
			const result = await engine.analyzeVisitContext({
				patientId: "pat-allergy-02",
				toothNumber: 14,
				allergies: ["пенициллиновый ряд"],
				activeServices: ["Амоксиклав 1000 мг"],
				mode: "autonomous",
			});

			const conflict = result.alerts.find(
				(a) => a.alertType === "drug_allergy_conflict",
			);
			assert.ok(conflict, "Must detect conflict with amoxiclav");
			assert.match(conflict.safeAlternative || "", /клиндамицин 300 мг/i);
		});

		test("detects NSAID allergy conflict with Paracetamol alternative", async () => {
			const result = await engine.analyzeVisitContext({
				patientId: "pat-allergy-03",
				allergies: ["НПВП", "Аспирин"],
				activeServices: ["Ибупрофен 400 мг"],
			});

			const nsaidAlert = result.alerts.find(
				(a) => a.alertType === "drug_allergy_conflict",
			);
			assert.ok(nsaidAlert, "Must detect NSAID conflict");
			assert.match(nsaidAlert.safeAlternative || "", /парацетамол/i);
			assert.strictEqual(nsaidAlert.isBlocking, false);
		});

		test("detects hypertension contraindication with safe vasoconstrictor alternatives", async () => {
			const result = await engine.analyzeVisitContext({
				patientId: "pat-somatic-01",
				toothNumber: 26,
				somaticHistory: ["Гипертоническая болезнь II ст, кризовое течение"],
			});

			const cardioAlert = result.alerts.find(
				(a) => a.alertType === "somatic_contraindication",
			);
			assert.ok(cardioAlert, "Must detect hypertension contraindication");
			assert.strictEqual(cardioAlert.severity, "warning");
			assert.match(cardioAlert.safeAlternative || "", /скандонест|1:200 000/i);
			assert.strictEqual(cardioAlert.isBlocking, false);
		});
	});

	describe("3. Auto-Formation of Order 804n Package & SOAP 043/у", () => {
		test("generates full 804n package for Pulpitis on tooth 2.6 (K04.0)", async () => {
			const result = await engine.analyzeVisitContext({
				patientId: "pat-pulpitis-01",
				toothNumber: 2.6,
				diagnoses: ["2.6 K04.0 Пульпит"],
				complaints: "Острая ночная боль в зубе 26",
				mode: "autonomous",
			});

			assert.strictEqual(result.toothNumber, 26);
			assert.strictEqual(result.fdiToothFormatted, "2.6 (26)");
			assert.strictEqual(result.status, "auto_approved_draft");
			assert.strictEqual(result.autoApprovedDraft, true);
			assert.strictEqual(result.readyForOneClickApply, true);

			const codes = result.order804n.services.map((s) => s.code);

			// Required statutory package:
			// 1. Анестезия A16.07.030
			assert.ok(
				codes.includes("A16.07.030"),
				`Order 804n must include anesthesia A16.07.030, got: ${codes.join(", ")}`,
			);
			// 2. Коффердам A16.07.082
			assert.ok(
				codes.includes("A16.07.082"),
				`Order 804n must include cofferdam A16.07.082, got: ${codes.join(", ")}`,
			);
			// 3. Эндодоступ и мехобработка 3 каналов (A16.07.030.003)
			assert.ok(
				codes.includes("A16.07.030.003"),
				`Order 804n must include endo prep A16.07.030.003, got: ${codes.join(", ")}`,
			);
			// 4. Пломбирование 3 каналов гуттаперчей (A16.07.008.003)
			assert.ok(
				codes.includes("A16.07.008.003"),
				`Order 804n must include obturation A16.07.008.003, got: ${codes.join(", ")}`,
			);
			// 5. Пломбирование / реставрация (A16.07.002.001)
			assert.ok(
				codes.includes("A16.07.002.001"),
				`Order 804n must include composite filling A16.07.002.001, got: ${codes.join(", ")}`,
			);

			// Check integer exact kopecks math
			assert.ok(result.order804n.totalKopecks > 0);
			assert.strictEqual(
				result.order804n.totalRub * 100,
				result.order804n.totalKopecks,
				"Total rubles and kopecks must match exactly",
			);

			// Check SOAP 043/у diary sections
			const soap = result.soapDiary;
			assert.ok(soap.subjective.complaints.includes("26"));
			assert.ok(soap.objective.statusLocalis.includes("26"));
			assert.strictEqual(soap.assessment.icd10Code, "K04.0");
			assert.ok(soap.plan.procedureProtocol.includes("коффердам"));
			assert.ok(soap.renderedText043.includes("ФОРМА 043/У"));
		});

		test("generates 804n package for Caries (K02.1)", async () => {
			const result = await engine.analyzeVisitContext({
				patientId: "pat-caries-01",
				toothNumber: 26,
				diagnoses: ["K02.1 Кариес дентина"],
				mode: "autonomous",
			});

			const codes = result.order804n.services.map((s) => s.code);
			assert.ok(codes.includes("A16.07.030"), "Caries must have anesthesia");
			assert.ok(codes.includes("A16.07.082"), "Caries must have cofferdam");
			assert.ok(
				codes.includes("A16.07.002.001"),
				"Caries must have composite restoration",
			);
			assert.strictEqual(result.soapDiary.assessment.icd10Code, "K02.1");
		});

		test("records multi-step action chain execution in result", async () => {
			const result = await engine.analyzeVisitContext({
				patientId: "pat-chain-01",
				toothNumber: 26,
				diagnoses: ["K04.0"],
			});

			assert.strictEqual(result.actionChain.length, 4);
			const stepNames = result.actionChain.map((s) => s.step);
			assert.deepStrictEqual(stepNames, [
				"check_drug_interaction",
				"generate_visit_diary",
				"calculate_order_804n",
				"assemble_proactive_card",
			]);
			for (const s of result.actionChain) {
				assert.strictEqual(s.status, "completed");
				assert.ok(s.timestamp);
			}
		});
	});

	describe("4. Mandate 8e Compliance (Doctor Autonomy & Zero Blockers)", () => {
		test("defaults to physiological norm when somatic and allergy fields are omitted", async () => {
			const result = await engine.analyzeVisitContext({
				patientId: "pat-norm-01",
			});

			assert.strictEqual(result.isPhysiologicalNorm, true);
			assert.strictEqual(
				result.somaticStatus,
				"Соматически здоров / норма",
				"Mandate 8e: Somatic norm by default",
			);
			assert.strictEqual(
				result.allergiesStatus,
				"Аллергологический анамнез не отягощен",
				"Mandate 8e: Allergy norm by default",
			);
			assert.strictEqual(
				result.doctorAutonomyGuaranteed,
				true,
				"Doctor autonomy must be guaranteed",
			);

			// All alerts must be non-blocking
			for (const alert of result.alerts) {
				assert.strictEqual(alert.isBlocking, false);
			}
		});

		test("autonomous mode produces auto_approved_draft ready for 1-click apply", async () => {
			const result = await engine.analyzeVisitContext({
				patientId: "pat-auto-01",
				toothNumber: 26,
				mode: "autonomous",
			});

			assert.strictEqual(result.mode, "autonomous");
			assert.strictEqual(result.status, "auto_approved_draft");
			assert.strictEqual(result.autoApprovedDraft, true);
			assert.strictEqual(result.readyForOneClickApply, true);
		});

		test("supervised mode produces draft_pending_review", async () => {
			const result = await engine.analyzeVisitContext({
				patientId: "pat-super-01",
				toothNumber: 26,
				mode: "supervised",
			});

			assert.strictEqual(result.mode, "supervised");
			assert.strictEqual(result.status, "draft_pending_review");
			assert.strictEqual(result.autoApprovedDraft, false);
			assert.strictEqual(result.readyForOneClickApply, true);
		});
	});

	describe("5. Fastify Route: POST /api/v1/copilot/sentinel/analyze", () => {
		test("processes HTTP request and returns proactive sentinel verdict", async () => {
			const app = Fastify();
			await app.register(copilotRoutes);

			const response = await app.inject({
				method: "POST",
				url: "/api/v1/copilot/sentinel/analyze",
				payload: {
					patientId: "00000000-0000-7000-8000-000000000001",
					toothNumber: "2.6",
					diagnoses: ["2.6 K04.0 Пульпит"],
					allergies: ["Пенициллин"],
					activeServices: ["Амоксициллин 500 мг"],
					mode: "autonomous",
				},
			});

			assert.strictEqual(response.statusCode, 200);
			const json = JSON.parse(response.body);
			assert.strictEqual(json.ok, true);
			assert.ok(json.data);

			const data = json.data;
			assert.strictEqual(data.toothNumber, 26);
			assert.strictEqual(data.status, "auto_approved_draft");
			assert.strictEqual(data.autoApprovedDraft, true);

			// Alert check
			const conflict = data.alerts.find(
				(a: { alertType: string }) => a.alertType === "drug_allergy_conflict",
			);
			assert.ok(conflict, "Must contain drug conflict in route response");
			assert.match(conflict.safeAlternative, /клиндамицин 300 мг/i);

			// Services check
			const codes = data.order804n.services.map(
				(s: { code: string }) => s.code,
			);
			assert.ok(codes.includes("A16.07.030"));
			assert.ok(codes.includes("A16.07.082"));
			assert.ok(codes.includes("A16.07.030.003"));

			await app.close();
		});

		test("validates request payload and rejects missing patientId with 400", async () => {
			const app = Fastify();
			await app.register(copilotRoutes);

			const response = await app.inject({
				method: "POST",
				url: "/api/v1/copilot/sentinel/analyze",
				payload: {
					toothNumber: "2.6",
				},
			});

			assert.strictEqual(response.statusCode, 400);
			const json = JSON.parse(response.body);
			assert.strictEqual(json.error, "ValidationError");

			await app.close();
		});
	});
});
