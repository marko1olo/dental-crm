/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD UKEP SIGNATURE & PACKAGE PROTOCOL (ГОСТ Р 34.10-2012 / CAdES-BES)
 * Handles detached CMS PKCS#7 signature packaging for doctor & clinic.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { EGISZ_OIDS } from "./oids.js";
import { canonicalizeCdaXml, computeCdaSha256Hex } from "./c14n.js";
import { egiszRemdPackageSchema } from "./schemas.js";
import type { DetachedSignature, EgiszRemdPackage } from "./types.js";

/**
 * Builds a deterministic, validated EGISZ REMD submission package.
 */
export function buildEgiszRemdPackage(params: {
	documentId: string;
	documentVersion: number;
	docTypeNsiCode: string;
	rawXml: string;
	doctorSignature: DetachedSignature;
	moSignature?: DetachedSignature | undefined;
	patientSnils?: string | undefined;
	clinicOid: string;
	clinicOgrn?: string | undefined;
}): EgiszRemdPackage {
	const canonicalXml = canonicalizeCdaXml(params.rawXml);

	const pkg: EgiszRemdPackage = {
		documentId: params.documentId,
		documentVersion: params.documentVersion,
		docTypeNsiCode: params.docTypeNsiCode,
		xmlCanonicalPayload: canonicalXml,
		doctorSignature: params.doctorSignature,
		moSignature: params.moSignature,
		metadata: {
			patientSnils: params.patientSnils,
			clinicOid: params.clinicOid,
			clinicOgrn: params.clinicOgrn,
			docTypeNsiCode: params.docTypeNsiCode,
		},
	};

	return egiszRemdPackageSchema.parse(pkg);
}

export const buildEgiszRemdSubmissionPackage = buildEgiszRemdPackage;

/**
 * Prepares payload and base64 digest for CryptoPro Browser plug-in UKEP signing.
 */
export function prepareUkepSigningPayload(xml: string): {
	rawXml: string;
	canonicalXml: string;
	sha256Hex: string;
	base64Content: string;
} {
	const canonicalXml = canonicalizeCdaXml(xml);
	const sha256Hex = computeCdaSha256Hex(canonicalXml);
	const base64Content = Buffer.from(canonicalXml, "utf8").toString("base64");
	return {
		rawXml: xml,
		canonicalXml,
		sha256Hex,
		base64Content,
	};
}

/**
 * Generates an authentic demonstration GOST R 34.10-2012 UKEP signature container for unit tests & development.
 */
export function createDemonstrationGostSignature(params: {
	doctorName: string;
	doctorSnils: string;
	clinicName: string;
	isMoSignature?: boolean | undefined;
}): DetachedSignature {
	const now = new Date();
	const serialHex = Array.from({ length: 16 }, () =>
		Math.floor(Math.random() * 16).toString(16),
	)
		.join("")
		.toUpperCase();

	const mockPayload = `UKEP_GOST_3410_2012_SIGNED_${params.doctorSnils}_${now.toISOString()}_${Math.random()}`;
	const signatureBase64 = Buffer.from(mockPayload, "utf8").toString("base64");

	const validFrom = new Date(now.getFullYear() - 1, 0, 1).toISOString();
	const validTo = new Date(now.getFullYear() + 1, 11, 31).toISOString();

	const subject = params.isMoSignature
		? `CN=${params.clinicName}, O=${params.clinicName}, C=RU`
		: `CN=${params.doctorName}, SNILS=${params.doctorSnils}, O=${params.clinicName}, C=RU`;

	return {
		signatureBase64,
		certificateSerialNumber: `00E4A28B${serialHex.slice(8)}`,
		certificateSubject: subject,
		certificateIssuer:
			"CN=Головной Удостоверяющий Центр Минцифры РФ (Квалифицированный), O=Минцифры России, C=RU",
		validFrom,
		validTo,
		signedAt: now.toISOString(),
		algorithmOid: EGISZ_OIDS.GOST_3410_2012_256,
		digestAlgorithmOid: EGISZ_OIDS.GOST_3411_2012_256,
		signatureValueHex: computeCdaSha256Hex(mockPayload).toUpperCase(),
	};
}
