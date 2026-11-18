import type {
	AiJobKind,
	AiJobStatus,
	AiRecognitionJob,
	AiRecognitionTarget,
} from "@dental/shared";
import { aiJobKindLabels } from "../../../AppConstants";
import type { PanelSubject } from "../../../lib/panelStateText";
import { recognitionTargetLabels } from "../../../workspaceUiLabels";

export const AI_RECOGNITION_JOBS_SUBJECT: PanelSubject = {
	notLoadedTitle: "История AI-задач не загружена",
	accusative: "историю AI-задач",
	emptyTitle: "AI-задач пока нет",
	emptyHint:
		"Распознайте текст в лаборатории выше — запись появится в этой таблице.",
	failureConsequence:
		"Не считайте, что заданий нет: список не прочитан. Обновите после входа или сообщите администратору, если отказ повторяется.",
};

export const STATUS_LABELS: Record<AiJobStatus, string> = {
	queued: "В очереди",
	running: "Выполняется",
	needs_review: "На проверке",
	accepted: "Принято",
	rejected: "Отклонено",
	failed: "Ошибка",
};

export const STATUS_PILL: Record<AiJobStatus, string> = {
	queued: "status-pending",
	running: "status-pending",
	needs_review: "status-confirmed",
	accepted: "status-confirmed",
	rejected: "status-cancelled",
	failed: "status-cancelled",
};

export function isAiJobStatus(value: unknown): value is AiJobStatus {
	return typeof value === "string" && Object.hasOwn(STATUS_LABELS, value);
}

export function isAiJobKind(value: unknown): value is AiJobKind {
	return typeof value === "string" && Object.hasOwn(aiJobKindLabels, value);
}

export function isAiRecognitionTarget(value: unknown): value is AiRecognitionTarget {
	return (
		typeof value === "string" && Object.hasOwn(recognitionTargetLabels, value)
	);
}

export function parseJobsPayload(raw: string): AiRecognitionJob[] | null {
	let parsed: unknown;
	try {
		parsed = raw.trim() ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
	if (!Array.isArray(parsed)) return null;
	const jobs: AiRecognitionJob[] = [];
	for (const item of parsed) {
		if (!item || typeof item !== "object") continue;
		const r = item as Record<string, unknown>;
		if (typeof r.id !== "string" || !r.id) continue;
		if (!isAiJobKind(r.kind)) continue;
		if (!isAiRecognitionTarget(r.target)) continue;
		if (!isAiJobStatus(r.status)) continue;
		jobs.push({
			id: r.id,
			organizationId: typeof r.organizationId === "string" ? r.organizationId : "",
			patientId: typeof r.patientId === "string" ? r.patientId : null,
			imagingStudyId: typeof r.imagingStudyId === "string" ? r.imagingStudyId : null,
			kind: r.kind,
			target: r.target,
			status: r.status,
			sourceLabel: typeof r.sourceLabel === "string" ? r.sourceLabel : "",
			inputText: typeof r.inputText === "string" ? r.inputText : "",
			resultText: typeof r.resultText === "string" ? r.resultText : "",
			confidence: typeof r.confidence === "number" && Number.isFinite(r.confidence) ? r.confidence : 0,
			warnings: Array.isArray(r.warnings) ? r.warnings.filter((w): w is string => typeof w === "string") : [],
			suggestedNextStep: typeof r.suggestedNextStep === "string" ? r.suggestedNextStep : "",
			createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
			updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : "",
		});
	}
	return jobs;
}

export function formatWhen(iso: string): string {
	if (!iso) return "—";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	try {
		return d.toLocaleString("ru-RU", {
			day: "2-digit",
			month: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	} catch {
		return iso;
	}
}

export function previewText(text: string, max = 140): string {
	const t = text.replace(/\s+/g, " ").trim();
	if (!t) return "—";
	if (t.length <= max) return t;
	return `${t.slice(0, max - 1)}…`;
}
