import React from "react";
import { Percent, ShieldCheck } from "lucide-react";
import { DISCOUNT_PRESETS } from "../modal/payment/paymentModalPrintHtml.js";
import type { PaymentLogicResult } from "./types.js";
import { PaymentSrPresetButtons } from "./PaymentSrPresetButtons.js";

export interface PaymentDoctorDiscountsBarProps {
	readonly discountsHook: PaymentLogicResult["discountsHook"];
	readonly tendersHook: PaymentLogicResult["tendersHook"];
	readonly patientDepositRub?: number | undefined;
}

export const PaymentDoctorDiscountsBar: React.FC<PaymentDoctorDiscountsBarProps> = ({
	discountsHook,
	tendersHook,
	patientDepositRub = 0,
}) => {
	return (
		<div className="p-2.5 rounded-xl border border-[var(--line,#cbd5e1)] bg-[var(--paper-soft,#f8fafc)] space-y-2 text-xs" data-testid="payment-modal-presets-bar">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 font-bold text-[var(--ink,#0f172a)]">
					<Percent size={14} className="text-amber-500 shrink-0" />
					<span>Скидки врача:</span>
				</div>
				<div className="flex items-center gap-1.5">
					<label htmlFor="input-discount-custom-percent" className="text-[11px] text-[var(--muted,#64748b)] font-semibold">
						Своя скидка, %:
					</label>
					<input
						id="input-discount-custom-percent"
						type="number"
						min={0}
						max={100}
						step="1"
						value={discountsHook.discountPercent || ""}
						onChange={(e) => discountsHook.handleCustomPercentChange(parseFloat(e.target.value) || 0)}
						placeholder="0%"
						className="h-7.5 w-16 px-2 text-xs font-bold font-mono bg-[var(--paper,#ffffff)] border border-[var(--line,#cbd5e1)] rounded-lg text-[var(--ink,#0f172a)] outline-none focus:border-amber-500 shadow-2xs"
						data-testid="input-discount-custom-percent"
					/>
				</div>
			</div>

			{/* Tactile Discount Preset Chips */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
				{DISCOUNT_PRESETS.map((p) => {
					const isActive = discountsHook.effectiveDiscountPercent === p.percent && !discountsHook.isWarranty100;
					return (
						<button
							key={p.percent}
							type="button"
							onClick={() => discountsHook.applyDiscountPreset(p.percent, p.reason)}
							className={`discount-preset-chip ${isActive ? "is-active" : ""}`}
							data-testid={p.testId}
							title={p.title}
						>
							{p.percent > 0 && <Percent size={11} className={isActive ? "text-white" : "text-amber-600 dark:text-amber-400"} />}
							<span>{p.label}</span>
						</button>
					);
				})}
				<button
					type="button"
					onClick={discountsHook.applyWarranty100Preset}
					className={`discount-preset-chip discount-preset-warranty ${discountsHook.isWarranty100 ? "is-active" : ""}`}
					data-testid="preset-warranty-100"
					title="Гарантийное обслуживание — скидка 100%"
				>
					<ShieldCheck size={12} />
					<span>Гарантия 100% (0 ₽)</span>
				</button>
				<PaymentSrPresetButtons
					discountsHook={discountsHook}
					tendersHook={tendersHook}
					patientDepositRub={patientDepositRub}
				/>
			</div>
		</div>
	);
};
