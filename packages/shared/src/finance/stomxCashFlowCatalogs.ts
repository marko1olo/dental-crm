/**
 * packages/shared/src/finance/stomxCashFlowCatalogs.ts
 *
 * DENTE Dental CRM — Канонические каталоги движения денежных средств и операций кассы (Приход и Расход ДС) по 54-ФЗ.
 * Модуль обратной совместимости (Compatibility Facade) над каноническим cashFlowCatalogs.ts.
 */

export * from "./cashFlowCatalogs.js";

import {
	CASH_EXPENSE_TYPE_ALIASES,
	cashExpenseTypeAliasSchema,
	type CashExpenseTypeAlias,
	CASH_EXPENSE_PNL_CATEGORIES,
	cashExpensePnlCategorySchema,
	type CashExpensePnlCategory,
	cashExpenseItemSchema,
	type CashExpenseItem,
	CASH_EXPENSE_CATALOG,
	CASH_EXPENSE_BY_ALIAS,
	CASH_EXPENSE_BY_ID,
	CASH_RECEIPT_TYPE_ALIASES,
	cashReceiptTypeAliasSchema,
	type CashReceiptTypeAlias,
	cashReceiptItemSchema,
	type CashReceiptItem,
	CASH_RECEIPT_CATALOG,
	CASH_RECEIPT_BY_ALIAS,
	CASH_RECEIPT_BY_ID,
} from "./cashFlowCatalogs.js";

// ============================================================================
// Обратная совместимость для плавного перехода (Backward Compatibility Aliases)
// ============================================================================
export const STOMX_EXPENSE_TYPE_ALIASES = CASH_EXPENSE_TYPE_ALIASES;
export const stomxExpenseTypeAliasSchema = cashExpenseTypeAliasSchema;
export type StomxExpenseTypeAlias = CashExpenseTypeAlias;

export const STOMX_EXPENSE_PNL_CATEGORIES = CASH_EXPENSE_PNL_CATEGORIES;
export const stomxExpensePnlCategorySchema = cashExpensePnlCategorySchema;
export type StomxExpensePnlCategory = CashExpensePnlCategory;

export const stomxCashExpenseItemSchema = cashExpenseItemSchema;
export type StomxCashExpenseItem = CashExpenseItem;

export const STOMX_CASH_EXPENSE_CATALOG = CASH_EXPENSE_CATALOG;
export const STOMX_CASH_EXPENSE_BY_ALIAS = CASH_EXPENSE_BY_ALIAS;
export const STOMX_CASH_EXPENSE_BY_ID = CASH_EXPENSE_BY_ID;

export const STOMX_RECEIPT_TYPE_ALIASES = CASH_RECEIPT_TYPE_ALIASES;
export const stomxReceiptTypeAliasSchema = cashReceiptTypeAliasSchema;
export type StomxReceiptTypeAlias = CashReceiptTypeAlias;

export const stomxCashReceiptItemSchema = cashReceiptItemSchema;
export type StomxCashReceiptItem = CashReceiptItem;

export const STOMX_CASH_RECEIPT_CATALOG = CASH_RECEIPT_CATALOG;
export const STOMX_CASH_RECEIPT_BY_ALIAS = CASH_RECEIPT_BY_ALIAS;
export const STOMX_CASH_RECEIPT_BY_ID = CASH_RECEIPT_BY_ID;
