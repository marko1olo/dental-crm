import React from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import type { PatientClinicalSafetyProfile } from "../../safetyMath";

interface AllergyChipsGridProps {
	currentProfile: PatientClinicalSafetyProfile;
	disabled?: boolean;
	onToggleAllergy: (field: "hasPenicillinAllergy" | "hasNsaidAllergy" | "hasLatexAllergy") => void;
	variant?: "full" | "compact";
}

export const AllergyChipsGrid: React.FC<AllergyChipsGridProps> = ({
	currentProfile, disabled = false, onToggleAllergy, variant = "full",
}) => {
	const minH = variant === "full" ? "min-h-[44px] sm:min-h-[32px] px-3 py-1.5" : "min-h-[44px] sm:min-h-[30px] h-7.5 px-3";

	return (
		<div className="flex items-center gap-2 flex-wrap mt-1">
			<button
				type="button" data-testid="toggle-allergy-penicillin" disabled={disabled}
				className={`${minH} text-xs rounded-lg font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
					currentProfile.hasPenicillinAllergy
						? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40"
						: "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-soft)]"
				}`}
				onClick={() => onToggleAllergy("hasPenicillinAllergy")}
			>
				{currentProfile.hasPenicillinAllergy ? <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
				<span>Пенициллины {currentProfile.hasPenicillinAllergy ? "(Аллергия)" : "(Норма)"}</span>
			</button>

			<button
				type="button" data-testid="toggle-allergy-nsaid" disabled={disabled}
				className={`${minH} text-xs rounded-lg font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
					currentProfile.hasNsaidAllergy
						? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40"
						: "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-soft)]"
				}`}
				onClick={() => onToggleAllergy("hasNsaidAllergy")}
			>
				{currentProfile.hasNsaidAllergy ? <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
				<span>НПВП / Аспирин {currentProfile.hasNsaidAllergy ? "(Аллергия)" : "(Норма)"}</span>
			</button>

			<button
				type="button" data-testid="toggle-allergy-latex" disabled={disabled}
				className={`${minH} text-xs rounded-lg font-bold border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
					currentProfile.hasLatexAllergy
						? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40"
						: "bg-[var(--paper-strong)] text-[var(--ink)] border-[var(--glass-border)] hover:bg-[var(--paper-soft)]"
				}`}
				onClick={() => onToggleAllergy("hasLatexAllergy")}
			>
				{currentProfile.hasLatexAllergy ? <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" /> : <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
				<span>Латекс {currentProfile.hasLatexAllergy ? "(Аллергия)" : "(Норма)"}</span>
			</button>
		</div>
	);
};
