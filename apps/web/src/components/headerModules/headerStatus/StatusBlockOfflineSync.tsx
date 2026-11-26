/**
 * @file StatusBlockOfflineSync.tsx
 * @description Database telemetry and offline queue synchronization block (Mandate 8b <= 120 lines).
 */

import React from "react";
import { Database, HardDrive, QrCode, RefreshCw, Wifi, WifiOff } from "lucide-react";
import type { StatusBlockOfflineSyncProps } from "./headerStatusTypes.js";

export function StatusBlockOfflineSync({ status, onClose }: StatusBlockOfflineSyncProps) {
	const {
		isOnline,
		isReconnecting,
		syncLatencyMs,
		isSyncing,
		pendingMutationCount,
		l2PatientSnapshotsCount,
		formattedLastSync,
		handleManualSync,
	} = status;

	const handleOpenQr = () => {
		onClose();
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente:open-lan-qr"));
		}
	};

	const serverStateText = isOnline
		? syncLatencyMs !== null
			? `Подключено (${syncLatencyMs} мс)`
			: "Подключено"
		: isReconnecting
			? "Повторное подключение..."
			: "Нет связи с сервером";

	return (
		<div className="dnt-cc-section">
			<div className="dnt-cc-section-header">
				<span className="dnt-cc-section-title">
					<Database size={13} className="text-[var(--primary)]" />
					<span>Сервер и синхронизация</span>
				</span>
				<span
					className={`flex items-center gap-1 text-[10px] font-semibold ${
						isOnline
							? "text-[var(--success,var(--primary))]"
							: isReconnecting
								? "text-[var(--warning,#d97706)]"
								: "text-[var(--danger,#ef4444)]"
					}`}
				>
					{isOnline ? (
						<>
							<Wifi size={11} /> {syncLatencyMs !== null ? `${syncLatencyMs} мс` : "В сети"}
						</>
					) : isReconnecting ? (
						<>
							<RefreshCw size={11} className="animate-spin" /> Повторное подключение…
						</>
					) : (
						<>
							<WifiOff size={11} /> Офлайн
						</>
					)}
				</span>
			</div>

			<div className="text-[11px] text-[var(--ink-muted,var(--muted))] space-y-1 mb-2.5">
				<div className="flex items-center justify-between gap-2">
					<span>Сервер клиники (API):</span>
					<strong className="text-[var(--ink)] font-mono tabular-nums text-right">
						{serverStateText}
					</strong>
				</div>
				<div className="flex items-center justify-between gap-2">
					<span>Локальная очередь (IndexedDB):</span>
					<strong
						className={
							pendingMutationCount > 0
								? "text-[var(--warning,#d97706)] font-mono tabular-nums"
								: "text-[var(--success,var(--primary))] font-mono tabular-nums"
						}
					>
						{pendingMutationCount > 0 ? `${pendingMutationCount} в очереди` : "0 в очереди"}
					</strong>
				</div>
				<div className="flex items-center justify-between gap-2" data-testid="cc-l2-offline-buffer-row">
					<span className="flex items-center gap-1.5">
						<HardDrive size={11} className="text-[var(--primary)] shrink-0" />
						<span>Офлайн-буфер (IndexedDB):</span>
					</span>
					<strong className="text-[var(--ink)] font-mono tabular-nums text-[10px] flex items-center gap-1">
						<span
							className={`w-1.5 h-1.5 rounded-full inline-block ${
								l2PatientSnapshotsCount > 0
									? "bg-[var(--primary)]"
									: "bg-[var(--ink-muted,var(--muted))]"
							}`}
						/>
						{l2PatientSnapshotsCount > 0
							? `Сохранено карт: ${l2PatientSnapshotsCount}`
							: "Кэш пуст (0 карт)"}
					</strong>
				</div>
				<div className="flex items-center justify-between gap-2">
					<span>Последняя синхронизация:</span>
					<strong className="text-[var(--ink)] font-mono tabular-nums">{formattedLastSync}</strong>
				</div>
			</div>

			<button
				type="button"
				onClick={() => void handleManualSync()}
				className="w-full h-9 min-h-[44px] sm:min-h-[36px] px-3.5 rounded-lg text-sm font-medium bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-sm inline-flex items-center justify-center gap-2 transition-colors cursor-pointer"
			>
				<RefreshCw size={14} className={isSyncing ? "animate-spin shrink-0" : "shrink-0"} />
				<span>{isSyncing ? "Синхронизация..." : "Синхронизировать сейчас"}</span>
			</button>

			<button
				type="button"
				onClick={handleOpenQr}
				className="w-full h-9 min-h-[44px] sm:min-h-[36px] mt-2 px-3.5 rounded-lg text-sm font-medium bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap cursor-pointer"
				data-testid="cc-lan-qr-connect-btn"
				title="Подключить телефон или планшет врача у кресла по Wi-Fi"
			>
				<QrCode size={14} className="text-[var(--primary)] shrink-0" />
				<span>Подключить по Wi-Fi (QR)</span>
			</button>
		</div>
	);
}
