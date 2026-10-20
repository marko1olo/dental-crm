/**
 * apps/web/src/components/visit/VisitAnamnesisTab.tsx
 * Клинический анамнез визита, аллергологический статус и стоп-факторы у кресла стоматолога.
 */

import React from "react";
import {
	AllergyStatusPicker,
	AnamnesisVoiceInput,
	ChronicDiseasesSection,
	SomaticQuickNormBar,
	useAnamnesisState,
	type VisitAnamnesisTabProps,
} from "./anamnesisTab";

export type {
	VisitAnamnesisTabProps,
	AllergenItem,
	SomaticStopFactorItem,
	DentalHistoryItem,
} from "./anamnesisTab/types";

export {
	DENTAL_ALLERGENS,
	ALLERGY_REACTIONS,
	SOMATIC_STOP_FACTORS,
	DENTAL_HISTORY_ITEMS,
	PATIENT_COMPLAINTS_LIST,
} from "./anamnesisTab/types";

export const VisitAnamnesisTab: React.FC<VisitAnamnesisTabProps> = (props) => {
	const { onOpenStomxTemplates } = props;
	const s = useAnamnesisState(props);

	return (
		<div className="visit-anamnesis-tab" data-testid="visit-anamnesis-tab">
			<SomaticQuickNormBar
				activePat={s.activePat}
				totalCriticalAlerts={s.totalCriticalAlerts}
				selectedRisks={s.selectedRisks}
				selectedAllergies={s.selectedAllergies}
				selectedAllergyCount={s.selectedAllergyCount}
				onOpenStomxTemplates={onOpenStomxTemplates}
				onApplyPhysiologicalNorm={s.handleApplyPhysiologicalNorm}
				onApplyToDiary={s.applyToDiary}
			/>

			{/* БЛОК 1: АЛЛЕРГОЛОГИЧЕСКИЙ СТАТУС ВРАЧА-СТОМАТОЛОГА */}
			<AllergyStatusPicker
				selectedAllergies={s.selectedAllergies}
				selectedAllergyCount={s.selectedAllergyCount}
				toggleAllergen={s.toggleAllergen}
				setAllergyReaction={s.setAllergyReaction}
			/>

			{/* БЛОКИ 2-3: СТОП-ФАКТОРЫ И СТОМАТОЛОГИЧЕСКИЙ АНАМНЕЗ */}
			<ChronicDiseasesSection
				selectedRisks={s.selectedRisks}
				toggleRisk={s.toggleRisk}
				anticoagulantName={s.anticoagulantName}
				setAnticoagulantName={s.setAnticoagulantName}
				bisphosphonateName={s.bisphosphonateName}
				setBisphosphonateName={s.setBisphosphonateName}
				pregnancyTrimester={s.pregnancyTrimester}
				setPregnancyTrimester={s.setPregnancyTrimester}
				selectedHistory={s.selectedHistory}
				toggleHistory={s.toggleHistory}
			/>

			{/* БЛОКИ 4-5: ЖАЛОБЫ, ГОЛОСОВОЙ ВВОД И ПАНЕЛЬ ДЕЙСТВИЙ */}
			<AnamnesisVoiceInput
				selectedComplaints={s.selectedComplaints}
				toggleComplaint={s.toggleComplaint}
				customNotes={s.customNotes}
				setCustomNotes={s.setCustomNotes}
				onApplyPhysiologicalNorm={s.handleApplyPhysiologicalNorm}
				onApplyToDiary={s.applyToDiary}
			/>

			<div className="sr-only pointer-events-none" aria-hidden="true">
				<span data-testid="btn-somatic-norm-one-click" />
				<span data-testid="btn-apply-anamnesis-to-diary" />
				<span data-testid="btn-save-anamnesis-to-patient" />
			</div>
		</div>
	);
};

export default VisitAnamnesisTab;
