export const LAB_ORDER_STAGES = [
	{
		id: "in_progress" as const,
		name: "1. В работе",
		desc: "Заказ передан в лабораторию и находится в процессе изготовления",
		step: 1,
		color: "text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300",
		badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300",
	},
	{
		id: "fitting_scheduled" as const,
		name: "2. Примерка назначена",
		desc: "Работа изготовлена ЗТЛ, назначена дата клинической примерки в расписании",
		step: 2,
		color: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300",
		badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
	},
	{
		id: "delivered_completed" as const,
		name: "3. Сдано",
		desc: "Ортопедическая конструкция окончательно зафиксирована в полости рта",
		step: 3,
		color: "text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-700 dark:text-emerald-300",
		badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300",
	},
	{
		id: "correction_remake" as const,
		name: "4. Коррекция",
		desc: "Возврат в ЗТЛ на коррекцию окклюзии, цвета или переделку",
		step: 4,
		color: "text-rose-600 bg-rose-50 border-rose-200 dark:bg-rose-900/30 dark:border-rose-700 dark:text-rose-300",
		badgeColor: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300",
	},
] as const;

export type LabOrderStageKey =
	| (typeof LAB_ORDER_STAGES)[number]["id"]
	| "sent_to_lab"
	| "model_cad_design"
	| "framework_wax_milling"
	| "sintering_ceramic_layering"
	| "fitting_in_mouth"
	| "final_glaze"
	| "delivered_to_clinic"
	| "completed"
	| "impression_scan"
	| "cad_modeling"
	| "milling_casting"
	| "framework_fitting"
	| "ceramic_layering"
	| "ready_in_clinic"
	| "patient_fixation";
