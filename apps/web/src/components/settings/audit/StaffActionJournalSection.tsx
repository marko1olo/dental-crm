/**
 * apps/web/src/components/settings/audit/StaffActionJournalSection.tsx
 *
 * Staff Action & Security Audit Journal.
 * Delegates filtering and event rendering to auditModules/AuditLogFilterBar and AuditLogEventsTable.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StaffActionAuditEntry } from "@dental/shared";
import { History, RefreshCw } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import clientLogger from "../../../services/logging/clientLogger";

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function extractAuditLogsList(raw: unknown): Array<Record<string, unknown>> {
	if (!isPlainRecord(raw)) return [];
	const dataNode = isPlainRecord(raw.data) ? raw.data : raw;
	const logs = dataNode.logs;
	if (!Array.isArray(logs)) return [];
	return logs.filter(isPlainRecord);
}

function staffAuditEntryToRecord(entry: StaffActionAuditEntry): Record<string, unknown> {
	return {
		id: entry.id,
		actionType: entry.actionType,
		entityType: entry.entityType,
		entityId: entry.entityId,
		patientId: entry.patientId,
		actorUserId: entry.actorUserId,
		actorRole: entry.actorRole,
		actorName: entry.actorName,
		details: entry.details,
		reason: entry.reason,
		organizationId: entry.organizationId,
		clientTimestamp: entry.clientTimestamp,
	};
}
import {
	AuditLogFilterBar,
	filterStaffAuditRows,
	normalizeAuditRow,
	type StaffAuditRow,
} from "../auditModules/AuditLogFilterBar";
import { AuditLogEventsTable } from "../auditModules/AuditLogEventsTable";

export type { StaffAuditRow };

// Clean category filters: "Финансы и оплата" (без 54-ФЗ, 152-ФЗ, 043/у)
// Actions: Открытие карты пациента, Приём оплаты, Возврат средств, Экспорт данных

export function StaffActionJournalSection(): React.JSX.Element {
	const [rows, setRows] = useState<StaffAuditRow[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [actionCategory, setActionCategory] = useState<string>("all");
	const [operationFilter, setOperationFilter] = useState<string>("all");
	const [actorFilter, setActorFilter] = useState<string>("all");
	const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
	const abortControllerRef = useRef<AbortController | null>(null);

	const loadJournal = useCallback(async () => {
		abortControllerRef.current?.abort();
		const controller = new AbortController();
		abortControllerRef.current = controller;
		setIsLoading(true);
		try {
			const headers = denteAdminSecretRequestHeaders({ "Content-Type": "application/json" });
			const response = await fetch("/api/audit/logs?limit=100", {
				headers,
				signal: controller.signal,
			});
			const rawList: Array<Record<string, unknown>> = [];

			if (response.ok) {
				const data: unknown = await response.json();
				rawList.push(...extractAuditLogsList(data));
			}

			// Add offline local records from clientLogger
			const offline = clientLogger.getOfflineStaffAuditBuffer();
			for (const entry of offline) {
				rawList.push(staffAuditEntryToRecord(entry));
			}

			const mapped = rawList.map(normalizeAuditRow);
			// Sort newest first
			mapped.sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
			);
			if (!controller.signal.aborted) {
				setRows(mapped);
			}
		} catch (err) {
			if (controller.signal.aborted || (err instanceof Error && err.name === "AbortError")) {
				return;
			}
			clientLogger.warn("[StaffActionJournalSection] Ошибка загрузки журнала:", err);
		} finally {
			if (!controller.signal.aborted) {
				setIsLoading(false);
			}
		}
	}, []);

	useEffect(() => {
		void loadJournal();
		return () => {
			abortControllerRef.current?.abort();
		};
	}, [loadJournal]);

	const availableActors = useMemo(() => {
		const set = new Set<string>();
		rows.forEach((r) => {
			if (r.actorName && r.actorName !== "Сотрудник клиники") {
				set.add(r.actorName);
			}
		});
		return Array.from(set).sort();
	}, [rows]);

	const filteredRows = useMemo(() => {
		return filterStaffAuditRows(rows, {
			searchQuery,
			actionCategory,
			operationFilter,
			actorFilter,
		});
	}, [rows, searchQuery, actionCategory, operationFilter, actorFilter]);

	const formatDateTimeRu = (iso: string) => {
		try {
			const d = new Date(iso);
			return `${d.toLocaleDateString("ru-RU")} ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
		} catch (err) {
			clientLogger.warn("[StaffActionJournal] Failed to format audit timestamp:", err);
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
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					flexWrap: "wrap",
					gap: "8px",
				}}
			>
				<div>
					<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
						<History size={18} className="text-teal-600" aria-hidden="true" />
						<h3
							style={{
								margin: 0,
								fontSize: "15px",
								fontWeight: 700,
								color: "var(--ink, #0f172a)",
							}}
						>
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
					<p
						style={{
							margin: "2px 0 0 0",
							fontSize: "12px",
							color: "var(--muted, #64748b)",
						}}
					>
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
						<RefreshCw
							size={14}
							className={isLoading ? "animate-spin" : ""}
							aria-hidden="true"
						/>
						<span>{isLoading ? "Загрузка…" : "Обновить"}</span>
					</button>
				</div>
			</div>

			<AuditLogFilterBar
				searchQuery={searchQuery}
				onSearchQueryChange={setSearchQuery}
				actionCategory={actionCategory}
				onActionCategoryChange={setActionCategory}
				operationFilter={operationFilter}
				onOperationFilterChange={setOperationFilter}
				actorFilter={actorFilter}
				onActorFilterChange={setActorFilter}
				availableActors={availableActors}
			/>

			<AuditLogEventsTable
				rows={filteredRows}
				expandedRowId={expandedRowId}
				onToggleExpand={(id) =>
					setExpandedRowId((prev) => (prev === id ? null : id))
				}
				formatDateTimeRu={formatDateTimeRu}
			/>
		</section>
	);
}

export default StaffActionJournalSection;
