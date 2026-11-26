import * as React from "react";
import { createPortal } from "react-dom";
import { RefreshCw, ShieldAlert } from "lucide-react";
import {
	type PipelineResponse,
	type PipelineStage,
	formatRub,
	STAGE_CONFIG,
} from "./types";

export interface TreatmentPipelineMobileFloatingBarProps {
	data: PipelineResponse | null;
	activeMobileStage: PipelineStage;
	dropoutRiskCount: number;
	isRunningDropout: boolean;
	isLoading: boolean;
	isHidden?: boolean | undefined;
	onRunDropoutPrevention: () => void;
	onRefresh: () => void;
}

export const TreatmentPipelineMobileFloatingBar: React.FC<TreatmentPipelineMobileFloatingBarProps> = ({
	data,
	activeMobileStage,
	dropoutRiskCount,
	isRunningDropout,
	isLoading,
	isHidden = false,
	onRunDropoutPrevention,
	onRefresh,
}) => {
	if (!data || isHidden || typeof document === "undefined" || !document.body) {
		return null;
	}

	const stageConfig = STAGE_CONFIG[activeMobileStage];
	const stageCards = data.pipeline[activeMobileStage] || [];
	const stageTotalRub = stageCards.reduce((acc, c) => acc + (Math.round(c.netTotalRub) || 0), 0);

	return createPortal(
		<div
			className="md:hidden fixed left-0 right-0 z-40 px-3.5 py-2 backdrop-blur-xl shadow-lg flex items-center justify-between gap-3"
			style={{
				bottom: "calc(56px + env(safe-area-inset-bottom, 0px))",
				backgroundColor: "var(--paper)",
				borderTop: "1px solid var(--line)",
			}}
			data-testid="pipeline-mobile-floating-thumb-bar"
		>
			<div className="flex flex-col min-w-0 flex-1">
				<div className="flex items-center gap-1.5 text-[11px] text-[var(--ink-muted)] font-medium truncate">
					<span
						className="w-2 h-2 rounded-full shrink-0"
						style={{ backgroundColor: stageConfig?.accentColor || "var(--teal, #0d9488)" }}
					/>
					<span className="truncate font-bold text-[var(--ink)]">
						{stageConfig?.title || "Воронка"}
					</span>
					<span className="text-[10px] text-[var(--ink-muted)] font-mono shrink-0">
						({stageCards.length} пл.)
					</span>
				</div>
				<div
					className="text-sm font-extrabold font-mono whitespace-nowrap"
					style={{ color: "var(--teal, #0d9488)" }}
				>
					{formatRub(stageTotalRub)}
				</div>
			</div>

			<div className="flex items-center gap-1.5">
				{dropoutRiskCount > 0 && (
					<button
						type="button"
						onClick={() => {
							if (!isRunningDropout) onRunDropoutPrevention();
						}}
						className="min-h-[44px] h-11 px-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1 touch-manipulation cursor-pointer"
						title="Контроль отвала"
					>
						<ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
						<span>{dropoutRiskCount}</span>
					</button>
				)}

				<button
					type="button"
					onClick={() => {
						if (!isLoading) onRefresh();
					}}
					className="min-h-[44px] h-11 px-4 rounded-xl border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium text-xs shadow-sm active:scale-98 flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all touch-manipulation"
					data-testid="pipeline-mobile-refresh-btn"
				>
					<RefreshCw className={`w-4 h-4 shrink-0 ${isLoading ? "animate-spin" : ""}`} />
					<span>Обновить</span>
				</button>
			</div>
		</div>,
		document.body,
	);
};
