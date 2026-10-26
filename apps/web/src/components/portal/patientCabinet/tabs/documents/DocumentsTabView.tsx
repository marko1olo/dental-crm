import React from "react";
import type {
	PatientPersonalCabinetData,
	PatientStatutoryConsent,
	PatientTaxDeductionCalculation,
} from "../../patientCabinetEngine";
import { DocumentsTaxWidget } from "./DocumentsTaxWidget";
import { DocumentsConsentsSection } from "./DocumentsConsentsSection";
import { DocumentsClinicalDocsSection } from "./DocumentsClinicalDocsSection";
import { DocumentsPrescriptionsSection } from "./DocumentsPrescriptionsSection";
import { DocumentsWarrantiesSection } from "./DocumentsWarrantiesSection";

export interface DocumentsTabProps {
	readonly data: PatientPersonalCabinetData;
	readonly selectedTaxYear: number;
	readonly onSelectTaxYear: (year: number) => void;
	readonly taxDeductionCalc: PatientTaxDeductionCalculation;
	readonly onStartConsentSigning: (consent: PatientStatutoryConsent) => void;
	readonly onOpenTaxCertificateSheet: () => void;
	readonly onDownloadTaxCertificateDirect: () => void;
	readonly onShowToast: (msg: string) => void;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({
	data,
	selectedTaxYear,
	onSelectTaxYear,
	taxDeductionCalc,
	onStartConsentSigning,
	onOpenTaxCertificateSheet,
	onDownloadTaxCertificateDirect,
	onShowToast,
}) => {
	return (
		<div className="pc-tab-content-container" data-testid="pc-documents-tab">
			<DocumentsTaxWidget
				data={data}
				selectedTaxYear={selectedTaxYear}
				onSelectTaxYear={onSelectTaxYear}
				taxDeductionCalc={taxDeductionCalc}
				onOpenTaxCertificateSheet={onOpenTaxCertificateSheet}
				onDownloadTaxCertificateDirect={onDownloadTaxCertificateDirect}
				onShowToast={onShowToast}
			/>
			<DocumentsConsentsSection
				consents={data.consents}
				data={data}
				onStartConsentSigning={onStartConsentSigning}
				onShowToast={onShowToast}
			/>
			<DocumentsClinicalDocsSection
				documents={data.documents}
				data={data}
				onShowToast={onShowToast}
			/>
			<DocumentsPrescriptionsSection
				prescriptions={data.prescriptions}
				data={data}
				onShowToast={onShowToast}
			/>
			<DocumentsWarrantiesSection
				warranties={data.warranties}
			/>
		</div>
	);
};

export default DocumentsTab;
