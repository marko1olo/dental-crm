import React from "react";
import { CheckCircle2, Printer, Send } from "lucide-react";

export interface DoctorShiftCloseFooterProps {
	readonly onPrintShiftStatement: () => void;
	readonly onSendTelegramSummary?: (() => void) | undefined;
	readonly isSendingTelegram?: boolean | undefined;
	readonly onClose: () => void;
	readonly onConfirmClose: () => void;
}

export const DoctorShiftCloseFooter: React.FC<DoctorShiftCloseFooterProps> = ({
	onPrintShiftStatement,
	onSendTelegramSummary,
	isSendingTelegram,
	onClose,
	onConfirmClose,
}) => {
	return (
		<div className="p-3.5 sm:p-4 border-t border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] shrink-0">
			{/* Desktop / Tablet Actions Bar */}
			<div className="hidden sm:flex items-center justify-between gap-3">
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onPrintShiftStatement}
						className="h-9 px-3.5 rounded-lg text-sm font-medium gap-2 inline-flex items-center justify-center shrink-0 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors"
						data-testid="btn-print-shift-statement"
						title="Распечатать сводку смены врача и фискальные итоги"
					>
						<Printer className="w-4 h-4 text-[var(--primary)] shrink-0" />
						<span>Печать сводки смены</span>
					</button>

					{onSendTelegramSummary && (
						<button
							type="button"
							onClick={onSendTelegramSummary}
							disabled={isSendingTelegram}
							className="h-9 px-3.5 rounded-lg text-sm font-medium gap-2 inline-flex items-center justify-center shrink-0 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors"
							data-testid="btn-send-telegram-shift-summary"
							title="Отправить сводный отчёт смены руководству в Telegram"
						>
							<Send className="w-4 h-4 text-[var(--primary)] shrink-0" />
							<span>{isSendingTelegram ? "Отправка..." : "Отправить в Telegram"}</span>
						</button>
					)}
				</div>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onClose}
						className="h-9 px-3.5 rounded-lg text-sm font-medium gap-2 inline-flex items-center justify-center shrink-0 border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer transition-colors"
						data-testid="btn-cancel-close-shift"
					>
						<span>Отмена</span>
					</button>

					<button
						type="button"
						data-testid="btn-confirm-close-shift-1click"
						onClick={onConfirmClose}
						className="h-9 px-4 rounded-lg text-sm font-medium gap-2 inline-flex items-center justify-center shrink-0 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm cursor-pointer transition-colors"
						title="Завершить смену врача, рассчитать заработок и сформировать Z-отчет"
					>
						<CheckCircle2 className="w-4 h-4 shrink-0" />
						<span>Завершить смену и рассчитать</span>
					</button>
				</div>
			</div>

			{/* Mobile Bottom Thumb Zone Bar (Apple HIG: Touch targets >= 44x44px, safe-area-inset-bottom) */}
			<div className="sm:hidden flex flex-col gap-2.5 pb-[env(safe-area-inset-bottom,0px)]">
				<button
					type="button"
					data-testid="btn-confirm-close-shift-1click-mobile"
					onClick={onConfirmClose}
					className="w-full min-h-[48px] h-12 px-4 rounded-xl text-base font-semibold shadow-md bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center justify-center gap-2 cursor-pointer transition-colors"
				>
					<CheckCircle2 className="w-5 h-5 shrink-0" />
					<span>Завершить смену и сформировать отчёт</span>
				</button>

				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onPrintShiftStatement}
						className="flex-1 min-h-[44px] h-11 px-3 rounded-xl text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
					>
						<Printer className="w-4 h-4 text-[var(--primary)] shrink-0" />
						<span>Печать</span>
					</button>
					{onSendTelegramSummary && (
						<button
							type="button"
							onClick={onSendTelegramSummary}
							disabled={isSendingTelegram}
							className="flex-1 min-h-[44px] h-11 px-3 rounded-xl text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
							data-testid="btn-send-telegram-shift-summary-mobile"
						>
							<Send className="w-4 h-4 text-[var(--primary)] shrink-0" />
							<span>В Telegram</span>
						</button>
					)}
					<button
						type="button"
						onClick={onClose}
						className="flex-1 min-h-[44px] h-11 px-3 rounded-xl text-sm font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-center cursor-pointer transition-colors"
					>
						<span>Отмена</span>
					</button>
				</div>
			</div>
		</div>
	);
};
