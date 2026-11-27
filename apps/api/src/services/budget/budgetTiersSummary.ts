import { and, eq } from "drizzle-orm";
import {
	percentageOfKopecks,
	rublesToKopecks,
	splitKopecks,
	toExactKopecks,
} from "@dental/shared";
import { withTenantCtx } from "../../db/rls.js";
import { treatmentPlans } from "../../db/schema.js";
import type { PublicBudgetTierSummary } from "../portalBudget/types.js";

const NDFL_ANNUAL_LIMIT_KOPECKS = rublesToKopecks(150000);

type TierKey = "economy" | "optimum" | "premium";

const TIER_META: Record<
	TierKey,
	{
		readonly title: string;
		readonly badgeText?: string;
		readonly description: string;
		readonly isRecommended?: boolean;
	}
> = {
	economy: {
		title: "Эконом",
		description: "Базовое клиническое решение",
	},
	optimum: {
		title: "Оптимум",
		badgeText: "★ Оптимум",
		description: "Рекомендуемый баланс долговечности и эстетики",
		isRecommended: true,
	},
	premium: {
		title: "Премиум",
		description: "Максимальная эстетика, премиальные материалы и расширенная гарантия",
	},
};

function computeTierInstallmentAndTax(netTotalKopecks: number): {
	readonly monthly12mKopecks: number;
	readonly taxDeduction13Kopecks: number;
} {
	const safeKop = toExactKopecks(Math.max(0, Math.round(netTotalKopecks)));
	const installmentParts = splitKopecks(safeKop, 12);
	const monthly12mKopecks = installmentParts[0] ?? 0;
	const ndflBaseKop = toExactKopecks(Math.min(safeKop, NDFL_ANNUAL_LIMIT_KOPECKS));
	const taxDeduction13Kopecks = percentageOfKopecks(ndflBaseKop, 1300);
	return { monthly12mKopecks, taxDeduction13Kopecks };
}

function normalizeTierKey(rawTier: string | null | undefined): TierKey | null {
	if (!rawTier) return null;
	const lower = rawTier.trim().toLowerCase();
	if (lower === "economy" || lower === "эконом") return "economy";
	if (lower === "optimum" || lower === "standard" || lower === "оптимум") return "optimum";
	if (lower === "premium" || lower === "премиум") return "premium";
	return null;
}

export function resolvePlanNetKopecks(plan: {
	totalPriceKopecks: bigint | number | null;
	totalPriceRub: string | number | null;
	totalPrice: string | number | null;
	planDiscountKopecks?: bigint | number | null | undefined;
	planDiscountRub?: string | number | null | undefined;
}): { readonly netKopecks: number; readonly discountKopecks: number } {
	const grossKop =
		plan.totalPriceKopecks != null &&
		(Number(plan.totalPriceKopecks) !== 0 || Number(plan.totalPriceRub ?? plan.totalPrice ?? 0) === 0)
			? Math.round(Number(plan.totalPriceKopecks))
			: rublesToKopecks(Number(plan.totalPriceRub ?? plan.totalPrice ?? 0) || 0);
	const discKop =
		plan.planDiscountKopecks != null &&
		(Number(plan.planDiscountKopecks) !== 0 || Number(plan.planDiscountRub ?? 0) === 0)
			? Math.round(Number(plan.planDiscountKopecks))
			: rublesToKopecks(Number(plan.planDiscountRub ?? 0) || 0);
	return {
		netKopecks: Math.max(0, grossKop - discKop),
		discountKopecks: Math.max(0, discKop),
	};
}

