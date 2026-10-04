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
		assert.strictEqual(((toolCalls[0] as unknown) as { input: { discountPercent: number } }).input.discountPercent, 15);
	});

	test("Imperative 'Зуб 46 кариес' correctly triggers tooth chart update", async () => {
		const events = await collectEvents("Зуб 46 кариес");
		const toolCalls = events.filter(
			(e) => e.type === "tool_use" && (e as { name: string }).name === "crm.update_teeth_chart",
		);
		assert.strictEqual(toolCalls.length, 1, "Imperative tooth status must trigger update_teeth_chart");
		const updates = ((toolCalls[0] as unknown) as { input: { updates: Array<{ toothNumber: number }> } }).input.updates;
		assert.strictEqual(updates[0]?.toothNumber, 46);
	});

	// Mandate 8ab: Multipurpose Autonomous Copilot Intents
	test("Mandate 8ab: 'Кто следующий?' and 'Сколько пациентов сегодня?' trigger clinical.get_doctor_schedule", async () => {
		const events = await collectEvents("Кто следующий на приём?");
		const toolCalls = events.filter(
			(e) => e.type === "tool_use" && (e as { name: string }).name === "clinical.get_doctor_schedule",
		);
		assert.strictEqual(toolCalls.length, 1, "Next patient inquiry must trigger clinical.get_doctor_schedule");
		assert.ok((toolCalls[0] as any).input.dateFrom);
		assert.ok((toolCalls[0] as any).input.dateTo);
	});

	test("Mandate 8ab: 'Что делали на прошлом приёме?' triggers clinical.get_patient_timeline", async () => {
		const events = await collectEvents("Что делали на прошлом приёме?");
		const toolCalls = events.filter(
			(e) => e.type === "tool_use" && (e as { name: string }).name === "clinical.get_patient_timeline",
		);
		assert.strictEqual(toolCalls.length, 1, "Past visit inquiry must trigger clinical.get_patient_timeline");
		assert.strictEqual((toolCalls[0] as any).input.patientId, "00000000-0000-7000-8000-000000000004");
	});

	test("Mandate 8ab: 'Какой остаток депозита?' triggers clinical.get_family_balance", async () => {
		const events = await collectEvents("Какой остаток депозита у пациента?");
		const toolCalls = events.filter(
			(e) => e.type === "tool_use" && (e as { name: string }).name === "clinical.get_family_balance",
		);
		assert.strictEqual(toolCalls.length, 1, "Deposit/balance inquiry must trigger clinical.get_family_balance");
		assert.strictEqual((toolCalls[0] as any).input.patientId, "00000000-0000-7000-8000-000000000004");
	});

	test("Mandate 8ab: 'Какая выручка за сегодня?' triggers crm.get_clinic_or_doctor_revenue", async () => {
		const events = await collectEvents("Какая выручка за сегодня?");
		const toolCalls = events.filter(
			(e) => e.type === "tool_use" && (e as { name: string }).name === "crm.get_clinic_or_doctor_revenue",
		);
		assert.strictEqual(toolCalls.length, 1, "Daily revenue inquiry must trigger crm.get_clinic_or_doctor_revenue");
		assert.strictEqual((toolCalls[0] as any).input.period, "today");
	});

	test("Mandate 8ab: 'Сколько начислено по сдельщине за смену?' triggers crm.get_clinic_or_doctor_revenue", async () => {
		const events = await collectEvents("Сколько начислено по сдельщине за смену?");
		const toolCalls = events.filter(
			(e) => e.type === "tool_use" && (e as { name: string }).name === "crm.get_clinic_or_doctor_revenue",
		);
		assert.strictEqual(toolCalls.length, 1, "Piece-rate accrual inquiry must trigger crm.get_clinic_or_doctor_revenue");
	});

	test("Mandate 8ab: 'В каком я кресле в пятницу?' and 'Какая смена в четверг?' trigger crm.get_doctor_shifts_and_chairs", async () => {
		const eventsFri = await collectEvents("В каком я кресле в пятницу?");
		const toolCallsFri = eventsFri.filter(
			(e) => e.type === "tool_use" && (e as { name: string }).name === "crm.get_doctor_shifts_and_chairs",
		);
		assert.strictEqual(toolCallsFri.length, 1, "Friday chair inquiry must trigger crm.get_doctor_shifts_and_chairs");
		assert.strictEqual((toolCallsFri[0] as any).input.targetDateOrDay, "пятница");

		const eventsThu = await collectEvents("Какая у меня смена в четверг?");
		const toolCallsThu = eventsThu.filter(
			(e) => e.type === "tool_use" && (e as { name: string }).name === "crm.get_doctor_shifts_and_chairs",
		);
		assert.strictEqual(toolCallsThu.length, 1, "Thursday shift inquiry must trigger crm.get_doctor_shifts_and_chairs");
		assert.strictEqual((toolCallsThu[0] as any).input.targetDateOrDay, "четверг");
	});

	test("Mandate 8ab: 'Есть ли свободные окна на 1.5 часа?' and 'Кто записан после обеда?' trigger crm.get_daily_schedule_intelligence", async () => {
		const eventsGaps = await collectEvents("Есть ли свободные окна на 1.5 часа?");
		const toolCallsGaps = eventsGaps.filter(
			(e) => e.type === "tool_use" && (e as { name: string }).name === "crm.get_daily_schedule_intelligence",
		);
		assert.strictEqual(toolCallsGaps.length, 1, "Free gap inquiry must trigger crm.get_daily_schedule_intelligence");
		assert.strictEqual((toolCallsGaps[0] as any).input.minGapMinutes, 90);

		const eventsAfternoon = await collectEvents("Кто записан после обеда?");
		const toolCallsAfternoon = eventsAfternoon.filter(
			(e) => e.type === "tool_use" && (e as { name: string }).name === "crm.get_daily_schedule_intelligence",
		);
		assert.strictEqual(toolCallsAfternoon.length, 1, "Afternoon inquiry must trigger crm.get_daily_schedule_intelligence");
		assert.strictEqual((toolCallsAfternoon[0] as any).input.timeWindowFilter, "afternoon");
	});

	test("Mandate 8ab: 'Есть ли долг по счету?' triggers crm.get_patient_family_deposit_and_debt", async () => {
		const events = await collectEvents("Есть ли долг по счету у пациента?");
		const toolCalls = events.filter(
			(e) => e.type === "tool_use" && (e as { name: string }).name === "crm.get_patient_family_deposit_and_debt",
		);
		assert.strictEqual(toolCalls.length, 1, "Invoice debt inquiry must trigger crm.get_patient_family_deposit_and_debt");
		assert.strictEqual((toolCalls[0] as any).input.patientId, "00000000-0000-7000-8000-000000000004");
	});

	test("Mandate 8aa: Warehouse inquiry emits silent background notice without doctor context clutter", async () => {
		const events = await collectEvents("Склад и списание материалов");
		const textDeltas = events
			.filter((e) => e.type === "text_delta")
			.map((e) => (e as { text: string }).text)
			.join("");
		assert.ok(textDeltas.includes("Мандат 8aa") || textDeltas.includes("автоматически в фоновом режиме"));
		const toolCalls = events.filter((e) => e.type === "tool_use");
		assert.strictEqual(toolCalls.length, 0, "Warehouse inquiry must not trigger cluttering tool calls");
	});

	test("54-FZ Cashier Shift inquiry triggers crm.check_cashier_shift", async () => {
		const events = await collectEvents("Проверь статус кассовой смены по 54-ФЗ");
		const toolCalls = events.filter(
			(e) => e.type === "tool_use" && (e as { name: string }).name === "crm.check_cashier_shift",
		);
		assert.strictEqual(toolCalls.length, 1, "Cashier shift inquiry must trigger crm.check_cashier_shift");
	});
});
