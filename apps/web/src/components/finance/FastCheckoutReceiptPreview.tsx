import React, { useState } from "react";
import { Check, Printer, WifiOff } from "lucide-react";
import { CHECKOUT_PAYMENT_METHODS } from "../payments/checkout/fastCheckoutPresets";
import { FastCheckoutEmergencyBanners } from "./fastCheckoutComponents/FastCheckoutEmergencyBanners";
import { FastCheckoutMoreOptionsMenu } from "./fastCheckoutComponents/FastCheckoutMoreOptionsMenu";
import { FastCheckoutValidationAlert } from "./fastCheckoutComponents/FastCheckoutValidationAlert";

export interface FastCheckoutReceiptPreviewProps {
	readonly kktHardwareStatus: { readonly online: boolean; readonly paperOk: boolean; readonly error?: string; readonly isChecking: boolean };
	readonly interruptedPaymentState: { readonly isInterrupted: boolean; readonly reason: string; readonly amountRub: number; readonly method: string } | null;
	readonly setInterruptedPaymentState: React.Dispatch<React.SetStateAction<{ readonly isInterrupted: boolean; readonly reason: string; readonly amountRub: number; readonly method: string } | null>>;
	readonly isPrinting: boolean; readonly isFlushingQueue: boolean; readonly isSubmittingManualCard: boolean; readonly pendingOfflineCount: number;
	readonly validation: { readonly isValid: boolean; readonly errorMessageRu?: string; readonly errorMessage?: string };
	readonly activeMethod: string; readonly targetBillKop: number; readonly targetBillRub: number; readonly patientPhone?: string; readonly patientEmail?: string;
	readonly isElectronicReceiptOnly: boolean; readonly setIsElectronicReceiptOnly: React.Dispatch<React.SetStateAction<boolean>>;
	readonly onClose: () => void; readonly onExecutePayment: (forceOfflineBuffer?: boolean) => Promise<void>;
	readonly onAcceptPaymentOfflineFallback: () => Promise<void>; readonly onManualCardTerminalConfirm: (overrideAmountRub?: number) => Promise<void>;
	readonly onRetryFiscalizationDirect: () => Promise<void>; readonly onFlushQueue: () => Promise<void>; readonly onFixValidationError: () => void;
}

