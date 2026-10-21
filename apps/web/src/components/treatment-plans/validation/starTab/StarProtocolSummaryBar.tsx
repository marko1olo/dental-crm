import type React from "react";
import { Award } from "lucide-react";
import type { TreatmentPlanStarValidationReport } from "../starProtocolValidationEngine";

export type StarProtocolSeverityFilter = "all" | "warnings_errors" | "passed";

export interface StarProtocolSummaryBarProps {
	readonly starValidation: TreatmentPlanStarValidationReport;
	readonly protocolSeverityFilter: StarProtocolSeverityFilter;
	readonly onSeverityFilterChange: (filter: StarProtocolSeverityFilter) => void;
}

export const StarProtocolSummaryBar: React.FC<StarProtocolSummaryBarProps> = ({
	starValidation,
	protocolSeverityFilter,
	onSeverityFilterChange,
}) => {
	const warningsAndErrors = starValidation.warningsCount + starValidation.errorsCount;

	return (
		<div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] text-xs">
			<div className="flex items-center gap-2">
				<div className="p-2 rounded-xl bg-[var(--teal-soft,var(--paper-soft))] text-[var(--teal,var(--brand-primary))]">
					<Award size={16} />
				</div>
				<div>
					<span className="font-bold text-[var(--ink)]">
						Индекс соответствия клиническим протоколам СтАР: {starValidation.complianceScorePercent}%
					</span>
					<p className="text-[11px] text-[var(--muted)]">
						Проверено {starValidation.totalChecksCount} клинических правил по {starValidation.verifiedProceduresCount} процедурам
					</p>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<button
					type="button"
					onClick={() => onSeverityFilterChange("all")}
					className={`h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors inline-flex items-center justify-center ${
						protocolSeverityFilter === "all"
							? "bg-[var(--teal,var(--brand-primary))] text-white shadow-xs"
							: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					Все ({starValidation.totalChecksCount})
				</button>
				<button
					type="button"
					onClick={() => onSeverityFilterChange("warnings_errors")}
					className={`h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors inline-flex items-center justify-center ${
						protocolSeverityFilter === "warnings_errors"
							? "bg-amber-600 text-white shadow-xs"
							: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					Замечания ({warningsAndErrors})
				</button>
				<button
					type="button"
					onClick={() => onSeverityFilterChange("passed")}
					className={`h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors inline-flex items-center justify-center ${
						protocolSeverityFilter === "passed"
							? "bg-emerald-600 text-white shadow-xs"
							: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)]"
					}`}
				>
					Соответствуют ({starValidation.passedChecksCount})
				</button>
			</div>
		</div>
	);
};
