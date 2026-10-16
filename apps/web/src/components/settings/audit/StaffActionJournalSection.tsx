/**
 * apps/web/src/components/settings/audit/StaffActionJournalSection.tsx
 *
 * Staff Action & Security Audit Journal.
 * Delegates filtering and event rendering to auditModules/AuditLogFilterBar and AuditLogEventsTable.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import clientLogger from "../../../services/logging/clientLogger";
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
			mapped.sort(
				(a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
			);
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
