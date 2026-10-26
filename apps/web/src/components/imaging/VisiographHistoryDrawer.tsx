/**
 * VisiographHistoryDrawer.tsx — Выдвижная панель истории рентгеновских снимков пациента
 * Mandate 8b: строго <= 120 строк.
 */

import React, { useState } from "react";
import { AlertTriangle, ChevronDown, History } from "lucide-react";
import {
	type XrayHistoryItem,
	type VisiographHistoryDrawerProps,
	SCAN_ARCHIVE_SUBJECT,
} from "./historyDrawer/types";
import { HistoryStatePlaceholders } from "./historyDrawer/HistoryStatePlaceholders";
import { ScanHistoryRow } from "./historyDrawer/ScanHistoryRow";

export type { XrayHistoryItem, VisiographHistoryDrawerProps };
export { SCAN_ARCHIVE_SUBJECT };

export function VisiographHistoryDrawer(props: VisiographHistoryDrawerProps) {
	const {
		scanHistory, historyFailure, historyPhase, effectivePatientId,
		onLoadHistoryScan, onDeleteScan, deletingScanId, deleteFailure, onRetry,
	} = props;
	const [historyExpanded, setHistoryExpanded] = useState(false);

	if (!effectivePatientId) return null;

	if (historyPhase !== "ready") {
		return <HistoryStatePlaceholders historyPhase={historyPhase} historyFailure={historyFailure} onRetry={onRetry} />;
	}

	return (
		<div style={{ marginTop: "16px" }}>
			<button
				type="button"
				onClick={() => setHistoryExpanded(!historyExpanded)}
				style={{
					display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none",
					cursor: "pointer", fontSize: "0.85rem", color: "var(--muted)", padding: "4px 0", fontWeight: 500,
				}}
			>
				<History size={14} />
				История снимков ({scanHistory.length})
				<ChevronDown size={13} style={{ transform: historyExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }} />
			</button>
			{historyExpanded && (
				<div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "6px", maxHeight: "240px", overflowY: "auto", paddingRight: "4px" }}>
					{deleteFailure && (
						<div role="alert" data-testid="xray-scan-delete-failure" style={{ padding: "8px 12px", background: "var(--warn-bg)", color: "var(--warn-fg)", borderRadius: "8px", fontSize: "0.82rem", display: "flex", gap: "8px", alignItems: "flex-start" }}>
							<AlertTriangle size={14} style={{ flexShrink: 0, marginTop: "2px" }} aria-hidden="true" />
							<span>{deleteFailure}</span>
						</div>
					)}
					{(scanHistory ?? []).map((scan) => (
						<ScanHistoryRow key={scan.id} scan={scan} onLoadHistoryScan={onLoadHistoryScan} onDeleteScan={onDeleteScan} deletingScanId={deletingScanId} />
					))}
				</div>
			)}
		</div>
	);
}
