import {
	parseKopecks,
	percentageOfKopecks,
	splitKopecks,
} from "@dental/shared";
import {
	ChevronDown,
	Coins,
	CreditCard,
	SlidersHorizontal,
	UserRound,
} from "lucide-react";
import React, { useState } from "react";
import { money } from "./AppHelpers";
import { fromKopecks } from "./components/payments/cashDeskAmounts";
import { normalizeRubAmountInput } from "./rubAmountInput";

export type DoctorDiscountPreset =
	| "warranty_100"
	| "colleague_100"
	| "percent_50"
	| "percent_20"
	| "percent_10";

export interface InstallmentCalculatorProps {
	readonly totalAmount: number;
	readonly isOpen: boolean;
}

export function InstallmentCalculator({
	totalAmount,
	isOpen,
}: InstallmentCalculatorProps) {
	const [months, setMonths] = useState(6);
	const [downPaymentPercent, setDownPaymentPercent] = useState(0);

	const totalKopecks = parseKopecks(totalAmount);
	const basisPoints = Math.round(downPaymentPercent * 100);
	const downPaymentKopecks = percentageOfKopecks(totalKopecks, basisPoints);
	const remainingKopecks = Math.max(0, totalKopecks - downPaymentKopecks);
	const parts =
		months > 0 && remainingKopecks > 0
			? splitKopecks(remainingKopecks, months)
			: [0];
	const monthlyPaymentKopecks = parts[0] ?? 0;
	const lastMonthPaymentKopecks = parts[parts.length - 1] ?? 0;
	const downPayment = downPaymentKopecks / 100;
	const monthlyPayment = monthlyPaymentKopecks / 100;
	const lastMonthPayment = lastMonthPaymentKopecks / 100;
	const hasUnevenLastPayment =
		months > 0 && lastMonthPaymentKopecks !== monthlyPaymentKopecks;
	const scheduleTotalKopecks =
		downPaymentKopecks +
		parts.reduce((acc, part) => acc + (part ?? 0), 0);

	return (
		<details
			className="payment-capture-detail-section"
			open={isOpen}
			style={{ marginBottom: "6px" }}
		>
			<summary>Рассрочка от клиники, без банка</summary>
			<div className="smart-details-content p-3 sm:p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] mt-2">
				<div
					style={{
						display: "flex",
						gap: "20px",
						flexWrap: "wrap",
						marginBottom: "16px",
					}}
				>
					<div style={{ flex: "1 1 200px" }}>
						<label
							htmlFor="installment-months-range"
							style={{
								fontSize: "13px",
								fontWeight: 600,
								color: "var(--ink)",
								display: "block",
								marginBottom: "8px",
							}}
						>
							Срок рассрочки (мес): {months}
						</label>
						<input
							id="installment-months-range"
							type="range"
							min="2"
							max="24"
							step="1"
							value={months}
							onChange={(e) => setMonths(parseInt(e.target.value, 10))}
							style={{ width: "100%" }}
						/>
						<div className="dente-segmented-bar mt-2 flex" role="tablist" aria-label="Срок рассрочки">
							{[3, 6, 12, 24].map((m) => (
								<button
									key={m}
									type="button"
									style={{ minHeight: "44px" }}
									role="tab"
									aria-selected={months === m}
									className={`dente-segmented-item min-h-[44px] flex-1 ${months === m ? "active" : ""}`}
									onClick={() => setMonths(m)}
								>
									{m} мес
								</button>
							))}
						</div>
					</div>
					<div style={{ flex: "1 1 200px" }}>
						<label
							htmlFor="installment-down-payment-range"
							style={{
								fontSize: "13px",
								fontWeight: 600,
								color: "var(--ink)",
								display: "block",
								marginBottom: "8px",
							}}
						>
							Первоначальный взнос: {downPaymentPercent}%
						</label>
						<input
							id="installment-down-payment-range"
							type="range"
							min="0"
							max="80"
							step="10"
							value={downPaymentPercent}
							onChange={(e) =>
								setDownPaymentPercent(parseInt(e.target.value, 10))
							}
							style={{ width: "100%" }}
						/>
						<div className="dente-segmented-bar mt-2 flex" role="tablist" aria-label="Первоначальный взнос">
							{[0, 20, 30, 50].map((p) => (
								<button
									key={p}
									type="button"
									style={{ minHeight: "44px" }}
									role="tab"
									aria-selected={downPaymentPercent === p}
									className={`dente-segmented-item min-h-[44px] flex-1 ${downPaymentPercent === p ? "active" : ""}`}
									onClick={() => setDownPaymentPercent(p)}
								>
									{p}%
								</button>
							))}
						</div>
					</div>
				</div>

				<div className="flex flex-wrap items-center justify-between gap-3 pt-3 mt-3 border-t border-[var(--line)]">
					<div>
						<div style={{ fontSize: "12px", color: "var(--muted)" }}>
							Сумма лечения
						</div>
						<div style={{ fontSize: "16px", fontWeight: 600 }}>
							{money(totalAmount)}
						</div>
					</div>
					<div>
						<div style={{ fontSize: "12px", color: "var(--muted)" }}>
							Первый взнос
						</div>
						<div style={{ fontSize: "16px", fontWeight: 600 }}>
							{money(downPayment)}
						</div>
					</div>
					<div style={{ textAlign: "right" }}>
						<div style={{ fontSize: "12px", color: "var(--muted)" }}>
							Ежемесячный платеж
						</div>
						<div
							style={{
								fontSize: "20px",
								fontWeight: 700,
								color: "var(--rust)",
							}}
						>
							{money(monthlyPayment)}
						</div>
						{hasUnevenLastPayment && (
							<div
								style={{
									fontSize: "12px",
									color: "var(--muted)",
									marginTop: "2px",
								}}
							>
								последний месяц — {money(lastMonthPayment)}
							</div>
						)}
					</div>
				</div>
				<div
					style={{
						fontSize: "12px",
						color: "var(--muted)",
						marginTop: "12px",
					}}
				>
					Итого по графику: {money(fromKopecks(scheduleTotalKopecks))}
				</div>
			</div>
		</details>
	);
}

