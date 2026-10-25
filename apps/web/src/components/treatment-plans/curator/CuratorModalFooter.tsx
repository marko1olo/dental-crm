/**
 * apps/web/src/components/treatment-plans/curator/CuratorModalFooter.tsx
 *
 * Подвал модального окна курации с 1-клик действиями врача (Мандаты 8e, 8n).
 * Кнопки утверждения, печати и кассы НИКОГДА не блокируются (disabled=false).
 * Строго <= 120 строк per Mandate 8b.
 */

import React from "react";
import { Check, CheckCircle2, Printer, Send } from "lucide-react";

export interface CuratorModalFooterProps {
	readonly isSaving: boolean;
	readonly isDoctorSelf: boolean;
	readonly onClose: () => void;
	readonly onSave: () => void;
	readonly onApprovePlan: () => void;
	readonly onPrintEstimate: () => void;
	readonly onSendToCashier: () => void;
}

export const CuratorModalFooter: React.FC<CuratorModalFooterProps> = ({
	isSaving,
	isDoctorSelf,
	onClose,
	onSave,
	onApprovePlan,
	onPrintEstimate,
	onSendToCashier,
}) => {
	return (
		<div className="curator-modal-footer flex flex-col gap-2.5 p-3.5 border-t border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] rounded-b-2xl">
			{/* Быстрые действия соло-врача (Мандат 8e: 0 блокировок, 1 клик) */}
			<div className="flex flex-wrap items-center gap-2">
				<button
					type="button"
					data-testid="curator-approve-plan-btn"
					onClick={onApprovePlan}
					className="flex-1 min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer touch-manipulation"
					title="Утвердить план лечения немедленно без назначения кураторов"
				>
					<CheckCircle2 className="w-4 h-4 shrink-0" />
					<span className="whitespace-nowrap">Утвердить план</span>
				</button>

				<button
					type="button"
					data-testid="curator-print-estimate-btn"
					onClick={onPrintEstimate}
					className="flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#cbd5e1)] active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer touch-manipulation"
					title="Распечатать смету плана лечения (А4)"
				>
					<Printer className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="whitespace-nowrap">Распечатать смету</span>
				</button>

				<button
					type="button"
					data-testid="curator-send-cashier-btn"
					onClick={onSendToCashier}
					className="flex-1 min-h-[44px] px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] border border-[var(--line,#cbd5e1)] active:scale-98 transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer touch-manipulation"
					title="Мгновенно создать счёт кассиру из плана"
				>
					<Send className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
					<span className="whitespace-nowrap">Отправить в кассу</span>
				</button>
			</div>

			{/* Стандартные кнопки сохранения прикрепления и закрытия */}
			<div className="flex items-center justify-end gap-2 pt-1 border-t border-[var(--line-subtle,#e2e8f0)]">
				<button
					type="button"
					data-testid="curator-cancel-btn"
					onClick={onClose}
					className="curator-action-btn curator-action-secondary min-h-[44px] min-w-[90px] px-3.5 py-2 rounded-xl text-xs font-medium text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] bg-transparent hover:bg-[var(--paper,#ffffff)] cursor-pointer transition-colors touch-manipulation"
				>
					Отмена
				</button>

				<button
					type="button"
					data-testid="curator-save-btn"
					onClick={onSave}
					className="curator-action-btn curator-action-primary min-h-[44px] min-w-[160px] px-4 py-2 rounded-xl text-xs font-bold text-white bg-[var(--primary,#0d9488)] hover:bg-[var(--primary-dark,#0f766e)] shadow-xs active:scale-98 cursor-pointer transition-all flex items-center justify-center gap-1.5 touch-manipulation"
				>
					<Check className="w-4 h-4 shrink-0" />
					<span>
						{isSaving ? "Сохранение..." : isDoctorSelf ? "Сохранить (самокурация врачом)" : "Закрепить куратора"}
					</span>
				</button>
			</div>
		</div>
	);
};
