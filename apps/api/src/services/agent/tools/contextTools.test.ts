/**
 * contextTools.test.ts — Unit test suite for contextTools and Two-Way UI View Synchronization.
 */

import assert from "node:assert";
import { describe, test } from "node:test";
import type { AgentContext } from "../context.js";
import { ToolRegistry } from "./registry.js";
import {
	getActiveContextTool,
	switchViewTool,
	selectToothTool,
	selectPatientTool,
	registerContextTools,
} from "./contextTools.js";

const ORG_ID = "00000000-0000-7000-8000-000000000001";
const CLINIC_ID = "00000000-0000-7000-8000-000000000002";
const USER_ID = "00000000-0000-7000-8000-000000000003";

function createTestContext(overrides: Partial<AgentContext> = {}): AgentContext {
	const registry = new ToolRegistry();
	return {
		organizationId: ORG_ID,
		clinicId: CLINIC_ID,
		userId: USER_ID,
		sessionId: "test-session-context-1",
		mode: "autonomous",
		role: "doctor",
		permissions: ["agent.read", "agent.write"],
		tools: registry,
		db: null,
		...overrides,
	};
}

describe("contextTools Suite", () => {
	test("get_active_context returns snapshot from agent metadata", async () => {
		const ctx = createTestContext({
			metadata: {
				uiContext: {
					view: "Odontogram",
					viewLabel: "Одонтограмма",
					patientId: "00000000-0000-7000-8000-000000000042",
					patientName: "Иванов Иван",
					activeTooth: 36,
					activeDoctor: "Dr. Смирнов",
				},
			},
		});

		const result = await getActiveContextTool.handler(ctx, {});
		assert.equal(result.view, "Odontogram");
		assert.equal(result.patientId, "00000000-0000-7000-8000-000000000042");
		assert.equal(result.activeTooth, 36);
		assert.equal(result.activeDoctor, "Dr. Смирнов");
		assert.equal(result.organizationId, ORG_ID);
	});

	test("get_active_context provides safe defaults when metadata is empty", async () => {
		const ctx = createTestContext({});
		const result = await getActiveContextTool.handler(ctx, {});
		assert.equal(result.view, "shift");
		assert.equal(result.patientId, null);
		assert.equal(result.activeTooth, null);
		assert.equal(result.activeDoctor, null);
	});

	test("switch_view generates correct navigation payload", async () => {
		const ctx = createTestContext();
		const result = await switchViewTool.handler(ctx, {
			view: "odontogram",
			patientId: "00000000-0000-7000-8000-000000000042",
			activeTooth: 46,
		});

		assert.equal(result.action, "SWITCH_VIEW");
		assert.equal(result.targetView, "odontogram");
		assert.equal(result.patientId, "00000000-0000-7000-8000-000000000042");
		assert.equal(result.activeTooth, 46);
		assert.equal(result.applied, true);
	});

	test("select_tooth generates tooth selection payload for FDI formula", async () => {
		const ctx = createTestContext();
		const result = await selectToothTool.handler(ctx, {
			toothFdi: 36,
			surface: "MOD",
		});

		assert.equal(result.action, "SELECT_TOOTH");
		assert.equal(result.toothFdi, 36);
		assert.equal(result.surface, "MOD");
		assert.equal(result.applied, true);
	});

	test("select_patient generates patient selection payload", async () => {
		const ctx = createTestContext();
		const patientId = "00000000-0000-7000-8000-000000000099";
		const result = await selectPatientTool.handler(ctx, { patientId });

		assert.equal(result.action, "SELECT_PATIENT");
		assert.equal(result.patientId, patientId);
		assert.equal(result.applied, true);
	});

	test("registerContextTools registers all 4 tools in ToolRegistry", () => {
		const registry = new ToolRegistry();
		registerContextTools(registry, "ui_context");

		assert.ok(registry.get("ui_context.get_active_context"));
		assert.ok(registry.get("ui_context.switch_view"));
		assert.ok(registry.get("ui_context.select_tooth"));
		assert.ok(registry.get("ui_context.select_patient"));
	});
});
