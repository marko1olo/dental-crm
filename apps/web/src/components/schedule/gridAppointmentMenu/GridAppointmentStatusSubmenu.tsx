import React from "react";
import { CalendarCheck, CheckCircle2, PhoneCall, UserCheck, UserX } from "lucide-react";
import type { Appointment } from "@dental/shared";
import { isAppointmentInChair } from "../appointmentCardHelpers";
import { showRollbackToast } from "../../GlobalToast";

interface Props {
	appointment: Appointment;
	onQuickStatusChange?: ((id: string, status: any) => void) | undefined;
	onCloseMenu: () => void;
}

export const GridAppointmentStatusSubmenu: React.FC<Props> = ({
	appointment: a,
	onQuickStatusChange,
	onCloseMenu,
}) => {
	if (!onQuickStatusChange) return null;

	const handleStatus = (newStatus: string, title: string) => {
		const prevStatus = a.status;
		onQuickStatusChange(a.id, newStatus);
		onCloseMenu();
		showRollbackToast(`Статус визита изменен: ${title}`, () => {
			onQuickStatusChange(a.id, prevStatus);
		}, 5000, "Вернуть");
	};

	const items = [
		{ status: "confirmed", title: "Подтвержден", icon: PhoneCall, activeClass: "bg-violet-500 text-white font-bold", inactiveClass: "hover:bg-[var(--paper-soft)] text-violet-700 dark:text-violet-300", active: a.status === "confirmed" },
		{ status: "arrived", title: "Пришел", icon: UserCheck, activeClass: "bg-emerald-500 text-white font-bold", inactiveClass: "hover:bg-[var(--paper-soft)] text-emerald-700 dark:text-emerald-300", active: a.status === "arrived" },
		{ status: "in_treatment", title: "В кресле", icon: CalendarCheck, activeClass: "bg-[var(--teal,var(--brand-primary))] text-white font-bold", inactiveClass: "hover:bg-[var(--paper-soft)] text-[var(--teal-dark,var(--teal))]", active: isAppointmentInChair(a.status) },
		{ status: "completed", title: "Завершен", icon: CheckCircle2, activeClass: "bg-slate-600 text-white font-bold", inactiveClass: "hover:bg-[var(--paper-soft)] text-slate-700 dark:text-slate-300", active: a.status === "completed" },
		{ status: "no_show", title: "Не явился", icon: UserX, activeClass: "bg-rose-500 text-white font-bold", inactiveClass: "hover:bg-[var(--paper-soft)] text-rose-700 dark:text-rose-300", active: a.status === "no_show" },
	];

	return (
		<div className="space-y-0.5">
			<div className="px-2 py-1 text-[10px] font-black uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] pb-1">
				Статус визита
			</div>
			{items.map((item) => {
				const Icon = item.icon;
				return (
					<button
						key={item.status}
						type="button"
						title={item.title}
						onClick={() => handleStatus(item.status, item.title)}
						className={`w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
							item.active ? item.activeClass : item.inactiveClass
						}`}
					>
						<Icon size={14} />
						<span>{item.title}</span>
					</button>
				);
			})}
		</div>
	);
};
