import { useEffect, useState } from "react";
import type {
	ConsentPackageKey,
	ConsentTemplateKey,
	SignatureStroke,
	SignaturePoint,
	InformedConsentModalProps,
	VerificationMethod,
} from "./types.js";

export function useConsentModalState(props: InformedConsentModalProps) {
	const {
		isOpen,
		onClose,
		initialMode = "packages",
		initialPackageKey = "PACKAGE_PRIMARY_VISIT",
		initialTemplateKey = "CONSENT_THERAPY",
		initialVerificationMethod = "paper_physical",
		diagnosisIcd,
		toothNumbers,
	} = props;

	const [activeMode, setActiveMode] = useState<"packages" | "single">(initialMode);
	const [activePackageKey, setActivePackageKey] = useState<ConsentPackageKey>(initialPackageKey);
	const [activeKey, setActiveKey] = useState<ConsentTemplateKey>(initialTemplateKey);
	const [previewTemplateKey, setPreviewTemplateKey] = useState<ConsentTemplateKey | null>(null);
	const [paperOriginalConfirmed, setPaperOriginalConfirmed] = useState<boolean>(false);
	const [paperScanFile, setPaperScanFile] = useState<File | null>(null);
	const [isPrintingBlank, setIsPrintingBlank] = useState<boolean>(false);
	const [verificationMethod, setVerificationMethod] = useState<VerificationMethod>(
		initialVerificationMethod || "paper_physical"
	);
	const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
	const [currentPoints, setCurrentPoints] = useState<SignaturePoint[]>([]);
	const [isDrawing, setIsDrawing] = useState<boolean>(false);

	const [isMobile, setIsMobile] = useState<boolean>(false);
	const [planAndRisksAccepted, setPlanAndRisksAccepted] = useState<boolean>(true);
	const [alternativesUnderstood, setAlternativesUnderstood] = useState<boolean>(true);
	const [isDocumentTextExpanded, setIsDocumentTextExpanded] = useState<boolean>(false);
	const [smsOtpCode, setSmsOtpCode] = useState<string>("");
	const [customDiagnosis, setCustomDiagnosis] = useState<string>(diagnosisIcd || "");
	const [customTeeth, setCustomTeeth] = useState<string>(toothNumbers || "");
	const [copiedHash, setCopiedHash] = useState<boolean>(false);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(typeof window !== "undefined" && window.innerWidth <= 768);
		};
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	useEffect(() => {
		if (isOpen) {
			const mobileViewport = typeof window !== "undefined" && window.innerWidth <= 768;
			setActiveMode(initialMode || "packages");
			setActivePackageKey(initialPackageKey || "PACKAGE_PRIMARY_VISIT");
			setActiveKey(initialTemplateKey);
			setPreviewTemplateKey(null);
			setPaperOriginalConfirmed(false);
			setPaperScanFile(null);
			setIsPrintingBlank(false);
			setCustomDiagnosis(diagnosisIcd || "");
			setCustomTeeth(toothNumbers || "");
			setVerificationMethod(initialVerificationMethod || (mobileViewport ? "tablet_stylus" : "paper_physical"));
			setStrokes([]);
			setCurrentPoints([]);
			setIsDrawing(false);
			setPlanAndRisksAccepted(true);
			setAlternativesUnderstood(true);
			setIsDocumentTextExpanded(false);
			setSmsOtpCode("");
		}
	}, [isOpen, initialMode, initialPackageKey, initialTemplateKey, initialVerificationMethod, diagnosisIcd, toothNumbers]);

	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	return {
		activeMode, setActiveMode,
		activePackageKey, setActivePackageKey,
		activeKey, setActiveKey,
		previewTemplateKey, setPreviewTemplateKey,
		paperOriginalConfirmed, setPaperOriginalConfirmed,
		paperScanFile, setPaperScanFile,
		isPrintingBlank, setIsPrintingBlank,
		verificationMethod, setVerificationMethod,
		strokes, setStrokes,
		currentPoints, setCurrentPoints,
		isDrawing, setIsDrawing,
		isMobile,
		planAndRisksAccepted, setPlanAndRisksAccepted,
		alternativesUnderstood, setAlternativesUnderstood,
		isDocumentTextExpanded, setIsDocumentTextExpanded,
		smsOtpCode, setSmsOtpCode,
		customDiagnosis, setCustomDiagnosis,
		customTeeth, setCustomTeeth,
		copiedHash, setCopiedHash,
		isSubmitting, setIsSubmitting,
	};
}
