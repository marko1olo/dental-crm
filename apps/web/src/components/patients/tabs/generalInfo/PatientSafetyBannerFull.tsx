import React from "react";
import { HeartPulse, ShieldCheck } from "lucide-react";
import type { PatientClinicalSafetyProfile, PatientSafetyEvaluationResult } from "../../safetyMath";
import { SomaticAnamnesisCard } from "../../../clinical/SomaticAnamnesisCard";
import { SafetyStatusBadge } from "./SafetyStatusBadge";
import { AllergyChipsGrid } from "./AllergyChipsGrid";

interface PatientSafetyBannerFullProps {
	currentProfile: PatientClinicalSafetyProfile;
	safetyEvaluation: PatientSafetyEvaluationResult;
	disabled?: boolean;
	patientId?: string | null | undefined;
	patientName?: string | null | undefined;
	handleApplyNormAction: () => void;
	onToggleAllergy: (field: "hasPenicillinAllergy" | "hasNsaidAllergy" | "hasLatexAllergy") => void;
	onApplySomaticNorm?: (() => void) | undefined;
	onUpdateSafetyProfile?: ((profile: PatientClinicalSafetyProfile) => void) | undefined;
}

export const PatientSafetyBannerFull: React.FC<PatientSafetyBannerFullProps> = ({
	currentProfile, safetyEvaluation, disabled = false, patientId, patientName,
	handleApplyNormAction, onToggleAllergy, onApplySomaticNorm, onUpdateSafetyProfile,
}) => {
	return (
		<div className="flex flex-col gap-5 p-4 sm:p-5 bg-[var(--paper)] rounded-2xl border border-[var(--glass-border)] shadow-xs">
			<div className="flex items-center justify-between pb-3 border-b border-[var(--glass-border)] flex-wrap gap-2">
				<div className="flex items-center gap-2.5">
					<div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0">
						<HeartPulse className="w-4 h-4" />
					</div>
					<div>
						<h3 className="text-sm font-black m-0 text-[var(--ink)]">
							Медицинский статус, соматика и аллергологический анамнез
						</h3>
						<p className="text-[11px] text-[var(--muted)] m-0">
							Клинические стоп-факторы, аллергии на медикаменты и оценка анестезиологического риска
						</p>
					</div>
				</div>

				<button
					type="button" data-testid="btn-somatic-healthy-norm" onClick={handleApplyNormAction} disabled={disabled}
					className="min-h-[44px] sm:min-h-[32px] px-3.5 py-1.5 text-xs rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs inline-flex items-center gap-2 cursor-pointer transition-all active:scale-98 shrink-0 select-none"
					title="Зафиксировать физиологическую норму: соматически здоров"
				>
					<ShieldCheck className="w-4 h-4 shrink-0" />
					<span>Норма</span>
				</button>
			</div>

			<div className="p-4 bg-[var(--paper-soft)] rounded-xl border border-[var(--glass-border)] flex flex-col gap-3">
				<div className="flex items-center justify-between gap-2 flex-wrap">
					<div className="flex items-center gap-2">
						<HeartPulse className="w-4 h-4 text-[var(--teal,var(--brand-primary))]" />
						<span className="font-bold text-xs text-[var(--ink)]">Аллергологический статус и стоп-факторы:</span>
					</div>
					<SafetyStatusBadge evaluation={safetyEvaluation} />
				</div>

				<AllergyChipsGrid currentProfile={currentProfile} disabled={disabled} onToggleAllergy={onToggleAllergy} variant="full" />

				<div className="mt-1">
					<label className="text-xs font-bold text-[var(--muted)] block mb-1">Соматический анамнез:</label>
					<textarea
						className="w-full p-2.5 text-xs rounded-lg bg-[var(--paper)] border border-[var(--glass-border)] text-[var(--ink)] focus:outline-hidden focus:ring-2 focus:ring-[var(--teal,var(--brand-primary))]"
						rows={2} value={currentProfile.customChronicNotes ?? ""}
						onChange={(e) => onUpdateSafetyProfile?.({ ...currentProfile, customChronicNotes: e.target.value })}
						placeholder="Соматически здоров. Аллергический статус не отягощен..." disabled={disabled} data-testid="textarea-somatic-notes"
					/>
				</div>
			</div>

			<div className="pt-2">
				<SomaticAnamnesisCard
					initialProfile={currentProfile} patientId={patientId || undefined} patientName={patientName || undefined}
					onApplyNorm={(normProfile) => { onUpdateSafetyProfile?.(normProfile); onApplySomaticNorm?.(); }}
					onSave={(updatedProfile) => onUpdateSafetyProfile?.(updatedProfile)}
				/>
			</div>
		</div>
	);
};
