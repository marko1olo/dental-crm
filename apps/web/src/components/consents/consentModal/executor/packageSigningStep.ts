import { generateConsentIntegrityHash } from "../../signaturePadMath.js";
import {
	getConsentTemplate,
	renderConsentTemplate,
} from "../../consentTemplates.js";
import { persistSignedConsentToBackend } from "./backendConsentPersistence";
import { buildPackageDocPayload } from "./packageDocPayloadBuilder";
import type {
	ConsentTemplateKey,
	ConsentSubstitutionContext,
	SignedConsentPayload,
	VerificationMethod,
	SignatureStroke,
	SignatureVectorData,
} from "../types.js";

export async function executePackageSigningStep(params: {
	pkg: { code: string; title: string; templateKeys: readonly ConsentTemplateKey[] };
	effectiveContext: ConsentSubstitutionContext;
	substitutionContext: ConsentSubstitutionContext;
	effectiveMethod: VerificationMethod;
	strokes: SignatureStroke[];
	smsOtpCode: string;
	svg: string;
	pngBase64: string;
	vectorData: SignatureVectorData;
	paperScanFile: File | null;
	effectivePatientId?: string | null | undefined;
	visitId?: string | null | undefined;
	onConsentSigned?: ((payload: SignedConsentPayload) => void) | undefined;
	onPackageSigned?: ((payloads: SignedConsentPayload[]) => void) | undefined;
	onConsentConfirmed?: ((payload: {
		consentType: string;
		intervention: string;
		toothOrArea: string;
		confirmedAt: string;
		integrityHash?: string;
	}) => void) | undefined;
}): Promise<void> {
	const {
		pkg,
		effectiveContext,
		substitutionContext,
		effectiveMethod,
		strokes,
		smsOtpCode,
		svg,
		pngBase64,
		vectorData,
		paperScanFile,
		effectivePatientId,
		visitId,
		onConsentSigned,
		onPackageSigned,
		onConsentConfirmed,
	} = params;

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

		const payload = buildPackageDocPayload({
			tplKey,
			tpl,
			renderedText: rend.fullTextContent,
			effectiveContext,
			docHash: docHashRecord.hash,
			effectiveMethod,
			smsOtpCode,
			svg,
			pngBase64,
			docVectorData: { ...vectorData, integrityHash: docHashRecord.hash },
			paperScanFile,
			pkgTitle: pkg.title,
		});

		signedPayloads.push(payload);

		await persistSignedConsentToBackend({
			patientId: effectivePatientId,
			visitId,
			consentKey: tplKey,
			template: tpl,
			payload,
			effectiveContext,
			svg,
			effectiveMethod,
		});

		if (onConsentSigned) onConsentSigned(payload);
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

	if (onPackageSigned) onPackageSigned(signedPayloads);
}
