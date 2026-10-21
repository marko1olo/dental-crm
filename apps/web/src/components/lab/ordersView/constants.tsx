import React from "react";
import type { CanonicalStageFilter, DentalLabDetailedStageKey } from "./types";
import { CANONICAL_DEMO_LAB_ORDERS } from "./canonicalDemoLabOrders";

export { CANONICAL_DEMO_LAB_ORDERS };

export const CANONICAL_STAGE_FILTERS: readonly CanonicalStageFilter[] = [
	{ id: "all", label: "Все заказы", shortLabel: "Все", statuses: [] },
	{
		id: "in_progress",
		label: "В работе",
		shortLabel: "В работе",
		statuses: [
			"sent", "sent_to_lab", "impression_scan", "draft", "in_progress",
			"framework_fitting", "cad_modeling", "milling_casting", "milling_framework",
		],
	},
	{
		id: "fitting",
		label: "Примерка",
		shortLabel: "Примерка",
		statuses: ["fitting", "refitting", "ceramic_layering", "try_in"],
	},
	{
		id: "in_clinic",
		label: "В клинике",
		shortLabel: "В клинике",
		statuses: ["ready", "ready_in_clinic", "shipped", "delivered", "received"],
	},
	{
		id: "completed",
		label: "Сдано",
		shortLabel: "Сдано",
		statuses: [
			"completed", "patient_fixation", "delivered_completed",
			"delivered_to_patient", "installed_completed", "fitted",
		],
	},
];

export const DENTAL_LAB_DETAILED_STAGE_KEYS: readonly DentalLabDetailedStageKey[] = [
	{ id: "impression_scan", label: "Слепок" },
	{ id: "framework_fitting", label: "Каркас" },
	{ id: "ceramic_layering", label: "Керамика" },
	{ id: "ready_in_clinic", label: "Готовая в клинике" },
	{ id: "patient_fixation", label: "Зафиксировано" },
];

export function getStatusBadge(status?: string): React.ReactNode {
	switch (status) {
		case "sent":
		case "sent_to_lab":
			return (
				<span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
					Отправлен в ЗТЛ
				</span>
			);
		case "in_progress":
			return (
				<span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
					В работе (CAD/CAM)
				</span>
			);
		case "fitting":
		case "refitting":
		case "try_in":
			return (
				<span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
					На примерке / Доработке
				</span>
			);
		case "ready":
		case "ready_in_clinic":
		case "shipped":
		case "delivered":
		case "received":
			return (
				<span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-100 text-teal-800 dark:bg-teal-950/40 dark:text-teal-300">
					В клинике / Готов
				</span>
			);
		case "completed":
		case "delivered_to_patient":
		case "fitted":
		case "patient_fixation":
		case "installed_completed":
			return (
				<span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
					Зафиксировано
				</span>
			);
		case "warranty_rework":
			return (
				<span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
					Гарантия / Переделка
				</span>
			);
		case "cancelled":
			return (
				<span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
					Аннулирован
				</span>
			);
		default:
			return (
				<span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
					{status || "Черновик"}
				</span>
			);
	}
}
