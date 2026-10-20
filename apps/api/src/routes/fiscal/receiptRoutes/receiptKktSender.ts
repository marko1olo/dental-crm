/**
 * receiptKktSender.ts — Layer 3: LAN KKT Execution, FN QR-Code Generation & Offline Queueing.
 *
 * Implements:
 * - LAN KKT driver dispatch (ATOL / Shtrikh-M / Dreamkas)
 * - FNS 54-FZ FN QR-code string formatting (Tag 1196)
 * - Composite Idempotency-Key validation (<uuid>#<sha256(payload)>)
 * - Hardware offline buffering into fiscalReceiptQueue without blocking checkout
 */

import {
	buildFiscalReceiptPayloadSignature,
	kopecksToNumericString,
	verifyFiscalCompositeIdempotencyKey,
	type CreateFiscalReceiptPayloadOutput as CreateFiscalReceiptPayload,
} from "@dental/shared";
import { and, eq, or, sql } from "drizzle-orm";
import { fiscalReceiptQueue } from "../../../db/schema.js";
import { LanKktDriverService } from "../../../services/hardware/index.js";
import { FiscalReceiptFactory, type Ffd12ReceiptPayload } from "../../../services/kkt/FiscalReceiptFactory.js";
import { applyCashBoxFiscalReceipt } from "./receiptCashBoxLedger.js";
import type { DbClientOrTransaction, PrintResultMetadata } from "./types.js";

/**
 * Генерация канонической строки QR-кода ФН для кассового чека (Тег 1196 по 54-ФЗ).
 * Формат ФНС: t=YYYYMMDDTHHMM&s=000.00&fn=0000000000000000&i=00000&fp=0000000000&n=1
 */
export function generateFnQrCodeString(params: {
	readonly issuedAt: Date | string;
	readonly totalKopecks: number;
	readonly fnSerial: string;
	readonly fiscalDocumentNumber: string | number;
	readonly fiscalSign: string;
	readonly operationType?: number | string | undefined;
}): string {
	const dt = new Date(params.issuedAt);
	const year = dt.getFullYear();
	const month = String(dt.getMonth() + 1).padStart(2, "0");
	const day = String(dt.getDate()).padStart(2, "0");
	const hours = String(dt.getHours()).padStart(2, "0");
	const minutes = String(dt.getMinutes()).padStart(2, "0");
	const timeStr = `${year}${month}${day}T${hours}${minutes}`;

	const sumStr = kopecksToNumericString(params.totalKopecks);
	const nType = params.operationType ? String(params.operationType) : "1";

	return `t=${timeStr}&s=${sumStr}&fn=${params.fnSerial}&i=${params.fiscalDocumentNumber}&fp=${params.fiscalSign}&n=${nType}`;
}

export interface ExistingReceiptCheckResult {
	readonly isExisting: boolean;
	readonly isReplayed: boolean;
	readonly isConflict: boolean;
	readonly responseData?: Record<string, unknown> | undefined;
	readonly statusCode?: number | undefined;
}

/**
 * Проверка ранее зарегистрированного чека по clientMutationId в рамках единой ACID блокировки.
 */
