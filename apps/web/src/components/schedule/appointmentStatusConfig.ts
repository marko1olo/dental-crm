import type { Appointment } from "@dental/shared";
import {
	CalendarCheck,
	CheckCircle2,
	PhoneCall,
	UserCheck,
	UserX,
} from "lucide-react";

export interface StatusConfigItem {
	status: Appointment["status"];
	label: string;
	icon: typeof CalendarCheck;
	activeClass: string;
	idleClass: string;
}

export const APPOINTMENT_STATUS_CONFIG: StatusConfigItem[] = [
	{
		status: "planned",
		label: "Запланирован",
		icon: CalendarCheck,
		activeClass: "bg-slate-700 text-white font-bold",
		idleClass:
			"hover:bg-[var(--paper-soft)] text-slate-700 dark:text-slate-300",
	},
	{
		status: "confirmed",
		label: "Подтвержден",
		icon: PhoneCall,
		activeClass: "bg-emerald-600 text-white font-bold",
		idleClass:
			"hover:bg-[var(--paper-soft)] text-emerald-700 dark:text-emerald-300",
	},
	{
		status: "arrived",
		label: "В холле (ожидает)",
		icon: UserCheck,
		activeClass: "bg-amber-500 text-white font-bold",
		idleClass:
			"hover:bg-[var(--paper-soft)] text-amber-700 dark:text-amber-300",
	},
	{
		status: "in_treatment",
		label: "В кресле (приём)",
		icon: CalendarCheck,
		activeClass: "bg-emerald-600 text-white font-bold",
		idleClass:
			"hover:bg-[var(--paper-soft)] text-emerald-700 dark:text-emerald-300",
	},
	{
		status: "completed",
		label: "Завершён",
		icon: CheckCircle2,
		activeClass: "bg-slate-600 text-white font-bold",
		idleClass:
			"hover:bg-[var(--paper-soft)] text-slate-700 dark:text-slate-300",
	},
	{
		status: "no_show",
		label: "Не явился",
		icon: UserX,
		activeClass: "bg-rose-500 text-white font-bold",
		idleClass: "hover:bg-[var(--paper-soft)] text-rose-700 dark:text-rose-300",
	},
];
