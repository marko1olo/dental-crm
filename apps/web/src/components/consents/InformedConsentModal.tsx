import {
	AlertTriangle,
	Check,
	Copy,
	Download,
	FileText,
	Layers,
	Lock,
	MoreHorizontal,
	Package,
	PenTool,
	Printer,
	RotateCcw,
	ShieldCheck,
	Sparkles,
	X,
	Zap,
} from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
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
	renderStrokeToSvgPath,
	getPointerCoordinates,
	generatePdfA1bDocument,
	downloadConsentPdfA,
} from "./signaturePadMath.js";

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

export interface SignedConsentPayload {
	templateKey: ConsentTemplateKey;
	code: string;
	title: string;
	fullTextContent: string;
	patientName: string;
	birthDate: string;
	passport: string;
	doctorName: string;
	clinicName: string;
	diagnosisIcd: string;
	toothNumbers: string;
	signatureSvg: string;
	signaturePngBase64: string;
	vectorData: SignatureVectorData;
	integrityHash: string;
	signedAt: string;
	verificationMethod: "tablet_stylus" | "sms_otp" | "paper_physical";
	smsOtpCode?: string | null;
	attachedToForm043u: boolean;
	paperOriginalStored?: boolean;
	statusText?: string;
	note?: string;
}

export { PACKAGE_SHORT_TITLES, TEMPLATE_SHORT_TITLES };

export interface PatientConsentSummaryParams {
	activeMode: "packages" | "single";
	patientName?: string | null | undefined;
	doctorName?: string | null | undefined;
	doctorSpecialty?: string | null | undefined;
	clinicName?: string | null | undefined;
	clinicLegalName?: string | null | undefined;
	clinicPhone?: string | null | undefined;
	toothNumbers?: string | null | undefined;
	customDiagnosis?: string | null | undefined;
	diagnosisIcd?: string | null | undefined;
	packageKey?: ConsentPackageKey | undefined;
	templateKey?: ConsentTemplateKey | undefined;
	integrityHash?: string | undefined;
}

/**
 * Формирует выжимку согласия и памятку для пациента без эмодзи (Мандаты 8d п. 7, 8e п. 5, 8i, 8k, 8n).
 * Готова для 1-клик отправки в WhatsApp / Telegram / SMS.
 */
