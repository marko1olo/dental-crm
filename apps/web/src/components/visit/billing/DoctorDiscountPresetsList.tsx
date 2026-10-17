/**
 * apps/web/src/components/visit/billing/DoctorDiscountPresetsList.tsx
 * Preset buttons list for doctor autonomy discount popover.
 * Compliant with Mandate 8b (<= 120 lines).
 */

import React from "react";
import { ShieldCheck, Zap, Check } from "lucide-react";
import { DOCTOR_DISCOUNT_PRESETS } from "../visitBillingTypes.js";

export interface DoctorDiscountPresetsListProps {
	isGlobalWarranty100: boolean;
	globalDiscountPercent: number;
	onSelectPreset: (percent: number, reason: string) => void;
}

export const DoctorDiscountPresetsList: React.FC<DoctorDiscountPresetsListProps> = ({
	isGlobalWarranty100,
	globalDiscountPercent,
	onSelectPreset,
}) => {
	return (
		<div className="grid grid-cols-1 gap-1">
			{DOCTOR_DISCOUNT_PRESETS.map((preset) => {
				const isSelected =
					(preset.percent === 100 && isGlobalWarranty100) ||
					(!isGlobalWarranty100 && globalDiscountPercent === preset.percent);
				return (
					<button
						key={preset.percent}
						type="button"
						onClick={() => onSelectPreset(preset.percent, preset.reason)}
						title={preset.reason ? `Применить скидку: ${preset.reason}` : "Сбросить скидку"}
						className={`h-7 px-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-between gap-1 w-full text-left whitespace-nowrap ${
							isSelected
								? preset.percent === 100
									? "bg-emerald-600 text-white shadow-2xs"
									: "bg-amber-600 text-white shadow-2xs"
								: "bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--line,#e2e8f0)] text-[var(--ink,#0f172a)]"
						}`}
						data-testid={`btn-discount-preset-${preset.percent}`}
					>
						<span className="flex items-center gap-1.5">
							{preset.percent === 100 ? <ShieldCheck size={12} /> : <Zap size={11} />}
							<span>{preset.label}</span>
						</span>
						{isSelected && <Check size={12} />}
					</button>
				);
			})}
		</div>
	);
};
