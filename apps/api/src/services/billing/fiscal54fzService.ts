/**
 * fiscal54fzService.ts — Canonical Facade for Statutory 54-FZ FFD 1.2 Engine.
 * Delegates pure computation and catalog definitions to ./fiscal54fzModules/ preserving 100% exports.
 */

import { type Decimal } from "decimal.js";
import { type AnatomicalCanalCount } from "@dental/shared";
import { FiscalReceiptFactory } from "../kkt/FiscalReceiptFactory.js";
import {
	compileMultiTenderPayments,
	formatTag1030SubjectName,
	generate54FzQrString,
	generateOfdVerificationUrl,
	kopecksToRubDecimal,
	resolveEndodonticOrder804nItem,
	rubToKopecksDecimal,
} from "./fiscal54fzModules/receiptCompiler.js";
import {
	FFD12_TAG_1054_OPERATION_CODES,
	FFD12_TAG_1055_TAXATION_CODES,
	FFD12_TAG_1057_AGENT_CODES,
	FFD12_TAG_1173_CORRECTION_CODES,
	FFD12_TAG_1199_VAT_CODES,
	FFD12_TAG_1212_SUBJECT_CODES,
	FFD12_TAG_1214_METHOD_CODES,
	FFD12_TAG_1222_AGENT_CODES,
	FFD12_TAG_2108_MEASURE_CODES,
	type Ffd12Tag1054Operation,
	type Ffd12Tag1055Taxation,
	type Ffd12Tag1057AgentSign,
	type Ffd12Tag1173CorrectionType,
	type Ffd12Tag1199Vat,
	type Ffd12Tag1212Subject,
	type Ffd12Tag1214Method,
	type Ffd12Tag2108Measure,
	Fiscal54FzValidationError,
	MINZDRAV_804N_CODE_REGEX,
	MINZDRAV_804N_COMMON_CATALOG,
	type MultiTenderPaymentSplitInput,
	type NormalizedMultiTenderPayments,
} from "./fiscal54fzModules/typesAndCatalog.js";

export {
	FFD12_TAG_1054_OPERATION_CODES,
	FFD12_TAG_1055_TAXATION_CODES,
	FFD12_TAG_1057_AGENT_CODES,
	FFD12_TAG_1173_CORRECTION_CODES,
	FFD12_TAG_1199_VAT_CODES,
	FFD12_TAG_1212_SUBJECT_CODES,
	FFD12_TAG_1214_METHOD_CODES,
	FFD12_TAG_1222_AGENT_CODES,
	FFD12_TAG_2108_MEASURE_CODES,
	Fiscal54FzValidationError,
	MINZDRAV_804N_CODE_REGEX,
	MINZDRAV_804N_COMMON_CATALOG,
};

export type {
	Ffd12Tag1054Operation,
	Ffd12Tag1055Taxation,
	Ffd12Tag1057AgentSign,
	Ffd12Tag1173CorrectionType,
	Ffd12Tag1199Vat,
	Ffd12Tag1212Subject,
	Ffd12Tag1214Method,
	Ffd12Tag2108Measure,
	MultiTenderPaymentSplitInput,
	NormalizedMultiTenderPayments,
};

export class Fiscal54FzService {
	public static rubToKopecks(rub: number | Decimal): number {
		return rubToKopecksDecimal(rub);
	}

	public static kopecksToRub(kopecks: number): number {
		return kopecksToRubDecimal(kopecks);
	}

	public static resolveTag1214(method: Ffd12Tag1214Method): number {
		return FiscalReceiptFactory.resolveTag1214(method);
	}

	public static resolveTag1212(subject: Ffd12Tag1212Subject): number {
		return FiscalReceiptFactory.resolveTag1212(subject);
	}

	public static resolveTag1055(taxation: Ffd12Tag1055Taxation): number {
		return FiscalReceiptFactory.resolveTag1055(taxation);
	}

	public static resolveTag1057(agentSign?: Ffd12Tag1057AgentSign | null): number | null {
		return FiscalReceiptFactory.resolveTag1057(agentSign);
	}

	public static resolveTag1222(agentSign?: Ffd12Tag1057AgentSign | null): number | null {
		return FiscalReceiptFactory.resolveTag1222(agentSign);
	}

	public static resolveTag1054(operation: Ffd12Tag1054Operation): number {
		return FiscalReceiptFactory.resolveTag1054(operation);
	}

	public static resolveTag1199(vatRate: Ffd12Tag1199Vat): number {
		return FiscalReceiptFactory.resolveTag1199(vatRate);
	}

	public static resolveTag2108(measure: Ffd12Tag2108Measure): number {
		return FiscalReceiptFactory.resolveTag2108(measure);
	}

	public static formatTag1030SubjectName(name: string, medicalServiceCode804n?: string | null): string {
		return formatTag1030SubjectName(name, medicalServiceCode804n);
	}

	public static resolveEndodonticOrder804nItem(
		fdiNumber: number,
		canalCountOverride?: AnatomicalCanalCount | null,
	) {
		return resolveEndodonticOrder804nItem(fdiNumber, canalCountOverride);
	}

	public static compileMultiTenderPayments(
		tenderSplits: MultiTenderPaymentSplitInput,
	): NormalizedMultiTenderPayments {
		return compileMultiTenderPayments(tenderSplits);
	}

	public static generate54FzQrString(params: {
		issuedAt: Date;
		totalRub: number;
		fnSerial: string;
		fiscalDocNumber: string | number;
		fiscalSign: string | number;
		operationType: number;
	}): string {
		return generate54FzQrString(params);
	}

	public static generateOfdVerificationUrl(params: {
		fnSerial: string;
		fiscalDocNumber: string | number;
		fiscalSign: string | number;
		totalRub: number;
		operationType: number;
	}): string {
		return generateOfdVerificationUrl(params);
	}
}
