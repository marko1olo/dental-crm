/**
 * DENTE Dental CRM — Leads Kanban Pipeline Stages & Visual Constants
 * Clean clinical Russian language per Mandate 8x & Creator's Law
 */

import React from "react";
import { CalendarClock, Phone, Plus, Trash2 } from "lucide-react";
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
		id: "contacted",
		label: "Думают / Перезвонить",
		color: "var(--amber-soft)",
		icon: React.createElement(Phone, { size: 15 }),
	},
	{
		id: "consult_booked",
		label: "Записаны на приём",
		color: "var(--teal-soft)",
		icon: React.createElement(CalendarClock, { size: 15 }),
	},
	{
		id: "trash",
		label: "Не дошли / Архив",
		color: "var(--paper)",
		icon: React.createElement(Trash2, { size: 15 }),
	},
];

export const CORE_FUNNEL_COLUMNS = COLUMNS;

export const STAGE_DISPLAY_LABELS: Record<LeadStatus, string> = {
	new: "«Новые обращения»",
	contacted: "«Думают / Перезвонить»",
	consult_booked: "«Записаны на приём»",
	showed_up: "«Записаны на приём»",
	converted: "«Записаны на приём»",
	no_answer: "«Не дошли / Архив»",
	trash: "«Не дошли / Архив»",
};

export const NEXT_STAGE_MAP: Partial<
	Record<LeadStatus, { status: LeadStatus; label: string }>
> = {
	new: { status: "contacted", label: "Звонок / Квалификация →" },
	contacted: { status: "consult_booked", label: "Записать на приём →" },
	consult_booked: { status: "trash", label: "В архив →" },
	showed_up: { status: "trash", label: "В архив →" },
	converted: { status: "trash", label: "В архив →" },
	no_answer: { status: "new", label: "Восстановить обращение →" },
	trash: { status: "new", label: "Восстановить обращение →" },
};
