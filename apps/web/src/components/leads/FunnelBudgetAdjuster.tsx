/**
 * DENTE Dental CRM — Funnel Budget Adjuster Component
 * Ban on reality simulators and fake click expense adjusters (THE HAMMER Mandate 25)
 */

import React from "react";
import type {
	CanonicalMarketingChannelKey,
	ChannelSpendMap,
} from "./leadsFunnelTypes";

export interface FunnelBudgetAdjusterProps {
	readonly isOpen: boolean;
	readonly customSpends: ChannelSpendMap;
	readonly onBudgetChange: (
		channelKey: CanonicalMarketingChannelKey,
		valueStr: string,
	) => void;
	readonly onResetBudgets: () => void;
}

export const FunnelBudgetAdjuster: React.FC<FunnelBudgetAdjusterProps> = () => {
	return null;
};
