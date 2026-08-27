/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ZOD SCHEMAS FOR EGISZ REMD CDA R2 & UKEP (МИНЗДРАВ РФ)
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { z } from "zod";
export declare const personNameSchema: z.ZodObject<{
    first: z.ZodString;
    last: z.ZodString;
    middle: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    first: string;
    last: string;
    middle?: string | undefined;
}, {
    first: string;
    last: string;
    middle?: string | undefined;
}>;
export declare const identityDocumentSchema: z.ZodObject<{
    typeCode: z.ZodDefault<z.ZodString>;
    series: z.ZodOptional<z.ZodString>;
    number: z.ZodString;
    issuedBy: z.ZodOptional<z.ZodString>;
    issueDate: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    number: string;
    typeCode: string;
    series?: string | undefined;
    issuedBy?: string | undefined;
    issueDate?: string | undefined;
}, {
    number: string;
    typeCode?: string | undefined;
    series?: string | undefined;
    issuedBy?: string | undefined;
    issueDate?: string | undefined;
}>;
export declare const patientCdaSchema: z.ZodObject<{
    patientId: z.ZodString;
    name: z.ZodObject<{
        first: z.ZodString;
        last: z.ZodString;
        middle: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        first: string;
        last: string;
        middle?: string | undefined;
    }, {
        first: string;
        last: string;
        middle?: string | undefined;
    }>;
    snils: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    birthDate: z.ZodNullable<z.ZodString>;
    gender: z.ZodNullable<z.ZodEnum<["male", "female", "other"]>>;
    polisOms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    polisDms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    identityDoc: z.ZodOptional<z.ZodNullable<z.ZodObject<{
        typeCode: z.ZodDefault<z.ZodString>;
        series: z.ZodOptional<z.ZodString>;
        number: z.ZodString;
        issuedBy: z.ZodOptional<z.ZodString>;
        issueDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        number: string;
        typeCode: string;
        series?: string | undefined;
        issuedBy?: string | undefined;
        issueDate?: string | undefined;
    }, {
        number: string;
        typeCode?: string | undefined;
        series?: string | undefined;
        issuedBy?: string | undefined;
        issueDate?: string | undefined;
    }>>>;
    address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    isForeignCitizen: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    name: {
        first: string;
        last: string;
        middle?: string | undefined;
    };
    patientId: string;
    birthDate: string | null;
    gender: "other" | "male" | "female" | null;
    isForeignCitizen: boolean;
    address?: string | null | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
    snils?: string | null | undefined;
    polisOms?: string | null | undefined;
    polisDms?: string | null | undefined;
    identityDoc?: {
        number: string;
        typeCode: string;
        series?: string | undefined;
        issuedBy?: string | undefined;
        issueDate?: string | undefined;
    } | null | undefined;
    addressFias?: string | null | undefined;
}, {
    name: {
        first: string;
        last: string;
        middle?: string | undefined;
    };
    patientId: string;
    birthDate: string | null;
    gender: "other" | "male" | "female" | null;
    address?: string | null | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
    snils?: string | null | undefined;
    polisOms?: string | null | undefined;
    polisDms?: string | null | undefined;
    identityDoc?: {
        number: string;
        typeCode?: string | undefined;
        series?: string | undefined;
        issuedBy?: string | undefined;
        issueDate?: string | undefined;
    } | null | undefined;
    addressFias?: string | null | undefined;
    isForeignCitizen?: boolean | undefined;
}>;
export declare const doctorCdaSchema: z.ZodObject<{
    name: z.ZodObject<{
        first: z.ZodString;
        last: z.ZodString;
        middle: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        first: string;
        last: string;
        middle?: string | undefined;
    }, {
        first: string;
        last: string;
        middle?: string | undefined;
    }>;
    snils: z.ZodOptional<z.ZodString>;
    position: z.ZodOptional<z.ZodString>;
    positionCode: z.ZodOptional<z.ZodString>;
    specialtyCode: z.ZodOptional<z.ZodString>;
    specialtyName: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: {
        first: string;
        last: string;
        middle?: string | undefined;
    };
    phone?: string | null | undefined;
    email?: string | null | undefined;
    snils?: string | undefined;
    position?: string | undefined;
    positionCode?: string | undefined;
    specialtyCode?: string | undefined;
    specialtyName?: string | undefined;
}, {
    name: {
        first: string;
        last: string;
        middle?: string | undefined;
    };
    phone?: string | null | undefined;
    email?: string | null | undefined;
    snils?: string | undefined;
    position?: string | undefined;
    positionCode?: string | undefined;
    specialtyCode?: string | undefined;
    specialtyName?: string | undefined;
}>;
export declare const clinicCdaSchema: z.ZodObject<{
    name: z.ZodString;
    oid: z.ZodOptional<z.ZodString>;
    ogrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    inn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    kpp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    licenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    licenseDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    legalAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    inn?: string | null | undefined;
    kpp?: string | null | undefined;
    ogrn?: string | null | undefined;
    address?: string | null | undefined;
    licenseNumber?: string | null | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
    addressFias?: string | null | undefined;
    oid?: string | undefined;
    licenseDate?: string | null | undefined;
    legalAddress?: string | null | undefined;
}, {
    name: string;
    inn?: string | null | undefined;
    kpp?: string | null | undefined;
    ogrn?: string | null | undefined;
    address?: string | null | undefined;
    licenseNumber?: string | null | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
    addressFias?: string | null | undefined;
    oid?: string | undefined;
    licenseDate?: string | null | undefined;
    legalAddress?: string | null | undefined;
}>;
export declare const legalAuthenticatorCdaSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodObject<{
        first: z.ZodString;
        last: z.ZodString;
        middle: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        first: string;
        last: string;
        middle?: string | undefined;
    }, {
        first: string;
        last: string;
        middle?: string | undefined;
    }>>;
    snils: z.ZodOptional<z.ZodString>;
    position: z.ZodOptional<z.ZodString>;
    positionCode: z.ZodOptional<z.ZodString>;
    time: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
}, "strip", z.ZodTypeAny, {
    name?: {
        first: string;
        last: string;
        middle?: string | undefined;
    } | undefined;
    time?: Date | undefined;
    snils?: string | undefined;
    position?: string | undefined;
    positionCode?: string | undefined;
}, {
    name?: {
        first: string;
        last: string;
        middle?: string | undefined;
    } | undefined;
    time?: unknown;
    snils?: string | undefined;
    position?: string | undefined;
    positionCode?: string | undefined;
}>;
export declare const dentalToothSurfaceSchema: z.ZodEnum<["V", "L", "O", "M", "D", "B", "P", "I", "R", "vestibular", "lingual", "palatal", "occlusal", "incisal", "mesial", "distal", "root", "buccal"]>;
export declare const dentalStatusItemSchema: z.ZodObject<{
    tooth: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    surfaces: z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodString]>>;
    condition: z.ZodString;
    conditionCode: z.ZodOptional<z.ZodString>;
    conditionName: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tooth: string | number;
    condition: string;
    surfaces?: string | string[] | undefined;
    description?: string | undefined;
    conditionCode?: string | undefined;
    conditionName?: string | undefined;
}, {
    tooth: string | number;
    condition: string;
    surfaces?: string | string[] | undefined;
    description?: string | undefined;
    conditionCode?: string | undefined;
    conditionName?: string | undefined;
}>;
export declare const diagnosisItemSchema: z.ZodObject<{
    icd10Code: z.ZodString;
    diagnosisText: z.ZodString;
    tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    isPrimary: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, "strip", z.ZodTypeAny, {
    diagnosisText: string;
    icd10Code: string;
    isPrimary: boolean;
    tooth?: string | number | undefined;
}, {
    diagnosisText: string;
    icd10Code: string;
    tooth?: string | number | undefined;
    isPrimary?: boolean | undefined;
}>;
export declare const serviceRenderedItemSchema: z.ZodObject<{
    code: z.ZodString;
    name: z.ZodString;
    quantity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
    priceRubKopecks: z.ZodOptional<z.ZodNumber>;
    serviceCategoryCode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["1", "2"]>>>;
    completedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
}, "strip", z.ZodTypeAny, {
    code: string;
    name: string;
    quantity: number;
    serviceCategoryCode: "1" | "2";
    completedAt?: string | Date | undefined;
    tooth?: string | number | undefined;
    priceRubKopecks?: number | undefined;
}, {
    code: string;
    name: string;
    quantity?: number | undefined;
    completedAt?: string | Date | undefined;
    tooth?: string | number | undefined;
    priceRubKopecks?: number | undefined;
    serviceCategoryCode?: "1" | "2" | undefined;
}>;
export declare const taxPaymentRecordItemSchema: z.ZodObject<{
    fiscalReceiptNumber: z.ZodString;
    fiscalReceiptDate: z.ZodString;
    paymentAmountKopecks: z.ZodNumber;
    serviceCategoryCode: z.ZodDefault<z.ZodEnum<["1", "2"]>>;
    contractNumber: z.ZodOptional<z.ZodString>;
    contractDate: z.ZodOptional<z.ZodString>;
    patientFullName: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    serviceCategoryCode: "1" | "2";
    fiscalReceiptNumber: string;
    fiscalReceiptDate: string;
    paymentAmountKopecks: number;
    contractNumber?: string | undefined;
    patientFullName?: string | undefined;
    contractDate?: string | undefined;
}, {
    fiscalReceiptNumber: string;
    fiscalReceiptDate: string;
    paymentAmountKopecks: number;
    contractNumber?: string | undefined;
    patientFullName?: string | undefined;
    contractDate?: string | undefined;
    serviceCategoryCode?: "1" | "2" | undefined;
}>;
export declare const taxpayerInfoSchema: z.ZodObject<{
    fullName: z.ZodString;
    snils: z.ZodOptional<z.ZodString>;
    inn: z.ZodOptional<z.ZodString>;
    birthDate: z.ZodOptional<z.ZodString>;
    relationToPatient: z.ZodDefault<z.ZodEnum<["1", "2", "3", "4"]>>;
}, "strip", z.ZodTypeAny, {
    fullName: string;
    relationToPatient: "1" | "2" | "3" | "4";
    inn?: string | undefined;
    snils?: string | undefined;
    birthDate?: string | undefined;
}, {
    fullName: string;
    inn?: string | undefined;
    snils?: string | undefined;
    birthDate?: string | undefined;
    relationToPatient?: "1" | "2" | "3" | "4" | undefined;
}>;
export declare const cdaSemd101Schema: z.ZodObject<{
    docKind: z.ZodDefault<z.ZodEnum<["101", "043u", "108"]>>;
    documentId: z.ZodString;
    documentVersion: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    documentTime: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    visitDate: z.ZodDate;
    encounterId: z.ZodOptional<z.ZodString>;
    documentSetId: z.ZodOptional<z.ZodString>;
    replacesDocumentId: z.ZodOptional<z.ZodString>;
    patient: z.ZodObject<{
        patientId: z.ZodString;
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        birthDate: z.ZodNullable<z.ZodString>;
        gender: z.ZodNullable<z.ZodEnum<["male", "female", "other"]>>;
        polisOms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        polisDms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        identityDoc: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            typeCode: z.ZodDefault<z.ZodString>;
            series: z.ZodOptional<z.ZodString>;
            number: z.ZodString;
            issuedBy: z.ZodOptional<z.ZodString>;
            issueDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }, {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }>>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        isForeignCitizen: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    }>;
    doctor: z.ZodObject<{
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        specialtyCode: z.ZodOptional<z.ZodString>;
        specialtyName: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }>;
    clinic: z.ZodObject<{
        name: z.ZodString;
        oid: z.ZodOptional<z.ZodString>;
        ogrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        inn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        kpp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        legalAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }>;
    legalAuthenticator: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        time: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }>>;
    complaints: z.ZodOptional<z.ZodString>;
    anamnesis: z.ZodOptional<z.ZodString>;
    anamnesisVitae: z.ZodOptional<z.ZodString>;
    dentalStatus: z.ZodOptional<z.ZodArray<z.ZodObject<{
        tooth: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
        surfaces: z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodString]>>;
        condition: z.ZodString;
        conditionCode: z.ZodOptional<z.ZodString>;
        conditionName: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }>, "many">>;
    objectiveStatus: z.ZodOptional<z.ZodString>;
    diagnoses: z.ZodArray<z.ZodObject<{
        icd10Code: z.ZodString;
        diagnosisText: z.ZodString;
        tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        isPrimary: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }, {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }>, "many">;
    services: z.ZodOptional<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        name: z.ZodString;
        quantity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        priceRubKopecks: z.ZodOptional<z.ZodNumber>;
        serviceCategoryCode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["1", "2"]>>>;
        completedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        name: string;
        quantity: number;
        serviceCategoryCode: "1" | "2";
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
    }, {
        code: string;
        name: string;
        quantity?: number | undefined;
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }>, "many">>;
    treatmentDescription: z.ZodOptional<z.ZodString>;
    recommendations: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    complications: z.ZodOptional<z.ZodString>;
    comorbidities: z.ZodOptional<z.ZodString>;
    instrumentTrayBarcode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    };
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    docKind: "101" | "043u" | "108";
    documentVersion: number;
    visitDate: Date;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    diagnoses: {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }[];
    treatmentDescription?: string | undefined;
    complaints?: string | undefined;
    anamnesis?: string | undefined;
    documentTime?: Date | undefined;
    encounterId?: string | undefined;
    documentSetId?: string | undefined;
    replacesDocumentId?: string | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
    anamnesisVitae?: string | undefined;
    dentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    objectiveStatus?: string | undefined;
    services?: {
        code: string;
        name: string;
        quantity: number;
        serviceCategoryCode: "1" | "2";
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
    }[] | undefined;
    recommendations?: string | string[] | undefined;
    complications?: string | undefined;
    comorbidities?: string | undefined;
    instrumentTrayBarcode?: string | undefined;
}, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    };
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    visitDate: Date;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    diagnoses: {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }[];
    treatmentDescription?: string | undefined;
    complaints?: string | undefined;
    anamnesis?: string | undefined;
    documentTime?: unknown;
    docKind?: "101" | "043u" | "108" | undefined;
    documentVersion?: number | undefined;
    encounterId?: string | undefined;
    documentSetId?: string | undefined;
    replacesDocumentId?: string | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
    anamnesisVitae?: string | undefined;
    dentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    objectiveStatus?: string | undefined;
    services?: {
        code: string;
        name: string;
        quantity?: number | undefined;
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }[] | undefined;
    recommendations?: string | string[] | undefined;
    complications?: string | undefined;
    comorbidities?: string | undefined;
    instrumentTrayBarcode?: string | undefined;
}>;
export declare const cdaSemd104Schema: z.ZodObject<{
    docKind: z.ZodDefault<z.ZodLiteral<"104">>;
    documentId: z.ZodString;
    documentVersion: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    documentTime: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    visitDate: z.ZodDate;
    admissionDate: z.ZodOptional<z.ZodDate>;
    dischargeDate: z.ZodOptional<z.ZodDate>;
    encounterId: z.ZodOptional<z.ZodString>;
    documentSetId: z.ZodOptional<z.ZodString>;
    replacesDocumentId: z.ZodOptional<z.ZodString>;
    patient: z.ZodObject<{
        patientId: z.ZodString;
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        birthDate: z.ZodNullable<z.ZodString>;
        gender: z.ZodNullable<z.ZodEnum<["male", "female", "other"]>>;
        polisOms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        polisDms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        identityDoc: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            typeCode: z.ZodDefault<z.ZodString>;
            series: z.ZodOptional<z.ZodString>;
            number: z.ZodString;
            issuedBy: z.ZodOptional<z.ZodString>;
            issueDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }, {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }>>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        isForeignCitizen: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    }>;
    doctor: z.ZodObject<{
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        specialtyCode: z.ZodOptional<z.ZodString>;
        specialtyName: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }>;
    clinic: z.ZodObject<{
        name: z.ZodString;
        oid: z.ZodOptional<z.ZodString>;
        ogrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        inn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        kpp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        legalAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }>;
    legalAuthenticator: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        time: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }>>;
    admissionDiagnoses: z.ZodOptional<z.ZodArray<z.ZodObject<{
        icd10Code: z.ZodString;
        diagnosisText: z.ZodString;
        tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        isPrimary: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }, {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }>, "many">>;
    dischargeDiagnoses: z.ZodArray<z.ZodObject<{
        icd10Code: z.ZodString;
        diagnosisText: z.ZodString;
        tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        isPrimary: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }, {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }>, "many">;
    anamnesis: z.ZodOptional<z.ZodString>;
    clinicalCourse: z.ZodOptional<z.ZodString>;
    initialDentalStatus: z.ZodOptional<z.ZodArray<z.ZodObject<{
        tooth: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
        surfaces: z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodString]>>;
        condition: z.ZodString;
        conditionCode: z.ZodOptional<z.ZodString>;
        conditionName: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }>, "many">>;
    finalDentalStatus: z.ZodOptional<z.ZodArray<z.ZodObject<{
        tooth: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
        surfaces: z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodString]>>;
        condition: z.ZodString;
        conditionCode: z.ZodOptional<z.ZodString>;
        conditionName: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }>, "many">>;
    objectiveStatus: z.ZodOptional<z.ZodString>;
    servicesRendered: z.ZodDefault<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        name: z.ZodString;
        quantity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        priceRubKopecks: z.ZodOptional<z.ZodNumber>;
        serviceCategoryCode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["1", "2"]>>>;
        completedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        name: string;
        quantity: number;
        serviceCategoryCode: "1" | "2";
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
    }, {
        code: string;
        name: string;
        quantity?: number | undefined;
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }>, "many">>;
    surgeryProtocol: z.ZodOptional<z.ZodString>;
    anesthesiaProtocol: z.ZodOptional<z.ZodString>;
    radiologyStudiesSummary: z.ZodOptional<z.ZodString>;
    epicrisisText: z.ZodString;
    outcomeCode: z.ZodOptional<z.ZodEnum<["recovery", "improvement", "unchanged"]>>;
    outcomeName: z.ZodOptional<z.ZodString>;
    recommendations: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    nextFollowupDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    };
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    docKind: "104";
    documentVersion: number;
    visitDate: Date;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    recommendations: string | string[];
    dischargeDiagnoses: {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }[];
    servicesRendered: {
        code: string;
        name: string;
        quantity: number;
        serviceCategoryCode: "1" | "2";
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
    }[];
    epicrisisText: string;
    anamnesis?: string | undefined;
    documentTime?: Date | undefined;
    encounterId?: string | undefined;
    documentSetId?: string | undefined;
    replacesDocumentId?: string | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
    objectiveStatus?: string | undefined;
    admissionDate?: Date | undefined;
    dischargeDate?: Date | undefined;
    admissionDiagnoses?: {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }[] | undefined;
    clinicalCourse?: string | undefined;
    initialDentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    finalDentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    surgeryProtocol?: string | undefined;
    anesthesiaProtocol?: string | undefined;
    radiologyStudiesSummary?: string | undefined;
    outcomeCode?: "recovery" | "improvement" | "unchanged" | undefined;
    outcomeName?: string | undefined;
    nextFollowupDate?: string | Date | undefined;
}, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    };
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    visitDate: Date;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    recommendations: string | string[];
    dischargeDiagnoses: {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }[];
    epicrisisText: string;
    anamnesis?: string | undefined;
    documentTime?: unknown;
    docKind?: "104" | undefined;
    documentVersion?: number | undefined;
    encounterId?: string | undefined;
    documentSetId?: string | undefined;
    replacesDocumentId?: string | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
    objectiveStatus?: string | undefined;
    admissionDate?: Date | undefined;
    dischargeDate?: Date | undefined;
    admissionDiagnoses?: {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }[] | undefined;
    clinicalCourse?: string | undefined;
    initialDentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    finalDentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    servicesRendered?: {
        code: string;
        name: string;
        quantity?: number | undefined;
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }[] | undefined;
    surgeryProtocol?: string | undefined;
    anesthesiaProtocol?: string | undefined;
    radiologyStudiesSummary?: string | undefined;
    outcomeCode?: "recovery" | "improvement" | "unchanged" | undefined;
    outcomeName?: string | undefined;
    nextFollowupDate?: string | Date | undefined;
}>;
export declare const cdaSemd130Schema: z.ZodObject<{
    docKind: z.ZodDefault<z.ZodLiteral<"130">>;
    documentId: z.ZodString;
    documentVersion: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    documentTime: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    issueDate: z.ZodDate;
    taxYear: z.ZodNumber;
    certificateNumber: z.ZodString;
    patient: z.ZodObject<{
        patientId: z.ZodString;
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        birthDate: z.ZodNullable<z.ZodString>;
        gender: z.ZodNullable<z.ZodEnum<["male", "female", "other"]>>;
        polisOms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        polisDms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        identityDoc: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            typeCode: z.ZodDefault<z.ZodString>;
            series: z.ZodOptional<z.ZodString>;
            number: z.ZodString;
            issuedBy: z.ZodOptional<z.ZodString>;
            issueDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }, {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }>>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        isForeignCitizen: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    }>;
    taxpayer: z.ZodObject<{
        fullName: z.ZodString;
        snils: z.ZodOptional<z.ZodString>;
        inn: z.ZodOptional<z.ZodString>;
        birthDate: z.ZodOptional<z.ZodString>;
        relationToPatient: z.ZodDefault<z.ZodEnum<["1", "2", "3", "4"]>>;
    }, "strip", z.ZodTypeAny, {
        fullName: string;
        relationToPatient: "1" | "2" | "3" | "4";
        inn?: string | undefined;
        snils?: string | undefined;
        birthDate?: string | undefined;
    }, {
        fullName: string;
        inn?: string | undefined;
        snils?: string | undefined;
        birthDate?: string | undefined;
        relationToPatient?: "1" | "2" | "3" | "4" | undefined;
    }>;
    doctor: z.ZodObject<{
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        specialtyCode: z.ZodOptional<z.ZodString>;
        specialtyName: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }>;
    clinic: z.ZodObject<{
        name: z.ZodString;
        oid: z.ZodOptional<z.ZodString>;
        ogrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        inn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        kpp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        legalAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }>;
    legalAuthenticator: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        time: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }>>;
    contractNumber: z.ZodString;
    contractDate: z.ZodString;
    paymentRecords: z.ZodArray<z.ZodObject<{
        fiscalReceiptNumber: z.ZodString;
        fiscalReceiptDate: z.ZodString;
        paymentAmountKopecks: z.ZodNumber;
        serviceCategoryCode: z.ZodDefault<z.ZodEnum<["1", "2"]>>;
        contractNumber: z.ZodOptional<z.ZodString>;
        contractDate: z.ZodOptional<z.ZodString>;
        patientFullName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        serviceCategoryCode: "1" | "2";
        fiscalReceiptNumber: string;
        fiscalReceiptDate: string;
        paymentAmountKopecks: number;
        contractNumber?: string | undefined;
        patientFullName?: string | undefined;
        contractDate?: string | undefined;
    }, {
        fiscalReceiptNumber: string;
        fiscalReceiptDate: string;
        paymentAmountKopecks: number;
        contractNumber?: string | undefined;
        patientFullName?: string | undefined;
        contractDate?: string | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }>, "many">;
    totalOrdinaryTreatmentKopecks: z.ZodNumber;
    totalExpensiveTreatmentKopecks: z.ZodNumber;
    totalSumKopecks: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    };
    taxYear: number;
    certificateNumber: string;
    contractNumber: string;
    contractDate: string;
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    issueDate: Date;
    docKind: "130";
    documentVersion: number;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    taxpayer: {
        fullName: string;
        relationToPatient: "1" | "2" | "3" | "4";
        inn?: string | undefined;
        snils?: string | undefined;
        birthDate?: string | undefined;
    };
    paymentRecords: {
        serviceCategoryCode: "1" | "2";
        fiscalReceiptNumber: string;
        fiscalReceiptDate: string;
        paymentAmountKopecks: number;
        contractNumber?: string | undefined;
        patientFullName?: string | undefined;
        contractDate?: string | undefined;
    }[];
    totalOrdinaryTreatmentKopecks: number;
    totalExpensiveTreatmentKopecks: number;
    totalSumKopecks: number;
    documentTime?: Date | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
}, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    };
    taxYear: number;
    certificateNumber: string;
    contractNumber: string;
    contractDate: string;
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    issueDate: Date;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    taxpayer: {
        fullName: string;
        inn?: string | undefined;
        snils?: string | undefined;
        birthDate?: string | undefined;
        relationToPatient?: "1" | "2" | "3" | "4" | undefined;
    };
    paymentRecords: {
        fiscalReceiptNumber: string;
        fiscalReceiptDate: string;
        paymentAmountKopecks: number;
        contractNumber?: string | undefined;
        patientFullName?: string | undefined;
        contractDate?: string | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }[];
    totalOrdinaryTreatmentKopecks: number;
    totalExpensiveTreatmentKopecks: number;
    totalSumKopecks: number;
    documentTime?: unknown;
    docKind?: "130" | undefined;
    documentVersion?: number | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
}>;
export declare const cdaOrthodonticAnthropometrySchema: z.ZodObject<{
    facialType: z.ZodOptional<z.ZodEnum<["leptoprosopic", "mesoprosopic", "euryprosopic"]>>;
    profileType: z.ZodOptional<z.ZodEnum<["straight", "convex", "concave"]>>;
    facialSymmetry: z.ZodOptional<z.ZodEnum<["symmetric", "chin_deviation_left", "chin_deviation_right"]>>;
    chinDeviationMm: z.ZodOptional<z.ZodNumber>;
    nasolabialAngleDegrees: z.ZodOptional<z.ZodNumber>;
    mentolabialSulcus: z.ZodOptional<z.ZodEnum<["normal", "deep_pronounced", "smoothed"]>>;
    lipCompetenceAtRest: z.ZodOptional<z.ZodEnum<["competent_closed", "incompetent_open", "closed_with_strain"]>>;
    incisalDisplayAtSmileMm: z.ZodOptional<z.ZodNumber>;
    gummySmileMm: z.ZodOptional<z.ZodNumber>;
    photoProtocolCompleted: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
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
}, {
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
}>;
export declare const cdaOrthodonticCephalometrySchema: z.ZodObject<{
    snaAngle: z.ZodOptional<z.ZodNumber>;
    snbAngle: z.ZodOptional<z.ZodNumber>;
    anbAngle: z.ZodOptional<z.ZodNumber>;
    witsAppraisalMm: z.ZodOptional<z.ZodNumber>;
    fmaAngle: z.ZodOptional<z.ZodNumber>;
    snGoGnAngle: z.ZodOptional<z.ZodNumber>;
    upperIncisorToNaAngle: z.ZodOptional<z.ZodNumber>;
    upperIncisorToNaMm: z.ZodOptional<z.ZodNumber>;
    lowerIncisorToNbAngle: z.ZodOptional<z.ZodNumber>;
    lowerIncisorToNbMm: z.ZodOptional<z.ZodNumber>;
    interincisalAngle: z.ZodOptional<z.ZodNumber>;
    growthPattern: z.ZodOptional<z.ZodEnum<["normodivergent", "hyperdivergent_vertical", "hypodivergent_horizontal"]>>;
    skeletalClass: z.ZodOptional<z.ZodEnum<["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]>>;
}, "strip", z.ZodTypeAny, {
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
    skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
}, {
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
    skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
}>;
export declare const cdaOrthodonticIndicesSchema: z.ZodObject<{
    tonnIndexNotes: z.ZodOptional<z.ZodString>;
    pontIndexNotes: z.ZodOptional<z.ZodString>;
    boltonIndexNotes: z.ZodOptional<z.ZodString>;
    korkhausIndexNotes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tonnIndexNotes?: string | undefined;
    pontIndexNotes?: string | undefined;
    boltonIndexNotes?: string | undefined;
    korkhausIndexNotes?: string | undefined;
}, {
    tonnIndexNotes?: string | undefined;
    pontIndexNotes?: string | undefined;
    boltonIndexNotes?: string | undefined;
    korkhausIndexNotes?: string | undefined;
}>;
export declare const cdaOrthodonticAppliancePlanSchema: z.ZodObject<{
    applianceType: z.ZodOptional<z.ZodString>;
    alignerStepsCount: z.ZodOptional<z.ZodNumber>;
    extractionPlan: z.ZodOptional<z.ZodString>;
    treatmentStages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    estimatedDurationMonths: z.ZodOptional<z.ZodNumber>;
    retentionProtocol: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    applianceType?: string | undefined;
    alignerStepsCount?: number | undefined;
    extractionPlan?: string | undefined;
    treatmentStages?: string[] | undefined;
    estimatedDurationMonths?: number | undefined;
    retentionProtocol?: string | undefined;
}, {
    applianceType?: string | undefined;
    alignerStepsCount?: number | undefined;
    extractionPlan?: string | undefined;
    treatmentStages?: string[] | undefined;
    estimatedDurationMonths?: number | undefined;
    retentionProtocol?: string | undefined;
}>;
export declare const cdaSemd043_1uSchema: z.ZodObject<{
    docKind: z.ZodDefault<z.ZodEnum<["043-1u", "0431u", "109"]>>;
    documentId: z.ZodString;
    documentVersion: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    documentTime: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    visitDate: z.ZodDate;
    encounterId: z.ZodOptional<z.ZodString>;
    documentSetId: z.ZodOptional<z.ZodString>;
    replacesDocumentId: z.ZodOptional<z.ZodString>;
    patient: z.ZodObject<{
        patientId: z.ZodString;
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        birthDate: z.ZodNullable<z.ZodString>;
        gender: z.ZodNullable<z.ZodEnum<["male", "female", "other"]>>;
        polisOms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        polisDms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        identityDoc: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            typeCode: z.ZodDefault<z.ZodString>;
            series: z.ZodOptional<z.ZodString>;
            number: z.ZodString;
            issuedBy: z.ZodOptional<z.ZodString>;
            issueDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }, {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }>>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        isForeignCitizen: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    }>;
    doctor: z.ZodObject<{
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        specialtyCode: z.ZodOptional<z.ZodString>;
        specialtyName: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }>;
    clinic: z.ZodObject<{
        name: z.ZodString;
        oid: z.ZodOptional<z.ZodString>;
        ogrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        inn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        kpp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        legalAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }>;
    legalAuthenticator: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        time: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }>>;
    orthodonticDiagnosis: z.ZodString;
    icd10Code: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    diagnoses: z.ZodOptional<z.ZodArray<z.ZodObject<{
        icd10Code: z.ZodString;
        diagnosisText: z.ZodString;
        tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        isPrimary: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }, {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }>, "many">>;
    angleMolarClassRight: z.ZodOptional<z.ZodEnum<["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]>>;
    angleMolarClassLeft: z.ZodOptional<z.ZodEnum<["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]>>;
    angleCanineClassRight: z.ZodOptional<z.ZodEnum<["class_1", "class_2", "class_3"]>>;
    angleCanineClassLeft: z.ZodOptional<z.ZodEnum<["class_1", "class_2", "class_3"]>>;
    complaints: z.ZodOptional<z.ZodString>;
    anamnesis: z.ZodOptional<z.ZodString>;
    anamnesisVitae: z.ZodOptional<z.ZodString>;
    anthropometry: z.ZodOptional<z.ZodObject<{
        facialType: z.ZodOptional<z.ZodEnum<["leptoprosopic", "mesoprosopic", "euryprosopic"]>>;
        profileType: z.ZodOptional<z.ZodEnum<["straight", "convex", "concave"]>>;
        facialSymmetry: z.ZodOptional<z.ZodEnum<["symmetric", "chin_deviation_left", "chin_deviation_right"]>>;
        chinDeviationMm: z.ZodOptional<z.ZodNumber>;
        nasolabialAngleDegrees: z.ZodOptional<z.ZodNumber>;
        mentolabialSulcus: z.ZodOptional<z.ZodEnum<["normal", "deep_pronounced", "smoothed"]>>;
        lipCompetenceAtRest: z.ZodOptional<z.ZodEnum<["competent_closed", "incompetent_open", "closed_with_strain"]>>;
        incisalDisplayAtSmileMm: z.ZodOptional<z.ZodNumber>;
        gummySmileMm: z.ZodOptional<z.ZodNumber>;
        photoProtocolCompleted: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
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
    }, {
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
    }>>;
    cephalometry: z.ZodOptional<z.ZodObject<{
        snaAngle: z.ZodOptional<z.ZodNumber>;
        snbAngle: z.ZodOptional<z.ZodNumber>;
        anbAngle: z.ZodOptional<z.ZodNumber>;
        witsAppraisalMm: z.ZodOptional<z.ZodNumber>;
        fmaAngle: z.ZodOptional<z.ZodNumber>;
        snGoGnAngle: z.ZodOptional<z.ZodNumber>;
        upperIncisorToNaAngle: z.ZodOptional<z.ZodNumber>;
        upperIncisorToNaMm: z.ZodOptional<z.ZodNumber>;
        lowerIncisorToNbAngle: z.ZodOptional<z.ZodNumber>;
        lowerIncisorToNbMm: z.ZodOptional<z.ZodNumber>;
        interincisalAngle: z.ZodOptional<z.ZodNumber>;
        growthPattern: z.ZodOptional<z.ZodEnum<["normodivergent", "hyperdivergent_vertical", "hypodivergent_horizontal"]>>;
        skeletalClass: z.ZodOptional<z.ZodEnum<["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]>>;
    }, "strip", z.ZodTypeAny, {
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
        skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    }, {
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
        skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    }>>;
    indices: z.ZodOptional<z.ZodObject<{
        tonnIndexNotes: z.ZodOptional<z.ZodString>;
        pontIndexNotes: z.ZodOptional<z.ZodString>;
        boltonIndexNotes: z.ZodOptional<z.ZodString>;
        korkhausIndexNotes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tonnIndexNotes?: string | undefined;
        pontIndexNotes?: string | undefined;
        boltonIndexNotes?: string | undefined;
        korkhausIndexNotes?: string | undefined;
    }, {
        tonnIndexNotes?: string | undefined;
        pontIndexNotes?: string | undefined;
        boltonIndexNotes?: string | undefined;
        korkhausIndexNotes?: string | undefined;
    }>>;
    appliancePlan: z.ZodOptional<z.ZodObject<{
        applianceType: z.ZodOptional<z.ZodString>;
        alignerStepsCount: z.ZodOptional<z.ZodNumber>;
        extractionPlan: z.ZodOptional<z.ZodString>;
        treatmentStages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        estimatedDurationMonths: z.ZodOptional<z.ZodNumber>;
        retentionProtocol: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        applianceType?: string | undefined;
        alignerStepsCount?: number | undefined;
        extractionPlan?: string | undefined;
        treatmentStages?: string[] | undefined;
        estimatedDurationMonths?: number | undefined;
        retentionProtocol?: string | undefined;
    }, {
        applianceType?: string | undefined;
        alignerStepsCount?: number | undefined;
        extractionPlan?: string | undefined;
        treatmentStages?: string[] | undefined;
        estimatedDurationMonths?: number | undefined;
        retentionProtocol?: string | undefined;
    }>>;
    dentalStatus: z.ZodOptional<z.ZodArray<z.ZodObject<{
        tooth: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
        surfaces: z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodString]>>;
        condition: z.ZodString;
        conditionCode: z.ZodOptional<z.ZodString>;
        conditionName: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }>, "many">>;
    objectiveStatus: z.ZodOptional<z.ZodString>;
    services: z.ZodOptional<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        name: z.ZodString;
        quantity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        priceRubKopecks: z.ZodOptional<z.ZodNumber>;
        serviceCategoryCode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["1", "2"]>>>;
        completedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        name: string;
        quantity: number;
        serviceCategoryCode: "1" | "2";
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
    }, {
        code: string;
        name: string;
        quantity?: number | undefined;
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }>, "many">>;
    recommendations: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    };
    orthodonticDiagnosis: string;
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    icd10Code: string;
    docKind: "043-1u" | "109" | "0431u";
    documentVersion: number;
    visitDate: Date;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    angleMolarClassRight?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    angleMolarClassLeft?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    angleCanineClassRight?: "class_1" | "class_2" | "class_3" | undefined;
    angleCanineClassLeft?: "class_1" | "class_2" | "class_3" | undefined;
    anthropometry?: {
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
    } | undefined;
    cephalometry?: {
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
        skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    } | undefined;
    appliancePlan?: {
        applianceType?: string | undefined;
        alignerStepsCount?: number | undefined;
        extractionPlan?: string | undefined;
        treatmentStages?: string[] | undefined;
        estimatedDurationMonths?: number | undefined;
        retentionProtocol?: string | undefined;
    } | undefined;
    complaints?: string | undefined;
    anamnesis?: string | undefined;
    indices?: {
        tonnIndexNotes?: string | undefined;
        pontIndexNotes?: string | undefined;
        boltonIndexNotes?: string | undefined;
        korkhausIndexNotes?: string | undefined;
    } | undefined;
    documentTime?: Date | undefined;
    encounterId?: string | undefined;
    documentSetId?: string | undefined;
    replacesDocumentId?: string | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
    anamnesisVitae?: string | undefined;
    dentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    objectiveStatus?: string | undefined;
    diagnoses?: {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }[] | undefined;
    services?: {
        code: string;
        name: string;
        quantity: number;
        serviceCategoryCode: "1" | "2";
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
    }[] | undefined;
    recommendations?: string | string[] | undefined;
}, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    };
    orthodonticDiagnosis: string;
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    visitDate: Date;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    angleMolarClassRight?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    angleMolarClassLeft?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    angleCanineClassRight?: "class_1" | "class_2" | "class_3" | undefined;
    angleCanineClassLeft?: "class_1" | "class_2" | "class_3" | undefined;
    anthropometry?: {
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
    } | undefined;
    cephalometry?: {
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
        skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    } | undefined;
    appliancePlan?: {
        applianceType?: string | undefined;
        alignerStepsCount?: number | undefined;
        extractionPlan?: string | undefined;
        treatmentStages?: string[] | undefined;
        estimatedDurationMonths?: number | undefined;
        retentionProtocol?: string | undefined;
    } | undefined;
    complaints?: string | undefined;
    anamnesis?: string | undefined;
    indices?: {
        tonnIndexNotes?: string | undefined;
        pontIndexNotes?: string | undefined;
        boltonIndexNotes?: string | undefined;
        korkhausIndexNotes?: string | undefined;
    } | undefined;
    documentTime?: unknown;
    icd10Code?: string | undefined;
    docKind?: "043-1u" | "109" | "0431u" | undefined;
    documentVersion?: number | undefined;
    encounterId?: string | undefined;
    documentSetId?: string | undefined;
    replacesDocumentId?: string | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
    anamnesisVitae?: string | undefined;
    dentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    objectiveStatus?: string | undefined;
    diagnoses?: {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }[] | undefined;
    services?: {
        code: string;
        name: string;
        quantity?: number | undefined;
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }[] | undefined;
    recommendations?: string | string[] | undefined;
}>;
export declare const cdaSemd109Schema: z.ZodObject<{
    docKind: z.ZodDefault<z.ZodEnum<["043-1u", "0431u", "109"]>>;
    documentId: z.ZodString;
    documentVersion: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    documentTime: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    visitDate: z.ZodDate;
    encounterId: z.ZodOptional<z.ZodString>;
    documentSetId: z.ZodOptional<z.ZodString>;
    replacesDocumentId: z.ZodOptional<z.ZodString>;
    patient: z.ZodObject<{
        patientId: z.ZodString;
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        birthDate: z.ZodNullable<z.ZodString>;
        gender: z.ZodNullable<z.ZodEnum<["male", "female", "other"]>>;
        polisOms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        polisDms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        identityDoc: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            typeCode: z.ZodDefault<z.ZodString>;
            series: z.ZodOptional<z.ZodString>;
            number: z.ZodString;
            issuedBy: z.ZodOptional<z.ZodString>;
            issueDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }, {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }>>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        isForeignCitizen: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    }>;
    doctor: z.ZodObject<{
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        specialtyCode: z.ZodOptional<z.ZodString>;
        specialtyName: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }>;
    clinic: z.ZodObject<{
        name: z.ZodString;
        oid: z.ZodOptional<z.ZodString>;
        ogrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        inn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        kpp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        legalAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }>;
    legalAuthenticator: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        time: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }>>;
    orthodonticDiagnosis: z.ZodString;
    icd10Code: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    diagnoses: z.ZodOptional<z.ZodArray<z.ZodObject<{
        icd10Code: z.ZodString;
        diagnosisText: z.ZodString;
        tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        isPrimary: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }, {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }>, "many">>;
    angleMolarClassRight: z.ZodOptional<z.ZodEnum<["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]>>;
    angleMolarClassLeft: z.ZodOptional<z.ZodEnum<["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]>>;
    angleCanineClassRight: z.ZodOptional<z.ZodEnum<["class_1", "class_2", "class_3"]>>;
    angleCanineClassLeft: z.ZodOptional<z.ZodEnum<["class_1", "class_2", "class_3"]>>;
    complaints: z.ZodOptional<z.ZodString>;
    anamnesis: z.ZodOptional<z.ZodString>;
    anamnesisVitae: z.ZodOptional<z.ZodString>;
    anthropometry: z.ZodOptional<z.ZodObject<{
        facialType: z.ZodOptional<z.ZodEnum<["leptoprosopic", "mesoprosopic", "euryprosopic"]>>;
        profileType: z.ZodOptional<z.ZodEnum<["straight", "convex", "concave"]>>;
        facialSymmetry: z.ZodOptional<z.ZodEnum<["symmetric", "chin_deviation_left", "chin_deviation_right"]>>;
        chinDeviationMm: z.ZodOptional<z.ZodNumber>;
        nasolabialAngleDegrees: z.ZodOptional<z.ZodNumber>;
        mentolabialSulcus: z.ZodOptional<z.ZodEnum<["normal", "deep_pronounced", "smoothed"]>>;
        lipCompetenceAtRest: z.ZodOptional<z.ZodEnum<["competent_closed", "incompetent_open", "closed_with_strain"]>>;
        incisalDisplayAtSmileMm: z.ZodOptional<z.ZodNumber>;
        gummySmileMm: z.ZodOptional<z.ZodNumber>;
        photoProtocolCompleted: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
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
    }, {
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
    }>>;
    cephalometry: z.ZodOptional<z.ZodObject<{
        snaAngle: z.ZodOptional<z.ZodNumber>;
        snbAngle: z.ZodOptional<z.ZodNumber>;
        anbAngle: z.ZodOptional<z.ZodNumber>;
        witsAppraisalMm: z.ZodOptional<z.ZodNumber>;
        fmaAngle: z.ZodOptional<z.ZodNumber>;
        snGoGnAngle: z.ZodOptional<z.ZodNumber>;
        upperIncisorToNaAngle: z.ZodOptional<z.ZodNumber>;
        upperIncisorToNaMm: z.ZodOptional<z.ZodNumber>;
        lowerIncisorToNbAngle: z.ZodOptional<z.ZodNumber>;
        lowerIncisorToNbMm: z.ZodOptional<z.ZodNumber>;
        interincisalAngle: z.ZodOptional<z.ZodNumber>;
        growthPattern: z.ZodOptional<z.ZodEnum<["normodivergent", "hyperdivergent_vertical", "hypodivergent_horizontal"]>>;
        skeletalClass: z.ZodOptional<z.ZodEnum<["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]>>;
    }, "strip", z.ZodTypeAny, {
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
        skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    }, {
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
        skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    }>>;
    indices: z.ZodOptional<z.ZodObject<{
        tonnIndexNotes: z.ZodOptional<z.ZodString>;
        pontIndexNotes: z.ZodOptional<z.ZodString>;
        boltonIndexNotes: z.ZodOptional<z.ZodString>;
        korkhausIndexNotes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tonnIndexNotes?: string | undefined;
        pontIndexNotes?: string | undefined;
        boltonIndexNotes?: string | undefined;
        korkhausIndexNotes?: string | undefined;
    }, {
        tonnIndexNotes?: string | undefined;
        pontIndexNotes?: string | undefined;
        boltonIndexNotes?: string | undefined;
        korkhausIndexNotes?: string | undefined;
    }>>;
    appliancePlan: z.ZodOptional<z.ZodObject<{
        applianceType: z.ZodOptional<z.ZodString>;
        alignerStepsCount: z.ZodOptional<z.ZodNumber>;
        extractionPlan: z.ZodOptional<z.ZodString>;
        treatmentStages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        estimatedDurationMonths: z.ZodOptional<z.ZodNumber>;
        retentionProtocol: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        applianceType?: string | undefined;
        alignerStepsCount?: number | undefined;
        extractionPlan?: string | undefined;
        treatmentStages?: string[] | undefined;
        estimatedDurationMonths?: number | undefined;
        retentionProtocol?: string | undefined;
    }, {
        applianceType?: string | undefined;
        alignerStepsCount?: number | undefined;
        extractionPlan?: string | undefined;
        treatmentStages?: string[] | undefined;
        estimatedDurationMonths?: number | undefined;
        retentionProtocol?: string | undefined;
    }>>;
    dentalStatus: z.ZodOptional<z.ZodArray<z.ZodObject<{
        tooth: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
        surfaces: z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodString]>>;
        condition: z.ZodString;
        conditionCode: z.ZodOptional<z.ZodString>;
        conditionName: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }>, "many">>;
    objectiveStatus: z.ZodOptional<z.ZodString>;
    services: z.ZodOptional<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        name: z.ZodString;
        quantity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        priceRubKopecks: z.ZodOptional<z.ZodNumber>;
        serviceCategoryCode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["1", "2"]>>>;
        completedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        name: string;
        quantity: number;
        serviceCategoryCode: "1" | "2";
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
    }, {
        code: string;
        name: string;
        quantity?: number | undefined;
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }>, "many">>;
    recommendations: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    };
    orthodonticDiagnosis: string;
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    icd10Code: string;
    docKind: "043-1u" | "109" | "0431u";
    documentVersion: number;
    visitDate: Date;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    angleMolarClassRight?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    angleMolarClassLeft?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    angleCanineClassRight?: "class_1" | "class_2" | "class_3" | undefined;
    angleCanineClassLeft?: "class_1" | "class_2" | "class_3" | undefined;
    anthropometry?: {
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
    } | undefined;
    cephalometry?: {
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
        skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    } | undefined;
    appliancePlan?: {
        applianceType?: string | undefined;
        alignerStepsCount?: number | undefined;
        extractionPlan?: string | undefined;
        treatmentStages?: string[] | undefined;
        estimatedDurationMonths?: number | undefined;
        retentionProtocol?: string | undefined;
    } | undefined;
    complaints?: string | undefined;
    anamnesis?: string | undefined;
    indices?: {
        tonnIndexNotes?: string | undefined;
        pontIndexNotes?: string | undefined;
        boltonIndexNotes?: string | undefined;
        korkhausIndexNotes?: string | undefined;
    } | undefined;
    documentTime?: Date | undefined;
    encounterId?: string | undefined;
    documentSetId?: string | undefined;
    replacesDocumentId?: string | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
    anamnesisVitae?: string | undefined;
    dentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    objectiveStatus?: string | undefined;
    diagnoses?: {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }[] | undefined;
    services?: {
        code: string;
        name: string;
        quantity: number;
        serviceCategoryCode: "1" | "2";
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
    }[] | undefined;
    recommendations?: string | string[] | undefined;
}, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    };
    orthodonticDiagnosis: string;
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    visitDate: Date;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    angleMolarClassRight?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    angleMolarClassLeft?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    angleCanineClassRight?: "class_1" | "class_2" | "class_3" | undefined;
    angleCanineClassLeft?: "class_1" | "class_2" | "class_3" | undefined;
    anthropometry?: {
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
    } | undefined;
    cephalometry?: {
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
        skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    } | undefined;
    appliancePlan?: {
        applianceType?: string | undefined;
        alignerStepsCount?: number | undefined;
        extractionPlan?: string | undefined;
        treatmentStages?: string[] | undefined;
        estimatedDurationMonths?: number | undefined;
        retentionProtocol?: string | undefined;
    } | undefined;
    complaints?: string | undefined;
    anamnesis?: string | undefined;
    indices?: {
        tonnIndexNotes?: string | undefined;
        pontIndexNotes?: string | undefined;
        boltonIndexNotes?: string | undefined;
        korkhausIndexNotes?: string | undefined;
    } | undefined;
    documentTime?: unknown;
    icd10Code?: string | undefined;
    docKind?: "043-1u" | "109" | "0431u" | undefined;
    documentVersion?: number | undefined;
    encounterId?: string | undefined;
    documentSetId?: string | undefined;
    replacesDocumentId?: string | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
    anamnesisVitae?: string | undefined;
    dentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    objectiveStatus?: string | undefined;
    diagnoses?: {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }[] | undefined;
    services?: {
        code: string;
        name: string;
        quantity?: number | undefined;
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }[] | undefined;
    recommendations?: string | string[] | undefined;
}>;
export declare const cdaDocumentParamsSchema: z.ZodUnion<[z.ZodObject<{
    docKind: z.ZodDefault<z.ZodEnum<["101", "043u", "108"]>>;
    documentId: z.ZodString;
    documentVersion: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    documentTime: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    visitDate: z.ZodDate;
    encounterId: z.ZodOptional<z.ZodString>;
    documentSetId: z.ZodOptional<z.ZodString>;
    replacesDocumentId: z.ZodOptional<z.ZodString>;
    patient: z.ZodObject<{
        patientId: z.ZodString;
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        birthDate: z.ZodNullable<z.ZodString>;
        gender: z.ZodNullable<z.ZodEnum<["male", "female", "other"]>>;
        polisOms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        polisDms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        identityDoc: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            typeCode: z.ZodDefault<z.ZodString>;
            series: z.ZodOptional<z.ZodString>;
            number: z.ZodString;
            issuedBy: z.ZodOptional<z.ZodString>;
            issueDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }, {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }>>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        isForeignCitizen: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    }>;
    doctor: z.ZodObject<{
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        specialtyCode: z.ZodOptional<z.ZodString>;
        specialtyName: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }>;
    clinic: z.ZodObject<{
        name: z.ZodString;
        oid: z.ZodOptional<z.ZodString>;
        ogrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        inn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        kpp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        legalAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }>;
    legalAuthenticator: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        time: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }>>;
    complaints: z.ZodOptional<z.ZodString>;
    anamnesis: z.ZodOptional<z.ZodString>;
    anamnesisVitae: z.ZodOptional<z.ZodString>;
    dentalStatus: z.ZodOptional<z.ZodArray<z.ZodObject<{
        tooth: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
        surfaces: z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodString]>>;
        condition: z.ZodString;
        conditionCode: z.ZodOptional<z.ZodString>;
        conditionName: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }>, "many">>;
    objectiveStatus: z.ZodOptional<z.ZodString>;
    diagnoses: z.ZodArray<z.ZodObject<{
        icd10Code: z.ZodString;
        diagnosisText: z.ZodString;
        tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        isPrimary: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }, {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }>, "many">;
    services: z.ZodOptional<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        name: z.ZodString;
        quantity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        priceRubKopecks: z.ZodOptional<z.ZodNumber>;
        serviceCategoryCode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["1", "2"]>>>;
        completedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        name: string;
        quantity: number;
        serviceCategoryCode: "1" | "2";
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
    }, {
        code: string;
        name: string;
        quantity?: number | undefined;
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }>, "many">>;
    treatmentDescription: z.ZodOptional<z.ZodString>;
    recommendations: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
    complications: z.ZodOptional<z.ZodString>;
    comorbidities: z.ZodOptional<z.ZodString>;
    instrumentTrayBarcode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    };
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    docKind: "101" | "043u" | "108";
    documentVersion: number;
    visitDate: Date;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    diagnoses: {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }[];
    treatmentDescription?: string | undefined;
    complaints?: string | undefined;
    anamnesis?: string | undefined;
    documentTime?: Date | undefined;
    encounterId?: string | undefined;
    documentSetId?: string | undefined;
    replacesDocumentId?: string | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
    anamnesisVitae?: string | undefined;
    dentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    objectiveStatus?: string | undefined;
    services?: {
        code: string;
        name: string;
        quantity: number;
        serviceCategoryCode: "1" | "2";
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
    }[] | undefined;
    recommendations?: string | string[] | undefined;
    complications?: string | undefined;
    comorbidities?: string | undefined;
    instrumentTrayBarcode?: string | undefined;
}, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    };
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    visitDate: Date;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    diagnoses: {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }[];
    treatmentDescription?: string | undefined;
    complaints?: string | undefined;
    anamnesis?: string | undefined;
    documentTime?: unknown;
    docKind?: "101" | "043u" | "108" | undefined;
    documentVersion?: number | undefined;
    encounterId?: string | undefined;
    documentSetId?: string | undefined;
    replacesDocumentId?: string | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
    anamnesisVitae?: string | undefined;
    dentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    objectiveStatus?: string | undefined;
    services?: {
        code: string;
        name: string;
        quantity?: number | undefined;
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }[] | undefined;
    recommendations?: string | string[] | undefined;
    complications?: string | undefined;
    comorbidities?: string | undefined;
    instrumentTrayBarcode?: string | undefined;
}>, z.ZodObject<{
    docKind: z.ZodDefault<z.ZodLiteral<"104">>;
    documentId: z.ZodString;
    documentVersion: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    documentTime: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    visitDate: z.ZodDate;
    admissionDate: z.ZodOptional<z.ZodDate>;
    dischargeDate: z.ZodOptional<z.ZodDate>;
    encounterId: z.ZodOptional<z.ZodString>;
    documentSetId: z.ZodOptional<z.ZodString>;
    replacesDocumentId: z.ZodOptional<z.ZodString>;
    patient: z.ZodObject<{
        patientId: z.ZodString;
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        birthDate: z.ZodNullable<z.ZodString>;
        gender: z.ZodNullable<z.ZodEnum<["male", "female", "other"]>>;
        polisOms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        polisDms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        identityDoc: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            typeCode: z.ZodDefault<z.ZodString>;
            series: z.ZodOptional<z.ZodString>;
            number: z.ZodString;
            issuedBy: z.ZodOptional<z.ZodString>;
            issueDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }, {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }>>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        isForeignCitizen: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    }>;
    doctor: z.ZodObject<{
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        specialtyCode: z.ZodOptional<z.ZodString>;
        specialtyName: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }>;
    clinic: z.ZodObject<{
        name: z.ZodString;
        oid: z.ZodOptional<z.ZodString>;
        ogrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        inn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        kpp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        legalAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }>;
    legalAuthenticator: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        time: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }>>;
    admissionDiagnoses: z.ZodOptional<z.ZodArray<z.ZodObject<{
        icd10Code: z.ZodString;
        diagnosisText: z.ZodString;
        tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        isPrimary: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }, {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }>, "many">>;
    dischargeDiagnoses: z.ZodArray<z.ZodObject<{
        icd10Code: z.ZodString;
        diagnosisText: z.ZodString;
        tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        isPrimary: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }, {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }>, "many">;
    anamnesis: z.ZodOptional<z.ZodString>;
    clinicalCourse: z.ZodOptional<z.ZodString>;
    initialDentalStatus: z.ZodOptional<z.ZodArray<z.ZodObject<{
        tooth: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
        surfaces: z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodString]>>;
        condition: z.ZodString;
        conditionCode: z.ZodOptional<z.ZodString>;
        conditionName: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }>, "many">>;
    finalDentalStatus: z.ZodOptional<z.ZodArray<z.ZodObject<{
        tooth: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
        surfaces: z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodString]>>;
        condition: z.ZodString;
        conditionCode: z.ZodOptional<z.ZodString>;
        conditionName: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }>, "many">>;
    objectiveStatus: z.ZodOptional<z.ZodString>;
    servicesRendered: z.ZodDefault<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        name: z.ZodString;
        quantity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        priceRubKopecks: z.ZodOptional<z.ZodNumber>;
        serviceCategoryCode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["1", "2"]>>>;
        completedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        name: string;
        quantity: number;
        serviceCategoryCode: "1" | "2";
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
    }, {
        code: string;
        name: string;
        quantity?: number | undefined;
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }>, "many">>;
    surgeryProtocol: z.ZodOptional<z.ZodString>;
    anesthesiaProtocol: z.ZodOptional<z.ZodString>;
    radiologyStudiesSummary: z.ZodOptional<z.ZodString>;
    epicrisisText: z.ZodString;
    outcomeCode: z.ZodOptional<z.ZodEnum<["recovery", "improvement", "unchanged"]>>;
    outcomeName: z.ZodOptional<z.ZodString>;
    recommendations: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    nextFollowupDate: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodDate]>>;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    };
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    docKind: "104";
    documentVersion: number;
    visitDate: Date;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    recommendations: string | string[];
    dischargeDiagnoses: {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }[];
    servicesRendered: {
        code: string;
        name: string;
        quantity: number;
        serviceCategoryCode: "1" | "2";
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
    }[];
    epicrisisText: string;
    anamnesis?: string | undefined;
    documentTime?: Date | undefined;
    encounterId?: string | undefined;
    documentSetId?: string | undefined;
    replacesDocumentId?: string | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
    objectiveStatus?: string | undefined;
    admissionDate?: Date | undefined;
    dischargeDate?: Date | undefined;
    admissionDiagnoses?: {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }[] | undefined;
    clinicalCourse?: string | undefined;
    initialDentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    finalDentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    surgeryProtocol?: string | undefined;
    anesthesiaProtocol?: string | undefined;
    radiologyStudiesSummary?: string | undefined;
    outcomeCode?: "recovery" | "improvement" | "unchanged" | undefined;
    outcomeName?: string | undefined;
    nextFollowupDate?: string | Date | undefined;
}, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    };
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    visitDate: Date;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    recommendations: string | string[];
    dischargeDiagnoses: {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }[];
    epicrisisText: string;
    anamnesis?: string | undefined;
    documentTime?: unknown;
    docKind?: "104" | undefined;
    documentVersion?: number | undefined;
    encounterId?: string | undefined;
    documentSetId?: string | undefined;
    replacesDocumentId?: string | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
    objectiveStatus?: string | undefined;
    admissionDate?: Date | undefined;
    dischargeDate?: Date | undefined;
    admissionDiagnoses?: {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }[] | undefined;
    clinicalCourse?: string | undefined;
    initialDentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    finalDentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    servicesRendered?: {
        code: string;
        name: string;
        quantity?: number | undefined;
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }[] | undefined;
    surgeryProtocol?: string | undefined;
    anesthesiaProtocol?: string | undefined;
    radiologyStudiesSummary?: string | undefined;
    outcomeCode?: "recovery" | "improvement" | "unchanged" | undefined;
    outcomeName?: string | undefined;
    nextFollowupDate?: string | Date | undefined;
}>, z.ZodObject<{
    docKind: z.ZodDefault<z.ZodLiteral<"130">>;
    documentId: z.ZodString;
    documentVersion: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    documentTime: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    issueDate: z.ZodDate;
    taxYear: z.ZodNumber;
    certificateNumber: z.ZodString;
    patient: z.ZodObject<{
        patientId: z.ZodString;
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        birthDate: z.ZodNullable<z.ZodString>;
        gender: z.ZodNullable<z.ZodEnum<["male", "female", "other"]>>;
        polisOms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        polisDms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        identityDoc: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            typeCode: z.ZodDefault<z.ZodString>;
            series: z.ZodOptional<z.ZodString>;
            number: z.ZodString;
            issuedBy: z.ZodOptional<z.ZodString>;
            issueDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }, {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }>>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        isForeignCitizen: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    }>;
    taxpayer: z.ZodObject<{
        fullName: z.ZodString;
        snils: z.ZodOptional<z.ZodString>;
        inn: z.ZodOptional<z.ZodString>;
        birthDate: z.ZodOptional<z.ZodString>;
        relationToPatient: z.ZodDefault<z.ZodEnum<["1", "2", "3", "4"]>>;
    }, "strip", z.ZodTypeAny, {
        fullName: string;
        relationToPatient: "1" | "2" | "3" | "4";
        inn?: string | undefined;
        snils?: string | undefined;
        birthDate?: string | undefined;
    }, {
        fullName: string;
        inn?: string | undefined;
        snils?: string | undefined;
        birthDate?: string | undefined;
        relationToPatient?: "1" | "2" | "3" | "4" | undefined;
    }>;
    doctor: z.ZodObject<{
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        specialtyCode: z.ZodOptional<z.ZodString>;
        specialtyName: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }>;
    clinic: z.ZodObject<{
        name: z.ZodString;
        oid: z.ZodOptional<z.ZodString>;
        ogrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        inn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        kpp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        legalAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }>;
    legalAuthenticator: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        time: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }>>;
    contractNumber: z.ZodString;
    contractDate: z.ZodString;
    paymentRecords: z.ZodArray<z.ZodObject<{
        fiscalReceiptNumber: z.ZodString;
        fiscalReceiptDate: z.ZodString;
        paymentAmountKopecks: z.ZodNumber;
        serviceCategoryCode: z.ZodDefault<z.ZodEnum<["1", "2"]>>;
        contractNumber: z.ZodOptional<z.ZodString>;
        contractDate: z.ZodOptional<z.ZodString>;
        patientFullName: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        serviceCategoryCode: "1" | "2";
        fiscalReceiptNumber: string;
        fiscalReceiptDate: string;
        paymentAmountKopecks: number;
        contractNumber?: string | undefined;
        patientFullName?: string | undefined;
        contractDate?: string | undefined;
    }, {
        fiscalReceiptNumber: string;
        fiscalReceiptDate: string;
        paymentAmountKopecks: number;
        contractNumber?: string | undefined;
        patientFullName?: string | undefined;
        contractDate?: string | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }>, "many">;
    totalOrdinaryTreatmentKopecks: z.ZodNumber;
    totalExpensiveTreatmentKopecks: z.ZodNumber;
    totalSumKopecks: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    };
    taxYear: number;
    certificateNumber: string;
    contractNumber: string;
    contractDate: string;
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    issueDate: Date;
    docKind: "130";
    documentVersion: number;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    taxpayer: {
        fullName: string;
        relationToPatient: "1" | "2" | "3" | "4";
        inn?: string | undefined;
        snils?: string | undefined;
        birthDate?: string | undefined;
    };
    paymentRecords: {
        serviceCategoryCode: "1" | "2";
        fiscalReceiptNumber: string;
        fiscalReceiptDate: string;
        paymentAmountKopecks: number;
        contractNumber?: string | undefined;
        patientFullName?: string | undefined;
        contractDate?: string | undefined;
    }[];
    totalOrdinaryTreatmentKopecks: number;
    totalExpensiveTreatmentKopecks: number;
    totalSumKopecks: number;
    documentTime?: Date | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
}, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    };
    taxYear: number;
    certificateNumber: string;
    contractNumber: string;
    contractDate: string;
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    issueDate: Date;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    taxpayer: {
        fullName: string;
        inn?: string | undefined;
        snils?: string | undefined;
        birthDate?: string | undefined;
        relationToPatient?: "1" | "2" | "3" | "4" | undefined;
    };
    paymentRecords: {
        fiscalReceiptNumber: string;
        fiscalReceiptDate: string;
        paymentAmountKopecks: number;
        contractNumber?: string | undefined;
        patientFullName?: string | undefined;
        contractDate?: string | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }[];
    totalOrdinaryTreatmentKopecks: number;
    totalExpensiveTreatmentKopecks: number;
    totalSumKopecks: number;
    documentTime?: unknown;
    docKind?: "130" | undefined;
    documentVersion?: number | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
}>, z.ZodObject<{
    docKind: z.ZodDefault<z.ZodEnum<["043-1u", "0431u", "109"]>>;
    documentId: z.ZodString;
    documentVersion: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    documentTime: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    visitDate: z.ZodDate;
    encounterId: z.ZodOptional<z.ZodString>;
    documentSetId: z.ZodOptional<z.ZodString>;
    replacesDocumentId: z.ZodOptional<z.ZodString>;
    patient: z.ZodObject<{
        patientId: z.ZodString;
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        birthDate: z.ZodNullable<z.ZodString>;
        gender: z.ZodNullable<z.ZodEnum<["male", "female", "other"]>>;
        polisOms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        polisDms: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        identityDoc: z.ZodOptional<z.ZodNullable<z.ZodObject<{
            typeCode: z.ZodDefault<z.ZodString>;
            series: z.ZodOptional<z.ZodString>;
            number: z.ZodString;
            issuedBy: z.ZodOptional<z.ZodString>;
            issueDate: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }, {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        }>>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        isForeignCitizen: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    }>;
    doctor: z.ZodObject<{
        name: z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        specialtyCode: z.ZodOptional<z.ZodString>;
        specialtyName: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }, {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    }>;
    clinic: z.ZodObject<{
        name: z.ZodString;
        oid: z.ZodOptional<z.ZodString>;
        ogrn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        inn: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        kpp: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseNumber: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        licenseDate: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        address: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        legalAddress: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        addressFias: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        phone: z.ZodOptional<z.ZodNullable<z.ZodString>>;
        email: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }, {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    }>;
    legalAuthenticator: z.ZodOptional<z.ZodObject<{
        name: z.ZodOptional<z.ZodObject<{
            first: z.ZodString;
            last: z.ZodString;
            middle: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            first: string;
            last: string;
            middle?: string | undefined;
        }, {
            first: string;
            last: string;
            middle?: string | undefined;
        }>>;
        snils: z.ZodOptional<z.ZodString>;
        position: z.ZodOptional<z.ZodString>;
        positionCode: z.ZodOptional<z.ZodString>;
        time: z.ZodEffects<z.ZodOptional<z.ZodDate>, Date | undefined, unknown>;
    }, "strip", z.ZodTypeAny, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }, {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    }>>;
    orthodonticDiagnosis: z.ZodString;
    icd10Code: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    diagnoses: z.ZodOptional<z.ZodArray<z.ZodObject<{
        icd10Code: z.ZodString;
        diagnosisText: z.ZodString;
        tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        isPrimary: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    }, "strip", z.ZodTypeAny, {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }, {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }>, "many">>;
    angleMolarClassRight: z.ZodOptional<z.ZodEnum<["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]>>;
    angleMolarClassLeft: z.ZodOptional<z.ZodEnum<["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]>>;
    angleCanineClassRight: z.ZodOptional<z.ZodEnum<["class_1", "class_2", "class_3"]>>;
    angleCanineClassLeft: z.ZodOptional<z.ZodEnum<["class_1", "class_2", "class_3"]>>;
    complaints: z.ZodOptional<z.ZodString>;
    anamnesis: z.ZodOptional<z.ZodString>;
    anamnesisVitae: z.ZodOptional<z.ZodString>;
    anthropometry: z.ZodOptional<z.ZodObject<{
        facialType: z.ZodOptional<z.ZodEnum<["leptoprosopic", "mesoprosopic", "euryprosopic"]>>;
        profileType: z.ZodOptional<z.ZodEnum<["straight", "convex", "concave"]>>;
        facialSymmetry: z.ZodOptional<z.ZodEnum<["symmetric", "chin_deviation_left", "chin_deviation_right"]>>;
        chinDeviationMm: z.ZodOptional<z.ZodNumber>;
        nasolabialAngleDegrees: z.ZodOptional<z.ZodNumber>;
        mentolabialSulcus: z.ZodOptional<z.ZodEnum<["normal", "deep_pronounced", "smoothed"]>>;
        lipCompetenceAtRest: z.ZodOptional<z.ZodEnum<["competent_closed", "incompetent_open", "closed_with_strain"]>>;
        incisalDisplayAtSmileMm: z.ZodOptional<z.ZodNumber>;
        gummySmileMm: z.ZodOptional<z.ZodNumber>;
        photoProtocolCompleted: z.ZodOptional<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
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
    }, {
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
    }>>;
    cephalometry: z.ZodOptional<z.ZodObject<{
        snaAngle: z.ZodOptional<z.ZodNumber>;
        snbAngle: z.ZodOptional<z.ZodNumber>;
        anbAngle: z.ZodOptional<z.ZodNumber>;
        witsAppraisalMm: z.ZodOptional<z.ZodNumber>;
        fmaAngle: z.ZodOptional<z.ZodNumber>;
        snGoGnAngle: z.ZodOptional<z.ZodNumber>;
        upperIncisorToNaAngle: z.ZodOptional<z.ZodNumber>;
        upperIncisorToNaMm: z.ZodOptional<z.ZodNumber>;
        lowerIncisorToNbAngle: z.ZodOptional<z.ZodNumber>;
        lowerIncisorToNbMm: z.ZodOptional<z.ZodNumber>;
        interincisalAngle: z.ZodOptional<z.ZodNumber>;
        growthPattern: z.ZodOptional<z.ZodEnum<["normodivergent", "hyperdivergent_vertical", "hypodivergent_horizontal"]>>;
        skeletalClass: z.ZodOptional<z.ZodEnum<["class_1", "class_2_sub_1", "class_2_sub_2", "class_3"]>>;
    }, "strip", z.ZodTypeAny, {
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
        skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    }, {
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
        skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    }>>;
    indices: z.ZodOptional<z.ZodObject<{
        tonnIndexNotes: z.ZodOptional<z.ZodString>;
        pontIndexNotes: z.ZodOptional<z.ZodString>;
        boltonIndexNotes: z.ZodOptional<z.ZodString>;
        korkhausIndexNotes: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tonnIndexNotes?: string | undefined;
        pontIndexNotes?: string | undefined;
        boltonIndexNotes?: string | undefined;
        korkhausIndexNotes?: string | undefined;
    }, {
        tonnIndexNotes?: string | undefined;
        pontIndexNotes?: string | undefined;
        boltonIndexNotes?: string | undefined;
        korkhausIndexNotes?: string | undefined;
    }>>;
    appliancePlan: z.ZodOptional<z.ZodObject<{
        applianceType: z.ZodOptional<z.ZodString>;
        alignerStepsCount: z.ZodOptional<z.ZodNumber>;
        extractionPlan: z.ZodOptional<z.ZodString>;
        treatmentStages: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        estimatedDurationMonths: z.ZodOptional<z.ZodNumber>;
        retentionProtocol: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        applianceType?: string | undefined;
        alignerStepsCount?: number | undefined;
        extractionPlan?: string | undefined;
        treatmentStages?: string[] | undefined;
        estimatedDurationMonths?: number | undefined;
        retentionProtocol?: string | undefined;
    }, {
        applianceType?: string | undefined;
        alignerStepsCount?: number | undefined;
        extractionPlan?: string | undefined;
        treatmentStages?: string[] | undefined;
        estimatedDurationMonths?: number | undefined;
        retentionProtocol?: string | undefined;
    }>>;
    dentalStatus: z.ZodOptional<z.ZodArray<z.ZodObject<{
        tooth: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
        surfaces: z.ZodOptional<z.ZodUnion<[z.ZodArray<z.ZodString, "many">, z.ZodString]>>;
        condition: z.ZodString;
        conditionCode: z.ZodOptional<z.ZodString>;
        conditionName: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }, {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }>, "many">>;
    objectiveStatus: z.ZodOptional<z.ZodString>;
    services: z.ZodOptional<z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        name: z.ZodString;
        quantity: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        tooth: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodNumber]>>;
        priceRubKopecks: z.ZodOptional<z.ZodNumber>;
        serviceCategoryCode: z.ZodDefault<z.ZodOptional<z.ZodEnum<["1", "2"]>>>;
        completedAt: z.ZodOptional<z.ZodUnion<[z.ZodDate, z.ZodString]>>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        name: string;
        quantity: number;
        serviceCategoryCode: "1" | "2";
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
    }, {
        code: string;
        name: string;
        quantity?: number | undefined;
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }>, "many">>;
    recommendations: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>>;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        isForeignCitizen: boolean;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode: string;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
    };
    orthodonticDiagnosis: string;
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    icd10Code: string;
    docKind: "043-1u" | "109" | "0431u";
    documentVersion: number;
    visitDate: Date;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    angleMolarClassRight?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    angleMolarClassLeft?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    angleCanineClassRight?: "class_1" | "class_2" | "class_3" | undefined;
    angleCanineClassLeft?: "class_1" | "class_2" | "class_3" | undefined;
    anthropometry?: {
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
    } | undefined;
    cephalometry?: {
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
        skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    } | undefined;
    appliancePlan?: {
        applianceType?: string | undefined;
        alignerStepsCount?: number | undefined;
        extractionPlan?: string | undefined;
        treatmentStages?: string[] | undefined;
        estimatedDurationMonths?: number | undefined;
        retentionProtocol?: string | undefined;
    } | undefined;
    complaints?: string | undefined;
    anamnesis?: string | undefined;
    indices?: {
        tonnIndexNotes?: string | undefined;
        pontIndexNotes?: string | undefined;
        boltonIndexNotes?: string | undefined;
        korkhausIndexNotes?: string | undefined;
    } | undefined;
    documentTime?: Date | undefined;
    encounterId?: string | undefined;
    documentSetId?: string | undefined;
    replacesDocumentId?: string | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: Date | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
    anamnesisVitae?: string | undefined;
    dentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    objectiveStatus?: string | undefined;
    diagnoses?: {
        diagnosisText: string;
        icd10Code: string;
        isPrimary: boolean;
        tooth?: string | number | undefined;
    }[] | undefined;
    services?: {
        code: string;
        name: string;
        quantity: number;
        serviceCategoryCode: "1" | "2";
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
    }[] | undefined;
    recommendations?: string | string[] | undefined;
}, {
    documentId: string;
    patient: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        patientId: string;
        birthDate: string | null;
        gender: "other" | "male" | "female" | null;
        address?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | null | undefined;
        polisOms?: string | null | undefined;
        polisDms?: string | null | undefined;
        identityDoc?: {
            number: string;
            typeCode?: string | undefined;
            series?: string | undefined;
            issuedBy?: string | undefined;
            issueDate?: string | undefined;
        } | null | undefined;
        addressFias?: string | null | undefined;
        isForeignCitizen?: boolean | undefined;
    };
    orthodonticDiagnosis: string;
    clinic: {
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        ogrn?: string | null | undefined;
        address?: string | null | undefined;
        licenseNumber?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        addressFias?: string | null | undefined;
        oid?: string | undefined;
        licenseDate?: string | null | undefined;
        legalAddress?: string | null | undefined;
    };
    visitDate: Date;
    doctor: {
        name: {
            first: string;
            last: string;
            middle?: string | undefined;
        };
        phone?: string | null | undefined;
        email?: string | null | undefined;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
        specialtyCode?: string | undefined;
        specialtyName?: string | undefined;
    };
    angleMolarClassRight?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    angleMolarClassLeft?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    angleCanineClassRight?: "class_1" | "class_2" | "class_3" | undefined;
    angleCanineClassLeft?: "class_1" | "class_2" | "class_3" | undefined;
    anthropometry?: {
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
    } | undefined;
    cephalometry?: {
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
        skeletalClass?: "class_1" | "class_3" | "class_2_sub_1" | "class_2_sub_2" | undefined;
    } | undefined;
    appliancePlan?: {
        applianceType?: string | undefined;
        alignerStepsCount?: number | undefined;
        extractionPlan?: string | undefined;
        treatmentStages?: string[] | undefined;
        estimatedDurationMonths?: number | undefined;
        retentionProtocol?: string | undefined;
    } | undefined;
    complaints?: string | undefined;
    anamnesis?: string | undefined;
    indices?: {
        tonnIndexNotes?: string | undefined;
        pontIndexNotes?: string | undefined;
        boltonIndexNotes?: string | undefined;
        korkhausIndexNotes?: string | undefined;
    } | undefined;
    documentTime?: unknown;
    icd10Code?: string | undefined;
    docKind?: "043-1u" | "109" | "0431u" | undefined;
    documentVersion?: number | undefined;
    encounterId?: string | undefined;
    documentSetId?: string | undefined;
    replacesDocumentId?: string | undefined;
    legalAuthenticator?: {
        name?: {
            first: string;
            last: string;
            middle?: string | undefined;
        } | undefined;
        time?: unknown;
        snils?: string | undefined;
        position?: string | undefined;
        positionCode?: string | undefined;
    } | undefined;
    anamnesisVitae?: string | undefined;
    dentalStatus?: {
        tooth: string | number;
        condition: string;
        surfaces?: string | string[] | undefined;
        description?: string | undefined;
        conditionCode?: string | undefined;
        conditionName?: string | undefined;
    }[] | undefined;
    objectiveStatus?: string | undefined;
    diagnoses?: {
        diagnosisText: string;
        icd10Code: string;
        tooth?: string | number | undefined;
        isPrimary?: boolean | undefined;
    }[] | undefined;
    services?: {
        code: string;
        name: string;
        quantity?: number | undefined;
        completedAt?: string | Date | undefined;
        tooth?: string | number | undefined;
        priceRubKopecks?: number | undefined;
        serviceCategoryCode?: "1" | "2" | undefined;
    }[] | undefined;
    recommendations?: string | string[] | undefined;
}>]>;
export declare const detachedSignatureSchema: z.ZodObject<{
    signatureBase64: z.ZodString;
    certificateSerialNumber: z.ZodString;
    certificateSubject: z.ZodString;
    certificateIssuer: z.ZodOptional<z.ZodString>;
    validFrom: z.ZodOptional<z.ZodString>;
    validTo: z.ZodOptional<z.ZodString>;
    signedAt: z.ZodString;
    algorithmOid: z.ZodDefault<z.ZodString>;
    digestAlgorithmOid: z.ZodOptional<z.ZodString>;
    signatureValueHex: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    certificateSerialNumber: string;
    signedAt: string;
    signatureBase64: string;
    certificateSubject: string;
    algorithmOid: string;
    certificateIssuer?: string | undefined;
    validFrom?: string | undefined;
    validTo?: string | undefined;
    digestAlgorithmOid?: string | undefined;
    signatureValueHex?: string | undefined;
}, {
    certificateSerialNumber: string;
    signedAt: string;
    signatureBase64: string;
    certificateSubject: string;
    certificateIssuer?: string | undefined;
    validFrom?: string | undefined;
    validTo?: string | undefined;
    algorithmOid?: string | undefined;
    digestAlgorithmOid?: string | undefined;
    signatureValueHex?: string | undefined;
}>;
export declare const egiszRemdPackageSchema: z.ZodObject<{
    documentId: z.ZodString;
    documentVersion: z.ZodNumber;
    docTypeNsiCode: z.ZodString;
    xmlCanonicalPayload: z.ZodString;
    doctorSignature: z.ZodObject<{
        signatureBase64: z.ZodString;
        certificateSerialNumber: z.ZodString;
        certificateSubject: z.ZodString;
        certificateIssuer: z.ZodOptional<z.ZodString>;
        validFrom: z.ZodOptional<z.ZodString>;
        validTo: z.ZodOptional<z.ZodString>;
        signedAt: z.ZodString;
        algorithmOid: z.ZodDefault<z.ZodString>;
        digestAlgorithmOid: z.ZodOptional<z.ZodString>;
        signatureValueHex: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        certificateSerialNumber: string;
        signedAt: string;
        signatureBase64: string;
        certificateSubject: string;
        algorithmOid: string;
        certificateIssuer?: string | undefined;
        validFrom?: string | undefined;
        validTo?: string | undefined;
        digestAlgorithmOid?: string | undefined;
        signatureValueHex?: string | undefined;
    }, {
        certificateSerialNumber: string;
        signedAt: string;
        signatureBase64: string;
        certificateSubject: string;
        certificateIssuer?: string | undefined;
        validFrom?: string | undefined;
        validTo?: string | undefined;
        algorithmOid?: string | undefined;
        digestAlgorithmOid?: string | undefined;
        signatureValueHex?: string | undefined;
    }>;
    moSignature: z.ZodOptional<z.ZodObject<{
        signatureBase64: z.ZodString;
        certificateSerialNumber: z.ZodString;
        certificateSubject: z.ZodString;
        certificateIssuer: z.ZodOptional<z.ZodString>;
        validFrom: z.ZodOptional<z.ZodString>;
        validTo: z.ZodOptional<z.ZodString>;
        signedAt: z.ZodString;
        algorithmOid: z.ZodDefault<z.ZodString>;
        digestAlgorithmOid: z.ZodOptional<z.ZodString>;
        signatureValueHex: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        certificateSerialNumber: string;
        signedAt: string;
        signatureBase64: string;
        certificateSubject: string;
        algorithmOid: string;
        certificateIssuer?: string | undefined;
        validFrom?: string | undefined;
        validTo?: string | undefined;
        digestAlgorithmOid?: string | undefined;
        signatureValueHex?: string | undefined;
    }, {
        certificateSerialNumber: string;
        signedAt: string;
        signatureBase64: string;
        certificateSubject: string;
        certificateIssuer?: string | undefined;
        validFrom?: string | undefined;
        validTo?: string | undefined;
        algorithmOid?: string | undefined;
        digestAlgorithmOid?: string | undefined;
        signatureValueHex?: string | undefined;
    }>>;
    metadata: z.ZodObject<{
        patientSnils: z.ZodOptional<z.ZodString>;
        clinicOid: z.ZodString;
        clinicOgrn: z.ZodOptional<z.ZodString>;
        docTypeNsiCode: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        docTypeNsiCode: string;
        clinicOid: string;
        clinicOgrn?: string | undefined;
        patientSnils?: string | undefined;
    }, {
        docTypeNsiCode: string;
        clinicOid: string;
        clinicOgrn?: string | undefined;
        patientSnils?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    documentId: string;
    documentVersion: number;
    docTypeNsiCode: string;
    xmlCanonicalPayload: string;
    doctorSignature: {
        certificateSerialNumber: string;
        signedAt: string;
        signatureBase64: string;
        certificateSubject: string;
        algorithmOid: string;
        certificateIssuer?: string | undefined;
        validFrom?: string | undefined;
        validTo?: string | undefined;
        digestAlgorithmOid?: string | undefined;
        signatureValueHex?: string | undefined;
    };
    metadata: {
        docTypeNsiCode: string;
        clinicOid: string;
        clinicOgrn?: string | undefined;
        patientSnils?: string | undefined;
    };
    moSignature?: {
        certificateSerialNumber: string;
        signedAt: string;
        signatureBase64: string;
        certificateSubject: string;
        algorithmOid: string;
        certificateIssuer?: string | undefined;
        validFrom?: string | undefined;
        validTo?: string | undefined;
        digestAlgorithmOid?: string | undefined;
        signatureValueHex?: string | undefined;
    } | undefined;
}, {
    documentId: string;
    documentVersion: number;
    docTypeNsiCode: string;
    xmlCanonicalPayload: string;
    doctorSignature: {
        certificateSerialNumber: string;
        signedAt: string;
        signatureBase64: string;
        certificateSubject: string;
        certificateIssuer?: string | undefined;
        validFrom?: string | undefined;
        validTo?: string | undefined;
        algorithmOid?: string | undefined;
        digestAlgorithmOid?: string | undefined;
        signatureValueHex?: string | undefined;
    };
    metadata: {
        docTypeNsiCode: string;
        clinicOid: string;
        clinicOgrn?: string | undefined;
        patientSnils?: string | undefined;
    };
    moSignature?: {
        certificateSerialNumber: string;
        signedAt: string;
        signatureBase64: string;
        certificateSubject: string;
        certificateIssuer?: string | undefined;
        validFrom?: string | undefined;
        validTo?: string | undefined;
        algorithmOid?: string | undefined;
        digestAlgorithmOid?: string | undefined;
        signatureValueHex?: string | undefined;
    } | undefined;
}>;
