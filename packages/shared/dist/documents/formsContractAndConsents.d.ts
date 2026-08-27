import { z } from "zod";
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * УНИФИЦИРОВАННЫЕ ДОКУМЕНТЫ МИНЗДРАВА РФ И ПРАВИТЕЛЬСТВА РФ
 * 1. Информированное добровольное согласие (ИДС, Приказ МЗ РФ № 1051н, ст. 20 323-ФЗ)
 * 2. Договор на оказание платных медицинских услуг (ПП РФ № 736 от 11.05.2023)
 * 3. Акт сдачи-приемки оказанных медицинских услуг (Номенклатура МЗ РФ № 804н)
 *
 * Лицензия клиники по умолчанию: № ЛО41-01137-77/00368421
 * ═══════════════════════════════════════════════════════════════════════════
 */
export declare const DEFAULT_CLINIC_LICENSE_NUMBER = "\u041B\u041E41-01137-77/00368421";
export declare const DEFAULT_CLINIC_LICENSE_DATE = "12.10.2021";
export declare const DEFAULT_CLINIC_LICENSE_ISSUER = "\u0414\u0435\u043F\u0430\u0440\u0442\u0430\u043C\u0435\u043D\u0442 \u0437\u0434\u0440\u0430\u0432\u043E\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F \u0433\u043E\u0440\u043E\u0434\u0430 \u041C\u043E\u0441\u043A\u0432\u044B";
export declare const informedConsentTypeSchema: z.ZodEnum<["general_primary", "local_anesthesia", "therapy_endo_restoration", "surgery_extraction", "implantation_bone_graft", "prosthetics", "orthodontics", "hygiene_whitening", "periodontology", "custom"]>;
export type InformedConsentType = z.infer<typeof informedConsentTypeSchema>;
export declare const informedConsent1051nPayloadSchema: z.ZodObject<{
    consentType: z.ZodDefault<z.ZodEnum<["general_primary", "local_anesthesia", "therapy_endo_restoration", "surgery_extraction", "implantation_bone_graft", "prosthetics", "orthodontics", "hygiene_whitening", "periodontology", "custom"]>>;
    consentTitle: z.ZodDefault<z.ZodString>;
    clinicLegalName: z.ZodDefault<z.ZodString>;
    clinicAddress: z.ZodDefault<z.ZodString>;
    clinicOgrn: z.ZodDefault<z.ZodString>;
    clinicInn: z.ZodDefault<z.ZodString>;
    medicalLicenseNumber: z.ZodDefault<z.ZodString>;
    medicalLicenseDate: z.ZodDefault<z.ZodString>;
    patientFullName: z.ZodString;
    patientBirthDate: z.ZodString;
    patientPassport: z.ZodDefault<z.ZodString>;
    patientAddress: z.ZodDefault<z.ZodString>;
    patientPhone: z.ZodDefault<z.ZodString>;
    patientSnils: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    representativeFullName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    representativePassport: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    representativeRelation: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    attendingDoctorFullName: z.ZodDefault<z.ZodString>;
    attendingDoctorSpecialty: z.ZodDefault<z.ZodString>;
    diagnosisOrIndication: z.ZodString;
    interventionName: z.ZodString;
    plannedAnesthesia: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    materialsAndSystems: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    explainedRisks: z.ZodArray<z.ZodString, "many">;
    alternatives: z.ZodArray<z.ZodString, "many">;
    aftercareRequirements: z.ZodArray<z.ZodString, "many">;
    confirmedVoluntary: z.ZodDefault<z.ZodBoolean>;
    questionsAnswered: z.ZodDefault<z.ZodBoolean>;
    consentDate: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    patientFullName: string;
    clinicLegalName: string;
    clinicAddress: string;
    clinicOgrn: string;
    clinicInn: string;
    patientBirthDate: string;
    patientPhone: string;
    attendingDoctorFullName: string;
    attendingDoctorSpecialty: string;
    patientAddress: string;
    medicalLicenseNumber: string;
    medicalLicenseDate: string;
    consentType: "custom" | "orthodontics" | "therapy_endo_restoration" | "local_anesthesia" | "surgery_extraction" | "implantation_bone_graft" | "prosthetics" | "hygiene_whitening" | "periodontology" | "general_primary";
    consentTitle: string;
    patientPassport: string;
    diagnosisOrIndication: string;
    interventionName: string;
    explainedRisks: string[];
    alternatives: string[];
    aftercareRequirements: string[];
    confirmedVoluntary: boolean;
    questionsAnswered: boolean;
    consentDate: string;
    patientSnils?: string | null | undefined;
    representativeFullName?: string | null | undefined;
    representativePassport?: string | null | undefined;
    representativeRelation?: string | null | undefined;
    plannedAnesthesia?: string | null | undefined;
    materialsAndSystems?: string | null | undefined;
}, {
    patientFullName: string;
    patientBirthDate: string;
    diagnosisOrIndication: string;
    interventionName: string;
    explainedRisks: string[];
    alternatives: string[];
    aftercareRequirements: string[];
    clinicLegalName?: string | undefined;
    clinicAddress?: string | undefined;
    clinicOgrn?: string | undefined;
    clinicInn?: string | undefined;
    patientPhone?: string | undefined;
    patientSnils?: string | null | undefined;
    attendingDoctorFullName?: string | undefined;
    attendingDoctorSpecialty?: string | undefined;
    patientAddress?: string | undefined;
    medicalLicenseNumber?: string | undefined;
    medicalLicenseDate?: string | undefined;
    consentType?: "custom" | "orthodontics" | "therapy_endo_restoration" | "local_anesthesia" | "surgery_extraction" | "implantation_bone_graft" | "prosthetics" | "hygiene_whitening" | "periodontology" | "general_primary" | undefined;
    consentTitle?: string | undefined;
    patientPassport?: string | undefined;
    representativeFullName?: string | null | undefined;
    representativePassport?: string | null | undefined;
    representativeRelation?: string | null | undefined;
    plannedAnesthesia?: string | null | undefined;
    materialsAndSystems?: string | null | undefined;
    confirmedVoluntary?: boolean | undefined;
    questionsAnswered?: boolean | undefined;
    consentDate?: string | undefined;
}>;
export type InformedConsent1051nPayload = z.infer<typeof informedConsent1051nPayloadSchema>;
/**
 * Генератор пресета ИДС по Приказу Минздрава РФ № 1051н для конкретной процедуры.
 */
