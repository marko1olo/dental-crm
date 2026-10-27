import React from "react";
import { Check, CreditCard, RefreshCw, WifiOff } from "lucide-react";

export interface FastCheckoutEmergencyBannersProps {
	readonly kktHardwareStatus: {
		readonly online: boolean;
		readonly paperOk: boolean;
		readonly error?: string | undefined;
		readonly isChecking: boolean;
	};
	readonly interruptedPaymentState: {
		readonly isInterrupted: boolean;
		readonly reason: string;
		readonly amountRub: number;
		readonly method: string;
	} | null;
	readonly setInterruptedPaymentState: React.Dispatch<
		React.SetStateAction<{
			readonly isInterrupted: boolean;
			readonly reason: string;
			readonly amountRub: number;
			readonly method: string;
		} | null>
	>;
	readonly isPrinting: boolean;
	readonly isFlushingQueue: boolean;
	readonly isSubmittingManualCard: boolean;
	readonly pendingOfflineCount: number;
	readonly onAcceptPaymentOfflineFallback: () => Promise<void>;
	readonly onManualCardTerminalConfirm: (overrideAmountRub?: number) => Promise<void>;
	readonly onRetryFiscalizationDirect: () => Promise<void>;
	readonly onFlushQueue: () => Promise<void>;
}

export const FastCheckoutEmergencyBanners: React.FC<FastCheckoutEmergencyBannersProps> = ({
	kktHardwareStatus,
	interruptedPaymentState,
	setInterruptedPaymentState,
	isPrinting,
	isFlushingQueue,
	isSubmittingManualCard,
	pendingOfflineCount,
	onAcceptPaymentOfflineFallback,
	onManualCardTerminalConfirm,
	onRetryFiscalizationDirect,
	onFlushQueue,
}) => {
	return (
		<>
			{Boolean(interruptedPaymentState?.isInterrupted) && (
				<div className="p-3.5 rounded-xl bg-amber-500/15 dark:bg-amber-950/50 border border-amber-500/40 space-y-2.5" data-testid="banner-fast-checkout-interrupted">
					<div className="flex items-start justify-between gap-2">
						<div className="flex items-center gap-2">
							<WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
							<div>
								<h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 m-0">Кассовый аппарат временно недоступен или закончилась бумага</h4>
								<p className="text-[11px] text-amber-800 dark:text-amber-300 m-0 leading-tight">
									{interruptedPaymentState?.reason || kktHardwareStatus.error || "Связь с кассовым аппаратом отсутствует. Примите оплату через автономный терминал — чек будет поставлен в очередь отложенной печати."}
								</p>
							</div>
						</div>
						{interruptedPaymentState && (
							<button type="button" onClick={() => setInterruptedPaymentState(null)} className="text-amber-600 dark:text-amber-400 hover:text-amber-800 text-xs font-bold cursor-pointer">
								Скрыть
							</button>
						)}
					</div>
					<div className="flex items-center gap-2 flex-wrap pt-1">
						<button
							type="button"
							onClick={() => void onAcceptPaymentOfflineFallback()}
							disabled={isPrinting}
							className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
							data-testid="btn-emergency-autonomous-checkout"
							title="Принять оплату через автономный терминал (чек ставится в очередь отложенной печати)"
						>
							<Check className="w-4 h-4" /> <span>Оплата через автономный терминал</span>
						</button>
						<button
							type="button"
							onClick={() => void onManualCardTerminalConfirm(interruptedPaymentState?.amountRub)}
							disabled={isSubmittingManualCard}
							title="Зафиксировать оплату картой в CRM без повторного списания с карты"
							className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
							data-testid="btn-fast-manual-card-confirm"
						>
							<CreditCard className="w-4 h-4" /> <span>Оплата картой подтверждена на терминале</span>
						</button>
						<button
							type="button"
							onClick={() => void onRetryFiscalizationDirect()}
							disabled={isFlushingQueue}
							title="Повторно отправить чек на печать в кассу"
							className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
							data-testid="btn-fast-retry-fiscalization"
						>
							<RefreshCw size={14} className={isFlushingQueue ? "animate-spin" : ""} /> <span>Повторить печать чека</span>
						</button>
					</div>
				</div>
			)}

			{pendingOfflineCount > 0 && (
				<div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-2 text-xs">
					<div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
						<WifiOff size={16} className="shrink-0" />
						<span><strong>Офлайн-буфер чеков:</strong> {pendingOfflineCount} чеков ожидают отправки в кассу при восстановлении связи.</span>
					</div>
					<button
						type="button"
						onClick={() => void onFlushQueue()}
						disabled={isFlushingQueue}
						title={isFlushingQueue ? "Выполняется синхронизация очереди с ОФД..." : "Отправить чеки из очереди в кассу"}
						className="min-h-[44px] px-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
					>
						<RefreshCw size={14} className={isFlushingQueue ? "animate-spin" : ""} /> <span>Синхронизировать</span>
					</button>
				</div>
			)}
		</>
	);
};
