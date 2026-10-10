/**
 * planPricingTools.ts — Tools for calculating exact kopeck estimates under Minzdrav Order 804n & doctor autonomy.
 * Implements Mandate 8e & 8l.
 */

import { formatKopecksRu, parseKopecks } from "@dental/shared";
import { z } from "zod";
import type { AgentContext } from "../../context.js";
import type { ToolDefinition } from "../tool.js";
import {
	type CalculatePlanCostInput,
	type CalculatePlanCostResult,
	calculatePlanCostSchema,
} from "./types.js";

// ============================================================================
// TOOL: calculate_plan_cost
// ============================================================================

export const calculatePlanCostTool: ToolDefinition<
	typeof calculatePlanCostSchema,
	CalculatePlanCostResult
> = {
	name: "calculate_plan_cost",
	description:
		"Точный расчет стоимости сметы и плана лечения в целых копейках со свободой скидок врача (0-100%).",
	parameters: calculatePlanCostSchema,
	permissions: ["billing.calculate"],
	category: "read",
	handler: async (_ctx: AgentContext, args: z.input<typeof calculatePlanCostSchema>): Promise<CalculatePlanCostResult> => {
		let subtotalKopecks = 0;
		for (const it of args.items) {
			subtotalKopecks += parseKopecks(it.priceRub * (it.quantity || 1));
		}

		const discountPercent = args.discountPercent ?? 0;
		const discountKopecks = Math.round(subtotalKopecks * (discountPercent / 100));
		const totalKopecks = Math.max(0, subtotalKopecks - discountKopecks);

		return {
			success: true,
			subtotalRub: subtotalKopecks / 100,
			subtotalKopecks,
			discountPercent,
			discountRub: discountKopecks / 100,
			discountKopecks,
			totalRub: totalKopecks / 100,
			totalKopecks,
			formattedTotal: formatKopecksRu(totalKopecks),
			doctorAutonomyApplied: true,
		};
	},
};
