import { rublesToKopecks, kopecksToRubles, partitionBridgeTeethFdi, calculateBridgeRestorationCostKopecks } from "@dental/shared";
import { DENTAL_LAB_CONSTRUCTIONS } from "../dentalLabDefinitions";
import { toIsoDate, calculateLabReadinessDate } from "./labDateUtils";
import { checkFittingAppointmentCollision } from "./labCollisionGuard";
import { calculateZtlWageFinancials } from "./labWageEngine";
import type { DentalLabOrderRecord } from "./labOrderRecordTypes";

let _labOrderSequenceCounter = 100;

export function generateDeterministicLabOrderNumber(params?: {
	date?: Date | string | undefined;
	patientId?: string | undefined;
	patientName?: string | undefined;
	sequence?: number | undefined;
}): string {
	const d = params?.date ? (typeof params.date === "string" ? new Date(params.date) : params.date) : new Date();
	const year = d.getFullYear();
	const seq = params?.sequence ?? (_labOrderSequenceCounter++);
	return `ЗТЛ-${year}-${String(seq).padStart(3, "0")}`;
}

export function generateDeterministicLabOrderId(params?: {
	patientId?: string | undefined;
	date?: Date | string | undefined;
	sequence?: number | undefined;
}): string {
	const d = params?.date ? (typeof params.date === "string" ? new Date(params.date) : params.date) : new Date();
	const pat = (params?.patientId || "pat").replace(/[^a-zA-Z0-9]/g, "").slice(-4) || "0001";
	const seq = params?.sequence ?? (_labOrderSequenceCounter++);
	return `ztl-ord-${d.getTime()}-${pat}-${seq}`;
}

export type PartialDentalLabOrderInput = Partial<DentalLabOrderRecord> & {
	readonly teeth?: readonly (number | string)[] | undefined;
	readonly teethFdi?: readonly (number | string)[] | string | undefined;
	readonly abutmentTeethFdi?: readonly number[] | undefined;
	readonly ponticTeethFdi?: readonly number[] | undefined;
	readonly vitaShade?: string | undefined;
	readonly stumpShade?: string | undefined;
	readonly translucency?: string | undefined;
	readonly mamelons?: boolean | undefined;
	readonly opalescence?: boolean | undefined;
	readonly calcifications?: boolean | undefined;
	readonly reworkReason?: string | undefined;
	readonly deadlineDate?: string | undefined;
};

