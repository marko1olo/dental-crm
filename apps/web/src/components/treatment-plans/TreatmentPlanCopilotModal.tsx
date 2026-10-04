/**
 * TreatmentPlanCopilotModal.tsx — модальное окно AI Copilot (Ассистент врача & Клинический аудит).
 * Вынесено из тулбара для соблюдения лимита высоты экрана (y <= 140px для 3-Tier карточек).
 */

import React from "react";
import { Bot, Sparkles, X, RotateCcw } from "lucide-react";
import {
	COPILOT_PRESET_ACTIONS,
	type CopilotCommandType,
} from "../../services/ai/treatmentPlanCopilot";

export interface TreatmentPlanCopilotModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly isCopilotExecuting: boolean;
	readonly copilotFeedback: string | null;
	readonly setCopilotFeedback: (feedback: string | null) => void;
	readonly onExecuteCopilot: (actionId: CopilotCommandType) => void;
	readonly onResetPlan: () => void;
	readonly onOpenPresenterModal: () => void;
	readonly hasCustomModifications: boolean;
}

export const TreatmentPlanCopilotModal: React.FC<TreatmentPlanCopilotModalProps> = ({
	isOpen,
	onClose,
	isCopilotExecuting,
	copilotFeedback,
	setCopilotFeedback,
	onExecuteCopilot,
	onResetPlan,
	onOpenPresenterModal,
	hasCustomModifications,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
			role="dialog"
			aria-modal="true"
			aria-labelledby="tp-copilot-title"
			data-testid="treatment-plan-copilot-modal"
		>
			<div className="relative w-full max-w-xl p-5 rounded-3xl bg-[var(--paper-strong,var(--paper,#ffffff))] text-[var(--ink,#0f172a)] border border-[var(--line,var(--border,#cbd5e1))] shadow-2xl space-y-4">
				{/* Header */}
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line,var(--border,#cbd5e1))]">
					<div className="flex items-center gap-2">
						<div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
							<Sparkles size={18} />
						</div>
						<div>
							<h3 id="tp-copilot-title" className="text-sm font-black m-0">
								AI Copilot (Ассистент врача & Аудит)
							</h3>
							<p className="text-xs text-[var(--muted,#64748b)] m-0">
								Клиническая оптимизация плана, стандарты СтАР и пресеты реабилитации
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1.5 rounded-xl hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] cursor-pointer"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				{/* Preset Actions Grid */}
				<div className="space-y-2">
					<label className="text-xs font-bold text-[var(--muted,#64748b)] block">
						Клинические команды оптимизации:
					</label>
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
						{COPILOT_PRESET_ACTIONS.map((action) => (
							<button
								key={action.id}
								type="button"
								disabled={isCopilotExecuting}
								onClick={() => {
									onExecuteCopilot(action.id);
								}}
								className="p-3 text-left rounded-2xl bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--teal-soft,var(--paper-soft))] text-[var(--ink,#0f172a)] hover:text-[var(--teal-dark,var(--teal))] border border-[var(--line,var(--border,#cbd5e1))] transition-all disabled:opacity-50 cursor-pointer shadow-2xs space-y-1"
								data-testid={`copilot-modal-btn-${action.id}`}
							>
								<div className="font-bold text-xs flex items-center justify-between">
									<span>{action.title}</span>
									<Sparkles size={12} className="text-amber-500" />
								</div>
								<p className="text-[11px] text-[var(--muted,#64748b)] m-0 leading-tight">
									{action.description}
								</p>
							</button>
						))}
					</div>
				</div>

				{/* Audit & Presentation Trigger */}
				<div className="pt-2 border-t border-[var(--line,var(--border,#cbd5e1))] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
					<button
						type="button"
						onClick={() => {
							onClose();
							onOpenPresenterModal();
						}}
						className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-center gap-2 cursor-pointer"
						data-testid="copilot-modal-ai-audit-btn"
					>
						<Bot size={15} className="text-amber-600 dark:text-amber-400" />
						<span>Открыть ИИ-Аудит & Презентацию на 2-й экран</span>
					</button>

					{hasCustomModifications && (
						<button
							type="button"
							onClick={() => {
								onResetPlan();
							}}
							className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
							data-testid="copilot-modal-reset-btn"
						>
							<RotateCcw size={13} />
							<span>Сбросить AI-правки</span>
						</button>
					)}
				</div>

				{/* Feedback Banner */}
				{copilotFeedback && (
					<div
						className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-950 dark:text-indigo-100 text-xs"
						data-testid="copilot-modal-feedback"
					>
						<div className="flex items-center gap-2 min-w-0">
							<Bot size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
							<span className="truncate">{copilotFeedback}</span>
						</div>
						<button
							type="button"
							onClick={() => setCopilotFeedback(null)}
							className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer shrink-0"
						>
							Скрыть
						</button>
					</div>
				)}

				{/* Footer */}
				<div className="pt-2 border-t border-[var(--line,var(--border,#cbd5e1))] flex justify-end">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--teal,var(--brand-primary))] text-white hover:bg-[var(--teal-dark,var(--teal))] cursor-pointer shadow-xs"
					>
						Закрыть
					</button>
				</div>
			</div>
		</div>
	);
};

export default TreatmentPlanCopilotModal;
