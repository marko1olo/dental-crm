export type CanonicalLabOrderStatus = "sent" | "fitting" | "ready" | "completed";

export interface CanonicalLabStatusInfo {
	readonly id: CanonicalLabOrderStatus;
	readonly label: string;
	readonly shortLabel: string;
	readonly desc: string;
	readonly bgClass: string;
	readonly textClass: string;
	readonly borderClass: string;
	readonly activeClass: string;
}

export const CANONICAL_LAB_STATUSES: readonly CanonicalLabStatusInfo[] = [
	{
		id: "sent",
		label: "1. Слепок / Оттиск (Передан в ЗТЛ)",
		shortLabel: "Слепок",
		desc: "Оттиски / цифровые сканы переданы в лабораторию",
		bgClass: "bg-blue-50 dark:bg-blue-950/40",
		textClass: "text-blue-700 dark:text-blue-300",
		borderClass: "border-blue-200 dark:border-blue-800",
		activeClass: "bg-blue-600 text-white border-blue-700",
	},
	{
		id: "ready",
		label: "2. Каркас / Конструкция (CAD/CAM)",
		shortLabel: "Каркас",
		desc: "Каркас смоделирован, отфрезерован и поступил в клинику",
		bgClass: "bg-teal-50 dark:bg-teal-950/40",
		textClass: "text-teal-700 dark:text-teal-300",
		borderClass: "border-teal-200 dark:border-teal-800",
		activeClass: "bg-teal-600 text-white border-teal-700",
	},
	{
		id: "fitting",
		label: "3. Примерка у пациента",
		shortLabel: "Примерка",
		desc: "Клиническая примерка каркаса / бисквита в полости рта",
		bgClass: "bg-amber-50 dark:bg-amber-950/40",
		textClass: "text-amber-700 dark:text-amber-300",
		borderClass: "border-amber-200 dark:border-amber-800",
		activeClass: "bg-amber-600 text-white border-amber-700",
	},
	{
		id: "completed",
		label: "4. Фиксация / Сдан",
		shortLabel: "Фиксация",
		desc: "Конструкция окончательно зафиксирована в полости рта",
		bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
		textClass: "text-emerald-700 dark:text-emerald-300",
		borderClass: "border-emerald-200 dark:border-emerald-800",
		activeClass: "bg-emerald-600 text-white border-emerald-700",
	},
] as const;

export function mapToCanonicalStatus(rawStatus?: string | null): CanonicalLabOrderStatus {
	if (!rawStatus) return "sent";
	const s = rawStatus.toLowerCase();
	if (
		s === "draft" || s === "sent" || s === "sent_to_lab" || s === "in_progress" ||
		s === "model_cad_design" || s === "framework_wax_milling" || s === "sintering_ceramic_layering"
	) {
		return "sent";
	}
	if (s === "fitting" || s === "refitting" || s === "fitting_in_mouth") {
		return "fitting";
	}
	if (
		s === "shipped" || s === "delivered" || s === "received" ||
		s === "ready" || s === "final_glaze" || s === "delivered_to_clinic"
	) {
		return "ready";
	}
	if (s === "completed" || s === "fitted") {
		return "completed";
	}
	return "sent";
}
