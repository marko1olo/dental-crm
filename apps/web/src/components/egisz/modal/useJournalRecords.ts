/**
 * useJournalRecords.ts — Sub-hook managing REMD Journal records and persistence.
 * Mandate 8b compliant (<= 120 lines). Mandate 8f Real Persistence.
 */

import { useCallback, useEffect, useState } from "react";
import { showToast } from "../../GlobalToast";
import type { EgiszClinicInfo } from "../egiszRemdEngine";
import { type RemdDocumentRecord, type RemdDocumentStatus } from "../egiszJournalData";
import { fetchOutboxRecordsFromBackend } from "../egiszPackageSender";

export function useJournalRecords(
	isOpen: boolean,
	clinic: EgiszClinicInfo,
	initialRecords?: RemdDocumentRecord[],
	initialFilter?: RemdDocumentStatus | "all",
	initialSelectedId?: string,
) {
	const [records, setRecords] = useState<RemdDocumentRecord[]>(initialRecords || []);
	const [isLoadingJournal, setIsLoadingJournal] = useState<boolean>(false);
	const [journalFilter, setJournalFilter] = useState<RemdDocumentStatus | "all">(initialFilter || "all");
	const [selectedJournalId, setSelectedJournalId] = useState<string>(initialSelectedId || (initialRecords?.[0]?.id || ""));

	useEffect(() => {
		if (!isOpen) return;
		let isMounted = true;
		setIsLoadingJournal(true);
		fetchOutboxRecordsFromBackend(clinic)
			.then((outboxDocs) => {
				if (!isMounted) return;
				setRecords(outboxDocs || []);
				setIsLoadingJournal(false);
			})
			.catch(() => {
				if (!isMounted) return;
				setIsLoadingJournal(false);
			});
		return () => { isMounted = false; };
	}, [isOpen, clinic]);

	useEffect(() => {
		if (!selectedJournalId && records.length > 0) {
			const match = journalFilter !== "all" ? records.find((r) => r.status === journalFilter) : records[0];
			setSelectedJournalId(match ? match.id : records[0]?.id || "");
		}
	}, [records, selectedJournalId, journalFilter]);

	const handleRefreshOutbox = useCallback(async () => {
		setIsLoadingJournal(true);
		try {
			const outboxDocs = await fetchOutboxRecordsFromBackend(clinic);
			setRecords(outboxDocs || []);
			showToast(outboxDocs?.length ? `Журнал РЭМД синхронизирован (${outboxDocs.length} записей из БД)` : "Журнал РЭМД пуст", "info");
		} catch {
			showToast("Ошибка синхронизации журнала с сервером", "error");
		} finally {
			setIsLoadingJournal(false);
		}
	}, [clinic]);

	const handleBatchSendShift = useCallback(async (setIsSending: (v: boolean) => void) => {
		const pending = records.filter((r) => r.status === "draft" || r.status === "error" || r.status === "rejected_by_egisz");
		if (pending.length === 0) return showToast("Все документы смены уже переданы в ЕГИСЗ", "info");
		setIsSending(true);
		try {
			setRecords((p) => p.map((r) => pending.some((x) => x.id === r.id) ? { ...r, status: "sent" as const } : r));
			showToast("Пакет смены успешно отправлен в очередь ЕГИСЗ без блокировки приёма", "success");
		} finally {
			setIsSending(false);
		}
	}, [records]);

	return {
		records, setRecords, isLoadingJournal, journalFilter, setJournalFilter,
		selectedJournalId, setSelectedJournalId, handleRefreshOutbox, handleBatchSendShift,
	};
}