export declare function generateStatutoryConsent1051nPayload(params: {
    consentType: InformedConsentType;
    patient: {
        fullName: string;
        birthDate: string;
        passport?: string | null;
        address?: string | null;
        phone?: string | null;
        snils?: string | null;
    };
    doctor: {
        fullName: string;
        specialty?: string | null;
    };
    clinic?: {
        legalName?: string;
        address?: string;
        ogrn?: string;
        inn?: string;
        medicalLicenseNumber?: string;
    };
    representative?: {
        fullName?: string | null;
        passport?: string | null;
        relation?: string | null;
    } | null;
    customNotes?: string | null;
}): InformedConsent1051nPayload;
/**
 * Рендерер Информированного добровольного согласия (ИДС) по Приказу Минздрава № 1051н
 */
export declare function renderInformedConsent1051nHtml(payload: InformedConsent1051nPayload | any): string;
export declare const paidServiceContract736PayloadSchema: z.ZodObject<{
    contractNumber: z.ZodString;
    contractDate: z.ZodDefault<z.ZodString>;
    clinicLegalName: z.ZodDefault<z.ZodString>;
    clinicAddress: z.ZodDefault<z.ZodString>;
    clinicOgrn: z.ZodDefault<z.ZodString>;
    clinicInn: z.ZodDefault<z.ZodString>;
    clinicKpp: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodString>>>;
    medicalLicenseNumber: z.ZodDefault<z.ZodString>;
    medicalLicenseDate: z.ZodDefault<z.ZodString>;
    medicalLicenseIssuer: z.ZodDefault<z.ZodString>;
    clinicPhone: z.ZodDefault<z.ZodString>;
    clinicWebsite: z.ZodDefault<z.ZodString>;
    patientFullName: z.ZodString;
    patientBirthDate: z.ZodString;
    patientPassport: z.ZodDefault<z.ZodString>;
    patientAddress: z.ZodDefault<z.ZodString>;
    patientPhone: z.ZodDefault<z.ZodString>;
    patientSnils: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    customerFullName: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    customerPassport: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    customerAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    customerPhone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    serviceScope: z.ZodDefault<z.ZodString>;
    estimatedTotalRub: z.ZodDefault<z.ZodNumber>;
    serviceStart: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    serviceEnd: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    doctorFullName: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    contractNumber: string;
    patientFullName: string;
    doctorFullName: string;
    clinicLegalName: string;
    clinicAddress: string;
    clinicOgrn: string;
    clinicInn: string;
    patientBirthDate: string;
    patientPhone: string;
    patientAddress: string;
    clinicPhone: string;
    medicalLicenseNumber: string;
    medicalLicenseDate: string;
    patientPassport: string;
    contractDate: string;
    clinicKpp: string | null;
    medicalLicenseIssuer: string;
    clinicWebsite: string;
    serviceScope: string;
    estimatedTotalRub: number;
    patientSnils?: string | null | undefined;
    customerFullName?: string | null | undefined;
    customerPassport?: string | null | undefined;
    customerAddress?: string | null | undefined;
    customerPhone?: string | null | undefined;
    serviceStart?: string | null | undefined;
    serviceEnd?: string | null | undefined;
}, {
    contractNumber: string;
    patientFullName: string;
    patientBirthDate: string;
    doctorFullName?: string | undefined;
    clinicLegalName?: string | undefined;
    clinicAddress?: string | undefined;
    clinicOgrn?: string | undefined;
    clinicInn?: string | undefined;
    patientPhone?: string | undefined;
    patientSnils?: string | null | undefined;
    patientAddress?: string | undefined;
    clinicPhone?: string | undefined;
    medicalLicenseNumber?: string | undefined;
    medicalLicenseDate?: string | undefined;
    patientPassport?: string | undefined;
    contractDate?: string | undefined;
    clinicKpp?: string | null | undefined;
    medicalLicenseIssuer?: string | undefined;
    clinicWebsite?: string | undefined;
    customerFullName?: string | null | undefined;
    customerPassport?: string | null | undefined;
    customerAddress?: string | null | undefined;
    customerPhone?: string | null | undefined;
    serviceScope?: string | undefined;
    estimatedTotalRub?: number | undefined;
    serviceStart?: string | null | undefined;
    serviceEnd?: string | null | undefined;
}>;
export type PaidServiceContract736Payload = z.infer<typeof paidServiceContract736PayloadSchema>;
/**
 * Рендерер Договора на оказание платных медицинских услуг по Постановлению Правительства РФ № 736
 */
