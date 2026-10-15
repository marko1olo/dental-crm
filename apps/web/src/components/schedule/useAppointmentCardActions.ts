import type { Appointment, Dashboard } from "@dental/shared";
import React, { useCallback, useState } from "react";
import { showToast } from "../GlobalToast";
import { useAppStore } from "../../store/appStore";
import { usePatientStore } from "../../store/patientStore";
import { broadcastVisitStatusChange } from "../../services/storage";

export interface AppointmentActionsOptions {
	appointment: Appointment;
	dashboard?: Dashboard;
	appointmentDraft?: any;
	appointmentEditing?: boolean;
	appointmentHasOpenVisit?: boolean;
	appointmentLabels?: Record<string, string>;
	appointmentPatient?: any;
	appointmentPatientName: string;
	appointmentDoctor?: any;
	appointmentChair?: any;
	activeVisitLockedAppointmentStatuses?: Set<string>;
	formatTime: (iso: string) => string;
	patientName: (patients: any, patientId: string | null) => string;
	normalizedAppointmentStatus: (status: Appointment["status"]) => Appointment["status"];
	updateAppointmentScheduleDraft: (id: string, field: string, value: any) => void;
	saveAppointmentSchedule: (id: string) => Promise<boolean>;
	openAppointmentEditor: (appt: Appointment) => void;
	repeatAppointment: (appt: Appointment) => void;
	copyAppointmentToBuffer?: ((appt: Appointment) => void) | undefined;
	onOpenVisit?: (() => void) | undefined;
	onOpenWaitlistForSlot?: ((slot: any) => void) | undefined;
}

