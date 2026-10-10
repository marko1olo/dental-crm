import { useEffect, useMemo, useState } from "react";
import {
	type ConsentPackageKey,
	type ConsentSubstitutionContext,
	type ConsentTemplate,
	type ConsentTemplateKey,
	getAllConsentPackages,
	getAllConsentTemplates,
	getBlankConsentSubstitutionContext,
	getConsentPackage,
	getConsentTemplate,
	printBlankConsentPackage,
	printFilledConsentPackage,
	printBlankConsentTemplate,
	printFilledConsentTemplate,
	renderConsentTemplate,
} from "../consentTemplates.js";
import { showToast } from "../../GlobalToast.js";
import {
	generateConsentIntegrityHash,
	generatePaperSignatureSvg,
	PAPER_SIGNATURE_FALLBACK_PNG,
	type SignatureVectorData,
	type SignatureStroke,
	type SignaturePoint,
	calculateBoundingBox,
	exportSignatureToSvg,
	generatePdfA1bDocument,
	downloadConsentPdfA,
} from "../signaturePadMath.js";
import { generateSmsPepSignatureSvg } from "../consentIntegrityHash.js";
import {
	buildPatientConsentSummary,
	cleanPrintableConsentText,
	detectConsentScopeMismatch,
	sanitizeConsentContext,
	type SignedConsentPayload,
	type ConsentScopeMismatchResult,
} from "../consentSummaryHelper.js";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { executeSigning } from "./consentSigningExecutor.js";
import type {
	InformedConsentModalProps,
	VerificationMethod,
} from "./types.js";

