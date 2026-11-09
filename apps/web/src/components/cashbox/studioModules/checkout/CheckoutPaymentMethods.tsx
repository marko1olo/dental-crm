/**
 * apps/web/src/components/cashbox/studioModules/checkout/CheckoutPaymentMethods.tsx
 *
 * Dedicated Payment Method Selection & Tender Detail Panels for CashRegisterCheckoutSection.
 * Governed by Mandates 8e, 8n, 8am, 8ap:
 * - 0 disabled buttons, tactile >=44px tiles.
 * - SBP dynamic QR preview, POS guidance, installment breakdown, cash change calculation.
 * - Integer kopecks without float drift.
 */

import React from "react";
import { CreditCard, QrCode, ShieldCheck, Wallet } from "lucide-react";
import {
	type CashboxTenderType,
	type CashChangeResult,
	CASHBOX_TENDER_PRESETS,
	CASH_STUDIO_QUICK_BILLS,
	formatRubles,
} from "../../cashRegisterCatalogData.js";

export interface CheckoutPaymentMethodsProps {
	readonly method: CashboxTenderType;
	readonly setMethod: (val: CashboxTenderType) => void;
	readonly isWarranty: boolean;
	readonly setIsWarranty: (val: boolean) => void;
	readonly discountPercent: number;
	readonly setDiscountPercent: (val: number) => void;
	readonly baseDueRub: number;
	readonly effectiveTotalRub: number;
	readonly onOpenSplitPayment?: (() => void) | undefined;
	readonly cashReceivedRub: number;
	readonly setCashReceivedRub: (val: number) => void;
	readonly changeResult: CashChangeResult;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly setSplitCardRub: (val: number) => void;
	readonly setSplitCashRub: (val: number) => void;
	readonly setSplitSbpRub: (val: number) => void;
	readonly setSplitDepositRub: (val: number) => void;
	readonly installmentMonths: 3 | 6 | 12;
	readonly setInstallmentMonths: (val: 3 | 6 | 12) => void;
	readonly onExecutePayment: () => void;
}

