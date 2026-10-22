/**
 * xmlPreviewTabTypes.ts — Props and types for EgiszXmlPreviewTab
 */

import type {
	EgiszClinicInfo,
	EgiszDentalCdaPayload,
	EgiszDentalSemdCode,
	EgiszDiagnosisItem,
	EgiszDoctorInfo,
	EgiszPatientInfo,
	EgiszProcedureItem,
} from "../../egiszRemdEngine";

export interface EgiszXmlPreviewTabProps {
	readonly generatedXml: string;
	readonly xmlValidation: { readonly tagCount: number };
	readonly onValidateCdaXml: () => void;
	readonly onDownloadXml: () => void;
	readonly onExportCurrentPackageZip: () => void;
	readonly onSendToRegistry: () => void;
	readonly onCopyXml: () => void;
	readonly isSending: boolean;
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
