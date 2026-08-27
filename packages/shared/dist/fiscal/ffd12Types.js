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
export const FFD12_TAG_1054_OPERATION_CODES = {
    income: 1,
    income_return: 2,
    expense: 3,
    expense_return: 4,
};
export const ffd12OperationTypeSchema = z.enum([
    "income",
    "income_return",
    "expense",
    "expense_return",
]);
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
export const FFD12_TAG_1214_METHOD_CODES = {
    full_prepayment: 1,
    prepayment: 2,
    advance: 3,
    full_payment: 4,
    partial_payment_and_credit: 5,
    credit_handover: 6,
    credit_payment: 7,
};
export const ffd12PaymentMethodSchema = z.enum([
    "full_prepayment",
    "prepayment",
    "advance",
    "full_payment",
    "partial_payment_and_credit",
    "credit_handover",
    "credit_payment",
]);
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
export const FFD12_TAG_1212_SUBJECT_CODES = {
    commodity: 1,
    job: 3,
    service: 4,
    payment: 10,
    agency_fee: 11,
    composite: 13,
    other: 14,
    excisable_goods_with_marking: 30,
    excisable_goods_without_marking: 31,
    goods_with_marking: 32,
    goods_without_marking: 33,
};
export const ffd12PaymentSubjectSchema = z.enum([
    "commodity",
    "job",
    "service",
    "payment",
    "agency_fee",
    "composite",
    "other",
    "excisable_goods_with_marking",
    "excisable_goods_without_marking",
    "goods_with_marking",
    "goods_without_marking",
]);
/**
 * FFD 1.2 Tag 1055: Taxation System (Применяемая система налогообложения — СНО)
 * 1 = OSN (Общая — ОСН)
 * 2 = USN Income (УСН Доходы)
 * 4 = USN Income-Expense (УСН Доходы минус Расходы)
 * 8 = ESXN (Единый сельскохозяйственный налог)
 * 16 = PSN (Патентная система налогообложения — ПСН)
 */
export const FFD12_TAG_1055_TAXATION_CODES = {
    osn: 1,
    usn_income: 2,
    usn_income_expense: 4,
    esxn: 8,
    psn: 16,
};
export const ffd12TaxationSystemSchema = z.enum([
    "osn",
    "usn_income",
    "usn_income_expense",
    "esxn",
    "psn",
]);
/**
 * FFD 1.2 Tag 1199: VAT Rate (Ставка НДС)
 * 1 = VAT 20%
 * 2 = VAT 10%
 * 3 = VAT 20/120 (расчетная)
 * 4 = VAT 10/110 (расчетная)
 * 5 = VAT 0%
 * 6 = Without VAT (Без НДС — освобождение по пп. 2 п. 2 ст. 149 НК РФ для медуслуг)
 */
export const FFD12_TAG_1199_VAT_CODES = {
    vat_20: 1,
    vat_10: 2,
    vat_20_120: 3,
    vat_10_110: 4,
    vat_0: 5,
    vat_none: 6,
};
export const ffd12VatRateSchema = z.enum([
    "vat_20",
    "vat_10",
    "vat_20_120",
    "vat_10_110",
    "vat_0",
    "vat_none",
]);
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
export const FFD12_TAG_2108_MEASURE_CODES = {
    piece: 0,
    gram: 10,
    kilogram: 11,
    minute: 20,
    hour: 21,
    day: 22,
    other: 255,
};
export const ffd12QuantityMeasureSchema = z.enum([
    "piece",
    "gram",
    "kilogram",
    "minute",
    "hour",
    "day",
    "other",
]);
/**
 * FFD 1.2 Tag 1173: Correction Type (Тип коррекции чека)
 * 0 = Self-initiated (Самостоятельно)
 * 1 = By instruction of tax authority (По предписанию налогового органа)
 */
export const FFD12_TAG_1173_CORRECTION_CODES = {
    self_initiated: 0,
    by_instruction: 1,
};
export const ffd12CorrectionTypeSchema = z.enum([
    "self_initiated",
    "by_instruction",
]);
/**
 * Tax deduction category according to Russian Tax Code (Art. 219) & Minzdrav 804n:
 * - code_1_standard: Standard medical care (Терапия, гигиена, брекеты, элайнеры — лимит 150 000 руб.)
 * - code_2_expensive_treatment: Expensive medical care (Хирургическая имплантация, костная пластика, синус-лифтинг — без лимита)
 */
export const taxDeductionCategorySchema = z.enum([
    "code_1_standard",
    "code_2_expensive_treatment",
]);
