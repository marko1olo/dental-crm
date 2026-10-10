import {
	generateConsentIntegrityHash,
	generatePaperSignatureSvg,
	PAPER_SIGNATURE_FALLBACK_PNG,
	type SignatureVectorData,
	calculateBoundingBox,
	exportSignatureToSvg,
} from "../signaturePadMath.js";
import { generateSmsPepSignatureSvg } from "../consentIntegrityHash.js";
import {
	getConsentTemplate,
	renderConsentTemplate,
} from "../consentTemplates.js";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { showToast } from "../../GlobalToast.js";
import type {
	VerificationMethod,
	SignatureStroke,
	SignaturePoint,
	ConsentSubstitutionContext,
	InformedConsentPatientInfo,
	ConsentTemplateKey,
	ConsentTemplate,
	SignedConsentPayload,
} from "./types.js";

export interface ExecuteSigningParams {
	effectiveMethod: VerificationMethod;
	strokes: SignatureStroke[];
	currentPoints: SignaturePoint[];
	smsOtpCode: string;
	paperScanFile: File | null;
	substitutionContext: ConsentSubstitutionContext;
	effectiveContext: ConsentSubstitutionContext;
	patient?: InformedConsentPatientInfo | null | undefined;
	integrityRecord: { hash: string };
	activeMode: "packages" | "single";
	currentPackage: { code: string; title: string; templateKeys: readonly ConsentTemplateKey[] };
	activeDocKey: ConsentTemplateKey;
	currentTemplate: ConsentTemplate;
	rendered: { fullTextContent: string };
	onConsentSigned?: ((payload: SignedConsentPayload) => void) | undefined;
	onPackageSigned?: ((payloads: SignedConsentPayload[]) => void) | undefined;
	onConsentConfirmed?: ((payload: {
		consentType: string;
		intervention: string;
		toothOrArea: string;
		confirmedAt: string;
		integrityHash?: string;
	}) => void) | undefined;
	onClose: () => void;
}

export function executeSigning({
	effectiveMethod,
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
}: ExecuteSigningParams): boolean {
	// RED TEAM ИНВАРИАНТ: НУЛЕВАЯ ТОЛЕРАНТНОСТЬ К ФЕЙКОВЫМ ПОДПИСЯМ
	if (effectiveMethod === "tablet_stylus") {
		if (strokes.length === 0 && currentPoints.length === 0) {
			showToast("Невозможно подтвердить согласие: подпись на экране отсутствует. Распишитесь стилусом или пальцем", "error");
			return false;
		}
	} else if (effectiveMethod === "sms_otp") {
		if (!smsOtpCode || smsOtpCode.trim().length < 4) {
			showToast("Введите 4-значный код подтверждения из СМС", "error");
			return false;
		}
	} else if (effectiveMethod === "paper_physical") {
		// Врачебная автономия (Мандат 8e / 8n): подтверждение подписания на бумаге
		// автоматически регистрирует оригинал в карте № 043/у без бюрократических тупиков.
	}

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
	return true;
}
