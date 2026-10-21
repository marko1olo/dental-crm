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
	readonly document?: GeneratedDocument | null | undefined;
	readonly documentsPackageTitle?: string | undefined;
	readonly patient?: Patient | null | undefined;
	readonly doctorFullName?: string | null | undefined;
	readonly clinicName?: string | undefined;
	readonly onConfirmSignature: (signatureData: DigitalSignatureData) => Promise<void> | void;
	readonly onPrintArchiveA4?: (() => void) | undefined;
}
