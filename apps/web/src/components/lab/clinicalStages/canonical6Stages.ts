export type CanonicalOrthopedic6StageId =
	| "impression_taken"
	| "courier_sent"
	| "framework_fitting"
	| "ceramic_layering"
	| "ready_in_clinic"
	| "patient_fixation";

export interface CanonicalOrthopedic6StageItem {
	readonly id: CanonicalOrthopedic6StageId;
	readonly step: number;
	readonly labelRu: string;
	readonly shortLabelRu: string;
	readonly descRu: string;
	readonly badgeClass: string;
}

export const CANONICAL_6_ORTHOPEDIC_LIFECYCLE_STAGES: readonly CanonicalOrthopedic6StageItem[] = [
	{
		id: "impression_taken",
		step: 1,
		labelRu: "1. Снят слепок (интраоральный скан)",
		shortLabelRu: "Снят слепок",
		descRu: "Сняты рабочие и вспомогательные оттиски или получен оптический 3D-скан челюстей",
		badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
	},
	{
		id: "courier_sent",
		step: 2,
		labelRu: "2. Отправлен курьером в ЗТЛ",
		shortLabelRu: "Курьер в ЗТЛ",
		descRu: "Оттиски / модели и наряд-заказ переданы курьерской службе для доставки в лабораторию",
		badgeClass: "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300",
	},
	{
		id: "framework_fitting",
		step: 3,
		labelRu: "3. Каркас на примерку",
		shortLabelRu: "Каркас на примерку",
		descRu: "Каркас (металл / цирконий / PEEK) поступил в клинику для клинической примерки",
		badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
	},
	{
		id: "ceramic_layering",
		step: 4,
		labelRu: "4. Нанесение керамики",
		shortLabelRu: "Нанесение керамики",
		descRu: "Послойная облицовка керамической массой, индивидуализация, глазурование",
		badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
	},
	{
		id: "ready_in_clinic",
		step: 5,
		labelRu: "5. Готовая работа в клинике",
		shortLabelRu: "Готовая работа",
		descRu: "Готовая ортопедическая конструкция доставлена в клинику и прошла входной контроль",
		badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300",
	},
	{
		id: "patient_fixation",
		step: 6,
		labelRu: "6. Фиксация в полости рта",
		shortLabelRu: "Фиксация",
		descRu: "Конструкция окончательно зафиксирована в полости рта (постоянный цемент / винт)",
		badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
	},
] as const;

export function mapTo6StageOrthopedicLifecycle(rawStatus?: string | null): CanonicalOrthopedic6StageId {
	if (!rawStatus) return "impression_taken";
	const s = rawStatus.toLowerCase().trim();
	if (s === "draft" || s === "draft_order" || s === "impression_taken" || s === "impression_scan") {
		return "impression_taken";
	}
	if (s === "sent" || s === "sent_to_lab" || s === "courier_sent" || s === "impression_sent") {
		return "courier_sent";
	}
	if (
		s === "in_progress" || s === "framework_fitting" || s === "try_in_fitting" ||
		s === "try_in" || s === "fitting" || s === "fitting_scheduled" ||
		s === "cad_design" || s === "milling_wax_up" || s === "framework_wax_milling" ||
		s === "waxup_cad" || s === "milling_framework" || s === "clinical_fitting"
	) {
		return "framework_fitting";
	}
	if (s === "ceramic_layering" || s === "sintering_ceramic_layering" || s === "glaze_finish" || s === "final_glaze") {
		return "ceramic_layering";
	}
	if (
		s === "ready" || s === "ready_in_clinic" || s === "shipped" ||
		s === "delivered_to_clinic" || s === "received" || s === "ready_fixation"
	) {
		return "ready_in_clinic";
	}
	if (
		s === "completed" || s === "fitted" || s === "installed_in_mouth" ||
		s === "delivered_completed" || s === "delivered_to_patient" || s === "patient_fixation"
	) {
		return "patient_fixation";
	}
	return "courier_sent";
}
