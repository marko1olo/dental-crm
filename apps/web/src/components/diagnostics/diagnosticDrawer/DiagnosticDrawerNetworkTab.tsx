import React from "react";
import type { NetworkLogEntry } from "@dental/shared";
import { Clock, Check, Copy } from "lucide-react";

interface DiagnosticDrawerNetworkTabProps {
	filteredNetworkLogs: readonly NetworkLogEntry[];
	searchQuery: string;
	expandedLogIds: Set<string>;
	copiedCorrelationId: string | null;
	toggleExpandLog: (id: string) => void;
	handleCopyCorrelationId: (id: string) => void;
}

export const DiagnosticDrawerNetworkTab: React.FC<DiagnosticDrawerNetworkTabProps> = ({
	filteredNetworkLogs,
	searchQuery,
	expandedLogIds,
	copiedCorrelationId,
	toggleExpandLog,
	handleCopyCorrelationId,
}) => {
	if (filteredNetworkLogs.length === 0) {
		return (
			<div className="dente-diagnostic-empty">
				{searchQuery ? "Сетевые запросы по фильтру не найдены" : "Сетевые запросы пока не зафиксированы"}
			</div>
		);
	}

	return (
		<div className="dente-diagnostic-list">
			{filteredNetworkLogs.map((net) => {
				const isExpanded = expandedLogIds.has(net.id);
				const hasDetails = Boolean(net.requestBodyPreview) || Boolean(net.responsePreview) || Boolean(net.error);
				const statusClass =
					net.statusCode && net.statusCode >= 200 && net.statusCode < 300
						? "dente-diagnostic-pill-status-ok"
						: net.statusCode && net.statusCode >= 400 && net.statusCode < 500
							? "dente-diagnostic-pill-status-warn"
							: "dente-diagnostic-pill-status-err";

				return (
					<div
						key={net.id}
						className="dente-diagnostic-card"
						style={{ cursor: hasDetails ? "pointer" : "default" }}
						onClick={() => hasDetails && toggleExpandLog(net.id)}
					>
						<div className="dente-diagnostic-card-header">
							<div className="dente-diagnostic-card-left min-w-0">
								<span className="dente-diagnostic-pill shrink-0" style={{ background: "var(--teal)", color: "var(--on-teal, #ffffff)" }}>
									{net.method}
								</span>
								<span className={`dente-diagnostic-pill shrink-0 ${statusClass}`}>{net.statusCode || "ERR"}</span>
								{net.latencyMs !== undefined && (
									<span className="dente-diagnostic-time shrink-0">
										<Clock size={11} style={{ marginRight: 3, verticalAlign: "middle" }} />
										{net.latencyMs}ms
									</span>
								)}
								<span className="dente-diagnostic-time shrink-0">{net.timestamp.slice(11, 23)}</span>
							</div>
							<button
								type="button"
								className="dente-diagnostic-action-btn shrink-0"
								style={{ minHeight: 26, height: 26, padding: "2px 8px", fontSize: 11 }}
								onClick={(e) => {
									e.stopPropagation();
									handleCopyCorrelationId(net.correlationId);
								}}
								title="Копировать Correlation ID"
							>
								{copiedCorrelationId === net.correlationId ? <Check size={12} color="var(--ok-fg)" /> : <Copy size={12} />}
								<span>{net.correlationId.slice(0, 16)}…</span>
							</button>
						</div>

						<div className="dente-diagnostic-message truncate min-w-0" style={{ fontFamily: "monospace", fontSize: 12 }} title={net.url}>
							{net.url}
						</div>

						{isExpanded && hasDetails && (
							<div className="dente-diagnostic-code-block" onClick={(e) => e.stopPropagation()}>
								{net.error && <div style={{ color: "var(--bad-fg)", marginBottom: 6 }}>Ошибка: {net.error}</div>}
								{net.requestBodyPreview && (
									<div>
										<span style={{ color: "var(--muted)" }}>Request Payload: </span>
										{net.requestBodyPreview}
									</div>
								)}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
};
