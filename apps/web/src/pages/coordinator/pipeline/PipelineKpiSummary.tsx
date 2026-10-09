import * as React from "react";
import type { PipelineResponse, PipelineStage } from "./types";
import { formatRub, PIPELINE_STAGES, STAGE_CONFIG } from "./types";

export interface PipelineKpiSummaryProps {
	data: PipelineResponse;
}

export const PipelineKpiSummary: React.FC<PipelineKpiSummaryProps> = ({ data }) => {
	return (
		<div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
			{PIPELINE_STAGES.map((stg) => {
				const cfg = STAGE_CONFIG[stg];
				const count = data.summary.counts[stg] || 0;
				const totalRub = data.summary.totalsRub[stg] || 0;
				return (
					<div
						key={stg}
						className="p-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-sm space-y-1 transition hover:border-[var(--line-strong)]"
						style={{ borderTop: `3px solid ${cfg.accentColor}` }}
					>
						<div className="text-[11px] font-medium text-[var(--muted)] truncate">
							{cfg.title}
						</div>
						<div className="text-base sm:text-lg font-bold font-mono tracking-tight text-[var(--text)]">
							{count} <span className="text-xs font-normal text-[var(--muted)]">пл.</span>
						</div>
						<div className="text-[11px] font-semibold text-[var(--text)] truncate">
							{formatRub(totalRub)}
						</div>
					</div>
				);
			})}

			{/* Total Volume */}
			<div
				className="p-3 rounded-2xl border border-[var(--line)] bg-[var(--paper)] shadow-sm space-y-1"
				style={{ borderTop: "3px solid var(--teal,#0d9488)" }}
			>
				<div className="text-[11px] font-medium text-[var(--muted)] truncate">
					Общий объём воронки
				</div>
				<div className="text-base sm:text-lg font-bold font-mono tracking-tight text-[var(--teal,#0d9488)]">
					{data.summary.counts.total}{" "}
					<span className="text-xs font-normal text-[var(--muted)]">пл.</span>
				</div>
				<div className="text-[11px] font-semibold text-[var(--teal,#0d9488)] truncate">
					{formatRub(data.summary.totalsRub.total)}
				</div>
			</div>
		</div>
	);
};
