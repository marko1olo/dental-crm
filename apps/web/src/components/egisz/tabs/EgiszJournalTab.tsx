/**
 * EgiszJournalTab.tsx
 *
 * Tab 6: EGISZ REMD Documents Journal & Outbox Queue.
 * Real-time monitoring of registered CDA packages, validation errors, and batch archives.
 * Synchronized with backend routes /api/clinical/egisz/outbox and /api/egisz/logs/:patientId.
 * Mandate 8e: Doctor Autonomy (Zero disabled buttons).
 */

import React from "react";
import { AlertCircle, FileArchive, RefreshCw } from "lucide-react";
import type { RemdDocumentRecord, RemdDocumentStatus } from "../egiszJournalData";

export interface EgiszJournalTabProps {
	readonly records: readonly RemdDocumentRecord[];
	readonly journalFilter: RemdDocumentStatus | "all";
	readonly onJournalFilterChange: (status: RemdDocumentStatus | "all") => void;
	readonly selectedJournalId: string;
	readonly onSelectJournalId: (id: string) => void;
	readonly onBatchZipExport: () => void;
	readonly onSingleZipExport: (record: RemdDocumentRecord) => void;
	readonly onSignJournalDocument?: ((record: RemdDocumentRecord) => void) | undefined;
	readonly onExportJournalZip?: ((record: RemdDocumentRecord) => void) | undefined;
	readonly onSwitchToSignatureTab: () => void;
	readonly onRefreshOutbox?: (() => void) | undefined;
}

