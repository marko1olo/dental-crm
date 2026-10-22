import { CheckCircle2, Syringe } from "lucide-react";
import type { AnestheticDrugId } from "../anesthesiaCatalog";

export interface AnesthesiaPresetsRowProps {
	readonly disabled?: boolean | undefined;
	readonly selectedDrugId: AnestheticDrugId | string;
	readonly onApplyUltracain200k: () => void;
	readonly onApplyUltracainForte: () => void;
	readonly onApplySeptanest100k?: (() => void) | undefined;
	readonly onApplyScandonestCardio: () => void;
	readonly onApplyNoAnesthesia: () => void;
}

export function AnesthesiaPresetsRow({
	disabled,
	selectedDrugId,
	onApplyUltracain200k,
	onApplyUltracainForte,
	onApplySeptanest100k,
	onApplyScandonestCardio,
	onApplyNoAnesthesia,
}: AnesthesiaPresetsRowProps) {
	return (
		<div className="flex items-center gap-2 flex-wrap pt-0.5">
			<button
				type="button"
				disabled={disabled}
				onClick={onApplySeptanest100k || onApplyUltracainForte}
				className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
					selectedDrugId === "articaine_1_100k"
						? "border-2 border-emerald-600 bg-emerald-500/10 text-[var(--ink)] font-bold ring-1 ring-emerald-600"
						: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-emerald-600"
				}`}
				title="Артикаин 1:100 000 (1 карпула / 1.7 мл) — Ультракаин Д-С Форте 1:100 000 / Септанест"
				data-testid="anesthesia-dose-norm-preset"
			>
				<CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
				<span>Артикаин 1:100 000 (1.7 мл)</span>
				<span className="sr-only">Норма: Артикаин 1:100k Убистезин форте Ультракаин Д-С Форте 1:100 000 Септанест</span>
			</button>

			<button
				type="button"
				disabled={disabled}
				onClick={onApplyUltracain200k}
				className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
					selectedDrugId === "articaine_1_200k"
						? "border-2 border-[var(--teal)] bg-[var(--teal-surface)] text-[var(--ink)] font-bold ring-1 ring-[var(--teal)]"
						: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]"
				}`}
				title="Артикаин 1:200 000 (1 карпула / 1.7 мл) — Ультракаин Д-С 1:200 000 / Убистезин"
				data-testid="anesthesia-preset-infiltration-articaine-200k"
			>
				<Syringe size={14} className="text-teal-600 shrink-0" />
				<span>Артикаин 1:200 000 (1.7 мл)</span>
				<span className="sr-only">Ультракаин Д-С 1:200 000 Щадящий адреналин Убистезин</span>
			</button>

			<button
				type="button"
				disabled={disabled}
				onClick={onApplyScandonestCardio}
				className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
					selectedDrugId === "mepivacaine_plain"
						? "border-2 border-amber-600 bg-amber-500/10 text-[var(--ink)] font-bold ring-1 ring-amber-600"
						: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-amber-600"
				}`}
				title="Мепивакаин без адреналина — Скандонест 3% (1 карпула 1.7–1.8 мл, кардио-профиль)"
				data-testid="anesthesia-preset-scandonest-cardio"
			>
				<Syringe size={14} className="text-amber-600 shrink-0" />
				<span>Мепивакаин 3% (без адреналина)</span>
				<span className="sr-only">Скандонест без адреналина Кардио-защита Мепивакаин 3%</span>
			</button>

			<button
				type="button"
				disabled={disabled}
				onClick={onApplyNoAnesthesia}
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
	);
}
