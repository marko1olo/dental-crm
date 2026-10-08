/**
 * offlineQueue.ts — Layer 2: Offline Fiscal Queue & Batch Fiscalization Engine (54-FZ FFD 1.2).
 */

import {
	kopecksToRub,
	rubToKopecks,
} from "@dental/shared";
import type {
	OfflineQueueSummary,
	QueuedReceiptDraft,
} from "./types";

export function calculateOfflineQueueSummary(queue: readonly QueuedReceiptDraft[]): OfflineQueueSummary {
	let totalKopecks = 0;
	let pendingKopecks = 0;
	let pendingCount = 0;
	let offlineKopecks = 0;
	let offlineCount = 0;
	let fiscalizedKopecks = 0;
	let fiscalizedCount = 0;
	let failedKopecks = 0;
	let failedCount = 0;

	for (const item of queue) {
		const kop = item.totalKopecks || rubToKopecks(item.totalRub);
		totalKopecks += kop;

		switch (item.status) {
			case "pending_ofd":
				pendingCount++;
				pendingKopecks += kop;
				break;
			case "hardware_offline":
				offlineCount++;
				offlineKopecks += kop;
				break;
			case "fiscalized":
				fiscalizedCount++;
				fiscalizedKopecks += kop;
				break;
			case "failed":
				failedCount++;
				failedKopecks += kop;
				break;
		}
	}

	const unprintedCount = pendingCount + offlineCount;
	const unprintedKopecks = pendingKopecks + offlineKopecks;
	const unprintedRub = kopecksToRub(unprintedKopecks);

	const formattedStatusText = unprintedCount > 0
		? `В очереди на отправку в ОФД: ${unprintedCount} ${unprintedCount === 1 ? "чек" : unprintedCount < 5 ? "чека" : "чеков"} на сумму ${unprintedRub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₽`
		: "Все чеки успешно фискализированы и переданы в ОФД (очередь пуста)";

	return {
		totalCount: queue.length,
		totalRub: kopecksToRub(totalKopecks),
		totalKopecks,
		pendingCount,
		pendingRub: kopecksToRub(pendingKopecks),
		pendingKopecks,
		offlineCount,
		offlineRub: kopecksToRub(offlineKopecks),
		offlineKopecks,
		fiscalizedCount,
		fiscalizedRub: kopecksToRub(fiscalizedKopecks),
		fiscalizedKopecks,
		failedCount,
		failedRub: kopecksToRub(failedKopecks),
		failedKopecks,
		unprintedCount,
		unprintedRub,
		unprintedKopecks,
		formattedStatusText,
	};
}

export function filterOfflineQueue(
	queue: readonly QueuedReceiptDraft[],
	statusFilter: "all" | "pending" | "offline" | "fiscalized" | "failed" | "unprinted",
	searchQuery?: string,
): QueuedReceiptDraft[] {
	let filtered = [...queue];

	if (statusFilter === "pending") {
		filtered = filtered.filter((i) => i.status === "pending_ofd");
	} else if (statusFilter === "offline") {
		filtered = filtered.filter((i) => i.status === "hardware_offline");
	} else if (statusFilter === "unprinted") {
		filtered = filtered.filter((i) => i.status === "pending_ofd" || i.status === "hardware_offline");
	} else if (statusFilter === "fiscalized") {
		filtered = filtered.filter((i) => i.status === "fiscalized");
	} else if (statusFilter === "failed") {
		filtered = filtered.filter((i) => i.status === "failed");
	}

	if (searchQuery && searchQuery.trim()) {
		const q = searchQuery.toLowerCase().trim();
		filtered = filtered.filter(
			(i) =>
				i.patientName.toLowerCase().includes(q) ||
				i.id.toLowerCase().includes(q) ||
				(i.fiscalDocNumber && i.fiscalDocNumber.toLowerCase().includes(q)) ||
				(i.terminalRrn && i.terminalRrn.toLowerCase().includes(q)) ||
				i.paymentMethodRu.toLowerCase().includes(q),
		);
	}

	return filtered;
}

export function exportOfflineFiscalQueueToCsv(queue: readonly QueuedReceiptDraft[]): string {
	const BOM = "\uFEFF";
	const header = "ID в очереди;Дата постановки;Пациент;Тип операции;Способ оплаты;Сумма (руб);Статус;ФД №;ФПД;RRN Терминала;Ошибка\n";

	const rows = queue.map((item) => {
		const statusRu =
			item.status === "fiscalized"
				? "Фискализирован"
				: item.status === "pending_ofd"
				? "Ожидает отправки в ОФД"
				: item.status === "hardware_offline"
				? "Ошибка связи с ФН / Касса офлайн"
				: "Ошибка фискализации";

		const opRu = item.operationType === "income" ? "Приход (Оплата)" : "Возврат прихода";
		const totalFormatted = (item.totalRub || 0).toFixed(2).replace(".", ",");
		const errClean = (item.errorMessage || "").replace(/[;\n]/g, " ");

		return `"${item.id}";"${item.queuedAt}";"${item.patientName}";"${opRu}";"${item.paymentMethodRu}";"${totalFormatted}";"${statusRu}";"${item.fiscalDocNumber || ""}";"${item.fiscalSign || ""}";"${item.terminalRrn || ""}";"${errClean}"`;
	});

	return BOM + header + rows.join("\n");
}
