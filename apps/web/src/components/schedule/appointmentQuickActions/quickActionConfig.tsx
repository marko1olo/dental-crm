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
				"bg-[var(--teal)] text-white font-bold shadow-2xs border-[var(--teal)]",
		},
		{
			key: "in_treatment",
			targetStatus: "in_treatment",
			label: "В кресле",
			shortLabel: "В кресле",
			icon: <CalendarCheck size={13} className="shrink-0 text-current" />,
			title: `Отметить: ${patientName} в кресле у врача (Клавиша 2)`,
			activeClass:
				"bg-[var(--teal)] text-white font-bold shadow-2xs border-[var(--teal)]",
		},
		{
			key: "completed",
			targetStatus: "completed",
			label: "Завершен",
			shortLabel: "Готово",
			icon: <CheckCircle2 size={13} className="shrink-0 text-current" />,
			title: `Завершить прием: ${patientName} (Клавиша 3)`,
			activeClass:
				"bg-[var(--paper-strong)] text-[var(--ink)] font-bold shadow-2xs border border-[var(--line)]",
		},
		{
			key: "confirmed",
			targetStatus: "confirmed",
			label: "Подтвердить",
			shortLabel: "Подтвержден",
			icon: <PhoneCall size={13} className="shrink-0 text-current" />,
			title: `Подтвердить запись: звонок или SMS для ${patientName}`,
			activeClass:
				"bg-[var(--teal)] text-white font-bold shadow-2xs border-[var(--teal)]",
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
				"bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30",
		},
		{
			key: "no_show",
			targetStatus: "no_show",
			label: "Не пришел",
			shortLabel: "Не явился",
			icon: <UserX size={13} className="shrink-0 text-current" />,
			title: `Неявка: ${patientName} не пришел на прием (Клавиша 5)`,
			activeClass:
				"bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30",
		},
		{
			key: "cancelled",
			targetStatus: "cancelled",
			label: "Отменен",
			shortLabel: "Отменен",
			icon: <XCircle size={13} className="shrink-0 text-current" />,
			title: `Отменить прием: ${patientName}`,
			activeClass:
				"bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30",
		},
	];
}
