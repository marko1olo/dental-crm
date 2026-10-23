import type {
	CatalogRow,
	FrozenPriceItem,
	GenerateInvoiceItemInput,
	PriceFreezeTokenResult,
	TreatmentPlanItemRow,
	TreatmentPlanRow,
} from "../types.js";

/** Resolves contract plan price considering price freeze token and locked estimates */
export function resolvePlanPrice(params: {
	it: GenerateInvoiceItemInput;
	matchingCatalog?: CatalogRow | undefined;
	matchingDbPlanItem?: TreatmentPlanItemRow | undefined;
	freezeToken: PriceFreezeTokenResult;
	frozenItem?: FrozenPriceItem | undefined;
	isPriceLockedFinal: boolean;
	isAdminOverrideVerified: boolean;
}): { planPriceRub: number; effectivePriceRub: number } {
	const {
		it,
		matchingCatalog,
		matchingDbPlanItem,
		freezeToken,
		frozenItem,
		isPriceLockedFinal,
		isAdminOverrideVerified,
	} = params;

	if (freezeToken?.isPriceLocked && frozenItem) {
		return {
			planPriceRub: frozenItem.lockedUnitPriceRub,
			effectivePriceRub: frozenItem.lockedUnitPriceRub,
		};
	}

	if (isPriceLockedFinal && matchingDbPlanItem) {
		const planItemPrice = Number(matchingDbPlanItem.price || 0);
		const planQty = Number(matchingDbPlanItem.quantity || 1);

		if (
			(it.effectiveUnitPriceRub !== undefined && it.effectiveUnitPriceRub === 0) ||
			(it.planUnitPriceRub !== undefined && it.planUnitPriceRub === 0)
		) {
			return { planPriceRub: 0, effectivePriceRub: 0 };
		}
		if (it.quantity > planQty && !isAdminOverrideVerified) {
			const price = Number(((planItemPrice * planQty) / it.quantity).toFixed(2));
			return { planPriceRub: price, effectivePriceRub: price };
		}
		return { planPriceRub: planItemPrice, effectivePriceRub: planItemPrice };
	}

	const planPriceRub =
		it.planUnitPriceRub ??
		(matchingDbPlanItem ? Number(matchingDbPlanItem.price || 0) : undefined) ??
		it.unitPriceRub ??
		Number(matchingCatalog?.basePriceRub ?? 0);
	const effectivePriceRub =
		it.effectiveUnitPriceRub ??
		it.planUnitPriceRub ??
		it.unitPriceRub ??
		Number(matchingCatalog?.basePriceRub ?? 0);

	return { planPriceRub, effectivePriceRub };
}

/** Resolves item discount according to plan discount mode */
export function resolvePlanDiscount(params: {
	it: GenerateInvoiceItemInput;
	targetPlan: TreatmentPlanRow | null;
	frozenItem?: FrozenPriceItem | undefined;
	matchingDbPlanItem?: TreatmentPlanItemRow | undefined;
	effectivePriceRub: number;
}): number {
	const { it, targetPlan, frozenItem, matchingDbPlanItem, effectivePriceRub } = params;
	let discountRub = it.discountRub ?? 0;
	const discountMode = targetPlan?.discountMode ?? "plan_fixed";

	if (discountMode === "none") {
		return 0;
	}

	if (discountMode === "plan_fixed") {
		if (it.discountRub !== undefined && it.discountRub > 0) {
			return it.discountRub;
		}
		if (frozenItem && frozenItem.lockedDiscountRub > 0) {
			return Number((frozenItem.lockedDiscountRub * it.quantity).toFixed(2));
		}
		if (matchingDbPlanItem && Number(matchingDbPlanItem.discount || 0) > 0) {
			return Number((Number(matchingDbPlanItem.discount) * it.quantity).toFixed(2));
		}
		if (Number(targetPlan?.planDiscountPercent ?? 0) > 0) {
			const lineGross = effectivePriceRub * it.quantity;
			return Number(((lineGross * Number(targetPlan?.planDiscountPercent)) / 100).toFixed(2));
		}
		return discountRub;
	}

	if (discountMode === "on_selection") {
		const patientDiscountPercent = Number(targetPlan?.planDiscountPercent ?? 0);
		if (patientDiscountPercent > 0) {
			const lineGross = effectivePriceRub * it.quantity;
			return Number(((lineGross * patientDiscountPercent) / 100).toFixed(2));
		}
	}

	return discountRub;
}
