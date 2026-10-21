import type React from "react";
import { Check, CheckCircle2, ChevronDown, ChevronUp, Clock } from "lucide-react";
import type { RoadmapStageData } from "../types.js";

interface HeaderProps {
	readonly stage: RoadmapStageData;
	readonly isExpanded: boolean;
	readonly onToggle: () => void;
}

export const RoadmapStageHeader: React.FC<HeaderProps> = ({ stage, isExpanded, onToggle }) => {
	return (
		<div className="roadmap-stage-header">
			<div className="flex items-start gap-3 flex-1 min-w-0">
				<div className={`roadmap-stage-num-badge ${stage.status}`}>
					{stage.status === "completed" ? <Check className="w-4 h-4" /> : <span>{stage.stageNumber}</span>}
				</div>

				<div className="roadmap-stage-title-wrap">
					<div className="flex items-center gap-2">
						<span className="roadmap-stage-name">{stage.titleRu}</span>
					</div>
					<div className="roadmap-stage-desc">{stage.subtitleRu}</div>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<div className={`roadmap-stage-status-badge ${stage.status}`}>
					{stage.status === "completed" && (
						<>
							<CheckCircle2 className="w-3.5 h-3.5" />
							<span>✓ Этап выполнен</span>
						</>
					)}
					{stage.status === "in_progress" && (
						<>
							<Clock className="w-3.5 h-3.5" />
							<span>В процессе</span>
						</>
					)}
					{stage.status === "planned" && <span>Запланировано</span>}
				</div>

				{stage.status === "completed" && (
					<span
						className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shrink-0"
						data-testid={`stage-paid-badge-${stage.stageNumber}`}
					>
						<Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 stroke-[3]" />
						<span>✓ ОПЛАЧЕНО 100%</span>
					</span>
				)}

				<button
					type="button"
					onClick={onToggle}
					className="p-1.5 min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:min-w-[32px] sm:h-8 sm:w-8 rounded-lg hover:bg-[var(--paper-soft,#1e293b)] text-[var(--muted,var(--ink-muted))] hover:text-[var(--ink)] cursor-pointer inline-flex items-center justify-center transition-colors"
					aria-label={isExpanded ? "Свернуть" : "Развернуть"}
					data-testid={`toggle-stage-btn-${stage.stageNumber}`}
				>
					{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
				</button>
			</div>
		</div>
	);
};