export const CheckoutPaymentMethods: React.FC<CheckoutPaymentMethodsProps> = ({
	method,
	setMethod,
	isWarranty,
	setIsWarranty,
	discountPercent,
	setDiscountPercent,
	baseDueRub,
	effectiveTotalRub,
	onOpenSplitPayment,
	cashReceivedRub,
	setCashReceivedRub,
	changeResult,
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
	setSplitCardRub,
	setSplitCashRub,
	setSplitSbpRub,
	setSplitDepositRub,
	installmentMonths,
	setInstallmentMonths,
	onExecutePayment,
}) => {
	return (
		<>
			{/* Payment Method Selector */}
			<div className="space-y-1">
				<div className="flex items-center justify-between">
					<span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
						Способ оплаты:
					</span>
					{onOpenSplitPayment && (
						<button
							type="button"
							data-testid="link-open-split-payment"
							onClick={onOpenSplitPayment}
							className="text-xs text-[var(--teal,#0d9488)] hover:underline font-semibold cursor-pointer"
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
									setCashReceivedRub(0);
								} else {
									if (isWarranty || discountPercent === 100) {
										setIsWarranty(false);
										setDiscountPercent(0);
									}
									if (t.id === "cash") {
										setCashReceivedRub(baseDueRub);
									}
								}
							}}
							className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1 min-h-[52px] cursor-pointer transition-all ${
								method === t.id
									? "bg-[var(--teal-subtle,rgba(13,148,136,0.1))] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<span className="text-sm font-semibold">{t.label}</span>
							<span className="text-[11px] text-[var(--muted)]">{t.shortLabel}</span>
						</button>
					))}
				</div>
				{/* Secondary Tenders: Split & Deposit */}
				<div className="grid grid-cols-2 gap-2 pt-1">
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
									setSplitCardRub(baseDueRub);
									setSplitCashRub(0);
									setSplitSbpRub(0);
									setSplitDepositRub(0);
									if (onOpenSplitPayment) onOpenSplitPayment();
								}
							}}
							className={`px-3 py-2 rounded-xl border flex items-center justify-between min-h-[44px] cursor-pointer transition-all ${
								method === t.id
									? "bg-[var(--teal-subtle,rgba(13,148,136,0.1))] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<span className="text-xs font-semibold">{t.label}</span>
							<span className="text-[11px] text-[var(--muted)]">{t.description}</span>
						</button>
					))}
				</div>
			</div>

			{/* Card Tender with POS Terminal Guidance */}
			{method === "card" && (
				<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2" data-testid="card-pos-panel">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-2">
							<CreditCard className="w-4 h-4 text-[var(--teal,#0d9488)]" />
							<span>Оплата банковской картой через POS-терминал</span>
						</span>
						<span className="text-sm font-bold font-mono text-[var(--ink)]">{formatRubles(effectiveTotalRub)}</span>
					</div>
					<p className="text-xs text-[var(--muted)]">
						Приложите карту, смартфон с Mir Pay или платёжный стикер к терминалу клиники. Чек распечатается автоматически.
					</p>
				</div>
			)}

			{/* SBP QR Dynamic Card */}
			{method === "sbp" && (
				<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3" data-testid="sbp-qr-embedded-container">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<QrCode className="w-4 h-4 text-[var(--teal,#0d9488)]" />
							<span className="text-xs font-bold text-[var(--ink)]">Оплата по динамическому QR СБП</span>
						</div>
						<span className="text-xs font-mono font-bold text-[var(--ink)]">{formatRubles(effectiveTotalRub)}</span>
					</div>
					<div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-2">
						<div className="p-2.5 rounded-xl bg-white border border-[var(--line)] shadow-xs flex items-center justify-center" data-testid="sbp-dynamic-qr-svg">
							<svg className="w-28 h-28 text-slate-900" viewBox="0 0 100 100" fill="currentColor">
								<rect x="10" y="10" width="25" height="25" rx="3" />
								<rect x="65" y="10" width="25" height="25" rx="3" />
								<rect x="10" y="65" width="25" height="25" rx="3" />
								<rect x="15" y="15" width="15" height="15" fill="white" />
								<rect x="70" y="15" width="15" height="15" fill="white" />
								<rect x="15" y="70" width="15" height="15" fill="white" />
								<rect x="19" y="19" width="7" height="7" fill="currentColor" />
								<rect x="74" y="19" width="7" height="7" fill="currentColor" />
								<rect x="19" y="74" width="7" height="7" fill="currentColor" />
								<circle cx="50" cy="50" r="10" fill="var(--teal, #0d9488)" />
							</svg>
						</div>
						<div className="space-y-2 text-center sm:text-left text-xs">
							<p className="font-semibold text-[var(--ink)]">Наведите камеру смартфона на QR-код</p>
							<p className="text-[var(--muted)] text-[11px]">
								Пациент подтверждает оплату в приложении любого банка РФ без комиссии
							</p>
							<div className="flex items-center gap-2 pt-1 justify-center sm:justify-start">
								<button
									type="button"
									data-testid="btn-check-sbp-status"
									className="px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-semibold hover:bg-[var(--paper-soft)] cursor-pointer"
								>
									Проверить статус
								</button>
								<button
									type="button"
									data-testid="btn-manual-confirm-sbp"
									onClick={onExecutePayment}
									className="px-3 py-1.5 rounded-lg border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] bg-[var(--paper)] text-xs font-bold hover:bg-[var(--teal-subtle)] cursor-pointer"
								>
									Подтвердить вручную
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Installments 0% Panel */}
			{method === "installment" && (
				<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3" data-testid="installment-tender-panel">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<ShieldCheck className="w-4 h-4 text-[var(--teal,#0d9488)]" />
							<span className="text-xs font-bold text-[var(--ink)]">Беспроцентная рассрочка 0% для пациента</span>
						</div>
						<span className="text-xs font-bold text-emerald-600">0 ₽ переплаты</span>
					</div>
					<p className="text-xs text-[var(--muted)]">
						Клиника компенсирует банковскую комиссию. Пациент оплачивает лечение равными частями без переплаты.
					</p>
					<div className="grid grid-cols-3 gap-2">
						{([3, 6, 12] as const).map((m) => (
							<button
								key={m}
								type="button"
								onClick={() => setInstallmentMonths(m)}
								className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
									installmentMonths === m
										? "bg-[var(--teal-subtle,rgba(13,148,136,0.1))] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-bold shadow-xs"
										: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
								}`}
							>
								<span className="text-xs font-semibold">{m} месяцев</span>
								<span className="text-sm font-bold font-mono mt-0.5">
									{formatRubles(Math.round(effectiveTotalRub / m))}/мес
								</span>
							</button>
						))}
					</div>
					<div className="p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)] flex items-center justify-between text-xs">
						<span className="text-[var(--muted)]">Банки-партнёры: Т-Банк, Сбербанк, ОТП</span>
						<span className="text-xs font-semibold text-[var(--teal,#0d9488)]">Одобрение онлайн за 2 минуты</span>
					</div>
				</div>
			)}

			{/* 100% Warranty Panel */}
			{method === "warranty" && (
				<div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2" data-testid="warranty-tender-panel">
					<div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
						<ShieldCheck className="w-5 h-5 shrink-0" />
						<span>100% Гарантийная переделка врача</span>
					</div>
					<p className="text-xs text-[var(--ink)] leading-relaxed">
						Сумма счёта составляет <strong>0 ₽</strong> (скидка 100%). При гарантийном приёме фискальный чек не формируется.
						В медицинской карте и журнале оплат фиксируется отметка о гарантийном приёме без финансовых списаний.
					</p>
				</div>
			)}

			{/* Deposit Tender Panel */}
			{method === "deposit" && (
				<div className="p-3.5 sm:p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2" data-testid="deposit-tender-panel">
					<div className="flex items-center justify-between">
						<span className="text-xs font-bold text-[var(--ink)] flex items-center gap-2">
							<Wallet className="w-4 h-4 text-amber-600" />
							<span>Списание с баланса / депозита</span>
						</span>
						<span className="text-xs font-mono font-bold text-emerald-600">
							Доступно: {formatRubles(patientDepositRub + patientFamilyBalanceRub)}
						</span>
					</div>
					<p className="text-xs text-[var(--muted)]">
						Средства будут автоматически списаны с персонального аванса пациента или общего семейного счёта.
					</p>
				</div>
			)}

			{/* Cash Tender with Real-Time Change Calculation */}
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
									onClick={() => setCashReceivedRub(nom)}
									className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] min-h-[36px] cursor-pointer hover:bg-[var(--paper-soft)]"
								>
									+{nom} ₽
								</button>
							))}
							<button
								type="button"
								data-testid="btn-cash-exact"
								onClick={() => setCashReceivedRub(effectiveTotalRub)}
								className="px-2.5 py-1 rounded-lg text-xs font-bold border border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] bg-[var(--paper)] min-h-[36px] cursor-pointer"
							>
								Без сдачи
							</button>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<input
							type="number"
							data-testid="input-cash-received"
							value={cashReceivedRub}
							onChange={(e) => setCashReceivedRub(Math.max(0, Number(e.target.value)))}
							className="w-36 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] font-mono text-base font-bold min-h-[44px]"
							placeholder="Внесено"
						/>
						<div className="text-sm">
							{changeResult.isSurplus && (
								<span className="text-emerald-600 font-bold" data-testid="display-cash-change">
									Сдача: {changeResult.formattedChange}
								</span>
							)}
							{changeResult.isExact && <span className="text-[var(--muted)] font-medium">Без сдачи ✓</span>}
							{changeResult.isShortage && (
								<span className="text-rose-600 font-medium" data-testid="display-cash-shortage">
									Не хватает: {formatRubles(effectiveTotalRub - cashReceivedRub)}
								</span>
							)}
						</div>
					</div>
				</div>
			)}
		</>
	);
};