export function useInformedConsent({
	isOpen,
	onClose,
	initialMode = "packages",
	initialPackageKey = "PACKAGE_PRIMARY_VISIT",
	initialTemplateKey = "CONSENT_THERAPY",
	initialVerificationMethod = "paper_physical",
	patient,
	doctorName,
	doctorSpecialty,
	clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»",
	clinicLegalName = "ООО «Стоматологическая клиника ДЕНТЕ»",
	clinicAddress,
	clinicOgrn,
	clinicPhone = "",
	licenseNumber,
	diagnosisIcd,
	toothNumbers,
	isLocked,
	isDraft,
	isSigned,
	status,
	watermarkText,
	onConsentSigned,
	onPackageSigned,
	onConsentConfirmed,
}: InformedConsentModalProps) {
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

	// Мобильный адаптив и сенсорная эргономика (Apple HIG 390x844)
	const [isMobile, setIsMobile] = useState<boolean>(false);
	const [planAndRisksAccepted, setPlanAndRisksAccepted] = useState<boolean>(true);
	const [alternativesUnderstood, setAlternativesUnderstood] = useState<boolean>(true);
	const [isDocumentTextExpanded, setIsDocumentTextExpanded] = useState<boolean>(false);
	const [smsOtpCode, setSmsOtpCode] = useState<string>("");

	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(typeof window !== "undefined" && window.innerWidth <= 768);
		};
		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	const isClosedOrSigned = !isDraft && Boolean(
		isSigned ||
		isLocked ||
		status === "signed" ||
		status === "closed" ||
		status === "completed" ||
		status === "approved" ||
		status === "issued"
	);
	const effectiveWatermark =
		watermarkText ||
		(isClosedOrSigned ? "ПОДПИСАНО ВРАЧОМ / ПАЦИЕНТОМ" : "ЧЕРНОВИК");
	const stampColor = effectiveWatermark.includes("ПОДПИСАНО")
		? "var(--ok-fg, #059669)"
		: "var(--muted, #64748b)";

	// Редактирование контекста плейсхолдеров
	const [customDiagnosis, setCustomDiagnosis] = useState<string>(diagnosisIcd || "");
	const [customTeeth, setCustomTeeth] = useState<string>(toothNumbers || "");

	const [copiedHash, setCopiedHash] = useState<boolean>(false);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	// Синхронизация при открытии
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
			// На смартфонах и планшетах у кресла по умолчанию включается удобная роспись пальцем
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

	// Закрытие по Escape
	useEffect(() => {
		if (!isOpen) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isOpen, onClose]);

	// Контекст подстановки
	const substitutionContext = useMemo<ConsentSubstitutionContext>(() => {
		const isDemo = isDemoShowcaseMode();
		return sanitizeConsentContext({
			patientName: patient?.fullName || null,
			birthDate: patient?.birthDate || null,
			passport: patient?.passport || null,
			doctorName: doctorName || (doctorSpecialty ? `Врач-стоматолог (${doctorSpecialty})` : null),
			clinicName: clinicName || clinicLegalName,
			clinicLegalName: clinicLegalName || clinicName,
			clinicAddress: clinicAddress || (isDemo ? "г. Москва, ул. Клиническая, д. 10" : "«________________________________________»"),
			clinicOgrn: clinicOgrn || (isDemo ? "1217700123456" : "«________________»"),
			licenseNumber: licenseNumber || (isDemo ? "ЛО41-01137-77/00123456" : "«________________________________________»"),
			diagnosisIcd: customDiagnosis || diagnosisIcd || (isDemo ? "K02.1 Кариес дентина" : ""),
			toothNumbers: customTeeth || toothNumbers || (isDemo ? "1.6, 1.7" : ""),
			date: new Date().toLocaleDateString("ru-RU"),
			snils: patient?.snils || null,
			phone: patient?.phone || null,
		});
	}, [
		patient,
		doctorName,
		doctorSpecialty,
		clinicName,
		clinicLegalName,
		clinicAddress,
		clinicOgrn,
		licenseNumber,
		customDiagnosis,
		diagnosisIcd,
		customTeeth,
		toothNumbers,
	]);

	// Контекст чистого бланка для печати со строками «________»
	const printBlankContext = useMemo<ConsentSubstitutionContext>(() => {
		return getBlankConsentSubstitutionContext({
			clinicName: clinicName ?? null,
			clinicLegalName: clinicLegalName ?? null,
			clinicAddress: clinicAddress ?? null,
			clinicOgrn: clinicOgrn ?? null,
			licenseNumber: licenseNumber ?? null,
		});
	}, [clinicName, clinicLegalName, clinicAddress, clinicOgrn, licenseNumber]);

	const effectiveContext = isPrintingBlank ? printBlankContext : substitutionContext;

	const allPackages = useMemo(() => getAllConsentPackages(), []);
	const allTemplates = useMemo(() => getAllConsentTemplates(true), []);
	const currentPackage = useMemo(() => getConsentPackage(activePackageKey), [activePackageKey]);

	const activeDocKey = useMemo<ConsentTemplateKey>(() => {
		if (activeMode === "packages") {
			if (previewTemplateKey && currentPackage.templateKeys.includes(previewTemplateKey)) {
				return previewTemplateKey;
			}
			return currentPackage.templateKeys[0] || "CONSENT_PERSONAL_DATA";
		}
		return activeKey;
	}, [activeMode, previewTemplateKey, currentPackage, activeKey]);

	const currentTemplate = useMemo<ConsentTemplate>(() => {
		return getConsentTemplate(activeDocKey);
	}, [activeDocKey]);

	const rendered = useMemo(() => {
		return renderConsentTemplate(currentTemplate, effectiveContext);
	}, [currentTemplate, effectiveContext]);

	// Детекция Consent Scope Mismatch (непокрытые инвазивные процедуры)
	const scopeMismatch = useMemo<ConsentScopeMismatchResult>(() => {
		const coveredKeys = activeMode === "packages" ? currentPackage.templateKeys : [activeDocKey];
		return detectConsentScopeMismatch({
			signedConsentKeys: coveredKeys,
			treatmentPlanText: customDiagnosis || diagnosisIcd,
			diagnosisText: customDiagnosis || diagnosisIcd,
			additionalProcedures: customTeeth || toothNumbers ? [customTeeth || toothNumbers || ""] : [],
		});
	}, [activeMode, currentPackage.templateKeys, activeDocKey, customDiagnosis, diagnosisIcd, customTeeth, toothNumbers]);

	// Расчет криптографического отпечатка SHA-256
	const integrityRecord = useMemo(() => {
		return generateConsentIntegrityHash({
			documentText: rendered.fullTextContent,
			patientInfo: {
				name: substitutionContext.patientName,
				passportOrBirth: substitutionContext.passport || substitutionContext.birthDate,
				phone: substitutionContext.phone,
			},
			timestamp: Date.now(),
			strokes: verificationMethod === "tablet_stylus" ? strokes : [],
			verificationMethod: verificationMethod,
			smsOtpCode: null,
		});
	}, [rendered.fullTextContent, substitutionContext, strokes, verificationMethod]);

	// Валидация готовности к подписанию для блокировки CTA кнопок
	const isSigningReady = useMemo(() => {
		if (verificationMethod === "tablet_stylus") {
			return strokes.length > 0 || currentPoints.length > 0;
		}
		if (verificationMethod === "sms_otp") {
			return Boolean(smsOtpCode && smsOtpCode.trim().length === 4);
		}
		if (verificationMethod === "paper_physical") {
			return Boolean(paperOriginalConfirmed || paperScanFile);
		}
		return false;
	}, [verificationMethod, strokes.length, currentPoints.length, smsOtpCode, paperOriginalConfirmed, paperScanFile]);

	// 1-клик генерация и скачивание архивного документа ISO 19005-1 (PDF/A-1b)
	const handleDownloadPdfA = () => {
		try {
			let sigSvg = "";
			if (verificationMethod === "tablet_stylus" && strokes.length > 0) {
				sigSvg = exportSignatureToSvg(strokes, 400, 140, { strokeColor: "#0f172a" });
			} else if (verificationMethod === "sms_otp") {
				sigSvg = generateSmsPepSignatureSvg({
					patientFullName: effectiveContext.patientName ? effectiveContext.patientName : undefined,
					phoneMasked: (substitutionContext.phone || patient?.phone) ? String(substitutionContext.phone || patient?.phone) : undefined,
					timestampIso: new Date().toISOString(),
					integrityHash: integrityRecord.hash,
					clinicName: effectiveContext.clinicName || (isDemoShowcaseMode() ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»"),
				});
			} else {
				sigSvg = generatePaperSignatureSvg({
					date: effectiveContext.date || new Date().toLocaleDateString("ru-RU"),
					clinicName: effectiveContext.clinicName || (isDemoShowcaseMode() ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»"),
					patientFullName: effectiveContext.patientName ? effectiveContext.patientName : undefined,
					scanFileName: paperScanFile?.name || null,
					scanFileSizeBytes: paperScanFile?.size || null,
				});
			}

			const pdfBytes = generatePdfA1bDocument({
				clinicName: effectiveContext.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»",
				clinicAddress: effectiveContext.clinicAddress || undefined,
				clinicPhone: (effectiveContext.phone || clinicPhone) || undefined,
				patientName: effectiveContext.patientName || "Пациент",
				patientBirthDate: effectiveContext.birthDate || undefined,
				medicalCardNumber: patient?.cardNumber || undefined,
				doctorName: effectiveContext.doctorName || "Лечащий врач",
				documentTitle: cleanPrintableConsentText(rendered.title),
				documentCode: currentTemplate.code,
				documentText: cleanPrintableConsentText(rendered.fullTextContent),
				signedAtIso: new Date().toISOString(),
				integrityHash: integrityRecord.hash,
				strokes: verificationMethod === "tablet_stylus" ? strokes : undefined,
				signatureSvg: sigSvg,
				verificationMethod: verificationMethod,
			});

			const safeCode = (currentTemplate.code || "IDS").replace(/[^a-zA-Z0-9_-]/g, "_");
			const safePt = (effectiveContext.patientName || "patient").replace(/[^a-zA-Z0-9а-яА-Я_-]/g, "_");
			const filename = `Consent_${safeCode}_${safePt}.pdf`;

			downloadConsentPdfA(filename, pdfBytes);
			showToast("Архивный документ ISO 19005-1 (PDF/A-1b) успешно сохранён", "success");
		} catch (err) {
			console.error("Failed to generate PDF/A:", err);
			showToast("Не удалось сформировать PDF/A документ", "error");
		}
	};

	// Копирование хеша
	const handleCopyHash = () => {
		if (typeof navigator !== "undefined" && navigator.clipboard) {
			navigator.clipboard.writeText(integrityRecord.hash);
			setCopiedHash(true);
			setTimeout(() => setCopiedHash(false), 2000);
		}
	};

	// 1-клик копирование выжимки ИДС и памятки рисков для пациента в WhatsApp / Telegram
	const handleCopyPatientSummary = (): string => {
		const summaryText = buildPatientConsentSummary({
			activeMode,
			patientName: patient?.fullName || substitutionContext.patientName,
			doctorName:
				doctorName ||
				(doctorSpecialty ? `Врач-стоматолог (${doctorSpecialty})` : null) ||
				effectiveContext.doctorName,
			doctorSpecialty,
			clinicName,
			clinicLegalName,
			clinicPhone,
			toothNumbers: customTeeth || toothNumbers,
			customDiagnosis,
			diagnosisIcd,
			packageKey: activePackageKey,
			templateKey: activeDocKey,
			integrityHash: integrityRecord.hash,
		});

		if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
			navigator.clipboard.writeText(summaryText).catch(() => {});
		}

		showToast("Выжимка ИДС и памятка скопированы в буфер обмена для отправки пациенту", "success");
		return summaryText;
	};

	// Печать документа А4 (заполненный бланк)
	const handlePrint = () => {
		if (activeMode === "packages") {
			printFilledConsentPackage(activePackageKey, effectiveContext, {
				isSigned: isClosedOrSigned,
				watermarkText: effectiveWatermark,
			});
		} else {
			printFilledConsentTemplate(activeDocKey, effectiveContext, {
				isSigned: isClosedOrSigned,
				watermarkText: effectiveWatermark,
			});
		}
	};

	// Печать чистого бланка ИДС со строками «________» для ручного заполнения пациентом до приема без 403-ошибок
	const handlePrintBlank = () => {
		if (activeMode === "packages") {
			printBlankConsentPackage(activePackageKey, {
				clinicName: clinicName ?? null,
				clinicLegalName: clinicLegalName ?? null,
				clinicAddress: clinicAddress ?? null,
				clinicOgrn: clinicOgrn ?? null,
				licenseNumber: licenseNumber ?? null,
			});
		} else {
			printBlankConsentTemplate(activeDocKey, {
				clinicName: clinicName ?? null,
				clinicLegalName: clinicLegalName ?? null,
				clinicAddress: clinicAddress ?? null,
				clinicOgrn: clinicOgrn ?? null,
				licenseNumber: licenseNumber ?? null,
			});
		}
	};

	// Подписание и подтверждение в 1 клик (Мандаты 8e, 8i, 8k, 8n)
	const handleConfirmSign = (forcedMethod?: VerificationMethod) => {
		if (isSubmitting) return;
		setIsSubmitting(true);
		try {
			executeSigning({
				effectiveMethod: forcedMethod || verificationMethod,
				strokes,
				currentPoints,
				smsOtpCode,
				paperScanFile,
				substitutionContext,
				effectiveContext,
				patient,
				integrityRecord,
				activeMode,
				currentPackage,
				activeDocKey,
				currentTemplate,
				rendered,
				onConsentSigned,
				onPackageSigned,
				onConsentConfirmed,
				onClose,
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return {
		activeMode,
		setActiveMode,
		activePackageKey,
		setActivePackageKey,
		activeKey,
		setActiveKey,
		activeDocKey,
		previewTemplateKey,
		setPreviewTemplateKey,
		paperOriginalConfirmed,
		setPaperOriginalConfirmed,
		paperScanFile,
		setPaperScanFile,
		isPrintingBlank,
		setIsPrintingBlank,
		verificationMethod,
		setVerificationMethod,
		strokes,
		setStrokes,
		currentPoints,
		setCurrentPoints,
		isDrawing,
		setIsDrawing,
		isMobile,
		planAndRisksAccepted,
		setPlanAndRisksAccepted,
		alternativesUnderstood,
		setAlternativesUnderstood,
		isDocumentTextExpanded,
		setIsDocumentTextExpanded,
		smsOtpCode,
		setSmsOtpCode,
		customDiagnosis,
		setCustomDiagnosis,
		customTeeth,
		setCustomTeeth,
		copiedHash,
		isSubmitting,
		isClosedOrSigned,
		effectiveWatermark,
		stampColor,
		substitutionContext,
		effectiveContext,
		allPackages,
		allTemplates,
		currentPackage,
		currentTemplate,
		rendered,
		scopeMismatch,
		integrityRecord,
		isSigningReady,
		handleDownloadPdfA,
		handleCopyHash,
		handleCopyPatientSummary,
		handlePrint,
		handlePrintBlank,
		handleConfirmSign,
	};
}
