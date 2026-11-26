/**
 * apps/web/src/components/cashbox/studioModules/checkout/CheckoutPaymentMethods.tsx
 *
 * Dedicated Payment Method Selection & Tender Detail Panels for CashRegisterCheckoutSection.
 * Strictly integer kopecks (BigInt) without float drift (Mandates 8e, 8n, 8am, 8ap, 8bm).
 */

import React from "react";
import { CreditCard, Gift, ShieldCheck, Wallet } from "lucide-react";
import { formatKopecksToRub, kopecksToRubles } from "@dental/shared";
import {
	type CashboxTenderType,
	type CashChangeResult,
	CASHBOX_TENDER_PRESETS,
	CASH_STUDIO_QUICK_BILLS,
	rubToKopecks,
} from "../../cashRegisterCatalogData.js";
import { SbpDynamicQrCard } from "../../../billing/SbpDynamicQrCard.js";

export interface CheckoutPaymentMethodsProps {
	readonly method: CashboxTenderType;
	readonly setMethod: (val: CashboxTenderType) => void;
	readonly isWarranty: boolean;
	readonly setIsWarranty: (val: boolean) => void;
	readonly discountPercent: number;
	readonly setDiscountPercent: (val: number) => void;
	readonly baseDueKopecks: bigint;
	readonly effectiveTotalKopecks: bigint;
	readonly onOpenSplitPayment?: (() => void) | undefined;
	readonly cashReceivedKopecks: bigint;
	readonly setCashReceivedKopecks: (val: bigint) => void;
	readonly changeResult: CashChangeResult;
	readonly patientDepositKopecks?: bigint | undefined;
	readonly patientFamilyBalanceKopecks?: bigint | undefined;
	readonly setSplitCardKopecks: (val: bigint) => void;
	readonly setSplitCashKopecks: (val: bigint) => void;
	readonly setSplitSbpKopecks: (val: bigint) => void;
	readonly setSplitDepositKopecks: (val: bigint) => void;
	readonly installmentMonths: 3 | 6 | 12;
	readonly setInstallmentMonths: (val: 3 | 6 | 12) => void;
	readonly onExecutePayment: () => void;
	readonly invoiceId?: string | undefined;
	readonly orderId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly certificateNumber?: string | undefined;
	readonly setCertificateNumber?: ((val: string) => void) | undefined;
}

