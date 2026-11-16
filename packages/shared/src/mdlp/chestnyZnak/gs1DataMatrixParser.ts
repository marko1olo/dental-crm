import { generateSecureAlphanumericId } from "../../utils/idGenerators.js";
import {
	computeGtinCheckDigit,
	isValidGtinChecksum,
	parseMdlpDataMatrix,
} from "../parser.js";
import type {
	ChestnyZnakScannedItem,
	ChestnyZnakVerificationStatus,
	ParsedChestnyZnakBarcode,
} from "./types.js";

/**
 * Parses any Chestny ZNAK / MDLP DataMatrix barcode string into structured components.
 * Delegates to canonical GS1 parser SSOT in parser.ts.
 */
export function parseChestnyZnakBarcode(
	rawInput: unknown,
	referenceDate: Date = new Date(),
): ParsedChestnyZnakBarcode {
	const mdlp = parseMdlpDataMatrix(rawInput, referenceDate);

	// Determine Verification Status
	let status: ChestnyZnakVerificationStatus;
	let statusReason: string;

	if (!mdlp.gtin || !mdlp.serialNumber || mdlp.errors.some((e) => e.includes("Отсутствует"))) {
		status = "invalid_format";
		statusReason = mdlp.errors[0] ?? "Невалидный формат штрихкода маркировки";
	} else if (!mdlp.isValidGtinChecksum) {
		status = "invalid_checksum";
		statusReason = "Несовпадение контрольной суммы GTIN по алгоритму Modulo 10";
	} else if (mdlp.isExpired) {
		status = "expired";
		statusReason = `Срок годности истек: ${mdlp.expirationDate}`;
	} else if (
		mdlp.isExpiringSoon ||
		!mdlp.cryptoSignature ||
		mdlp.warnings.length > 0
	) {
		status = "warning";
		if (mdlp.isExpiringSoon) {
			statusReason = `Срок годности истекает через ${mdlp.daysUntilExpiration} дн. (${mdlp.expirationDate})`;
		} else if (!mdlp.cryptoSignature) {
			statusReason = "Отсутствует криптохвост проверки подлинности";
		} else {
			statusReason = mdlp.warnings[0] ?? "Предупреждение валидации";
		}
	} else {
		status = "verified";
		statusReason = "Код маркировки полностью проверен и валиден";
	}

	return {
		rawBarcode: mdlp.rawBarcode,
		gtin: mdlp.gtin,
		serialNumber: mdlp.serialNumber,
		sgtin: mdlp.sgtin,
		cryptoKey: mdlp.cryptoKey || null,
		cryptoSignature: mdlp.cryptoSignature || null,
		expirationDate: mdlp.expirationDate,
		expirationDateRaw: mdlp.expirationDateRaw,
		isExpired: mdlp.isExpired,
		isExpiringSoon: mdlp.isExpiringSoon,
		daysUntilExpiration: mdlp.daysUntilExpiration,
		series: mdlp.series,
		lot: mdlp.lot,
		isValidGtinChecksum: mdlp.isValidGtinChecksum,
		recognizedDrug: mdlp.recognizedDrug,
		parsedAIs: mdlp.parsedAIs,
		status,
		statusReason,
		errors: mdlp.errors,
		warnings: mdlp.warnings,
	};
}

/**
 * Creates a fully initialized ChestnyZnakScannedItem from a 2D barcode scan.
 */
export function createChestnyZnakScannedItem(
	rawInput: unknown,
	options: {
		id?: string | undefined;
		costRub?: number | null | undefined;
		vatRate?: 0 | 10 | 20 | undefined;
		referenceDate?: Date | undefined;
	} = {},
): ChestnyZnakScannedItem {
	const parsed = parseChestnyZnakBarcode(rawInput, options.referenceDate);
	const id = options.id ?? `cz-${Date.now()}-${generateSecureAlphanumericId(6)}`;

	const tradeName =
		parsed.recognizedDrug?.tradeName ??
		(parsed.gtin ? `Препарат GTIN: ${parsed.gtin}` : "Нераспознанный медикамент");

	const inn = parsed.recognizedDrug?.inn ?? "—";
	const dosageForm = parsed.recognizedDrug?.dosageForm ?? "Упаковка / Флакон";
	const costRub = options.costRub != null && !Number.isNaN(options.costRub) ? options.costRub : null;
	const vatRate = options.vatRate ?? 10;

	return {
		id,
		rawBarcode: parsed.rawBarcode,
		gtin: parsed.gtin,
		serialNumber: parsed.serialNumber,
		sgtin: parsed.sgtin,
		expirationDate: parsed.expirationDate,
		expirationDateRaw: parsed.expirationDateRaw,
		isExpired: parsed.isExpired,
		isExpiringSoon: parsed.isExpiringSoon,
		daysUntilExpiration: parsed.daysUntilExpiration,
		series: parsed.series,
		lot: parsed.lot,
		cryptoKey: parsed.cryptoKey,
		cryptoSignature: parsed.cryptoSignature,
		status: parsed.status,
		statusReason: parsed.statusReason,
		tradeName,
		inn,
		dosageForm,
		recognizedDrug: parsed.recognizedDrug,
		costRub,
		vatRate,
		scannedAt: new Date().toISOString(),
	};
}

// Re-export core algorithms for unified access
export { computeGtinCheckDigit, isValidGtinChecksum };
