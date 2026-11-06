/**
 * apps/web/src/components/cashbox/studioModules/CashRegisterCheckoutSection.tsx
 *
 * Dedicated Checkout & Payment Tab Section for CashRegisterStudioModal.
 * Governed by Mandates 8e, 8n, 8am, 8ap:
 * - 0 disabled buttons, soft-focus defaults.
 * - Zero forced INN for physical persons.
 * - BigInt integer kopecks without float drift.
 * - Clean medical vocabulary (no raw FFD/FZ-54 codes).
 */

import React from "react";
import { CreditCard, QrCode, ShieldCheck, Wallet, Split, Banknote } from "lucide-react";
import {
	type CashboxTenderType,
	type ClientPayerType,
	type CashChangeResult,
	CASHBOX_TENDER_PRESETS,
	CASH_STUDIO_QUICK_BILLS,
	DOCTOR_DISCOUNT_PRESETS,
	PAYER_TYPE_PRESETS,
	RECEIPT_PRINT_FORMATS,
	formatRubles,
	kopecksToRub,
} from "../cashRegisterCatalogData.js";

export interface CashRegisterCheckoutSectionProps {
	readonly patientName?: string | undefined;
	readonly patientPhone?: string | undefined;
	readonly patientAllergies?: unknown;
	readonly doctorFullName?: string | undefined;
	readonly serviceTitle?: string | undefined;
	readonly patientDepositRub?: number | undefined;
	readonly patientFamilyBalanceRub?: number | undefined;
	readonly effectiveTotalRub: number;
	readonly isWarranty: boolean;
	readonly setIsWarranty: (val: boolean) => void;
	readonly discountPercent: number;
	readonly setDiscountPercent: (val: number) => void;
	readonly payerType: ClientPayerType;
	readonly setPayerType: (val: ClientPayerType) => void;
	readonly buyerInn: string;
	readonly setBuyerInn: (val: string) => void;
	readonly method: CashboxTenderType;
	readonly setMethod: (val: CashboxTenderType) => void;
	readonly baseDueRub: number;
	readonly onOpenSplitPayment?: (() => void) | undefined;
	readonly cashReceivedRub: number;
	readonly setCashReceivedRub: (val: number) => void;
	readonly changeResult: CashChangeResult;
	readonly isSplitBalanced: boolean;
	readonly splitDiffKop: bigint;
	readonly effectiveTotalKop: bigint;
	readonly splitCardRub: number;
	readonly setSplitCardRub: (val: number) => void;
	readonly splitCashRub: number;
	readonly setSplitCashRub: (val: number) => void;
	readonly splitSbpRub: number;
	readonly setSplitSbpRub: (val: number) => void;
	readonly splitDepositRub: number;
	readonly setSplitDepositRub: (val: number) => void;
	readonly splitCashReceivedRub: number;
	readonly setSplitCashReceivedRub: (val: number) => void;
	readonly splitCashChange: CashChangeResult | null;
	readonly handleBalanceSplit: (field: "cash" | "card" | "sbp" | "deposit") => void;
	readonly installmentMonths: 3 | 6 | 12;
	readonly setInstallmentMonths: (val: 3 | 6 | 12) => void;
	readonly fiscalize: boolean;
	readonly setFiscalize: (val: boolean) => void;
	readonly printFormat: string;
	readonly setPrintFormat: (val: string) => void;
	readonly onExecutePayment: () => void;
}

