/**
 * 1C:Enterprise (1С:Предприятие 8.3 / Бухгалтерия / Управление торговлей / CommerceML 2.09) XML Export Engine.
 *
 * Implements Russian statutory export standards for:
 * 1. Счета на оплату медицинских услуг («Заказ покупателя» / «Счет на оплату»).
 * 2. Акты выполненных работ («Реализация товаров и услуг» / «Акт об оказании услуг»).
 * 3. Приходные кассовые ордера («Приходный кассовый ордер» / Эквайринговые операции).
 *
 * Invariants:
 * - Kopeck-exact arithmetic: sum of item amounts must strictly equal total amount.
 * - Russian INN/KPP validation for legal entities and individuals.
 * - Tax exemption declaration: «Без НДС (пп. 2 п. 2 ст. 149 НК РФ)».
 * - Safe XML entity escaping and UTF-8 compliance.
 */
import { z } from "zod";
export declare const oneCDocumentTypeSchema: z.ZodEnum<["invoice", "act", "cash_order", "acquiring_payment"]>;
export type OneCDocumentType = z.infer<typeof oneCDocumentTypeSchema>;
export declare const oneCLineItemSchema: z.ZodObject<{
    id: z.ZodString;
    code804n: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    name: z.ZodString;
    toothNumber: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    unitCode: z.ZodDefault<z.ZodString>;
    unitName: z.ZodDefault<z.ZodString>;
    quantity: z.ZodDefault<z.ZodNumber>;
    priceKopecks: z.ZodNumber;
    discountPercent: z.ZodDefault<z.ZodNumber>;
    totalKopecks: z.ZodNumber;
    vatRate: z.ZodDefault<z.ZodString>;
    vatAmountKopecks: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    priceKopecks: number;
    quantity: number;
    vatRate: string;
    totalKopecks: number;
    unitCode: string;
    unitName: string;
    discountPercent: number;
    vatAmountKopecks: number;
    toothNumber?: number | null | undefined;
    code804n?: string | null | undefined;
}, {
    id: string;
    name: string;
    priceKopecks: number;
    totalKopecks: number;
    quantity?: number | undefined;
    vatRate?: string | undefined;
    toothNumber?: number | null | undefined;
    code804n?: string | null | undefined;
    unitCode?: string | undefined;
    unitName?: string | undefined;
    discountPercent?: number | undefined;
    vatAmountKopecks?: number | undefined;
}>;
export type OneCLineItem = z.input<typeof oneCLineItemSchema>;
export declare const oneCPartyInfoSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    fullName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    inn: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    kpp: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    isLegalEntity: z.ZodDefault<z.ZodBoolean>;
    address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    bankAccount: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    bankBik: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    bankName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    bankCorrAccount: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    isLegalEntity: boolean;
    inn?: string | null | undefined;
    kpp?: string | null | undefined;
    address?: string | null | undefined;
    fullName?: string | null | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
    bankAccount?: string | null | undefined;
    bankBik?: string | null | undefined;
    bankName?: string | null | undefined;
    bankCorrAccount?: string | null | undefined;
}, {
    id: string;
    name: string;
    inn?: string | null | undefined;
    kpp?: string | null | undefined;
    address?: string | null | undefined;
    fullName?: string | null | undefined;
    isLegalEntity?: boolean | undefined;
    phone?: string | null | undefined;
    email?: string | null | undefined;
    bankAccount?: string | null | undefined;
    bankBik?: string | null | undefined;
    bankName?: string | null | undefined;
    bankCorrAccount?: string | null | undefined;
}>;
export type OneCPartyInfo = z.input<typeof oneCPartyInfoSchema>;
export declare const oneCDocumentParamsSchema: z.ZodObject<{
    id: z.ZodString;
    number: z.ZodString;
    documentDate: z.ZodString;
    documentTime: z.ZodDefault<z.ZodString>;
    docType: z.ZodEnum<["invoice", "act", "cash_order", "acquiring_payment"]>;
    operationName: z.ZodString;
    patient: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        fullName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        inn: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        kpp: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        isLegalEntity: z.ZodDefault<z.ZodBoolean>;
        address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        bankAccount: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        bankBik: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        bankName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        bankCorrAccount: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        isLegalEntity: boolean;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        address?: string | null | undefined;
        fullName?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        bankAccount?: string | null | undefined;
        bankBik?: string | null | undefined;
        bankName?: string | null | undefined;
        bankCorrAccount?: string | null | undefined;
    }, {
        id: string;
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        address?: string | null | undefined;
        fullName?: string | null | undefined;
        isLegalEntity?: boolean | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        bankAccount?: string | null | undefined;
        bankBik?: string | null | undefined;
        bankName?: string | null | undefined;
        bankCorrAccount?: string | null | undefined;
    }>;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        code804n: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        name: z.ZodString;
        toothNumber: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        unitCode: z.ZodDefault<z.ZodString>;
        unitName: z.ZodDefault<z.ZodString>;
        quantity: z.ZodDefault<z.ZodNumber>;
        priceKopecks: z.ZodNumber;
        discountPercent: z.ZodDefault<z.ZodNumber>;
        totalKopecks: z.ZodNumber;
        vatRate: z.ZodDefault<z.ZodString>;
        vatAmountKopecks: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        priceKopecks: number;
        quantity: number;
        vatRate: string;
        totalKopecks: number;
        unitCode: string;
        unitName: string;
        discountPercent: number;
        vatAmountKopecks: number;
        toothNumber?: number | null | undefined;
        code804n?: string | null | undefined;
    }, {
        id: string;
        name: string;
        priceKopecks: number;
        totalKopecks: number;
        quantity?: number | undefined;
        vatRate?: string | undefined;
        toothNumber?: number | null | undefined;
        code804n?: string | null | undefined;
        unitCode?: string | undefined;
        unitName?: string | undefined;
        discountPercent?: number | undefined;
        vatAmountKopecks?: number | undefined;
    }>, "many">;
    totalKopecks: z.ZodNumber;
    contractNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    contractDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    attendingDoctorName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    comment: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    number: string;
    id: string;
    items: {
        id: string;
        name: string;
        priceKopecks: number;
        quantity: number;
        vatRate: string;
        totalKopecks: number;
        unitCode: string;
        unitName: string;
        discountPercent: number;
        vatAmountKopecks: number;
        toothNumber?: number | null | undefined;
        code804n?: string | null | undefined;
    }[];
    totalKopecks: number;
    patient: {
        id: string;
        name: string;
        isLegalEntity: boolean;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        address?: string | null | undefined;
        fullName?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        bankAccount?: string | null | undefined;
        bankBik?: string | null | undefined;
        bankName?: string | null | undefined;
        bankCorrAccount?: string | null | undefined;
    };
    documentDate: string;
    documentTime: string;
    docType: "invoice" | "act" | "cash_order" | "acquiring_payment";
    operationName: string;
    contractNumber?: string | null | undefined;
    contractDate?: string | null | undefined;
    attendingDoctorName?: string | null | undefined;
    comment?: string | null | undefined;
}, {
    number: string;
    id: string;
    items: {
        id: string;
        name: string;
        priceKopecks: number;
        totalKopecks: number;
        quantity?: number | undefined;
        vatRate?: string | undefined;
        toothNumber?: number | null | undefined;
        code804n?: string | null | undefined;
        unitCode?: string | undefined;
        unitName?: string | undefined;
        discountPercent?: number | undefined;
        vatAmountKopecks?: number | undefined;
    }[];
    totalKopecks: number;
    patient: {
        id: string;
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        address?: string | null | undefined;
        fullName?: string | null | undefined;
        isLegalEntity?: boolean | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        bankAccount?: string | null | undefined;
        bankBik?: string | null | undefined;
        bankName?: string | null | undefined;
        bankCorrAccount?: string | null | undefined;
    };
    documentDate: string;
    docType: "invoice" | "act" | "cash_order" | "acquiring_payment";
    operationName: string;
    contractNumber?: string | null | undefined;
    contractDate?: string | null | undefined;
    documentTime?: string | undefined;
    attendingDoctorName?: string | null | undefined;
    comment?: string | null | undefined;
}>;
export type OneCDocumentParams = z.input<typeof oneCDocumentParamsSchema>;
export declare const oneCExportParamsSchema: z.ZodObject<{
    exportId: z.ZodString;
    generatedAt: z.ZodString;
    clinic: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        fullName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        inn: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        kpp: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        isLegalEntity: z.ZodDefault<z.ZodBoolean>;
        address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        bankAccount: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        bankBik: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        bankName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        bankCorrAccount: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        isLegalEntity: boolean;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        address?: string | null | undefined;
        fullName?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        bankAccount?: string | null | undefined;
        bankBik?: string | null | undefined;
        bankName?: string | null | undefined;
        bankCorrAccount?: string | null | undefined;
    }, {
        id: string;
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        address?: string | null | undefined;
        fullName?: string | null | undefined;
        isLegalEntity?: boolean | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        bankAccount?: string | null | undefined;
        bankBik?: string | null | undefined;
        bankName?: string | null | undefined;
        bankCorrAccount?: string | null | undefined;
    }>;
    documents: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        number: z.ZodString;
        documentDate: z.ZodString;
        documentTime: z.ZodDefault<z.ZodString>;
        docType: z.ZodEnum<["invoice", "act", "cash_order", "acquiring_payment"]>;
        operationName: z.ZodString;
        patient: z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            fullName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            inn: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            kpp: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            isLegalEntity: z.ZodDefault<z.ZodBoolean>;
            address: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            phone: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            email: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            bankAccount: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            bankBik: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            bankName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            bankCorrAccount: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            isLegalEntity: boolean;
            inn?: string | null | undefined;
            kpp?: string | null | undefined;
            address?: string | null | undefined;
            fullName?: string | null | undefined;
            phone?: string | null | undefined;
            email?: string | null | undefined;
            bankAccount?: string | null | undefined;
            bankBik?: string | null | undefined;
            bankName?: string | null | undefined;
            bankCorrAccount?: string | null | undefined;
        }, {
            id: string;
            name: string;
            inn?: string | null | undefined;
            kpp?: string | null | undefined;
            address?: string | null | undefined;
            fullName?: string | null | undefined;
            isLegalEntity?: boolean | undefined;
            phone?: string | null | undefined;
            email?: string | null | undefined;
            bankAccount?: string | null | undefined;
            bankBik?: string | null | undefined;
            bankName?: string | null | undefined;
            bankCorrAccount?: string | null | undefined;
        }>;
        items: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            code804n: z.ZodNullable<z.ZodOptional<z.ZodString>>;
            name: z.ZodString;
            toothNumber: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
            unitCode: z.ZodDefault<z.ZodString>;
            unitName: z.ZodDefault<z.ZodString>;
            quantity: z.ZodDefault<z.ZodNumber>;
            priceKopecks: z.ZodNumber;
            discountPercent: z.ZodDefault<z.ZodNumber>;
            totalKopecks: z.ZodNumber;
            vatRate: z.ZodDefault<z.ZodString>;
            vatAmountKopecks: z.ZodDefault<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            name: string;
            priceKopecks: number;
            quantity: number;
            vatRate: string;
            totalKopecks: number;
            unitCode: string;
            unitName: string;
            discountPercent: number;
            vatAmountKopecks: number;
            toothNumber?: number | null | undefined;
            code804n?: string | null | undefined;
        }, {
            id: string;
            name: string;
            priceKopecks: number;
            totalKopecks: number;
            quantity?: number | undefined;
            vatRate?: string | undefined;
            toothNumber?: number | null | undefined;
            code804n?: string | null | undefined;
            unitCode?: string | undefined;
            unitName?: string | undefined;
            discountPercent?: number | undefined;
            vatAmountKopecks?: number | undefined;
        }>, "many">;
        totalKopecks: z.ZodNumber;
        contractNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        contractDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        attendingDoctorName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        comment: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        number: string;
        id: string;
        items: {
            id: string;
            name: string;
            priceKopecks: number;
            quantity: number;
            vatRate: string;
            totalKopecks: number;
            unitCode: string;
            unitName: string;
            discountPercent: number;
            vatAmountKopecks: number;
            toothNumber?: number | null | undefined;
            code804n?: string | null | undefined;
        }[];
        totalKopecks: number;
        patient: {
            id: string;
            name: string;
            isLegalEntity: boolean;
            inn?: string | null | undefined;
            kpp?: string | null | undefined;
            address?: string | null | undefined;
            fullName?: string | null | undefined;
            phone?: string | null | undefined;
            email?: string | null | undefined;
            bankAccount?: string | null | undefined;
            bankBik?: string | null | undefined;
            bankName?: string | null | undefined;
            bankCorrAccount?: string | null | undefined;
        };
        documentDate: string;
        documentTime: string;
        docType: "invoice" | "act" | "cash_order" | "acquiring_payment";
        operationName: string;
        contractNumber?: string | null | undefined;
        contractDate?: string | null | undefined;
        attendingDoctorName?: string | null | undefined;
        comment?: string | null | undefined;
    }, {
        number: string;
        id: string;
        items: {
            id: string;
            name: string;
            priceKopecks: number;
            totalKopecks: number;
            quantity?: number | undefined;
            vatRate?: string | undefined;
            toothNumber?: number | null | undefined;
            code804n?: string | null | undefined;
            unitCode?: string | undefined;
            unitName?: string | undefined;
            discountPercent?: number | undefined;
            vatAmountKopecks?: number | undefined;
        }[];
        totalKopecks: number;
        patient: {
            id: string;
            name: string;
            inn?: string | null | undefined;
            kpp?: string | null | undefined;
            address?: string | null | undefined;
            fullName?: string | null | undefined;
            isLegalEntity?: boolean | undefined;
            phone?: string | null | undefined;
            email?: string | null | undefined;
            bankAccount?: string | null | undefined;
            bankBik?: string | null | undefined;
            bankName?: string | null | undefined;
            bankCorrAccount?: string | null | undefined;
        };
        documentDate: string;
        docType: "invoice" | "act" | "cash_order" | "acquiring_payment";
        operationName: string;
        contractNumber?: string | null | undefined;
        contractDate?: string | null | undefined;
        documentTime?: string | undefined;
        attendingDoctorName?: string | null | undefined;
        comment?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    exportId: string;
    generatedAt: string;
    clinic: {
        id: string;
        name: string;
        isLegalEntity: boolean;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        address?: string | null | undefined;
        fullName?: string | null | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        bankAccount?: string | null | undefined;
        bankBik?: string | null | undefined;
        bankName?: string | null | undefined;
        bankCorrAccount?: string | null | undefined;
    };
    documents: {
        number: string;
        id: string;
        items: {
            id: string;
            name: string;
            priceKopecks: number;
            quantity: number;
            vatRate: string;
            totalKopecks: number;
            unitCode: string;
            unitName: string;
            discountPercent: number;
            vatAmountKopecks: number;
            toothNumber?: number | null | undefined;
            code804n?: string | null | undefined;
        }[];
        totalKopecks: number;
        patient: {
            id: string;
            name: string;
            isLegalEntity: boolean;
            inn?: string | null | undefined;
            kpp?: string | null | undefined;
            address?: string | null | undefined;
            fullName?: string | null | undefined;
            phone?: string | null | undefined;
            email?: string | null | undefined;
            bankAccount?: string | null | undefined;
            bankBik?: string | null | undefined;
            bankName?: string | null | undefined;
            bankCorrAccount?: string | null | undefined;
        };
        documentDate: string;
        documentTime: string;
        docType: "invoice" | "act" | "cash_order" | "acquiring_payment";
        operationName: string;
        contractNumber?: string | null | undefined;
        contractDate?: string | null | undefined;
        attendingDoctorName?: string | null | undefined;
        comment?: string | null | undefined;
    }[];
}, {
    exportId: string;
    generatedAt: string;
    clinic: {
        id: string;
        name: string;
        inn?: string | null | undefined;
        kpp?: string | null | undefined;
        address?: string | null | undefined;
        fullName?: string | null | undefined;
        isLegalEntity?: boolean | undefined;
        phone?: string | null | undefined;
        email?: string | null | undefined;
        bankAccount?: string | null | undefined;
        bankBik?: string | null | undefined;
        bankName?: string | null | undefined;
        bankCorrAccount?: string | null | undefined;
    };
    documents: {
        number: string;
        id: string;
        items: {
            id: string;
            name: string;
            priceKopecks: number;
            totalKopecks: number;
            quantity?: number | undefined;
            vatRate?: string | undefined;
            toothNumber?: number | null | undefined;
            code804n?: string | null | undefined;
            unitCode?: string | undefined;
            unitName?: string | undefined;
            discountPercent?: number | undefined;
            vatAmountKopecks?: number | undefined;
        }[];
        totalKopecks: number;
        patient: {
            id: string;
            name: string;
            inn?: string | null | undefined;
            kpp?: string | null | undefined;
            address?: string | null | undefined;
            fullName?: string | null | undefined;
            isLegalEntity?: boolean | undefined;
            phone?: string | null | undefined;
            email?: string | null | undefined;
            bankAccount?: string | null | undefined;
            bankBik?: string | null | undefined;
            bankName?: string | null | undefined;
            bankCorrAccount?: string | null | undefined;
        };
        documentDate: string;
        docType: "invoice" | "act" | "cash_order" | "acquiring_payment";
        operationName: string;
        contractNumber?: string | null | undefined;
        contractDate?: string | null | undefined;
        documentTime?: string | undefined;
        attendingDoctorName?: string | null | undefined;
        comment?: string | null | undefined;
    }[];
}>;
export type OneCExportParams = z.input<typeof oneCExportParamsSchema>;
/**
 * Validates document party tax credentials.
 */
export declare function validateOneCParty(party: OneCPartyInfo): {
    valid: boolean;
    errors: string[];
};
/**
 * Resolves 1C Operation Name based on Document Type.
 */
export declare function resolveOneCOperationName(docType: OneCDocumentType): string;
/**
 * Generates statutory 1C:Enterprise / CommerceML 2.09 XML Export Package.
 */
export declare function generateOneCEnterpriseXml(params: OneCExportParams): string;
