/**
 * @file useClinicSystemStatus.ts
 * @description Hook managing network telemetry, offline store, and cash shift (Mandate 8b <= 120 lines).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { globalCircuitBreaker } from "../../../lib/resilience/apiClientResilience.js";
import { useOfflineStore } from "../../../store/offlineStore.js";
import { useTelephonyStore } from "../../../store/telephonyStore.js";
import { useL2StorageStatus } from "../../../services/storage/clinicalIndexedDbL2.js";
import { showToast } from "../../GlobalToast.js";
import { executeCloseShiftDbTransaction, executeOpenShiftDbTransaction } from "../../shift/cashShiftService.js";
import type { AgentTelephonyState, ClinicSystemStatus } from "./headerStatusTypes.js";

const SHIFT_STORAGE_KEY = "dente_active_shift";
const HEARTBEAT_INTERVAL_MS = 15_000;

export function useClinicSystemStatus(): ClinicSystemStatus {
	const [isBrowserOnline, setIsBrowserOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
	const [isServerReachable, setIsServerReachable] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
	const [isReconnecting, setIsReconnecting] = useState(false);
	const [syncLatencyMs, setSyncLatencyMs] = useState<number | null>(null);
	const [isLocalSyncing, setIsLocalSyncing] = useState(false);
	const [lastSyncTime, setLastSyncTime] = useState<Date>(() => new Date());
	const [shiftNumber, setShiftNumber] = useState(1);
	const [isShiftOpen, setIsShiftOpen] = useState(false);
	const [shiftOpenedAtMs, setShiftOpenedAtMs] = useState<number | null>(null);
	const [shiftDurationSeconds, setShiftDurationSeconds] = useState(0);

	const isStoreSyncing = useOfflineStore((s) => s.isSyncing);
	const pendingMutationCount = useOfflineStore((s) => s.pendingMutationCount);
	const storeLastSyncAt = useOfflineStore((s) => s.lastSyncAt);
	const syncOutbox = useOfflineStore((s) => s.syncOutbox);
	const refreshQueue = useOfflineStore((s) => s.refreshQueue);
	const l2Status = useL2StorageStatus();
	const tel = useTelephonyStore();

	const measureLatency = useCallback(async () => {
		if (typeof navigator !== "undefined" && navigator.onLine === false) {
			setIsBrowserOnline(false);
			setIsServerReachable(false);
			setIsReconnecting(false);
			setSyncLatencyMs(null);
			return;
		}
		const start = performance.now();
		try {
			const res = await fetch("/api/health", { cache: "no-store" });
			if (res.ok) {
				setSyncLatencyMs(Math.max(1, Math.round(performance.now() - start)));
				setIsServerReachable(true);
				setIsReconnecting(false);
				return;
			}
			setIsServerReachable(false);
			setIsReconnecting(true);
		} catch {
			setSyncLatencyMs(null);
			setIsServerReachable(false);
			setIsReconnecting(typeof navigator === "undefined" || navigator.onLine);
		}
	}, []);

	useEffect(() => {
		void refreshQueue();
		void measureLatency();
		const heartbeatTimer = setInterval(() => {
			void measureLatency();
		}, HEARTBEAT_INTERVAL_MS);
		const unsubscribeBreaker = globalCircuitBreaker.subscribe((cb) => {
			if (cb.state === "half-open") {
				setIsReconnecting(true);
			} else if (cb.state === "open" || cb.state === "offline-cache") {
				setIsServerReachable(false);
				setIsReconnecting(true);
			} else if (cb.state === "closed" && cb.lastSuccessTime) {
				setIsServerReachable(true);
				setIsReconnecting(false);
			}
		});
		try {
			const raw = localStorage.getItem(SHIFT_STORAGE_KEY);
			const parsed = raw ? JSON.parse(raw) : null;
			if (parsed?.isOpen && parsed.openedAtMs) {
				setIsShiftOpen(true); setShiftNumber(parsed.shiftNumber || 1); setShiftOpenedAtMs(parsed.openedAtMs);
			}
		} catch { /* storage fallback */ }
		return () => {
			clearInterval(heartbeatTimer);
			unsubscribeBreaker();
		};
	}, [refreshQueue, measureLatency]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		const onOnline = () => {
			setIsBrowserOnline(true);
			setIsReconnecting(true);
			void measureLatency();
			showToast("Связь с сервером активна", "success");
		};
		const onOffline = () => {
			setIsBrowserOnline(false);
			setIsServerReachable(false);
			setIsReconnecting(false);
			setSyncLatencyMs(null);
			showToast("Офлайн режим. Данные сохраняются", "warning");
		};
		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);
		return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", onOffline); };
	}, [measureLatency]);

	useEffect(() => {
		if (!isShiftOpen || !shiftOpenedAtMs) { setShiftDurationSeconds(0); return; }
		const update = () => setShiftDurationSeconds(Math.max(0, Math.floor((Date.now() - shiftOpenedAtMs) / 1000)));
		update();
		const timer = setInterval(update, 1000);
		return () => clearInterval(timer);
	}, [isShiftOpen, shiftOpenedAtMs]);

	const formattedShiftTime = useMemo(() => {
		if (!isShiftOpen) return "Закрыта";
		const hrs = Math.floor(shiftDurationSeconds / 3600);
		const mins = Math.floor((shiftDurationSeconds % 3600) / 60);
		return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
	}, [isShiftOpen, shiftDurationSeconds]);

	const formattedLastSync = useMemo(() => {
		const targetDate = storeLastSyncAt ? new Date(storeLastSyncAt) : lastSyncTime;
		return targetDate.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
	}, [storeLastSyncAt, lastSyncTime]);

	const handleManualSync = useCallback(async () => {
		setIsLocalSyncing(true);
		await measureLatency();
		try {
			const syncResult = await syncOutbox();
			setLastSyncTime(new Date());
			showToast(`Синхронизировано: ${syncResult.syncedCount} мутаций`, "success");
		} catch { showToast("Ошибка синхронизации", "error"); }
		finally { setIsLocalSyncing(false); }
	}, [measureLatency, syncOutbox]);

	const handleToggleShift = useCallback(async () => {
		if (isShiftOpen) {
			await executeCloseShiftDbTransaction({ shiftNumber });
			setIsShiftOpen(false); setShiftOpenedAtMs(null);
			localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify({ isOpen: false }));
			showToast(`Смена №${shiftNumber} закрыта`, "success");
		} else {
			await executeOpenShiftDbTransaction({});
			const nextNum = shiftNumber + 1;
			const now = Date.now();
			setShiftNumber(nextNum); setIsShiftOpen(true); setShiftOpenedAtMs(now);
			localStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify({ isOpen: true, shiftNumber: nextNum, openedAtMs: now }));
			showToast(`Смена №${nextNum} открыта`, "success");
		}
	}, [isShiftOpen, shiftNumber]);

	const isOnline = isBrowserOnline && isServerReachable;
	const connectionLabel = !isBrowserOnline
		? "Офлайн"
		: isReconnecting
			? "Повторное подключение..."
			: isOnline
				? "Клиника онлайн"
				: "Офлайн-режим";
	const agentStateLabel = tel.agentState === "online" ? "Онлайн" : tel.agentState === "dnd" ? "Занят" : tel.agentState === "pause" ? "Пауза" : "Офлайн";

	return {
		isOnline, isReconnecting, connectionLabel, syncLatencyMs, isSyncing: isLocalSyncing || isStoreSyncing, lastSyncTime,
		formattedLastSync, pendingMutationCount, l2PatientSnapshotsCount: l2Status.patientSnapshotsCount,
		isShiftOpen, shiftNumber, shiftDurationSeconds, formattedShiftTime, activeCall: tel.activeCall,
		agentState: tel.agentState as AgentTelephonyState, agentStateLabel, activeLineId: tel.activeLineId, isMuted: tel.isMuted,
		handleManualSync, handleToggleShift, setAgentState: tel.setAgentState, switchLine: tel.switchLine, toggleMute: tel.toggleMute,
	};
}
