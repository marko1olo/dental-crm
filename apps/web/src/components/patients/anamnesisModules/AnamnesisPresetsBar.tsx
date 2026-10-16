import React from "react";
import { Sparkles } from "lucide-react";
import type { AnamnesisPresetType } from "../patientAnamnesisPresets";

export interface AnamnesisPresetsBarProps {
	readonly onApplyPreset: (preset: AnamnesisPresetType) => void;
}

export const AnamnesisPresetsBar: React.FC<AnamnesisPresetsBarProps> = React.memo(({ onApplyPreset }) => {
	return (
		<div className="p-3 bg-[var(--paper-soft)] border-b border-[var(--line-subtle)] flex flex-wrap items-center gap-2">
			<span className="text-xs font-semibold text-[var(--muted)] inline-flex items-center gap-1 shrink-0">
				<Sparkles size={13} className="text-[var(--teal)]" />
				<span>1-Click шаблоны:</span>
			</span>
			<button
				type="button"
				onClick={() => onApplyPreset("clean")}
				className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors text-xs"
			>
				Норма
			</button>
			<button
				type="button"
				onClick={() => onApplyPreset("cardio")}
				className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors text-xs"
			>
				ЭКС / Кардио
			</button>
			<button
				type="button"
				onClick={() => onApplyPreset("allergy_articaine")}
				className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors text-xs"
			>
				Аллергия: Артикаин
			</button>
			<button
				type="button"
				onClick={() => onApplyPreset("allergy_penicillin")}
				className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors text-xs"
			>
				Пенициллин
			</button>
			<button
				type="button"
				onClick={() => onApplyPreset("allergy_nsaid")}
				className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors text-xs"
			>
				НПВП
			</button>
			<button
				type="button"
				onClick={() => onApplyPreset("allergy_latex")}
				className="border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] font-bold rounded-lg px-2.5 py-1.5 shadow-2xs hover:border-[var(--teal)] transition-colors text-xs"
			>
				Латекс
			</button>
		</div>
	);
});
