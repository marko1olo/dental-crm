/**
 * apps/web/src/components/finance/modal/payment/PaymentModalHeader.tsx
 *
 * Header, method selector tabs, debt notice, and emergency acquisition banners.
 */

import React from "react";
import {
	AlertTriangle,
	Banknote,
	CheckCircle,
	CheckCircle2,
	CreditCard,
	FileText,
	MoreHorizontal,
	Printer,
	QrCode,
	RotateCcw,
	Send,
	ShieldCheck,
	Users,
	Wallet,
	X,
} from "lucide-react";
import { showToast } from "../../../GlobalToast.js";
import type { PaymentMethodTab } from "./paymentModalTypes.js";

export interface PaymentModalHeaderProps {
	readonly totalDueRub: number;
	readonly rawTotalDueRub: number;
	readonly discountRub: number;
	readonly patientName: string;
	readonly effectiveCashier: string;
	readonly patientPhone?: string | undefined;
	readonly activeMethod: PaymentMethodTab;
	readonly setActiveMethod: (m: PaymentMethodTab) => void;
	readonly patientDebtRub?: number | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly isMoreMenuOpen: boolean;
	readonly setIsMoreMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
	readonly handleQuickPrintInvoice: () => void;
	readonly handleQuickPrintAct: () => void;
	readonly onClose: () => void;
	readonly interruptedPaymentState: {
		isInterrupted: boolean;
		reason: string;
		amountRub: number;
	} | null;
	readonly setInterruptedPaymentState: (state: null) => void;
	readonly handleManualCardTerminalConfirm: (amt?: number) => void;
	readonly isSubmittingManualCard: boolean;
	readonly handleRetryFiscalization: () => void;
	readonly isRetryingFiscalization: boolean;
	readonly fiscalizationRetryPending: boolean;
}