export declare function renderPaidServiceContract736Html(payload: PaidServiceContract736Payload | any): string;
export declare const actOfCompletedWorksItemSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    code804n: z.ZodDefault<z.ZodString>;
    serviceName: z.ZodString;
    toothNumber: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodNumber, z.ZodString]>>>;
    quantity: z.ZodDefault<z.ZodNumber>;
    unitPriceRub: z.ZodNumber;
    totalRub: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    quantity: number;
    totalRub: number;
    code804n: string;
    serviceName: string;
    unitPriceRub: number;
    id?: string | undefined;
    toothNumber?: string | number | null | undefined;
}, {
    totalRub: number;
    serviceName: string;
    unitPriceRub: number;
    id?: string | undefined;
    quantity?: number | undefined;
    toothNumber?: string | number | null | undefined;
    code804n?: string | undefined;
}>;
export type ActOfCompletedWorksItem = z.infer<typeof actOfCompletedWorksItemSchema>;
export declare const actOfCompletedWorksPayloadSchema: z.ZodObject<{
    actNumber: z.ZodString;
    actDate: z.ZodDefault<z.ZodString>;
    contractNumber: z.ZodDefault<z.ZodString>;
    contractDate: z.ZodDefault<z.ZodString>;
    clinicLegalName: z.ZodDefault<z.ZodString>;
    clinicAddress: z.ZodDefault<z.ZodString>;
    clinicOgrn: z.ZodDefault<z.ZodString>;
    clinicInn: z.ZodDefault<z.ZodString>;
    medicalLicenseNumber: z.ZodDefault<z.ZodString>;
    customerFullName: z.ZodString;
    customerPassport: z.ZodDefault<z.ZodString>;
    patientFullName: z.ZodString;
    attendingDoctorFullName: z.ZodDefault<z.ZodString>;
    attendingDoctorSpecialty: z.ZodDefault<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        code804n: z.ZodDefault<z.ZodString>;
        serviceName: z.ZodString;
        toothNumber: z.ZodOptional<z.ZodNullable<z.ZodUnion<[z.ZodNumber, z.ZodString]>>>;
        quantity: z.ZodDefault<z.ZodNumber>;
        unitPriceRub: z.ZodNumber;
        totalRub: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        quantity: number;
        totalRub: number;
        code804n: string;
        serviceName: string;
        unitPriceRub: number;
        id?: string | undefined;
        toothNumber?: string | number | null | undefined;
    }, {
        totalRub: number;
        serviceName: string;
        unitPriceRub: number;
        id?: string | undefined;
        quantity?: number | undefined;
        toothNumber?: string | number | null | undefined;
        code804n?: string | undefined;
    }>, "many">;
    totalAmountRub: z.ZodNumber;
    warrantyPeriodMonths: z.ZodDefault<z.ZodNumber>;
    warrantyTermsText: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    items: {
        quantity: number;
        totalRub: number;
        code804n: string;
        serviceName: string;
        unitPriceRub: number;
        id?: string | undefined;
        toothNumber?: string | number | null | undefined;
    }[];
    contractNumber: string;
    patientFullName: string;
    clinicLegalName: string;
    clinicAddress: string;
    clinicOgrn: string;
    clinicInn: string;
    attendingDoctorFullName: string;
    attendingDoctorSpecialty: string;
    medicalLicenseNumber: string;
    contractDate: string;
    customerFullName: string;
    customerPassport: string;
    actNumber: string;
    actDate: string;
    totalAmountRub: number;
    warrantyPeriodMonths: number;
    warrantyTermsText: string;
}, {
    items: {
        totalRub: number;
        serviceName: string;
        unitPriceRub: number;
        id?: string | undefined;
        quantity?: number | undefined;
        toothNumber?: string | number | null | undefined;
        code804n?: string | undefined;
    }[];
    patientFullName: string;
    customerFullName: string;
    actNumber: string;
    totalAmountRub: number;
    contractNumber?: string | undefined;
    clinicLegalName?: string | undefined;
    clinicAddress?: string | undefined;
    clinicOgrn?: string | undefined;
    clinicInn?: string | undefined;
    attendingDoctorFullName?: string | undefined;
    attendingDoctorSpecialty?: string | undefined;
    medicalLicenseNumber?: string | undefined;
    contractDate?: string | undefined;
    customerPassport?: string | undefined;
    actDate?: string | undefined;
    warrantyPeriodMonths?: number | undefined;
    warrantyTermsText?: string | undefined;
}>;
export type ActOfCompletedWorksPayload = z.infer<typeof actOfCompletedWorksPayloadSchema>;
/**
 * Рендерер Акта выполненных работ по Номенклатуре медицинских услуг (Приказ № 804н)
 */
export declare function renderActOfCompletedWorksHtml(payload: ActOfCompletedWorksPayload | any): string;
