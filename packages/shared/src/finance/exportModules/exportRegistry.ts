/**
 * exportRegistry.ts — Accounting Export Runner & Service Registry.
 * Wave 130 & Mandate 8b (<= 120 lines).
 */

import {
	type AccountingExportFormat,
	type BankStatementRegistry,
	bankStatementRegistrySchema,
} from "./exportTypes.js";
import { generate1CBankStatement } from "./export1CXmlFormatter.js";
import { exportOrdersToCsv, exportOrdersToTsv } from "./exportCsvTsvFormatter.js";

export interface AccountingExportExecutionParams {
	format: AccountingExportFormat;
	registry: BankStatementRegistry;
}

export interface AccountingExportResult {
	format: AccountingExportFormat;
	fileContent: string;
	mimeType: string;
	fileName: string;
	orderCount: number;
}

export function executeAccountingExport(params: AccountingExportExecutionParams): AccountingExportResult {
	const parsed = bankStatementRegistrySchema.parse(params.registry);
	const datePart = parsed.dateTo.replace(/[-.]/g, "");

	switch (params.format) {
		case "1c_bank":
		case "1c_xml": {
			const fileContent = generate1CBankStatement(parsed);
			return {
				format: params.format,
				fileContent,
				mimeType: "text/plain;charset=windows-1251",
				fileName: `1c_bank_statement_${datePart}.txt`,
				orderCount: parsed.orders.length,
			};
		}
		case "tsv": {
			const fileContent = exportOrdersToTsv(parsed.orders);
			return {
				format: "tsv",
				fileContent,
				mimeType: "text/tab-separated-values;charset=utf-8",
				fileName: `bank_statement_${datePart}.tsv`,
				orderCount: parsed.orders.length,
			};
		}
		case "csv":
		default: {
			const fileContent = exportOrdersToCsv(parsed.orders);
			return {
				format: "csv",
				fileContent,
				mimeType: "text/csv;charset=utf-8",
				fileName: `bank_statement_${datePart}.csv`,
				orderCount: parsed.orders.length,
			};
		}
	}
}

export const accountingExportService = {
	execute: executeAccountingExport,
	generate1CBankStatement,
	exportOrdersToCsv,
	exportOrdersToTsv,
};
