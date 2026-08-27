/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD UKEP SIGNATURE & PACKAGE PROTOCOL (ГОСТ Р 34.10-2012 / CAdES-BES)
 * Handles detached CMS PKCS#7 signature packaging for doctor & clinic.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { DetachedSignature, EgiszRemdPackage } from "./types.js";
/**
 * Builds a deterministic, validated EGISZ REMD submission package.
 */
export declare function buildEgiszRemdPackage(params: {
    documentId: string;
    documentVersion: number;
    docTypeNsiCode: string;
    rawXml: string;
    doctorSignature: DetachedSignature;
    moSignature?: DetachedSignature | undefined;
    patientSnils?: string | undefined;
    clinicOid: string;
    clinicOgrn?: string | undefined;
}): EgiszRemdPackage;
export declare const buildEgiszRemdSubmissionPackage: typeof buildEgiszRemdPackage;
/**
 * Prepares payload and base64 digest for CryptoPro Browser plug-in UKEP signing.
 */
export declare function prepareUkepSigningPayload(xml: string): {
    rawXml: string;
    canonicalXml: string;
    sha256Hex: string;
    base64Content: string;
};
/**
 * Generates an authentic demonstration GOST R 34.10-2012 UKEP signature container for unit tests & development.
 */
export declare function createDemonstrationGostSignature(params: {
    doctorName: string;
    doctorSnils: string;
    clinicName: string;
    isMoSignature?: boolean | undefined;
}): DetachedSignature;
