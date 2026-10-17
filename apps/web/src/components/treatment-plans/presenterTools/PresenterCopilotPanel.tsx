import React, { useState } from "react";
import { Bot, CheckCircle2, Send, Sparkles } from "lucide-react";
import {
	COPILOT_PRESET_ACTIONS,
	type CopilotCommandType,
} from "../../../services/ai/treatmentPlanCopilot";

export interface PresenterCopilotPanelProps {
	readonly isActive: boolean;
	readonly isCopilotExecuting: boolean;
	readonly onExecuteCopilot: (cmdOrText: CopilotCommandType | string) => void;
	readonly copilotFeedback: string | null;
	readonly setCopilotFeedback: (feedback: string | null) => void;
	readonly confirmedNotice?: string | null | undefined;
}

export const PresenterCopilotPanel: React.FC<PresenterCopilotPanelProps> = ({
	isActive, isCopilotExecuting, onExecuteCopilot, copilotFeedback,
	setCopilotFeedback, confirmedNotice,
}) => {
	const [customPrompt, setCustomPrompt] = useState("");

	const handleSend = () => {
		if (customPrompt.trim()) {
			onExecuteCopilot(customPrompt.trim());
			setCustomPrompt("");
		} else {
			setCopilotFeedback("Введите команду или выберите готовый сценарий презентации («бюджет 120к», «без имплантации»)");
		}
	};

	return (
		<>
			<div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-6 py-2.5 bg-[var(--tp-surface-soft)] border-b border-[var(--tp-border)] no-print ${isActive ? "" : "hidden"}`}>
				<div className="flex items-center gap-2 flex-wrap">
					<div className="inline-flex items-center gap-1 text-xs font-bold text-[var(--tp-primary)] mr-1">
						<Sparkles size={14} className="text-amber-500" />
						<span>AI Copilot у кресла:</span>
					</div>
					{COPILOT_PRESET_ACTIONS.map((act) => (
						<button
							key={act.id}
							type="button"
							aria-busy={isCopilotExecuting}
							onClick={() => onExecuteCopilot(act.id)}
							className="h-7 px-2.5 rounded-lg text-[12.5px] font-medium bg-[var(--tp-surface)] text-[var(--tp-text-main)] hover:bg-[var(--tp-primary-light)] hover:text-[var(--tp-primary)] border border-[var(--tp-border)] cursor-pointer transition-colors"
							title={isCopilotExecuting ? "AI Copilot выполняет команду..." : act.description}
							data-testid={`presenter-copilot-btn-${act.id}`}
						>
							{act.title}
						</button>
					))}
				</div>

				<div className="flex items-center gap-1.5 min-w-[200px] max-w-sm">
					<input
						type="text"
						value={customPrompt}
						onChange={(e) => setCustomPrompt(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.preventDefault();
								handleSend();
							}
						}}
						placeholder="Команда ассистенту (напр. 'бюджет 120к')"
						className="flex-1 px-2.5 py-1 text-[13px] rounded-lg border border-[var(--tp-border)] bg-[var(--tp-bg)] text-[var(--tp-text-main)] outline-none min-h-[32px] sm:min-h-[32px] sm:h-8"
						data-testid="presenter-copilot-input"
					/>
					<button
						type="button"
						aria-busy={isCopilotExecuting}
						onClick={handleSend}
						className="p-1.5 min-h-[36px] min-w-[36px] sm:h-9 sm:w-9 flex items-center justify-center rounded-lg bg-[var(--tp-primary)] text-white hover:bg-[var(--tp-primary-hover)] cursor-pointer touch-manipulation"
						title={isCopilotExecuting ? "Выполняется команда ассистента..." : "Отправить команду"}
						data-testid="presenter-copilot-send-btn"
					>
						<Send size={14} />
					</button>
				</div>
			</div>

			{copilotFeedback && (
				<div
					className="px-6 py-2 bg-indigo-500/10 border-b border-indigo-500/30 text-indigo-950 dark:text-indigo-200 text-xs flex items-center justify-between no-print"
					data-testid="presenter-copilot-feedback-banner"
				>
					<div className="flex items-center gap-2">
						<Bot size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
						<span>{copilotFeedback}</span>
					</div>
					<button
						type="button"
						onClick={() => setCopilotFeedback(null)}
						className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer ml-4 shrink-0"
					>
						Скрыть
					</button>
				</div>
			)}

			{confirmedNotice && (
				<div
					className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/30 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between no-print"
					data-testid="choice-confirmed-banner"
				>
					<div className="flex items-center gap-2">
						<CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
						<span>{confirmedNotice}</span>
					</div>
					<span className="text-[11px] font-normal opacity-80">Готово к печати Приложения №1</span>
				</div>
			)}
		</>
	);
};
