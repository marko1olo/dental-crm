/**
 * JournalTableRow.tsx — Table row renderer for a single REMD document record
 */

import React from "react";
import type { RemdDocumentRecord } from "../../egiszJournalData";
import { getStatusBadge } from "./journalTypes";

export interface JournalTableRowProps {
	readonly rec: RemdDocumentRecord;
	readonly isSelected: boolean;
	readonly onSelectJournalId: (id: string) => void;
	readonly onSignJournalDocument?: ((record: RemdDocumentRecord) => void) | undefined;
	readonly onExportJournalZip?: ((record: RemdDocumentRecord) => void) | undefined;
	readonly onSingleZipExport: (record: RemdDocumentRecord) => void;
	readonly onSwitchToSignatureTab: () => void;
}

export const JournalTableRow: React.FC<JournalTableRowProps> = ({
	rec,
	isSelected,
	onSelectJournalId,
	onSignJournalDocument,
	onExportJournalZip,
	onSingleZipExport,
	onSwitchToSignatureTab,
}) => {
	const badge = getStatusBadge(rec.status);

	return (
		<tr
			onClick={() => onSelectJournalId(rec.id)}
			style={{
				borderBottom: "1px solid var(--line)",
				background: isSelected ? "rgba(0, 86, 179, 0.05)" : "transparent",
				cursor: "pointer",
			}}
		>
			<td style={{ padding: "0.6rem 0.75rem" }}>
				<span style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, background: badge.bg, color: badge.color }}>
					{badge.label}
				</span>
			</td>
			<td style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>{rec.docTypeCode}</td>
			<td style={{ padding: "0.6rem 0.75rem", minWidth: 0 }}>
				<div className="egisz-cell-truncate" title={rec.patient.fullName}>{rec.patient.fullName}</div>
				{rec.patient.snils && (
					<div className="egisz-cell-truncate font-mono" style={{ fontSize: "0.75rem", color: "var(--muted)" }} title={rec.patient.snils}>{rec.patient.snils}</div>
				)}
			</td>
			<td style={{ padding: "0.6rem 0.75rem", minWidth: 0 }}>
				<div className="egisz-cell-truncate" title={rec.doctor.fullName}>{rec.doctor.fullName}</div>
				<div className="egisz-cell-truncate" style={{ fontSize: "0.75rem", color: "var(--muted)" }} title={rec.doctor.position}>{rec.doctor.position}</div>
			</td>
			<td style={{ padding: "0.6rem 0.75rem", minWidth: 0 }}>
				<div className="egisz-cell-truncate font-mono" style={{ fontFamily: "monospace", fontSize: "0.75rem" }} title={rec.registrationInfo?.regNumber || "—"}>
					{rec.registrationInfo?.regNumber || "—"}
				</div>
			</td>
			<td style={{ padding: "0.6rem 0.75rem", whiteSpace: "nowrap" }}>{rec.encounterDate}</td>
			<td style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>
				<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.35rem" }}>
					<button
						type="button"
						onClick={(e) => { e.stopPropagation(); if (onSignJournalDocument) { onSignJournalDocument(rec); } else { onSwitchToSignatureTab(); } }}
						className="egisz-btn sm"
						style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", fontWeight: 600, borderRadius: "4px", background: "var(--teal)", color: "var(--ink-inverse)", border: "none", cursor: "pointer" }}
					>
						Подписать
					</button>
					<button
						type="button"
						onClick={(e) => { e.stopPropagation(); if (onExportJournalZip) { onExportJournalZip(rec); } else { onSingleZipExport(rec); } }}
						className="egisz-btn sm"
						style={{ padding: "0.25rem 0.6rem", fontSize: "0.75rem", fontWeight: 600, borderRadius: "4px", background: "var(--paper-strong)", color: "var(--ink)", border: "1px solid var(--line)", cursor: "pointer" }}
					>
						1-Клик ZIP
					</button>
				</div>
			</td>
		</tr>
	);
};
