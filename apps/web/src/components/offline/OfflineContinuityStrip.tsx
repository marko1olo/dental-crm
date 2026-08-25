/**
 * DENTE CRM — Offline Continuity Strip
 *
 * Индикатор состояния мульти-сетевой топологии и ручного сброса очереди мутаций:
 * - 🟢 «В сети (Облако DENTE)»
 * - 🟡 «Локальная сеть клиники (Wi-Fi) • В очереди X операций»
 * - 🔴 «Офлайн-режим • Данные сохранены в памяти • В очереди X операций»
 *
 * Функционал:
 * - Точное отображение сетевого канала (Cloud VPS / Wi-Fi LAN Mesh / Autonomous Offline)
 * - Счетчик накопленных локальных мутаций с русской плюрализацией
 * - Кнопка «Синхронизировать сейчас» с живой индикацией прогресса и анимацией спиннера
 * - Поддержка тем (Light / Dark) и соответствие контрастным медицинским инвариантам
 */

import React, { useCallback, useEffect, useState } from "react";
import {
	AlertCircle,
	CheckCircle2,
	Cloud,
	Database,
	HardDrive,
	Hourglass,
	RefreshCw,
	Trash2,
	Wifi,
	WifiOff,
} from "lucide-react";
import {
	type StorageEstimateInfo,
	type SyncBatchDrainResult,
	formatBytesHuman,
	getStorageEstimate,
	offlineSyncService,
	purgeSyncedDraftsAndOldCache,
} from "../../services/offline";
import { useOfflineStore } from "../../store/offlineStore";
import {
	type ConnectivityMode,
	type NetworkState,
	type RttQuality,
	createNetworkMonitor,
	formatHumanStatusText,
	formatRttLabel,
	getRttQuality,
	pluralizeOperations,
} from "../../utils/networkConnectivity";
import "./OfflineContinuityStrip.css";

export interface OfflineContinuityStripProps {
	className?: string;
	compact?: boolean;
	hideWhenOnlineAndEmpty?: boolean;
	autoCollapseWhenStable?: boolean;
	collapseDelayMs?: number;
	networkState?: NetworkState;
	pendingMutationCount?: number;
	onSyncComplete?: (result: SyncBatchDrainResult) => void;
}

export const AUTO_COLLAPSE_STABLE_DELAY_MS = 5000;

