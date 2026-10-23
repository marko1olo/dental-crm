import { persistSignedConsentToBackend } from "./backendConsentPersistence";
import type {
	ConsentTemplateKey,
	ConsentTemplate,
	ConsentSubstitutionContext,
	SignedConsentPayload,
	VerificationMethod,
	SignatureVectorData,
} from "../types.js";

export async function executeSingleSigningStep(params: {
	activeDocKey: ConsentTemplateKey;
	currentTemplate: ConsentTemplate;
	rendered: { fullTextContent: string };
	effectiveContext: ConsentSubstitutionContext;
	effectiveMethod: VerificationMethod;
	svg: string;
	pngBase64: string;
	vectorData: SignatureVectorData;
	integrityHash: string;
	smsOtpCode: string;
	paperScanFile: File | null;
	effectivePatientId?: string | null | undefined;
	visitId?: string | null | undefined;
	onConsentSigned?: ((payload: SignedConsentPayload) => void) | undefined;
	onConsentConfirmed?: ((payload: {
		consentType: string;
		intervention: string;
		toothOrArea: string;
		confirmedAt: string;
		integrityHash?: string;
	}) => void) | undefined;
}): Promise<void> {
	const {
		activeDocKey,
		currentTemplate,
		rendered,
		effectiveContext,
		effectiveMethod,
		svg,
		pngBase64,
		vectorData,
		integrityHash,
		smsOtpCode,
		paperScanFile,
		effectivePatientId,
		visitId,
		onConsentSigned,
		onConsentConfirmed,
	} = params;

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
		integrityHash,
		signedAt: new Date().toISOString(),
		verificationMethod: effectiveMethod,
		smsOtpCode: effectiveMethod === "sms_otp" ? smsOtpCode : null,
		attachedToForm043u: true,
		paperOriginalStored: effectiveMethod === "paper_physical",
		scanFileName: paperScanFile?.name || null,
		statusText:
			effectiveMethod === "paper_physical"
				? paperScanFile
					? `Скан бланка прикреплен («${paperScanFile.name}»)`
					: "Бумажный оригинал подписан пациентом (хранится в карте)"
				: effectiveMethod === "sms_otp"
				? "Подписано через SMS"
				: "Электронное согласие подписано на планшете (векторная подпись)",
	};

	await persistSignedConsentToBackend({
		patientId: effectivePatientId,
		visitId,
		consentKey: activeDocKey,
		template: currentTemplate,
		payload,
		effectiveContext,
		svg,
		effectiveMethod,
	});

	if (onConsentSigned) onConsentSigned(payload);
	if (onConsentConfirmed) {
		onConsentConfirmed({
			consentType: currentTemplate.code,
			intervention: currentTemplate.title,
			toothOrArea: effectiveContext.toothNumbers || "Область лечения",
			confirmedAt: new Date().toISOString(),
			integrityHash,
		});
	}
}
