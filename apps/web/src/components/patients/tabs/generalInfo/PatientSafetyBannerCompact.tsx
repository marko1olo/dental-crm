import React from "react";
import { HeartPulse, ShieldCheck } from "lucide-react";
import type { PatientClinicalSafetyProfile, PatientSafetyEvaluationResult } from "../../safetyMath";
import { SafetyStatusBadge } from "./SafetyStatusBadge";
import { AllergyChipsGrid } from "./AllergyChipsGrid";

interface PatientSafetyBannerCompactProps {
	currentProfile: PatientClinicalSafetyProfile;
	safetyEvaluation: PatientSafetyEvaluationResult;
	disabled?: boolean;
	handleApplyNormAction: () => void;
	onToggleAllergy: (field: "hasPenicillinAllergy" | "hasNsaidAllergy" | "hasLatexAllergy") => void;
}

export const PatientSafetyBannerCompact: React.FC<PatientSafetyBannerCompactProps> = ({
	currentProfile, safetyEvaluation, disabled = false, handleApplyNormAction, onToggleAllergy,
}) => {
	return (
		<div className="flex flex-col gap-2.5 pt-3 border-t border-[var(--line)]">
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-2">
					<HeartPulse className="w-3.5 h-3.5 text-[var(--primary)]" />
					<span className="font-bold text-xs text-[var(--ink)]">
						Экспресс-соматика и аллергии:
					</span>
				</div>
				<div className="flex items-center gap-2">
					<SafetyStatusBadge evaluation={safetyEvaluation} />
					{(safetyEvaluation.hasCriticalStopFlags || safetyEvaluation.hasHighRiskFlags) && (
						<button
							type="button"
							data-testid="btn-somatic-healthy-norm"
							onClick={handleApplyNormAction}
							disabled={disabled}
							className="min-h-[44px] sm:min-h-[28px] h-7 px-2.5 text-xs rounded-lg font-medium border border-[var(--line)] bg-[var(--paper)] dark:bg-white/5 hover:bg-[var(--paper-soft)] text-[var(--ink)] shadow-2xs inline-flex items-center gap-1.5 cursor-pointer transition-colors active:scale-98 shrink-0 select-none"
							title="Зафиксировать физиологическую норму: соматически здоров"
						>
							<ShieldCheck className="w-3.5 h-3.5 shrink-0" />
							<span>Норма</span>
						</button>
					)}
				</div>
			</div>

			<AllergyChipsGrid
				currentProfile={currentProfile}
				disabled={disabled}
				onToggleAllergy={onToggleAllergy}
				variant="compact"
			/>
		</div>
	);
};
