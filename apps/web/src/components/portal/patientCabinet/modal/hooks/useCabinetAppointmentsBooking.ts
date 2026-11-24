import { useCallback } from "react";
import { generateUuidV7 } from "@dental/shared";
import { clientLogger } from "../../../../../services/logging/clientLogger";
import type {
	PatientAppointment,
	PatientPersonalCabinetData,
} from "../../patientCabinetEngine.js";
import type { AvailableDoctorItem } from "../types.js";

export function useCabinetAppointmentsBooking(
	token: string | undefined,
	availableDoctors: readonly AvailableDoctorItem[],
	setData: React.Dispatch<React.SetStateAction<PatientPersonalCabinetData>>,
	handleShowCabinetToast: (msg: string) => void,
	onAppointmentBooked?: (payload: { specialty: string; preferredDate: string; note?: string }) => void,
) {
	const handleRescheduleSubmit = useCallback(
		async (req: {
			appointmentId: string;
			newDate: string;
			newTime: string;
			reason: string;
		}) => {
			if (token) {
				try {
					const startDateTime = new Date(`${req.newDate}T${req.newTime}:00`);
					const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);
					const res = await fetch(`/api/portal/appointments/${encodeURIComponent(req.appointmentId)}/reschedule`, {
						method: "PATCH",
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
							"Idempotency-Key": generateUuidV7(),
						},
						body: JSON.stringify({
							startsAt: startDateTime.toISOString(),
							endsAt: endDateTime.toISOString(),
							reason: req.reason,
						}),
					});
					const json = await res.json().catch(() => null);
					if (res.ok) {
						setData((prev) => ({
							...prev,
							appointments: prev.appointments.map((a) =>
								a.id === req.appointmentId
									? { ...a, dateIso: req.newDate, timeRu: req.newTime, status: "scheduled" }
									: a,
							),
						}));
						handleShowCabinetToast(`Запись успешно перенесена на ${req.newDate} в ${req.newTime}!`);
						onAppointmentBooked?.({
							specialty: "Перенос записи",
							preferredDate: `${req.newDate} ${req.newTime}`,
							note: `Перенос визита ${req.appointmentId}. Причина: ${req.reason}`,
						});
						return;
					}
					handleShowCabinetToast(json?.message || "Не удалось перенести запись на выбранное время.");
					return;
				} catch (err) {
					clientLogger.error("[PatientCabinetModal] Failed to reschedule appointment:", err);
					handleShowCabinetToast("Ошибка сети при переносе записи. Попробуйте позже.");
					return;
				}
			}
			onAppointmentBooked?.({
				specialty: "Перенос записи",
				preferredDate: `${req.newDate} ${req.newTime}`,
				note: `Перенос визита ${req.appointmentId}. Причина: ${req.reason}`,
			});
		},
		[token, handleShowCabinetToast, onAppointmentBooked, setData],
	);

	const handleBookingSubmit = useCallback(
		async (req: {
			goalId: string;
			doctorId: string;
			doctorName?: string;
			date: string;
			time: string;
			comment: string;
		}) => {
			if (token) {
				try {
					const startDateTime = new Date(`${req.date}T${req.time}:00`);
					const endDateTime = new Date(startDateTime.getTime() + 30 * 60 * 1000);
					const matchingDoc = availableDoctors.find((d) => d.id === req.doctorId || d.fullName === req.doctorId);
					const targetDocId = matchingDoc?.id || (req.doctorId && req.doctorId.includes("-") ? req.doctorId : availableDoctors[0]?.id);

					if (targetDocId && !Number.isNaN(startDateTime.getTime())) {
						const res = await fetch("/api/portal/appointments", {
							method: "POST",
							headers: {
								Authorization: `Bearer ${token}`,
								"Content-Type": "application/json",
								"Idempotency-Key": crypto.randomUUID(),
							},
							body: JSON.stringify({
								doctorId: targetDocId,
								startsAt: startDateTime.toISOString(),
								endsAt: endDateTime.toISOString(),
								reason: req.goalId,
								comment: req.comment || undefined,
							}),
						});
						const json = await res.json().catch(() => null);
						if (res.ok && json?.appointment) {
							const newApt: PatientAppointment = {
								id: json.appointment.id,
								dateIso: req.date,
								timeRu: req.time,
								doctorId: targetDocId,
								doctorName: req.doctorName || matchingDoc?.fullName || "Лечащий врач",
								doctorSpecialtyRu: matchingDoc?.specialties?.[0] || "Стоматолог-терапевт",
								roomNumber: "Кабинет 1",
								clinicName: "Стоматологическая клиника ДЕНТЕ",
								clinicAddressRu: "г. Москва, ул. Арбат, д. 24",
								titleRu: req.goalId,
								status: "scheduled",
								reminderSent: true,
								reminderChannel: "sms",
							};
							setData((prev) => ({ ...prev, appointments: [newApt, ...prev.appointments] }));
							handleShowCabinetToast(`Запись подтверждена на ${req.date} в ${req.time}!`);
							onAppointmentBooked?.({ specialty: req.goalId, preferredDate: `${req.date} ${req.time}`, note: req.comment });
							return;
						}
						handleShowCabinetToast(json?.message || "Не удалось создать запись на приём.");
						return;
					}
				} catch (err) {
					clientLogger.error("[PatientCabinetModal] Failed to post /api/portal/appointments:", err);
					handleShowCabinetToast("Ошибка сети при оформлении записи. Попробуйте позже.");
					return;
				}
			} else {
				handleShowCabinetToast(`Запись оформлена на ${req.date} в ${req.time}! СМС-подтверждение отправлено.`);
				onAppointmentBooked?.({ specialty: req.goalId, preferredDate: `${req.date} ${req.time}`, note: req.comment });
			}
		},
		[token, availableDoctors, handleShowCabinetToast, onAppointmentBooked, setData],
	);

	const handleCancelAppointment = useCallback(
		async (aptId: string, reason: string) => {
			if (token) {
				try {
					const res = await fetch(`/api/portal/appointments/${encodeURIComponent(aptId)}/cancel`, {
						method: "PATCH",
						headers: {
							Authorization: `Bearer ${token}`,
							"Content-Type": "application/json",
							"Idempotency-Key": generateUuidV7(),
						},
						body: JSON.stringify({ reason }),
					});
					if (!res.ok) {
						const errJson = (await res.json().catch(() => null)) as { message?: string } | null;
						handleShowCabinetToast(errJson?.message || "Не удалось отменить запись. Попробуйте позже.");
						return;
					}
					handleShowCabinetToast("Запись успешно отменена.");
				} catch (err) {
					clientLogger.error("[PatientCabinetModal] Failed to cancel appointment:", err);
					handleShowCabinetToast("Ошибка сети при отмене записи. Попробуйте позже.");
					return;
				}
			}
			setData((prev) => ({
				...prev,
				appointments: prev.appointments.map((a) => (a.id === aptId ? { ...a, status: "cancelled", cancellationReason: reason } : a)),
			}));
		},
		[token, handleShowCabinetToast, setData],
	);

	return { handleRescheduleSubmit, handleBookingSubmit, handleCancelAppointment };
}
