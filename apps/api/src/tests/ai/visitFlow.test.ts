import assert from "node:assert";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import { runVisitFlow } from "../../ai/visitFlowOrchestrator.js";

/*
 * ЗДЕСЬ БЫЛИ ЧЕТЫРЕ ТИПА, ОБЪЯВЛЕННЫЕ ТОЛЬКО РАДИ ПРИВЕДЕНИЯ.
 *
 * Контракт объявлял `visitFlowStepResultSchema.data` как `z.unknown().nullable()`
 * — у содержимого шага не было ни одного известного свойства, `data?.x` сужало
 * unknown до `{}`, и каждый тест описывал заново тот кусок ответа, который
 * читает. Такой самодельный тип подтверждает сам себя: он объявляет поле, а не
 * проверяет, что сервер его отдаёт, и опечатка в имени поля даёт `undefined`
 * вместо провала.
 *
 * Теперь `data` описан по виду шага (`visitFlowDraftStepResultSchema` и
 * остальные три), поэтому поля читаются прямо из ответа: если сервер перестанет
 * отдавать `telegramSummary` или `suggestions`, красным станет компилятор, а не
 * тихо `undefined` в утверждении.
 */

describe("runVisitFlow Orchestrator", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
		process.env.DENTAL_AI_NEURAL_DRAFT = "1";
		process.env.DENTAL_SPEECH_POLISH_PROVIDER = "custom";
		process.env.DENTAL_SPEECH_POLISH_BASE_URL = "http://localhost:9999/dummy";
		process.env.DENTAL_SPEECH_POLISH_API_KEY = "test-key";
		process.env.DENTAL_SPEECH_POLISH_MODEL = "test-model";
		
		process.env.DENTAL_CLINICAL_AI_PROVIDER = "custom";
		process.env.DENTAL_CLINICAL_AI_BASE_URL = "http://localhost:9999/dummy";
		process.env.DENTAL_CLINICAL_AI_API_KEY = "test-key";
		process.env.DENTAL_CLINICAL_AI_MODEL = "test-model";
	});

	afterEach(() => {
		process.env = originalEnv;
		mock.restoreAll();
	});

	function mockFetch(responses: { draft?: any, plan?: any, recs?: any, draftError?: boolean, planError?: boolean, recsError?: boolean }) {
		mock.method(globalThis, "fetch", async (url: any, init: any) => {
			const body = init?.body ? JSON.parse(init.body) : {};
			const prompt = body.messages?.[0]?.content || body.messages?.[1]?.content || "";

			if (prompt.includes("диктовку приема") || prompt.includes("форме 043/у")) {
				if (responses.draftError) throw new Error("Draft fetch failed");
				return {
					ok: true,
					json: async () => ({
						choices: [{ message: { content: JSON.stringify(responses.draft || {}) } }],
					}),
				} as any;
			}
			
			if (prompt.includes("презентации пациенту") || prompt.includes("человеческий язык")) {
				if (responses.planError) throw new Error("Plan fetch failed");
				return {
					ok: true,
					json: async () => ({
						choices: [{ message: { content: JSON.stringify(responses.plan || {}) } }],
					}),
				} as any;
			}
			
			if (prompt.includes("памятки для пациента") || prompt.includes("telegramSummary")) {
				if (responses.recsError) throw new Error("Recs fetch failed");
				return {
					ok: true,
					json: async () => ({
						choices: [{ message: { content: JSON.stringify(responses.recs || {}) } }],
					}),
				} as any;
			}

			return { ok: true, json: async () => ({ choices: [{ message: { content: "{}" } }] }) } as any;
		});
	}

	test("runVisitFlow - happy path", async () => {
		mockFetch({
			draft: { complaint: "Жалоба", diagnosis: "Диагноз", treatmentPlan: "План" },
			plan: { patientFriendlyExplanation: "Все будет ок", patientHygieneAdvice: "Чистите зубы" },
			recs: { telegramSummary: "Рекомендации", hygieneInstructions: ["Чистить"], nutritionInstructions: ["Не есть"] }
		});

		const result = await runVisitFlow({
			patientId: "00000000-0000-0000-0000-000000000000",
			transcript: "Болит зуб",
			specialty: "universal",
			completedServices: [{ title: "Лечение кариеса", priceRub: 1000, serviceId: "1", quantity: 1 }],
			orchestratorConfig: { enablePlan: true, enableRecommendations: true, enableDocuments: true }
		});

		assert.strictEqual(result.draft.status, "success");
		assert.strictEqual(result.plan.status, "success");
		assert.strictEqual(result.recommendations.status, "success");
		assert.strictEqual(result.documents.status, "success");
		assert.strictEqual(result.overallStatus, "success");

		const planData = result.plan.data;
		const recommendationsData = result.recommendations.data;

		assert.deepStrictEqual(planData?.treatmentGoals, []);
		assert.strictEqual(planData?.patientFriendlyExplanation, "Все будет ок");

		// Рекомендации не ходят в ИИ: personalizePostVisitRecommendations —
		// детерминированный набор правил, в нём нет ни одного вызова fetch.
		// Поэтому ветка recs в mockFetch на этот результат не влияет, и прежнее
		// ожидание "Рекомендации" было недостижимо в принципе.
		// Проверяем то, что здесь действительно проверяемо: по услуге
		// «Лечение кариеса» выбрана кариозная ветка правил.
		assert.match(
			recommendationsData?.telegramSummary ?? "",
			/^Рекомендации после лечения кариеса/,
		);
	});

	test("runVisitFlow - draft fallback creates warnings but continues", async () => {
		mockFetch({ draftError: true });

		const result = await runVisitFlow({
			patientId: "00000000-0000-0000-0000-000000000000",
			transcript: "Жалоба пациента болит зуб",
			specialty: "universal",
			completedServices: [{ title: "Лечение", priceRub: 1000, serviceId: "1", quantity: 1 }]
		});

		assert.strictEqual(result.draft.status, "success");
		const draftData = result.draft.data;
		/*
		 * Скобки здесь обязательны, и не ради вкуса. Написание
		 * `length ?? 0 > 0` разбирается как `length ?? (0 > 0)`, потому что `>`
		 * связывает крепче `??`. На фактических значениях поведение совпадает с
		 * задуманным (непустая длина истинна, ноль и отсутствие ложны), то есть
		 * дефекта тут не было — но прочитать это как «утверждение всегда истинно»
		 * успели уже двое, включая ведущего. Утверждение заодно получило текст:
		 * падение без объяснения заставляет читать тест целиком.
		 */
		assert.ok(
			(draftData?.warnings?.length ?? 0) > 0,
			"Разбор диктовки отказал, но предупреждений для врача не выдал: на экране это молчание вместо причины."
		);
		// Since completedServices is provided, plan and recommendations should still be generated
		assert.strictEqual(result.overallStatus, "success");
		assert.strictEqual(result.plan.status, "success");
		assert.strictEqual(result.recommendations.status, "success");
	});

	test("runVisitFlow - plan and recs use fallback on error", async () => {
		mockFetch({
			draft: { complaint: "Жалоба", treatmentPlan: "План" },
			planError: true,
			recsError: true
		});

		const result = await runVisitFlow({
			patientId: "00000000-0000-0000-0000-000000000000",
			transcript: "Болит зуб",
			specialty: "universal",
			completedServices: [{ title: "Лечение кариеса", priceRub: 1000, serviceId: "1", quantity: 1 }],
		});

		const planData = result.plan.data;
		const recommendationsData = result.recommendations.data;

		assert.strictEqual(result.draft.status, "success");
		assert.strictEqual(result.plan.status, "success");
		assert.ok(planData?.patientFriendlyExplanation?.includes("Ваш план лечения"));
		assert.strictEqual(result.recommendations.status, "success");
		assert.ok(recommendationsData?.telegramSummary?.includes("Рекомендации после"));
		assert.strictEqual(result.overallStatus, "success");
	});

	test("runVisitFlow - skipped plan and recs when disabled", async () => {
		mockFetch({
			draft: { complaint: "Осмотр" }
		});

		const result = await runVisitFlow({
			patientId: "00000000-0000-0000-0000-000000000000",
			transcript: "Осмотр",
			specialty: "universal",
			orchestratorConfig: { enablePlan: false, enableRecommendations: false }
		});

		assert.strictEqual(result.draft.status, "success");
		assert.strictEqual(result.plan.status, "skipped");
		assert.strictEqual(result.recommendations.status, "skipped");
		assert.strictEqual(result.overallStatus, "success");
	});
	
	test("runVisitFlow - generates documents correctly", async () => {
		mockFetch({
			draft: { complaint: "Жалоба", treatmentPlan: "План" }
		});

		const result = await runVisitFlow({
			patientId: "00000000-0000-0000-0000-000000000000",
			transcript: "Болит зуб",
			specialty: "universal",
			completedServices: [{ title: "Сложное удаление зуба", priceRub: 1000, serviceId: "1", quantity: 1 }],
		});

		const documentsData = result.documents.data;

		assert.strictEqual(result.documents.status, "success");
		assert.ok(documentsData?.suggestions.includes("procedure_specific_consent"));
		assert.ok(documentsData?.suggestions.includes("post_visit_recommendations"));
	});
});
