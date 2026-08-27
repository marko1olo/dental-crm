/**
 * Zod Schemas & Statutory Validation for 54-FZ FFD 1.2 Fiscal Receipts & Operations.
 * Compliant with Order of FTS Russia No. ED-7-20/662@ and Order of Minzdrav 804n.
 */
import { z } from "zod";
import type { Ffd12OperationType } from "./ffd12Types.js";
/**
 * Single line item schema in a 54-FZ FFD 1.2 Fiscal Receipt.
 */
export declare const fiscalReceiptItemSchema: z.ZodEffects<z.ZodEffects<z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    name: z.ZodString;
    priceKopecks: z.ZodNumber;
    quantity: z.ZodDefault<z.ZodNumber>;
    amountKopecks: z.ZodNumber;
    subject: z.ZodDefault<z.ZodEnum<["commodity", "job", "service", "payment", "agency_fee", "composite", "other", "excisable_goods_with_marking", "excisable_goods_without_marking", "goods_with_marking", "goods_without_marking"]>>;
    method: z.ZodDefault<z.ZodEnum<["full_prepayment", "prepayment", "advance", "full_payment", "partial_payment_and_credit", "credit_handover", "credit_payment"]>>;
    vatRate: z.ZodDefault<z.ZodEnum<["vat_20", "vat_10", "vat_20_120", "vat_10_110", "vat_0", "vat_none"]>>;
    measure: z.ZodDefault<z.ZodEnum<["piece", "gram", "kilogram", "minute", "hour", "day", "other"]>>;
    taxDeductionCode: z.ZodDefault<z.ZodEnum<["code_1_standard", "code_2_expensive_treatment"]>>;
    medicalServiceCode804n: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    medicalServiceCodeMzk: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    toothFdiNumber: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
    /** Честный ЗНАК / МДЛП DataMatrix marking barcode (Тег 1162 / Тег 1163 / Тег 2000) */
    markingCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    priceKopecks: number;
    quantity: number;
    amountKopecks: number;
    subject: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking";
    method: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment";
    vatRate: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none";
    measure: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day";
    taxDeductionCode: "code_1_standard" | "code_2_expensive_treatment";
    id?: string | undefined;
    medicalServiceCode804n?: string | null | undefined;
    medicalServiceCodeMzk?: string | null | undefined;
    toothFdiNumber?: number | null | undefined;
    markingCode?: string | null | undefined;
}, {
    name: string;
    priceKopecks: number;
    amountKopecks: number;
    id?: string | undefined;
    quantity?: number | undefined;
    subject?: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking" | undefined;
    method?: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment" | undefined;
    vatRate?: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none" | undefined;
    measure?: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day" | undefined;
    taxDeductionCode?: "code_1_standard" | "code_2_expensive_treatment" | undefined;
    medicalServiceCode804n?: string | null | undefined;
    medicalServiceCodeMzk?: string | null | undefined;
    toothFdiNumber?: number | null | undefined;
    markingCode?: string | null | undefined;
}>, {
    medicalServiceCode804n: string | null;
    name: string;
    priceKopecks: number;
    quantity: number;
    amountKopecks: number;
    subject: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking";
    method: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment";
    vatRate: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none";
    measure: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day";
    taxDeductionCode: "code_1_standard" | "code_2_expensive_treatment";
    id?: string | undefined;
    medicalServiceCodeMzk?: string | null | undefined;
    toothFdiNumber?: number | null | undefined;
    markingCode?: string | null | undefined;
}, {
    name: string;
    priceKopecks: number;
    amountKopecks: number;
    id?: string | undefined;
    quantity?: number | undefined;
    subject?: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking" | undefined;
    method?: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment" | undefined;
    vatRate?: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none" | undefined;
    measure?: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day" | undefined;
    taxDeductionCode?: "code_1_standard" | "code_2_expensive_treatment" | undefined;
    medicalServiceCode804n?: string | null | undefined;
    medicalServiceCodeMzk?: string | null | undefined;
    toothFdiNumber?: number | null | undefined;
    markingCode?: string | null | undefined;
}>, {
    medicalServiceCode804n: string | null;
    name: string;
    priceKopecks: number;
    quantity: number;
    amountKopecks: number;
    subject: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking";
    method: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment";
    vatRate: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none";
    measure: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day";
    taxDeductionCode: "code_1_standard" | "code_2_expensive_treatment";
    id?: string | undefined;
    medicalServiceCodeMzk?: string | null | undefined;
    toothFdiNumber?: number | null | undefined;
    markingCode?: string | null | undefined;
}, {
    name: string;
    priceKopecks: number;
    amountKopecks: number;
    id?: string | undefined;
    quantity?: number | undefined;
    subject?: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking" | undefined;
    method?: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment" | undefined;
    vatRate?: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none" | undefined;
    measure?: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day" | undefined;
    taxDeductionCode?: "code_1_standard" | "code_2_expensive_treatment" | undefined;
    medicalServiceCode804n?: string | null | undefined;
    medicalServiceCodeMzk?: string | null | undefined;
    toothFdiNumber?: number | null | undefined;
    markingCode?: string | null | undefined;
}>;
export type FiscalReceiptItemInput = z.infer<typeof fiscalReceiptItemSchema>;
/**
 * Schema for creating and queueing an FFD 1.2 fiscal receipt.
 */
