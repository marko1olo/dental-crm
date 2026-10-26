/**
 * ScanHistoryRow.tsx — Строка отдельного снимка в истории пациента (Мандат 8b <= 120 строк).
 */

import React from "react";
import { Loader2, ScanLine, Trash2, ZoomIn } from "lucide-react";
import type { XrayHistoryItem } from "./types";

interface Props {
	scan: XrayHistoryItem;
	onLoadHistoryScan: (scan: XrayHistoryItem) => void;
	onDeleteScan: (scan: XrayHistoryItem) => void;
	deletingScanId: string | null;
}

export const ScanHistoryRow: React.FC<Props> = ({
	scan,
	onLoadHistoryScan,
	onDeleteScan,
	deletingScanId,
}) => {
	const isDeleting = deletingScanId === scan.id;

	return (
		<div key={scan.id} data-testid={`xray-scan-history-row-${scan.id}`} style={{ display: "flex", alignItems: "stretch", gap: "6px" }}>
			<button
				type="button"
				onClick={() => onLoadHistoryScan(scan)}
				data-testid={`xray-scan-open-${scan.id}`}
				style={{
					flex: 1, display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px",
					borderRadius: "8px", border: "1px solid var(--line)", background: "var(--paper-soft)",
					cursor: "pointer", textAlign: "left", transition: "all 0.15s", minWidth: 0,
				}}
			>
				<div
					style={{
						width: "36px", height: "36px", borderRadius: "6px", background: "var(--paper)",
						display: "flex", alignItems: "center", justifyContent: "center",
						border: "1px solid var(--line)", flexShrink: 0,
					}}
				>
					<ScanLine size={16} style={{ color: "var(--teal)" }} />
				</div>
				<div style={{ flex: 1, minWidth: 0 }}>
					<div className="truncate min-w-0" style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--ink)" }} title={scan.originalFilename ?? "Снимок"}>
						{scan.originalFilename ?? "Снимок"}
					</div>
					<div className="truncate min-w-0" style={{ fontSize: "0.78rem", color: "var(--muted)", marginTop: "2px" }}>
						{new Date(scan.capturedAt).toLocaleDateString("ru-RU")} · {scan?.aiToothStates ? Object.keys(scan.aiToothStates).length : 0} зубов
						{scan.aiSummary && <span title={scan.aiSummary}> · {scan.aiSummary.substring(0, 60)}…</span>}
					</div>
				</div>
				<ZoomIn size={14} style={{ color: "var(--muted)", flexShrink: 0 }} />
			</button>
			<button
				type="button"
				data-testid={`xray-scan-delete-${scan.id}`}
				aria-label={`Удалить снимок ${scan.originalFilename ?? scan.id}`}
				title="Удалить из архива"
				disabled={isDeleting}
				onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteScan(scan); }}
				style={{
					width: "32px", height: "32px", minHeight: "32px", flexShrink: 0, borderRadius: "6px",
					border: "1px solid var(--line)", background: "var(--paper)",
					color: isDeleting ? "var(--muted)" : "var(--rust, #c62828)",
					cursor: isDeleting ? "wait" : "pointer",
					display: "flex", alignItems: "center", justifyContent: "center",
				}}
			>
				{isDeleting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />}
			</button>
		</div>
	);
};
