/**
 * apps/web/src/components/cashbox/checkout/CheckoutTenderTiles.tsx
 *
 * Prominent 32px Total Display, Doctor Discounts, Payer Selection & 5 Tender Tiles.
 * Governed by:
 * - Mandate 8am: Prominent 32-36px total display.
 * - Mandate 8e: Doctor autonomy discounts up to 100% warranty.
 * - Mandate 8n: Solo Doctor Sovereignty (0 forced citizen INN).
 * - Apple HIG: Touch targets >= 44x44px.
 */

import React from "react";
import { CreditCard, Banknote, QrCode, Wallet, Layers } from "lucide-react";
import {
	CASHBOX_TENDER_PRESETS,
	DOCTOR_DISCOUNT_PRESETS,
	PAYER_TYPE_PRESETS,
	type CashboxTenderType,
	type ClientPayerType,
} from "../cashboxCatalogData.js";

const TENDER_ICONS: Record<CashboxTenderType, React.ElementType> = {
	card: CreditCard,
	cash: Banknote,
	sbp: QrCode,
	deposit: Wallet,
	split: Layers,
	warranty: CreditCard,
};

export interface CheckoutTenderTilesProps {
	readonly totalDue: number;
	readonly isWarranty: boolean;
	readonly setIsWarranty: (val: boolean) => void;
	readonly discountPercent: number;
	readonly setDiscountPercent: (val: number) => void;
	readonly effectiveDepositLimit: number;
	readonly payerType: ClientPayerType;
	readonly setPayerType: (val: ClientPayerType) => void;
	readonly buyerInn: string;
	readonly setBuyerInn: (val: string) => void;
	readonly method: CashboxTenderType;
	readonly setMethod: (m: CashboxTenderType) => void;
	readonly onSelectCash?: () => void;
	readonly onSelectSplit?: () => void;
	readonly onOpenSplitPayment?: () => void;
}

