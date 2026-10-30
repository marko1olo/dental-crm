import React from "react";
import { Check } from "lucide-react";
import { formatKopecksToRubExact } from "../roadmapPriceHelpers.js";
import type { RoadmapStageData } from "../types.js";

interface TableProps {
	readonly stage: RoadmapStageData;
}

export const RoadmapStageProceduresTable: React.FC<TableProps> = ({ stage }) => {
	return (
		<div className="roadmap-procedures-table">
			{stage.procedures.length > 0 ? (
				stage.procedures.map((proc) => {
					const lineKopecks =
						(typeof proc.priceKopecks === "number" ? proc.priceKopecks : Math.round((proc.priceRub || 0) * 100)) *
						(typeof proc.quantity === "number" ? proc.quantity : 1);

					return (
						<div key={proc.id} className="roadmap-proc-row">
							<div className="flex-1 min-w-0">
								<div className="roadmap-proc-title flex items-center flex-wrap gap-1">
									{(proc.serviceCode || proc.code804n) && <span className="roadmap-proc-code-tag">{proc.serviceCode || proc.code804n}</span>}
									<span>{proc.patientFriendlyTitleRu}</span>
									{proc.toothNumber && (
										<span className="text-[var(--muted,var(--ink-muted))] text-xs ml-1.5">
											(зуб {proc.toothNumber})
										</span>
									)}
									{proc.isCompleted && (
										<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-1.5">
											<Check className="w-3 h-3" /> Выполнено
										</span>
									)}
								</div>
								{proc.medicalTitleRu !== proc.patientFriendlyTitleRu && (
									<div className="text-xs text-[var(--muted,var(--ink-muted))] mt-0.5">
										Мед. номенклатура: {proc.medicalTitleRu}
									</div>
								)}
							</div>

							<div className="roadmap-proc-price">
								{formatKopecksToRubExact(lineKopecks)} ₽
							</div>
						</div>
					);
				})
			) : (
				<div className="text-xs text-[var(--muted,var(--ink-muted))] py-2 text-center">
					Процедуры для данного этапа будут сформированы после завершения предыдущего шага
				</div>
			)}
		</div>
	);
};
