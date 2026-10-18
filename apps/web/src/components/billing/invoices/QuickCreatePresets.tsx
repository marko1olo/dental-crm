/**
 * apps/web/src/components/billing/invoices/QuickCreatePresets.tsx
 *
 * 1-click clinical presets for fast invoice creation.
 * Strictly <= 120 lines per Mandate 8b.
 */

import React from "react";
import { Sparkles } from "lucide-react";
import { TOOTH_804N_PRESETS } from "@dental/shared";

interface QuickCreatePresetsProps {
	readonly catalogServices?: readonly { code804n?: string; name: string; priceRub: number }[] | undefined;
	readonly onSelectPreset: (serviceName: string, priceRub: number, isWarranty: boolean) => void;
}

export const QuickCreatePresets: React.FC<QuickCreatePresetsProps> = ({
	catalogServices,
	onSelectPreset,
}) => {
	const presets = [
		{
			label: "Осмотр + КЛКТ",
			serviceName: "Первичный осмотр + Компьютерная томография (КЛКТ)",
			code804n: "A06.07.013",
			defaultPriceRub: TOOTH_804N_PRESETS.extractionPermanent.priceRub,
		},
		{
			label: "Профгигиена GBT",
			serviceName: "Профессиональная гигиена полости рта (GBT)",
			code804n: "A16.07.051",
			defaultPriceRub: 10000,
		},
		{
			label: "Кариес (пломба)",
			serviceName: "Лечение глубокого кариеса с пломбой светового отверждения",
			code804n: TOOTH_804N_PRESETS.cariesFilling.code804n,
			defaultPriceRub: TOOTH_804N_PRESETS.cariesFilling.priceRub,
		},
	];

	return (
		<div className="space-y-1.5">
			<div className="text-xs font-bold text-[var(--muted,#64748b)] flex items-center gap-1">
				<Sparkles size={13} className="text-amber-500" />
				<span>Быстрые пресеты услуг:</span>
			</div>
			<div className="flex items-center gap-1.5 flex-wrap">
				{presets.map((preset) => {
					const catalogMatch = catalogServices?.find(
						(cs) =>
							(cs.code804n && cs.code804n === preset.code804n) ||
							cs.name.toLowerCase().includes(preset.label.toLowerCase()),
					);
					const priceRub = catalogMatch?.priceRub ?? preset.defaultPriceRub;
					return (
						<button
							key={preset.label}
							type="button"
							onClick={() => onSelectPreset(preset.serviceName, priceRub, false)}
							className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:border-teal-400 text-xs font-medium cursor-pointer"
						>
							{preset.label} ({priceRub.toLocaleString("ru-RU")} ₽)
						</button>
					);
				})}
				<button
					type="button"
					onClick={() => onSelectPreset("Гарантийная переделка реставрации", 0, true)}
					className="min-h-[44px] sm:min-h-[30px] px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold cursor-pointer"
				>
					Гарантия 100% (0 ₽)
				</button>
			</div>
		</div>
	);
};
