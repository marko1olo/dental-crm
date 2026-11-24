import React, { useState } from "react";
import { Sliders } from "lucide-react";
import { FIXATION_TYPE_PRESETS } from "../orthopedicCatalogData.js";

export interface CementBrandPreset {
	readonly id: string;
	readonly name: string;
	readonly manufacturer: string;
	readonly clinicalIndication: string;
}

export const CEMENT_BRAND_PRESETS: readonly CementBrandPreset[] = [
	{
		id: "variolink_esthetic",
		name: "Светоотверждаемый композитный цемент",
		manufacturer: "Адгезивная фиксация",
		clinicalIndication: "для виниров, ультраниров и прессованной керамики (E.max)",
	},
	{
		id: "relyx_u200",
		name: "Самоадгезивный композитный цемент",
		manufacturer: "Двойное отверждение",
		clinicalIndication: "для диоксида циркония (ZrO2) и металлокерамики",
	},
	{
		id: "fuji_plus",
		name: "Стеклоиономерный модифицированный цемент (СИЦ)",
		manufacturer: "Химическое отверждение",
		clinicalIndication: "для коронок на витальные зубы и культевых вкладок",
	},
	{
		id: "panavia_v5",
		name: "Адгезивный композитный цемент с праймером MDP",
		manufacturer: "Универсальный протокол",
		clinicalIndication: "для сложных реставраций и адгезивной фиксации к оксиду циркония",
	},
] as const;

export interface ZtlFixationSelectorProps {
	readonly fixationType: "cement" | "screw" | "clasp";
	readonly onSelectFixationType: (type: "cement" | "screw" | "clasp") => void;
	readonly hasAntagonists: boolean;
	readonly onToggleAntagonists: (checked: boolean) => void;
	readonly cementBrand?: string | undefined;
	readonly onSelectCementBrand?: ((brand: string) => void) | undefined;
}

export function ZtlFixationSelector({
	fixationType,
	onSelectFixationType,
	hasAntagonists,
	onToggleAntagonists,
	cementBrand,
	onSelectCementBrand,
}: ZtlFixationSelectorProps) {
	const [internalCementBrand, setInternalCementBrand] = useState<string>("relyx_u200");
	const activeCementBrand = cementBrand !== undefined ? cementBrand : internalCementBrand;

	const handleCementSelect = (brandId: string) => {
		setInternalCementBrand(brandId);
		onSelectCementBrand?.(brandId);
	};

	return (
		<div className="mb-2.5 p-2.5 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] min-w-0 overflow-hidden" data-testid="fixation-type-section">
			<div className="flex flex-wrap items-center justify-between gap-1 mb-2">
				<div className="flex items-center gap-1.5 min-w-0">
					<Sliders size={15} className="text-[var(--primary)] shrink-0" />
					<span className="text-xs font-bold text-[var(--ink)] truncate">
						Вид фиксации и окклюзионные антагонисты:
					</span>
				</div>
				<span className="text-[11px] text-[var(--ink-muted)] truncate">
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
								<span className="text-[10px] font-mono px-1 py-0.2 rounded bg-[var(--paper-subtle)] text-[var(--ink-muted)] shrink-0 font-semibold">
									{fix.shortBadge}
								</span>
							</div>
							<span className="text-[11px] text-[var(--ink-muted)] leading-tight truncate">{fix.sublabelRu}</span>
						</button>
					);
				})}
			</div>

			{/* Выбор адгезивного протокола и типа цемента при фиксации "cement" */}
			{fixationType === "cement" && (
				<div className="mb-2 p-2 rounded-lg bg-[var(--paper)] border border-[var(--line)]" data-testid="cement-brands-section">
					<div className="flex items-center justify-between gap-1 mb-1.5">
						<span className="text-[11px] font-semibold text-[var(--ink)]">
							Адгезивный протокол / тип цемента:
						</span>
						<span className="text-[10px] text-[var(--ink-muted)]">
							Клинический регламент
						</span>
					</div>
					<div className="flex flex-wrap gap-1.5" data-testid="cement-brand-chips">
						{CEMENT_BRAND_PRESETS.map((cement) => {
							const isSelected = activeCementBrand === cement.id || activeCementBrand === cement.name;
							return (
								<button
									key={cement.id}
									type="button"
									onClick={() => handleCementSelect(cement.id)}
									data-testid={`cement-brand-chip-${cement.id}`}
									data-active={isSelected ? "true" : "false"}
									title={`${cement.name} (${cement.manufacturer}) — ${cement.clinicalIndication}`}
									className={`dente-btn-pill min-h-[44px] sm:min-h-[32px] px-2.5 py-1 text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 rounded-full border ${
										isSelected
											? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)] font-semibold shadow-2xs"
											: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper-soft)]"
									}`}
								>
									<span>{cement.name}</span>
									<span className="text-[10px] opacity-75 font-normal">({cement.manufacturer})</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

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
				<span className="text-[11px] text-[var(--ink-muted)] font-mono">
					{hasAntagonists ? "Антагонисты переданы в ЗТЛ" : "Без антагонистов (одиночная вкладка)"}
				</span>
			</div>
		</div>
	);
}
