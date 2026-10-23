import { denteAdminSecretRequestHeaders } from "../../../../lib/denteRequestHeaders.js";
import type {
	ConsentTemplateKey,
	ConsentTemplate,
	SignedConsentPayload,
	ConsentSubstitutionContext,
	VerificationMethod,
} from "../types.js";

export async function recordConsentToPatientTimeline(params: {
	patientId: string;
	visitId?: string | null | undefined;
	consentKey: ConsentTemplateKey;
	template: ConsentTemplate;
	payload: SignedConsentPayload;
	effectiveContext: ConsentSubstitutionContext;
	svg: string;
	effectiveMethod: VerificationMethod;
}): Promise<void> {
	try {
		await fetch(`/api/patients/${encodeURIComponent(params.patientId)}/consents`, {
			method: "POST",
			headers: denteAdminSecretRequestHeaders({
				"Content-Type": "application/json",
			}),
			body: JSON.stringify({
				templateKey: params.consentKey,
				code: params.template.code,
				title: params.template.title,
				fullTextContent: params.payload.fullTextContent,
				patientName: params.effectiveContext.patientName,
				birthDate: params.effectiveContext.birthDate,
				passport: params.effectiveContext.passport,
				doctorName: params.effectiveContext.doctorName,
				clinicName: params.effectiveContext.clinicName,
				diagnosisIcd: params.effectiveContext.diagnosisIcd,
				toothNumbers: params.effectiveContext.toothNumbers,
				signatureSvg: params.svg || "",
				signaturePngBase64: params.payload.signaturePngBase64,
				vectorData: params.payload.vectorData,
				integrityHash: params.payload.integrityHash,
				signedAt: params.payload.signedAt,
				verificationMethod: params.effectiveMethod,
				smsOtpCode: params.payload.smsOtpCode,
				attachedToForm043u: true,
				visitId: params.visitId,
			}),
		});
	} catch (err) {
		console.warn("Could not record consent directly to patient timeline:", err);
	}
}
