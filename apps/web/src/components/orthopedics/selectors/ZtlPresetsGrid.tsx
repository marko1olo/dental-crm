import React from "react";
import { Zap, ShieldCheck } from "lucide-react";
import { type StandardZtlPreset, STANDARD_ZTL_ORDER_PRESETS } from "../orthopedicCatalogData.js";

export interface ZtlPresetsGridProps {
	readonly activeZtlPresetId: string;
	readonly onSelectZtlPreset: (preset: StandardZtlPreset) => void;
}

export function ZtlPresetsGrid({ activeZtlPresetId, onSelectZtlPreset }: ZtlPresetsGridProps) {
	return (
		<div className="mb-2.5 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] min-w-0 overflow-hidden">
			<div className="flex flex-wrap items-center justify-between gap-1 mb-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<Zap size={15} className="text-[var(--primary)] shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)] truncate">
						Стандарты ЗТЛ и гарантия:
					</span>
				</div>
				<span className="text-[11px] text-[var(--ink-muted)] truncate">
					Авторасчет сроков и спецификации
				</span>
			</div>
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
				{STANDARD_ZTL_ORDER_PRESETS.map((preset) => {
					const isSelected = activeZtlPresetId === preset.id;
					return (
						<button
							key={preset.id}
							type="button"
							onClick={() => onSelectZtlPreset(preset)}
							className={`min-h-[54px] p-2 rounded-lg text-xs font-bold text-left transition-all cursor-pointer border flex flex-col justify-between min-w-0 ${
								isSelected
									? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--ink)] ring-1 ring-[var(--primary)] shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-subtle)]"
							}`}
							data-testid={`ztl-preset-${preset.id}`}
							title={`${preset.description} · Гарантия: ${preset.warrantyLabelRu}`}
						>
							<div className="flex flex-wrap sm:flex-nowrap items-start justify-between gap-1 min-w-0 w-full mb-0.5">
								<span className="text-xs font-bold text-[var(--ink)] leading-snug break-words">
									{preset.name}
								</span>
								<span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[var(--paper-subtle)] text-[var(--ink-muted)] shrink-0 font-semibold">
									{preset.badge}
								</span>
							</div>
							<span className="text-[11px] text-[var(--ink-muted)] leading-tight min-w-0 w-full mb-1 break-words">
								{preset.material}
							</span>
							<div className="flex items-center gap-1 text-[11px] text-[var(--primary)] font-medium min-w-0 w-full mt-auto">
								<ShieldCheck size={12} className="shrink-0" />
								<span className="truncate">{preset.warrantyLabelRu}</span>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
}
