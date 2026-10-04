import {
	AlertTriangle,
	Check,
	ChevronDown,
	ChevronUp,
	Copy,
	FileText,
	Lock,
	ShieldCheck,
	X,
	Zap,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
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
	PACKAGE_SHORT_TITLES,
	printBlankConsentPackage,
	printFilledConsentPackage,
	printBlankConsentTemplate,
	printFilledConsentTemplate,
	renderConsentTemplate,
	TEMPLATE_SHORT_TITLES,
} from "./consentTemplates.js";
import "./informedConsent.css";
import { showToast } from "../GlobalToast.js";
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
} from "./signaturePadMath.js";
import { generateSmsPepSignatureSvg } from "./consentIntegrityHash.js";
import {
	buildPatientConsentSummary,
	cleanPrintableConsentText,
	detectConsentScopeMismatch,
	sanitizeConsentContext,
	type PatientConsentSummaryParams,
	type SignedConsentPayload,
	type ConsentScopeMismatchResult,
} from "./consentSummaryHelper.js";
import { ConsentDocumentSheet } from "./ConsentDocumentSheet.js";
import { ConsentSigningPanel } from "./ConsentSigningPanel.js";
import { ConsentModalFooter } from "./ConsentModalFooter.js";
import { ConsentToolbarAndBanner } from "./ConsentToolbarAndBanner.js";
import { isDemoShowcaseMode } from "../../lib/demoMode.js";

export { PACKAGE_SHORT_TITLES, TEMPLATE_SHORT_TITLES };
export {
	buildPatientConsentSummary,
	type PatientConsentSummaryParams,
	type SignedConsentPayload,
};

export interface InformedConsentModalProps {
	isOpen: boolean;
	onClose: () => void;
	initialMode?: "packages" | "single";
	initialPackageKey?: ConsentPackageKey;
	initialTemplateKey?: ConsentTemplateKey;
	initialVerificationMethod?: "tablet_stylus" | "sms_otp" | "paper_physical";
	patient?: {
		fullName?: string | null | undefined;
		birthDate?: string | null | undefined;
		passport?: string | null | undefined;
		phone?: string | null | undefined;
		snils?: string | null | undefined;
		address?: string | null | undefined;
		cardNumber?: string | null | undefined;
	} | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	clinicName?: string | null | undefined;
	clinicLegalName?: string | null | undefined;
	clinicAddress?: string | null | undefined;
	clinicOgrn?: string | null | undefined;
	clinicPhone?: string | null | undefined;
	licenseNumber?: string | null | undefined;
	diagnosisIcd?: string | null | undefined;
	toothNumbers?: string | null | undefined;
	isLocked?: boolean | undefined;
	isDraft?: boolean | undefined;
	isSigned?: boolean | undefined;
	status?: string | undefined;
	watermarkText?: string | undefined;
	onConsentSigned?: (payload: SignedConsentPayload) => void;
	onPackageSigned?: (payloads: SignedConsentPayload[]) => void;
	onConsentConfirmed?: (payload: {
		consentType: string;
		intervention: string;
		toothOrArea: string;
		confirmedAt: string;
		integrityHash?: string;
	}) => void;
}

/**
 * InformedConsentModal
 *
 * Чистая Print-First консоль информированных добровольных согласий (ИДС)
 * по Федеральному закону № 323-ФЗ ст. 20 и Приказу Минздрава РФ № 1051н.
 *
 * В амбулаторной стоматологии (Мандаты 8e, 8i, 8k, 8n) согласия строго
 * РАСПЕЧАТЫВАЮТСЯ НА БУМАГЕ («ТОК ПЕЧАТЬ»), подписываются шариковой ручкой
 * и подшиваются в медицинскую карту пациента формы № 043/у на 25 лет.
 */
