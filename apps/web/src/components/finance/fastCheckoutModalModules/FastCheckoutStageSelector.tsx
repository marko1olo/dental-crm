import { Layers } from "lucide-react";
import React from "react";
import type { TreatmentPlanStageOption } from "../../payments/checkout/fastCheckoutEngine.js";

export interface FastCheckoutStageSelectorProps {
	readonly stages: readonly TreatmentPlanStageOption[];
	readonly selectedStageId?: string | undefined;
	readonly onSelectStage: (stageId: string) => void;
}

export const FastCheckoutStageSelector: React.FC<
	FastCheckoutStageSelectorProps
> = ({ stages, selectedStageId, onSelectStage }) => (
	<div className="space-y-2">
		<div className="flex items-center justify-between">
			<span className="text-xs font-bold text-[var(--muted,#64748b)] uppercase tracking-wider flex items-center gap-1.5">
				<Layers size={14} className="text-teal-600" />
				Выбор этапа сметы / плана лечения:
			</span>
			<span className="text-xs text-[var(--muted,#64748b)]">
				{stages.length}{" "}
				{stages.length === 1 ? "этап" : stages.length < 5 ? "этапа" : "этапов"}{" "}
				в плане
			</span>
		</div>
		<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
			{stages.map((st) => {
				const isSelected = selectedStageId === st.id;
				return (
					<button
						key={st.id}
						type="button"
						onClick={() => onSelectStage(st.id)}
						className={`min-h-[48px] p-2.5 rounded-xl border-2 text-left flex flex-col justify-between transition-all cursor-pointer ${
							isSelected
								? "border-teal-600 bg-teal-500/10 text-teal-900 dark:text-teal-200 shadow-sm"
								: "border-[var(--line,#cbd5e1)] bg-[var(--paper,#ffffff)] hover:border-teal-400 text-[var(--ink,#0f172a)]"
						}`}
					>
						<span className="text-xs font-bold truncate">{st.titleRu}</span>
						<span className="text-xs font-mono font-extrabold text-teal-700 dark:text-teal-300">
							{(st.amountKop / 100).toLocaleString("ru-RU")} ₽
						</span>
					</button>
				);
			})}
		</div>
	</div>
);
