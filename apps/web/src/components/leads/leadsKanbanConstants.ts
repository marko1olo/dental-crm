/**
 * DENTE Dental CRM — Leads Kanban Pipeline Stages & Visual Constants
 * Clean clinical Russian language per Mandate 8x & Creator's Law
 */

import { CalendarClock, Plus, Trash2, UserCheck } from "lucide-react";
import React from "react";
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
		label: "Новые",
		color: "var(--teal-soft)",
		icon: React.createElement(Plus, { size: 15 }),
	},
	{
		id: "consult_booked",
		label: "Назначен приём",
		color: "var(--teal-soft)",
		icon: React.createElement(CalendarClock, { size: 15 }),
	},
	{
		id: "showed_up",
		label: "Дошли",
		color: "var(--teal-soft)",
		icon: React.createElement(UserCheck, { size: 15 }),
	},
	{
		id: "trash",
		label: "Отказ/Архив",
		color: "var(--paper)",
		icon: React.createElement(Trash2, { size: 15 }),
	},
];

export const CORE_FUNNEL_COLUMNS = COLUMNS;

export const STAGE_DISPLAY_LABELS: Record<LeadStatus, string> = {
	new: "«Новые»",
	contacted: "«Новые»",
	consult_booked: "«Назначен приём»",
	showed_up: "«Дошли»",
	converted: "«Дошли»",
	no_answer: "«Отказ/Архив»",
	trash: "«Отказ/Архив»",
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
