/**
 * Statutory 54-FZ & FFD 1.2 (ФФД 1.2) Fiscal Tag Constants & Data Types.
 * Strictly compliant with Order of FTS Russia No. ED-7-20/662@ and Federal Law No. 54-FZ.
 */
import { z } from "zod";
/**
 * FFD 1.2 Tag 1054: Operation Type (Признак расчета)
 * 1 = Income (Приход)
 * 2 = Income Return (Возврат прихода)
 * 3 = Expense (Расход)
 * 4 = Expense Return (Возврат расхода)
 */
export declare const FFD12_TAG_1054_OPERATION_CODES: {
    readonly income: 1;
    readonly income_return: 2;
    readonly expense: 3;
    readonly expense_return: 4;
};
export declare const ffd12OperationTypeSchema: z.ZodEnum<["income", "income_return", "expense", "expense_return"]>;
export type Ffd12OperationType = z.infer<typeof ffd12OperationTypeSchema>;
/**
 * FFD 1.2 Tag 1214: Payment Calculation Method (Признак способа расчета)
 * 1 = Full Prepayment (Предоплата 100%)
 * 2 = Partial Prepayment (Частичная предоплата)
 * 3 = Advance (Аванс)
 * 4 = Full Payment / Settlement (Полный расчет / Окончательный расчет с зачетом аванса)
 * 5 = Partial Payment & Credit (Частичный расчет и кредит)
 * 6 = Credit Handover (Передача в кредит)
 * 7 = Credit Payment (Оплата кредита)
 */
export declare const FFD12_TAG_1214_METHOD_CODES: {
    readonly full_prepayment: 1;
    readonly prepayment: 2;
    readonly advance: 3;
    readonly full_payment: 4;
    readonly partial_payment_and_credit: 5;
    readonly credit_handover: 6;
    readonly credit_payment: 7;
};
export declare const ffd12PaymentMethodSchema: z.ZodEnum<["full_prepayment", "prepayment", "advance", "full_payment", "partial_payment_and_credit", "credit_handover", "credit_payment"]>;
export type Ffd12PaymentMethod = z.infer<typeof ffd12PaymentMethodSchema>;
/**
 * FFD 1.2 Tag 1212: Payment Subject (Признак предмета расчета)
 * 1 = Commodity (Товар)
 * 3 = Job (Работа)
 * 4 = Service (Услуга — стоматологическая/медицинская помощь)
 * 10 = Payment / Advance (Платеж / Аванс / Взнос)
 * 11 = Agency Fee (Агентское вознаграждение)
 * 13 = Composite Subject (Составной предмет расчета)
 * 14 = Other (Иной предмет расчета)
 * 30 = Excisable Goods with Marking (Подакцизный товар с маркировкой)
 * 31 = Excisable Goods without Marking (Подакцизный товар без маркировки)
 * 32 = Goods with Marking (Товар, подлежащий обязательной маркировке — Честный ЗНАК / МДЛП)
 * 33 = Goods without Marking (Товар, подлежащий маркировке, но без кода)
 */
export declare const FFD12_TAG_1212_SUBJECT_CODES: {
    readonly commodity: 1;
    readonly job: 3;
    readonly service: 4;
    readonly payment: 10;
    readonly agency_fee: 11;
    readonly composite: 13;
    readonly other: 14;
    readonly excisable_goods_with_marking: 30;
    readonly excisable_goods_without_marking: 31;
    readonly goods_with_marking: 32;
    readonly goods_without_marking: 33;
};
export declare const ffd12PaymentSubjectSchema: z.ZodEnum<["commodity", "job", "service", "payment", "agency_fee", "composite", "other", "excisable_goods_with_marking", "excisable_goods_without_marking", "goods_with_marking", "goods_without_marking"]>;
export type Ffd12PaymentSubject = z.infer<typeof ffd12PaymentSubjectSchema>;
/**
 * FFD 1.2 Tag 1055: Taxation System (Применяемая система налогообложения — СНО)
 * 1 = OSN (Общая — ОСН)
 * 2 = USN Income (УСН Доходы)
 * 4 = USN Income-Expense (УСН Доходы минус Расходы)
 * 8 = ESXN (Единый сельскохозяйственный налог)
 * 16 = PSN (Патентная система налогообложения — ПСН)
 */
