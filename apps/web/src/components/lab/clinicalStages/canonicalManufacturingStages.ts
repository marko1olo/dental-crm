export interface CanonicalManufacturing5StageItem {
	readonly id: "impression_scan" | "framework_fitting" | "ceramic_layering" | "ready_in_clinic" | "patient_fixation";
	readonly step: number;
	readonly labelRu: string;
	readonly shortLabelRu: string;
	readonly descRu: string;
	readonly badgeClass: string;
}

export const CANONICAL_MANUFACTURING_5_STAGES: readonly CanonicalManufacturing5StageItem[] = [
	{
		id: "impression_scan",
		step: 1,
		labelRu: "1. Слепок / Скан",
		shortLabelRu: "Слепок/Скан",
		descRu: "Слепок или интраоральный 3D-скан передан в ЗТЛ",
		badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
	},
	{
		id: "framework_fitting",
		step: 2,
		labelRu: "2. Каркас / Примерка",
		shortLabelRu: "Каркас/Примерка",
		descRu: "Фрезеровка или отливка каркаса, проверка пассивной посадки",
		badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300",
	},
	{
		id: "ceramic_layering",
		step: 3,
		labelRu: "3. Нанесение керамики",
		shortLabelRu: "Нанесение керамики",
		descRu: "Послойная облицовка керамикой, глазурование и индивидуализация",
		badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
	},
	{
		id: "ready_in_clinic",
		step: 4,
		labelRu: "4. Готовая работа",
		shortLabelRu: "Готовая работа",
		descRu: "Готовая работа проверена и ожидает пациента в клинике",
		badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/50 dark:text-teal-300",
	},
	{
		id: "patient_fixation",
		step: 5,
		labelRu: "5. Фиксация",
		shortLabelRu: "Фиксация",
		descRu: "Окончательная фиксация на постоянный цемент / винт",
		badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
	},
] as const;
