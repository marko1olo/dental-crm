/**
 * DENTE Dental CRM — Leads Funnel Stage Types & Pipeline Definitions
 * Mandate 8s (Anti-Bloat & Modular Architecture)
 */

import type { Lead, LeadStatus } from "../../../store/leadsStore";

export type LeadFunnelStageKey =
	| "new"
	| "contacted"
	| "consult_booked"
	| "showed_up"
	| "treatment_plan_accepted"
	| "paid";

export interface FunnelStageConfig {
	readonly key: LeadFunnelStageKey;
	readonly index: number;
	readonly label: string;
	readonly shortLabel: string;
	readonly description: string;
	readonly color: string;
	readonly badgeColor: string;
}

export const FUNNEL_STAGES: readonly FunnelStageConfig[] = [
	{
		key: "new",
		index: 0,
		label: "Новые обращения",
		shortLabel: "Лид получен",
		description: "Входящие заявки со всех каналов маркетинга",
		color: "var(--teal)",
		badgeColor: "rgba(15, 118, 110, 0.15)",
	},
	{
		key: "contacted",
		index: 1,
		label: "Думают / Перезвонить",
		shortLabel: "Квалифицирован",
		description: "Установлен контакт, выявлена потребность",
		color: "var(--accent)",
		badgeColor: "rgba(59, 130, 246, 0.15)",
	},
	{
		key: "consult_booked",
		index: 2,
		label: "Записаны на прием",
		shortLabel: "Записан",
		description: "Назначено время в расписании и кресло врача",
		color: "var(--accent)",
		badgeColor: "rgba(99, 102, 241, 0.15)",
	},
	{
		key: "showed_up",
		index: 3,
		label: "Дошли до клиники",
		shortLabel: "Визит состоялся",
		description: "Пациент явился на консультацию / осмотр",
		color: "var(--warn-fg)",
		badgeColor: "rgba(245, 158, 11, 0.15)",
	},
	{
		key: "treatment_plan_accepted",
		index: 4,
		label: "Согласован план лечения",
		shortLabel: "План принят",
		description: "Смета и план лечения утверждены пациентом",
		color: "var(--accent)",
		badgeColor: "rgba(139, 92, 246, 0.15)",
	},
	{
		key: "paid",
		index: 5,
		label: "Оплачено в кассу",
		shortLabel: "Оплачено",
		description: "Внесена оплата / первичный чек пробит в кассе",
		color: "var(--ok-fg)",
		badgeColor: "rgba(16, 185, 129, 0.15)",
	},
] as const;

export interface FunnelLead
	extends Omit<Partial<Lead>, "status" | "expectedRevenue" | "createdAt"> {
	id: string;
	name: string;
	phone?: string | undefined;
	source?: string | undefined;
	status: LeadStatus | string;
	expectedRevenue?: string | number | null | undefined;
	createdAt?: string | Date | null | undefined;
	showedUp?: boolean | undefined;
	treatmentPlanAgreed?: boolean | undefined;
	isPaid?: boolean | undefined;
	paidAmountRub?: number | undefined;
	paidAmountKopecks?: number | undefined;
	actualRevenueRub?: number | undefined;
	stageReached?: LeadFunnelStageKey | undefined;
}

export type FunnelTimePeriod =
	| "today"
	| "week"
	| "month"
	| "quarter"
	| "year"
	| "all";

export const FUNNEL_PERIOD_OPTIONS: readonly { id: FunnelTimePeriod; label: string; days: number }[] = [
	{ id: "today", label: "Сегодня", days: 1 },
	{ id: "week", label: "7 дней", days: 7 },
	{ id: "month", label: "Месяц (30 дн.)", days: 30 },
	{ id: "quarter", label: "Квартал (90 дн.)", days: 90 },
	{ id: "year", label: "Год", days: 365 },
	{ id: "all", label: "Все время", days: 0 },
] as const;
