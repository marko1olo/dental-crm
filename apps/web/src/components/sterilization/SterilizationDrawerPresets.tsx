/**
 * apps/web/src/components/sterilization/SterilizationDrawerPresets.tsx
 *
 * Карточки 3 клинических пресетов автоклава в 1 клик.
 * Мандат 8b: строго <= 120 строк.
 */

import React from "react";
import { Check, Clock, Flame, Zap } from "lucide-react";
import { CLINICAL_AUTOCLAVE_1CLICK_PRESETS } from "../sanpin/sterilizationModules/sterilizationCycleTypes";

export interface SterilizationDrawerPresetsProps {
	readonly selectedPresetId: string;
	readonly onSelectPreset: (id: string) => void;
}

export function SterilizationDrawerPresets({
	selectedPresetId,
	onSelectPreset,
}: SterilizationDrawerPresetsProps) {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="text-xs font-bold uppercase tracking-wider text-[var(--muted,#64748b)]">
				Клинический режим автоклава (1 клик):
			</div>
			<div className="grid grid-cols-1 gap-2">
				{CLINICAL_AUTOCLAVE_1CLICK_PRESETS.map((preset, idx) => {
					const isSelected = selectedPresetId === preset.id;
					const IconCmp = idx === 0 ? Flame : idx === 1 ? Clock : Zap;
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onSelectPreset(preset.id)}
							className={`p-3 rounded-xl border text-left transition-all touch-manipulation cursor-pointer flex items-center justify-between gap-3 min-h-[52px] ${isSelected ? "border-[var(--teal,#0d9488)] bg-teal-500/10 ring-2 ring-[var(--teal,#0d9488)]/20 shadow-xs" : "border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] hover:bg-[var(--paper,#ffffff)]"}`}
							data-testid={`drawer-preset-btn-${preset.id}`}
						>
							<div className="flex items-center gap-3 min-w-0">
								<div
									className={`p-2 rounded-lg shrink-0 ${isSelected ? "bg-[var(--teal,#0d9488)] text-white" : "bg-slate-200/50 dark:bg-slate-800 text-[var(--muted)]"}`}
								>
									<IconCmp size={18} />
								</div>
								<div className="flex flex-col min-w-0">
									<span className="text-sm font-bold text-[var(--ink,#0f172a)] truncate">
										{preset.title}
									</span>
									<span className="text-xs text-[var(--muted,#64748b)] truncate">
										{preset.subtitle}
									</span>
								</div>
							</div>
							{isSelected && (
								<span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-teal-500/20 text-[var(--teal,#0d9488)] inline-flex items-center gap-1">
									<Check size={12} /> Выбран
								</span>
							)}
						</button>
					);
				})}
			</div>
		</div>
	);
}