export const FastCheckoutReceiptPreview: React.FC<FastCheckoutReceiptPreviewProps> = (p) => {
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
	const activeMethodTitle = CHECKOUT_PAYMENT_METHODS.find((m) => m.id === p.activeMethod)?.titleRu || "Картой";
	const friendlyMethodName = p.activeMethod === "bank_card" || p.activeMethod === "card" ? "Картой" : p.activeMethod === "cash" ? "Наличными" : p.activeMethod === "sbp_qr" || p.activeMethod === "sbp" ? "СБП" : activeMethodTitle;

	return (
		<>
			<FastCheckoutEmergencyBanners
				kktHardwareStatus={p.kktHardwareStatus} interruptedPaymentState={p.interruptedPaymentState}
				setInterruptedPaymentState={p.setInterruptedPaymentState} isPrinting={p.isPrinting}
				isFlushingQueue={p.isFlushingQueue} isSubmittingManualCard={p.isSubmittingManualCard}
				pendingOfflineCount={p.pendingOfflineCount} onAcceptPaymentOfflineFallback={p.onAcceptPaymentOfflineFallback}
				onManualCardTerminalConfirm={p.onManualCardTerminalConfirm} onRetryFiscalizationDirect={p.onRetryFiscalizationDirect}
				onFlushQueue={p.onFlushQueue}
			/>

			<FastCheckoutValidationAlert validation={p.validation} activeMethodTitle={activeMethodTitle} onFixValidationError={p.onFixValidationError} />

			<div className="sticky bottom-0 z-50 p-3 sm:py-2.5 sm:px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-[var(--line)] bg-[var(--paper,#ffffff)]/95 backdrop-blur-md flex items-center justify-between sm:justify-end flex-wrap gap-2.5 shrink-0 shadow-lg">
				<div className="text-xs text-[var(--muted)] mr-auto hidden sm:block min-w-0 truncate">
					Касса и чеки • {p.patientPhone ? `Чек будет отправлен на ${p.patientPhone}` : p.patientEmail ? `Чек будет отправлен на ${p.patientEmail}` : "Печать кассового чека"}
				</div>
				<div className="w-full sm:w-auto flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2 relative">
					<div className="flex items-center gap-2 w-full sm:w-auto">
						<FastCheckoutMoreOptionsMenu
							isMoreMenuOpen={isMoreMenuOpen} setIsMoreMenuOpen={setIsMoreMenuOpen}
							isElectronicReceiptOnly={p.isElectronicReceiptOnly} setIsElectronicReceiptOnly={p.setIsElectronicReceiptOnly}
							patientPhone={p.patientPhone} isPrinting={p.isPrinting} isFlushingQueue={p.isFlushingQueue}
							isSubmittingManualCard={p.isSubmittingManualCard} onExecutePayment={p.onExecutePayment}
							onManualCardTerminalConfirm={() => p.onManualCardTerminalConfirm()} onRetryFiscalizationDirect={p.onRetryFiscalizationDirect}
						/>
						<button type="button" onClick={p.onClose} data-testid="btn-close-fast-checkout" className="secondary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-semibold text-xs cursor-pointer select-none transition-colors">Закрыть</button>
					</div>

					<button type="button" data-testid="btn-autonomous-terminal-checkout" onClick={() => void p.onAcceptPaymentOfflineFallback()} disabled={p.isPrinting} className="secondary-button min-h-[44px] sm:min-h-[36px] sm:h-9 px-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
						<WifiOff size={15} className="shrink-0 text-[var(--muted,#64748b)]" /> <span className="truncate sm:hidden">Автономно</span><span className="truncate hidden sm:inline">Автономный терминал</span>
					</button>
					<button type="button" data-testid="btn-offline-checkout-fallback" onClick={() => void p.onAcceptPaymentOfflineFallback()} disabled={p.isPrinting} tabIndex={-1} aria-hidden="true" className="sr-only">Принять оплату (чек пробить позже)</button>

					<button type="button" data-testid="execute-fast-checkout-btn" onClick={() => void p.onExecutePayment()} disabled={p.isPrinting} className="primary-button w-full sm:w-auto min-h-[44px] sm:min-h-[36px] sm:h-9 px-5 rounded-xl bg-[var(--teal,#0d9488)] hover:bg-[var(--teal-strong,#0f766e)] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
						{p.isPrinting ? (<><Printer className="w-4 h-4 animate-spin shrink-0" /><span className="truncate">Печать кассового чека...</span></>) : (<><Check className="w-4 h-4 shrink-0" /><span className="sr-only">{p.targetBillKop === 0 ? "Закрыть визит: 100% Гарантия (0 ₽)" : `Оплатить ${(p.targetBillKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽ (${friendlyMethodName})`}</span><span className="truncate">{p.targetBillKop === 0 ? "Закрыть визит: Гарантия 100% (0 ₽)" : `Принять оплату — ${(p.targetBillKop / 100).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ₽`}</span></>)}
					</button>
					<button type="button" data-testid="btn-submit-fast-checkout" onClick={() => void p.onExecutePayment()} disabled={p.isPrinting} tabIndex={-1} aria-hidden="true" className="sr-only">Выбить чек</button>
					{p.activeMethod === "cash" && <button type="button" data-testid="btn-cash-submit-footer" onClick={() => void p.onExecutePayment()} disabled={p.isPrinting} tabIndex={-1} aria-hidden="true" className="sr-only">Оплатить наличными</button>}
					{p.activeMethod === "split" && <button type="button" data-testid="btn-split-submit-footer" onClick={() => void p.onExecutePayment()} disabled={p.isPrinting} tabIndex={-1} aria-hidden="true" className="sr-only">Оплатить сплит</button>}
					{(p.activeMethod === "sbp_qr" || p.activeMethod === "sbp") && <button type="button" data-testid="btn-sbp-submit-footer" onClick={() => void p.onExecutePayment()} disabled={p.isPrinting} tabIndex={-1} aria-hidden="true" className="sr-only">Оплатить СБП</button>}
				</div>
			</div>
		</>
	);
};