export declare const createFiscalReceiptPayloadSchema: z.ZodEffects<z.ZodObject<{
    clientMutationId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    invoiceId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    visitId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    documentId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    patientId: z.ZodString;
    operationType: z.ZodDefault<z.ZodEnum<["income", "income_return", "expense", "expense_return"]>>;
    taxationSystem: z.ZodDefault<z.ZodEnum<["osn", "usn_income", "usn_income_expense", "esxn", "psn"]>>;
    customerContact: z.ZodString;
    cashierFullName: z.ZodDefault<z.ZodString>;
    cashierInn: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    paymentAddress: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    paymentPlace: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    items: z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        priceKopecks: z.ZodNumber;
        quantity: z.ZodDefault<z.ZodNumber>;
        amountKopecks: z.ZodNumber;
        subject: z.ZodDefault<z.ZodEnum<["commodity", "job", "service", "payment", "agency_fee", "composite", "other", "excisable_goods_with_marking", "excisable_goods_without_marking", "goods_with_marking", "goods_without_marking"]>>;
        method: z.ZodDefault<z.ZodEnum<["full_prepayment", "prepayment", "advance", "full_payment", "partial_payment_and_credit", "credit_handover", "credit_payment"]>>;
        vatRate: z.ZodDefault<z.ZodEnum<["vat_20", "vat_10", "vat_20_120", "vat_10_110", "vat_0", "vat_none"]>>;
        measure: z.ZodDefault<z.ZodEnum<["piece", "gram", "kilogram", "minute", "hour", "day", "other"]>>;
        taxDeductionCode: z.ZodDefault<z.ZodEnum<["code_1_standard", "code_2_expensive_treatment"]>>;
        medicalServiceCode804n: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        medicalServiceCodeMzk: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        toothFdiNumber: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        /** Честный ЗНАК / МДЛП DataMatrix marking barcode (Тег 1162 / Тег 1163 / Тег 2000) */
        markingCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        priceKopecks: number;
        quantity: number;
        amountKopecks: number;
        subject: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking";
        method: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment";
        vatRate: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none";
        measure: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day";
        taxDeductionCode: "code_1_standard" | "code_2_expensive_treatment";
        id?: string | undefined;
        medicalServiceCode804n?: string | null | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }, {
        name: string;
        priceKopecks: number;
        amountKopecks: number;
        id?: string | undefined;
        quantity?: number | undefined;
        subject?: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking" | undefined;
        method?: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment" | undefined;
        vatRate?: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none" | undefined;
        measure?: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day" | undefined;
        taxDeductionCode?: "code_1_standard" | "code_2_expensive_treatment" | undefined;
        medicalServiceCode804n?: string | null | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }>, {
        medicalServiceCode804n: string | null;
        name: string;
        priceKopecks: number;
        quantity: number;
        amountKopecks: number;
        subject: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking";
        method: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment";
        vatRate: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none";
        measure: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day";
        taxDeductionCode: "code_1_standard" | "code_2_expensive_treatment";
        id?: string | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }, {
        name: string;
        priceKopecks: number;
        amountKopecks: number;
        id?: string | undefined;
        quantity?: number | undefined;
        subject?: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking" | undefined;
        method?: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment" | undefined;
        vatRate?: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none" | undefined;
        measure?: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day" | undefined;
        taxDeductionCode?: "code_1_standard" | "code_2_expensive_treatment" | undefined;
        medicalServiceCode804n?: string | null | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }>, {
        medicalServiceCode804n: string | null;
        name: string;
        priceKopecks: number;
        quantity: number;
        amountKopecks: number;
        subject: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking";
        method: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment";
        vatRate: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none";
        measure: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day";
        taxDeductionCode: "code_1_standard" | "code_2_expensive_treatment";
        id?: string | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }, {
        name: string;
        priceKopecks: number;
        amountKopecks: number;
        id?: string | undefined;
        quantity?: number | undefined;
        subject?: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking" | undefined;
        method?: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment" | undefined;
        vatRate?: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none" | undefined;
        measure?: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day" | undefined;
        taxDeductionCode?: "code_1_standard" | "code_2_expensive_treatment" | undefined;
        medicalServiceCode804n?: string | null | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }>, "many">;
    cashKopecks: z.ZodDefault<z.ZodNumber>;
    electronicCardKopecks: z.ZodDefault<z.ZodNumber>;
    sbpKopecks: z.ZodDefault<z.ZodNumber>;
    prepaidKopecks: z.ZodDefault<z.ZodNumber>;
    creditKopecks: z.ZodDefault<z.ZodNumber>;
    totalKopecks: z.ZodNumber;
    taxDeductionSummaryCode: z.ZodDefault<z.ZodEnum<["code_1_standard", "code_2_expensive_treatment"]>>;
    /** Optional 54-FZ correction attributes */
    isCorrection: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    correctionType: z.ZodNullable<z.ZodOptional<z.ZodEnum<["self_initiated", "by_instruction"]>>>;
    correctionDocDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    correctionDocNumber: z.ZodNullable<z.ZodOptional<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    operationType: "income" | "income_return" | "expense" | "expense_return";
    taxationSystem: "osn" | "usn_income" | "usn_income_expense" | "esxn" | "psn";
    customerContact: string;
    cashierFullName: string;
    items: {
        medicalServiceCode804n: string | null;
        name: string;
        priceKopecks: number;
        quantity: number;
        amountKopecks: number;
        subject: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking";
        method: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment";
        vatRate: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none";
        measure: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day";
        taxDeductionCode: "code_1_standard" | "code_2_expensive_treatment";
        id?: string | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }[];
    cashKopecks: number;
    electronicCardKopecks: number;
    sbpKopecks: number;
    prepaidKopecks: number;
    creditKopecks: number;
    totalKopecks: number;
    taxDeductionSummaryCode: "code_1_standard" | "code_2_expensive_treatment";
    isCorrection: boolean;
    clientMutationId?: string | null | undefined;
    invoiceId?: string | null | undefined;
    visitId?: string | null | undefined;
    documentId?: string | null | undefined;
    cashierInn?: string | null | undefined;
    paymentAddress?: string | null | undefined;
    paymentPlace?: string | null | undefined;
    correctionType?: "self_initiated" | "by_instruction" | null | undefined;
    correctionDocDate?: string | null | undefined;
    correctionDocNumber?: string | null | undefined;
}, {
    patientId: string;
    customerContact: string;
    items: {
        name: string;
        priceKopecks: number;
        amountKopecks: number;
        id?: string | undefined;
        quantity?: number | undefined;
        subject?: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking" | undefined;
        method?: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment" | undefined;
        vatRate?: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none" | undefined;
        measure?: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day" | undefined;
        taxDeductionCode?: "code_1_standard" | "code_2_expensive_treatment" | undefined;
        medicalServiceCode804n?: string | null | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }[];
    totalKopecks: number;
    clientMutationId?: string | null | undefined;
    invoiceId?: string | null | undefined;
    visitId?: string | null | undefined;
    documentId?: string | null | undefined;
    operationType?: "income" | "income_return" | "expense" | "expense_return" | undefined;
    taxationSystem?: "osn" | "usn_income" | "usn_income_expense" | "esxn" | "psn" | undefined;
    cashierFullName?: string | undefined;
    cashierInn?: string | null | undefined;
    paymentAddress?: string | null | undefined;
    paymentPlace?: string | null | undefined;
    cashKopecks?: number | undefined;
    electronicCardKopecks?: number | undefined;
    sbpKopecks?: number | undefined;
    prepaidKopecks?: number | undefined;
    creditKopecks?: number | undefined;
    taxDeductionSummaryCode?: "code_1_standard" | "code_2_expensive_treatment" | undefined;
    isCorrection?: boolean | undefined;
    correctionType?: "self_initiated" | "by_instruction" | null | undefined;
    correctionDocDate?: string | null | undefined;
    correctionDocNumber?: string | null | undefined;
}>, {
    patientId: string;
    operationType: "income" | "income_return" | "expense" | "expense_return";
    taxationSystem: "osn" | "usn_income" | "usn_income_expense" | "esxn" | "psn";
    customerContact: string;
    cashierFullName: string;
    items: {
        medicalServiceCode804n: string | null;
        name: string;
        priceKopecks: number;
        quantity: number;
        amountKopecks: number;
        subject: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking";
        method: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment";
        vatRate: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none";
        measure: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day";
        taxDeductionCode: "code_1_standard" | "code_2_expensive_treatment";
        id?: string | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }[];
    cashKopecks: number;
    electronicCardKopecks: number;
    sbpKopecks: number;
    prepaidKopecks: number;
    creditKopecks: number;
    totalKopecks: number;
    taxDeductionSummaryCode: "code_1_standard" | "code_2_expensive_treatment";
    isCorrection: boolean;
    clientMutationId?: string | null | undefined;
    invoiceId?: string | null | undefined;
    visitId?: string | null | undefined;
    documentId?: string | null | undefined;
    cashierInn?: string | null | undefined;
    paymentAddress?: string | null | undefined;
    paymentPlace?: string | null | undefined;
    correctionType?: "self_initiated" | "by_instruction" | null | undefined;
    correctionDocDate?: string | null | undefined;
    correctionDocNumber?: string | null | undefined;
}, {
    patientId: string;
    customerContact: string;
    items: {
        name: string;
        priceKopecks: number;
        amountKopecks: number;
        id?: string | undefined;
        quantity?: number | undefined;
        subject?: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking" | undefined;
        method?: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment" | undefined;
        vatRate?: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none" | undefined;
        measure?: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day" | undefined;
        taxDeductionCode?: "code_1_standard" | "code_2_expensive_treatment" | undefined;
        medicalServiceCode804n?: string | null | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }[];
    totalKopecks: number;
    clientMutationId?: string | null | undefined;
    invoiceId?: string | null | undefined;
    visitId?: string | null | undefined;
    documentId?: string | null | undefined;
    operationType?: "income" | "income_return" | "expense" | "expense_return" | undefined;
    taxationSystem?: "osn" | "usn_income" | "usn_income_expense" | "esxn" | "psn" | undefined;
    cashierFullName?: string | undefined;
    cashierInn?: string | null | undefined;
    paymentAddress?: string | null | undefined;
    paymentPlace?: string | null | undefined;
    cashKopecks?: number | undefined;
    electronicCardKopecks?: number | undefined;
    sbpKopecks?: number | undefined;
    prepaidKopecks?: number | undefined;
    creditKopecks?: number | undefined;
    taxDeductionSummaryCode?: "code_1_standard" | "code_2_expensive_treatment" | undefined;
    isCorrection?: boolean | undefined;
    correctionType?: "self_initiated" | "by_instruction" | null | undefined;
    correctionDocDate?: string | null | undefined;
    correctionDocNumber?: string | null | undefined;
}>;
export type CreateFiscalReceiptPayloadInput = z.infer<typeof createFiscalReceiptPayloadSchema>;
/**
 * Schema for 54-FZ Return Receipt (Возврат прихода / Возврат расхода).
 */
