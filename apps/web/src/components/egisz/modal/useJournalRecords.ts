/**
 * useJournalRecords.ts — Sub-hook managing REMD Journal records and persistence.
 * Mandate 8b compliant (<= 120 lines). Mandate 8f Real Persistence.
 */

import { useCallback, useEffect, useState } from "react";
import { generateUuidV7 } from "@dental/shared";
import { showToast } from "../../GlobalToast";
import { denteClinicalMutationHeaders } from "../../../lib/denteRequestHeaders";
import { clientLogger } from "../../../services/logging/clientLogger";
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
			.catch((err) => {
				clientLogger.warn("[useJournalRecords] Ошибка загрузки журнала РЭМД:", err);
				if (!isMounted) return;
				setIsLoadingJournal(false);
				showToast("Не удалось загрузить журнал РЭМД с сервера", "error");
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
		} catch (err) {
			clientLogger.warn("[useJournalRecords] Ошибка синхронизации журнала РЭМД:", err);
			showToast("Ошибка синхронизации журнала с сервером", "error");
		} finally {
			setIsLoadingJournal(false);
		}
	}, [clinic]);

	const handleBatchSendShift = useCallback(async (setIsSending: (v: boolean) => void) => {
		setIsSending(true);
		try {
			const res = await fetch("/api/egisz/outbox/dispatch", {
				method: "POST",
				headers: denteClinicalMutationHeaders({
					"Content-Type": "application/json",
					"Idempotency-Key": generateUuidV7(),
				}),
			});
			if (!res.ok) {
				const errJson = (await res.json().catch(() => null)) as { message?: string } | null;
				throw new Error(errJson?.message || `Ошибка сервера (${res.status})`);
			}
			const outboxDocs = await fetchOutboxRecordsFromBackend(clinic);
			setRecords(outboxDocs || []);
			showToast("Пакетная отправка очереди ЕГИСЗ запущена на сервере", "success");
		} catch (err) {
			showToast(`Ошибка отправки очереди ЕГИСЗ: ${err instanceof Error ? err.message : String(err)}`, "error");
		} finally {
			setIsSending(false);
		}
	}, [clinic]);

	return {
		records, setRecords, isLoadingJournal, journalFilter, setJournalFilter,
		selectedJournalId, setSelectedJournalId, handleRefreshOutbox, handleBatchSendShift,
	};
}
