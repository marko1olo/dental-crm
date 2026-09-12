import {
	canonicalizeCdaXml,
	detachedSignatureSchema,
	egiszRemdPackageSchema,
	type DetachedSignature,
	type EgiszRemdPackage as SharedEgiszRemdPackage,
} from "@dental/shared";

export {
	canonicalizeCdaXml,
	detachedSignatureSchema,
	egiszRemdPackageSchema,
	type DetachedSignature,
} from "@dental/shared";

export type EgiszRemdPackage = Omit<SharedEgiszRemdPackage, "docTypeNsiCode"> & {
	docTypeNsiCode?: string | undefined;
};

/**
 * Валидирует и формирует канонический пакет СЭМД РЭМД ЕГИСЗ с двойной отсоединенной подписью CAdES-BES.
 */
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
	const canonicalXml = canonicalizeCdaXml(params.rawXml);
	const docType = params.docTypeNsiCode ?? "108";

	const pkg = {
		documentId: params.documentId,
		documentVersion: params.documentVersion,
		docTypeNsiCode: docType,
		xmlCanonicalPayload: canonicalXml,
		doctorSignature: params.doctorSignature,
		moSignature: params.moSignature,
		metadata: {
			patientSnils: params.patientSnils,
			clinicOid: params.clinicOid,
			clinicOgrn: params.clinicOgrn,
			docTypeNsiCode: docType,
		},
	};

	return egiszRemdPackageSchema.parse(pkg);
}

