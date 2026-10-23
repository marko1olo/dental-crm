import type {
	ConsentTemplateKey,
	ConsentTemplate,
	ConsentSubstitutionContext,
	SignedConsentPayload,
	VerificationMethod,
	SignatureVectorData,
} from "../types.js";

export function buildPackageDocPayload(params: {
	tplKey: ConsentTemplateKey;
	tpl: ConsentTemplate;
	renderedText: string;
	effectiveContext: ConsentSubstitutionContext;
	docHash: string;
	effectiveMethod: VerificationMethod;
	smsOtpCode: string;
	svg: string;
	pngBase64: string;
	docVectorData: SignatureVectorData;
	paperScanFile: File | null;
	pkgTitle: string;
}): SignedConsentPayload {
	const {
		tplKey,
		tpl,
		renderedText,
		effectiveContext,
		docHash,
		effectiveMethod,
		smsOtpCode,
		svg,
		pngBase64,
		docVectorData,
		paperScanFile,
		pkgTitle,
	} = params;

	return {
		templateKey: tplKey,
		code: tpl.code,
		title: tpl.title,
		fullTextContent: renderedText,
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
		integrityHash: docHash,
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
					: "Бумажный оригинал пакета подписан пациентом (хранится в карте)"
				: effectiveMethod === "sms_otp"
				? "Пакет согласий подписан через SMS"
				: "Электронный пакет согласий подписан на планшете (векторная подпись)",
		note: `Пакет: ${pkgTitle}`,
	};
}