export const CheckoutTenderTiles: React.FC<CheckoutTenderTilesProps> = ({
	totalDue,
	isWarranty,
	setIsWarranty,
	discountPercent,
	setDiscountPercent,
	effectiveDepositLimit,
	payerType,
	setPayerType,
	buyerInn,
	setBuyerInn,
	method,
	setMethod,
	onSelectCash,
	onSelectSplit,
	onOpenSplitPayment,
}) => {
	return (
		<div className="space-y-4">
			{/* Big Prominent Total Display (32-36px bold, Mandate 8am) */}
			<div className="p-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex flex-col items-center justify-center text-center">
				<span className="text-xs uppercase tracking-wider font-semibold text-[var(--muted)]">
					Итого к оплате
				</span>
				<div
					className="text-[32px] sm:text-[36px] font-black text-[var(--ink)] tracking-tight my-1"
					data-testid="checkout-total-amount"
				>
					<span data-testid="display-total-amount-due">
						{totalDue.toLocaleString("ru-RU")} ₽
					</span>
				</div>
				{isWarranty && (
					<span className="text-xs font-bold text-[var(--teal,#0d9488)]">
						100% Гарантийный случай врача
					</span>
				)}
				{effectiveDepositLimit > 0 && (
					<span className="text-xs text-[var(--muted)] mt-1">
						Доступен аванс / депозит пациента: {effectiveDepositLimit.toLocaleString("ru-RU")} ₽
					</span>
				)}
			</div>

			{/* Doctor Discounts Row (Mandate 8e Autonomy) */}
			<div className="flex flex-wrap gap-1.5 items-center">
				<span className="text-xs font-semibold text-[var(--muted)] mr-1">
					Скидка врача:
				</span>
				{DOCTOR_DISCOUNT_PRESETS.map((d) => {
					const active =
						(d.isWarranty && isWarranty) ||
						(!d.isWarranty && discountPercent === d.percent && !isWarranty);
					return (
						<button
							key={d.percent}
							type="button"
							data-testid={d.isWarranty ? "doctor-discount-warranty" : `doctor-discount-${d.percent}`}
							onClick={() => {
								if (d.isWarranty) {
									setIsWarranty(!isWarranty);
									setDiscountPercent(0);
								} else {
									setIsWarranty(false);
									setDiscountPercent(discountPercent === d.percent ? 0 : d.percent);
								}
							}}
							className={`min-h-[44px] px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
								active
									? "bg-[var(--teal,#0d9488)] text-white border-[var(--teal,#0d9488)] shadow-xs"
									: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper)]"
							}`}
						>
							{d.label}
						</button>
					);
				})}
			</div>

			{/* Payer Type Classification (Mandate 8n Autonomy: 0 Forced Citizen INN) */}
			<div className="p-3.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] space-y-2.5">
				<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
					<span className="text-xs font-bold text-[var(--ink)]">Тип плательщика:</span>
					<span className="text-[11px] text-[var(--muted)]">
						{PAYER_TYPE_PRESETS.find((p) => p.id === payerType)?.helperText}
					</span>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
					{PAYER_TYPE_PRESETS.map((p) => (
						<button
							key={p.id}
							type="button"
							onClick={() => setPayerType(p.id)}
							className={`min-h-[44px] px-3 py-2 text-xs font-semibold rounded-lg border transition-all text-center flex items-center justify-center cursor-pointer ${
								payerType === p.id
									? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] font-bold shadow-xs"
									: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--line)]"
							}`}
						>
							{p.label}
						</button>
					))}
				</div>
				{payerType !== "physical_person" && (
					<div className="pt-1">
						<label htmlFor="input-legal-inn" className="block text-xs font-medium text-[var(--muted)] mb-1">
							ИНН {payerType === "legal_entity" ? "организации (10 цифр)" : "ИП (12 цифр)"}:
						</label>
						<input
							id="input-legal-inn"
							type="text"
							value={buyerInn}
							onChange={(e) => setBuyerInn(e.target.value.replace(/\D/g, ""))}
							maxLength={payerType === "legal_entity" ? 10 : 12}
							placeholder={payerType === "legal_entity" ? "7701234567" : "500123456789"}
							className="w-full min-h-[44px] px-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] focus:ring-2 focus:ring-[var(--teal,#0d9488)]"
						/>
					</div>
				)}
			</div>

			{/* 5 Fast Tender Tiles */}
			<div>
				<div className="flex items-center justify-between mb-2">
					<span className="text-xs font-bold text-[var(--ink)]">Способ расчёта:</span>
					{onOpenSplitPayment && (
						<button
							type="button"
							onClick={onOpenSplitPayment}
							data-testid="link-open-split-payment"
							className="text-xs text-[var(--teal,#0d9488)] hover:underline font-semibold min-h-[32px] flex items-center cursor-pointer"
						>
							Расширенный сплит →
						</button>
					)}
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
					{CASHBOX_TENDER_PRESETS.map((t) => {
						const isSel = method === t.id;
						const testId =
							t.id === "card"
								? "btn-tender-card"
								: t.id === "cash"
									? "btn-tender-cash"
									: t.id === "sbp"
										? "btn-tender-sbp"
										: t.id === "deposit"
											? "btn-tender-deposit"
											: "btn-tender-split";
						return (
							<button
								key={t.id}
								type="button"
								data-testid={testId}
								onClick={() => {
									setMethod(t.id);
									if (t.id === "cash") onSelectCash?.();
									if (t.id === "split") onSelectSplit?.();
								}}
								className={`min-h-[52px] p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
									isSel
										? "border-[var(--teal,#0d9488)] bg-[var(--teal,#0d9488)]/15 text-[var(--teal,#0d9488)] font-bold shadow-xs ring-1 ring-[var(--teal,#0d9488)]"
										: "border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] hover:bg-[var(--paper)]"
								}`}
							>
								{React.createElement(TENDER_ICONS[t.id] || CreditCard, { className: "w-5 h-5 mb-1 shrink-0" })}
								<span className="text-[11px] sm:text-xs leading-tight">
									{t.id === "sbp" ? "QR СБП" : t.label}
								</span>
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);
};
