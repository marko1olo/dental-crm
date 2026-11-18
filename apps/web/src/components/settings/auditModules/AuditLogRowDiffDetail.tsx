import React from "react";
import type { StaffAuditRow } from "./AuditLogFilterBar";

export interface AuditLogRowDiffDetailProps {
	row: StaffAuditRow;
}

export const AuditLogRowDiffDetail: React.FC<AuditLogRowDiffDetailProps> = ({ row }) => {
	return (
		<div
			style={{
				marginTop: "6px",
				padding: "8px 10px",
				borderRadius: "6px",
				background: "var(--paper-soft, #f1f5f9)",
				fontSize: "11px",
				fontFamily: "monospace",
				display: "flex",
				flexDirection: "column",
				gap: "4px",
			}}
		>
			{row.oldState && (
				<div>
					<span style={{ color: "rgb(225, 29, 72)", fontWeight: 700 }}>[-] Было: </span>
					<span>{JSON.stringify(row.oldState)}</span>
				</div>
			)}
			{row.newState && (
				<div>
					<span style={{ color: "rgb(13, 148, 136)", fontWeight: 700 }}>[+] Стало: </span>
					<span>{JSON.stringify(row.newState)}</span>
				</div>
			)}
			{row.entityId && (
				<div style={{ color: "var(--muted, #64748b)", fontSize: "10px" }}>
					Сущность ID: {row.entityId} ({row.entityType})
				</div>
			)}
		</div>
	);
};