export const EgiszJournalTab: React.FC<EgiszJournalTabProps> = ({
	records,
	journalFilter,
	onJournalFilterChange,
	selectedJournalId,
	onSelectJournalId,
	onBatchZipExport,
	onSingleZipExport,
	onSignJournalDocument,
	onExportJournalZip,
	onSwitchToSignatureTab,
	onRefreshOutbox,
}) => {
	const registeredCount = records.filter((r) => r.status === "registered").length;
	const errorCount = records.filter((r) => r.status === "error").length;
	const draftCount = records.filter((r) => r.status === "draft").length;

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			{/* Journal Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
				<div>
					<h3 style={{ margin: 0, fontSize: "1.125rem", fontWeight: 700, color: "var(--ink)" }}>
						Журнал медицинских документов РЭМД ЕГИСЗ
					</h3>
					<p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--muted)", marginTop: "0.2rem" }}>
						Реестр СЭМД 043/у, 101, 102, 302, 303, 105 &bull; Приказ 947н Минздрава РФ
					</p>
				</div>
				<div style={{ display: "flex", gap: "0.5rem" }}>
					{onRefreshOutbox && (
						<button
							type="button"
							onClick={onRefreshOutbox}
							className="egisz-btn sm"
							style={{
								display: "flex",
								alignItems: "center",
								gap: "0.4rem",
								padding: "0.5rem 0.75rem",
								fontSize: "0.8125rem",
								fontWeight: 600,
								borderRadius: "6px",
								border: "1px solid var(--line)",
								background: "var(--paper)",
								color: "var(--ink)",
								cursor: "pointer",
							}}
						>
							<RefreshCw size={14} />
							Обновить
						</button>
					)}
					<button
						type="button"
						onClick={onBatchZipExport}
						style={{
							display: "flex",
							alignItems: "center",
							gap: "0.4rem",
							padding: "0.5rem 1rem",
							fontSize: "0.8125rem",
							fontWeight: 700,
							borderRadius: "6px",
							background: "var(--primary)",
							color: "var(--ink-inverse)",
							border: "none",
							cursor: "pointer",
						}}
					>
						<FileArchive size={16} />
						Пакетный ZIP (.xml + .p7s)
					</button>
				</div>
			</div>

			{/* Stats Ribbon */}
			<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.75rem" }}>
				<div style={{ padding: "0.875rem", borderRadius: "8px", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
					<div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--success)", textTransform: "uppercase" }}>
						Зарегистрировано в РЭМД
					</div>
					<div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--success)", marginTop: "0.25rem" }}>
						{registeredCount}
					</div>
				</div>
				<div style={{ padding: "0.875rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)" }}>
					<div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--danger)", textTransform: "uppercase" }}>
						Ошибки валидации
					</div>
					<div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--danger)", marginTop: "0.25rem" }}>
						{errorCount}
					</div>
				</div>
				<div style={{ padding: "0.875rem", borderRadius: "8px", background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.25)" }}>
					<div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--warning)", textTransform: "uppercase" }}>
						Черновики
					</div>
					<div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--warning)", marginTop: "0.25rem" }}>
						{draftCount}
					</div>
				</div>
			</div>

			{/* Filter Chips */}
			<div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
				<span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
					Фильтр статуса:
				</span>
				{(["all", "registered", "error", "draft", "signed", "sent"] as const).map((filterVal) => (
					<button
						key={filterVal}
						type="button"
						onClick={() => onJournalFilterChange(filterVal)}
						style={{
							padding: "0.3rem 0.65rem",
							fontSize: "0.75rem",
							fontWeight: 600,
							borderRadius: "6px",
							border: "1px solid var(--line)",
							background: journalFilter === filterVal ? "var(--primary)" : "var(--paper)",
							color: journalFilter === filterVal ? "var(--ink-inverse)" : "var(--ink)",
							cursor: "pointer",
						}}
					>
						{filterVal === "all"
							? "Все"
							: filterVal === "registered"
							? "Зарегистрировано"
							: filterVal === "error"
							? "Ошибка валидации"
							: filterVal === "draft"
							? "Черновик"
							: filterVal === "signed"
							? "Подписан"
							: "Отправлен"}
					</button>
				))}
			</div>

			{/* Error Remediation Hint Card */}
			<div style={{ padding: "1rem", borderRadius: "8px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.3)" }}>
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--danger)", fontSize: "0.875rem" }}>
					<AlertCircle size={18} />
					ERR_FRMR_SNILS_NOT_FOUND (Ошибка валидации РЭМД)
				</div>
				<div style={{ fontWeight: 600, fontSize: "0.8125rem", color: "var(--ink)", marginTop: "0.35rem" }}>
					Инструкция по устранению ошибки:
				</div>
				<p style={{ margin: 0, fontSize: "0.8125rem", color: "var(--muted)", marginTop: "0.2rem", lineHeight: 1.5 }}>
					Проверьте правильность ввода СНИЛС врача в регистре ФРМР ЕГИСЗ и справочнике персонала клиники. СНИЛС должен быть верифицирован в ПФР и привязан к должности в ФРМО.
				</p>
			</div>

			{/* Documents Table */}
			<div style={{ border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden", background: "var(--paper)" }}>
				<table className="egisz-table-fixed" style={{ borderCollapse: "collapse", fontSize: "0.8125rem" }}>
					<thead>
						<tr style={{ background: "var(--paper-strong)", borderBottom: "1px solid var(--line)", textAlign: "left" }}>
							<th style={{ width: "130px", padding: "0.6rem 0.75rem" }}>Статус</th>
							<th style={{ width: "70px", padding: "0.6rem 0.75rem" }}>СЭМД</th>
							<th style={{ width: "190px", padding: "0.6rem 0.75rem" }}>Пациент</th>
							<th style={{ width: "190px", padding: "0.6rem 0.75rem" }}>Врач</th>
							<th style={{ width: "160px", padding: "0.6rem 0.75rem" }}>Рег. номер РЭМД</th>
							<th style={{ width: "95px", padding: "0.6rem 0.75rem" }}>Дата</th>
							<th style={{ width: "175px", padding: "0.6rem 0.75rem", textAlign: "right" }}>Действия</th>
						</tr>
					</thead>
					<tbody>
						{records
							.filter((r) => journalFilter === "all" || r.status === journalFilter)
							.map((rec) => (
								<tr
									key={rec.id}
									onClick={() => onSelectJournalId(rec.id)}
									style={{
										borderBottom: "1px solid var(--line)",
										background: selectedJournalId === rec.id ? "rgba(0, 86, 179, 0.05)" : "transparent",
										cursor: "pointer",
									}}
								>
									<td style={{ padding: "0.6rem 0.75rem" }}>
										<span
											style={{
												padding: "0.2rem 0.5rem",
												borderRadius: "4px",
												fontSize: "0.75rem",
												fontWeight: 600,
												background:
													rec.status === "registered"
														? "rgba(16, 185, 129, 0.15)"
														: rec.status === "error"
														? "rgba(239, 68, 68, 0.15)"
														: "rgba(245, 158, 11, 0.15)",
												color:
													rec.status === "registered"
														? "var(--success)"
														: rec.status === "error"
														? "var(--danger)"
														: "var(--warning)",
											}}
										>
											{rec.status === "registered"
												? "Зарегистрирован"
												: rec.status === "error"
												? "Ошибка"
												: "Черновик"}
										</span>
									</td>
									<td style={{ padding: "0.6rem 0.75rem", fontWeight: 600 }}>
										{rec.docTypeCode}
									</td>
									<td style={{ padding: "0.6rem 0.75rem", minWidth: 0 }}>
										<div className="egisz-cell-truncate" title={rec.patient.fullName}>{rec.patient.fullName}</div>
										{rec.patient.snils && (
											<div className="egisz-cell-truncate font-mono" style={{ fontSize: "0.75rem", color: "var(--muted)" }} title={rec.patient.snils}>
												{rec.patient.snils}
											</div>
										)}
									</td>
									<td style={{ padding: "0.6rem 0.75rem", minWidth: 0 }}>
										<div className="egisz-cell-truncate" title={rec.doctor.fullName}>{rec.doctor.fullName}</div>
										<div className="egisz-cell-truncate" style={{ fontSize: "0.75rem", color: "var(--muted)" }} title={rec.doctor.position}>
											{rec.doctor.position}
										</div>
									</td>
									<td style={{ padding: "0.6rem 0.75rem", minWidth: 0 }}>
										<div className="egisz-cell-truncate font-mono" style={{ fontFamily: "monospace", fontSize: "0.75rem" }} title={rec.registrationInfo?.regNumber || "—"}>
											{rec.registrationInfo?.regNumber || "—"}
										</div>
									</td>
									<td style={{ padding: "0.6rem 0.75rem", whiteSpace: "nowrap" }}>
										{rec.encounterDate}
									</td>
									<td style={{ padding: "0.6rem 0.75rem", textAlign: "right" }}>
										<div style={{ display: "flex", justifyContent: "flex-end", gap: "0.35rem" }}>
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													if (onSignJournalDocument) {
														onSignJournalDocument(rec);
													} else {
														onSwitchToSignatureTab();
													}
												}}
												className="egisz-btn sm"
												style={{
													padding: "0.25rem 0.6rem",
													fontSize: "0.75rem",
													fontWeight: 600,
													borderRadius: "4px",
													background: "var(--teal)",
													color: "var(--ink-inverse)",
													border: "none",
													cursor: "pointer",
												}}
											>
												Подписать
											</button>
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													if (onExportJournalZip) {
														onExportJournalZip(rec);
													} else {
														onSingleZipExport(rec);
													}
												}}
												className="egisz-btn sm"
												style={{
													padding: "0.25rem 0.6rem",
													fontSize: "0.75rem",
													fontWeight: 600,
													borderRadius: "4px",
													background: "var(--paper-strong)",
													color: "var(--ink)",
													border: "1px solid var(--line)",
													cursor: "pointer",
												}}
											>
												1-Клик ZIP
											</button>
										</div>
									</td>
								</tr>
							))}
					</tbody>
				</table>
			</div>
		</div>
	);
};
