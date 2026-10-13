/**
 * PriceValidatorStarTab.tsx — Вкладка стандартов и клинических протоколов СтАР (DENTE CRM).
 *
 * Содержит:
 * 1. Фильтр и статус соответствия клиническим рекомендациям СтАР.
 * 2. Список проверок с отображением замечаний, рекомендаций и нормативных актов.
 */

import type React from "react";
import { AlertCircle, AlertTriangle, Award, CheckCircle2 } from "lucide-react";
import type {
	StarProtocolRuleCheck,
	TreatmentPlanStarValidationReport,
} from "./starProtocolValidationEngine";

export type StarProtocolSeverityFilter = "all" | "warnings_errors" | "passed";

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
			{/* Protocol Filter & Summary Bar */}
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
						Замечания ({starValidation.warningsCount + starValidation.errorsCount})
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

			{/* List of Rule Checks */}
			<div className="space-y-3">
				{filteredStarChecks.map((check) => (
					<div
						key={check.ruleId}
						className={`p-4 rounded-2xl border text-xs space-y-1.5 ${
							check.status === "pass"
								? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-900 dark:text-emerald-200"
								: check.status === "warning"
									? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-500/30 text-amber-900 dark:text-amber-200"
									: "bg-rose-50/50 dark:bg-rose-950/20 border-rose-500/30 text-rose-900 dark:text-rose-200"
						}`}
					>
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								{check.status === "pass" && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
								{check.status === "warning" && <AlertTriangle size={16} className="text-amber-600 shrink-0" />}
								{check.status === "error" && <AlertCircle size={16} className="text-rose-600 shrink-0" />}
								<strong className="text-sm font-bold">
									{check.protocolTitleRu}
								</strong>
								{check.toothNumber && (
									<span className="px-2 py-0.5 rounded-md bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] font-mono font-bold text-[11px]">
										Зуб №{check.toothNumber}
									</span>
								)}
							</div>

							<span
								className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
									check.status === "pass"
										? "bg-emerald-600 text-white"
										: check.status === "warning"
											? "bg-amber-600 text-white"
											: "bg-rose-600 text-white"
								}`}
							>
								{check.status === "pass" ? "Соответствует" : check.status === "warning" ? "Рекомендация" : "Дефект"}
							</span>
						</div>

						<p className="text-[var(--ink)] font-medium">
							{check.messageRu}
						</p>

						{check.recommendationRu && (
							<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line-subtle)] text-[var(--ink)]">
								<strong className="text-[var(--teal,var(--brand-primary))]">Клиническая рекомендация:</strong> {check.recommendationRu}
							</div>
						)}

						<div className="flex justify-between items-center text-[10px] text-[var(--muted)] pt-1">
							<span>Норматив: {check.normativeRefRu}</span>
							{check.order804nCodesRelated.length > 0 && (
								<span className="font-mono">
									Коды услуг: {check.order804nCodesRelated.join(", ")}
								</span>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export default PriceValidatorStarTab;
