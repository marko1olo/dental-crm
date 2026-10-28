/**
 * @dental/web/components/anesthesia/anesthesiaQuickBar/AnesthesiaPresetDrugsRow.tsx
 * Ultra-Fast Chairside Anesthetic Chips & Injection Technique (Mandate 8e, 8y, <= 120 lines)
 */

import { CheckCircle2, Syringe } from "lucide-react";
import React from "react";
import type { AnestheticDrugId, InjectionTechniqueId } from "../anesthesiaCatalog";
import { CLINICAL_FAST_PRESETS, type ClinicalFastPresetItem } from "./primaryDrugs";

export interface AnesthesiaPresetDrugsRowProps {
	readonly selectedDrugId: AnestheticDrugId | "none";
	readonly techniqueId: InjectionTechniqueId;
	readonly setTechniqueId: (tech: InjectionTechniqueId) => void;
	readonly carpulesCount: number;
	readonly onApplyDirect: (drugId: AnestheticDrugId | "none", count: number, tech?: InjectionTechniqueId) => void;
	readonly disabled?: boolean | undefined;
}

export function AnesthesiaPresetDrugsRow({
	selectedDrugId,
	techniqueId,
	setTechniqueId,
	carpulesCount,
	onApplyDirect,
}: AnesthesiaPresetDrugsRowProps) {
	return (
		<div className="flex items-center gap-1.5 flex-wrap min-w-0" data-testid="anesthesia-chips-group">
			<div className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0" role="group" aria-label="Метод обезболивания">
				<button
					type="button"
					onClick={() => setTechniqueId("infiltration")}
					className={`px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
						techniqueId === "infiltration" ? "bg-[var(--teal-surface)] border border-[var(--teal)] text-[var(--teal-strong)] font-bold shadow-2xs" : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
					title="Инфильтрационная анестезия"
				>
					Инфильтрационная
				</button>
				<button
					type="button"
					onClick={() => setTechniqueId("mandibular_torus")}
					className={`px-3 py-1.5 min-h-[44px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
						techniqueId === "mandibular_torus" ? "bg-[var(--teal-surface)] border border-[var(--teal)] text-[var(--teal-strong)] font-bold shadow-2xs" : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
					title="Проводниковая анестезия"
				>
					Проводниковая
				</button>
			</div>

			{CLINICAL_FAST_PRESETS.map((preset: ClinicalFastPresetItem) => {
				const isSelected = selectedDrugId === preset.drugId;
				const isCardio = preset.isCardioRecommended;
				const borderClass = isSelected
					? isCardio
						? "border-2 border-amber-600 bg-amber-500/10 text-[var(--ink)] dark:text-amber-200 font-bold ring-1 ring-amber-600/30"
						: "border-2 border-[var(--teal,#0d9488)] bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--ink)] dark:text-teal-200 font-bold ring-1 ring-[var(--teal,#0d9488)]/30"
					: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] hover:bg-[var(--paper-soft)]";

				const testIdAttr = preset.testId === "anesthesia-dose-norm-preset" ? "anesthesia-dose-norm-preset" : preset.testId;

				return (
					<button
						key={preset.testId}
						type="button"
						onClick={() => onApplyDirect(preset.drugId, preset.drugId === "none" ? 0 : (carpulesCount > 0 ? carpulesCount : preset.count), preset.defaultTechnique ?? techniqueId)}
						className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[44px] h-11 rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${borderClass}`}
						title={`${preset.fullLabelRu} • ${preset.clinicalScopeRu}`}
						data-testid={testIdAttr}
					>
						{preset.drugId === "none" ? (
							<CheckCircle2 size={14} className="text-slate-500 shrink-0" />
						) : (
							<Syringe size={14} className={isCardio ? "text-amber-600 shrink-0" : "text-teal-600 shrink-0"} />
						)}
						<span>{preset.shortLabelRu}</span>
						<span className="sr-only">{preset.srOnlyText}</span>
					</button>
				);
			})}
		</div>
	);
}