export const CheckoutPaymentMethods: React.FC<CheckoutPaymentMethodsProps> = ({
	method,
	setMethod,
	isWarranty,
	setIsWarranty,
	discountPercent,
	setDiscountPercent,
	baseDueKopecks,
	effectiveTotalKopecks,
	onOpenSplitPayment,
	cashReceivedKopecks,
	setCashReceivedKopecks,
	changeResult,
	patientDepositKopecks = 0n,
	patientFamilyBalanceKopecks = 0n,
	setSplitCardKopecks,
	setSplitCashKopecks,
	setSplitSbpKopecks,
	setSplitDepositKopecks,
	installmentMonths,
	setInstallmentMonths,
	onExecutePayment,
	invoiceId,
	orderId,
	patientName,
	certificateNumber,
	setCertificateNumber,
}) => {
	const availableBalanceKopecks = patientDepositKopecks + patientFamilyBalanceKopecks;
	const cashReceivedDisplay = kopecksToRubles(Number(cashReceivedKopecks));

	return (
		<>
			<div className="space-y-1">
				<div className="flex items-center justify-between">
					<span className="text-xs font-semibold text-[var(--ink-muted)]">
						Способ оплаты:
					</span>
					{onOpenSplitPayment && (
						<button
							type="button"
							data-testid="link-open-split-payment"
							onClick={onOpenSplitPayment}
							className="text-xs text-[var(--primary)] hover:underline font-semibold cursor-pointer"
						>
							Разделить платёж
						</button>
					)}
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
					{CASHBOX_TENDER_PRESETS.slice(0, 5).map((t) => (
						<button
							key={t.id}
							type="button"
							data-testid={`btn-tender-${t.id}`}
							onClick={() => {
								setMethod(t.id);
								if (t.id === "warranty") {
									setIsWarranty(true);
									setDiscountPercent(100);
									setCashReceivedKopecks(0n);
								} else {
									if (isWarranty || discountPercent === 100) {
										setIsWarranty(false);
										setDiscountPercent(0);
									}
									if (t.id === "cash") {
										setCashReceivedKopecks(baseDueKopecks);
									}
								}
							}}
							className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1 min-h-[52px] cursor-pointer transition-all ${
								method === t.id
									? "bg-[var(--primary-soft)] border-[var(--primary)] text-[var(--primary)] font-semibold shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<span className="text-sm font-semibold">{t.label}</span>
							<span className="text-xs text-[var(--ink-muted)]">{t.shortLabel}</span>
						</button>
					))}
				</div>

				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
					{CASHBOX_TENDER_PRESETS.slice(5).map((t) => (
						<button
							key={t.id}
							type="button"
							data-testid={`btn-tender-${t.id}`}
							onClick={() => {
								setMethod(t.id);
								if (isWarranty || discountPercent === 100) {
									setIsWarranty(false);
									setDiscountPercent(0);
								}
								if (t.id === "split") {
									setSplitCardKopecks(baseDueKopecks);
									setSplitCashKopecks(0n);
									setSplitSbpKopecks(0n);
									setSplitDepositKopecks(0n);
									onOpenSplitPayment?.();
								}
							}}
							className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 min-h-[44px] cursor-pointer transition-all ${
								method === t.id
									? "bg-[var(--primary-soft)] border-[var(--primary)] text-[var(--primary)] font-semibold shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<span className="text-xs font-semibold">{t.label}</span>
							<span className="text-xs text-[var(--ink-muted)]">{t.shortLabel || t.description}</span>
						</button>
					))}
				</div>
			</div>

			{method === "card" && (
				<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2" data-testid="card-pos-panel">
					<div className="flex items-center justify-between gap-2">
						<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-2">
							<CreditCard className="w-4 h-4 text-[var(--primary)] shrink-0" />
							<span>Оплата банковской картой через POS-терминал</span>
						</span>
						<span className="text-sm font-semibold font-mono tabular-nums text-right text-[var(--ink)]">
							{formatKopecksToRub(effectiveTotalKopecks)}
						</span>
					</div>
					<p className="text-xs text-[var(--ink-muted)]">
						Приложите карту, смартфон с Mir Pay или платёжный стикер к терминалу клиники. Чек распечатается автоматически.
					</p>
				</div>
			)}

			{method === "sbp" && (
				<div className="space-y-2" data-testid="sbp-qr-embedded-container">
					<SbpDynamicQrCard
						sumRub={kopecksToRubles(Number(effectiveTotalKopecks))}
						invoiceId={invoiceId}
						orderId={orderId}
						patientName={patientName}
						onPaymentSuccess={onExecutePayment}
					/>
				</div>
			)}

			{method === "installment" && (
				<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3" data-testid="installment-tender-panel">
					<div className="flex items-center justify-between gap-2">
						<div className="flex items-center gap-2">
							<ShieldCheck className="w-4 h-4 text-[var(--primary)] shrink-0" />
							<span className="text-xs font-bold text-[var(--ink)]">Беспроцентная рассрочка 0% для пациента</span>
						</div>
						<span className="text-xs font-bold text-[var(--success-ink)]">0 ₽ переплаты</span>
					</div>
					<p className="text-xs text-[var(--ink-muted)]">
						Клиника компенсирует банковскую комиссию. Пациент оплачивает лечение равными частями без переплаты.
					</p>
					<div className="grid grid-cols-3 gap-2">
						{([3, 6, 12] as const).map((m) => {
							const monthlyKop = effectiveTotalKopecks / BigInt(m);
							return (
								<button
									key={m}
									type="button"
									onClick={() => setInstallmentMonths(m)}
									className={`p-2.5 min-h-[44px] rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
										installmentMonths === m
											? "bg-[var(--primary-soft)] border-[var(--primary)] text-[var(--primary)] font-semibold shadow-xs"
											: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
									}`}
								>
									<span className="text-xs font-semibold">{m} месяцев</span>
									<span className="text-sm font-bold font-mono tabular-nums mt-0.5">
										{formatKopecksToRub(monthlyKop)}/мес
									</span>
								</button>
							);
						})}
					</div>
					<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between text-xs gap-2">
						<span className="text-[var(--ink-muted)]">Банки-партнёры: Т-Банк, Сбербанк, ОТП</span>
						<span className="text-xs font-semibold text-[var(--primary)]">Одобрение онлайн за 2 минуты</span>
					</div>
				</div>
			)}

			{method === "warranty" && (
				<div className="p-4 rounded-xl border border-[var(--success-line)] bg-[var(--success-soft)] space-y-2" data-testid="warranty-tender-panel">
					<div className="flex items-center gap-2 text-[var(--success-ink)] font-bold text-sm">
						<ShieldCheck className="w-4 h-4 shrink-0" />
						<span>100% Гарантийная переделка врача</span>
					</div>
					<p className="text-xs text-[var(--ink)] leading-relaxed">
						Сумма счёта составляет <strong>0 ₽</strong> (скидка 100%). При гарантийном приёме фискальный чек не формируется.
						В медицинской карте и журнале оплат фиксируется отметка о гарантийном приёме без финансовых списаний.
					</p>
				</div>
			)}

			{method === "deposit" && (
				<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2" data-testid="deposit-tender-panel">
					<div className="flex items-center justify-between gap-2">
						<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-2">
							<Wallet className="w-4 h-4 text-[var(--warning-ink)] shrink-0" />
							<span>Списание с баланса / депозита</span>
						</span>
						<span className="text-xs font-mono tabular-nums font-bold text-[var(--success-ink)]">
							Доступно: {formatKopecksToRub(availableBalanceKopecks)}
						</span>
					</div>
					<p className="text-xs text-[var(--ink-muted)]">
						Средства будут автоматически списаны с персонального аванса пациента или общего семейного счёта.
					</p>
				</div>
			)}

			{method === "certificate" && (
				<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2.5" data-testid="certificate-tender-panel">
					<div className="flex items-center justify-between gap-2">
						<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-2">
							<Gift className="w-4 h-4 text-[var(--primary)] shrink-0" />
							<span>Оплата подарочным сертификатом клиники</span>
						</span>
						<span className="h-6 px-2 text-xs font-medium rounded-full inline-flex items-center bg-[var(--paper)] border border-[var(--line)] text-[var(--ink-muted)] shrink-0">
							Зачёт аванса
						</span>
					</div>
					<p className="text-xs text-[var(--ink-muted)]">
						Введите 16-значный номер сертификата (алгоритм Луна). Сумма зачёта списывается с номинала сертификата.
					</p>
					<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
						<input
							type="text"
							data-testid="input-cashbox-certificate-number"
							value={certificateNumber || ""}
							onChange={(e) => setCertificateNumber?.(e.target.value)}
							placeholder="7701-XXXX-XXXX-XXXX"
							maxLength={19}
							className="flex-1 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] font-mono text-sm tracking-wide text-[var(--ink)] min-h-[44px] focus:outline-none focus:border-[var(--primary)]"
						/>
					</div>
				</div>
			)}

			{method === "cash" && (
				<div className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2.5" data-testid="cash-tender-panel">
					<div className="flex flex-wrap items-center justify-between gap-2">
						<span className="text-xs font-bold text-[var(--ink)]">Быстрые суммы:</span>
						<div className="flex flex-wrap gap-1.5">
							{CASH_STUDIO_QUICK_BILLS.map((nom) => (
								<button
									key={nom}
									type="button"
									data-testid={`btn-cash-${nom}`}
									onClick={() => setCashReceivedKopecks(rubToKopecks(nom))}
									className="dente-btn dente-btn-secondary px-2.5 py-1 rounded-lg text-xs font-semibold font-mono tabular-nums border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] min-h-[44px] sm:min-h-[36px] cursor-pointer hover:bg-[var(--paper-soft)]"
								>
									+{nom} ₽
								</button>
							))}
							<button
								type="button"
								data-testid="btn-cash-exact"
								onClick={() => setCashReceivedKopecks(effectiveTotalKopecks)}
								className="dente-btn dente-btn-secondary px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] min-h-[44px] sm:min-h-[36px] cursor-pointer hover:bg-[var(--paper-soft)]"
							>
								Без сдачи
							</button>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<input
							type="number"
							data-testid="input-cash-received"
							value={cashReceivedDisplay}
							onChange={(e) => setCashReceivedKopecks(rubToKopecks(Math.max(0, Number(e.target.value) || 0)))}
							className="w-36 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] font-mono tabular-nums text-base font-bold min-h-[44px]"
							placeholder="Внесено"
						/>
						<div className="text-sm font-mono tabular-nums">
							{changeResult.isSurplus && (
								<span className="text-[var(--success-ink)] font-bold" data-testid="display-cash-change">
									Сдача: {changeResult.formattedChange}
								</span>
							)}
							{changeResult.isExact && <span className="text-[var(--ink-muted)] font-sans font-medium">Без сдачи ✓</span>}
							{changeResult.isShortage && (
								<span className="text-[var(--danger-ink)] font-medium" data-testid="display-cash-shortage">
									Не хватает: {changeResult.formattedShortage}
								</span>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
};
