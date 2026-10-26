import type { DocumentKind, GeneratedDocument, Patient, StaffMember } from "@dental/shared";
import type { ClinicProfileDraft } from "../../../../AppHelpers";

export interface DocumentHeaderSectionProps {
	activePatient?: Patient | null | undefined;
	activeDoctor?: StaffMember | null | undefined;
	clinicProfileDraft?: ClinicProfileDraft | undefined;
	typedActiveDocuments: GeneratedDocument[];
	patientIssuedDocsCount: number;
	patientDraftDocsCount: number;
	activeUsableDocuments?: GeneratedDocument[] | undefined;
	latestDocumentOpenGuidanceId: string;
	handleOpenLatestDocument: () => void;
	setIsAutoclaveLogOpen?: ((open: boolean) => void) | undefined;
	handleDirectPrintPrimaryIntake: () => void;
	setIsPrimaryIntakeOpen: (open: boolean) => void;
	setIsSurgicalPackageOpen: (open: boolean) => void;
	setIsClinicalVisitOpen: (open: boolean) => void;
	setIsTaxAccountingOpen: (open: boolean) => void;
	setIsSanpinRegistryOpen: (open: boolean) => void;
	setIsSickLeaveElnOpen?: ((open: boolean) => void) | undefined;
	setIsA4PrintPreviewOpen?: ((open: boolean) => void) | undefined;
	onSelectDocumentKind?: ((kind: DocumentKind) => void) | undefined;
}
