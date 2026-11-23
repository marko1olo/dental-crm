import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import type { DentalLabOrderData } from "../math/labDataTypes.js";

export interface PartialDeliveryParams {
	readonly order?: DentalLabOrderData | undefined;
	readonly originalOrder?: DentalLabOrderData | undefined;
	readonly readyTeeth?: readonly (number | string)[] | undefined;
	readonly deliveredTeeth?: readonly (number | string)[] | undefined;
	readonly reworkTeeth: readonly (number | string)[];
	readonly reworkReason: string;
	readonly liabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
	readonly warrantyLiabilityType?: "clinic_warranty" | "lab_defect" | "patient_fault" | undefined;
}

export interface PartialDeliveryResult {
	readonly deliveredOrder: DentalLabOrderData;
	readonly reworkOrder: DentalLabOrderData;
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

	const allTeeth = order.selectedTeeth || order.teeth || (order.toothFdi ? String(order.toothFdi).split(/[\s,;-]+/).map(Number).filter(Boolean) : [16]);
	const totalCount = Math.max(1, allTeeth.length);
	const readyCount = readyTeeth.length;
	const reworkCount = reworkTeeth.length;

	const basePriceKop = order.patientPriceKopecks ?? (typeof order.priceRub === "number" ? rublesToKopecks(order.priceRub) : 0);
	const baseCostKop = order.labCostKopecks ?? order.costKopecks ?? 0;

	const pricePerUnitKop = Math.round(basePriceKop / totalCount);
	const costPerUnitKop = Math.round(baseCostKop / totalCount);

	const deliveredPatientPriceKop = pricePerUnitKop * readyCount;
	const deliveredZtlCostKop = costPerUnitKop * readyCount;
	const now = new Date().toISOString();

	const deliveredOrder: DentalLabOrderData = {
		...order,
		selectedTeeth: readyTeeth,
		teeth: readyTeeth,
		toothFdi: readyTeeth.join(", "),
		isPartialDelivery: true,
		patientPriceKopecks: deliveredPatientPriceKop,
		priceRub: Math.round(kopecksToRubles(deliveredPatientPriceKop)),
		labCostKopecks: deliveredZtlCostKop,
		costKopecks: deliveredZtlCostKop,
		status: "ready_in_clinic",
		clinicalNotes: `${order.clinicalNotes || ""}\n• ЧАСТИЧНАЯ ПРИЕМКА: Зубы [${readyTeeth.join(", ")}] готовы в клинике к фиксации. Зубы [${reworkTeeth.join(", ")}] направлены на гарантийную переделку.`.trim(),
		updatedAt: now,
	};

	const reworkZtlCostKop = liabilityType === "lab_defect" ? 0 : costPerUnitKop * reworkCount;

	const reworkOrder: DentalLabOrderData = {
		...order,
		id: order.id ? `${order.id}-REW-1` : `rew-${Date.now()}`,
		orderNumber: order.orderNumber ? `${order.orderNumber}-REW-1` : "REW-1",
		selectedTeeth: reworkTeeth,
		teeth: reworkTeeth,
		toothFdi: reworkTeeth.join(", "),
		isPartialDelivery: true,
		originalOrderId: order.id,
		originalOrderNumber: order.orderNumber != null ? String(order.orderNumber) : undefined,
		status: "warranty_rework",
		patientPriceKopecks: 0,
		priceRub: 0,
		labCostKopecks: reworkZtlCostKop,
		costKopecks: reworkZtlCostKop,
		isWarranty: true,
		isWarrantyRemake: true,
		isWarrantyRework: true,
		reworkReason: reworkReason || "Гарантийная доработка одиночной единицы",
		warrantyLiabilityType: liabilityType,
		clinicalNotes: `• ГАРАНТИЙНАЯ ПЕРЕДЕЛКА ЕДИНИЦЫ (0 ₽ ДЛЯ ПАЦИЕНТА)\n• Исходный наряд ЗТЛ: № ${order.orderNumber ?? "—"}\n• Зубы на доработку: [${reworkTeeth.join(", ")}]\n• Причина рекламации: ${reworkReason || "Коррекция прилегания/окклюзии/оттенка"}\n• Тип ответственности: ${liabilityType === "lab_defect" ? "Брак ЗТЛ (0 ₽)" : "Гарантия клиники"}`,
		createdAt: now,
		updatedAt: now,
	};

	const summaryRu = `Частичная приемка оформлена: наряд № ${order.orderNumber ?? "—"}, зубы ${readyTeeth.join(", ")} готовы к примерке/фиксации, зуб(ы) ${reworkTeeth.join(", ")} направлены на гарантийную переделку (0 ₽ для пациента).`;

	return { deliveredOrder, reworkOrder, summaryRu, summaryMessageRu: summaryRu };
}
