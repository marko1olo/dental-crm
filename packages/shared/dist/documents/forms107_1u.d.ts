import { z } from "zod";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ФОРМЫ РЕЦЕПТУРНЫХ БЛАНКОВ МИНЗДРАВА РФ (ПРИКАЗ МЗ РФ № 1094н)
 *
 * 1. Форма № 107-1/у — Рецептурный бланк на лекарственные препараты общего назначения
 * 2. Форма № 148-1/у-88 — Рецептурный бланк строгой отчетности (ПКУ / сильнодействующие / психотропные)
 * 3. Форма № 148-1/у-04(л) — Рецептурный бланк для льготного отпуска (бесплатно / со скидкой 50%)
 * ═══════════════════════════════════════════════════════════════════════════
 */
/** Допустимые типы бланков рецептов */
export declare const prescriptionFormTypeSchema: z.ZodEnum<["107-1u", "148-1u-88", "148-1u-04l"]>;
export type PrescriptionFormType = z.infer<typeof prescriptionFormTypeSchema>;
/** Сроки действия рецептов согласно Приказу Минздрава России № 1094н */
export declare const prescriptionValidityPeriodSchema: z.ZodEnum<["days_15", "days_30", "days_60", "year_1"]>;
export type PrescriptionValidityPeriod = z.infer<typeof prescriptionValidityPeriodSchema>;
/** Категории льготных граждан (для формы 148-1/у-04(л)) */
export declare const PREFERENTIAL_BENEFIT_CATEGORIES: readonly [{
    readonly code: "010";
    readonly nameRu: "Инвалиды войны";
    readonly discountPercent: 100;
}, {
    readonly code: "020";
    readonly nameRu: "Участники Великой Отечественной войны";
    readonly discountPercent: 100;
}, {
    readonly code: "030";
    readonly nameRu: "Ветераны боевых действий";
    readonly discountPercent: 100;
}, {
    readonly code: "081";
    readonly nameRu: "Инвалиды I группы";
    readonly discountPercent: 100;
}, {
    readonly code: "082";
    readonly nameRu: "Инвалиды II группы";
    readonly discountPercent: 100;
}, {
    readonly code: "083";
    readonly nameRu: "Инвалиды III группы (безработные)";
    readonly discountPercent: 50;
}, {
    readonly code: "084";
    readonly nameRu: "Дети-инвалиды";
    readonly discountPercent: 100;
}, {
    readonly code: "701";
    readonly nameRu: "Лица, подвергшиеся воздействию радиации (ЧАЭС)";
    readonly discountPercent: 100;
}, {
    readonly code: "801";
    readonly nameRu: "Дети первых трех лет жизни (из многодетных семей — до 6 лет)";
    readonly discountPercent: 100;
}, {
    readonly code: "802";
    readonly nameRu: "Пенсионеры, получающие пенсию по старости в минимальном размере";
    readonly discountPercent: 50;
}, {
    readonly code: "901";
    readonly nameRu: "Хронические заболевания (диабет, бронхиальная астма, онкология)";
    readonly discountPercent: 100;
}];
/** ═══════════════════════════════════════════════════════════════════════════
 * СПРАВОЧНИКИ ФОРМ ВЫПУСКА, ДОЗИРОВОК И СПОСОБОВ ПРИМЕНЕНИЯ (РУС / ЛАТ)
 * ═══════════════════════════════════════════════════════════════════════════ */
export interface PrescriptionDosageFormMeta {
    readonly code: string;
    readonly nameRu: string;
    readonly nameLatin: string;
    readonly latinAbbr: string;
    readonly dispensePatternLatin: string;
    readonly defaultUnitRu: string;
}
export declare const PRESCRIPTION_DOSAGE_FORMS_CATALOG: readonly PrescriptionDosageFormMeta[];
export interface PrescriptionAdministrationRouteMeta {
    readonly code: string;
    readonly nameRu: string;
    readonly nameLatin: string;
    readonly signaPrefixRu: string;
    readonly commonInstructionsRu: readonly string[];
}
export declare const PRESCRIPTION_ADMINISTRATION_ROUTES_CATALOG: readonly PrescriptionAdministrationRouteMeta[];
/** ═══════════════════════════════════════════════════════════════════════════
 * ZOD SCHEMAS ДЛЯ ВАЛИДАЦИИ РЕЦЕПТУРНЫХ БЛАНКОВ
 * ═══════════════════════════════════════════════════════════════════════════ */
