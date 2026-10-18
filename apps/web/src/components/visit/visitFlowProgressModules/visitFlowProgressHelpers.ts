import {
	type VisitFlowStepResult,
	type VisitFlowStepStatus,
	visitFlowStepStatusSchema,
	type VisitFlowResult,
} from "@dental/shared";

export interface FlowStepItem {
	readonly label: string;
	readonly key: string;
	readonly status: VisitFlowStepStatus;
	readonly msg: string | null;
}

export function getStatusColor(status: string): string {
	switch (status) {
		case "success":
			return "var(--good, #10b981)";
		case "running":
			return "var(--teal, #0d9488)";
		case "error":
			return "var(--bad, #ef4444)";
		case "skipped":
			return "var(--warn, #f59e0b)";
		default:
			return "var(--muted, #94a3b8)";
	}
}

export function stepStatus(step: VisitFlowStepResult | null | undefined): VisitFlowStepStatus {
	const parsed = visitFlowStepStatusSchema.safeParse(step?.status);
	return parsed.success ? parsed.data : "pending";
}

export function stepMessage(step: VisitFlowStepResult | null | undefined): string | null {
	const message = step?.message;
	return typeof message === "string" && message.trim() ? message : null;
}

export function stepStatusWord(status: string): string {
	switch (status) {
		case "success":
			return "готово";
		case "running":
			return "идет";
		case "error":
			return "не выполнено";
		case "skipped":
			return "пропущено";
		default:
			return "ожидает";
	}
}

export function createFlowSteps(result: VisitFlowResult | null | undefined): FlowStepItem[] {
	return [
		{
			label: "Распознавание",
			key: "draft",
			status: stepStatus(result?.draft),
			msg: stepMessage(result?.draft),
		},
		{
			label: "План лечения",
			key: "plan",
			status: stepStatus(result?.plan),
			msg: stepMessage(result?.plan),
		},
		{
			label: "Рекомендации",
			key: "recommendations",
			status: stepStatus(result?.recommendations),
			msg: stepMessage(result?.recommendations),
		},
		{
			label: "Документы",
			key: "documents",
			status: stepStatus(result?.documents),
			msg: stepMessage(result?.documents),
		},
	];
}
