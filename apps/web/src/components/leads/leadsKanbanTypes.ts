/**
 * DENTE Dental CRM — Leads Kanban Types & Central Facade
 * Mandate 8e, Mandate 8n, Mandate 8b (<= 120 lines)
 */

import type { Lead, LeadStatus } from "../../store/leadsStore";
import { COLUMNS, type ColumnConfig } from "./leadsKanbanConstants";

export * from "./leadsKanbanBooking";
export * from "./leadsKanbanConstants";
export * from "./leadsKanbanSla";
export * from "./leadsKanbanSorting";
export type { Lead, LeadStatus };

/**
 * Проверяет принадлежность статуса лида к одной из 4 канонических колонок клинического канбана:
 * [ Новые обращения ] -> [ Записаны на приём ] -> [ Дошли до клиники ] -> [ Архив / Спам ]
 * Обратная совместимость для всех промежуточных статусов в БД:
 * - new, contacted -> new ("Новые обращения")
 * - consult_booked -> consult_booked ("Записаны на приём")
 * - showed_up, converted -> showed_up ("Дошли до клиники")
 * - trash, no_answer -> trash ("Архив / Спам")
 */
export function isLeadInKanbanColumn(
	leadStatus: LeadStatus | string | null | undefined,
	columnId: LeadStatus,
): boolean {
	if (!leadStatus || leadStatus === "new" || leadStatus === "contacted") {
		return columnId === "new";
	}
	if (leadStatus === "consult_booked") {
		return columnId === "consult_booked";
	}
	if (leadStatus === "showed_up" || leadStatus === "converted") {
		return columnId === "showed_up";
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
	if (!status || status === "new" || status === "contacted") {
		return COLUMNS[0];
	}
	if (status === "consult_booked") {
		return COLUMNS[1];
	}
	if (status === "showed_up" || status === "converted") {
		return COLUMNS[2];
	}
	return COLUMNS[3];
}
