import type { Patient, A4DocumentMedicalCardData } from "@dental/shared";

export interface OutpatientCardPrintModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly patient?: Patient | null;
	readonly doctorFullName?: string | null | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: clinic profile
	readonly clinicProfileDraft?: any;
	readonly medicalCardData?: Partial<A4DocumentMedicalCardData>;
	readonly isClosedOrSigned?: boolean;
	readonly onPrint?: () => void;
	readonly onDownloadPdf?: () => void;
}
