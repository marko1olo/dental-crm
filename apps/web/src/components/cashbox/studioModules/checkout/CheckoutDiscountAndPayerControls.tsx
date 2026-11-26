/**
 * apps/web/src/components/cashbox/studioModules/checkout/CheckoutDiscountAndPayerControls.tsx
 *
 * Dedicated Doctor Discounts & Payer Type Selection controls for CashRegisterCheckoutSection.
 * Governed by Mandates 8e, 8n, 8am, 8ap, 8bm.
 */

import React from "react";
import {
	type CashboxTenderType,
	type ClientPayerType,
	DOCTOR_DISCOUNT_PRESETS,
} from "../../cashRegisterCatalogData.js";

export interface CheckoutDiscountAndPayerControlsProps {
	readonly isWarranty: boolean;
	readonly setIsWarranty: (val: boolean) => void;
	readonly discountPercent: number;
	readonly setDiscountPercent: (val: number) => void;
	readonly setCashReceivedKopecks?: ((val: bigint) => void) | undefined;
	readonly setSplitCashKopecks?: ((val: bigint) => void) | undefined;
	readonly setSplitCardKopecks?: ((val: bigint) => void) | undefined;
	/** @deprecated Legacy ruble callback bridge for out-of-scope callers */
	readonly setCashReceivedRub?: ((val: number) => void) | undefined;
	/** @deprecated Legacy ruble callback bridge for out-of-scope callers */
	readonly setSplitCashRub?: ((val: number) => void) | undefined;
	/** @deprecated Legacy ruble callback bridge for out-of-scope callers */
	readonly setSplitCardRub?: ((val: number) => void) | undefined;
	readonly setMethod: (val: CashboxTenderType) => void;
	readonly payerType: ClientPayerType;
	readonly setPayerType: (val: ClientPayerType) => void;
	readonly buyerInn: string;
	readonly setBuyerInn: (val: string) => void;
}

export const CheckoutDiscountAndPayerControls: React.FC<CheckoutDiscountAndPayerControlsProps> = ({
	isWarranty,
	setIsWarranty,
	discountPercent,
	setDiscountPercent,
	setCashReceivedKopecks,
	setSplitCashKopecks,
	setSplitCardKopecks,
	setCashReceivedRub,
	setSplitCashRub,
	setSplitCardRub,
	setMethod,
	payerType,
	setPayerType,
	buyerInn,
	setBuyerInn,
}) => {
	return (
		<>
			<div className="space-y-1.5" data-testid="payment-modal-presets-bar">
				<div className="flex items-center justify-between">
					<span className="text-xs font-semibold text-[var(--ink-muted)]">
						Скидки врача:
					</span>
					{discountPercent > 0 && !isWarranty && (
						<span className="text-xs font-semibold text-[var(--primary)]" data-testid="badge-discount-active">
							Применена скидка {discountPercent}%
						</span>
					)}
					{isWarranty && (
						<span className="text-xs font-semibold text-[var(--success-ink)]">
							100% Гарантия врача
						</span>
					)}
				</div>
				<div className="flex flex-wrap gap-1.5">
					{DOCTOR_DISCOUNT_PRESETS.map((d) => (
						<button
							key={d.label}
							type="button"
							data-testid={d.isWarranty ? "preset-warranty-100" : `preset-discount-${d.percent}`}
							onClick={() => {
								setIsWarranty(Boolean(d.isWarranty));
								setDiscountPercent(d.percent);
								if (d.isWarranty) {
									setCashReceivedKopecks?.(0n);
									setSplitCashKopecks?.(0n);
									setSplitCardKopecks?.(0n);
									setCashReceivedRub?.(0);
									setSplitCashRub?.(0);
									setSplitCardRub?.(0);
									setMethod("warranty");
								}
							}}
							className={`px-3 py-1.5 rounded-xl text-xs font-semibold border min-h-[44px] sm:min-h-[36px] cursor-pointer transition-colors ${
								discountPercent === d.percent
									? "bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)] font-semibold shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
							}`}
						>
							<span className="hidden sm:inline">{d.label}</span>
							<span className="sm:hidden">
								{d.percent === 0 ? "0%" : d.isWarranty ? "100% Гарантия" : `${d.percent}%`}
							</span>
						</button>
					))}
				</div>
				<input
					type="hidden"
					data-testid="input-discount-custom-percent"
					value={discountPercent}
					readOnly
				/>
			</div>

			<div className="space-y-1.5" data-testid="payer-selection-section">
				<div className="flex items-center justify-between min-h-[32px]">
					<div className="flex items-center gap-2">
						<span className="text-xs font-semibold text-[var(--ink-muted)]">
							Плательщик:
						</span>
						<span className="text-xs font-semibold text-[var(--ink)]">
							{payerType === "physical_person"
								? "Пациент (физлицо)"
								: payerType === "legal_entity"
									? "Юридическое лицо"
									: "Индивидуальный предприниматель"}
						</span>
					</div>

					{payerType === "physical_person" ? (
						<button
							type="button"
							onClick={() => setPayerType("legal_entity")}
							className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--primary)] bg-[var(--primary-soft)] hover:opacity-90 border border-[var(--primary)]/25 transition-colors cursor-pointer whitespace-nowrap shrink-0"
							data-testid="toggle-corporate-payer"
						>
							Организация / ИП &rarr;
						</button>
					) : (
						<button
							type="button"
							onClick={() => setPayerType("physical_person")}
							className="min-h-[44px] sm:min-h-[32px] px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] bg-[var(--paper-soft)] border border-[var(--line)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
							data-testid="toggle-physical-payer"
						>
							&larr; Пациент (физлицо)
						</button>
					)}
				</div>

				{payerType !== "physical_person" ? (
					<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
						<div className="p-0.5 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)] grid grid-cols-2 gap-1 max-w-xs">
							<button
								type="button"
								onClick={() => setPayerType("legal_entity")}
								className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border-0 ${
									payerType === "legal_entity"
										? "bg-[var(--primary-soft)] text-[var(--primary)] shadow-xs font-semibold"
										: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
								}`}
							>
								Юрлицо (10 цифр)
							</button>
							<button
								type="button"
								onClick={() => setPayerType("sole_proprietor")}
								className={`min-h-[44px] sm:min-h-[32px] px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border-0 ${
									payerType === "sole_proprietor"
										? "bg-[var(--primary-soft)] text-[var(--primary)] shadow-xs font-semibold"
										: "bg-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
								}`}
							>
								ИП (12 цифр)
							</button>
						</div>

						<div>
							<label className="text-xs font-medium text-[var(--ink-muted)] mb-1 block">
								{payerType === "legal_entity"
									? "ИНН организации (10 цифр для безналичного расчёта):"
									: "ИНН индивидуального предпринимателя (12 цифр):"}
							</label>
							<input
								type="text"
								inputMode="numeric"
								value={buyerInn}
								onChange={(e) => setBuyerInn(e.target.value.replace(/\D/g, ""))}
								maxLength={payerType === "legal_entity" ? 10 : 12}
								placeholder={payerType === "legal_entity" ? "Введите 10 цифр ИНН" : "Введите 12 цифр ИНН"}
								className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm min-h-[44px] outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all font-mono"
								autoFocus
							/>
						</div>
					</div>
				) : (
					<input
						type="hidden"
						data-testid="input-buyer-inn-physical"
						value=""
						readOnly
					/>
				)}
			</div>
		</>
	);
};
