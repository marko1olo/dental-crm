import type { PlanItemForValidation } from "@dental/shared";
import type {
	CatalogRow,
	GenerateInvoiceItemInput,
	PriceFreezeTokenResult,
	TreatmentPlanItemRow,
	TreatmentPlanRow,
} from "../types.js";
import { resolvePlanDiscount, resolvePlanPrice } from "./planPriceDiscountResolver.js";

export function buildPlanItemsForValidation(params: {
	items: GenerateInvoiceItemInput[];
	catalogRows: CatalogRow[];
	freezeToken: PriceFreezeTokenResult;
	targetPlanDbItems: TreatmentPlanItemRow[];
	targetPlan: TreatmentPlanRow | null;
	isPriceLockedFinal: boolean;
	isAdminOverrideVerified: boolean;
}): PlanItemForValidation[] {
	const {
		items,
		catalogRows,
		freezeToken,
		targetPlanDbItems,
		targetPlan,
		isPriceLockedFinal,
		isAdminOverrideVerified,
	} = params;

	return items.map((it, idx) => {
		const matchingCatalog = catalogRows.find(
			(c) =>
				(it.serviceId && c.id === it.serviceId) ||
				(it.code804n && c.code === it.code804n),
		);

		const itemServiceId = it.serviceId || it.analogueServiceId;
		const frozenItem = freezeToken?.frozenPrices?.find((fp) => {
			if (itemServiceId && fp.serviceId === itemServiceId) return true;
			if (it.nameRu && fp.title === it.nameRu) return true;
			if (it.code804n && fp.code804n === it.code804n) return true;
			return false;
		});

		const resolvedToothNumber =
			it.toothNumber !== undefined && it.toothNumber !== null
				? Number(it.toothNumber) || null
				: it.tooth_number !== undefined && it.tooth_number !== null
					? Number(it.tooth_number) || null
					: null;

		const matchingDbPlanItem = targetPlanDbItems.find((pi) => {
			if (it.serviceId && pi.priceId?.startsWith(it.serviceId)) return true;
			if (it.nameRu && pi.priceId?.includes(it.nameRu)) return true;
			if (resolvedToothNumber !== null && pi.toothNumber === resolvedToothNumber) return true;
			return false;
		});

		const { planPriceRub, effectivePriceRub } = resolvePlanPrice({
			it,
			matchingCatalog,
			matchingDbPlanItem,
			freezeToken,
			frozenItem,
			isPriceLockedFinal,
			isAdminOverrideVerified,
		});

		const discountRub = resolvePlanDiscount({
			it,
			targetPlan,
			frozenItem,
			matchingDbPlanItem,
			effectivePriceRub,
		});

		return {
			itemId: it.itemId || it.serviceId || `item-${idx + 1}`,
			toothNumber: resolvedToothNumber,
			surfaces: it.surfaces || [],
			code804n: it.code804n || matchingCatalog?.code || "A16.07.001",
			nameRu: it.nameRu,
			categoryRu: it.categoryRu || matchingCatalog?.category || "Терапия",
			quantity: it.quantity,
			planUnitPriceKopecks: Math.round(planPriceRub * 100),
			planDiscountKopecks: Math.round(discountRub * 100),
			...(it.analogueServiceId || it.serviceId
				? { serviceId: it.analogueServiceId || it.serviceId }
				: {}),
		};
	});
}
