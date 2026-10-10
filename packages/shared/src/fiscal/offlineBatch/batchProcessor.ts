/**
 * batchProcessor.ts — Main 54-FZ Offline Batch Processing & Shift Partitioning Engine.
 *
 * Guarantees:
 * 1. Strict idempotency via unique IDs and canonical SHA-256 payload signatures.
 * 2. Automatic partitioning into 24-hour fiscal shifts with statutory Z-reports.
 * 3. Exact kopeck arithmetic without floating-point drift.
 * 4. Automatic reconciliation between Banking Registry (Acquiring/SBP) and Fiscal Z-Reports.
 */

import { kopecksToNumericString, kopecksToRub, rubToKopecks } from "../kopecksArithmetic.js";
import { computePayloadHash } from "../../sync/hashing.js";
import { generateFiscalBatchId } from "../../utils/idGenerators.js";
import type {
	BatchShiftContainer,
	FailedFiscalRecord,
	OfflineFiscalBatchResult,
	OfflineQueueFiscalItem,
	ProcessedFiscalReceiptRecord,
	ProcessOfflineFiscalBatchOptions,
	SkippedDuplicateFiscalRecord,
} from "./types.js";
import {
	buildFnsQrString,
	compileShiftZReport,
	generateDeterministicFiscalSign,
	MAX_SHIFT_24H_MS,
} from "./zReportExtractor.js";
import { reconcileWithBankingRegistry } from "./bankingReconciler.js";

export function computeItemSignature(item: OfflineQueueFiscalItem): string {
	const canonicalPayload = {
		id: item.id,
		paymentId: item.paymentId ?? null,
		invoiceId: item.invoiceId ?? null,
		patientId: item.patientId,
		operationType: item.operationType,
		items: item.items.map((it) => ({
			name: it.name.trim(),
			priceKopecks: rubToKopecks(it.priceRub),
			quantity: it.quantity ?? 1,
			discountKopecks: it.discountRub ? rubToKopecks(it.discountRub) : 0,
		})),
		tenders: {
			cashKopecks: item.tenders.cashRub ? rubToKopecks(item.tenders.cashRub) : 0,
			cardKopecks: item.tenders.cardRub ? rubToKopecks(item.tenders.cardRub) : 0,
			sbpKopecks: item.tenders.sbpRub ? rubToKopecks(item.tenders.sbpRub) : 0,
			advanceKopecks: item.tenders.advanceOffsetRub ? rubToKopecks(item.tenders.advanceOffsetRub) : 0,
			creditKopecks: item.tenders.creditPostpaymentRub ? rubToKopecks(item.tenders.creditPostpaymentRub) : 0,
			certificateKopecks: item.tenders.certificateRub ? rubToKopecks(item.tenders.certificateRub) : 0,
		},
	};
	return computePayloadHash(canonicalPayload);
}

/**
 * Processes an offline batch of payments/receipts:
 * - Checks idempotency (prevents duplicate fiscal documents);
 * - Auto-partitions items into 24-hour fiscal shifts according to 54-FZ (Art. 4.3);
 * - Generates statutory receipts, Z-reports, and FNS QR codes;
 * - Reconciles electronic totals with the bank acquiring/SBP statement.
 */
