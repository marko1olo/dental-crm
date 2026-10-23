import type {
	CatalogServiceLookup,
	PlanToInvoiceValidationPayload,
	PriceLockResolutionPolicy,
} from "@dental/shared";
import type {
	CatalogRow,
	PriceFreezeTokenResult,
	ValidatePlanBody,
} from "../types.js";

export function mapCatalogRowsToLookup(
	catalogRows: CatalogRow[],
): CatalogServiceLookup[] {
	return catalogRows.map((c) => ({
		id: c.id,
		code804n: c.code,
		title: c.title,
		category: c.category,
		basePriceKopecks: Math.round(Number(c.basePriceRub || 0) * 100),
		active: c.active !== false,
		isArchived: c.active === false,
		decree458Expensive: false,
		uetAdult: 1.0,
	}));
}

export function buildValidatePlanPayload(
	parsedData: ValidatePlanBody,
	catalogLookup: CatalogServiceLookup[],
	freezeTokenForValidation: PriceFreezeTokenResult,
): PlanToInvoiceValidationPayload {
	return {
		planId: parsedData.planId,
		planNumber: parsedData.planNumber,
		planTitle: parsedData.planTitle,
		patientId: parsedData.patientId,
		patientName: parsedData.patientName,
		doctorId: parsedData.doctorId,
		doctorFullName: parsedData.doctorFullName,
		planCreatedAtIso: parsedData.planCreatedAtIso,
		approvedAtIso: parsedData.approvedAtIso,
		isSignedWithPatient: parsedData.isSignedWithPatient,
		isPriceLocked: freezeTokenForValidation
			? freezeTokenForValidation.isPriceLocked
			: undefined,
		isPlanExpired: freezeTokenForValidation?.isExpired,
		validityDaysLimit:
			parsedData.validityDaysLimit ?? freezeTokenForValidation?.daysRemaining,
		inflationThresholdPercent:
			parsedData.inflationThresholdPercent ??
			freezeTokenForValidation?.inflationThresholdPercent,
		items: parsedData.items.map((it) => ({
			itemId: it.itemId,
			code804n: it.code804n,
			nameRu: it.nameRu,
			categoryRu: it.categoryRu || "Терапия",
			quantity: it.quantity,
			planUnitPriceKopecks: it.planUnitPriceKopecks,
			planDiscountKopecks: it.planDiscountKopecks || 0,
			toothNumber:
				it.toothNumber !== undefined && it.toothNumber !== null
					? Number(it.toothNumber) || null
					: it.tooth_number !== undefined && it.tooth_number !== null
						? Number(it.tooth_number) || null
						: null,
			surfaces: it.surfaces || [],
			...(it.serviceId !== undefined ? { serviceId: it.serviceId } : {}),
			...(it.stageId !== undefined ? { stageId: it.stageId } : {}),
			...(it.stageTitleRu !== undefined
				? { stageTitleRu: it.stageTitleRu }
				: {}),
		})),
		catalog: catalogLookup,
		itemResolutionOverrides: parsedData.itemResolutionOverrides as
			| Record<string, PriceLockResolutionPolicy>
			| undefined,
		itemAnalogueSelections: parsedData.itemAnalogueSelections,
		adminOverrideAuthorized: parsedData.adminOverrideAuthorized,
		adminOverrideStaffName: parsedData.adminOverrideStaffName,
		adminOverrideReason: parsedData.adminOverrideReason,
	};
}
