/**
 * apps/web/src/components/visit/VisitAnamnesisTab.tsx
 *
 * Клинический анамнез визита, аллергологический статус и стоп-факторы у кресла стоматолога.
 * Соответствует Приказу Минздрава РФ № 834н, Форме 043/у, стандартам СтАР и Высшей Конституции THE HAMMER.
 *
 * Layer 5 Facade: Компактный фасад вкладки анамнеза (<= 150 строк).
 * Реэкспортирует 100% публичных типов, констант и компонент для сохранения обратной совместимости.
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

// ─── Публичные реэкспорты (100% AST-паритет для внешних потребителей) ─────
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
	const {
		activePat,
		selectedAllergies,
		selectedRisks,
		anticoagulantName,
		setAnticoagulantName,
		bisphosphonateName,
		setBisphosphonateName,
		pregnancyTrimester,
		setPregnancyTrimester,
		selectedHistory,
		selectedComplaints,
		customNotes,
		setCustomNotes,
		toggleAllergen,
		setAllergyReaction,
		toggleRisk,
		toggleHistory,
		toggleComplaint,
		handleApplyPhysiologicalNorm,
		applyToDiary,
		totalCriticalAlerts,
		selectedAllergyCount,
	} = useAnamnesisState(props);

	return (
		<div
			className="visit-anamnesis-tab"
			data-testid="visit-anamnesis-tab"
		>
			<SomaticQuickNormBar
				activePat={activePat}
				totalCriticalAlerts={totalCriticalAlerts}
				selectedRisks={selectedRisks}
				selectedAllergies={selectedAllergies}
				selectedAllergyCount={selectedAllergyCount}
				onOpenStomxTemplates={onOpenStomxTemplates}
				onApplyPhysiologicalNorm={handleApplyPhysiologicalNorm}
				onApplyToDiary={applyToDiary}
			/>

			{/* ═══ БЛОК 1: АЛЛЕРГОЛОГИЧЕСКИЙ СТАТУС ВРАЧА-СТОМАТОЛОГА ═══ */}
			<AllergyStatusPicker
				selectedAllergies={selectedAllergies}
				selectedAllergyCount={selectedAllergyCount}
				toggleAllergen={toggleAllergen}
				setAllergyReaction={setAllergyReaction}
			/>

			{/* ═══ БЛОКИ 2-3: СТОП-ФАКТОРЫ И СТОМАТОЛОГИЧЕСКИЙ АНАМНЕЗ ═══ */}
			<ChronicDiseasesSection
				selectedRisks={selectedRisks}
				toggleRisk={toggleRisk}
				anticoagulantName={anticoagulantName}
				setAnticoagulantName={setAnticoagulantName}
				bisphosphonateName={bisphosphonateName}
				setBisphosphonateName={setBisphosphonateName}
				pregnancyTrimester={pregnancyTrimester}
				setPregnancyTrimester={setPregnancyTrimester}
				selectedHistory={selectedHistory}
				toggleHistory={toggleHistory}
			/>

			{/* ═══ БЛОКИ 4-5: ЖАЛОБЫ, ГОЛОСОВОЙ ВВОД И ПАНЕЛЬ ДЕЙСТВИЙ ═══ */}
			<AnamnesisVoiceInput
				selectedComplaints={selectedComplaints}
				toggleComplaint={toggleComplaint}
				customNotes={customNotes}
				setCustomNotes={setCustomNotes}
				onApplyPhysiologicalNorm={handleApplyPhysiologicalNorm}
				onApplyToDiary={applyToDiary}
			/>
		</div>
	);
};

export default VisitAnamnesisTab;
