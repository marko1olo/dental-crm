/**
 * apps/web/src/components/cashbox/studioModules/checkout/CheckoutDiscountAndPayerControls.tsx
 *
 * Dedicated Doctor Discounts & Payer Type Selection controls for CashRegisterCheckoutSection.
 * Governed by Mandates 8e, 8n, 8am, 8ap:
 * - 0 disabled buttons, soft-focus doctor presets.
 * - Zero forced INN for physical persons.
 * - Clean Russian clinical vocabulary.
 */

import React from "react";
import {
	type CashboxTenderType,
	type ClientPayerType,
	DOCTOR_DISCOUNT_PRESETS,
	PAYER_TYPE_PRESETS,
} from "../../cashRegisterCatalogData.js";

export interface CheckoutDiscountAndPayerControlsProps {
	readonly isWarranty: boolean;
	readonly setIsWarranty: (val: boolean) => void;
	readonly discountPercent: number;
	readonly setDiscountPercent: (val: number) => void;
	readonly setCashReceivedRub: (val: number) => void;
	readonly setSplitCashRub: (val: number) => void;
	readonly setSplitCardRub: (val: number) => void;
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
			{/* Doctor Discounts Strip (No neon carnival, clean secondary chips, zero-clipping) */}
			<div className="space-y-1.5" data-testid="payment-modal-presets-bar">
				<div className="flex items-center justify-between">
					<span className="text-xs font-semibold text-[var(--muted)]">
						Скидки врача:
					</span>
					{discountPercent > 0 && !isWarranty && (
						<span className="text-xs font-semibold text-[var(--teal,#0d9488)]" data-testid="badge-discount-active">
							Применена скидка {discountPercent}%
						</span>
					)}
					{isWarranty && (
						<span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
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
									setCashReceivedRub(0);
									setSplitCashRub(0);
									setSplitCardRub(0);
									setMethod("warranty");
								}
							}}
							className={`px-3 py-1.5 rounded-xl text-xs font-semibold border min-h-[36px] cursor-pointer transition-colors ${
								discountPercent === d.percent
									? "bg-[var(--teal-subtle,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)] font-bold shadow-xs"
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

			{/* Payer Type Selection (0px noise for 99% normal physical patients: Mandates 8bi & 8n) */}
			<div className="space-y-1.5" data-testid="payer-selection-section">
				<div className="flex items-center justify-between min-h-[32px]">
					<div className="flex items-center gap-2">
						<span className="text-xs font-semibold text-[var(--muted)]">
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
							className="text-xs text-[var(--teal,#0d9488)] hover:underline font-medium cursor-pointer"
							data-testid="toggle-corporate-payer"
						>
							Организация / ИП &rarr;
						</button>
					) : (
						<button
							type="button"
							onClick={() => setPayerType("physical_person")}
							className="text-xs text-[var(--muted)] hover:text-[var(--ink)] hover:underline font-medium cursor-pointer"
							data-testid="toggle-physical-payer"
						>
							&larr; Пациент (физлицо)
						</button>
					)}

					<span
						className="sr-only"
						data-testid="inn-physical-not-required-badge"
					>
						Пациент (физлицо)
					</span>
				</div>

				{/* Corporate / Sole Proprietor Mode: Compact Segmented Switch + INN Input */}
				{payerType !== "physical_person" ? (
					<div className="p-2.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
						<div className="p-0.5 rounded-lg bg-[var(--paper)] border border-[var(--line-subtle)] grid grid-cols-2 gap-1 max-w-xs">
							<button
								type="button"
								onClick={() => setPayerType("legal_entity")}
								className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
									payerType === "legal_entity"
										? "bg-[var(--teal-subtle,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] shadow-xs font-bold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								Юрлицо (10 цифр)
							</button>
							<button
								type="button"
								onClick={() => setPayerType("sole_proprietor")}
								className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
									payerType === "sole_proprietor"
										? "bg-[var(--teal-subtle,rgba(13,148,136,0.12))] text-[var(--teal,#0d9488)] shadow-xs font-bold"
										: "text-[var(--muted)] hover:text-[var(--ink)]"
								}`}
							>
								ИП (12 цифр)
							</button>
						</div>

						<div>
							<label className="text-[11px] font-medium text-[var(--muted)] mb-1 block">
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
								className="w-full px-3 py-2 rounded-xl border border-[var(--line)] bg-[var(--paper)] text-sm min-h-[44px] outline-none focus:border-[var(--teal,#0d9488)] focus:ring-1 focus:ring-[var(--teal,#0d9488)] transition-all font-mono"
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
