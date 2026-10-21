import type { Appointment } from "@dental/shared";
import { evaluateAppointmentLabStatus } from "@dental/shared";
import {
	extractTeethList,
	resolveAppointmentLabStatus,
} from "../appointmentCardHelpers";

export interface NormalizedLabItem {
	id: string;
	orderNumber: string;
	statusInfo: NonNullable<ReturnType<typeof evaluateAppointmentLabStatus>>;
	construction: string;
	toothFdi: string | null;
	colorVita: string | null;
	dueDateIso: string | null;
}

export function normalizeAppointmentLabItems(
	appointment: Appointment,
	activeLabOrders: any[] = [],
	referenceDate: Date,
): NormalizedLabItem[] {
	const items: NormalizedLabItem[] = [];

	if (Array.isArray(activeLabOrders) && activeLabOrders.length > 0) {
		for (const lo of activeLabOrders) {
			const statusInfo = evaluateAppointmentLabStatus(lo, referenceDate);
			if (!statusInfo) continue;
			items.push({
				id: String(lo.id || Math.random()),
				orderNumber: lo.orderNumber || lo.id?.slice(0, 8) || "ЗТЛ",
				statusInfo,
				construction:
					lo.workTypeRu ||
					lo.workType ||
					lo.material ||
					lo.title ||
					lo.constructionType ||
					"Ортопедическая конструкция",
				toothFdi: lo.toothFdi || lo.toothNumber || null,
				colorVita: lo.colorVita || lo.vitaShade || lo.shade || null,
				dueDateIso: lo.dueDate || lo.expectedDeliveryDate || null,
			});
		}
	}

	if (items.length === 0) {
		const apptLabInfo = resolveAppointmentLabStatus(
			appointment,
			undefined,
			referenceDate,
		);
		if (apptLabInfo) {
			items.push({
				id: (appointment as any)?.labOrderId || `appt-lab-${appointment.id}`,
				orderNumber:
					apptLabInfo.orderNumber ||
					(appointment as any)?.labOrderNumber ||
					"Наряд ЗТЛ",
				statusInfo: apptLabInfo,
				construction:
					apptLabInfo.workTypeRu ||
					(appointment as any)?.labWorkTitle ||
					(appointment as any)?.labWorkType ||
					(appointment as any)?.material ||
					appointment.reason ||
					"Ортопедическая конструкция",
				toothFdi:
					apptLabInfo.toothFdi || extractTeethList(appointment)[0] || null,
				colorVita:
					apptLabInfo.colorVita || (appointment as any)?.colorVita || null,
				dueDateIso:
					apptLabInfo.dueDateIso || (appointment as any)?.labDueDate || null,
			});
		}
	}

	return items;
}
