/**
 * apps/web/src/components/settings/auditModules/AuditLogFilterBar.tsx
 *
 * Event filtering bar and pure filter/normalization functions for the Staff Action & Security Audit Journal:
 * - Filter by employee (actor)
 * - Filter by operation type (visit deletion, discount, DB export, receipt refund, etc.)
 * - Filter by category & text search query
 */

import React from "react";
import { Search, X } from "lucide-react";

export interface StaffAuditRow {
	id: string;
	timestamp: string;
	actionType: string;
	actorName: string;
	actorRole: string;
	entityType: string;
	entityId?: string | null;
	ipAddress?: string | null;
	reason?: string | null;
	amountKopecks?: number | null;
	discountPercent?: number | null;
	oldState?: Record<string, unknown> | null;
	newState?: Record<string, unknown> | null;
}

export const ACTION_LABELS: Record<string, { label: string; badgeClass: string }> = {
	emr_open: {
		label: "Открытие карты пациента",
		badgeClass: "text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/30",
	},
	diagnosis_change: {
		label: "Изменение диагноза",
		badgeClass: "text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/30",
	},
	service_add: {
		label: "Добавление услуги",
		badgeClass: "text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/30",
	},
	service_remove: {
		label: "Удаление услуги",
		badgeClass: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30",
	},
	discount_apply: {
		label: "Ручная скидка",
		badgeClass: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30",
	},
	payment_receive: {
		label: "Приём оплаты",
		badgeClass: "text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/30",
	},
	payment_refund: {
		label: "Возврат чека",
		badgeClass: "text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/30",
	},
	appointment_cancel: {
		label: "Отмена приёма",
		badgeClass: "text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/30",
	},
	appointment_create: {
		label: "Запись на приём",
		badgeClass: "text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/30",
	},
	appointment_reschedule: {
		label: "Перенос приёма",
		badgeClass: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30",
	},
	appointment_delete: {
		label: "Удаление визита",
		badgeClass: "text-rose-700 dark:text-rose-300 bg-rose-500/10 border-rose-500/30",
	},
	document_print: {
		label: "Печать документа",
		badgeClass: "text-[var(--ink)] bg-[var(--paper-soft)] border-[var(--line)]",
	},
	document_export: {
		label: "Экспорт базы",
		badgeClass: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30",
	},
	price_edit: {
		label: "Правка прейскуранта",
		badgeClass: "text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30",
	},
	auth_login: {
		label: "Вход сотрудника",
		badgeClass: "text-[var(--ink)] bg-[var(--paper-soft)] border-[var(--line)]",
	},
	auth_logout: {
		label: "Выход сотрудника",
		badgeClass: "text-[var(--ink)] bg-[var(--paper-soft)] border-[var(--line)]",
	},
	diary_revision: {
		label: "Правка дневника",
		badgeClass: "text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/30",
	},
};

export const AUDIT_CATEGORY_FILTERS = [
	{ key: "all", label: "Все действия" },
	{ key: "clinical", label: "Клинические" },
	{ key: "financial", label: "Финансы и оплата" },
	{ key: "schedule", label: "Расписание" },
	{ key: "security", label: "Безопасность" },
] as const;

export const CRITICAL_OPERATION_FILTERS = [
	{ key: "all", label: "Все типы операций" },
	{ key: "appointment_delete", label: "Удаление визита" },
	{ key: "discount_apply", label: "Ручная скидка" },
	{ key: "document_export", label: "Экспорт базы" },
	{ key: "payment_refund", label: "Возврат чека" },
	{ key: "price_edit", label: "Правка прайса" },
] as const;

export function normalizeAuditRow(raw: Record<string, unknown>): StaffAuditRow {
	const details = (raw.details || raw.meta || {}) as Record<string, unknown>;
	const actionType = String(raw.actionType || raw.action || raw.eventType || "custom_action");
	const id = String(raw.id || `audit-${Date.now()}-${Math.random()}`);
	const timestamp = String(
		raw.createdAt || raw.clientTimestamp || raw.timestamp || new Date().toISOString(),
	);
	const actorName = String(
		raw.actorName || raw.actorLogin || raw.actorFullName || "Сотрудник клиники",
	);
	const actorRole = String(raw.actorRole || "staff");
	const entityType = String(raw.entityType || "clinical");
	const entityId = raw.entityId ? String(raw.entityId) : null;
	const ipAddress =
		typeof raw.ipAddress === "string"
			? raw.ipAddress
			: typeof details.ipAddress === "string"
				? details.ipAddress
				: null;
	const reason =
		typeof raw.reason === "string"
			? raw.reason
			: typeof details.reason === "string"
				? details.reason
				: null;
	const amountKopecks =
		typeof details.amountKopecks === "number" ? details.amountKopecks : null;
	const discountPercent =
		typeof details.discountPercent === "number" ? details.discountPercent : null;
	const oldState =
		details.oldState && typeof details.oldState === "object"
			? (details.oldState as Record<string, unknown>)
			: null;
	const newState =
		details.newState && typeof details.newState === "object"
			? (details.newState as Record<string, unknown>)
			: null;

	return {
		id,
		timestamp,
		actionType,
		actorName,
		actorRole,
		entityType,
		entityId,
		ipAddress,
		reason,
		amountKopecks,
		discountPercent,
		oldState,
		newState,
	};
}

