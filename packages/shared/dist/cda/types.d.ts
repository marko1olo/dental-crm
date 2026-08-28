/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EGISZ REMD CDA R2 DATA CONTRACTS & TYPES (МИНЗДРАВ РФ)
 * Statutory electronic document types for SEMD 101, 104, 130 and UKEP CAdES-BES.
 * ═══════════════════════════════════════════════════════════════════════════
 */
export type SemdDocKind = "101" | "104" | "105" | "106" | "130" | "302" | "303" | "043u" | "108" | "043-1u" | "0431u" | "109";
export interface PersonName {
    first: string;
    last: string;
    middle?: string | undefined;
}
export interface IdentityDocument {
    /** Код вида документа по НСИ 1.2.643.5.1.13.13.11.1011 (1 - Паспорт РФ, 10 - Паспорт иностранца) */
    typeCode: string;
    series?: string | undefined;
    number: string;
    issuedBy?: string | undefined;
    issueDate?: string | undefined;
}
export interface PatientCdaInfo {
    patientId: string;
    name: PersonName;
    /** СНИЛС пациента (11 цифр). Может отсутствовать у иностранных граждан */
    snils?: string | null | undefined;
    birthDate: string | null;
    gender: "male" | "female" | "other" | null;
    polisOms?: string | null | undefined;
    polisDms?: string | null | undefined;
    identityDoc?: IdentityDocument | null | undefined;
    address?: string | null | undefined;
    addressFias?: string | null | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
    isForeignCitizen?: boolean | undefined;
}
export interface DoctorCdaInfo {
    name: PersonName;
    /** СНИЛС врача (11 цифр, обязателен по ФРМР) */
    snils?: string | undefined;
    position?: string | undefined;
    /** Код должности по классификатору ФРМР 1.2.643.5.1.13.13.11.1002 */
    positionCode?: string | undefined;
    /** Код специальности по номенклатуре 1.2.643.5.1.13.13.11.1066 */
    specialtyCode?: string | undefined;
    specialtyName?: string | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
}
export interface ClinicCdaInfo {
    name: string;
    /** OID медицинской организации в реестре ФРМО (1.2.643.5.1.13.13.12.2.*) */
    oid?: string | undefined;
    ogrn?: string | null | undefined;
    inn?: string | null | undefined;
    kpp?: string | null | undefined;
    licenseNumber?: string | null | undefined;
    licenseDate?: string | null | undefined;
    address?: string | null | undefined;
    legalAddress?: string | null | undefined;
    addressFias?: string | null | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
}
export interface LegalAuthenticatorCdaInfo {
    name?: PersonName | undefined;
    snils?: string | undefined;
    position?: string | undefined;
    positionCode?: string | undefined;
    time?: Date | undefined;
}
export type DentalToothSurface = "V" | "L" | "O" | "M" | "D" | "B" | "P" | "I" | "R" | "vestibular" | "lingual" | "palatal" | "occlusal" | "incisal" | "mesial" | "distal" | "root" | "buccal";
export interface DentalStatusItem {
    tooth: string | number;
    surfaces?: string[] | string | undefined;
    condition: string;
    conditionCode?: string | undefined;
    conditionName?: string | undefined;
    description?: string | undefined;
}
export interface DiagnosisItem {
    icd10Code: string;
    diagnosisText: string;
    tooth?: string | number | undefined;
    isPrimary?: boolean | undefined;
}
export interface ServiceRenderedItem {
    /** Код по Номенклатуре медицинских услуг (Приказ 804н) */
    code: string;
    name: string;
    quantity?: number | undefined;
    tooth?: string | number | undefined;
    priceRubKopecks?: number | undefined;
    /** Код услуги для налогового вычета: "1" - обычное лечение, "2" - дорогостоящее лечение */
    serviceCategoryCode?: "1" | "2" | undefined;
    completedAt?: Date | string | undefined;
}
export interface TaxPaymentRecordItem {
    fiscalReceiptNumber: string;
    fiscalReceiptDate: string;
    paymentAmountKopecks: number;
    /** "1" - обычные медуслуги, "2" - дорогостоящее лечение (Постановление Правительства № 458) */
    serviceCategoryCode: "1" | "2";
    contractNumber?: string | undefined;
    contractDate?: string | undefined;
    patientFullName?: string | undefined;
}
export interface TaxpayerInfo {
    fullName: string;
    snils?: string | undefined;
    inn?: string | undefined;
    birthDate?: string | undefined;
    /** Родственная связь с пациентом: "1" - сам налогоплательщик, "2" - супруг(а), "3" - родитель, "4" - ребенок до 18/24 лет */
    relationToPatient: "1" | "2" | "3" | "4";
}
export interface CdaSemd101Params {
    docKind: "101" | "043u" | "108";
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
    complaints?: string | undefined;
    anamnesis?: string | undefined;
    anamnesisVitae?: string | undefined;
    dentalStatus?: DentalStatusItem[] | undefined;
    objectiveStatus?: string | undefined;
    diagnoses: DiagnosisItem[];
    services?: ServiceRenderedItem[] | undefined;
    treatmentDescription?: string | undefined;
    recommendations?: string | string[] | undefined;
    complications?: string | undefined;
    comorbidities?: string | undefined;
    instrumentTrayBarcode?: string | undefined;
}
export interface CdaSemd104Params {
    docKind: "104";
    documentId: string;
    documentVersion?: number | undefined;
    documentTime?: Date | undefined;
    visitDate: Date;
    admissionDate?: Date | undefined;
    dischargeDate?: Date | undefined;
    encounterId?: string | undefined;
    documentSetId?: string | undefined;
    replacesDocumentId?: string | undefined;
    patient: PatientCdaInfo;
    doctor: DoctorCdaInfo;
    clinic: ClinicCdaInfo;
    legalAuthenticator?: LegalAuthenticatorCdaInfo | undefined;
    admissionDiagnoses?: DiagnosisItem[] | undefined;
    dischargeDiagnoses: DiagnosisItem[];
    anamnesis?: string | undefined;
    clinicalCourse?: string | undefined;
    initialDentalStatus?: DentalStatusItem[] | undefined;
    finalDentalStatus?: DentalStatusItem[] | undefined;
    objectiveStatus?: string | undefined;
    servicesRendered: ServiceRenderedItem[];
    surgeryProtocol?: string | undefined;
    anesthesiaProtocol?: string | undefined;
    radiologyStudiesSummary?: string | undefined;
    epicrisisText: string;
    outcomeCode?: "recovery" | "improvement" | "unchanged" | undefined;
    outcomeName?: string | undefined;
    recommendations: string | string[];
    nextFollowupDate?: string | Date | undefined;
}
export interface CdaSemd130Params {
    docKind: "130";
    documentId: string;
    documentVersion?: number | undefined;
    documentTime?: Date | undefined;
    issueDate: Date;
    taxYear: number;
    certificateNumber: string;
    patient: PatientCdaInfo;
    taxpayer: TaxpayerInfo;
    doctor: DoctorCdaInfo;
    clinic: ClinicCdaInfo;
    legalAuthenticator?: LegalAuthenticatorCdaInfo | undefined;
    contractNumber: string;
    contractDate: string;
    paymentRecords: TaxPaymentRecordItem[];
    totalOrdinaryTreatmentKopecks: number;
    totalExpensiveTreatmentKopecks: number;
    totalSumKopecks: number;
}
export type CdaSemd043uParams = CdaSemd101Params;
export type CdaSemd108Params = CdaSemd101Params;
export interface CdaOrthodonticAnthropometry {
    facialType?: "leptoprosopic" | "mesoprosopic" | "euryprosopic" | undefined;
    profileType?: "straight" | "convex" | "concave" | undefined;
    facialSymmetry?: "symmetric" | "chin_deviation_left" | "chin_deviation_right" | undefined;
    chinDeviationMm?: number | undefined;
    nasolabialAngleDegrees?: number | undefined;
    mentolabialSulcus?: "normal" | "deep_pronounced" | "smoothed" | undefined;
    lipCompetenceAtRest?: "competent_closed" | "incompetent_open" | "closed_with_strain" | undefined;
    incisalDisplayAtSmileMm?: number | undefined;
    gummySmileMm?: number | undefined;
    photoProtocolCompleted?: boolean | undefined;
}
export interface CdaOrthodonticCephalometry {
    snaAngle?: number | undefined;
    snbAngle?: number | undefined;
    anbAngle?: number | undefined;
    witsAppraisalMm?: number | undefined;
    fmaAngle?: number | undefined;
    snGoGnAngle?: number | undefined;
    upperIncisorToNaAngle?: number | undefined;
    upperIncisorToNaMm?: number | undefined;
    lowerIncisorToNbAngle?: number | undefined;
    lowerIncisorToNbMm?: number | undefined;
    interincisalAngle?: number | undefined;
    growthPattern?: "normodivergent" | "hyperdivergent_vertical" | "hypodivergent_horizontal" | undefined;
    skeletalClass?: "class_1" | "class_2_sub_1" | "class_2_sub_2" | "class_3" | undefined;
}
export interface CdaOrthodonticIndices {
    tonnIndexNotes?: string | undefined;
    pontIndexNotes?: string | undefined;
    boltonIndexNotes?: string | undefined;
    korkhausIndexNotes?: string | undefined;
}
export interface CdaOrthodonticAppliancePlan {
    applianceType?: string | undefined;
    alignerStepsCount?: number | undefined;
    extractionPlan?: string | undefined;
    treatmentStages?: string[] | undefined;
    estimatedDurationMonths?: number | undefined;
    retentionProtocol?: string | undefined;
}
export interface CdaSemd043_1uParams {
    docKind: "043-1u" | "0431u" | "109";
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
    orthodonticDiagnosis: string;
    icd10Code?: string | undefined;
    diagnoses?: DiagnosisItem[] | undefined;
    angleMolarClassRight?: "class_1" | "class_2_sub_1" | "class_2_sub_2" | "class_3" | undefined;
    angleMolarClassLeft?: "class_1" | "class_2_sub_1" | "class_2_sub_2" | "class_3" | undefined;
    angleCanineClassRight?: "class_1" | "class_2" | "class_3" | undefined;
    angleCanineClassLeft?: "class_1" | "class_2" | "class_3" | undefined;
    complaints?: string | undefined;
    anamnesis?: string | undefined;
    anamnesisVitae?: string | undefined;
    anthropometry?: CdaOrthodonticAnthropometry | undefined;
    cephalometry?: CdaOrthodonticCephalometry | undefined;
    indices?: CdaOrthodonticIndices | undefined;
    appliancePlan?: CdaOrthodonticAppliancePlan | undefined;
    dentalStatus?: DentalStatusItem[] | undefined;
    objectiveStatus?: string | undefined;
    services?: ServiceRenderedItem[] | undefined;
    recommendations?: string | string[] | undefined;
}
export type CdaSemd109Params = CdaSemd043_1uParams;
export type CdaDocumentParams = CdaSemd101Params | CdaSemd104Params | CdaSemd130Params | CdaSemd043_1uParams;
export interface DetachedSignature {
    /** Подпись в формате Base64 (PKCS#7 / CMS / CAdES-BES) */
    signatureBase64: string;
    /** Серийный номер сертификата открытого ключа */
    certificateSerialNumber: string;
    /** Владелец сертификата (CN, SNILS, O, C) */
    certificateSubject: string;
    /** Издатель сертификата (УЦ) */
    certificateIssuer?: string | undefined;
    validFrom?: string | undefined;
    validTo?: string | undefined;
    /** Метка времени подписания (ISO 8601) */
    signedAt: string;
    /** OID алгоритма подписи (ГОСТ 34.10-2012: 1.2.643.7.1.1.1.1 или 1.2.643.7.1.1.1.2) */
    algorithmOid: string;
    /** OID алгоритма хэширования (ГОСТ 34.11-2012: 1.2.643.7.1.1.2.2 или 1.2.643.7.1.1.2.3) */
    digestAlgorithmOid?: string | undefined;
    signatureValueHex?: string | undefined;
}
export interface EgiszRemdPackage {
    documentId: string;
    documentVersion: number;
    docTypeNsiCode: string;
    xmlCanonicalPayload: string;
    doctorSignature: DetachedSignature;
    moSignature?: DetachedSignature | undefined;
    metadata: {
        patientSnils?: string | undefined;
        clinicOid: string;
        clinicOgrn?: string | undefined;
        docTypeNsiCode: string;
    };
}
export interface CdaValidationIssue {
    path: string;
    field: string;
    message: string;
    severity: "error" | "warning";
    oid?: string | undefined;
}
export interface CdaValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    issues: CdaValidationIssue[];
}
export type CdaGenerationResult = {
    success: true;
    xml: string;
    canonicalXml: string;
    docType: SemdDocKind;
} | {
    success: false;
    errors: string[];
    issues?: CdaValidationIssue[];
};
export interface CertificateValidationDetails {
    valid: boolean;
    notExpired: boolean;
    issuerValid: boolean;
    subjectMatched: boolean;
    snilsMatched?: boolean | undefined;
    ogrnMatched?: boolean | undefined;
    errors: string[];
    warnings: string[];
}
export interface EgiszExportPackageFiles {
    xmlFileName: string;
    xmlContent: string;
    doctorSigFileName: string;
    doctorSigBase64: string;
    moSigFileName?: string | undefined;
    moSigBase64?: string | undefined;
    manifestFileName: string;
    manifestJson: string;
}
