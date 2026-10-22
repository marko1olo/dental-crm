/**
 * EgiszClinicalTab.tsx
 *
 * Tab 1: Dental Clinical SEMD Protocol Editor (Form 043/u, SEMD 105 / 302 / 303).
 * Interactive FDI Dental Formula (ISO 3950), ICD-10 Diagnoses and 804n Procedures.
 * Mandate 8e: Doctor Autonomy (Zero disabled buttons).
 */

import React from "react";
import { ClinicalDiagnosesAndProcedures } from "./clinical/ClinicalDiagnosesAndProcedures";
import { ClinicalMetaAndAnamnesis } from "./clinical/ClinicalMetaAndAnamnesis";
import type { EgiszClinicalTabProps } from "./clinical/clinicalTabTypes";
import { ClinicalToothFormulaSection } from "./clinical/ClinicalToothFormulaSection";

export type { EgiszClinicalTabProps } from "./clinical/clinicalTabTypes";

export const EgiszClinicalTab: React.FC<EgiszClinicalTabProps> = ({
	semdDocCode,
	onSemdDocCodeChange,
	patient,
	onPatientChange,
	doctor,
	onDoctorChange,
	complaints,
	onComplaintsChange,
	anamnesisMorbi,
	onAnamnesisMorbiChange,
	selectedTooth,
	onSelectTooth,
	toothStates,
	onUpdateToothStatus,
	diagnoses,
	onAddDiagnosis,
	onRemoveDiagnosis,
	procedures,
	onAddProcedure,
	onRemoveProcedure,
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			<ClinicalMetaAndAnamnesis
				semdDocCode={semdDocCode}
				onSemdDocCodeChange={onSemdDocCodeChange}
				patient={patient}
				onPatientChange={onPatientChange}
				doctor={doctor}
				onDoctorChange={onDoctorChange}
				complaints={complaints}
				onComplaintsChange={onComplaintsChange}
				anamnesisMorbi={anamnesisMorbi}
				onAnamnesisMorbiChange={onAnamnesisMorbiChange}
			/>

			<ClinicalToothFormulaSection
				selectedTooth={selectedTooth}
				onSelectTooth={onSelectTooth}
				toothStates={toothStates}
				onUpdateToothStatus={onUpdateToothStatus}
			/>

			<ClinicalDiagnosesAndProcedures
				patientId={patient?.patientId}
				diagnoses={diagnoses}
				onAddDiagnosis={onAddDiagnosis}
				onRemoveDiagnosis={onRemoveDiagnosis}
				procedures={procedures}
				onAddProcedure={onAddProcedure}
				onRemoveProcedure={onRemoveProcedure}
			/>
		</div>
	);
};
