import type React from "react";
import { AlertCircle, Clock, ShieldCheck } from "lucide-react";
import { formatFdiToothName } from "../../../portal/patientPortalEngine.js";
import { CANONICAL_ROADMAP_META } from "../roadmapPriceHelpers.js";
import type { RoadmapStageData } from "../types.js";

interface DetailsProps {
	readonly stage: RoadmapStageData;
}

export const RoadmapStageClinicalDetails: React.FC<DetailsProps> = ({ stage }) => {
	const meta = CANONICAL_ROADMAP_META[stage.stageKind] || CANONICAL_ROADMAP_META.stage_2_therapy;
	const completedProcsCount = stage.procedures.filter((p) => p.isCompleted).length;
	const percent = stage.procedures.length > 0 ? Math.round((completedProcsCount / stage.procedures.length) * 100) : 0;

	return (
		<>
			{stage.procedures.length > 0 && (
				<div className="roadmap-stage-progress-indicator" data-testid={`stage-progress-${stage.stageNumber}`}>
					<div className="flex items-center justify-between text-xs mb-1">
						<span className="font-medium text-[var(--muted,var(--ink-muted))]">Прогресс процедур:</span>
						<span className="font-semibold text-[var(--ink)]">
							{`Выполнено ${completedProcsCount} из ${stage.procedures.length} процедур (${percent}%)`}
						</span>
					</div>
					<div className="w-full h-1.5 rounded-full bg-[var(--paper-soft,#1e293b)] overflow-hidden border border-[var(--line-subtle,rgba(255,255,255,0.05))]">
						<div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${percent}%` }} />
					</div>
				</div>
			)}

			<div className="text-xs font-medium text-[var(--muted,var(--ink-muted))] bg-[var(--paper-soft)] p-3 rounded-xl border border-[var(--line)] mb-3 leading-relaxed">
				<strong className="text-[var(--ink)] font-bold">Цель этапа: </strong>
				{stage.patientGoalRu}
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3 text-xs">
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<div className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase flex items-center gap-1.5 mb-1">
						<Clock size={13} />
						<span>Сроки и длительность</span>
					</div>
					<div className="text-xs font-medium text-[var(--ink)] leading-relaxed">{stage.timelineRu || meta.timelineRu}</div>
				</div>

				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1.5 mb-1">
						<AlertCircle size={13} />
						<span>Подготовка пациента</span>
					</div>
					<div className="text-xs font-medium text-[var(--muted,var(--ink-muted))] leading-relaxed">{stage.preparationRu || meta.preparationRu}</div>
				</div>

				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)]">
					<div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5 mb-1">
						<ShieldCheck size={13} />
						<span>Гарантия клиники</span>
					</div>
					<div className="text-xs font-medium text-[var(--muted,var(--ink-muted))] leading-relaxed">{stage.warrantyRu || meta.warrantyRu}</div>
				</div>
			</div>

			{Boolean(stage.teethFdiList && stage.teethFdiList.length > 0) && (
				<div className="roadmap-teeth-row">
					<span className="text-xs font-medium text-[var(--muted,var(--ink-muted))] mr-1 self-center">Зубы:</span>
					{stage.teethFdiList.map((tooth) => (
						<span key={tooth} className="roadmap-tooth-tag" title={formatFdiToothName(tooth)}>{tooth}</span>
					))}
				</div>
			)}
		</>
	);
};
