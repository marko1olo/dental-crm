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
		</>
	);
};
