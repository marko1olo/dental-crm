/**
 * apps/web/src/components/settings/auditModules/AuditLogEventsTable.tsx
 *
 * Immutable audit events table with before/after diff comparison, IP address,
 * timestamp, and the 152-FZ cryptographic security contours panel.
 */

import React from "react";
import type { AuditEvent } from "@dental/shared";
import { formatKopecksRu } from "@dental/shared";
import {
	ChevronDown,
	ChevronRight,
	Eye,
	FileText,
	LogOut,
	ShieldCheck,
	Upload,
	UserCheck,
} from "lucide-react";
import { ACTION_LABELS, type StaffAuditRow } from "./AuditLogFilterBar";

export interface AuditLogEventsTableProps {
	rows: StaffAuditRow[];
	expandedRowId: string | null;
	onToggleExpand: (rowId: string) => void;
	formatDateTimeRu: (iso: string) => string;
}

export function AuditLogEventsTable({
	rows,
	expandedRowId,
	onToggleExpand,
	formatDateTimeRu,
}: AuditLogEventsTableProps) {
	return (
		<div
			data-testid="audit-log-events-table"
			style={{
				borderRadius: "8px",
				border: "1px solid var(--line, #e2e8f0)",
				backgroundColor: "var(--paper, #ffffff)",
				overflow: "hidden",
			}}
		>
			{rows.length === 0 ? (
				<div
					style={{
						padding: "32px 16px",
						textAlign: "center",
						color: "var(--muted, #64748b)",
					}}
				>
					<ShieldCheck
						size={28}
						style={{ margin: "0 auto 8px auto", opacity: 0.6 }}
					/>
					<div style={{ fontSize: "13px", fontWeight: 600 }}>
						Записей в журнале не обнаружено
					</div>
					<div style={{ fontSize: "11px", marginTop: "2px" }}>
						Все важные действия врачей, администраторов и кассиров фиксируются автоматически при совершении операций.
					</div>
				</div>
			) : (
				<div style={{ display: "flex", flexDirection: "column" }}>
					{rows.slice(0, 50).map((row) => {
						const actionMeta = ACTION_LABELS[row.actionType] ?? {
							label: row.actionType,
							badgeClass:
								"text-[var(--ink)] bg-[var(--paper-soft)] border-[var(--line)]",
						};
						const isExpanded = expandedRowId === row.id;

						return (
							<article
								key={row.id}
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
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											flexWrap: "wrap",
										}}
									>
										<span
											style={{
												fontSize: "11px",
												fontWeight: 600,
												padding: "2px 6px",
												borderRadius: "4px",
												border: "1px solid",
											}}
											className={actionMeta.badgeClass}
										>
											{actionMeta.label}
										</span>
										<span
											style={{
												fontSize: "12px",
												fontWeight: 700,
												color: "var(--ink, #0f172a)",
											}}
										>
											{row.actorName}
										</span>
										<span
											style={{
												fontSize: "11px",
												color: "var(--muted, #64748b)",
											}}
										>
											({row.actorRole})
										</span>
										{row.ipAddress && (
											<span
												style={{
													fontSize: "11px",
													color: "var(--muted, #64748b)",
													fontFamily: "monospace",
												}}
											>
												IP: {row.ipAddress}
											</span>
										)}
										{row.amountKopecks !== null &&
											row.amountKopecks !== undefined && (
												<span
													style={{
														fontSize: "11px",
														fontWeight: 700,
														color: "rgb(15, 118, 110)",
													}}
												>
													{formatKopecksRu(row.amountKopecks)}
												</span>
											)}
										{row.discountPercent !== null &&
											row.discountPercent !== undefined && (
												<span
													style={{
														fontSize: "11px",
														fontWeight: 700,
														color: "rgb(13, 148, 136)",
													}}
												>
													Скидка {row.discountPercent}%
												</span>
											)}
									</div>

									<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
										<span
											style={{
												fontSize: "11px",
												color: "var(--muted, #64748b)",
											}}
										>
											{formatDateTimeRu(row.timestamp)}
										</span>
										{(row.oldState || row.newState || row.reason) && (
											<button
												type="button"
												onClick={() => onToggleExpand(row.id)}
												style={{
													background: "none",
													border: "none",
													cursor: "pointer",
													display: "inline-flex",
													alignItems: "center",
													padding: "4px",
													color: "var(--muted, #64748b)",
												}}
												aria-label={
													isExpanded ? "Свернуть детали" : "Развернуть детали"
												}
											>
												{isExpanded ? (
													<ChevronDown size={16} />
												) : (
													<ChevronRight size={16} />
												)}
											</button>
										)}
									</div>
								</div>

								{row.reason && (
									<div
										style={{
											fontSize: "11px",
											color: "var(--ink, #334155)",
											marginLeft: "4px",
										}}
									>
										<strong>Причина:</strong> {row.reason}
									</div>
								)}

								{isExpanded && (
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
												<span
													style={{
														color: "rgb(225, 29, 72)",
														fontWeight: 700,
													}}
												>
													[-] Было:{" "}
												</span>
												<span>{JSON.stringify(row.oldState)}</span>
											</div>
										)}
										{row.newState && (
											<div>
												<span
													style={{
														color: "rgb(13, 148, 136)",
														fontWeight: 700,
													}}
												>
													[+] Стало:{" "}
												</span>
												<span>{JSON.stringify(row.newState)}</span>
											</div>
										)}
										{row.entityId && (
											<div
												style={{
													color: "var(--muted, #64748b)",
													fontSize: "10px",
												}}
											>
												Сущность ID: {row.entityId} ({row.entityType})
											</div>
										)}
									</div>
								)}
							</article>
						);
					})}
				</div>
			)}
		</div>
	);
}

