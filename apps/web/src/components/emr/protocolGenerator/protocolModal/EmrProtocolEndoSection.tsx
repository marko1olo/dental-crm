import React from "react";
import type { EmrEndoStage } from "./types";

export interface EmrProtocolEndoSectionProps {
	readonly selectedCanals: number;
	readonly onChangeCanals: (canals: number) => void;
	readonly selectedEndoStage: EmrEndoStage;
	readonly onChangeEndoStage: (stage: EmrEndoStage) => void;
}

export const EmrProtocolEndoSection: React.FC<EmrProtocolEndoSectionProps> = React.memo(
	function EmrProtocolEndoSection({
		selectedCanals,
		onChangeCanals,
		selectedEndoStage,
		onChangeEndoStage,
	}) {
		return (
			<div className="p-3.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] space-y-2">
				<label className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)] block">
					Параметры эндодонтии
				</label>
				<div className="grid grid-cols-2 gap-2">
					<div>
						<span className="text-[11px] font-medium text-[var(--muted,#64748b)] block mb-1">Каналы:</span>
						<select
							value={selectedCanals}
							onChange={(e) => onChangeCanals(parseInt(e.target.value, 10) || 3)}
							className="w-full px-2.5 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs font-bold cursor-pointer"
						>
							{[1, 2, 3, 4].map((c) => <option key={c} value={c}>{c} канал(а)</option>)}
						</select>
					</div>
					<div>
						<span className="text-[11px] font-medium text-[var(--muted,#64748b)] block mb-1">Этап:</span>
						<select
							value={selectedEndoStage}
							onChange={(e) => onChangeEndoStage(e.target.value as EmrEndoStage)}
							className="w-full px-2.5 py-2 min-h-[44px] rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] text-xs font-bold cursor-pointer"
						>
							<option value="single_visit_complete">В 1 посещение</option>
							<option value="access_instrumentation_temporary_calcium">Временный Ca(OH)2</option>
							<option value="final_obturation_restoration">Постоянная обтурация</option>
						</select>
					</div>
				</div>
			</div>
		);
	},
);
