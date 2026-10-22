import { z } from "zod";

export type PipelineStage =
	| "requires_budget"
	| "awaiting_decision"
	| "no_appointment"
	| "in_progress_abandoned"
	| "completed";

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
	budgetToken?: string | null;
	budgetStatus?: string | null;
	hasFutureAppointment: boolean;
	nextAppointmentDate?: string | null;
	lastAppointmentDate?: string | null;
	isDropoutRisk: boolean;
}

export interface PipelineAnalytics {
	acceptanceRatePercent: number;
	averagePlanRub: number;
	totalPipelineRub: number;
	totalPlansCount: number;
	dropoutRiskCount: number;
}

export interface PipelineResponseSummary {
	counts: Record<PipelineStage | "total", number>;
	totalsRub: Record<PipelineStage | "total", number>;
	analytics: PipelineAnalytics;
}

export const treatmentPlanQuerySchema = z.object({
	doctorId: z.string().uuid("Идентификатор врача должен быть корректным UUID").optional(),
	search: z.string().max(100, "Поисковый запрос не должен превышать 100 символов").optional(),
	limit: z.coerce.number().int("Лимит должен быть целым числом").positive("Лимит должен быть положительным").max(1000).optional(),
	offset: z.coerce.number().int("Смещение должно быть целым числом").min(0).optional(),
	stage: z.enum([
		"requires_budget",
		"awaiting_decision",
		"no_appointment",
		"in_progress_abandoned",
		"completed",
	], { errorMap: () => ({ message: "Недопустимый этап воронки планов лечения" }) }).optional(),
	startDate: z.string().datetime({ message: "Дата начала должна быть в формате ISO" }).optional(),
	endDate: z.string().datetime({ message: "Дата окончания должна быть в формате ISO" }).optional(),
});

export type TreatmentPlanQuery = z.infer<typeof treatmentPlanQuerySchema>;