export function buildPatientConsentSummary(params: PatientConsentSummaryParams): string {
	const effectivePatientName = (params.patientName || "Пациент").trim();
	const effectiveDoctorName = (
		params.doctorName ||
		(params.doctorSpecialty ? `Врач-стоматолог (${params.doctorSpecialty})` : null) ||
		"Лечащий врач"
	).trim();
	const effectiveClinicName = (params.clinicName || params.clinicLegalName || "ООО «Стоматологическая клиника ДЕНТЕ»").trim();
	const effectiveClinicPhone = (params.clinicPhone || "").trim();
	const effectiveTeeth = (params.toothNumbers || "").trim();
	const hashPrefix = (params.integrityHash || "0000000000000000").slice(0, 16);

	if (params.activeMode === "packages") {
		const pkg = getConsentPackage(params.packageKey || "PACKAGE_PRIMARY_VISIT");
		const docList = pkg.templateKeys
			.map((key) => {
				const tpl = getConsentTemplate(key);
				return `${tpl.title} (${tpl.code})`;
			})
			.join(", ");

		const memoLines = [
			`Информированные согласия на лечение (клиника «${effectiveClinicName}»):`,
			`Пациент: ${effectivePatientName}`,
			`Пакет: ${pkg.title}`,
			`Документы: ${docList}`,
			`Врач: ${effectiveDoctorName}`,
			`Область лечения: ${effectiveTeeth || "По плану лечения"}`,
			`Хеш целостности SHA-256: ${hashPrefix}...`,
		];
		if (effectiveClinicPhone) {
			memoLines.push(`Памятка: перед приёмом ознакомьтесь с противопоказаниями. При возникновении вопросов звоните в клинику: ${effectiveClinicPhone}.`);
		} else {
			memoLines.push(`Памятка: перед приёмом ознакомьтесь с противопоказаниями.`);
		}
		return memoLines.join("\n");
	}

	const tpl = getConsentTemplate(params.templateKey || "CONSENT_THERAPY");
	const effectiveDiagnosis = (params.customDiagnosis || params.diagnosisIcd || "По плану лечения").trim();

	const memoLines = [
		`Информированное добровольное согласие (клиника «${effectiveClinicName}»):`,
		`Пациент: ${effectivePatientName}`,
		`Медицинское вмешательство: ${tpl.title} (${tpl.code})`,
		`Врач: ${effectiveDoctorName}`,
		`Область лечения: ${effectiveTeeth || "По показаниям"}`,
		`Диагноз МКБ: ${effectiveDiagnosis}`,
		`Ключевые риски и памятка: после вмешательства возможно появление локальной болезненности, отёка и чувствительности (1-3 дня). Строго соблюдайте назначения лечащего врача.`,
		`Хеш целостности SHA-256: ${hashPrefix}...`,
	];
	if (effectiveClinicPhone) {
		memoLines.push(`Телефон клиники: ${effectiveClinicPhone}.`);
	}
	return memoLines.join("\n");
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
 * Процедурный симулятор сенсорного росчерка стилусом и SMS OTP устранены.
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
	const [paperOriginalConfirmed, setPaperOriginalConfirmed] = useState<boolean>(true);
	const [isPrintingBlank, setIsPrintingBlank] = useState<boolean>(false);
	const [verificationMethod, setVerificationMethod] = useState<"tablet_stylus" | "sms_otp" | "paper_physical">(
		initialVerificationMethod || "paper_physical"
	);
	const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
	const [currentPoints, setCurrentPoints] = useState<SignaturePoint[]>([]);
	const [isDrawing, setIsDrawing] = useState<boolean>(false);

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
	const [isMoreMenuOpen, setIsMoreMenuOpen] = useState<boolean>(false);

	// Синхронизация при открытии
	useEffect(() => {
		if (isOpen) {
			setActiveMode(initialMode || "packages");
			setActivePackageKey(initialPackageKey || "PACKAGE_PRIMARY_VISIT");
			setActiveKey(initialTemplateKey);
			setPreviewTemplateKey(null);
			setPaperOriginalConfirmed(true);
			setIsPrintingBlank(false);
			setCustomDiagnosis(diagnosisIcd || "");
			setCustomTeeth(toothNumbers || "");
			setIsMoreMenuOpen(false);
			setVerificationMethod(initialVerificationMethod || "paper_physical");
			setStrokes([]);
			setCurrentPoints([]);
			setIsDrawing(false);
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
		return {
			patientName: patient?.fullName || null,
			birthDate: patient?.birthDate || null,
			passport: patient?.passport || null,
			doctorName: doctorName || (doctorSpecialty ? `Врач-стоматолог (${doctorSpecialty})` : null),
			clinicName: clinicName || clinicLegalName,
			clinicLegalName: clinicLegalName || clinicName,
			clinicAddress: clinicAddress || "г. Москва, ул. Клиническая, д. 10",
			clinicOgrn: clinicOgrn || "1217700123456",
			licenseNumber: licenseNumber || "ЛО41-01137-77/00123456",
			diagnosisIcd: customDiagnosis || diagnosisIcd || "K02.1 Кариес дентина",
			toothNumbers: customTeeth || toothNumbers || "1.6, 1.7",
			date: new Date().toLocaleDateString("ru-RU"),
		snils: patient?.snils || null,
		phone: patient?.phone || null,
		};
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

	// Обработчики сенсорного/стилусного ввода (SVG Vector Pad)
	const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
		e.preventDefault();
		(e.target as Element).setPointerCapture?.(e.pointerId);
		const pt = getPointerCoordinates(e, e.currentTarget);
		setCurrentPoints([pt]);
		setIsDrawing(true);
	};

	const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
		if (!isDrawing) return;
		e.preventDefault();
		const pt = getPointerCoordinates(e, e.currentTarget);
		setCurrentPoints((prev) => [...prev, pt]);
	};

	const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
		if (!isDrawing) return;
		e.preventDefault();
		try {
			(e.target as Element).releasePointerCapture?.(e.pointerId);
		} catch {}
		setIsDrawing(false);
		if (currentPoints.length > 0) {
			setStrokes((prev) => [...prev, { points: currentPoints, color: "var(--ink)" }]);
			setCurrentPoints([]);
		}
	};

	const handleClearStrokes = () => {
		setStrokes([]);
		setCurrentPoints([]);
	};

	// 1-клик генерация и скачивание архивного документа ISO 19005-1 (PDF/A-1b)
	const handleDownloadPdfA = () => {
		try {
			const sigSvg = verificationMethod === "tablet_stylus" && strokes.length > 0
				? exportSignatureToSvg(strokes, 400, 140, { strokeColor: "#0f172a" })
				: generatePaperSignatureSvg({
						date: effectiveContext.date || new Date().toLocaleDateString("ru-RU"),
						clinicName: effectiveContext.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»",
				  });

			const pdfBytes = generatePdfA1bDocument({
				clinicName: effectiveContext.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»",
				clinicAddress: effectiveContext.clinicAddress || undefined,
				clinicPhone: (effectiveContext.phone || clinicPhone) || undefined,
				patientName: effectiveContext.patientName || "Пациент",
				patientBirthDate: effectiveContext.birthDate || undefined,
				medicalCardNumber: patient?.cardNumber || undefined,
				doctorName: effectiveContext.doctorName || "Лечащий врач",
				documentTitle: rendered.title,
				documentCode: currentTemplate.code,
				documentText: rendered.fullTextContent,
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

	// 1-клик копирование выжимки ИДС и памятки рисков для пациента в WhatsApp / Telegram (Wave 51 / Фича 236)
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
		setIsSubmitting(true);

		const effectiveMethod = forcedMethod || verificationMethod;

		try {
			const svg = effectiveMethod === "tablet_stylus" && strokes.length > 0
				? exportSignatureToSvg(strokes, 400, 140, { strokeColor: "#0f172a" })
				: generatePaperSignatureSvg({
						date: effectiveContext.date || new Date().toLocaleDateString("ru-RU"),
						clinicName: effectiveContext.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»",
				  });
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
						smsOtpCode: null,
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
						smsOtpCode: null,
						attachedToForm043u: true,
						paperOriginalStored: effectiveMethod === "paper_physical" ? paperOriginalConfirmed : false,
						statusText: effectiveMethod === "paper_physical"
							? "Бумажный оригинал пакета подписан пациентом (хранится в архиве карты 043/у)"
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
					smsOtpCode: null,
					attachedToForm043u: true,
					paperOriginalStored: effectiveMethod === "paper_physical" ? paperOriginalConfirmed : false,
					statusText: effectiveMethod === "paper_physical"
						? "Бумажный оригинал подписан пациентом (хранится в архиве карты 043/у)"
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

			onClose();
		} finally {
			setIsSubmitting(false);
		}
	};

	if (!isOpen) return null;

	const allTemplates = getAllConsentTemplates();

	const modalContent = (
		<div
			className="consent-modal-overlay print-layer"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-labelledby="consent-modal-title"
		>
			<div className="consent-modal-container" onClick={(e) => e.stopPropagation()}>
				{/* Header */}
				<header className="consent-header">
					<div className="consent-header-titles min-w-0 flex-1">
						<div className="consent-header-badge-row">
							<span className="consent-statutory-badge shrink-0">
								<ShieldCheck size={14} />
								323-ФЗ • 1051н
							</span>
							<span className="consent-code-badge shrink-0">
								{activeMode === "packages" ? currentPackage.key : currentTemplate.code}
							</span>
						</div>
						<h2 id="consent-modal-title" className="consent-title truncate">
							{activeMode === "packages"
								? "Пакет информированных добровольных согласий (ИДС)"
								: "Информированное добровольное согласие (ИДС)"}
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

				{/* Панель выбора режима и вкладок (1 строка 32-36px, Hick's Law) */}
				<div
					className="consent-toolbar-row"
					style={{
						height: "36px",
						minHeight: "36px",
						maxHeight: "36px",
						padding: "0 1rem",
						flexWrap: "nowrap",
						overflow: "hidden",
					}}
				>
					<div className="consent-mode-segmented" style={{ height: "28px" }}>
						<button
							type="button"
							className={`consent-mode-btn ${activeMode === "packages" ? "active" : ""}`}
							onClick={() => {
								setActiveMode("packages");
								setPreviewTemplateKey(null);
							}}
							data-testid="tab-mode-packages"
							aria-pressed={activeMode === "packages"}
							style={{ height: "24px", padding: "0 8px", fontSize: "12px" }}
						>
							<Layers size={13} />
							<span>Пакеты ИДС (1 клик)</span>
						</button>
						<button
							type="button"
							className={`consent-mode-btn ${activeMode === "single" ? "active" : ""}`}
							onClick={() => setActiveMode("single")}
							data-testid="tab-mode-single"
							aria-pressed={activeMode === "single"}
							style={{ height: "24px", padding: "0 8px", fontSize: "12px" }}
						>
							<FileText size={13} />
							<span>Отдельные согласия</span>
						</button>
					</div>

					<nav
						className="consent-tabs-scroll min-w-0"
						style={{
							height: "36px",
							padding: "0",
							display: "flex",
							alignItems: "center",
							overflowX: "auto",
							borderBottom: "none",
							flexWrap: "nowrap",
						}}
						aria-label={activeMode === "packages" ? "Пакеты согласий" : "Шаблоны согласий"}
					>
						{activeMode === "packages"
							? allPackages.map((pkg) => {
									const isActive = pkg.key === activePackageKey;
									const titleText = PACKAGE_SHORT_TITLES[pkg.key] || pkg.title;
									return (
										<button
											key={pkg.key}
											type="button"
											className={`consent-tab-btn shrink-0 flex-shrink-0 min-w-0 ${isActive ? "active" : ""}`}
											style={{
												minHeight: "26px",
												height: "26px",
												padding: "0 8px",
												fontSize: "12px",
												borderRadius: "6px",
											}}
											onClick={() => {
												setActivePackageKey(pkg.key);
												setPreviewTemplateKey(null);
											}}
											aria-selected={isActive}
											data-testid={`pkg-tab-${pkg.key}`}
											title={titleText}
										>
											<Sparkles size={13} className="shrink-0" />
											<span className="truncate max-w-[200px]">{titleText}</span>
										</button>
									);
							  })
							: allTemplates.map((tpl) => {
									const isActive = tpl.key === activeKey;
									const titleText = TEMPLATE_SHORT_TITLES[tpl.key] || tpl.title;
									return (
										<button
											key={tpl.key}
											type="button"
											className={`consent-tab-btn shrink-0 flex-shrink-0 min-w-0 ${isActive ? "active" : ""}`}
											style={{
												minHeight: "26px",
												height: "26px",
												padding: "0 8px",
												fontSize: "12px",
												borderRadius: "6px",
											}}
											onClick={() => setActiveKey(tpl.key)}
											aria-selected={isActive}
											data-testid={`tpl-tab-${tpl.key}`}
											title={titleText}
										>
											<span className="truncate max-w-[200px]">{titleText}</span>
										</button>
									);
							  })}
					</nav>
				</div>

				{/* Тело модального окна */}
				<div className="consent-modal-body">
					{/* Баннер активного пакета с чипами быстрого предпросмотра документов */}
					{activeMode === "packages" && (
						<div className="consent-package-banner">
							<div className="consent-package-banner-title min-w-0 flex-1">
								<Package size={18} className="text-[var(--teal,#0d9488)] shrink-0" />
								<div className="min-w-0 flex-1">
									<div className="font-bold text-sm text-[var(--teal-dark,#0f766e)] truncate">
										{currentPackage.title} ({currentPackage.templateKeys.length} документа в пакете)
									</div>
									<div className="text-xs text-muted truncate">
										{currentPackage.description} • 1 клик подтверждает подписание всех {currentPackage.templateKeys.length} документов на бумаге
									</div>
								</div>
							</div>
							<div className="flex items-center gap-1.5 flex-wrap">
								<span className="text-xs font-semibold text-muted mr-1">Просмотр бланка:</span>
								{currentPackage.templateKeys.map((k) => {
									const t = getConsentTemplate(k);
									const isSelected = k === activeDocKey;
									return (
										<button
											key={k}
											type="button"
											className={`consent-subdoc-chip min-w-0 ${isSelected ? "active" : ""}`}
											onClick={() => setPreviewTemplateKey(k)}
											title={`Просмотреть ${t.title}`}
										>
											<span className="font-mono shrink-0">{t.code}</span>
											<span className="truncate max-w-[180px]">{TEMPLATE_SHORT_TITLES[k] || t.title}</span>
										</button>
									);
								})}
							</div>
						</div>
					)}

					{/* Информационная панель метаданных */}
					<div className="consent-meta-grid">
						<div className="consent-meta-item min-w-0">
							<span className="consent-meta-label">Пациент</span>
							<span className="consent-meta-value truncate" title={substitutionContext.patientName || ""}>
								{substitutionContext.patientName}
							</span>
							{substitutionContext.birthDate && (
								<span className="consent-meta-label truncate">Д.Р.: {substitutionContext.birthDate}</span>
							)}
						</div>

						<div className="consent-meta-item min-w-0">
							<span className="consent-meta-label">Лечащий врач</span>
							<span className="consent-meta-value truncate" title={substitutionContext.doctorName || ""}>
								{substitutionContext.doctorName}
							</span>
						</div>

						<div className="consent-meta-item min-w-0">
							<span className="consent-meta-label">Диагноз (МКБ-10)</span>
							<span className="consent-meta-value truncate" title={substitutionContext.diagnosisIcd || ""}>
								{substitutionContext.diagnosisIcd}
							</span>
						</div>

						<div className="consent-meta-item min-w-0">
							<span className="consent-meta-label">Зубы / Зона</span>
							<span className="consent-meta-value truncate" title={substitutionContext.toothNumbers || ""}>
								{substitutionContext.toothNumbers}
							</span>
							{substitutionContext.toothNumbers && (
								<div className="consent-teeth-badges">
									{substitutionContext.toothNumbers.split(/[,;\s]+/).map((t) => (
										<span key={t} className="consent-tooth-chip">
											{t}
										</span>
									))}
								</div>
							)}
						</div>
					</div>

					{/* Просмотр текста согласия */}
					<div className="consent-document-sheet" style={{ position: "relative" }}>
						<div
							className="consent-doc-watermark"
							style={{
								position: "absolute",
								top: "45%",
								left: "50%",
								transform: "translate(-50%, -50%) rotate(-30deg)",
								fontSize: "48pt",
								fontWeight: 900,
								color: "rgba(0, 0, 0, 0.04)",
								textTransform: "uppercase",
								letterSpacing: "4pt",
								pointerEvents: "none",
								zIndex: 0,
								userSelect: "none",
							}}
							aria-hidden="true"
						>
							{effectiveWatermark}
						</div>
						<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
							<span
								className="consent-watermark-stamp"
								style={{
									display: "inline-block",
									border: `1.5pt solid ${stampColor}`,
									color: stampColor,
									padding: "1.5pt 6pt",
									borderRadius: "3px",
									fontSize: "7.5pt",
									fontWeight: 800,
									textTransform: "uppercase",
									letterSpacing: "0.04em",
								}}
								data-testid="consent-watermark-stamp"
							>
								{effectiveWatermark}
							</span>
							<span className="text-xs text-muted">
								{isClosedOrSigned ? "Документ подписан / подшит в карту 043/у" : "Черновик — печать разрешена в любой момент"}
							</span>
						</div>
						<h3 className="consent-document-title">{rendered.title}</h3>
						<p className="consent-document-subtitle">{rendered.subtitle}</p>

						{rendered.renderedSections.map((sec) => (
							<section key={sec.id} className="consent-section-block">
								<h4 className="consent-section-title">{sec.title}</h4>
								<p className="consent-section-text">{sec.content}</p>
								{sec.bullets && sec.bullets.length > 0 && (
									<ul className="consent-bullet-list">
										{sec.bullets.map((bullet, bIdx) => (
											<li key={bIdx}>{bullet}</li>
										))}
									</ul>
								)}
							</section>
						))}

						{rendered.riskFactors.length > 0 && (
							<div className="consent-risk-box">
								<div className="consent-risk-box-header">
									<AlertTriangle size={16} />
									<span>Факторы риска и анатомические особенности</span>
								</div>
								<ul className="consent-bullet-list">
									{rendered.riskFactors.map((rf, idx) => (
										<li key={idx}>{rf}</li>
									))}
								</ul>
							</div>
						)}

						{rendered.aftercareInstructions.length > 0 && (
							<section className="consent-section-block">
								<h4 className="consent-section-title">Рекомендации и ограничения после лечения</h4>
								<ul className="consent-bullet-list">
									{rendered.aftercareInstructions.map((ac, idx) => (
										<li key={idx}>{ac}</li>
									))}
								</ul>
							</section>
						)}

						{/* Блок подписей сторон (для печати бумажного бланка и подшивки в форму 043/у) */}
						<div
							className="consent-print-signatures-block"
							style={{
								marginTop: "1.5rem",
								paddingTop: "1rem",
								borderTop: "1px solid var(--line)",
								display: "flex",
								flexDirection: "column",
								gap: "0.85rem",
							}}
						>
							<div
								style={{
									display: "grid",
									gridTemplateColumns: "1fr 1fr",
									gap: "1.5rem",
								}}
							>
								<div>
									<div
										style={{
											fontSize: "11px",
											fontWeight: "bold",
											textTransform: "uppercase",
											color: "var(--muted)",
											marginBottom: "4px",
										}}
									>
										Пациент (законный представитель):
									</div>
									<div style={{ fontSize: "12px", color: "var(--ink)" }}>
										Подпись: __________________ / {effectiveContext.patientName || "____________________"} /
									</div>
								</div>
								<div>
									<div
										style={{
											fontSize: "11px",
											fontWeight: "bold",
											textTransform: "uppercase",
											color: "var(--muted)",
											marginBottom: "4px",
										}}
									>
										Лечащий врач:
									</div>
									<div style={{ fontSize: "12px", color: "var(--ink)" }}>
										Подпись: __________________ / {effectiveContext.doctorName || "____________________"} /
									</div>
								</div>
							</div>
							<div
								style={{
									display: "flex",
									justifyContent: "space-between",
									fontSize: "11px",
									color: "var(--muted)",
								}}
							>
								<span>Дата: {effectiveContext.date || new Date().toLocaleDateString("ru-RU")}</span>
								<span>Клиника: {effectiveContext.clinicName}</span>
							</div>
						</div>
					</div>

					{/* Блок подтверждения бумажного оригинала или векторного планшета (323-ФЗ ст. 20) */}
					<div
						className="consent-paper-box"
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "0.85rem",
							background: "var(--paper-soft)",
							border: "1px solid var(--line-strong, var(--teal))",
							borderRadius: "var(--radius-lg, 12px)",
							padding: "1.25rem",
						}}
					>
						{/* Переключение метода: Бумага vs Векторный планшет */}
						<div className="flex items-center justify-between gap-2 flex-wrap pb-1">
							<div className="flex items-center gap-1.5 p-0.5 bg-[var(--paper)] rounded-lg border border-[var(--line)]">
								<button
									type="button"
									className={`consent-mode-btn ${verificationMethod === "paper_physical" ? "active" : ""}`}
									onClick={() => setVerificationMethod("paper_physical")}
									data-testid="tab-method-paper"
									style={{ height: "26px", padding: "0 10px", fontSize: "12px", borderRadius: "6px" }}
								>
									<Printer size={13} />
									<span>Бумажный носитель (323-ФЗ)</span>
								</button>
								<button
									type="button"
									className={`consent-mode-btn ${verificationMethod === "tablet_stylus" ? "active" : ""}`}
									onClick={() => setVerificationMethod("tablet_stylus")}
									data-testid="tab-method-tablet"
									style={{ height: "26px", padding: "0 10px", fontSize: "12px", borderRadius: "6px" }}
								>
									<PenTool size={13} />
									<span>Векторный планшет (экран)</span>
								</button>
							</div>
							<span className="consent-statutory-badge shrink-0">
								{verificationMethod === "paper_physical" ? "Оригинал в карте 043/у" : "Векторный росчерк SVG"}
							</span>
						</div>

						{verificationMethod === "paper_physical" ? (
							<>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<ShieldCheck size={22} className="text-[var(--teal,#0d9488)]" />
										<span className="font-bold text-sm">
											Подписание на бумажном носителе (323-ФЗ ст. 20, Приказ МЗ РФ № 1051н)
										</span>
									</div>
									<span className="consent-statutory-badge">
										Оригинал в карте 043/у
									</span>
								</div>
								<p className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.5 }}>
									Пациент знакомится с текстом согласия и расписывается шариковой ручкой на бумажном бланке.
									Бумажный оригинал подшивается в амбулаторную медицинскую карту пациента формы № 043/у (срок хранения 25 лет).
									В электронной карте фиксируется отметка с криптографическим отпечатком SHA-256.
								</p>

								{/* Чекбокс подтверждения наличия бумажного оригинала */}
								<label className="consent-paper-checkbox-label">
									<input
										type="checkbox"
										checked={paperOriginalConfirmed}
										onChange={(e) => setPaperOriginalConfirmed(e.target.checked)}
										data-testid="checkbox-paper-original-stored"
										style={{ width: "18px", height: "18px", cursor: "pointer", accentColor: "var(--teal, #0d9488)" }}
									/>
									<span style={{ fontSize: "13px", fontWeight: 600, color: "var(--ink)" }}>
										Оригинал подписан пациентом от руки на бумаге (подшит в карту № 043/у)
									</span>
								</label>

								<div className="flex items-center gap-3 pt-1 flex-wrap">
									<button
										type="button"
										className="consent-action-btn primary"
										data-testid="btn-confirm-paper-signed"
										onClick={() => handleConfirmSign("paper_physical")}
										disabled={isSubmitting}
										style={{
											minHeight: "44px",
											fontSize: "14px",
											fontWeight: "bold",
											background: "var(--teal)",
											color: "var(--on-teal, #ffffff)",
											boxShadow: "var(--shadow-1)",
										}}
									>
										<Zap size={18} />
										<span>
											{activeMode === "packages"
												? `Подтвердить пакет (${currentPackage.templateKeys.length} док.) в 1 клик`
												: "Подтвердить подписание на бумаге (1 клик)"}
										</span>
									</button>
									<button
										type="button"
										className="consent-tool-btn"
										onClick={handlePrint}
										title={
											activeMode === "packages"
												? "Многостраничная печать заполненного пакета ИДС (А4)"
												: "Печать заполненного бланка ИДС на принтер (А4)"
										}
									>
										<Printer size={16} />
										<span>{activeMode === "packages" ? "Печать пакета (А4)" : "Печать бланка (А4)"}</span>
									</button>
									<button
										type="button"
										className="consent-tool-btn"
										data-testid="btn-print-blank-consent-inline"
										onClick={handlePrintBlank}
										title={
											activeMode === "packages"
												? "Печать чистых бланков всего пакета со строками «________» для ручного заполнения"
												: "Печать чистого бланка со строками «________» для ручного заполнения пациентом"
										}
									>
										<FileText size={16} />
										<span>
											{activeMode === "packages" ? "Печать чистых бланков пакета («________»)" : "Печать чистого бланка («________»)"}
										</span>
									</button>
									<button
										type="button"
										className="consent-tool-btn"
										data-testid="btn-download-pdfa-inline"
										onClick={handleDownloadPdfA}
										title="Скачать архивный документ ISO 19005-1 PDF/A-1b с криптографическим отпечатком"
									>
										<Download size={16} />
										<span>Скачать PDF/A</span>
									</button>
								</div>
							</>
						) : (
							<>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-2">
										<PenTool size={20} className="text-[var(--teal,#0d9488)]" />
										<span className="font-bold text-sm">
											Электронная векторная подпись (сенсорный ввод / стилус)
										</span>
									</div>
									<div className="flex items-center gap-2">
										<button
											type="button"
											className="consent-tool-btn py-1 px-2 text-xs"
											onClick={handleClearStrokes}
											data-testid="btn-clear-vector-strokes"
											title="Очистить поле подписи"
										>
											<RotateCcw size={12} />
											<span>Очистить</span>
										</button>
										<span className="consent-statutory-badge">
											Векторные кривые Безье
										</span>
									</div>
								</div>
								<p className="text-xs text-muted" style={{ margin: 0, lineHeight: 1.5 }}>
									Пациент ставит векторную подпись на экране планшета или монитора. Росчерк сглаживается кубическими кривыми Безье и фиксируется в векторе SVG с отпечатком SHA-256.
								</p>

								{/* Сенсорная SVG-панель без использования Canvas */}
								<div
									style={{
										position: "relative",
										width: "100%",
										height: "140px",
										background: "var(--paper)",
										border: "1.5px dashed var(--line-strong, var(--teal))",
										borderRadius: "8px",
										touchAction: "none",
										userSelect: "none",
									}}
								>
									<svg
										data-testid="consent-vector-pad-svg"
										style={{
											width: "100%",
											height: "100%",
											display: "block",
											cursor: "crosshair",
										}}
										onPointerDown={handlePointerDown}
										onPointerMove={handlePointerMove}
										onPointerUp={handlePointerUp}
										onPointerLeave={handlePointerUp}
									>
										{strokes.length === 0 && currentPoints.length === 0 && (
											<text
												x="50%"
												y="50%"
												textAnchor="middle"
												dominantBaseline="middle"
												fill="var(--muted, #94a3b8)"
												fontSize="13"
												style={{ pointerEvents: "none", userSelect: "none" }}
											>
												Поставьте подпись на сенсорном экране (векторный ввод)
											</text>
										)}
										{strokes.map((stroke, sIdx) => {
											if (stroke.points.length === 1 && stroke.points[0]) {
												return (
													<circle
														key={sIdx}
														cx={stroke.points[0].x}
														cy={stroke.points[0].y}
														r={1.5}
														fill={stroke.color || "var(--ink, #0f172a)"}
													/>
												);
											}
											const d = renderStrokeToSvgPath(stroke.points);
											if (!d) return null;
											return (
												<path
													key={sIdx}
													d={d}
													fill="none"
													stroke={stroke.color || "var(--ink, #0f172a)"}
													strokeWidth={2}
													strokeLinecap="round"
													strokeLinejoin="round"
												/>
											);
										})}
										{currentPoints.length > 1 && (
											<path
												d={renderStrokeToSvgPath(currentPoints)}
												fill="none"
												stroke="var(--teal, #0d9488)"
												strokeWidth={2}
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										)}
									</svg>
								</div>

								<div className="flex items-center gap-3 pt-1 flex-wrap">
									<button
										type="button"
										className="consent-action-btn primary"
										data-testid="btn-confirm-tablet-signed"
										onClick={() => handleConfirmSign("tablet_stylus")}
										disabled={isSubmitting}
										style={{
											minHeight: "44px",
											fontSize: "14px",
											fontWeight: "bold",
											background: "var(--teal)",
											color: "var(--on-teal, #ffffff)",
											boxShadow: "var(--shadow-1)",
										}}
									>
										<Zap size={18} />
										<span>
											{activeMode === "packages"
												? `Подтвердить векторный пакет (${currentPackage.templateKeys.length} док.) в 1 клик`
												: "Подтвердить векторную подпись (1 клик)"}
										</span>
									</button>
									<button
										type="button"
										className="consent-tool-btn"
										data-testid="btn-download-pdfa-tablet"
										onClick={handleDownloadPdfA}
										title="Скачать архивный документ ISO 19005-1 PDF/A-1b с векторной подписью"
									>
										<Download size={16} />
										<span>Скачать PDF/A</span>
									</button>
								</div>
							</>
						)}
					</div>

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

				{/* Footer */}
				<footer className="consent-modal-footer">
					<div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
						<button
							type="button"
							className="consent-action-btn secondary"
							onClick={handlePrint}
							title={
								activeMode === "packages"
									? "Многостраничная печать заполненного пакета ИДС (А4)"
									: "Печать заполненного бланка ИДС на принтер (А4)"
							}
						>
							<Printer size={18} />
							<span>{activeMode === "packages" ? "Печать пакета (А4)" : "Печать бланка (А4)"}</span>
						</button>

						<button
							type="button"
							className="consent-action-btn secondary"
							data-testid="btn-download-pdfa"
							onClick={handleDownloadPdfA}
							title="Скачать архивный документ ISO 19005-1 PDF/A-1b с вшитым криптографическим отпечатком"
						>
							<Download size={18} />
							<span>Скачать PDF/A</span>
						</button>

						{/* Вторичные действия вынесены в компактное меню ... по Закону Миллера (Мандат 8d) */}
						<div className="relative inline-flex items-center">
							<button
								type="button"
								className="consent-action-btn secondary px-2.5 min-w-[40px]"
								onClick={() => setIsMoreMenuOpen((v) => !v)}
								title="Дополнительные действия (чистые бланки, памятка пациенту, закрыть)"
								aria-label="Дополнительные действия"
								data-testid="consent-modal-more-btn"
							>
								<MoreHorizontal size={18} />
							</button>

							{isMoreMenuOpen && (
								<div
									className="fixed inset-0 z-30 cursor-default"
									onClick={() => setIsMoreMenuOpen(false)}
									aria-hidden="true"
								/>
							)}

							<div
								className={`absolute left-0 bottom-full mb-2 w-72 rounded-xl border border-[var(--line)] bg-[var(--paper)] shadow-2xl z-40 py-1.5 ${
									isMoreMenuOpen ? "block" : "hidden"
								}`}
								style={{ background: "var(--paper)", border: "1px solid var(--line)" }}
								data-testid="consent-modal-more-menu"
							>
								<button
									type="button"
									className="consent-action-btn secondary w-full !justify-start !border-none !bg-transparent hover:!bg-[var(--paper-soft)] !min-h-[38px] !px-3 !py-2 text-xs text-[var(--ink)] cursor-pointer"
									data-testid="btn-print-blank-consent"
									onClick={() => {
										setIsMoreMenuOpen(false);
										handlePrintBlank();
									}}
									title={
										activeMode === "packages"
											? "Печать чистых бланков всего пакета со строками «________» для ручного заполнения"
											: "Печать чистого бланка со строками «________» для ручного заполнения"
									}
								>
									<FileText size={16} className="text-[var(--muted)] shrink-0" />
									<span className="truncate">
										{activeMode === "packages" ? "Печать чистых бланков пакета («________»)" : "Печать чистого бланка («________»)"}
									</span>
								</button>
								<button
									type="button"
									onClick={() => {
										setIsMoreMenuOpen(false);
										handleCopyPatientSummary();
									}}
									data-testid="consent-copy-patient-text-btn"
									className="consent-action-btn secondary w-full !justify-start !border-none !bg-transparent hover:!bg-[var(--paper-soft)] !min-h-[38px] !px-3 !py-2 text-xs text-[var(--ink)] cursor-pointer"
									title="Скопировать выжимку ИДС и памятку для отправки пациенту в WhatsApp/Telegram"
								>
									<Copy size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
									<span className="truncate">Скопировать для пациента</span>
								</button>
								<button
									type="button"
									className="consent-action-btn secondary w-full !justify-start !border-none !bg-transparent hover:!bg-[var(--paper-soft)] !min-h-[38px] !px-3 !py-2 text-xs text-[var(--ink)] cursor-pointer"
									data-testid="btn-download-pdfa-menu"
									onClick={() => {
										setIsMoreMenuOpen(false);
										handleDownloadPdfA();
									}}
									title="Скачать архивный документ ISO 19005-1 PDF/A-1b"
								>
									<Download size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
									<span className="truncate">Скачать архивный PDF/A</span>
								</button>
								<div className="my-1 border-t border-[var(--line)]" />
								<button
									type="button"
									className="consent-action-btn secondary w-full !justify-start !border-none !bg-transparent hover:!bg-[var(--paper-soft)] !min-h-[38px] !px-3 !py-2 text-xs text-[var(--muted)] hover:!text-[var(--ink)] cursor-pointer"
									onClick={() => {
										setIsMoreMenuOpen(false);
										onClose();
									}}
								>
									<X size={16} className="shrink-0" />
									<span>Отмена (закрыть)</span>
								</button>
							</div>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<button
							type="button"
							className="consent-action-btn primary"
							data-testid="btn-confirm-sign"
							onClick={() => handleConfirmSign()}
							disabled={isSubmitting}
						>
							<Zap size={18} />
							<span>
								{activeMode === "packages"
									? `Подтвердить пакет (${currentPackage.templateKeys.length} док.) в 1 клик`
									: "Подтвердить подписание на бумаге (1 клик)"}
							</span>
						</button>
					</div>
				</footer>
			</div>
		</div>
	);

	if (typeof document === "undefined" || !document.body) {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};
