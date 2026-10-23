/**
 * emergencyAntishockWriteoffService.ts — Layer 3: 1-click write-off for Emergency Antishock Kit.
 * Decomposed in accordance with Mandate 8b (<= 120 lines SSOT).
 */

import type { DbExecutor } from "./types.js";
import { executeUnifiedStockDeduction } from "./unifiedStockDeductionEngine.js";
import { getAntishockKitDefinitions } from "./antishock/antishockPresets.js";

export async function quickWriteoffAntishockKit(
	tx: DbExecutor,
	params: {
		organizationId: string;
		userId?: string | null | undefined;
		visitId?: string | null | undefined;
		patientName?: string | undefined;
		doctorName?: string | undefined;
		notes?: string | null | undefined;
		scenarioId?: string | undefined;
	},
) {
	const { organizationId, userId, visitId, patientName, doctorName, notes, scenarioId } = params;
	const items = getAntishockKitDefinitions();

	const actorNote = doctorName ? `Врач: ${doctorName}` : "";
	const patientNote = patientName ? `Пациент: ${patientName}` : "";
	const customNote = notes ? `Примечание: ${notes}` : "";
	const fullNote = [actorNote, patientNote, customNote].filter(Boolean).join(" | ");

	return executeUnifiedStockDeduction(tx, {
		organizationId,
		items,
		transactionType: "emergency_antishock",
		visitId,
		userId,
		notes: fullNote || "Экстренное вскрытие аптечки антишок (Анафилаксия)",
		reasonPrefix: "Экстренная аптечка антишок (Анафилаксия) — 1 клик",
		successMessageTemplate: (count, hasOverdraft) =>
			`Экстренная аптечка антишок списана (${count} позиций${hasOverdraft ? ", мягкий овердрафт активен" : ""}). Зафиксировано в журнале.`,
	});
}

export const quickWriteoffEmergencyAntishock = quickWriteoffAntishockKit;