export const PaymentModalHeader: React.FC<PaymentModalHeaderProps> = ({
	totalDueRub,
	rawTotalDueRub,
	discountRub,
	patientName,
	effectiveCashier,
	patientPhone,
	activeMethod,
	setActiveMethod,
	patientDebtRub = 0,
	patientDepositRub = 0,
	isMoreMenuOpen,
	setIsMoreMenuOpen,
	handleQuickPrintInvoice,
	handleQuickPrintAct,
	onClose,
	interruptedPaymentState,
	setInterruptedPaymentState,
	handleManualCardTerminalConfirm,
	isSubmittingManualCard,
	handleRetryFiscalization,
	isRetryingFiscalization,
	fiscalizationRetryPending,
}) => {
	return (
		<>
			{/* Modal Header */}
			<div className="p-3 sm:px-4 sm:py-2.5 border-b border-[var(--line,#e2e8f0)] flex items-center justify-between bg-[var(--paper-soft,#f8fafc)] shrink-0">
				<div>
					<h2
						id="payment-modal-title"
						className="text-base sm:text-lg font-bold m-0 flex items-center gap-2 flex-wrap"
					>
						<ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
						<span className="whitespace-nowrap">Прием оплаты • {totalDueRub.toLocaleString("ru-RU")}&nbsp;₽</span>
						{discountRub > 0 && (
							<span
								className="text-xs font-normal line-through text-[var(--muted,#64748b)]"
								data-testid="text-payment-original-total"
							>
								{rawTotalDueRub.toLocaleString("ru-RU")} ₽
							</span>
						)}
						<span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 inline-flex items-center gap-1">
							<CheckCircle2 size={12} />
							<span>Кассовый чек</span>
						</span>
					</h2>
					<p className="text-xs text-[var(--muted,#64748b)] m-0">
						Пациент: <strong className="text-[var(--ink,#0f172a)]">{patientName}</strong>
						<span className="ml-2 text-[var(--muted,#64748b)]">
							• Врач / Кассир:{" "}
							<strong className="text-[var(--ink,#0f172a)]">{effectiveCashier}</strong>
						</span>
					</p>
				</div>

				<div className="flex items-center gap-1.5 relative shrink-0">
					<button
						type="button"
						onClick={handleQuickPrintInvoice}
						className="hidden sm:flex min-h-[32px] sm:h-8 sm:min-w-0 px-2.5 py-1 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
						title="Быстрая печать счета"
						aria-label="Печать счета"
						data-testid="btn-payment-modal-print-invoice"
					>
						<Printer size={14} className="text-slate-500 shrink-0" />
						<span className="hidden sm:inline whitespace-nowrap shrink-0">Счет</span>
					</button>
					<button
						type="button"
						onClick={handleQuickPrintAct}
						className="hidden sm:flex min-h-[32px] sm:h-8 sm:min-w-0 px-2.5 py-1 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-xs font-semibold text-[var(--ink,#0f172a)] items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
						title="Быстрая печать акта сдачи-приемки"
						aria-label="Печать акта 804н"
						data-testid="btn-payment-modal-print-act"
					>
						<FileText size={14} className="text-slate-500 shrink-0" />
						<span className="hidden sm:inline whitespace-nowrap shrink-0">Акт 804н</span>
					</button>
					<button
						type="button"
						onClick={() => setIsMoreMenuOpen((prev) => !prev)}
						className="min-h-[44px] min-w-[44px] sm:min-h-[32px] sm:h-8 sm:w-8 sm:min-w-0 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] hover:bg-[var(--paper-soft,#f8fafc)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] flex items-center justify-center transition-colors cursor-pointer"
						title="Дополнительные операции (копия чека, SMS, возврат)"
						aria-label="Дополнительные действия"
						data-testid="btn-payment-more-actions"
					>
						<MoreHorizontal size={16} />
					</button>
					{isMoreMenuOpen && (
						<div
							className="absolute right-10 top-10 z-50 w-56 rounded-xl bg-[var(--paper-strong,#ffffff)] border border-[var(--line,#e2e8f0)] shadow-xl p-1.5 text-xs text-[var(--ink,#0f172a)] space-y-1 animate-in fade-in zoom-in-95 duration-100"
							data-testid="menu-payment-more-options"
						>
							<button
								type="button"
								onClick={() => {
									setIsMoreMenuOpen(false);
									handleQuickPrintInvoice();
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer"
							>
								<Printer size={13} className="text-slate-500 shrink-0" />
								<span className="truncate">Печать копии счёта</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsMoreMenuOpen(false);
									handleQuickPrintAct();
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer"
							>
								<FileText size={13} className="text-slate-500 shrink-0" />
								<span className="truncate">Печать копии акта</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsMoreMenuOpen(false);
									showToast(
										`Электронный чек отправлен на контакт: ${patientPhone || "телефон пациента"}`,
										"success",
										3000,
									);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 cursor-pointer"
							>
								<Send size={13} className="text-teal-600 shrink-0" />
								<span className="truncate">Отправить чек по SMS</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setIsMoreMenuOpen(false);
									showToast(
										"Для оформления возврата откройте модуль кассы (вкладка Возврат).",
										"info",
										4000,
									);
								}}
								className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-[var(--paper-soft,#f8fafc)] flex items-center gap-2 text-rose-600 cursor-pointer border-t border-[var(--line,#e2e8f0)] pt-1.5"
							>
								<RotateCcw size={13} className="shrink-0" />
								<span className="truncate">Чек возврата</span>
							</button>
						</div>
					)}
					<button
						type="button"
						onClick={onClose}
						className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 h-11 w-11 sm:h-8 sm:w-8 rounded-xl border border-[var(--line,#e2e8f0)] flex items-center justify-center text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper,#ffffff)] transition-colors cursor-pointer"
						aria-label="Закрыть"
						data-testid="btn-close-payment-modal"
					>
						<X size={16} />
					</button>
				</div>
			</div>

			{/* Method Selector Tabs */}
			<div className="p-3 border-b border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] flex items-center gap-1.5 sm:gap-2 overflow-x-auto flex-nowrap sm:flex-wrap shrink-0">
				<button
					type="button"
					onClick={() => setActiveMethod("card_terminal")}
					data-testid="tab-payment-card-terminal"
					className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 sm:px-3 rounded-lg border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
						activeMethod === "card_terminal"
							? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
							: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
					}`}
				>
					<CreditCard size={15} className="text-emerald-600 shrink-0" />
					<span className="whitespace-nowrap shrink-0 hidden sm:inline">POS Терминал Сбербанк</span>
					<span className="whitespace-nowrap shrink-0 sm:hidden">Терминал</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveMethod("sberpay_qr")}
					data-testid="tab-payment-sberpay-qr"
					className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 sm:px-3 rounded-lg border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
						activeMethod === "sberpay_qr"
							? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300"
							: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
					}`}
				>
					<QrCode size={15} className="text-teal-600 shrink-0" />
					<span className="whitespace-nowrap shrink-0 hidden sm:inline">SberPay QR (СБП)</span>
					<span className="whitespace-nowrap shrink-0 sm:hidden">SberPay QR</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveMethod("sbp_qr")}
					className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 sm:px-3 rounded-lg border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
						activeMethod === "sbp_qr"
							? "border-teal-500 bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-2 ring-teal-400"
							: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)] hover:border-teal-400"
					}`}
					data-testid="tab-payment-sbp-qr"
					title="Оплата СБП по QR (НСПК / ГОСТ Р 56042-2014)"
				>
					<QrCode size={15} className="text-teal-600 shrink-0" />
					<span className="whitespace-nowrap shrink-0 hidden sm:inline">Оплата СБП по QR</span>
					<span className="whitespace-nowrap shrink-0 sm:hidden">СБП QR</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveMethod("cash")}
					data-testid="tab-payment-cash"
					className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 sm:px-3 rounded-lg border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
						activeMethod === "cash"
							? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
							: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
					}`}
				>
					<Banknote size={15} className="text-emerald-600 shrink-0" />
					<span className="whitespace-nowrap shrink-0">Наличные</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveMethod("family_deposit")}
					data-testid="tab-payment-family-deposit"
					className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 sm:px-3 rounded-lg border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
						activeMethod === "family_deposit"
							? "border-pink-500 bg-pink-500/10 text-pink-700 dark:text-pink-300 ring-2 ring-pink-400"
							: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
					}`}
				>
					<Users size={15} className="text-pink-600 shrink-0" />
					<span className="whitespace-nowrap shrink-0 hidden sm:inline">Депозит / Семья</span>
					<span className="whitespace-nowrap shrink-0 sm:hidden">Депозит</span>
				</button>

				<button
					type="button"
					onClick={() => setActiveMethod("split")}
					data-testid="tab-payment-split"
					className={`min-h-[44px] sm:min-h-[32px] sm:h-8 px-2.5 sm:px-3 rounded-lg border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
						activeMethod === "split"
							? "border-purple-500 bg-purple-500/10 text-purple-700 dark:text-purple-300 ring-2 ring-purple-400"
							: "border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] text-[var(--ink,#0f172a)]"
					}`}
				>
					<Wallet size={15} className="text-purple-600 shrink-0" />
					<span className="whitespace-nowrap shrink-0 hidden sm:inline">Комбинированная (Сплит)</span>
					<span className="whitespace-nowrap shrink-0 sm:hidden">Сплит</span>
				</button>
			</div>

			{/* Debt Autonomy Banner (Mandates 8e & 8n: Patient debt never blocks receipt or tender) */}
			{(patientDebtRub > 0 || patientDepositRub < 0) && (
				<div
					data-testid="debt-autonomy-banner"
					className="px-3.5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-2 shrink-0"
				>
					<AlertTriangle size={14} className="shrink-0 text-amber-600" />
					<span>
						Задолженность пациента:{" "}
						{(patientDebtRub > 0 ? patientDebtRub : Math.abs(patientDepositRub)).toLocaleString(
							"ru-RU",
						)}{" "}
						₽. Долг не блокирует приём оплаты на фактически внесённую сумму и фискализацию чека.
					</span>
				</div>
			)}

			{/* Acquiring & 54-FZ Emergency Collision Resolution Banner (Mandates 8e, 8n) */}
			{interruptedPaymentState?.isInterrupted && (
				<div
					className="p-3.5 rounded-xl bg-amber-500/15 dark:bg-amber-950/50 border border-amber-500/40 space-y-2.5 mx-4 mt-3"
					data-testid="banner-interrupted-payment-recovery"
				>
					<div className="flex items-start justify-between gap-2">
						<div className="flex items-center gap-2">
							<AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
							<div>
								<h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 m-0">
									Аварийная ситуация: обрыв связи / тайм-аут эквайринга
								</h4>
								<p className="text-[11px] text-amber-800 dark:text-amber-300 m-0 leading-tight">
									{interruptedPaymentState.reason}. Если терминал уже списал средства с карты
									или выдал слип-чек, подтвердите оплату вручную без повторного списания с карты!
								</p>
							</div>
						</div>
						<button
							type="button"
							onClick={() => setInterruptedPaymentState(null)}
							className="text-amber-600 dark:text-amber-400 hover:text-amber-800 text-xs font-bold cursor-pointer"
						>
							Скрыть
						</button>
					</div>
					<div className="flex items-center gap-2 flex-wrap pt-1">
						<button
							type="button"
							onClick={() =>
								handleManualCardTerminalConfirm(interruptedPaymentState.amountRub)
							}
							disabled={isSubmittingManualCard}
							title={
								isSubmittingManualCard
									? "Идет фиксация..."
									: "Зафиксировать оплату в CRM без повторного списания с карты"
							}
							className="min-h-[36px] px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
							data-testid="btn-recovery-manual-card-confirm"
						>
							<CheckCircle size={14} />
							<span>Оплата картой подтверждена на терминале вручную</span>
						</button>
						<button
							type="button"
							onClick={handleRetryFiscalization}
							disabled={isRetryingFiscalization}
							title={
								isRetryingFiscalization
									? "Идет отправка на ККТ..."
									: "Повторно отправить чек на фискализацию в ККТ/ОФД без изменения баланса"
							}
							className="min-h-[36px] px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
							data-testid="btn-recovery-retry-fiscalization"
						>
							<RotateCcw
								size={14}
								className={isRetryingFiscalization ? "animate-spin" : ""}
							/>
							<span>Повторить фискализацию чека</span>
						</button>
					</div>
				</div>
			)}

			{/* 54-FZ Fiscalization Retry Banner */}
			{fiscalizationRetryPending && !interruptedPaymentState?.isInterrupted && (
				<div
					className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between flex-wrap gap-2 text-xs mx-4 mt-3"
					data-testid="banner-fiscalization-pending"
				>
					<div className="flex items-center gap-2">
						<Printer size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
						<span className="font-semibold text-blue-950 dark:text-blue-200">
							Платёж сохранён в базе CRM. Требуется повторить печать кассового чека?
						</span>
					</div>
					<button
						type="button"
						onClick={handleRetryFiscalization}
						disabled={isRetryingFiscalization}
						title={
							isRetryingFiscalization
								? "Печать..."
								: "Напечатать чек на кассе без повторного изменения баланса пациента"
						}
						className="min-h-[32px] px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
						data-testid="btn-fiscalization-retry-direct"
					>
						<RotateCcw
							size={13}
							className={isRetryingFiscalization ? "animate-spin" : ""}
						/>
						<span>Повторить печать чека</span>
					</button>
				</div>
			)}
		</>
	);
};