export interface AuditLogFilterCriteria {
	searchQuery: string;
	actionCategory: string;
	operationFilter?: string;
	actorFilter?: string;
}

export function filterStaffAuditRows(
	rows: StaffAuditRow[],
	criteria: AuditLogFilterCriteria,
): StaffAuditRow[] {
	const {
		searchQuery,
		actionCategory,
		operationFilter = "all",
		actorFilter = "all",
	} = criteria;

	return rows.filter((row) => {
		if (actionCategory !== "all") {
			if (
				actionCategory === "clinical" &&
				![
					"emr_open",
					"diagnosis_change",
					"service_add",
					"service_remove",
					"diary_revision",
				].includes(row.actionType)
			) {
				return false;
			}
			if (
				actionCategory === "financial" &&
				![
					"payment_receive",
					"payment_refund",
					"discount_apply",
					"price_edit",
				].includes(row.actionType)
			) {
				return false;
			}
			if (
				actionCategory === "schedule" &&
				![
					"appointment_cancel",
					"appointment_create",
					"appointment_reschedule",
					"appointment_delete",
				].includes(row.actionType)
			) {
				return false;
			}
			if (
				actionCategory === "security" &&
				!["auth_login", "auth_logout", "document_export"].includes(row.actionType)
			) {
				return false;
			}
		}

		if (operationFilter !== "all" && row.actionType !== operationFilter) {
			return false;
		}

		if (actorFilter !== "all" && row.actorName !== actorFilter) {
			return false;
		}

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase().trim();
			const actorMatch = row.actorName.toLowerCase().includes(query);
			const reasonMatch = (row.reason || "").toLowerCase().includes(query);
			const actionMatch = (ACTION_LABELS[row.actionType]?.label || row.actionType)
				.toLowerCase()
				.includes(query);
			const roleMatch = row.actorRole.toLowerCase().includes(query);
			if (!actorMatch && !reasonMatch && !actionMatch && !roleMatch) return false;
		}

		return true;
	});
}

export interface AuditLogFilterBarProps {
	searchQuery: string;
	onSearchQueryChange: (val: string) => void;
	actionCategory: string;
	onActionCategoryChange: (val: string) => void;
	operationFilter: string;
	onOperationFilterChange: (val: string) => void;
	actorFilter: string;
	onActorFilterChange: (val: string) => void;
	availableActors: string[];
}

export function AuditLogFilterBar({
	searchQuery,
	onSearchQueryChange,
	actionCategory,
	onActionCategoryChange,
	operationFilter,
	onOperationFilterChange,
	actorFilter,
	onActorFilterChange,
	availableActors,
}: AuditLogFilterBarProps) {
	return (
		<div className="flex flex-wrap items-center gap-2" data-testid="audit-log-filter-bar">
			<div className="dente-search-wrap flex-1 min-w-[200px]">
				<Search size={14} className="dente-search-icon" />
				<input
					type="text"
					value={searchQuery}
					onChange={(e) => onSearchQueryChange(e.target.value)}
					placeholder="Поиск по сотруднику, причине или действию…"
					className="dente-search-input"
				/>
				{searchQuery && (
					<button
						type="button"
						onClick={() => onSearchQueryChange("")}
						className="dente-search-clear"
						aria-label="Очистить поиск"
					>
						<X size={13} />
					</button>
				)}
			</div>

			<select
				value={operationFilter}
				onChange={(e) => onOperationFilterChange(e.target.value)}
				className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer min-h-[32px]"
				aria-label="Фильтр по типу операции"
				data-testid="audit-operation-type-select"
			>
				{CRITICAL_OPERATION_FILTERS.map((op) => (
					<option key={op.key} value={op.key}>
						{op.label}
					</option>
				))}
			</select>

			{availableActors.length > 0 && (
				<select
					value={actorFilter}
					onChange={(e) => onActorFilterChange(e.target.value)}
					className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] cursor-pointer min-h-[32px]"
					aria-label="Фильтр по сотруднику"
					data-testid="audit-actor-select"
				>
					<option value="all">Все сотрудники</option>
					{availableActors.map((actor) => (
						<option key={actor} value={actor}>
							{actor}
						</option>
					))}
				</select>
			)}

			<div className="dente-filter-chips">
				{AUDIT_CATEGORY_FILTERS.map((cat) => (
					<button
						key={cat.key}
						type="button"
						onClick={() => onActionCategoryChange(cat.key)}
						className={`dente-filter-chip min-h-[32px] ${actionCategory === cat.key ? "active" : ""}`}
						data-active={actionCategory === cat.key}
					>
						{cat.label}
					</button>
				))}
			</div>
		</div>
	);
}
