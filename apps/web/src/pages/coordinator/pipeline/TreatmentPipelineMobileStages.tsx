import * as React from "react";
import {
	type PipelineResponse,
	type PipelineStage,
	PIPELINE_STAGES,
	STAGE_CONFIG,
} from "./types";

export interface TreatmentPipelineMobileStagesProps {
	data: PipelineResponse | null;
	activeMobileStage: PipelineStage;
	onSelectMobileStage: (stage: PipelineStage) => void;
}

export const TreatmentPipelineMobileStages: React.FC<TreatmentPipelineMobileStagesProps> = ({
	data,
	activeMobileStage,
	onSelectMobileStage,
}) => {
	return (
		<div className="md:hidden" data-testid="pipeline-mobile-stages-bar">
			<div className="grid grid-cols-5 gap-1 p-1 bg-[var(--paper-soft)] rounded-xl border border-[var(--line-subtle)]">
				{PIPELINE_STAGES.map((stg) => {
					const cfg = STAGE_CONFIG[stg];
					const count = data?.summary.counts[stg] || 0;
					const isActive = activeMobileStage === stg;

					return (
						<button
							key={stg}
							type="button"
							onClick={() => onSelectMobileStage(stg)}
							className={`min-h-[48px] px-1 py-1 rounded-lg text-[10px] font-semibold transition flex flex-col items-center justify-center gap-0.5 touch-manipulation cursor-pointer ${
								isActive
									? "bg-[var(--paper)] text-[var(--ink)] shadow-sm border border-[var(--line)]"
									: "bg-transparent text-[var(--muted)] hover:bg-[var(--paper-hover)]/30 hover:text-[var(--ink)] border border-transparent"
							}`}
							style={isActive ? { borderBottom: `2.5px solid ${cfg.accentColor}` } : undefined}
							data-testid={`pipeline-mobile-stage-${stg}`}
						>
							<span
								className="px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold leading-none"
								style={{
									backgroundColor: cfg.badgeBg,
									color: cfg.badgeText,
								}}
							>
								{count}
							</span>
							<span className="leading-tight whitespace-nowrap">{cfg.shortTitle}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
};