export declare const fiscalRefundPayloadSchema: z.ZodEffects<z.ZodObject<{
    clientMutationId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    originalPaymentId: z.ZodString;
    originalReceiptNumber: z.ZodString;
    originalFiscalSign: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    patientId: z.ZodString;
    refundCashKopecks: z.ZodDefault<z.ZodNumber>;
    refundElectronicKopecks: z.ZodDefault<z.ZodNumber>;
    refundPrepaidKopecks: z.ZodDefault<z.ZodNumber>;
    totalRefundKopecks: z.ZodNumber;
    reason: z.ZodString;
    cashierFullName: z.ZodDefault<z.ZodString>;
    items: z.ZodArray<z.ZodEffects<z.ZodEffects<z.ZodObject<{
        id: z.ZodOptional<z.ZodString>;
        name: z.ZodString;
        priceKopecks: z.ZodNumber;
        quantity: z.ZodDefault<z.ZodNumber>;
        amountKopecks: z.ZodNumber;
        subject: z.ZodDefault<z.ZodEnum<["commodity", "job", "service", "payment", "agency_fee", "composite", "other", "excisable_goods_with_marking", "excisable_goods_without_marking", "goods_with_marking", "goods_without_marking"]>>;
        method: z.ZodDefault<z.ZodEnum<["full_prepayment", "prepayment", "advance", "full_payment", "partial_payment_and_credit", "credit_handover", "credit_payment"]>>;
        vatRate: z.ZodDefault<z.ZodEnum<["vat_20", "vat_10", "vat_20_120", "vat_10_110", "vat_0", "vat_none"]>>;
        measure: z.ZodDefault<z.ZodEnum<["piece", "gram", "kilogram", "minute", "hour", "day", "other"]>>;
        taxDeductionCode: z.ZodDefault<z.ZodEnum<["code_1_standard", "code_2_expensive_treatment"]>>;
        medicalServiceCode804n: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        medicalServiceCodeMzk: z.ZodNullable<z.ZodOptional<z.ZodString>>;
        toothFdiNumber: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
        /** Честный ЗНАК / МДЛП DataMatrix marking barcode (Тег 1162 / Тег 1163 / Тег 2000) */
        markingCode: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        priceKopecks: number;
        quantity: number;
        amountKopecks: number;
        subject: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking";
        method: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment";
        vatRate: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none";
        measure: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day";
        taxDeductionCode: "code_1_standard" | "code_2_expensive_treatment";
        id?: string | undefined;
        medicalServiceCode804n?: string | null | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }, {
        name: string;
        priceKopecks: number;
        amountKopecks: number;
        id?: string | undefined;
        quantity?: number | undefined;
        subject?: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking" | undefined;
        method?: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment" | undefined;
        vatRate?: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none" | undefined;
        measure?: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day" | undefined;
        taxDeductionCode?: "code_1_standard" | "code_2_expensive_treatment" | undefined;
        medicalServiceCode804n?: string | null | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }>, {
        medicalServiceCode804n: string | null;
        name: string;
        priceKopecks: number;
        quantity: number;
        amountKopecks: number;
        subject: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking";
        method: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment";
        vatRate: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none";
        measure: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day";
        taxDeductionCode: "code_1_standard" | "code_2_expensive_treatment";
        id?: string | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }, {
        name: string;
        priceKopecks: number;
        amountKopecks: number;
        id?: string | undefined;
        quantity?: number | undefined;
        subject?: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking" | undefined;
        method?: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment" | undefined;
        vatRate?: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none" | undefined;
        measure?: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day" | undefined;
        taxDeductionCode?: "code_1_standard" | "code_2_expensive_treatment" | undefined;
        medicalServiceCode804n?: string | null | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }>, {
        medicalServiceCode804n: string | null;
        name: string;
        priceKopecks: number;
        quantity: number;
        amountKopecks: number;
        subject: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking";
        method: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment";
        vatRate: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none";
        measure: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day";
        taxDeductionCode: "code_1_standard" | "code_2_expensive_treatment";
        id?: string | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }, {
        name: string;
        priceKopecks: number;
        amountKopecks: number;
        id?: string | undefined;
        quantity?: number | undefined;
        subject?: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking" | undefined;
        method?: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment" | undefined;
        vatRate?: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none" | undefined;
        measure?: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day" | undefined;
        taxDeductionCode?: "code_1_standard" | "code_2_expensive_treatment" | undefined;
        medicalServiceCode804n?: string | null | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    patientId: string;
    cashierFullName: string;
    items: {
        medicalServiceCode804n: string | null;
        name: string;
        priceKopecks: number;
        quantity: number;
        amountKopecks: number;
        subject: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking";
        method: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment";
        vatRate: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none";
        measure: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day";
        taxDeductionCode: "code_1_standard" | "code_2_expensive_treatment";
        id?: string | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }[];
    originalPaymentId: string;
    originalReceiptNumber: string;
    refundCashKopecks: number;
    refundElectronicKopecks: number;
    refundPrepaidKopecks: number;
    totalRefundKopecks: number;
    reason: string;
    clientMutationId?: string | null | undefined;
    originalFiscalSign?: string | null | undefined;
}, {
    patientId: string;
    items: {
        name: string;
        priceKopecks: number;
        amountKopecks: number;
        id?: string | undefined;
        quantity?: number | undefined;
        subject?: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking" | undefined;
        method?: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment" | undefined;
        vatRate?: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none" | undefined;
        measure?: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day" | undefined;
        taxDeductionCode?: "code_1_standard" | "code_2_expensive_treatment" | undefined;
        medicalServiceCode804n?: string | null | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }[];
    originalPaymentId: string;
    originalReceiptNumber: string;
    totalRefundKopecks: number;
    reason: string;
    clientMutationId?: string | null | undefined;
    cashierFullName?: string | undefined;
    originalFiscalSign?: string | null | undefined;
    refundCashKopecks?: number | undefined;
    refundElectronicKopecks?: number | undefined;
    refundPrepaidKopecks?: number | undefined;
}>, {
    patientId: string;
    cashierFullName: string;
    items: {
        medicalServiceCode804n: string | null;
        name: string;
        priceKopecks: number;
        quantity: number;
        amountKopecks: number;
        subject: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking";
        method: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment";
        vatRate: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none";
        measure: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day";
        taxDeductionCode: "code_1_standard" | "code_2_expensive_treatment";
        id?: string | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }[];
    originalPaymentId: string;
    originalReceiptNumber: string;
    refundCashKopecks: number;
    refundElectronicKopecks: number;
    refundPrepaidKopecks: number;
    totalRefundKopecks: number;
    reason: string;
    clientMutationId?: string | null | undefined;
    originalFiscalSign?: string | null | undefined;
}, {
    patientId: string;
    items: {
        name: string;
        priceKopecks: number;
        amountKopecks: number;
        id?: string | undefined;
        quantity?: number | undefined;
        subject?: "commodity" | "job" | "service" | "payment" | "agency_fee" | "composite" | "other" | "excisable_goods_with_marking" | "excisable_goods_without_marking" | "goods_with_marking" | "goods_without_marking" | undefined;
        method?: "full_prepayment" | "prepayment" | "advance" | "full_payment" | "partial_payment_and_credit" | "credit_handover" | "credit_payment" | undefined;
        vatRate?: "vat_20" | "vat_10" | "vat_20_120" | "vat_10_110" | "vat_0" | "vat_none" | undefined;
        measure?: "other" | "piece" | "gram" | "kilogram" | "minute" | "hour" | "day" | undefined;
        taxDeductionCode?: "code_1_standard" | "code_2_expensive_treatment" | undefined;
        medicalServiceCode804n?: string | null | undefined;
        medicalServiceCodeMzk?: string | null | undefined;
        toothFdiNumber?: number | null | undefined;
        markingCode?: string | null | undefined;
    }[];
    originalPaymentId: string;
    originalReceiptNumber: string;
    totalRefundKopecks: number;
    reason: string;
    clientMutationId?: string | null | undefined;
    cashierFullName?: string | undefined;
    originalFiscalSign?: string | null | undefined;
    refundCashKopecks?: number | undefined;
    refundElectronicKopecks?: number | undefined;
    refundPrepaidKopecks?: number | undefined;
}>;
export type FiscalRefundPayloadInput = z.infer<typeof fiscalRefundPayloadSchema>;
export interface Format54FzFtsQrParams {
    readonly issuedAt: Date | string;
    readonly totalKopecks: number;
    readonly fnSerial: string;
    readonly fiscalDocumentNumber: number | string;
    readonly fiscalSign: number | string;
    readonly operationType: Ffd12OperationType | number;
}
export interface Parsed54FzQrResult {
    readonly isValid: boolean;
    readonly errorMessage?: string | undefined;
    readonly issuedAtIso?: string | undefined;
    readonly totalAmountRub?: number | undefined;
    readonly totalAmountKopecks?: number | undefined;
    readonly fnSerial?: string | undefined;
    readonly fiscalDocumentNumber?: number | undefined;
    readonly fiscalSign?: string | undefined;
    readonly operationType?: Ffd12OperationType | undefined;
    readonly rawParams?: Record<string, string> | undefined;
}
/**
 * Formats statutory 54-FZ FTS QR-code payload string:
 * t=YYYYMMDDTHHMM&s=XXXX.XX&fn=16_DIGITS&i=FD_NUM&fp=FPD_NUM&n=OPER_TYPE
 */
export declare function format54FzFtsQrString(params: Format54FzFtsQrParams): string;
/**
 * Parses and strictly validates a 54-FZ FTS QR-code string according to FFD 1.2 rules.
 */
export declare function parseAndValidate54FzFtsQrString(qrString: string): Parsed54FzQrResult;
/**
 * Builds a deterministic canonical signature for a 54-FZ receipt payload.
 * Normalizes all fields to prevent key ordering or whitespace discrepancies.
 */
export declare function buildFiscalReceiptPayloadSignature(input: {
    patientId: string;
    operationType?: string | undefined;
    taxationSystem?: string | undefined;
    totalKopecks: number;
    cashKopecks?: number | undefined;
    electronicCardKopecks?: number | undefined;
    sbpKopecks?: number | undefined;
    prepaidKopecks?: number | undefined;
    creditKopecks?: number | undefined;
    items: readonly {
        name: string;
        priceKopecks: number;
        quantity: number;
        amountKopecks: number;
        subject?: string | undefined;
        method?: string | undefined;
        vatRate?: string | undefined;
        measure?: string | undefined;
        markingCode?: string | null | undefined;
        medicalServiceCode804n?: string | null | undefined;
    }[];
}): Record<string, unknown>;
/**
 * Builds a deterministic canonical signature for a 54-FZ refund receipt payload.
 */
export declare function buildFiscalRefundPayloadSignature(input: {
    originalPaymentId?: string | null | undefined;
    originalReceiptNumber?: string | undefined;
    patientId: string;
    totalRefundKopecks: number;
    refundCashKopecks?: number | undefined;
    refundElectronicKopecks?: number | undefined;
    refundPrepaidKopecks?: number | undefined;
    reason?: string | undefined;
    items: readonly {
        name: string;
        priceKopecks: number;
        quantity: number;
        amountKopecks: number;
    }[];
}): Record<string, unknown>;
/**
 * Creates a statutory composite Idempotency-Key: `<uuid>#<sha256(canonicalPayload)>`.
 */
export declare function createFiscalCompositeIdempotencyKey(uuid: string, payloadSignature: Record<string, unknown>): string;
/**
 * Verifies if an incoming composite idempotency key matches the computed payload signature.
 */
export declare function verifyFiscalCompositeIdempotencyKey(compositeKey: string, payloadSignature: Record<string, unknown>): {
    isValid: boolean;
    uuid: string;
    expectedHash: string | null;
    actualHash: string;
};
export interface CashChangeResult {
    readonly cashRequiredRub: number;
    readonly receivedCashRub: number;
    readonly changeRub: number;
    readonly changeKopecks: number;
    readonly isShortage: boolean;
    readonly shortageRub: number;
    readonly shortageKopecks: number;
}
/**
 * Computes exact kopeck cash change or shortage for rapid cashier counter.
 */
export declare function calculateCashChange(cashRequiredRub: number, receivedCashRub: number): CashChangeResult;
/**
 * Returns rapid cash preset suggestions for common banknotes and exact amounts.
 */
export declare function getCashPresetSuggestions(cashRequiredRub: number): number[];
/**
 * Statutory validation of Russian Taxpayer Identification Numbers (ИНН):
 * - Legal entity (ЮЛ): 10 digits with Modulo 11 checksum
 * - Individual / Sole proprietor (ФЛ / ИП): 12 digits with 2-level Modulo 11 checksum
 */
export declare function validateRussianTaxpayerInn(inn: string | null | undefined): {
    isValid: boolean;
    kind: "ul" | "fl" | null;
    digits: string;
    errorMessage?: string | undefined;
};
