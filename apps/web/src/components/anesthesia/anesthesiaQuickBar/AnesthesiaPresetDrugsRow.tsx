/**
 * @dental/web/components/anesthesia/anesthesiaQuickBar/AnesthesiaPresetDrugsRow.tsx
 * 1-Click Anesthetic Drug Presets (Mandate 8b, <= 120 lines)
 */

import { CheckCircle2, SlidersHorizontal, Syringe } from "lucide-react";
import React from "react";
import type { AnestheticDrugId } from "../anesthesiaCatalog";

export interface AnesthesiaPresetDrugsRowProps {
	readonly selectedDrugId: AnestheticDrugId | "none";
	readonly carpulesCount: number;
	readonly onApplyDirect: (drugId: AnestheticDrugId | "none", count: number) => void;
	readonly onOpenMobileDrawer: () => void;
	readonly disabled?: boolean | undefined;
}

export function AnesthesiaPresetDrugsRow({
	selectedDrugId,
	carpulesCount,
	onApplyDirect,
	onOpenMobileDrawer,
	disabled = false,
}: AnesthesiaPresetDrugsRowProps) {
	return (
		<div className="flex items-center justify-between gap-1 flex-wrap pt-0.5">
			<div className="flex items-center gap-2 flex-wrap">
				<button
					type="button"
					disabled={disabled}
					onClick={() => onApplyDirect("articaine_1_100k", carpulesCount)}
					className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
						selectedDrugId === "articaine_1_100k"
							? "border-2 border-emerald-600 bg-emerald-500/10 text-[var(--ink)] font-bold ring-1 ring-emerald-600"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-emerald-600"
					}`}
					title="Артикаин 1:100 000 (1.7 мл) — Ультракаин Д-С Форте"
					data-testid="anesthesia-dose-norm-preset"
				>
					<CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
					<span>Ультракаин Д-С Форте 1:100 000</span>
					<span className="sr-only">Норма: Артикаин 1:100k Убистезин форте Ультракаин Д-С Форте 1:100 000 Септанест</span>
				</button>

				<button
					type="button"
					disabled={disabled}
					onClick={() => onApplyDirect("articaine_1_200k", carpulesCount)}
					className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
						selectedDrugId === "articaine_1_200k"
							? "border-2 border-[var(--teal)] bg-[var(--teal-surface)] text-[var(--ink)] font-bold ring-1 ring-[var(--teal)]"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]"
					}`}
					title="Артикаин 1:200 000 (1.7 мл) — Ультракаин Д-С"
					data-testid="anesthesia-preset-infiltration-articaine-200k"
				>
					<Syringe size={14} className="text-teal-600 shrink-0" />
					<span>Ультракаин Д-С 1:200 000</span>
					<span className="sr-only">Ультракаин Д-С 1:200 000 Щадящий адреналин Убистезин</span>
				</button>

				<button
					type="button"
					disabled={disabled}
					onClick={() => onApplyDirect("mepivacaine_plain", carpulesCount)}
					className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
						selectedDrugId === "mepivacaine_plain"
							? "border-2 border-amber-600 bg-amber-500/10 text-[var(--ink)] font-bold ring-1 ring-amber-600"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-amber-600"
					}`}
					title="Мепивакаин 3% — Скандонест без адреналина (кардио-профиль)"
					data-testid="anesthesia-preset-scandonest-cardio"
				>
					<Syringe size={14} className="text-amber-600 shrink-0" />
					<span>Скандонест без адреналина</span>
					<span className="sr-only">Скандонест без адреналина Кардио-защита Мепивакаин 3%</span>
				</button>

				<button
					type="button"
					disabled={disabled}
					onClick={() => onApplyDirect("none", 0)}
					className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
						selectedDrugId === "none"
							? "border-2 border-slate-600 bg-slate-500/10 text-[var(--ink)] font-bold"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--line-strong)]"
					}`}
					title="Лечение без анестезии / Интактно по согласию пациента"
					data-testid="btn-anes-none"
				>
					<CheckCircle2 size={14} className="text-slate-500 shrink-0" />
					<span>Без анестезии / Интактно</span>
				</button>
			</div>

			<button
				type="button"
				onClick={onOpenMobileDrawer}
				className="lg:hidden inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[44px] rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-xs font-semibold text-[var(--ink)]"
				title="Открыть мобильную шторку анестезии"
				data-testid="btn-open-anesthesia-mobile-sheet"
			>
				<SlidersHorizontal size={14} />
				<span>Шторка</span>
			</button>
		</div>
	);
}
