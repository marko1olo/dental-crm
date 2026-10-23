/**
 * DENTE Dental CRM — Leads Kanban Pipeline Stages & Visual Constants
 * Clean clinical Russian language per Mandate 8x & Creator's Law
 * Canonical 4-stage Funnel SSOT: new -> qualified -> consultation -> booked_arrived
 */

import { CalendarClock, PhoneCall, PhoneMissed, Plus, Trash2, UserCheck } from "lucide-react";
import React from "react";
import type { LeadStatus } from "../../store/leadsStore";

export type ColumnConfig = {
	id: LeadStatus;
	label: string;
	color: string;
	icon: React.ReactNode;
};
export type LeadsKanbanColumnDef = ColumnConfig;

/**
 * 4 Canonical Stages of the Clinical Patient Acquisition Funnel:
 * 1. new (Новые обращения: звонки, сайт, мессенджеры)
 * 2. contacted (Квалифицированы: потребность выявлена)
 * 3. consult_booked (Консультация: назначен слот в расписании)
 * 4. showed_up (Дошли до клиники: визит состоялся / оформлен пациент)
 */
export const CORE_FUNNEL_COLUMNS: readonly [
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
		id: "contacted",
		label: "Квалифицированы",
		color: "var(--teal-soft)",
		icon: React.createElement(PhoneCall, { size: 15 }),
	},
	{
		id: "consult_booked",
		label: "Консультация",
		color: "var(--teal-soft)",
		icon: React.createElement(CalendarClock, { size: 15 }),
	},
	{
		id: "showed_up",
		label: "Дошли",
		color: "var(--teal-soft)",
		icon: React.createElement(UserCheck, { size: 15 }),
	},
];

/**
 * Default board columns (4 canonical funnel stages)
 */
export const COLUMNS: readonly [
	ColumnConfig,
	ColumnConfig,
	ColumnConfig,
	ColumnConfig,
] = CORE_FUNNEL_COLUMNS;

/**
 * All 6 columns for extended view (including uncontacted / dropped inquiries)
 */
export const ALL_KANBAN_COLUMNS: readonly [
	ColumnConfig,
	ColumnConfig,
	ColumnConfig,
	ColumnConfig,
	ColumnConfig,
	ColumnConfig,
] = [
	CORE_FUNNEL_COLUMNS[0],
	CORE_FUNNEL_COLUMNS[1],
	CORE_FUNNEL_COLUMNS[2],
	CORE_FUNNEL_COLUMNS[3],
	{
		id: "no_answer",
		label: "Недозвон",
		color: "var(--paper-soft)",
		icon: React.createElement(PhoneMissed, { size: 15 }),
	},
	{
		id: "trash",
		label: "Отказ/Архив",
		color: "var(--paper)",
		icon: React.createElement(Trash2, { size: 15 }),
	},
];

export const STAGE_DISPLAY_LABELS: Record<LeadStatus, string> = {
	new: "«Новые»",
	contacted: "«Квалифицированы»",
	consult_booked: "«Консультация»",
	showed_up: "«Дошли»",
	converted: "«Дошли»",
	no_answer: "«Недозвон»",
	trash: "«Отказ/Архив»",
};

/**
 * Sequential stage advancer (1-click transition)
 */
export const NEXT_STAGE_MAP: Partial<
	Record<LeadStatus, { status: LeadStatus; label: string }>
> = {
	new: { status: "contacted", label: "Квалифицировать →" },
	contacted: { status: "consult_booked", label: "Записать на приём →" },
	consult_booked: { status: "showed_up", label: "Отметить визит (прибыл) →" },
	showed_up: { status: "trash", label: "В архив →" },
	converted: { status: "trash", label: "В архив →" },
	no_answer: { status: "new", label: "Вернуть в новые →" },
	trash: { status: "new", label: "Вернуть в новые →" },
};
