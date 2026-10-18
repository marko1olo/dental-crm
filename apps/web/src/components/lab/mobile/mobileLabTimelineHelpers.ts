import type { DentalLabOrderData } from "../labMath";

export const MOBILE_LAB_STAGES = [
	{ id: "impression", label: "Слепок" },
	{ id: "framework", label: "Каркас" },
	{ id: "ceramic", label: "Керамика" },
	{ id: "delivery", label: "Сдача" },
] as const;

export function getOrderStageIndex(order: DentalLabOrderData): number {
	const status = (order.status || "").toLowerCase();
	const stage = ((order as any).stage || order.currentStage || "").toLowerCase();

	if (status === "completed" || status === "delivered_to_patient" || status === "installed_completed" || stage === "patient_fixation") {
		return 3;
	}
	if (["ready", "ready_in_clinic", "shipped", "delivered", "received", "fitting", "refitting", "try_in"].includes(status) ||
		["ceramic_layering", "ready_in_clinic", "fitting_in_mouth"].includes(stage)) {
		return 2;
	}
	if (status === "in_progress" || ["cad_modeling", "milling_casting", "framework_fitting", "milling_framework"].includes(stage)) {
		return 1;
	}
	return 0;
}

export function formatMobileDeadlineAndTimer(order: DentalLabOrderData): {
	text: string;
	isUrgent: boolean;
	isReady: boolean;
} {
	if (order.status === "completed" || order.status === "delivered_to_patient") {
		return { text: "Зафиксировано в полости рта", isUrgent: false, isReady: true };
	}
	const dateStr = order.scheduledVisitDate || order.fittingDate || order.dueDate;
	if (!dateStr) return { text: "Срок уточняется лабораторией", isUrgent: false, isReady: false };

	const targetDate = new Date(dateStr);
	if (Number.isNaN(targetDate.getTime())) return { text: "Срок уточняется", isUrgent: false, isReady: false };

	const now = new Date();
	const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
	const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
	const diffDays = Math.round((targetMidnight - todayMidnight) / (24 * 3600 * 1000));

	const isFitting = order.status === "fitting" || order.status === "ready_in_clinic" || order.status === "try_in";
	const prefix = isFitting ? "Примерка: " : "Сдача: ";

	if (diffDays < 0) return { text: `${prefix}Просрочено на ${Math.abs(diffDays)} дн.`, isUrgent: true, isReady: false };
	if (diffDays === 0) return { text: `${prefix}Сегодня в 14:00`, isUrgent: false, isReady: true };
	if (diffDays === 1) return { text: `${prefix}Завтра в 14:00`, isUrgent: false, isReady: true };
	if (diffDays <= 3) {
		return { text: `${prefix}Через ${diffDays} дн. (${targetDate.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })})`, isUrgent: false, isReady: false };
	}
	return { text: `${prefix}${targetDate.toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}`, isUrgent: false, isReady: false };
}
