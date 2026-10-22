import * as React from "react";
import type { PipelineResponse, PipelineStageFilter } from "./types";
import { formatRub, PIPELINE_STAGES, STAGE_CONFIG } from "./types";

export interface PipelineKpiSummaryProps {
	data: PipelineResponse;
	selectedStage?: PipelineStageFilter;
	onSelectStage?: (stage: PipelineStageFilter) => void;
}

export const PipelineKpiSummary: React.FC<PipelineKpiSummaryProps> = ({
	data,
	selectedStage = "all",
	onSelectStage,
}) => {
	const isTotalActive = selectedStage === "all";
	const analytics = data.summary.analytics;

	return (
		<div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
			{/* All Stages (Total) Button */}
			<button
				type="button"
				onClick={() => onSelectStage?.("all")}
				className={`p-3 rounded-2xl border text-left shadow-sm space-y-1 transition cursor-pointer relative ${
					isTotalActive
						? "bg-[var(--paper-soft)] shadow-md"
						: "bg-[var(--paper)] hover:border-[var(--line-strong)] hover:shadow-md"
				}`}
				style={{
					padding: "12px 14px",
					borderRadius: "14px",
					borderTop: "3px solid var(--teal, #0d9488)",
					borderColor: isTotalActive ? "var(--teal, #0d9488)" : "var(--line)",
				}}
			>
				<div className="flex items-center justify-between gap-1">
					<div className="text-[11px] font-semibold text-[var(--muted)] truncate">
						Все этапы
					</div>
					{isTotalActive && (
						<span className="w-2 h-2 rounded-full bg-[var(--teal,#0d9488)] shrink-0" title="Выбран" />
					)}
				</div>
				<div className="text-base sm:text-lg font-bold font-mono tracking-tight text-[var(--teal,#0d9488)] flex items-center justify-between">
					<span>
						{data.summary.counts.total}{" "}
						<span className="text-xs font-normal text-[var(--muted)]">пл.</span>
					</span>
					{analytics && (
						<span
							className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold"
							title="Acceptance Rate: процент принятых планов лечения"
						>
							CR {analytics.acceptanceRatePercent}%
						</span>
					)}
				</div>
				<div className="flex items-center justify-between text-[11px] font-semibold text-[var(--text)] truncate">
					<span className="truncate">{formatRub(data.summary.totalsRub.total)}</span>
					{Boolean(analytics?.averagePlanRub) && (
						<span className="text-[10px] text-[var(--muted)] font-mono ml-1 shrink-0" title="Средний чек комплексного плана">
							~{formatRub(analytics!.averagePlanRub)}
						</span>
					)}
				</div>
			</button>

			{/* 5 Stages */}
			{PIPELINE_STAGES.map((stg) => {
				const cfg = STAGE_CONFIG[stg];
				const count = data.summary.counts[stg] || 0;
				const totalRub = data.summary.totalsRub[stg] || 0;
				const isActive = selectedStage === stg;

				return (
					<button
						key={stg}
						type="button"
						onClick={() => onSelectStage?.(stg)}
						className={`p-3 rounded-2xl border text-left shadow-sm space-y-1 transition cursor-pointer relative ${
							isActive
								? "bg-[var(--paper-soft)] shadow-md"
								: "bg-[var(--paper)] hover:border-[var(--line-strong)] hover:shadow-md"
						}`}
						style={{
							padding: "12px 14px",
							borderRadius: "14px",
							borderTop: `3px solid ${cfg.accentColor}`,
							borderColor: isActive ? "var(--teal, #0d9488)" : "var(--line)",
						}}
					>
						<div className="flex items-center justify-between gap-1">
							<div className="text-[11px] font-semibold text-[var(--muted)] truncate">
								{cfg.title}
							</div>
							{isActive && (
								<span className="w-2 h-2 rounded-full bg-[var(--teal,#0d9488)] shrink-0" title="Выбран" />
							)}
						</div>
						<div className="text-base sm:text-lg font-bold font-mono tracking-tight text-[var(--text)]">
							{count}{" "}
							<span className="text-xs font-normal text-[var(--muted)]">пл.</span>
						</div>
						<div className="text-[11px] font-semibold text-[var(--text)] truncate">
							{formatRub(totalRub)}
						</div>
					</button>
				);
			})}
		</div>
	);
};