/** Отдельная пропись лекарственного препарата в рецепте */
export declare const prescriptionDrugItemSchema: z.ZodObject<{
    id: z.ZodDefault<z.ZodString>;
    latinName: z.ZodString;
    tradeName: z.ZodString;
    form: z.ZodString;
    dosage: z.ZodString;
    quantity: z.ZodString;
    dispenseLatin: z.ZodString;
    signaRussian: z.ZodString;
    category: z.ZodDefault<z.ZodEnum<["nsaid", "antibiotic", "controlled_pku", "antihistamine", "antiseptic", "corticosteroid", "hemostatic", "gastroprotective", "preferential_somatic", "other"]>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    quantity: string;
    tradeName: string;
    latinName: string;
    form: string;
    dosage: string;
    dispenseLatin: string;
    signaRussian: string;
    category: "other" | "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic";
}, {
    quantity: string;
    tradeName: string;
    latinName: string;
    form: string;
    dosage: string;
    dispenseLatin: string;
    signaRussian: string;
    id?: string | undefined;
    category?: "other" | "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic" | undefined;
}>;
export type PrescriptionDrugItem = z.infer<typeof prescriptionDrugItemSchema>;
/** Реквизиты штампа медицинской организации */
export declare const prescriptionClinicStampSchema: z.ZodObject<{
    clinicLegalName: z.ZodString;
    clinicAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicPhone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicOgrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicInn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    medicalLicenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    medicalLicenseDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    clinicLegalName: string;
    clinicAddress?: string | null | undefined;
    clinicOgrn?: string | null | undefined;
    clinicInn?: string | null | undefined;
    clinicPhone?: string | null | undefined;
    medicalLicenseNumber?: string | null | undefined;
    medicalLicenseDate?: string | null | undefined;
}, {
    clinicLegalName: string;
    clinicAddress?: string | null | undefined;
    clinicOgrn?: string | null | undefined;
    clinicInn?: string | null | undefined;
    clinicPhone?: string | null | undefined;
    medicalLicenseNumber?: string | null | undefined;
    medicalLicenseDate?: string | null | undefined;
}>;
export type PrescriptionClinicStamp = z.infer<typeof prescriptionClinicStampSchema>;
/** Электронная подпись врача (УКЭП) */
export declare const prescriptionDoctorUkepSchema: z.ZodObject<{
    doctorFullName: z.ZodString;
    doctorSpecialty: z.ZodDefault<z.ZodString>;
    doctorSnils: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    certificateSerialNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    certificateThumbprint: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    certificateIssuer: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    certificateValidFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    certificateValidTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    signedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    cryptoSignaturePkcs7: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    signatureAlgorithm: z.ZodDefault<z.ZodString>;
    egiszDocumentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    qrVerificationUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    doctorFullName: string;
    doctorSpecialty: string;
    signatureAlgorithm: string;
    doctorSnils?: string | null | undefined;
    certificateSerialNumber?: string | null | undefined;
    certificateThumbprint?: string | null | undefined;
    certificateIssuer?: string | null | undefined;
    certificateValidFrom?: string | null | undefined;
    certificateValidTo?: string | null | undefined;
    signedAt?: string | null | undefined;
    cryptoSignaturePkcs7?: string | null | undefined;
    egiszDocumentId?: string | null | undefined;
    qrVerificationUrl?: string | null | undefined;
}, {
    doctorFullName: string;
    doctorSpecialty?: string | undefined;
    doctorSnils?: string | null | undefined;
    certificateSerialNumber?: string | null | undefined;
    certificateThumbprint?: string | null | undefined;
    certificateIssuer?: string | null | undefined;
    certificateValidFrom?: string | null | undefined;
    certificateValidTo?: string | null | undefined;
    signedAt?: string | null | undefined;
    cryptoSignaturePkcs7?: string | null | undefined;
    signatureAlgorithm?: string | undefined;
    egiszDocumentId?: string | null | undefined;
    qrVerificationUrl?: string | null | undefined;
}>;
export type PrescriptionDoctorUkep = z.infer<typeof prescriptionDoctorUkepSchema>;
/** Реквизиты льготы (для формы 148-1/у-04(л)) */
export declare const prescriptionPreferentialDetailsSchema: z.ZodObject<{
    preferentialBenefitCode: z.ZodDefault<z.ZodString>;
    preferentialBenefitNameRu: z.ZodDefault<z.ZodString>;
    preferentialDiscountPercent: z.ZodDefault<z.ZodNumber>;
    patientSnils: z.ZodString;
    patientOmsPolicy: z.ZodString;
    fundingSource: z.ZodDefault<z.ZodEnum<["federal", "regional", "municipal"]>>;
    medicalCardNumber: z.ZodString;
}, "strip", z.ZodTypeAny, {
    medicalCardNumber: string;
    patientSnils: string;
    preferentialBenefitCode: string;
    preferentialBenefitNameRu: string;
    preferentialDiscountPercent: number;
    patientOmsPolicy: string;
    fundingSource: "federal" | "regional" | "municipal";
}, {
    medicalCardNumber: string;
    patientSnils: string;
    patientOmsPolicy: string;
    preferentialBenefitCode?: string | undefined;
    preferentialBenefitNameRu?: string | undefined;
    preferentialDiscountPercent?: number | undefined;
    fundingSource?: "federal" | "regional" | "municipal" | undefined;
}>;
export type PrescriptionPreferentialDetails = z.infer<typeof prescriptionPreferentialDetailsSchema>;
/** Универсальный структурированный Payload рецептурного бланка (Формы 107-1/у, 148-1/у-88, 148-1/у-04(л)) */
export declare const form107_1uPayloadSchema: z.ZodObject<{
    formNumber: z.ZodDefault<z.ZodLiteral<"107-1/у">>;
    clinicLegalName: z.ZodString;
    clinicAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicPhone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicOgrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicInn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    medicalLicenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    prescriptionSeriesNumber: z.ZodString;
    prescriptionDate: z.ZodString;
    patientFullName: z.ZodString;
    patientBirthDate: z.ZodString;
    patientAgeYears: z.ZodOptional<z.ZodNullable<z.ZodNumber>>;
    medicalCardNumber: z.ZodString;
    doctorFullName: z.ZodString;
    doctorSpecialty: z.ZodDefault<z.ZodString>;
    validityDays: z.ZodDefault<z.ZodEnum<["15", "30", "60", "365"]>>;
    isChronicSpecialCare: z.ZodDefault<z.ZodBoolean>;
    chronicPeriodicity: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodDefault<z.ZodString>;
        latinName: z.ZodString;
        tradeName: z.ZodString;
        form: z.ZodString;
        dosage: z.ZodString;
        quantity: z.ZodString;
        dispenseLatin: z.ZodString;
        signaRussian: z.ZodString;
        category: z.ZodDefault<z.ZodEnum<["nsaid", "antibiotic", "controlled_pku", "antihistamine", "antiseptic", "corticosteroid", "hemostatic", "gastroprotective", "preferential_somatic", "other"]>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        quantity: string;
        tradeName: string;
        latinName: string;
        form: string;
        dosage: string;
        dispenseLatin: string;
        signaRussian: string;
        category: "other" | "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic";
    }, {
        quantity: string;
        tradeName: string;
        latinName: string;
        form: string;
        dosage: string;
        dispenseLatin: string;
        signaRussian: string;
        id?: string | undefined;
        category?: "other" | "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic" | undefined;
    }>, "many">;
    diagnosisIcd10Code: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    ukepSignature: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        doctorFullName: z.ZodString;
        doctorSpecialty: z.ZodDefault<z.ZodString>;
        doctorSnils: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        certificateSerialNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        certificateThumbprint: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        certificateIssuer: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        certificateValidFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        certificateValidTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        signedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cryptoSignaturePkcs7: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        signatureAlgorithm: z.ZodDefault<z.ZodString>;
        egiszDocumentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        qrVerificationUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        doctorFullName: string;
        doctorSpecialty: string;
        signatureAlgorithm: string;
        doctorSnils?: string | null | undefined;
        certificateSerialNumber?: string | null | undefined;
        certificateThumbprint?: string | null | undefined;
        certificateIssuer?: string | null | undefined;
        certificateValidFrom?: string | null | undefined;
        certificateValidTo?: string | null | undefined;
        signedAt?: string | null | undefined;
        cryptoSignaturePkcs7?: string | null | undefined;
        egiszDocumentId?: string | null | undefined;
        qrVerificationUrl?: string | null | undefined;
    }, {
        doctorFullName: string;
        doctorSpecialty?: string | undefined;
        doctorSnils?: string | null | undefined;
        certificateSerialNumber?: string | null | undefined;
        certificateThumbprint?: string | null | undefined;
        certificateIssuer?: string | null | undefined;
        certificateValidFrom?: string | null | undefined;
        certificateValidTo?: string | null | undefined;
        signedAt?: string | null | undefined;
        cryptoSignaturePkcs7?: string | null | undefined;
        signatureAlgorithm?: string | undefined;
        egiszDocumentId?: string | null | undefined;
        qrVerificationUrl?: string | null | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    items: {
        id: string;
        quantity: string;
        tradeName: string;
        latinName: string;
        form: string;
        dosage: string;
        dispenseLatin: string;
        signaRussian: string;
        category: "other" | "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic";
    }[];
    patientFullName: string;
    doctorFullName: string;
    formNumber: "107-1/у";
    clinicLegalName: string;
    medicalCardNumber: string;
    patientBirthDate: string;
    doctorSpecialty: string;
    prescriptionSeriesNumber: string;
    prescriptionDate: string;
    validityDays: "15" | "30" | "60" | "365";
    isChronicSpecialCare: boolean;
    notes?: string | null | undefined;
    clinicAddress?: string | null | undefined;
    clinicOgrn?: string | null | undefined;
    clinicInn?: string | null | undefined;
    clinicPhone?: string | null | undefined;
    medicalLicenseNumber?: string | null | undefined;
    patientAgeYears?: number | null | undefined;
    chronicPeriodicity?: string | null | undefined;
    diagnosisIcd10Code?: string | null | undefined;
    ukepSignature?: {
        doctorFullName: string;
        doctorSpecialty: string;
        signatureAlgorithm: string;
        doctorSnils?: string | null | undefined;
        certificateSerialNumber?: string | null | undefined;
        certificateThumbprint?: string | null | undefined;
        certificateIssuer?: string | null | undefined;
        certificateValidFrom?: string | null | undefined;
        certificateValidTo?: string | null | undefined;
        signedAt?: string | null | undefined;
        cryptoSignaturePkcs7?: string | null | undefined;
        egiszDocumentId?: string | null | undefined;
        qrVerificationUrl?: string | null | undefined;
    } | null | undefined;
}, {
    items: {
        quantity: string;
        tradeName: string;
        latinName: string;
        form: string;
        dosage: string;
        dispenseLatin: string;
        signaRussian: string;
        id?: string | undefined;
        category?: "other" | "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic" | undefined;
    }[];
    patientFullName: string;
    doctorFullName: string;
    clinicLegalName: string;
    medicalCardNumber: string;
    patientBirthDate: string;
    prescriptionSeriesNumber: string;
    prescriptionDate: string;
    notes?: string | null | undefined;
    formNumber?: "107-1/у" | undefined;
    clinicAddress?: string | null | undefined;
    clinicOgrn?: string | null | undefined;
    clinicInn?: string | null | undefined;
    doctorSpecialty?: string | undefined;
    clinicPhone?: string | null | undefined;
    medicalLicenseNumber?: string | null | undefined;
    patientAgeYears?: number | null | undefined;
    validityDays?: "15" | "30" | "60" | "365" | undefined;
    isChronicSpecialCare?: boolean | undefined;
    chronicPeriodicity?: string | null | undefined;
    diagnosisIcd10Code?: string | null | undefined;
    ukepSignature?: {
        doctorFullName: string;
        doctorSpecialty?: string | undefined;
        doctorSnils?: string | null | undefined;
        certificateSerialNumber?: string | null | undefined;
        certificateThumbprint?: string | null | undefined;
        certificateIssuer?: string | null | undefined;
        certificateValidFrom?: string | null | undefined;
        certificateValidTo?: string | null | undefined;
        signedAt?: string | null | undefined;
        cryptoSignaturePkcs7?: string | null | undefined;
        signatureAlgorithm?: string | undefined;
        egiszDocumentId?: string | null | undefined;
        qrVerificationUrl?: string | null | undefined;
    } | null | undefined;
}>;
export type Form107_1uPayload = z.infer<typeof form107_1uPayloadSchema>;
/** Payload рецептурного бланка строгой отчетности № 148-1/у-88 (ПКУ) */
export declare const form148_1u88PayloadSchema: z.ZodObject<{
    formNumber: z.ZodDefault<z.ZodLiteral<"148-1/у-88">>;
    clinicLegalName: z.ZodString;
    clinicAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicPhone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicOgrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicInn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    medicalLicenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    prescriptionSeriesNumber: z.ZodString;
    prescriptionDate: z.ZodString;
    patientFullName: z.ZodString;
    patientBirthDate: z.ZodString;
    patientAddress: z.ZodString;
    medicalCardNumber: z.ZodString;
    doctorFullName: z.ZodString;
    doctorSpecialty: z.ZodDefault<z.ZodString>;
    headOfDepartmentFullName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    validityDays: z.ZodDefault<z.ZodLiteral<"15">>;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodDefault<z.ZodString>;
        latinName: z.ZodString;
        tradeName: z.ZodString;
        form: z.ZodString;
        dosage: z.ZodString;
        quantity: z.ZodString;
        dispenseLatin: z.ZodString;
        signaRussian: z.ZodString;
        category: z.ZodDefault<z.ZodEnum<["nsaid", "antibiotic", "controlled_pku", "antihistamine", "antiseptic", "corticosteroid", "hemostatic", "gastroprotective", "preferential_somatic", "other"]>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        quantity: string;
        tradeName: string;
        latinName: string;
        form: string;
        dosage: string;
        dispenseLatin: string;
        signaRussian: string;
        category: "other" | "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic";
    }, {
        quantity: string;
        tradeName: string;
        latinName: string;
        form: string;
        dosage: string;
        dispenseLatin: string;
        signaRussian: string;
        id?: string | undefined;
        category?: "other" | "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic" | undefined;
    }>, "many">;
    diagnosisIcd10Code: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    ukepSignature: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        doctorFullName: z.ZodString;
        doctorSpecialty: z.ZodDefault<z.ZodString>;
        doctorSnils: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        certificateSerialNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        certificateThumbprint: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        certificateIssuer: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        certificateValidFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        certificateValidTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        signedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cryptoSignaturePkcs7: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        signatureAlgorithm: z.ZodDefault<z.ZodString>;
        egiszDocumentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        qrVerificationUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        doctorFullName: string;
        doctorSpecialty: string;
        signatureAlgorithm: string;
        doctorSnils?: string | null | undefined;
        certificateSerialNumber?: string | null | undefined;
        certificateThumbprint?: string | null | undefined;
        certificateIssuer?: string | null | undefined;
        certificateValidFrom?: string | null | undefined;
        certificateValidTo?: string | null | undefined;
        signedAt?: string | null | undefined;
        cryptoSignaturePkcs7?: string | null | undefined;
        egiszDocumentId?: string | null | undefined;
        qrVerificationUrl?: string | null | undefined;
    }, {
        doctorFullName: string;
        doctorSpecialty?: string | undefined;
        doctorSnils?: string | null | undefined;
        certificateSerialNumber?: string | null | undefined;
        certificateThumbprint?: string | null | undefined;
        certificateIssuer?: string | null | undefined;
        certificateValidFrom?: string | null | undefined;
        certificateValidTo?: string | null | undefined;
        signedAt?: string | null | undefined;
        cryptoSignaturePkcs7?: string | null | undefined;
        signatureAlgorithm?: string | undefined;
        egiszDocumentId?: string | null | undefined;
        qrVerificationUrl?: string | null | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    items: {
        id: string;
        quantity: string;
        tradeName: string;
        latinName: string;
        form: string;
        dosage: string;
        dispenseLatin: string;
        signaRussian: string;
        category: "other" | "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic";
    }[];
    patientFullName: string;
    doctorFullName: string;
    formNumber: "148-1/у-88";
    clinicLegalName: string;
    medicalCardNumber: string;
    patientBirthDate: string;
    patientAddress: string;
    doctorSpecialty: string;
    prescriptionSeriesNumber: string;
    prescriptionDate: string;
    validityDays: "15";
    notes?: string | null | undefined;
    clinicAddress?: string | null | undefined;
    clinicOgrn?: string | null | undefined;
    clinicInn?: string | null | undefined;
    headOfDepartmentFullName?: string | null | undefined;
    clinicPhone?: string | null | undefined;
    medicalLicenseNumber?: string | null | undefined;
    diagnosisIcd10Code?: string | null | undefined;
    ukepSignature?: {
        doctorFullName: string;
        doctorSpecialty: string;
        signatureAlgorithm: string;
        doctorSnils?: string | null | undefined;
        certificateSerialNumber?: string | null | undefined;
        certificateThumbprint?: string | null | undefined;
        certificateIssuer?: string | null | undefined;
        certificateValidFrom?: string | null | undefined;
        certificateValidTo?: string | null | undefined;
        signedAt?: string | null | undefined;
        cryptoSignaturePkcs7?: string | null | undefined;
        egiszDocumentId?: string | null | undefined;
        qrVerificationUrl?: string | null | undefined;
    } | null | undefined;
}, {
    items: {
        quantity: string;
        tradeName: string;
        latinName: string;
        form: string;
        dosage: string;
        dispenseLatin: string;
        signaRussian: string;
        id?: string | undefined;
        category?: "other" | "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic" | undefined;
    }[];
    patientFullName: string;
    doctorFullName: string;
    clinicLegalName: string;
    medicalCardNumber: string;
    patientBirthDate: string;
    patientAddress: string;
    prescriptionSeriesNumber: string;
    prescriptionDate: string;
    notes?: string | null | undefined;
    formNumber?: "148-1/у-88" | undefined;
    clinicAddress?: string | null | undefined;
    clinicOgrn?: string | null | undefined;
    clinicInn?: string | null | undefined;
    doctorSpecialty?: string | undefined;
    headOfDepartmentFullName?: string | null | undefined;
    clinicPhone?: string | null | undefined;
    medicalLicenseNumber?: string | null | undefined;
    validityDays?: "15" | undefined;
    diagnosisIcd10Code?: string | null | undefined;
    ukepSignature?: {
        doctorFullName: string;
        doctorSpecialty?: string | undefined;
        doctorSnils?: string | null | undefined;
        certificateSerialNumber?: string | null | undefined;
        certificateThumbprint?: string | null | undefined;
        certificateIssuer?: string | null | undefined;
        certificateValidFrom?: string | null | undefined;
        certificateValidTo?: string | null | undefined;
        signedAt?: string | null | undefined;
        cryptoSignaturePkcs7?: string | null | undefined;
        signatureAlgorithm?: string | undefined;
        egiszDocumentId?: string | null | undefined;
        qrVerificationUrl?: string | null | undefined;
    } | null | undefined;
}>;
export type Form148_1u88Payload = z.infer<typeof form148_1u88PayloadSchema>;
/** Payload льготного рецептурного бланка № 148-1/у-04(л) */
export declare const form148_1u04lPayloadSchema: z.ZodObject<{
    formNumber: z.ZodDefault<z.ZodLiteral<"148-1/у-04(л)">>;
    clinicLegalName: z.ZodString;
    clinicAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicPhone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicOgrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    clinicInn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    medicalLicenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    prescriptionSeriesNumber: z.ZodString;
    prescriptionDate: z.ZodString;
    patientFullName: z.ZodString;
    patientBirthDate: z.ZodString;
    patientAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    medicalCardNumber: z.ZodString;
    preferentialDetails: z.ZodObject<{
        preferentialBenefitCode: z.ZodDefault<z.ZodString>;
        preferentialBenefitNameRu: z.ZodDefault<z.ZodString>;
        preferentialDiscountPercent: z.ZodDefault<z.ZodNumber>;
        patientSnils: z.ZodString;
        patientOmsPolicy: z.ZodString;
        fundingSource: z.ZodDefault<z.ZodEnum<["federal", "regional", "municipal"]>>;
        medicalCardNumber: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        medicalCardNumber: string;
        patientSnils: string;
        preferentialBenefitCode: string;
        preferentialBenefitNameRu: string;
        preferentialDiscountPercent: number;
        patientOmsPolicy: string;
        fundingSource: "federal" | "regional" | "municipal";
    }, {
        medicalCardNumber: string;
        patientSnils: string;
        patientOmsPolicy: string;
        preferentialBenefitCode?: string | undefined;
        preferentialBenefitNameRu?: string | undefined;
        preferentialDiscountPercent?: number | undefined;
        fundingSource?: "federal" | "regional" | "municipal" | undefined;
    }>;
    doctorFullName: z.ZodString;
    doctorSpecialty: z.ZodDefault<z.ZodString>;
    validityDays: z.ZodDefault<z.ZodEnum<["15", "30", "60", "365"]>>;
    isChronicSpecialCare: z.ZodDefault<z.ZodBoolean>;
    chronicPeriodicity: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodDefault<z.ZodString>;
        latinName: z.ZodString;
        tradeName: z.ZodString;
        form: z.ZodString;
        dosage: z.ZodString;
        quantity: z.ZodString;
        dispenseLatin: z.ZodString;
        signaRussian: z.ZodString;
        category: z.ZodDefault<z.ZodEnum<["nsaid", "antibiotic", "controlled_pku", "antihistamine", "antiseptic", "corticosteroid", "hemostatic", "gastroprotective", "preferential_somatic", "other"]>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        quantity: string;
        tradeName: string;
        latinName: string;
        form: string;
        dosage: string;
        dispenseLatin: string;
        signaRussian: string;
        category: "other" | "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic";
    }, {
        quantity: string;
        tradeName: string;
        latinName: string;
        form: string;
        dosage: string;
        dispenseLatin: string;
        signaRussian: string;
        id?: string | undefined;
        category?: "other" | "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic" | undefined;
    }>, "many">;
    diagnosisIcd10Code: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    notes: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    ukepSignature: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        doctorFullName: z.ZodString;
        doctorSpecialty: z.ZodDefault<z.ZodString>;
        doctorSnils: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        certificateSerialNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        certificateThumbprint: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        certificateIssuer: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        certificateValidFrom: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        certificateValidTo: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        signedAt: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        cryptoSignaturePkcs7: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        signatureAlgorithm: z.ZodDefault<z.ZodString>;
        egiszDocumentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        qrVerificationUrl: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        doctorFullName: string;
        doctorSpecialty: string;
        signatureAlgorithm: string;
        doctorSnils?: string | null | undefined;
        certificateSerialNumber?: string | null | undefined;
        certificateThumbprint?: string | null | undefined;
        certificateIssuer?: string | null | undefined;
        certificateValidFrom?: string | null | undefined;
        certificateValidTo?: string | null | undefined;
        signedAt?: string | null | undefined;
        cryptoSignaturePkcs7?: string | null | undefined;
        egiszDocumentId?: string | null | undefined;
        qrVerificationUrl?: string | null | undefined;
    }, {
        doctorFullName: string;
        doctorSpecialty?: string | undefined;
        doctorSnils?: string | null | undefined;
        certificateSerialNumber?: string | null | undefined;
        certificateThumbprint?: string | null | undefined;
        certificateIssuer?: string | null | undefined;
        certificateValidFrom?: string | null | undefined;
        certificateValidTo?: string | null | undefined;
        signedAt?: string | null | undefined;
        cryptoSignaturePkcs7?: string | null | undefined;
        signatureAlgorithm?: string | undefined;
        egiszDocumentId?: string | null | undefined;
        qrVerificationUrl?: string | null | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    items: {
        id: string;
        quantity: string;
        tradeName: string;
        latinName: string;
        form: string;
        dosage: string;
        dispenseLatin: string;
        signaRussian: string;
        category: "other" | "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic";
    }[];
    patientFullName: string;
    doctorFullName: string;
    formNumber: "148-1/у-04(л)";
    clinicLegalName: string;
    medicalCardNumber: string;
    patientBirthDate: string;
    doctorSpecialty: string;
    prescriptionSeriesNumber: string;
    prescriptionDate: string;
    validityDays: "15" | "30" | "60" | "365";
    isChronicSpecialCare: boolean;
    preferentialDetails: {
        medicalCardNumber: string;
        patientSnils: string;
        preferentialBenefitCode: string;
        preferentialBenefitNameRu: string;
        preferentialDiscountPercent: number;
        patientOmsPolicy: string;
        fundingSource: "federal" | "regional" | "municipal";
    };
    notes?: string | null | undefined;
    clinicAddress?: string | null | undefined;
    clinicOgrn?: string | null | undefined;
    clinicInn?: string | null | undefined;
    patientAddress?: string | null | undefined;
    clinicPhone?: string | null | undefined;
    medicalLicenseNumber?: string | null | undefined;
    chronicPeriodicity?: string | null | undefined;
    diagnosisIcd10Code?: string | null | undefined;
    ukepSignature?: {
        doctorFullName: string;
        doctorSpecialty: string;
        signatureAlgorithm: string;
        doctorSnils?: string | null | undefined;
        certificateSerialNumber?: string | null | undefined;
        certificateThumbprint?: string | null | undefined;
        certificateIssuer?: string | null | undefined;
        certificateValidFrom?: string | null | undefined;
        certificateValidTo?: string | null | undefined;
        signedAt?: string | null | undefined;
        cryptoSignaturePkcs7?: string | null | undefined;
        egiszDocumentId?: string | null | undefined;
        qrVerificationUrl?: string | null | undefined;
    } | null | undefined;
}, {
    items: {
        quantity: string;
        tradeName: string;
        latinName: string;
        form: string;
        dosage: string;
        dispenseLatin: string;
        signaRussian: string;
        id?: string | undefined;
        category?: "other" | "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic" | undefined;
    }[];
    patientFullName: string;
    doctorFullName: string;
    clinicLegalName: string;
    medicalCardNumber: string;
    patientBirthDate: string;
    prescriptionSeriesNumber: string;
    prescriptionDate: string;
    preferentialDetails: {
        medicalCardNumber: string;
        patientSnils: string;
        patientOmsPolicy: string;
        preferentialBenefitCode?: string | undefined;
        preferentialBenefitNameRu?: string | undefined;
        preferentialDiscountPercent?: number | undefined;
        fundingSource?: "federal" | "regional" | "municipal" | undefined;
    };
    notes?: string | null | undefined;
    formNumber?: "148-1/у-04(л)" | undefined;
    clinicAddress?: string | null | undefined;
    clinicOgrn?: string | null | undefined;
    clinicInn?: string | null | undefined;
    patientAddress?: string | null | undefined;
    doctorSpecialty?: string | undefined;
    clinicPhone?: string | null | undefined;
    medicalLicenseNumber?: string | null | undefined;
    validityDays?: "15" | "30" | "60" | "365" | undefined;
    isChronicSpecialCare?: boolean | undefined;
    chronicPeriodicity?: string | null | undefined;
    diagnosisIcd10Code?: string | null | undefined;
    ukepSignature?: {
        doctorFullName: string;
        doctorSpecialty?: string | undefined;
        doctorSnils?: string | null | undefined;
        certificateSerialNumber?: string | null | undefined;
        certificateThumbprint?: string | null | undefined;
        certificateIssuer?: string | null | undefined;
        certificateValidFrom?: string | null | undefined;
        certificateValidTo?: string | null | undefined;
        signedAt?: string | null | undefined;
        cryptoSignaturePkcs7?: string | null | undefined;
        signatureAlgorithm?: string | undefined;
        egiszDocumentId?: string | null | undefined;
        qrVerificationUrl?: string | null | undefined;
    } | null | undefined;
}>;
export type Form148_1u04lPayload = z.infer<typeof form148_1u04lPayloadSchema>;
/** ═══════════════════════════════════════════════════════════════════════════
 * СПРАВОЧНИК СТОМАТОЛОГИЧЕСКИХ И МЕДИЦИНСКИХ ПРЕПАРАТОВ
 * ═══════════════════════════════════════════════════════════════════════════ */
