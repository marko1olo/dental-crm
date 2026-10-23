/**
 * surgeryWriteoffService.ts — Layer 3: 1-click surgical procedure write-offs.
 * Decomposed in accordance with Mandate 8b (<= 120 lines SSOT).
 */

import type { DbExecutor } from "./types.js";
import { executeUnifiedStockDeduction } from "./unifiedStockDeductionEngine.js";
import {
	buildSurgeryMaterials,
	type BuildSurgeryMaterialsOptions,
} from "./surgeryWriteoff/surgeryMaterialBuilder.js";

export interface QuickWriteoffSurgeryParams extends BuildSurgeryMaterialsOptions {
	organizationId: string;
	operationTitle?: string | undefined;
	toothNumber?: string | number | undefined;
	visitId?: string | null | undefined;
	userId?: string | null | undefined;
	notes?: string | null | undefined;
}

export async function quickWriteoffSurgery(tx: DbExecutor, params: QuickWriteoffSurgeryParams) {
	const {
		organizationId,
		category = "extraction",
		operationTitle,
		toothNumber,
		visitId,
		userId,
		notes,
	} = params;

	const opTitle =
		operationTitle ||
		(category === "extraction"
			? "Удаление зуба"
			: category === "sinus_gbr"
				? "Синус-лифтинг и НКР"
				: category === "implant"
					? "Дентальная имплантация"
					: "Хирургическая операция");

	const toothSuffix = toothNumber ? ` (зуб FDI #${toothNumber})` : "";
	const items = buildSurgeryMaterials(params);

	return executeUnifiedStockDeduction(tx, {
		organizationId,
		items,
		transactionType: "surgery_quick_writeoff",
		visitId,
		userId,
		notes,
		reasonPrefix: `Хирургическая операция «${opTitle}»${toothSuffix} (1 клик, без комиссии)`,
		successMessageTemplate: (count, hasOverdraft) =>
			`Материалы операции «${opTitle}»${toothSuffix} (${count} поз.) успешно списаны со склада${
				hasOverdraft ? " в мягкий овердрафт без комиссии" : ""
			}.`,
	});
}
