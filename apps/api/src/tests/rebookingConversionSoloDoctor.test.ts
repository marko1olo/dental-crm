import assert from "node:assert/strict";
import test from "node:test";
import { calculateRebookingDeltaMinutes } from "../routes/analytics.js";

test("calculateRebookingDeltaMinutes: стандартный режим (isSoloDoctor = false)", () => {
	const completedAt = new Date("2026-09-24T12:00:00.000Z");

	// 1. Создано через 5 минут после приёма -> врач у кресла
	const under15 = new Date("2026-09-24T12:05:00.000Z");
	const resUnder15 = calculateRebookingDeltaMinutes(under15, completedAt, false);
	assert.equal(resUnder15.deltaMinutes, 5);
	assert.equal(resUnder15.creditedRole, "doctor");
	assert.equal(resUnder15.attributionReason, "chairside_rebooking_under_15m");

	// 2. Создано ровно через 15 минут -> врач у кресла
	const exact15 = new Date("2026-09-24T12:15:00.000Z");
	const resExact15 = calculateRebookingDeltaMinutes(exact15, completedAt, false);
	assert.equal(resExact15.deltaMinutes, 15);
	assert.equal(resExact15.creditedRole, "doctor");
	assert.equal(resExact15.attributionReason, "chairside_rebooking_under_15m");

	// 3. Создано через 20 минут -> администратор / ресепшен
	const over15 = new Date("2026-09-24T12:20:00.000Z");
	const resOver15 = calculateRebookingDeltaMinutes(over15, completedAt, false);
	assert.equal(resOver15.deltaMinutes, 20);
	assert.equal(resOver15.creditedRole, "administrator");
	assert.equal(resOver15.attributionReason, "frontdesk_rebooking_over_15m");

	// 4. Создано во время визита (отрицательная дельта) -> врач у кресла, deltaMinutes >= 0
	const duringVisit = new Date("2026-09-24T11:55:00.000Z");
	const resDuring = calculateRebookingDeltaMinutes(duringVisit, completedAt, false);
	assert.equal(resDuring.deltaMinutes, 0);
	assert.equal(resDuring.creditedRole, "doctor");
	assert.equal(resDuring.attributionReason, "chairside_rebooking_under_15m");
});

test("calculateRebookingDeltaMinutes: соло-режим (isSoloDoctor = true, Мандат 8n)", () => {
	const completedAt = new Date("2026-09-24T12:00:00.000Z");

	// В соло-режиме нет администратора на ресепшене — 100% повторных записей атрибутируются врачу
	// независимо от задержки (5 минут, 30 минут, 120 минут).
	const delta5m = new Date("2026-09-24T12:05:00.000Z");
	const res5m = calculateRebookingDeltaMinutes(delta5m, completedAt, true);
	assert.equal(res5m.deltaMinutes, 5);
	assert.equal(res5m.creditedRole, "doctor");
	assert.equal(res5m.attributionReason, "chairside_rebooking_under_15m");

	const delta45m = new Date("2026-09-24T12:45:00.000Z");
	const res45m = calculateRebookingDeltaMinutes(delta45m, completedAt, true);
	assert.equal(res45m.deltaMinutes, 45);
	assert.equal(res45m.creditedRole, "doctor");
	assert.equal(res45m.attributionReason, "chairside_rebooking_under_15m");

	const delta180m = new Date("2026-09-24T15:00:00.000Z");
	const res180m = calculateRebookingDeltaMinutes(delta180m, completedAt, true);
	assert.equal(res180m.deltaMinutes, 180);
	assert.equal(res180m.creditedRole, "doctor");
	assert.equal(res180m.attributionReason, "chairside_rebooking_under_15m");
});
