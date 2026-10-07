import type { Appointment } from "@dental/shared";
import {
	CalendarCheck,
	CheckCircle2,
	CreditCard,
	PhoneCall,
	UserCheck,
	UserX,
} from "lucide-react";
import React from "react";
import { playIntercomChime } from "../../lib/intercomSound";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { showToast } from "../GlobalToast";
import { isAppointmentInChair } from "./appointmentCardHelpers";

export interface GridAppointmentStatusPopoverProps {
	appointmentId: string;
	currentStatus: Appointment["status"];
	patientId?: string | null;
	patientName: string;
	isOpen: boolean;
	onClose: () => void;
	onQuickStatusChange: (id: string, status: any) => void;
}

export function GridAppointmentStatusPopover({
	appointmentId,
	currentStatus,
	patientId,
	patientName,
	isOpen,
	onClose,
	onQuickStatusChange,
}: GridAppointmentStatusPopoverProps) {
	if (!isOpen) return null;

	return (
		<div
			className="absolute right-0 top-full mt-1 z-50 p-1.5 rounded-xl bg-[var(--paper)] border-2 border-[var(--teal,var(--brand-primary))] shadow-2xl min-w-[190px] max-w-[240px] space-y-1 text-xs text-[var(--ink)] animate-in fade-in zoom-in-95 duration-100"
			onClick={(e) => e.stopPropagation()}
			data-testid={`appointment-status-picker-popover-${appointmentId}`}
		>
			<div className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-[var(--muted)] border-b border-[var(--line)] pb-1">
				Статус визита
			</div>
			<button
				type="button"
				onClick={() => {
					onQuickStatusChange(appointmentId, "planned");
					onClose();
				}}
				className={`w-full text-left min-h-[34px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
					currentStatus === "planned"
						? "bg-slate-700 text-white font-bold"
						: "hover:bg-[var(--paper-soft)] text-slate-700 dark:text-slate-300"
				}`}
				data-testid={`quick-status-picker-planned-${appointmentId}`}
			>
				<CalendarCheck size={13} />
				<span>Запланирован</span>
			</button>
			<button
				type="button"
				onClick={() => {
					onQuickStatusChange(appointmentId, "confirmed");
					onClose();
				}}
				className={`w-full text-left min-h-[34px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
					currentStatus === "confirmed"
						? "bg-emerald-600 text-white font-bold"
						: "hover:bg-[var(--paper-soft)] text-emerald-700 dark:text-emerald-300"
				}`}
				data-testid={`quick-status-picker-confirmed-${appointmentId}`}
			>
				<PhoneCall size={13} />
				<span>Подтвержден</span>
			</button>
			<button
				type="button"
				onClick={() => {
					onQuickStatusChange(appointmentId, "arrived");
					playIntercomChime("urgent");
					showToast(`Пациент ${patientName} в холле клиники`, "info");
					onClose();
				}}
				className={`w-full text-left min-h-[34px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
					currentStatus === "arrived"
						? "bg-amber-500 text-white font-bold"
						: "hover:bg-[var(--paper-soft)] text-amber-700 dark:text-amber-300"
				}`}
				data-testid={`quick-status-picker-arrived-${appointmentId}`}
			>
				<UserCheck size={13} />
				<span>В холле (ожидает)</span>
			</button>
			<button
				type="button"
				onClick={() => {
					onQuickStatusChange(appointmentId, "in_treatment");
					playIntercomChime("normal");
					if (patientId) {
						usePatientStore.getState().setSelectedPatientId(patientId);
					}
					showToast(`Пациент ${patientName} в кресле`, "info");
					onClose();
				}}
				className={`w-full text-left min-h-[34px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
					isAppointmentInChair(currentStatus)
						? "bg-emerald-600 text-white font-bold"
						: "hover:bg-[var(--paper-soft)] text-emerald-700 dark:text-emerald-300"
				}`}
				data-testid={`quick-status-picker-in-treatment-${appointmentId}`}
			>
				<CalendarCheck size={13} />
				<span>В кресле (приём)</span>
			</button>
			<button
				type="button"
				onClick={() => {
					onQuickStatusChange(appointmentId, "completed");
					showToast(`Приём ${patientName} завершён`, "success");
					onClose();
				}}
				className={`w-full text-left min-h-[34px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
					currentStatus === "completed"
						? "bg-slate-600 text-white font-bold"
						: "hover:bg-[var(--paper-soft)] text-slate-700 dark:text-slate-300"
				}`}
				data-testid={`quick-status-picker-completed-${appointmentId}`}
			>
				<CheckCircle2 size={13} />
				<span>Завершён</span>
			</button>
			<button
				type="button"
				onClick={() => {
					onQuickStatusChange(appointmentId, "no_show");
					onClose();
				}}
				className={`w-full text-left min-h-[34px] px-2 py-1 rounded-lg flex items-center gap-2 font-medium transition-colors cursor-pointer ${
					currentStatus === "no_show"
						? "bg-rose-500 text-white font-bold"
						: "hover:bg-[var(--paper-soft)] text-rose-700 dark:text-rose-300"
				}`}
				data-testid={`quick-status-picker-no-show-${appointmentId}`}
			>
				<UserX size={13} />
				<span>Не явился</span>
			</button>
			<button
				type="button"
				onClick={() => {
					onClose();
					if (patientId) {
						usePatientStore.getState().setSelectedPatientId(patientId);
					}
					useAppStore.getState().setCurrentView("finance");
					showToast(`Касса: расчёт ${patientName}`, "info");
				}}
				className="w-full text-left min-h-[34px] px-2 py-1 rounded-lg flex items-center gap-2 font-bold transition-colors cursor-pointer border-t border-[var(--line)] pt-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
				data-testid={`quick-status-picker-pay-${appointmentId}`}
				title="Перейти к приёму оплаты на кассе"
			>
				<CreditCard size={13} className="text-emerald-600 dark:text-emerald-400" />
				<span>Оплата на кассе</span>
			</button>
		</div>
	);
}