export interface SecurityAudit152FzPanelProps {
	auditEvents: AuditEvent[];
	formatDateTime: (iso: string) => string;
	onOpenAuditTrailModal: () => void;
}

export function SecurityAudit152FzPanel({
	auditEvents,
	formatDateTime,
	onOpenAuditTrailModal,
}: SecurityAudit152FzPanelProps) {
	return (
		<div className="panel audit-panel" data-testid="152fz-audit-panel">
			<div className="panel-heading">
				<div>
					<h2>Аудит действий и журнал безопасности</h2>
					<p className="text-xs text-[var(--muted)] m-0 mt-0.5">
						Криптографический реестр обращений: входы сотрудников, открытие медицинских карт, выгрузка данных и отзыв сессий.
					</p>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
					<button
						className="secondary-button"
						type="button"
						onClick={onOpenAuditTrailModal}
						style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem" }}
						data-testid="open-152fz-audit-modal-btn"
					>
						<FileText size={16} aria-hidden="true" />
						<span>Журнал безопасности данных</span>
					</button>
					<ShieldCheck aria-hidden="true" />
				</div>
			</div>

			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 p-3.5 bg-[var(--paper-soft)] rounded-xl border border-[var(--line)] my-2 text-xs">
				<div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
						<UserCheck size={14} className="shrink-0 text-teal-600" />
						<span>Авторизации</span>
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0 leading-normal">
						Фиксация входов, IP-адресов и попыток подбора паролей.
					</p>
				</div>

				<div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
						<Eye size={14} className="shrink-0 text-teal-600" />
						<span>Медкарты (ЭМК)</span>
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0 leading-normal">
						Учёт каждого открытия медкарты (соблюдение врачебной тайны).
					</p>
				</div>

				<div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
						<Upload size={14} className="shrink-0 text-teal-600" />
						<span>Выгрузка ПДн</span>
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0 leading-normal">
						Контроль экспорта базы пациентов и просмотра неэкранированных ПДн.
					</p>
				</div>

				<div className="flex flex-col gap-1 p-2.5 rounded-lg bg-[var(--paper)] border border-[var(--line)]">
					<div className="flex items-center gap-1.5 font-bold text-[var(--ink)]">
						<LogOut size={14} className="shrink-0 text-teal-600" />
						<span>Отзыв сессий</span>
					</div>
					<p className="text-[11px] text-[var(--muted)] m-0 leading-normal">
						Сброс параллельных сессий и блокировка уволенных сотрудников.
					</p>
				</div>
			</div>

			<div className="ops-list">
				{auditEvents.length > 0 ? (
					auditEvents.map((event) => (
						<article className="ops-row" key={event.id}>
							<ShieldCheck aria-hidden="true" />
							<div>
								<h3>{event.reason ? "Системное событие" : "Запись аудита"}</h3>
								<p>
									{event.reason ?? "Служебная запись без публичного описания"}
								</p>
							</div>
							<span>{formatDateTime(event.createdAt)}</span>
						</article>
					))
				) : (
					<article className="ops-empty">
						<ShieldCheck aria-hidden="true" />
						<p>
							Журнал криптографического аудита безопасности активен. Все обращения к медицинским картам,
							авторизации и выгрузки фиксируются цепочкой SHA-256. Нажмите «Журнал безопасности данных» для полного отчёта.
						</p>
					</article>
				)}
			</div>
		</div>
	);
}
