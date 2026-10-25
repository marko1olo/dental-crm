import React from "react";
import { CalendarCheck, CreditCard, Phone, User } from "lucide-react";
import type { Appointment } from "@dental/shared";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";

interface Props {
	appointment: Appointment;
	pName: string;
	patObj?: any;
	onAppointmentClick: (appt: Appointment) => void;
	onCloseMenu: () => void;
}

export const GridAppointmentPatientActions: React.FC<Props> = ({
	appointment: a,
	pName,
	patObj,
	onAppointmentClick,
	onCloseMenu,
}) => {
	const handleCheckout = () => {
		onCloseMenu();
		if (patObj?.id) {
			usePatientStore.getState().setSelectedPatientId(patObj.id);
		}
		useAppStore.getState().setCurrentView("finance");
		showToast(`Касса: расчёт ${pName}`, "info");
	};

	return (
		<div className="space-y-0.5 pb-1 border-b border-[var(--line)]">
			<button
				type="button"
				onClick={() => {
					onAppointmentClick(a);
					onCloseMenu();
				}}
				className="w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--teal-dark,var(--teal))] font-bold transition-colors cursor-pointer"
				title={`Открыть профиль ${pName}`}
				aria-label={`Открыть профиль ${pName}`}
				data-testid={`menu-profile-btn-${a.id}`}
			>
				<User size={14} className="text-[var(--teal)] shrink-0" />
				<span>Профиль пациента</span>
			</button>
			<button
				type="button"
				onClick={() => {
					onAppointmentClick(a);
					onCloseMenu();
				}}
				className="w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-[var(--paper-soft)] text-[var(--ink)] font-medium transition-colors cursor-pointer"
				title={`Открыть прием ${pName}`}
				aria-label={`Открыть прием ${pName}`}
				data-testid={`menu-treatment-btn-${a.id}`}
			>
				<CalendarCheck size={14} className="text-[var(--teal)] shrink-0" />
				<span>Прием (детали)</span>
			</button>
			<button
				type="button"
				onClick={handleCheckout}
				className="w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold transition-colors cursor-pointer"
				title={`Оплата визита (касса): ${pName}`}
				aria-label={`Оплата визита ${pName}`}
				data-testid={`menu-pay-btn-${a.id}`}
			>
				<CreditCard size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
				<span>Оплата на кассе</span>
			</button>
			{patObj?.phone && (
				<a
					href={`tel:${patObj.phone}`}
					onClick={() => onCloseMenu()}
					className="w-full text-left min-h-[44px] min-w-[44px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 hover:bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold transition-colors cursor-pointer"
					title={`Позвонить ${pName}: ${patObj.phone}`}
					aria-label={`Позвонить ${pName}`}
					data-testid={`menu-call-btn-${a.id}`}
				>
					<Phone size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
					<span className="truncate">Позвонить ({patObj.phone})</span>
				</a>
			)}
		</div>
	);
};
