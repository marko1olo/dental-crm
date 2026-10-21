import type { Appointment } from "@dental/shared";
import { CalendarCheck, Stethoscope, UserCheck } from "lucide-react";
import type React from "react";
import { playIntercomChime } from "../../../lib/intercomSound";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";

export interface GridAppointmentPlannedActionsProps {
	appointment: Appointment;
	pName: string;
	patObj?: any;
	onQuickStatusChange: (id: string, status: any) => void;
}

export function GridAppointmentPlannedActions({
	appointment: a,
	pName,
	patObj,
	onQuickStatusChange,
}: GridAppointmentPlannedActionsProps) {
	const handleArrived = (e: React.MouseEvent) => {
		e.stopPropagation();
		onQuickStatusChange(a.id, "arrived");
		playIntercomChime("urgent");
		showToast(`Пациент ${pName} прибыл в холл клиники`, "info");
	};

	const handleStartTreatment = (e: React.MouseEvent) => {
		e.stopPropagation();
		onQuickStatusChange(a.id, "in_treatment");
		playIntercomChime("normal");
		const pid = a.patientId || patObj?.id;
		if (pid) {
			usePatientStore.getState().setSelectedPatientId(pid);
		}
		if (typeof window !== "undefined") {
			window.location.hash = "#visit";
		}
		useAppStore.getState().setCurrentView("visit");
		showToast(`Пациент ${pName} в кресле: открыта медкарта`, "info");
	};

	const handleInviteToChair = (e: React.MouseEvent) => {
		e.stopPropagation();
		onQuickStatusChange(a.id, "in_treatment");
		playIntercomChime("normal");
		const pid = a.patientId || patObj?.id;
		if (pid) {
			usePatientStore.getState().setSelectedPatientId(pid);
		}
		if (typeof window !== "undefined") {
			window.location.hash = "#visit";
		}
		useAppStore.getState().setCurrentView("visit");
		showToast(`Пациент ${pName} приглашен в кресло: открыта медкарта`, "info");
	};

	return (
		<>
			{(a.status === "planned" || a.status === "confirmed") && (
				<>
					<button
						type="button"
						onClick={handleArrived}
						className="icon-button secondary-button h-6 w-6 min-h-[24px] min-w-[24px] p-0 rounded-md text-[10px] font-extrabold bg-amber-500/15 hover:bg-amber-500 text-amber-800 hover:text-white dark:text-amber-200 dark:hover:text-white border border-amber-500/40 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs shrink-0"
						title="Пациент пришёл — перевести «В холл» и подать сигнал в интерком"
						data-testid={`dente-quick-arrived-${a.id}`}
					>
						<UserCheck size={12} className="shrink-0" />
						<span className="sr-only">Прибыл</span>
					</button>
					<button
						type="button"
						onClick={handleStartTreatment}
						className="icon-button primary-button h-6 w-6 min-h-[24px] min-w-[24px] p-0 rounded-md text-[10px] font-extrabold bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white border border-[var(--teal)] transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-xs shrink-0"
						title="Начать приём у кресла (#visit)"
						data-testid={`dente-quick-start-treatment-${a.id}`}
					>
						<Stethoscope size={12} className="shrink-0" />
						<span className="sr-only">Приём</span>
					</button>
				</>
			)}
			{(a.status === "arrived" ||
				(a.status as string) === "in_clinic" ||
				(a.status as string) === "waiting") && (
				<button
					type="button"
					onClick={handleInviteToChair}
					className="icon-button primary-button h-6 w-6 min-h-[24px] min-w-[24px] p-0 rounded-md text-[10px] font-extrabold bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white border border-[var(--teal)] transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-xs shrink-0 animate-pulse"
					title="Пригласить в кабинет — перевести в статус «В кресле» и начать приём (#visit)"
					data-testid={`dente-quick-in-chair-${a.id}`}
				>
					<CalendarCheck size={12} className="shrink-0" />
					<span className="sr-only">В кресло</span>
				</button>
			)}
		</>
	);
}
