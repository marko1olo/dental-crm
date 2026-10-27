/**
 * @file StatusBlockOfflineSync.tsx
 * @description Database telemetry and offline queue synchronization block (Mandate 8b <= 120 lines).
 */

import React from "react";
import { Database, HardDrive, QrCode, RefreshCw, Wifi, WifiOff } from "lucide-react";
import type { StatusBlockOfflineSyncProps } from "./headerStatusTypes.js";

export function StatusBlockOfflineSync({ status, onClose }: StatusBlockOfflineSyncProps) {
	const { isOnline, syncLatencyMs, isSyncing, pendingMutationCount, formattedLastSync, handleManualSync } = status;

	const handleOpenQr = () => {
		onClose();
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("dente:open-lan-qr"));
		}
	};

	return (
		<div className="dnt-cc-section">
			<div className="dnt-cc-section-header">
				<span className="dnt-cc-section-title">
					<Database size={13} className="text-[var(--teal)]" />
					<span>База данных и Синхронизация</span>
				</span>
				<span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
					{isOnline ? (
						<>
							<Wifi size={11} /> {syncLatencyMs !== null ? `${syncLatencyMs} ms` : "Сеть OK"}
						</>
					) : (
						<>
							<WifiOff size={11} className="text-rose-500" /> Офлайн
						</>
					)}
				</span>
			</div>

			<div className="text-[11px] text-[var(--muted,#475569)] space-y-1 mb-2.5">
				<div className="flex items-center justify-between">
					<span>PostgreSQL 18.4 (127.0.0.1:5432):</span>
					<strong className="text-[var(--ink,#0f172a)] font-mono">Подключено</strong>
				</div>
				<div className="flex items-center justify-between">
					<span>IndexedDB Offline Outbox:</span>
					<strong className={pendingMutationCount > 0 ? "text-amber-500 font-mono" : "text-emerald-600 dark:text-emerald-400"}>
						{pendingMutationCount > 0 ? `${pendingMutationCount} в очереди` : "0 в очереди"}
					</strong>
				</div>
				<div className="flex items-center justify-between" data-testid="cc-l2-offline-buffer-row">
					<span className="flex items-center gap-1.5">
						<HardDrive size={11} className="text-[var(--teal)] shrink-0" />
						<span>Офлайн-буфер L2 (IndexedDB):</span>
					</span>
					<strong className="text-teal-600 dark:text-teal-400 font-mono text-[10px] flex items-center gap-1">
						<span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
						Офлайн-буфер сохранен локально
					</strong>
				</div>
				<div className="flex items-center justify-between">
					<span>Последняя синхронизация:</span>
					<strong className="text-[var(--ink,#0f172a)] font-mono">{formattedLastSync}</strong>
				</div>
			</div>

			<button
				type="button"
				onClick={() => void handleManualSync()}
				className="dnt-cc-btn dnt-cc-btn--primary w-full min-h-[44px]"
			>
				<RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
				<span>{isSyncing ? "Синхронизация..." : "Синхронизировать сейчас"}</span>
			</button>

			<button
				type="button"
				onClick={handleOpenQr}
				className="dnt-cc-btn dnt-cc-btn--secondary w-full min-h-[44px] mt-2 flex items-center justify-center gap-2"
				data-testid="cc-lan-qr-connect-btn"
				title="Подключить телефон или планшет врача у кресла по Wi-Fi"
			>
				<QrCode size={14} className="text-[var(--teal)] shrink-0" />
				<span>Подключить телефон у кресла (LAN QR)</span>
			</button>
		</div>
	);
}