export function useAppointmentCardActions(options: AppointmentActionsOptions) {
	const {
		appointment,
		dashboard,
		appointmentDraft,
		appointmentEditing,
		appointmentHasOpenVisit,
		appointmentLabels,
		appointmentPatient,
		appointmentPatientName,
		appointmentDoctor,
		appointmentChair,
		activeVisitLockedAppointmentStatuses,
		formatTime,
		patientName,
		normalizedAppointmentStatus,
		updateAppointmentScheduleDraft,
		saveAppointmentSchedule,
		openAppointmentEditor,
		repeatAppointment,
		copyAppointmentToBuffer,
		onOpenVisit,
		onOpenWaitlistForSlot,
	} = options;

	const [isQuickStatusUpdating, setIsQuickStatusUpdating] = useState(false);
	const [optimisticStatus, setOptimisticStatus] = useState<Appointment["status"] | null>(null);

	const handleQuickStatusChange = useCallback(
		async (newStatus: Appointment["status"], noteAppend?: string) => {
			if (appointmentHasOpenVisit && activeVisitLockedAppointmentStatuses?.has(newStatus)) {
				if (onOpenVisit) {
					onOpenVisit();
				} else {
					if (appointmentPatient?.id) usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
					useAppStore.getState().setCurrentView("visit");
				}
				showToast("Переход в активный визит для сохранения протокола и завершения приёма", "info");
				return;
			}
			const prevStatus = appointment.status;
			const normalized = normalizedAppointmentStatus(newStatus);
			setOptimisticStatus(normalized);
			updateAppointmentScheduleDraft(appointment.id, "status", normalized);
			if (noteAppend) {
				const currentComment = String(appointmentDraft?.comment || appointment.comment || "").trim();
				const updatedComment = currentComment ? `${currentComment}; ${noteAppend}` : noteAppend;
				updateAppointmentScheduleDraft(appointment.id, "comment", updatedComment);
			}
			setIsQuickStatusUpdating(true);
			try {
				const success = await saveAppointmentSchedule(appointment.id);
				if (success) {
					const label = appointmentLabels?.[normalized] ?? normalized;
					showToast(`«${appointmentPatientName}» — статус «${label}»`, "success", 3000);
					if (normalized === "cancelled") {
						const slotInfo = {
							appointmentId: appointment.id,
							startsAt: appointment.startsAt,
							endsAt: appointment.endsAt,
							doctorUserId: appointment.doctorUserId,
							doctorName: appointmentDoctor?.fullName || null,
							chairId: appointment.chairId,
							chairName: appointmentChair?.name || null,
							patientId: appointment.patientId,
							patientName: appointmentPatientName,
							freedBecause: noteAppend || "Отмена приёма",
							reason: appointment.reason,
						};
						if (onOpenWaitlistForSlot) {
							onOpenWaitlistForSlot(slotInfo);
							showToast("В листе ожидания есть пациенты на освободившееся время", "info", 5000);
						} else {
							showToast(`Приём отменён. Время ${appointment.startsAt ? appointment.startsAt.slice(11, 16) : ""} освобождено для записи`, "info", 3000);
						}
					}
					try {
						broadcastVisitStatusChange({
							visitId: appointment.id,
							status: normalized,
							patientId: appointmentPatient?.id,
							patientName: appointmentPatientName,
							updatedAt: new Date().toISOString(),
						});
					} catch {
						// Non-blocking cross-tab broadcast
					}
				} else {
					setOptimisticStatus(null);
					updateAppointmentScheduleDraft(appointment.id, "status", prevStatus);
					showToast("Не удалось сохранить статус приёма", "error");
				}
			} catch {
				setOptimisticStatus(null);
				updateAppointmentScheduleDraft(appointment.id, "status", prevStatus);
				showToast("Ошибка при сохранении статуса приёма", "error");
			} finally {
				setIsQuickStatusUpdating(false);
			}
		},
		[
			appointment.id, appointment.status, appointment.comment, appointment.startsAt,
			appointment.endsAt, appointment.doctorUserId, appointment.chairId, appointment.patientId,
			appointment.reason, appointmentDoctor?.fullName, appointmentChair?.name, appointmentDraft?.comment,
			appointmentHasOpenVisit, activeVisitLockedAppointmentStatuses, normalizedAppointmentStatus,
			updateAppointmentScheduleDraft, saveAppointmentSchedule, appointmentPatientName, appointmentLabels,
			onOpenVisit, onOpenWaitlistForSlot, appointmentPatient?.id,
		],
	);

	const handleShiftAppointmentTime = useCallback(
		async (minutes: number) => {
			const curStart = new Date(appointment.startsAt).getTime();
			const curEnd = new Date(appointment.endsAt).getTime();
			const durationMs = curEnd - curStart;
			const newStartMs = curStart + minutes * 60000;
			const newEndMs = newStartMs + durationMs;
			const newStartIso = new Date(newStartMs).toISOString();
			const newEndIso = new Date(newEndMs).toISOString();

			const endDateObj = new Date(newEndMs);
			const endTotalMinutes = endDateObj.getHours() * 60 + endDateObj.getMinutes();
			if (endTotalMinutes > 21 * 60) {
				showToast(`Приём продлен в ночной овертайм (${formatTime(newEndIso)}). Сохранение визита разрешено без ограничений.`, "info", 3500);
			}

			const conflictingAppt = (dashboard?.appointments ?? []).find((other) => {
				if (other.id === appointment.id || other.status === "cancelled" || other.status === "no_show") return false;
				const sameDoctor = Boolean(other.doctorUserId && other.doctorUserId === appointment.doctorUserId);
				const sameChair = Boolean(other.chairId && other.chairId === appointment.chairId);
				if (!sameDoctor && !sameChair) return false;
				const otherStart = new Date(other.startsAt).getTime();
				const otherEnd = new Date(other.endsAt).getTime();
				return newStartMs < otherEnd && newEndMs > otherStart;
			});

			if (conflictingAppt) {
				const otherPatientName = patientName(dashboard?.patients ?? [], conflictingAppt.patientId);
				const resourceReason = conflictingAppt.doctorUserId === appointment.doctorUserId ? "у этого врача" : "в этом кресле";
				showToast(`Конфликт наложения ${resourceReason}: сдвиг на +${minutes} мин пересекается с записью «${otherPatientName}» (${formatTime(conflictingAppt.startsAt)} – ${formatTime(conflictingAppt.endsAt)})`, "error", 5000);
				return;
			}

			updateAppointmentScheduleDraft(appointment.id, "startsAt", newStartIso);
			updateAppointmentScheduleDraft(appointment.id, "endsAt", newEndIso);
			setIsQuickStatusUpdating(true);
			try {
				const success = await saveAppointmentSchedule(appointment.id);
				if (success) {
					showToast(`Запись «${appointmentPatientName}» сдвинута на +${minutes} мин (${formatTime(newStartIso)} – ${formatTime(newEndIso)})`, "success", 3500);
				} else {
					updateAppointmentScheduleDraft(appointment.id, "startsAt", appointment.startsAt);
					updateAppointmentScheduleDraft(appointment.id, "endsAt", appointment.endsAt);
					showToast("Не удалось сдвинуть время записи", "error");
				}
			} catch {
				updateAppointmentScheduleDraft(appointment.id, "startsAt", appointment.startsAt);
				updateAppointmentScheduleDraft(appointment.id, "endsAt", appointment.endsAt);
				showToast("Ошибка при сдвиге времени записи", "error");
			} finally {
				setIsQuickStatusUpdating(false);
			}
		},
		[
			appointment.id, appointment.doctorUserId, appointment.chairId, appointment.startsAt,
			appointment.endsAt, appointmentPatientName, dashboard?.appointments, dashboard?.patients,
			formatTime, patientName, saveAppointmentSchedule, updateAppointmentScheduleDraft,
		],
	);

	const handleCardKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLElement>) => {
			const targetTag = (e.target as HTMLElement).tagName.toLowerCase();
			if (targetTag === "input" || targetTag === "textarea" || targetTag === "select") return;

			if (e.key === "Enter" && !appointmentEditing) {
				e.preventDefault();
				openAppointmentEditor(appointment);
			} else if (e.key === " " && !appointmentEditing) {
				e.preventDefault();
				const cur = optimisticStatus ?? appointment.status;
				let nextStatus: Appointment["status"] = "arrived";
				if (cur === "planned" || cur === "confirmed") nextStatus = "arrived";
				else if (cur === "arrived") nextStatus = "in_treatment";
				else if (cur === "in_treatment") nextStatus = "completed";
				else nextStatus = "confirmed";
				void handleQuickStatusChange(nextStatus);
			} else if (e.key === "1") {
				e.preventDefault();
				void handleQuickStatusChange("arrived");
			} else if (e.key === "2") {
				e.preventDefault();
				void handleQuickStatusChange("in_treatment");
			} else if (e.key === "3") {
				e.preventDefault();
				void handleQuickStatusChange("completed");
			} else if (e.key === "4") {
				e.preventDefault();
				void handleQuickStatusChange("no_show", "Опоздание");
			} else if (e.key === "5") {
				e.preventDefault();
				void handleQuickStatusChange("no_show");
			} else if ((e.key === "r" || e.key === "R" || e.key === "к" || e.key === "К") && !e.ctrlKey && !e.metaKey) {
				e.preventDefault();
				repeatAppointment(appointment);
			} else if ((e.key === "b" || e.key === "B" || e.key === "и" || e.key === "И") && !e.ctrlKey && !e.metaKey && copyAppointmentToBuffer) {
				e.preventDefault();
				copyAppointmentToBuffer(appointment);
			} else if ((e.key === "x" || e.key === "X" || e.key === "ч" || e.key === "Ч") && !e.ctrlKey && !e.metaKey) {
				e.preventDefault();
				if (typeof window !== "undefined") {
					if (appointmentPatient?.id) usePatientStore.getState().setSelectedPatientId(appointmentPatient.id);
					window.location.hash = "#radiology";
					showToast(`Открыты снимки и КТ пациента ${appointmentPatientName}`, "info");
				}
			}
		},
		[
			appointment, appointmentEditing, appointmentPatient?.id, appointmentPatientName,
			copyAppointmentToBuffer, handleQuickStatusChange, openAppointmentEditor, optimisticStatus, repeatAppointment,
		],
	);

	return {
		isQuickStatusUpdating,
		optimisticStatus,
		setOptimisticStatus,
		handleQuickStatusChange,
		handleShiftAppointmentTime,
		handleCardKeyDown,
	};
}