export function createDentalLabOrderRecord(partial: PartialDentalLabOrderInput = {}): DentalLabOrderRecord {
	const construction = partial.constructionType || "crown_zirconia";
	const def = DENTAL_LAB_CONSTRUCTIONS[construction];
	const sentDate = partial.sentDate || toIsoDate(new Date());
	const deadline = partial.deadlineDate || partial.dueDate || calculateLabReadinessDate(sentDate, def?.standardTurnaroundDays ?? 5);
	const collision = checkFittingAppointmentCollision(deadline, partial.scheduledVisitDate);

	const rawTeeth = partial.teethFdi || partial.teeth || [16];
	const teeth: number[] = Array.isArray(rawTeeth)
		? rawTeeth.map((t: unknown) => typeof t === "number" ? t : Number.parseInt(String(t), 10) || 16)
		: [16];

	const isBridge = construction === "bridge" || construction.includes("bridge");
	let abutments: number[] = [];
	let pontics: number[] = [];

	if (isBridge) {
		if (partial.abutmentTeethFdi && partial.abutmentTeethFdi.length > 0) {
			abutments = [...partial.abutmentTeethFdi];
			pontics = partial.ponticTeethFdi ? [...partial.ponticTeethFdi] : teeth.filter((t) => !abutments.includes(t));
		} else {
			const partitioned = partitionBridgeTeethFdi(teeth);
			abutments = partitioned.abutmentTeethFdi;
			pontics = partitioned.ponticTeethFdi;
		}
	} else {
		abutments = [...teeth];
		pontics = [];
	}

	const baseAbutmentPriceKop = def?.defaultPatientPriceKopecks ?? 2400000;
	// Фасетка / понтик в мостовидном протезе: 70% стоимости опорной коронки (Мандат 8bm)
	const basePonticPriceKop = Math.round(baseAbutmentPriceKop * 0.7);

	const baseAbutmentCostKop = def?.defaultZtlCostKopecks ?? 750000;
	const basePonticCostKop = Math.round(baseAbutmentCostKop * 0.7);

	let totalPatientPriceKop = 0;
	let totalZtlCostKop = 0;

	if (partial.patientPriceKopecks != null) {
		totalPatientPriceKop = partial.patientPriceKopecks;
	} else if (partial.priceRub != null) {
		totalPatientPriceKop = rublesToKopecks(partial.priceRub);
	} else if (isBridge && pontics.length > 0) {
		const bridgeCost = calculateBridgeRestorationCostKopecks({
			abutmentPriceKopecks: baseAbutmentPriceKop,
			ponticPriceKopecks: basePonticPriceKop,
			abutmentsCount: abutments.length,
			ponticsCount: pontics.length,
			abutmentCostKopecks: baseAbutmentCostKop,
			ponticCostKopecks: basePonticCostKop,
		});
		totalPatientPriceKop = bridgeCost.patientPriceKopecks;
	} else {
		totalPatientPriceKop = baseAbutmentPriceKop * teeth.length;
	}

	if (partial.ztlCostKopecks != null) {
		totalZtlCostKop = partial.ztlCostKopecks;
	} else if (isBridge && pontics.length > 0) {
		totalZtlCostKop = (baseAbutmentCostKop * abutments.length) + (basePonticCostKop * pontics.length);
	} else {
		totalZtlCostKop = baseAbutmentCostKop * teeth.length;
	}

	const unitPatientPriceKop = Math.round(totalPatientPriceKop / Math.max(1, teeth.length));
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

	const defaultOrderId = partial.patientId
		? generateDeterministicLabOrderId({ patientId: partial.patientId, date: sentDate })
		: generateDeterministicLabOrderId({ date: sentDate });
	const defaultOrderNumber = partial.patientId
		? generateDeterministicLabOrderNumber({ patientId: partial.patientId, date: sentDate })
		: generateDeterministicLabOrderNumber({ date: sentDate });

	return {
		id: partial.id || defaultOrderId,
		orderNumber: partial.orderNumber || defaultOrderNumber,
		patientId: partial.patientId || "pat-default", patientName: partial.patientName || "Пациент",
		doctorId: partial.doctorId || "doc-ortho", doctorName: partial.doctorName || "Врач-ортопед",
		labName: partial.labName || "CAD/CAM Центр Дентал-Мастер", technicianName: partial.technicianName,
		teethFdi: teeth, teeth,
		abutmentTeethFdi: abutments,
		ponticTeethFdi: pontics,
		constructionType: construction,
		materialRu: partial.materialRu || partial.material || def?.defaultMaterialRu || "Диоксид циркония Katana ML",
		material: partial.material || partial.materialRu || def?.defaultMaterialRu || "Диоксид циркония Katana ML",
		vitaShade: shade, colorVita: shade, shadeSystem: partial.shadeSystem || "classical",
		translucency: partial.translucency || "MT", stumpShade: partial.stumpShade || "ND2",
		sentDate, deadlineDate: deadline, dueDate: deadline, status: partial.status || "sent_to_lab",
		patientPriceKopecks: financials.patientPriceKopecks, priceRub: kopecksToRubles(financials.patientPriceKopecks),
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
		occlusionProfile: partial.occlusionProfile ? {
			articulatorType: partial.occlusionProfile.articulatorType || "bio_art",
			facebow: partial.occlusionProfile.facebow ?? false,
			guidanceType: partial.occlusionProfile.guidanceType || "canine_guidance",
			sagittalCondylarAngleDeg: partial.occlusionProfile.sagittalCondylarAngleDeg ?? 33,
			bennettAngleDeg: partial.occlusionProfile.bennettAngleDeg ?? 15,
		} : undefined,
		createdAt: partial.createdAt || now, updatedAt: partial.updatedAt || now,
	};
}
