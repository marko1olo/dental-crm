import type React from "react";
import { Calculator, Loader2 } from "lucide-react";
import { type PanelSubject, panelStateText } from "../../../lib/panelStateText";

export interface EstimatorEmptyPlanPlaceholderProps {
	readonly planLoadPhase: "loading" | "ready" | "failed";
	readonly itemsCount: number;
	readonly planSubject: PanelSubject;
}

export const EstimatorEmptyPlanPlaceholder: React.FC<EstimatorEmptyPlanPlaceholderProps> = ({
	planLoadPhase,
	itemsCount,
	planSubject,
}) => {
	if (planLoadPhase === "loading" && itemsCount === 0) {
		return (
			<div className="flex items-center justify-center gap-2 p-8 text-sm text-slate-500 dark:text-zinc-400">
				<Loader2 size={16} className="animate-spin" aria-hidden="true" />
				{panelStateText(planSubject, { phase: "loading" }).title}
			</div>
		);
	}

	if (planLoadPhase === "ready" && itemsCount === 0) {
		return (
			<div className="flex flex-col items-center justify-center p-8 mx-2 my-8 rounded-2xl border border-dashed border-zinc-300/50 dark:border-zinc-700/50 bg-zinc-50/30 dark:bg-zinc-900/20 backdrop-blur-sm text-center">
				<div className="p-5 mb-4 rounded-full bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/20 shadow-sm">
					<Calculator
						size={40}
						className="text-teal-600 dark:text-teal-400 opacity-60"
					/>
				</div>
				<h4 className="text-base font-bold text-slate-800 dark:text-zinc-100 mb-2">
					План лечения пуст
				</h4>
				<p className="text-sm leading-relaxed text-slate-500 dark:text-zinc-400 max-w-[320px]">
					Выберите зуб на схеме слева, укажите патологию, и система автоматически
					сформирует предварительную смету из прайс-листа
				</p>
			</div>
		);
	}

	return null;
};
