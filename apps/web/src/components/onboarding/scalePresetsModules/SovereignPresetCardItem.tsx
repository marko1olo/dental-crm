import React from "react";
import { Check, CheckCircle2, Clock } from "lucide-react";
import type { SovereignPresetDefinition } from "./scalePresetsTypesAndConstants";

export interface SovereignPresetCardItemProps {
	readonly preset: SovereignPresetDefinition;
	readonly isSelected: boolean;
	readonly isApplying: boolean;
	readonly compactMode?: boolean | undefined;
	readonly onSelect: (preset: SovereignPresetDefinition) => void;
}

export const SovereignPresetCardItem: React.FC<SovereignPresetCardItemProps> = React.memo(({
	preset,
	isSelected,
	isApplying,
	compactMode = false,
	onSelect,
}) => {
	const Icon = preset.icon;

	return (
		<button
			type="button"
			style={{ padding: "16px" }}
			className={`w-full sovereign-preset-box text-left rounded-2xl border transition-all relative flex flex-col justify-between cursor-pointer ${
				isSelected
					? "border-[var(--teal)] bg-[var(--paper-card)] shadow-[0_2px_6px_rgba(0,0,0,0.08)]"
					: "border-[var(--line)] bg-[var(--paper-card)] hover:border-[var(--line-strong)] shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
			}`}
			onClick={() => onSelect(preset)}
			disabled={isApplying}
			data-testid={`preset-card-${preset.id}`}
		>
			<div className="w-full">
				<div className="flex items-start justify-between gap-2 mb-2.5">
					<div className="flex items-center gap-2.5">
						<div
							className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
								isSelected
									? "bg-[var(--teal)] text-[var(--on-teal)] border-[var(--teal)] shadow-2xs"
									: "bg-[var(--paper-soft)] text-[var(--ink)] border-[var(--line)]"
							}`}
						>
							<Icon size={18} aria-hidden="true" />
						</div>
						<div>
							<strong className="block text-xs font-bold text-[var(--ink)]">
								{preset.title}
							</strong>
							<span className="block text-[11px] text-[var(--muted)]">
								{preset.subtitle}
							</span>
						</div>
					</div>

					{isSelected && (
						<div className="w-5 h-5 rounded-full bg-[var(--teal)] text-[var(--on-teal)] flex items-center justify-center shrink-0">
							<Check size={12} aria-hidden="true" />
						</div>
					)}
				</div>

				<div className="mb-2.5">
					<span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]">
						{preset.chairsCountText}
					</span>
				</div>

				{!compactMode && (
					<ul className="text-[11px] text-[var(--muted)] space-y-1.5 mb-2 pl-0 list-none">
						{preset.features.slice(0, 3).map((f, i) => (
							<li key={i} className="flex items-start gap-1.5 leading-snug">
								<CheckCircle2 size={12} className="text-[var(--teal)] shrink-0 mt-0.5" aria-hidden="true" />
								<span>{f}</span>
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="w-full pt-3 mt-2 border-t border-[var(--line)] flex items-center justify-between text-[11px]">
				<span className="text-[var(--muted)] font-medium">
					{isSelected ? "Активный пресет" : "Выбрать пресет"}
				</span>
				<span className="font-bold text-[var(--teal)] flex items-center gap-1">
					{isSelected ? (
						<>
							<Check size={12} aria-hidden="true" />
							Выбрано
						</>
					) : isApplying ? (
						<>
							<Clock size={12} className="animate-spin" aria-hidden="true" />
							Применение...
						</>
					) : (
						"Применить в 1 клик"
					)}
				</span>
			</div>
		</button>
	);
});

SovereignPresetCardItem.displayName = "SovereignPresetCardItem";
