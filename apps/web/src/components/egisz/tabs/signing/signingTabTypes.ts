/**
 * signingTabTypes.ts — Props and types for EgiszSigningTab
 */

import type React from "react";
import type { CertificateInfo } from "../../../../lib/cryptopro";
import type { EgiszClinicInfo, EgiszDoctorInfo, GostSignatureInfo } from "../../egiszRemdEngine";

export interface EgiszSigningTabProps {
	readonly signaturePreviewMode: "print" | "xml";
	readonly onSignaturePreviewModeChange: (mode: "print" | "xml") => void;
	readonly selectedCert: CertificateInfo | null;
	readonly onSelectCert: (cert: CertificateInfo | null) => void;
	readonly availableCerts: readonly CertificateInfo[];
	readonly isSigning: boolean;
	readonly isSending: boolean;
	readonly isCheckingCerts: boolean;
	readonly doctorSig: GostSignatureInfo | null;
	readonly moSig: GostSignatureInfo | null;
	readonly onSignDocument: () => void;
	readonly onSignMoDocument: () => void;
	readonly onSignBothInOneClick?: () => void;
	readonly onSendToRegistry: () => void;
	readonly onQueueDeferred: () => void;
	readonly onUploadDetachedSig: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly onUploadDetachedMoSig: (e: React.ChangeEvent<HTMLInputElement>) => void;
	readonly onRefreshCerts: () => void;
	readonly onPrint: () => void;
	readonly onDownloadXml: () => void;
	readonly onValidateCdaXml: () => void;
	readonly doctor: EgiszDoctorInfo;
	readonly clinic: EgiszClinicInfo;
	readonly generatedXml: string;
	readonly form043uHtml: string;
}
