import React from "react";
import {
	type ClinicalTabType,
	type ToothClinicalProtocolService,
	type ToothClinicalProtocol,
	TOOTH_CLINICAL_PROTOCOLS,
	type VisitClinicalToothTabsProps,
	useClinicalToothTabsLogic,
	ToothDiagnosisTab,
	ToothTherapyTab,
	ToothEndoTab,
	ToothSurgeryTab,
	ToothAssignedServicesSection,
} from "./clinicalToothTabs";

export type {
	ClinicalTabType,
	ToothClinicalProtocolService,
	ToothClinicalProtocol,
	VisitClinicalToothTabsProps,
};
export { TOOTH_CLINICAL_PROTOCOLS };

export function VisitClinicalToothTabs({
	activeTab,
	selectedToothForMenu,
	code,
	state,
	materialCategory,
	setMaterialCategory,
	selectedSurfaces,
	handleSelectDiagnosis,
	appendToEMKField,
	closeClinicalModal,
	setEndoModalToothNumber,
	setEndoModalToothState,
	setIsEndoModalOpen,
	setLabOrderModalToothNumber,
	setIsLabOrderModalOpen,
	visitWarnings,
	onAddServiceToTooth,
}: VisitClinicalToothTabsProps) {
	const {
		completedServices,
		removeCompletedService,
		toothServices,
		toothTotalRub,
		selectedProtocolKey,
		setSelectedProtocolKey,
		handleAddClinicalProtocol,
		handleAdd804nService,
	} = useClinicalToothTabsLogic({
		code,
		handleSelectDiagnosis,
		appendToEMKField,
		onAddServiceToTooth,
	});

	return (
		<div className="_ccm-body-pane">
			{activeTab === "diagnosis" && (
				<ToothDiagnosisTab
					code={code}
					state={state}
					selectedSurfaces={selectedSurfaces}
					visitWarnings={visitWarnings}
					selectedProtocolKey={selectedProtocolKey}
					setSelectedProtocolKey={setSelectedProtocolKey}
					handleSelectDiagnosis={handleSelectDiagnosis}
					handleAddClinicalProtocol={handleAddClinicalProtocol}
					handleAdd804nService={handleAdd804nService}
					appendToEMKField={appendToEMKField}
				/>
			)}
			{activeTab === "therapy" && (
				<ToothTherapyTab
					code={code}
					state={state}
					materialCategory={materialCategory}
					setMaterialCategory={setMaterialCategory}
					selectedSurfaces={selectedSurfaces}
					handleSelectDiagnosis={handleSelectDiagnosis}
					handleAddClinicalProtocol={handleAddClinicalProtocol}
					handleAdd804nService={handleAdd804nService}
					appendToEMKField={appendToEMKField}
					setEndoModalToothNumber={setEndoModalToothNumber}
					setEndoModalToothState={setEndoModalToothState}
					setIsEndoModalOpen={setIsEndoModalOpen}
				/>
			)}
			{activeTab === "endo" && (
				<ToothEndoTab
					code={code}
					state={state}
					handleSelectDiagnosis={handleSelectDiagnosis}
					handleAddClinicalProtocol={handleAddClinicalProtocol}
					handleAdd804nService={handleAdd804nService}
					appendToEMKField={appendToEMKField}
					setEndoModalToothNumber={setEndoModalToothNumber}
					setEndoModalToothState={setEndoModalToothState}
					setIsEndoModalOpen={setIsEndoModalOpen}
				/>
			)}
			{activeTab === "surgery" && (
				<ToothSurgeryTab
					selectedToothForMenu={selectedToothForMenu}
					visitWarnings={visitWarnings}
					handleSelectDiagnosis={handleSelectDiagnosis}
					handleAddClinicalProtocol={handleAddClinicalProtocol}
					handleAdd804nService={handleAdd804nService}
					closeClinicalModal={closeClinicalModal}
					setLabOrderModalToothNumber={setLabOrderModalToothNumber}
					setIsLabOrderModalOpen={setIsLabOrderModalOpen}
				/>
			)}
			<ToothAssignedServicesSection
				code={code}
				toothServices={toothServices}
				toothTotalRub={toothTotalRub}
				completedServices={completedServices || []}
				removeCompletedService={removeCompletedService}
			/>
		</div>
	);
}
