import React from "react";
import { AlertTriangle, Clock, Truck, CheckCircle2 } from "lucide-react";
import type { DentalLabOrderData } from "../DentalLabOrderModal";

export type LabDueStatus = "burning" | "today" | "in_transit" | "ready" | "normal";

export function getLabDueStatus(order?: DentalLabOrderData | null): { status: LabDueStatus; label: string; dateStr: string } {
	if (!order) return { status: "normal", label: "—", dateStr: "—" };
	const st = (order.status || "").toLowerCase();
	const isDeliveredOrInstalled = st === "completed" || st === "delivered_to_patient" || st === "installed_completed" || st === "patient_fixation";
	const isReadyInClinic = st === "ready" || st === "ready_in_clinic" || st === "received";
	const isInTransit = st === "shipped" || st === "delivered" || st === "courier";

	if (isDeliveredOrInstalled || isReadyInClinic) {
		return { status: "ready", label: "Готов", dateStr: order.dueDate ? new Date(order.dueDate).toLocaleDateString("ru-RU") : "В клинике" };
	}
	if (isInTransit) {
		return { status: "in_transit", label: "В пути", dateStr: order.dueDate ? new Date(order.dueDate).toLocaleDateString("ru-RU") : "Курьер" };
	}

	if (!order.dueDate) {
		return { status: "normal", label: "Срок уточняется", dateStr: "—" };
	}

	const dueTime = new Date(order.dueDate).getTime();
	if (Number.isNaN(dueTime)) {
		return { status: "normal", label: "—", dateStr: "—" };
	}

	const now = Date.now();
	const diffHours = (dueTime - now) / (1000 * 60 * 60);
	const dueDateObj = new Date(order.dueDate);
	const nowDateObj = new Date();
	const isSameDay = dueDateObj.getFullYear() === nowDateObj.getFullYear() &&
		dueDateObj.getMonth() === nowDateObj.getMonth() &&
		dueDateObj.getDate() === nowDateObj.getDate();

	const formattedDate = dueDateObj.toLocaleDateString("ru-RU");

	if (diffHours < 0 || diffHours <= 12) {
		return { status: "burning", label: "Горит", dateStr: formattedDate };
	}
	if (isSameDay || (diffHours > 0 && diffHours <= 24)) {
		return { status: "today", label: "Сегодня", dateStr: formattedDate };
	}

	return { status: "normal", label: formattedDate, dateStr: formattedDate };
}

export function renderLabDueBadge(order?: DentalLabOrderData | null): React.JSX.Element {
	const info = getLabDueStatus(order);

	switch (info.status) {
		case "burning":
			return (
				<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800" data-testid="lab-due-burning">
					<AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0 animate-pulse" />
					<span>Горит ({info.dateStr})</span>
				</span>
			);
		case "today":
			return (
				<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700" data-testid="lab-due-today">
					<Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
					<span>Сегодня</span>
				</span>
			);
		case "in_transit":
			return (
				<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700" data-testid="lab-due-in-transit">
					<Truck className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
					<span>В пути ({info.dateStr})</span>
				</span>
			);
		case "ready":
			return (
				<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700" data-testid="lab-due-ready">
					<CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span>Готов ({info.dateStr})</span>
				</span>
			);
		default:
			return (
				<span className="text-[11px] font-mono text-[var(--muted)]">
					{info.dateStr}
				</span>
			);
	}
}