export const InformedConsentModal: React.FC<InformedConsentModalProps> = ({
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
}) => {
	const [activeMode, setActiveMode] = useState<"packages" | "single">(initialMode);
	const [activePackageKey, setActivePackageKey] = useState<ConsentPackageKey>(initialPackageKey);
	const [activeKey, setActiveKey] = useState<ConsentTemplateKey>(initialTemplateKey);
	const [previewTemplateKey, setPreviewTemplateKey] = useState<ConsentTemplateKey | null>(null);
	const [paperOriginalConfirmed, setPaperOriginalConfirmed] = useState<boolean>(false);
	const [paperScanFile, setPaperScanFile] = useState<File | null>(null);
	const [isPrintingBlank, setIsPrintingBlank] = useState<boolean>(false);
	const [verificationMethod, setVerificationMethod] = useState<"tablet_stylus" | "sms_otp" | "paper_physical">(
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
	const handleConfirmSign = (forcedMethod?: "tablet_stylus" | "sms_otp" | "paper_physical") => {
		if (isSubmitting) return;

		const effectiveMethod = forcedMethod || verificationMethod;

		// ‼️ RED TEAM ИНВАРИАНТ: НУЛЕВАЯ ТОЛЕРАНТНОСТЬ К ФЕЙКОВЫМ ПОДПИСЯМ
		if (effectiveMethod === "tablet_stylus") {
			if (strokes.length === 0 && currentPoints.length === 0) {
				showToast("Невозможно подтвердить согласие: подпись на экране отсутствует. Распишитесь стилусом или пальцем", "error");
				return;
			}
		} else if (effectiveMethod === "sms_otp") {
			if (!smsOtpCode || smsOtpCode.trim().length < 4) {
				showToast("Введите 4-значный код подтверждения из СМС", "error");
				return;
			}
		} else if (effectiveMethod === "paper_physical") {
			// Врачебная автономия (Мандат 8e / 8n): подтверждение подписания на бумаге
			// автоматически регистрирует оригинал в карте № 043/у без бюрократических тупиков.
		}

		setIsSubmitting(true);

		try {
			let svg = "";
			if (effectiveMethod === "tablet_stylus") {
				svg = exportSignatureToSvg(strokes, 400, 140, { strokeColor: "#0f172a" });
			} else if (effectiveMethod === "sms_otp") {
				svg = generateSmsPepSignatureSvg({
					patientFullName: effectiveContext.patientName ? effectiveContext.patientName : undefined,
					phoneMasked: (substitutionContext.phone || patient?.phone) ? String(substitutionContext.phone || patient?.phone) : undefined,
					timestampIso: new Date().toISOString(),
					integrityHash: integrityRecord.hash,
					clinicName: effectiveContext.clinicName || (isDemoShowcaseMode() ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»"),
				});
			} else {
				svg = generatePaperSignatureSvg({
					date: effectiveContext.date || new Date().toLocaleDateString("ru-RU"),
					clinicName: effectiveContext.clinicName || (isDemoShowcaseMode() ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»"),
					patientFullName: effectiveContext.patientName ? effectiveContext.patientName : undefined,
					scanFileName: paperScanFile?.name || null,
					scanFileSizeBytes: paperScanFile?.size || null,
				});
			}

			const pngBase64 = PAPER_SIGNATURE_FALLBACK_PNG;

			const vectorData: SignatureVectorData = {
				strokes: effectiveMethod === "tablet_stylus" ? strokes : [],
				bounds: effectiveMethod === "tablet_stylus" && strokes.length > 0
					? calculateBoundingBox(strokes)
					: { minX: 0, minY: 0, maxX: 400, maxY: 120, width: 400, height: 120 },
				timestamp: Date.now(),
				pointCount: effectiveMethod === "tablet_stylus"
					? strokes.reduce((acc, s) => acc + s.points.length, 0)
					: 0,
				integrityHash: integrityRecord.hash,
			};

			if (activeMode === "packages") {
				const pkg = currentPackage;
				const signedPayloads: SignedConsentPayload[] = [];

				for (const tplKey of pkg.templateKeys) {
					const tpl = getConsentTemplate(tplKey);
					const rend = renderConsentTemplate(tpl, effectiveContext);
					const docHashRecord = generateConsentIntegrityHash({
						documentText: rend.fullTextContent,
						patientInfo: {
							name: substitutionContext.patientName,
							passportOrBirth: substitutionContext.passport || substitutionContext.birthDate,
							phone: substitutionContext.phone,
						},
						timestamp: Date.now(),
						strokes: effectiveMethod === "tablet_stylus" ? strokes : [],
						verificationMethod: effectiveMethod,
						smsOtpCode: effectiveMethod === "sms_otp" ? smsOtpCode : null,
					});

					const docVectorData: SignatureVectorData = {
						...vectorData,
						integrityHash: docHashRecord.hash,
					};

					const payload: SignedConsentPayload = {
						templateKey: tplKey,
						code: tpl.code,
						title: tpl.title,
						fullTextContent: rend.fullTextContent,
						patientName: effectiveContext.patientName || "Не указан",
						birthDate: effectiveContext.birthDate || "Не указана",
						passport: effectiveContext.passport || "Не указан",
						doctorName: effectiveContext.doctorName || "Не указан",
						clinicName: effectiveContext.clinicName || "ООО «ДЕНТЕ»",
						diagnosisIcd: effectiveContext.diagnosisIcd || "",
						toothNumbers: effectiveContext.toothNumbers || "",
						signatureSvg: svg,
						signaturePngBase64: pngBase64,
						vectorData: docVectorData,
						integrityHash: docHashRecord.hash,
						signedAt: new Date().toISOString(),
						verificationMethod: effectiveMethod,
						smsOtpCode: effectiveMethod === "sms_otp" ? smsOtpCode : null,
						attachedToForm043u: true,
						paperOriginalStored: effectiveMethod === "paper_physical" ? true : false,
						scanFileName: paperScanFile?.name || null,
						statusText: effectiveMethod === "paper_physical"
							? (paperScanFile
								? `Скан бланка прикреплен («${paperScanFile.name}»)`
								: "Бумажный оригинал пакета подписан пациентом (хранится в архиве карты 043/у)")
							: effectiveMethod === "sms_otp"
							? "Пакет согласий подписан ПЭП по 63-ФЗ ст. 5 через SMS"
							: "Электронный пакет согласий подписан на планшете (векторная подпись SVG)",
						note: `Пакет: ${pkg.title}`,
					};

					signedPayloads.push(payload);

					if (onConsentSigned) {
						onConsentSigned(payload);
					}

					if (onConsentConfirmed) {
						onConsentConfirmed({
							consentType: tpl.code,
							intervention: tpl.title,
							toothOrArea: effectiveContext.toothNumbers || "Область лечения",
							confirmedAt: new Date().toISOString(),
							integrityHash: docHashRecord.hash,
						});
					}
				}

				if (onPackageSigned) {
					onPackageSigned(signedPayloads);
				}
			} else {
				const payload: SignedConsentPayload = {
					templateKey: activeDocKey,
					code: currentTemplate.code,
					title: currentTemplate.title,
					fullTextContent: rendered.fullTextContent,
					patientName: effectiveContext.patientName || "Не указан",
					birthDate: effectiveContext.birthDate || "Не указана",
					passport: effectiveContext.passport || "Не указан",
					doctorName: effectiveContext.doctorName || "Не указан",
					clinicName: effectiveContext.clinicName || "ООО «ДЕНТЕ»",
					diagnosisIcd: effectiveContext.diagnosisIcd || "",
					toothNumbers: effectiveContext.toothNumbers || "",
					signatureSvg: svg,
					signaturePngBase64: pngBase64,
					vectorData,
					integrityHash: integrityRecord.hash,
					signedAt: new Date().toISOString(),
					verificationMethod: effectiveMethod,
					smsOtpCode: effectiveMethod === "sms_otp" ? smsOtpCode : null,
					attachedToForm043u: true,
					paperOriginalStored: effectiveMethod === "paper_physical" ? true : false,
					scanFileName: paperScanFile?.name || null,
					statusText: effectiveMethod === "paper_physical"
						? (paperScanFile
							? `Скан бланка прикреплен («${paperScanFile.name}»)`
							: "Бумажный оригинал подписан пациентом (хранится в архиве карты 043/у)")
						: effectiveMethod === "sms_otp"
						? "Подписано ПЭП по 63-ФЗ ст. 5 через SMS"
						: "Электронное согласие подписано на планшете (векторная подпись SVG)",
				};

				if (onConsentSigned) {
					onConsentSigned(payload);
				}

				if (onConsentConfirmed) {
					onConsentConfirmed({
						consentType: currentTemplate.code,
						intervention: currentTemplate.title,
						toothOrArea: effectiveContext.toothNumbers || "Область лечения",
						confirmedAt: new Date().toISOString(),
						integrityHash: integrityRecord.hash,
					});
				}
			}

			showToast("Согласие успешно подписано и зафиксировано в архиве", "success");
			onClose();
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	const allTemplates = getAllConsentTemplates(true);

	const modalContent = (
		<div
			className="consent-modal-overlay print-layer"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-labelledby="consent-modal-title"
		>
			<div className="consent-modal-container" onClick={(e) => e.stopPropagation()}>
				{/* Тактильный Drag Handle для Apple iOS Bottom Sheet (<= 768px) */}
				<div className="consent-mobile-drag-handle" aria-hidden="true">
					<div className="consent-mobile-drag-handle-bar" />
				</div>

				{/* Header */}
				<header className="consent-header">
					<div className="consent-header-titles min-w-0 flex-1">
						<div className="consent-header-badge-row">
							<span className="consent-statutory-badge shrink-0">
								<ShieldCheck size={14} />
								323-ФЗ • 1051н
							</span>
							<span className="consent-code-badge shrink-0">
								{activeMode === "packages" ? currentPackage.code : currentTemplate.code}
							</span>
						</div>
						<h2 id="consent-modal-title" className="consent-title truncate">
							{isMobile
								? (activeMode === "packages" ? "Пакет согласий ИДС (1051н)" : "Согласие на лечение (ИДС)")
								: (activeMode === "packages"
									? "Пакет информированных добровольных согласий (ИДС)"
									: "Информированное добровольное согласие (ИДС)")}
						</h2>
					</div>
					<button
						type="button"
						className="consent-close-btn"
						onClick={onClose}
						aria-label="Закрыть окно согласия"
					>
						<X size={22} />
					</button>
				</header>

				{/* Toolbar row with mode buttons, scrollable tabs, package banner & meta info */}
				<ConsentToolbarAndBanner
					activeMode={activeMode}
					setActiveMode={setActiveMode}
					activePackageKey={activePackageKey}
					setActivePackageKey={setActivePackageKey}
					activeKey={activeKey}
					setActiveKey={setActiveKey}
					activeDocKey={activeDocKey}
					setPreviewTemplateKey={setPreviewTemplateKey}
					allPackages={allPackages}
					allTemplates={allTemplates}
					currentPackage={currentPackage}
					getConsentTemplate={getConsentTemplate}
					substitutionContext={substitutionContext}
				/>

				{/* Тело модального окна */}
				<div className="consent-modal-body">
					{/* Индикатор изменения процедур (Consent Scope Mismatch по Приказу 1051н) */}
					{scopeMismatch.hasMismatch && (
						<div
							className="consent-scope-mismatch-banner"
							data-testid="modal-consent-scope-mismatch"
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								gap: "12px",
								padding: "10px 14px",
								borderRadius: "8px",
								background: "var(--amber-surface, #fffbeb)",
								border: "1px solid var(--amber, #d97706)",
								color: "var(--ink)",
								fontSize: "12px",
								flexWrap: "wrap",
							}}
						>
							<div style={{ display: "flex", alignItems: "flex-start", gap: "8px", flex: 1, minWidth: "260px" }}>
								<AlertTriangle size={18} style={{ color: "var(--amber, #d97706)", flexShrink: 0, marginTop: "2px" }} />
								<div>
									<div style={{ fontWeight: 700, color: "var(--amber-dark, #b45309)" }}>
										{scopeMismatch.warningTitle}
									</div>
									<div style={{ color: "var(--muted)", marginTop: "2px", lineHeight: 1.35 }}>
										{scopeMismatch.warningMessage}
									</div>
								</div>
							</div>
							<button
								type="button"
								className="consent-mode-btn active"
								style={{
									height: "28px",
									padding: "0 10px",
									fontSize: "11.5px",
									fontWeight: 600,
									background: "var(--amber, #d97706)",
									borderColor: "var(--amber-dark, #b45309)",
									color: "#ffffff",
									cursor: "pointer",
									borderRadius: "6px",
									whiteSpace: "nowrap",
								}}
								onClick={() => {
									if (scopeMismatch.uncoveredTemplateKeys[0]) {
										setActiveMode("single");
										setActiveKey(scopeMismatch.uncoveredTemplateKeys[0]);
										showToast("Сформировано доп. согласие на добавленную процедуру", "info");
									}
								}}
							>
								<span>{scopeMismatch.suggestedActionLabel}</span>
							</button>
						</div>
					)}

					{/* НА МОБИЛЬНОМ У КРЕСЛА: HOT PATH РОСПИСИ ПАЛЬЦЕМ В ПЕРВУЮ ОЧЕРЕДЬ */}
					{isMobile && (
						<ConsentSigningPanel
							verificationMethod={verificationMethod}
							setVerificationMethod={setVerificationMethod}
							paperOriginalConfirmed={paperOriginalConfirmed}
							setPaperOriginalConfirmed={setPaperOriginalConfirmed}
							strokes={strokes}
							setStrokes={setStrokes}
							currentPoints={currentPoints}
							setCurrentPoints={setCurrentPoints}
							isDrawing={isDrawing}
							setIsDrawing={setIsDrawing}
							activeMode={activeMode}
							packageDocsCount={currentPackage.templateKeys.length}
							isSubmitting={isSubmitting}
							onConfirmSign={handleConfirmSign}
							onPrint={handlePrint}
							onPrintBlank={handlePrintBlank}
							onDownloadPdfA={handleDownloadPdfA}
							planAndRisksAccepted={planAndRisksAccepted}
							setPlanAndRisksAccepted={setPlanAndRisksAccepted}
							alternativesUnderstood={alternativesUnderstood}
							setAlternativesUnderstood={setAlternativesUnderstood}
							isMobile={true}
							patientPhone={substitutionContext.phone ?? null}
							smsOtpCode={smsOtpCode}
							setSmsOtpCode={setSmsOtpCode}
							paperScanFile={paperScanFile}
							setPaperScanFile={setPaperScanFile}
						/>
					)}

					{/* Просмотр текста согласия: на мобиле сворачиваемый аккордеон, на ПК полный лист */}
					{isMobile ? (
						<div className="rounded-xl border border-[var(--line)] bg-[var(--paper)] overflow-hidden">
							<button
								type="button"
								onClick={() => setIsDocumentTextExpanded((v) => !v)}
								className="w-full flex items-center justify-between p-3.5 text-xs sm:text-sm font-semibold text-[var(--ink)] bg-[var(--paper-soft)] cursor-pointer hover:bg-[var(--paper)] transition-colors"
							>
								<span className="flex items-center gap-2">
									<FileText size={16} className="text-[var(--teal,#0d9488)]" />
									<span>Юридический текст согласия (Приказ 1051н)</span>
								</span>
								<span className="text-xs text-[var(--muted)] flex items-center gap-1">
									{isDocumentTextExpanded ? (
										<>
											<span>Свернуть</span>
											<ChevronUp size={14} />
										</>
									) : (
										<>
											<span>Читать полный текст</span>
											<ChevronDown size={14} />
										</>
									)}
								</span>
							</button>
							{isDocumentTextExpanded && (
								<div className="p-3 border-t border-[var(--line)]">
									<ConsentDocumentSheet
										rendered={rendered}
										effectiveContext={effectiveContext}
										effectiveWatermark={effectiveWatermark}
										stampColor={stampColor}
										isClosedOrSigned={isClosedOrSigned}
									/>
								</div>
							)}
						</div>
					) : (
						<ConsentDocumentSheet
							rendered={rendered}
							effectiveContext={effectiveContext}
							effectiveWatermark={effectiveWatermark}
							stampColor={stampColor}
							isClosedOrSigned={isClosedOrSigned}
						/>
					)}

					{/* НА ДЕСКТОПЕ: ПАНЕЛЬ ПОДПИСАНИЯ ПОД ДОКУМЕНТОМ */}
					{!isMobile && (
						<ConsentSigningPanel
							verificationMethod={verificationMethod}
							setVerificationMethod={setVerificationMethod}
							paperOriginalConfirmed={paperOriginalConfirmed}
							setPaperOriginalConfirmed={setPaperOriginalConfirmed}
							strokes={strokes}
							setStrokes={setStrokes}
							currentPoints={currentPoints}
							setCurrentPoints={setCurrentPoints}
							isDrawing={isDrawing}
							setIsDrawing={setIsDrawing}
							activeMode={activeMode}
							packageDocsCount={currentPackage.templateKeys.length}
							isSubmitting={isSubmitting}
							onConfirmSign={handleConfirmSign}
							onPrint={handlePrint}
							onPrintBlank={handlePrintBlank}
							onDownloadPdfA={handleDownloadPdfA}
							planAndRisksAccepted={planAndRisksAccepted}
							setPlanAndRisksAccepted={setPlanAndRisksAccepted}
							alternativesUnderstood={alternativesUnderstood}
							setAlternativesUnderstood={setAlternativesUnderstood}
							isMobile={false}
							patientPhone={substitutionContext.phone ?? null}
							smsOtpCode={smsOtpCode}
							setSmsOtpCode={setSmsOtpCode}
							paperScanFile={paperScanFile}
							setPaperScanFile={setPaperScanFile}
						/>
					)}

					{/* Панель криптографической целостности SHA-256 */}
					<div className="consent-integrity-card">
						<div className="flex items-center gap-2">
							<Lock size={16} className="text-[var(--teal,#0d9488)]" />
							<span className="font-semibold text-xs text-muted">Цифровой отпечаток SHA-256:</span>
							<span className="consent-integrity-hash">{integrityRecord.hash.slice(0, 16)}...</span>
						</div>
						<button
							type="button"
							className="consent-tool-btn py-1 px-2 text-xs"
							onClick={handleCopyHash}
							title="Скопировать полный хеш целостности"
							aria-label="Скопировать полный хеш"
						>
							{copiedHash ? <Check size={14} className="text-ok-fg" /> : <Copy size={14} />}
							<span>{copiedHash ? "Скопировано" : "Копировать"}</span>
						</button>
					</div>
				</div>

				{/* Floating Bottom Bar на смартфонах (Natural Thumb Zone CTA) */}
				{isMobile && (
					<div className="consent-floating-bottom-bar">
						<button
							type="button"
							className="consent-mobile-primary-cta"
							data-testid="btn-confirm-sign-mobile"
							onClick={() => handleConfirmSign()}
							disabled={isSubmitting || !isSigningReady}
							style={{
								background: isSigningReady ? "var(--teal)" : "var(--muted)",
								cursor: isSigningReady ? "pointer" : "not-allowed",
								opacity: isSigningReady ? 1 : 0.65,
							}}
						>
							<Zap size={20} />
							<span>
								{isSigningReady
									? (activeMode === "packages"
										? `Подтвердить и подписать пакет (${currentPackage.templateKeys.length} док.)`
										: "Подтвердить и подписать ИДС")
									: "Ожидает росписи пальцем / кода / бланка"}
							</span>
						</button>
					</div>
				)}

				{/* Desktop Footer */}
				{!isMobile && (
					<ConsentModalFooter
						activeMode={activeMode}
						packageDocsCount={currentPackage.templateKeys.length}
						isSubmitting={isSubmitting}
						isSigningReady={isSigningReady}
						onPrint={handlePrint}
						onPrintBlank={handlePrintBlank}
						onDownloadPdfA={handleDownloadPdfA}
						onCopyPatientSummary={handleCopyPatientSummary}
						onConfirmSign={() => handleConfirmSign()}
						onClose={onClose}
					/>
				)}
			</div>
		</div>
	);

	if (typeof document === "undefined" || !document.body) {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};