export interface DentalPrescriptionDrugPreset {
    readonly id: string;
    readonly tradeNameRu: string;
    readonly activeSubstanceRu: string;
    readonly category: "nsaid" | "antibiotic" | "controlled_pku" | "antihistamine" | "antiseptic" | "corticosteroid" | "hemostatic" | "gastroprotective" | "preferential_somatic" | "other";
    readonly categoryLabel: string;
    readonly latinRp: string;
    readonly formRu: string;
    readonly dosageRu: string;
    readonly quantityLabel: string;
    readonly dispenseLatin: string;
    readonly signaRu: string;
    readonly recommendedForIcd10: readonly string[];
    readonly defaultValidityDays?: "15" | "30" | "60" | "365";
    readonly isPkuStrictAccounting?: boolean;
}
export declare const DENTAL_PRESCRIPTION_DRUG_CATALOG: readonly DentalPrescriptionDrugPreset[];
/** Выделенные пресеты для бланков строгой отчетности 148-1/у-88 */
export declare const CONTROLLED_DRUG_PRESETS: DentalPrescriptionDrugPreset[];
/** Выделенные пресеты для льготных бланков 148-1/у-04(л) */
export declare const PREFERENTIAL_DRUG_PRESETS: DentalPrescriptionDrugPreset[];
/** ═══════════════════════════════════════════════════════════════════════════
 * ФАРМАКОЛОГИЧЕСКИЙ ДВИЖОК БЕЗОПАСНОСТИ: ВРД, ВСД И МАТРИЦА МЕЖЛЕКАРСТВЕННЫХ ВЗАИМОДЕЙСТВИЙ (DDI)
 * ═══════════════════════════════════════════════════════════════════════════ */
