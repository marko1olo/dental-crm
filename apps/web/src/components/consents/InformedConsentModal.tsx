import {
	Check,
	Copy,
	Lock,
	ShieldCheck,
	X,
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
import {
	buildPatientConsentSummary,
	type PatientConsentSummaryParams,
	type SignedConsentPayload,
} from "./consentSummaryHelper.js";
import { ConsentDocumentSheet } from "./ConsentDocumentSheet.js";
import { ConsentSigningPanel } from "./ConsentSigningPanel.js";
import { ConsentModalFooter } from "./ConsentModalFooter.js";
import { ConsentToolbarAndBanner } from "./ConsentToolbarAndBanner.js";

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
					{/* Просмотр текста согласия */}
					<ConsentDocumentSheet
						rendered={rendered}
						effectiveContext={effectiveContext}
						effectiveWatermark={effectiveWatermark}
						stampColor={stampColor}
						isClosedOrSigned={isClosedOrSigned}
					/>

					{/* Блок подтверждения бумажного оригинала или векторного планшета (323-ФЗ ст. 20) */}
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
					/>

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
				<ConsentModalFooter
					activeMode={activeMode}
					packageDocsCount={currentPackage.templateKeys.length}
					isSubmitting={isSubmitting}
					onPrint={handlePrint}
					onPrintBlank={handlePrintBlank}
					onDownloadPdfA={handleDownloadPdfA}
					onCopyPatientSummary={handleCopyPatientSummary}
					onConfirmSign={() => handleConfirmSign()}
					onClose={onClose}
				/>
			</div>
		</div>
	);

	if (typeof document === "undefined" || !document.body) {
		return modalContent;
	}

	return createPortal(modalContent, document.body);
};
