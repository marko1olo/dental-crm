/**
 * packages/shared/src/finance/payrollModules/doctorStornoHelper.ts
 * Generates storno line items for refunded doctor completed services.
 * Mandate 8b: <= 120 lines.
 */

import type { DoctorCompletedServiceItem, DoctorPayrollStornoLineItem } from "./payrollTypes.js";

export function createServiceStornoItem(
	item: DoctorCompletedServiceItem,
	actualPaidKop: number,
	refundKop: number,
	isFullyRefunded: boolean,
	itemLabCost: number,
	itemMaterialCost: number,
	itemCommissionPercent: number,
): DoctorPayrollStornoLineItem {
	const receiptNum = item.refundReceiptNumber ?? item.receiptNumber ?? item.id;
	const dateIso = item.refundDateIso ?? item.dateIso;

	if (isFullyRefunded) {
		const reason = item.refundReasonRu ?? "Полный возврат пациенту";
		const netBaseIfPaid = Math.max(0, actualPaidKop - itemLabCost - itemMaterialCost);
		const stornoComm = Math.round((netBaseIfPaid * itemCommissionPercent) / 100);
		const stornoRub = (stornoComm / 100).toLocaleString("ru-RU");

		return {
			id: `storno-srv-${item.id}`,
			serviceId: item.id,
			dateIso,
			serviceNameRu: item.serviceNameRu,
			receiptNumber: receiptNum,
			reasonRu: reason,
			refundedGrossKop: actualPaidKop,
			stornoCommissionKop: stornoComm,
			labelRu: `Сторно комиссии: Возврат по чеку №${receiptNum} (-${stornoRub} ₽)`,
		};
	}

	const reason = item.refundReasonRu ?? "Частичный возврат пациенту";
	const partialStornoComm = Math.round((refundKop * itemCommissionPercent) / 100);
	const stornoRub = (partialStornoComm / 100).toLocaleString("ru-RU");

	return {
		id: `storno-partial-${item.id}`,
		serviceId: item.id,
		dateIso,
		serviceNameRu: `${item.serviceNameRu} (частично)`,
		receiptNumber: receiptNum,
		reasonRu: reason,
		refundedGrossKop: refundKop,
		stornoCommissionKop: partialStornoComm,
		labelRu: `Сторно комиссии: Возврат по чеку №${receiptNum} (-${stornoRub} ₽)`,
	};
}
