/**
 * dentalLabApiMapper.ts — Maps raw PostgreSQL 18 JSON response into typed DentalLabWorkflowOrder.
 */

import type { DentalLabWorkflowOrder } from "./dentalLabWorkflowEngine";

export function mapRawApiOrderToWorkflowOrder(
	raw: any,
	idx: number,
	defaultPatientId?: string,
	defaultPatientName?: string,
	defaultDoctorName?: string,
): DentalLabWorkflowOrder {
	const teethArr = raw.toothFdi
		? String(raw.toothFdi)
				.split(",")
				.map((t: string) => parseInt(t.trim(), 10))
				.filter((n: number) => !isNaN(n) && n >= 11 && n <= 48)
		: [11];

	const priceRub = raw.priceRub || 22000;
	const costRub = raw.costRub || 7000;
	const count = teethArr.length || 1;

	return {
		id: raw.id || `live-ztl-${idx}`,
		orderNumber: raw.orderNumber || raw.order_number || `ЗТЛ-${1000 + idx}`,
		patientId: raw.patientId || raw.patient_id || defaultPatientId || "pat",
		patientName: raw.patientName || raw.patient_name || defaultPatientName || "Пациент",
		doctorId: raw.doctorId || raw.doctor_id || "doc",
		doctorName: raw.doctorName || raw.doctor_name || defaultDoctorName || "Врач-ортопед",
		clinicName: raw.clinicName || raw.clinic_name || "Стоматологическая клиника DENTE",
		labName: raw.labName || raw.lab_name || "Центральная зуботехническая лаборатория",
		workTypeId: (raw.workTypeId || raw.constructionType || "crown_zirconia") as any,
		materialName: raw.materialName || raw.material || "Диоксид циркония",
		selectedTeeth: teethArr.length > 0 ? teethArr : [11],
		shadeSystem: raw.shadeSystem || "classical",
		shadeCode: raw.shadeCode || raw.colorVita || "A2",
		stumpShadeCode: raw.stumpShadeCode || raw.shadeStump || undefined,
		translucency: raw.translucency || "MT",
		surfaceTexture: raw.surfaceTexture || "microtexture",
		currentStage: (raw.currentStage || raw.status || "draft") as any,
		stageHistory: Array.isArray(raw.stageHistory)
			? raw.stageHistory
			: [
					{
						stage: raw.currentStage || raw.status || "draft",
						timestampIso: raw.createdAt || new Date().toISOString(),
						authorName: raw.doctorName || "Врач-ортопед",
						note: "Импортировано из медицинской карты",
					},
			  ],
		orderDateIso: (raw.orderDateIso || raw.createdAt || new Date().toISOString()).slice(0, 10),
		expectedLabDateIso: (raw.expectedLabDateIso || raw.dueDate || new Date().toISOString()).slice(0, 10),
		scheduledVisitDateIso: raw.scheduledVisitDateIso?.slice(0, 10),
		fittingDate: raw.fittingDate?.slice(0, 10),
		fittingDateIso: (raw.fittingDateIso || raw.fittingDate)?.slice(0, 10),
		appointmentId: raw.appointmentId || undefined,
		financials: {
			unitsCount: count,
			pricePerUnitKopecks: priceRub * 100,
			costPerUnitKopecks: costRub * 100,
			patientPriceTotalKopecks: priceRub * 100 * count,
			labCostKopecks: costRub * 100 * count,
			labCostTotalKopecks: costRub * 100 * count,
			clinicGrossMarginKopecks: (priceRub - costRub) * 100 * count,
			grossMarginPercent: 68.2,
			doctorPercent: 20,
			doctorWageBaseKopecks: (priceRub - costRub) * 100 * count,
			doctorWageKopecks: Math.round((priceRub - costRub) * 20 * count),
			clinicNetProfitKopecks: Math.round((priceRub - costRub) * 80 * count),
			patientPriceTotalRub: priceRub * count,
			labCostTotalRub: costRub * count,
			clinicGrossMarginRub: (priceRub - costRub) * count,
			doctorWageRub: Math.round((priceRub - costRub) * 0.2 * count),
			clinicNetProfitRub: Math.round((priceRub - costRub) * 0.8 * count),
			isBalanced: true,
		},
		delayAlert: {
			hasAlert: false,
			isDelayedAlert: false,
			lab_delay_alert: false,
			status: "ON_TRACK",
			severity: "OK",
			daysDifference: 5,
			expectedLabDateIso: (raw.expectedLabDateIso || raw.dueDate || new Date().toISOString()).slice(0, 10),
			alertMessageRu: "В графике",
			detailedReasonRu: "Заказ активен",
			recommendedActionRu: "Действий не требуется",
		},
		isDelayedAlert: false,
		createdAtIso: raw.createdAt || new Date().toISOString(),
		updatedAtIso: raw.updatedAt || new Date().toISOString(),
	};
}
