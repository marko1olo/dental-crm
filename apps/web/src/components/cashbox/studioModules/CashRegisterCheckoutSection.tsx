/**
 * apps/web/src/components/cashbox/studioModules/CashRegisterCheckoutSection.tsx
 *
 * Dedicated Checkout & Payment Tab Section for CashRegisterStudioModal.
 * Decomposed into clean modular subcomponents (<300 lines each) under ./checkout/
 * Governed by Mandates 8e, 8n, 8am, 8ap, 8bf:
 * - 0 disabled buttons, soft-focus defaults.
 * - Zero forced INN for physical persons.
 * - BigInt integer kopecks without float drift.
 * - Clean medical vocabulary (no raw FFD/FZ-54 codes).
 * - Exact prop signatures and testid preservation.
 */

import React from "react";
import {
	type CashboxTenderType,
	type ClientPayerType,
	type CashChangeResult,
	formatRubles,
} from "../cashRegisterCatalogData.js";
import {
	CheckoutDiscountAndPayerControls,
	CheckoutPaymentMethods,
	CheckoutSplitPaymentPanel,
	CheckoutFiscalReceiptOptions,
} from "./checkout/index.js";

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
	patientName,
	patientPhone,
	patientAllergies,
	doctorFullName,
	serviceTitle,
	patientDepositRub = 0,
	patientFamilyBalanceRub = 0,
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
			{/* Patient & Doctor Context Bar / Empty State */}
			{patientName ? (
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
							{patientPhone ? `${patientPhone} · ` : ""}Врач: {doctorFullName || "Не назначен"}
						</div>
					</div>
					<div className="text-right">
						<div className="text-[var(--muted)]">{serviceTitle || "Приём стоматолога"}</div>
						{(patientDepositRub > 0 || patientFamilyBalanceRub > 0) && (
							<div className="text-emerald-600 font-medium">
								{patientDepositRub > 0 ? `Аванс: ${formatRubles(patientDepositRub)} ` : ""}
								{patientFamilyBalanceRub > 0 ? `· Семья: ${formatRubles(patientFamilyBalanceRub)}` : ""}
							</div>
						)}
					</div>
				</div>
			) : (
				<div
					className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-dashed border-[var(--line)] flex items-center justify-between gap-3 text-xs"
					data-testid="cashbox-empty-patient-state"
				>
					<div className="flex items-center gap-2.5 text-[var(--muted)]">
						<span className="text-base">👤</span>
						<span>Выберите пациента или счёт для расчёта (свободный чек кассы)</span>
					</div>
					<button
						type="button"
						onClick={() => {
							if (typeof window !== "undefined") {
								window.dispatchEvent(new CustomEvent("dente:open-patient-search"));
							}
						}}
						className="px-2.5 py-1 rounded-lg text-xs font-semibold text-[var(--teal,#0d9488)] hover:underline cursor-pointer"
					>
						Выбрать пациента
					</button>
				</div>
			)}

			{/* Total Due Prominent Display (36px bold centered, Mandate 8am & Universal Checkout) */}
			<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col items-center justify-center text-center">
				<span className="text-xs font-semibold text-[var(--muted)]">
					Сумма счёта к оплате
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
				) : effectiveTotalRub === 0 ? (
					<div className="text-[11px] text-[var(--muted)] mt-1.5">
						Свободный чек кассы · Без скрытых комиссий
					</div>
				) : (
					<div className="text-[11px] text-[var(--muted)] mt-1.5">
						Кассовый чек с фискализацией · Без скрытых комиссий
					</div>
				)}
			</div>

			{/* Doctor Discounts & Payer Type Selection */}
			<CheckoutDiscountAndPayerControls
				isWarranty={isWarranty}
				setIsWarranty={setIsWarranty}
				discountPercent={discountPercent}
				setDiscountPercent={setDiscountPercent}
				setCashReceivedRub={setCashReceivedRub}
				setSplitCashRub={setSplitCashRub}
				setSplitCardRub={setSplitCardRub}
				setMethod={setMethod}
				payerType={payerType}
				setPayerType={setPayerType}
				buyerInn={buyerInn}
				setBuyerInn={setBuyerInn}
			/>

			{/* Payment Method Selector & Tender Panels */}
			<CheckoutPaymentMethods
				method={method}
				setMethod={setMethod}
				isWarranty={isWarranty}
				setIsWarranty={setIsWarranty}
				discountPercent={discountPercent}
				setDiscountPercent={setDiscountPercent}
				baseDueRub={baseDueRub}
				effectiveTotalRub={effectiveTotalRub}
				onOpenSplitPayment={onOpenSplitPayment}
				cashReceivedRub={cashReceivedRub}
				setCashReceivedRub={setCashReceivedRub}
				changeResult={changeResult}
				patientDepositRub={patientDepositRub}
				patientFamilyBalanceRub={patientFamilyBalanceRub}
				setSplitCardRub={setSplitCardRub}
				setSplitCashRub={setSplitCashRub}
				setSplitSbpRub={setSplitSbpRub}
				setSplitDepositRub={setSplitDepositRub}
				installmentMonths={installmentMonths}
				setInstallmentMonths={setInstallmentMonths}
				onExecutePayment={onExecutePayment}
			/>

			{/* Integrated 1-Click Split Tender Panel */}
			{method === "split" && (
				<CheckoutSplitPaymentPanel
					effectiveTotalRub={effectiveTotalRub}
					effectiveTotalKop={effectiveTotalKop}
					isSplitBalanced={isSplitBalanced}
					splitDiffKop={splitDiffKop}
					splitCardRub={splitCardRub}
					setSplitCardRub={setSplitCardRub}
					splitCashRub={splitCashRub}
					setSplitCashRub={setSplitCashRub}
					splitSbpRub={splitSbpRub}
					setSplitSbpRub={setSplitSbpRub}
					splitDepositRub={splitDepositRub}
					setSplitDepositRub={setSplitDepositRub}
					splitCashReceivedRub={splitCashReceivedRub}
					setSplitCashReceivedRub={setSplitCashReceivedRub}
					splitCashChange={splitCashChange}
					handleBalanceSplit={handleBalanceSplit}
					patientDepositRub={patientDepositRub}
				/>
			)}

			{/* Fiscalization & Print Options */}
			<CheckoutFiscalReceiptOptions
				fiscalize={fiscalize}
				setFiscalize={setFiscalize}
				printFormat={printFormat}
				setPrintFormat={setPrintFormat}
			/>
		</div>
	);
};
