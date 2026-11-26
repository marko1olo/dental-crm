/**
 * apps/web/src/components/cashbox/studioModules/CashRegisterCheckoutSection.tsx
 *
 * Dedicated Checkout & Payment Tab Section for CashRegisterStudioModal.
 * Strictly BigInt integer kopecks without float drift (Mandates 8e, 8n, 8am, 8ap, 8bf, 8bm).
 */

import React from "react";
import { formatKopecksToRub } from "@dental/shared";
import type {
	CashboxTenderType,
	ClientPayerType,
	CashChangeResult,
} from "../cashRegisterCatalogData.js";
import type { AppliedDmsSplitKopecks } from "./useCashRegisterStudioState.js";
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
	readonly patientDepositKopecks?: bigint | undefined;
	readonly patientFamilyBalanceKopecks?: bigint | undefined;
	readonly effectiveTotalKopecks: bigint;
	readonly baseDueKopecks: bigint;
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
	readonly onOpenSplitPayment?: (() => void) | undefined;
	readonly cashReceivedKopecks: bigint;
	readonly setCashReceivedKopecks: (val: bigint) => void;
	readonly changeResult: CashChangeResult;
	readonly isSplitBalanced: boolean;
	readonly splitDiffKopecks: bigint;
	readonly splitCardKopecks: bigint;
	readonly setSplitCardKopecks: (val: bigint) => void;
	readonly splitCashKopecks: bigint;
	readonly setSplitCashKopecks: (val: bigint) => void;
	readonly splitSbpKopecks: bigint;
	readonly setSplitSbpKopecks: (val: bigint) => void;
	readonly splitDepositKopecks: bigint;
	readonly setSplitDepositKopecks: (val: bigint) => void;
	readonly splitBonusKopecks?: bigint | undefined;
	readonly setSplitBonusKopecks?: ((val: bigint) => void) | undefined;
	readonly splitCertKopecks?: bigint | undefined;
	readonly setSplitCertKopecks?: ((val: bigint) => void) | undefined;
	readonly patientBonusPoints?: number | undefined;
	readonly splitCashReceivedKopecks: bigint;
	readonly setSplitCashReceivedKopecks: (val: bigint) => void;
	readonly splitCashChange: CashChangeResult | null;
	readonly handleBalanceSplit: (field: "cash" | "card" | "sbp" | "deposit" | "bonus" | "certificate") => void;
	readonly installmentMonths: 3 | 6 | 12;
	readonly setInstallmentMonths: (val: 3 | 6 | 12) => void;
	readonly fiscalize: boolean;
	readonly setFiscalize: (val: boolean) => void;
	readonly printFormat: string;
	readonly setPrintFormat: (val: string) => void;
	readonly onExecutePayment: () => void;
	readonly certificateNumber?: string | undefined;
	readonly setCertificateNumber?: ((val: string) => void) | undefined;
	readonly appliedDmsSplit?: AppliedDmsSplitKopecks | null | undefined;
	readonly invoiceId?: string | undefined;
	readonly orderId?: string | undefined;
}

