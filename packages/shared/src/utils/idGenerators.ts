/**
 * @dental/shared/utils/idGenerators.ts
 *
 * Statutory Zero-Mock Cryptographic & Deterministic Identifier Engine.
 * Implements Mandates 8b, 8e, 8n, 8s:
 * - 100% Elimination of pseudorandom Math.random() in production code.
 * - Cryptographically secure CSPRNG (Web Crypto API / globalThis.crypto.getRandomValues).
 * - Deterministic, repeatable sequence derivation based on dates, patient ID, visit ID, and sequential counters.
 */

let globalSequenceCounter = 1000;

/**
 * Returns a thread-safe, monotonic incremental sequence counter.
 */
export function getNextMonotonicSequence(max = 1_000_000): number {
	globalSequenceCounter = (globalSequenceCounter + 1) % max;
	return globalSequenceCounter;
}

/**
 * Resets the in-memory sequence counter (useful for unit testing deterministic fixtures).
 */
export function resetSequenceCounter(startValue = 1000): void {
	globalSequenceCounter = startValue;
}

/**
 * Generates cryptographically secure alphanumeric characters without Math.random().
 */
export function generateSecureAlphanumericId(length = 8, lowercaseOnly = true): string {
	const charset = lowercaseOnly
		? "0123456789abcdefghijklmnopqrstuvwxyz"
		: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
	let result = "";

	if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
		const bytes = new Uint8Array(length);
		globalThis.crypto.getRandomValues(bytes);
		for (let i = 0; i < length; i++) {
			result += charset[bytes[i]! % charset.length];
		}
		return result;
	}

	// Deterministic LCG fallback when crypto is absent (rare in modern Node/browsers)
	const now = Date.now();
	const seq = getNextMonotonicSequence();
	let seed = BigInt(now) ^ (BigInt(seq) << 16n);

	for (let i = 0; i < length; i++) {
		seed = (seed * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffffffn;
		const index = Number(seed % BigInt(charset.length));
		result += charset[index];
	}

	return result;
}

/**
 * Hashes a string seed using 32-bit FNV-1a for deterministic sequence mapping.
 */
