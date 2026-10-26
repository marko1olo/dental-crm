/**
 * useDicomImportManager.ts — Управление очередью демона и привязкой исследований (Мандат 8b <= 120 строк).
 */

import { useState, useEffect, useCallback } from "react";
import { showToast } from "../../GlobalToast.js";
import type { PendingStudyItem, DicomImportTabType } from "./types";

export function useDicomImportManager(isOpen: boolean, onStudyBound?: () => void) {
	const [activeTab, setActiveTab] = useState<DicomImportTabType>("pending");
	const [studies, setStudies] = useState<PendingStudyItem[]>([]);
	const [daemonStatus, setDaemonStatus] = useState<any>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isScanning, setIsScanning] = useState<boolean>(false);
	const [actionPendingId, setActionPendingId] = useState<string | null>(null);

	const loadData = useCallback(async () => {
		try {
			setIsLoading(true);
			const [studiesRes, statusRes] = await Promise.all([
				fetch("/api/imaging/daemon/pending"),
				fetch("/api/imaging/daemon/status"),
			]);
			if (studiesRes.ok) {
				const sData = await studiesRes.json();
				if (sData.success && Array.isArray(sData.pendingStudies)) {
					setStudies(sData.pendingStudies);
				}
			}
			if (statusRes.ok) {
				const stData = await statusRes.json();
				if (stData.success && stData.status) {
					setDaemonStatus(stData.status);
				}
			}
		} catch {
			showToast("Не удалось загрузить статус демона КТ", "error");
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		if (isOpen) void loadData();
	}, [isOpen, loadData]);

	const handleScanNow = async () => {
		try {
			setIsScanning(true);
			const res = await fetch("/api/imaging/daemon/scan-now", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			if (!res.ok) throw new Error("HTTP error " + res.status);
			const data = await res.json();
			if (data.success) {
				showToast(data.message || "Сканирование завершено", "success");
				await loadData();
			} else {
				showToast(data.message || "Ошибка сканирования", "error");
			}
		} catch {
			showToast("Сетевой сбой при запуске сканирования", "error");
		} finally {
			setIsScanning(false);
		}
	};

	const handleBindPatient = async (studyId: string, patientId: string) => {
		try {
			setActionPendingId(studyId);
			const res = await fetch("/api/imaging/daemon/bind-patient", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ studyId, patientId }),
			});
			if (!res.ok) throw new Error("HTTP error " + res.status);
			const data = await res.json();
			if (data.success) {
				showToast(data.message || "Исследование КТ привязано к пациенту", "success");
				setStudies((prev) => prev.filter((s) => s.id !== studyId));
				onStudyBound?.();
			} else {
				showToast(data.message || "Не удалось привязать КТ", "error");
			}
		} catch {
			showToast("Сбой запроса привязки", "error");
		} finally {
			setActionPendingId(null);
		}
	};

	const handleDismiss = async (studyId: string) => {
		try {
			setActionPendingId(studyId);
			const res = await fetch("/api/imaging/daemon/dismiss", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ studyId }),
			});
			if (!res.ok) throw new Error("HTTP error " + res.status);
			const data = await res.json();
			if (data.success) {
				showToast("Снимок скрыт из очереди", "info");
				setStudies((prev) => prev.filter((s) => s.id !== studyId));
			}
		} catch {
			showToast("Не удалось скрыть снимок", "error");
		} finally {
			setActionPendingId(null);
		}
	};

	return {
		activeTab, setActiveTab, studies, daemonStatus, isLoading, isScanning,
		actionPendingId, handleScanNow, handleBindPatient, handleDismiss,
	};
}
