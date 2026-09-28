/**
 * leadSlaEngine.test.ts — Unit tests for CRM Lead SLA calculations and shared schemas.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	batchUpdateLeadStageSchema,
	calculateLeadSlaStatus,
	clinicalTagCatalog,
	formatMinutesRu,
	leadPipelineMetricsSchema,
	leadPriorityEnum,
	leadStatusEnum,
	patchLeadStageSchema,
} from "../leads/index.js";

describe("CRM Lead SLA Engine & Shared Schemas", () => {
	it("1. formatMinutesRu accurately formats minutes into Russian time strings", () => {
		assert.equal(formatMinutesRu(0), "< 1 мин");
		assert.equal(formatMinutesRu(12), "12 мин");
		assert.equal(formatMinutesRu(60), "1 ч");
		assert.equal(formatMinutesRu(75), "1 ч 15 мин");
		assert.equal(formatMinutesRu(120), "2 ч");
		assert.equal(formatMinutesRu(155), "2 ч 35 мин");
	});

	it("2. calculateLeadSlaStatus classifies fresh leads (< 15 min) with green badge", () => {
		const now = new Date("2026-09-28T12:00:00Z");
		const enteredAt = new Date("2026-09-28T11:52:00Z"); // 8 mins ago

		const evalResult = calculateLeadSlaStatus(enteredAt, "new", now);
		assert.equal(evalResult.status, "fresh");
		assert.equal(evalResult.isBreached, false);
		assert.equal(evalResult.elapsedMinutes, 8);
		assert.equal(evalResult.elapsedFormattedRu, "8 мин");
	});

	it("3. calculateLeadSlaStatus classifies warning leads (15-60 min) with amber badge", () => {
		const now = new Date("2026-09-28T12:00:00Z");
		const enteredAt = new Date("2026-09-28T11:25:00Z"); // 35 mins ago

		const evalResult = calculateLeadSlaStatus(enteredAt, "new", now);
		assert.equal(evalResult.status, "warning");
		assert.equal(evalResult.isBreached, false);
		assert.equal(evalResult.elapsedMinutes, 35);
		assert.equal(evalResult.elapsedFormattedRu, "35 мин");
	});

	it("4. calculateLeadSlaStatus classifies breached leads (> 60 min) in 'new' stage", () => {
		const now = new Date("2026-09-28T12:00:00Z");
		const enteredAt = new Date("2026-09-28T10:30:00Z"); // 90 mins ago (1h 30m)

		const evalResult = calculateLeadSlaStatus(enteredAt, "new", now);
		assert.equal(evalResult.status, "breached");
		assert.equal(evalResult.isBreached, true);
		assert.equal(evalResult.elapsedMinutes, 90);
		assert.equal(evalResult.elapsedFormattedRu, "1 ч 30 мин");
	});

	it("5. calculateLeadSlaStatus safely handles null or undefined timestamps", () => {
		const evalResult = calculateLeadSlaStatus(null, "new");
		assert.equal(evalResult.status, "fresh");
		assert.equal(evalResult.isBreached, false);
		assert.equal(evalResult.elapsedMinutes, 0);
	});

	it("6. batchUpdateLeadStageSchema validates UUID arrays and stage constraints", () => {
		const valid = batchUpdateLeadStageSchema.safeParse({
			leadIds: ["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"],
			toStage: "contacted",
			reason: "Массовый обзвон оператором",
		});
		assert.equal(valid.success, true);

		const empty = batchUpdateLeadStageSchema.safeParse({
			leadIds: [],
			toStage: "contacted",
		});
		assert.equal(empty.success, false);

		const invalidStage = batchUpdateLeadStageSchema.safeParse({
			leadIds: ["11111111-1111-4111-8111-111111111111"],
			toStage: "invalid_stage",
		});
		assert.equal(invalidStage.success, false);
	});

	it("7. patchLeadStageSchema validates priority and clinical tags", () => {
		const valid = patchLeadStageSchema.safeParse({
			toStage: "consult_booked",
			priority: "urgent",
			clinicalTags: ["acute_pain", "all_on_4"],
			notes: "Острая боль, готов на немедленный осмотр",
		});
		assert.equal(valid.success, true);
		if (valid.success) {
			assert.equal(valid.data.priority, "urgent");
			assert.deepEqual(valid.data.clinicalTags, ["acute_pain", "all_on_4"]);
		}
	});

	it("8. leadPipelineMetricsSchema validates pipeline metrics contract", () => {
		const metrics = {
			totalLeads: 15,
			stageCounts: {
				new: 5,
				contacted: 4,
				consult_booked: 3,
				showed_up: 2,
				no_answer: 1,
				trash: 0,
			},
			averageDurationSecondsByStage: {
				new: 1200,
				contacted: 3600,
				consult_booked: 86400,
			},
			stageConversionRates: {
				new_to_contacted: 66.7,
				contacted_to_consult_booked: 55.6,
				consult_booked_to_showed_up: 40.0,
				overall_conversion: 20.0,
			},
			slaBreachedCount: 2,
			urgentCount: 3,
			pipelineExpectedRevenueRub: 450000,
		};

		const parsed = leadPipelineMetricsSchema.safeParse(metrics);
		assert.equal(parsed.success, true);
	});

	it("9. clinicalTagCatalog contains required urgent and high check dental categories", () => {
		const tagIds = clinicalTagCatalog.map((t) => t.id);
		assert.ok(tagIds.includes("acute_pain"));
		assert.ok(tagIds.includes("all_on_4"));
		assert.ok(tagIds.includes("implants"));
		assert.ok(tagIds.includes("braces_aligners"));
		assert.ok(tagIds.includes("total_prosthetics"));
	});
});
