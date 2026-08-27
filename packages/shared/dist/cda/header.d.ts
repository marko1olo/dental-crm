/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CDA R2 CLINICAL DOCUMENT HEADER & PARTICIPANTS BUILDER (МИНЗДРАВ РФ)
 * Compliant with HL7 CDA R2 (POCD_MT000040.xsd) and EGISZ REMD profile.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { ClinicCdaInfo, DoctorCdaInfo, LegalAuthenticatorCdaInfo, PatientCdaInfo, SemdDocKind } from "./types.js";
export interface CdaHeaderOptions {
    docKind: SemdDocKind;
    docTypeNsiCode: string;
    docTitle: string;
    templateOids: string[];
    documentId: string;
    documentVersion?: number | undefined;
    documentTime?: Date | undefined;
    visitDate: Date;
    encounterId?: string | undefined;
    documentSetId?: string | undefined;
    replacesDocumentId?: string | undefined;
    patient: PatientCdaInfo;
    doctor: DoctorCdaInfo;
    clinic: ClinicCdaInfo;
    legalAuthenticator?: LegalAuthenticatorCdaInfo | undefined;
}
export declare function buildCdaRecordTarget(patient: PatientCdaInfo, clinicOid: string): string;
export declare function buildCdaClinicOrganization(clinic: ClinicCdaInfo): string;
export declare function buildCdaAuthor(doctor: DoctorCdaInfo, clinic: ClinicCdaInfo, effectiveTime: string): string;
export declare function buildCdaCustodian(clinic: ClinicCdaInfo): string;
export declare function buildCdaLegalAuthenticator(legalAuth: LegalAuthenticatorCdaInfo | undefined, doctor: DoctorCdaInfo, clinic: ClinicCdaInfo, effectiveTime: string): string;
export declare function generateClinicalDocumentHeader(opts: CdaHeaderOptions): string;
