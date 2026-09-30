/**
 * useVisiographArchive.ts
 *
 * Custom hook managing patient radiograph scan history:
 * - Fetching scan archive list (/api/xray/scans?patientId=...)
 * - Fetching full high-resolution scan (/api/xray/scans/:id)
 * - Deleting scan from archive with optimistic update and rollback (/api/xray/scans/:id)
 */

import { useCallback, useEffect, useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText";
import { usePatientStore } from "../../store/patientStore";
import { logger } from "../../utils/logger";
import { showToast } from "../GlobalToast";
import type { XrayScan } from "./VisiographScanHelpers";

export interface UseVisiographArchiveOptions {
	patientId?: string | undefined;
	effectivePatientId?: string | null | undefined;
	toothCode?: string | undefined;
	denteClinicalReadHeaders: (extra?: Record<string, string>) => Record<string, string>;
	denteClinicalMutationHeaders: (extra?: Record<string, string>) => Record<string, string>;
	onScanSelected: (scan: XrayScan) => void;
	onScanDeleted: (deletedScanId: string) => void;
	onEmptyFallback?: () => void;
}

export function useVisiographArchive({
	patientId,
	effectivePatientId,
	toothCode,
	denteClinicalReadHeaders,
	denteClinicalMutationHeaders,
	onScanSelected,
	onScanDeleted,
	onEmptyFallback,
}: UseVisiographArchiveOptions) {
	const [scanHistory, setScanHistory] = useState<XrayScan[]>([]);
	const [isLoadingHistory, setIsLoadingHistory] = useState(false);
	const [historyFailure, setHistoryFailure] = useState<{ status: number | null } | null>(null);
	const [deletingScanId, setDeletingScanId] = useState<string | null>(null);
	const [deleteFailure, setDeleteFailure] = useState<string | null>(null);
	const [openFailure, setOpenFailure] = useState<string | null>(null);

	const loadHistoryScan = useCallback(
		async (scan: XrayScan) => {
			setOpenFailure(null);
			setDeleteFailure(null);

			if (
				scan.id.startsWith("sample_") ||
				scan.id.startsWith("scan_default_") ||
				scan.imageDataUri
			) {
				onScanSelected(scan);
				return;
			}

			try {
				const res = await fetch(`/api/xray/scans/${encodeURIComponent(scan.id)}`, {
					headers: denteClinicalReadHeaders(),
				});
				if (!res.ok) {
					logger.error(`[useVisiographArchive] полный снимок не открыт, ${res.status}`);
					setOpenFailure(
						res.status === 404
							? "Снимок не найден в карте. Обновите архив."
							: res.status === 403
								? "Нет доступа к полному снимку."
								: `Полный снимок не загружен (ответ ${res.status}).`,
					);
					return;
				}
				const full: XrayScan = await res.json();
				onScanSelected(full);
				if (!full.imageDataUri) {
					setOpenFailure("Сервер отдал карточку снимка без изображения.");
				}
			} catch (err) {
				showToast(
					actionFailureToast("Ошибка выполнения операции", (err as { status?: number })?.status ?? null),
					"error",
				);
				logger.error("[useVisiographArchive] запрос полного снимка не выполнен", err);
				setOpenFailure("Нет связи с сервером — полный снимок не загружен.");
			}
		},
		[denteClinicalReadHeaders, onScanSelected],
	);

	const loadHistory = useCallback(
		async (targetPatientId: string) => {
			setIsLoadingHistory(true);
			setHistoryFailure(null);
			setDeleteFailure(null);
			setOpenFailure(null);
			setScanHistory([]);
			let status: number | null = null;
			const isStale = () =>
				(patientId ?? usePatientStore.getState().selectedPatientId) !== targetPatientId;
			try {
				const res = await fetch(`/api/xray/scans?patientId=${targetPatientId}`, {
					headers: denteClinicalReadHeaders(),
				});
				status = res.status;
				if (isStale()) return;
				if (!res.ok) {
					setHistoryFailure({ status });
					if (onEmptyFallback) onEmptyFallback();
					return;
				}
				const data = (await res.json()) as unknown;
				if (isStale() || !Array.isArray(data)) {
					setHistoryFailure({ status });
					return;
				}
				const doneScans = (data as XrayScan[]).filter((s) => s.status === "done");
				setScanHistory(doneScans);

				if (doneScans.length > 0) {
					const targetScan = toothCode
						? (doneScans.find((s) => s.toothCode === toothCode) ?? doneScans[0])
						: doneScans[0];
					if (targetScan) {
						void loadHistoryScan(targetScan);
					}
				} else if (onEmptyFallback) {
					onEmptyFallback();
				}
			} catch (err) {
				showToast(
					actionFailureToast("Ошибка выполнения операции", (err as { status?: number })?.status ?? null),
					"error",
				);
				logger.error("[useVisiographArchive] Архив снимков не прочитан:", err);
				if (isStale()) return;
				setHistoryFailure({ status });
				if (onEmptyFallback) onEmptyFallback();
			} finally {
				if (!isStale()) setIsLoadingHistory(false);
			}
		},
		[patientId, toothCode, denteClinicalReadHeaders, loadHistoryScan, onEmptyFallback],
	);

	useEffect(() => {
		if (!effectivePatientId) {
			setScanHistory([]);
			setHistoryFailure(null);
			setDeleteFailure(null);
			setOpenFailure(null);
			setDeletingScanId(null);
			setIsLoadingHistory(false);
			return;
		}
		loadHistory(effectivePatientId);
	}, [effectivePatientId, loadHistory]);

	const deleteScan = useCallback(
		async (scan: XrayScan) => {
			if (deletingScanId) return;
			setDeletingScanId(scan.id);
			setDeleteFailure(null);
			try {
				const res = await fetch(`/api/xray/scans/${encodeURIComponent(scan.id)}`, {
					method: "DELETE",
					headers: denteClinicalMutationHeaders(),
				});
				if (!res.ok) {
					let message = `Снимок не удалён (ответ ${res.status}).`;
					try {
						const body = await res.json();
						if (body?.message) message = body.message.trim();
						else if (body?.error) message = body.error.trim();
					} catch {}
					setDeleteFailure(message);
					return;
				}
				setScanHistory((prev) => prev.filter((s) => s.id !== scan.id));
				onScanDeleted(scan.id);
			} catch (err) {
				showToast(
					actionFailureToast("Ошибка выполнения операции", (err as { status?: number })?.status ?? null),
					"error",
				);
				logger.error("[useVisiographArchive] scan delete failed", err);
				setDeleteFailure("Снимок не удалён: нет связи с сервером.");
			} finally {
				setDeletingScanId(null);
			}
		},
		[deletingScanId, denteClinicalMutationHeaders, onScanDeleted],
	);

	return {
		scanHistory,
		setScanHistory,
		isLoadingHistory,
		historyFailure,
		deletingScanId,
		deleteFailure,
		openFailure,
		setOpenFailure,
		setDeleteFailure,
		loadHistory,
		loadHistoryScan,
		deleteScan,
	};
}
