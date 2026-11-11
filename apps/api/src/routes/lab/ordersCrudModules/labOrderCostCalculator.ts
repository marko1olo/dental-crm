import { and, eq, ilike, or } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import { labItems, serviceCatalogItems } from "../../../db/schema.js";
import { calculateBusinessDaysDueDate, CANONICAL_DENTAL_LAB_PRESETS } from "../types.js";
import type {
	LabOrderCostBreakdown,
	LabOrderTurnaroundResult,
	LabOrderFittingSchedule,
} from "./labOrderCostCalculatorTypes.js";

export type {
	LabOrderCostBreakdown,
	LabOrderTurnaroundResult,
	LabOrderFittingSchedule,
};

/**
 * Standard business turnaround days map by construction/material type (safe canonical fallback).
 */
const MATERIAL_TURNAROUND_DAYS_MAP: Record<string, { standardDays: number; urgentDays: number; baseCostRub: number }> = {
	crown_zirconia: { standardDays: 5, urgentDays: 3, baseCostRub: 7500 },
	crown_emax: { standardDays: 5, urgentDays: 3, baseCostRub: 8500 },
	metal_ceramic: { standardDays: 6, urgentDays: 4, baseCostRub: 3800 },
	clasp_denture: { standardDays: 8, urgentDays: 5, baseCostRub: 13000 },
	aligners: { standardDays: 4, urgentDays: 2, baseCostRub: 5500 },
	implant_abutment: { standardDays: 4, urgentDays: 2, baseCostRub: 6000 },
	pmma_cad: { standardDays: 2, urgentDays: 1, baseCostRub: 2500 },
};

/**
 * Честный запрос актуальной стоимости ЗТЛ из базы данных (прайс-лист клиники services и lab_items).
 * Возвращает себестоимость лаборатории и цену для пациента с безопасным каноническим дефолтным фолбеком.
 */
export async function fetchLabPriceFromDb(
	tx: TenantDb,
	orgId: string,
	materialOrConstruction: string,
	laboratoryId?: string | null,
): Promise<{ costRub: number; priceRub: number }> {
	const normalizedKey = materialOrConstruction.toLowerCase().replace(/[-\s]/g, "_");

	// 1. Поиск в каталоге услуг клиники (serviceCatalogItems) по категории ортопедии или совпадению названия/материала
	try {
		const foundServices = await tx
			.select({
				id: serviceCatalogItems.id,
				title: serviceCatalogItems.title,
				basePriceRub: serviceCatalogItems.basePriceRub,
				materialsCostRub: serviceCatalogItems.materialsCostRub,
				labCostRub: serviceCatalogItems.labCostRub,
			})
			.from(serviceCatalogItems)
			.where(
				and(
					eq(serviceCatalogItems.organizationId, orgId),
					eq(serviceCatalogItems.isActive, true),
					or(
						eq(serviceCatalogItems.category, "prosthetics"),
						ilike(serviceCatalogItems.title, `%${materialOrConstruction}%`),
					),
				),
			)
			.limit(5);

		if (foundServices.length > 0) {
			const matched = foundServices[0]!;

			const basePrice = Number(matched.basePriceRub) || 0;
			const labCost = Number(matched.labCostRub) || 0;
			const materialsCost = Number(matched.materialsCostRub) || 0;
			const resolvedCost =
				labCost > 0
					? labCost
					: materialsCost > 0
						? materialsCost
						: 0;

			if (resolvedCost > 0 && basePrice > 0) {
				return { costRub: resolvedCost, priceRub: basePrice };
			}
		}
	} catch {
		// При сбоях запроса к serviceCatalogItems переходим к lab_items
	}

	// 2. Поиск в исторических позициях lab_items по типу материала
	try {
		const [historicalItem] = await tx
			.select({
				priceRub: labItems.priceRub,
				material: labItems.material,
			})
			.from(labItems)
			.where(
				and(
					eq(labItems.organizationId, orgId),
					or(
						eq(labItems.material, normalizedKey),
						ilike(labItems.material, `%${materialOrConstruction}%`),
					),
				),
			)
			.orderBy(labItems.createdAt)
			.limit(1);

		if (historicalItem && historicalItem.priceRub) {
			const parsedPrice = parseFloat(historicalItem.priceRub);
			if (parsedPrice > 0) {
				return { costRub: parsedPrice, priceRub: parsedPrice };
			}
		}
	} catch {
		// При сбоях запроса к lab_items переходим к каноническому фолбеку
	}

	// 3. Безопасный канонический фолбек по пресетам
	const matchedPreset = CANONICAL_DENTAL_LAB_PRESETS.find(
		(p) =>
			p.constructionType === normalizedKey ||
			p.id.includes(normalizedKey) ||
			materialOrConstruction.toLowerCase().includes(p.shortTitle.toLowerCase()),
	);

	const defaultCostPerUnit = matchedPreset
		? matchedPreset.suggestedCostRub
		: (MATERIAL_TURNAROUND_DAYS_MAP[normalizedKey]?.baseCostRub ?? 0);

	const defaultPricePerUnit = matchedPreset
		? matchedPreset.suggestedPriceRub
		: defaultCostPerUnit;

	return { costRub: defaultCostPerUnit, priceRub: defaultPricePerUnit };
}

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
		baseCostRub: 0,
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
	customCostPerUnit?: number | null;
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

	const defaultCostPerUnit = params.customCostPerUnit != null && params.customCostPerUnit >= 0
		? params.customCostPerUnit
		: matchedPreset
			? matchedPreset.suggestedCostRub
			: (MATERIAL_TURNAROUND_DAYS_MAP[normalizedKey]?.baseCostRub ?? 0);

	const defaultPricePerUnit = matchedPreset
		? matchedPreset.suggestedPriceRub
		: defaultCostPerUnit;

	const estimatedCostRub = defaultCostPerUnit * units;
	const suggestedPriceRub = params.priceRub != null && params.priceRub >= 0
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
 * Асинхронный расчет стоимости и наценки с обращением к реальным ценам в БД
 */
export async function calculateLabOrderCostAndMarkupAsync(
	tx: TenantDb,
	orgId: string,
	params: {
		materialOrConstruction: string;
		priceRub?: number | null;
		unitsCount?: number;
		laboratoryId?: string | null;
	},
): Promise<LabOrderCostBreakdown> {
	const resolvedPrices = await fetchLabPriceFromDb(
		tx,
		orgId,
		params.materialOrConstruction,
		params.laboratoryId,
	);

	const resolvedOptions: {
		materialOrConstruction: string;
		priceRub?: number | null;
		unitsCount?: number;
		customCostPerUnit?: number | null;
	} = {
		materialOrConstruction: params.materialOrConstruction,
		priceRub: params.priceRub ?? resolvedPrices.priceRub,
		customCostPerUnit: resolvedPrices.costRub,
	};
	if (params.unitsCount !== undefined) {
		resolvedOptions.unitsCount = params.unitsCount;
	}

	return calculateLabOrderCostAndMarkup(resolvedOptions);
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
