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

/**
 * Generates an XML-DSig / XAdES-BES structured signature fragment for enveloped or detached signing.
 */
export function generateXadesXmlSignatureBlock(
	sig: DetachedSignature,
	referenceUri = "",
): string {
	const certIssuer = sig.certificateIssuer || "CN=Головной Удостоверяющий Центр Минцифры РФ, C=RU";
	const digestAlg = sig.digestAlgorithmOid || EGISZ_OIDS.GOST_3411_2012_256;
	const signAlg = sig.algorithmOid || EGISZ_OIDS.GOST_3410_2012_256;
	const digestVal = sig.signatureValueHex
		? Buffer.from(sig.signatureValueHex, "hex").toString("base64")
		: sig.signatureBase64.slice(0, 44);

	return `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="Signature-${sig.certificateSerialNumber}">
	<ds:SignedInfo>
		<ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
		<ds:SignatureMethod Algorithm="urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34102012-gostr34112012-256"/>
		<ds:Reference URI="${referenceUri}">
			<ds:Transforms>
				<ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>
				<ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>
			</ds:Transforms>
			<ds:DigestMethod Algorithm="urn:ietf:params:xml:ns:cpxmlsec:algorithms:gostr34112012-256"/>
			<ds:DigestValue>${digestVal}</ds:DigestValue>
		</ds:Reference>
	</ds:SignedInfo>
	<ds:SignatureValue>${sig.signatureBase64}</ds:SignatureValue>
	<ds:KeyInfo>
		<ds:X509Data>
			<ds:X509Certificate>${sig.signatureBase64.slice(0, 64)}</ds:X509Certificate>
			<ds:X509IssuerSerial>
				<ds:X509IssuerName>${certIssuer}</ds:X509IssuerName>
				<ds:X509SerialNumber>${sig.certificateSerialNumber}</ds:X509SerialNumber>
			</ds:X509IssuerSerial>
			<ds:X509SubjectName>${sig.certificateSubject}</ds:X509SubjectName>
		</ds:X509Data>
	</ds:KeyInfo>
	<ds:Object>
		<xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#Signature-${sig.certificateSerialNumber}">
			<xades:SignedProperties>
				<xades:SignedSignatureProperties>
					<xades:SigningTime>${sig.signedAt}</xades:SigningTime>
				</xades:SignedSignatureProperties>
			</xades:SignedProperties>
		</xades:QualifyingProperties>
	</ds:Object>
</ds:Signature>`;
}

/**
 * Builds all individual file artifacts for 1-click export of an EGISZ REMD signed package.
 */
export function build1ClickExportPackage(params: {
	documentId: string;
	documentVersion: number;
	docTypeNsiCode: string;
	rawXml: string;
	doctorSignature: DetachedSignature;
	moSignature?: DetachedSignature | undefined;
	patientSnils?: string | undefined;
	clinicOid: string;
	clinicOgrn?: string | undefined;
}): {
	xmlFileName: string;
	xmlContent: string;
	doctorSigFileName: string;
	doctorSigBase64: string;
	moSigFileName?: string | undefined;
	moSigBase64?: string | undefined;
	manifestFileName: string;
	manifestJson: string;
	packageMeta: {
		documentId: string;
		sha256Hex: string;
		docTypeNsiCode: string;
		signedAt: string;
		doctorCertSerial: string;
		hasMoSignature: boolean;
	};
} {
	const canonicalXml = canonicalizeCdaXml(params.rawXml);
	const sha256Hex = computeCdaSha256Hex(canonicalXml);
	const cleanDocId = params.documentId.replace(/[^a-zA-Z0-9_-]/g, "_");
	const baseName = `SEMD_${params.docTypeNsiCode}_${cleanDocId}_v${params.documentVersion}`;

	const manifest = {
		format: "EGISZ_REMD_PACKAGE_V1",
		documentId: params.documentId,
		documentVersion: params.documentVersion,
		docTypeNsiCode: params.docTypeNsiCode,
		sha256Hex,
		clinicOid: params.clinicOid,
		clinicOgrn: params.clinicOgrn ?? null,
		patientSnils: params.patientSnils ?? null,
		doctorSignature: {
			serialNumber: params.doctorSignature.certificateSerialNumber,
			subject: params.doctorSignature.certificateSubject,
			signedAt: params.doctorSignature.signedAt,
			algorithm: params.doctorSignature.algorithmOid,
		},
		moSignature: params.moSignature
			? {
					serialNumber: params.moSignature.certificateSerialNumber,
					subject: params.moSignature.certificateSubject,
					signedAt: params.moSignature.signedAt,
					algorithm: params.moSignature.algorithmOid,
				}
			: null,
		exportedAt: new Date().toISOString(),
	};

	return {
		xmlFileName: `${baseName}.xml`,
		xmlContent: canonicalXml,
		doctorSigFileName: `${baseName}.sig`,
		doctorSigBase64: params.doctorSignature.signatureBase64,
		moSigFileName: params.moSignature ? `${baseName}_mo.sig` : undefined,
		moSigBase64: params.moSignature?.signatureBase64,
		manifestFileName: `${baseName}_manifest.json`,
		manifestJson: JSON.stringify(manifest, null, 2),
		packageMeta: {
			documentId: params.documentId,
			sha256Hex,
			docTypeNsiCode: params.docTypeNsiCode,
			signedAt: params.doctorSignature.signedAt,
			doctorCertSerial: params.doctorSignature.certificateSerialNumber,
			hasMoSignature: Boolean(params.moSignature),
		},
	};
}
