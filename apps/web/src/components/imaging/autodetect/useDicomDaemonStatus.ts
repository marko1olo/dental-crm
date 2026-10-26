/**
 * useDicomDaemonStatus.ts — Хук опроса статуса фонового демона автодетекта КТ
 * Mandate 8b: строго <= 120 строк.
 */

import { useState, useEffect, useCallback } from "react";

export interface DicomDaemonStatusPayload {
	isRunning: boolean;
	enabled: boolean;
	watchPaths: string[];
	activeRoots: string[];
	lastScanAt: string | null;
	lastScanDurationMs: number;
	totalDiscoveredFolders: number;
	autoBoundCount: number;
	pendingReviewCount: number;
	unassignedCount: number;
}

export function useDicomDaemonStatus() {
	const [status, setStatus] = useState<DicomDaemonStatusPayload | null>(null);
	const [pendingCount, setPendingCount] = useState<number>(0);
	const [isLoading, setIsLoading] = useState<boolean>(false);

	const fetchStatus = useCallback(async () => {
		try {
			setIsLoading(true);
			const [statusRes, pendingRes] = await Promise.all([
				fetch("/api/imaging/daemon/status"),
				fetch("/api/imaging/daemon/pending"),
			]);

			if (statusRes.ok) {
				const statusData = await statusRes.json();
				if (statusData.success && statusData.status) setStatus(statusData.status);
			}

			if (pendingRes.ok) {
				const pendingData = await pendingRes.json();
				if (pendingData.success && typeof pendingData.count === "number") {
					setPendingCount(pendingData.count);
				}
			}
		} catch {
			// Silent fallback for offline / mock mode
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void fetchStatus();
		const interval = setInterval(() => { void fetchStatus(); }, 30000);
		return () => clearInterval(interval);
	}, [fetchStatus]);

	return { status, pendingCount, isLoading, fetchStatus };
}
