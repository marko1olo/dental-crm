/**
 * DENTE Dental CRM — Leads Kanban Types & Central Facade
 * Mandate 8e, Mandate 8n, Mandate 8b (<= 120 lines)
 */

import type { Lead, LeadStatus } from "../../store/leadsStore";
import { COLUMNS, type ColumnConfig } from "./leadsKanbanConstants";

export type { Lead, LeadStatus };
export * from "./leadsKanbanBooking";
export * from "./leadsKanbanConstants";
export * from "./leadsKanbanSla";
export * from "./leadsKanbanSorting";

/**
 * Проверяет принадлежность статуса лида к одной из 4 канонических колонок канбана.
 * Обратная совместимость для существующих статусов в БД:
 * - new -> new ("Новые обращения")
 * - contacted -> contacted ("Думают / Перезвонить")
 * - consult_booked, showed_up, converted -> consult_booked ("Записаны на приём")
 * - trash, no_answer -> trash ("Не дошли / Архив")
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
	if (
		leadStatus === "consult_booked" ||
		leadStatus === "showed_up" ||
		leadStatus === "converted"
	) {
		return columnId === "consult_booked";
	}
	if (leadStatus === "trash" || leadStatus === "no_answer") {
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
		return COLUMNS[0];
	}
	if (status === "contacted") {
		return COLUMNS[1];
	}
	if (
		status === "consult_booked" ||
		status === "showed_up" ||
		status === "converted"
	) {
		return COLUMNS[2];
	}
	return COLUMNS[3];
}