export function hashStringSeed(seed: string): number {
	let hash = 2166136261;
	for (let i = 0; i < seed.length; i++) {
		hash ^= seed.charCodeAt(i);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

/**
 * Generates an integer in range [min, max] using either:
 * 1. Deterministic FNV-1a hash of the given seed/sequence (if provided), or
 * 2. Cryptographically secure random values (CSPRNG via globalThis.crypto).
 */
export function generateDeterministicOrSecureInteger(
	min: number,
	max: number,
	seedString?: string,
	sequenceNumber?: number,
): number {
	if (min >= max) return min;
	const range = max - min + 1;

	if (seedString !== undefined) {
		const composite = sequenceNumber !== undefined ? `${seedString}#${sequenceNumber}` : seedString;
		const hash = hashStringSeed(composite);
		return min + (hash % range);
	}

	if (sequenceNumber !== undefined) {
		return min + (Math.abs(sequenceNumber) % range);
	}

	if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
		const buffer = new Uint32Array(1);
		globalThis.crypto.getRandomValues(buffer);
		return min + (buffer[0]! % range);
	}

	const seq = getNextMonotonicSequence(range);
	return min + seq;
}

/**
 * Generates official prescription numbers according to Order No. 1094n.
 * Format: РЕЦ-YYYY-XXXX (1000..9999) or ПКУ-YYYY-XXXXXX (100000..999999).
 */
export function generatePrescriptionSeriesNumber(
	formPrefix: "РЕЦ" | "ПКУ",
	options?: {
		readonly year?: number | undefined;
		readonly seedKey?: string | undefined; // patientId, visitId, etc.
		readonly sequenceNumber?: number | undefined;
		readonly customSeriesNumber?: string | undefined;
	},
): string {
	if (options?.customSeriesNumber && options.customSeriesNumber.trim().length > 0) {
		return options.customSeriesNumber.trim();
	}

	const year = options?.year ?? new Date().getFullYear();
	if (formPrefix === "ПКУ") {
		const num = generateDeterministicOrSecureInteger(
			100000,
			999999,
			options?.seedKey,
			options?.sequenceNumber,
		);
		return `ПКУ-${year}-${num}`;
	}

	const num = generateDeterministicOrSecureInteger(
		1000,
		9999,
		options?.seedKey,
		options?.sequenceNumber,
	);
	return `РЕЦ-${year}-${num}`;
}

/**
 * Generates an official Anesthesia PKU Record number according to SanPiN 3.3686-21.
 * Format: ПКУ-АН-YYYY/XXX (100..999).
 */
export function generateAnesthesiaPkuRecordNumber(
	year?: number,
	options?: {
		readonly seedKey?: string | undefined;
		readonly sequenceNumber?: number | undefined;
		readonly customRecordNumber?: string | undefined;
	},
): string {
	if (options?.customRecordNumber && options.customRecordNumber.trim().length > 0) {
		return options.customRecordNumber.trim();
	}
	const y = year ?? new Date().getFullYear();
	const num = generateDeterministicOrSecureInteger(100, 999, options?.seedKey, options?.sequenceNumber);
	return `ПКУ-АН-${y}/${num}`;
}

/**
 * Generates a unique PKU record ID without Math.random.
 */
export function generateAnesthesiaPkuRecordId(prefix = "pku_an"): string {
	return `${prefix}_${Date.now()}_${generateSecureAlphanumericId(6)}`;
}

/**
 * Generates Family Shared Deposit transaction IDs.
 * Format: TX-{DEP|DEB|REF}-{timestamp}-{seq4}.
 */
export function generateFamilyDepositTransactionId(
	type: "DEP" | "DEB" | "REF",
	options?: {
		readonly timestampMs?: number | undefined;
		readonly seedKey?: string | undefined;
		readonly sequenceNumber?: number | undefined;
	},
): string {
	const ts = options?.timestampMs ?? Date.now();
	const num = generateDeterministicOrSecureInteger(1000, 9999, options?.seedKey, options?.sequenceNumber);
	return `TX-${type}-${ts}-${num}`;
}

/**
 * Generates 54-FZ partial refund operation numbers.
 * Format: ВЗВ-YYYYMMDD-XXXX (1000..9999).
 */
export function generatePartialRefundOperationNumber(
	dateIso: string,
	options?: {
		readonly seedKey?: string | undefined;
		readonly sequenceNumber?: number | undefined;
		readonly customOperationNumber?: string | undefined;
	},
): string {
	if (options?.customOperationNumber && options.customOperationNumber.trim().length > 0) {
		return options.customOperationNumber.trim();
	}
	const datePart = dateIso.slice(0, 10).replace(/-/g, "");
	const num = generateDeterministicOrSecureInteger(1000, 9999, options?.seedKey, options?.sequenceNumber);
	return `ВЗВ-${datePart}-${num}`;
}

/**
 * Generates Treatment Plan numbers.
 * Format: ПЛ-YYYY-XXXX (1000..9999).
 */
export function generateTreatmentPlanNumber(
	date?: Date | string,
	options?: {
		readonly seedKey?: string | undefined;
		readonly sequenceNumber?: number | undefined;
		readonly customPlanNumber?: string | undefined;
	},
): string {
	if (options?.customPlanNumber && options.customPlanNumber.trim().length > 0) {
		return options.customPlanNumber.trim();
	}
	const d = date ? (typeof date === "string" ? new Date(date) : date) : new Date();
	const year = Number.isNaN(d.getFullYear()) ? new Date().getFullYear() : d.getFullYear();
	const num = generateDeterministicOrSecureInteger(1000, 9999, options?.seedKey, options?.sequenceNumber);
	return `ПЛ-${year}-${num}`;
}

/**
 * Generates Treatment Plan ID.
 */
export function generateTreatmentPlanId(): string {
	return `plan_${Date.now()}_${generateSecureAlphanumericId(6)}`;
}

/**
 * Generates Purchase Order number and IDs.
 */
export function generatePurchaseOrderNumber(
	year?: number,
	options?: {
		readonly seedKey?: string | undefined;
		readonly sequenceNumber?: number | undefined;
		readonly customOrderNumber?: string | undefined;
	},
): string {
	if (options?.customOrderNumber && options.customOrderNumber.trim().length > 0) {
		return options.customOrderNumber.trim();
	}
	const y = year ?? new Date().getFullYear();
	const num = generateDeterministicOrSecureInteger(100, 999, options?.seedKey, options?.sequenceNumber);
	return `PO-${y}-${num}`;
}

export function generatePurchaseOrderId(): string {
	return `po-${Date.now()}-${generateSecureAlphanumericId(6)}`;
}

export function generatePurchaseReceiptId(): string {
	return `rcpt-${Date.now()}-${generateSecureAlphanumericId(6)}`;
}

/**
 * Generates Transfer M-11 document IDs.
 */
export function generateTransferM11Id(): string {
	return `m11_${Date.now()}_${generateSecureAlphanumericId(6)}`;
}

/**
 * Generates Class B Medical Waste seal and barcode numbers (SanPiN 2.1.3684-21).
 */
export function generateClassBWasteSealAndBarcode(
	referenceDate: Date = new Date(),
	options?: {
		readonly seedKey?: string | undefined;
		readonly sequenceNumber?: number | undefined;
	},
): { sealNumber: string; barcode: string } {
	const year = referenceDate.getFullYear();
	const month = String(referenceDate.getMonth() + 1).padStart(2, "0");
	const day = String(referenceDate.getDate()).padStart(2, "0");
	const seq = generateDeterministicOrSecureInteger(1000, 9999, options?.seedKey, options?.sequenceNumber);

	const sealNumber = `ПЛ-Б-${year}-${String(seq).padStart(5, "0")}`;
	const barcode = `WASTE-CLASS_B-DENT-${year}${month}${day}-${seq}`;

	return { sealNumber, barcode };
}