export interface DrugDosageLimit {
    readonly drugId: string;
    readonly activeSubstance: string;
    readonly maxSingleDoseMg: number;
    readonly maxDailyDoseMg: number;
    readonly unit: string;
    readonly pediatricMinAgeYears?: number;
    readonly maxCourseDays?: number;
    readonly notesRu?: string;
}
export declare const DENTAL_DRUG_DOSAGE_LIMITS: Readonly<Record<string, DrugDosageLimit>>;
export type DrugInteractionSeverity = "contraindicated" | "major" | "moderate" | "minor";
export interface DrugInteractionRule {
    readonly drugA: string;
    readonly drugB: string;
    readonly severity: DrugInteractionSeverity;
    readonly titleRu: string;
    readonly descriptionRu: string;
    readonly clinicalRecommendationRu: string;
}
export declare const DENTAL_DRUG_INTERACTION_RULES: readonly DrugInteractionRule[];
export interface PrescriptionPharmacologicalSafetyReport {
    readonly isSafe: boolean;
    readonly hasContraindications: boolean;
    readonly interactions: readonly {
        readonly drugA: string;
        readonly drugB: string;
        readonly severity: DrugInteractionSeverity;
        readonly titleRu: string;
        readonly descriptionRu: string;
        readonly recommendationRu: string;
    }[];
    readonly dosageWarnings: readonly string[];
    readonly ageContraindications: readonly string[];
    readonly duplicateCategories: readonly string[];
}
/**
 * Проверка фармакологической безопасности рецептурного назначения:
 * - Соблюдение ВРД (высшая разовая доза) и ВСД (высшая суточная доза)
 * - Анализ межлекарственных взаимодействий (DDI)
 * - Возрастные противопоказания (педиатрия <12, <18 лет)
 * - Выявление дублирования фармакотерапевтических групп (НПВП + НПВП)
 */
