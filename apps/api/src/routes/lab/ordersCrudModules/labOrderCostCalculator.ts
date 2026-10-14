import { calculateBusinessDaysDueDate, CANONICAL_DENTAL_LAB_PRESETS } from "../types.js";

/**
 * Layer 1/2: Cost, Margin, and Turnaround Deadlines Calculator for Dental Lab Orders.
 */

export interface LabOrderCostBreakdown {
	suggestedPriceRub: number;
	estimatedCostRub: number;
	grossMarginRub: number;
	grossMarginPercent: number;
	unitsCount: number;
}

export interface LabOrderTurnaroundResult {
	turnaroundBusinessDays: number;
	dueDate: Date;
	isUrgent: boolean;
}

export interface LabOrderFittingSchedule {
	productionDueDate: Date;
	clinicDeliveryDate: Date;
	suggestedFittingDate: Date;
}

/**
 * Standard business turnaround days map by construction/material type.
 */
const MATERIAL_TURNAROUND_DAYS_MAP: Record<string, { standardDays: number; urgentDays: number; baseCostRub: number }> = {
	crown_zirconia: { standardDays: 5, urgentDays: 3, baseCostRub: 7500 },
	crown_emax: { standardDays: 5, urgentDays: 3, baseCostRub: 8500 },
	metal_ceramic: { standardDays: 7, urgentDays: 4, baseCostRub: 5000 },
	clasp_denture: { standardDays: 10, urgentDays: 6, baseCostRub: 11000 },
	aligners: { standardDays: 5, urgentDays: 3, baseCostRub: 18000 },
	implant_abutment: { standardDays: 4, urgentDays: 2, baseCostRub: 6000 },
	pmma_cad: { standardDays: 2, urgentDays: 1, baseCostRub: 2500 },
};

/**
 * Calculates turnaround deadline in business days with optional urgent surcharge speed.
 */
export function calculateLabOrderTurnaround(
	constructionType: string,
	isUrgent = false,
	startDate: Date = new Date(),
): LabOrderTurnaroundResult {
	const normalizedKey = constructionType.toLowerCase().replace(/[-\s]/g, "_");
	const config = MATERIAL_TURNAROUND_DAYS_MAP[normalizedKey] ?? {
		standardDays: 5,
		urgentDays: 3,
		baseCostRub: 7000,
	};

	const turnaroundDays = isUrgent ? config.urgentDays : config.standardDays;
	const dueDate = calculateBusinessDaysDueDate(startDate, turnaroundDays);

	return {
		turnaroundBusinessDays: turnaroundDays,
		dueDate,
		isUrgent,
	};
}

/**
 * Calculates laboratory cost, clinic markup, and gross margin for an order.
 */
export function calculateLabOrderCostAndMarkup(params: {
	materialOrConstruction: string;
	priceRub?: number | null;
	unitsCount?: number;
}): LabOrderCostBreakdown {
	const units = Math.max(1, params.unitsCount ?? 1);
	const normalizedKey = params.materialOrConstruction.toLowerCase().replace(/[-\s]/g, "_");

	// Try matching preset first
	const matchedPreset = CANONICAL_DENTAL_LAB_PRESETS.find(
		(p) =>
			p.constructionType === normalizedKey ||
			p.id.includes(normalizedKey) ||
			params.materialOrConstruction.toLowerCase().includes(p.shortTitle.toLowerCase()),
	);

	const defaultCostPerUnit = matchedPreset
		? matchedPreset.suggestedCostRub
		: (MATERIAL_TURNAROUND_DAYS_MAP[normalizedKey]?.baseCostRub ?? 7500);

	const defaultPricePerUnit = matchedPreset
		? matchedPreset.suggestedPriceRub
		: Math.round(defaultCostPerUnit * 3.2);

	const estimatedCostRub = defaultCostPerUnit * units;
	const suggestedPriceRub = params.priceRub != null && params.priceRub > 0
		? params.priceRub
		: defaultPricePerUnit * units;

	const grossMarginRub = Math.max(0, suggestedPriceRub - estimatedCostRub);
	const grossMarginPercent = suggestedPriceRub > 0
		? Math.round((grossMarginRub / suggestedPriceRub) * 100)
		: 0;

	return {
		suggestedPriceRub,
		estimatedCostRub,
		grossMarginRub,
		grossMarginPercent,
		unitsCount: units,
	};
}

/**
 * Estimates CAD/CAM schedule pipeline: production end -> clinic delivery -> chairside fitting appointment.
 */
export function estimateDeliveryAndFittingSchedule(
	sentDate: Date = new Date(),
	turnaroundDays = 5,
): LabOrderFittingSchedule {
	const productionDueDate = calculateBusinessDaysDueDate(sentDate, turnaroundDays);
	// Delivery to clinic: +1 business day after production
	const clinicDeliveryDate = calculateBusinessDaysDueDate(productionDueDate, 1);
	// Fitting appointment: +1 business day after delivery
	const suggestedFittingDate = calculateBusinessDaysDueDate(clinicDeliveryDate, 1);

	return {
		productionDueDate,
		clinicDeliveryDate,
		suggestedFittingDate,
	};
}
