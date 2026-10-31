/**
 * @dental/web/components/anesthesia/quickBar/AnesthesiaDrugSelector.tsx
 * Quick Technique & Drug Preset Selector for Chairside Anesthesia (Mandates 8e, 8y, 8am, 8ze)
 * 1-click presets, min-h-[44px] touch target, zero cartoon emojis.
 */

import React from "react";
import { CheckCircle2, Syringe } from "lucide-react";
import {
	CLINICAL_FAST_PRESETS,
	type AnestheticDrugId,
	type ClinicalFastPresetItem,
	type InjectionTechniqueId,
} from "../anesthesiaCatalogData";

export interface AnesthesiaDrugSelectorProps {
	readonly techniqueId: InjectionTechniqueId;
	readonly onSelectTechnique: (tech: InjectionTechniqueId) => void;
	readonly selectedDrugId: AnestheticDrugId | "none";
	readonly carpulesCount: number;
	readonly onApplyPreset: (drugId: AnestheticDrugId | "none", count: number, technique: InjectionTechniqueId) => void;
}

export function AnesthesiaDrugSelector({
	techniqueId,
	onSelectTechnique,
	selectedDrugId,
	carpulesCount,
	onApplyPreset,
}: AnesthesiaDrugSelectorProps) {
	return (
		<div className="flex items-center gap-1.5 flex-wrap min-w-0" data-testid="anesthesia-chips-group">
			<div className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5" role="group" aria-label="Техника анестезии">
				<button
					type="button"
					onClick={() => onSelectTechnique("infiltration")}
					className={`px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold cursor-pointer transition-all ${techniqueId === "infiltration" ? "bg-[var(--teal-surface)] border border-[var(--teal)] text-[var(--teal-strong)] font-bold shadow-2xs" : "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}
					data-testid="technique-btn-infiltration"
				>
					Инфильтрационная
				</button>
				<button
					type="button"
					onClick={() => onSelectTechnique("mandibular_torus")}
					className={`px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold cursor-pointer transition-all ${techniqueId === "mandibular_torus" ? "bg-[var(--teal-surface)] border border-[var(--teal)] text-[var(--teal-strong)] font-bold shadow-2xs" : "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}
					data-testid="technique-btn-mandibular"
				>
					Проводниковая
				</button>
				<button
					type="button"
					onClick={() => onSelectTechnique("intraligamentary_sta")}
					className={`px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold cursor-pointer transition-all ${techniqueId === "intraligamentary_sta" ? "bg-[var(--teal-surface)] border border-[var(--teal)] text-[var(--teal-strong)] font-bold shadow-2xs" : "bg-transparent text-[var(--muted)] hover:text-[var(--ink)]"}`}
					data-testid="technique-btn-intraligamentary"
				>
					Интралигаментарная
				</button>
			</div>

			{CLINICAL_FAST_PRESETS.map((p: ClinicalFastPresetItem) => {
				const isSel = selectedDrugId === p.drugId;
				const isCardio = p.isCardioRecommended;
				return (
					<button
						key={p.testId}
						type="button"
						onClick={() =>
							onApplyPreset(
								p.drugId,
								p.drugId === "none" ? 0 : carpulesCount > 0 ? carpulesCount : p.count,
								p.defaultTechnique ?? techniqueId,
							)
						}
						className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] h-11 rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
							isSel
								? isCardio
									? "border-2 border-amber-600 bg-amber-500/10 text-[var(--ink)] font-bold"
									: "border-2 border-[#0d9488] bg-[var(--teal-surface)] text-[var(--ink)] font-bold"
								: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[#0d9488]"
						}`}
						data-testid={p.testId}
					>
						{p.drugId === "none" ? (
							<CheckCircle2 size={14} className="text-slate-500 shrink-0" />
						) : (
							<Syringe size={14} className={isCardio ? "text-amber-600 shrink-0" : "text-teal-600 shrink-0"} />
						)}
						<span>{p.shortLabelRu}</span>
						<span className="sr-only">{p.srOnlyText}</span>
					</button>
				);
			})}
		</div>
	);
}
