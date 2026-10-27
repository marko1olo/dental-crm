/**
 * dentalLabHubSampleOrders.ts — Демо-наряды ЗТЛ для автономных стендов и витрины (Мандат 8b, <= 120 строк).
 */

import { createDentalLabOrder, type DentalLabWorkflowOrder } from "../dentalLabWorkflowEngine";

export function getSampleDentalLabOrders(): DentalLabWorkflowOrder[] {
	return [
		createDentalLabOrder({
			patientId: "demo-p-1",
			patientName: "Ковалев Дмитрий Сергеевич",
			doctorName: "Д-р Смирнова Е. В. (Ортопед)",
			workTypeId: "crown_emax",
			selectedTeeth: [16],
			shadeCode: "A2",
			laboratoryName: "CAD/CAM Центр Дентал-Мастер",
			costPerUnitRub: 4500,
			pricePerUnitRub: 18000,
			initialStatus: "sent_to_lab",
		}),
		createDentalLabOrder({
			patientId: "demo-p-2",
			patientName: "Смирнова Анна Сергеевна",
			doctorName: "Д-р Соколов А. В. (Ортопед)",
			workTypeId: "crown_zirconia",
			selectedTeeth: [21],
			shadeCode: "A1",
			laboratoryName: "ArtDent Премиум Лаб",
			costPerUnitRub: 6000,
			pricePerUnitRub: 24000,
			initialStatus: "in_progress_lab",
		}),
		createDentalLabOrder({
			patientId: "demo-p-3",
			patientName: "Иванов Виктор Владимирович",
			doctorName: "Д-р Смирнова Е. В. (Ортопед)",
			workTypeId: "bridge_zirconia",
			selectedTeeth: [14, 15, 16],
			shadeCode: "B1",
			laboratoryName: "ZirconLab Pro",
			costPerUnitRub: 15000,
			pricePerUnitRub: 55000,
			initialStatus: "delivered_to_clinic",
		}),
		createDentalLabOrder({
			patientId: "demo-p-4",
			patientName: "Петрова Елена Николаевна",
			doctorName: "Д-р Кузнецов И. М. (Ортопед)",
			workTypeId: "veneer_emax",
			selectedTeeth: [11],
			shadeCode: "BL2",
			laboratoryName: "CAD/CAM Центр Дентал-Мастер",
			costPerUnitRub: 5000,
			pricePerUnitRub: 22000,
			initialStatus: "draft",
		}),
	];
}