export declare const FFD12_TAG_1055_TAXATION_CODES: {
    readonly osn: 1;
    readonly usn_income: 2;
    readonly usn_income_expense: 4;
    readonly esxn: 8;
    readonly psn: 16;
};
export declare const ffd12TaxationSystemSchema: z.ZodEnum<["osn", "usn_income", "usn_income_expense", "esxn", "psn"]>;
export type Ffd12TaxationSystem = z.infer<typeof ffd12TaxationSystemSchema>;
/**
 * FFD 1.2 Tag 1199: VAT Rate (Ставка НДС)
 * 1 = VAT 20%
 * 2 = VAT 10%
 * 3 = VAT 20/120 (расчетная)
 * 4 = VAT 10/110 (расчетная)
 * 5 = VAT 0%
 * 6 = Without VAT (Без НДС — освобождение по пп. 2 п. 2 ст. 149 НК РФ для медуслуг)
 */
export declare const FFD12_TAG_1199_VAT_CODES: {
    readonly vat_20: 1;
    readonly vat_10: 2;
    readonly vat_20_120: 3;
    readonly vat_10_110: 4;
    readonly vat_0: 5;
    readonly vat_none: 6;
};
export declare const ffd12VatRateSchema: z.ZodEnum<["vat_20", "vat_10", "vat_20_120", "vat_10_110", "vat_0", "vat_none"]>;
export type Ffd12VatRate = z.infer<typeof ffd12VatRateSchema>;
/**
 * FFD 1.2 Tag 2108: Quantity Measure (Мера количества предмета расчета)
 * 0 = piece / unit (штука / единица)
 * 10 = gram (грамм)
 * 11 = kilogram (килограмм)
 * 20 = minute (минута)
 * 21 = hour (час)
 * 22 = day (сутки)
 * 255 = other (иное)
 */
export declare const FFD12_TAG_2108_MEASURE_CODES: {
    readonly piece: 0;
    readonly gram: 10;
    readonly kilogram: 11;
    readonly minute: 20;
    readonly hour: 21;
    readonly day: 22;
    readonly other: 255;
};
export declare const ffd12QuantityMeasureSchema: z.ZodEnum<["piece", "gram", "kilogram", "minute", "hour", "day", "other"]>;
export type Ffd12QuantityMeasure = z.infer<typeof ffd12QuantityMeasureSchema>;
/**
 * FFD 1.2 Tag 1173: Correction Type (Тип коррекции чека)
 * 0 = Self-initiated (Самостоятельно)
 * 1 = By instruction of tax authority (По предписанию налогового органа)
 */
export declare const FFD12_TAG_1173_CORRECTION_CODES: {
    readonly self_initiated: 0;
    readonly by_instruction: 1;
};
export declare const ffd12CorrectionTypeSchema: z.ZodEnum<["self_initiated", "by_instruction"]>;
export type Ffd12CorrectionType = z.infer<typeof ffd12CorrectionTypeSchema>;
/**
 * Tax deduction category according to Russian Tax Code (Art. 219) & Minzdrav 804n:
 * - code_1_standard: Standard medical care (Терапия, гигиена, брекеты, элайнеры — лимит 150 000 руб.)
 * - code_2_expensive_treatment: Expensive medical care (Хирургическая имплантация, костная пластика, синус-лифтинг — без лимита)
 */
export declare const taxDeductionCategorySchema: z.ZodEnum<["code_1_standard", "code_2_expensive_treatment"]>;
export type TaxDeductionCategory = z.infer<typeof taxDeductionCategorySchema>;
/**
 * FFD 1.2 Tag 2000 / Tag 1162 / Tag 1163: Marking Code Structure (Код товара / Честный ЗНАК / МДЛП)
 */
export interface Ffd12MarkingCodeDescriptor {
    /** Raw GS1 DataMatrix string or ASCII sequence */
    readonly rawDataMatrix: string;
    /** Recognized GTIN (14 digits) */
    readonly gtin: string;
    /** Individual serial number (13-16 alphanumeric chars) */
    readonly serialNumber: string;
    /** Crypto verification key / check code (4 chars) */
    readonly cryptoKey?: string | undefined;
    /** Crypto signature / crypto tail (44 alphanumeric chars) */
    readonly cryptoTail?: string | undefined;
    /** Tag 2106: Check code mode / recognition status */
    readonly checkResultCode?: number | undefined;
    /** Tag 2107: Product check status (1 = checked in KM buffer, planned for sale) */
    readonly productCheckStatus?: number | undefined;
    /** Recognized pharmaceutical / medical device trade name */
    readonly medicationTradeName?: string | undefined;
}