export const OfflineContinuityStrip: React.FC<OfflineContinuityStripProps> = ({
	className = "",
	compact = false,
	hideWhenOnlineAndEmpty = false,
	autoCollapseWhenStable = true,
	collapseDelayMs = AUTO_COLLAPSE_STABLE_DELAY_MS,
	networkState: propNetworkState,
	pendingMutationCount: propPendingCount,
	onSyncComplete,
}) => {
	const storeNetworkState = useOfflineStore((s) => s.networkState);
	const setNetworkState = useOfflineStore((s) => s.setNetworkState);
	const storePendingMutationCount = useOfflineStore((s) => s.pendingMutationCount);
	const refreshQueue = useOfflineStore((s) => s.refreshQueue);

	const networkState = propNetworkState ?? storeNetworkState;
	const pendingMutationCount = propPendingCount ?? storePendingMutationCount;

	const [isDraining, setIsDraining] = useState<boolean>(false);
	const [drainProgress, setDrainProgress] = useState<{
		processed: number;
		total: number;
	} | null>(null);
	const [lastSyncNotice, setLastSyncNotice] = useState<string | null>(null);
	const [syncError, setSyncError] = useState<string | null>(null);
	const [isAutoCollapsed, setIsAutoCollapsed] = useState<boolean>(false);
	const [isUserHovered, setIsUserHovered] = useState<boolean>(false);
	const [storageEstimate, setStorageEstimate] = useState<StorageEstimateInfo | null>(null);
	const [isPurging, setIsPurging] = useState<boolean>(false);
	const [drainElapsedSec, setDrainElapsedSec] = useState<number>(0);

	// Таймер замера длительности активного дренажа
	useEffect(() => {
		let timer: ReturnType<typeof setInterval> | null = null;
		if (isDraining) {
			setDrainElapsedSec(1);
			timer = setInterval(() => {
				setDrainElapsedSec((s) => s + 1);
			}, 1000);
		} else {
			setDrainElapsedSec(0);
		}
		return () => {
			if (timer) clearInterval(timer);
		};
	}, [isDraining]);

	// Опрос квоты дискового хранилища
	const refreshStorage = useCallback(async () => {
		try {
			const est = await getStorageEstimate();
			setStorageEstimate(est);
		} catch {
			// ignore
		}
	}, []);

	useEffect(() => {
		void refreshStorage();
		const interval = setInterval(() => {
			void refreshStorage();
		}, 30000);
		return () => clearInterval(interval);
	}, [refreshStorage]);

	// Ручная очистка синхронизированного кэша при заполненности памяти
	const handlePurgeCache = useCallback(async () => {
		if (isPurging) return;
		setIsPurging(true);
		try {
			const result = await purgeSyncedDraftsAndOldCache();
			await refreshStorage();
			const total = result.purgedDrafts + result.purgedCache;
			setLastSyncNotice(total > 0 ? `Очищено записей: ${total}` : "Кэш чист");
			setTimeout(() => setLastSyncNotice(null), 4000);
		} catch {
			setSyncError("Не удалось очистить кэш");
			setTimeout(() => setSyncError(null), 4000);
		} finally {
			setIsPurging(false);
		}
	}, [isPurging, refreshStorage]);

	// Авто-сворачивание при 5 секундах стабильного соединения
	useEffect(() => {
		const isStable =
			networkState.isOnline &&
			pendingMutationCount === 0 &&
			!isDraining &&
			!syncError &&
			!lastSyncNotice &&
			autoCollapseWhenStable;

		if (!isStable) {
			setIsAutoCollapsed(false);
			return;
		}

		const timer = setTimeout(() => {
			setIsAutoCollapsed(true);
		}, collapseDelayMs);

		return () => {
			clearTimeout(timer);
		};
	}, [
		networkState.isOnline,
		pendingMutationCount,
		isDraining,
		syncError,
		lastSyncNotice,
		autoCollapseWhenStable,
		collapseDelayMs,
	]);

	// Подписка на мониторинг сети
	useEffect(() => {
		const unsubscribe = createNetworkMonitor((state: NetworkState) => {
			setNetworkState(state);
		}, 15000);

		void refreshQueue();

		return () => {
			unsubscribe();
		};
	}, [setNetworkState, refreshQueue]);

	// Подписка на события OfflineSyncService
	useEffect(() => {
		const unsubscribe = offlineSyncService.subscribe((event) => {
			if (event.type === "progress") {
				const data = event.data as { processed: number; total: number };
				setDrainProgress(data);
			} else if (event.type === "complete") {
				const result = event.data as SyncBatchDrainResult;
				setIsDraining(false);
				setDrainProgress(null);
				if (result.appliedCount > 0 || result.duplicateCount > 0 || result.mergedCount > 0) {
					const totalSynced = result.appliedCount + result.duplicateCount + result.mergedCount;
					setLastSyncNotice(`Синхронизировано ${pluralizeOperations(totalSynced)}`);
					setTimeout(() => setLastSyncNotice(null), 4000);
				}
				void refreshQueue();
				void refreshStorage();
				if (onSyncComplete) {
					onSyncComplete(result);
				}
			} else if (event.type === "error") {
				const err = event.data as { error: string };
				setIsDraining(false);
				setDrainProgress(null);
				setSyncError(err.error || "Ошибка синхронизации");
				setTimeout(() => setSyncError(null), 5000);
				void refreshQueue();
			}
		});

		return () => {
			unsubscribe();
		};
	}, [refreshQueue, refreshStorage, onSyncComplete]);

	// Ручной запуск синхронизации
	const handleManualSync = useCallback(async () => {
		if (isDraining || pendingMutationCount === 0 || !networkState.isOnline) {
			return;
		}

		setIsDraining(true);
		setSyncError(null);
		setDrainProgress({ processed: 0, total: pendingMutationCount });

		try {
			const result = await offlineSyncService.drainOutbox();
			void refreshQueue();
			void refreshStorage();
			if (result.failedCount > 0 && result.appliedCount === 0) {
				setSyncError("Не удалось доставить мутации на сервер");
				setTimeout(() => setSyncError(null), 5000);
			}
		} catch (err) {
			setSyncError(err instanceof Error ? err.message : "Сбой соединения");
			setTimeout(() => setSyncError(null), 5000);
		} finally {
			setIsDraining(false);
			setDrainProgress(null);
		}
	}, [isDraining, pendingMutationCount, networkState.isOnline, refreshQueue, refreshStorage]);

	const mode: ConnectivityMode = networkState.mode;

	// Если запрошено скрытие в полностью чистом онлайн-режиме
	if (hideWhenOnlineAndEmpty && mode === "cloud_online" && pendingMutationCount === 0 && !isDraining && !lastSyncNotice) {
		return null;
	}

	// Вычисление понятного текста и бейджа без сложных технических терминов
	let modeClass = "offline-continuity-strip--cloud";
	let BeaconIcon = Cloud;

	if (mode === "lan_online") {
		modeClass = "offline-continuity-strip--lan";
		BeaconIcon = Wifi;
	} else if (mode === "offline") {
		modeClass = "offline-continuity-strip--offline";
		BeaconIcon = WifiOff;
	}

	const primaryLabel = formatHumanStatusText(mode, networkState.rttMs);

	const isSyncPossible = networkState.isOnline && pendingMutationCount > 0;
	const progressPercent = drainProgress && drainProgress.total > 0
		? Math.min(100, Math.round((drainProgress.processed / drainProgress.total) * 100))
		: isDraining
			? 50
			: 0;

	const rttQuality: RttQuality = getRttQuality(networkState.rttMs, networkState.isOnline);
	const rttDisplayLabel = formatRttLabel(mode, networkState.rttMs);

	const isEffectiveCollapsed = (compact || isAutoCollapsed) && !isUserHovered;
	const collapseClass = isEffectiveCollapsed ? "offline-continuity-strip--collapsed" : "offline-continuity-strip--expanded";

	return (
		<aside
			aria-label="Индикатор сетевого подключения и очереди синхронизации"
			className={`offline-continuity-strip ${modeClass} ${collapseClass} ${className}`.trim()}
			onMouseEnter={() => setIsUserHovered(true)}
			onMouseLeave={() => setIsUserHovered(false)}
			onClick={() => {
				if (isAutoCollapsed) {
					setIsUserHovered(true);
				}
			}}
			tabIndex={0}
			onFocus={() => setIsUserHovered(true)}
			onBlur={() => setIsUserHovered(false)}
		>
			<div className="offline-continuity-strip__left">
				<div className="offline-continuity-strip__beacon" aria-hidden="true">
					<BeaconIcon size={16} />
				</div>

				<div className="offline-continuity-strip__status-text">
					<span className="offline-continuity-strip__primary-label">
						{primaryLabel}
					</span>

					{pendingMutationCount > 0 && (
						<span className="offline-continuity-strip__queue-pill">
							<Database size={11} aria-hidden="true" />
							{`В очереди ${pluralizeOperations(pendingMutationCount)}`}
						</span>
					)}

					<span
						className={`offline-continuity-strip__rtt-pill offline-continuity-strip__rtt-pill--${rttQuality}`}
						title={`Задержка ответа: ${networkState.rttMs !== null ? `${networkState.rttMs} мс` : "Офлайн"}`}
					>
						<span className="offline-continuity-strip__rtt-dot" aria-hidden="true" />
						{rttDisplayLabel}
					</span>

					{storageEstimate && (
						<span
							className={`offline-continuity-strip__storage-pill ${
								storageEstimate.isWarning ? "offline-continuity-strip__storage-pill--warning" : ""
							}`}
							title={`Память браузера: занято ${storageEstimate.usageFormatted} из ${formatBytesHuman(storageEstimate.quotaBytes)}`}
						>
							<HardDrive size={11} aria-hidden="true" />
							<span>{`Память: занято ${storageEstimate.percentUsed}%, свободно ${storageEstimate.freeFormatted}`}</span>
						</span>
					)}

					{storageEstimate?.isWarning && (
						<button
							type="button"
							onClick={handlePurgeCache}
							disabled={isPurging}
							className="offline-continuity-strip__purge-btn"
							title="Память заполнена более чем на 80%. Нажмите для 1-клик очистки синхронизированных данных"
						>
							<Trash2 size={11} aria-hidden="true" />
							<span>{isPurging ? "Очистка..." : "Очистить кэш"}</span>
						</button>
					)}

					{isDraining && drainElapsedSec >= 3 && (
						<span
							className="offline-continuity-strip__slow-drain-pill"
							title="Сетевой запрос выполняется в фоновом режиме, интерфейс не блокируется"
						>
							<Hourglass size={12} className="offline-continuity-strip__slow-spin" aria-hidden="true" />
							<span>{`⏳ Идет сохранение... (${drainElapsedSec} сек) — продолжайте работу, система завершит отправку в фоне`}</span>
						</span>
					)}

					{lastSyncNotice && (
						<span className="offline-continuity-strip__queue-pill" style={{ color: "#059669" }}>
							<CheckCircle2 size={12} aria-hidden="true" />
							{lastSyncNotice}
						</span>
					)}

					{syncError && (
						<span className="offline-continuity-strip__queue-pill" style={{ color: "#dc2626" }}>
							<AlertCircle size={12} aria-hidden="true" />
							{syncError}
						</span>
					)}
				</div>
			</div>

			<div className="offline-continuity-strip__right">
				{isDraining ? (
					<button
						type="button"
						className="offline-sync-btn offline-sync-btn--disabled"
						disabled
						aria-busy="true"
					>
						<RefreshCw size={14} className="offline-sync-btn__spinner" aria-hidden="true" />
						<span>
							{drainProgress
								? `Синхронизация ${drainProgress.processed}/${drainProgress.total}...`
								: "Синхронизация..."}
						</span>
					</button>
				) : (
					<button
						type="button"
						onClick={handleManualSync}
						disabled={!isSyncPossible}
						className={`offline-sync-btn ${
							isSyncPossible
								? "offline-sync-btn--active"
								: "offline-sync-btn--disabled"
						}`}
						title={
							!networkState.isOnline
								? "Синхронизация недоступна в офлайн-режиме"
								: pendingMutationCount === 0
									? "Все данные синхронизированы с сервером"
									: "Отправить накопленные изменения на сервер сейчас"
						}
					>
						<RefreshCw size={14} aria-hidden="true" />
						<span>Синхронизировать сейчас</span>
					</button>
				)}
			</div>

			{isDraining && (
				<div
					className="offline-continuity-strip__progress-bar"
					style={{ width: `${progressPercent}%` }}
					role="progressbar"
					aria-valuenow={progressPercent}
					aria-valuemin={0}
					aria-valuemax={100}
				/>
			)}
		</aside>
	);
};

export default OfflineContinuityStrip;
