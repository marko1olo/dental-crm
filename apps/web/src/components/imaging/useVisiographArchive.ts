/**
 * useVisiographArchive.ts — Хук управления архивом снимков визиографа пациента
 * Mandate 8b: строго <= 120 строк.
 */

import { useCallback, useEffect, useState } from "react";
import { actionFailureToast } from "../../lib/panelStateText.js";
import { usePatientStore } from "../../store/patientStore.js";
import { logger } from "../../utils/logger.js";
import { showToast } from "../GlobalToast.js";
import type { XrayScan } from "./VisiographScanHelpers.js";
import { fetchFullXrayScan, deleteXrayScanApi } from "./archive/visiographArchiveApi.js";

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
	patientId, effectivePatientId, toothCode, denteClinicalReadHeaders,
	denteClinicalMutationHeaders, onScanSelected, onScanDeleted, onEmptyFallback,
}: UseVisiographArchiveOptions) {
	const [scanHistory, setScanHistory] = useState<XrayScan[]>([]);
	const [isLoadingHistory, setIsLoadingHistory] = useState(false);
	const [historyFailure, setHistoryFailure] = useState<{ status: number | null } | null>(null);
	const [deletingScanId, setDeletingScanId] = useState<string | null>(null);
	const [deleteFailure, setDeleteFailure] = useState<string | null>(null);
	const [openFailure, setOpenFailure] = useState<string | null>(null);

	const loadHistoryScan = useCallback(async (scan: XrayScan) => {
		setOpenFailure(null);
		setDeleteFailure(null);
		if (scan.id.startsWith("sample_") || scan.id.startsWith("scan_default_") || scan.imageDataUri) {
			onScanSelected(scan);
			return;
		}
		const { data, error } = await fetchFullXrayScan(scan.id, denteClinicalReadHeaders());
		if (data) onScanSelected(data);
		if (error) setOpenFailure(error);
	}, [denteClinicalReadHeaders, onScanSelected]);

	const loadHistory = useCallback(async (targetPatientId: string) => {
		setIsLoadingHistory(true);
		setHistoryFailure(null);
		setDeleteFailure(null);
		setOpenFailure(null);
		setScanHistory([]);
		let status: number | null = null;
		const isStale = () => (patientId ?? usePatientStore.getState().selectedPatientId) !== targetPatientId;
		try {
			const res = await fetch(`/api/xray/scans?patientId=${targetPatientId}`, { headers: denteClinicalReadHeaders() });
			status = res.status;
			if (isStale()) return;
			if (!res.ok) { setHistoryFailure({ status }); onEmptyFallback?.(); return; }
			const data = (await res.json()) as unknown;
			if (isStale() || !Array.isArray(data)) { setHistoryFailure({ status }); return; }
			const doneScans = (data as XrayScan[]).filter((s) => s.status === "done");
			setScanHistory(doneScans);
			if (doneScans.length > 0) {
				const target = toothCode ? (doneScans.find((s) => s.toothCode === toothCode) ?? doneScans[0]) : doneScans[0];
				if (target) void loadHistoryScan(target);
			} else { onEmptyFallback?.(); }
		} catch (err) {
			showToast(actionFailureToast("Ошибка выполнения операции", (err as { status?: number })?.status ?? null), "error");
			logger.error("[useVisiographArchive] Архив снимков не прочитан:", err);
			if (!isStale()) { setHistoryFailure({ status }); onEmptyFallback?.(); }
		} finally {
			if (!isStale()) setIsLoadingHistory(false);
		}
	}, [patientId, toothCode, denteClinicalReadHeaders, loadHistoryScan, onEmptyFallback]);

	useEffect(() => {
		if (!effectivePatientId) {
			setScanHistory([]); setHistoryFailure(null); setDeleteFailure(null);
			setOpenFailure(null); setDeletingScanId(null); setIsLoadingHistory(false);
			return;
		}
		loadHistory(effectivePatientId);
	}, [effectivePatientId, loadHistory]);

	const deleteScan = useCallback(async (scan: XrayScan) => {
		if (deletingScanId) return;
		setDeletingScanId(scan.id);
		setDeleteFailure(null);
		const { success, error } = await deleteXrayScanApi(scan.id, denteClinicalMutationHeaders());
		if (success) {
			setScanHistory((prev) => prev.filter((s) => s.id !== scan.id));
			onScanDeleted(scan.id);
		} else if (error) {
			setDeleteFailure(error);
		}
		setDeletingScanId(null);
	}, [deletingScanId, denteClinicalMutationHeaders, onScanDeleted]);

	return {
		scanHistory, setScanHistory, isLoadingHistory, historyFailure,
		deletingScanId, deleteFailure, openFailure, setOpenFailure,
		setDeleteFailure, loadHistory, loadHistoryScan, deleteScan,
	};
}