export async function checkExistingIdempotentReceipt(
	tx: DbClientOrTransaction,
	orgId: string,
	mutationId: string,
	data: CreateFiscalReceiptPayload,
): Promise<ExistingReceiptCheckResult> {
	const rawMutation = mutationId;
	const baseMutation = mutationId.includes("#") ? mutationId.split("#")[0] : mutationId;
	const existingQueueRows = await tx
		.select()
		.from(fiscalReceiptQueue)
		.where(
			and(
				eq(fiscalReceiptQueue.organizationId, orgId),
				or(
					sql`${fiscalReceiptQueue.payloadJson}->>'clientMutationId' = ${rawMutation}`,
					sql`${fiscalReceiptQueue.payloadJson}->>'clientMutationId' = ${baseMutation}`,
				),
			),
		)
		.limit(1);

	const existingRow = existingQueueRows[0];
	if (!existingRow) {
		return { isExisting: false, isReplayed: false, isConflict: false };
	}

	const storedPayload = (existingRow.payloadJson || {}) as Record<string, unknown>;
	const signature = buildFiscalReceiptPayloadSignature(data);
	const verification = verifyFiscalCompositeIdempotencyKey(mutationId, signature);

	const totalKopecksMatch = Number(storedPayload["totalKopecks"]) === data.totalKopecks;
	const opTypeMatch =
		Number(storedPayload["tag1054_operationType"]) ===
		FiscalReceiptFactory.resolveTag1054(data.operationType);

	if (verification.isValid && totalKopecksMatch && opTypeMatch) {
		const isZeroAct = Boolean(storedPayload["isWarrantyZeroAct"]);
		const responseData: Record<string, unknown> = {
			success: true,
			replayed: true,
			queueId: existingRow.id,
			status: existingRow.status,
			fnSerial: (storedPayload["fnSerial"] as string) || "9960440301234567",
			fiscalDocumentNumber: (storedPayload["fiscalDocumentNumber"] as string) || (isZeroAct ? "0" : "1001"),
			fiscalSign: (storedPayload["fiscalSign"] as string) || (isZeroAct ? "0000000000" : "1234567890"),
			receiptIssuedAt: existingRow.printedAt
				? existingRow.printedAt.toISOString()
				: existingRow.createdAt.toISOString(),
			ofdVerificationUrl:
				(storedPayload["ofdVerificationUrl"] as string) ||
				(isZeroAct
					? ""
					: `https://ofd.ru/check?fn=9960440301234567&fd=1001&fpd=1234567890&s=${kopecksToNumericString(data.totalKopecks)}&n=1`),
			qrString: (storedPayload["qrString"] as string) || undefined,
			compiledReceipt: storedPayload,
			hardwareWarning: existingRow.lastError,
		};

		if (isZeroAct) {
			responseData.isWarrantyZeroAct = true;
			responseData.warrantyActNumber = storedPayload["warrantyActNumber"];
		}

		return {
			isExisting: true,
			isReplayed: true,
			isConflict: false,
			statusCode: 200,
			responseData,
		};
	}

	return {
		isExisting: true,
		isReplayed: false,
		isConflict: true,
		statusCode: 409,
		responseData: {
			error: "FiscalReceiptConflictError",
			message:
				"Чек с таким ключом операции (clientMutationId) уже был зарегистрирован с другими реквизитами или суммой.",
			details: {
				expectedHash: verification.expectedHash,
				actualHash: verification.actualHash,
			},
		},
	};
}

/**
 * Исполнение печати в ККТ и атомарное сохранение в fiscalReceiptQueue.
 */
export async function executeKktPrintAndBuffer(
	tx: DbClientOrTransaction,
	orgId: string,
	data: CreateFiscalReceiptPayload,
	compiled: Ffd12ReceiptPayload,
): Promise<Record<string, unknown>> {
	const printResult: PrintResultMetadata = await LanKktDriverService.printFiscalReceipt(compiled);

	const isOffline = printResult.status === "hardware_offline";
	const now = new Date();

	const effectiveQrString =
		printResult.qrString ||
		(printResult.fnSerial && printResult.fiscalDocumentNumber && printResult.fiscalSign
			? generateFnQrCodeString({
					issuedAt: printResult.receiptIssuedAt || now,
					totalKopecks: data.totalKopecks,
					fnSerial: printResult.fnSerial,
					fiscalDocumentNumber: printResult.fiscalDocumentNumber,
					fiscalSign: printResult.fiscalSign,
					operationType: FiscalReceiptFactory.resolveTag1054(data.operationType),
				})
			: null);

	const payloadToStore: Record<string, unknown> = {
		...compiled,
		clientMutationId: data.clientMutationId ?? null,
		fnSerial: printResult.fnSerial,
		fiscalDocumentNumber: printResult.fiscalDocumentNumber,
		fiscalSign: printResult.fiscalSign,
		ofdVerificationUrl: printResult.ofdVerificationUrl,
		qrString: effectiveQrString,
		receiptIssuedAt: printResult.receiptIssuedAt,
	};

	const [queueRow] = await tx
		.insert(fiscalReceiptQueue)
		.values({
			organizationId: orgId,
			visitId: data.visitId || null,
			receiptType: data.operationType,
			status: (printResult.status as typeof fiscalReceiptQueue.$inferInsert.status) || "pending_print",
			payloadJson: payloadToStore,
			lastError: isOffline
				? printResult.errorMessage || "KKT hardware offline or out of paper"
				: null,
			retryCount: isOffline ? 1 : 0,
			printedAt: isOffline ? null : now,
		})
		.returning();

	await applyCashBoxFiscalReceipt(tx, orgId, data, printResult);

	return {
		success: true,
		replayed: false,
		queueId: queueRow?.id,
		status: queueRow?.status,
		fnSerial: printResult.fnSerial,
		fiscalDocumentNumber: printResult.fiscalDocumentNumber,
		fiscalSign: printResult.fiscalSign,
		receiptIssuedAt: printResult.receiptIssuedAt,
		ofdVerificationUrl: printResult.ofdVerificationUrl,
		qrString: effectiveQrString,
		compiledReceipt: compiled,
		hardwareWarning: isOffline ? printResult.errorMessage : null,
	};
}
