import type { SignaturePoint, SignatureStroke } from "../signaturePadMath.js";

export interface ConsentSigningPanelProps {
	verificationMethod: "tablet_stylus" | "sms_otp" | "paper_physical";
	setVerificationMethod: (method: "tablet_stylus" | "sms_otp" | "paper_physical") => void;
	paperOriginalConfirmed: boolean;
	setPaperOriginalConfirmed: (confirmed: boolean) => void;
	strokes: SignatureStroke[];
	setStrokes: React.Dispatch<React.SetStateAction<SignatureStroke[]>>;
	currentPoints: SignaturePoint[];
	setCurrentPoints: React.Dispatch<React.SetStateAction<SignaturePoint[]>>;
	isDrawing: boolean;
	setIsDrawing: React.Dispatch<React.SetStateAction<boolean>>;
	activeMode: "packages" | "single";
	packageDocsCount: number;
	isSubmitting: boolean;
	onConfirmSign: (forcedMethod?: "tablet_stylus" | "sms_otp" | "paper_physical") => void;
	onPrint: () => void;
	onPrintBlank: () => void;
	onDownloadPdfA: () => void;
	planAndRisksAccepted?: boolean | undefined;
	setPlanAndRisksAccepted?: ((accepted: boolean) => void) | undefined;
	alternativesUnderstood?: boolean | undefined;
	setAlternativesUnderstood?: ((understood: boolean) => void) | undefined;
	isMobile?: boolean | undefined;
	patientPhone?: string | null | undefined;
	smsOtpCode?: string | undefined;
	setSmsOtpCode?: ((code: string) => void) | undefined;
	paperScanFile?: File | null | undefined;
	setPaperScanFile?: ((file: File | null) => void) | undefined;
}
