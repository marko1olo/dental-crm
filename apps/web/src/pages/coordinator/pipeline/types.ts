export type PipelineStage =
	| "requires_budget"
	| "awaiting_decision"
	| "no_appointment"
	| "in_progress_abandoned"
	| "completed";

export type PipelineStageFilter = "all" | PipelineStage;
export type PipelineViewMode = "horizontal" | "kanban";

export interface PipelineCard {
	id: string;
	name: string;
	title: string;
	status: string;
	stage: PipelineStage;
	patientId: string;
	patientName: string;
	patientPhone: string | null;
	doctorId: string | null;
	doctorName: string | null;
	totalPriceRub: number;
	discountRub: number;
	netTotalRub: number;
	itemsCount: number;
	createdAt: string;
	updatedAt: string;
	lastActivityAt: string;
	daysSinceLastActivity: number;
	budgetToken?: string | null | undefined;
	budgetStatus?: string | null | undefined;
	hasFutureAppointment: boolean;
	nextAppointmentDate?: string | null | undefined;
	lastAppointmentDate?: string | null | undefined;
}

export interface PipelineResponse {
	pipeline: Record<PipelineStage, PipelineCard[]>;
	summary: {
		counts: Record<PipelineStage | "total", number>;
		totalsRub: Record<PipelineStage | "total", number>;
	};
}

export const STAGE_CONFIG: Record<
	PipelineStage,
	{
		title: string;
		shortTitle: string;
		hint: string;
		accentColor: string;
		badgeBg: string;
		badgeBorder: string;
		badgeText: string;
	}
> = {
	requires_budget: {
		title: "Требуется смета",
		shortTitle: "Смета",
		hint: "Черновики без расчета",
		accentColor: "var(--amber, #f59e0b)",
		badgeBg: "rgba(245, 158, 11, 0.12)",
		badgeBorder: "rgba(245, 158, 11, 0.3)",
		badgeText: "var(--amber, #f59e0b)",
	},
	awaiting_decision: {
		title: "Ожидает решения",
		shortTitle: "Решение",
		hint: "Смета у пациента",
		accentColor: "var(--cyan, #06b6d4)",
		badgeBg: "rgba(6, 182, 212, 0.12)",
		badgeBorder: "rgba(6, 182, 212, 0.3)",
		badgeText: "var(--cyan, #06b6d4)",
	},
	no_appointment: {
		title: "Без записи",
		shortTitle: "Запись",
		hint: "Одобрено, без записи",
		accentColor: "var(--teal, #0d9488)",
		badgeBg: "rgba(13, 148, 136, 0.12)",
		badgeBorder: "rgba(13, 148, 136, 0.3)",
		badgeText: "var(--teal, #0d9488)",
	},
	in_progress_abandoned: {
		title: "Брошенные (>30д)",
		shortTitle: "Пауза",
		hint: "Пауза >30 дней",
		accentColor: "var(--rose, #f43f5e)",
		badgeBg: "rgba(244, 63, 94, 0.12)",
		badgeBorder: "rgba(244, 63, 94, 0.3)",
		badgeText: "var(--rose, #f43f5e)",
	},
	completed: {
		title: "Завершенные",
		shortTitle: "Готово",
		hint: "План закрыт",
		accentColor: "var(--emerald, #10b981)",
		badgeBg: "rgba(16, 185, 129, 0.12)",
		badgeBorder: "rgba(16, 185, 129, 0.3)",
		badgeText: "var(--emerald, #10b981)",
	},
};

export const PIPELINE_STAGES: PipelineStage[] = [
	"requires_budget",
	"awaiting_decision",
	"no_appointment",
	"in_progress_abandoned",
	"completed",
];

export function formatRub(val: number): string {
	return `${Math.round(val).toLocaleString("ru-RU")} ₽`;
}