export declare function evaluatePrescriptionPharmacologicalSafety(params: {
    readonly drugIds?: readonly string[];
    readonly items?: readonly PrescriptionDrugItem[];
    readonly patientAgeYears?: number;
}): PrescriptionPharmacologicalSafetyReport;
/** ═══════════════════════════════════════════════════════════════════════════
 * СТАТУТОРНЫЙ ДВИЖОК ПРОВЕРКИ СРОКА ДЕЙСТВИЯ И ПРАВИЛ ВЫПИСКИ (ПРИКАЗ № 1094н)
 * ═══════════════════════════════════════════════════════════════════════════ */
export interface PrescriptionValidityResult {
    readonly isValid: boolean;
    readonly status: "active" | "expiring_soon" | "expired";
    readonly validityDays: number;
    readonly issuedAtIso: string;
    readonly expiresAtIso: string;
    readonly daysRemaining: number;
    readonly isExpired: boolean;
    readonly errors: readonly string[];
    readonly warnings: readonly string[];
}
export declare const PRESCRIPTION_VALIDITY_RULES: {
    readonly "107-1u": {
        readonly maxItemsCount: 3;
        readonly allowedValidityPeriods: readonly ["15", "60", "365"];
        readonly defaultValidityPeriod: "60";
        readonly chronicCareAllowed: true;
    };
    readonly "148-1u-88": {
        readonly maxItemsCount: 1;
        readonly allowedValidityPeriods: readonly ["15"];
        readonly defaultValidityPeriod: "15";
        readonly chronicCareAllowed: false;
    };
    readonly "148-1u-04l": {
        readonly maxItemsCount: 3;
        readonly allowedValidityPeriods: readonly ["15", "30", "60", "365"];
        readonly defaultValidityPeriod: "30";
        readonly chronicCareAllowed: true;
    };
};
/** Расчет точной даты истечения срока действия рецепта */
export declare function calculatePrescriptionExpiration(issueDateIso: string, validityDays: "15" | "30" | "60" | "365" | number): string;
/** Проверка соответствия рецепта нормам Приказа Минздрава РФ № 1094н */
export declare function verifyPrescriptionStatutoryValidity(prescription: {
    readonly formNumber?: "107-1/у" | "148-1/у-88" | "148-1/у-04(л)" | string | undefined;
    readonly formType?: PrescriptionFormType | string | undefined;
    readonly prescriptionDate: string;
    readonly validityDays: "15" | "30" | "60" | "365" | string | number;
    readonly isChronicSpecialCare?: boolean | undefined;
    readonly chronicPeriodicity?: string | null | undefined;
    readonly items: readonly {
        readonly latinName?: string | undefined;
        readonly tradeName?: string | undefined;
        readonly category?: string | undefined;
    }[];
    readonly patientAddress?: string | null | undefined;
    readonly preferentialDetails?: {
        readonly patientSnils?: string | undefined;
        readonly patientOmsPolicy?: string | undefined;
    } | null | undefined;
}, referenceDateIso?: string): PrescriptionValidityResult;
/** ═══════════════════════════════════════════════════════════════════════════
 * ГЕНЕРАТОРЫ PAYLOAD ДЛЯ БЛАНКОВ
 * ═══════════════════════════════════════════════════════════════════════════ */
