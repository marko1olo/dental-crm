import React from "react";
import { AlertTriangle, CalendarCheck, CalendarClock, CheckCircle, ShieldAlert } from "lucide-react";
import type { PanelSubject } from "../../../lib/panelStateText";

export const NO_SHOW_SUBJECT: PanelSubject = {
	notLoadedTitle: "Риск неявки не рассчитан",
	accusative: "оценку риска неявки",
	emptyTitle: "Риск неявки не рассчитан",
	emptyHint: "Расчёт опирается на историю записей пациента: сколько раз приходил, сколько отменял.",
	failureConsequence:
		"Расчёт не выполнен, поэтому пациента нельзя считать ни надёжным, ни рискованным. Позвоните и подтвердите запись обычным порядком.",
};

export function getRiskClass(level: string): string {
	switch (level) {
		case "high":
			return "text-red-600 dark:text-red-400";
		case "medium":
			return "text-amber-600 dark:text-amber-400";
		case "low":
			return "text-emerald-600 dark:text-emerald-400";
		default:
			return "text-slate-600 dark:text-slate-400";
	}
}

export function getRiskLabel(level: string, noShows = 0): string {
	if (noShows === 0) return "Надёжный пациент: визиты без пропусков";
	switch (level) {
		case "high":
			return "Повышенное внимание: были неявки в истории";
		case "medium":
			return "Умеренная дисциплина: единичные пропуски";
		case "low":
			return "Надёжный пациент: регулярная явка";
		default:
			return "История визитов формируется";
	}
}

export function getRiskIcon(level: string, noShows = 0): React.ReactElement {
	if (noShows === 0) return React.createElement(CheckCircle, { size: 16, className: "text-emerald-500" });
	switch (level) {
		case "high":
			return React.createElement(ShieldAlert, { size: 16, className: "text-red-500" });
		case "medium":
			return React.createElement(AlertTriangle, { size: 16, className: "text-amber-500" });
		case "low":
			return React.createElement(CheckCircle, { size: 16, className: "text-emerald-500" });
		default:
			return React.createElement(CalendarClock, { size: 16, className: "text-slate-400" });
	}
}
