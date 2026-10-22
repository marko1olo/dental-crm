/**
 * XmlStructureSectionsTree.tsx — Composes header and clinical collapsible sections
 */

import React from "react";
import type {
	EgiszClinicInfo,
	EgiszDentalCdaPayload,
	EgiszDentalSemdCode,
	EgiszDiagnosisItem,
	EgiszDoctorInfo,
	EgiszPatientInfo,
	EgiszProcedureItem,
} from "../../egiszRemdEngine";
import { XmlClinicalContentSections } from "./XmlClinicalContentSections";
import { XmlHeaderParticipantsSections } from "./XmlHeaderParticipantsSections";

export interface XmlStructureSectionsTreeProps {
	readonly collapsedSections: Record<string, boolean>;
	readonly onToggleSection: (sectionKey: string) => void;
	readonly semdDocCode: EgiszDentalSemdCode;
	readonly clinic: EgiszClinicInfo;
	readonly doctor: EgiszDoctorInfo;
	readonly patient: EgiszPatientInfo;
	readonly semdPayload: EgiszDentalCdaPayload;
	readonly diagnoses: readonly EgiszDiagnosisItem[];
	readonly procedures: readonly EgiszProcedureItem[];
}

export const XmlStructureSectionsTree: React.FC<XmlStructureSectionsTreeProps> = ({
	collapsedSections,
	onToggleSection,
	semdDocCode,
	clinic,
	doctor,
	patient,
	semdPayload,
	diagnoses,
	procedures,
}) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
			<XmlHeaderParticipantsSections
				collapsedSections={collapsedSections}
				onToggleSection={onToggleSection}
				semdDocCode={semdDocCode}
				clinic={clinic}
				doctor={doctor}
				patient={patient}
				semdPayload={semdPayload}
			/>

			<XmlClinicalContentSections
				collapsedSections={collapsedSections}
				onToggleSection={onToggleSection}
				diagnoses={diagnoses}
				procedures={procedures}
			/>
		</div>
	);
};
