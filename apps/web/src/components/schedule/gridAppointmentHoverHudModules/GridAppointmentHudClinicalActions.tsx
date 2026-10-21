import type { Appointment } from "@dental/shared";
import {
	CalendarPlus,
	ClipboardList,
	CreditCard,
	FileText,
	HeartPulse,
	UserMinus,
} from "lucide-react";
import { useAppStore } from "../../../store/appStore";
import { usePatientStore } from "../../../store/patientStore";
import { showToast } from "../../GlobalToast";

interface GridAppointmentHudClinicalActionsProps {
	appointment: Appointment;
	patObj?: any;
	pName: string;
	onMouseLeave: () => void;
	onFreeSlotToWaitlist?: (appt: Appointment) => void;
}

export function GridAppointmentHudClinicalActions({
	appointment: a,
	patObj,
	pName,
	onMouseLeave,
	onFreeSlotToWaitlist,
}: GridAppointmentHudClinicalActionsProps) {
	return (
		<div
			className="pt-2 border-t border-[var(--line)] space-y-1.5"
			data-testid={`clinical-micro-hud-${a.id}`}
		>
			<div className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] flex items-center justify-between">
				<span>Клинические действия</span>
			</div>
			<div className="grid grid-cols-3 gap-1">
				{/* 1. Медицинская карта */}
				<button
					type="button"
					data-testid={`hud-action-emr-${a.id}`}
					onClick={(e) => {
						e.stopPropagation();
						onMouseLeave();
						if (patObj?.id) {
							usePatientStore.getState().setSelectedPatientId(patObj.id);
						}
						useAppStore.getState().setCurrentView("visit");
						showToast(`Медицинская карта: ${pName}`, "info");
					}}
					className="h-8 px-1.5 rounded-lg text-[10px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
					title="Открыть медицинскую карту пациента"
				>
					<FileText size={12} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
					<span className="truncate">Медкарта</span>
				</button>

				{/* 2. Запланировать посещение (Re-book) */}
				<button
					type="button"
					data-testid={`hud-action-rebook-${a.id}`}
					onClick={(e) => {
						e.stopPropagation();
						onMouseLeave();
						if (patObj?.id) {
							usePatientStore.getState().setSelectedPatientId(patObj.id);
						}
						useAppStore.getState().setCurrentView("schedule");
						showToast(`Запланировать визит для ${pName}`, "info");
					}}
					className="h-8 px-1.5 rounded-lg text-[10px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
					title="Запланировать следующее посещение (Re-book)"
				>
					<CalendarPlus size={12} className="text-[var(--teal)] shrink-0" />
					<span className="truncate">Запись +</span>
				</button>

				{/* 3. Заполнить анкету здоровья */}
				<button
					type="button"
					data-testid={`hud-action-health-questionnaire-${a.id}`}
					onClick={(e) => {
						e.stopPropagation();
						onMouseLeave();
						if (patObj?.id) {
							usePatientStore.getState().setSelectedPatientId(patObj.id);
						}
						useAppStore.getState().setCurrentView("patients");
						if (typeof window !== "undefined") {
							window.location.hash = "#health-anamnesis";
						}
						showToast(`Анкета здоровья: ${pName}`, "info");
					}}
					className="h-8 px-1.5 rounded-lg text-[10px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
					title="Заполнить анкету здоровья / соматический анамнез"
				>
					<HeartPulse size={12} className="text-rose-500 shrink-0" />
					<span className="truncate">Анкета</span>
				</button>

				{/* 4. План лечения */}
				<button
					type="button"
					data-testid={`hud-action-treatment-plan-${a.id}`}
					onClick={(e) => {
						e.stopPropagation();
						onMouseLeave();
						if (patObj?.id) {
							usePatientStore.getState().setSelectedPatientId(patObj.id);
						}
						useAppStore.getState().setCurrentView("patients");
						if (typeof window !== "undefined") {
							window.location.hash = "#treatment-plans";
						}
						showToast(`Планы лечения: ${pName}`, "info");
					}}
					className="h-8 px-1.5 rounded-lg text-[10px] font-bold bg-[var(--paper-soft)] hover:bg-[var(--teal-soft)] hover:text-[var(--teal-dark)] border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
					title="Открыть планы лечения и сметы"
				>
					<ClipboardList size={12} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
					<span className="truncate">План</span>
				</button>

				{/* 5. Результат посещения / Расчёт */}
				<button
					type="button"
					data-testid={`hud-action-checkout-${a.id}`}
					onClick={(e) => {
						e.stopPropagation();
						onMouseLeave();
						if (patObj?.id) {
							usePatientStore.getState().setSelectedPatientId(patObj.id);
						}
						useAppStore.getState().setCurrentView("finance");
						showToast(`Результат посещения и касса: ${pName}`, "info");
					}}
					className="h-8 px-1.5 rounded-lg text-[10px] font-bold bg-[var(--paper-soft)] hover:bg-emerald-500/15 text-emerald-800 dark:text-emerald-200 border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
					title="Результат посещения и кассовый расчёт"
				>
					<CreditCard size={12} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
					<span className="truncate">Результат</span>
				</button>

				{/* 6. В лист ожидания */}
				<button
					type="button"
					data-testid={`hud-action-waitlist-${a.id}`}
					onClick={(e) => {
						e.stopPropagation();
						onMouseLeave();
						if (onFreeSlotToWaitlist) {
							onFreeSlotToWaitlist(a);
						} else {
							showToast("Слот перенесён в лист ожидания", "info");
						}
					}}
					className="h-8 px-1.5 rounded-lg text-[10px] font-bold bg-[var(--paper-soft)] hover:bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-[var(--line)] flex items-center justify-center gap-1 cursor-pointer transition-colors"
					title="Перенести запись в лист ожидания"
				>
					<UserMinus size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
					<span className="truncate">В лист ож.</span>
				</button>
			</div>
		</div>
	);
}
