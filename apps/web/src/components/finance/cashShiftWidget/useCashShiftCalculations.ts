import { useMemo } from "react";
import type { OfflineQueueFiscalItem } from "@dental/shared";
import type { QueuedFiscalReceiptItem } from "../../../services/hardware/hardwareTypes";

export function useCashShiftCalculations(
	externalQueuedReceipts: readonly OfflineQueueFiscalItem[] | undefined,
	queuedItems: readonly QueuedFiscalReceiptItem[],
	cashInDrawerRub: number,
	cardSumRub: number,
	sbpSumRub: number,
	advanceOffsetRub: number,
) {
	const pendingOfflineCount = useMemo(() => {
		if (externalQueuedReceipts && externalQueuedReceipts.length > 0) return externalQueuedReceipts.length;
		return queuedItems.filter((i) => i.status === "pending_print" || i.status === "hardware_offline").length;
	}, [externalQueuedReceipts, queuedItems]);

	const pendingOfflineAmountRub = useMemo(() => {
		if (externalQueuedReceipts && externalQueuedReceipts.length > 0) {
			return externalQueuedReceipts.reduce((sum, r) => {
				const tendersSum = (r.tenders.cashRub || 0) + (r.tenders.cardRub || 0) + (r.tenders.sbpRub || 0) + (r.tenders.advanceOffsetRub || 0);
				const itemsSum = r.items.reduce((iSum, it) => iSum + (it.priceRub * (it.quantity ?? 1) - (it.discountRub ?? 0)), 0);
				return sum + (tendersSum > 0 ? tendersSum : itemsSum);
			}, 0);
		}
		return queuedItems.filter((i) => i.status === "pending_print" || i.status === "hardware_offline").reduce((sum, i) => sum + (i.payload?.totalRub || 0), 0);
	}, [externalQueuedReceipts, queuedItems]);

	const totalTurnoverRub = cashInDrawerRub + cardSumRub + sbpSumRub + advanceOffsetRub;
	const cashlessKopecks = Math.round((cardSumRub + sbpSumRub) * 100);
	const acquiringFeeKopecks = Math.round((cashlessKopecks * 15) / 1000);
	const netBankDepositKopecks = Math.max(0, cashlessKopecks - acquiringFeeKopecks);
	const acquiringFeeRub = acquiringFeeKopecks / 100;
	const netBankDepositRub = netBankDepositKopecks / 100;

	return { pendingOfflineCount, pendingOfflineAmountRub, totalTurnoverRub, acquiringFeeRub, netBankDepositRub };
}
