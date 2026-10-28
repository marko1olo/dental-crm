import React from "react";
import { Send } from "lucide-react";

export interface TreatmentPlanPresenterCopilotBarProps {
	readonly isCopilotOpen: boolean;
	readonly copilotPrompt: string;
	readonly setCopilotPrompt: (val: string) => void;
}

export const TreatmentPlanPresenterCopilotBar: React.FC<TreatmentPlanPresenterCopilotBarProps> = ({
	isCopilotOpen,
	copilotPrompt,
	setCopilotPrompt,
}) => {
	if (!isCopilotOpen) return null;

	return (
		<div className="p-3 bg-[var(--paper)] border-t border-[var(--line)] flex flex-col gap-2.5">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<span className="text-xs font-bold text-[var(--ink)]">AI Copilot у кресла</span>
				<div className="flex items-center gap-1.5 flex-wrap">
					<button
						type="button"
						onClick={() => setCopilotPrompt("Оптимизировать бюджет плана лечения")}
						className="secondary-button dente-btn dente-btn-secondary min-h-[36px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
						data-testid="presenter-copilot-btn-budget_optimize"
					>
						Оптимизировать бюджет
					</button>
					<button
						type="button"
						onClick={() => setCopilotPrompt("Замена импланта на мостовидный протез")}
						className="secondary-button dente-btn dente-btn-secondary min-h-[36px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
						data-testid="presenter-copilot-btn-implant_to_bridge"
					>
						Мост вместо импланта
					</button>
					<button
						type="button"
						onClick={() => setCopilotPrompt("All-on-4 верхняя челюсть")}
						className="secondary-button dente-btn dente-btn-secondary min-h-[36px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)] hover:bg-[var(--line-subtle)] cursor-pointer"
						data-testid="presenter-copilot-btn-all_on_4_upper"
					>
						All-on-4 Верх
					</button>
				</div>
			</div>

			<div className="flex items-center gap-2">
				<input
					type="text"
					value={copilotPrompt}
					onChange={(e) => setCopilotPrompt(e.target.value)}
					placeholder="Запрос к копайлоту..."
					className="flex-1 min-h-[36px] px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs text-[var(--ink)]"
				/>
				<button
					type="button"
					onClick={() => setCopilotPrompt("")}
					className="secondary-button dente-btn dente-btn-secondary min-h-[36px] min-w-[36px] px-3 rounded-lg bg-[var(--teal)] text-[var(--paper-strong,#ffffff)] text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
					data-testid="presenter-copilot-send-btn"
				>
					<Send className="w-3.5 h-3.5" />
					<span className="hidden sm:inline">Отправить</span>
				</button>
			</div>
		</div>
	);
};

export default TreatmentPlanPresenterCopilotBar;