export function processOfflineFiscalBatch(
	queueItems: readonly OfflineQueueFiscalItem[],
	options: ProcessOfflineFiscalBatchOptions = {},
): OfflineFiscalBatchResult {
	const batchId =
		options.batchId ??
		generateFiscalBatchId({
			seedKey: options.clinicInn ?? (queueItems.length > 0 ? queueItems[0]?.id : undefined),
			timestampMs: Date.now(),
		});
	const processedAtIso = new Date().toISOString();
	const maxShiftDuration = options.maxShiftDurationMs ?? MAX_SHIFT_24H_MS;

	const seenIds = new Set<string>();
	if (options.existingProcessedIds) {
		for (const id of options.existingProcessedIds) {
			seenIds.add(id);
		}
	}

	const seenSignatures = new Set<string>();
	if (options.existingPayloadSignatures) {
		for (const sig of options.existingPayloadSignatures) {
			seenSignatures.add(sig);
		}
	}

	const skippedDuplicates: SkippedDuplicateFiscalRecord[] = [];
	const failedRecords: FailedFiscalRecord[] = [];
	const validItemsToProcess: Array<{ item: OfflineQueueFiscalItem; signature: string; timestampMs: number }> = [];

	// Step 1: Idempotency & Deduplication
	for (const item of queueItems) {
		if (seenIds.has(item.id)) {
			skippedDuplicates.push({
				queueItemId: item.id,
				paymentId: item.paymentId,
				invoiceId: item.invoiceId,
				reason: "duplicate_id",
				duplicateKey: item.id,
				status: "skipped_duplicate",
			});
			continue;
		}

		if (item.paymentId && seenIds.has(item.paymentId)) {
			skippedDuplicates.push({
				queueItemId: item.id,
				paymentId: item.paymentId,
				invoiceId: item.invoiceId,
				reason: "duplicate_id",
				duplicateKey: item.paymentId,
				status: "skipped_duplicate",
			});
			continue;
		}

		if (item.invoiceId && seenIds.has(item.invoiceId)) {
			skippedDuplicates.push({
				queueItemId: item.id,
				paymentId: item.paymentId,
				invoiceId: item.invoiceId,
				reason: "duplicate_id",
				duplicateKey: item.invoiceId,
				status: "skipped_duplicate",
			});
			continue;
		}

		const signature = item.payloadSignature ?? computeItemSignature(item);
		if (seenSignatures.has(signature)) {
			skippedDuplicates.push({
				queueItemId: item.id,
				paymentId: item.paymentId,
				invoiceId: item.invoiceId,
				reason: "duplicate_signature",
				duplicateKey: signature,
				status: "skipped_duplicate",
			});
			continue;
		}

		// Check timestamp validity
		const itemTime = new Date(item.timestampIso).getTime();
		if (Number.isNaN(itemTime)) {
			failedRecords.push({
				queueItemId: item.id,
				error: `Некорректная дата timestampIso: «${item.timestampIso}»`,
				status: "failed_error",
			});
			continue;
		}

		// Register ID and signature
		seenIds.add(item.id);
		if (item.paymentId) seenIds.add(item.paymentId);
		if (item.invoiceId) seenIds.add(item.invoiceId);
		seenSignatures.add(signature);

		validItemsToProcess.push({
			item,
			signature,
			timestampMs: itemTime,
		});
	}

	// Step 2: Chronological Sort
	validItemsToProcess.sort((a, b) => a.timestampMs - b.timestampMs);

	// Step 3: Shift Partitioning and Receipt Generation
	let currentShiftNumber = options.startingShiftNumber ?? 1;
	let currentFiscalDocNumber = options.startingFiscalDocNumber ?? 1001;
	const fnSerial = options.fnSerial ?? "9960440301849210";

	const batchShifts: BatchShiftContainer[] = [];
	const allProcessedReceipts: ProcessedFiscalReceiptRecord[] = [];

	if (validItemsToProcess.length > 0) {
		let shiftOpenedAtIso = validItemsToProcess[0]!.item.timestampIso;
		let shiftOpenedMs = validItemsToProcess[0]!.timestampMs;
		let shiftReceipts: ProcessedFiscalReceiptRecord[] = [];
		let receiptNumberInShift = 0;

		for (const { item, signature, timestampMs } of validItemsToProcess) {
			// Check if item exceeds 24-hour shift boundary
			if (timestampMs - shiftOpenedMs >= maxShiftDuration && shiftReceipts.length > 0) {
				// Close previous shift
				const shiftClosedAtIso = shiftReceipts[shiftReceipts.length - 1]!.issuedAtIso;
				const zReport = compileShiftZReport(
					currentShiftNumber,
					shiftOpenedAtIso,
					shiftClosedAtIso,
					shiftReceipts,
					currentFiscalDocNumber++,
					options,
				);

				batchShifts.push({
					shiftNumber: currentShiftNumber,
					openedAtIso: shiftOpenedAtIso,
					closedAtIso: shiftClosedAtIso,
					receipts: shiftReceipts,
					zReport,
				});

				// Open new shift
				currentShiftNumber += 1;
				shiftOpenedAtIso = item.timestampIso;
				shiftOpenedMs = timestampMs;
				shiftReceipts = [];
				receiptNumberInShift = 0;
			}

			// Process receipt
			receiptNumberInShift += 1;
			const fiscalDocNumber = currentFiscalDocNumber++;
			const fiscalSign = generateDeterministicFiscalSign(`receipt-${item.id}-${fiscalDocNumber}`);

			// Calculate exact totals from item lines and tenders
			let itemLinesGrossKop = 0;
			let itemLinesDiscountKop = 0;
			for (const it of item.items) {
				const priceKop = rubToKopecks(it.priceRub);
				const qty = it.quantity ?? 1;
				const discKop = it.discountRub ? rubToKopecks(it.discountRub) : 0;
				itemLinesGrossKop += priceKop * qty;
				itemLinesDiscountKop += discKop;
			}
			const totalNetKop = Math.max(0, itemLinesGrossKop - itemLinesDiscountKop);

			const cashKop = item.tenders.cashRub ? rubToKopecks(item.tenders.cashRub) : 0;
			const cardKop = item.tenders.cardRub ? rubToKopecks(item.tenders.cardRub) : 0;
			const sbpKop = item.tenders.sbpRub ? rubToKopecks(item.tenders.sbpRub) : 0;
			const advanceKop = item.tenders.advanceOffsetRub ? rubToKopecks(item.tenders.advanceOffsetRub) : 0;
			const creditKop = item.tenders.creditPostpaymentRub ? rubToKopecks(item.tenders.creditPostpaymentRub) : 0;
			const certKop = item.tenders.certificateRub ? rubToKopecks(item.tenders.certificateRub) : 0;
			const electronicTotalKop = cardKop + sbpKop;

			const totalReceiptKop = cashKop + electronicTotalKop + advanceKop + creditKop + certKop > 0
				? cashKop + electronicTotalKop + advanceKop + creditKop + certKop
				: totalNetKop;

			const totalRubFormatted = kopecksToNumericString(totalReceiptKop);

			const fnsQrString = buildFnsQrString({
				issuedAtIso: item.timestampIso,
				totalRubFormatted,
				fnSerial,
				fiscalDocNumber,
				fiscalSign,
				operationType: item.operationType,
			});

			const receiptRecord: ProcessedFiscalReceiptRecord = {
				queueItemId: item.id,
				paymentId: item.paymentId,
				invoiceId: item.invoiceId,
				patientId: item.patientId,
				patientFullName: item.patientFullName,
				fiscalDocNumber,
				fiscalSign,
				shiftNumber: currentShiftNumber,
				receiptNumberInShift,
				issuedAtIso: item.timestampIso,
				operationType: item.operationType,
				totalRub: kopecksToRub(totalReceiptKop),
				totalKopecks: totalReceiptKop,
				cashRub: kopecksToRub(cashKop),
				cashKopecks: cashKop,
				cardRub: kopecksToRub(cardKop),
				cardKopecks: cardKop,
				sbpRub: kopecksToRub(sbpKop),
				sbpKopecks: sbpKop,
				electronicTotalRub: kopecksToRub(electronicTotalKop),
				electronicTotalKopecks: electronicTotalKop,
				advanceOffsetRub: kopecksToRub(advanceKop),
				advanceOffsetKopecks: advanceKop,
				creditPostpaymentRub: kopecksToRub(creditKop),
				creditPostpaymentKopecks: creditKop,
				certificateRub: kopecksToRub(certKop),
				certificateKopecks: certKop,
				fnsQrString,
				idempotencyKey: item.idempotencyKey ?? `${item.id}#${signature}`,
				payloadSignature: signature,
				status: "processed",
			};

			shiftReceipts.push(receiptRecord);
			allProcessedReceipts.push(receiptRecord);
		}

		// Close the final open shift
		if (shiftReceipts.length > 0) {
			const shiftClosedAtIso = shiftReceipts[shiftReceipts.length - 1]!.issuedAtIso;
			const zReport = compileShiftZReport(
				currentShiftNumber,
				shiftOpenedAtIso,
				shiftClosedAtIso,
				shiftReceipts,
				currentFiscalDocNumber++,
				options,
			);

			batchShifts.push({
				shiftNumber: currentShiftNumber,
				openedAtIso: shiftOpenedAtIso,
				closedAtIso: shiftClosedAtIso,
				receipts: shiftReceipts,
				zReport,
			});
		}
	}

	// Step 4: Overall Batch Aggregations
	let totalGrossKop = 0;
	let totalNetKop = 0;
	let totalCashKop = 0;
	let totalElectronicKop = 0;
	let totalAdvanceOffsetKop = 0;
	let totalCertKop = 0;

	for (const r of allProcessedReceipts) {
		const certKop = r.certificateKopecks ?? 0;
		if (r.operationType === "income") {
			totalGrossKop += r.totalKopecks;
			totalNetKop += r.totalKopecks;
			totalCashKop += r.cashKopecks;
			totalElectronicKop += r.electronicTotalKopecks;
			totalAdvanceOffsetKop += r.advanceOffsetKopecks;
			totalCertKop += certKop;
		} else if (r.operationType === "income_return") {
			totalNetKop -= r.totalKopecks;
			totalCashKop -= r.cashKopecks;
			totalElectronicKop -= r.electronicTotalKopecks;
			totalAdvanceOffsetKop -= r.advanceOffsetKopecks;
			totalCertKop -= certKop;
		}
	}

	// Step 5: Bank Reconciliation
	const reconciliation = reconcileWithBankingRegistry(allProcessedReceipts, options.bankRegistry);

	return {
		batchId,
		processedAtIso,
		totalItemsCount: queueItems.length,
		processedCount: allProcessedReceipts.length,
		duplicateCount: skippedDuplicates.length,
		failedCount: failedRecords.length,
		totalGrossKopecks: totalGrossKop,
		totalGrossRub: kopecksToRub(totalGrossKop),
		totalNetKopecks: totalNetKop,
		totalNetRub: kopecksToRub(totalNetKop),
		totalCashKopecks: totalCashKop,
		totalCashRub: kopecksToRub(totalCashKop),
		totalElectronicKopecks: totalElectronicKop,
		totalElectronicRub: kopecksToRub(totalElectronicKop),
		totalAdvanceOffsetKopecks: totalAdvanceOffsetKop,
		totalAdvanceOffsetRub: kopecksToRub(totalAdvanceOffsetKop),
		totalCertificateKopecks: totalCertKop,
		totalCertificateRub: kopecksToRub(totalCertKop),
		shifts: batchShifts,
		processedReceipts: allProcessedReceipts,
		skippedDuplicates,
		failedRecords,
		reconciliation,
	};
}
