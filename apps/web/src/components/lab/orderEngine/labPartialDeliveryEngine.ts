import type { DentalLabOrderRecord } from "./labOrderRecordTypes";

export interface PartialDeliveryParams {
	readonly order?: DentalLabOrderRecord | undefined;
	readonly originalOrder?: DentalLabOrderRecord | undefined;
	readonly readyTeeth?: readonly (number | string)[] | undefined;
	readonly deliveredTeeth?: readonly (number | string)[] | undefined;
	readonly reworkTeeth: readonly (number | string)[];
	readonly reworkReason: string;
	readonly liabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
	readonly warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
}

export interface PartialDeliveryResult {
	readonly deliveredOrder: DentalLabOrderRecord;
	readonly reworkOrder: DentalLabOrderRecord;
	readonly summaryRu: string;
	readonly summaryMessageRu: string;
}

export function processPartialDeliveryAndRework(params: PartialDeliveryParams): PartialDeliveryResult {
	const order = params.originalOrder || params.order;
	if (!order) {
		throw new Error("processPartialDeliveryAndRework: missing order or originalOrder parameter");
	}
	const readyRaw = params.readyTeeth || params.deliveredTeeth || [];
	const reworkRaw = params.reworkTeeth || [];
	const readyTeeth: number[] = readyRaw.map((t) => typeof t === "number" ? t : Number.parseInt(String(t), 10) || 0).filter(Boolean);
	const reworkTeeth: number[] = reworkRaw.map((t) => typeof t === "number" ? t : Number.parseInt(String(t), 10) || 0).filter(Boolean);
	const liabilityType = params.warrantyLiabilityType || params.liabilityType || "lab_defect";
	const reworkReason = params.reworkReason || "Гарантийная рекламация";

	const allTeeth = order.teethFdi || (order.teeth as readonly number[]) || [16];
	const totalCount = Math.max(1, allTeeth.length);
	const readyCount = readyTeeth.length;
	const reworkCount = reworkTeeth.length;

	const pricePerUnitKop = Math.round(order.patientPriceKopecks / totalCount);
	const costPerUnitKop = Math.round(order.ztlCostKopecks / totalCount);

	const deliveredPatientPriceKop = pricePerUnitKop * readyCount;
	const deliveredZtlCostKop = costPerUnitKop * readyCount;
	const now = new Date().toISOString();

	const deliveredOrder: DentalLabOrderRecord = {
		...order,
		teethFdi: readyTeeth, teeth: readyTeeth, deliveredTeeth: readyTeeth, reworkTeeth,
		isPartialDelivery: true, patientPriceKopecks: deliveredPatientPriceKop,
		priceRub: Math.round(deliveredPatientPriceKop / 100), ztlCostKopecks: deliveredZtlCostKop,
		status: "ready_in_clinic",
		clinicalNotes: `${order.clinicalNotes || ""}\n• ЧАСТИЧНАЯ ПРИЕМКА: Зубы [${readyTeeth.join(", ")}] готовы в клинике к фиксации. Зубы [${reworkTeeth.join(", ")}] направлены на гарантийную переделку.`.trim(),
		updatedAt: now,
	};

	const reworkZtlCostKop = liabilityType === "lab_defect" ? 0 : costPerUnitKop * reworkCount;

	const reworkOrder: DentalLabOrderRecord = {
		...order,
		id: `${order.id}-REW-1`,
		orderNumber: `${order.orderNumber}-REW-1`,
		teethFdi: reworkTeeth, teeth: reworkTeeth, deliveredTeeth: undefined, reworkTeeth,
		isPartialDelivery: true, originalOrderId: order.id, originalOrderNumber: order.orderNumber,
		status: "warranty_rework", patientPriceKopecks: 0, priceRub: 0,
		ztlCostKopecks: reworkZtlCostKop, isWarrantyRemake: true, isWarrantyRework: true,
		warrantyReason: reworkReason || "Гарантийная доработка одиночной единицы",
		reworkReason: reworkReason || "Гарантийная доработка одиночной единицы",
		warrantyLiabilityType: liabilityType,
		clinicalNotes: `• ГАРАНТИЙНАЯ ПЕРЕДЕЛКА ЕДИНИЦЫ (0 ₽ ДЛЯ ПАЦИЕНТА)\n• Исходный наряд ЗТЛ: № ${order.orderNumber}\n• Зубы на доработку: [${reworkTeeth.join(", ")}]\n• Причина рекламации: ${reworkReason || "Коррекция прилегания/окклюзии/оттенка"}\n• Тип ответственности: ${liabilityType === "lab_defect" ? "Брак ЗТЛ (0 ₽)" : "Гарантия клиники"}`,
		createdAt: now, updatedAt: now,
	};

	const summaryRu = `Частичная приемка оформлена: наряд № ${order.orderNumber}, зубы ${readyTeeth.join(", ")} готовы к примерке/фиксации, зуб(ы) ${reworkTeeth.join(", ")} направлены на гарантийную переделку (0 ₽ для пациента).`;

	return { deliveredOrder, reworkOrder, summaryRu, summaryMessageRu: summaryRu };
}