export function buildDerived3TierSummary(
	baseNetTotalKopecks: number,
	baseDiscountKopecks: number,
	anchorTier: TierKey = "optimum",
	planIdsByTier?: Partial<Record<TierKey, string>>,
	realTotalsByTier?: Partial<
		Record<TierKey, { readonly netKopecks: number; readonly discountKopecks: number }>
	>,
): {
	readonly tiersSummary: PublicBudgetTierSummary[];
	readonly defaultSelectedTierId: TierKey;
} {
	const safeBase = toExactKopecks(Math.max(0, Math.round(baseNetTotalKopecks)));
	let optimumAnchorKop = safeBase;
	if (anchorTier === "economy" && safeBase > 0) {
		optimumAnchorKop = percentageOfKopecks(safeBase, 13500);
	} else if (anchorTier === "premium" && safeBase > 0) {
		optimumAnchorKop = percentageOfKopecks(safeBase, 7500);
	}

	const derivedTotals: Record<TierKey, number> = {
		economy:
			anchorTier === "economy"
				? safeBase
				: percentageOfKopecks(optimumAnchorKop, 7500),
		optimum: optimumAnchorKop,
		premium:
			anchorTier === "premium"
				? safeBase
				: percentageOfKopecks(optimumAnchorKop, 13500),
	};

	const keys: readonly TierKey[] = ["economy", "optimum", "premium"];
	const tiersSummary: PublicBudgetTierSummary[] = keys.map((tierId) => {
		const real = realTotalsByTier?.[tierId];
		const netTotalKopecks = real ? real.netKopecks : derivedTotals[tierId];
		const discountKopecks = real ? real.discountKopecks : baseDiscountKopecks;
		const { monthly12mKopecks, taxDeduction13Kopecks } =
			computeTierInstallmentAndTax(netTotalKopecks);
		const meta = TIER_META[tierId];
		const matchedPlanId = planIdsByTier?.[tierId];

		return {
			tierId,
			title: meta.title,
			...(meta.badgeText ? { badgeText: meta.badgeText } : {}),
			...(matchedPlanId ? { planId: matchedPlanId } : {}),
			netTotalKopecks,
			discountKopecks,
			monthly12mKopecks,
			taxDeduction13Kopecks,
			description: meta.description,
			...(meta.isRecommended ? { isRecommended: true } : {}),
		};
	});

	return {
		tiersSummary,
		defaultSelectedTierId: anchorTier,
	};
}

export async function loadPublicBudgetTiersSummary(params: {
	readonly organizationId: string;
	readonly planId: string | null | undefined;
	readonly baseNetTotalKopecks: number;
	readonly baseDiscountKopecks: number;
}): Promise<{
	readonly tiersSummary: PublicBudgetTierSummary[];
	readonly selectedTierId: TierKey;
}> {
	const { organizationId, planId, baseNetTotalKopecks, baseDiscountKopecks } = params;
	if (!planId) {
		const built = buildDerived3TierSummary(
			baseNetTotalKopecks,
			baseDiscountKopecks,
			"optimum",
		);
		return {
			tiersSummary: built.tiersSummary,
			selectedTierId: built.defaultSelectedTierId,
		};
	}

	return withTenantCtx(organizationId, async (tx) => {
		const [anchorPlan] = await tx
			.select({
				id: treatmentPlans.id,
				planGroupId: treatmentPlans.planGroupId,
				alternativeTier: treatmentPlans.alternativeTier,
			})
			.from(treatmentPlans)
			.where(
				and(
					eq(treatmentPlans.id, planId),
					eq(treatmentPlans.organizationId, organizationId),
				),
			)
			.limit(1);

		const anchorTier = normalizeTierKey(anchorPlan?.alternativeTier) ?? "optimum";
		const planIdsByTier: Partial<Record<TierKey, string>> = {
			[anchorTier]: planId,
		};
		const realTotalsByTier: Partial<
			Record<TierKey, { readonly netKopecks: number; readonly discountKopecks: number }>
		> = {};

		if (anchorPlan?.planGroupId) {
			const siblings = await tx
				.select({
					id: treatmentPlans.id,
					alternativeTier: treatmentPlans.alternativeTier,
					totalPriceKopecks: treatmentPlans.totalPriceKopecks,
					totalPriceRub: treatmentPlans.totalPriceRub,
					totalPrice: treatmentPlans.totalPrice,
					planDiscountKopecks: treatmentPlans.planDiscountKopecks,
					planDiscountRub: treatmentPlans.planDiscountRub,
				})
				.from(treatmentPlans)
				.where(
					and(
						eq(treatmentPlans.organizationId, organizationId),
						eq(treatmentPlans.planGroupId, anchorPlan.planGroupId),
					),
				);

			for (const sib of siblings) {
				const tierKey = normalizeTierKey(sib.alternativeTier);
				if (!tierKey) continue;
				planIdsByTier[tierKey] = sib.id;
				realTotalsByTier[tierKey] = resolvePlanNetKopecks(sib);
			}
		}

		const built = buildDerived3TierSummary(
			baseNetTotalKopecks,
			baseDiscountKopecks,
			anchorTier,
			planIdsByTier,
			realTotalsByTier,
		);
		return {
			tiersSummary: built.tiersSummary,
			selectedTierId: built.defaultSelectedTierId,
		};
	});
}