export const CashRegisterCheckoutSection: React.FC<CashRegisterCheckoutSectionProps> = ({
	patientName,
	patientPhone,
	patientAllergies,
	doctorFullName,
	serviceTitle,
	patientDepositKopecks = 0n,
	patientFamilyBalanceKopecks = 0n,
	effectiveTotalKopecks,
	baseDueKopecks,
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
	onOpenSplitPayment,
	cashReceivedKopecks,
	setCashReceivedKopecks,
	changeResult,
	isSplitBalanced,
	splitDiffKopecks,
	splitCardKopecks,
	setSplitCardKopecks,
	splitCashKopecks,
	setSplitCashKopecks,
	splitSbpKopecks,
	setSplitSbpKopecks,
	splitDepositKopecks,
	setSplitDepositKopecks,
	splitBonusKopecks = 0n,
	setSplitBonusKopecks,
	splitCertKopecks = 0n,
	setSplitCertKopecks,
	patientBonusPoints = 0,
	splitCashReceivedKopecks,
	setSplitCashReceivedKopecks,
	splitCashChange,
	handleBalanceSplit,
	installmentMonths,
	setInstallmentMonths,
	fiscalize,
	setFiscalize,
	printFormat,
	setPrintFormat,
	onExecutePayment,
	certificateNumber,
	setCertificateNumber,
	appliedDmsSplit,
	invoiceId,
	orderId,
}) => {
	const allergiesList = Array.isArray(patientAllergies)
		? patientAllergies.filter(Boolean)
		: patientAllergies
			? [String(patientAllergies)]
			: [];

	return (
		<div className="space-y-4">
			{appliedDmsSplit && (
				<div
					className="p-3 rounded-xl border flex items-center justify-between gap-3 text-xs"
					style={{
						background: "var(--primary-soft)",
						borderColor: "var(--primary)",
						color: "var(--ink)",
					}}
					data-testid="cashbox-dms-split-badge"
				>
					<div className="flex items-center gap-2">
						<span className="font-bold text-[var(--primary)]">Полис ДМС:</span>
						<span>
							{appliedDmsSplit.insurerName || "Страховая компания"} покрывает{" "}
							<span className="font-mono tabular-nums">{formatKopecksToRub(appliedDmsSplit.dmsKopecks)}</span>
						</span>
						{appliedDmsSplit.letterNumber && (
							<span className="text-[var(--ink-muted)]">
								({appliedDmsSplit.letterNumber})
							</span>
						)}
					</div>
					<div className="font-semibold text-right">
						Доплата на кассе:{" "}
						<span className="font-bold font-mono tabular-nums text-[var(--primary)]">
							{formatKopecksToRub(appliedDmsSplit.patientKopecks)}
						</span>
					</div>
				</div>
			)}

			{patientName ? (
				<div className="p-3 rounded-xl bg-[var(--paper-soft)] border border-[var(--line-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs">
					<div>
						<div className="font-semibold text-sm text-[var(--ink)] flex items-center gap-2">
							<span>{patientName}</span>
							{allergiesList.length > 0 && (
								<span
									className="text-[var(--warning-ink)] font-medium text-xs flex items-center gap-1"
									title="Аллергостатус пациента"
								>
									⚠️ Аллергия: {allergiesList.join(", ")}
								</span>
							)}
						</div>
						<div className="text-[var(--ink-muted)]">
							{patientPhone ? `${patientPhone} · ` : ""}Врач: {doctorFullName || "Не назначен"}
						</div>
					</div>
					<div className="text-right">
						<div className="text-[var(--ink-muted)]">{serviceTitle || "Приём стоматолога"}</div>
						{(patientDepositKopecks > 0n || patientFamilyBalanceKopecks > 0n) && (
							<div className="text-[var(--success-ink)] font-medium font-mono tabular-nums">
								{patientDepositKopecks > 0n ? `Аванс: ${formatKopecksToRub(patientDepositKopecks)} ` : ""}
								{patientFamilyBalanceKopecks > 0n ? `· Семья: ${formatKopecksToRub(patientFamilyBalanceKopecks)}` : ""}
							</div>
						)}
					</div>
				</div>
			) : (
				<div
					className="p-3.5 rounded-xl bg-[var(--paper-soft)] border border-dashed border-[var(--line)] flex items-center justify-between gap-3 text-xs"
					data-testid="cashbox-empty-patient-state"
				>
					<div className="flex items-center gap-2.5 text-[var(--ink-muted)]">
						<span>Выберите пациента или счёт для расчёта (свободный чек кассы)</span>
					</div>
					<button
						type="button"
						onClick={() => {
							if (typeof window !== "undefined") {
								window.dispatchEvent(new CustomEvent("dente:open-patient-search"));
							}
						}}
						className="dente-btn dente-btn-secondary h-9 min-h-[36px] px-3 rounded-lg text-xs font-medium bg-[var(--paper)] border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer whitespace-nowrap shrink-0"
					>
						Выбрать пациента
					</button>
				</div>
			)}

			<div className="p-4 sm:p-5 rounded-2xl bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col items-center justify-center text-center">
				<span className="text-xs font-semibold text-[var(--ink-muted)]">
					Сумма счёта к оплате
				</span>
				<div
					className="text-3xl sm:text-[36px] font-bold font-mono tabular-nums text-[var(--ink)] tracking-tight leading-none mt-1.5"
					data-testid="checkout-total-amount"
				>
					<span data-testid="display-total-amount-due">{formatKopecksToRub(effectiveTotalKopecks)}</span>
				</div>
				{isWarranty ? (
					<div className="mt-2.5 px-3 py-1 rounded-full bg-[var(--success-soft)] text-[var(--success-ink)] border border-[var(--success-line)] text-xs font-bold">
						100% Гарантийный расчёт врача (0 ₽) · Чек не фискализируется
					</div>
				) : effectiveTotalKopecks === 0n ? (
					<div className="text-xs text-[var(--ink-muted)] mt-1.5">
						Свободный чек кассы · Без скрытых комиссий
					</div>
				) : (
					<div className="text-xs text-[var(--ink-muted)] mt-1.5">
						Кассовый чек с фискализацией · Без скрытых комиссий
					</div>
				)}
			</div>

			<CheckoutDiscountAndPayerControls
				isWarranty={isWarranty}
				setIsWarranty={setIsWarranty}
				discountPercent={discountPercent}
				setDiscountPercent={setDiscountPercent}
				setCashReceivedKopecks={setCashReceivedKopecks}
				setSplitCashKopecks={setSplitCashKopecks}
				setSplitCardKopecks={setSplitCardKopecks}
				setMethod={setMethod}
				payerType={payerType}
				setPayerType={setPayerType}
				buyerInn={buyerInn}
				setBuyerInn={setBuyerInn}
			/>

			<CheckoutPaymentMethods
				method={method}
				setMethod={setMethod}
				isWarranty={isWarranty}
				setIsWarranty={setIsWarranty}
				discountPercent={discountPercent}
				setDiscountPercent={setDiscountPercent}
				baseDueKopecks={baseDueKopecks}
				effectiveTotalKopecks={effectiveTotalKopecks}
				onOpenSplitPayment={onOpenSplitPayment}
				cashReceivedKopecks={cashReceivedKopecks}
				setCashReceivedKopecks={setCashReceivedKopecks}
				changeResult={changeResult}
				patientDepositKopecks={patientDepositKopecks}
				patientFamilyBalanceKopecks={patientFamilyBalanceKopecks}
				setSplitCardKopecks={setSplitCardKopecks}
				setSplitCashKopecks={setSplitCashKopecks}
				setSplitSbpKopecks={setSplitSbpKopecks}
				setSplitDepositKopecks={setSplitDepositKopecks}
				installmentMonths={installmentMonths}
				setInstallmentMonths={setInstallmentMonths}
				onExecutePayment={onExecutePayment}
				invoiceId={invoiceId}
				orderId={orderId}
				patientName={patientName}
				certificateNumber={certificateNumber}
				setCertificateNumber={setCertificateNumber}
			/>

			{method === "split" && (
				<CheckoutSplitPaymentPanel
					effectiveTotalKopecks={effectiveTotalKopecks}
					isSplitBalanced={isSplitBalanced}
					splitDiffKopecks={splitDiffKopecks}
					splitCardKopecks={splitCardKopecks}
					setSplitCardKopecks={setSplitCardKopecks}
					splitCashKopecks={splitCashKopecks}
					setSplitCashKopecks={setSplitCashKopecks}
					splitSbpKopecks={splitSbpKopecks}
					setSplitSbpKopecks={setSplitSbpKopecks}
					splitDepositKopecks={splitDepositKopecks}
					setSplitDepositKopecks={setSplitDepositKopecks}
					splitBonusKopecks={splitBonusKopecks}
					setSplitBonusKopecks={setSplitBonusKopecks}
					splitCertificateKopecks={splitCertKopecks}
					setSplitCertificateKopecks={setSplitCertKopecks}
					certificateNumber={certificateNumber}
					setCertificateNumber={setCertificateNumber}
					patientBonusPoints={patientBonusPoints}
					splitCashReceivedKopecks={splitCashReceivedKopecks}
					setSplitCashReceivedKopecks={setSplitCashReceivedKopecks}
					splitCashChange={splitCashChange}
					handleBalanceSplit={handleBalanceSplit}
					patientDepositKopecks={patientDepositKopecks}
					patientFamilyBalanceKopecks={patientFamilyBalanceKopecks}
				/>
			)}

			<CheckoutFiscalReceiptOptions
				fiscalize={fiscalize}
				setFiscalize={setFiscalize}
				printFormat={printFormat}
				setPrintFormat={setPrintFormat}
			/>
		</div>
	);
};
