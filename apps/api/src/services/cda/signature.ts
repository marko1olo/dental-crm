/**
 * apps/api/src/services/cda/signature.ts
 *
 * Facade delegating CDA/EGISZ signature operations to canonical @dental/shared/cda per Mandate 8s.
 */

export * from "@dental/shared/cda";
import {
	canonicalizeCdaXml,
	egiszRemdPackageSchema,
	type DetachedSignature,
	type EgiszRemdPackage,
} from "@dental/shared/cda";

export function buildEgiszRemdSubmissionPackage(params: {
	documentId: string;
	documentVersion: number;
	rawXml: string;
	doctorSignature: DetachedSignature;
	moSignature?: DetachedSignature | undefined;
	patientSnils: string;
	clinicOid: string;
	clinicOgrn?: string | undefined;
	docTypeNsiCode?: string | undefined;
}): EgiszRemdPackage {
	const docType = params.docTypeNsiCode ?? "108";
	return egiszRemdPackageSchema.parse({
		documentId: params.documentId,
		documentVersion: params.documentVersion,
		docTypeNsiCode: docType,
		xmlCanonicalPayload: canonicalizeCdaXml(params.rawXml),
		doctorSignature: params.doctorSignature,
		moSignature: params.moSignature,
		metadata: {
			patientSnils: params.patientSnils,
			clinicOid: params.clinicOid,
			clinicOgrn: params.clinicOgrn,
			docTypeNsiCode: docType,
		},
	});
}
