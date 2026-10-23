/**
 * DENTE Dental CRM — Leads Kanban Types & Central Facade
 * Mandate 8e, Mandate 8n, Mandate 8b (<= 120 lines)
 * 4-Stage Funnel SSOT: new -> qualified -> consultation -> booked_arrived
 */

import type { Lead, LeadStatus } from "../../store/leadsStore";
import {
	ALL_KANBAN_COLUMNS,
	COLUMNS,
	CORE_FUNNEL_COLUMNS,
	type ColumnConfig,
} from "./leadsKanbanConstants";

export * from "./leadsKanbanBooking";
export * from "./leadsKanbanConstants";
export * from "./leadsKanbanSla";
export * from "./leadsKanbanSorting";
export type { Lead, LeadStatus };

/**
 * Проверяет принадлежность статуса лида к колонке клинического канбана:
 * 4 канонические стадии:
 * [ Новые ] -> [ Квалифицированы ] -> [ Консультация ] -> [ Дошли ]
 */
export function isLeadInKanbanColumn(
	leadStatus: LeadStatus | string | null | undefined,
	columnId: LeadStatus,
): boolean {
	if (!leadStatus || leadStatus === "new") {
		return columnId === "new";
	}
	if (leadStatus === "contacted") {
		return columnId === "contacted";
	}
	if (leadStatus === "consult_booked") {
		return columnId === "consult_booked";
	}
	if (leadStatus === "showed_up" || leadStatus === "converted") {
		return columnId === "showed_up";
	}
	if (leadStatus === "no_answer") {
		return columnId === "no_answer" || columnId === "trash";
	}
	if (leadStatus === "trash") {
		return columnId === "trash";
	}
	return leadStatus === columnId;
}

/**
 * Возвращает конфигурацию канонической колонки для любого статуса лида
 */
export function getKanbanColumnForLeadStatus(
	status?: LeadStatus | string | null,
): ColumnConfig {
	if (!status || status === "new") {
		return CORE_FUNNEL_COLUMNS[0];
	}
	if (status === "contacted") {
		return CORE_FUNNEL_COLUMNS[1];
	}
	if (status === "consult_booked") {
		return CORE_FUNNEL_COLUMNS[2];
	}
	if (status === "showed_up" || status === "converted") {
		return CORE_FUNNEL_COLUMNS[3];
	}
	if (status === "no_answer") {
		return ALL_KANBAN_COLUMNS[4];
	}
	return ALL_KANBAN_COLUMNS[5];
}
