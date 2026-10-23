import {
	generatePaperSignatureSvg,
	type SignatureStroke,
	exportSignatureToSvg,
	generatePdfA1bDocument,
	downloadConsentPdfA,
} from "../signaturePadMath.js";
import { generateSmsPepSignatureSvg } from "../consentIntegrityHash.js";
import { cleanPrintableConsentText } from "../consentSummaryHelper.js";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { showToast } from "../../GlobalToast.js";
import type {
	ConsentSubstitutionContext,
	ConsentTemplate,
	RenderedConsentTemplate,
} from "../consentTemplates.js";
import type {
	InformedConsentPatientInfo,
	VerificationMethod,
} from "./types.js";

export function downloadConsentAsPdfA(params: {
	verificationMethod: VerificationMethod;
	strokes: SignatureStroke[];
	effectiveContext: ConsentSubstitutionContext;
	substitutionContext: ConsentSubstitutionContext;
	patient?: InformedConsentPatientInfo | null | undefined;
	paperScanFile: File | null;
	integrityHash: string;
	rendered: RenderedConsentTemplate;
	currentTemplate: ConsentTemplate;
	clinicPhone: string;
}): void {
	const {
		verificationMethod,
		strokes,
		effectiveContext,
		substitutionContext,
		patient,
		paperScanFile,
		integrityHash,
		rendered,
		currentTemplate,
		clinicPhone,
	} = params;

	try {
		let sigSvg = "";
		if (verificationMethod === "tablet_stylus" && strokes.length > 0) {
			sigSvg = exportSignatureToSvg(strokes, 400, 140, { strokeColor: "#0f172a" });
		} else if (verificationMethod === "sms_otp") {
			sigSvg = generateSmsPepSignatureSvg({
				patientFullName: effectiveContext.patientName ? effectiveContext.patientName : undefined,
				phoneMasked: (substitutionContext.phone || patient?.phone)
					? String(substitutionContext.phone || patient?.phone)
					: undefined,
				timestampIso: new Date().toISOString(),
				integrityHash,
				clinicName:
					effectiveContext.clinicName ||
					(isDemoShowcaseMode()
						? "ООО «Стоматологическая клиника ДЕНТЕ»"
						: "«________________________________________»"),
			});
		} else {
			sigSvg = generatePaperSignatureSvg({
				date: effectiveContext.date || new Date().toLocaleDateString("ru-RU"),
				clinicName:
					effectiveContext.clinicName ||
					(isDemoShowcaseMode()
						? "ООО «Стоматологическая клиника ДЕНТЕ»"
						: "«________________________________________»"),
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
			integrityHash,
			strokes: verificationMethod === "tablet_stylus" ? strokes : undefined,
			signatureSvg: sigSvg,
			verificationMethod,
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
}
