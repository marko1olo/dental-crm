/**
 * dentalLabStatusData.ts — Канонические статусы ЗТЛ и метаданные бейджей.
 */

export type DentalLabOrderStatus =
	| "draft"                // 0. «Черновик»
	| "sent_to_lab"          // 1. «Отправлен технику»
	| "in_progress"          // 2. «В работе у техника»
	| "ready_in_clinic"      // 3. «Поступил в клинику (Готов к примерке)»
	| "try_in"               // 4. «Примерка»
	| "delivered_to_patient" // 5. «Сдан пациенту»
	| "warranty_rework"      // 6. «Переделка (гарантия)»
	| "delayed";             // 7. «Задерживается»

export interface DentalLabStatusDef {
	readonly id: DentalLabOrderStatus;
	readonly stepIndex: number;
	readonly labelRu: string;
	readonly shortLabelRu: string;
	readonly descriptionRu: string;
	readonly badgeClass: string;
	readonly colorHex: string;
}

export const DENTAL_LAB_STATUSES: Record<DentalLabOrderStatus, DentalLabStatusDef> = {
	draft: {
		id: "draft",
		stepIndex: 0,
		labelRu: "Черновик",
		shortLabelRu: "Черновик",
		descriptionRu: "Черновик наряда формируется врачом в кабинете.",
		badgeClass: "bg-slate-100 text-slate-800 dark:bg-slate-950/40 dark:text-slate-300 border-slate-300 dark:border-slate-700",
		colorHex: "#64748b",
	},
	sent_to_lab: {
		id: "sent_to_lab",
		stepIndex: 1,
		labelRu: "Отправлен в лабораторию",
		shortLabelRu: "В лаборатории",
		descriptionRu: "Слепок или цифровой скан передан курьеру и направлен в лабораторию.",
		badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300 border-blue-300 dark:border-blue-700",
		colorHex: "#3b82f6",
	},
	in_progress: {
		id: "in_progress",
		stepIndex: 2,
		labelRu: "На моделировании",
		shortLabelRu: "Моделирование",
		descriptionRu: "Конструкция моделируется и фрезеруется зубным техником в CAD/CAM лаборатории.",
		badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 dark:border-amber-700",
		colorHex: "#f59e0b",
	},
	ready_in_clinic: {
		id: "ready_in_clinic",
		stepIndex: 3,
		labelRu: "Готов в клинике",
		shortLabelRu: "В клинике",
		descriptionRu: "Работа доставлена курьером в клинику, прошла дезинфекцию и готова к приему.",
		badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300 border-teal-300 dark:border-teal-700",
		colorHex: "#0d9488",
	},
	try_in: {
		id: "try_in",
		stepIndex: 4,
		labelRu: "На примерке",
		shortLabelRu: "Примерка",
		descriptionRu: "Проводится клиническая примерка каркаса, посадки или цвета в кресле ортопеда.",
		badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 border-purple-300 dark:border-purple-700",
		colorHex: "#8b5cf6",
	},
	delivered_to_patient: {
		id: "delivered_to_patient",
		stepIndex: 5,
		labelRu: "Установлен пациенту",
		shortLabelRu: "Установлен",
		descriptionRu: "Конструкция окончательно зафиксирована в полости рта пациента, акт подписан.",
		badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
		colorHex: "#10b981",
	},
	warranty_rework: {
		id: "warranty_rework",
		stepIndex: 6,
		labelRu: "Переделка (гарантия)",
		shortLabelRu: "Переделка",
		descriptionRu: "Работа направлена на гарантийную переделку или коррекцию цвета/окклюзии (0 ₽).",
		badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-300 dark:border-rose-700",
		colorHex: "#f43f5e",
	},
	delayed: {
		id: "delayed",
		stepIndex: 7,
		labelRu: "Задерживается",
		shortLabelRu: "Задержка",
		descriptionRu: "Срок изготовления превышен или задерживается лабораторией. Требуется перенос приема.",
		badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-400 dark:border-amber-600",
		colorHex: "#f59e0b",
	},
};

export const DENTAL_LAB_STATUS_ORDER: readonly DentalLabOrderStatus[] = [
	"sent_to_lab",
	"in_progress",
	"ready_in_clinic",
	"try_in",
	"delivered_to_patient",
	"warranty_rework",
];
