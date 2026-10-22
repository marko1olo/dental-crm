import React from "react";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import type { OfflineStore } from "../../../store/offlineStore.js";

interface DiagnosticDrawerOfflineTabProps {
	offlineStore: OfflineStore;
}

export const DiagnosticDrawerOfflineTab: React.FC<DiagnosticDrawerOfflineTabProps> = ({ offlineStore }) => {
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			<div className="dente-diagnostic-grid">
				<div className="dente-diagnostic-metric-card">
					<span className="dente-diagnostic-metric-label">Статус сети</span>
					<div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
						{offlineStore.networkState.isOnline ? (
							<>
								<Wifi size={18} color="var(--ok-fg)" />
								<span className="dente-diagnostic-metric-value" style={{ color: "var(--ok-fg)" }}>Online</span>
							</>
						) : (
							<>
								<WifiOff size={18} color="var(--bad-fg)" />
								<span className="dente-diagnostic-metric-value" style={{ color: "var(--bad-fg)" }}>Offline</span>
							</>
						)}
					</div>
				</div>

				<div className="dente-diagnostic-metric-card">
					<span className="dente-diagnostic-metric-label">Очередь Outbox</span>
					<span className="dente-diagnostic-metric-value">{offlineStore.pendingMutationCount}</span>
				</div>

				<div className="dente-diagnostic-metric-card">
					<span className="dente-diagnostic-metric-label">Сбои синхронизации</span>
					<span
						className="dente-diagnostic-metric-value"
						style={{ color: offlineStore.metrics.failedCount > 0 ? "var(--bad-fg)" : "inherit" }}
					>
						{offlineStore.metrics.failedCount}
					</span>
				</div>

				<div className="dente-diagnostic-metric-card">
					<span className="dente-diagnostic-metric-label">Локальные черновики</span>
					<span className="dente-diagnostic-metric-value">{offlineStore.metrics.totalDrafts}</span>
				</div>
			</div>

			<div style={{ display: "flex", gap: 10 }}>
				<button
					type="button"
					className="dente-diagnostic-action-btn dente-diagnostic-primary-btn"
					aria-busy={offlineStore.isSyncing}
					onClick={() => { if (!offlineStore.isSyncing) offlineStore.syncOutbox(); }}
				>
					<RefreshCw size={15} className={offlineStore.isSyncing ? "dente-spin" : ""} />
					<span>{offlineStore.isSyncing ? "Синхронизация..." : "Синхронизировать сейчас"}</span>
				</button>
				<button type="button" className="dente-diagnostic-action-btn" onClick={() => offlineStore.refreshQueue()}>
					<RefreshCw size={15} />
					<span>Обновить статус</span>
				</button>
			</div>

			{offlineStore.pendingMutations.length > 0 && (
				<div>
					<h4 style={{ margin: "12px 0 8px", fontSize: 14 }}>Несинхронизированные мутации</h4>
					<div className="dente-diagnostic-list">
						{offlineStore.pendingMutations.map((mut) => (
							<div key={mut.mutationId} className="dente-diagnostic-card">
								<div className="dente-diagnostic-card-header">
									<div className="dente-diagnostic-card-left min-w-0">
										<span className="dente-diagnostic-pill dente-diagnostic-pill-info shrink-0">{mut.action}</span>
										<span className="dente-diagnostic-module truncate min-w-0" title={mut.entityType}>{mut.entityType}</span>
										<span className="dente-diagnostic-time shrink-0">{mut.timestamp.slice(11, 23)}</span>
									</div>
									<span style={{ fontSize: 11, color: "var(--muted, #64748b)" }} className="shrink-0">
										ID: {mut.entityId.slice(0, 12)}…
									</span>
								</div>
								<div className="dente-diagnostic-code-block" style={{ maxHeight: 100 }}>
									{JSON.stringify(mut.payload, null, 2)}
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	);
};
