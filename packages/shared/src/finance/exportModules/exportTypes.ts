/**
 * exportTypes.ts — Accounting Export & Bank Registry Types & Zod Schemas.
 * Wave 130 & Mandate 8b (<= 120 lines).
 */

import { z } from "zod";

export const CLIENT_BANK_EXCHANGE_VERSION = "1.03" as const;
export const CLIENT_BANK_ENCODING = "Windows" as const;
export const DEFAULT_SENDER_PROGRAM = "DENTE Dental CRM" as const;
export const DEFAULT_RECIPIENT_PROGRAM = "1С:Предприятие" as const;
export const DEFAULT_PAYMENT_KIND = "электронно" as const;
export const DEFAULT_PAYMENT_TYPE_CODE = "01" as const;
export const DEFAULT_PAYMENT_PRIORITY = 5 as const;

export const BANK_STATEMENT_DOCUMENT_TYPES = [
	"Платежное поручение", "Платежное требование", "Банковский ордер", "Мемориальный ордер", "Инкассовое поручение",
] as const;
export type BankStatementDocumentType = (typeof BANK_STATEMENT_DOCUMENT_TYPES)[number];

export const accountingExportFormatSchema = z.enum(["1c_bank", "1c_xml", "csv", "tsv"]);
export type AccountingExportFormat = z.infer<typeof accountingExportFormatSchema>;

export const accountingExportFilterCriteriaSchema = z.object({
	dateFrom: z.string().min(8),
	dateTo: z.string().min(8),
	doctorId: z.string().optional(),
	patientId: z.string().optional(),
	paymentMethod: z.string().optional(),
}).strict();
export type AccountingExportFilterCriteria = z.infer<typeof accountingExportFilterCriteriaSchema>;

export const bankStatementOperationTypeSchema = z.enum(["receipt", "expense"]);
export type BankStatementOperationType = z.infer<typeof bankStatementOperationTypeSchema>;

export const bankStatementOrderSchema = z.object({
	id: z.string().min(1),
	documentType: z.string().default("Платежное поручение"),
	number: z.string().min(1).max(50),
	date: z.string(),
	amountKopecks: z.number().int().positive(),
	operationType: bankStatementOperationTypeSchema,
	payerAccount: z.string().max(25),
	payerName: z.string().max(500),
	payerInn: z.string().max(12).optional().nullable(),
	payerKpp: z.string().max(9).optional().nullable(),
	payerBankBik: z.string().max(9).default(""),
	payerBankName: z.string().max(255).default(""),
	payerBankCorrAccount: z.string().max(25).optional().nullable(),
	recipientAccount: z.string().max(25),
	recipientName: z.string().max(500),
	recipientInn: z.string().max(12).optional().nullable(),
	recipientKpp: z.string().max(9).optional().nullable(),
	recipientBankBik: z.string().max(9).default(""),
	recipientBankName: z.string().max(255).default(""),
	recipientBankCorrAccount: z.string().max(25).optional().nullable(),
	paymentPurpose: z.string().max(1000).default(""),
	paymentKind: z.string().default(DEFAULT_PAYMENT_KIND),
	paymentTypeCode: z.string().default(DEFAULT_PAYMENT_TYPE_CODE),
	priority: z.number().int().min(1).max(6).default(DEFAULT_PAYMENT_PRIORITY),
	vatRate: z.string().default("Без НДС"),
	vatAmountKopecks: z.number().int().nonnegative().default(0),
}).strict();
export type BankStatementOrder = z.infer<typeof bankStatementOrderSchema>;

export const bankStatementRegistrySchema = z.object({
	registryId: z.string().min(1),
	accountNumber: z.string().max(25),
	bankBik: z.string().max(9).default(""),
	bankName: z.string().max(255).default(""),
	bankCorrAccount: z.string().max(25).optional().nullable(),
	clinicName: z.string().max(255).default(""),
	clinicInn: z.string().max(12).default(""),
	clinicKpp: z.string().max(9).optional().nullable(),
	dateFrom: z.string(),
	dateTo: z.string(),
	createdAt: z.string().optional(),
	senderProgram: z.string().default(DEFAULT_SENDER_PROGRAM),
	recipientProgram: z.string().default(DEFAULT_RECIPIENT_PROGRAM),
	openingBalanceKopecks: z.number().int().nonnegative().default(0),
	orders: z.array(bankStatementOrderSchema),
	totalReceivedKopecks: z.number().int().nonnegative().optional(),
	totalDeductedKopecks: z.number().int().nonnegative().optional(),
	closingBalanceKopecks: z.number().int().nonnegative().optional(),
}).strict();
export type BankStatementRegistry = z.infer<typeof bankStatementRegistrySchema>;

export const clinicRequisiteInfoSchema = z.object({
	name: z.string().min(1),
	inn: z.string().min(10).max(12),
	kpp: z.string().max(9).optional().nullable(),
	bankAccount: z.string().max(25).optional().nullable(),
	bankName: z.string().max(255).optional().nullable(),
	bankBik: z.string().max(9).optional().nullable(),
}).strict();
export type ClinicRequisiteInfo = z.infer<typeof clinicRequisiteInfoSchema>;

export const exportPreviewOrderSchema = z.object({
	number: z.string(),
	date: z.string(),
	amountRub: z.string(),
	purpose: z.string(),
	payer: z.string(),
	recipient: z.string(),
}).strict();
export type ExportPreviewOrder = z.infer<typeof exportPreviewOrderSchema>;

export const exportPreviewSchema = z.object({
	invoiceCount: z.number().int().nonnegative(),
	paymentCount: z.number().int().nonnegative(),
	totalBaseKopecks: z.number().int().nonnegative(),
	totalVatKopecks: z.number().int().nonnegative(),
	totalAmountKopecks: z.number().int().nonnegative(),
	sampleOrders: z.array(exportPreviewOrderSchema).optional(),
}).strict();
export type ExportPreview = z.infer<typeof exportPreviewSchema>;

export * from "./exportReconciliationTypes.js";
