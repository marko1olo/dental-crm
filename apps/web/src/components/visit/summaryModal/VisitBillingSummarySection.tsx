import type React from "react";
import { Check, CheckCircle2, CreditCard, QrCode, Wallet } from "lucide-react";
import type { PaymentMethodTab } from "../../finance/modal/payment/paymentModalTypes.js";

export interface VisitBillingSummarySectionProps {
	isVisitPaid: boolean;
	paidTenderMethod: PaymentMethodTab;
	paidAmountRub: number;
	effectiveTotalDueRub: number;
	effectiveDepositRub: number;
	onOpenPaymentModal: (method: PaymentMethodTab) => void;
}

export const VisitBillingSummarySection: React.FC<VisitBillingSummarySectionProps> = ({
	isVisitPaid,
	paidTenderMethod,
	paidAmountRub,
	effectiveTotalDueRub,
	effectiveDepositRub,
	onOpenPaymentModal,
}) => {
	const displayAmount = isVisitPaid
		? paidAmountRub || effectiveTotalDueRub
		: effectiveTotalDueRub;

	const tenderMethodLabel =
		paidTenderMethod === "sbp_qr"
			? "QR-код СБП"
			: paidTenderMethod === "card_terminal"
				? "Банковская карта"
				: paidTenderMethod === "family_deposit"
					? "Депозит / аванс"
					: paidTenderMethod === "cash"
						? "Наличные"
						: "Безналичный расчёт";

	return (
		<div
			className={`p-4 rounded-xl border transition-all ${
				isVisitPaid
					? "border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20"
					: "border-[var(--line)] bg-[var(--paper-soft)]"
			}`}
			data-testid="chairside-pos-block"
		>
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--line)]">
				<div className="flex items-center gap-3">
					<div
						className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
							isVisitPaid
								? "bg-emerald-600 text-white shadow-xs"
								: "bg-[var(--teal-surface)] text-[var(--teal)] border border-[var(--line)]"
						}`}
					>
						{isVisitPaid ? <CheckCircle2 className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
					</div>
					<div>
						<h4 className="text-sm font-bold text-[var(--ink)] flex items-center gap-2">
							Оплата приёма в кресле
							{isVisitPaid && (
								<span
									className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white"
									data-testid="chairside-paid-badge"
								>
									<Check className="w-3 h-3 stroke-[3]" />
									Чек выдан
								</span>
							)}
						</h4>
						<p className="text-xs text-[var(--muted)]">
							{isVisitPaid
								? `Платёж зафиксирован (${tenderMethodLabel})`
								: "Мгновенный расчёт без ожидания администратора на стойке"}
						</p>
					</div>
				</div>

				<div className="flex items-baseline sm:items-end flex-col">
					<span className="text-xs text-[var(--muted)] font-medium">
						{isVisitPaid ? "Оплаченная сумма:" : "Итого к оплате:"}
					</span>
					<span
						className={`text-xl sm:text-2xl font-black ${
							isVisitPaid ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--ink)]"
						}`}
						data-testid="chairside-total-due"
					>
						{`${displayAmount.toLocaleString("ru-RU")} ₽`}
					</span>
				</div>
			</div>

			{isVisitPaid ? (
				<div className="mt-3 flex items-center justify-between flex-wrap gap-2 pt-1 text-xs">
					<div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
						<CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
						<span>Оплата приёма принята · Чек сформирован и выдан</span>
					</div>
					<button
						type="button"
						onClick={() => onOpenPaymentModal(paidTenderMethod)}
						className="px-3.5 py-2 min-h-[38px] rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-strong)] border border-[var(--line)] text-[var(--ink)] font-bold text-xs cursor-pointer transition-colors shadow-2xs"
						data-testid="chairside-view-receipt-btn"
					>
						Повторный чек / Документы
					</button>
				</div>
			) : (
				<div className="mt-3 space-y-2">
					<div className="flex items-center justify-between text-xs text-[var(--muted)] font-medium">
						<span>Способ оплаты у кресла:</span>
						{effectiveDepositRub > 0 && (
							<span className="text-[var(--ink)] font-semibold">
								Аванс пациента: {effectiveDepositRub.toLocaleString("ru-RU")} ₽
							</span>
						)}
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
						{/* SBP QR */}
						<button
							type="button"
							onClick={() => onOpenPaymentModal("sbp_qr")}
							className="inline-flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer active:scale-[0.98]"
							data-testid="chairside-pay-sbp-qr-btn"
							title="Сформировать QR-код для оплаты через СБП"
						>
							<QrCode className="w-4 h-4 shrink-0" />
							<span>Оплатить по QR (СБП)</span>
						</button>

						{/* Card Terminal */}
						<button
							type="button"
							onClick={() => onOpenPaymentModal("card_terminal")}
							className="inline-flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-[0.98]"
							data-testid="chairside-pay-card-btn"
							title="Оплата банковской картой через POS-терминал"
						>
							<CreditCard className="w-4 h-4 text-blue-500 shrink-0" />
							<span>Банковская карта</span>
						</button>

						{/* Patient Family Deposit */}
						<button
							type="button"
							onClick={() => onOpenPaymentModal("family_deposit")}
							className="inline-flex items-center justify-center gap-2 px-3 py-2.5 min-h-[44px] rounded-xl bg-[var(--paper)] hover:bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] text-xs font-bold shadow-2xs transition-all cursor-pointer active:scale-[0.98]"
							data-testid="chairside-pay-deposit-btn"
							title={
								effectiveDepositRub > 0
									? `Списать с депозита пациента (${effectiveDepositRub.toLocaleString("ru-RU")} ₽)`
									: "Списание с депозита (на балансе 0 ₽)"
							}
						>
							<Wallet className="w-4 h-4 text-amber-500 shrink-0" />
							<span>
								{effectiveDepositRub > 0
									? `Списать с депозита (${effectiveDepositRub.toLocaleString("ru-RU")} ₽)`
									: "Списать с депозита"}
							</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);
};
