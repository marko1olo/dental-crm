import React from "react";
import { Sparkles, Zap } from "lucide-react";
import { MODAL_EXPRESS_LAB_PRESETS, type ExpressLabPreset } from "../dentalLabModalPresets";

export interface DentalLabOrderModalPresetsBarProps {
	onSelectPreset: (preset: ExpressLabPreset) => void;
}

export function DentalLabOrderModalPresetsBar({ onSelectPreset }: DentalLabOrderModalPresetsBarProps) {
	return (
		<div className="flex flex-col gap-2 p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 w-full">
			<div className="flex items-center justify-between gap-2">
				<span className="text-xs font-black text-[var(--ink)] flex items-center gap-1">
					<Sparkles size={14} className="text-amber-500" />
					<span>Быстрые шаблоны:</span>
				</span>
			</div>
			<div className="flex flex-wrap items-center gap-1.5">
				{MODAL_EXPRESS_LAB_PRESETS.map((preset) => (
					<button
						key={preset.id}
						type="button"
						onClick={() => onSelectPreset(preset)}
						className="min-h-[36px] px-3 py-1.5 rounded-xl bg-[var(--paper)] text-[var(--ink)] border border-amber-500/30 text-xs font-bold transition hover:bg-amber-500/20 cursor-pointer flex items-center gap-1.5"
						data-testid={`lab-preset-btn-${preset.id}`}
					>
						<Zap size={13} className="text-amber-500 shrink-0" />
						<span>{preset.badge || preset.title}</span>
					</button>
				))}
			</div>
		</div>
	);
}
