import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
	Activity,
	Calendar,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Eye,
	FileSpreadsheet,
	FileText,
	Filter,
	History,
	RefreshCw,
	Search,
	ShieldAlert,
	ShieldCheck,
	User,
} from "lucide-react";
import { formatKopecksRu } from "@dental/shared";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import clientLogger from "../../../services/logging/clientLogger";

export interface StaffAuditRow {
	id: string;
	timestamp: string;
	actionType: string;
	actorName: string;
	actorRole: string;
	entityType: string;
	entityId?: string | null;
	reason?: string | null;
	amountKopecks?: number | null;
	discountPercent?: number | null;
	oldState?: Record<string, unknown> | null;
	newState?: Record<string, unknown> | null;
}

const ACTION_LABELS: Record<string, { label: string; badgeClass: string }> = {
	emr_open: { label: "Открытие карты пациента", badgeClass: "text-sky-700 bg-sky-50 dark:bg-sky-950/40 border-sky-300" },
	diagnosis_change: { label: "Изменение диагноза", badgeClass: "text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300" },
	service_add: { label: "Добавление услуги", badgeClass: "text-teal-700 bg-teal-50 dark:bg-teal-950/40 border-teal-300" },
	service_remove: { label: "Удаление услуги", badgeClass: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-300" },
	discount_apply: { label: "Ручная скидка", badgeClass: "text-purple-700 bg-purple-50 dark:bg-purple-950/40 border-purple-300" },
	payment_receive: { label: "Приём оплаты", badgeClass: "text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300" },
	payment_refund: { label: "Возврат средств", badgeClass: "text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-300" },
	appointment_cancel: { label: "Отмена приёма", badgeClass: "text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-300" },
	appointment_create: { label: "Запись на приём", badgeClass: "text-teal-700 bg-teal-50 dark:bg-teal-950/40 border-teal-300" },
	appointment_reschedule: { label: "Перенос приёма", badgeClass: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-300" },
	appointment_delete: { label: "Удаление приёма", badgeClass: "text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-300" },
	document_print: { label: "Печать документа", badgeClass: "text-slate-700 bg-slate-50 dark:bg-slate-800 border-slate-300" },
	document_export: { label: "Экспорт данных", badgeClass: "text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-300" },
	price_edit: { label: "Правка прейскуранта", badgeClass: "text-purple-700 bg-purple-50 dark:bg-purple-950/40 border-purple-300" },
	auth_login: { label: "Вход сотрудника", badgeClass: "text-blue-700 bg-blue-50 dark:bg-blue-950/40 border-blue-300" },
	auth_logout: { label: "Выход сотрудника", badgeClass: "text-slate-700 bg-slate-50 dark:bg-slate-800 border-slate-300" },
	diary_revision: { label: "Правка дневника", badgeClass: "text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300" },
};

function normalizeAuditRow(raw: Record<string, unknown>): StaffAuditRow {
	const details = (raw.details || raw.meta || {}) as Record<string, unknown>;
	const actionType = String(raw.actionType || raw.action || raw.eventType || "custom_action");
	const id = String(raw.id || `audit-${Date.now()}-${Math.random()}`);
	const timestamp = String(raw.createdAt || raw.clientTimestamp || raw.timestamp || new Date().toISOString());
	const actorName = String(raw.actorName || raw.actorLogin || raw.actorFullName || "Сотрудник клиники");
	const actorRole = String(raw.actorRole || "staff");
	const entityType = String(raw.entityType || "clinical");
	const entityId = raw.entityId ? String(raw.entityId) : null;
	const reason = typeof raw.reason === "string" ? raw.reason : typeof details.reason === "string" ? details.reason : null;
	const amountKopecks = typeof details.amountKopecks === "number" ? details.amountKopecks : null;
	const discountPercent = typeof details.discountPercent === "number" ? details.discountPercent : null;
	const oldState = details.oldState && typeof details.oldState === "object" ? (details.oldState as Record<string, unknown>) : null;
	const newState = details.newState && typeof details.newState === "object" ? (details.newState as Record<string, unknown>) : null;

	return {
		id,
		timestamp,
		actionType,
		actorName,
		actorRole,
		entityType,
		entityId,
		reason,
		amountKopecks,
		discountPercent,
		oldState,
		newState,
	};
}

export function StaffActionJournalSection(): React.JSX.Element {
	const [rows, setRows] = useState<StaffAuditRow[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [actionCategory, setActionCategory] = useState<string>("all");
	const [expandedRowId, setExpandedRowId] = useState<string | null>(null);

	const loadJournal = useCallback(async () => {
		setIsLoading(true);
		try {
			const headers = denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
			const response = await fetch("/api/audit/logs?limit=100", { headers });
			const rawList: Array<Record<string, unknown>> = [];

			if (response.ok) {
				const data = (await response.json()) as { logs?: Array<Record<string, unknown>> };
				if (Array.isArray(data.logs)) {
					rawList.push(...data.logs);
				}
			}

			// Add offline local records from clientLogger
			const offline = clientLogger.getOfflineStaffAuditBuffer();
			rawList.push(...(offline as unknown as Array<Record<string, unknown>>));

			const mapped = rawList.map(normalizeAuditRow);
			// Sort newest first
			mapped.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
			setRows(mapped);
		} catch (err) {
			console.warn("[StaffActionJournalSection] Ошибка загрузки журнала:", err);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void loadJournal();
	}, [loadJournal]);

	const filteredRows = useMemo(() => {
		return rows.filter((row) => {
			if (actionCategory !== "all") {
				if (actionCategory === "clinical" && !["emr_open", "diagnosis_change", "service_add", "service_remove", "diary_revision"].includes(row.actionType)) {
					return false;
				}
				if (actionCategory === "financial" && !["payment_receive", "payment_refund", "discount_apply", "price_edit"].includes(row.actionType)) {
					return false;
				}
				if (actionCategory === "schedule" && !["appointment_cancel", "appointment_create", "appointment_reschedule", "appointment_delete"].includes(row.actionType)) {
					return false;
				}
				if (actionCategory === "security" && !["auth_login", "auth_logout", "document_export"].includes(row.actionType)) {
					return false;
				}
			}

			if (searchQuery.trim()) {
				const query = searchQuery.toLowerCase().trim();
				const actorMatch = row.actorName.toLowerCase().includes(query);
				const reasonMatch = (row.reason || "").toLowerCase().includes(query);
				const actionMatch = (ACTION_LABELS[row.actionType]?.label || row.actionType).toLowerCase().includes(query);
				const roleMatch = row.actorRole.toLowerCase().includes(query);
				if (!actorMatch && !reasonMatch && !actionMatch && !roleMatch) return false;
			}

			return true;
		});
	}, [rows, actionCategory, searchQuery]);

	const formatDateTimeRu = (iso: string) => {
		try {
			const d = new Date(iso);
			return `${d.toLocaleDateString("ru-RU")} ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
		} catch {
			return iso;
		}
	};

	return (
		<section
			className="staff-audit-journal-card panel"
			data-testid="staff-action-audit-journal"
			style={{
				padding: "16px",
				borderRadius: "12px",
				background: "var(--paper-soft, #f8fafc)",
				border: "1px solid var(--line, #e2e8f0)",
				display: "flex",
				flexDirection: "column",
				gap: "14px",
			}}
		>
			{/* Header */}
			<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
				<div>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<History size={18} className="text-teal-600" aria-hidden="true" />
						<h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
							Журнал критических действий персонала (Audit Journal)
						</h3>
						<span
							style={{
								fontSize: "11px",
								fontWeight: 700,
								padding: "2px 8px",
								borderRadius: "9999px",
								backgroundColor: "rgba(13, 148, 136, 0.12)",
								color: "rgb(13, 148, 136)",
							}}
						>
							{filteredRows.length} {filteredRows.length === 1 ? "запись" : "записей"}
						</span>
					</div>
					<p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "var(--muted, #64748b)" }}>
						Слепки изменений: правки прайса, ручные скидки, отмены записей, возвраты оплаты и экспорт данных с diff до/после.
					</p>
				</div>

				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<button
						type="button"
						onClick={() => void loadJournal()}
						disabled={isLoading}
						className="secondary-button"
						style={{
							display: "inline-flex",
							alignItems: "center",
							gap: "6px",
							fontSize: "12px",
							padding: "6px 12px",
							minHeight: "44px",
						}}
						aria-label="Обновить журнал действий"
					>
						<RefreshCw size={14} className={isLoading ? "animate-spin" : ""} aria-hidden="true" />
						<span>{isLoading ? "Загрузка…" : "Обновить"}</span>
					</button>
				</div>
			</div>

			{/* Filters Bar */}
			<div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
				<div style={{ position: "relative", flex: "1 1 200px" }}>
					<Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--muted, #64748b)" }} />
					<input
						type="text"
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Поиск по сотруднику, причине или действию…"
						style={{
							width: "100%",
							padding: "8px 10px 8px 30px",
							fontSize: "12px",
							borderRadius: "8px",
							border: "1px solid var(--line, #cbd5e1)",
							background: "var(--paper, #ffffff)",
							color: "var(--ink, #0f172a)",
							minHeight: "44px",
						}}
					/>
				</div>

				<div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
					{[
						{ key: "all", label: "Все действия" },
						{ key: "clinical", label: "Клинические" },
						{ key: "financial", label: "Финансы и оплата" },
						{ key: "schedule", label: "Расписание" },
						{ key: "security", label: "Безопасность" },
					].map((cat) => (
						<button
							key={cat.key}
							type="button"
							onClick={() => setActionCategory(cat.key)}
							style={{
								padding: "6px 10px",
								fontSize: "12px",
								fontWeight: actionCategory === cat.key ? 700 : 500,
								borderRadius: "6px",
								border: "1px solid",
								borderColor: actionCategory === cat.key ? "rgb(13, 148, 136)" : "var(--line, #cbd5e1)",
								backgroundColor: actionCategory === cat.key ? "rgba(13, 148, 136, 0.12)" : "var(--paper, #ffffff)",
								color: actionCategory === cat.key ? "rgb(13, 148, 136)" : "var(--ink, #0f172a)",
								cursor: "pointer",
								minHeight: "44px",
							}}
						>
							{cat.label}
						</button>
					))}
				</div>
			</div>

			{/* Table / List */}
			<div
				style={{
					borderRadius: "8px",
					border: "1px solid var(--line, #e2e8f0)",
					backgroundColor: "var(--paper, #ffffff)",
					overflow: "hidden",
				}}
			>
				{filteredRows.length === 0 ? (
					<div style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted, #64748b)" }}>
						<ShieldCheck size={28} style={{ margin: "0 auto 8px auto", opacity: 0.6 }} />
						<div style={{ fontSize: "13px", fontWeight: 600 }}>Записей в журнале не обнаружено</div>
						<div style={{ fontSize: "11px", marginTop: "2px" }}>
							Все важные действия врачей, администраторов и кассиров фиксируются автоматически при совершении операций.
						</div>
					</div>
				) : (
					<div style={{ display: "flex", flexDirection: "column" }}>
						{filteredRows.slice(0, 50).map((row) => {
							const actionMeta = ACTION_LABELS[row.actionType] ?? {
								label: row.actionType,
								badgeClass: "text-slate-700 bg-slate-100 border-slate-300",
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
										<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
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
											<span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
												{row.actorName}
											</span>
											<span style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
												({row.actorRole})
											</span>
											{row.amountKopecks !== null && row.amountKopecks !== undefined && (
												<span style={{ fontSize: "11px", fontWeight: 700, color: "rgb(15, 118, 110)" }}>
													{formatKopecksRu(row.amountKopecks)}
												</span>
											)}
											{row.discountPercent !== null && row.discountPercent !== undefined && (
												<span style={{ fontSize: "11px", fontWeight: 700, color: "rgb(126, 34, 206)" }}>
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
													onClick={() => setExpandedRowId(isExpanded ? null : row.id)}
													style={{
														background: "none",
														border: "none",
														cursor: "pointer",
														display: "inline-flex",
														alignItems: "center",
														padding: "4px",
														color: "var(--muted, #64748b)",
													}}
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

									{/* Diff details when expanded */}
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
									)}
								</article>
							);
						})}
					</div>
				)}
			</div>
		</section>
	);
}

export default StaffActionJournalSection;
