/**
 * JournalRecordsTable.tsx — Document records table with 1-click actions and empty/loading states
 */

import React from "react";
import { RefreshCw } from "lucide-react";
import type { RemdDocumentRecord, RemdDocumentStatus } from "../../egiszJournalData";
import { JournalTableRow } from "./JournalTableRow";

export interface JournalRecordsTableProps {
	readonly records: readonly RemdDocumentRecord[];
	readonly journalFilter: RemdDocumentStatus | "all";
	readonly selectedJournalId: string;
	readonly onSelectJournalId: (id: string) => void;
	readonly onSingleZipExport: (record: RemdDocumentRecord) => void;
	readonly onSignJournalDocument?: ((record: RemdDocumentRecord) => void) | undefined;
	readonly onExportJournalZip?: ((record: RemdDocumentRecord) => void) | undefined;
	readonly onSwitchToSignatureTab: () => void;
	readonly isLoading?: boolean | undefined;
}

export const JournalRecordsTable: React.FC<JournalRecordsTableProps> = ({
	records,
	journalFilter,
	selectedJournalId,
	onSelectJournalId,
	onSingleZipExport,
	onSignJournalDocument,
	onExportJournalZip,
	onSwitchToSignatureTab,
	isLoading,
}) => {
	const filteredRecords = records.filter((r) => journalFilter === "all" || r.status === journalFilter);

	return (
		<div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", background: "var(--paper)" }}>
			<table className="egisz-table-fixed" style={{ borderCollapse: "collapse", fontSize: "0.8125rem" }}>
				<thead>
					<tr style={{ background: "var(--paper-strong)", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
						<th style={{ width: "130px", padding: "0.6rem 0.75rem" }}>Статус</th>
						<th style={{ width: "70px", padding: "0.6rem 0.75rem" }}>Тип</th>
						<th style={{ width: "190px", padding: "0.6rem 0.75rem" }}>Пациент</th>
						<th style={{ width: "190px", padding: "0.6rem 0.75rem" }}>Врач</th>
						<th style={{ width: "160px", padding: "0.6rem 0.75rem" }}>Номер в Минздраве</th>
						<th style={{ width: "95px", padding: "0.6rem 0.75rem" }}>Дата</th>
						<th style={{ width: "175px", padding: "0.6rem 0.75rem", textAlign: "right" }}>Действия</th>
					</tr>
				</thead>
				<tbody>
					{isLoading ? (
						<tr>
							<td colSpan={7} style={{ padding: "2.5rem 1rem", textAlign: "center", color: "var(--muted)" }}>
								<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
									<RefreshCw size={24} className="animate-spin" style={{ opacity: 0.6 }} />
									<span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Загрузка очереди РЭМД из базы данных...</span>
								</div>
							</td>
						</tr>
					) : filteredRecords.length === 0 ? (
						<tr>
							<td colSpan={7} style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--muted)" }}>
								<div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
									<div style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--ink)" }}>
										{journalFilter === "all" ? "В базе данных нет документов РЭМД" : `В очереди нет документов со статусом «${journalFilter}»`}
									</div>
									<p style={{ margin: 0, fontSize: "0.8125rem", maxWidth: "460px", lineHeight: 1.5 }}>
										Документы попадают в журнал после наложения УКЭП врача и клиники либо при отложенной пакетной отправке.
									</p>
								</div>
							</td>
						</tr>
					) : (
						filteredRecords.map((rec) => (
							<JournalTableRow
								key={rec.id}
								rec={rec}
								isSelected={selectedJournalId === rec.id}
								onSelectJournalId={onSelectJournalId}
								onSignJournalDocument={onSignJournalDocument}
								onExportJournalZip={onExportJournalZip}
								onSingleZipExport={onSingleZipExport}
								onSwitchToSignatureTab={onSwitchToSignatureTab}
							/>
						))
					)}
				</tbody>
			</table>
		</div>
	);
};
