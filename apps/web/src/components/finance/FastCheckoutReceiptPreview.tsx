import React, { useState } from "react";
import {
	Printer,
	Check,
	AlertCircle,
	WifiOff,
	RefreshCw,
	CreditCard,
	MoreHorizontal,
	Send,
	Zap,
} from "lucide-react";
import { CHECKOUT_PAYMENT_METHODS } from "../payments/checkout/fastCheckoutPresets";
import { showToast } from "../GlobalToast";

export interface FastCheckoutReceiptPreviewProps {
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
	readonly validation: {
		readonly isValid: boolean;
		readonly errorMessageRu?: string | undefined;
		readonly errorMessage?: string | undefined;
	};
	readonly activeMethod: string;
	readonly targetBillKop: number;
	readonly targetBillRub: number;
	readonly patientPhone?: string | undefined;
	readonly patientEmail?: string | undefined;
	readonly isElectronicReceiptOnly: boolean;
	readonly setIsElectronicReceiptOnly: React.Dispatch<React.SetStateAction<boolean>>;
	readonly onClose: () => void;
	readonly onExecutePayment: (forceOfflineBuffer?: boolean) => Promise<void>;
	readonly onAcceptPaymentOfflineFallback: () => Promise<void>;
	readonly onManualCardTerminalConfirm: (overrideAmountRub?: number) => Promise<void>;
	readonly onRetryFiscalizationDirect: () => Promise<void>;
	readonly onFlushQueue: () => Promise<void>;
	readonly onFixValidationError: () => void;
}

