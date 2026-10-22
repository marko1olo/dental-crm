import { kopecksToRubles } from "@dental/shared";
import { getWarehouseBranch } from "./warehouseTransferPresets.js";
import type {
	DiscrepancyLineReport,
	WarehouseDiscrepancyAct,
	WarehouseTransferDocument,
} from "./warehouseTransferTypes.js";

export function generateDiscrepancyAct(
	doc: WarehouseTransferDocument,
	commission?: readonly { name: string; position: string }[] | undefined,
): WarehouseDiscrepancyAct {
	const discrepancyItems: DiscrepancyLineReport[] = [];
	let totalFinancialDamageKopecks = 0;

	for (const item of doc.items) {
		const diff = item.dispatchedQuantity - item.receivedQuantity;
		const hasType = item.discrepancyType && item.discrepancyType !== "none";

		if (diff !== 0 || hasType) {
			const shortageQty = diff > 0 ? diff : 0;
			const surplusQty = diff < 0 ? Math.abs(diff) : 0;
			const damagedQty = item.discrepancyType === "damaged" ? (item.discrepancyQuantity || shortageQty) : 0;

			const damageKopecks = Math.round((shortageQty + damagedQty) * item.unitCostKopecks);
			totalFinancialDamageKopecks += damageKopecks;

			let cause = item.discrepancyNotes || "";
			if (!cause) {
				if (shortageQty > 0) cause = `Недостача при вскрытии опломбированной тары (${shortageQty} ${item.unitRu})`;
				else if (damagedQty > 0) cause = `Нарушение целостности вторичной упаковки / бой при транспортировке`;
				else if (surplusQty > 0) cause = `Излишек / пересортица при комплектации склада (+${surplusQty} ${item.unitRu})`;
			}

			discrepancyItems.push({
				item,
				shortageQty,
				damagedQty,
				surplusQty,
				financialDamageKopecks: damageKopecks,
				financialDamageRubles: kopecksToRubles(damageKopecks),
				causeRu: cause,
			});
		}
	}

	const sourceBranch = getWarehouseBranch(doc.sourceBranchId);
	const targetBranch = getWarehouseBranch(doc.targetBranchId);

	const defaultCommission = commission && commission.length > 0 ? commission : [
		{ name: targetBranch.responsiblePersonRu, position: targetBranch.responsiblePositionRu },
		{ name: doc.receivedByFullName, position: doc.receivedByPosition },
		{ name: doc.transportDriverFullName || "Курьер доставки", position: "Экспедитор" },
	];

	return {
		actNumber: `АКТ-РАСХ-${doc.documentNumber.replace(/[^0-9]/g, "").slice(-6) || "001"}`,
		actDate: doc.receivedDate || new Date().toISOString().slice(0, 10),
		transferDocNumber: doc.documentNumber,
		sourceBranch,
		targetBranch,
		discrepancyItems,
		totalFinancialDamageKopecks,
		totalFinancialDamageRubles: kopecksToRubles(totalFinancialDamageKopecks),
		totalDiscrepantItemsCount: discrepancyItems.length,
		commissionMembers: defaultCommission,
	};
}
