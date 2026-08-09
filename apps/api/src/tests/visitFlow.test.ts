import assert from "node:assert";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import { runVisitFlow } from "../ai/visitFlowOrchestrator.js";

/**
 * Проверяет, что orchestratorConfig действительно включает и выключает шаги.
 *
 * Раньше файл подменял экспорт через mock.method(visitDraft, ...) поверх
 * `import * as visitDraft`. Так сделать нельзя: свойства объекта пространства
 * имён ES-модуля неконфигурируемы по спецификации, поэтому оба теста падали в
 * beforeEach с «Cannot redefine property» и ни одно утверждение не выполнялось.
 * Вдобавок visitFlowOrchestrator импортирует buildVisitDraftFromTranscript
 * деструктуризацией, так что даже удавшаяся подмена пространства имён на него
 * бы не подействовала.
 *
 * Рабочий шов здесь один — globalThis.fetch: это обычное настраиваемое
 * свойство, и именно через него черновик уходит к ИИ-провайдеру. Тот же приём
 * используется в src/tests/ai/visitFlow.test.ts.
 */
describe("runVisitFlow Orchestrator", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		process.env.DENTAL_AI_NEURAL_DRAFT = "1";
		process.env.DENTAL_CLINICAL_AI_PROVIDER = "custom";
		process.env.DENTAL_CLINICAL_AI_BASE_URL = "http://localhost:9999/dummy";
		process.env.DENTAL_CLINICAL_AI_API_KEY = "test-key";
		process.env.DENTAL_CLINICAL_AI_MODEL = "test-model";

		mock.method(
			globalThis,
			"fetch",
			async () =>
				({
					ok: true,
					json: async () => ({
						choices: [
							{
								message: {
									content: JSON.stringify({
										complaint: "Боль",
										diagnosis: "Кариес",
										treatmentPlan: "План лечения",
									}),
								},
							},
						],
					}),
					// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				}) as any,
		);
	});

	afterEach(() => {
		process.env = originalEnv;
		mock.restoreAll();
	});

	test("executes all steps correctly when enabled", async () => {
		const result = await runVisitFlow({
			patientId: "00000000-0000-0000-0000-000000000000",
			transcript: "Тест",
			specialty: "therapist",
			completedServices: [
				{
					title: "Лечение кариеса",
					priceRub: 1000,
					serviceId: "1",
					quantity: 1,
				},
			],
			orchestratorConfig: {
				enablePlan: true,
				enableRecommendations: true,
				enableDocuments: true,
			},
		});

		assert.strictEqual(result.draft.status, "success");
		assert.strictEqual(result.plan.status, "success");
		assert.strictEqual(result.recommendations.status, "success");
		assert.strictEqual(result.documents.status, "success");
		assert.strictEqual(result.overallStatus, "success");
	});

	test("skips disabled steps based on orchestratorConfig", async () => {
		const result = await runVisitFlow({
			patientId: "00000000-0000-0000-0000-000000000000",
			transcript: "Тест",
			specialty: "therapist",
			completedServices: [
				{
					title: "Лечение кариеса",
					priceRub: 1000,
					serviceId: "1",
					quantity: 1,
				},
			],
			orchestratorConfig: {
				enablePlan: false,
				enableRecommendations: false,
				enableDocuments: false,
			},
		});

		// Черновик формируется всегда, отключаются только последующие шаги.
		assert.strictEqual(result.draft.status, "success");
		assert.strictEqual(result.plan.status, "skipped");
		assert.strictEqual(result.recommendations.status, "skipped");
		assert.strictEqual(result.documents.status, "skipped");
		assert.strictEqual(result.overallStatus, "success");
	});
});
