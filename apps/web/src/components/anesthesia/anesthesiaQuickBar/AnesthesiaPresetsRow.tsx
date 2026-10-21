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
				onClick={onApplyUltracainForte}
				className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
					selectedDrugId === "articaine_1_100k"
						? "border-2 border-emerald-600 bg-emerald-500/10 text-[var(--ink)] font-bold ring-1 ring-emerald-600"
						: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-emerald-600"
				}`}
				title="Норма: Ультракаин Д-С Форте 1:100 000 / Убистезин форте (1 карпула 1.7 мл)"
				data-testid="anesthesia-dose-norm-preset"
			>
				<CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
				<span>Убистезин форте 1:100 000 (1.7 мл)</span>
			</button>

			{onApplySeptanest100k && (
				<button
					type="button"
					disabled={disabled}
					onClick={onApplySeptanest100k}
					className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
						selectedDrugId === "septanest_1_100k"
							? "border-2 border-teal-600 bg-teal-500/10 text-[var(--ink)] font-bold ring-1 ring-teal-600"
							: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-teal-600"
					}`}
					title="Септанест 1:100 000 (1 карпула 1.7 мл)"
					data-testid="anesthesia-preset-septanest-100k"
				>
					<Syringe size={13} className="text-teal-600 shrink-0" />
					<span>Септанест 1:100 000 (1.7 мл)</span>
				</button>
			)}

			<button
				type="button"
				disabled={disabled}
				onClick={onApplyUltracain200k}
				className={`secondary-button anesthesia-quick-btn inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl border text-xs font-semibold transition-all shadow-2xs cursor-pointer active:scale-98 shrink-0 whitespace-nowrap ${
					selectedDrugId === "articaine_1_200k"
						? "border-2 border-[var(--teal)] bg-[var(--teal-surface)] text-[var(--ink)] font-bold ring-1 ring-[var(--teal)]"
						: "border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal)]"
				}`}
				title="Щадящий адреналин: Артикаин 4% 1:200 000 — Ультракаин Д-С (1 карпула 1.7 мл)"
				data-testid="anesthesia-preset-infiltration-articaine-200k"
			>
				<Syringe size={13} className="text-teal-600 shrink-0" />
				<span>Ультракаин Д-С 1:200 000 (1.7 мл)</span>
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
				title="Кардио-защита: Мепивакаин 3% — Скандонест без адреналина (1 карпула 1.7 мл)"
				data-testid="anesthesia-preset-scandonest-cardio"
			>
				<Syringe size={13} className="text-amber-600 shrink-0" />
				<span>Скандонест без адреналина (1.7 мл)</span>
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
				<CheckCircle2 size={13} className="text-slate-500 shrink-0" />
				<span>Без анестезии / Интактно</span>
			</button>
		</div>
	);
}
