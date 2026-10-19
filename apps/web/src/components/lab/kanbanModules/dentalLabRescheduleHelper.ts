import type { DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";

export function triggerLabOrderReschedule(
	order: DentalLabWorkflowOrder,
	onRescheduleAppointment?: (order: DentalLabWorkflowOrder) => void,
) {
	if (onRescheduleAppointment) {
		onRescheduleAppointment(order);
	} else if (typeof window !== "undefined") {
		const rescheduleDraft = {
			patientId: order.patientId,
			patientName: order.patientName,
			orderNumber: order.orderNumber,
			dueDate: order.expectedLabDateIso,
			reason: "Перенос приема из-за задержки лаборатории",
		};
		try {
			window.localStorage.setItem(
				"dente_schedule_quick_booking_draft",
				JSON.stringify(rescheduleDraft),
			);
			window.dispatchEvent(
				new CustomEvent("dente-open-quick-booking", {
					detail: rescheduleDraft,
				}),
			);
			window.location.hash = "#schedule";
		} catch {}
	}
}
