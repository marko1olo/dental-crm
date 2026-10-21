import React from "react";
import { AlertCircle, AlertTriangle, Check, Clock } from "lucide-react";

interface AppointmentModalFooterHelperProps {
	error: string | null;
	patientId: string;
	isTechnicalBreak: boolean;
	isInlineNewPatient: boolean;
	patientSearchQuery: string;
	newPatientFullName: string;
	newPatientPhone: string;
	isSoloDoctor: boolean;
}

export function AppointmentModalFooterHelper({
	error,
	patientId,
	isTechnicalBreak,
	isInlineNewPatient,
	patientSearchQuery,
	newPatientFullName,
	newPatientPhone,
	isSoloDoctor,
}: AppointmentModalFooterHelperProps) {
	return (
		<div className="flex items-center justify-between gap-2 text-xs">
			{error ? (
				<span className="text-xs text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5" data-testid="appointment-modal-inline-helper">
					<AlertTriangle size={13} className="shrink-0" />
					<span>{error}</span>
				</span>
			) : !patientId && !isTechnicalBreak && !isInlineNewPatient && patientSearchQuery.trim() ? (
				<span className="text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1.5" data-testid="appointment-modal-inline-helper">
					<Check size={13} className="shrink-0" />
					<span>Пациент «{patientSearchQuery.trim()}» будет создан автоматически при сохранении (Ctrl+Enter)</span>
				</span>
			) : !patientId && !isTechnicalBreak && !isInlineNewPatient ? (
				<span className="text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1.5" data-testid="appointment-modal-inline-helper">
					<Check size={13} className="shrink-0 text-emerald-500" />
					<span>Экспресс-запись: выберите пациента, нажмите «+ Аноним» или просто сохраните</span>
				</span>
			) : isInlineNewPatient && !newPatientFullName.trim() && !newPatientPhone.trim() ? (
				<span className="text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1.5" data-testid="appointment-modal-inline-helper">
					<AlertCircle size={13} className="shrink-0" />
					<span>Введите ФИО или номер телефона для быстрой регистрации</span>
				</span>
			) : isTechnicalBreak ? (
				<span className="text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1.5" data-testid="appointment-modal-inline-helper">
					<Clock size={13} className="shrink-0" />
					<span>Служебный перерыв в расписании (пациент не требуется)</span>
				</span>
			) : (
				<span className="text-[var(--muted)] flex items-center gap-1.5" data-testid="appointment-modal-inline-helper">
					<Check size={13} className="text-emerald-500 shrink-0" />
					<span>Готово к сохранению (горячая клавиша: Ctrl+Enter)</span>
				</span>
			)}
			<span className="text-[11px] text-[var(--muted)] hidden sm:inline">
				{isSoloDoctor ? "Режим: соло-врач" : "Ассистент: опционально"}
			</span>
		</div>
	);
}
