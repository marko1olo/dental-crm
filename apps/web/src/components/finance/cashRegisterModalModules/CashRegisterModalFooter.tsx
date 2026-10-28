import { Coins, Lock, Printer } from "lucide-react";
import type React from "react";

export interface CashRegisterModalFooterProps {
	readonly isShiftActive: boolean;
	readonly netRevenueRub: number;
	readonly cashInDrawerRub: number;
	readonly isProcessing: boolean;
	readonly onPrintXReport: () => void;
	readonly onOpenSplitPayment?: (() => void) | undefined;
	readonly onClose: () => void;
	readonly onCloseShift: () => void;
}

export const CashRegisterModalFooter: React.FC<
	CashRegisterModalFooterProps
> = ({
	isShiftActive,
	netRevenueRub,
	cashInDrawerRub,
	isProcessing,
	onPrintXReport,
	onOpenSplitPayment,
	onClose,
	onCloseShift,
}) => (
	<div className="p-3 sm:p-4 border-t border-[var(--line)] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[var(--paper-soft)] shrink-0 select-none">
		<div className="flex items-center justify-between sm:justify-start gap-2 text-xs text-[var(--muted)]">
			<span>
				Выручка:{" "}
				<strong className="text-[var(--ink)]">
					{netRevenueRub.toLocaleString("ru-RU")} ₽
				</strong>
			</span>
			<span>•</span>
			<span>
				В ящике:{" "}
				<strong className="text-[var(--teal,#0d9488)] dark:text-[var(--teal,#2dd4bf)]">
					{cashInDrawerRub.toLocaleString("ru-RU")} ₽
				</strong>
			</span>
		</div>

		<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
			{isShiftActive && (
				<button
					type="button"
					onClick={onPrintXReport}
					aria-busy={isProcessing}
					className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 sm:px-4 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
					title="Распечатать промежуточный X-отчет без гашения смены"
					data-testid="btn-print-x-report-footer"
				>
					<Printer size={14} className="shrink-0 text-[var(--muted)]" />
					<span>X-отчет</span>
				</button>
			)}

			{isShiftActive && onOpenSplitPayment && (
				<button
					type="button"
					onClick={() => {
						onClose();
						onOpenSplitPayment();
					}}
					className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 sm:px-4 rounded-lg border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 flex-1 sm:flex-none"
					title="Разделить оплату чека между пациентом, ДМС и родственником"
					data-testid="btn-cash-register-open-split"
				>
					<Coins
						size={14}
						className="shrink-0 text-[var(--muted)]"
					/>
					<span>Сплит / ДМС</span>
				</button>
			)}

			<button
				type="button"
				onClick={onClose}
				className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 sm:px-4 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] text-xs font-semibold cursor-pointer transition-all flex-1 sm:flex-none text-center"
			>
				Отмена
			</button>

			{isShiftActive && (
				<button
					type="button"
					onClick={onCloseShift}
					aria-busy={isProcessing}
					className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-3 sm:px-5 rounded-lg bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 flex-2 sm:flex-none text-center"
					data-testid="btn-1click-close-shift"
				>
					<Lock size={15} className="shrink-0" />
					<span className="truncate">
						{isProcessing ? "Закрываю..." : "Закрытие кассовой смены"}
						<span className="sr-only">Закрыть смену / Z-отчёт</span>
					</span>
				</button>
			)}
		</div>
	</div>
);
