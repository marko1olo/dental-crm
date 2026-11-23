/**
 * packages/shared/src/finance/payrollModules/doctorRefundProcessor.ts
 * Processes explicit doctor refund deductions and generates storno entries.
 * Mandate 8b: <= 120 lines.
 */

import type { DoctorPayrollStornoLineItem, DoctorRefundDeductionItem } from "./payrollTypes.js";
import { percentageOfKopecks, kopecksToRubles, type Kopecks } from "../../money.js";

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
	existingStornoItems?: readonly DoctorPayrollStornoLineItem[] | undefined,
): ProcessedRefundDeductions {
	let explicitRefundKop = 0;
	let explicitRefundClawbackKop = 0;
	let refundedCount = 0;
	const stornoItems: DoctorPayrollStornoLineItem[] = [];

	const seenKeys = new Set<string>();
	if (existingStornoItems && existingStornoItems.length > 0) {
		for (const item of existingStornoItems) {
			if (item.serviceId) seenKeys.add(`srv:${item.serviceId}`);
			if (item.receiptNumber && item.receiptNumber !== "б/н") seenKeys.add(`rcp:${item.receiptNumber}`);
		}
	}

	if (refundDeductions && refundDeductions.length > 0) {
		for (const ref of refundDeductions) {
			const assignedDoctorId = ref.performerId ?? ref.doctorId;
			if (assignedDoctorId && assignedDoctorId !== doctorId) {
				continue;
			}

			const srvKey = ref.serviceId ? `srv:${ref.serviceId}` : null;
			const rcpKey = ref.receiptNumber && ref.receiptNumber !== "б/н" ? `rcp:${ref.receiptNumber}` : null;

			// SEV-1.3: Prevent Double Clawback if already deducted in serviceSummary or earlier
			if ((srvKey && seenKeys.has(srvKey)) || (rcpKey && seenKeys.has(rcpKey))) {
				continue;
			}
			if (srvKey) seenKeys.add(srvKey);
			if (rcpKey) seenKeys.add(rcpKey);

			const refRate = ref.customCommissionPercent ?? basePercent;
			// SEV-2.1: Replace raw float division with canonical percentageOfKopecks
			const clawbackKop = percentageOfKopecks(ref.refundedGrossKop as Kopecks, Math.round(refRate * 100));
			explicitRefundKop += ref.refundedGrossKop;
			explicitRefundClawbackKop += clawbackKop;
			refundedCount += 1;

			const receiptNum = ref.receiptNumber ?? ref.serviceId ?? "б/н";
			const stornoRub = kopecksToRubles(clawbackKop).toLocaleString("ru-RU");
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
