import React from "react";
import type { ClientLogEntry } from "@dental/shared";
import { Check, Copy } from "lucide-react";
import { safeFormatJson } from "./safeFormatJson";

interface DiagnosticDrawerLogsTabProps {
	filteredLogs: readonly ClientLogEntry[];
	searchQuery: string;
	expandedLogIds: Set<string>;
	copiedCorrelationId: string | null;
	toggleExpandLog: (id: string) => void;
	handleCopyCorrelationId: (id: string) => void;
}

export const DiagnosticDrawerLogsTab: React.FC<DiagnosticDrawerLogsTabProps> = ({
	filteredLogs,
	searchQuery,
	expandedLogIds,
	copiedCorrelationId,
	toggleExpandLog,
	handleCopyCorrelationId,
}) => {
	if (filteredLogs.length === 0) {
		return (
			<div className="dente-diagnostic-empty">
				{searchQuery ? "По вашему запросу логи не найдены" : "Журнал логов пуст"}
			</div>
		);
	}

	return (
		<div className="dente-diagnostic-list">
			{filteredLogs.map((log) => {
				const isExpanded = expandedLogIds.has(log.id);
				const hasDetails = log.data !== undefined || Boolean(log.stack);
				const levelClass =
					log.level === "DEBUG"
						? "dente-diagnostic-pill-debug"
						: log.level === "INFO"
							? "dente-diagnostic-pill-info"
							: log.level === "WARN"
								? "dente-diagnostic-pill-warn"
								: log.level === "ERROR"
									? "dente-diagnostic-pill-error"
									: "dente-diagnostic-pill-audit";

				return (
					<div
						key={log.id}
						className="dente-diagnostic-card"
						style={{ cursor: hasDetails ? "pointer" : "default" }}
						onClick={() => hasDetails && toggleExpandLog(log.id)}
					>
						<div className="dente-diagnostic-card-header">
							<div className="dente-diagnostic-card-left min-w-0">
								<span className={`dente-diagnostic-pill shrink-0 ${levelClass}`}>{log.level}</span>
								<span className="dente-diagnostic-module truncate min-w-0" title={log.module}>{log.module}</span>
								<span className="dente-diagnostic-time shrink-0">{log.timestamp.slice(11, 23)}</span>
							</div>
							{log.correlationId && (
								<button
									type="button"
									className="dente-diagnostic-action-btn shrink-0"
									style={{ minHeight: 26, height: 26, padding: "2px 8px", fontSize: 11 }}
									onClick={(e) => {
										e.stopPropagation();
										handleCopyCorrelationId(log.correlationId!);
									}}
									title="Копировать Correlation ID"
								>
									{copiedCorrelationId === log.correlationId ? <Check size={12} color="var(--ok-fg)" /> : <Copy size={12} />}
									<span>{log.correlationId.slice(0, 16)}…</span>
								</button>
							)}
						</div>

						<div className="dente-diagnostic-message break-words min-w-0">{log.message}</div>

						{isExpanded && hasDetails && (
							<div className="dente-diagnostic-code-block" onClick={(e) => e.stopPropagation()}>
								{log.stack && <div style={{ color: "var(--bad-fg)", marginBottom: 8 }}>{log.stack}</div>}
								{log.data !== undefined && <div>{safeFormatJson(log.data, true)}</div>}
							</div>
						)}
					</div>
				);
			})}
		</div>
	);
};
