import React from "react";
import { Sliders } from "lucide-react";
import { FIXATION_TYPE_PRESETS } from "../orthopedicCatalogData.js";

export interface ZtlFixationSelectorProps {
	readonly fixationType: "cement" | "screw" | "clasp";
	readonly onSelectFixationType: (type: "cement" | "screw" | "clasp") => void;
	readonly hasAntagonists: boolean;
	readonly onToggleAntagonists: (checked: boolean) => void;
}

export function ZtlFixationSelector({
	fixationType,
	onSelectFixationType,
	hasAntagonists,
	onToggleAntagonists,
}: ZtlFixationSelectorProps) {
	return (
		<div className="mb-2.5 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] min-w-0 overflow-hidden" data-testid="fixation-type-section">
			<div className="flex flex-wrap items-center justify-between gap-1 mb-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<Sliders size={15} className="text-[var(--primary)] shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)] truncate">
						Вид фиксации и окклюзионные антагонисты:
					</span>
				</div>
				<span className="text-[11px] text-[var(--muted)] truncate">
					Протокол посадки и соотношение зубных рядов
				</span>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
				{FIXATION_TYPE_PRESETS.map((fix) => {
					const isSelected = fixationType === fix.id;
					return (
						<button
							key={fix.id}
							type="button"
							onClick={() => onSelectFixationType(fix.id)}
							className={`min-h-[48px] p-2 rounded-lg text-left transition-all cursor-pointer border flex flex-col justify-between min-w-0 ${
								isSelected
									? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--ink)] ring-1 ring-[var(--primary)] shadow-xs"
									: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-subtle)]"
							}`}
							data-testid={`fixation-type-${fix.id}`}
							title={fix.description}
						>
							<div className="flex items-center justify-between gap-1 min-w-0 w-full mb-0.5">
								<span className="text-xs font-bold text-[var(--ink)] truncate">{fix.titleRu}</span>
								<span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[var(--paper-subtle)] text-[var(--muted)] shrink-0 font-semibold">
									{fix.shortBadge}
								</span>
							</div>
							<span className="text-[11px] text-[var(--muted)] leading-tight truncate">{fix.sublabelRu}</span>
						</button>
					);
				})}
			</div>

			<div className="pt-1.5 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
				<label className="flex items-center gap-2 px-2.5 py-1 min-h-[34px] rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-medium text-[var(--ink)] cursor-pointer select-none" data-testid="antagonists-checkbox-label">
					<input
						type="checkbox"
						checked={hasAntagonists}
						onChange={(e) => onToggleAntagonists(e.target.checked)}
						className="rounded border-[var(--line)] text-[var(--primary)] focus:ring-[var(--primary)] w-4 h-4 cursor-pointer"
						data-testid="antagonists-checkbox"
					/>
					<span>Слепок/скан антагонистов (окклюзионный регистрат в прикусе)</span>
				</label>
				<span className="text-[11px] text-[var(--muted)] font-mono">
					{hasAntagonists ? "Антагонисты переданы в ЗТЛ" : "Без антагонистов (одиночная вкладка)"}
				</span>
			</div>
		</div>
	);
}
