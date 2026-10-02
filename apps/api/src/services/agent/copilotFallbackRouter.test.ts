import assert from "node:assert";
import { describe, test } from "node:test";
import { routeCopilotFallback } from "./copilotFallbackRouter.js";
import type { LLMStreamEvent } from "./types.js";

async function collectEvents(userText: string): Promise<LLMStreamEvent[]> {
	const events: LLMStreamEvent[] = [];
	const ctx = {
		userText,
		lower: userText.toLowerCase(),
		contextTooth: 46,
		contextPatientId: "00000000-0000-7000-8000-000000000004",
	};

	for await (const ev of routeCopilotFallback(ctx)) {
		events.push(ev);
	}
	return events;
}

describe("Copilot Fallback Router — CRM Component Knowledge Inquiries (Mandates 8l, 8e, 8n)", () => {
	test("'Как оформить возврат?' routes to KKT Cashier knowledge with refund steps, hotkeys and quest tour link", async () => {
		const events = await collectEvents("Как оформить возврат?");
		const textDeltas = events
			.filter((e) => e.type === "text_delta")
			.map((e) => (e as { text: string }).text)
			.join("");

		assert.ok(textDeltas.includes("Касса и чеки 54-ФЗ"), "Must identify KKT Cashier component");
		assert.ok(textDeltas.includes("54-ФЗ"), "Must mention 54-FZ compliance");
		assert.ok(
			textDeltas.includes("Возврат") || textDeltas.includes("возврат"),
			"Must include refund instructions",
		);
		assert.ok(textDeltas.includes("Alt+R") || textDeltas.includes("F9"), "Must include cashier/refund hotkeys");
		assert.ok(textDeltas.includes("cashier-refund"), "Must include cashier-refund selector");
		assert.ok(
			textDeltas.includes("action:launch-tour:solo_doctor:kkt_cashier") ||
			textDeltas.includes("action:launch-tour:reception_admin:kkt_cashier"),
			"Must include interactive tour launch link",
		);

		// Must NOT call any destructive tools
		const toolCalls = events.filter((e) => e.type === "tool_use");
		assert.strictEqual(toolCalls.length, 0, "Knowledge inquiry must not trigger dummy tool calls");
	});

	test("'Где смотреть снимок КТ?' routes to CBCT MPR Studio knowledge with F7/M hotkeys and imaging tour", async () => {
		const events = await collectEvents("Где смотреть снимок КТ?");
		const textDeltas = events
			.filter((e) => e.type === "text_delta")
			.map((e) => (e as { text: string }).text)
			.join("");

		assert.ok(
			textDeltas.includes("КТ и рентген-диагностика") || textDeltas.includes("cbct_mpr_studio"),
			"Must identify CBCT MPR Studio component",
		);
		assert.ok(textDeltas.includes("F7"), "Must include F7 capture/view hotkey");
		assert.ok(textDeltas.includes("imaging-nav"), "Must include imaging-nav selector");
		assert.ok(
			textDeltas.includes("action:launch-tour:imaging_diagnostics:cbct_mpr_studio"),
			"Must include imaging diagnostics tour link",
		);

		const toolCalls = events.filter((e) => e.type === "tool_use");
		assert.strictEqual(toolCalls.length, 0, "Knowledge inquiry must not trigger dummy tool calls");
	});

	test("'Как применить скидку по гарантии?' provides 54-FZ FFD 1.2 warranty guidance and avoids crm.apply_discount hijack", async () => {
		const events = await collectEvents("Как применить скидку по гарантии?");
		const textDeltas = events
			.filter((e) => e.type === "text_delta")
			.map((e) => (e as { text: string }).text)
			.join("");

		// Must explain statutory 54-FZ rule: 100% warranty rework does not issue 0-ruble receipts
		assert.ok(
			textDeltas.includes("гаранти") || textDeltas.includes("Гаранти"),
			"Must address warranty discount",
		);
		assert.ok(
			textDeltas.includes("Касса") || textDeltas.includes("54-ФЗ"),
			"Must reference cashier/fiscal context",
		);
		assert.ok(
			textDeltas.includes("action:launch-tour:solo_doctor:kkt_cashier") ||
			textDeltas.includes("action:launch-tour:reception_admin:kkt_cashier"),
			"Must include interactive tour link",
		);

		// Critical Invariant: Must NOT hijack prompt into crm.apply_discount with 15% on dummy plan!
		const discountToolCalls = events.filter(
			(e) => e.type === "tool_use" && (e as { name: string }).name === "crm.apply_discount",
		);
		assert.strictEqual(
			discountToolCalls.length,
			0,
			"Question about warranty discount must NOT trigger dummy crm.apply_discount tool!",
		);
	});

	test("Imperative 'Скидка 15%' correctly triggers crm.apply_discount", async () => {
		const events = await collectEvents("Скидка 15%");
		const toolCalls = events.filter(
			(e) => e.type === "tool_use" && (e as { name: string }).name === "crm.apply_discount",
		);
		assert.strictEqual(toolCalls.length, 1, "Imperative discount command must trigger crm.apply_discount");
		assert.strictEqual((toolCalls[0] as { input: { discountPercent: number } }).input.discountPercent, 15);
	});

	test("Imperative 'Зуб 46 кариес' correctly triggers tooth chart update", async () => {
		const events = await collectEvents("Зуб 46 кариес");
		const toolCalls = events.filter(
			(e) => e.type === "tool_use" && (e as { name: string }).name === "crm.update_teeth_chart",
		);
		assert.strictEqual(toolCalls.length, 1, "Imperative tooth status must trigger update_teeth_chart");
		const updates = (toolCalls[0] as { input: { updates: Array<{ toothNumber: number }> } }).input.updates;
		assert.strictEqual(updates[0]?.toothNumber, 46);
	});
});
