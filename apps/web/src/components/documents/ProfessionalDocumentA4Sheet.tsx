import React, { useState } from "react";
import "../../styles/professional-a4-print.css";
import { ProfessionalA4PaperContent } from "./professionalA4/ProfessionalA4PaperContent";
import { ProfessionalA4Toolbar } from "./professionalA4/ProfessionalA4Toolbar";
import { buildA4ClinicRequisites } from "./professionalA4/a4ClinicPatientDefaults";
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

	const cl = buildA4ClinicRequisites(
		contractData?.clinic ||
			medicalCardData?.clinic ||
			actData?.clinic ||
			treatmentPlanData?.clinic,
	);

	const pt = contractData?.patient || medicalCardData?.patient;
	const doctor =
		contractData?.doctorFullName ||
		actData?.doctorFullName ||
		treatmentPlanData?.doctorFullName ||
		medicalCardData?.doctorFullName ||
		cl.directorFullName ||
		"Воронов Алексей Владимирович";

	const effectiveConsentData = rawConsentData || informedConsentData;
	const effectivePersonalDataConsent =
		rawPersonalDataConsent || personalDataConsentData;
	const isInformedConsentTab =
		activeTab === "consent_1051n" || activeTab === "informed_consent";
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
				contractData={contractData}
				actData={actData}
				treatmentPlanData={treatmentPlanData}
				medicalCardData={medicalCardData}
				effectiveConsentData={effectiveConsentData}
				effectivePersonalDataConsent={effectivePersonalDataConsent}
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
