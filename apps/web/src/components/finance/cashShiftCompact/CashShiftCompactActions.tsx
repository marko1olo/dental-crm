/**
 * CashShiftCompactActions.tsx — Кнопки внесения, изъятия и 1-клик Z-отчета (Мандат 8e, 8b <= 120 строк).
 */

import React from "react";
import { Lock, MinusCircle, PlusCircle, Unlock } from "lucide-react";

export interface CashShiftCompactActionsProps {
	readonly isShiftOpen: boolean;
	readonly isProcessing: boolean;
	readonly onOpenCashInModal: () => void;
	readonly onOpenCashOutModal: () => void;
	readonly onToggleShift: () => void;
}

export const CashShiftCompactActions: React.FC<CashShiftCompactActionsProps> = ({
	isShiftOpen,
	isProcessing,
	onOpenCashInModal,
	onOpenCashOutModal,
	onToggleShift,
}) => {
	return (
		<>
			<button
				type="button"
				onClick={onOpenCashInModal}
				data-testid="btn-compact-cash-in"
				className="secondary-button min-h-[44px] sm:min-h-[32px] h-8 px-2.5 text-[13px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 text-[var(--ink)] border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors"
				title="Внесение наличных в кассу (размен / приход)"
			>
				<PlusCircle size={14} className="shrink-0 text-[var(--muted)]" />
				<span className="hidden sm:inline">Внесение</span>
			</button>

			<button
				type="button"
				onClick={onOpenCashOutModal}
				data-testid="btn-compact-cash-out"
				className="secondary-button min-h-[44px] sm:min-h-[32px] h-8 px-2.5 text-[13px] font-semibold flex items-center gap-1 cursor-pointer shrink-0 text-[var(--ink)] border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] rounded-lg transition-colors"
				title="Изъятие / инкассация наличных из кассы"
			>
				<MinusCircle size={14} className="shrink-0 text-[var(--muted)]" />
				<span className="hidden sm:inline">Изъятие</span>
			</button>

			<button
				type="button"
				onClick={onToggleShift}
				aria-busy={isProcessing}
				data-testid="cash-shift-toggle-btn"
				className="primary-button min-h-[44px] sm:min-h-[32px] h-8 px-3 text-[13px] font-bold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white shadow-xs transition-all active:scale-[0.99]"
				title={isShiftOpen ? "Сформировать Z-отчет и закрыть смену" : "Открыть кассовую смену"}
			>
				{isShiftOpen ? (
					<>
						<Lock size={14} />
						<span>Закрыть смену (Z-отчет)</span>
					</>
				) : (
					<>
						<Unlock size={14} />
						<span>Открыть смену</span>
					</>
				)}
			</button>
		</>
	);
};
