import React, { useState } from "react";
import "../../styles/professional-a4-print.css";
import { ProfessionalA4PaperContent } from "./professionalA4/ProfessionalA4PaperContent";
import { ProfessionalA4Toolbar } from "./professionalA4/ProfessionalA4Toolbar";
import {
	buildA4ClinicRequisites,
	buildA4PatientRequisites,
	buildA4TodayRu,
} from "./professionalA4/a4ClinicPatientDefaults";
import {
	buildA4ConsentData,
	buildA4MedicalCardData,
	buildA4PersonalDataConsent,
} from "./professionalA4/a4ClinicalDocsBuilder";
import { buildA4ActData, buildA4ContractData } from "./professionalA4/a4FinancialDocsBuilder";
import { buildA4TreatmentPlanData } from "./professionalA4/a4TreatmentPlanBuilder";
import type {
	A4ZoomMode,
	ProfessionalDocumentA4SheetProps,
} from "./professionalA4/types";

export * from "./professionalA4/types";

export const ProfessionalDocumentA4Sheet: React.FC<
	ProfessionalDocumentA4SheetProps
> = ({
	activeTab = "contract",
	onTabChange,
	initialZoom = "100%",
	contractData,
	actData,
	treatmentPlanData,
	consentData: rawConsentData,
	informedConsentData,
	personalDataConsent: rawPersonalDataConsent,
	personalDataConsentData,
	medicalCardData,
	onPrint,
	className = "",
}) => {
	const [zoom, setZoom] = useState<A4ZoomMode>(initialZoom);

	const handlePrint = () => {
		if (onPrint) {
			onPrint();
		} else {
			window.print();
		}
	};

	const todayRu = buildA4TodayRu();
	const cl = buildA4ClinicRequisites(
		contractData?.clinic ||
			medicalCardData?.clinic ||
			actData?.clinic ||
			treatmentPlanData?.clinic,
	);

	const pt = buildA4PatientRequisites(contractData?.patient || medicalCardData?.patient);
	const doctor =
		contractData?.doctorFullName ||
		actData?.doctorFullName ||
		treatmentPlanData?.doctorFullName ||
		medicalCardData?.doctorFullName ||
		cl.directorFullName ||
		"______________________";

	const fullContractData = contractData
		? buildA4ContractData(cl, pt, doctor, todayRu, contractData)
		: undefined;
	const fullActData = actData
		? buildA4ActData(
				cl,
				pt,
				doctor,
				todayRu,
				fullContractData?.contractNumber || "Д-1",
				fullContractData?.contractDate || todayRu,
				actData,
		  )
		: undefined;
	const fullTreatmentPlanData = treatmentPlanData
		? buildA4TreatmentPlanData(cl, pt, doctor, todayRu, treatmentPlanData)
		: undefined;
	const fullMedicalCardData = medicalCardData
		? buildA4MedicalCardData(cl, pt, doctor, todayRu, medicalCardData)
		: undefined;

	const effectiveConsentData = rawConsentData || informedConsentData;
	const fullConsentData = effectiveConsentData
		? buildA4ConsentData(
				cl,
				pt,
				doctor,
				todayRu,
				fullContractData?.contractNumber || "Д-1",
				fullContractData?.contractDate || todayRu,
				effectiveConsentData,
		  )
		: undefined;

	const effectivePersonalDataConsent =
		rawPersonalDataConsent || personalDataConsentData;
	const fullPersonalDataConsent = effectivePersonalDataConsent
		? buildA4PersonalDataConsent(cl, pt, todayRu, effectivePersonalDataConsent)
		: undefined;

	const isInformedConsentTab = activeTab === "informed_consent";
	const zoomClass =
		zoom === "80%" ? "zoom-80" : zoom === "fit" ? "zoom-fit" : "zoom-100";

	return (
		<div className={`pro-a4-viewport ${className}`}>
			<ProfessionalA4Toolbar
				activeTab={activeTab}
				onTabChange={onTabChange}
				zoom={zoom}
				setZoom={setZoom}
				handlePrint={handlePrint}
				isInformedConsentTab={isInformedConsentTab}
			/>

			<ProfessionalA4PaperContent
				activeTab={activeTab}
				contractData={fullContractData}
				actData={fullActData}
				treatmentPlanData={fullTreatmentPlanData}
				medicalCardData={fullMedicalCardData}
				effectiveConsentData={fullConsentData}
				effectivePersonalDataConsent={fullPersonalDataConsent}
				isInformedConsentTab={isInformedConsentTab}
				zoomClass={zoomClass}
				cl={cl}
				pt={pt}
				doctor={doctor}
			/>
		</div>
	);
};

ProfessionalDocumentA4Sheet.displayName = "ProfessionalDocumentA4Sheet";
