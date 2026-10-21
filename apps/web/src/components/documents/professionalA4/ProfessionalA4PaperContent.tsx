import React from "react";
import { ActSheet } from "./ActSheet";
import { ConsentSheet } from "./ConsentSheet";
import { ContractSheet } from "./ContractSheet";
import { MedicalCardSheet } from "./MedicalCardSheet";
import { PersonalDataSheet } from "./PersonalDataSheet";
import { TreatmentPlanSheet } from "./TreatmentPlanSheet";
import type { ProfessionalA4DocumentTab } from "./types";

export interface ProfessionalA4PaperContentProps {
	activeTab: ProfessionalA4DocumentTab;
	// biome-ignore lint/suspicious/noExplicitAny: polymorphic doc sheets
	contractData?: any;
	// biome-ignore lint/suspicious/noExplicitAny: polymorphic doc sheets
	actData?: any;
	// biome-ignore lint/suspicious/noExplicitAny: polymorphic doc sheets
	treatmentPlanData?: any;
	// biome-ignore lint/suspicious/noExplicitAny: polymorphic doc sheets
	medicalCardData?: any;
	// biome-ignore lint/suspicious/noExplicitAny: polymorphic doc sheets
	effectiveConsentData?: any;
	// biome-ignore lint/suspicious/noExplicitAny: polymorphic doc sheets
	effectivePersonalDataConsent?: any;
	isInformedConsentTab: boolean;
	zoomClass: string;
	// biome-ignore lint/suspicious/noExplicitAny: clinic requisites
	cl: any;
	// biome-ignore lint/suspicious/noExplicitAny: patient requisites
	pt: any;
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
