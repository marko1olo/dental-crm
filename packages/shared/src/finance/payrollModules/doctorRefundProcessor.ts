/**
 * packages/shared/src/finance/payrollModules/doctorRefundProcessor.ts
 * Processes explicit doctor refund deductions and generates storno entries.
 * Mandate 8b: <= 120 lines.
 */

import type { DoctorPayrollStornoLineItem, DoctorRefundDeductionItem } from "./payrollTypes.js";

export interface ProcessedRefundDeductions {
	readonly explicitRefundKop: number;
	readonly explicitRefundClawbackKop: number;
	readonly refundedCount: number;
	readonly stornoItems: readonly DoctorPayrollStornoLineItem[];
}

export function processExplicitRefundDeductions(
	refundDeductions: readonly DoctorRefundDeductionItem[] | undefined,
	doctorId: string,
	basePercent: number,
	periodEndIso: string,
	initialStornoCount: number = 0,
): ProcessedRefundDeductions {
	let explicitRefundKop = 0;
	let explicitRefundClawbackKop = 0;
	let refundedCount = 0;
	const stornoItems: DoctorPayrollStornoLineItem[] = [];

	if (refundDeductions && refundDeductions.length > 0) {
		for (const ref of refundDeductions) {
			const assignedDoctorId = ref.performerId ?? ref.doctorId;
			if (assignedDoctorId && assignedDoctorId !== doctorId) {
				continue;
			}

			const refRate = ref.customCommissionPercent ?? basePercent;
			const clawbackKop = Math.round((ref.refundedGrossKop * refRate) / 100);
			explicitRefundKop += ref.refundedGrossKop;
			explicitRefundClawbackKop += clawbackKop;
			refundedCount += 1;

			const receiptNum = ref.receiptNumber ?? ref.serviceId ?? "б/н";
			const stornoRub = (clawbackKop / 100).toLocaleString("ru-RU");
			const labelRu = `Сторно комиссии: Возврат по чеку №${receiptNum} (-${stornoRub} ₽)`;

			stornoItems.push({
				id: `storno-deduct-${ref.serviceId ?? `${ref.dateIso ?? periodEndIso}-${initialStornoCount + stornoItems.length + 1}`}`,
				serviceId: ref.serviceId,
				dateIso: ref.dateIso ?? periodEndIso,
				serviceNameRu: ref.serviceNameRu ?? "Возврат за ранее оплаченную услугу",
				receiptNumber: receiptNum,
				reasonRu: ref.reasonRu ?? "Возврат пациенту",
				refundedGrossKop: ref.refundedGrossKop,
				stornoCommissionKop: clawbackKop,
				labelRu,
			});
		}
	}

	return {
		explicitRefundKop,
		explicitRefundClawbackKop,
		refundedCount,
		stornoItems,
	};
}
