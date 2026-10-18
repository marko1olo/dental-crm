import type { GeneratedDocument, Patient } from "@dental/shared";

export type SignatureModeTab = "canvas" | "sms" | "paper";

export interface DigitalSignatureData {
	signatureSvg: string;
	mode: "simple_electronic_signature";
	signedAt: string;
	recipientFullName: string;
	recipientRole: string;
	pepCode?: string;
	sha256Fingerprint: string;
}

export interface DigitalSignatureTabletModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly document?: GeneratedDocument | null;
	readonly documentsPackageTitle?: string;
	readonly patient?: Patient | null;
	readonly doctorFullName?: string | null;
	readonly clinicName?: string;
	readonly onConfirmSignature: (signatureData: DigitalSignatureData) => Promise<void> | void;
	readonly onPrintArchiveA4?: () => void;
}
