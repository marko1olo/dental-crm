export type Canonical5LabStatus = "sent" | "in_progress" | "fitting" | "ready" | "completed";

export interface Canonical5LabStatusItem {
	readonly id: Canonical5LabStatus;
	readonly step: number;
	readonly labelRu: string;
	readonly shortLabelRu: string;
	readonly descRu: string;
	readonly badgeClass: string;
}

export const CANONICAL_5_CLINICAL_LAB_STATUSES: readonly Canonical5LabStatusItem[] = [
	{
		id: "sent",
		step: 1,
		labelRu: "1. Слепок / Скан (Отправлен в ЗТЛ)",
		shortLabelRu: "Слепок/Скан",
		descRu: "Оттиски (силикон/скан) и клиническое задание переданы в лабораторию",
		badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
	},
	{
		id: "in_progress",
		step: 2,
		labelRu: "2. Каркас / Примерка (В работе у техника)",
		shortLabelRu: "Каркас/Примерка",
		descRu: "3D-моделирование CAD/CAM, фрезеровка каркаса или нанесение керамики",
		badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
	},
	{
		id: "fitting",
		step: 3,
		labelRu: "3. Нанесение керамики (Примерка у пациента)",
		shortLabelRu: "Нанесение керамики",
		descRu: "Клиническая примерка каркаса, нанесение керамики, восковой моделировки или бисквита",
		badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
	},
	{
		id: "ready",
		step: 4,
		labelRu: "4. Готовая работа (Готов в клинике)",
		shortLabelRu: "Готовая работа",
		descRu: "Работа завершена лабораторией, проверена и ожидает визита пациента на сдачу",
		badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300",
	},
	{
		id: "completed",
		step: 5,
		labelRu: "5. Фиксация (Сдан / Зафиксирован)",
		shortLabelRu: "Фиксация",
		descRu: "Конструкция окончательно зафиксирована в полости рта, выдан паспорт изделия",
		badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
	},
] as const;

export {
	type CanonicalManufacturing5StageItem,
	CANONICAL_MANUFACTURING_5_STAGES,
} from "./canonicalManufacturingStages";

export function mapTo5StageLabStatus(rawStatus?: string | null): Canonical5LabStatus {
	if (!rawStatus) return "sent";
	const s = rawStatus.toLowerCase().trim();
	if (s === "draft" || s === "sent" || s === "sent_to_lab" || s === "impression_sent" || s === "impression_scan") {
		return "sent";
	}
	if (
		s === "in_progress" || s === "cad_design" || s === "model_cad_design" ||
		s === "cad_modeling" || s === "milling_wax_up" || s === "framework_wax_milling" ||
		s === "sintering_ceramic_layering" || s === "ceramic_layering"
	) {
		return "in_progress";
	}
	if (
		s === "fitting" || s === "refitting" || s === "try_in_fitting" ||
		s === "fitting_in_mouth" || s === "fitting_scheduled" || s === "framework_fitting"
	) {
		return "fitting";
	}
	if (
		s === "ready" || s === "shipped" || s === "received" || s === "delivered" ||
		s === "final_glaze" || s === "glaze_finish" || s === "delivered_to_clinic" || s === "ready_fixation"
	) {
		return "ready";
	}
	if (s === "completed" || s === "fitted" || s === "installed_in_mouth" || s === "delivered_completed") {
		return "completed";
	}
	return "sent";
}
