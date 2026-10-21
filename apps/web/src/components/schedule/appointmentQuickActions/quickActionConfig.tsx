import type { Appointment } from "@dental/shared";
import {
	CalendarCheck,
	CheckCircle2,
	Clock,
	PhoneCall,
	UserCheck,
	UserX,
	XCircle,
} from "lucide-react";
import type React from "react";

export type QuickActionStatus =
	| "confirmed"
	| "arrived"
	| "in_treatment"
	| "completed"
	| "late"
	| "no_show"
	| "cancelled";

export interface QuickActionDef {
	key: QuickActionStatus;
	targetStatus: Appointment["status"];
	noteAppend?: string;
	label: string;
	shortLabel: string;
	icon: React.ReactNode;
	title: string;
	activeClass: string;
}

export function buildQuickActionDefs(patientName: string): QuickActionDef[] {
	return [
		{
			key: "arrived",
			targetStatus: "arrived",
			label: "Пришел",
			shortLabel: "Пришел",
			icon: <UserCheck size={13} className="shrink-0 text-current" />,
			title: `Отметить прибытие: ${patientName} в клинике (Клавиша 1)`,
			activeClass:
				"bg-emerald-600 text-white font-bold shadow-2xs border-emerald-600",
		},
		{
			key: "in_treatment",
			targetStatus: "in_treatment",
			label: "В кресле",
			shortLabel: "В кресле",
			icon: <CalendarCheck size={13} className="shrink-0 text-current" />,
			title: `Отметить: ${patientName} в кресле у врача (Клавиша 2)`,
			activeClass:
				"bg-[var(--teal-dark)] text-white font-bold shadow-2xs border-[var(--teal-dark)]",
		},
		{
			key: "completed",
			targetStatus: "completed",
			label: "Завершен",
			shortLabel: "Готово",
			icon: <CheckCircle2 size={13} className="shrink-0 text-current" />,
			title: `Завершить прием: ${patientName} (Клавиша 3)`,
			activeClass:
				"bg-slate-700 dark:bg-slate-600 text-white font-bold shadow-2xs border-slate-700 dark:border-slate-600",
		},
		{
			key: "confirmed",
			targetStatus: "confirmed",
			label: "Подтвердить",
			shortLabel: "Подтвержден",
			icon: <PhoneCall size={13} className="shrink-0 text-current" />,
			title: `Подтвердить запись: звонок или SMS для ${patientName}`,
			activeClass:
				"bg-violet-600 text-white font-bold shadow-2xs border-violet-600",
		},
		{
			key: "late",
			targetStatus: "no_show",
			noteAppend: "Опоздание",
			label: "Опоздал",
			shortLabel: "Опоздал",
			icon: <Clock size={13} className="shrink-0 text-current" />,
			title: `Отметить опоздание: ${patientName} (Клавиша 4)`,
			activeClass:
				"bg-amber-600 text-white font-bold shadow-2xs border-amber-600",
		},
		{
			key: "no_show",
			targetStatus: "no_show",
			label: "Не пришел",
			shortLabel: "Не явился",
			icon: <UserX size={13} className="shrink-0 text-current" />,
			title: `Неявка: ${patientName} не пришел на прием (Клавиша 5)`,
			activeClass:
				"bg-rose-600 text-white font-bold shadow-2xs border-rose-600",
		},
		{
			key: "cancelled",
			targetStatus: "cancelled",
			label: "Отменен",
			shortLabel: "Отменен",
			icon: <XCircle size={13} className="shrink-0 text-current" />,
			title: `Отменить прием: ${patientName}`,
			activeClass:
				"bg-slate-500 text-white font-bold shadow-2xs border-slate-500",
		},
	];
}
