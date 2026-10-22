import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateOfflineQueueSummary,
	exportOfflineFiscalQueueToCsv,
	filterOfflineQueue,
	type QueuedReceiptDraft,
} from "../fiscal54fzEngine";

describe("Fiscal Offline Queue Tests", () => {
	it("1.1 calculateOfflineQueueSummary & filterOfflineQueue — Exact kopecks, metrics and filters", () => {
		const sampleQueue: QueuedReceiptDraft[] = [
			{
				id: "q-1",
				patientId: "pat-1",
				patientName: "Иванова Мария",
				operationType: "income",
				items: [],
				tenders: { cashRub: 0, cardRub: 7400, sbpRub: 0, advanceOffsetRub: 0, certificateRub: 0 },
				totalRub: 7400,
				totalKopecks: 740000,
				status: "hardware_offline",
				retryCount: 2,
				queuedAt: "2026-08-25 10:15:30",
				paymentMethodRu: "Банковская карта",
				terminalRrn: "623891048291",
			},
			{
				id: "q-2",
				patientId: "pat-2",
				patientName: "Смирнов Дмитрий",
				operationType: "income",
				items: [],
				tenders: { cashRub: 0, cardRub: 0, sbpRub: 5500, advanceOffsetRub: 0, certificateRub: 0 },
				totalRub: 5500,
				totalKopecks: 550000,
				status: "pending_ofd",
				retryCount: 0,
				queuedAt: "2026-08-25 10:45:12",
				paymentMethodRu: "СБП QR",
			},
			{
				id: "q-3",
				patientId: "pat-3",
				patientName: "Петрова Елена",
				operationType: "income",
				items: [],
				tenders: { cashRub: 28000, cardRub: 0, sbpRub: 0, advanceOffsetRub: 0, certificateRub: 0 },
				totalRub: 28000,
				totalKopecks: 2800000,
				status: "fiscalized",
				fiscalDocNumber: "00084",
				fiscalSign: "4920194821",
				retryCount: 1,
				queuedAt: "2026-08-25 09:10:00",
				paymentMethodRu: "Наличные",
			},
		];

		const summary = calculateOfflineQueueSummary(sampleQueue);
		assert.equal(summary.totalCount, 3);
		assert.equal(summary.totalKopecks, 4090000);
		assert.equal(summary.totalRub, 40900);
		assert.equal(summary.unprintedCount, 2);
		assert.equal(summary.unprintedKopecks, 1290000);
		assert.equal(summary.offlineCount, 1);
		assert.equal(summary.pendingCount, 1);
		assert.equal(summary.fiscalizedCount, 1);

		const unprinted = filterOfflineQueue(sampleQueue, "unprinted");
		assert.equal(unprinted.length, 2);

		const offline = filterOfflineQueue(sampleQueue, "offline");
		assert.equal(offline.length, 1);
		assert.equal(offline[0]?.id, "q-1");

		const searchByRrn = filterOfflineQueue(sampleQueue, "all", "623891048291");
		assert.equal(searchByRrn.length, 1);
	});

	it("1.2 exportOfflineFiscalQueueToCsv — RFC 4180 CSV with UTF-8 BOM", () => {
		const sampleQueue: QueuedReceiptDraft[] = [
			{
				id: "q-1",
				patientId: "pat-1",
				patientName: "Иванова Мария",
				operationType: "income",
				items: [],
				tenders: { cashRub: 0, cardRub: 7400, sbpRub: 0, advanceOffsetRub: 0, certificateRub: 0 },
				totalRub: 7400,
				totalKopecks: 740000,
				status: "hardware_offline",
				errorMessage: "Таймаут порта ККТ",
				retryCount: 2,
				queuedAt: "2026-08-25 10:15:30",
				paymentMethodRu: "Банковская карта",
				terminalRrn: "623891048291",
			},
		];

		const csv = exportOfflineFiscalQueueToCsv(sampleQueue);
		assert.ok(csv.startsWith("\uFEFF"));
		assert.ok(csv.includes("ID в очереди;Дата постановки;Пациент;Тип операции"));
		assert.ok(csv.includes("Иванова Мария"));
		assert.ok(csv.includes("7400,00"));
	});
});
