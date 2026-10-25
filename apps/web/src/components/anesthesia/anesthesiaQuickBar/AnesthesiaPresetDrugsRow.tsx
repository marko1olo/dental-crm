/**
 * @dental/web/components/anesthesia/anesthesiaQuickBar/AnesthesiaPresetDrugsRow.tsx
 * Ultra-Fast Chairside Anesthetic Chips & Injection Technique (Mandate 8e, 8y, <= 120 lines)
 */

import { CheckCircle2, Syringe } from "lucide-react";
import React from "react";
import type { AnestheticDrugId, InjectionTechniqueId } from "../anesthesiaCatalog";

export interface AnesthesiaPresetDrugsRowProps {
	readonly selectedDrugId: AnestheticDrugId | "none";
	readonly techniqueId: InjectionTechniqueId;
	readonly setTechniqueId: (tech: InjectionTechniqueId) => void;
	readonly carpulesCount: number;
	readonly onApplyDirect: (drugId: AnestheticDrugId | "none", count: number) => void;
	readonly disabled?: boolean | undefined;
}

export function AnesthesiaPresetDrugsRow({
	selectedDrugId,
	techniqueId,
	setTechniqueId,
	carpulesCount,
	onApplyDirect,
	disabled = false,
}: AnesthesiaPresetDrugsRowProps) {
	return (
		<div className="flex items-center gap-1.5 flex-wrap min-w-0" data-testid="anesthesia-chips-group">
			<div className="inline-flex items-center rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] p-0.5 shrink-0" role="group" aria-label="Метод обезболивания">
				<button
					type="button"
					disabled={disabled}
					onClick={() => setTechniqueId("infiltration")}
					className={`px-2.5 py-1 min-h-[36px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
						techniqueId === "infiltration" ? "bg-[var(--teal-surface)] border border-[var(--teal)] text-[var(--teal-strong)] font-bold shadow-2xs" : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
					title="Инфильтрационная анестезия"
				>
					Инфильтр.
				</button>
				<button
					type="button"
					disabled={disabled}
					onClick={() => setTechniqueId("mandibular_torus")}
					className={`px-2.5 py-1 min-h-[36px] rounded-lg text-xs font-semibold transition-all cursor-pointer ${
						techniqueId === "mandibular_torus" ? "bg-[var(--teal-surface)] border border-[var(--teal)] text-[var(--teal-strong)] font-bold shadow-2xs" : "bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--ink)]"
					}`}
					title="Проводниковая анестезия"
				>
					Проводник.
				</button>
			</div>

			<button
				type="button"
				disabled={disabled}
				onClick={() => onApplyDirect("articaine_1_100k", carpulesCount)}
				className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
					selectedDrugId === "articaine_1_100k" ? "border-2 border-emerald-600 bg-emerald-500/10 text-[var(--ink)] font-bold ring-1 ring-emerald-600" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-emerald-600"
				}`}
				title="Ультракаин Д-С Форте 1:100 000 (Артикаин 4%)"
				data-testid="anesthesia-dose-norm-preset"
			>
				<CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
				<span>Ультракаин 1:100к</span>
				<span className="sr-only">Норма: Артикаин 1:100k Убистезин форте Ультракаин Д-С Форте 1:100 000 Септанест</span>
			</button>

			<button
				type="button"
				disabled={disabled}
				onClick={() => onApplyDirect("articaine_1_200k", carpulesCount)}
				className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
					selectedDrugId === "articaine_1_200k" ? "border-2 border-[var(--teal)] bg-[var(--teal-surface)] text-[var(--ink)] font-bold ring-1 ring-[var(--teal)]" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]"
				}`}
				title="Убистезин / Ультракаин Д-С 1:200 000 (щадящий адреналин)"
				data-testid="anesthesia-preset-infiltration-articaine-200k"
			>
				<Syringe size={13} className="text-teal-600 shrink-0" />
				<span>Убистезин</span>
				<span className="sr-only">Ультракаин Д-С 1:200 000 Убистезин</span>
			</button>

			<button
				type="button"
				disabled={disabled}
				onClick={() => onApplyDirect("mepivacaine_plain", carpulesCount)}
				className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
					selectedDrugId === "mepivacaine_plain" ? "border-2 border-amber-600 bg-amber-500/10 text-[var(--ink)] font-bold ring-1 ring-amber-600" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-amber-600"
				}`}
				title="Скандонест без адреналина (Мепивакаин 3%, кардио-защита)"
				data-testid="anesthesia-preset-scandonest-cardio"
			>
				<Syringe size={13} className="text-amber-600 shrink-0" />
				<span>Скандонест (без адреналина)</span>
				<span className="sr-only">Скандонест без адреналина Мепивакаин</span>
			</button>

			<button
				type="button"
				disabled={disabled}
				onClick={() => onApplyDirect("none", 0)}
				className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-2.5 py-1.5 min-h-[36px] rounded-xl border text-xs font-semibold transition-all cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
					selectedDrugId === "none" ? "border-2 border-slate-600 bg-slate-500/10 text-[var(--ink)] font-bold" : "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--line-strong)]"
				}`}
				title="Без анестезии / Интактно по согласию пациента"
				data-testid="btn-anes-none"
			>
				<CheckCircle2 size={13} className="text-slate-500 shrink-0" />
				<span>Без анестезии</span>
				<span className="sr-only">Без анестезии / Интактно</span>
			</button>
		</div>
	);
}
