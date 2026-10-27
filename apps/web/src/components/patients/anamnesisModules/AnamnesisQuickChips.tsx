import React from "react";
import { ShieldCheck } from "lucide-react";
import type { AnamnesisPresetType } from "../patientAnamnesisPresets";

export interface AnamnesisQuickChipsProps {
	onApplyPreset: (presetType: AnamnesisPresetType) => void;
}

const PRESET_BTN_CLASS = "min-h-[44px] sm:min-h-[32px] text-xs rounded-lg font-semibold bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors cursor-pointer shrink-0";
const PRESET_AMBER_BTN_CLASS = "min-h-[44px] sm:min-h-[32px] text-xs rounded-lg font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors cursor-pointer shrink-0";
const PRESET_BLUE_BTN_CLASS = "min-h-[44px] sm:min-h-[32px] text-xs rounded-lg font-semibold bg-indigo-50 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors cursor-pointer shrink-0";

export const AnamnesisQuickChips: React.FC<AnamnesisQuickChipsProps> = ({ onApplyPreset }) => {
	return (
		<div className="p-3 bg-[var(--paper-soft)] border-b border-[var(--line-subtle)] flex flex-wrap items-center gap-2 overflow-x-auto">
			<button
				type="button"
				onClick={() => onApplyPreset("clean")}
				data-testid="btn-somatic-healthy-norm"
				className="min-h-[44px] sm:min-h-[32px] text-xs rounded-lg font-bold bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5 shrink-0"
				aria-label="Соматически здоров / норма"
				title="Соматически здоров. Аллергоанамнез не отягощен"
			>
				<ShieldCheck size={14} className="shrink-0" />
				<span>Соматически здоров / норма (без особенностей)</span>
			</button>
			<button type="button" onClick={() => onApplyPreset("allergy_penicillin")} data-testid="preset-allergy-penicillin" className={PRESET_BTN_CLASS}>+ Пенициллины</button>
			<button type="button" onClick={() => onApplyPreset("allergy_nsaid")} data-testid="preset-allergy-nsaid" className={PRESET_BTN_CLASS}>+ НПВП / Аспирин</button>
			<button type="button" onClick={() => onApplyPreset("allergy_latex")} data-testid="preset-allergy-latex" className={PRESET_BTN_CLASS}>+ Латекс</button>
			<button type="button" onClick={() => onApplyPreset("cardio")} data-testid="preset-cardio" className={PRESET_AMBER_BTN_CLASS}>+ Кардио / ЭКС</button>
			<button type="button" onClick={() => onApplyPreset("diabetes")} data-testid="preset-diabetes" className={PRESET_AMBER_BTN_CLASS}>+ Диабет</button>
			<button type="button" onClick={() => onApplyPreset("pregnant_2")} data-testid="preset-pregnant" className={PRESET_BLUE_BTN_CLASS}>+ Беременность</button>
		</div>
	);
};
