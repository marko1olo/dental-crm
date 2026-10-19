/**
 * DENTE Dental CRM — Leads Kanban Pipeline Stages & Visual Constants
 * Clean clinical Russian language per Mandate 8x & Creator's Law
 */

import React from "react";
import { CalendarClock, Plus, Trash2, UserCheck } from "lucide-react";
import type { LeadStatus } from "../../store/leadsStore";

export type ColumnConfig = {
	id: LeadStatus;
	label: string;
	color: string;
	icon: React.ReactNode;
};
export type LeadsKanbanColumnDef = ColumnConfig;

export const COLUMNS: readonly [
	ColumnConfig,
	ColumnConfig,
	ColumnConfig,
	ColumnConfig,
] = [
	{
		id: "new",
		label: "Новые обращения",
		color: "var(--teal-soft)",
		icon: React.createElement(Plus, { size: 15 }),
	},
	{
		id: "consult_booked",
		label: "Записаны на приём",
		color: "var(--teal-soft)",
		icon: React.createElement(CalendarClock, { size: 15 }),
	},
	{
		id: "showed_up",
		label: "Дошли до клиники",
		color: "var(--teal-soft)",
		icon: React.createElement(UserCheck, { size: 15 }),
	},
	{
		id: "trash",
		label: "Архив / Спам",
		color: "var(--paper)",
		icon: React.createElement(Trash2, { size: 15 }),
	},
];

export const CORE_FUNNEL_COLUMNS = COLUMNS;

export const STAGE_DISPLAY_LABELS: Record<LeadStatus, string> = {
	new: "«Новые обращения»",
	contacted: "«Новые обращения»",
	consult_booked: "«Записаны на приём»",
	showed_up: "«Дошли до клиники»",
	converted: "«Дошли до клиники»",
	no_answer: "«Архив / Спам»",
	trash: "«Архив / Спам»",
};

export const NEXT_STAGE_MAP: Partial<
	Record<LeadStatus, { status: LeadStatus; label: string }>
> = {
	new: { status: "consult_booked", label: "Записать на приём →" },
	contacted: { status: "consult_booked", label: "Записать на приём →" },
	consult_booked: { status: "showed_up", label: "Отметить визит (прибыл) →" },
	showed_up: { status: "trash", label: "В архив →" },
	converted: { status: "trash", label: "В архив →" },
	no_answer: { status: "new", label: "Вернуть в новые →" },
	trash: { status: "new", label: "Вернуть в новые →" },
};

