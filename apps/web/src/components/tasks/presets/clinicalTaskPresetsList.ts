import type { ClinicalTaskPreset } from "../clinicalTasksTypes";

const addDays = (days: number) => () => {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toISOString();
};

const addMonths = (months: number) => () => {
	const d = new Date();
	d.setMonth(d.getMonth() + months);
	return d.toISOString();
};

export const CLINICAL_TASK_PRESETS: readonly ClinicalTaskPreset[] = [
	{
		id: "preset-postop-call",
		testId: "preset-task-postop-call",
		label: "Контрольный звонок после удаления",
		title: "Контрольный звонок после сложного удаления/анестезии",
		defaultDescription: "Контрольный звонок пациенту: оценка гемостаза, отека, купирования боли, общего самочувствия.",
		taskType: "postop_call",
		computeDueAt: addDays(1),
		hint: "Контрольный звонок на следующий день после сложного удаления или анестезии",
	},
	{
		id: "preset-order-implant",
		testId: "preset-task-order-implant",
		label: "Заказать имплантат / костный материал",
		title: "Заказать имплантат / костный материал",
		defaultDescription: "Заказ дентального имплантата, формирователя десны, мембраны и остеопластического материала.",
		taskType: "order_implant",
		computeDueAt: addDays(3),
		hint: "Заказать имплантат и костный материал за 3 дня",
	},
	{
		id: "preset-prosthetics-ztl",
		testId: "preset-task-prosthetics-ztl",
		label: "Забрать работу из лаборатории",
		title: "Забрать работу из зуботехнической лаборатории (ЗТЛ)",
		defaultDescription: "Припасовка ортопедической конструкции из ЗТЛ, проверка окклюзионных контактов.",
		taskType: "prosthetics_fitting",
		computeDueAt: addDays(7),
		hint: "Отследить готовность работы в лаборатории через 7 дней",
	},
	{
		id: "preset-recall-6m",
		testId: "preset-task-recall-6m",
		label: "Пригласить на профгигиену (6 мес)",
		title: "Пригласить на профгигиену (6 месяцев) — Профгигиена",
		defaultDescription: "Плановый контрольный осмотр и оценка гигиенического статуса через 6 месяцев. Профгигиена.",
		taskType: "recall_hygiene",
		computeDueAt: addMonths(6),
		hint: "Создать задачу контрольного осмотра и профгигиены через 6 месяцев",
	},
	{
		id: "preset-ct-planning",
		testId: "preset-task-ct-planning",
		label: "Проверить готовность КТ/ОПТГ",
		title: "Снимок КТ / планирование",
		defaultDescription: "Анализ КЛКТ/ОПТГ/визиографии, виртуальная расстановка имплантов, разметка нижнечелюстного канала.",
		taskType: "ct_planning",
		computeDueAt: addDays(3),
		hint: "Проверить готовность снимка КТ/ОПТГ и 3D-планирование за 3 дня",
	},
	{
		id: "preset-suture-removal",
		testId: "preset-task-suture-removal",
		label: "Снятие швов через 7-10 дней",
		title: "Снятие швов через 7-10 дней",
		defaultDescription: "Осмотр зоны хирургического вмешательства, контроль эпителизации и снятие швов (7-10 день).",
		taskType: "suture_removal",
		computeDueAt: addDays(8),
		hint: "Создать задачу на снятие швов через 7–10 дней после хирургии",
	},
	{
		id: "preset-rvg-control",
		testId: "preset-task-rvg-control",
		label: "Контрольная рентгенография RVG",
		title: "Контрольная рентгенография RVG",
		defaultDescription: "Прицельный контрольный радиовизиографический снимок (RVG) для оценки периапикальных тканей.",
		taskType: "rvg_control",
		computeDueAt: addDays(14),
		hint: "Создать задачу на контрольный снимок визиографа RVG",
	},
	{
		id: "preset-ortho-call",
		testId: "preset-task-ortho-call",
		label: "Звонок ортодонта / брекеты",
		title: "Звонок ортодонта / контроль брекетов",
		defaultDescription: "Контрольный звонок ортодонтического пациента: оценка адаптации, целостности дуг, фиксации брекетов.",
		taskType: "orthodontics_recall",
		computeDueAt: addDays(21),
		hint: "Контроль брекетов/элайнеров через 3 недели",
	},
	{
		id: "preset-implant-check",
		testId: "preset-task-implant-check",
		label: "Осмотр после имплантации",
		title: "Контрольный осмотр после имплантации",
		defaultDescription: "Осмотр зоны имплантации, контроль заживления слизистой, оценка стабильности формирователя десны.",
		taskType: "implant_check",
		computeDueAt: addDays(10),
		hint: "Контрольный осмотр после имплантации через 10 дней",
	},
	{
		id: "preset-prepare-cast",
		testId: "preset-task-prepare-cast",
		label: "Подготовить слепок",
		title: "Подготовить слепок",
		defaultDescription: "Отливка и подготовка гипсовой диагностической/рабочей модели по полученному оттиску/слепку.",
		taskType: "cast_preparation",
		computeDueAt: addDays(1),
		hint: "Подготовить диагностический/рабочий слепок за 24 часа",
	},
];