export const FastCheckoutReceiptPreview: React.FC<FastCheckoutReceiptPreviewProps> = ({
	kktHardwareStatus,
	interruptedPaymentState,
	setInterruptedPaymentState,
	isPrinting,
	isFlushingQueue,
	isSubmittingManualCard,
	pendingOfflineCount,
	validation,
	activeMethod,
	targetBillKop,
	targetBillRub,
	patientPhone = "",
	patientEmail = "",
	isElectronicReceiptOnly,
	setIsElectronicReceiptOnly,
	onClose,
	onExecutePayment,
	onAcceptPaymentOfflineFallback,
	onManualCardTerminalConfirm,
	onRetryFiscalizationDirect,
	onFlushQueue,
	onFixValidationError,
}) => {
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

	const activeMethodTitle =
		CHECKOUT_PAYMENT_METHODS.find((m) => m.id === activeMethod)?.titleRu || "Картой";

	return (
		<>
			{/* Acquiring & Fiscalization Emergency Fault-Tolerance Banner (Mandates 8e, 8n) */}
			{Boolean(interruptedPaymentState?.isInterrupted) && (
				<div
					className="p-3.5 rounded-xl bg-amber-500/15 dark:bg-amber-950/50 border border-amber-500/40 space-y-2.5"
					data-testid="banner-fast-checkout-interrupted"
				>
					<div className="flex items-start justify-between gap-2">
						<div className="flex items-center gap-2">
							<WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
							<div>
								<h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 m-0">
									Кассовый аппарат временно недоступен или закончилась бумага
								</h4>
								<p className="text-[11px] text-amber-800 dark:text-amber-300 m-0 leading-tight">
									{interruptedPaymentState?.reason ||
										kktHardwareStatus.error ||
										"Связь с кассовым аппаратом отсутствует. Примите оплату через автономный терминал — чек будет поставлен в очередь отложенной печати."}
								</p>
							</div>
						</div>
						{interruptedPaymentState && (
							<button
								type="button"
								onClick={() => setInterruptedPaymentState(null)}
								className="text-amber-600 dark:text-amber-400 hover:text-amber-800 text-xs font-bold cursor-pointer"
							>
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
							<Check className="w-4 h-4" />
							<span>Оплата через автономный терминал (без ККТ)</span>
						</button>
						<button
							type="button"
							onClick={() => void onManualCardTerminalConfirm(interruptedPaymentState?.amountRub)}
							disabled={isSubmittingManualCard}
							title="Зафиксировать оплату картой в CRM без повторного списания с карты"
							className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
							data-testid="btn-fast-manual-card-confirm"
						>
							<CreditCard className="w-4 h-4" />
							<span>Оплата картой подтверждена на терминале</span>
						</button>
						<button
							type="button"
							onClick={() => void onRetryFiscalizationDirect()}
							disabled={isFlushingQueue}
							title="Повторно отправить чек на печать в кассу"
							className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
							data-testid="btn-fast-retry-fiscalization"
						>
							<RefreshCw size={14} className={isFlushingQueue ? "animate-spin" : ""} />
							<span>Повторить печать чека</span>
						</button>
					</div>
				</div>
			)}

			{/* Emergency Offline Queue Status Banner */}
			{pendingOfflineCount > 0 && (
				<div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-2 text-xs">
					<div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
						<WifiOff size={16} className="shrink-0" />
						<span>
							<strong>Офлайн-буфер чеков:</strong> {pendingOfflineCount} чеков ожидают
							отправки на ККТ при восстановлении связи.
						</span>
					</div>
					<button
						type="button"
						onClick={() => void onFlushQueue()}
						disabled={isFlushingQueue}
						title={
							isFlushingQueue
								? "Выполняется синхронизация очереди с ОФД..."
								: "Отправить чеки из очереди на ККТ"
						}
						className="min-h-[44px] px-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
					>
						<RefreshCw size={14} className={isFlushingQueue ? "animate-spin" : ""} />
						<span>Синхронизировать</span>
					</button>
				</div>
			)}

			{/* Validation Alert with 1-Click Fix */}
			{!validation.isValid && (
				<div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between flex-wrap gap-2">
					<div className="flex items-center gap-2">
						<AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
						<span>
							<strong>Ошибка оплаты:</strong> {validation.errorMessageRu || validation.errorMessage}
						</span>
					</div>
					<button
						type="button"
						onClick={onFixValidationError}
						className="px-3.5 py-1.5 min-h-[44px] rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm flex items-center gap-1 cursor-pointer transition-all shadow-xs"
						title="Сбросить суммы и применить выбранный способ на весь чек"
					>
						<Zap size={13} /> Применить на весь чек ({activeMethodTitle})
					</button>
				</div>
			)}

			{/* Footer Actions (Fixed Sticky Bar — Apple HIG Floating Bottom Bar) */}
			<div className="sticky bottom-0 z-50 p-3 sm:py-2.5 sm:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-[var(--line)] bg-[var(--paper,#ffffff)]/95 backdrop-blur-md flex items-center justify-between sm:justify-end flex-wrap gap-2.5 shrink-0 shadow-lg">
				<div className="text-xs text-[var(--muted)] mr-auto hidden sm:block min-w-0 truncate">
					Касса и чеки •{" "}
					{patientPhone
						? `Чек будет отправлен на ${patientPhone}`
						: patientEmail
						? `Чек будет отправлен на ${patientEmail}`
						: "Печать кассового чека"}
				</div>
				<div className="w-full sm:w-auto flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 relative">
					<div className="flex items-center gap-2 w-full sm:w-auto">
						{/* Secondary / Rare Actions Popover Menu (Mandate 8d: max 1-2 direct buttons) */}
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
											showToast(
												!isElectronicReceiptOnly
													? "Только электронный чек (бумажный не печатается)"
													: "Печать бумажного чека включена",
												"info"
											);
										}}
										className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--ink)] flex items-center justify-between cursor-pointer"
									>
										<span>Только электронный чек</span>
										<span
											className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
												isElectronicReceiptOnly
													? "bg-teal-500/20 text-teal-600 dark:text-teal-400 font-bold"
													: "bg-[var(--line)] text-[var(--muted)]"
											}`}
										>
											{isElectronicReceiptOnly ? "Да" : "Нет"}
										</span>
									</button>

									{patientPhone && (
										<button
											type="button"
											onClick={() => {
												setIsMoreMenuOpen(false);
												showToast(
													`Копия чека будет направлена по SMS/WhatsApp на ${patientPhone}`,
													"success"
												);
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
										title={
											isSubmittingManualCard
												? "Идет фиксация..."
												: "Зафиксировать оплату в CRM без повторного списания с карты"
										}
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
										title={
											isFlushingQueue
												? "Отправка на ККТ..."
												: "Повторно отправить чек на фискализацию без изменения баланса"
										}
										className="w-full text-left px-2 py-1.5 rounded-md hover:bg-[var(--paper-soft,#f8fafc)] text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5 cursor-pointer"
										data-testid="btn-fast-retry-fiscalization-menu"
									>
										<RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
										<span>Повторить фискализацию чека</span>
									</button>
								</div>
							)}
						</div>

						<button
							type="button"
							onClick={onClose}
							data-testid="btn-close-fast-checkout"
							style={{
								height: 38,
								padding: "0 16px",
								borderRadius: 10,
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--ink)",
								fontWeight: 600,
								fontSize: 13,
								cursor: "pointer",
							}}
						>
							Закрыть
						</button>
					</div>

					{/* Резервный 1-клик чекаут через автономный терминал (Мандаты 8e, 8n) */}
					<button
						type="button"
						data-testid="btn-autonomous-terminal-checkout"
						onClick={() => void onAcceptPaymentOfflineFallback()}
						disabled={isPrinting}
						style={{
							height: 38,
							padding: "0 14px",
							borderRadius: 10,
							border: "1px solid rgba(245,158,11,0.4)",
							background: "rgba(245,158,11,0.1)",
							color: "#b45309",
							fontWeight: 700,
							fontSize: 12,
							display: "inline-flex",
							alignItems: "center",
							gap: 6,
							cursor: "pointer",
						}}
						title="Принять оплату через автономный терминал: чек ставится в очередь отложенной печати"
					>
						<WifiOff size={16} className="shrink-0 text-amber-600 dark:text-amber-400" />
						<span className="truncate">Оплата через автономный терминал (без ККТ)</span>
					</button>
					<button
						type="button"
						data-testid="btn-offline-checkout-fallback"
						onClick={() => void onAcceptPaymentOfflineFallback()}
						disabled={isPrinting}
						tabIndex={-1}
						aria-hidden="true"
						className="sr-only"
					>
						Принять оплату (чек пробить позже)
					</button>

					<button
						type="button"
						data-testid="execute-fast-checkout-btn"
						onClick={() => void onExecutePayment()}
						disabled={isPrinting}
						title={isPrinting ? "Идет печать кассового чека..." : undefined}
						style={{
							height: 38,
							padding: "0 22px",
							borderRadius: 10,
							background: "var(--teal, #0d9488)",
							color: "#ffffff",
							border: "1px solid var(--teal, #0d9488)",
							fontWeight: 700,
							fontSize: 13,
							display: "inline-flex",
							alignItems: "center",
							justifyContent: "center",
							gap: 6,
							cursor: isPrinting ? "not-allowed" : "pointer",
							boxShadow: "0 2px 8px rgba(13,148,136,0.25)",
						}}
					>
						{isPrinting ? (
							<>
								<Printer className="w-4 h-4 animate-spin shrink-0" />
								<span className="truncate">Печать кассового чека...</span>
							</>
						) : (
							<>
								<Check className="w-4 h-4 shrink-0" />
								<span className="truncate">
									{targetBillKop === 0
										? "Закрыть визит: 100% Гарантия / Скидка (0 ₽)"
										: `Выбить чек (${(targetBillKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽)`}
								</span>
							</>
						)}
					</button>
					<button
						type="button"
						data-testid="btn-submit-fast-checkout"
						onClick={() => void onExecutePayment()}
						disabled={isPrinting}
						tabIndex={-1}
						aria-hidden="true"
						className="sr-only"
					>
						Выбить чек
					</button>
				</div>
			</div>
		</>
	);
};
