import type React from "react";
import { TOOTH16_CLINICAL_PRESETS } from "./Tooth16ClinicalPresets";

export interface Tooth16PresetStripProps {
	activePreset: string;
	onApplyPreset: (id: string) => void;
}

/**
 * DENTE Dental CRM — Clinical Presets Horizontal Scroll Strip (Gate 1)
 * Mandate 8b <= 120 lines.
 */
export const Tooth16PresetStrip: React.FC<Tooth16PresetStripProps> = ({
	activePreset,
	onApplyPreset,
}) => (
	<div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x overscroll-x-contain [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent_100%)]">
		<span className="text-[11px] font-semibold uppercase tracking-wider opacity-60 shrink-0">
			Пресет:
		</span>
		{TOOTH16_CLINICAL_PRESETS.map((p) => (
			<button
				key={p.id}
				data-preset-id={p.id}
				type="button"
				onClick={() => onApplyPreset(p.id)}
				className={`text-xs px-2.5 py-1 min-h-[44px] sm:min-h-[28px] rounded-lg border font-medium whitespace-nowrap shrink-0 transition-all ${
					activePreset === p.id
						? "bg-teal-600 text-white border-teal-500 shadow-sm"
						: "bg-[var(--paper)] border-[var(--line)] opacity-80 hover:opacity-100"
				}`}
			>
				{activePreset === p.id ? "✓ " : ""}
				{p.badge}
			</button>
		))}
	</div>
);
