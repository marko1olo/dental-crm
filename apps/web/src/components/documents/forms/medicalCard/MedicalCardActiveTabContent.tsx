import React from "react";
import type { ToothClinicalStatusCode, ToothSurface } from "@dental/shared";
import { DentalMedicalCardOdontogramTab } from "../DentalMedicalCardOdontogramTab";
import { DentalMedicalCardIndicesTab } from "../DentalMedicalCardIndicesTab";
import { DentalMedicalCardAnamnesisTab } from "../DentalMedicalCardAnamnesisTab";

export interface MedicalCardActiveTabContentProps {
	activeTab: "formula" | "indices" | "anamnesis";
	state: any;
	effectiveDisabled: boolean;
	handleToothStatusSet: (t: number, s: ToothClinicalStatusCode) => void;
	handleSurfaceToggle: (t: number, s: ToothSurface) => void;
}

export const MedicalCardActiveTabContent: React.FC<MedicalCardActiveTabContentProps> = React.memo(
	function MedicalCardActiveTabContent({
		activeTab,
		state,
		effectiveDisabled,
		handleToothStatusSet,
		handleSurfaceToggle,
	}) {
		if (activeTab === "formula") {
			return (
				<DentalMedicalCardOdontogramTab
					dmftResult={state.dmftResult}
					effectiveDisabled={effectiveDisabled}
					odontogram={state.odontogram}
					setOdontogram={state.setOdontogram}
					selectedTooth={state.selectedTooth}
					setSelectedTooth={state.setSelectedTooth}
					activeStatus={state.activeStatus}
					setActiveStatus={state.setActiveStatus}
					handleToothStatusSet={handleToothStatusSet}
					handleSurfaceToggle={handleSurfaceToggle}
				/>
			);
		}

		if (activeTab === "indices") {
			return (
				<DentalMedicalCardIndicesTab
					cpitn={state.cpitn}
					setCpitn={state.setCpitn}
					hygieneIndexOhiS={state.hygieneIndexOhiS}
					setHygieneIndexOhiS={state.setHygieneIndexOhiS}
					effectiveDisabled={effectiveDisabled}
				/>
			);
		}

		return (
			<DentalMedicalCardAnamnesisTab
				chiefComplaint={state.chiefComplaint}
				setChiefComplaint={state.setChiefComplaint}
				historyOfPresentIllness={state.historyOfPresentIllness}
				setHistoryOfPresentIllness={state.setHistoryOfPresentIllness}
				allergologicalHistory={state.allergologicalHistory}
				setAllergologicalHistory={state.setAllergologicalHistory}
				concomitantDiseases={state.concomitantDiseases}
				setConcomitantDiseases={state.setConcomitantDiseases}
				currentMedications={state.currentMedications}
				setCurrentMedications={state.setCurrentMedications}
				pregnancyLactationStatus={state.pregnancyLactationStatus}
				setPregnancyLactationStatus={state.setPregnancyLactationStatus}
				pastDentalInterventions={state.pastDentalInterventions}
				setPastDentalInterventions={state.setPastDentalInterventions}
				biteType={state.biteType}
				setBiteType={state.setBiteType}
				biteDescription={state.biteDescription}
				setBiteDescription={state.setBiteDescription}
				oralMucosa={state.oralMucosa}
				setOralMucosa={state.setOralMucosa}
				xrayFindingsDescription={state.xrayFindingsDescription}
				setXrayFindingsDescription={state.setXrayFindingsDescription}
				generalTreatmentPlan={state.generalTreatmentPlan}
				setGeneralTreatmentPlan={state.setGeneralTreatmentPlan}
				effectiveDisabled={effectiveDisabled}
				onApplyAnamnesisNorm={state.handleApplyAnamnesisNorm}
			/>
		);
	},
);
