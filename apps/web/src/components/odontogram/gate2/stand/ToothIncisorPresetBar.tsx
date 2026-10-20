import type React from "react";
import { INCISOR_CLINICAL_PRESETS } from "./incisorStandPresets";
import type { ToothIncisorPresetBarProps } from "./incisorStandTypes";

export const ToothIncisorPresetBar: React.FC<ToothIncisorPresetBarProps> = ({
	activePreset,
	onApplyPreset,
}) => (
	<div className="w-full flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none touch-pan-x overscroll-x-contain [mask-image:linear-gradient(to_right,black_calc(100%-28px),transparent_100%)]">
		<span className="text-[11px] font-semibold uppercase tracking-wider opacity-60 shrink-0">
			Пресет:
		</span>
		{INCISOR_CLINICAL_PRESETS.map((p) => {
			const isActive = activePreset === p.id;
			return (
				<button
					key={p.id}
					data-preset-id={p.id}
					type="button"
					onClick={() => onApplyPreset(p.id)}
					className={`text-xs px-3 py-1.5 min-h-[44px] sm:min-h-[30px] rounded-lg border font-medium whitespace-nowrap shrink-0 transition-all ${
						isActive
							? "bg-teal-600 text-white border-teal-500 shadow-sm font-semibold"
							: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] opacity-80 hover:opacity-100"
					}`}
				>
					{isActive ? "✓ " : ""}
					{p.badge}
				</button>
			);
		})}
	</div>
);
