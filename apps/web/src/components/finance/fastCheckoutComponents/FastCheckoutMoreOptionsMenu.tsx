import React from "react";
import { CreditCard, MoreHorizontal, RefreshCw, Send, WifiOff } from "lucide-react";
import { showToast } from "../../GlobalToast";

export interface FastCheckoutMoreOptionsMenuProps {
	readonly isMoreMenuOpen: boolean;
	readonly setIsMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly isElectronicReceiptOnly: boolean;
	readonly setIsElectronicReceiptOnly: React.Dispatch<React.SetStateAction<boolean>>;
	readonly patientPhone?: string | undefined;
	readonly isPrinting: boolean;
	readonly isFlushingQueue: boolean;
	readonly isSubmittingManualCard: boolean;
	readonly onExecutePayment: (forceOfflineBuffer?: boolean) => Promise<void>;
	readonly onManualCardTerminalConfirm: () => Promise<void>;
	readonly onRetryFiscalizationDirect: () => Promise<void>;
}

export const FastCheckoutMoreOptionsMenu: React.FC<FastCheckoutMoreOptionsMenuProps> = ({
	isMoreMenuOpen,
	setIsMoreMenuOpen,
	isElectronicReceiptOnly,
	setIsElectronicReceiptOnly,
	patientPhone = "",
	isPrinting,
	isFlushingQueue,
	isSubmittingManualCard,
	onExecutePayment,
	onManualCardTerminalConfirm,
	onRetryFiscalizationDirect,
}) => {
	return (
		<div className="relative">
			<button
				type="button"
				data-testid="btn-fast-checkout-more-actions"
				onClick={() => setIsMoreMenuOpen((prev) => !prev)}
				className="min-h-[44px] sm:min-h-[36px] sm:h-9 px-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line)] text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer select-none"
				title="Дополнительные действия с чеком"
				aria-label="Дополнительные действия с чеком"
			>
				<MoreHorizontal className="w-4 h-4 text-[var(--muted)]" />
			</button>

			{isMoreMenuOpen && (
				<div
					data-testid="menu-fast-checkout-more-options"
					className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border border-[var(--line)] bg-[var(--paper)] p-2 shadow-xl z-50 text-xs flex flex-col gap-1.5"
				>
					<div className="font-semibold text-[var(--ink)] px-2 py-1 border-b border-[var(--line)] flex items-center justify-between">
						<span>Настройки кассового чека</span>
						<span className="text-[10px] text-[var(--muted)] font-mono">Чеки</span>
					</div>

					<button
						type="button"
						onClick={() => {
							setIsElectronicReceiptOnly((prev) => !prev);
							setIsMoreMenuOpen(false);
							showToast(!isElectronicReceiptOnly ? "Только электронный чек (бумажный не печатается)" : "Печать бумажного чека включена", "info");
						}}
						className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink)] flex items-center justify-between cursor-pointer"
					>
						<span>Только электронный чек</span>
						<span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${isElectronicReceiptOnly ? "bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold" : "bg-[var(--line)] text-[var(--muted)]"}`}>
							{isElectronicReceiptOnly ? "Да" : "Нет"}
						</span>
					</button>

					{patientPhone && (
						<button
							type="button"
							onClick={() => {
								setIsMoreMenuOpen(false);
								showToast(`Копия чека будет направлена по SMS/WhatsApp на ${patientPhone}`, "success");
							}}
							className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink)] flex items-center gap-1.5 cursor-pointer"
						>
							<Send className="w-3.5 h-3.5 text-teal-600" />
							<span>Отправить копию по SMS</span>
						</button>
					)}

					<button
						type="button"
						onClick={() => {
							setIsMoreMenuOpen(false);
							void onExecutePayment(true);
						}}
						disabled={isPrinting}
						title={isPrinting ? "Идет печать кассового чека..." : undefined}
						className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink)] flex items-center gap-1.5 cursor-pointer"
					>
						<WifiOff className="w-3.5 h-3.5 text-amber-600" />
						<span>Отложить в офлайн-буфер</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setIsMoreMenuOpen(false);
							void onManualCardTerminalConfirm();
						}}
						disabled={isSubmittingManualCard}
						className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--paper-soft,#f8fafc)] text-blue-700 dark:text-blue-300 font-bold flex items-center gap-1.5 cursor-pointer"
						data-testid="btn-fast-manual-card-confirm-menu"
					>
						<CreditCard className="w-3.5 h-3.5 text-blue-600" />
						<span>Оплата картой подтверждена на терминале</span>
					</button>

					<button
						type="button"
						onClick={() => {
							setIsMoreMenuOpen(false);
							void onRetryFiscalizationDirect();
						}}
						disabled={isFlushingQueue}
						className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--paper-soft,#f8fafc)] text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5 cursor-pointer"
						data-testid="btn-fast-retry-fiscalization-menu"
					>
						<RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
						<span>Повторить фискализацию чека</span>
					</button>
				</div>
			)}
		</div>
	);
};
