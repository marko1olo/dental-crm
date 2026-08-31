/**
 * visionTool.test.ts — Unit tests for Radiograph Diagnostic Vision AI Tool.
 * Validates Zod schema constraints, registry integration, RBAC permissions,
 * and error handling for missing/invalid radiograph studies or image buffers.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import type { AgentContext } from "./context.js";
import { registerClinicalTools } from "./tools/clinicalTools.js";
import { defaultToolRegistry, ToolRegistry } from "./tools/registry.js";
import {
	analyzeRadiographVisionSchema,
	analyzeRadiographVisionTool,
	registerVisionTools,
} from "./tools/visionTool.js";

const ORG_ID = "00000000-0000-7000-8000-000000000001";
const CLINIC_ID = "00000000-0000-7000-8000-000000000002";
const USER_ID = "00000000-0000-7000-8000-000000000003";

function createTestContext(overrides: Partial<AgentContext> = {}): AgentContext {
	const registry = new ToolRegistry();
	registerClinicalTools(registry, "clinical");

	return {
		organizationId: ORG_ID,
		clinicId: CLINIC_ID,
		userId: USER_ID,
		sessionId: "test-session-vision-tool",
		mode: "autonomous",
		permissions: ["clinical.read"],
		tools: registry,
		db: null,
		...overrides,
	};
}

describe("1. Radiograph Vision Tool — Zod Input Schema", () => {
	test("accepts valid input with studyId", () => {
		const validUUID = "11111111-2222-3333-4444-555555555555";
		const parsed = analyzeRadiographVisionSchema.safeParse({
			studyId: validUUID,
			toothCode: "36",
			clinicalQuestion: "Оценить качество обтурации каналов",
		});
		assert.strictEqual(parsed.success, true);
		if (parsed.success) {
			assert.strictEqual(parsed.data.studyId, validUUID);
			assert.strictEqual(parsed.data.toothCode, "36");
			assert.strictEqual(parsed.data.mimeType, "image/png");
			assert.strictEqual(
				parsed.data.clinicalQuestion,
				"Оценить качество обтурации каналов",
			);
		}
	});

	test("accepts valid input with imageBase64 and custom mimeType", () => {
		const parsed = analyzeRadiographVisionSchema.safeParse({
			imageBase64: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
			mimeType: "image/jpeg",
			toothCode: "11",
		});
		assert.strictEqual(parsed.success, true);
		if (parsed.success) {
			assert.strictEqual(parsed.data.mimeType, "image/jpeg");
			assert.strictEqual(parsed.data.toothCode, "11");
		}
	});

	test("rejects invalid UUID in studyId", () => {
		const parsed = analyzeRadiographVisionSchema.safeParse({
			studyId: "invalid-not-a-uuid",
		});
		assert.strictEqual(parsed.success, false);
		if (!parsed.success) {
			assert.ok(
				parsed.error.issues.some((i) => i.message.includes("UUID")),
				"Should fail on non-UUID studyId",
			);
		}
	});
});

describe("2. Radiograph Vision Tool — Tool Registry & Serialization", () => {
	test("tool is registered in defaultToolRegistry under clinical.analyze_radiograph_vision", () => {
		const tool = defaultToolRegistry.get("clinical.analyze_radiograph_vision");
		assert.ok(tool !== undefined, "Tool should be in defaultToolRegistry");
		assert.strictEqual(tool?.name, "analyze_radiograph_vision");
		assert.strictEqual(tool?.category, "read");
		assert.deepStrictEqual(tool?.permissions, ["clinical.read"]);
		assert.strictEqual(tool?.exposesFreeText, true);
	});

	test("schemasFor returns valid OpenAI and Anthropic schemas", () => {
		const openAiSchemas = defaultToolRegistry.schemasFor(
			["clinical.analyze_radiograph_vision"],
			"openai",
		);
		assert.strictEqual(openAiSchemas.length, 1);
		assert.strictEqual(
			(openAiSchemas[0] as any)?.function?.name,
			"clinical.analyze_radiograph_vision",
		);

		const anthropicSchemas = defaultToolRegistry.schemasFor(
			["clinical.analyze_radiograph_vision"],
			"anthropic",
		);
		assert.strictEqual(anthropicSchemas.length, 1);
		assert.strictEqual(
			(anthropicSchemas[0] as any)?.name,
			"clinical.analyze_radiograph_vision",
		);
	});

	test("registerVisionTools registers tool under custom namespace", () => {
		const customRegistry = new ToolRegistry();
		registerVisionTools(customRegistry, "imaging_ai");
		const tool = customRegistry.get("imaging_ai.analyze_radiograph_vision");
		assert.ok(tool !== undefined);
		assert.strictEqual(tool?.name, "analyze_radiograph_vision");
	});
});

describe("3. Radiograph Vision Tool — Execution Guardrails & Validation", () => {
	test("fails when neither studyId nor imageBase64 is provided", async () => {
		const ctx = createTestContext();
		const result = await ctx.tools.call(
			ctx,
			"clinical.analyze_radiograph_vision",
			{},
		);
		assert.strictEqual(result.ok, false);
		assert.ok(
			result.error?.includes("studyId") ||
				result.error?.includes("imageBase64"),
			`Expected error about missing image, got: ${result.error}`,
		);
	});

	test("fails with empty base64 string", async () => {
		const ctx = createTestContext();
		const result = await ctx.tools.call(
			ctx,
			"clinical.analyze_radiograph_vision",
			{
				imageBase64: "   ",
			},
		);
		assert.strictEqual(result.ok, false);
		assert.ok(
			result.error?.includes("пустая строка"),
			`Expected error about empty base64, got: ${result.error}`,
		);
	});

	test("fails with non-existent studyId in database", async () => {
		const mockDb: any = {
			select: () => ({
				from: () => ({
					where: () => ({
						limit: async () => [],
					}),
				}),
			}),
		};
		const ctx = createTestContext({ db: mockDb });
		const nonExistentUUID = "00000000-0000-0000-0000-000000000999";
		const result = await ctx.tools.call(
			ctx,
			"clinical.analyze_radiograph_vision",
			{
				studyId: nonExistentUUID,
			},
		);
		assert.strictEqual(result.ok, false);
		assert.ok(
			result.error?.includes("не найдено"),
			`Expected error about study not found, got: ${result.error}`,
		);
	});

	test("blocks execution when context lacks clinical.read permission", async () => {
		const ctx = createTestContext({ permissions: ["schedule.read"] });
		const result = await ctx.tools.call(
			ctx,
			"clinical.analyze_radiograph_vision",
			{
				imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
			},
		);
		assert.strictEqual(result.ok, false);
		assert.ok(
			result.error?.includes("permission denied"),
			`Expected permission denied, got: ${result.error}`,
		);
	});
});
