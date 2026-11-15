import React from "react";
import type {
	A4DocumentActData,
	A4DocumentContractData,
	A4DocumentInformedConsentData,
	A4DocumentMedicalCardData,
	A4DocumentPersonalDataConsentData,
	A4DocumentTreatmentPlanData,
} from "@dental/shared";
import { ActSheet } from "./ActSheet";
import { ConsentSheet } from "./ConsentSheet";
import { ContractSheet } from "./ContractSheet";
import { MedicalCardSheet } from "./MedicalCardSheet";
import { PersonalDataSheet } from "./PersonalDataSheet";
import { TreatmentPlanSheet } from "./TreatmentPlanSheet";
import type { A4ClinicRequisites, A4PatientRequisites } from "./a4ClinicPatientDefaults";
import type { ProfessionalA4DocumentTab } from "./types";

export interface ProfessionalA4PaperContentProps {
	activeTab: ProfessionalA4DocumentTab;
	contractData?: A4DocumentContractData | undefined;
	actData?: A4DocumentActData | undefined;
	treatmentPlanData?: A4DocumentTreatmentPlanData | undefined;
	medicalCardData?: A4DocumentMedicalCardData | undefined;
	effectiveConsentData?: A4DocumentInformedConsentData | undefined;
	effectivePersonalDataConsent?: A4DocumentPersonalDataConsentData | undefined;
	isInformedConsentTab: boolean;
	zoomClass: string;
	cl: A4ClinicRequisites;
	pt: A4PatientRequisites;
	doctor: string;
}

export function ProfessionalA4PaperContent({
	activeTab,
	contractData,
	actData,
	treatmentPlanData,
	medicalCardData,
	effectiveConsentData,
	effectivePersonalDataConsent,
	isInformedConsentTab,
	zoomClass,
	cl,
	pt,
	doctor,
}: ProfessionalA4PaperContentProps): React.JSX.Element {
	return (
		<div className="pro-a4-paper-container">
			{activeTab === "contract" && contractData && (
				<ContractSheet
					zoomClass={zoomClass}
					contractData={contractData}
					cl={cl}
				/>
			)}
			{activeTab === "act" && actData && (
				<ActSheet zoomClass={zoomClass} actData={actData} />
			)}
			{activeTab === "treatment_plan" && treatmentPlanData && (
				<TreatmentPlanSheet
					zoomClass={zoomClass}
					treatmentPlanData={treatmentPlanData}
					cl={cl}
				/>
			)}
			{isInformedConsentTab && (
				<ConsentSheet
					zoomClass={zoomClass}
					effectiveConsentData={effectiveConsentData}
					cl={cl}
				/>
			)}
			{activeTab === "personal_data" && (
				<PersonalDataSheet
					zoomClass={zoomClass}
					effectivePersonalDataConsent={effectivePersonalDataConsent}
					cl={cl}
				/>
			)}
			{activeTab === "medical_card" && medicalCardData && (
				<MedicalCardSheet
					zoomClass={zoomClass}
					medicalCardData={medicalCardData}
					cl={cl}
					pt={pt}
					doctor={doctor}
				/>
			)}
		</div>
	);
}
