import { CheckCircle2, Star, Syringe } from "lucide-react";
import {
	EMK_ANESTHESIA_PRESETS,
	type EmkAnesthesiaPreset,
} from "./emkAnesthesiaPresets";

export interface EmkAnesthesiaPresetChipsProps {
	selectedDrugKey: string;
	favoriteAnes?: string | null;
	onApplyPreset: (preset: EmkAnesthesiaPreset) => void;
	onNoAnesthesia: () => void;
	onAntishockEmergency: () => void;
}

export function EmkAnesthesiaPresetChips({
	selectedDrugKey,
	favoriteAnes,
	onApplyPreset,
	onNoAnesthesia,
	onAntishockEmergency,
}: EmkAnesthesiaPresetChipsProps) {
	return (
		<div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[var(--line)] bg-transparent min-w-0">
			<span className="text-[11px] font-extrabold text-[var(--muted)] flex items-center gap-1 shrink-0">
				<Syringe size={13} className="text-teal-600" />
				<span>Анестезия:</span>
			</span>
			{EMK_ANESTHESIA_PRESETS.map((preset) => {
				const isFav =
					(favoriteAnes === "articaine_100k" &&
						preset.key === "ultracain_ds_forte") ||
					(favoriteAnes === "articaine_200k" &&
						preset.key === "ultracain_ds") ||
					(favoriteAnes === "scandonest_mepivacaine_3" &&
						preset.key === "scandonest_3");
				const isSelected = selectedDrugKey === preset.key;
				return (
					<button
						key={preset.key}
						type="button"
						onClick={() => onApplyPreset(preset)}
						data-testid={`btn-anes-${preset.key.replace(/_/g, "-")}`}
						className={`dente-filter-chip min-h-[34px] h-8.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0 ${
							isSelected || isFav
								? "bg-[var(--paper)] border-2 border-teal-600 text-[var(--ink)] font-bold"
								: "bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] hover:border-teal-600"
						}`}
						title={`Внести ${preset.title} в дневник визита и счёт`}
					>
						<Syringe size={13} className="text-teal-600 shrink-0" />
						<span>{preset.title}</span>
						{isFav && (
							<Star size={10} className="fill-teal-500 text-teal-600" />
						)}
					</button>
				);
			})}
			<button
				type="button"
				onClick={onNoAnesthesia}
				data-testid="btn-anes-none"
				className="dente-filter-chip min-h-[34px] h-8.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--line-strong)] transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0"
				title="Лечение без анестезии"
			>
				<CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
				<span>Без анестезии</span>
			</button>
			<button
				type="button"
				onClick={onAntishockEmergency}
				data-testid="btn-anes-antishock-emergency"
				className="dente-filter-chip min-h-[34px] h-8.5 px-3 py-1.5 rounded-lg text-xs font-black border border-rose-500/60 bg-rose-500/15 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-2xs whitespace-nowrap shrink-0 ml-auto"
				title="Экстренная аптечка «Антишок»: мгновенное открытие протокола неотложной помощи"
			>
				<span>🚨 АНТИШОК</span>
			</button>
		</div>
	);
}
