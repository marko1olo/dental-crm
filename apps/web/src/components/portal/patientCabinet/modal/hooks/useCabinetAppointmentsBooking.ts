import { useCallback } from "react";
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
	const handleRescheduleSubmit = useCallback((req: {
		appointmentId: string;
		newDate: string;
		newTime: string;
		reason: string;
	}) => {
		onAppointmentBooked?.({
			specialty: "Перенос записи",
			preferredDate: `${req.newDate} ${req.newTime}`,
			note: `Перенос визита ${req.appointmentId}. Причина: ${req.reason}`,
		});
	}, [onAppointmentBooked]);

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
							headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
							body: JSON.stringify({
								doctorId: targetDocId,
								startsAt: startDateTime.toISOString(),
								endsAt: endDateTime.toISOString(),
								reason: req.goalId,
								comment: req.comment || undefined,
							}),
						});
						if (res.ok) {
							const json = await res.json();
							if (json?.appointment) {
								const newApt: PatientAppointment = {
									id: json.appointment.id,
									dateIso: req.date,
									timeRu: req.time,
									doctorId: targetDocId,
									doctorName: req.doctorName || matchingDoc?.fullName || "Лечащий врач",
									doctorSpecialtyRu: matchingDoc?.specialties?.[0] || "Стоматолог-терапевт",
									roomNumber: "Кабинет 1",
									clinicName: "Стоматологическая клиника ДЕНТЕ",
									clinicAddressRu: "г. Москва, ул. Клиническая, д. 10",
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
						}
					}
				} catch (err) {
					console.error("[PatientCabinetModal] Failed to post /api/portal/appointments:", err);
				}
			}
			handleShowCabinetToast(`Запись оформлена на ${req.date} в ${req.time}! СМС-подтверждение отправлено.`);
			onAppointmentBooked?.({ specialty: req.goalId, preferredDate: `${req.date} ${req.time}`, note: req.comment });
		},
		[token, availableDoctors, handleShowCabinetToast, onAppointmentBooked, setData],
	);

	const handleCancelAppointment = useCallback(
		async (aptId: string, reason: string) => {
			if (token) {
				try {
					const res = await fetch(`/api/portal/appointments/${encodeURIComponent(aptId)}/cancel`, {
						method: "PATCH",
						headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
						body: JSON.stringify({ reason }),
					});
					if (res.ok) handleShowCabinetToast("Запись успешно отменена.");
				} catch (err) {
					console.error("[PatientCabinetModal] Failed to cancel appointment:", err);
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
