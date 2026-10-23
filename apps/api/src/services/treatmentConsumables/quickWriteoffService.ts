/**
 * quickWriteoffService.ts — Layer 3: 1-click nurse quick write-offs.
 * Complies with Mandate 8b (<= 120 lines SSOT), SanPiN 3.3686-21, and Soft Negative Stock.
 */

import type { DbExecutor } from "./types.js";
import { executeUnifiedStockDeduction } from "./unifiedStockDeductionEngine.js";
import {
	getCarpulesDefinitions,
	getStandardKitDefinitions,
	getSterilizationKitDefinitions,
} from "./quickWriteoff/quickWriteoffPresets.js";

export async function quickWriteoffStandardKit(
	tx: DbExecutor,
	params: {
		organizationId: string;
		userId?: string | null | undefined;
		visitId?: string | null | undefined;
		notes?: string | null | undefined;
	},
) {
	const items = getStandardKitDefinitions();
	return executeUnifiedStockDeduction(tx, {
		organizationId: params.organizationId,
		items,
		transactionType: "nurse_quick_writeoff",
		visitId: params.visitId,
		userId: params.userId,
		notes: params.notes,
		reasonPrefix: "Списание базового набора приёма медсестрой (1 клик)",
		successMessageTemplate: () =>
			"Базовый набор приёма списан (перчатки 2 пары, маска 2 шт., слюноотсос 1 шт., нагрудник 1 шт., валики 6 шт.).",
	});
}

export async function quickWriteoffCarpules(
	tx: DbExecutor,
	params: {
		organizationId: string;
		carpulesCount?: number | undefined;
		needlesCount?: number | undefined;
		drugName?: string | undefined;
		needleName?: string | undefined;
		userId?: string | null | undefined;
		visitId?: string | null | undefined;
		notes?: string | null | undefined;
	},
) {
	const count = Math.max(1, Math.min(20, params.carpulesCount ?? 1));
	const needleQty =
		params.needlesCount !== undefined
			? Math.max(0, params.needlesCount)
			: Math.max(1, Math.ceil(count / 2));

	const items = getCarpulesDefinitions({
		count,
		needleQty,
		drugName: params.drugName,
		needleName: params.needleName,
	});

	return executeUnifiedStockDeduction(tx, {
		organizationId: params.organizationId,
		items,
		transactionType: "carpule_disposal",
		visitId: params.visitId,
		userId: params.userId,
		notes: params.notes,
		reasonPrefix: "Списание анестезии медсестрой в 1 клик (СанПиН 3.3686-21)",
		successMessageTemplate: () =>
			needleQty > 0
				? `Списано пустых карпул анестетика: ${count} шт., карпульных игл: ${needleQty} шт. (СанПиН 3.3686-21 Класс Б, без комиссии из 3 человек).`
				: `Списано пустых карпул анестетика: ${count} шт. (СанПиН 3.3686-21 Класс Б, без комиссии из 3 человек).`,
	});
}

export async function quickWriteoffSterilizationKit(
	tx: DbExecutor,
	params: {
		organizationId: string;
		count?: number | undefined;
		userId?: string | null | undefined;
		visitId?: string | null | undefined;
		notes?: string | null | undefined;
	},
) {
	const kitMultiplier = Math.max(1, Math.min(100, params.count ?? 1));
	const items = getSterilizationKitDefinitions(kitMultiplier);

	return executeUnifiedStockDeduction(tx, {
		organizationId: params.organizationId,
		items,
		transactionType: "sterilization_kit_writeoff",
		visitId: params.visitId,
		userId: params.userId,
		notes: params.notes,
		reasonPrefix: `Списание комплекта стерилизации ЦСО (лотков: ${kitMultiplier} шт.)`,
		successMessageTemplate: () =>
			`Комплект стерилизации ЦСО списан (обработано лотков/наборов: ${kitMultiplier} шт.).`,
	});
}
