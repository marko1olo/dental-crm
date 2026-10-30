import React from "react";
import type { A4DocumentMedicalCardData } from "@dental/shared";
import { MedicalCardSheetPage1 } from "./MedicalCardSheetPage1";
import { MedicalCardSheetPage2 } from "./MedicalCardSheetPage2";

export interface MedicalCardSheetProps {
	zoomClass: string;
	medicalCardData: A4DocumentMedicalCardData;
	// biome-ignore lint/suspicious/noExplicitAny: clinic
	cl: any;
	// biome-ignore lint/suspicious/noExplicitAny: patient
	pt: any;
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
