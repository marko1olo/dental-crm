import type { Appointment } from "@dental/shared";
import {
	CalendarCheck,
	Check,
	CreditCard,
	Stethoscope,
	UserCheck,
} from "lucide-react";
import React from "react";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { showToast } from "../GlobalToast";
import { playIntercomChime } from "../../lib/intercomSound";
import { isAppointmentInChair } from "./appointmentCardHelpers";

export interface GridAppointmentQuickActionsProps {
	appointment: Appointment;
	pName: string;
	patObj?: any;
	isHovered: boolean;
	onQuickStatusChange: (id: string, status: any) => void;
}

export function GridAppointmentQuickActions({
	appointment: a,
	pName,
	patObj,
	isHovered,
	onQuickStatusChange,
}: GridAppointmentQuickActionsProps) {
	return (
		<div
			className={`items-center gap-1 shrink-0 ${isHovered ? "flex" : "hidden"}`}
			data-testid={`dentalpro-realtime-bar-${a.id}`}
		>
			{(a.status === "planned" || a.status === "confirmed") && (
				<>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStatusChange(a.id, "arrived");
							playIntercomChime("urgent");
							showToast(`Пациент ${pName} прибыл в холл клиники`, "info");
						}}
						className="h-[22px] min-h-[22px] w-[22px] min-w-[22px] p-0 rounded text-[10px] font-extrabold bg-amber-500/15 hover:bg-amber-500 text-amber-800 hover:text-white dark:text-amber-200 dark:hover:text-white border border-amber-500/40 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs shrink-0"
						title="Пациент пришёл — перевести «В холл» и подать сигнал в интерком"
						data-testid={`dentalpro-quick-arrived-${a.id}`}
					>
						<UserCheck size={11} className="shrink-0" />
						<span className="sr-only">Прибыл</span>
					</button>
					<button
						type="button"
						onClick={(e) => {
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
						}}
						className="h-[22px] min-h-[22px] w-[22px] min-w-[22px] p-0 rounded text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-xs shrink-0"
						title="Начать приём у кресла (#visit)"
						data-testid={`dentalpro-quick-start-treatment-${a.id}`}
					>
						<Stethoscope size={11} className="shrink-0" />
						<span className="sr-only">Приём</span>
					</button>
				</>
			)}
			{(a.status === "arrived" || (a.status as string) === "in_clinic" || (a.status as string) === "waiting") && (
				<button
					type="button"
					onClick={(e) => {
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
					}}
					className="h-[22px] min-h-[22px] w-[22px] min-w-[22px] p-0 rounded text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-xs shrink-0 animate-pulse"
					title="Пригласить в кабинет — перевести в статус «В кресле» и начать приём (#visit)"
					data-testid={`dentalpro-quick-in-chair-${a.id}`}
				>
					<CalendarCheck size={11} className="shrink-0" />
					<span className="sr-only">В кресло</span>
				</button>
			)}
			{isAppointmentInChair(a.status) && (
				<>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							const pid = a.patientId || patObj?.id;
							if (pid) {
								usePatientStore.getState().setSelectedPatientId(pid);
							}
							if (typeof window !== "undefined") {
								window.location.hash = "#visit";
							}
							useAppStore.getState().setCurrentView("visit");
							showToast(`Открыта карта приёма: ${pName}`, "info");
						}}
						className="h-[22px] min-h-[22px] w-[22px] min-w-[22px] p-0 rounded text-[10px] font-extrabold bg-[var(--teal)] hover:opacity-90 text-white border border-[var(--teal)] transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-xs shrink-0"
						title="Открыть карту приёма пациента у кресла (#visit)"
						data-testid={`dentalpro-quick-open-visit-${a.id}`}
					>
						<Stethoscope size={11} className="shrink-0" />
						<span className="sr-only">Приём</span>
					</button>
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							onQuickStatusChange(a.id, "completed");
							showToast(`Приём ${pName} завершён — направлен на кассу`, "success");
						}}
						className="h-[22px] min-h-[22px] w-[22px] min-w-[22px] p-0 rounded text-[10px] font-extrabold bg-slate-700 hover:bg-slate-800 text-white border border-slate-600 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs shrink-0"
						title="Завершить приём у кресла и отправить на оплату"
						data-testid={`dentalpro-quick-complete-${a.id}`}
					>
						<Check size={11} className="stroke-[3]" />
						<span className="sr-only">Завершить</span>
					</button>
				</>
			)}
			{a.status === "completed" && (
				<button
					type="button"
					onClick={(e) => {
						e.stopPropagation();
						if (patObj?.id) {
							usePatientStore.getState().setSelectedPatientId(patObj.id);
						}
						useAppStore.getState().setCurrentView("finance");
						showToast(`Касса: оплата визита ${pName}`, "info");
					}}
					className="h-[22px] min-h-[22px] w-[22px] min-w-[22px] p-0 rounded text-[10px] font-extrabold bg-emerald-500/15 hover:bg-emerald-600 text-emerald-800 hover:text-white dark:text-emerald-200 dark:hover:text-white border border-emerald-500/40 transition-all flex items-center justify-center cursor-pointer active:scale-95 shadow-2xs shrink-0"
					title="Перейти к оплате на кассе"
					data-testid={`dentalpro-quick-pay-${a.id}`}
				>
					<CreditCard size={11} />
					<span className="sr-only">Касса</span>
				</button>
			)}
		</div>
	);
}
