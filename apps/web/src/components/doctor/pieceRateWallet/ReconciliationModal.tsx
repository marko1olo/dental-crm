/**
 * ReconciliationModal.tsx — Модальное окно подтверждения сверки начислений с бухгалтерией.
 */

import React from "react";
import { FileSpreadsheet, X } from "lucide-react";
import type { EarningsDataState } from "./types.js";

export interface ReconciliationModalProps {
	readonly isOpen: boolean;
	readonly selectedDate: string;
	readonly data: EarningsDataState | null;
	readonly onClose: () => void;
	readonly onConfirm: () => void;
}

export const ReconciliationModal: React.FC<ReconciliationModalProps> = ({
	isOpen,
	selectedDate,
	data,
	onClose,
	onConfirm,
}) => {
	if (!isOpen) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			data-testid="dpr-reconciliation-modal"
		>
			<div className="w-full max-w-md rounded-2xl bg-[var(--paper,#0f172a)] border border-[var(--line,#334155)] p-6 shadow-2xl text-[var(--ink,#f8fafc)]">
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#334155)]">
					<div className="flex items-center gap-2 font-bold text-base">
						<FileSpreadsheet className="text-[var(--teal)]" size={20} />
						<span>Сверка сдельной оплаты</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--ink)]"
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>

				<div className="py-4 text-sm leading-relaxed text-[var(--muted,#94a3b8)]">
					Зафиксировать расчет за смену{" "}
					<strong className="text-[var(--ink)]">{selectedDate}</strong>?
					<div className="mt-3 p-3 rounded-xl bg-[var(--paper-soft,#1e293b)] border border-[var(--line,#334155)]">
						<div className="flex justify-between py-1">
							<span>Выручка:</span>
							<strong className="text-[var(--ink)]">
								{data?.summary.totalGrossRevenueRub.toLocaleString("ru-RU")} ₽
							</strong>
						</div>
						<div className="flex justify-between py-1">
							<span>Вычет ЗТЛ:</span>
							<strong className="text-[var(--rose)]">
								−{data?.summary.totalLabDeductionsRub.toLocaleString("ru-RU")} ₽
							</strong>
						</div>
						<div className="flex justify-between py-1 text-base border-t border-[var(--line,#334155)] mt-1 pt-1">
							<span className="font-bold text-[var(--ink)]">
								К начислению:
							</span>
							<strong className="font-extrabold text-[var(--teal)]">
								{data?.summary.totalDoctorEarnedRub.toLocaleString("ru-RU")} ₽
							</strong>
						</div>
					</div>
					<p className="mt-3 text-xs">
						Контрольная сумма передается в реестр начислений расчетного отдела.
						Никакие скрытые удержания без вашего ведома применены не будут.
					</p>
				</div>

				<div className="flex items-center justify-end gap-3 pt-2">
					<button
						type="button"
						onClick={onClose}
						className="dpr-action-btn-secondary"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={onConfirm}
						className="dpr-action-btn-primary"
						data-testid="dpr-confirm-reconciliation-btn"
					>
						Подтвердить сверку
					</button>
				</div>
			</div>
		</div>
	);
};
