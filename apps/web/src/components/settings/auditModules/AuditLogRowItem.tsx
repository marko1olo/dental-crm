import React from "react";
import { formatKopecksRu } from "@dental/shared";
import { ChevronDown, ChevronRight } from "lucide-react";
import { ACTION_LABELS, type StaffAuditRow } from "./AuditLogFilterBar";
import { AuditLogRowDiffDetail } from "./AuditLogRowDiffDetail";

export interface AuditLogRowItemProps {
	row: StaffAuditRow;
	isExpanded: boolean;
	onToggleExpand: (rowId: string) => void;
	formatDateTimeRu: (iso: string) => string;
}

export const AuditLogRowItem: React.FC<AuditLogRowItemProps> = ({
	row,
	isExpanded,
	onToggleExpand,
	formatDateTimeRu,
}) => {
	const actionMeta = ACTION_LABELS[row.actionType] ?? {
		label: row.actionType,
		badgeClass: "text-[var(--ink)] bg-[var(--paper-soft)] border-[var(--line)]",
	};

	return (
		<article
			style={{
				borderBottom: "1px solid var(--line, #e2e8f0)",
				padding: "10px 12px",
				display: "flex",
				flexDirection: "column",
				gap: "6px",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "space-between",
					flexWrap: "wrap",
					gap: "8px",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
					<span
						style={{ fontSize: "11px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", border: "1px solid" }}
						className={actionMeta.badgeClass}
					>
						{actionMeta.label}
					</span>
					<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
						{row.actorName}
					</span>
					<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
						({row.actorRole})
					</span>
					{row.ipAddress && (
						<span style={{ fontSize: "11px", color: "var(--muted, #64748b)", fontFamily: "monospace" }}>
							IP: {row.ipAddress}
						</span>
					)}
					{row.amountKopecks != null && (
						<span style={{ fontSize: "11px", fontWeight: 700, color: "rgb(15, 118, 110)" }}>
							{formatKopecksRu(row.amountKopecks)}
						</span>
					)}
					{row.discountPercent != null && (
						<span style={{ fontSize: "11px", fontWeight: 700, color: "rgb(13, 148, 136)" }}>
							Скидка {row.discountPercent}%
						</span>
					)}
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
						{formatDateTimeRu(row.timestamp)}
					</span>
					{(row.oldState || row.newState || row.reason) && (
						<button
							type="button"
							onClick={() => onToggleExpand(row.id)}
							style={{ background: "none", border: "none", cursor: "pointer", display: "inline-flex", padding: "4px", color: "var(--muted, #64748b)" }}
							aria-label={isExpanded ? "Свернуть детали" : "Развернуть детали"}
						>
							{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
						</button>
					)}
				</div>
			</div>

			{row.reason && (
				<div style={{ fontSize: "11px", color: "var(--ink, #334155)", marginLeft: "4px" }}>
					<strong>Причина:</strong> {row.reason}
				</div>
			)}

			{isExpanded && <AuditLogRowDiffDetail row={row} />}
		</article>
	);
};
