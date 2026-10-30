/**
 * PriceValidatorStarTab.tsx — Вкладка стандартов и клинических протоколов СтАР (DENTE CRM).
 */

import React from "react";
import type {
	StarProtocolRuleCheck,
	TreatmentPlanStarValidationReport,
} from "./starProtocolValidationEngine";
import {
	StarProtocolSummaryBar,
	type StarProtocolSeverityFilter,
} from "./starTab/StarProtocolSummaryBar";
import { StarCheckCard } from "./starTab/StarCheckCard";

export type { StarProtocolSeverityFilter };

export interface PriceValidatorStarTabProps {
	readonly starValidation: TreatmentPlanStarValidationReport;
	readonly filteredStarChecks: readonly StarProtocolRuleCheck[];
	readonly protocolSeverityFilter: StarProtocolSeverityFilter;
	readonly onSeverityFilterChange: (filter: StarProtocolSeverityFilter) => void;
}

export const PriceValidatorStarTab: React.FC<PriceValidatorStarTabProps> = ({
	starValidation,
	filteredStarChecks,
	protocolSeverityFilter,
	onSeverityFilterChange,
}) => {
	return (
		<div className="space-y-4">
			<StarProtocolSummaryBar
				starValidation={starValidation}
				protocolSeverityFilter={protocolSeverityFilter}
				onSeverityFilterChange={onSeverityFilterChange}
			/>

			<div className="space-y-3">
				{filteredStarChecks.map((check) => (
					<StarCheckCard key={check.ruleId} check={check} />
				))}
			</div>
		</div>
	);
};

export default PriceValidatorStarTab;