export declare function generatePrescriptionPayloadFromSoap(options: {
    readonly clinic: {
        readonly fullName: string;
        readonly address?: string | null;
        readonly phone?: string | null;
        readonly ogrn?: string | null;
        readonly inn?: string | null;
        readonly medicalLicenseNumber?: string | null;
    };
    readonly patient: {
        readonly fullName: string;
        readonly birthDate: string;
        readonly medicalCardNumber: string;
        readonly address?: string | null;
    };
    readonly doctor: {
        readonly fullName: string;
        readonly specialty?: string | null;
        readonly snils?: string | null;
    };
    readonly diagnosisIcd10?: string | null;
    readonly treatmentText?: string | null;
    readonly drugIds?: readonly string[];
    readonly explicitDrugIds?: readonly string[];
    readonly customSeriesNumber?: string;
    readonly validityDays?: "15" | "30" | "60" | "365";
    readonly isChronicSpecialCare?: boolean;
    readonly chronicPeriodicity?: string | null;
    readonly ukepSignature?: PrescriptionDoctorUkep | null;
}): Form107_1uPayload;
export declare function generateForm148_1u88Payload(options: {
    readonly clinic: {
        readonly fullName: string;
        readonly address?: string | null;
        readonly phone?: string | null;
        readonly ogrn?: string | null;
        readonly inn?: string | null;
        readonly medicalLicenseNumber?: string | null;
    };
    readonly patient: {
        readonly fullName: string;
        readonly birthDate: string;
        readonly medicalCardNumber: string;
        readonly address: string;
    };
    readonly doctor: {
        readonly fullName: string;
        readonly specialty?: string | null;
    };
    readonly headOfDepartmentFullName?: string | null;
    readonly diagnosisIcd10?: string | null;
    readonly explicitDrugId?: string;
    readonly customSeriesNumber?: string;
    readonly ukepSignature?: PrescriptionDoctorUkep | null;
}): Form148_1u88Payload;
export { generatePrescriptionPayloadFromSoap as generateForm107_1uPayload };