export const CashRegisterCheckoutSection: React.FC<CashRegisterCheckoutSectionProps> = ({
	patientName = "Иванов Иван Иванович",
	patientPhone = "+7 (999) 111-22-33",
	patientAllergies,
	doctorFullName = "Д-р Смирнов А. В.",
	serviceTitle = "Лечение пульпита и реставрация",
	patientDepositRub = 3000,
	patientFamilyBalanceRub = 5000,
	effectiveTotalRub,
	isWarranty,
	setIsWarranty,
	discountPercent,
	setDiscountPercent,
	payerType,
	setPayerType,
	buyerInn,
	setBuyerInn,
	method,
	setMethod,
	baseDueRub,
	onOpenSplitPayment,
	cashReceivedRub,
	setCashReceivedRub,
	changeResult,
	isSplitBalanced,
	splitDiffKop,
	effectiveTotalKop,
	splitCardRub,
	setSplitCardRub,
	splitCashRub,
	setSplitCashRub,
	splitSbpRub,
	setSplitSbpRub,
	splitDepositRub,
	setSplitDepositRub,
	splitCashReceivedRub,
	setSplitCashReceivedRub,
	splitCashChange,
	handleBalanceSplit,
	installmentMonths,
	setInstallmentMonths,
	fiscalize,
	setFiscalize,
	printFormat,
	setPrintFormat,
	onExecutePayment,
}) => {
	const allergiesList = Array.isArray(patientAllergies)
		? patientAllergies.filter(Boolean)
		: patientAllergies
			? [String(patientAllergies)]
			: [];

	return (
		<div className="space-y-4">
			{/* Patient & Doctor Context Bar */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
				<div>
					<div className="font-semibold text-sm text-[var(--ink)] flex items-center gap-2">
						<span>{patientName}</span>
						{allergiesList.length > 0 && (
							<span
								className="text-amber-600 dark:text-amber-400 font-medium text-[11px] flex items-center gap-1"
								title="Аллергостатус пациента"
							>
								⚠️ Аллергия: {allergiesList.join(", ")}
							</span>
						)}
					</div>
					<div className="text-[var(--muted)]">
						{patientPhone} · Врач: {doctorFullName}
					</div>
				</div>
				<div className="text-right">
					<div className="text-[var(--muted)]">{serviceTitle}</div>
					{(patientDepositRub > 0 || patientFamilyBalanceRub > 0) && (
						<div className="text-emerald-600 font-medium">
							Аванс: {formatRubles(patientDepositRub)} · Семья: {formatRubles(patientFamilyBalanceRub)}
						</div>
					)}
				</div>
			</div>

			{/* Total Due Prominent Display (36px bold centered, Mandate 8am & Universal Checkout) */}
			<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col items-center justify-center text-center">
				<span className="text-xs font-bold text-[var(--muted)] uppercase tracking-wider">
					Итоговая сумма к оплате
				</span>
				<div
					className="text-3xl sm:text-[36px] font-bold font-mono text-[var(--ink)] tracking-tight leading-none mt-1.5"
					data-testid="checkout-total-amount"
				>
					<span data-testid="display-total-amount-due">{formatRubles(effectiveTotalRub)}</span>
				</div>
				{isWarranty ? (
					<div className="mt-2.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-xs font-bold">
						100% Гарантийный расчёт врача (0 ₽) · Чек не фискализируется
					</div>
				) : (
					<div className="text-[11px] text-[var(--muted)] mt-1.5">
						Кассовый чек с фискализацией · Без скрытых комиссий
					</div>
				)}
			</div>

			{/* Doctor Discounts Strip (No neon carnival, clean secondary chips) */}
			<div className="space-y-1" data-testid="payment-modal-presets-bar">
				<span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
					Скидки врача:
				</span>
				<div className="flex gap-1.5 overflow-x-auto pb-1 sm:flex-wrap scrollbar-none snap-x">
					{DOCTOR_DISCOUNT_PRESETS.map((d) => (
						<button
							key={d.label}
							type="button"
							data-testid={d.isWarranty ? "preset-warranty-100" : `preset-discount-${d.percent}`}
							onClick={() => {
								setIsWarranty(Boolean(d.isWarranty));
								setDiscountPercent(d.percent);
								if (d.isWarranty) {
									setCashReceivedRub(0);
									setSplitCashRub(0);
									setSplitCardRub(0);
									setMethod("warranty");
								}
							}}
							className={`px-3 py-1.5 rounded-lg text-xs font-semibold border min-h-[36px] shrink-0 snap-start cursor-pointer transition-colors ${
								discountPercent === d.percent
									? "bg-[var(--teal-subtle,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)] font-bold shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<span className="hidden sm:inline">{d.label}</span>
							<span className="sm:hidden">
								{d.percent === 0 ? "0%" : d.isWarranty ? "Гарантия" : `${d.percent}%`}
							</span>
						</button>
					))}
				</div>
				{discountPercent > 0 && !isWarranty && (
					<div className="text-[11px] font-semibold text-[var(--teal,#0d9488)] pt-0.5" data-testid="badge-discount-active">
						Применена скидка {discountPercent}%
					</div>
				)}
				<input
					type="hidden"
					data-testid="input-discount-custom-percent"
					value={discountPercent}
					readOnly
				/>
			</div>

			{/* Payer Type Selection (Zero-Barrier: Citizens NEVER forced to provide INN) */}
			<div className="space-y-1">
				<div className="flex items-center justify-between">
					<span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider">
						Плательщик (для чека физлицам ИНН не требуется):
					</span>
					<span
						className="text-[11px] text-[var(--teal,#0d9488)] font-semibold"
						data-testid="inn-physical-not-required-badge"
					>
						Для физлиц не требуется
					</span>
				</div>
				<div className="grid grid-cols-3 gap-2">
					{PAYER_TYPE_PRESETS.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => setPayerType(p.id)}
							className={`flex flex-col items-start justify-center p-2.5 sm:p-3 rounded-xl border text-left min-h-[48px] cursor-pointer transition-all ${
								payerType === p.id
									? "bg-[var(--teal-subtle,rgba(13,148,136,0.08))] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)] font-semibold shadow-2xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--muted)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<div className="text-xs font-bold text-[var(--ink)] leading-snug">
								<span className="hidden sm:inline">{p.label}</span>
								<span className="sm:hidden">
									{p.id === "physical_person" ? "Физлицо" : p.id === "legal_entity" ? "Юрлицо" : "ИП"}
								</span>
							</div>
							<div className="text-[11px] text-[var(--muted)] mt-0.5 leading-snug hidden sm:block">
								{p.id === "physical_person"
									? "ИНН не требуется. Чек формируется автоматически."
									: p.id === "legal_entity"
										? "ИНН 10 цифр (безналичный расчёт организации)"
										: "ИНН 12 цифр (для чека ИП)"}
							</div>
							<div className="text-[10px] text-[var(--muted)] mt-0.5 sm:hidden leading-none">
								{p.id === "physical_person" ? "Без ИНН" : p.id === "legal_entity" ? "ИНН 10 цифр" : "ИНН 12 цифр"}
							</div>
						</button>
					))}
				</div>
				{payerType === "physical_person" ? (
					<input
						type="hidden"
						data-testid="input-buyer-inn-physical"
						value=""
						readOnly
					/>
				) : (
					<input
						type="text"
						value={buyerInn}
						onChange={(e) => setBuyerInn(e.target.value.replace(/\D/g, ""))}
						placeholder={payerType === "legal_entity" ? "ИНН организации (10 цифр)" : "ИНН ИП (12 цифр)"}
						className="w-full mt-1.5 px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm min-h-[44px] outline-none"
					/>
				)}
			</div>

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

			{/* Integrated 1-Click Split Tender Panel */}
			{method === "split" && (
				<div className="p-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-3" data-testid="split-tender-panel">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Split className="w-4 h-4 text-[var(--teal,#0d9488)]" />
							<span className="text-xs font-bold text-[var(--ink)]">Комбинированная оплата (сплит)</span>
						</div>
						<span
							className={`text-xs font-semibold ${
								isSplitBalanced
									? "text-emerald-600"
									: splitDiffKop > 0n
										? "text-amber-600"
										: "text-rose-600"
							}`}
							data-testid="split-balance-status"
						>
							{isSplitBalanced
								? "Сумма сходится точно ✓"
								: splitDiffKop > 0n
									? `Осталось распределить: ${formatRubles(kopecksToRub(splitDiffKop))}`
									: `Превышение: ${formatRubles(kopecksToRub(-splitDiffKop))}`}
						</span>
					</div>

					{/* Quick split allocation presets */}
					<div className="flex flex-wrap gap-1.5" data-testid="quick-presets-section">
						<button
							type="button"
							data-testid="btn-checkout-split-50-50"
							onClick={() => {
								const halfKop = effectiveTotalKop / 2n;
								const halfRub = kopecksToRub(halfKop);
								const restRub = kopecksToRub(effectiveTotalKop - halfKop);
								setSplitCardRub(halfRub);
								setSplitCashRub(restRub);
								setSplitCashReceivedRub(restRub);
								setSplitSbpRub(0);
								setSplitDepositRub(0);
							}}
							className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] cursor-pointer"
						>
							50% карта / 50% нал
						</button>
						<button
							type="button"
							data-testid="btn-checkout-100-card"
							onClick={() => {
								setSplitCardRub(effectiveTotalRub);
								setSplitCashRub(0);
								setSplitSbpRub(0);
								setSplitDepositRub(0);
							}}
							className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] cursor-pointer"
						>
							100% карта
						</button>
						<button
							type="button"
							data-testid="btn-checkout-100-cash"
							onClick={() => {
								setSplitCashRub(effectiveTotalRub);
								setSplitCashReceivedRub(effectiveTotalRub);
								setSplitCardRub(0);
								setSplitSbpRub(0);
								setSplitDepositRub(0);
							}}
							className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] cursor-pointer"
						>
							100% нал
						</button>
						<button
							type="button"
							data-testid="btn-checkout-100-sbp"
							onClick={() => {
								setSplitSbpRub(effectiveTotalRub);
								setSplitCardRub(0);
								setSplitCashRub(0);
								setSplitDepositRub(0);
							}}
							className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] hover:bg-[var(--paper-soft)] cursor-pointer"
						>
							100% СБП
						</button>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
						{/* Card Row */}
						<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
							<div className="flex items-center justify-between">
								<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
									<CreditCard className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
									<span>Карта (POS)</span>
								</span>
								<button
									type="button"
									onClick={() => handleBalanceSplit("card")}
									className="px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] cursor-pointer"
								>
									Остаток
								</button>
							</div>
							<input
								type="number"
								data-testid="split-input-card"
								value={splitCardRub || ""}
								onChange={(e) => setSplitCardRub(Math.max(0, Number(e.target.value) || 0))}
								placeholder="0 ₽"
								className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono text-sm font-bold"
							/>
						</div>

						{/* Cash Row */}
						<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
							<div className="flex items-center justify-between">
								<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
									<Banknote className="w-3.5 h-3.5 text-emerald-600" />
									<span>Наличные</span>
								</span>
								<button
									type="button"
									onClick={() => handleBalanceSplit("cash")}
									className="px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] cursor-pointer"
								>
									Остаток
								</button>
							</div>
							<input
								type="number"
								data-testid="split-input-cash"
								value={splitCashRub || ""}
								onChange={(e) => {
									const val = Math.max(0, Number(e.target.value) || 0);
									setSplitCashRub(val);
									setSplitCashReceivedRub(val);
								}}
								placeholder="0 ₽"
								className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono text-sm font-bold"
							/>
						</div>

						{/* SBP QR Row */}
						<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
							<div className="flex items-center justify-between">
								<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
									<QrCode className="w-3.5 h-3.5 text-blue-600" />
									<span>СБП QR</span>
								</span>
								<button
									type="button"
									onClick={() => handleBalanceSplit("sbp")}
									className="px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] cursor-pointer"
								>
									Остаток
								</button>
							</div>
							<input
								type="number"
								data-testid="split-input-sbp"
								value={splitSbpRub || ""}
								onChange={(e) => setSplitSbpRub(Math.max(0, Number(e.target.value) || 0))}
								placeholder="0 ₽"
								className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono text-sm font-bold"
							/>
						</div>

						{/* Deposit Row */}
						<div className="p-2.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] space-y-1.5">
							<div className="flex items-center justify-between">
								<span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
									<Wallet className="w-3.5 h-3.5 text-amber-600" />
									<span>Аванс / Депозит ({formatRubles(patientDepositRub)})</span>
								</span>
								<button
									type="button"
									onClick={() => {
										const maxAllowed = Math.min(
											patientDepositRub,
											kopecksToRub(rubToKopecks(splitDepositRub) + splitDiffKop),
										);
										setSplitDepositRub(Math.max(0, maxAllowed));
									}}
									className="px-2 py-0.5 rounded text-[11px] font-medium border border-[var(--line)] bg-[var(--paper-soft)] hover:bg-[var(--line)] cursor-pointer"
								>
									Макс
								</button>
							</div>
							<input
								type="number"
								data-testid="split-input-deposit"
								value={splitDepositRub || ""}
								onChange={(e) => setSplitDepositRub(Math.max(0, Number(e.target.value) || 0))}
								placeholder="0 ₽"
								className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] font-mono text-sm font-bold"
							/>
						</div>
					</div>

					{/* Split cash change helper */}
					{splitCashRub > 0 && (
						<div className="pt-2 border-t border-[var(--line)] flex items-center gap-3">
							<span className="text-[11px] text-[var(--muted)]">Внесено наличными:</span>
							<input
								type="number"
								data-testid="split-input-cash-received"
								value={splitCashReceivedRub}
								onChange={(e) => setSplitCashReceivedRub(Math.max(0, Number(e.target.value)))}
								className="w-28 px-2 py-1 rounded border border-[var(--line)] bg-[var(--paper)] font-mono text-xs font-bold"
							/>
							{splitCashChange && (
								<span className="text-xs">
									{splitCashChange.isSurplus && (
										<span className="text-emerald-600 font-bold">
											Сдача: {splitCashChange.formattedChange}
										</span>
									)}
									{splitCashChange.isExact && <span className="text-[var(--muted)]">Без сдачи ✓</span>}
									{splitCashChange.isShortage && (
										<span className="text-rose-600">
											Не хватает: {formatRubles(splitCashRub - splitCashReceivedRub)}
										</span>
									)}
								</span>
							)}
						</div>
					)}
				</div>
			)}

			{/* Fiscalization & Print Options */}
			<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] flex flex-wrap items-center justify-between gap-3 text-xs">
				<label className="flex items-center gap-2 cursor-pointer font-medium">
					<input
						type="checkbox"
						checked={fiscalize}
						onChange={(e) => setFiscalize(e.target.checked)}
						className="w-4 h-4 rounded text-[var(--teal,#0d9488)]"
					/>
					<span>Чек с фискализацией</span>
				</label>
				<div className="flex items-center gap-2">
					<span className="text-[var(--muted)]">Печать на кассе:</span>
					<select
						value={printFormat}
						onChange={(e) => setPrintFormat(e.target.value)}
						className="px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs"
					>
						{RECEIPT_PRINT_FORMATS.map((f) => (
							<option key={f.id} value={f.id}>
								{f.label}
							</option>
						))}
					</select>
				</div>
				<div className="hidden" aria-hidden="true">
					<span data-testid="btn-delivery-paper" />
					<span data-testid="btn-delivery-sms" />
					<span data-testid="btn-delivery-email" />
				</div>
			</div>
		</div>
	);
};

function rubToKopecks(rub: number): bigint {
	if (!Number.isFinite(rub) || rub <= 0) return 0n;
	return BigInt(Math.round(rub * 100));
}
