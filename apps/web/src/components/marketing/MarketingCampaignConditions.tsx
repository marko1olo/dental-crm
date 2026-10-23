/**
 * MarketingCampaignConditions.tsx — Promotion Conditions Strip.
 * Governed by Mandate 8b (<= 120 lines).
 */

import React from "react";
import { Info } from "lucide-react";

export interface MarketingCampaignConditionsProps {
	readonly conditions: readonly string[];
}

export const MarketingCampaignConditions: React.FC<MarketingCampaignConditionsProps> = ({
	conditions,
}) => {
	if (!conditions || conditions.length === 0) return null;

	return (
		<div className="marketing-conditions-strip">
			<Info size={14} className="marketing-conditions-icon" aria-hidden="true" />
			<div className="marketing-conditions-list">
				{conditions.map((cond, idx) => (
					<span key={cond} className="marketing-condition-item">
						• {cond}
						{idx < conditions.length - 1 ? "  " : ""}
					</span>
				))}
			</div>
		</div>
	);
};
