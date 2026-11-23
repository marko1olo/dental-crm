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
	kopecksToRub,
	verifyFiscalCompositeIdempotencyKey,
	type CreateFiscalReceiptPayloadOutput as CreateFiscalReceiptPayload,
} from "@dental/shared";
import { and, eq, or, sql } from "drizzle-orm";
import { fiscalReceiptQueue, payments } from "../../../db/schema.js";
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
			fnSerial: (storedPayload["fnSerial"] as string) || null,
			fiscalDocumentNumber: (storedPayload["fiscalDocumentNumber"] as string) || (isZeroAct ? "0" : null),
			fiscalSign: (storedPayload["fiscalSign"] as string) || (isZeroAct ? "0000000000" : null),
			receiptIssuedAt: existingRow.printedAt
				? existingRow.printedAt.toISOString()
				: null,
			ofdVerificationUrl:
				(storedPayload["ofdVerificationUrl"] as string) ||
				(isZeroAct ? "" : null),
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
 * Создание предварительной записи чека в fiscalReceiptQueue перед сетевым обращением к ККТ (Outbox Pattern).
 */
export async function bufferPendingFiscalReceipt(
	tx: DbClientOrTransaction,
	orgId: string,
	data: CreateFiscalReceiptPayload,
	compiled: Ffd12ReceiptPayload,
): Promise<typeof fiscalReceiptQueue.$inferSelect> {
	const payloadToStore: Record<string, unknown> = {
		...compiled,
		clientMutationId: data.clientMutationId ?? null,
	};

	const [queueRow] = await tx
		.insert(fiscalReceiptQueue)
		.values({
			organizationId: orgId,
			visitId: data.visitId || null,
			receiptType: data.operationType,
			status: "pending_print",
			payloadJson: payloadToStore,
			lastError: null,
			retryCount: 0,
			printedAt: null,
		})
		.returning();

	if (!queueRow) {
		throw new Error("Не удалось создать запись в очереди фискализации");
	}

	return queueRow;
}

/**
 * Финализация записи в fiscalReceiptQueue по результатам сетевого ответа ККТ и проводка кассы.
 */
export async function finalizeKktPrintAndBuffer(
	tx: DbClientOrTransaction,
	orgId: string,
	queueId: string,
	data: CreateFiscalReceiptPayload,
	compiled: Ffd12ReceiptPayload,
	printResult: PrintResultMetadata,
): Promise<Record<string, unknown>> {
	const isOffline = printResult.status === "hardware_offline";
	const now = new Date();

	// Ensure payment record exists if clientMutationId was provided and not yet created
	let paymentId =
		("paymentId" in data && typeof (data as { paymentId?: unknown }).paymentId === "string"
			? (data as { paymentId?: string }).paymentId
			: null) ?? null;
	if (data.clientMutationId && data.patientId) {
		const totalKop = data.totalKopecks || 0;
		const amountRub = kopecksToRub(totalKop);
		const [existing] = await tx
			.select({ id: payments.id })
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, orgId),
					eq(payments.clientMutationId, data.clientMutationId),
				),
			)
			.limit(1);

		if (!existing) {
			const [inserted] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: data.patientId,
					visitId: data.visitId || null,
					method: data.electronicCardKopecks ? "card" : data.sbpKopecks ? "online" : "cash",
					status: "paid",
					amountRub,
					amountKopecks: BigInt(totalKop),
					paidAt: now,
					clientMutationId: data.clientMutationId,
					note: `Фискальный платёж (${data.operationType})`,
				})
				.onConflictDoNothing()
				.returning({ id: payments.id });
			if (inserted) {
				paymentId = inserted.id;
			}
		} else {
			paymentId = existing.id;
		}
	}

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
		.update(fiscalReceiptQueue)
		.set({
			paymentId: paymentId ?? undefined,
			status: (printResult.status as typeof fiscalReceiptQueue.$inferInsert.status) || "pending_print",
			payloadJson: payloadToStore,
			lastError: isOffline
				? printResult.errorMessage || "KKT hardware offline or out of paper"
				: null,
			retryCount: isOffline ? 1 : 0,
			printedAt: isOffline ? null : now,
			updatedAt: now,
		})
		.where(
			and(
				eq(fiscalReceiptQueue.id, queueId),
				eq(fiscalReceiptQueue.organizationId, orgId),
			),
		)
		.returning();

	await applyCashBoxFiscalReceipt(tx, orgId, data, printResult);

	return {
		success: true,
		replayed: false,
		queueId: queueRow?.id || queueId,
		status: queueRow?.status,
		queueStatus: queueRow?.status,
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

	// Ensure payment record exists if clientMutationId was provided and not yet created
	let paymentId =
		("paymentId" in data && typeof (data as { paymentId?: unknown }).paymentId === "string"
			? (data as { paymentId?: string }).paymentId
			: null) ?? null;
	if (data.clientMutationId && data.patientId) {
		const totalKop = data.totalKopecks || 0;
		const amountRub = kopecksToRub(totalKop);
		const [existing] = await tx
			.select({ id: payments.id })
			.from(payments)
			.where(
				and(
					eq(payments.organizationId, orgId),
					eq(payments.clientMutationId, data.clientMutationId),
				),
			)
			.limit(1);

		if (!existing) {
			const [inserted] = await tx
				.insert(payments)
				.values({
					organizationId: orgId,
					patientId: data.patientId,
					visitId: data.visitId || null,
					method: data.electronicCardKopecks ? "card" : data.sbpKopecks ? "online" : "cash",
					status: "paid",
					amountRub,
					amountKopecks: BigInt(totalKop),
					paidAt: now,
					clientMutationId: data.clientMutationId,
					note: `Фискальный платёж (${data.operationType})`,
				})
				.onConflictDoNothing()
				.returning({ id: payments.id });
			if (inserted) {
				paymentId = inserted.id;
			}
		} else {
			paymentId = existing.id;
		}
	}

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
		queueStatus: queueRow?.status,
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
