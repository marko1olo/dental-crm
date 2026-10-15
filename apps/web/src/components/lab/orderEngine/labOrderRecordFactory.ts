import { DENTAL_LAB_CONSTRUCTIONS } from "../dentalLabDefinitions";
import { toIsoDate, calculateLabReadinessDate } from "./labDateUtils";
import { checkFittingAppointmentCollision } from "./labCollisionGuard";
import { calculateZtlWageFinancials } from "./labWageEngine";
import { generateDeterministicLabOrderId, generateDeterministicLabOrderNumber } from "./labStatusTransitions";
import type { DentalLabOrderRecord } from "./labOrderRecordTypes";

export function createDentalLabOrderRecord(partial: any): DentalLabOrderRecord {
	const construction = partial.constructionType || "crown_zirconia";
	const def = DENTAL_LAB_CONSTRUCTIONS[construction];
	const sentDate = partial.sentDate || toIsoDate(new Date());
	const deadline = partial.deadlineDate || partial.dueDate || calculateLabReadinessDate(sentDate, def?.standardTurnaroundDays ?? 5);
	const collision = checkFittingAppointmentCollision(deadline, partial.scheduledVisitDate);

	const rawTeeth = partial.teethFdi || partial.teeth || [16];
	const teeth: number[] = Array.isArray(rawTeeth)
		? rawTeeth.map((t: any) => typeof t === "number" ? t : Number.parseInt(String(t), 10) || 16)
		: [16];

	const totalPatientPriceKop = partial.patientPriceKopecks ?? (partial.priceRub != null ? partial.priceRub * 100 : (def?.defaultPatientPriceKopecks ?? 2400000) * teeth.length);
	const unitPatientPriceKop = Math.round(totalPatientPriceKop / Math.max(1, teeth.length));
	const totalZtlCostKop = partial.ztlCostKopecks ?? (def?.defaultZtlCostKopecks ?? 750000) * teeth.length;
	const unitZtlCostKop = Math.round(totalZtlCostKop / Math.max(1, teeth.length));

	const financials = calculateZtlWageFinancials({
		unitsCount: teeth.length,
		patientPriceKopecks: unitPatientPriceKop,
		ztlCostKopecks: unitZtlCostKop,
		doctorSharePercent: partial.doctorSharePercent ?? 20,
		isWarrantyRework: partial.isWarrantyRemake || partial.isWarrantyRework,
		warrantyLiabilityType: partial.warrantyLiabilityType,
	});

	const shade = partial.vitaShade || partial.colorVita || "A2";
	const now = new Date().toISOString();

	return {
		id: partial.id || generateDeterministicLabOrderId({ patientId: partial.patientId, date: sentDate }),
		orderNumber: partial.orderNumber || generateDeterministicLabOrderNumber({ patientId: partial.patientId, date: sentDate }),
		patientId: partial.patientId || "pat-default", patientName: partial.patientName || "Пациент",
		doctorId: partial.doctorId || "doc-ortho", doctorName: partial.doctorName || "Врач-ортопед",
		labName: partial.labName || "CAD/CAM Центр Дентал-Мастер", technicianName: partial.technicianName,
		teethFdi: teeth, teeth, constructionType: construction,
		materialRu: partial.materialRu || partial.material || def?.defaultMaterialRu || "Диоксид циркония Katana ML",
		material: partial.material || partial.materialRu || def?.defaultMaterialRu || "Диоксид циркония Katana ML",
		vitaShade: shade, colorVita: shade, shadeSystem: partial.shadeSystem || "classical",
		translucency: partial.translucency || "MT", stumpShade: partial.stumpShade || "ND2",
		sentDate, deadlineDate: deadline, dueDate: deadline, status: partial.status || "sent_to_lab",
		patientPriceKopecks: financials.patientPriceKopecks, priceRub: Math.round(financials.patientPriceKopecks / 100),
		ztlCostKopecks: financials.ztlCostKopecks, doctorSharePercent: financials.doctorSharePercent,
		scheduledVisitDate: partial.scheduledVisitDate, appointmentId: partial.appointmentId,
		treatmentPlanId: partial.treatmentPlanId, stageNumber: partial.stageNumber, stageTitle: partial.stageTitle,
		stageId: partial.stageId, isWarrantyRemake: Boolean(partial.isWarrantyRemake || partial.isWarrantyRework),
		isWarrantyRework: Boolean(partial.isWarrantyRemake || partial.isWarrantyRework),
		warrantyReason: partial.warrantyReason || partial.reworkReason, reworkReason: partial.warrantyReason || partial.reworkReason,
		clinicalNotes: partial.clinicalNotes, attachedScanUrl: partial.attachedScanUrl,
		deliveredTeeth: partial.deliveredTeeth, reworkTeeth: partial.reworkTeeth,
		isPartialDelivery: partial.isPartialDelivery || false, originalOrderId: partial.originalOrderId,
		originalOrderNumber: partial.originalOrderNumber, warrantyLiabilityType: partial.warrantyLiabilityType,
		fittingCollisionWarning: collision.warningRu ?? partial.fittingCollisionWarning,
		anatomicalFeatures: {
			translucencyLevel: partial.translucency || partial.anatomicalFeatures?.translucencyLevel || "MT",
			mamelons: partial.mamelons ?? partial.anatomicalFeatures?.mamelons ?? false,
			opalescence: partial.opalescence ?? partial.anatomicalFeatures?.opalescence ?? false,
			calcifications: partial.calcifications ?? partial.anatomicalFeatures?.calcifications ?? false,
			stumpShade: partial.stumpShade || partial.anatomicalFeatures?.stumpShade,
		},
		createdAt: partial.createdAt || now, updatedAt: partial.updatedAt || now,
	};
}
