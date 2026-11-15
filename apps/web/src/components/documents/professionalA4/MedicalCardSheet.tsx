import React from "react";
import type { A4DocumentMedicalCardData } from "@dental/shared";
import { MedicalCardSheetPage1 } from "./MedicalCardSheetPage1";
import { MedicalCardSheetPage2 } from "./MedicalCardSheetPage2";
import type { A4ClinicRequisites, A4PatientRequisites } from "./a4ClinicPatientDefaults";

export interface MedicalCardSheetProps {
	zoomClass: string;
	medicalCardData: A4DocumentMedicalCardData;
	cl: A4ClinicRequisites;
	pt: A4PatientRequisites;
	doctor: string;
}

export const MedicalCardSheet: React.FC<MedicalCardSheetProps> = ({
	medicalCardData,
}) => {
	return (
		<div className="pro-a4-sheet-stack" data-testid="a4-medical-card-content">
			<MedicalCardSheetPage1 medicalCardData={medicalCardData} />
			<MedicalCardSheetPage2 medicalCardData={medicalCardData} />
		</div>
	);
};
