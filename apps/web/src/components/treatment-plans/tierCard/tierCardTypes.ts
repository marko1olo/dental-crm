import type React from "react";
import type { TreatmentPlanTier, TreatmentPlanTierId } from "../types";

export function formatServiceLifeYearsText(
	serviceLifeYears: string | number | undefined,
	tierId: TreatmentPlanTierId,
): string {
	if (serviceLifeYears !== undefined && serviceLifeYears !== null && serviceLifeYears !== "") {
		if (typeof serviceLifeYears === "number") return `${serviceLifeYears} лет`;
		return String(serviceLifeYears);
	}
	if (tierId === "economy") return "до 5–7 лет";
	if (tierId === "standard") return "15–20 лет";
	if (tierId === "optimum") return "25+ лет (пожизненно)";
	return "10–15 лет";
}

export interface TreatmentPlanTierCardProps {
	readonly tier: TreatmentPlanTier;
	readonly isSelected: boolean;
	readonly isMobile: boolean;
	readonly activePaymentMode: "installment" | "staged" | "discount";
	readonly installmentMonths: 3 | 6 | 12 | 24;
	readonly showNdflBreakdown: boolean;
	readonly isExpandedStages: boolean;
	readonly copiedMessengerTierId: TreatmentPlanTierId | null;
	readonly onCardClick: (tier: TreatmentPlanTier) => void;
	readonly onSignClick: (e: React.MouseEvent, tier: TreatmentPlanTier) => void;
	readonly onInstallmentClick: (e: React.MouseEvent, tier: TreatmentPlanTier) => void;
	readonly onCopyMessengerClick: (e: React.MouseEvent, tier: TreatmentPlanTier) => void;
	readonly onPrintClick?: ((e: React.MouseEvent, tier: TreatmentPlanTier) => void) | undefined;
	readonly onToggleStagesExpand: (e: React.MouseEvent, tierId: TreatmentPlanTierId) => void;
}
