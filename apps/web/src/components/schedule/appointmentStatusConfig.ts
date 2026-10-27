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
		activeClass: "bg-[var(--teal)] text-white font-bold",
		idleClass: "hover:bg-[var(--paper-soft)] text-[var(--ink)]",
	},
	{
		status: "confirmed",
		label: "Подтвержден",
		icon: PhoneCall,
		activeClass: "bg-[var(--teal)] text-white font-bold",
		idleClass: "hover:bg-[var(--paper-soft)] text-[var(--ink)]",
	},
	{
		status: "arrived",
		label: "В холле (ожидает)",
		icon: UserCheck,
		activeClass: "bg-[var(--teal)] text-white font-bold",
		idleClass: "hover:bg-[var(--paper-soft)] text-[var(--ink)]",
	},
	{
		status: "in_treatment",
		label: "В кресле (приём)",
		icon: CalendarCheck,
		activeClass: "bg-[var(--teal)] text-white font-bold",
		idleClass: "hover:bg-[var(--paper-soft)] text-[var(--ink)]",
	},
	{
		status: "completed",
		label: "Завершён",
		icon: CheckCircle2,
		activeClass: "bg-[var(--paper-strong)] text-[var(--ink)] border border-[var(--line)] font-bold",
		idleClass: "hover:bg-[var(--paper-soft)] text-[var(--ink)]",
	},
	{
		status: "no_show",
		label: "Не явился",
		icon: UserX,
		activeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/30",
		idleClass: "hover:bg-rose-500/10 text-rose-600 dark:text-rose-400",
	},
];