export interface PaymentDiscountsAndSplitSectionProps {
	readonly amount: string;
	readonly selectedDoctorDiscount: DoctorDiscountPreset | null;
	readonly onApplyDoctorDiscount: (preset: DoctorDiscountPreset) => void;
	readonly onApplySplit5050: () => void;
	readonly onApplyThreeWaySplit: () => void;
	readonly onApplyDepositPlusCard: () => void;
}

export function PaymentDiscountsAndSplitSection({
	amount,
	selectedDoctorDiscount,
	onApplyDoctorDiscount,
	onApplySplit5050,
	onApplyThreeWaySplit,
	onApplyDepositPlusCard,
}: PaymentDiscountsAndSplitSectionProps) {
	return (
		<>
			{/* Скидки врача и сплит оплаты под компактной раскрывающейся панелью */}
			<details
				className="payment-options-accordion group col-span-full rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] px-2.5 py-1.5 my-1 text-xs select-none shadow-xs"
				data-testid="payment-options-accordion"
				style={{ gridColumn: "1 / -1" }}
			>
				<summary className="flex items-center justify-between cursor-pointer font-semibold text-[var(--ink)] list-none hover:text-[var(--teal)] transition-colors min-h-[30px] px-1 [&::-webkit-details-marker]:hidden">
					<div className="flex items-center gap-1.5">
						<SlidersHorizontal size={13} className="text-[var(--teal)] shrink-0" />
						<span className="text-[11px] sm:text-xs font-bold">Скидки врача и сплит оплаты</span>
						{selectedDoctorDiscount && (
							<span className="text-[10px] font-bold text-teal-700 dark:text-teal-300 bg-teal-500/15 px-1.5 py-0.5 rounded">
								Скидка активна
							</span>
						)}
					</div>
					<div className="flex items-center gap-1 text-[11px] text-[var(--muted)]">
						<span className="group-open:hidden text-[10px]">Опции</span>
						<ChevronDown
							size={13}
							className="text-[var(--muted)] transition-transform duration-200 group-open:rotate-180 shrink-0"
						/>
					</div>
				</summary>
				<div className="pt-2 space-y-2 border-t border-[var(--line-subtle)] mt-1.5">
					{/* Скидки врача и гарантийные переделки */}
					<div
						className="doctor-discounts-section"
						data-testid="doctor-discounts-section"
					>
						<span className="text-[10px] sm:text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block mb-0.5">
							Скидка врача / Гарантия:
						</span>
						<div
							role="toolbar"
							className="dente-filter-chips doctor-discount-chips flex flex-wrap gap-1"
							aria-label="Скидки врача и гарантийные переделки"
						>
							<button
								type="button"
								style={{ minHeight: "44px" }}
								className={`dente-filter-chip min-h-[44px] ${selectedDoctorDiscount === "warranty_100" ? "active" : ""}`}
								onClick={() => onApplyDoctorDiscount("warranty_100")}
								data-testid="btn-doctor-discount-warranty"
								title="100% гарантийная переделка клинического этапа (к оплате 0 ₽)"
							>
								<span className="sm:hidden">100% Гарантия</span>
								<span className="hidden sm:inline">100% Гарантия (Переделка)</span>
							</button>
							<button
								type="button"
								style={{ minHeight: "44px" }}
								className={`dente-filter-chip min-h-[44px] ${selectedDoctorDiscount === "colleague_100" ? "active" : ""}`}
								onClick={() => onApplyDoctorDiscount("colleague_100")}
								data-testid="btn-doctor-discount-colleague"
								title="100% скидка для коллег и персонала клиники"
							>
								Персонал 100%
							</button>
							<button
								type="button"
								style={{ minHeight: "44px" }}
								className={`dente-filter-chip min-h-[44px] ${selectedDoctorDiscount === "percent_50" ? "active" : ""}`}
								onClick={() => onApplyDoctorDiscount("percent_50")}
								data-testid="btn-doctor-discount-50"
							>
								<span className="sm:hidden">-50%</span>
								<span className="hidden sm:inline">Скидка 50%</span>
							</button>
							<button
								type="button"
								style={{ minHeight: "44px" }}
								className={`dente-filter-chip min-h-[44px] ${selectedDoctorDiscount === "percent_20" ? "active" : ""}`}
								onClick={() => onApplyDoctorDiscount("percent_20")}
								data-testid="btn-doctor-discount-20"
							>
								<span className="sm:hidden">-20%</span>
								<span className="hidden sm:inline">Скидка 20%</span>
							</button>
							<button
								type="button"
								style={{ minHeight: "44px" }}
								className={`dente-filter-chip min-h-[44px] ${selectedDoctorDiscount === "percent_10" ? "active" : ""}`}
								onClick={() => onApplyDoctorDiscount("percent_10")}
								data-testid="btn-doctor-discount-10"
							>
								<span className="sm:hidden">-10%</span>
								<span className="hidden sm:inline">Скидка 10%</span>
							</button>
						</div>
					</div>

					{/* Комбинированная оплата */}
					<div
						className="combined-payment-presets-section"
						data-testid="combined-payment-presets-section"
					>
						<span className="text-[10px] sm:text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider block mb-0.5">
							Комбинированная оплата:
						</span>
						<div
							role="toolbar"
							className="dente-filter-chips combined-payment-chips flex flex-wrap gap-1"
							aria-label="Комбинированная оплата"
						>
							<button
								type="button"
								style={{ minHeight: "44px" }}
								className="dente-filter-chip min-h-[44px] flex items-center gap-1.5"
								onClick={onApplySplit5050}
								data-testid="btn-combo-split-50-50"
								title="Комбинированная оплата: 50% Наличные + 50% Карта"
							>
								<Coins size={13} className="shrink-0 text-amber-500" />
								<span>50/50 Нал + Карта</span>
							</button>
							<button
								type="button"
								style={{ minHeight: "44px" }}
								className="dente-filter-chip min-h-[44px] flex items-center gap-1.5"
								onClick={onApplyThreeWaySplit}
								data-testid="btn-combo-split-three-way"
								title="Комбинированная оплата: Нал + Карта + Баланс"
							>
								<UserRound size={13} className="shrink-0 text-[var(--teal)]" />
								<span>Нал + Карта + Баланс</span>
							</button>
							<button
								type="button"
								style={{ minHeight: "44px" }}
								className="dente-filter-chip min-h-[44px] flex items-center gap-1.5"
								onClick={onApplyDepositPlusCard}
								data-testid="btn-combo-split-deposit-card"
								title="Комбинированная оплата: Баланс + Карта"
							>
								<CreditCard size={13} className="shrink-0 text-blue-500" />
								<span>Баланс + Карта</span>
							</button>
						</div>
					</div>
				</div>
			</details>

			{/* Калькулятор рассрочки клиники */}
			<InstallmentCalculator
				totalAmount={normalizeRubAmountInput(amount) ?? 0}
				isOpen={false}
			/>
		</>
	);
}
