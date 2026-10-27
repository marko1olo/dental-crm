/**
 * PatientAnamnesisTab.tsx — Клинический медицинский анамнез, соматический статус и аллергологическая безопасность.
 * Архитектурная декомпозиция по Mandate 8b (Layer 5 Facade, <= 120 строк).
 */

import { FileText, RotateCcw, Save } from "lucide-react";
import React, { useId } from "react";
import type { PatientClinicalSafetyProfile } from "./safetyMath";
import "./safetyBanner.css";
import { AnamnesisHeaderBanner } from "./anamnesis/AnamnesisHeaderBanner";
import { AnamnesisAllergyChips } from "./anamnesis/AnamnesisAllergyChips";
import { AnamnesisRiskFactorsGrid } from "./anamnesis/AnamnesisRiskFactorsGrid";
import { AnamnesisDiarySnippet } from "./anamnesis/AnamnesisDiarySnippet";
import { usePatientAnamnesisLogic } from "./anamnesis/usePatientAnamnesisLogic";

export interface PatientAnamnesisTabProps {
	readonly patientId?: string | null | undefined;
	readonly patientName?: string | null | undefined;
	readonly initialProfile?: Partial<PatientClinicalSafetyProfile> | string | null | undefined;
	readonly onSaveProfile?: ((profile: PatientClinicalSafetyProfile) => void) | undefined;
	readonly onSyncToEmkDiary?: ((diarySnippet: string) => void) | undefined;
	readonly onApplySomaticNorm?: (() => void) | undefined;
	readonly isCompact?: boolean | undefined;
	readonly className?: string | undefined;
}

export const PatientAnamnesisTab: React.FC<PatientAnamnesisTabProps> = React.memo(
	({
		patientName,
		initialProfile,
		onSaveProfile,
		onSyncToEmkDiary,
		onApplySomaticNorm,
		isCompact = false,
		className = "",
	}) => {
		const customNotesId = useId();
		const anticoagulantInputId = useId();
		const bisphosphonateInputId = useId();

		const {
			profile,
			evaluation,
			isNorm,
			diaryText,
			updateField,
			toggleField,
			handleApplyPhysiologicalNorm,
			handleSave,
			handleSyncToEmk,
		} = usePatientAnamnesisLogic({ initialProfile, onSaveProfile, onSyncToEmkDiary, onApplySomaticNorm });

		return (
			<div data-testid="visit-anamnesis-tab" className={`w-full space-y-4 ${className}`}>
				<AnamnesisHeaderBanner
					patientName={patientName}
					isNorm={isNorm}
					evaluation={evaluation}
					onApplyPhysiologicalNorm={handleApplyPhysiologicalNorm}
				/>
				<AnamnesisAllergyChips profile={profile} onToggleField={toggleField} />
				<AnamnesisRiskFactorsGrid
					profile={profile}
					anticoagulantInputId={anticoagulantInputId}
					bisphosphonateInputId={bisphosphonateInputId}
					onToggleField={toggleField}
					onUpdateField={updateField}
				/>
				<div className="flex flex-col gap-1.5">
					<label htmlFor={customNotesId} className="text-xs font-semibold text-[var(--muted,#64748b)]">
						Клинические примечания к анамнезу и постоянная лекарственная терапия:
					</label>
					<textarea
						id={customNotesId}
						rows={isCompact ? 2 : 3}
						value={profile.customAllergyNotes || ""}
						onChange={(e) => updateField("customAllergyNotes", e.target.value)}
						placeholder="Например: бронхиальная астма купируется сальбутамолом, аллергия на клубнику"
						className="w-full text-xs p-2.5 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] focus:outline-none focus:ring-2 focus:ring-teal-500/40"
					/>
				</div>
				<AnamnesisDiarySnippet diaryText={diaryText} onSyncToDiary={handleSyncToEmk} />
				<div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--line,#e2e8f0)]">
					<button
						type="button"
						data-testid="mark-somatic-norm-btn"
						onClick={handleApplyPhysiologicalNorm}
						className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-teal-50 text-teal-800 hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800 transition-colors flex items-center gap-1.5 min-h-[44px]"
					>
						<RotateCcw className="w-4 h-4 text-teal-600 dark:text-teal-400" />
						<span>Физиологическая норма</span>
					</button>
					<div className="flex items-center gap-2">
						<button
							type="button"
							data-testid="sync-anamnesis-to-emk-btn"
							onClick={handleSyncToEmk}
							className="px-3 py-2 text-xs font-medium rounded-xl bg-[var(--surface-muted,#f8fafc)] text-[var(--ink,#0f172a)] hover:bg-[var(--surface-hover,#f1f5f9)] border border-[var(--line,#e2e8f0)] transition-colors flex items-center gap-1.5 min-h-[44px]"
						>
							<FileText className="w-3.5 h-3.5 text-blue-500" />
							<span>В дневник приёма</span>
						</button>
						<button
							type="button"
							data-testid="save-somatic-profile-btn"
							onClick={handleSave}
							className="px-4 py-2 text-xs font-bold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors flex items-center gap-1.5 min-h-[44px]"
						>
							<Save className="w-4 h-4" />
							<span>Сохранить анамнез</span>
						</button>
					</div>
				</div>
			</div>
		);
	},
);

PatientAnamnesisTab.displayName = "PatientAnamnesisTab";
export default PatientAnamnesisTab;
